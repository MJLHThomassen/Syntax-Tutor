import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Tree } from 'web-tree-sitter';
import { explain, scopeFor, type ScopeResult, type Span } from './core/analyzer';
import type { LanguageSpec } from './core/model';
import { editTree } from './core/incremental';
import { Parsers } from './core/parser';
import { ExplainPanel } from './explainPanel';
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

/** While > 0, our hover provider stays silent: the Explain panel is asking the other providers. */
let quietHovers = 0;

function config() {
  const c = vscode.workspace.getConfiguration('syntaxTutor');
  return {
    hover: c.get<boolean>('hover.enabled', true),
    highlight: c.get<boolean>('scopeHighlight.enabled', true),
    trigger: c.get<Trigger>('scopeHighlight.trigger', 'both'),
    showRelated: c.get<boolean>('scopeHighlight.showRelated', true),
    hoverTimeout: c.get<number>('scopeHighlight.hoverTimeout', 4),
    comments: c.get<'all' | 'doc' | 'off'>('comments', 'all'),
  };
}

/**
 * Parsed trees per open document. Edits are recorded on the cached tree as they
 * happen, so the next parse only re-parses around them; when that bookkeeping
 * falls out of step (a missed event), the next request does a full parse.
 */
class TreeCache implements vscode.Disposable {
  private readonly trees = new Map<string, { version: number; tree: Tree; editedTo: number; languageId: string }>();
  /** How many parses reused an edited tree vs. started from scratch (for tests). */
  readonly stats = { incremental: 0, full: 0 };

  constructor(private readonly parsers: Parsers) {}

  get(doc: vscode.TextDocument): Tree | undefined {
    const key = doc.uri.toString();
    const cached = this.trees.get(key);
    if (cached?.version === doc.version) return cached.tree;
    const spec = SPECS[doc.languageId];
    // Reuse the old tree when it has every edit up to this version recorded on it.
    const old = cached && cached.editedTo === doc.version && cached.languageId === doc.languageId ? cached.tree : undefined;
    const tree = spec && this.parsers.parse(spec.id, doc.getText(), old);
    if (tree) this.stats[old ? 'incremental' : 'full']++;
    cached?.tree.delete();
    if (tree) this.trees.set(key, { version: doc.version, tree, editedTo: doc.version, languageId: doc.languageId });
    else this.trees.delete(key);
    return tree;
  }

  /** Record a change on the cached tree, so the next get() re-parses only what changed. */
  edit(e: vscode.TextDocumentChangeEvent): void {
    if (!e.contentChanges.length) return; // e.g. only the dirty state changed
    const key = e.document.uri.toString();
    const cached = this.trees.get(key);
    if (!cached) return;
    if (cached.editedTo !== e.document.version - 1) {
      // Missed a change: the old tree can't be trusted any more.
      cached.tree.delete();
      this.trees.delete(key);
      return;
    }
    editTree(
      cached.tree,
      e.contentChanges.map((c) => ({
        rangeOffset: c.rangeOffset,
        rangeLength: c.rangeLength,
        start: { row: c.range.start.line, column: c.range.start.character },
        end: { row: c.range.end.line, column: c.range.end.character },
        text: c.text,
      })),
    );
    cached.editedTo = e.document.version;
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
  /** Called when a hover highlight clears itself after its timeout. */
  onHoverExpired: (() => void) | undefined;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * `hoverTimeout` (seconds, 0 = never): a hover-started highlight clears itself after this
   * long, because VS Code doesn't tell extensions when the mouse leaves a hover.
   */
  show(editor: vscode.TextEditor, scope: ScopeResult, source: 'cursor' | 'hover', showRelated: boolean, hoverTimeout = 0): void {
    if (this.editor && this.editor !== editor) this.clear();
    clearTimeout(this.hoverTimer);
    if (source === 'hover' && hoverTimeout > 0) {
      this.hoverTimer = setTimeout(() => {
        if (this.source !== 'hover') return;
        this.clear();
        this.onHoverExpired?.();
      }, hoverTimeout * 1000);
    }
    this.editor = editor;
    this.source = source;
    this.current = scope;
    editor.setDecorations(this.primary, [toRange(scope.primary)]);
    editor.setDecorations(this.boundary, scope.boundaries.map(toRange));
    editor.setDecorations(this.related, showRelated && scope.related ? [toRange(scope.related)] : []);
  }

  clear(): void {
    clearTimeout(this.hoverTimer);
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
  };  // When a hover highlight times out, go back to the cursor's highlight (if any).
  highlighter.onHoverExpired = () => highlightAtCursor(vscode.window.activeTextEditor);


  context.subscriptions.push(
    vscode.languages.registerHoverProvider(SELECTOR, {
      provideHover(doc, position) {
        if (quietHovers > 0) return undefined;
        const spec = SPECS[doc.languageId];
        const tree = spec && trees.get(doc);
        if (!tree) return undefined;
        const cfg = config();
        const point = { row: position.line, column: position.character };

        if (cfg.highlight && cfg.trigger !== 'cursor') {
          const editor = vscode.window.visibleTextEditors.find((e) => e.document === doc);
          const scope = scopeFor(spec, tree, point, false, cfg);
          if (editor && scope) highlighter.show(editor, scope, 'hover', cfg.showRelated, cfg.hoverTimeout);
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
    vscode.workspace.onDidChangeTextDocument((e) => trees.edit(e)),
    vscode.workspace.onDidCloseTextDocument((doc) => trees.forget(doc)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('syntaxTutor')) highlightAtCursor(vscode.window.activeTextEditor);
    }),
    vscode.commands.registerCommand('syntaxTutor.toggleHover', () => toggle('hover.enabled', 'Hover explanations')),
    vscode.commands.registerCommand('syntaxTutor.toggleScopeHighlight', () =>
      toggle('scopeHighlight.enabled', 'Scope highlighting'),
    ),
    vscode.commands.registerCommand('syntaxTutor.explainLine', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !SPECS[editor.document.languageId]) {
        void vscode.window.showInformationMessage('Syntax Tutor: open a Go, Rust, C, C++, C#, JavaScript or TypeScript file first.');
        return undefined;
      }
      return ExplainPanel.show(context, {
        specFor: (doc) => SPECS[doc.languageId],
        treeFor: (doc) => trees.get(doc),
        options: () => config(),
        quiet: async (fn) => {
          quietHovers++;
          try {
            return await fn();
          } finally {
            quietHovers--;
          }
        },
        highlight: (target, span) => {
          // The part's own scope if it has one (a keyword's construct), else just the part itself.
          const spec = SPECS[target.document.languageId];
          const tree = spec && trees.get(target.document);
          const scope = tree && scopeFor(spec, tree, span.start, false, config());
          highlighter.show(target, scope ?? { primary: span, boundaries: [] }, 'hover', config().showRelated, config().hoverTimeout);
        },
      }, editor);
    }),
  );

  highlightAtCursor(vscode.window.activeTextEditor);
  return { currentScope: () => highlighter.current, parseStats: () => ({ ...trees.stats }) };
}

async function toggle(key: string, label: string): Promise<void> {
  const c = vscode.workspace.getConfiguration('syntaxTutor');
  const next = !c.get<boolean>(key, true);
  await c.update(key, next, vscode.ConfigurationTarget.Global);
  vscode.window.setStatusBarMessage(`Syntax Tutor: ${label} ${next ? 'on' : 'off'}`, 2500);
}

export function deactivate(): void {}
