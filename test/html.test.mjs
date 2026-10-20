import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { before, describe, test } from 'node:test';
import { at, load, readWasm } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Parsers, explain, explainLines, outlineFunction, scopeFor } = require('../dist/test/core.js');

let L;
before(async () => {
  L = await load('html', 'html', 'tour.html');
});

const hover = (...args) => L.hover(...args);
const scope = (...args) => L.scope(...args);
const md = (...args) => hover(...args)?.markdown;
/** Hover markdown for `needle` at `offset` characters into it. */
const mdAt = (needle, offset) => md(needle, 0, offset);
const scopeAt = (needle, offset) => scope(needle, 0, offset);

/** Parse a snippet with the HTML spec (for cases the tour doesn't have). */
async function snippet(src) {
  const { html } = require('../dist/test/lang-html.js');
  const parsers = await Parsers.load(readWasm, [html]);
  const tree = parsers.parse('html', src);
  return {
    md: (needle, offset = 0) => explain(html, tree, at(src, needle, 0, offset))?.markdown,
    scope: (needle, offset = 0) => scopeFor(html, tree, at(src, needle, 0, offset)),
  };
}

describe('HTML parsing', () => {
  test('the tour parses without errors', () => {
    assert.equal(L.tree.rootNode.hasError, false);
  });
});

