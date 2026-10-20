// The Explain-line panel's HTML, kept free of the vscode API so it can be previewed in a browser.

export function panelHtml(cspSource: string, nonce: string): string {
  const csp = `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
  return /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --mark: var(--vscode-editor-findMatchHighlightBackground, rgba(255, 215, 0, .25)); }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 0 16px 24px; line-height: 1.45; }
  header { padding: 0 0 8px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .meta { position: sticky; top: 0; background: var(--vscode-editor-background); padding: 10px 0 4px; z-index: 1; }
  .meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--vscode-descriptionForeground); font-size: .9em; }
  .hint { font-size: .85em; color: var(--vscode-descriptionForeground); margin-top: 2px; }
  .meta label { display: inline-flex; gap: 4px; align-items: center; cursor: pointer; white-space: nowrap; }
  pre.code { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); background: var(--vscode-textCodeBlock-background); padding: 8px 10px; border-radius: 4px; margin: 8px 0 0; overflow: auto; max-height: 40vh; white-space: pre; tab-size: 4; }
  .ln { color: var(--vscode-editorLineNumber-foreground); user-select: none; display: inline-block; min-width: 3ch; margin-right: 1ch; text-align: right; }
  .tok { border-radius: 3px; cursor: pointer; border-bottom: 1px dotted var(--vscode-descriptionForeground); }
  .tok:hover, .tok.on { background: var(--mark); outline: 1px solid var(--vscode-focusBorder); }
  .structure p { margin: 10px 0 4px; }
  ol { list-style: none; padding: 0; margin: 8px 0 0; }
  li { padding: 8px 10px; margin: 6px 0; border-radius: 6px; border: 1px solid var(--vscode-widget-border, rgba(128,128,128,.25)); cursor: pointer; }
  li:hover, li.on { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
  /* Nested scopes: indented, with a left border coloured per level (like bracket pair colours). */
  li.nested { border-left-width: 3px; }
  li.scope { border: 0; padding: 6px 0 0; margin: 10px 0 0; cursor: default; color: var(--vscode-descriptionForeground); font-size: .9em; }
  li.scope:hover { background: none; }
  li.scope p { margin: 0; }
  li.active { border-color: var(--vscode-focusBorder); box-shadow: inset 3px 0 0 var(--vscode-focusBorder); }
  .tok.active { background: var(--mark); }
  li.plain { opacity: .8; }
  li .h p, li .s p { margin: 0; }
  li .s { margin-top: 4px; }
  li details { margin-top: 6px; }
  li summary { color: var(--vscode-textLink-foreground); cursor: pointer; font-size: .9em; }
  code { font-family: var(--vscode-editor-font-family); }
  pre code { display: block; background: var(--vscode-textCodeBlock-background); padding: 6px 8px; border-radius: 4px; overflow-x: auto; }
  a { color: var(--vscode-textLink-foreground); }
  hr { border: 0; border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,.25)); }
  .empty { color: var(--vscode-descriptionForeground); margin-top: 16px; }
  .ls { cursor: auto; }
  .ls-body { margin-top: 4px; padding: 6px 8px; border-left: 2px solid var(--vscode-textLink-foreground); background: var(--vscode-textBlockQuote-background, rgba(128,128,128,.08)); max-height: 16em; overflow: auto; }
  .ls p { margin: 4px 0; }
  .ls pre { margin: 4px 0; }
  /* Explain This Function: one compact row per step, with its line number. */
  li.step { display: flex; gap: 8px; align-items: baseline; padding: 5px 10px; margin: 4px 0; }
  li.step p { margin: 0; }
  li.step .row-ln { color: var(--vscode-editorLineNumber-foreground); font-family: var(--vscode-editor-font-family); font-size: .9em; min-width: 3ch; text-align: right; flex: none; }
  pre.code.sig { cursor: pointer; }
  pre.code.sig:hover { outline: 1px solid var(--vscode-focusBorder); }
</style>
</head>
<body>
<div class="meta"><span id="where">Put the cursor on a line and run <b>Syntax Tutor: Explain This Line</b>.</span>
  <label title="Re-explain whenever the cursor moves to another line"><input type="checkbox" id="follow"> Follow cursor</label></div>
<header>
  <div class="hint" id="hint">Click a part to show it in the editor · double-click to put the cursor there</div>
  <pre class="code" id="code" hidden></pre>
</header>
<div class="structure" id="structure"></div>
<ol id="items"></ol>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => '&#' + c.charCodeAt(0) + ';');
  let items = [];
  let generation = 0;

  $('follow').addEventListener('change', (e) => vscode.postMessage({ type: 'follow', on: e.target.checked }));

  function mark(i, on) {
    document.querySelectorAll('[data-i="' + i + '"]').forEach((el) => el.classList.toggle('on', on));
  }
  function wire(el, i) {
    el.addEventListener('mouseenter', () => { mark(i, true); vscode.postMessage({ type: 'hover', index: i }); });
    el.addEventListener('mouseleave', () => mark(i, false));
    el.addEventListener('click', (e) => {
      if (e.target.closest('a, summary, details, .ls')) return;
      document.querySelectorAll('.active').forEach((x) => x.classList.remove('active'));
      document.querySelectorAll('[data-i="' + i + '"]').forEach((x) => x.classList.add('active'));
      vscode.postMessage({ type: 'reveal', index: i });
    });
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('a, summary, details, .ls')) return;
      vscode.postMessage({ type: 'select', index: i });
    });
  }

  function renderCode(lines, firstRow) {
    // Wrap each explained part in a span; parts are in reading order and don't overlap.
    const html = lines.map((text, k) => {
      const row = firstRow + k;
      let out = '', col = 0;
      items.forEach((it, i) => {
        const s = it.span;
        if (s.start.row > row || s.end.row < row) return;
        const from = s.start.row === row ? s.start.column : 0;
        const to = s.end.row === row ? s.end.column : text.length;
        if (from < col || to <= from) return;
        out += esc(text.slice(col, from)) + '<span class="tok" data-i="' + i + '">' + esc(text.slice(from, to)) + '</span>';
        col = to;
      });
      return '<span class="ln">' + (row + 1) + '</span>' + out + esc(text.slice(col));
    }).join('\\n');
    $('code').innerHTML = html;
    $('code').hidden = false;
    $('code').querySelectorAll('.tok').forEach((el) => wire(el, +el.dataset.i));
  }

  const levelColor = (d) => 'var(--vscode-editorBracketHighlight-foreground' + (((d - 1) % 6) + 1) + ', ' + ['#ffd700', '#da70d6', '#179fff'][(d - 1) % 3] + ')';
  const indent = (d) => (d * 16) + 'px';

  // Explain This Function: the signature, a summary, then one row per step, nested like the code.
  function renderOutline(data) {
    generation = data.generation;
    $('follow').checked = data.follow;
    $('where').textContent = data.file + ' · ' + data.language + (data.where ? ' · ' + data.where : '');
    $('hint').textContent = 'Click a step to show it in the editor · double-click to put the cursor there';
    const code = $('code');
    code.classList.add('sig');
    code.innerHTML = data.signature ? '<span class="ln">' + (data.firstRow + 1) + '</span>' + esc(data.signature) : '';
    code.hidden = !data.signature;
    $('structure').innerHTML = data.summary;
    const list = $('items');
    list.innerHTML = '';
    if (!data.rows.length) {
      list.innerHTML = data.signature ? '<p class="empty">This function has no steps to outline.</p>'
        : '<p class="empty">Put the cursor inside a function and run <b>Syntax Tutor: Explain This Function</b>.</p>';
      return;
    }
    data.rows.forEach((row, i) => {
      const li = document.createElement('li');
      li.className = 'step';
      li.dataset.i = i;
      if (row.depth > 0) {
        li.classList.add('nested');
        li.style.marginLeft = indent(row.depth);
        li.style.borderLeftColor = levelColor(row.depth);
      }
      li.innerHTML = '<span class="row-ln">' + row.line + '</span><div class="h">' + row.html + '</div>';
      wire(li, i);
      list.appendChild(li);
    });
  }
  wire($('code'), -1);

  window.addEventListener('message', ({ data }) => {
    if (data.type === 'outline') return renderOutline(data);
    if (data.type === 'doc') {
      // Docs from the language server (what IntelliSense shows on hover), arriving after the render.
      const li = document.querySelector('li[data-i="' + data.index + '"]');
      if (data.generation !== generation || !li || li.querySelector('.ls')) return;
      // Collapsed: only there when the language server has real documentation; open it to read.
      const box = document.createElement('details');
      box.className = 'ls';
      box.innerHTML = '<summary>IntelliSense documentation</summary><div class="ls-body">' + data.html + '</div>';
      const more = li.querySelector('details');
      li.insertBefore(box, more);
      return;
    }
    if (data.type !== 'render') return;
    generation = data.generation;
    items = data.items;
    $('code').classList.remove('sig');
    $('hint').textContent = 'Click a part to show it in the editor · double-click to put the cursor there';
    $('follow').checked = data.follow;
    const n = data.lines.length;
    $('where').textContent = data.file + ' · ' + data.language + ' · ' + (n === 1 ? 'line ' + (data.firstRow + 1) : 'lines ' + (data.firstRow + 1) + '–' + (data.firstRow + n));
    renderCode(data.lines, data.firstRow);
    $('structure').innerHTML = data.structure;
    const list = $('items');
    list.innerHTML = '';
    if (!items.length) list.innerHTML = '<p class="empty">Nothing to explain on this line.</p>';
    const seenScopes = new Set();
    items.forEach((it, i) => {
      // A small header where a scope opened inside these lines begins ("inside the body of the if statement").
      if (it.scopeId !== undefined && !seenScopes.has(it.scopeId)) {
        seenScopes.add(it.scopeId);
        const head = document.createElement('li');
        head.className = 'scope';
        head.style.marginLeft = indent(it.depth - 1);
        head.innerHTML = it.scopeHtml;
        list.appendChild(head);
      }
      const li = document.createElement('li');
      li.dataset.i = i;
      if (it.plain) li.classList.add('plain');
      if (it.depth > 0) {
        li.classList.add('nested');
        li.style.marginLeft = indent(it.depth);
        li.style.borderLeftColor = levelColor(it.depth);
      }
      li.innerHTML = '<div class="h">' + it.heading + '</div>' + (it.summary ? '<div class="s">' + it.summary + '</div>' : '') +
        (it.more ? '<details><summary>More</summary>' + it.more + '</details>' : '');
      wire(li, i);
      list.appendChild(li);
    });
  });
</script>
</body>
</html>`;
}
