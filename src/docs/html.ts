import type { Node } from 'web-tree-sitter';
import { codeSpan } from '../core/markdown';
import type { CommentStyle, DocEntry, DocTable, JumpTarget, LanguageSpec } from '../core/model';
import { htmlComments } from './comments';

/*
 * HTML: elements, attributes (with meanings that depend on the element), attribute
 * values, character references, the doctype and comments. The contents of
 * <script> and <style> (raw_text) are left alone here.
 *
 * Everything is built by makeHtmlSpec(options), so HTML-like languages (Vue
 * templates) can reuse it with their own hooks. The doc tables are part of the
 * spec's `docs`, under keys that never match a token:
 *
 *   "element:<name>"                   an element, e.g. "element:div"
 *   "attribute:<name>"                 an attribute on any element, e.g. "attribute:href"
 *   "attribute:<element>/<name>"       its meaning on one element, e.g. "attribute:input/type"
 *   "value:<attribute>=<value>"        a value, e.g. "value:target=_blank"
 *   "value:<element>/<attribute>=<value>"  e.g. "value:input/type=email"
 *
 * Names and values are looked up in lowercase (values first as written).
 */

const MDN = 'https://developer.mozilla.org/en-US/docs/Web';
const ELEMENTS = `${MDN}/HTML/Reference/Elements`;
const GLOBAL = `${MDN}/HTML/Reference/Global_attributes`;
const ATTRIBUTES = `${MDN}/HTML/Reference/Attributes`;
const ARIA = `${MDN}/Accessibility/ARIA/Reference`;
const elementLink = (name: string) => (/^h[1-6]$/.test(name) ? `${ELEMENTS}/Heading_Elements` : `${ELEMENTS}/${name}`);
const CHARACTER_REFERENCE = 'https://developer.mozilla.org/en-US/docs/Glossary/Character_reference';
const CUSTOM_ELEMENTS = `${MDN}/API/Web_components/Using_custom_elements`;
const BASICS = 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax';

const code = (s: string) => codeSpan(s);
const tag = (name: string) => code(`<${name}>`);
const shorten = (s: string, max = 40) => {
  const line = s.split('\n', 1)[0];
  return line.length > max || line !== s ? `${line.slice(0, max - 1)}…` : line;
};

// ------------------------------------------------------------------ elements

export interface ElementInfo {
  summary: string;
  details?: string;
  example?: string;
  /** Default: the element's MDN page. */
  link?: string;
}

const heading: ElementInfo = {
  summary: 'A **heading**, from level 1 to 6: `<h1>` is the most important (usually the page title), `<h6>` the least. Headings outline the page, and screen reader users jump between them.',
  details: 'Don\'t skip levels (an `<h4>` right after an `<h2>`), and don\'t pick a level for its size: change the size with CSS.',
  example: '<h1>Recipes</h1>\n<h2>Soups</h2>\n<h3>Tomato soup</h3>',
};

/** Every common HTML element, by name. */
export const HTML_ELEMENTS: Record<string, ElementInfo> = {
  // ------------------------------------------------- document and metadata
  html: {
    summary: 'The **root** element: everything else goes inside it. Its `lang` attribute sets the language of the page, for screen readers, translation and hyphenation.',
    example: '<!DOCTYPE html>\n<html lang="en">\n  <head>…</head>\n  <body>…</body>\n</html>',
  },
  head: {
    summary: 'Holds **information about the page** that isn\'t shown in it: the `<title>`, `<meta>` tags and links to stylesheets and scripts.',
    example: '<head>\n  <meta charset="utf-8">\n  <title>My page</title>\n  <link rel="stylesheet" href="style.css">\n</head>',
  },
  title: {
    summary: 'The **title** of the page, shown in the browser tab, in bookmarks and in search results. Only text, no tags. One per page, inside `<head>`.',
    example: '<title>Contact us – Example Shop</title>',
  },
  base: {
    summary: 'Sets the **base URL** that every relative URL on the page is resolved against (and optionally a default `target` for links). At most one, inside `<head>`.',
    example: '<base href="https://example.com/docs/">',
  },
  link: {
    summary: 'Links the page to an **external resource**, most often a stylesheet. `rel` says what the resource is (`stylesheet`, `icon`, `preload`, ...) and `href` where it is.',
    example: '<link rel="stylesheet" href="style.css">\n<link rel="icon" href="favicon.ico">',
  },
  meta: {
    summary: '**Metadata** about the page that has no element of its own: the character encoding (`charset`), or a `name` with its `content`, such as the viewport settings or a description for search engines.',
    example: '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="Fresh bread, delivered daily.">',
  },
  style: {
    summary: 'Holds **CSS** rules for this page. A separate file linked with `<link rel="stylesheet">` is easier to reuse, and the browser can cache it.',
    example: '<style>\n  p { color: navy; }\n</style>',
  },
  body: {
    summary: 'The **content** of the page: everything that is shown. One per page, after `<head>`.',
    example: '<body>\n  <h1>Hello!</h1>\n  <p>Welcome to my page.</p>\n</body>',
  },
  script: {
    summary: 'Runs **JavaScript**: the code inside it, or the file given by `src`. A plain `<script>` stops the page from being read further until it has loaded and run; `defer`, `async` and `type="module"` avoid that.',
    details: 'With `src`, anything written inside the element is ignored. A script can only use elements above it, unless it is deferred (`defer` and modules run after the whole page is read).',
    example: '<script src="app.js" defer></script>\n<script type="module">\n  import { start } from "./app.js";\n  start();\n</script>',
  },
  noscript: {
    summary: 'Content that is only shown when **JavaScript is turned off** or not supported.',
    example: '<noscript>This site needs JavaScript to work.</noscript>',
  },
  template: {
    summary: 'Holds HTML that is **not shown**: a reusable piece that JavaScript can copy (`template.content.cloneNode(true)`) and insert into the page.',
    example: '<template id="row">\n  <tr><td class="name"></td></tr>\n</template>',
  },
  slot: {
    summary: 'A **placeholder** in a web component\'s shadow DOM: the custom element\'s children are shown here. A named slot shows only the children with a matching `slot="..."` attribute.',
    example: '<template id="card">\n  <h2><slot name="title">Untitled</slot></h2>\n  <slot></slot>\n</template>',
  },

  // ---------------------------------------------------------------- sections
  header: {
    summary: 'A **header**: introductory content for the page, or for the section it is in, such as a logo, a title and navigation.',
    example: '<header>\n  <img src="logo.svg" alt="Example Shop">\n  <nav>…</nav>\n</header>',
  },
  footer: {
    summary: 'A **footer** for the page, or for the section it is in: author, copyright, related links.',
    example: '<footer>\n  <p>© 2025 Example Shop</p>\n</footer>',
  },
  main: {
    summary: 'The **main content** of the page: the part that is unique to it, not the header, navigation or footer. Use one visible `<main>` per page; screen reader users can jump straight to it.',
    example: '<body>\n  <header>…</header>\n  <main>\n    <h1>Our menu</h1>\n  </main>\n</body>',
  },
  nav: {
    summary: 'A block of **navigation links**: the site menu, a table of contents, breadcrumbs. Screen reader users can jump to it.',
    example: '<nav>\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/about">About</a></li>\n  </ul>\n</nav>',
  },
  section: {
    summary: 'A **section** of the document, with a heading of its own: a chapter, a part of a long page, a tab panel. If it only groups things for styling, use a `<div>` instead.',
    example: '<section>\n  <h2>Opening hours</h2>\n  <p>Monday to Friday, 9 to 5.</p>\n</section>',
  },
  article: {
    summary: 'A **self-contained** piece of content that would make sense on its own: a blog post, a news story, a comment, a product card.',
    example: '<article>\n  <h2>We moved!</h2>\n  <p>Find us at our new address…</p>\n</article>',
  },
  aside: {
    summary: 'Content that is **indirectly related** to what is around it: a sidebar, a call-out box, related links.',
    example: '<aside>\n  <h2>Did you know?</h2>\n  <p>Bread freezes well.</p>\n</aside>',
  },
  address: {
    summary: '**Contact information** for the person or organization the page (or the nearest `<article>`) is about.',
    example: '<address>\n  <a href="mailto:info@example.com">info@example.com</a>\n</address>',
  },
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  hgroup: {
    summary: 'Groups a **heading** with related text, such as a subtitle or a tagline.',
    example: '<hgroup>\n  <h1>Frankenstein</h1>\n  <p>Or: The Modern Prometheus</p>\n</hgroup>',
  },
  search: {
    summary: 'Marks a **search** area: the form or controls used to search the site or the page.',
    example: '<search>\n  <form action="/search">\n    <input type="search" name="q">\n  </form>\n</search>',
  },

  // ------------------------------------------------------------ text content
  div: {
    summary: 'A **generic container** with no meaning of its own, to group content for styling or layout with CSS. Prefer an element that says what the content is (`<section>`, `<nav>`, `<article>`, `<ul>`...) when one fits.',
    example: '<div class="card">\n  <h2>Title</h2>\n  <p>Text</p>\n</div>',
  },
  p: {
    summary: 'A **paragraph** of text. Browsers add space above and below it.',
    details: 'A paragraph holds only text-level content (text, `<a>`, `<strong>`, `<img>`...). A block such as `<div>` or `<ul>` inside it ends the paragraph early, which is why `</p>` is optional.',
    example: '<p>Fresh bread, <strong>every</strong> morning.</p>',
  },
  hr: {
    summary: 'A **thematic break** between paragraphs: a change of topic or scene. Shown as a horizontal line.',
    example: '<p>…end of chapter one.</p>\n<hr>\n<p>Chapter two…</p>',
  },
  pre: {
    summary: '**Preformatted** text: spaces and line breaks are kept exactly as written, in a monospace font. Wrap `<code>` in it for blocks of code.',
    example: '<pre><code>if (x) {\n  run();\n}</code></pre>',
  },
  blockquote: {
    summary: 'A longer **quotation** from another source, shown as an indented block. `cite` can give the URL of the source.',
    example: '<blockquote cite="https://example.com/speech">\n  <p>We choose to go to the Moon.</p>\n</blockquote>',
  },
  ol: {
    summary: 'An **ordered list**: its `<li>` items are numbered. `start`, `reversed` and `type` change the numbering.',
    example: '<ol>\n  <li>Preheat the oven</li>\n  <li>Bake for 20 minutes</li>\n</ol>',
  },
  ul: {
    summary: 'An **unordered list**: its `<li>` items get bullets. Also the usual markup for a menu inside `<nav>`.',
    example: '<ul>\n  <li>Flour</li>\n  <li>Water</li>\n</ul>',
  },
  li: {
    summary: 'A **list item**, inside `<ul>`, `<ol>` or `<menu>`. Its end tag `</li>` is optional: the next `<li>` (or the end of the list) ends it.',
    example: '<ul>\n  <li>Flour</li>\n  <li>Water</li>\n</ul>',
  },
  dl: {
    summary: 'A **description list**: terms (`<dt>`) each followed by their description (`<dd>`). For glossaries and key–value data.',
    example: '<dl>\n  <dt>HTML</dt>\n  <dd>The structure of a web page.</dd>\n  <dt>CSS</dt>\n  <dd>How it looks.</dd>\n</dl>',
  },
  dt: { summary: 'A **term** in a description list (`<dl>`), followed by its description in `<dd>`.', example: '<dt>HTML</dt>\n<dd>The structure of a web page.</dd>' },
  dd: { summary: 'The **description** of the term (`<dt>`) before it, in a description list (`<dl>`).', example: '<dt>HTML</dt>\n<dd>The structure of a web page.</dd>' },
  figure: {
    summary: 'A **figure**: an image, diagram, code listing or quote that the text refers to, with an optional caption in `<figcaption>`.',
    example: '<figure>\n  <img src="chart.png" alt="Sales doubled in 2024">\n  <figcaption>Sales per year</figcaption>\n</figure>',
  },
  figcaption: { summary: 'The **caption** of a `<figure>`: its first or last child.', example: '<figure>\n  <img src="cat.jpg" alt="A sleeping cat">\n  <figcaption>Our cat, Miso</figcaption>\n</figure>' },
  menu: {
    summary: 'A list of **commands**: like `<ul>`, but for toolbar buttons and actions. It holds `<li>` items.',
    example: '<menu>\n  <li><button>Copy</button></li>\n  <li><button>Paste</button></li>\n</menu>',
  },

  // ------------------------------------------------------------- inline text
  a: {
    summary: 'An **anchor**: a link. `href` says where it goes: another page, a place on this page (`#id`), an email address (`mailto:`) or a phone number (`tel:`).',
    details: 'Without `href` it is only a placeholder, not a link. For actions that don\'t go anywhere (open a menu, save), use a `<button>`.',
    example: '<a href="/about">About us</a>\n<a href="#contact">Jump to contact</a>\n<a href="https://example.com" target="_blank" rel="noopener">Example</a>',
  },
  abbr: { summary: 'An **abbreviation** or acronym. `title` can give the full form, shown as a tooltip.', example: '<abbr title="HyperText Markup Language">HTML</abbr>' },
  b: { summary: 'Text to **draw attention** to, shown bold, without extra importance: key words, product names. For importance use `<strong>`.', example: '<p>Add the <b>flour</b> and the <b>water</b>.</p>' },
  bdi: { summary: '**Bidirectional isolation**: text whose direction may differ from the text around it, such as a user name in Arabic in an English sentence.', example: '<li>User <bdi>إيان</bdi>: 90 points</li>' },
  bdo: { summary: '**Bidirectional override**: shows the text in the direction given by `dir`, whatever its characters are.', example: '<bdo dir="rtl">This text runs right to left.</bdo>' },
  br: { summary: 'A **line break** inside text, for lines that belong together, like an address or a poem. Not for spacing: use CSS margins for that.', example: '<p>Example Shop<br>\nMain Street 1<br>\nSpringfield</p>' },
  cite: { summary: 'The **title of a creative work**: a book, film, song or article.', example: '<p>My favourite book is <cite>Dune</cite>.</p>' },
  code: { summary: 'A fragment of **computer code**, in a monospace font. Put it inside `<pre>` for a block of several lines.', example: '<p>Call <code>fetch()</code> to load data.</p>' },
  data: { summary: 'Adds a **machine-readable value** (`value`) to content that is meant for people.', example: '<data value="398">Mini Ketchup</data>' },
  dfn: { summary: 'The **defining instance** of a term: the place in the text where the term is explained.', example: '<p>A <dfn>validator</dfn> checks your HTML for errors.</p>' },
  em: { summary: '**Emphasis**: stressed text that changes the meaning of the sentence. Shown in italics.', example: '<p>I <em>did</em> lock the door.</p>' },
  i: { summary: 'Text in an **alternate voice**: a technical term, a word in another language, a thought, a ship\'s name. Shown in italics. For stress, use `<em>`.', example: '<p>The <i lang="fr">croissant</i> was perfect.</p>' },
  kbd: { summary: '**Keyboard input**: keys or text that the user types.', example: '<p>Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.</p>' },
  mark: { summary: '**Highlighted** text, marked for reference, like matches of a search. Shown with a yellow background.', example: '<p>Results for "<mark>bread</mark>"</p>' },
  q: { summary: 'A short **inline quotation**. The browser adds the quotation marks.', example: '<p>She said <q>see you tomorrow</q>.</p>' },
  rp: { summary: '**Fallback parentheses** around ruby text, for browsers that can\'t show ruby annotations.', example: '<ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby>', link: `${ELEMENTS}/rp` },
  rt: { summary: 'The **ruby text** of a `<ruby>`: the pronunciation or translation shown above the base text.', example: '<ruby>漢<rt>kan</rt></ruby>' },
  ruby: { summary: 'A **ruby annotation**: small text above or beside characters, mostly to show how East Asian characters are pronounced.', example: '<ruby>漢<rt>kan</rt>字<rt>ji</rt></ruby>' },
  s: { summary: 'Text that is **no longer accurate or relevant**, shown struck through. For edits to a document, use `<del>`.', example: '<p><s>€20</s> €15</p>' },
  samp: { summary: '**Sample output** of a program, in a monospace font.', example: '<p>The program printed <samp>File not found.</samp></p>' },
  small: { summary: '**Side comments** and small print: copyright notices, legal text. Shown smaller.', example: '<p><small>Prices include VAT.</small></p>' },
  span: { summary: 'A **generic inline container** with no meaning of its own, to style or script part of a text. The inline counterpart of `<div>`.', example: '<p>Status: <span class="ok">online</span></p>' },
  strong: { summary: '**Strong importance**: something serious, urgent or important. Shown bold.', example: '<p><strong>Warning:</strong> hot surface.</p>' },
  sub: { summary: '**Subscript**: text shown lower and smaller, as in H₂O.', example: '<p>H<sub>2</sub>O</p>' },
  sup: { summary: '**Superscript**: text shown higher and smaller, as in x² or a footnote marker.', example: '<p>E = mc<sup>2</sup></p>' },
  time: { summary: 'A **date or time**. `datetime` gives it in a machine-readable form when the text isn\'t one, for search engines, calendars and scripts.', example: '<p>Open from <time datetime="2025-06-01">June 1st</time>.</p>' },
  u: { summary: 'Text with an **unarticulated annotation**, such as a spelling mistake, shown underlined. Easily mistaken for a link, so use it with care.', example: '<p>I <u>definately</u> agree.</p>' },
  var: { summary: 'A **variable** in maths or programming, shown in italics.', example: '<p>The area is <var>w</var> × <var>h</var>.</p>' },
  wbr: { summary: 'A **word break opportunity**: a place where the browser may break a long word or URL across lines, if needed.', example: '<p>https://example.com/<wbr>very/<wbr>long/<wbr>path</p>' },
  del: { summary: '**Deleted** text: removed from the document in an edit, shown struck through. `datetime` and `cite` can say when and why.', example: '<p>Meet at <del>10:00</del> <ins>11:00</ins>.</p>' },
  ins: { summary: '**Inserted** text: added to the document in an edit, shown underlined.', example: '<p>Meet at <del>10:00</del> <ins>11:00</ins>.</p>' },

  // ------------------------------------------------------------------- media
  img: {
    summary: 'An **image**. `src` gives the file, and `alt` a text alternative for people who can\'t see it (and for when the image fails to load).',
    details: 'Set `width` and `height` so the page doesn\'t jump when the image arrives, and `loading="lazy"` to load images below the fold only when needed. `srcset` and `sizes` offer several resolutions.',
    example: '<img src="cat.jpg" alt="A cat asleep on a keyboard" width="640" height="480">',
  },
  picture: {
    summary: 'Offers **several versions of an image**: the browser uses the first `<source>` whose `media` or `type` fits, and otherwise the `<img>` inside.',
    example: '<picture>\n  <source srcset="photo.avif" type="image/avif">\n  <img src="photo.jpg" alt="Our shop">\n</picture>',
  },
  source: {
    summary: 'One **media source** for a `<picture>`, `<video>` or `<audio>`: the browser uses the first one it can play or that matches.',
    example: '<video controls>\n  <source src="clip.webm" type="video/webm">\n  <source src="clip.mp4" type="video/mp4">\n</video>',
  },
  audio: {
    summary: 'Embeds **sound**. `controls` shows the play controls; `<source>` children can offer several formats.',
    example: '<audio src="song.mp3" controls></audio>',
  },
  video: {
    summary: 'Embeds a **video**. `controls` shows play controls and `poster` an image until it plays. Browsers only allow `autoplay` together with `muted`.',
    example: '<video src="clip.mp4" controls poster="still.jpg" width="640"></video>',
  },
  track: {
    summary: '**Timed text** for a `<video>` or `<audio>`: subtitles, captions or chapters, from a WebVTT (`.vtt`) file.',
    example: '<video src="clip.mp4" controls>\n  <track kind="subtitles" src="clip.nl.vtt" srclang="nl" label="Nederlands">\n</video>',
  },
  map: {
    summary: 'An **image map**: clickable `<area>` regions on an image that refers to it with `usemap="#name"`.',
    example: '<img src="plan.png" alt="Floor plan" usemap="#rooms">\n<map name="rooms">\n  <area shape="rect" coords="0,0,100,100" href="/kitchen" alt="Kitchen">\n</map>',
  },
  area: {
    summary: 'A **clickable region** of an image map (`<map>`), with its own `href` and `alt`.',
    example: '<area shape="circle" coords="50,50,25" href="/bath" alt="Bathroom">',
  },
  iframe: {
    summary: 'Embeds **another web page** in this one, such as a map or a video player. `title` should say what it is; `sandbox` limits what the embedded page may do.',
    example: '<iframe src="https://example.com/map" title="Map of our shop" width="600" height="400"></iframe>',
  },
  embed: { summary: 'Embeds **external content** that the browser or a plugin shows, such as a PDF.', example: '<embed src="manual.pdf" type="application/pdf" width="600" height="800">' },
  object: { summary: 'Embeds an **external resource**: an image, a PDF, another page. What you write inside is the fallback when it can\'t be shown.', example: '<object data="manual.pdf" type="application/pdf">\n  <a href="manual.pdf">Download the manual</a>\n</object>' },
  canvas: {
    summary: 'A **drawing surface** for graphics made with JavaScript (the Canvas 2D API or WebGL). Its content is only shown in browsers without canvas support.',
    example: '<canvas id="chart" width="400" height="300"></canvas>\n<script>\n  const ctx = document.getElementById("chart").getContext("2d");\n  ctx.fillRect(10, 10, 100, 50);\n</script>',
  },
  svg: {
    summary: 'Inline **SVG**: vector graphics written as markup, right in the page. Inside it, SVG elements such as `<circle>` and `<path>` apply, and `/>` really closes an element.',
    example: '<svg width="100" height="100" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="tomato" />\n</svg>',
    link: `${MDN}/SVG/Reference/Element/svg`,
  },
  math: {
    summary: '**MathML**: mathematical formulas written as markup.',
    example: '<math>\n  <msup><mi>x</mi><mn>2</mn></msup>\n</math>',
    link: `${MDN}/MathML/Reference/Element/math`,
  },

  // ------------------------------------------------------------------ tables
  table: {
    summary: 'A **table** of data, in rows (`<tr>`) of cells: header cells `<th>` and data cells `<td>`. Only for data in rows and columns, not for page layout (use CSS grid or flexbox).',
    example: '<table>\n  <tr><th>Name</th><th>Price</th></tr>\n  <tr><td>Bread</td><td>€2.50</td></tr>\n</table>',
  },
  caption: { summary: 'The **title** of a table, as the first child of `<table>`.', example: '<table>\n  <caption>Prices in 2025</caption>\n  …\n</table>' },
  thead: { summary: 'The **header rows** of a table.', example: '<thead>\n  <tr><th>Name</th><th>Price</th></tr>\n</thead>' },
  tbody: { summary: 'The **body rows** of a table. If you leave it out, the browser adds one around the rows.', example: '<tbody>\n  <tr><td>Bread</td><td>€2.50</td></tr>\n</tbody>' },
  tfoot: { summary: 'The **footer rows** of a table, e.g. totals.', example: '<tfoot>\n  <tr><td>Total</td><td>€7.50</td></tr>\n</tfoot>' },
  tr: { summary: 'A **table row**, holding `<th>` and `<td>` cells. Its end tag `</tr>` is optional.', example: '<tr><td>Bread</td><td>€2.50</td></tr>' },
  th: { summary: 'A **header cell**: labels a column or a row (`scope="col"` or `"row"`). Shown bold and centered.', example: '<tr><th scope="col">Name</th><th scope="col">Price</th></tr>' },
  td: { summary: 'A **data cell** in a table row. `colspan` and `rowspan` let it span several columns or rows.', example: '<tr><td>Bread</td><td>€2.50</td></tr>' },
  colgroup: { summary: 'A **group of columns** in a table, to style them together.', example: '<colgroup>\n  <col>\n  <col span="2" class="prices">\n</colgroup>' },
  col: { summary: 'One or more **columns** (`span`) inside a `<colgroup>`, to style a whole column at once.', example: '<col span="2" class="prices">' },

  // ------------------------------------------------------------------- forms
  form: {
    summary: 'A **form**: groups input controls and sends their values when it is submitted. `action` says where to (default: this page) and `method` how (`get` or `post`).',
    details: 'Each control\'s `name` is the key its value is sent under; controls without a `name` are not sent. Pressing Enter in a text field or clicking a submit button submits the form.',
    example: '<form action="/subscribe" method="post">\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email" required>\n  <button>Subscribe</button>\n</form>',
  },
  label: {
    summary: 'A **label** for a form control. Connect them with `for="id-of-the-control"`, or by putting the control inside the label. Clicking the label then focuses the control, and screen readers read it out.',
    example: '<label for="name">Name</label>\n<input id="name" name="name">\n\n<label><input type="checkbox" name="terms"> I agree</label>',
  },
  input: {
    summary: 'A **form control** for user input. Its `type` decides what kind: text (the default), `email`, `password`, `number`, `checkbox`, `radio`, `date`, `file`, `range`, `submit`...',
    details: 'Give it a `name` (the key its value is sent under) and a `<label>`. Attributes like `required`, `min`, `max` and `pattern` let the browser check the value before the form is sent.',
    example: '<input type="text" name="city" placeholder="Amsterdam">\n<input type="number" name="age" min="0" max="120">\n<input type="checkbox" name="news" checked>',
  },
  button: {
    summary: 'A **button**. Inside a `<form>`, its `type` is `submit` by default: write `type="button"` for a button that only runs JavaScript.',
    example: '<button type="submit">Send</button>\n<button type="button" onclick="openMenu()">Menu</button>',
  },
  select: {
    summary: 'A **drop-down list** of `<option>`s, or a list box with `multiple` or `size`.',
    example: '<select name="size">\n  <option value="s">Small</option>\n  <option value="m" selected>Medium</option>\n</select>',
  },
  option: {
    summary: 'An **item** in a `<select>` or `<datalist>`. `value` is what gets sent (default: its text); `selected` picks it at the start.',
    example: '<option value="nl">Netherlands</option>',
  },
  optgroup: { summary: 'A **group of options** in a `<select>`, with a `label` shown as its heading.', example: '<optgroup label="Fruit">\n  <option>Apple</option>\n  <option>Pear</option>\n</optgroup>' },
  textarea: {
    summary: 'A **multi-line text field**. Its starting text goes between the tags (not in a `value` attribute); `rows` and `cols` set its size.',
    example: '<textarea name="message" rows="4" cols="40">Hello!</textarea>',
  },
  fieldset: {
    summary: 'Groups **related controls** in a form, with a `<legend>` as caption. `disabled` on it disables every control inside.',
    example: '<fieldset>\n  <legend>Delivery</legend>\n  <label><input type="radio" name="ship" value="home"> Home</label>\n  <label><input type="radio" name="ship" value="shop"> Pick up</label>\n</fieldset>',
  },
  legend: { summary: 'The **caption** of a `<fieldset>`, as its first child.', example: '<fieldset>\n  <legend>Delivery</legend>\n  …\n</fieldset>' },
  datalist: {
    summary: 'A list of **suggestions** (`<option>`s) for an `<input>` that points to it with `list="id"`. The user can still type anything.',
    example: '<input list="fruits" name="fruit">\n<datalist id="fruits">\n  <option value="Apple">\n  <option value="Pear">\n</datalist>',
  },
  output: { summary: 'Shows the **result of a calculation** or of a user action, usually filled in by a script.', example: '<output name="total" for="price amount">0</output>' },
  progress: { summary: 'A **progress bar**: how much of a task is done (`value` out of `max`). Without a `value` it shows that something is busy.', example: '<progress value="70" max="100">70%</progress>' },
  meter: { summary: 'A **gauge**: a measurement within a known range, such as disk usage or a score (`value`, `min`, `max`, and `low`, `high`, `optimum` for the colors).', example: '<meter value="0.6" low="0.3" high="0.8">60%</meter>' },

  // ------------------------------------------------------------- interactive
  details: {
    summary: 'A **disclosure widget**: shows its `<summary>`, and the rest of its content when the user opens it. No JavaScript needed; `open` starts it opened.',
    example: '<details>\n  <summary>Shipping costs</summary>\n  <p>Free above €50.</p>\n</details>',
  },
  summary: { summary: 'The always visible **heading** of a `<details>` element: clicking it opens or closes the details.', example: '<details>\n  <summary>Shipping costs</summary>\n  <p>Free above €50.</p>\n</details>' },
  dialog: {
    summary: 'A **dialog box**. Open it from JavaScript with `dialog.showModal()` (modal, with a backdrop; Esc closes it) or `dialog.show()`, and close it with `dialog.close()` or a `<form method="dialog">` inside it.',
    example: '<dialog id="confirm">\n  <form method="dialog">\n    <p>Delete this file?</p>\n    <button value="yes">Yes</button>\n    <button value="no">No</button>\n  </form>\n</dialog>',
  },
};

