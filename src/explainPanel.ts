import * as vscode from 'vscode';
import type { Tree } from 'web-tree-sitter';
import type { Options, Span } from './core/analyzer';
import { explainLines, type LineExplanation, type LineItem } from './core/lines';
import type { LanguageSpec } from './core/model';
import { hasDocumentation } from './core/hoverDocs';
import { panelHtml } from './explainPanelHtml';

/** What the panel needs from the extension. */
export interface PanelDeps {
  specFor(doc: vscode.TextDocument): LanguageSpec | undefined;
  treeFor(doc: vscode.TextDocument): Tree | undefined;
  options(): Options;
  /** Show the scope highlight for the part at `span` (as if hovered). */
  highlight(editor: vscode.TextEditor, span: Span): void;
  /** Run `fn` while Syntax Tutor's own hover provider stays silent (no popup part, no highlight). */
  quiet<T>(fn: () => Thenable<T>): Promise<T>;
}

/** What `Explain This Line` returns: the explanation, plus the language-server docs as they arrive (for tests). */
export type ExplainResult = LineExplanation & { languageDocs: Promise<(string | undefined)[]> };

/** How long to wait for a language server before giving up on its docs for one part. */
const LANGUAGE_DOC_TIMEOUT_MS = 10_000;

/**
 * Markdown from other extensions' hovers (gopls, rust-analyzer, TypeScript, ...),
 * without our own part, or undefined when they only give a signature.
 */
function hoverMarkdown(hovers: vscode.Hover[] | undefined): string | undefined {
  const parts: string[] = [];
  for (const h of hovers ?? []) {
    for (const c of h.contents) {
      const md = typeof c === 'string' ? c : 'language' in c ? `\`\`\`${c.language}\n${c.value}\n\`\`\`` : c.value;
      // TypeScript prefixes answers with "(loading...)" while its project is still loading.
      const clean = md.replace(/^\(loading\.\.\.\)[ \t]*\n?/gm, '').trim();
      if (clean.replace(/```\w*\s*```/g, '').trim() && !clean.includes('Syntax Tutor*') && !parts.includes(clean)) parts.push(clean);
    }
  }
  return parts.some(hasDocumentation) ? parts.join('\n\n---\n\n') : undefined;
}

interface RenderedItem {
  text: string;
  span: Span;
  heading: string;
  summary: string;
  more: string;
  plain: boolean;
  symbol: boolean;
  /** Nesting inside the explained lines, and the scope's id and rendered label ("inside the body of …"). */
  depth: number;
  scopeId?: number;
  scopeHtml?: string;
}

const toRange = (s: Span) => new vscode.Range(s.start.row, s.start.column, s.end.row, s.end.column);

/**
 * "Explain this line": a side panel listing every part of the current line (or
 * selected lines) with its explanation. Hovering an entry highlights it in the
 * editor; clicking scrolls to it. With "Follow cursor" on, it updates as you move.
 */
export class ExplainPanel implements vscode.Disposable {
  private static current: ExplainPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private editor: vscode.TextEditor | undefined;
  private items: RenderedItem[] = [];
  private follow: boolean;
  private followTimer: ReturnType<typeof setTimeout> | undefined;
  /** Bumped on every render, so late language-server answers for an old line are dropped. */
  private generation = 0;

  static async show(context: vscode.ExtensionContext, deps: PanelDeps, editor: vscode.TextEditor): Promise<ExplainResult | undefined> {
    if (!ExplainPanel.current) ExplainPanel.current = new ExplainPanel(context, deps);
    else ExplainPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
    return ExplainPanel.current.explain(editor);
  }