describe('HTML elements', () => {
  test('a tag name explains its element, with an example and an MDN link', () => {
    const h = mdAt('<section id', 1);
    assert.match(h, /^\*\*`<section>`\*\* · HTML element/);
    assert.match(h, /```html\n/);
    assert.match(h, /developer\.mozilla\.org\/en-US\/docs\/Web\/HTML\/Reference\/Elements\/section\)/);
    assert.match(mdAt('<h1 class', 1), /\*\*heading\*\*[\s\S]*Heading_Elements/);
    assert.match(mdAt('<form action', 1), /^\*\*`<form>`\*\*[\s\S]*`action`/);
  });

  test('void elements say they have no end tag', () => {
    assert.match(mdAt('<br>', 1), /\*\*Void element\*\*[\s\S]*no end tag/);
    assert.match(mdAt('<img src', 1), /\*\*Void element\*\*/);
    assert.doesNotMatch(mdAt('<p class="note">', 1), /Void element/);
  });

  test('custom elements, SVG elements and unknown names', async () => {
    assert.match(mdAt('<bread-counter', 1), /^\*\*`<bread-counter>`\*\* · HTML custom element[\s\S]*customElements\.define\("bread-counter"/);
    assert.match(mdAt('<circle', 1), /HTML element \(SVG\)[\s\S]*inside the `<svg>` on line 60/);
    const s = await snippet('<blink>old</blink>\n<foo>x</foo>\n');
    assert.match(s.md('blink', 0), /\*\*obsolete\*\*/);
    assert.match(s.md('foo', 0), /not a standard HTML element/);
  });

  test('start tags, end tags and self-closing tags', async () => {
    assert.match(mdAt('<section id', 0), /^\*\*`<section>`\*\* · HTML start tag[\s\S]*end tag `<\/section>` on line 40/);
    // The whole end tag is one thing, whichever part is hovered.
    const end = hover('</nav>', 0, 3);
    assert.equal(L.text(end.span), '</nav>');
    assert.match(end.markdown, /^\*\*`<\/nav>`\*\* · HTML end tag[\s\S]*opened on line 18[\s\S]*navigation links/);
    assert.equal(L.text(hover('</nav>', 0, 0).span), '</nav>');
    assert.match(mdAt('<li><a href="mailto', 0), /left out, which is allowed for `<li>`/);
    assert.match(mdAt(' />', 1), /Inside SVG and MathML, `\/>` really closes the element/);
    const s = await snippet('<div/>\n<br/>\n<div><p>x</span></div>\n');
    assert.match(s.md('/>', 0), /doesn't close a normal element like `<div>`/);
    assert.match(s.md('<br/>', 3), /`\/` is optional/);
    assert.match(s.md('</span>', 2), /stray end tag/);
  });

  test('the doctype is explained as a whole', () => {
    const h = hover('DOCTYPE');
    assert.equal(L.text(h.span), '<!DOCTYPE html>');
    assert.match(h.markdown, /^\*\*`<!DOCTYPE html>`\*\* · HTML doctype[\s\S]*standards mode/);
    assert.equal(L.text(hover('<!DOCTYPE', 0, 0).span), '<!DOCTYPE html>');
  });
});

describe('HTML attributes', () => {
  test('global attributes', () => {
    assert.match(mdAt('id="menu"', 0), /^\*\*`id`\*\* · HTML attribute[\s\S]*\*\*Global attribute\*\*/);
    assert.match(mdAt('class="note"', 0), /class names/);
    assert.match(mdAt('lang="en"', 0), /language tag/);
    assert.match(mdAt('data-allergen', 0), /custom data attribute[\s\S]*element\.dataset\.allergen/);
  });

  test('meaning depends on the element', () => {
    assert.match(mdAt('type="email"', 0), /\*\*What kind of input\*\*/);
    assert.match(mdAt('type="submit"', 0), /\*\*What the button does\*\*[\s\S]*default inside a `<form>`/);
    assert.match(mdAt('type="module"', 0), /\*\*What kind of script\*\*/);
    assert.match(mdAt('name="viewport"', 0), /\*\*What metadata\*\*/);
    assert.match(mdAt('name="email"', 0), /value is sent with the form under this name/);
    assert.match(mdAt('value="s"', 0), /chosen/);
    assert.match(mdAt('href="/css', 0), /URL of the resource/);
    assert.match(mdAt('href="#menu"', 0), /\*\*Where the link goes\*\*/);
  });

  test('boolean attributes say so', () => {
    for (const needle of ['required', 'checked>', 'selected>', 'disabled>', 'defer>']) {
      assert.match(mdAt(needle, 0), /\*\*Boolean attribute\*\*/, needle);
    }
    assert.doesNotMatch(mdAt('placeholder', 0), /Boolean attribute/);
  });

  test('an attribute on the wrong element, unknown and custom-element attributes', async () => {
    const s = await snippet('<div href="/x" foo="1" onclick="go()" aria-label="Close"></div>\n<my-el size="3"></my-el>\n<button disabled="false">x</button>\n');
    assert.match(s.md('href'), /has \*\*no meaning on `<div>`\*\*: it applies to `<a>`/);
    assert.match(s.md('foo'), /not a standard attribute[\s\S]*data-foo/);
    assert.match(s.md('onclick'), /event handler attribute[\s\S]*the element is clicked/);
    assert.match(s.md('aria-label'), /accessible name/);
    assert.match(s.md('size'), /custom element `<my-el>`/);
    assert.match(s.md('"false"', 1), /any value turns it on, even `"false"`/);
  });

  test('attribute values: enumerated, ids, classes, URLs', () => {
    assert.match(mdAt('"email" required', 1), /^\*\*`"email"`\*\* · HTML attribute value[\s\S]*email address/);
    assert.match(mdAt('"email" required', 1), /Elements\/input\/email\)/);
    assert.match(mdAt('"_blank"', 1), /new tab/);
    const rel = mdAt('"noopener noreferrer"', 1);
    assert.match(rel, /2 keywords/);
    assert.match(rel, /- `noopener`: [\s\S]*- `noreferrer`: /);
    assert.match(mdAt('"post"', 1), /request body/);
    assert.match(mdAt('"lazy"', 1), /scroll into view/);
    assert.match(mdAt('"menu"', 1), /\*\*id\*\* of your choosing[\s\S]*#menu/);
    assert.match(mdAt('"title big"', 1), /\*\*Class names\*\*[\s\S]*`\.title`, `\.big`/);
    assert.match(mdAt('"mailto:', 1), /mailto:/);
    assert.match(mdAt('"https://example.com"', 1), /absolute URL/);
    assert.match(mdAt('"/order"', 1), /root-relative URL/);
    assert.match(mdAt('"width=device', 1), /The value for `viewport`/);
    assert.match(mdAt('colspan=2', 8), /^\*\*`2`\*\* · HTML attribute value/);
  });

  test('the quotes of a value explain the whole value', () => {
    const h = hover('"email" required');
    assert.equal(L.text(h.span), '"email"');
    assert.match(h.markdown, /email address/);
  });

  test('values that refer to another element point to it', () => {
    const f = hover('for="email"', 0, 6);
    assert.match(f.markdown, /Refers to the element with `id="email"` \(line 44\)[\s\S]*↳ \*\*Here:\*\* labels `<input id="email"/);
    const s = scopeAt('for="email"', 0);
    assert.equal(L.text(s.primary), 'for="email"');
    assert.ok(L.text(s.related).startsWith('<input id="email"') && L.text(s.related).endsWith('>'), L.text(s.related));
    const link = scopeAt('"#menu"', 1);
    assert.ok(L.text(link.related).startsWith('<section id="menu">') && L.text(link.related).endsWith('</section>'));
    assert.match(mdAt('"#menu"', 1), /Links to the element with `id="menu"` on this page \(line 33\)/);
  });
});

describe('HTML character references', () => {
  test('named, decimal and hexadecimal references show what they stand for', () => {
    assert.match(md('&amp;'), /^\*\*`&amp;`\*\* · HTML character reference\n\nStands for `&`/);
    assert.match(md('&nbsp;'), /non-breaking space/);
    assert.match(md('&ndash;'), /Stands for `–`/);
    assert.match(md('&#169;'), /decimal[\s\S]*U\+00A9\), which is `©`[\s\S]*`&#xA9;` in hexadecimal/);
    assert.match(md('&#x1F35E;'), /hexadecimal[\s\S]*which is `🍞`[\s\S]*`&#127838;` in decimal/);
    assert.equal(scope('&amp;'), undefined); // a value, not a construct
  });

  test('unknown and malformed references', async () => {
    const s = await snippet('<p>&Amp; &foo; &#xFFFFFF; &copy</p>\n');
    assert.match(s.md('&Amp;'), /case-sensitive: did you mean `&amp;`/);
    assert.match(s.md('&foo;'), /check the spelling/);
    assert.match(s.md('&#xFFFFFF;'), /not a valid Unicode character/);
    assert.match(s.md('&copy'), /should end with `;`/);
  });
});

