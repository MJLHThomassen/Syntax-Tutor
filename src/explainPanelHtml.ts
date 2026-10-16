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
  header { position: sticky; top: 0; background: var(--vscode-editor-background); padding: 12px 0 8px; border-bottom: 1px solid var(--vscode-panel-border, transparent); z-index: 1; }
  .meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--vscode-descriptionForeground); font-size: .9em; }
  .meta label { display: inline-flex; gap: 4px; align-items: center; cursor: pointer; white-space: nowrap; }
  pre.code { font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); background: var(--vscode-textCodeBlock-background); padding: 8px 10px; border-radius: 4px; margin: 8px 0 0; overflow-x: auto; white-space: pre; tab-size: 4; }
  .ln { color: var(--vscode-editorLineNumber-foreground); user-select: none; display: inline-block; min-width: 3ch; margin-right: 1ch; text-align: right; }
  .tok { border-radius: 3px; cursor: pointer; border-bottom: 1px dotted var(--vscode-descriptionForeground); }
  .tok:hover, .tok.on { background: var(--mark); outline: 1px solid var(--vscode-focusBorder); }
  .structure p { margin: 10px 0 4px; }
  ol { list-style: none; padding: 0; margin: 8px 0 0; }
  li { padding: 8px 10px; margin: 6px 0; border-radius: 6px; border: 1px solid var(--vscode-widget-border, rgba(128,128,128,.25)); cursor: pointer; }
  li:hover, li.on { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
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
</style>
</head>
<body>
<header>
  <div class="meta"><span id="where">Put the cursor on a line and run <b>Syntax Tutor: Explain This Line</b>.</span>
  <label title="Re-explain whenever the cursor moves to another line"><input type="checkbox" id="follow"> Follow cursor</label></div>
  <pre class="code" id="code" hidden></pre>
</header>
<div class="structure" id="structure"></div>
<ol id="items"></ol>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => '&#' + c.charCodeAt(0) + ';');
  let items = [];

  $('follow').addEventListener('change', (e) => vscode.postMessage({ type: 'follow', on: e.target.checked }));

  function mark(i, on) {
    document.querySelectorAll('[data-i="' + i + '"]').forEach((el) => el.classList.toggle('on', on));
  }
  function wire(el, i) {
    el.addEventListener('mouseenter', () => { mark(i, true); vscode.postMessage({ type: 'hover', index: i }); });
    el.addEventListener('mouseleave', () => mark(i, false));
    el.addEventListener('click', (e) => {
      if (e.target.closest('a, summary, details')) return;
      vscode.postMessage({ type: 'reveal', index: i });
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

  window.addEventListener('message', ({ data }) => {
    if (data.type !== 'render') return;
    items = data.items;
    $('follow').checked = data.follow;
    const n = data.lines.length;
    $('where').textContent = data.file + ' · ' + data.language + ' · ' + (n === 1 ? 'line ' + (data.firstRow + 1) : 'lines ' + (data.firstRow + 1) + '–' + (data.firstRow + n));
    renderCode(data.lines, data.firstRow);
    $('structure').innerHTML = data.structure;
    const list = $('items');
    list.innerHTML = '';
    if (!items.length) list.innerHTML = '<p class="empty">Nothing to explain on this line.</p>';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.dataset.i = i;
      if (it.plain) li.className = 'plain';
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