  private readonly panel: vscode.WebviewPanel;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly deps: PanelDeps,
  ) {
    this.follow = context.workspaceState.get('syntaxTutor.explain.follow', false);
    this.panel = vscode.window.createWebviewPanel(
      'syntaxTutor.explainLine',
      'Explain line',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');
    this.panel.webview.html = this.html();
    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage((m) => this.onMessage(m)),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (!this.follow || !this.deps.specFor(e.textEditor.document) || Date.now() < this.ignoreSelectionUntil) return;
        clearTimeout(this.followTimer);
        this.followTimer = setTimeout(() => void this.explain(e.textEditor), 200);
      }),
    );
  }

  private async explain(editor: vscode.TextEditor): Promise<ExplainResult | undefined> {
    const doc = editor.document;
    const spec = this.deps.specFor(doc);
    const tree = spec && this.deps.treeFor(doc);
    if (!spec || !tree) return undefined;
    this.editor = editor;
    const sel = editor.selection;
    const startRow = sel.start.line;
    // A selection ending at column 0 of the next line doesn't include that line.
    const endRow = Math.max(startRow, sel.end.character === 0 && sel.end.line > sel.start.line ? sel.end.line - 1 : sel.end.line);
    const result = explainLines(spec, tree, startRow, endRow, this.deps.options());

    const generation = ++this.generation;
    this.items = await Promise.all(result.items.map((i) => this.renderItem(i)));
    const lines = [];
    for (let row = startRow; row <= endRow; row++) lines.push(doc.lineAt(row).text);
    const name = vscode.workspace.asRelativePath(doc.uri);
    this.panel.title = startRow === endRow ? `Explain line ${startRow + 1}` : `Explain lines ${startRow + 1}–${endRow + 1}`;
    void this.panel.webview.postMessage({
      type: 'render',
      file: name,
      language: spec.displayName,
      firstRow: startRow,
      lines,
      structure: result.structure ? await this.md(result.structure) : '',
      items: this.items,
      follow: this.follow,
      generation,
    });
    return { ...result, languageDocs: this.addLanguageDocs(doc, generation) };
  }

  /**
   * For names and members, ask the editor's other hover providers (the language
   * server) what they know, the same text IntelliSense shows on hover, and add
   * it to the entry when it arrives.
   */
  private addLanguageDocs(doc: vscode.TextDocument, generation: number): Promise<(string | undefined)[]> {
    return Promise.all(
      this.items.map(async (item, index) => {
        if (!item.symbol) return undefined;
        const position = new vscode.Position(item.span.start.row, item.span.start.column);
        const ask = this.deps.quiet(() =>
          vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', doc.uri, position),
        );
        const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), LANGUAGE_DOC_TIMEOUT_MS));
        const markdown = hoverMarkdown(await Promise.race([ask, timeout]).catch(() => undefined));
        if (!markdown || generation !== this.generation) return undefined;
        void this.panel.webview.postMessage({ type: 'doc', generation, index, html: await this.md(markdown) });
        return markdown;
      }),
    );
  }

  private async renderItem(item: LineItem): Promise<RenderedItem> {
    // First paragraph: heading ("**`for`** · Go keyword"); second: summary; the rest goes behind "More".
    const parts = item.markdown.split('\n\n');
    const heading = parts.shift() ?? '';
    const summary = parts.length && !parts[0].startsWith('```') && !parts[0].startsWith('---') ? parts.shift()! : '';
    return {
      text: item.text,
      span: item.span,
      heading: await this.md(heading),
      summary: summary ? await this.md(summary) : '',
      more: parts.length ? await this.md(parts.join('\n\n')) : '',
      plain: !!item.plain,
      symbol: !!item.symbol,
      depth: item.depth,
      scopeId: item.scope?.id,
      scopeHtml: item.scope ? await this.md(`↳ inside ${item.scope.label}`) : undefined,
    };
  }

  private async md(markdown: string): Promise<string> {
    try {
      const html = await vscode.commands.executeCommand<string>('markdown.api.render', markdown);
      if (typeof html === 'string') return html;
    } catch {
      // The built-in Markdown extension is disabled: fall back to escaped text.
    }
    return `<p>${markdown.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)}</p>`;
  }

  /** Selection changes caused by the panel itself (double-click) don't re-explain. */
  private ignoreSelectionUntil = 0;

  private onMessage(m: { type: string; index?: number; on?: boolean }): void {
    const item = m.index !== undefined ? this.items[m.index] : undefined;
    const editor = this.editor;
    switch (m.type) {
      case 'hover':
        if (item && editor && !editor.document.isClosed) this.deps.highlight(editor, item.span);
        break;
      case 'reveal':
        // Show the part without touching the selection, so a multi-line explanation stays put.
        if (item && editor && !editor.document.isClosed) {
          editor.revealRange(toRange(item.span), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          this.deps.highlight(editor, item.span);
        }
        break;
      case 'select':
        // Double-click: put the cursor on the part. The panel keeps showing the same lines.
        if (item && editor && !editor.document.isClosed) {
          this.ignoreSelectionUntil = Date.now() + 500;
          void vscode.window.showTextDocument(editor.document, { viewColumn: editor.viewColumn, selection: toRange(item.span) });
        }
        break;
      case 'follow':
        this.follow = !!m.on;
        void this.context.workspaceState.update('syntaxTutor.explain.follow', this.follow);
        break;
    }
  }

  private html(): string {
    return panelHtml(this.panel.webview.cspSource, Math.random().toString(36).slice(2));
  }

  dispose(): void {
    ExplainPanel.current = undefined;
    clearTimeout(this.followTimer);
    for (const d of this.disposables) d.dispose();
    this.panel.dispose();
  }
}