describe('HTML scopes', () => {
  test('a tag name highlights the whole element, outlining its start and end tags', () => {
    const s = scopeAt('<section id', 1);
    assert.ok(L.text(s.primary).startsWith('<section id="menu">') && L.text(s.primary).endsWith('</section>'));
    assert.deepEqual(s.boundaries.map(L.text), ['<section id="menu">', '</section>']);
    // The same from the end tag, and from the `<`.
    const end = scope('</section>', 0, 3);
    assert.deepEqual(end.primary, s.primary);
    assert.deepEqual(end.boundaries.map(L.text), ['<section id="menu">', '</section>']);
    assert.deepEqual(scopeAt('<section id', 0).primary, s.primary);
  });

  test('void and self-closing elements are just their tag', () => {
    const br = scopeAt('<br>', 1);
    assert.equal(L.text(br.primary), '<br>'); // not the text after it
    assert.deepEqual(br.boundaries.map(L.text), ['<br>']);
    const circle = scopeAt('<circle', 1);
    assert.equal(L.text(circle.primary), '<circle cx="12" cy="12" r="10" />');
  });

  test('attributes highlight themselves; plain values and quotes have no scope', () => {
    assert.equal(L.text(scopeAt('id="menu"', 0).primary), 'id="menu"');
    assert.equal(L.text(scopeAt('id="menu"', 2).primary), 'id="menu"'); // the `=`
    assert.equal(L.text(scopeAt('loading="lazy"', 0).primary), 'loading="lazy"');
    assert.equal(scopeAt('"lazy"', 1), undefined);
    assert.equal(scopeAt('"lazy"', 0), undefined);
  });

  test('text and the contents of <script> and <style> are not explained', () => {
    assert.equal(md('Fresh bread'), undefined);
    assert.equal(md('import { start }'), undefined);
    assert.equal(md('.note { color'), undefined);
    assert.equal(scope('import { start }'), undefined);
  });
});

describe('HTML comments', () => {
  test('comments, TODOs and prettier-ignore', async () => {
    const C = await load('html', 'html', 'comments/comments.html');
    const probe = (needle) => C.hover(needle, 0, 1)?.markdown ?? '';
    assert.match(probe('A plain comment'), /^\*\*`<!-- -->` comment\*\* · HTML comment/);
    assert.equal(C.text(C.scope('several lines', 0, 1).primary), '<!--\n    A comment can span\n    several lines.\n  -->');
    assert.match(probe('a trailing comment'), /About:\*\* `<li>One<\/li>` on the same line/);
    assert.match(probe('TODO: add'), /TODO \/ FIXME note/);
    assert.match(probe('prettier-ignore'), /Prettier/);
  });
});

describe('HTML explain this line', () => {
  const lines = (needle, extra = 0) => {
    const row = at(L.src, needle).row;
    return explainLines(L.spec, L.tree, row, row + extra);
  };

  test('a start tag line names the element and its lines', () => {
    const r = lines('<section id="menu">');
    assert.equal(r.structure, 'This line starts the `<section>` element (lines 33–40).');
    assert.deepEqual(r.items.map((i) => i.text), ['<', 'section', 'id', '=', '"menu"']);
  });

  test('a void element is only its own line; an end tag is one entry', () => {
    assert.equal(lines('<input id="email"').structure, 'This line is the `<input>` element (line 44).');
    const end = lines('    </nav>');
    assert.equal(end.structure, 'This line is the `</nav>` end tag (line 24).');
    assert.deepEqual(end.items.map((i) => i.text), ['</nav>']);
    const doctype = lines('<!DOCTYPE html>');
    assert.equal(doctype.structure, 'This line is the `<!DOCTYPE>` declaration (line 1).');
    assert.deepEqual(doctype.items.map((i) => i.text), ['<!DOCTYPE html>']);
  });

  test('several lines nest the content of elements opened in them', () => {
    const r = lines('<details>', 3);
    assert.equal(r.structure, 'These lines are the `<details>` element (lines 54–57).');
    const item = (text, nth = 0) => r.items.filter((i) => i.text === text)[nth];
    assert.equal(item('details').depth, 0);
    assert.equal(item('summary').depth, 1);
    assert.equal(item('summary').scope.label, 'the `<details>` element');
    assert.equal(item('strong').depth, 2);
    assert.equal(item('strong').scope.label, 'the `<p>` element');
    assert.equal(item('</details>').depth, 0); // the tags belong to the outer level
  });
});

describe('HTML explain this function', () => {
  test('there are no functions in HTML', () => {
    assert.equal(outlineFunction(L.spec, L.tree, at(L.src, '<form action')), undefined);
  });
});