/** Elements that are only a start tag: no content, no end tag. */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Elements whose end tag may be left out (the next element or the parent's end tag closes them). */
export const OPTIONAL_END_TAG: ReadonlySet<string> = new Set([
  'html', 'head', 'body', 'li', 'dt', 'dd', 'p', 'rt', 'rp', 'optgroup', 'option', 'colgroup', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
]);

/** Elements that are no longer part of HTML, and what to use instead. */
const OBSOLETE: Record<string, string> = {
  center: 'Centered its content. Use CSS instead: `text-align: center`, or `margin-inline: auto` for a block.',
  font: 'Set the font, size and color of text. Use CSS instead (`font-family`, `font-size`, `color`).',
  big: 'Made text bigger. Use CSS `font-size` instead.',
  tt: 'Showed text in a monospace font. Use `<code>`, `<kbd>` or `<samp>`, or CSS.',
  strike: 'Struck text through. Use `<s>` or `<del>` instead.',
  marquee: 'Scrolled text across the screen. Use a CSS animation if you really must.',
  blink: 'Made text blink. Never supported widely; use CSS if you really must.',
  frame: 'Was a pane of a `<frameset>`. Use `<iframe>` or a normal layout instead.',
  frameset: 'Split the window into `<frame>`s. Use a normal page layout with CSS instead.',
  noframes: 'Was the fallback for browsers without frames.',
  acronym: 'Marked an acronym. Use `<abbr>` instead.',
  applet: 'Embedded a Java applet. Java applets no longer run in browsers.',
  basefont: 'Set the default font. Use CSS instead.',
  dir: 'Was a directory list. Use `<ul>` instead.',
  keygen: 'Generated key pairs in forms. Removed from browsers.',
  param: 'Passed parameters to an `<object>` plugin. Plugins are gone, so it does nothing.',
  xmp: 'Showed preformatted text. Use `<pre>` and escape `<` as `&lt;`.',
  listing: 'Showed preformatted text. Use `<pre>` instead.',
  plaintext: 'Showed the rest of the page as plain text. Use `<pre>` instead.',
  nobr: 'Kept text on one line. Use CSS `white-space: nowrap` instead.',
};

// ---------------------------------------------------------------- attributes

export interface AttributeInfo {
  summary: string;
  details?: string;
  example?: string;
  /** Default: the global attribute's MDN page, or the first element's page in `on`. */
  link?: string;
  /** A boolean attribute: present means on, absent means off. */
  boolean?: boolean;
  /** The elements it applies to (lowercase). Absent: a global attribute, valid on every element. */
  on?: readonly string[];
}

const FORM_CONTROLS = ['input', 'select', 'textarea', 'button'];
const MEDIA = ['audio', 'video'];

/**
 * Attributes, keyed by name ("href", valid on the elements in `on`, or on every
 * element when that's absent) or by "element/name" for a meaning specific to one
 * element ("input/type").
 */
export const HTML_ATTRIBUTES: Record<string, AttributeInfo> = {
  // ---------------------------------------------------------------- global
  id: {
    summary: 'A **unique name** for the element, chosen by you. CSS selects it with `#name`, JavaScript finds it with `document.getElementById("name")`, links jump to it with `href="#name"`, and `<label for="name">` points to it.',
    details: 'Each id may occur only once per page. It can\'t contain spaces.',
    example: '<section id="contact">…</section>\n<a href="#contact">Contact</a>',
  },
  class: {
    summary: 'One or more **class names**, separated by spaces, chosen by you. CSS styles every element with a class using `.name`; JavaScript finds them with `querySelectorAll(".name")` and changes them with `element.classList`.',
    example: '<p class="note warning">Mind the step.</p>\n<style>\n  .warning { color: darkred; }\n</style>',
  },
  style: {
    summary: '**Inline CSS** for this element only: declarations like `color: red; margin: 0`, without a selector or braces.',
    details: 'Handy for a quick test, but a stylesheet with a class is easier to reuse and change. Inline styles win over most stylesheet rules.',
    example: '<p style="color: navy; font-weight: bold">Hi</p>',
  },
  title: {
    summary: '**Extra information** about the element, shown as a tooltip when the mouse rests on it.',
    details: 'Touch screen and keyboard users usually never see it, so don\'t put anything essential in it. On `<abbr>` it gives the full form, on `<iframe>` it names the embedded page.',
    example: '<abbr title="World Health Organization">WHO</abbr>',
  },
  lang: {
    summary: 'The **language** of the element\'s content, as a language tag: `en`, `en-GB`, `nl`, `zh-Hant`. Screen readers pick their pronunciation from it, and browsers use it for hyphenation, quotes and translation.',
    example: '<html lang="en">\n<p>The French say <span lang="fr">bonjour</span>.</p>',
  },
  dir: {
    summary: 'The **text direction**: `ltr` (left to right), `rtl` (right to left, as in Arabic and Hebrew) or `auto` (decided by the text).',
    example: '<p dir="rtl">مرحبا</p>',
  },
  hidden: {
    summary: '**Hides** the element: it isn\'t shown, and screen readers skip it. `hidden="until-found"` hides it but lets the browser\'s find-in-page reveal it.',
    details: 'CSS can override it: a rule like `display: flex` on the element shows it again.',
    example: '<p id="error" hidden>Something went wrong.</p>',
    boolean: true,
  },
  tabindex: {
    summary: 'Whether the element can get **keyboard focus**, and where in the Tab order: `0` puts it in the normal order, `-1` makes it focusable only from script. Positive numbers jump ahead of everything else, which is almost always a mistake.',
    example: '<div role="button" tabindex="0">Custom button</div>',
  },
  accesskey: { summary: 'A **keyboard shortcut** that focuses or activates the element (with Alt, or Alt+Shift, depending on the browser). It may clash with shortcuts of the browser or screen reader.', example: '<button accesskey="s">Save</button>' },
  contenteditable: {
    summary: 'Makes the element\'s content **editable** by the user, like a text box: `true` (or empty), `false`, or `plaintext-only`.',
    example: '<div contenteditable="true">Edit me!</div>',
  },
  draggable: { summary: 'Whether the user can **drag** the element (`true` or `false`), for the HTML drag and drop API. Images and links are draggable by default.', example: '<li draggable="true">Drag me</li>' },
  spellcheck: { summary: 'Whether the browser should **check the spelling** of editable text in this element: `true` or `false`.', example: '<textarea spellcheck="false"></textarea>' },
  translate: { summary: 'Whether the content should be **translated** by translation tools: `yes` or `no` (for brand names, code, ...).', example: '<p>Open <span translate="no">GitHub</span> and log in.</p>' },
  inert: { summary: 'Makes the element and everything in it **inert**: it can\'t be clicked, focused or found, and screen readers skip it. Handy for content behind a modal.', example: '<main inert>…</main>', boolean: true },
  popover: {
    summary: 'Turns the element into a **popover**: hidden until a button with `popovertarget` (or `element.showPopover()`) shows it on top of everything. `auto` (the default) closes when you click outside or press Esc; `manual` only closes when told to.',
    example: '<button popovertarget="tip">?</button>\n<div id="tip" popover>Passwords need 12 characters.</div>',
  },
  autofocus: { summary: 'Gives the element **keyboard focus** as soon as the page (or the dialog it is in) opens. Use it at most once, and sparingly: it can confuse screen reader users.', example: '<input name="q" autofocus>', boolean: true },
  enterkeyhint: { summary: 'Which **label the Enter key** shows on a virtual keyboard: `enter`, `done`, `go`, `next`, `previous`, `search` or `send`.', example: '<input type="search" enterkeyhint="search">' },
  inputmode: { summary: 'Which **virtual keyboard** to show when the user edits this field on a touch device: `numeric`, `decimal`, `tel`, `email`, `url`, `search`, `text` or `none`.', example: '<input name="pin" inputmode="numeric">' },
  autocapitalize: { summary: 'Whether a virtual keyboard should **capitalize** text automatically: `off`, `sentences`, `words` or `characters`.', example: '<input name="code" autocapitalize="characters">' },
  is: { summary: 'Makes a built-in element behave as a **customized built-in element**: one defined with `customElements.define("name", class extends HTMLButtonElement {…}, { extends: "button" })`. Not supported in Safari.', example: '<button is="fancy-button">Click</button>' },
  nonce: { summary: 'A **one-time token** that a Content Security Policy checks before it allows this inline `<script>` or `<style>` to run. The server makes up a new one for each response.', example: '<script nonce="r4nd0m">…</script>' },
  slot: { summary: 'Puts this child of a custom element into the **named `<slot>`** with the same `name` in the component\'s shadow DOM.', example: '<user-card>\n  <span slot="title">Ada Lovelace</span>\n</user-card>' },
  part: { summary: 'Exposes an element inside a shadow DOM to **outside CSS**, which can style it with `::part(name)`.', example: '<button part="label">…</button>\n<!-- outside: user-card::part(label) { color: red; } -->' },
  role: {
    summary: 'The **ARIA role**: tells assistive technology what the element is (`button`, `navigation`, `dialog`, `alert`, ...), when the element itself doesn\'t say so.',
    details: 'The first rule of ARIA: use a native element if one exists. `<button>` is better than `<div role="button">`, which also needs `tabindex` and keyboard handling.',
    example: '<div role="alert">Your session expired.</div>',
    link: `${ARIA}/Roles`,
  },
  xmlns: { summary: 'The **XML namespace** of the element. Not needed in HTML (the browser knows `<svg>` and `<math>`), only in XHTML and standalone SVG files.', example: '<svg xmlns="http://www.w3.org/2000/svg">…</svg>', link: `${MDN}/SVG/Guides/Namespaces_crash_course`, on: ['html', 'svg', 'math'] },

  // ----------------------------------------------------------------- links
  href: {
    summary: 'The **URL** this element points to: on `<a>` and `<area>` where the link goes, on `<link>` the resource to load, on `<base>` the base for relative URLs.',
    example: '<a href="https://example.com">Example</a>\n<link rel="stylesheet" href="style.css">',
    on: ['a', 'area', 'link', 'base'],
    link: `${ELEMENTS}/a#href`,
  },
  'a/href': {
    summary: '**Where the link goes**: a URL (`https://…`, or relative like `about.html` or `/about`), a place on this page (`#id`), an email address (`mailto:`) or a phone number (`tel:`).',
    example: '<a href="/contact">Contact</a>\n<a href="#top">Back to top</a>\n<a href="mailto:info@example.com">Mail us</a>',
    link: `${ELEMENTS}/a#href`,
  },
  'link/href': { summary: 'The **URL of the resource** to load: the stylesheet, icon, font, ... (what kind is said by `rel`).', example: '<link rel="stylesheet" href="/css/site.css">', link: `${ELEMENTS}/link#href` },
  'base/href': { summary: 'The **base URL**: every relative URL on the page is resolved against it.', example: '<base href="https://example.com/docs/">', link: `${ELEMENTS}/base#href` },
  target: {
    summary: '**Where to open** the link (or the form\'s response): `_self` in the same tab (the default), `_blank` in a new tab, `_parent`/`_top` out of a frame, or the name of an `<iframe>`.',
    example: '<a href="https://example.com" target="_blank">Example</a>',
    on: ['a', 'area', 'form', 'base'],
    link: `${ELEMENTS}/a#target`,
  },
  rel: {
    summary: 'The **relationship** of the linked resource to this page, as one or more space-separated keywords: `stylesheet`, `icon`, `preload`, `noopener`, `nofollow`, ...',
    example: '<link rel="stylesheet" href="style.css">\n<a href="https://example.com" rel="noopener noreferrer">Example</a>',
    on: ['a', 'area', 'link', 'form'],
    link: `${ATTRIBUTES}/rel`,
  },
  download: { summary: 'Makes the link **download** the file instead of opening it. A value suggests the file name. Only works for URLs of the same site (or `blob:`/`data:` URLs).', example: '<a href="report.pdf" download="report-2025.pdf">Download the report</a>', on: ['a', 'area'], link: `${ELEMENTS}/a#download` },
  hreflang: { summary: 'The **language** of the linked page, as a language tag (`en`, `nl`, ...). Only a hint.', example: '<a href="/nl/" hreflang="nl">Nederlands</a>', on: ['a', 'link'], link: `${ELEMENTS}/a#hreflang` },
  referrerpolicy: { summary: 'How much of this page\'s URL to send as the **Referer** header when following the link or loading the resource: `no-referrer`, `origin`, `strict-origin-when-cross-origin` (the default), ...', example: '<a href="https://example.com" referrerpolicy="no-referrer">Example</a>', on: ['a', 'area', 'img', 'iframe', 'link', 'script'], link: `${ELEMENTS}/a#referrerpolicy` },
  ping: { summary: 'URLs (space-separated) that the browser sends a small POST request to when the link is followed, for tracking clicks.', on: ['a', 'area'], link: `${ELEMENTS}/a#ping` },

  // ----------------------------------------------------------------- media
  src: {
    summary: 'The **URL of the file** to load: the image, script, video, audio or page to embed.',
    example: '<img src="photo.jpg" alt="…">\n<script src="app.js"></script>',
    on: ['img', 'script', 'iframe', 'audio', 'video', 'source', 'embed', 'track', 'input'],
    link: `${ELEMENTS}/img#src`,
  },
  'script/src': { summary: 'The **URL of a JavaScript file** to run. With `src`, anything written between `<script>` and `</script>` is ignored.', example: '<script src="app.js" defer></script>', link: `${ELEMENTS}/script#src` },
  'iframe/src': { summary: 'The **URL of the page** to show inside the frame.', example: '<iframe src="https://example.com/map" title="Map"></iframe>', link: `${ELEMENTS}/iframe#src` },
  alt: {
    summary: 'The **text alternative** for the image: read by screen readers, shown when the image fails to load, and used by search engines. Describe what the image shows or does.',
    details: 'Write `alt=""` (empty) for purely decorative images, so screen readers skip them. Leaving `alt` out entirely makes screen readers read the file name.',
    example: '<img src="logo.svg" alt="Example Shop">\n<img src="divider.png" alt="">',
    on: ['img', 'area', 'input'],
    link: `${ELEMENTS}/img#alt`,
  },
  srcset: {
    summary: 'A list of **image candidates** for different screen densities or widths: `small.jpg 480w, large.jpg 1080w` or `photo.jpg 1x, photo@2x.jpg 2x`. The browser picks the best one.',
    example: '<img src="photo-480.jpg" srcset="photo-480.jpg 480w, photo-1080.jpg 1080w" sizes="(max-width: 600px) 480px, 1080px" alt="…">',
    on: ['img', 'source'],
    link: `${ELEMENTS}/img#srcset`,
  },
  sizes: { summary: 'How wide the image will be shown, per media condition, so the browser can pick from `srcset` before the layout is known: `(max-width: 600px) 100vw, 50vw`.', on: ['img', 'source', 'link'], link: `${ELEMENTS}/img#sizes` },
  width: { summary: 'The **width** in CSS pixels, written without a unit (`width="640"`). For images and videos, setting `width` and `height` lets the browser reserve the space before the file arrives.', example: '<img src="cat.jpg" alt="Cat" width="640" height="480">', on: ['img', 'video', 'canvas', 'iframe', 'embed', 'object', 'input', 'source', 'svg'], link: `${ELEMENTS}/img#width` },
  height: { summary: 'The **height** in CSS pixels, written without a unit (`height="480"`). For images and videos, setting `width` and `height` lets the browser reserve the space before the file arrives.', example: '<img src="cat.jpg" alt="Cat" width="640" height="480">', on: ['img', 'video', 'canvas', 'iframe', 'embed', 'object', 'input', 'source', 'svg'], link: `${ELEMENTS}/img#height` },
  loading: { summary: '**When to load** it: `lazy` waits until it is about to scroll into view (saving data), `eager` (the default) loads it right away.', example: '<img src="photo.jpg" alt="…" loading="lazy">', on: ['img', 'iframe'], link: `${ELEMENTS}/img#loading` },
  decoding: { summary: 'A hint whether to decode the image **asynchronously** (`async`), before showing the rest (`sync`) or as the browser likes (`auto`).', on: ['img'], link: `${ELEMENTS}/img#decoding` },
  fetchpriority: { summary: 'A hint about the **download priority** compared to similar resources: `high`, `low` or `auto`. E.g. `high` for the large image at the top of the page.', example: '<img src="hero.jpg" alt="…" fetchpriority="high">', on: ['img', 'link', 'script', 'iframe'], link: `${ELEMENTS}/img#fetchpriority` },
  crossorigin: { summary: 'Loads the resource with **CORS**: `anonymous` (or empty) without cookies, `use-credentials` with them. Needed to read a cross-site image on a canvas, or for `integrity` checks.', example: '<script src="https://cdn.example.com/lib.js" crossorigin="anonymous"></script>', on: ['img', 'script', 'link', 'audio', 'video'], link: `${ATTRIBUTES}/crossorigin` },
  integrity: { summary: 'A **hash** of the file\'s expected content (`sha384-…`). The browser refuses to use the file if it doesn\'t match, so a hacked CDN can\'t slip in other code.', example: '<script src="https://cdn.example.com/lib.js" integrity="sha384-…" crossorigin="anonymous"></script>', on: ['script', 'link'], link: `${ELEMENTS}/script#integrity` },
  usemap: { summary: 'Turns the image into an **image map**: `#name` refers to the `<map name="name">` with its clickable areas.', example: '<img src="plan.png" alt="Floor plan" usemap="#rooms">', on: ['img'], link: `${ELEMENTS}/img#usemap` },
  controls: { summary: 'Shows the browser\'s **play controls** (play/pause, volume, seek bar, full screen).', example: '<video src="clip.mp4" controls></video>', boolean: true, on: MEDIA, link: `${ELEMENTS}/video#controls` },
  autoplay: { summary: 'Starts playing **automatically**. Browsers block autoplay with sound, so for video it usually only works together with `muted`.', example: '<video src="intro.mp4" autoplay muted loop playsinline></video>', boolean: true, on: MEDIA, link: `${ELEMENTS}/video#autoplay` },
  loop: { summary: 'Starts again from the beginning when it reaches the end.', example: '<audio src="rain.mp3" controls loop></audio>', boolean: true, on: MEDIA, link: `${ELEMENTS}/video#loop` },
  muted: { summary: 'Starts with the sound **muted**.', example: '<video src="intro.mp4" autoplay muted></video>', boolean: true, on: MEDIA, link: `${ELEMENTS}/video#muted` },
  playsinline: { summary: 'On phones, plays the video **inside the page** instead of full screen.', boolean: true, on: ['video'], link: `${ELEMENTS}/video#playsinline` },
  poster: { summary: 'The URL of an **image to show** until the video starts playing.', example: '<video src="clip.mp4" poster="still.jpg" controls></video>', on: ['video'], link: `${ELEMENTS}/video#poster` },
  preload: { summary: 'How much to **load in advance**: `none`, `metadata` (just the length and size) or `auto` (maybe the whole file). Only a hint.', on: MEDIA, link: `${ELEMENTS}/video#preload` },
  kind: { summary: 'What the track is: `subtitles` (the default), `captions` (with sound effects, for deaf viewers), `descriptions`, `chapters` or `metadata`.', on: ['track'], link: `${ELEMENTS}/track#kind` },
  srclang: { summary: 'The **language** of the track text, as a language tag (`en`, `nl`). Required for subtitles.', on: ['track'], link: `${ELEMENTS}/track#srclang` },
  default: { summary: 'Turns this track on by default.', boolean: true, on: ['track'], link: `${ELEMENTS}/track#default` },
  allow: { summary: 'A **permissions policy** for the embedded page: which features it may use, such as `fullscreen`, `camera` or `geolocation`.', example: '<iframe src="https://example.com/video" allow="fullscreen; autoplay"></iframe>', on: ['iframe'], link: `${ELEMENTS}/iframe#allow` },
  allowfullscreen: { summary: 'Lets the embedded page go **full screen**. The same as `allow="fullscreen"`.', boolean: true, on: ['iframe'], link: `${ELEMENTS}/iframe#allowfullscreen` },
  sandbox: {
    summary: '**Restricts** the embedded page: on its own (empty) it blocks scripts, forms, pop-ups and more. Space-separated `allow-…` keywords lift single restrictions, such as `allow-scripts` and `allow-forms`.',
    example: '<iframe src="widget.html" sandbox="allow-scripts"></iframe>',
    on: ['iframe'],
    link: `${ELEMENTS}/iframe#sandbox`,
  },
  srcdoc: { summary: 'The **HTML to show** in the frame, written inline instead of loaded from `src`.', example: '<iframe srcdoc="<p>Hello!</p>"></iframe>', on: ['iframe'], link: `${ELEMENTS}/iframe#srcdoc` },
  data: { summary: 'The **URL of the resource** to embed.', on: ['object'], link: `${ELEMENTS}/object#data` },

  // ---------------------------------------------------------------- type
  type: {
    summary: 'The **MIME type** of the linked or embedded resource, such as `image/webp`, `video/mp4` or `application/pdf`, so the browser can skip formats it can\'t use without downloading them.',
    example: '<source src="clip.webm" type="video/webm">',
    on: ['input', 'button', 'script', 'ol', 'link', 'source', 'embed', 'object', 'a', 'style'],
    link: `${ELEMENTS}/source#type`,
  },
  'input/type': {
    summary: '**What kind of input** this is: `text` (the default), `email`, `password`, `number`, `tel`, `url`, `search`, `date`, `time`, `checkbox`, `radio`, `range`, `color`, `file`, `hidden`, `submit`, `reset`, `button`, `image`...',
    details: 'The type changes the control the user sees, the virtual keyboard on phones, and how the browser checks the value. An unknown type falls back to `text`.',
    example: '<input type="email" name="email">\n<input type="checkbox" name="news">\n<input type="date" name="birthday">',
    link: `${ELEMENTS}/input#type`,
  },
  'button/type': {
    summary: '**What the button does**: `submit` sends its form (the default inside a `<form>`!), `reset` resets the form, and `button` does nothing on its own: for buttons that only run JavaScript.',
    example: '<button type="submit">Save</button>\n<button type="button" onclick="preview()">Preview</button>',
    link: `${ELEMENTS}/button#type`,
  },
  'script/type': {
    summary: '**What kind of script** this is: leave it out for normal JavaScript, `module` for a JavaScript module (with `import`/`export`, deferred automatically), `importmap` for an import map. Any other type is not run, so it can hold data, like `application/ld+json`.',
    example: '<script type="module" src="main.js"></script>',
    link: `${ELEMENTS}/script/type`,
  },
  'ol/type': { summary: 'The **numbering style**: `1` (numbers, the default), `a`/`A` (letters) or `i`/`I` (Roman numerals).', example: '<ol type="A">\n  <li>First</li>\n  <li>Second</li>\n</ol>', link: `${ELEMENTS}/ol#type` },
  'style/type': { summary: 'The stylesheet language. Only `text/css` is allowed, and it is the default, so leave it out.', link: `${ELEMENTS}/style#type` },

  // ---------------------------------------------------------------- name
  name: {
    summary: 'The **name** of the form control: its value is sent with the form under this name (`name=value`). Controls without a `name` are not sent. Radio buttons with the same name form a group.',
    example: '<input name="email" type="email">\n<!-- sent as: email=ada%40example.com -->',
    on: ['input', 'select', 'textarea', 'button', 'output', 'fieldset', 'form', 'meta', 'iframe', 'object', 'map', 'slot', 'details', 'param'],
    link: `${ELEMENTS}/input#name`,
  },
  'meta/name': { summary: '**What metadata** this `<meta>` gives; the value itself goes in `content`. Common names: `viewport`, `description`, `theme-color`, `robots`, `author`.', example: '<meta name="description" content="Fresh bread, delivered daily.">', link: `${ELEMENTS}/meta/name` },
  'form/name': { summary: 'The **name of the form**: scripts can find it as `document.forms.name`. It is not sent with the form.', link: `${ELEMENTS}/form#name` },
  'iframe/name': { summary: 'The **name of the frame**: links and forms can open pages in it with `target="name"`.', example: '<iframe name="preview"></iframe>\n<a href="page.html" target="preview">Show here</a>', link: `${ELEMENTS}/iframe#name` },
  'slot/name': { summary: 'The **name of the slot**: the custom element\'s children with `slot="name"` are shown here. A slot without a name gets all other children.', link: `${ELEMENTS}/slot#name` },
  'map/name': { summary: 'The **name of the image map**: an image uses it with `usemap="#name"`.', link: `${ELEMENTS}/map#name` },
  'details/name': { summary: 'Groups `<details>` elements with the same name into an **accordion**: opening one closes the others.', example: '<details name="faq">…</details>\n<details name="faq">…</details>', link: `${ELEMENTS}/details#name` },

  // --------------------------------------------------------------- value
  value: {
    summary: 'The **value** of the control: what is sent with the form.',
    on: ['input', 'button', 'option', 'li', 'meter', 'progress', 'data', 'param', 'output'],
    link: `${ELEMENTS}/input#value`,
  },
  'input/value': {
    summary: 'The **starting value** of the field (or, for checkboxes and radio buttons, the value sent when it is checked; the default is `on`). The user can change it; scripts read the current one as `input.value`.',
    example: '<input name="city" value="Amsterdam">\n<input type="radio" name="size" value="m">',
    link: `${ELEMENTS}/input#value`,
  },
  'button/value': { summary: 'The value sent with the form, under the button\'s `name`, when **this button** submits it. Lets a form tell which button was pressed.', example: '<button name="action" value="save">Save</button>\n<button name="action" value="delete">Delete</button>', link: `${ELEMENTS}/button#value` },
  'option/value': { summary: 'The value sent with the form when this option is chosen. Without it, the option\'s text is sent.', example: '<option value="nl">Netherlands</option>', link: `${ELEMENTS}/option#value` },
  'li/value': { summary: 'The **number** of this item in an ordered list (`<ol>`); the items after it count on from there.', link: `${ELEMENTS}/li#value` },
  'progress/value': { summary: 'How much of the task is **done**, from 0 to `max` (default 1).', link: `${ELEMENTS}/progress#value` },
  'meter/value': { summary: 'The **measured value**, between `min` and `max` (default 0 to 1).', link: `${ELEMENTS}/meter#value` },
  'data/value': { summary: 'The **machine-readable** form of the content, e.g. a product number.', link: `${ELEMENTS}/data#value` },

  // ---------------------------------------------------------------- forms
  for: {
    summary: 'The **id of the form control** this label belongs to. Clicking the label then focuses (or toggles) that control, and screen readers read the label for it.',
    example: '<label for="email">Email</label>\n<input id="email" name="email" type="email">',
    on: ['label', 'output'],
    link: `${ATTRIBUTES}/for`,
  },
  'output/for': { summary: 'The **ids** (space-separated) of the controls whose values went into this result.', link: `${ELEMENTS}/output#for` },
  action: { summary: 'The **URL the form is sent to** when it is submitted. Default: the URL of this page.', example: '<form action="/subscribe" method="post">…</form>', on: ['form'], link: `${ELEMENTS}/form#action` },
  method: {
    summary: '**How the form is sent**: `get` (the default) puts the values in the URL (`?q=bread`), for searches and filters; `post` sends them in the request body, for anything that changes data. `dialog` closes the `<dialog>` it is in.',
    example: '<form action="/search" method="get">…</form>\n<form action="/orders" method="post">…</form>',
    on: ['form'],
    link: `${ELEMENTS}/form#method`,
  },
  enctype: { summary: '**How the values are encoded** when sent with `post`: `application/x-www-form-urlencoded` (the default), `multipart/form-data` (needed to upload files) or `text/plain`.', example: '<form method="post" enctype="multipart/form-data">\n  <input type="file" name="photo">\n</form>', on: ['form'], link: `${ELEMENTS}/form#enctype` },
  novalidate: { summary: 'Turns off the browser\'s own **validation** (of `required`, `type="email"`, ...) when the form is submitted, e.g. because a script validates it.', boolean: true, on: ['form'], link: `${ELEMENTS}/form#novalidate` },
  'accept-charset': { summary: 'The character encoding to send the form in. Always UTF-8 nowadays, so leave it out.', on: ['form'], link: `${ELEMENTS}/form#accept-charset` },
  autocomplete: {
    summary: 'Helps the browser **fill in** the field: `off` turns autofill off, and names like `email`, `name`, `street-address`, `current-password` or `new-password` say what the field is for.',
    example: '<input type="email" name="email" autocomplete="email">\n<input type="password" name="pw" autocomplete="current-password">',
    on: ['form', 'input', 'select', 'textarea'],
    link: `${ATTRIBUTES}/autocomplete`,
  },
  required: { summary: 'The field **must be filled in**: the browser won\'t submit the form while it is empty, and shows a message.', example: '<input name="email" type="email" required>', boolean: true, on: ['input', 'select', 'textarea'], link: `${ATTRIBUTES}/required` },
  disabled: { summary: '**Disables** the control: it can\'t be clicked, focused or edited, is shown greyed out, and its value is not sent with the form. On a `<fieldset>` it disables every control inside.', example: '<button disabled>Sending…</button>', boolean: true, on: [...FORM_CONTROLS, 'fieldset', 'option', 'optgroup', 'link'], link: `${ATTRIBUTES}/disabled` },
  readonly: { summary: 'The user **can\'t change** the value, but can still select and copy it, and it is still sent with the form (unlike `disabled`).', example: '<input name="id" value="A-1042" readonly>', boolean: true, on: ['input', 'textarea'], link: `${ATTRIBUTES}/readonly` },
  checked: { summary: 'The checkbox or radio button **starts checked**. Scripts read and set the current state with `input.checked`.', example: '<input type="checkbox" name="news" checked>', boolean: true, on: ['input'], link: `${ELEMENTS}/input#checked` },
  selected: { summary: 'This option **starts selected** in its `<select>`.', example: '<option value="m" selected>Medium</option>', boolean: true, on: ['option'], link: `${ELEMENTS}/option#selected` },
  multiple: { summary: 'Allows **more than one** value: several options in a `<select>`, several files in a file input, several addresses in an email input.', example: '<input type="file" name="photos" multiple>', boolean: true, on: ['input', 'select'], link: `${ATTRIBUTES}/multiple` },
  placeholder: { summary: 'A short **hint** shown in the empty field, such as an example value. It disappears when the user types, so it is no replacement for a `<label>`.', example: '<input type="email" name="email" placeholder="you@example.com">', on: ['input', 'textarea'], link: `${ATTRIBUTES}/placeholder` },
  min: { summary: 'The **smallest** value allowed (for numbers, dates, times and ranges). The browser won\'t submit a smaller one.', example: '<input type="number" name="qty" min="1" max="10">', on: ['input', 'meter'], link: `${ATTRIBUTES}/min` },
  max: { summary: 'The **largest** value allowed (for numbers, dates, times and ranges). The browser won\'t submit a larger one.', example: '<input type="date" name="day" max="2030-12-31">', on: ['input', 'meter', 'progress'], link: `${ATTRIBUTES}/max` },
  'progress/max': { summary: 'The value at which the task is **complete** (default 1).', example: '<progress value="3" max="10"></progress>', link: `${ELEMENTS}/progress#max` },
  step: { summary: 'The **step** between allowed values: `step="0.01"` for cents, `step="any"` for any number. The arrows and the range slider move by it.', example: '<input type="number" name="price" step="0.01">', on: ['input'], link: `${ATTRIBUTES}/step` },
  minlength: { summary: 'The **minimum number of characters** the user must type.', example: '<input type="password" name="pw" minlength="12">', on: ['input', 'textarea'], link: `${ATTRIBUTES}/minlength` },
  maxlength: { summary: 'The **maximum number of characters** the user can type.', example: '<input name="zip" maxlength="7">', on: ['input', 'textarea'], link: `${ATTRIBUTES}/maxlength` },
  pattern: { summary: 'A **regular expression** the whole value must match before the form can be submitted. Explain the format to users too, e.g. in the label.', example: '<input name="zip" pattern="[0-9]{4} ?[A-Z]{2}" title="e.g. 1234 AB">', on: ['input'], link: `${ATTRIBUTES}/pattern` },
  size: { summary: 'How **wide** a text field is, in characters, or how many **rows** a `<select>` shows at once (making it a list box).', on: ['input', 'select'], link: `${ATTRIBUTES}/size` },
  list: { summary: 'The **id of a `<datalist>`** whose options are offered as suggestions while typing.', example: '<input name="fruit" list="fruits">\n<datalist id="fruits">…</datalist>', on: ['input'], link: `${ELEMENTS}/input#list` },
  form: { summary: 'The **id of the `<form>`** this control belongs to, so it can sit outside the form element and still be sent with it.', example: '<form id="signup">…</form>\n<button form="signup">Sign up</button>', on: [...FORM_CONTROLS, 'fieldset', 'output', 'object'], link: `${ELEMENTS}/input#form` },
  accept: { summary: 'Which **file types** the file picker offers: extensions (`.pdf`) or MIME types (`image/*`), separated by commas. Only a hint: check uploads on the server too.', example: '<input type="file" name="photo" accept="image/png, image/jpeg">', on: ['input'], link: `${ATTRIBUTES}/accept` },
  capture: { summary: 'On phones, opens the **camera or microphone** directly for a file input: `user` (front camera) or `environment` (back camera).', example: '<input type="file" accept="image/*" capture="environment">', on: ['input'], link: `${ATTRIBUTES}/capture` },
  formaction: { summary: 'Overrides the form\'s `action` when **this button** submits it.', example: '<button formaction="/draft">Save as draft</button>', on: ['button', 'input'], link: `${ELEMENTS}/button#formaction` },
  rows: { summary: 'The **height** of the text area, in lines of text.', on: ['textarea'], link: `${ELEMENTS}/textarea#rows` },
  cols: { summary: 'The **width** of the text area, in average characters.', on: ['textarea'], link: `${ELEMENTS}/textarea#cols` },
  wrap: { summary: 'How the text **wraps** when sent: `soft` (the default) sends it without the visual line breaks, `hard` with them (and then needs `cols`).', on: ['textarea'], link: `${ELEMENTS}/textarea#wrap` },
  popovertarget: { summary: 'The **id of a popover** (an element with `popover`) that this button shows and hides. No JavaScript needed.', example: '<button popovertarget="menu">Menu</button>\n<div id="menu" popover>…</div>', on: ['button', 'input'], link: `${ELEMENTS}/button#popovertarget` },
  popovertargetaction: { summary: 'What the button does with its popover: `toggle` (the default), `show` or `hide`.', on: ['button', 'input'], link: `${ELEMENTS}/button#popovertargetaction` },

  // --------------------------------------------------------------- tables
  colspan: { summary: 'How many **columns** this cell spans (default 1).', example: '<td colspan="2">Total</td>', on: ['td', 'th'], link: `${ELEMENTS}/td#colspan` },
  rowspan: { summary: 'How many **rows** this cell spans (default 1).', example: '<th rowspan="3">2025</th>', on: ['td', 'th'], link: `${ELEMENTS}/td#rowspan` },
  headers: { summary: 'The **ids of the header cells** (`<th>`) that describe this cell, space-separated. For complex tables, so screen readers can read the right headers.', on: ['td', 'th'], link: `${ELEMENTS}/td#headers` },
  scope: { summary: 'Which cells this header cell is the header for: its column (`col`), its row (`row`), or a group of them (`colgroup`, `rowgroup`). Helps screen readers.', example: '<th scope="col">Price</th>', on: ['th'], link: `${ELEMENTS}/th#scope` },
  span: { summary: 'How many **columns** this `<col>` or `<colgroup>` covers (default 1).', on: ['col', 'colgroup'], link: `${ELEMENTS}/col#span` },

  // ----------------------------------------------------------- meta, script
  charset: {
    summary: 'The **character encoding** of the page. Always `utf-8`; put it first in `<head>`, so the browser knows it before reading any text.',
    example: '<meta charset="utf-8">',
    on: ['meta', 'script'],
    link: `${ELEMENTS}/meta#charset`,
  },
  content: {
    summary: 'The **value** of this metadata, for the `name` (or `http-equiv`) on the same `<meta>`.',
    example: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    on: ['meta'],
    link: `${ELEMENTS}/meta#content`,
  },
  'http-equiv': { summary: 'Makes the `<meta>` act like an **HTTP response header**: `content-security-policy`, `refresh` (reload or redirect after a delay), ... The value goes in `content`.', example: '<meta http-equiv="refresh" content="5; url=/home">', on: ['meta'], link: `${ELEMENTS}/meta/http-equiv` },
  media: { summary: 'A **media query**: the resource only applies when it matches, e.g. `(max-width: 600px)`, `print` or `(prefers-color-scheme: dark)`.', example: '<link rel="stylesheet" href="print.css" media="print">', on: ['link', 'source', 'style', 'meta'], link: `${ELEMENTS}/link#media` },
  defer: {
    summary: 'Downloads the script **while the page is read**, and runs it only after the whole page has been parsed, in the order the scripts appear. The usual choice for scripts in `<head>`.',
    details: 'Only for scripts with `src`. Modules (`type="module"`) are deferred anyway.',
    example: '<script src="app.js" defer></script>',
    boolean: true,
    on: ['script'],
    link: `${ELEMENTS}/script#defer`,
  },
  async: {
    summary: 'Downloads the script **while the page is read**, and runs it as soon as it has arrived, in no particular order. For independent scripts such as analytics.',
    example: '<script src="analytics.js" async></script>',
    boolean: true,
    on: ['script'],
    link: `${ELEMENTS}/script#async`,
  },
  nomodule: { summary: 'Only runs in **old browsers** that don\'t support JavaScript modules: a fallback next to a `type="module"` script.', example: '<script type="module" src="app.js"></script>\n<script nomodule src="app-legacy.js"></script>', boolean: true, on: ['script'], link: `${ELEMENTS}/script#nomodule` },
  blocking: { summary: 'Blocks **rendering** until this resource has loaded: `blocking="render"`.', on: ['script', 'link', 'style'], link: `${ELEMENTS}/script#blocking` },

  // ---------------------------------------------------------------- other
  open: { summary: 'The `<details>` or `<dialog>` is **open** (shown). For dialogs, use `showModal()` from script rather than this attribute.', example: '<details open>\n  <summary>More</summary>\n  …\n</details>', boolean: true, on: ['details', 'dialog'], link: `${ELEMENTS}/details#open` },
  datetime: { summary: 'The **date and/or time** in a machine-readable format: `2025-06-01`, `14:30`, `2025-06-01T14:30+02:00`, or a duration like `PT2H`.', example: '<time datetime="2025-06-01T14:30">June 1st, half past two</time>', on: ['time', 'del', 'ins'], link: `${ELEMENTS}/time#datetime` },
  cite: { summary: 'The **URL of the source** of the quote, or of a document that explains the edit. Not shown on the page.', example: '<blockquote cite="https://example.com/speech">…</blockquote>', on: ['blockquote', 'q', 'del', 'ins'], link: `${ELEMENTS}/blockquote#cite` },
  start: { summary: 'The **number to start** counting from in an ordered list.', example: '<ol start="5">…</ol>', on: ['ol'], link: `${ELEMENTS}/ol#start` },
  reversed: { summary: 'Counts the list **down** instead of up.', example: '<ol reversed>\n  <li>Third</li>\n  <li>Second</li>\n  <li>First</li>\n</ol>', boolean: true, on: ['ol'], link: `${ELEMENTS}/ol#reversed` },
  label: { summary: 'A **text label**: for an `<optgroup>` its heading, for an `<option>` a shorter text, for a `<track>` the name shown in the subtitle menu.', on: ['option', 'optgroup', 'track'], link: `${ELEMENTS}/optgroup#label` },
  low: { summary: 'Below this value, the meter counts as **low** (it changes color).', on: ['meter'], link: `${ELEMENTS}/meter#low` },
  high: { summary: 'Above this value, the meter counts as **high** (it changes color).', on: ['meter'], link: `${ELEMENTS}/meter#high` },
  optimum: { summary: 'The **best** value: tells whether low or high values are good, which sets the meter\'s colors.', on: ['meter'], link: `${ELEMENTS}/meter#optimum` },
  shadowrootmode: { summary: 'Makes this `<template>` a **declarative shadow root** of its parent element: `open` (scripts can reach it as `element.shadowRoot`) or `closed`.', example: '<user-card>\n  <template shadowrootmode="open">\n    <slot></slot>\n  </template>\n</user-card>', on: ['template'], link: `${ELEMENTS}/template#shadowrootmode` },
  coords: { summary: 'The **coordinates** of the clickable area, in pixels: `x1,y1,x2,y2` for a rectangle, `x,y,r` for a circle.', on: ['area'], link: `${ELEMENTS}/area#coords` },
  shape: { summary: 'The **shape** of the clickable area: `rect`, `circle`, `poly` or `default` (the whole image).', on: ['area'], link: `${ELEMENTS}/area#shape` },
};

/** The ARIA attributes beginners meet most. Others get a general explanation. */
const ARIA_ATTRIBUTES: Record<string, string> = {
  'aria-label': 'Gives the element an **accessible name**: the text a screen reader reads for it. Use it when there is no visible text, like an icon-only button.',
  'aria-labelledby': 'Names the element after the text of **other elements**, given by their ids (space-separated).',
  'aria-describedby': 'Points to elements (by id) whose text **describes** this one, read after its name: hints, error messages.',
  'aria-hidden': '`aria-hidden="true"` **hides** the element from screen readers, while it stays visible. For decorative icons. Never on something focusable.',
  'aria-expanded': 'Says whether the content this control opens is **expanded** (`true`) or collapsed (`false`), for menus and accordions. Update it from your script.',
  'aria-controls': 'The **id(s) of the element(s)** this control changes, e.g. the panel a tab or button opens.',
  'aria-live': 'Makes screen readers **announce changes** to this region: `polite` waits until the user is idle, `assertive` interrupts.',
  'aria-current': 'Marks the **current item** in a set: `page` for the link to the current page in a menu, `step`, `date`, `true`.',
  'aria-pressed': 'Makes a button a **toggle button** and says whether it is pressed: `true`, `false` or `mixed`.',
  'aria-checked': 'The **checked** state of a custom checkbox, radio button or switch: `true`, `false` or `mixed`.',
  'aria-selected': 'Whether the item is **selected**, for tabs, options and grid cells.',
  'aria-disabled': 'Says the element is **disabled**, for screen readers. Unlike `disabled`, it doesn\'t stop clicks or focus: your script has to.',
  'aria-haspopup': 'Says the element opens a **popup**: `menu`, `listbox`, `dialog`, `tree`, `grid` or `true`.',
  'aria-modal': 'Says that this dialog is **modal**: content outside it can\'t be used while it is open.',
  'aria-required': 'Says that the field must be **filled in**, for custom controls. Native fields use `required` instead.',
  'aria-invalid': 'Says the value is **not valid**: `true`, or `grammar`/`spelling`. Pair it with `aria-describedby` pointing to the error message.',
};

/** Short descriptions of common events, for `on…` attributes. */
const EVENTS: Record<string, string> = {
  click: 'the element is clicked (or activated with the keyboard)',
  dblclick: 'the element is double-clicked',
  submit: 'the form is submitted',
  reset: 'the form is reset',
  input: 'the value changes, at every keystroke',
  change: 'the value has changed and the user is done (left the field, picked an option)',
  load: 'the element (or the whole page) has finished loading',
  error: 'loading the resource failed',
  keydown: 'a key is pressed',
  keyup: 'a key is released',
  focus: 'the element gets keyboard focus',
  blur: 'the element loses keyboard focus',
  mouseover: 'the mouse moves onto the element',
  mouseout: 'the mouse leaves the element',
  mouseenter: 'the mouse moves onto the element',
  mouseleave: 'the mouse leaves the element',
  scroll: 'the element is scrolled',
  resize: 'the window is resized',
  toggle: 'a `<details>` or popover opens or closes',
  close: 'a `<dialog>` is closed',
  beforeunload: 'the page is about to be left',
};

// --------------------------------------------------------------------- values

export interface ValueInfo {
  summary: string;
  details?: string;
  example?: string;
  link?: string;
}

const inputType = (summary: string, example?: string): ValueInfo => ({ summary, example });

/**
 * Values of attributes, keyed "attr=value" or "element/attr=value" (values that
 * are case-insensitive in lowercase).
 */
export const HTML_ATTRIBUTE_VALUES: Record<string, ValueInfo> = {
  // input types; their links are set below
  'input/type=text': inputType('A one-line **text field**. The default type.'),
  'input/type=password': inputType('A **password field**: what the user types is hidden. Add `autocomplete="current-password"` (or `new-password`) so password managers help.'),
  'input/type=email': inputType('A field for an **email address**: the browser checks the format before submitting, and phones show a keyboard with `@`.', '<input type="email" name="email" required>'),
  'input/type=number': inputType('A field for a **number**, with up/down arrows. `min`, `max` and `step` limit it. For digits that aren\'t amounts (zip codes, card numbers), use `type="text" inputmode="numeric"` instead.'),
  'input/type=tel': inputType('A field for a **phone number**. The format isn\'t checked (it differs per country), but phones show a number pad.'),
  'input/type=url': inputType('A field for a **URL**: the browser checks that it is an absolute URL, such as `https://example.com`.'),
  'input/type=search': inputType('A **search field**: a text field that may show a clear button and a search key on phones.'),
  'input/type=checkbox': inputType('A **checkbox**: on or off. When checked, its `value` (default `on`) is sent under its `name`; unchecked, nothing is sent.', '<label><input type="checkbox" name="news" checked> Send me news</label>'),
  'input/type=radio': inputType('A **radio button**: radio buttons with the same `name` form a group of which only one can be chosen. The chosen one\'s `value` is sent.', '<label><input type="radio" name="size" value="s"> Small</label>\n<label><input type="radio" name="size" value="l"> Large</label>'),
  'input/type=submit': inputType('A button that **submits** the form; `value` is its text. A `<button>` does the same and can hold other content.'),
  'input/type=reset': inputType('A button that **resets** every field of the form to its starting value. Rarely a good idea.'),
  'input/type=button': inputType('A **plain button** that does nothing on its own; `value` is its text. A `<button type="button">` is more flexible.'),
  'input/type=file': inputType('A **file picker**. `accept` limits the file types and `multiple` allows several files; the form needs `method="post" enctype="multipart/form-data"` to upload them.'),
  'input/type=hidden': inputType('A **hidden field**: not shown, but its `value` is sent with the form. Users can still see and change it in the page source, so don\'t trust it.'),
  'input/type=date': inputType('A **date** picker. The value is always `yyyy-mm-dd`, whatever format the user sees.'),
  'input/type=time': inputType('A **time** picker. The value is `hh:mm` (24-hour).'),
  'input/type=datetime-local': inputType('A **date and time** picker, without a time zone. The value is `yyyy-mm-ddThh:mm`.'),
  'input/type=month': inputType('A **month** picker (`yyyy-mm`). Not supported in every browser.'),
  'input/type=week': inputType('A **week** picker (`yyyy-Www`). Not supported in every browser.'),
  'input/type=range': inputType('A **slider** for a number between `min` and `max` (default 0 to 100), when the exact value matters less.'),
  'input/type=color': inputType('A **color** picker. The value is a hex color such as `#ff6600`.'),
  'input/type=image': inputType('A **submit button shown as an image** (`src`, `alt`). It also sends the click coordinates.'),

  'button/type=submit': { summary: '**Submits** the form. This is the default for a button inside a `<form>`.' },
  'button/type=reset': { summary: '**Resets** every field of the form to its starting value.' },
  'button/type=button': { summary: 'Does **nothing on its own**: for buttons that run JavaScript. Without it, a button in a form submits the form.' },

  'script/type=module': { summary: 'A **JavaScript module**: it can use `import` and `export`, runs in strict mode, and is deferred automatically (runs after the page is parsed).', example: '<script type="module">\n  import { greet } from "./greet.js";\n  greet();\n</script>' },
  'script/type=importmap': { summary: 'An **import map**: JSON that tells the browser where bare module names such as `"lodash"` are found.', example: '<script type="importmap">\n  { "imports": { "lodash": "/js/lodash.js" } }\n</script>' },
  'script/type=text/javascript': { summary: 'Plain JavaScript: the default, so you can leave the `type` out.' },
  'script/type=application/ld+json': { summary: '**Structured data** (JSON-LD) about the page, for search engines. Browsers don\'t run it.', link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type#any_other_value' },

  'target=_blank': {
    summary: 'Opens the link in a **new tab** (or window).',
    details: 'Browsers now treat it as `rel="noopener"`, so the new page can\'t reach back to yours through `window.opener`. Users may be surprised by new tabs; use it sparingly.',
  },
  'target=_self': { summary: 'Opens the link in the **same tab** (or frame). The default.' },
  'target=_parent': { summary: 'Opens the link in the **parent frame** of this one (or the same tab if there is none).' },
  'target=_top': { summary: 'Opens the link in the **whole tab**, outside any frames.' },

  'rel=stylesheet': { summary: 'The linked file is a **CSS stylesheet** for this page.' },
  'rel=icon': { summary: 'The linked file is the **icon** of the page (favicon), shown in the tab and bookmarks.' },
  'rel=apple-touch-icon': { summary: 'The **icon** iPhones and iPads use for the home screen.' },
  'rel=preload': { summary: '**Preloads** a resource this page will need soon (a font, an image), so it is ready in time. Needs `as` to say what it is.' },
  'rel=modulepreload': { summary: '**Preloads** a JavaScript module and its imports.' },
  'rel=preconnect': { summary: 'Opens a **connection** to the other site early, so later requests to it are faster.' },
  'rel=dns-prefetch': { summary: 'Looks up the **domain name** early, so later requests to it start faster.' },
  'rel=prefetch': { summary: 'Fetches a resource that the **next page** will probably need, at low priority.' },
  'rel=manifest': { summary: 'Links the **web app manifest**: the name, icons and colors used when the site is installed as an app.' },
  'rel=canonical': { summary: 'The **preferred URL** of this page, for search engines, when the same content is reachable at several URLs.' },
  'rel=alternate': { summary: 'An **alternate version** of this page: in another language (`hreflang`), format (RSS, `type`) or for print.' },
  'rel=noopener': { summary: 'The opened page can\'t reach back to this one through `window.opener`. Browsers already do this for `target="_blank"`.' },
  'rel=noreferrer': { summary: 'Doesn\'t send this page\'s URL (the Referer header) to the linked page. Implies `noopener`.' },
  'rel=nofollow': { summary: 'Tells search engines not to follow the link or give it credit: for links you don\'t vouch for, such as in comments.' },
  'rel=ugc': { summary: 'Marks a link in **user-generated content** (comments, forum posts) for search engines.' },
  'rel=sponsored': { summary: 'Marks a **paid or sponsored** link for search engines.' },
  'rel=author': { summary: 'Links to the **author** of the page or article.' },
  'rel=license': { summary: 'Links to the **license** of the content.' },
  'rel=external': { summary: 'The link goes to **another website**.' },
  'rel=me': { summary: 'The linked page is **also you** (another profile of yours). Used to verify profiles, e.g. on Mastodon.' },
  'rel=next': { summary: 'The **next page** in a series.' },
  'rel=prev': { summary: 'The **previous page** in a series.' },
  'rel=help': { summary: 'Links to **help** for the page or element.' },
  'rel=search': { summary: 'Links to a **search** description (OpenSearch) for the site.' },

  'method=get': { summary: 'Sends the values **in the URL** (`/search?q=bread`). For searches and filters: the result can be bookmarked and shared. The default.' },
  'method=post': { summary: 'Sends the values **in the request body**, not in the URL. For anything that changes data (orders, sign-ups) or contains private data.' },
  'method=dialog': { summary: 'Doesn\'t send anything: submitting **closes the `<dialog>`** the form is in, and the dialog\'s `returnValue` becomes the value of the button that was pressed.' },

  'enctype=multipart/form-data': { summary: 'Sends each value as a separate part. **Needed to upload files** with `<input type="file">`.' },
  'enctype=application/x-www-form-urlencoded': { summary: 'Sends the values as `name=value&name2=value2`, with special characters encoded. The default.' },
  'enctype=text/plain': { summary: 'Sends the values as plain text lines. Only for debugging.' },

  'loading=lazy': { summary: 'Loads it only when it is about to **scroll into view**. Saves data for images far down the page; don\'t use it for the image at the top.' },
  'loading=eager': { summary: 'Loads it **right away**. The default.' },
  'decoding=async': { summary: 'Decodes the image **in the background**, so the rest of the page can be shown first.' },
  'decoding=sync': { summary: 'Decodes the image **together with** the rest of the content.' },
  'decoding=auto': { summary: 'Lets the **browser decide**. The default.' },

  'dir=ltr': { summary: '**Left to right**, as in English. The default.' },
  'dir=rtl': { summary: '**Right to left**, as in Arabic and Hebrew. The page layout flips too.' },
  'dir=auto': { summary: 'The browser picks the direction from the **first strong character** of the text. Good for user-written text.' },

  'crossorigin=anonymous': { summary: 'A CORS request **without** cookies or other credentials.' },
  'crossorigin=': { summary: 'An empty value means `anonymous`: a CORS request without cookies.' },
  'crossorigin=use-credentials': { summary: 'A CORS request **with** cookies; the server must allow it.' },

  'preload=none': { summary: 'Loads nothing until the user presses play.' },
  'preload=metadata': { summary: 'Loads only the **metadata**: the length, size and first frame.' },
  'preload=auto': { summary: 'The browser may load the **whole file** in advance.' },

  'contenteditable=true': { summary: 'The content is **editable**.' },
  'contenteditable=': { summary: 'An empty value means `true`: the content is editable.' },
  'contenteditable=false': { summary: 'The content is **not editable**, even inside an editable parent.' },
  'contenteditable=plaintext-only': { summary: 'The text is editable, but **without formatting** (pasted styles are dropped).' },
  'draggable=true': { summary: 'The element **can be dragged**.' },
  'draggable=false': { summary: 'The element **can\'t be dragged** (even an image or link).' },
  'spellcheck=true': { summary: '**Check** the spelling.' },
  'spellcheck=false': { summary: 'Don\'t check the spelling: for code, names, ...' },
  'translate=yes': { summary: 'The content may be **translated**. The default.' },
  'translate=no': { summary: '**Don\'t translate** this content: brand names, code, ...' },
  'hidden=until-found': { summary: 'Hidden, but **find-in-page** and links to a fragment inside it can reveal it.' },
  'popover=auto': { summary: 'Closes when the user clicks outside it or presses Esc, and closes other `auto` popovers. The default.' },
  'popover=': { summary: 'An empty value means `auto`: closes when the user clicks outside it or presses Esc.' },
  'popover=manual': { summary: 'Only closes when told to, by its button or `hidePopover()`.' },
  'popover=hint': { summary: 'A **hint** popover, such as a tooltip: it doesn\'t close `auto` popovers that are open.' },
  'popovertargetaction=toggle': { summary: 'Shows the popover if it is hidden, hides it if it is shown. The default.' },
  'popovertargetaction=show': { summary: 'Only **shows** the popover.' },
  'popovertargetaction=hide': { summary: 'Only **hides** the popover.' },

  'autocomplete=on': { summary: 'The browser may **fill in** values the user entered before.' },
  'autocomplete=off': { summary: 'Asks the browser **not to fill in** this field. Browsers ignore it for login fields.' },
  'autocomplete=name': { summary: 'The field is for the user\'s **full name**.' },
  'autocomplete=email': { summary: 'The field is for an **email address**.' },
  'autocomplete=username': { summary: 'The field is for a **user name** (or the email address used to log in).' },
  'autocomplete=current-password': { summary: 'The field is for the user\'s **existing password**: password managers fill it in.' },
  'autocomplete=new-password': { summary: 'The field is for a **new password**: password managers suggest a strong one.' },
  'autocomplete=one-time-code': { summary: 'The field is for a **one-time code**, such as one received by SMS; phones can fill it in.' },
  'autocomplete=tel': { summary: 'The field is for a **phone number**.' },
  'autocomplete=street-address': { summary: 'The field is for the **street address**.' },
  'autocomplete=postal-code': { summary: 'The field is for the **postal code**.' },
  'autocomplete=country': { summary: 'The field is for the **country** code.' },

  'inputmode=numeric': { summary: 'Shows a keyboard with **digits** only.' },
  'inputmode=decimal': { summary: 'Shows a keyboard with **digits and a decimal separator**.' },
  'inputmode=tel': { summary: 'Shows a **telephone keypad**.' },
  'inputmode=email': { summary: 'Shows a keyboard for **email addresses** (with `@`).' },
  'inputmode=url': { summary: 'Shows a keyboard for **URLs** (with `/` and `.com`).' },
  'inputmode=search': { summary: 'Shows a keyboard with a **search** key.' },
  'inputmode=text': { summary: 'Shows the normal **text** keyboard. The default.' },
  'inputmode=none': { summary: 'Shows **no keyboard**: for fields with their own input widget.' },

  'meta/name=viewport': {
    summary: 'Tells phones how to **size the page**. `width=device-width, initial-scale=1` makes the page as wide as the screen, so it isn\'t shown as a tiny desktop page. Every responsive page needs it.',
    example: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    link: `${ELEMENTS}/meta/name/viewport`,
  },
  'meta/name=description': { summary: 'A **short summary** of the page. Search engines often show it under the title in their results.' },
  'meta/name=theme-color': { summary: 'The **color** browsers use for their toolbar or the tab around the page.' },
  'meta/name=color-scheme': { summary: 'Which **color schemes** the page supports (`light`, `dark` or `light dark`), so the browser can style form controls and scroll bars to match.' },
  'meta/name=robots': { summary: 'Instructions for **search engine crawlers**: `noindex` (don\'t list this page), `nofollow` (don\'t follow its links), ...' },
  'meta/name=author': { summary: 'The **author** of the page.' },
  'meta/name=generator': { summary: 'The **software** that made the page.' },
  'meta/name=keywords': { summary: 'Keywords for the page. **Ignored** by search engines today.' },
  'meta/name=referrer': { summary: 'The page\'s **referrer policy**: how much of its URL is sent along with requests it makes.' },
  'meta/name=application-name': { summary: 'The **name of the web app** this page belongs to.' },
  'meta/http-equiv=refresh': { summary: '**Reloads** the page after a number of seconds, or **redirects**: `content="5; url=/new"`. A server-side redirect is better.' },
  'meta/http-equiv=content-security-policy': { summary: 'A **Content Security Policy**: limits where scripts, styles and other resources may come from, against cross-site scripting.' },
  'meta/http-equiv=x-ua-compatible': { summary: 'An old setting for **Internet Explorer**. No longer needed.' },
  'meta/http-equiv=content-type': { summary: 'The old way to set the **character encoding**. Use `<meta charset="utf-8">` instead.' },
  'charset=utf-8': { summary: '**UTF-8**: the encoding that can represent every character, and the only one you should use.' },

  'th/scope=col': { summary: 'This is the header of its **column**.' },
  'th/scope=row': { summary: 'This is the header of its **row**.' },
  'th/scope=colgroup': { summary: 'This is the header of a **group of columns**.' },
  'th/scope=rowgroup': { summary: 'This is the header of a **group of rows**.' },
  'wrap=soft': { summary: 'Sends the text **without** the line breaks added by wrapping. The default.' },
  'wrap=hard': { summary: 'Sends the text **with** the line breaks added by wrapping (needs `cols`).' },
  'track/kind=subtitles': { summary: 'A **translation** of the dialogue. The default.' },
  'track/kind=captions': { summary: 'A **transcription** of the dialogue and important sounds, for deaf and hard-of-hearing viewers.' },
  'track/kind=descriptions': { summary: 'A text **description of what happens** on screen, for blind viewers.' },
  'track/kind=chapters': { summary: '**Chapter titles**, for navigating the media.' },
  'track/kind=metadata': { summary: 'Data for **scripts**, not shown.' },
  'template/shadowrootmode=open': { summary: 'An **open** shadow root: scripts can reach it as `element.shadowRoot`.' },
  'template/shadowrootmode=closed': { summary: 'A **closed** shadow root: scripts outside the component can\'t reach it.' },
  'ol/type=1': { summary: 'Numbers: 1, 2, 3. The default.' },
  'ol/type=a': { summary: 'Lowercase letters: a, b, c.' },
  'ol/type=A': { summary: 'Uppercase letters: A, B, C.' },
  'ol/type=i': { summary: 'Lowercase Roman numerals: i, ii, iii.' },
  'ol/type=I': { summary: 'Uppercase Roman numerals: I, II, III.' },

  'sandbox=allow-scripts': { summary: 'The embedded page may run **scripts**.' },
  'sandbox=allow-same-origin': { summary: 'The embedded page keeps its **own origin** (cookies, storage). Together with `allow-scripts` it can remove the sandbox, so never combine both for untrusted content from your own site.' },
  'sandbox=allow-forms': { summary: 'The embedded page may **submit forms**.' },
  'sandbox=allow-popups': { summary: 'The embedded page may **open new windows**.' },
  'sandbox=allow-modals': { summary: 'The embedded page may use `alert()`, `confirm()` and `print()`.' },
  'sandbox=allow-downloads': { summary: 'The embedded page may **download files**.' },
  'sandbox=allow-top-navigation': { summary: 'The embedded page may **navigate this whole tab** elsewhere.' },

  'aria-hidden=true': { summary: 'Hidden from screen readers (still visible on screen).' },
  'aria-live=polite': { summary: 'Changes are announced when the screen reader is idle.' },
  'aria-live=assertive': { summary: 'Changes are announced **immediately**, interrupting. Only for urgent messages.' },
  'aria-live=off': { summary: 'Changes are not announced. The default.' },
  'aria-current=page': { summary: 'This link points to the **current page**.' },
};

/** The ARIA roles beginners meet most. */
const ROLES: Record<string, string> = {
  button: 'a **button**: something the user clicks to make something happen. Prefer `<button>`.',
  link: 'a **link**. Prefer `<a href>`.',
  navigation: 'a block of **navigation links**. Prefer `<nav>`.',
  main: 'the **main content**. Prefer `<main>`.',
  banner: 'the **site header**. A top-level `<header>` already has this role.',
  contentinfo: 'the **site footer**. A top-level `<footer>` already has this role.',
  complementary: '**supporting content**, like a sidebar. Prefer `<aside>`.',
  region: 'an important **section**, which needs a name (`aria-label`). A named `<section>` has this role.',
  search: 'a **search** area. Prefer `<search>`.',
  dialog: 'a **dialog** box. Prefer `<dialog>`.',
  alertdialog: 'a **dialog with an urgent message** that needs a response.',
  alert: 'an **important message**, announced immediately by screen readers (for errors, warnings).',
  status: 'a **status message**, announced politely (saved, loading, ...).',
  img: 'an **image**, e.g. a group of elements or an icon font that forms one picture. Needs `aria-label`.',
  presentation: '**no role**: the element is only there for layout, its meaning is removed. Same as `none`.',
  none: '**no role**: the element is only there for layout, its meaning is removed.',
  list: 'a **list**. Prefer `<ul>` or `<ol>`.',
  listitem: 'an item of a **list**. Prefer `<li>`.',
  heading: 'a **heading** (with `aria-level`). Prefer `<h1>`…`<h6>`.',
  tab: 'a **tab** in a `tablist`, which shows its `tabpanel`.',
  tablist: 'the row of **tabs**.',
  tabpanel: 'the **panel** shown by a tab.',
  menu: 'a **menu** of actions, like an application menu (not for site navigation).',
  menuitem: 'an **item** in a `menu`.',
  checkbox: 'a **checkbox** (with `aria-checked`). Prefer `<input type="checkbox">`.',
  switch: 'an **on/off switch** (with `aria-checked`).',
  progressbar: 'a **progress bar**. Prefer `<progress>`.',
  tooltip: 'a **tooltip** describing another element.',
  form: 'a **form**. Prefer `<form>`.',
  article: 'a **self-contained** piece of content. Prefer `<article>`.',
  group: 'a **group** of related elements.',
};

// ----------------------------------------------------------------- entities

/** Common named character references (without `&` and `;`) and the character they stand for. */
export const NAMED_CHARACTER_REFERENCES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', trade: '™', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', bull: '•', middot: '·',
  deg: '°', plusmn: '±', times: '×', divide: '÷', minus: '−', ne: '≠', le: '≤', ge: '≥', asymp: '≈', infin: '∞', frac12: '½', frac14: '¼', frac34: '¾',
  sup2: '²', sup3: '³', micro: 'µ', para: '¶', sect: '§', euro: '€', pound: '£', yen: '¥', cent: '¢', dollar: '$', curren: '¤',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', rArr: '⇒', lArr: '⇐', hArr: '⇔', check: '✓', cross: '✗', star: '☆', hearts: '♥', spades: '♠', clubs: '♣', diams: '♦',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', aring: 'å', ouml: 'ö', oacute: 'ó', uuml: 'ü', uacute: 'ú', iuml: 'ï', ntilde: 'ñ', ccedil: 'ç', szlig: 'ß', aelig: 'æ', oslash: 'ø',
  Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', Eacute: 'É',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', pi: 'π', sigma: 'σ', mu: 'μ', lambda: 'λ', omega: 'ω', Omega: 'Ω', Delta: 'Δ', Sigma: 'Σ',
  shy: '­', zwj: '‍', zwnj: '‌', ensp: ' ', emsp: ' ', thinsp: ' ', NewLine: '\n', Tab: '\t', grave: '`', num: '#', excl: '!', quest: '?', semi: ';', colon: ':', comma: ',', period: '.', sol: '/', bsol: '\\', lpar: '(', rpar: ')', lsqb: '[', rsqb: ']', lcub: '{', rcub: '}', vert: '|', equals: '=', plus: '+', ast: '*', percnt: '%', commat: '@', Hat: '^', lowbar: '_',
};

/** Characters that don't show (or look like a plain space), named instead. */
const INVISIBLE: Record<string, string> = {
  ' ': 'a **non-breaking space**: a space where the line may not wrap, as in `10&nbsp;km`. Several in a row are not collapsed into one, unlike normal spaces',
  '­': 'a **soft hyphen**: an invisible place where a long word may be broken with a hyphen',
  '​': 'a **zero-width space**: an invisible place where a line may break',
  '‌': 'a **zero-width non-joiner**: keeps two characters from joining',
  '‍': 'a **zero-width joiner**: joins characters, as in combined emoji',
  ' ': 'an **en space**: a space half as wide as an em space',
  ' ': 'an **em space**: a space as wide as the font size',
  ' ': 'a **thin space**',
  '\n': 'a **line feed** (new line)',
  '\t': 'a **tab**',
  ' ': 'a **space**',
};

/** Why a character is often written as a reference. */
const ESCAPE_NOTE: Record<string, string> = {
  '<': ' Written like this because a bare `<` would start a tag.',
  '&': ' Written like this because a bare `&` would start a character reference.',
  '>': ' A bare `>` works in text too, but `&gt;` keeps code samples symmetrical with `&lt;`.',
  '"': ' Needed for a `"` inside an attribute value in double quotes.',
  "'": ' Needed for a `\'` inside an attribute value in single quotes.',
};

const hex = (cp: number) => cp.toString(16).toUpperCase().padStart(4, '0');

/** Doc for a character reference such as `&amp;`, `&#169;` or `&#x1F600;`. */
export function entityDoc(text: string): DocEntry {
  const m = /^&(?:#[xX]([0-9a-fA-F]+)|#([0-9]+)|([A-Za-z][A-Za-z0-9]*))(;?)$/.exec(text);
  const general =
    'Character references write characters that are hard to type, or that would otherwise be read as HTML: `&lt;` for `<` and `&amp;` for `&`. They come in three forms: named (`&copy;`), decimal (`&#169;`) and hexadecimal (`&#xA9;`).';
  const base = { kind: 'literal' as const, label: 'character reference', title: text, link: CHARACTER_REFERENCE, example: '<p>Fish &amp; chips &lt;3 &copy; 2025&nbsp;&mdash; &#x1F41F;</p>' };
  if (!m) return { ...base, summary: 'A **character reference**.', details: general };
  const [, hexDigits, decDigits, name, semi] = m;
  const noSemi = semi ? '' : ' It should end with `;`: without it, browsers only understand some names, and only in some places.';
  if (name !== undefined) {
    const ch = NAMED_CHARACTER_REFERENCES[name];
    if (ch === undefined) {
      const lower = NAMED_CHARACTER_REFERENCES[name.toLowerCase()];
      return {
        ...base,
        summary: `A **named character reference**${lower !== undefined ? `, but names are case-sensitive: did you mean \`&${name.toLowerCase()};\`?` : '. This name isn\'t one of the common ones: check the spelling (names are case-sensitive), or the browser shows it as plain text.'}`,
        details: general,
      };
    }
    return { ...base, summary: `Stands for ${describeChar(ch)}.${ESCAPE_NOTE[ch] ?? ''}${noSemi}`, details: general };
  }
  const cp = hexDigits !== undefined ? Number.parseInt(hexDigits, 16) : Number.parseInt(decDigits!, 10);
  const form = hexDigits !== undefined ? 'hexadecimal' : 'decimal';
  if (!(cp > 0 && cp <= 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff)) {
    return { ...base, summary: `A ${form} **numeric character reference**, but ${cp} is not a valid Unicode character: the browser shows � instead.`, details: general };
  }
  const ch = String.fromCodePoint(cp);
  const other = hexDigits !== undefined ? `\`&#${cp};\` in decimal` : `\`&#x${cp.toString(16).toUpperCase()};\` in hexadecimal`;
  return {
    ...base,
    summary: `A ${form} **numeric character reference**: Unicode code point ${cp} (U+${hex(cp)}), which is ${describeChar(ch)}. The same as ${other}.${ESCAPE_NOTE[ch] ?? ''}${noSemi}`,
    details: general,
  };
}

function describeChar(ch: string): string {
  return INVISIBLE[ch] ?? code(ch);
}

// ------------------------------------------------------------- tree helpers

const TAG_TYPES = new Set(['start_tag', 'end_tag', 'self_closing_tag', 'erroneous_end_tag']);

/** Whether `n` is an element: `element`, `script_element`, `style_element` (and Vue's `template_element`). */
export function isElement(n: Node | null | undefined): boolean {
  return !!n && /(^|_)element$/.test(n.type) && /^(start_tag|self_closing_tag)$/.test(n.firstChild?.type ?? '');
}

/** The element a tag (or tag name) belongs to. */
export function elementOf(n: Node): Node | undefined {
  for (let p: Node | null = n; p; p = p.parent) if (isElement(p)) return p;
  return undefined;
}

/** The tag name of an element (as written), or of a start/end/self-closing tag. */
export function tagNameOf(n: Node): string {
  const t = isElement(n) ? n.firstChild! : n;
  for (let i = 0; i < t.childCount; i++) {
    const c = t.child(i)!;
    if (/tag_name$/.test(c.type)) return c.text;
  }
  return '';
}

/** The attribute a token (name, `=`, value, quote) belongs to. */
function attributeOf(token: Node): Node | undefined {
  for (let p: Node | null = token; p && !TAG_TYPES.has(p.type); p = p.parent) if (p.type === 'attribute') return p;
  return undefined;
}

function attributeName(attr: Node): string {
  return attr.firstChild?.type === 'attribute_name' ? attr.firstChild.text : '';
}

/** The value of an attribute, without quotes ('' when it has none). */
function attributeValue(attr: Node): string {
  for (let i = 0; i < attr.namedChildCount; i++) {
    const c = attr.namedChild(i)!;
    if (c.type === 'attribute_value') return c.text;
    if (c.type === 'quoted_attribute_value') return c.namedChild(0)?.text ?? '';
  }
  return '';
}

/** The start or self-closing tag holding `n`, and its element's tag name. */
function ownerTag(n: Node): string {
  for (let p: Node | null = n; p; p = p.parent) if (TAG_TYPES.has(p.type)) return tagNameOf(p);
  return '';
}

/** The element whose `id` (or, for `map`, `name`) is `id`. */
function findById(from: Node, id: string, attribute = 'id'): Node | undefined {
  let root = from;
  while (root.parent) root = root.parent;
  for (const attr of root.descendantsOfType('attribute')) {
    if (attr && attributeName(attr).toLowerCase() === attribute && attributeValue(attr) === id) {
      const element = elementOf(attr);
      return element && ownExtent(element);
    }
  }
  return undefined;
}

/**
 * The part of the source an element really covers. tree-sitter-html lets a void
 * element (`<br>`, `<img>`, `<input>`) swallow the text after it, up to the next
 * tag, so for those only the start tag counts.
 */
export function ownExtent(element: Node): Node {
  const start = element.firstChild;
  return start?.type === 'start_tag' && VOID_ELEMENTS.has(tagNameOf(start).toLowerCase()) ? start : element;
}

// ---------------------------------------------------------------- the spec

export interface HtmlSpecOptions {
  /** Unique key of the spec (also the parser's). Default `"html"`. */
  id?: string;
  /** The VS Code language ids it handles. Default `["html"]`. */
  languageIds?: readonly string[];
  /** Shown in headings: "**`<div>`** · HTML element". Default `"HTML"`. */
  displayName?: string;
  /**
   * The grammar's wasm file. Default `tree-sitter-html.wasm`. Another grammar must
   * use tree-sitter-html's node types for the parts this spec explains (`element`,
   * `start_tag`, `end_tag`, `self_closing_tag`, `tag_name`, `attribute`,
   * `attribute_name`, `attribute_value`, `quoted_attribute_value`, `entity`,
   * `doctype`, `comment`), as tree-sitter-vue does.
   */
  wasm?: string;
  /** Markdown fence language for examples. Default `"html"`. */
  fence?: string;
  /**
   * Extra doc entries, merged over HTML's: token keys ("<parent type>/<token>",
   * "#<node type>") and the table keys "element:<name>", "attribute:<name>",
   * "attribute:<element>/<name>", "value:<attribute>=<value>" and
   * "value:<element>/<attribute>=<value>" (see the top of this file).
   */
  docs?: DocTable;
  /** Comment kinds. Default: HTML comments (`<!-- -->`, TODOs, `prettier-ignore`). */
  comments?: CommentStyle;
  /**
   * Doc for any token, tried before everything else. For syntax HTML doesn't have
   * (Vue's `{{ }}` and directive punctuation). Return undefined to fall through.
   */
  docFor?(token: Node): DocEntry | undefined;
  /**
   * Doc for an element's tag name (in its start, end or self-closing tag), tried
   * before the HTML tables. `tagName` is as written (`MyButton`, `router-link`):
   * for components and elements with a special meaning in the language
   * (Vue's `<template>`, `<component>`, `<transition>`). Give it `label: "component"`
   * or the like; the heading's title defaults to `<tagName>`.
   */
  elementDoc?(tagName: string, element: Node): DocEntry | undefined;
  /**
   * Doc for an attribute name, tried before the HTML tables. `name` is as written
   * (`v-if`, `:href`, `@click`); `element` is the element's tag name; `attr` the
   * `attribute` node (or whatever node the grammar uses for it).
   */
  attributeDoc?(name: string, element: string, attr: Node): DocEntry | undefined;
  /**
   * Doc for an attribute value, tried before the HTML tables. `value` is without
   * quotes; `node` is the `attribute_value` or `quoted_attribute_value`.
   */
  attributeValueDoc?(value: string, attribute: string, element: string, node: Node): DocEntry | undefined;
  /** What Explain This Line calls a construct, tried before HTML's labels (`the \`<div>\` element`). */
  labelOf?(node: Node): string | undefined;
}

/** Attributes whose value is the id of another element, and what this element does with it. */
const ID_REFERENCES: Record<string, string> = {
  for: 'labels',
  list: 'takes suggestions from',
  form: 'belongs to',
  headers: 'is described by the header',
  popovertarget: 'shows and hides',
  'aria-labelledby': 'is labelled by',
  'aria-describedby': 'is described by',
  'aria-controls': 'controls',
  'aria-owns': 'owns',
  'aria-activedescendant': 'has its active item in',
  'aria-details': 'has details in',
  'aria-errormessage': 'has its error message in',
};

/** Attributes whose value is a URL. */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'poster', 'cite', 'data', 'formaction', 'ping', 'background', 'manifest']);
/** Attributes whose value is a language tag. */
const LANGUAGE_ATTRIBUTES = new Set(['lang', 'hreflang', 'srclang', 'xml:lang']);
/** Attributes whose value is a space-separated list of keywords, each explained. */
const TOKEN_LIST_ATTRIBUTES = new Set(['rel', 'sandbox']);

const BOOLEAN_NOTE =
  '**Boolean attribute**: writing it turns it on, leaving it out turns it off. It needs no value (`hidden` is the same as `hidden=""`), and any value turns it on, even `"false"`.';

function attributeEntry(key: string, info: AttributeInfo): DocEntry {
  const name = key.includes('/') ? key.split('/')[1] : key;
  const element = key.includes('/') ? key.split('/')[0] : undefined;
  const where = element ? `On ${tag(element)}.` : info.on ? `Used on ${info.on.map(tag).join(', ')}.` : '**Global attribute**: it can be used on every element.';
  const details = [info.details, info.boolean ? BOOLEAN_NOTE : undefined, where].filter(Boolean).join('\n\n');
  const link = info.link ?? (info.on ? `${ELEMENTS}/${info.on[0]}#${name}` : `${GLOBAL}/${name}`);
  return { kind: 'syntax', label: 'attribute', title: name, summary: info.summary, details, example: info.example, link };
}

function elementEntry(name: string, info: ElementInfo): DocEntry {
  const notes: string[] = [];
  if (info.details) notes.push(info.details);
  if (VOID_ELEMENTS.has(name)) notes.push(`**Void element**: it has no content and **no end tag**; ${tag(name)} on its own is the whole element. (${code(`<${name} />`)} means the same.)`);
  return { kind: 'syntax', label: 'element', title: `<${name}>`, summary: info.summary, details: notes.join('\n\n') || undefined, example: info.example, link: info.link ?? elementLink(name) };
}

/** The doc table: token syntax plus the element, attribute and value tables under their keys. */
function htmlDocs(): DocTable {
  const docs: DocTable = {
    'start_tag/<': {
      kind: 'syntax',
      label: 'start tag',
      title: '< > (start tag)',
      summary: 'A **start tag** opens an element: `<`, the tag name, its attributes, and `>`. The element\'s content follows, up to its end tag.',
      example: '<p class="intro">Hello</p>',
      link: `${BASICS}#anatomy_of_an_html_element`,
    },
    'start_tag/>': {
      kind: 'syntax',
      label: 'start tag',
      title: '< > (start tag)',
      summary: 'Ends the **start tag**: the element\'s content follows.',
      link: `${BASICS}#anatomy_of_an_html_element`,
    },
    // End tags and the doctype have no token keys: each is explained as a whole (literalDoc).
    'self_closing_tag/<': { kind: 'syntax', label: 'self-closing tag', title: '< /> (self-closing tag)', summary: 'A tag that ends in `/>`: an element without an end tag.' },
    'self_closing_tag//>': { kind: 'syntax', label: 'self-closing tag', title: '/>', summary: 'Ends a tag that has no end tag.' },
    'erroneous_end_tag/</': { kind: 'syntax', label: 'end tag', title: '</ > (stray end tag)', summary: 'An **end tag** without a matching start tag.' },
    'erroneous_end_tag/>': { kind: 'syntax', label: 'end tag', title: '</ > (stray end tag)', summary: 'An **end tag** without a matching start tag.' },
    'attribute/=': {
      kind: 'syntax',
      title: '= (attribute value)',
      summary: 'Gives the attribute its **value**: `name="value"`. No spaces are needed around it.',
      example: '<a href="/about" title="About us">About</a>',
      link: `${BASICS}#attributes`,
    },
    '#entity': { ...entityDoc('&amp;'), title: '&name; (character reference)', summary: 'A **character reference**.' },
  };
  for (const [name, info] of Object.entries(HTML_ELEMENTS)) docs[`element:${name}`] = elementEntry(name, info);
  for (const [key, info] of Object.entries(HTML_ATTRIBUTES)) docs[`attribute:${key}`] = attributeEntry(key, info);
  for (const [key, info] of Object.entries(HTML_ATTRIBUTE_VALUES)) {
    const attr = key.slice(0, key.indexOf('=')).split('/').at(-1)!;
    const element = key.includes('/') && key.indexOf('/') < key.indexOf('=') ? key.slice(0, key.indexOf('/')) : undefined;
    const typeLink = element === 'input' && attr === 'type' ? `${ELEMENTS}/input/${key.slice(key.indexOf('=') + 1)}` : undefined;
    const attrInfo = (element && HTML_ATTRIBUTES[`${element}/${attr}`]) || HTML_ATTRIBUTES[attr];
    docs[`value:${key}`] = {
      kind: 'value',
      label: 'attribute value',
      summary: info.summary,
      details: info.details,
      example: info.example,
      link: info.link ?? typeLink ?? (attrInfo ? attributeEntry(element ? `${element}/${attr}` : attr, attrInfo).link : undefined),
    };
  }
  return docs;
}

const DOCTYPE: DocEntry = {
  kind: 'syntax',
  label: 'doctype',
  title: '<!DOCTYPE html>',
  summary: 'The **doctype**: tells the browser this is a modern HTML page, so it renders it in **standards mode**. Without it, browsers switch to "quirks mode", which imitates the bugs of very old browsers.',
  details: 'It must be the very first thing in the file. Upper or lower case doesn\'t matter. The long doctypes of HTML 4 and XHTML are no longer needed.',
  example: '<!DOCTYPE html>\n<html lang="en">\n  …\n</html>',
  link: 'https://developer.mozilla.org/en-US/docs/Glossary/Doctype',
};

/**
 * Builds an HTML spec, or the spec of an HTML-like language (see HtmlSpecOptions).
 *
 * The hooks are tried first and fall back to HTML, so e.g. a Vue template spec can be
 *
 *   makeHtmlSpec({
 *     id: 'vue', languageIds: ['vue'], displayName: 'Vue', wasm: 'tree-sitter-vue.wasm',
 *     elementDoc: (name) => (/^[A-Z]/.test(name) ? componentDoc(name) : undefined),
 *     attributeDoc: (name) => (name.startsWith('v-') ? directiveDoc(name) : undefined),
 *     docFor: (token) => (token.type === '{{' ? interpolationDoc : undefined),
 *   })
 *
 * The result is a plain LanguageSpec: spread it to replace anything else
 * (`{ ...makeHtmlSpec(options), role, identifierTypes }`). Elements are recognised by
 * their node type ending in `element` (`element`, `script_element`, `template_element`, ...)
 * with a start or self-closing tag as first child.
 */
export function makeHtmlSpec(options: HtmlSpecOptions = {}): LanguageSpec {
  const displayName = options.displayName ?? 'HTML';
  const docs: DocTable = { ...htmlDocs(), ...options.docs };
  const lookup = (key: string): DocEntry | undefined => (Object.hasOwn(docs, key) ? docs[key] : undefined);

  // -------------------------------------------------------------- elements

  /** The doc of an element by its tag name (`elementDoc` first, then the tables). */
  function elementDoc(tagName: string, element: Node | undefined): DocEntry {
    const custom = element && options.elementDoc?.(tagName, element);
    if (custom) return { title: `<${tagName}>`, ...custom };
    const name = tagName.toLowerCase();
    // Inside <svg> and <math>, elements belong to those languages (even <a> and <title>).
    const foreign = element && ancestorElement(element, /^(svg|math)$/i);
    if (foreign) {
      const math = tagNameOf(foreign).toLowerCase() === 'math';
      return {
        kind: 'syntax',
        label: `element (${math ? 'MathML' : 'SVG'})`,
        title: `<${tagName}>`,
        summary: `${math ? 'A **MathML**' : 'An **SVG**'} element, inside the ${tag(math ? 'math' : 'svg')} on line ${foreign.startPosition.row + 1}: not an HTML element. ${math ? 'MathML' : 'SVG'} has its own elements and attributes, and its tag names are case-sensitive.`,
        link: math ? `${MDN}/MathML/Reference/Element` : `${MDN}/SVG/Reference/Element`,
      };
    }
    const known = lookup(`element:${name}`);
    if (known) return known;
    if (Object.hasOwn(OBSOLETE, name)) {
      return { kind: 'syntax', label: 'element', title: `<${tagName}>`, summary: `An **obsolete** element: it is no longer part of HTML, and browsers may drop it. ${OBSOLETE[name]}`, link: `${ELEMENTS}#obsolete_and_deprecated_elements` };
    }
    if (name.includes('-')) {
      return {
        kind: 'syntax',
        label: 'custom element',
        title: `<${tagName}>`,
        summary: `A **custom element** (its name contains a \`-\`): an element defined by JavaScript, with \`customElements.define("${name}", class extends HTMLElement { … })\`, or by a library. Until it is defined, the browser shows its content like a \`<span>\`.`,
        example: `<${name}></${name}>\n<script>\n  customElements.define("${name}", class extends HTMLElement {\n    connectedCallback() { this.textContent = "Hello!"; }\n  });\n</script>`,
        link: CUSTOM_ELEMENTS,
      };
    }
    return {
      kind: 'syntax',
      label: 'element',
      title: `<${tagName}>`,
      summary: `${tag(tagName)} is **not a standard HTML element**. The browser still shows its content, but gives it no meaning and no default style. Check the spelling; for an element of your own, use a name with a \`-\` (a custom element).`,
      link: ELEMENTS,
    };
  }

  function ancestorElement(n: Node, name: RegExp): Node | undefined {
    for (let p: Node | null = n.parent; p; p = p.parent) if (isElement(p) && name.test(tagNameOf(p))) return p;
    return undefined;
  }

  // ------------------------------------------------------------ attributes

  /** The doc of an attribute name on an element (`attributeDoc` first, then the tables). */
  function attributeDoc(name: string, element: string, attr: Node): DocEntry {
    const custom = options.attributeDoc?.(name, element, attr);
    if (custom) return { title: name, ...custom };
    const lname = name.toLowerCase();
    const lel = element.toLowerCase();
    const specific = lookup(`attribute:${lel}/${lname}`);
    if (specific) return specific;
    const general = lookup(`attribute:${lname}`);
    const on = Object.hasOwn(HTML_ATTRIBUTES, lname) ? HTML_ATTRIBUTES[lname].on : undefined;
    // On a custom element, only global attributes keep their HTML meaning.
    if (general && !(on && lel.includes('-'))) {
      if (on && lel && !on.includes(lel) && Object.hasOwn(HTML_ELEMENTS, lel)) {
        return { ...general, summary: `⚠ \`${lname}\` has **no meaning on ${tag(lel)}**: it applies to ${on.map(tag).join(', ')}.\n\n${general.summary}` };
      }
      return general;
    }
    if (lname.startsWith('data-')) {
      const prop = lname.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return {
        kind: 'syntax',
        label: 'attribute',
        title: name,
        summary: `A **custom data attribute**: stores data of your own on the element. JavaScript reads it as \`element.dataset.${prop}\`, and CSS can select on it with \`[${lname}]\`.`,
        details: 'Values are always strings. Use them for small bits of data that scripts or styles need; the page itself doesn\'t use them.',
        example: `<li data-id="42" data-in-stock="true">Bread</li>\n<script>\n  item.dataset.id;       // "42"\n  item.dataset.inStock;  // "true"\n</script>`,
        link: `${GLOBAL}/data-*`,
      };
    }
    if (lname.startsWith('aria-')) {
      const known = ARIA_ATTRIBUTES[lname];
      return {
        kind: 'syntax',
        label: 'attribute',
        title: name,
        summary: known ?? 'An **ARIA attribute**: extra information for assistive technology, such as screen readers, about the element\'s state, properties or relations.',
        details: 'ARIA attributes only change what assistive technology is told; they don\'t change how the element looks or behaves. Native HTML elements and attributes come first.',
        link: known ? `${ARIA}/Attributes/${lname}` : `${MDN}/Accessibility/ARIA`,
      };
    }
    if (/^on[a-z]+$/.test(lname)) {
      const event = lname.slice(2);
      return {
        kind: 'syntax',
        label: 'event handler attribute',
        title: name,
        summary: `An **event handler**: the JavaScript in the value runs when ${EVENTS[event] ?? `the \`${event}\` event happens on this element`}. Inside it, \`this\` is the element and \`event\` the event.`,
        details: 'Handy for small examples, but `element.addEventListener("' + event + '", …)` in a script keeps HTML and JavaScript apart, and many Content Security Policies block inline handlers.',
        example: `<button ${lname}="${event === 'click' ? 'count++' : 'handle(event)'}">…</button>`,
        link: `${MDN}/HTML/Reference/Attributes#event_handler_attributes`,
      };
    }
    if (lel.includes('-')) {
      return { kind: 'syntax', label: 'attribute', title: name, summary: `An attribute of the custom element ${tag(lel)}: what it means is up to that element's code (it can watch it with \`observedAttributes\`).`, link: CUSTOM_ELEMENTS };
    }
    return {
      kind: 'syntax',
      label: 'attribute',
      title: name,
      summary: `\`${name}\` is **not a standard attribute**${lel ? ` of ${tag(lel)}` : ''}. The browser keeps it on the element, but gives it no meaning. For data of your own, use a \`data-\` attribute: \`data-${lname}\`.`,
      link: ATTRIBUTES,
    };
  }

  // ---------------------------------------------------------------- values

  /** The doc of an attribute value (`attributeValueDoc` first, then the tables and patterns). */
  function valueDoc(holder: Node): DocEntry | undefined {
    const attr = attributeOf(holder);
    if (!attr) return undefined;
    const name = attributeName(attr);
    const lname = name.toLowerCase();
    const element = ownerTag(attr);
    const lel = element.toLowerCase();
    const value = attributeValue(attr);
    const quoted = holder.type === 'quoted_attribute_value';
    const title = shorten(holder.text);
    const custom = options.attributeValueDoc?.(value, name, element, holder);
    if (custom) return { title, ...custom };
    const base = { kind: 'value' as const, label: 'attribute value', title };
    const attrDoc = (): DocEntry => attributeDoc(name, element, attr);
    const quotesNote = quoted
      ? 'Attribute values are text, in double or single quotes (they mean the same).'
      : 'Without quotes: allowed when the value has no spaces or `"` `\'` `=` `<` `>` `` ` ``, but quoting every value is the safer habit.';

    // A boolean attribute with a value: any value means "on".
    const info = Object.hasOwn(HTML_ATTRIBUTES, lname) ? HTML_ATTRIBUTES[lname] : undefined;
    if (info?.boolean && value !== '' && value.toLowerCase() !== lname && lname !== 'hidden') {
      return { ...base, summary: `\`${lname}\` is a **boolean attribute**: any value turns it on, even \`"${value}"\`. To turn it off, leave the attribute out.`, link: attrDoc().link };
    }

    const table = lookup(`value:${lel}/${lname}=${value}`) ?? lookup(`value:${lel}/${lname}=${value.toLowerCase()}`) ?? lookup(`value:${lname}=${value}`) ?? lookup(`value:${lname}=${value.toLowerCase()}`);
    if (table) return { ...table, title };

    if (lname === 'id') {
      return { ...base, summary: `An **id** of your choosing for this element: \`${value}\`. It must be unique in the page. CSS selects it with \`#${value}\`, scripts find it with \`getElementById("${value}")\`, and \`href="#${value}"\` links to it.`, link: `${GLOBAL}/id` };
    }
    if (lname === 'class') {
      const names = value.split(/\s+/).filter(Boolean);
      return {
        ...base,
        summary: names.length > 1
          ? `**Class names** of your choosing: ${names.map((n) => code(n)).join(', ')}. The element gets all of them; CSS styles each with ${names.map((n) => code(`.${n}`)).join(', ')}.`
          : `A **class name** of your choosing: ${code(value)}. CSS styles every element with this class using \`.${value}\`; scripts find them with \`querySelectorAll(".${value}")\`.`,
        link: `${GLOBAL}/class`,
      };
    }
    if (Object.hasOwn(ID_REFERENCES, lname) && value) {
      const ids = value.split(/\s+/).filter(Boolean);
      const target = findById(attr, ids[0]);
      return {
        ...base,
        kind: 'syntax',
        summary: `Refers to the element with ${ids.length > 1 ? `the ids ${ids.map(code).join(', ')}` : `\`id="${ids[0]}"\``}${target ? ` (line ${target.startPosition.row + 1})` : ': there is no such element in this file'}.`,
        link: attrDoc().link,
      };
    }
    if (lname === 'role' && Object.hasOwn(ROLES, value.toLowerCase())) {
      return { ...base, summary: `The element is ${ROLES[value.toLowerCase()]}`, link: `${ARIA}/Roles/${value.toLowerCase()}_role` };
    }
    if (lname === 'usemap' && value.startsWith('#')) {
      const target = findById(attr, value.slice(1), 'name');
      return { ...base, kind: 'syntax', summary: `Uses the image map \`<map name="${value.slice(1)}">\`${target ? ` (line ${target.startPosition.row + 1})` : ''}.`, link: attrDoc().link };
    }
    if (URL_ATTRIBUTES.has(lname)) return urlDoc(base, value, attr, attrDoc().link);
    if (LANGUAGE_ATTRIBUTES.has(lname)) {
      return { ...base, summary: `A **language tag**: \`${value}\`. A language code (\`en\`, \`nl\`, \`zh\`), optionally followed by a region or script: \`en-GB\`, \`pt-BR\`, \`zh-Hant\`.`, link: `${GLOBAL}/lang` };
    }
    if (TOKEN_LIST_ATTRIBUTES.has(lname)) {
      const words = value.split(/\s+/).filter(Boolean);
      const known = words.map((w) => [w, lookup(`value:${lname}=${w.toLowerCase()}`)] as const);
      if (lname === 'sandbox' && !words.length) {
        return { ...base, summary: 'An empty `sandbox`: **every restriction** applies. No scripts, no forms, no pop-ups, and the page is treated as coming from a unique origin.', link: attrDoc().link };
      }
      if (known.some(([, d]) => d)) {
        const lines = known.map(([w, d]) => `- ${code(w)}: ${d ? d.summary : 'not a keyword HTML knows.'}`);
        return { ...base, summary: words.length > 1 ? `${words.length} keywords, separated by spaces:\n\n${lines.join('\n')}` : lines[0].slice(2), link: attrDoc().link };
      }
    }
    if (lname === 'style') {
      return { ...base, summary: '**CSS declarations** for this element: `property: value` pairs separated by `;`, without a selector or braces.', example: '<p style="color: navy; margin-top: 0">…</p>', link: `${GLOBAL}/style` };
    }
    if (/^on[a-z]+$/.test(lname)) {
      return { ...base, summary: '**JavaScript code** that runs when the event happens. Usually a call to a function defined in a script.', link: attrDoc().link };
    }
    if (lname === 'tabindex' && /^-?\d+$/.test(value)) {
      const n = Number(value);
      const summary =
        n === 0 ? 'Puts the element in the **normal Tab order**, where it is in the page.'
        : n < 0 ? 'Focusable **from scripts only** (`element.focus()`), skipped by the Tab key.'
        : `⚠ A **positive** tabindex: the element comes before everything else in the Tab order, which is confusing for keyboard users. Use \`0\` and the order of the HTML instead.`;
      return { ...base, summary, link: `${GLOBAL}/tabindex` };
    }
    if (/^(width|height)$/.test(lname) && /^\d+$/.test(value)) {
      return { ...base, summary: `${value} **CSS pixels**. Written without a unit: \`${lname}="${value}px"\` is wrong here.`, link: attrDoc().link };
    }
    if (lname === 'content' && lel === 'meta') {
      const metaName = attributeValueOf(attr.parent, 'name') ?? attributeValueOf(attr.parent, 'http-equiv');
      const meta = metaName ? lookup(`value:meta/name=${metaName.toLowerCase()}`) ?? lookup(`value:meta/http-equiv=${metaName.toLowerCase()}`) : undefined;
      if (meta) return { ...base, summary: `The value for \`${metaName}\`. ${meta.summary}`, example: meta.example, link: meta.link };
    }
    if (lname === 'type' && /^[a-z]+\/[\w.+-]+$/i.test(value)) {
      return { ...base, summary: `A **MIME type**: \`${value}\` (a category, \`/\`, and a format), so the browser knows what kind of file it is before loading it.`, link: `${MDN}/HTTP/Guides/MIME_types` };
    }
    if (lname === 'alt' && value === '') {
      return { ...base, summary: 'An **empty `alt`**: marks the image as decorative, so screen readers skip it. Right for images that add nothing to the text; otherwise describe the image.', link: `${ELEMENTS}/img#alt` };
    }
    return { ...base, summary: `The value of the \`${name}\` attribute. ${quotesNote}`, link: attrDoc().link };
  }

  function urlDoc(base: { kind: 'value'; label: string; title: string }, value: string, attr: Node, link: string | undefined): DocEntry {
    const v = value.trim();
    if (v === '#') return { ...base, summary: '`#` alone links to the **top of the page**. Often a placeholder: for a link that only runs JavaScript, use a `<button>` instead.', link };
    if (v.startsWith('#')) {
      const target = findById(attr, decodeFragment(v.slice(1)));
      return { ...base, kind: 'syntax', summary: `Links to the element with \`id="${v.slice(1)}"\` on this page${target ? ` (line ${target.startPosition.row + 1})` : ''}: the browser scrolls to it.`, link };
    }
    if (/^mailto:/i.test(v)) return { ...base, summary: 'A **`mailto:` link**: opens the user\'s email program with a new message to this address. `?subject=…` can fill in the subject.', link: `${ELEMENTS}/a#linking_to_an_email_address` };
    if (/^tel:/i.test(v)) return { ...base, summary: 'A **`tel:` link**: on phones, offers to call this number.', link: `${ELEMENTS}/a#linking_to_telephone_numbers` };
    if (/^javascript:/i.test(v)) return { ...base, summary: '⚠ A **`javascript:` URL**: runs the code instead of going somewhere. Use a `<button>` with an event listener instead.', link };
    if (/^data:/i.test(v)) return { ...base, summary: 'A **`data:` URL**: the file itself, written inside the URL (often base64). Fine for tiny files.', link: `${MDN}/URI/Reference/Schemes/data` };
    if (/^[a-z][a-z\d+.-]*:/i.test(v)) return { ...base, summary: `An **absolute URL**: the full address, including the scheme (\`${v.slice(0, v.indexOf(':') + 1)}\`).`, link };
    if (v.startsWith('//')) return { ...base, summary: 'A **protocol-relative URL**: the same scheme (`https:`) as this page, on another host. Just write `https://`.', link };
    if (v.startsWith('/')) return { ...base, summary: 'A **root-relative URL**: starts at the root of this website (the same scheme and host as this page).', link };
    return { ...base, summary: 'A **relative URL**: resolved against the URL of this page (or its `<base>`). `../` goes up one folder.', link };
  }

  function attributeValueOf(tagNode: Node | null, name: string): string | undefined {
    if (!tagNode) return undefined;
    for (let i = 0; i < tagNode.namedChildCount; i++) {
      const a = tagNode.namedChild(i)!;
      if (a.type === 'attribute' && attributeName(a).toLowerCase() === name) return attributeValue(a);
    }
    return undefined;
  }

  // ------------------------------------------------------------------ tags

  function tagDoc(token: Node, tagNode: Node): DocEntry | undefined {
    const element = elementOf(tagNode);
    const name = tagNameOf(tagNode);
    const lname = name.toLowerCase();
    const isVoid = VOID_ELEMENTS.has(lname);
    switch (tagNode.type) {
      case 'start_tag': {
        const end = element?.children.find((c) => c?.type === 'end_tag');
        let summary = `The **start tag** of the ${tag(name)} element: \`<\`, the tag name, the attributes, then \`>\`.`;
        if (isVoid) summary += ` ${tag(lname)} is a **void element**: this tag is the whole element, with no content and no end tag.`;
        else if (end) summary += ` The content follows, up to the end tag \`</${name}>\`${end.startPosition.row !== tagNode.startPosition.row ? ` on line ${end.startPosition.row + 1}` : ''}.`;
        else if (OPTIONAL_END_TAG.has(lname)) summary += ` Its end tag \`</${name}>\` is left out, which is allowed for ${tag(lname)}: the element ends where the next one starts or its parent ends.`;
        else if (element) summary += ` ⚠ It has no end tag \`</${name}>\`: the browser closes it where its parent ends, which may not be what you meant.`;
        return { kind: 'syntax', label: 'start tag', title: `<${name}>`, summary, link: elementDoc(name, element).link };
      }
      case 'end_tag': {
        // The whole end tag is one thing to explain: what it closes, and what that element is.
        const start = element?.firstChild;
        const where = start && start.startPosition.row !== tagNode.startPosition.row ? ` opened on line ${start.startPosition.row + 1}` : '';
        const el = elementDoc(name, element);
        return {
          kind: 'syntax',
          label: 'end tag',
          title: `</${name}>`,
          summary: `The **end tag** of the ${tag(name)} element${where}: \`</\`, the tag name and \`>\`, without attributes.`,
          details: `${tag(name)}: ${el.summary}`,
          example: el.example,
          link: el.link,
        };
      }
      case 'self_closing_tag': {
        const inForeign = element && ancestorElement(element, /^(svg|math)$/i);
        let summary = token.text === '/>' ? '`/>` ends a tag that has **no end tag**.' : `A **self-closing tag**: the whole ${tag(name)} element, without content or end tag.`;
        if (inForeign) summary += ' Inside SVG and MathML, `/>` really closes the element.';
        else if (isVoid) summary += ` In HTML the \`/\` is optional: ${tag(lname)} is a void element, so \`<${name}>\` means the same.`;
        else if (Object.hasOwn(HTML_ELEMENTS, lname)) summary += ` ⚠ In HTML, \`/>\` doesn't close a normal element like ${tag(lname)}: the browser ignores the \`/\`, so the element stays open. Write \`<${name}></${name}>\`.`;
        return { kind: 'syntax', label: 'self-closing tag', title: token.text === '/>' ? '/>' : `<${name} />`, summary, link: 'https://developer.mozilla.org/en-US/docs/Glossary/Void_element#self-closing_tags' };
      }
      case 'erroneous_end_tag':
        return strayEndTag(name);
    }
    return undefined;
  }

  function strayEndTag(name: string): DocEntry {
    return {
      kind: 'syntax',
      label: 'end tag',
      title: `</${name}>`,
      summary: `⚠ A **stray end tag**: there is no open ${tag(name)} element here for it to close, so the browser ignores it. Check where the element was opened, or whether it was already closed.`,
      link: `${BASICS}#nesting_elements`,
    };
  }

  // ----------------------------------------------------------- spec hooks

  function docFor(token: Node): DocEntry | undefined {
    const own = options.docFor?.(token);
    if (own) return own;
    const parent = token.parent;
    if (!parent) return undefined;
    // An end tag and the doctype are explained as a whole, by literalDoc.
    if (parent.type === 'end_tag' || parent.type === 'doctype') return undefined;
    switch (token.type) {
      case 'tag_name':
        if (parent.type === 'erroneous_end_tag') return strayEndTag(token.text);
        return elementDoc(token.text, elementOf(parent));
      case 'erroneous_end_tag_name':
        return strayEndTag(token.text);
      case 'attribute_name':
        return parent.type === 'attribute' ? attributeDoc(token.text, ownerTag(parent), parent) : undefined;
      case 'attribute_value':
        // Quoted values are explained as a whole by literalDoc (quotes included).
        return parent.type === 'attribute' ? valueDoc(token) : undefined;
      case 'entity':
        return entityDoc(token.text);
    }
    if (token.isNamed) return undefined;
    if (TAG_TYPES.has(parent.type) && /^(<|>|<\/|\/>)$/.test(token.text)) return tagDoc(token, parent);
    return undefined;
  }

  function doctypeDoc(doctype: Node): DocEntry {
    const old = !/^<!doctype\s+html\s*>$/i.test(doctype.text.trim());
    return old ? { ...DOCTYPE, summary: `${DOCTYPE.summary}\n\nThis is an **old doctype** (HTML 4 or XHTML). Today, \`<!DOCTYPE html>\` is all you need.` } : DOCTYPE;
  }

  /** Constructs explained as a whole, whichever of their tokens is hovered (so the hover covers all of it). */
  function literalDoc(node: Node): DocEntry | undefined {
    switch (node.type) {
      case 'quoted_attribute_value':
        return valueDoc(node);
      case 'end_tag':
        return tagDoc(node, node);
      case 'doctype':
        return doctypeDoc(node);
    }
    return undefined;
  }

  /** Values that point to another element (`for="email"`, `href="#top"`): that element. */
  function jumpTarget(token: Node): JumpTarget | undefined {
    if (token.type !== 'attribute_name' && token.type !== 'attribute_value' && !(token.parent?.type === 'quoted_attribute_value')) return undefined;
    const attr = attributeOf(token);
    if (!attr) return undefined;
    const name = attributeName(attr).toLowerCase();
    const value = attributeValue(attr).trim();
    if (Object.hasOwn(ID_REFERENCES, name) && value) {
      const target = findById(attr, value.split(/\s+/)[0]);
      return target && { node: target, verb: ID_REFERENCES[name] };
    }
    if (name === 'href' && value.length > 1 && value.startsWith('#')) {
      const target = findById(attr, decodeFragment(value.slice(1)));
      return target && { node: target, verb: 'links to' };
    }
    if (name === 'usemap' && value.startsWith('#')) {
      const target = findById(attr, value.slice(1), 'name');
      return target && { node: target, verb: 'uses the image map' };
    }
    return undefined;
  }

  /** An element is outlined by its start and end tags. */
  function scopeBoundaries(scope: Node): Node[] | undefined {
    if (scope.type === 'start_tag') return [scope]; // a void element (see promote)
    if (!isElement(scope)) return undefined;
    const tags: Node[] = [];
    for (let i = 0; i < scope.childCount; i++) {
      const c = scope.child(i)!;
      if (/^(start_tag|end_tag|self_closing_tag)$/.test(c.type)) tags.push(c);
    }
    return tags;
  }

  function labelOf(node: Node): string | undefined {
    const own = options.labelOf?.(node);
    if (own) return own;
    if (isElement(node)) return `the ${tag(tagNameOf(node))} element`;
    switch (node.type) {
      case 'start_tag':
        return `the ${tag(tagNameOf(node))} start tag`;
      case 'end_tag':
        return `the ${code(`</${tagNameOf(node)}>`)} end tag`;
      case 'self_closing_tag':
        return `the ${code(`<${tagNameOf(node)} />`)} tag`;
      case 'erroneous_end_tag':
        return `the stray ${code(`</${tagNameOf(node)}>`)} end tag`;
      case 'doctype':
        return 'the `<!DOCTYPE>` declaration';
      case 'attribute':
        return `the \`${attributeName(node)}\` attribute`;
    }
    return undefined;
  }

  /** An element's content: between its start tag and its end tag. */
  function contentOf(node: Node): { startIndex: number; endIndex: number } | undefined {
    if (!isElement(node) || node.firstChild?.type !== 'start_tag' || ownExtent(node) !== node) return undefined;
    const last = node.lastChild;
    return { startIndex: node.firstChild.endIndex, endIndex: last?.type === 'end_tag' ? last.startIndex : node.endIndex };
  }

  return {
    id: options.id ?? 'html',
    languageIds: options.languageIds ?? ['html'],
    displayName,
    wasm: options.wasm ?? 'tree-sitter-html.wasm',
    fence: options.fence ?? 'html',
    docs,
    comments: options.comments ?? htmlComments,
    identifierTypes: new Set(),
    // A tag belongs to its element; a quoted value to its attribute.
    wrapperTypes: new Set(['start_tag', 'end_tag', 'self_closing_tag', 'quoted_attribute_value']),
    noScopeTokens: new Set(['"', "'"]),
    role: () => undefined,
    jumpTarget,
    // A void element is just its start tag.
    promote: (scope) => (isElement(scope) ? ownExtent(scope) : scope),
    docFor,
    literalDoc,
    scopeBoundaries,
    labelOf,
    contentOf,
    extentOf: (node) => (isElement(node) ? ownExtent(node) : node),
  };
}

function decodeFragment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export const html: LanguageSpec = makeHtmlSpec();
