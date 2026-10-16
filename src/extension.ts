import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Tree } from 'web-tree-sitter';
import { explain, scopeFor, type ScopeResult, type Span } from './core/analyzer';
import type { LanguageSpec } from './core/model';
import { Parsers } from './core/parser';
import { c } from './docs/c';
import { cpp } from './docs/cpp';
import { csharp } from './docs/csharp';
import { go } from './docs/go';
import { javascript } from './docs/javascript';
import { rust } from './docs/rust';
import { tsx, typescript } from './docs/typescript';

const ALL_SPECS: readonly LanguageSpec[] = [go, rust, c, cpp, csharp, javascript, typescript, tsx];
/** VS Code language id → spec. */
const SPECS: Record<string, LanguageSpec> = Object.fromEntries(
  ALL_SPECS.flatMap((spec) => spec.languageIds.map((id) => [id, spec])),
);
const SELECTOR: vscode.DocumentSelector = Object.keys(SPECS).map((language) => ({ language }));

type Trigger = 'cursor' | 'hover' | 'both';

const HOVER_LABEL = '🎓 *Syntax Tutor*';

function config() {
  const c = vscode.workspace.getConfiguration('syntaxTutor');
  return {
    hover: c.get<boolean>('hover.enabled', true),
    highlight: c.get<boolean>('scopeHighlight.enabled', true),
    trigger: c.get<Trigger>('scopeHighlight.trigger', 'both'),
    showRelated: c.get<boolean>('scopeHighlight.showRelated', true),
    comments: c.get<'all' | 'doc' | 'off'>('comments', 'all'),
  };
}

/** Parsed trees per open document, reparsed when the document version changes. */
class TreeCache implements vscode.Disposable {
  private readonly trees = new Map<string, { version: number; tree: Tree }>();

  constructor(private readonly parsers: Parsers) {}

  get(doc: vscode.TextDocument): Tree | undefined {
    const key = doc.uri.toString();
    const cached = this.trees.get(key);
    if (cached?.version === doc.version) return cached.tree;
    cached?.tree.delete();
    const spec = SPECS[doc.languageId];
    const tree = spec && this.parsers.parse(spec.id, doc.getText());
    if (tree) this.trees.set(key, { version: doc.version, tree });
    else this.trees.delete(key);
    return tree;
  }

  forget(doc: vscode.TextDocument): void {
    const key = doc.uri.toString();
    this.trees.get(key)?.tree.delete();
    this.trees.delete(key);
  }

  dispose(): void {
    for (const { tree } of this.trees.values()) tree.delete();
    this.trees.clear();
  }
}

const toRange = (s: Span) => new vscode.Range(s.start.row, s.start.column, s.end.row, s.end.column);

/** The marker-style decorations for the current scope. */
class ScopeHighlighter implements vscode.Disposable {
  private readonly primary = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('syntaxTutor.scopeBackground'),
    overviewRulerColor: new vscode.ThemeColor('syntaxTutor.scopeBorder'),
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
  private readonly related = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('syntaxTutor.relatedScopeBackground'),
    isWholeLine: true,
  });
  private readonly boundary = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('syntaxTutor.scopeBorder'),
    borderRadius: '3px',
  });
  private editor: vscode.TextEditor | undefined;
  /** The highlighted scope, exposed for integration tests. */
  current: ScopeResult | undefined;
  /** What set the current highlight, so a cursor move can replace a hover highlight. */
  source: 'cursor' | 'hover' | undefined;

  show(editor: vscode.TextEditor, scope: ScopeResult, source: 'cursor' | 'hover', showRelated: boolean): void {
    if (this.editor && this.editor !== editor) this.clear();
    this.editor = editor;
    this.source = source;
    this.current = scope;
    editor.setDecorations(this.primary, [toRange(scope.primary)]);
    editor.setDecorations(this.boundary, scope.boundaries.map(toRange));
    editor.setDecorations(this.related, showRelated && scope.related ? [toRange(scope.related)] : []);
  }

  clear(): void {
    if (this.editor) {
      for (const d of [this.primary, this.related, this.boundary]) this.editor.setDecorations(d, []);
    }
    this.editor = undefined;
    this.source = undefined;
    this.current = undefined;
  }

  dispose(): void {
    this.primary.dispose();
    this.related.dispose();
    this.boundary.dispose();
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const parsers = await Parsers.load(path.join(context.extensionPath, 'dist', 'wasm'), ALL_SPECS);
  const trees = new TreeCache(parsers);
  const highlighter = new ScopeHighlighter();
  context.subscriptions.push(trees, highlighter, { dispose: () => parsers.dispose() });

  const highlightAtCursor = (editor: vscode.TextEditor | undefined) => {
    const cfg = config();
    const spec = editor && SPECS[editor.document.languageId];
    if (!editor || !spec || !cfg.highlight || cfg.trigger === 'hover') {
      if (highlighter.source === 'cursor' || !cfg.highlight) highlighter.clear();
      return;
    }
    const tree = trees.get(editor.document);
    const sel = editor.selection;
    // A selected word (e.g. after double-click) is looked up from its start;
    // a bare cursor also counts when it sits right after a word.
    const pos = sel.isEmpty ? sel.active : sel.start;
    const scope = tree && scopeFor(spec, tree, { row: pos.line, column: pos.character }, sel.isEmpty, cfg);
    if (scope) highlighter.show(editor, scope, 'cursor', cfg.showRelated);
    else highlighter.clear();
  };

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(SELECTOR, {
      provideHover(doc, position) {
        const spec = SPECS[doc.languageId];
        const tree = spec && trees.get(doc);
        if (!tree) return undefined;
        const cfg = config();
        const point = { row: position.line, column: position.character };

        if (cfg.highlight && cfg.trigger !== 'cursor') {
          const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
          const scope = scopeFor(spec, tree, point, false, cfg);
          if (editor && scope) highlighter.show(editor, scope, 'hover', cfg.showRelated);
          else if (highlighter.source === 'hover') highlightAtCursor(vscode.window.activeTextEditor);
        }

        if (!cfg.hover) return undefined;
        const explanation = explain(spec, tree, point, cfg);
        if (!explanation) return undefined;
        // VS Code merges all hover providers into one popup; this label marks our section.
        const md = new vscode.MarkdownString(`${HOVER_LABEL}\n\n${explanation.markdown}`);
        md.supportHtml = false;
        return new vscode.Hover(md, toRange(explanation.span));
      },
    }),
    vscode.window.onDidChangeTextEditorSelection((e) => highlightAtCursor(e.textEditor)),
    vscode.window.onDidChangeActiveTextEditor((editor) => highlightAtCursor(editor)),
    vscode.workspace.onDidCloseTextDocument((doc) => trees.forget(doc)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('syntaxTutor')) highlightAtCursor(vscode.window.activeTextEditor);
    }),
    vscode.commands.registerCommand('syntaxTutor.toggleHover', () => toggle('hover.enabled', 'Hover explanations')),
    vscode.commands.registerCommand('syntaxTutor.toggleScopeHighlight', () =>
      toggle('scopeHighlight.enabled', 'Scope highlighting'),
    ),
  );

  highlightAtCursor(vscode.window.activeTextEditor);
  return { currentScope: () => highlighter.current };
}

async function toggle(key: string, label: string): Promise<void> {
  const c = vscode.workspace.getConfiguration('syntaxTutor');
  const next = !c.get<boolean>(key, true);
  await c.update(key, next, vscode.ConfigurationTarget.Global);
  vscode.window.setStatusBarMessage(`Syntax Tutor: ${label} ${next ? 'on' : 'off'}`, 2500);
}

export function deactivate(): void {}
