// Runs inside a real VS Code extension host (see scripts/integration.sh).
const assert = require('node:assert/strict');
const path = require('node:path');
const vscode = require('vscode');

const samples = path.join(__dirname, '..', '..', 'samples');

async function open(file) {
  const doc = await vscode.workspace.openTextDocument(path.join(samples, file));
  const editor = await vscode.window.showTextDocument(doc);
  return { doc, editor };
}

function find(doc, needle, offset = 0) {
  const i = doc.getText().indexOf(needle);
  assert.notEqual(i, -1, needle);
  return doc.positionAt(i + offset);
}

async function hoverText(doc, pos) {
  const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', doc.uri, pos);
  return hovers.flatMap((h) => h.contents.map((c) => (typeof c === 'string' ? c : c.value))).join('\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === 'syntax-tutor');
  assert.ok(ext, 'extension not found');

  const go = await open('tour.go');
  const api = await ext.activate();
  const results = [];

  results.push(['go hover func', await hoverText(go.doc, find(go.doc, 'func divide'))]);
  assert.match(results.at(-1)[1], /^🎓 \*Syntax Tutor\*\n\n\*\*`func`\*\* · Go keyword/m);
  results.push(['go hover <- receive', await hoverText(go.doc, find(go.doc, 'v := <-ch', 5))]);
  assert.match(results.at(-1)[1], /receive/);

  // Cursor on the function name highlights the whole function.
  const p = find(go.doc, 'divide(a', 2);
  go.editor.selection = new vscode.Selection(p, p);
  await sleep(200);
  const scope = api.currentScope();
  assert.ok(scope, 'no scope highlighted for cursor on function name');
  const t = go.doc.getText(new vscode.Range(scope.primary.start.row, scope.primary.start.column, scope.primary.end.row, scope.primary.end.column));
  assert.ok(t.startsWith('func divide') && t.endsWith('}'), t);
  results.push(['go cursor scope', t.split('\n')[0] + ' … ' + t.split('\n').at(-1)]);

  // Moving to a plain spot clears it.
  const q = find(go.doc, 'total += n', 1);
  go.editor.selection = new vscode.Selection(q, q);
  await sleep(200);
  assert.equal(api.currentScope(), undefined);

  const rs = await open('tour.rs');
  results.push(['rust hover ?', await hoverText(rs.doc, find(rs.doc, '?;'))]);
  assert.match(results.at(-1)[1], /error propagation/);
  results.push(['rust hover println!', await hoverText(rs.doc, find(rs.doc, 'println!'))]);
  assert.match(results.at(-1)[1], /Rust macro/);

  // Hovering highlights too (trigger: "both").
  await hoverText(rs.doc, find(rs.doc, 'match self'));
  const hs = api.currentScope();
  assert.ok(hs, 'no scope highlighted from hover');
  results.push(['rust hover scope lines', `${hs.primary.start.row + 1}-${hs.primary.end.row + 1}`]);

  // Every other language: a `return` hover (HTML: a tag name) from the right spec, via VS Code's language id.
  for (const [file, needle, label, token = 'return', offset = 0] of [
    ['tour.c', 'return a + b', 'C keyword'],
    ['tour.cpp', 'return "shape"', 'C\\+\\+ keyword'],
    ['tour.cs', 'return best', 'C# keyword'],
    ['tour.js', 'return a + b', 'JavaScript keyword'],
    ['tour.ts', 'return Math.PI', 'TypeScript keyword'],
    ['tour.tsx', 'return (', 'TypeScript keyword'],
    ['tour.py', 'return a / b', 'Python keyword'],
    ['tour.html', '<section id', 'HTML element', '<section>', 1],
  ]) {
    const { doc } = await open(file);
    const h = await hoverText(doc, find(doc, needle, offset));
    assert.match(h, new RegExp(`🎓 \\*Syntax Tutor\\*\\n\\n\\*\\*\`${token}\`\\*\\* · ${label}`), `${file} (${doc.languageId})`);
    results.push([`${file} [${doc.languageId}] hover ${token}`, h]);
  }

  // Comments: a JSDoc @param tag explains itself and highlights the parameter it names.
  const cm = await open('comments/comments.js');
  const tagPos = find(cm.doc, '@param {string}', 1);
  const tagHover = await hoverText(cm.doc, tagPos);
  assert.match(tagHover, /\*\*`@param`\*\* · JSDoc tag/);
  cm.editor.selection = new vscode.Selection(tagPos, tagPos);
  await sleep(200);
  const tagScope = api.currentScope();
  assert.ok(tagScope?.related, 'no parameter highlighted for @param');
  results.push(['comments.js @param hover', tagHover]);

  // Explain This Line: opens the side panel and returns what it explained.
  const ex = await open('tour.go');
  const exPos = find(ex.doc, 'for _, n := range nums {');
  ex.editor.selection = new vscode.Selection(exPos, exPos);
  const explained = await vscode.commands.executeCommand('syntaxTutor.explainLine');
  assert.ok(explained, 'explainLine returned nothing');
  assert.deepEqual(explained.items.map((i) => i.text), ['for', '_', 'n', ':=', 'range', 'nums', '{']);
  await sleep(300);
  const panelTab = vscode.window.tabGroups.all.flatMap((g) => g.tabs).find((t) => t.input instanceof vscode.TabInputWebview);
  assert.ok(panelTab, 'no Explain panel tab');
  results.push(['explainLine panel', `${panelTab.label}: ${explained.structure}`]);

  // Explain This Function: the outline of the function around the cursor, in the same panel.
  const fnPos = find(ex.doc, 'if b == 0');
  ex.editor.selection = new vscode.Selection(fnPos, fnPos);
  const outline = await vscode.commands.executeCommand('syntaxTutor.explainFunction');
  assert.ok(outline, 'explainFunction returned nothing');
  assert.deepEqual(outline.rows.map((r) => r.text), ['If `b == 0`:', 'Returns early with `0, errors.New("divide by zero")`', 'Returns `a / b, nil`']);
  await sleep(300);
  const fnTab = vscode.window.tabGroups.all.flatMap((g) => g.tabs).find((t) => t.input instanceof vscode.TabInputWebview);
  assert.equal(fnTab?.label, 'Explain function divide');
  results.push(['explainFunction panel', `${fnTab.label}: ${outline.summary}`]);

  // Names and members also get the language server's hover (built-in TypeScript here).
  const tsDoc = await open('tour.ts');
  const tsPos = find(tsDoc.doc, 'if (isString(shape.name)');
  tsDoc.editor.selection = new vscode.Selection(tsPos, tsPos);
  const tsExplained = await vscode.commands.executeCommand('syntaxTutor.explainLine');
  const docs = await tsExplained.languageDocs;
  const memberIdx = tsExplained.items.findIndex((i) => i.text === 'name');
  assert.ok(memberIdx >= 0, 'no `name` member item');
  // Undocumented: TypeScript only gives the signature `(property) Shape.name: string`, so no IntelliSense section.
  assert.equal(docs[memberIdx], undefined, 'signature-only hover should be dropped');
  results.push(['explainLine IntelliSense for shape.name', '(none: signature only)']);

  // A documented member: Array.prototype.find's own docs from TypeScript's standard library.
  const cmTs = await open('comments/comments.ts');
  const findPos = find(cmTs.doc, 'return items.find(match);');
  cmTs.editor.selection = new vscode.Selection(findPos, findPos);
  const findExplained = await vscode.commands.executeCommand('syntaxTutor.explainLine');
  const findDocs = await findExplained.languageDocs;
  const findIdx = findExplained.items.findIndex((i) => i.text === 'find');
  assert.match(findDocs[findIdx] ?? '', /Returns the value of the first element/, 'no doc string for items.find');
  assert.doesNotMatch(findDocs[findIdx], /Syntax Tutor/);
  results.push(['explainLine IntelliSense for items.find', findDocs[findIdx].replace(/\s+/g, ' ').slice(0, 160)]);

  // Hover highlights clear themselves after scopeHighlight.hoverTimeout seconds.
  const cfg = vscode.workspace.getConfiguration('syntaxTutor');
  await cfg.update('scopeHighlight.hoverTimeout', 1, vscode.ConfigurationTarget.Global);
  const hv = await open('tour.go');
  const quietPos = find(hv.doc, 'total += n', 1); // a plain name: no cursor highlight
  hv.editor.selection = new vscode.Selection(quietPos, quietPos);
  await sleep(200);
  await hoverText(hv.doc, find(hv.doc, 'func divide'));
  assert.ok(api.currentScope(), 'hover did not highlight');
  await sleep(1500);
  assert.equal(api.currentScope(), undefined, 'hover highlight did not clear after the timeout');
  await cfg.update('scopeHighlight.hoverTimeout', undefined, vscode.ConfigurationTarget.Global);
  results.push(['hover highlight timeout', 'cleared after 1s']);

  // Edits go through incremental parsing: hovers and scopes stay right after typing.
  const ed = await open('tour.go');
  await hoverText(ed.doc, find(ed.doc, 'func divide')); // make sure the tree is cached
  const statsBefore = api.parseStats();
  const before = find(ed.doc, 'func divide');
  await ed.editor.edit((b) => b.insert(new vscode.Position(before.line, 0), '// héllo 👋 inserted\n// and another line\n'));
  await ed.editor.edit((b) => b.replace(new vscode.Range(find(ed.doc, 'divide(a'), find(ed.doc, 'divide(a', 6)), 'divvy'));
  const afterPos = find(ed.doc, 'divvy(a', 2);
  ed.editor.selection = new vscode.Selection(afterPos, afterPos);
  await sleep(200);
  const editedScope = api.currentScope();
  assert.ok(editedScope, 'no scope after edits');
  const editedText = ed.doc.getText(new vscode.Range(editedScope.primary.start.row, editedScope.primary.start.column, editedScope.primary.end.row, editedScope.primary.end.column));
  assert.ok(editedText.startsWith('func divvy(a, b int)') && editedText.endsWith('}'), editedText);
  assert.match(await hoverText(ed.doc, find(ed.doc, 'héllo 👋 inserted')), /Doc comment/);
  const statsAfter = api.parseStats();
  assert.ok(statsAfter.incremental > statsBefore.incremental, `edits were not parsed incrementally: ${JSON.stringify([statsBefore, statsAfter])}`);
  assert.equal(statsAfter.full, statsBefore.full, 'an edit fell back to a full parse');
  await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  results.push(['incremental parse after edits', `${editedText.split('\n')[0]} (${api.parseStats().incremental - statsBefore.incremental} incremental parses)`]);

  for (const [name, value] of results) console.log(`[syntax-tutor] ${name}: ${value.split('\n').slice(0, 3).join(' ⏎ ')}`);
}

module.exports = { run };
