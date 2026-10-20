// Reference data for the CSS spec (src/docs/css.ts): properties and the meaning of
// their keyword values, value functions, units, named colors, selectors' pseudo-classes
// and pseudo-elements, at-rules and media features. Short, beginner-oriented texts.

export const MDN = 'https://developer.mozilla.org/en-US/docs/Web/CSS';

/** A property, with what its keyword values mean there. */
export interface Prop {
  summary: string;
  example?: string;
  details?: string;
  /** Keyword values and what they do for this property. */
  values?: Record<string, string>;
  /** For shorthands: the longhands, whose values the shorthand also takes. */
  longhands?: string[];
  /** What a percentage is a percentage of. */
  percent?: string;
  /** What a plain number (without unit) means. */
  number?: string;
  /** MDN page name, if not the property name. */
  page?: string;
}

// ------------------------------------------------------------ value groups

const DISPLAY: Record<string, string> = {
  block: 'a **block** box: starts on a new line and takes the full available width (like `<div>`, `<p>`)',
  inline: 'an **inline** box: flows inside a line of text (like `<span>`, `<a>`). `width`, `height` and vertical margins have no effect',
  'inline-block': 'flows in the line like inline, but accepts `width`, `height`, padding and margins like a block',
  flex: 'a **flex container**: its children are laid out in a row (or column) with `justify-content`, `align-items` and `gap`',
  'inline-flex': 'a flex container that itself flows inline',
  grid: 'a **grid container**: its children are placed in the rows and columns you define with `grid-template-columns`/`-rows`',
  'inline-grid': 'a grid container that itself flows inline',
  none: '**not displayed at all**: the element and its children take no space and are hidden from screen readers too (unlike `visibility: hidden`)',
  contents: 'the element\'s own box disappears and its children act as if they were the parent\'s children (useful to "unwrap" a wrapper in a grid or flex layout)',
  'flow-root': 'a block that contains its floats and margins: the modern "clearfix"',
  'list-item': 'a block with a list marker, like `<li>`',
  table: 'behaves like `<table>`',
  'table-row': 'behaves like `<tr>`',
  'table-cell': 'behaves like `<td>`',
  'inline-table': 'a table that flows inline',
};

const POSITION: Record<string, string> = {
  static: 'the default: in the normal flow; `top`/`left`/... and `z-index` have no effect',
  relative: 'in the normal flow, but shifted by `top`/`left`/... without affecting other elements. Also makes it the **containing block** for `absolute` children',
  absolute: 'taken **out of the flow** and placed with `top`/`left`/... relative to the nearest positioned ancestor (one whose `position` isn\'t `static`)',
  fixed: 'taken out of the flow and placed relative to the **viewport**: it stays put while the page scrolls',
  sticky: 'scrolls normally until it reaches its `top` (or `bottom`, ...) offset, then **sticks** there while its parent is in view',
};

const CONTENT_ALIGN: Record<string, string> = {
  center: 'packs the items together in the **middle**',
  start: 'packs the items at the start',
  end: 'packs the items at the end',
  'flex-start': 'packs the items at the start of the flex direction',
  'flex-end': 'packs the items at the end of the flex direction',
  left: 'packs the items on the left',
  right: 'packs the items on the right',
  'space-between': 'first item at the start, last at the end, the **free space shared equally between** the items',
  'space-around': 'equal space **around** each item (so the gaps at the edges are half as big)',
  'space-evenly': '**equal gaps** everywhere, including before the first and after the last item',
  stretch: 'stretches auto-sized items (or tracks) to fill the space',
  normal: 'the default packing (like `stretch` in grids, `flex-start` in flexbox)',
  baseline: 'aligns the items by their text baseline',
};

const ITEMS_ALIGN: Record<string, string> = {
  center: 'centers the item(s) on the cross axis',
  start: 'aligns to the start',
  end: 'aligns to the end',
  'flex-start': 'aligns to the start of the cross axis (top, in a row)',
  'flex-end': 'aligns to the end of the cross axis (bottom, in a row)',
  'self-start': 'aligns to the item\'s own start side',
  'self-end': 'aligns to the item\'s own end side',
  baseline: 'aligns the items so their first lines of **text** line up',
  stretch: 'the default: items without a fixed size **stretch** to fill the line',
  normal: 'the default alignment (behaves like `stretch` for most items)',
  auto: 'uses the parent\'s `align-items` / `justify-items`',
  left: 'aligns to the left',
  right: 'aligns to the right',
};

const OVERFLOW: Record<string, string> = {
  visible: 'the default: content that doesn\'t fit **spills out** of the box',
  hidden: 'content that doesn\'t fit is **cut off**; it can still be scrolled with JavaScript',
  clip: 'content is cut off and can\'t be scrolled at all (and no scroll container is created)',
  scroll: 'always shows **scrollbars**, even when the content fits',
  auto: 'shows scrollbars **only when needed**',
};

const TIMING: Record<string, string> = {
  ease: 'the default curve: starts slowly, speeds up, then slows down at the end',
  linear: 'a **constant** speed from start to end',
  'ease-in': 'starts slowly and speeds up',
  'ease-out': 'starts fast and slows down at the end (feels natural for things that appear)',
  'ease-in-out': 'starts and ends slowly',
  'step-start': 'jumps to the end value right away',
  'step-end': 'stays at the start value and jumps at the end',
};

const BORDER_STYLE: Record<string, string> = {
  none: 'no border (the default, so a border needs a style to show up)',
  hidden: 'no border, and it wins over other borders in collapsed tables',
  solid: 'a single **solid** line',
  dashed: 'a **dashed** line',
  dotted: 'a **dotted** line',
  double: 'two parallel lines',
  groove: 'looks carved into the page',
  ridge: 'looks raised from the page',
  inset: 'makes the box look embedded',
  outset: 'makes the box look raised',
};

const BORDER_WIDTH: Record<string, string> = { thin: 'a thin line (usually 1px)', medium: 'the default width (usually 3px)', thick: 'a thick line (usually 5px)' };

const FONT_FAMILY: Record<string, string> = {
  serif: 'a generic font **with serifs** (little strokes at the ends of letters), like Times',
  'sans-serif': 'a generic font **without serifs**, like Arial or Helvetica',
  monospace: 'a generic font where every character has the **same width**, for code',
  cursive: 'a generic handwriting-style font',
  fantasy: 'a generic decorative font',
  'system-ui': 'the operating system\'s own user-interface font (Segoe UI, San Francisco, Roboto, ...)',
  'ui-monospace': 'the system\'s monospace UI font',
  'ui-sans-serif': 'the system\'s sans-serif UI font',
  'ui-serif': 'the system\'s serif UI font',
  'ui-rounded': 'the system\'s rounded UI font, if it has one',
  emoji: 'a font for emoji',
  math: 'a font for mathematical formulas',
};

const FONT_WEIGHT: Record<string, string> = {
  normal: 'regular weight, the same as `400`',
  bold: 'bold, the same as `700`',
  bolder: 'one step bolder than the parent\'s weight',
  lighter: 'one step lighter than the parent\'s weight',
};

const FONT_STYLE: Record<string, string> = { normal: 'upright text', italic: '*italic* text (the font\'s italic version)', oblique: 'slanted text' };

const FONT_SIZE: Record<string, string> = {
  'xx-small': 'an absolute size keyword (about 9px)', 'x-small': 'an absolute size keyword (about 10px)', small: 'an absolute size keyword (about 13px)',
  medium: 'the browser\'s default size (16px unless the user changed it)', large: 'an absolute size keyword (about 18px)', 'x-large': 'an absolute size keyword (about 24px)',
  'xx-large': 'an absolute size keyword (about 32px)', 'xxx-large': 'an absolute size keyword (about 48px)',
  smaller: 'a bit smaller than the parent\'s font size', larger: 'a bit larger than the parent\'s font size',
};

const TEXT_ALIGN: Record<string, string> = {
  left: 'aligns the lines to the left', right: 'aligns the lines to the right', center: '**centers** the lines of text',
  justify: 'stretches the spaces so lines fill the whole width (except the last line)',
  start: 'aligns to the start of the writing direction (left in English, right in Arabic)', end: 'aligns to the end of the writing direction',
};

const SIDES: Record<string, string> = {
  center: 'the center', top: 'the top', bottom: 'the bottom', left: 'the left side', right: 'the right side',
};

const GLOBAL_SIZES: Record<string, string> = {
  auto: 'the **default**: the browser works out the size from the content and the layout',
  'min-content': 'as small as possible without overflowing: as narrow as the longest word',
  'max-content': 'as wide as the content wants: text doesn\'t wrap at all',
  'fit-content': 'as wide as the content, but no wider than the available space',
  stretch: 'fills the available space of the containing block',
};

const ANIMATION_VALUES: Record<string, string> = {
  infinite: 'repeats **forever**',
  normal: 'plays forwards each time',
  reverse: 'plays backwards',
  alternate: 'plays forwards, then backwards, then forwards, ...',
  'alternate-reverse': 'plays backwards first, then forwards, ...',
  forwards: 'keeps the styles of the **last** keyframe after the animation ends',
  backwards: 'applies the first keyframe already during the `animation-delay`',
  both: 'does both `forwards` and `backwards`',
  none: 'no animation styles before or after it runs',
  running: 'the animation is playing',
  paused: 'the animation is **paused** (e.g. toggled on `:hover`)',
};

const CURSOR: Record<string, string> = {
  pointer: 'the **pointing hand**, used for links and clickable things', default: 'the normal arrow', text: 'the text-selection I-beam',
  move: 'something can be moved', grab: 'an open hand: something can be grabbed', grabbing: 'a closed hand: something is being dragged',
  'not-allowed': 'a "forbidden" sign: the action isn\'t possible', wait: 'busy: the program is working', progress: 'busy, but you can still interact',
  help: 'help is available', crosshair: 'a crosshair, for precise selection', 'zoom-in': 'something can be zoomed in', 'zoom-out': 'something can be zoomed out',
  none: 'no cursor is shown', auto: 'the browser picks a cursor from the context (the default)', 'col-resize': 'a column can be resized', 'row-resize': 'a row can be resized',
  'context-menu': 'a context menu is available',
};

const BLEND: Record<string, string> = {
  normal: 'no blending', multiply: 'multiplies the colors: the result is darker', screen: 'the opposite of multiply: the result is lighter',
  overlay: 'multiplies or screens depending on the backdrop', darken: 'keeps the darker color', lighten: 'keeps the lighter color',
  difference: 'subtracts the darker color from the lighter one', exclusion: 'like difference, with lower contrast', 'color-dodge': 'brightens the backdrop',
  'color-burn': 'darkens the backdrop', 'hard-light': 'like overlay with the layers swapped', 'soft-light': 'a softer overlay',
  hue: 'the hue of the element with the backdrop\'s saturation and lightness', saturation: 'the saturation of the element', color: 'the hue and saturation of the element', luminosity: 'the lightness of the element',
};

// ----------------------------------------------------------------- properties

const side = (base: string, where: string, what: string): Prop => ({
  summary: `The ${what} on the **${where}** side only. See \`${base}\` for all sides at once.`,
  example: `${base}-${where}: 1rem;`,
});

const logical = (what: string, axis: 'inline' | 'block', extra = ''): Prop => ({
  summary: `A **logical** property: the ${what} on ${extra || 'both'} ${axis} side${extra ? '' : 's'} (${axis === 'inline' ? 'left and right in horizontal left-to-right text' : 'top and bottom in horizontal text'}${extra ? ', depending on writing direction' : ''}). It adapts to right-to-left and vertical writing modes.`,
});

export const PROPERTIES: Record<string, Prop> = {
  // ---------------------------------------------------------------- box model
  display: {
    summary: 'Sets how the element is laid out (its **outer** display: block or inline) and how its children are laid out (its **inner** display: normal flow, flex or grid).',
    example: '.toolbar {\n  display: flex;\n  gap: 8px;\n}',
    values: DISPLAY,
  },
  width: { summary: 'The **width** of the element\'s content box (or of its border box, with `box-sizing: border-box`).', example: 'width: 50%;\nwidth: min(100%, 60rem);', values: GLOBAL_SIZES, percent: 'the width of the containing block (usually the parent)' },
  height: { summary: 'The **height** of the content box (or border box with `box-sizing: border-box`). Usually best left `auto`, so the content decides.', example: 'height: 100vh;', values: GLOBAL_SIZES, percent: 'the height of the containing block; only works if the parent\'s height is set, otherwise it acts like `auto`' },
  'min-width': { summary: 'The element is never **narrower** than this, whatever `width` says.', example: 'min-width: 200px;', values: GLOBAL_SIZES, percent: 'the width of the containing block' },
  'max-width': { summary: 'The element is never **wider** than this. `max-width: 100%` keeps images inside their container.', example: 'img { max-width: 100%; }\n.text { max-width: 65ch; }', values: { none: 'no maximum (the default)', ...GLOBAL_SIZES }, percent: 'the width of the containing block' },
  'min-height': { summary: 'The element is never **shorter** than this; it can still grow with its content.', example: 'min-height: 100vh;', values: GLOBAL_SIZES, percent: 'the height of the containing block' },
  'max-height': { summary: 'The element is never **taller** than this; extra content overflows (see `overflow`).', example: 'max-height: 300px;\noverflow-y: auto;', values: { none: 'no maximum (the default)', ...GLOBAL_SIZES }, percent: 'the height of the containing block' },
  margin: {
    summary: 'The **outside** space around the element, between its border and its neighbours. One to four values: all sides; vertical horizontal; top horizontal bottom; top right bottom left (clockwise).',
    details: 'Vertical margins of blocks **collapse**: the bigger of two touching margins wins, they don\'t add up. `margin: 0 auto` centers a block that has a width. Negative margins pull the element (or its neighbours) closer.',
    example: 'margin: 1rem;          /* all sides */\nmargin: 0 auto;        /* centered block */\nmargin: 8px 16px 0 4px; /* top right bottom left */',
    values: { auto: 'takes up the free space: `margin: 0 auto` centers a block horizontally, and in flexbox `margin-left: auto` pushes the item to the right' },
    percent: 'the **width** of the containing block, even for the top and bottom margins',
  },
  'margin-top': side('margin', 'top', 'margin'),
  'margin-right': side('margin', 'right', 'margin'),
  'margin-bottom': side('margin', 'bottom', 'margin'),
  'margin-left': side('margin', 'left', 'margin'),
  padding: {
    summary: 'The **inside** space between the element\'s content and its border. The background fills it. One to four values, like `margin` (top right bottom left).',
    details: 'Padding is added to the `width` unless `box-sizing: border-box` is set. It can\'t be negative.',
    example: 'padding: 1rem;\npadding: 4px 8px;',
    percent: 'the **width** of the containing block, even for the top and bottom padding',
  },
  'padding-top': side('padding', 'top', 'padding'),
  'padding-right': side('padding', 'right', 'padding'),
  'padding-bottom': side('padding', 'bottom', 'padding'),
  'padding-left': side('padding', 'left', 'padding'),
  'box-sizing': {
    summary: 'What `width` and `height` measure: just the content (`content-box`, the default) or the content **plus padding and border** (`border-box`).',
    details: 'Many stylesheets start with `*, *::before, *::after { box-sizing: border-box; }`, so a `width: 50%` box with padding is still exactly half as wide.',
    example: '*, *::before, *::after {\n  box-sizing: border-box;\n}',
    values: { 'content-box': 'the default: `width` is the content only; padding and border are added on top', 'border-box': '`width` includes the padding and the border, which is easier to reason about' },
  },
  border: {
    summary: 'Shorthand for the **border** on all four sides: its width, style and color, in any order. The style is required, or no border shows.',
    example: 'border: 1px solid #ccc;\nborder: none;',
    longhands: ['border-width', 'border-style', 'border-color'],
  },
  'border-top': { summary: 'The border on the top side: width, style and color.', example: 'border-top: 2px solid currentcolor;', longhands: ['border-width', 'border-style', 'border-color'] },
  'border-right': { summary: 'The border on the right side: width, style and color.', example: 'border-right: 1px dashed gray;', longhands: ['border-width', 'border-style', 'border-color'] },
  'border-bottom': { summary: 'The border on the bottom side: width, style and color. Often used for underlines and separators.', example: 'border-bottom: 1px solid #eee;', longhands: ['border-width', 'border-style', 'border-color'] },
  'border-left': { summary: 'The border on the left side: width, style and color.', example: 'border-left: 4px solid royalblue;', longhands: ['border-width', 'border-style', 'border-color'] },
  'border-width': { summary: 'How thick the border is, for one to four sides (top right bottom left).', example: 'border-width: 1px 0;', values: BORDER_WIDTH },
  'border-style': { summary: 'The line style of the border, for one to four sides. Without a style (`none` is the default) there is no border at all.', example: 'border-style: solid;', values: BORDER_STYLE },
  'border-color': { summary: 'The color of the border, for one to four sides. Defaults to the text color (`currentcolor`).', example: 'border-color: transparent transparent red;' },
  'border-radius': {
    summary: '**Rounds the corners** of the border box (and the background). One to four values, clockwise from the top-left corner; a `/` gives separate horizontal and vertical radii.',
    example: 'border-radius: 8px;\nborder-radius: 50%;   /* a circle, for a square element */\nborder-radius: 999px; /* a pill */',
    percent: 'the element\'s own width (horizontal radius) and height (vertical radius)',
  },
  'border-top-left-radius': { summary: 'Rounds the top-left corner only. See `border-radius`.', percent: 'the element\'s own size' },
  'border-top-right-radius': { summary: 'Rounds the top-right corner only. See `border-radius`.', percent: 'the element\'s own size' },
  'border-bottom-right-radius': { summary: 'Rounds the bottom-right corner only. See `border-radius`.', percent: 'the element\'s own size' },
  'border-bottom-left-radius': { summary: 'Rounds the bottom-left corner only. See `border-radius`.', percent: 'the element\'s own size' },
  outline: {
    summary: 'A line drawn **outside** the border that takes **no space** (it doesn\'t move anything). Browsers use it to show keyboard focus.',
    details: 'Don\'t remove focus outlines (`outline: none`) without giving another visible focus style: keyboard users need it. `:focus-visible` shows it only for keyboard focus.',
    example: 'button:focus-visible {\n  outline: 2px solid royalblue;\n  outline-offset: 2px;\n}',
    longhands: ['outline-width', 'outline-style', 'outline-color'],
  },
  'outline-width': { summary: 'The thickness of the outline.', values: BORDER_WIDTH },
  'outline-style': { summary: 'The line style of the outline (`solid`, `dashed`, `auto`, ...).', values: { ...BORDER_STYLE, auto: 'the browser\'s own focus-ring style' } },
  'outline-color': { summary: 'The color of the outline.' },
  'outline-offset': { summary: 'The gap between the outline and the border. Negative values draw it inside.', example: 'outline-offset: 3px;' },
  'box-shadow': {
    summary: 'Adds **shadows** around the box: `x-offset y-offset blur spread color`, several separated by commas. `inset` puts the shadow inside.',
    details: 'Shadows don\'t take space and follow `border-radius`. A shadow with no blur and a spread works as a border that doesn\'t change the layout.',
    example: 'box-shadow: 0 2px 8px rgb(0 0 0 / 20%);\nbox-shadow: inset 0 0 0 1px #ddd;',
    values: { inset: 'draws the shadow **inside** the box (as if the box were pressed in)', none: 'no shadow' },
  },
  overflow: { summary: 'What happens when the content is **bigger than the box**: show it, clip it or scroll. One value for both directions, or two (`x y`).', example: 'overflow: auto;\noverflow: hidden;', values: OVERFLOW },
  'overflow-x': { summary: 'Like `overflow`, for the horizontal direction only.', example: 'overflow-x: auto;', values: OVERFLOW },
  'overflow-y': { summary: 'Like `overflow`, for the vertical direction only.', example: 'overflow-y: scroll;', values: OVERFLOW },
  visibility: {
    summary: 'Whether the element is **visible**. Unlike `display: none`, a hidden element still **takes up its space**.',
    example: 'visibility: hidden;',
    values: { visible: 'shown (the default)', hidden: 'invisible but still takes its space; children can override it with `visibility: visible`', collapse: 'for table rows and columns: removes them like `display: none`, without re-calculating the column widths' },
  },
  opacity: {
    summary: 'How **opaque** the element is, with all its children: `1` is fully visible, `0` fully transparent (but still clickable and in the layout).',
    example: 'opacity: 0.5;\ntransition: opacity 0.3s;',
    number: 'from `0` (invisible) to `1` (opaque)',
    percent: 'opacity: `0%` is invisible, `100%` opaque',
  },
  'z-index': {
    summary: 'The **stacking order** of overlapping elements: a higher number is drawn in front. Only works on positioned elements (`position` other than `static`) and on flex and grid items.',
    details: 'z-index only competes within the same **stacking context**: an element with `opacity < 1`, a `transform` or its own `z-index` creates one, and its children can never get in front of the context\'s siblings, whatever their number.',
    example: '.modal {\n  position: fixed;\n  z-index: 100;\n}',
    values: { auto: 'the default: stacks with its parent and doesn\'t create a stacking context' },
    number: 'the stacking level: higher numbers are drawn in front, negative ones behind the parent\'s content',
  },
  position: { summary: 'How the element is **positioned**: in the normal flow, shifted, or taken out of the flow and placed with `top`, `right`, `bottom` and `left`.', example: '.badge {\n  position: absolute;\n  top: 0;\n  right: 0;\n}', values: POSITION },
  top: { summary: 'For a positioned element: the distance from the **top** edge of its containing block (for `relative`: how far it moves down).', example: 'top: 0;', values: { auto: 'the default: no offset' }, percent: 'the height of the containing block' },
  right: { summary: 'For a positioned element: the distance from the **right** edge of its containing block.', example: 'right: 1rem;', values: { auto: 'the default: no offset' }, percent: 'the width of the containing block' },
  bottom: { summary: 'For a positioned element: the distance from the **bottom** edge of its containing block.', example: 'bottom: 0;', values: { auto: 'the default: no offset' }, percent: 'the height of the containing block' },
  left: { summary: 'For a positioned element: the distance from the **left** edge of its containing block (for `relative`: how far it moves right).', example: 'left: 50%;', values: { auto: 'the default: no offset' }, percent: 'the width of the containing block' },
  inset: {
    summary: 'Shorthand for `top`, `right`, `bottom` and `left` at once, with one to four values like `margin`. `inset: 0` stretches a positioned element over its whole containing block.',
    example: '.overlay {\n  position: absolute;\n  inset: 0;\n}',
    values: { auto: 'no offset' },
    percent: 'the containing block\'s height (top/bottom) and width (left/right)',
  },
  float: {
    summary: 'Moves the element to the left or right and lets text and inline content **wrap around** it, like an image in a newspaper. For page layouts, use flexbox or grid instead.',
    example: 'img.portrait {\n  float: left;\n  margin-right: 1rem;\n}',
    values: { left: 'floats to the left; content wraps on its right', right: 'floats to the right; content wraps on its left', none: 'doesn\'t float (the default)', 'inline-start': 'floats to the start of the line direction', 'inline-end': 'floats to the end of the line direction' },
  },
  clear: { summary: 'Moves the element **below** earlier floats instead of next to them.', values: { left: 'below left floats', right: 'below right floats', both: 'below all floats', none: 'next to floats (the default)' } },
  'aspect-ratio': {
    summary: 'A preferred **width-to-height ratio**: with only the width set, the height follows (and the other way round).',
    example: '.video {\n  width: 100%;\n  aspect-ratio: 16 / 9;\n}',
    values: { auto: 'the element\'s natural ratio (images and videos have one)' },
    number: 'the ratio width / height: `1` is a square',
  },
  'object-fit': {
    summary: 'How an image or video **fills its box** when the box has a different shape than the picture.',
    example: 'img {\n  width: 100%;\n  height: 200px;\n  object-fit: cover;\n}',
    values: { fill: 'the default: stretches the picture to fill the box, distorting it', contain: 'scales it to fit **entirely** inside the box (there may be empty bands)', cover: 'scales it to **cover** the whole box, cropping what sticks out', none: 'keeps the natural size, cropping if needed', 'scale-down': 'like `none` or `contain`, whichever is smaller' },
  },
  'object-position': { summary: 'Where the picture sits inside its box with `object-fit` (default: centered).', example: 'object-position: top;', values: SIDES },

  // ---------------------------------------------------------------- flexbox
  flex: {
    summary: 'Shorthand for how a flex item **grows and shrinks**: `flex-grow flex-shrink flex-basis`. `flex: 1` means "take an equal share of the free space".',
    details: '`flex: 1` is `1 1 0%`; `flex: auto` is `1 1 auto` (grow from the content size); `flex: none` is `0 0 auto` (fixed size).',
    example: '.sidebar { flex: 0 0 250px; }\n.main { flex: 1; }',
    values: { auto: 'grows and shrinks from its content size (`1 1 auto`)', none: 'neither grows nor shrinks (`0 0 auto`)', initial: 'shrinks but doesn\'t grow (`0 1 auto`)' },
    longhands: ['flex-basis'],
    number: 'the grow factor: `flex: 1` (`1 1 0%`) gives every such item an equal share of the space, `flex: 2` twice as much',
  },
  'flex-direction': {
    summary: 'The **main axis** of a flex container: the direction in which its items are laid out.',
    example: 'flex-direction: column;',
    values: { row: 'the default: items side by side, left to right (in English)', 'row-reverse': 'side by side, right to left', column: 'items **stacked** top to bottom', 'column-reverse': 'stacked bottom to top' },
  },
  'flex-wrap': { summary: 'Whether flex items may **wrap** onto several lines when they don\'t fit.', example: 'flex-wrap: wrap;', values: { nowrap: 'the default: everything on one line (items shrink, or overflow)', wrap: 'items move to a **new line** when the line is full', 'wrap-reverse': 'wraps, with new lines above' } },
  'flex-flow': { summary: 'Shorthand for `flex-direction` and `flex-wrap`.', example: 'flex-flow: row wrap;', longhands: ['flex-direction', 'flex-wrap'] },
  'flex-grow': { summary: 'How much of the container\'s **free space** this flex item takes, compared to the others (default `0`: it doesn\'t grow).', example: 'flex-grow: 1;', number: 'the item\'s share of the free space, relative to the other items\' `flex-grow`' },
  'flex-shrink': { summary: 'How much this flex item **shrinks** when there isn\'t enough space, compared to the others (default `1`; `0` keeps its size).', example: 'flex-shrink: 0;', number: 'the item\'s share of the shrinking; `0` means it never shrinks' },
  'flex-basis': { summary: 'The **starting size** of a flex item along the main axis, before free space is shared out by `flex-grow` / `flex-shrink`.', example: 'flex-basis: 200px;', values: { auto: 'use the item\'s `width` (or `height`), or its content size', content: 'size from the content', ...GLOBAL_SIZES }, percent: 'the flex container\'s inner size' },
  order: { summary: 'Changes the **visual order** of flex and grid items: lower numbers come first (default `0`). The HTML order, used by keyboard navigation and screen readers, stays the same.', example: '.first { order: -1; }', number: 'the position in the order: items are sorted by it, lower first' },
  'justify-content': {
    summary: 'In a flex or grid container: how the items (or grid tracks) are distributed along the **main axis** (horizontally, in a row), when there is space left.',
    example: '.nav {\n  display: flex;\n  justify-content: space-between;\n}',
    values: CONTENT_ALIGN,
  },
  'align-items': {
    summary: 'In a flex or grid container: how each item is aligned on the **cross axis** (vertically, in a row). `align-items: center` is the classic way to center vertically.',
    example: '.row {\n  display: flex;\n  align-items: center;\n}',
    values: ITEMS_ALIGN,
  },
  'align-self': { summary: 'Overrides the container\'s `align-items` for this one item.', example: 'align-self: flex-end;', values: ITEMS_ALIGN },
  'align-content': { summary: 'How the **lines** of a wrapping flex container (or a grid\'s rows) are distributed on the cross axis when there is extra space.', example: 'align-content: start;', values: CONTENT_ALIGN },
  'justify-items': { summary: 'In a grid: how each item is aligned **horizontally** inside its grid area (default `stretch`).', example: 'justify-items: center;', values: ITEMS_ALIGN },
  'justify-self': { summary: 'Overrides the grid container\'s `justify-items` for this one item.', example: 'justify-self: end;', values: ITEMS_ALIGN },
  'place-items': { summary: 'Shorthand for `align-items` and `justify-items`. `place-items: center` centers grid items both ways.', example: '.center {\n  display: grid;\n  place-items: center;\n}', values: ITEMS_ALIGN },
  'place-content': { summary: 'Shorthand for `align-content` and `justify-content`.', example: 'place-content: center;', values: CONTENT_ALIGN },
  'place-self': { summary: 'Shorthand for `align-self` and `justify-self`.', example: 'place-self: center;', values: ITEMS_ALIGN },
  gap: {
    summary: 'The **space between** the items of a flex or grid container (rows and columns), but not around the edges. One value for both, or two: `row-gap column-gap`.',
    example: 'gap: 1rem;\ngap: 8px 16px;',
    values: { normal: 'the default: no gap in flexbox and grid' },
    percent: 'the container\'s size',
  },
  'row-gap': { summary: 'The space **between rows** of a grid or wrapping flex container.', example: 'row-gap: 1rem;', percent: 'the container\'s height' },
  'column-gap': { summary: 'The space **between columns** of a grid, flex or multi-column container.', example: 'column-gap: 2rem;', percent: 'the container\'s width' },

  // ---------------------------------------------------------------- grid
  grid: { summary: 'Shorthand that sets all grid template and auto-placement properties at once. Mostly `grid-template` is clearer.', example: 'grid: auto-flow / 1fr 1fr;' },
  'grid-template-columns': {
    summary: 'Defines the **columns** of a grid: one size per column. `fr` units share out the free space; `repeat()` and `minmax()` help with many or flexible columns.',
    example: 'grid-template-columns: 200px 1fr;\ngrid-template-columns: repeat(3, 1fr);\ngrid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));',
    values: { none: 'no explicit columns: items go into implicit ones', subgrid: 'uses the columns of the parent grid', ...GLOBAL_SIZES },
    percent: 'the grid container\'s width',
  },
  'grid-template-rows': { summary: 'Defines the **rows** of a grid: one size per row (like `grid-template-columns`).', example: 'grid-template-rows: auto 1fr auto;', values: { none: 'no explicit rows', subgrid: 'uses the rows of the parent grid', ...GLOBAL_SIZES }, percent: 'the grid container\'s height' },
  'grid-template-areas': {
    summary: 'Names the **areas** of a grid with a little ASCII-art map: one string per row, one word per cell. Items then go into an area with `grid-area: name`. A `.` is an empty cell.',
    example: 'grid-template-areas:\n  "header header"\n  "sidebar main";\n.page-header { grid-area: header; }',
    values: { none: 'no named areas' },
  },
  'grid-template': { summary: 'Shorthand for `grid-template-rows`, `grid-template-columns` and `grid-template-areas`.', example: 'grid-template: auto 1fr / 200px 1fr;' },
  'grid-area': {
    summary: 'Puts a grid item into a **named area** (from `grid-template-areas`), or gives its position as `row-start / column-start / row-end / column-end`.',
    example: 'grid-area: main;\ngrid-area: 1 / 1 / 3 / 2;',
    number: 'a grid line number (counting from 1; negative counts from the end)',
  },
  'grid-column': {
    summary: 'Which **columns** a grid item spans: `start-line / end-line`. `span 2` means "two columns wide"; `1 / -1` spans the whole row.',
    example: 'grid-column: 1 / -1;\ngrid-column: span 2;',
    values: { span: 'counts tracks instead of naming a line: `span 2` covers two columns', auto: 'placed automatically' },
    number: 'a grid line number: lines are counted from 1 at the start, and from -1 at the end',
  },
  'grid-row': {
    summary: 'Which **rows** a grid item spans: `start-line / end-line`, or `span n`.',
    example: 'grid-row: 2 / 4;\ngrid-row: span 3;',
    values: { span: 'counts tracks instead of naming a line: `span 2` covers two rows', auto: 'placed automatically' },
    number: 'a grid line number: lines are counted from 1 at the start, and from -1 at the end',
  },
  'grid-column-start': { summary: 'The grid line where the item\'s columns start. See `grid-column`.', number: 'a grid line number' },
  'grid-column-end': { summary: 'The grid line where the item\'s columns end. See `grid-column`.', number: 'a grid line number' },
  'grid-row-start': { summary: 'The grid line where the item\'s rows start. See `grid-row`.', number: 'a grid line number' },
  'grid-row-end': { summary: 'The grid line where the item\'s rows end. See `grid-row`.', number: 'a grid line number' },
  'grid-auto-flow': {
    summary: 'How items **without an explicit position** are placed in the grid: filling rows or columns, optionally `dense` (filling earlier holes).',
    example: 'grid-auto-flow: dense;',
    values: { row: 'the default: fill each row, then add new rows', column: 'fill each column, then add new columns', dense: 'also fills holes left by bigger items earlier on (the visual order can then differ from the HTML order)' },
  },
  'grid-auto-columns': { summary: 'The size of **implicit** columns: ones the grid creates because items were placed beyond `grid-template-columns`.', example: 'grid-auto-columns: 1fr;', values: GLOBAL_SIZES },
  'grid-auto-rows': { summary: 'The size of **implicit** rows: the rows the grid adds for items that don\'t fit in `grid-template-rows`.', example: 'grid-auto-rows: minmax(100px, auto);', values: GLOBAL_SIZES },

  // ---------------------------------------------------------------- typography
  color: {
    summary: 'The **text color** (the foreground). It is also the default for borders, outlines and `currentcolor`.',
    example: 'color: #333;\ncolor: rgb(0 0 0 / 80%);',
  },
  font: {
    summary: 'Shorthand for the font: `[style] [weight] size[/line-height] family`. The size and family are required, and everything left out is **reset** to its default.',
    example: 'font: 1rem/1.5 system-ui, sans-serif;\nfont: italic bold 16px Georgia, serif;',
    longhands: ['font-style', 'font-weight', 'font-size', 'font-family', 'line-height'],
  },
  'font-family': {
    summary: 'A **list of fonts** to use, in order of preference, separated by commas. The browser uses the first one available, so end with a generic family like `sans-serif`.',
    details: 'Quote names with spaces or digits: `"Helvetica Neue"`.',
    example: 'font-family: "Inter", system-ui, sans-serif;',
    values: FONT_FAMILY,
  },
  'font-size': {
    summary: 'The **size of the text**. Using `rem` respects the user\'s browser setting; `em` and `%` are relative to the parent\'s font size.',
    example: 'font-size: 1.25rem;\nfont-size: clamp(1rem, 2.5vw, 2rem);',
    values: FONT_SIZE,
    percent: 'the **parent\'s** font size',
  },
  'font-weight': { summary: 'How **bold** the text is, from `100` (thin) to `900` (black): `400` is normal, `700` bold. The font must have that weight, or the browser picks the nearest.', example: 'font-weight: 600;', values: FONT_WEIGHT, number: 'the weight: `400` is normal, `700` bold (1 to 1000)' },
  'font-style': { summary: 'Whether the text is **italic**.', example: 'font-style: italic;', values: FONT_STYLE },
  'font-variant': { summary: 'Special glyph variants: small capitals, numeral styles, ligatures.', example: 'font-variant: small-caps;', values: { normal: 'no variant', 'small-caps': 'lowercase letters shown as small capitals' } },
  'line-height': {
    summary: 'The **height of each line** of text: the space between lines. A unitless number (like `1.5`) is the safest: it is a multiple of the font size.',
    details: 'A unitless value is inherited as the factor, so children with a bigger font get proportionally taller lines; with `em` or `px` the computed size is inherited instead.',
    example: 'line-height: 1.5;',
    values: { normal: 'the default: depends on the font (about 1.2)' },
    number: 'a multiple of the element\'s font size: `1.5` with a 16px font gives 24px lines',
    percent: 'the element\'s font size',
  },
  'letter-spacing': { summary: 'Extra space **between characters** (it can be negative). `em` units scale it with the font size.', example: 'letter-spacing: 0.05em;', values: { normal: 'the font\'s normal spacing' } },
  'word-spacing': { summary: 'Extra space **between words**.', example: 'word-spacing: 0.25em;', values: { normal: 'the font\'s normal spacing' } },
  'text-align': { summary: 'How the **lines of text** (and other inline content) are aligned inside the block. It doesn\'t move the block itself.', example: 'text-align: center;', values: TEXT_ALIGN },
  'text-decoration': {
    summary: 'Lines on the text: **underline**, overline or line-through, with an optional style, color and thickness. `text-decoration: none` removes the underline from links.',
    example: 'a { text-decoration: none; }\ntext-decoration: underline wavy red;',
    values: { none: 'no line (removes the underline from links)', underline: 'a line **under** the text', overline: 'a line over the text', 'line-through': 'a line **through** the text (strikethrough)', solid: 'a solid line', double: 'a double line', dotted: 'a dotted line', dashed: 'a dashed line', wavy: 'a wavy line (like a spell-checker)' },
  },
  'text-decoration-line': { summary: 'Which decoration lines to draw (`underline`, `overline`, `line-through`).', values: { none: 'no line', underline: 'a line under the text', overline: 'a line over the text', 'line-through': 'a line through the text' } },
  'text-decoration-color': { summary: 'The color of the decoration lines.' },
  'text-decoration-thickness': { summary: 'How thick the decoration lines are.', values: { auto: 'the browser picks', 'from-font': 'the font\'s preferred thickness' } },
  'text-underline-offset': { summary: 'The distance of the underline from the text.', example: 'text-underline-offset: 0.2em;' },
  'text-transform': { summary: 'Changes the **capitalization** of the text for display, without changing the HTML.', example: 'text-transform: uppercase;', values: { uppercase: 'ALL CAPITALS', lowercase: 'all lowercase', capitalize: 'The First Letter Of Each Word', none: 'as written' } },
  'text-indent': { summary: 'Indents the **first line** of a block of text.', example: 'text-indent: 2em;', percent: 'the width of the containing block' },
  'text-shadow': { summary: 'Adds **shadows to the text**: `x-offset y-offset blur color`, several separated by commas.', example: 'text-shadow: 0 1px 2px rgb(0 0 0 / 40%);', values: { none: 'no shadow' } },
  'text-overflow': { summary: 'How text that overflows its box is shown. `ellipsis` needs `overflow: hidden` and `white-space: nowrap` too.', example: '.title {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}', values: { clip: 'the default: the text is cut off', ellipsis: 'shows `…` where the text is cut off' } },
  'text-wrap': { summary: 'How lines of text wrap: `balance` evens out the line lengths (nice for headings), `pretty` avoids a lonely last word.', example: 'h1 { text-wrap: balance; }', values: { wrap: 'normal wrapping', nowrap: 'no wrapping', balance: 'makes all lines about **equally long**', pretty: 'avoids a single word on the last line' } },
  'white-space': {
    summary: 'How **spaces and line breaks** in the HTML are handled, and whether lines wrap.',
    example: 'white-space: nowrap;\nwhite-space: pre-wrap;',
    values: { normal: 'the default: runs of spaces and line breaks collapse into one space, lines wrap', nowrap: 'spaces collapse, but the text **never wraps**', pre: 'keeps spaces and line breaks exactly, like `<pre>`; no wrapping', 'pre-wrap': 'keeps spaces and line breaks, and still wraps long lines', 'pre-line': 'keeps line breaks but collapses spaces', 'break-spaces': 'like `pre-wrap`, and trailing spaces can wrap too' },
  },
  'word-break': { summary: 'Whether long words may be **broken** in the middle to fit.', values: { normal: 'the default: break between words only', 'break-all': 'break anywhere, even inside words', 'keep-all': 'don\'t break inside Chinese, Japanese and Korean text', 'break-word': 'deprecated: like `overflow-wrap: anywhere`' } },
  'overflow-wrap': { summary: 'Whether a word that is too long for the line may be broken so it doesn\'t overflow (long URLs, for example).', example: 'overflow-wrap: break-word;', values: { normal: 'don\'t break words; they may overflow', 'break-word': 'break a long word only if it doesn\'t fit on a line of its own', anywhere: 'break anywhere if needed (also lets the box shrink)' } },
  hyphens: { summary: 'Whether the browser **hyphenates** words at line breaks (needs a `lang` attribute on the HTML).', values: { none: 'never', manual: 'only where `&shy;` is in the text (the default)', auto: 'the browser hyphenates using a dictionary for the language' } },
  'vertical-align': {
    summary: 'Vertical alignment of an **inline** or table-cell element within its line (or cell). It doesn\'t center blocks: use flexbox or grid for that.',
    example: 'img { vertical-align: middle; }',
    values: { baseline: 'the default: aligned on the text baseline', top: 'aligned with the top of the line', middle: 'centered on the middle of lowercase letters', bottom: 'aligned with the bottom of the line', 'text-top': 'aligned with the top of the parent\'s font', 'text-bottom': 'aligned with the bottom of the parent\'s font', sub: 'as subscript', super: 'as superscript' },
    percent: 'the element\'s `line-height`',
  },
  'writing-mode': { summary: 'Whether lines of text are laid out **horizontally or vertically**, and in which direction blocks follow each other.', values: { 'horizontal-tb': 'the default: horizontal lines, top to bottom', 'vertical-rl': 'vertical lines, right to left (traditional Japanese)', 'vertical-lr': 'vertical lines, left to right' } },
  direction: { summary: 'The direction of the text: left-to-right or right-to-left. Prefer the HTML `dir` attribute.', values: { ltr: 'left to right', rtl: 'right to left (Arabic, Hebrew)' } },
  'font-display': {
    summary: 'In `@font-face`: what the browser shows **while the web font is loading**.',
    example: 'font-display: swap;',
    values: { auto: 'the browser decides', block: 'invisible text for a short while, then the font', swap: 'shows a fallback font right away and **swaps** in the web font when it arrives', fallback: 'a very short invisible period, then the fallback; swaps only if the font arrives soon', optional: 'uses the web font only if it is available almost immediately' },
  },
  src: {
    summary: 'In `@font-face`: **where to load the font** from: one or more `url(...) format(...)` entries, tried in order, and/or `local(...)` names of installed fonts.',
    example: 'src: url("inter.woff2") format("woff2"),\n     url("inter.woff") format("woff");',
    page: '@font-face/src',
  },
  'unicode-range': { summary: 'In `@font-face`: which **characters** this font file covers, so the browser only downloads it when the page uses them.', example: 'unicode-range: U+0000-00FF;', page: '@font-face/unicode-range' },
  'font-feature-settings': { summary: 'Turns on OpenType features of the font by their four-letter code (ligatures, tabular numbers, ...). Prefer `font-variant-*` where one exists.', example: 'font-feature-settings: "tnum";' },
  'font-variant-numeric': { summary: 'How numbers look: `tabular-nums` makes all digits the same width (good for tables and timers).', example: 'font-variant-numeric: tabular-nums;', values: { normal: 'the font\'s default digits', 'tabular-nums': 'all digits equally wide, so columns of numbers line up', 'oldstyle-nums': 'digits with ascenders and descenders, like lowercase letters' } },
  '-webkit-font-smoothing': { summary: 'macOS only: how text is anti-aliased. `antialiased` makes light text on dark backgrounds look thinner.', values: { antialiased: 'grayscale smoothing: thinner-looking text', 'subpixel-antialiased': 'the default subpixel smoothing', auto: 'the browser decides' }, page: 'font-smooth' },

  // ---------------------------------------------------------------- color & background
  background: {
    summary: 'Shorthand for the **background**: color, image, position / size, repeat, attachment and clip. Several layers can be separated by commas (the color goes in the last one).',
    example: 'background: #f5f5f5;\nbackground: url("hero.jpg") center / cover no-repeat;\nbackground: linear-gradient(to right, #fff, #eee);',
    longhands: ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-attachment', 'background-clip'],
    percent: 'the background area minus the image size (for the position)',
  },
  'background-color': { summary: 'The **background color**, painted behind the content and padding (and under the border).', example: 'background-color: white;' },
  'background-image': { summary: 'One or more **background images**: `url(...)` files or gradients, separated by commas (the first is on top).', example: 'background-image: url("pattern.png");\nbackground-image: linear-gradient(#0000, #000a);', values: { none: 'no image' } },
  'background-size': {
    summary: 'The size of the background image.',
    example: 'background-size: cover;',
    values: { cover: 'scales the image to **cover** the whole element, cropping what sticks out', contain: 'scales the image to fit **entirely** inside (there may be empty space)', auto: 'the image\'s natural size' },
    percent: 'the background area\'s size',
  },
  'background-position': { summary: 'Where the background image is placed: keywords (`center`, `top right`), lengths or percentages from the top-left corner.', example: 'background-position: center;\nbackground-position: right 1rem top 1rem;', values: SIDES, percent: 'the background area minus the image size: `50%` centers, `100%` aligns right/bottom' },
  'background-repeat': {
    summary: 'Whether a background image **repeats** (tiles) to fill the element, and in which direction.',
    example: 'background-repeat: no-repeat;',
    values: { repeat: 'the default: tiles in both directions', 'no-repeat': 'shows the image **once**', 'repeat-x': 'tiles horizontally only', 'repeat-y': 'tiles vertically only', space: 'tiles without cropping, with space between', round: 'tiles without cropping, stretching the tiles to fit' },
  },
  'background-attachment': { summary: 'Whether the background scrolls with the content.', values: { scroll: 'the default: scrolls with the element', fixed: 'fixed to the viewport, for a "parallax" look', local: 'scrolls with the element\'s own scrolled content' } },
  'background-clip': {
    summary: 'How far the background extends: under the border, only the padding, only the content, or only the **text** (for gradient text).',
    example: 'background-clip: text;\ncolor: transparent;',
    values: { 'border-box': 'the default: under the border too', 'padding-box': 'up to the inside of the border', 'content-box': 'only behind the content', text: 'only inside the letters of the text' },
  },
  'background-origin': { summary: 'Which box the background position is measured from.', values: { 'padding-box': 'the default: the padding box', 'border-box': 'the border box', 'content-box': 'the content box' } },
  'color-scheme': {
    summary: 'Which color schemes the element (usually `:root`) supports, so the browser draws form controls, scrollbars and the default background in **light or dark** style to match.',
    example: ':root { color-scheme: light dark; }',
    values: { normal: 'the default: no preference (usually light)', light: 'supports a light scheme', dark: 'supports a dark scheme', only: 'forbids the browser from changing the colors itself' },
  },
  'accent-color': { summary: 'The accent color of **form controls**: checkboxes, radio buttons, range sliders and progress bars.', example: 'accent-color: rebeccapurple;', values: { auto: 'the browser\'s default accent color' } },
  'caret-color': { summary: 'The color of the **text cursor** (caret) in inputs and editable text.', values: { auto: 'usually the text color' } },
  filter: {
    summary: 'Applies **graphical effects** to the element, like in a photo editor: `blur()`, `brightness()`, `grayscale()`, `drop-shadow()`, ... Several in a row are applied in order.',
    example: 'filter: grayscale(100%);\nfilter: blur(4px) brightness(0.8);',
    values: { none: 'no filter' },
  },
  'backdrop-filter': { summary: 'Applies filter effects to what is **behind** the element: `backdrop-filter: blur(8px)` with a translucent background gives a "frosted glass" look.', example: 'backdrop-filter: blur(8px);', values: { none: 'no filter' } },
  'mix-blend-mode': { summary: 'How the element\'s colors **blend** with what is behind it, like layer modes in a photo editor.', example: 'mix-blend-mode: multiply;', values: BLEND },
  'background-blend-mode': { summary: 'How the background layers of the element blend with each other.', values: BLEND },
  isolation: { summary: 'Whether the element creates a new **stacking context**, so blending and `z-index` of its children stay inside it.', values: { auto: 'only when another property requires it', isolate: 'always creates a new stacking context' } },

  // ---------------------------------------------------------------- transforms, transitions, animations
  transform: {
    summary: '**Moves, rotates, scales or skews** the element visually, with transform functions applied in order. Other elements don\'t move: the layout stays as if it weren\'t transformed.',
    details: 'Transforms are cheap to animate. A transform also makes the element the containing block for its `fixed` and `absolute` children, and creates a stacking context.',
    example: 'transform: translate(-50%, -50%);\ntransform: rotate(45deg) scale(1.2);',
    values: { none: 'no transform' },
  },
  'transform-origin': { summary: 'The point the element is rotated and scaled **around** (default: its center).', example: 'transform-origin: top left;', values: SIDES, percent: 'the element\'s own size' },
  translate: { summary: 'Moves the element, like `transform: translate()`, but as its own property (so it combines with `rotate` and `scale`).', example: 'translate: 0 -4px;', percent: 'the element\'s **own** size' },
  rotate: { summary: 'Rotates the element, like `transform: rotate()`, as its own property.', example: 'rotate: 15deg;' },
  scale: { summary: 'Scales the element, like `transform: scale()`, as its own property.', example: 'scale: 1.1;', number: 'a scale factor: `1` is the normal size, `2` twice as big' },
  perspective: { summary: 'Gives the **3D-transformed children** of this element depth: the distance between the viewer and the page. Smaller is more dramatic.', example: 'perspective: 800px;', values: { none: 'no perspective' } },
  'backface-visibility': { summary: 'Whether the back of an element is visible when it is rotated in 3D (for card-flip effects).', values: { visible: 'the back shows, mirrored', hidden: 'the back is invisible' } },
  'transform-style': { summary: 'Whether the children of a 3D-transformed element stay in 3D space or are flattened.', values: { flat: 'children are flattened', 'preserve-3d': 'children keep their 3D positions' } },
  transition: {
    summary: '**Animates** changes of a property smoothly instead of instantly, when its value changes (on `:hover`, a class change, ...): `property duration timing-function delay`, several separated by commas.',
    details: 'Only animatable properties transition (`display` doesn\'t, mostly). Prefer `transform` and `opacity`: they animate without re-doing the layout.',
    example: 'transition: background-color 200ms ease-in-out;\ntransition: opacity 0.3s, transform 0.3s;',
    values: { all: 'transitions **every** property that changes', none: 'no transition' },
    longhands: ['transition-timing-function'],
  },
  'transition-property': { summary: 'Which properties are animated by `transition`.', example: 'transition-property: opacity, transform;', values: { all: 'every animatable property', none: 'nothing' } },
  'transition-duration': { summary: 'How long the transition takes.', example: 'transition-duration: 200ms;' },
  'transition-timing-function': { summary: 'The **speed curve** of the transition: `ease`, `linear`, `ease-in-out`, `cubic-bezier(...)`, `steps(...)`.', example: 'transition-timing-function: ease-out;', values: TIMING },
  'transition-delay': { summary: 'How long to **wait** before the transition starts.', example: 'transition-delay: 100ms;' },
  'transition-behavior': { summary: 'With `allow-discrete`, properties that can\'t be interpolated (like `display`) still transition, switching at the right moment.', values: { 'allow-discrete': 'also transitions discrete properties like `display`', normal: 'the default' } },
  animation: {
    summary: 'Runs a **keyframe animation** (defined with `@keyframes`): `name duration timing-function delay iteration-count direction fill-mode play-state`, in a flexible order.',
    example: 'animation: spin 1s linear infinite;\nanimation: fade-in 300ms ease-out both;',
    values: { none: 'no animation runs' },
    longhands: ['animation-timing-function', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'],
    number: 'the iteration count: how many times the animation runs',
  },
  'animation-name': { summary: 'Which `@keyframes` animation(s) to run.', example: 'animation-name: bounce;', values: { none: 'no animation' } },
  'animation-duration': { summary: 'How long **one cycle** of the animation takes.', example: 'animation-duration: 2s;' },
  'animation-timing-function': { summary: 'The speed curve of each cycle (between keyframes).', values: TIMING },
  'animation-delay': { summary: 'How long to wait before the animation starts. A negative delay starts it part-way through.', example: 'animation-delay: 500ms;' },
  'animation-iteration-count': { summary: 'How many times the animation runs.', example: 'animation-iteration-count: 3;', values: { infinite: 'repeats **forever**' }, number: 'how many times the animation runs (`0.5` runs half a cycle)' },
  'animation-direction': { summary: 'Whether the animation plays forwards, backwards, or alternates.', values: ANIMATION_VALUES },
  'animation-fill-mode': { summary: 'Which styles apply **before and after** the animation runs.', example: 'animation-fill-mode: forwards;', values: ANIMATION_VALUES },
  'animation-play-state': { summary: 'Whether the animation is running or paused.', example: '.spinner:hover { animation-play-state: paused; }', values: ANIMATION_VALUES },
  'will-change': {
    summary: 'A hint that a property is **about to change** (be animated), so the browser can prepare (e.g. put the element on its own layer). Use it sparingly, only where an animation stutters.',
    example: 'will-change: transform;',
    values: { auto: 'no hint', 'scroll-position': 'the scroll position will change', contents: 'the content will change' },
  },

  // ---------------------------------------------------------------- interaction & misc
  cursor: { summary: 'Which **mouse cursor** to show over the element.', example: 'button { cursor: pointer; }', values: CURSOR },
  'pointer-events': { summary: 'Whether the element reacts to the **mouse and touch** (clicks, hovers). With `none`, clicks go through it to what is behind.', example: '.overlay { pointer-events: none; }', values: { auto: 'the default: reacts normally', none: 'ignores the pointer: clicks go **through** to the elements behind' } },
  'user-select': { summary: 'Whether the user can **select** the text.', example: 'user-select: none;', values: { auto: 'the default', none: 'the text can\'t be selected', text: 'the text can be selected', all: 'a click selects the whole element\'s text at once' } },
  'touch-action': { summary: 'Which **touch gestures** the browser handles itself (scrolling, zooming) on this element; the others go to your JavaScript.', values: { auto: 'the browser handles all gestures', none: 'the browser handles none (for custom gestures, drawing)', manipulation: 'panning and pinch-zoom only, no double-tap zoom', 'pan-x': 'horizontal scrolling only', 'pan-y': 'vertical scrolling only' } },
  resize: { summary: 'Whether the user can **resize** the element by dragging its corner (needs `overflow` other than `visible`).', example: 'textarea { resize: vertical; }', values: { none: 'not resizable', both: 'resizable in both directions', horizontal: 'only the width', vertical: 'only the height' } },
  appearance: { summary: 'Whether a form control uses the operating system\'s **native look**. `appearance: none` removes it so you can style the control from scratch.', example: 'select { appearance: none; }', values: { none: 'no native styling', auto: 'the native look (the default)' } },
  content: {
    summary: 'The **generated content** of a `::before` or `::after` pseudo-element: a string, `attr()`, a counter, an image. Without `content`, those pseudo-elements don\'t appear at all.',
    details: 'Generated text isn\'t selectable and may not be read by every screen reader: don\'t put important information there.',
    example: '.required::after {\n  content: " *";\n  color: red;\n}',
    values: { none: 'the pseudo-element is not generated', normal: 'the default (`none` for `::before` / `::after`)', 'open-quote': 'an opening quotation mark (from `quotes`)', 'close-quote': 'a closing quotation mark' },
  },
  quotes: { summary: 'Which quotation marks `content: open-quote` / `close-quote` insert (and `<q>` uses).', example: 'quotes: "«" "»";' },
  'counter-reset': { summary: 'Creates (or resets) a CSS **counter**, for automatic numbering with `counter()`.', example: 'ol { counter-reset: item; }', values: { none: 'no counter' } },
  'counter-increment': { summary: 'Increases a CSS counter, e.g. once per list item.', example: 'li { counter-increment: item; }\nli::before { content: counter(item) ". "; }', values: { none: 'no counter' } },
  'list-style': { summary: 'Shorthand for the list marker: its type, position and image. `list-style: none` removes the bullets.', example: 'ul.menu { list-style: none; }', longhands: ['list-style-type', 'list-style-position'] },
  'list-style-type': {
    summary: 'The **marker** of list items: bullets, numbers, letters, or a string.',
    example: 'list-style-type: square;',
    values: { none: 'no marker', disc: 'a filled circle (the default for `<ul>`)', circle: 'a hollow circle', square: 'a filled square', decimal: 'numbers 1, 2, 3 (the default for `<ol>`)', 'decimal-leading-zero': 'numbers 01, 02, 03', 'lower-alpha': 'letters a, b, c', 'upper-alpha': 'letters A, B, C', 'lower-roman': 'roman numerals i, ii, iii', 'upper-roman': 'roman numerals I, II, III' },
  },
  'list-style-position': { summary: 'Whether the list marker sits **outside** the text block (the default) or inside it.', values: { outside: 'the marker hangs outside the text', inside: 'the marker is part of the first line' } },
  'list-style-image': { summary: 'An image to use as the list marker.', values: { none: 'no image' } },
  'table-layout': { summary: 'How a table works out its column widths.', values: { auto: 'the default: from the content of all cells (slower)', fixed: 'from the first row and the table width only: faster and predictable' } },
  'border-collapse': { summary: 'Whether table cells **share** their borders or each have their own.', example: 'table { border-collapse: collapse; }', values: { collapse: 'neighbouring cells share one border', separate: 'the default: each cell has its own border, with `border-spacing` between' } },
  'border-spacing': { summary: 'The space between the borders of table cells (with `border-collapse: separate`).', example: 'border-spacing: 4px;' },
  'caption-side': { summary: 'Whether a table\'s `<caption>` is shown above or below it.', values: { top: 'above the table', bottom: 'below the table' } },
  'scroll-behavior': { summary: 'Whether scrolling caused by links (`#anchor`) and scripts is **smooth** or instant.', example: 'html { scroll-behavior: smooth; }', values: { auto: 'jumps instantly', smooth: 'scrolls smoothly' } },
  'scroll-snap-type': { summary: 'Makes a scroll container **snap** to its children (like a carousel): the axis and how strict.', example: 'scroll-snap-type: x mandatory;', values: { none: 'no snapping', x: 'snap horizontally', y: 'snap vertically', both: 'snap in both directions', mandatory: 'always snaps to a point', proximity: 'snaps only when close to a point' } },
  'scroll-snap-align': { summary: 'Where a child of a snapping scroll container snaps.', values: { start: 'its start edge', center: 'its center', end: 'its end edge', none: 'it doesn\'t snap' } },
  'scroll-margin': { summary: 'Extra space when the element is **scrolled into view** (e.g. by a `#anchor` link), for example to stay clear of a sticky header.', example: 'h2 { scroll-margin-top: 4rem; }' },
  'scroll-margin-top': { summary: 'Extra space above the element when it is scrolled into view (e.g. below a sticky header).', example: 'scroll-margin-top: 4rem;' },
  'scroll-padding': { summary: 'On a scroll container: an inset that scrolling into view and snapping keep clear.', example: 'html { scroll-padding-top: 4rem; }' },
  'overscroll-behavior': { summary: 'What happens when you scroll past the end of a scroll container: whether the page behind scrolls too ("scroll chaining") and pull-to-refresh.', values: { auto: 'the default: scrolling continues into the parent', contain: 'no scroll chaining to the parent', none: 'no scroll chaining and no bounce or pull-to-refresh' } },
  'clip-path': { summary: 'Cuts the element to a **shape**: only the part inside is visible.', example: 'clip-path: circle(50%);\nclip-path: polygon(0 0, 100% 0, 50% 100%);', values: { none: 'no clipping' } },
  mask: { summary: 'Hides parts of the element using an image or gradient as a mask.', example: 'mask: linear-gradient(black, transparent);', values: { none: 'no mask' } },
  contain: { summary: 'Promises the browser that the element\'s inside doesn\'t affect the rest of the page, so it can render faster.', values: { none: 'no containment', strict: 'all kinds of containment', content: 'layout, paint and style containment', size: 'size containment', 'inline-size': 'inline-size containment', layout: 'layout containment', paint: 'paint containment', style: 'style containment' } },
  'content-visibility': { summary: 'With `auto`, the browser **skips rendering** the element while it is off-screen: a big speed-up for long pages.', values: { visible: 'the default', auto: 'skips rendering while off-screen', hidden: 'skips rendering, like `display: none` but keeping the rendering state' } },
  container: { summary: 'Shorthand for `container-name` and `container-type`: makes the element a **query container** for `@container` rules.', example: '.sidebar {\n  container: sidebar / inline-size;\n}' },
  'container-type': {
    summary: 'Makes the element a **query container**, so `@container` rules can style its descendants by its size.',
    example: '.card-list { container-type: inline-size; }',
    values: { normal: 'not a size container (still a style container)', 'inline-size': 'can be queried on its **width** (inline size): the usual choice', size: 'can be queried on width and height (it then needs an explicit height)' },
  },
  'container-name': { summary: 'Names a query container, so an `@container name (...)` rule can target it specifically.', example: 'container-name: sidebar;', values: { none: 'no name' } },
  all: { summary: 'Resets **every** property (except `direction` and custom properties) at once, usually with `all: unset` or `all: revert`.', example: 'button.plain { all: unset; }' },
  fill: { summary: 'SVG: the color that **fills** a shape (like `background-color` for HTML). `currentcolor` makes icons follow the text color.', example: 'svg { fill: currentcolor; }', values: { none: 'no fill' } },
  stroke: { summary: 'SVG: the color of a shape\'s **outline**.', example: 'stroke: black;', values: { none: 'no stroke' } },
  'stroke-width': { summary: 'SVG: how thick a shape\'s outline is.', example: 'stroke-width: 2;' },
  'tab-size': { summary: 'How wide a tab character is, in spaces (in `<pre>` and `white-space: pre`).', example: 'tab-size: 4;', number: 'the width of a tab, in spaces' },
  orphans: { summary: 'In print and columns: the minimum number of lines left at the bottom of a page before a break.', number: 'a number of lines' },
  widows: { summary: 'In print and columns: the minimum number of lines at the top of a page after a break.', number: 'a number of lines' },
  'column-count': { summary: 'Splits the text into this many **columns**, like a newspaper.', example: 'column-count: 3;', values: { auto: 'from `column-width`' }, number: 'the number of columns' },
  'column-width': { summary: 'The ideal width of each column; the browser fits as many as possible.', example: 'column-width: 15rem;', values: { auto: 'from `column-count`' } },
  columns: { summary: 'Shorthand for `column-width` and `column-count`.', example: 'columns: 2 20rem;', values: { auto: 'not set' }, number: 'the number of columns' },
  'break-inside': { summary: 'Whether a page or column break may happen inside the element (in print or multi-column layouts).', values: { auto: 'breaks are allowed', avoid: 'avoid breaking inside this element' } },
  'page-break-inside': { summary: 'Old name of `break-inside`, for print.', values: { auto: 'breaks are allowed', avoid: 'avoid breaking inside' } },
  size: { summary: 'In `@page`: the **paper size** and orientation for printing.', example: '@page { size: A4 landscape; }', page: '@page/size', values: { auto: 'the printer\'s default', portrait: 'upright', landscape: 'sideways' } },

  // ---------------------------------------------------------------- logical properties
  'margin-inline': logical('margin', 'inline'),
  'margin-block': logical('margin', 'block'),
  'margin-inline-start': logical('margin', 'inline', 'the start'),
  'margin-inline-end': logical('margin', 'inline', 'the end'),
  'margin-block-start': logical('margin', 'block', 'the start'),
  'margin-block-end': logical('margin', 'block', 'the end'),
  'padding-inline': logical('padding', 'inline'),
  'padding-block': logical('padding', 'block'),
  'padding-inline-start': logical('padding', 'inline', 'the start'),
  'padding-inline-end': logical('padding', 'inline', 'the end'),
  'padding-block-start': logical('padding', 'block', 'the start'),
  'padding-block-end': logical('padding', 'block', 'the end'),
  'border-inline': logical('border', 'inline'),
  'border-block': logical('border', 'block'),
  'border-inline-start': logical('border', 'inline', 'the start'),
  'border-inline-end': logical('border', 'inline', 'the end'),
  'border-block-start': logical('border', 'block', 'the start'),
  'border-block-end': logical('border', 'block', 'the end'),
  'inset-inline': logical('offset (like `left`/`right`)', 'inline'),
  'inset-block': logical('offset (like `top`/`bottom`)', 'block'),
  'inset-inline-start': logical('offset', 'inline', 'the start'),
  'inset-inline-end': logical('offset', 'inline', 'the end'),
  'inline-size': { summary: 'A **logical** `width`: the size along the line direction (the width in horizontal text, the height in vertical text).', example: 'inline-size: 100%;', values: GLOBAL_SIZES, percent: 'the containing block\'s inline size' },
  'block-size': { summary: 'A **logical** `height`: the size in the direction blocks stack (the height in horizontal text).', example: 'block-size: 50vh;', values: GLOBAL_SIZES, percent: 'the containing block\'s block size' },
  'min-inline-size': { summary: 'A logical `min-width`.', values: GLOBAL_SIZES },
  'max-inline-size': { summary: 'A logical `max-width`: `max-inline-size: 65ch` keeps text lines readable in any writing mode.', example: 'max-inline-size: 65ch;', values: { none: 'no maximum', ...GLOBAL_SIZES } },
  'min-block-size': { summary: 'A logical `min-height`.', values: GLOBAL_SIZES },
  'max-block-size': { summary: 'A logical `max-height`.', values: { none: 'no maximum', ...GLOBAL_SIZES } },

  // ---------------------------------------------------------------- @property descriptors
  syntax: { summary: 'In `@property`: the **type** of the registered custom property, as a string like `"<length>"`, `"<color>"` or `"*"` (anything). With a type, the browser can animate it.', example: 'syntax: "<length>";', page: '@property/syntax' },
  inherits: { summary: 'In `@property`: whether the registered custom property is **inherited** by children (required).', example: 'inherits: false;', page: '@property/inherits', values: { true: 'children inherit the value', false: 'children get the `initial-value` instead' } },
  'initial-value': { summary: 'In `@property`: the value the registered custom property has when nothing sets it.', example: 'initial-value: 0px;', page: '@property/initial-value' },
};

/** Properties whose values children inherit when they don't set them. */
export const INHERITED = new Set([
  'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'font-variant-numeric', 'font-feature-settings', 'line-height',
  'letter-spacing', 'word-spacing', 'text-align', 'text-indent', 'text-transform', 'text-shadow', 'text-wrap', 'white-space', 'word-break', 'overflow-wrap',
  'hyphens', 'visibility', 'cursor', 'list-style', 'list-style-type', 'list-style-position', 'list-style-image', 'direction', 'writing-mode', 'quotes',
  'border-collapse', 'border-spacing', 'caption-side', 'color-scheme', 'accent-color', 'caret-color', 'pointer-events', 'tab-size', 'orphans', 'widows',
  'fill', 'stroke', 'stroke-width', '-webkit-font-smoothing',
]);

// ------------------------------------------------------------ keyword values

/** The keywords every property accepts. */
export const GLOBAL_KEYWORDS: Record<string, { summary: string; page: string }> = {
  inherit: { summary: 'Takes the value the **parent** element has for this property, even for a property that isn\'t normally inherited.', page: 'inherit' },
  initial: { summary: 'Resets the property to its **initial value** from the CSS specification (not the browser\'s default style: `display: initial` is `inline`, even on a `<div>`).', page: 'initial' },
  unset: { summary: 'Acts as `inherit` for inherited properties (like `color`) and as `initial` for the others (like `margin`): "as if nothing set it".', page: 'unset' },
  revert: { summary: 'Rolls the property back to what it would be **without your stylesheet**: the browser\'s default style (e.g. `display: block` for a `<div>`).', page: 'revert' },
  'revert-layer': { summary: 'Rolls the property back to the value from the **previous cascade layer** (see `@layer`).', page: 'revert-layer' },
};

/** Keywords with the same meaning for most properties. */
export const COMMON_KEYWORDS: Record<string, string> = {
  auto: 'lets the **browser work out** the value from the layout and the content (what `auto` does depends on the property)',
  none: 'turns the feature off: **no** value of this kind',
  normal: 'the property\'s normal, default behaviour',
  currentcolor: 'the element\'s **text color** (its `color` value): borders, shadows and SVG icons can follow the text color',
  transparent: 'a fully **transparent** color (`rgb(0 0 0 / 0)`)',
  ...GLOBAL_SIZES,
  ...TIMING,
  infinite: 'repeats forever',
};

export const VALUE_GROUPS = { DISPLAY, POSITION, CONTENT_ALIGN, ITEMS_ALIGN, OVERFLOW, TIMING, BORDER_STYLE, FONT_FAMILY, FONT_WEIGHT, FONT_STYLE, SIDES };

// ------------------------------------------------------------- named colors

const NAMED =
  'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff ' +
  'blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc ' +
  'crimson:dc143c cyan:00ffff darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b ' +
  'darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b ' +
  'darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dimgrey:696969 ' +
  'dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 ' +
  'gray:808080 green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c ' +
  'lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 ' +
  'lightgray:d3d3d3 lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 ' +
  'lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 magenta:ff00ff maroon:800000 ' +
  'mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a ' +
  'mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 ' +
  'oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee ' +
  'palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 ' +
  'red:ff0000 rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d ' +
  'silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 ' +
  'thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32';

/** The 148 named colors, name → hex digits. */
export const NAMED_COLORS: ReadonlyMap<string, string> = new Map(NAMED.split(' ').map((pair) => pair.split(':') as [string, string]));

/** System colors: the colors of the user's operating system or browser theme. */
export const SYSTEM_COLORS = new Set([
  'canvas', 'canvastext', 'linktext', 'visitedtext', 'activetext', 'buttonface', 'buttontext', 'buttonborder', 'field', 'fieldtext',
  'highlight', 'highlighttext', 'selecteditem', 'selecteditemtext', 'mark', 'marktext', 'graytext', 'accentcolor', 'accentcolortext',
]);

// ------------------------------------------------------------------ functions

export interface Fn {
  summary: string;
  example?: string;
  details?: string;
  page?: string;
}

const transformFn = (summary: string, example: string, page: string): Fn => ({ summary, example, page: `transform-function/${page}` });
const filterFn = (summary: string, example: string, page: string): Fn => ({ summary, example, page: `filter-function/${page}` });

export const FUNCTIONS: Record<string, Fn> = {
  calc: {
    summary: '**Calculates** a value with `+`, `-`, `*` and `/`, and can mix units: `calc(100% - 2rem)`. Spaces around `+` and `-` are required.',
    details: 'Inside, other math functions and `var()` work too, and parentheses group: `calc((100% - 1rem) / 3)`.',
    example: 'width: calc(100% - 2 * var(--gap));',
  },
  var: {
    summary: 'Reads a **custom property** (CSS variable): `var(--name)`. An optional second argument is the **fallback**, used when the variable isn\'t set: `var(--gap, 1rem)`.',
    details: 'The value is looked up on the element itself, so it follows the cascade and inheritance: the same `var(--brand)` can be different inside a `.dark` section.',
    example: ':root { --brand: #3366ff; }\na { color: var(--brand, blue); }',
  },
  min: { summary: 'The **smallest** of the values: `min(100%, 60rem)` is "100%, but never more than 60rem", a maximum width in one value.', example: 'width: min(100%, 60rem);' },
  max: { summary: 'The **largest** of the values: `max(1rem, 2vw)` is "2vw, but never less than 1rem".', example: 'padding: max(1rem, 3vw);' },
  clamp: {
    summary: '`clamp(min, preferred, max)`: the preferred value, but **kept between** a minimum and a maximum. Great for fluid typography that grows with the screen.',
    example: 'font-size: clamp(1rem, 2.5vw, 2rem);',
  },
  url: {
    summary: 'A **URL** of a file to load: an image, a font, an imported stylesheet. A relative URL is relative to the **stylesheet**, not the HTML page. Quotes are optional.',
    example: 'background-image: url("images/hero.jpg");',
    page: 'url_value',
  },
  rgb: {
    summary: 'A color from its **red, green and blue** parts, each `0`–`255` (or `0%`–`100%`). An optional alpha after a `/` is the opacity: `rgb(0 0 0 / 50%)`.',
    details: 'The old comma syntax `rgb(255, 0, 0)` and `rgba(...)` still work; `rgb` and `rgba` are now the same function.',
    example: 'color: rgb(51 102 255);\nbackground: rgb(0 0 0 / 40%);',
    page: 'color_value/rgb',
  },
  rgba: { summary: 'Old name of `rgb()` with an alpha (opacity) part: `rgba(0, 0, 0, 0.5)`. Today `rgb()` takes the alpha too.', example: 'rgba(0, 0, 0, 0.5)', page: 'color_value/rgb' },
  hsl: {
    summary: 'A color from its **hue** (an angle on the color wheel: 0 red, 120 green, 240 blue), **saturation** (0% gray to 100% vivid) and **lightness** (0% black, 50% normal, 100% white). Easy to tweak by hand.',
    example: 'color: hsl(220deg 90% 60%);\ncolor: hsl(220 90% 60% / 0.5);',
    page: 'color_value/hsl',
  },
  hsla: { summary: 'Old name of `hsl()` with an alpha part. Today `hsl()` takes the alpha too.', page: 'color_value/hsl' },
  hwb: { summary: 'A color from its hue, **whiteness** and **blackness**: how much white and black to mix into the pure hue.', example: 'hwb(200 10% 20%)', page: 'color_value/hwb' },
  lab: { summary: 'A color in the CIE **Lab** color space: lightness, and two axes (green–red, blue–yellow). It covers more colors than sRGB.', page: 'color_value/lab' },
  lch: { summary: 'A color in the **LCH** space: lightness, chroma (colorfulness) and hue, designed to match how people see color.', page: 'color_value/lch' },
  oklab: { summary: 'A color in the **Oklab** space: perceptually uniform, so steps in lightness look even. Good for gradients.', page: 'color_value/oklab' },
  oklch: {
    summary: 'A color in the **OKLCH** space: lightness (0–1 or %), chroma (colorfulness, about 0–0.4) and hue (an angle). Colors with the same lightness really **look equally light**, which makes palettes easy, and it reaches the wide-gamut colors of modern screens.',
    example: 'color: oklch(70% 0.15 250);',
    page: 'color_value/oklch',
  },
  color: { summary: 'A color in a named color space, such as `display-p3` for the wider gamut of modern screens: `color(display-p3 1 0 0)`.', page: 'color_value/color' },
  'color-mix': { summary: '**Mixes** two colors in a color space: `color-mix(in oklch, var(--brand), white 30%)` is the brand color lightened with 30% white.', example: 'background: color-mix(in srgb, red 50%, blue);', page: 'color_value/color-mix' },
  'light-dark': { summary: '`light-dark(light, dark)`: the first color in a light color scheme, the second in a dark one (needs `color-scheme: light dark`).', example: 'color: light-dark(#333, #eee);', page: 'color_value/light-dark' },
  'linear-gradient': {
    summary: 'An image that fades between colors along a **straight line**: an optional direction (`to right`, `45deg`; default top to bottom), then color stops, each with an optional position.',
    example: 'background: linear-gradient(to right, #3366ff, #00ccff);\nbackground: linear-gradient(45deg, red 0 50%, blue 50% 100%); /* hard stop */',
    page: 'gradient/linear-gradient',
  },
  'radial-gradient': { summary: 'An image that fades between colors **outward from a center**: a circle or ellipse, then color stops.', example: 'background: radial-gradient(circle at center, white, transparent 70%);', page: 'gradient/radial-gradient' },
  'conic-gradient': { summary: 'An image whose colors go **around a center**, like a pie chart or color wheel.', example: 'background: conic-gradient(red 0 25%, gold 0 50%, teal 0);', page: 'gradient/conic-gradient' },
  'repeating-linear-gradient': { summary: 'A linear gradient that **repeats** its color stops to fill the box: stripes.', example: 'repeating-linear-gradient(45deg, #eee 0 10px, #fff 10px 20px)', page: 'gradient/repeating-linear-gradient' },
  'repeating-radial-gradient': { summary: 'A radial gradient that repeats: rings.', page: 'gradient/repeating-radial-gradient' },
  'image-set': { summary: 'Lets the browser pick the best image for the screen\'s resolution: `image-set("a.png" 1x, "a@2x.png" 2x)`.', page: 'image/image-set' },
  repeat: {
    summary: 'In a grid template: **repeats** tracks: `repeat(3, 1fr)` is `1fr 1fr 1fr`. With `auto-fill` or `auto-fit` instead of a number, the grid makes as many columns as fit.',
    example: 'grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));',
  },
  minmax: { summary: 'In a grid template: a track that is **at least** the first value and **at most** the second. `minmax(200px, 1fr)` never gets narrower than 200px.', example: 'grid-template-columns: minmax(150px, 25%) 1fr;' },
  'fit-content': { summary: 'In a grid template (or for sizes): as big as the content, but no bigger than the given limit.', example: 'grid-template-columns: fit-content(300px) 1fr;' },
  translate: transformFn('**Moves** the element: `translate(x, y)`. Percentages are of the element\'s own size, so `translate(-50%, -50%)` moves it back by half its size (the classic centering trick).', 'transform: translate(-50%, -50%);', 'translate'),
  translatex: transformFn('Moves the element horizontally.', 'transform: translateX(100%);', 'translateX'),
  translatey: transformFn('Moves the element vertically.', 'transform: translateY(-4px);', 'translateY'),
  translatez: transformFn('Moves the element towards or away from the viewer in 3D (needs `perspective`).', 'transform: translateZ(50px);', 'translateZ'),
  translate3d: transformFn('Moves the element in 3D: `translate3d(x, y, z)`.', 'transform: translate3d(0, 0, 0);', 'translate3d'),
  rotate: transformFn('**Rotates** the element around its `transform-origin` (the center by default), clockwise for positive angles.', 'transform: rotate(45deg);', 'rotate'),
  rotatex: transformFn('Rotates around the horizontal axis (tipping forward) in 3D.', 'transform: rotateX(60deg);', 'rotateX'),
  rotatey: transformFn('Rotates around the vertical axis (like a door) in 3D.', 'transform: rotateY(180deg);', 'rotateY'),
  rotatez: transformFn('Rotates in the plane of the page, like `rotate()`.', 'transform: rotateZ(90deg);', 'rotateZ'),
  scale: transformFn('**Scales** the element: `scale(2)` doubles it, `scale(1, 0.5)` halves only the height.', 'transform: scale(1.05);', 'scale'),
  scalex: transformFn('Scales the width only.', 'transform: scaleX(-1); /* mirror */', 'scaleX'),
  scaley: transformFn('Scales the height only.', 'transform: scaleY(0.5);', 'scaleY'),
  skew: transformFn('**Slants** the element by an angle along the x and y axes.', 'transform: skew(10deg, 0);', 'skew'),
  skewx: transformFn('Slants the element horizontally.', 'transform: skewX(-10deg);', 'skewX'),
  skewy: transformFn('Slants the element vertically.', 'transform: skewY(5deg);', 'skewY'),
  matrix: transformFn('A transform written as a 2D matrix of six numbers. Usually generated by tools; `translate`, `rotate` and `scale` are easier to read.', 'transform: matrix(1, 0, 0, 1, 10, 20);', 'matrix'),
  perspective: transformFn('Adds 3D depth to the transform functions that follow it.', 'transform: perspective(500px) rotateY(30deg);', 'perspective'),
  'cubic-bezier': { summary: 'A custom **easing curve** for transitions and animations, given by two control points `(x1, y1, x2, y2)`. Devtools have a visual editor for it.', example: 'transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoots */', page: 'easing-function/cubic-bezier' },
  steps: { summary: 'An easing that **jumps** in a number of equal steps instead of moving smoothly: for sprite animations or a ticking clock.', example: 'animation: walk 1s steps(8) infinite;', page: 'easing-function/steps' },
  linear: { summary: 'An easing made of straight lines between the given points, for bounce or spring effects.', page: 'easing-function/linear' },
  attr: { summary: 'The value of an **HTML attribute** of the element, mostly used in `content`: `content: attr(data-label)`.', example: 'a::after { content: " (" attr(href) ")"; }' },
  counter: { summary: 'The current value of a **CSS counter** (see `counter-reset` / `counter-increment`), as text for `content`.', example: 'h2::before { content: counter(section) ". "; }' },
  counters: { summary: 'All levels of a nested CSS counter, joined by a string: `counters(item, ".")` gives `1.2.3`.', example: 'li::before { content: counters(item, ".") " "; }' },
  env: { summary: 'An **environment variable** from the browser, such as the safe-area insets of phones with a notch: `env(safe-area-inset-top)`.', example: 'padding-top: env(safe-area-inset-top, 0px);' },
  format: { summary: 'In `@font-face` `src`: tells the browser the **file format** of the font before downloading it, so it can skip formats it doesn\'t support.', example: 'src: url("f.woff2") format("woff2");', page: '@font-face/src' },
  local: { summary: 'In `@font-face` `src`: use a font that is **installed** on the user\'s computer, by name, instead of downloading it.', example: 'src: local("Inter"), url("inter.woff2");', page: '@font-face/src' },
  blur: filterFn('**Blurs** the element; the length is the blur radius.', 'filter: blur(4px);', 'blur'),
  brightness: filterFn('Makes the element **brighter or darker**: `1` (or `100%`) is unchanged, `0` black.', 'filter: brightness(0.8);', 'brightness'),
  contrast: filterFn('Changes the **contrast**: `1` is unchanged, `0` gray.', 'filter: contrast(1.2);', 'contrast'),
  'drop-shadow': filterFn('A shadow that follows the **shape** of the content (including transparent parts of images), unlike `box-shadow`.', 'filter: drop-shadow(0 2px 4px rgb(0 0 0 / 30%));', 'drop-shadow'),
  grayscale: filterFn('Removes the colors: `1` (or `100%`) is fully **gray**.', 'filter: grayscale(100%);', 'grayscale'),
  'hue-rotate': filterFn('Shifts all colors around the color wheel by an angle.', 'filter: hue-rotate(90deg);', 'hue-rotate'),
  invert: filterFn('**Inverts** the colors, like a photo negative.', 'filter: invert(1);', 'invert'),
  opacity: filterFn('Makes the element transparent, like the `opacity` property.', 'filter: opacity(50%);', 'opacity'),
  saturate: filterFn('Makes the colors more (above `1`) or less (below `1`) **vivid**.', 'filter: saturate(2);', 'saturate'),
  sepia: filterFn('Gives the element an old-photo **sepia** tone.', 'filter: sepia(1);', 'sepia'),
  circle: { summary: 'A circle **shape**, for `clip-path` and `shape-outside`: `circle(radius at x y)`.', example: 'clip-path: circle(50% at center);', page: 'basic-shape/circle' },
  ellipse: { summary: 'An ellipse shape, for `clip-path`: `ellipse(rx ry at x y)`.', page: 'basic-shape/ellipse' },
  polygon: { summary: 'A polygon shape from a list of `x y` points, for `clip-path`.', example: 'clip-path: polygon(50% 0, 100% 100%, 0 100%); /* triangle */', page: 'basic-shape/polygon' },
  inset: { summary: 'A rectangle shape, inset from the edges (with optional `round` corners), for `clip-path`.', example: 'clip-path: inset(10px round 8px);', page: 'basic-shape/inset' },
  path: { summary: 'A shape from an SVG path string, for `clip-path` and `offset-path`.', page: 'basic-shape/path' },
  selector: { summary: 'In `@supports`: tests whether the browser understands a **selector**, e.g. `selector(:has(a))`.', example: '@supports selector(:has(a)) { ... }', page: '@supports' },
  supports: { summary: 'In `@import`: only import the stylesheet if the browser supports a feature.', page: '@import' },
  layer: { summary: 'In `@import`: puts the imported stylesheet into a cascade layer.', page: '@import' },
  style: { summary: 'In `@container`: a **style query**: tests the value of a custom property on the container.', example: '@container style(--theme: dark) { ... }', page: '@container' },
  abs: { summary: 'The absolute value of a number or length.', page: 'abs' },
  round: { summary: 'Rounds a value to a multiple of another: `round(var(--x), 1px)`.', page: 'round' },
  mod: { summary: 'The remainder of a division, with the sign of the divisor.', page: 'mod' },
  rem: { summary: 'The remainder of a division, with the sign of the dividend.', page: 'rem' },
  sin: { summary: 'The sine of an angle (CSS trigonometry functions also include `cos()`, `tan()`, `atan2()`).', page: 'sin' },
  cos: { summary: 'The cosine of an angle.', page: 'cos' },
  'anchor': { summary: 'In anchor positioning: the position of an edge of the **anchor element** the element is tethered to.', page: 'anchor' },
  element: { summary: 'An image of a live HTML element (only in Firefox, as `-moz-element()`).', page: 'element' },
};

// --------------------------------------------------------------------- units

export type UnitKind = 'length' | 'angle' | 'time' | 'resolution' | 'frequency' | 'flex';

export interface Unit {
  kind: UnitKind;
  /** What `n` of this unit is, e.g. "n × the root font size". */
  means: (n: number, text: string) => string;
  page: string;
}

const px = (n: number) => `${+(n.toFixed(2))}px`;
const viewport = (what: string) => (n: number) => `${n}% of the ${what}`;

export const UNITS: Record<string, Unit> = {
  px: { kind: 'length', means: (n) => `${n} CSS **pixel${n === 1 ? '' : 's'}**. A CSS pixel is 1/96 of an inch as seen at arm's length; on high-density screens it covers several device pixels, so sizes look the same everywhere`, page: 'length#px' },
  em: { kind: 'length', means: (n) => `${n} × the **font size of this element** (for \`font-size\` itself: of the parent). With the default 16px that is ${px(n * 16)}. Nested \`em\` font sizes compound: 1.2em inside 1.2em is 1.44 times the outer size`, page: 'length#em' },
  rem: { kind: 'length', means: (n) => `${n} × the font size of the **root element** (\`<html>\`): ${px(n * 16)} with the default 16px. Unlike \`em\` it doesn't compound when nested, and it grows when the user picks a bigger default font`, page: 'length#rem' },
  ex: { kind: 'length', means: (n) => `${n} × the **x-height** of the font (the height of a lowercase "x")`, page: 'length#ex' },
  ch: { kind: 'length', means: (n) => `${n} × the width of the "0" character of the font: about **${n} characters** of text. \`max-width: 65ch\` keeps lines comfortable to read`, page: 'length#ch' },
  cap: { kind: 'length', means: (n) => `${n} × the height of the font's capital letters`, page: 'length#cap' },
  ic: { kind: 'length', means: (n) => `${n} × the width of the CJK "水" character`, page: 'length#ic' },
  lh: { kind: 'length', means: (n) => `${n} × the element's **line height**`, page: 'length#lh' },
  rlh: { kind: 'length', means: (n) => `${n} × the root element's line height`, page: 'length#rlh' },
  vw: { kind: 'length', means: viewport('**viewport\'s width** (the browser window)'), page: 'length#vw' },
  vh: { kind: 'length', means: (n) => `${n}% of the **viewport's height**. On phones \`100vh\` can be taller than the visible area (behind the browser's toolbars): \`dvh\` fixes that`, page: 'length#vh' },
  vmin: { kind: 'length', means: viewport('viewport\'s smaller side (width or height)'), page: 'length#vmin' },
  vmax: { kind: 'length', means: viewport('viewport\'s larger side'), page: 'length#vmax' },
  vi: { kind: 'length', means: viewport('viewport\'s size in the inline direction (its width in horizontal text)'), page: 'length#vi' },
  vb: { kind: 'length', means: viewport('viewport\'s size in the block direction (its height in horizontal text)'), page: 'length#vb' },
  dvh: { kind: 'length', means: (n) => `${n}% of the **dynamic** viewport height: the area you can actually see right now, which changes as a phone browser's toolbars slide in and out`, page: 'length#dvh' },
  svh: { kind: 'length', means: (n) => `${n}% of the **small** viewport height: as if the phone browser's toolbars are shown`, page: 'length#svh' },
  lvh: { kind: 'length', means: (n) => `${n}% of the **large** viewport height: as if the phone browser's toolbars are hidden`, page: 'length#lvh' },
  dvw: { kind: 'length', means: viewport('dynamic viewport width'), page: 'length#dvw' },
  svw: { kind: 'length', means: viewport('small viewport width'), page: 'length#svw' },
  lvw: { kind: 'length', means: viewport('large viewport width'), page: 'length#lvw' },
  dvmin: { kind: 'length', means: viewport('dynamic viewport\'s smaller side'), page: 'length#dvmin' },
  dvmax: { kind: 'length', means: viewport('dynamic viewport\'s larger side'), page: 'length#dvmax' },
  cqw: { kind: 'length', means: viewport('**query container\'s** width (see `container-type`)'), page: 'length#cqw' },
  cqh: { kind: 'length', means: viewport('query container\'s height'), page: 'length#cqh' },
  cqi: { kind: 'length', means: viewport('**query container\'s** inline size (its width, in horizontal text)'), page: 'length#cqi' },
  cqb: { kind: 'length', means: viewport('query container\'s block size'), page: 'length#cqb' },
  cqmin: { kind: 'length', means: viewport('query container\'s smaller side'), page: 'length#cqmin' },
  cqmax: { kind: 'length', means: viewport('query container\'s larger side'), page: 'length#cqmax' },
  cm: { kind: 'length', means: (n) => `${n} centimeters (1cm is about 37.8px). Physical units are mainly for **print** stylesheets`, page: 'length#cm' },
  mm: { kind: 'length', means: (n) => `${n} millimeters (1mm is about 3.78px), mainly for print`, page: 'length#mm' },
  q: { kind: 'length', means: (n) => `${n} quarter-millimeters, mainly for print`, page: 'length#q' },
  in: { kind: 'length', means: (n) => `${n} inch${n === 1 ? '' : 'es'} (1in is 96px), mainly for print`, page: 'length#in' },
  pt: { kind: 'length', means: (n) => `${n} **points** (1pt is 1/72 inch, ${px(n * 96 / 72)}), the unit of word processors; mainly for print`, page: 'length#pt' },
  pc: { kind: 'length', means: (n) => `${n} picas (1pc is 12pt, 16px), mainly for print`, page: 'length#pc' },
  fr: { kind: 'flex', means: (n) => `${n} **fraction${n === 1 ? '' : 's'}** of the free space in the grid container: the space left after fixed-size tracks is shared out in proportion to the \`fr\` values`, page: 'flex_value' },
  deg: { kind: 'angle', means: (n) => `${n} **degrees** (a full turn is 360deg)`, page: 'angle#deg' },
  rad: { kind: 'angle', means: (n) => `${n} radians (a full turn is 2π ≈ 6.2832rad; ${+(n * 180 / Math.PI).toFixed(2)}deg)`, page: 'angle#rad' },
  grad: { kind: 'angle', means: (n) => `${n} gradians (a full turn is 400grad; ${+(n * 0.9).toFixed(2)}deg)`, page: 'angle#grad' },
  turn: { kind: 'angle', means: (n) => `${n} **turn${n === 1 ? '' : 's'}** (${+(n * 360).toFixed(2)}deg)`, page: 'angle#turn' },
  s: { kind: 'time', means: (n) => `${n} **second${n === 1 ? '' : 's'}** (${+(n * 1000).toFixed(2)}ms)`, page: 'time#s' },
  ms: { kind: 'time', means: (n) => `${n} **milliseconds** (${+(n / 1000).toFixed(4)}s)`, page: 'time#ms' },
  dpi: { kind: 'resolution', means: (n) => `${n} dots per inch (96dpi is 1x)`, page: 'resolution#dpi' },
  dpcm: { kind: 'resolution', means: (n) => `${n} dots per centimeter`, page: 'resolution#dpcm' },
  dppx: { kind: 'resolution', means: (n) => `${n} dots per CSS pixel: a "${n}x" screen`, page: 'resolution#dppx' },
  x: { kind: 'resolution', means: (n) => `a ${n}x resolution (${n} device pixels per CSS pixel)`, page: 'resolution#x' },
  hz: { kind: 'frequency', means: (n) => `${n} hertz`, page: 'frequency' },
  khz: { kind: 'frequency', means: (n) => `${n} kilohertz`, page: 'frequency' },
};

// ----------------------------------------------------------- pseudo-classes

export interface Pseudo {
  summary: string;
  example?: string;
  details?: string;
}

export const PSEUDO_CLASSES: Record<string, Pseudo> = {
  hover: { summary: 'Matches while the **mouse pointer is over** the element (or one of its children). Touch screens have no real hover: don\'t hide anything important behind it.', example: 'a:hover { text-decoration: underline; }' },
  active: { summary: 'Matches while the element is being **pressed** (between mouse down and up).', example: 'button:active { transform: translateY(1px); }' },
  focus: { summary: 'Matches the element that has **keyboard focus** (an input you clicked or tabbed to).', example: 'input:focus { border-color: royalblue; }' },
  'focus-visible': { summary: 'Matches a focused element when the browser thinks the focus **should be visible**: when you use the keyboard, not after a mouse click on a button. The best place for focus rings.', example: 'button:focus-visible { outline: 2px solid royalblue; }' },
  'focus-within': { summary: 'Matches an element that has focus **or contains** the focused element: highlight a whole form row while its input is focused.', example: '.field:focus-within { background: #f0f6ff; }' },
  visited: { summary: 'Matches **links the user has already visited**. For privacy, only color-like properties can be changed.', example: 'a:visited { color: purple; }' },
  link: { summary: 'Matches links (`<a href>`) that have **not been visited** yet.' },
  'any-link': { summary: 'Matches every link with an `href`, visited or not.' },
  target: { summary: 'Matches the element whose `id` is in the URL\'s **fragment** (`page.html#faq` → the element with `id="faq"`).', example: ':target { background: lightyellow; }' },
  checked: { summary: 'Matches checkboxes, radio buttons and `<option>`s that are **checked** (selected).', example: 'input:checked + label { font-weight: bold; }' },
  disabled: { summary: 'Matches form controls that are **disabled** (`disabled` attribute).', example: 'button:disabled { opacity: 0.5; }' },
  enabled: { summary: 'Matches form controls that are not disabled.' },
  required: { summary: 'Matches form fields with the `required` attribute.' },
  optional: { summary: 'Matches form fields without the `required` attribute.' },
  valid: { summary: 'Matches form fields whose value is **valid** (passes `required`, `type`, `pattern`, `min`/`max` checks).' },
  invalid: { summary: 'Matches form fields whose value is **invalid**. It matches right away, before the user typed anything: `:user-invalid` waits for interaction.', example: 'input:invalid { border-color: red; }' },
  'user-invalid': { summary: 'Like `:invalid`, but only **after the user interacted** with the field, so empty required fields aren\'t red from the start.' },
  'user-valid': { summary: 'Like `:valid`, but only after the user interacted with the field.' },
  'placeholder-shown': { summary: 'Matches an input while it shows its placeholder text, i.e. while it is **empty**.' },
  'read-only': { summary: 'Matches elements the user can\'t edit.' },
  'read-write': { summary: 'Matches elements the user can edit (inputs, `contenteditable`).' },
  default: { summary: 'Matches the default option in a group: the default submit button, the initially checked checkbox.' },
  indeterminate: { summary: 'Matches checkboxes in the "mixed" state, and progress bars without a value.' },
  'in-range': { summary: 'Matches number inputs whose value is within `min` and `max`.' },
  'out-of-range': { summary: 'Matches number inputs whose value is outside `min` and `max`.' },
  autofill: { summary: 'Matches inputs the browser has **autofilled**.' },
  'first-child': { summary: 'Matches an element that is the **first child** of its parent.', example: 'li:first-child { margin-top: 0; }' },
  'last-child': { summary: 'Matches an element that is the **last child** of its parent.', example: 'li:last-child { border-bottom: none; }' },
  'only-child': { summary: 'Matches an element that is its parent\'s **only** child.' },
  'nth-child': {
    summary: 'Matches children by their **position** among their siblings (counting from 1): a number, `odd`, `even`, or a formula `An+B` like `3n+1` (1st, 4th, 7th, ...). `of S` counts only the siblings matching selector `S`.',
    example: 'tr:nth-child(even) { background: #f6f6f6; }\nli:nth-child(3n + 1) { clear: left; }\nli:nth-child(-n + 3) { font-weight: bold; } /* the first three */',
  },
  'nth-last-child': { summary: 'Like `:nth-child()`, counting **from the end**: `:nth-last-child(1)` is the last child.', example: 'li:nth-last-child(-n + 2) { color: gray; } /* the last two */' },
  'first-of-type': { summary: 'Matches the first element **of its type** (tag name) among its siblings: the first `<p>`, even if a heading comes before it.' },
  'last-of-type': { summary: 'Matches the last element of its type among its siblings.' },
  'only-of-type': { summary: 'Matches an element that is the only one of its type among its siblings.' },
  'nth-of-type': { summary: 'Like `:nth-child()`, but counts only siblings **of the same type** (tag name).', example: 'img:nth-of-type(2n) { float: right; }' },
  'nth-last-of-type': { summary: 'Like `:nth-of-type()`, counting from the end.' },
  empty: { summary: 'Matches elements with **no children** at all (not even text; comments don\'t count).', example: '.badge:empty { display: none; }' },
  not: {
    summary: 'Matches elements that do **not** match any of the selectors in the parentheses.',
    details: 'Specificity: that of the most specific selector inside, so `:not(#x)` counts as an id.',
    example: 'li:not(:last-child) { border-bottom: 1px solid #ddd; }',
  },
  is: {
    summary: 'Matches elements that match **any** of the selectors in the list: a shorter way to write a selector list. An invalid selector in the list is ignored instead of breaking the whole rule.',
    details: 'Specificity: that of the most specific selector in the list.',
    example: ':is(h1, h2, h3) a { color: inherit; }',
  },
  where: {
    summary: 'Like `:is()`, matches any of the selectors in the list, but with **zero specificity**: rules using it are easy to override. Great for defaults and resets.',
    example: ':where(ul, ol) { padding-left: 1.5rem; }',
  },
  has: {
    summary: 'The "**parent selector**": matches an element if it **contains** something matching the selector inside (or, with `+`/`~`, is followed by it). `a:has(> img)` matches links that contain an image directly.',
    details: 'Specificity: that of the most specific selector inside.',
    example: '.card:has(img) { padding-top: 0; }\nlabel:has(+ input:invalid) { color: red; }',
  },
  root: { summary: 'Matches the **root element** of the document: `<html>`. The usual place to declare global custom properties.', example: ':root {\n  --brand: #3366ff;\n}' },
  scope: { summary: 'Matches the scoping root: in `@scope`, the scope\'s root element; at the top level, `:root`.' },
  lang: { summary: 'Matches elements in a given **language** (from the `lang` attribute, inherited down the tree).', example: ':lang(nl) q { quotes: "„" "”"; }' },
  dir: { summary: 'Matches elements by their text **direction** (`ltr` or `rtl`).', example: ':dir(rtl) .icon { transform: scaleX(-1); }' },
  defined: { summary: 'Matches standard elements and custom elements that have been **defined** (registered with JavaScript).' },
  fullscreen: { summary: 'Matches the element that is currently shown **fullscreen**.' },
  modal: { summary: 'Matches an element that blocks the rest of the page, like a `<dialog>` opened with `showModal()`.' },
  'popover-open': { summary: 'Matches a `popover` element while it is shown.' },
  open: { summary: 'Matches elements that are open: `<details>`, `<dialog>`, `<select>` pickers.' },
  host: { summary: 'Inside a web component\'s shadow DOM: matches the **custom element itself**.' },
  'host-context': { summary: 'Inside a shadow DOM: matches the host if an ancestor matches the selector.' },
  first: { summary: 'In `@page`: the **first page** of a printed document.' },
  playing: { summary: 'Matches audio and video elements that are playing.' },
  paused: { summary: 'Matches audio and video elements that are paused.' },
};

export const PSEUDO_ELEMENTS: Record<string, Pseudo> = {
  before: {
    summary: 'Creates a pseudo-element as the **first child** of the element, filled with the `content` property (required, even if empty: `content: ""`). Used for icons, decorations and quotes, without extra HTML.',
    example: '.note::before {\n  content: "ℹ️ ";\n}',
  },
  after: {
    summary: 'Creates a pseudo-element as the **last child** of the element, filled with the `content` property (required, even if empty: `content: ""`).',
    example: '.external::after {\n  content: " ↗";\n}',
  },
  placeholder: { summary: 'The **placeholder text** of an `<input>` or `<textarea>`.', example: 'input::placeholder { color: #999; }' },
  selection: { summary: 'The part of the text the user has **selected** (highlighted). Only a few properties apply: `color`, `background-color`, `text-decoration`, ...', example: '::selection { background: gold; }' },
  'first-line': { summary: 'The **first line** of a block of text, however long it is after wrapping.', example: 'p::first-line { font-variant: small-caps; }' },
  'first-letter': { summary: 'The **first letter** of a block of text, for drop caps.', example: 'p::first-letter { font-size: 3em; float: left; }' },
  marker: { summary: 'The **bullet or number** of a list item.', example: 'li::marker { color: royalblue; }' },
  backdrop: { summary: 'The box drawn **behind** a fullscreen element or a modal `<dialog>`: dim the page behind it.', example: 'dialog::backdrop { background: rgb(0 0 0 / 50%); }' },
  'file-selector-button': { summary: 'The button of an `<input type="file">`.' },
  cue: { summary: 'The captions (WebVTT cues) of a video.' },
  part: { summary: '`::part(name)`: an element inside a web component\'s shadow DOM that has `part="name"`, so outside CSS can style it.' },
  slotted: { summary: '`::slotted(selector)`: inside a shadow DOM, the elements put into a `<slot>`.' },
  'view-transition': { summary: 'The root of a view transition\'s pseudo-element tree.' },
  '-webkit-scrollbar': { summary: 'Chrome and Safari: the **scrollbar** of an element, styled with this non-standard pseudo-element (the standard way is `scrollbar-color` and `scrollbar-width`).' },
};

// ----------------------------------------------------------------- at-rules

export interface AtRule {
  summary: string;
  example: string;
  details?: string;
}

export const AT_RULES: Record<string, AtRule> = {
  '@media': {
    summary: 'Applies the rules inside **only when the media query matches**: the screen size, the device type, user preferences such as dark mode. The basis of **responsive** design.',
    details: 'Several queries separated by commas match if **any** of them does. Common: `(max-width: 600px)` for small screens, `(prefers-color-scheme: dark)`, `print`.',
    example: '@media (max-width: 600px) {\n  .sidebar { display: none; }\n}',
  },
  '@import': {
    summary: '**Loads another stylesheet** into this one, as if its rules were written here. It must come before all other rules (except `@charset` and `@layer`). A media query after it makes it conditional.',
    details: 'Every `@import` is an extra download that blocks rendering: bundlers or several `<link>` tags are usually faster.',
    example: '@import url("reset.css");\n@import "print.css" print;',
  },
  '@font-face': {
    summary: 'Defines a **web font**: a `font-family` name of your choice and the `src` files to load. Then use that name in `font-family` anywhere.',
    details: 'One `@font-face` per weight/style combination (or one variable font). `font-display: swap` shows a fallback font while it loads.',
    example: '@font-face {\n  font-family: "Inter";\n  src: url("inter.woff2") format("woff2");\n  font-weight: 100 900;\n  font-display: swap;\n}',
  },
  '@keyframes': {
    summary: 'Defines a named **animation**: the styles at points in time, from `from` (0%) to `to` (100%). Run it with the `animation` property.',
    example: '@keyframes fade-in {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n.toast { animation: fade-in 300ms ease-out; }',
  },
  '@supports': {
    summary: 'A **feature query**: applies the rules inside only if the browser supports the given property and value (or selector). Lets you use new CSS with a fallback.',
    example: '@supports (display: grid) {\n  .layout { display: grid; }\n}\n@supports not (aspect-ratio: 1) { ... }',
  },
  '@layer': {
    summary: 'Declares a **cascade layer**. Layers decide which rules win **before specificity** is compared: a later layer beats an earlier one, and unlayered styles beat all layers. That keeps resets and libraries easy to override.',
    details: '`@layer reset, base, components;` on its own fixes the order of the layers up front.',
    example: '@layer reset, components;\n@layer reset {\n  * { margin: 0; }\n}',
  },
  '@container': {
    summary: 'A **container query**: applies the rules inside depending on the size of a **container** element (one with `container-type`), not the whole viewport. Components can then adapt to wherever they are placed.',
    example: '.cards { container-type: inline-size; }\n@container (min-width: 400px) {\n  .card { display: flex; }\n}',
  },
  '@property': {
    summary: '**Registers** a custom property with a type (`syntax`), whether it `inherits`, and an `initial-value`. A typed custom property can be **animated** and transitioned, which plain ones can\'t.',
    example: '@property --angle {\n  syntax: "<angle>";\n  inherits: false;\n  initial-value: 0deg;\n}',
  },
  '@page': {
    summary: 'Styles the **printed page**: its margins and size. `:first`, `:left` and `:right` select specific pages.',
    example: '@page {\n  size: A4;\n  margin: 2cm;\n}',
  },
  '@charset': {
    summary: 'Declares the **text encoding** of the stylesheet. It must be the very first thing in the file, written exactly like `@charset "UTF-8";`. Rarely needed: UTF-8 is the default.',
    example: '@charset "UTF-8";',
  },
  '@namespace': {
    summary: 'Declares an **XML namespace** for selectors, for styling SVG or MathML inside XML documents: `svg|rect` then only matches SVG rectangles.',
    example: '@namespace svg url(http://www.w3.org/2000/svg);\nsvg|a { fill: blue; }',
  },
  '@scope': {
    summary: 'Limits the rules inside to a **part of the page**: elements inside the scope root (and, with `to (...)`, not inside the lower boundary). Avoids long selectors and class-name prefixes.',
    example: '@scope (.card) to (.card-content) {\n  img { border-radius: 8px; }\n}',
  },
  '@counter-style': { summary: 'Defines a custom **list marker** style (symbols, numbering system) for `list-style-type`.', example: '@counter-style thumbs {\n  system: cyclic;\n  symbols: "👍";\n  suffix: " ";\n}' },
  '@font-feature-values': { summary: 'Gives readable names to a font\'s OpenType alternates, for use with `font-variant-alternates`.', example: '@font-feature-values Font One {\n  @styleset { nice-style: 12; }\n}' },
  '@font-palette-values': { summary: 'Customizes the palette of a **color font** (like emoji fonts).', example: '@font-palette-values --brand {\n  font-family: Bixa;\n  override-colors: 0 red;\n}' },
  '@starting-style': { summary: 'The styles an element **starts from** when it first appears (or goes from `display: none` to shown), so it can transition in.', example: '.toast {\n  transition: opacity 0.3s;\n  @starting-style { opacity: 0; }\n}' },
  '@view-transition': { summary: 'Opts in to animated **view transitions** between pages of the same site.', example: '@view-transition {\n  navigation: auto;\n}' },
  '@position-try': { summary: 'Defines a fallback position for an anchor-positioned element, tried when it would overflow.', example: '@position-try --below {\n  top: anchor(bottom);\n}' },
  '@document': { summary: 'An old, non-standard rule that only applied styles on certain URLs. Removed from browsers: don\'t use it.', example: '' },
  '@viewport': { summary: 'An old, non-standard rule for the viewport size; use the `<meta name="viewport">` tag in HTML instead.', example: '' },
};

/** At-rules of preprocessors and frameworks: not CSS, they must be compiled away. */
export const TOOL_AT_RULES: Record<string, string> = {
  '@tailwind': 'Tailwind CSS (v3): inserts Tailwind\'s generated `base`, `components` or `utilities` styles here',
  '@apply': 'Tailwind CSS: copies the styles of utility classes into this rule',
  '@config': 'Tailwind CSS: picks a configuration file',
  '@plugin': 'Tailwind CSS: loads a plugin',
  '@theme': 'Tailwind CSS (v4): defines design tokens',
  '@utility': 'Tailwind CSS (v4): defines a custom utility class',
  '@variant': 'Tailwind CSS (v4): applies a variant',
  '@screen': 'Tailwind CSS: a media query for a named breakpoint',
  '@use': 'Sass: loads another Sass module',
  '@forward': 'Sass: re-exports another Sass module',
  '@mixin': 'Sass: defines a reusable block of styles',
  '@include': 'Sass: inserts a mixin',
  '@extend': 'Sass: makes this selector share the styles of another',
  '@function': 'Sass: defines a function',
  '@return': 'Sass: the result of a `@function`',
  '@if': 'Sass: a condition',
  '@else': 'Sass: the other branch of an `@if`',
  '@each': 'Sass: a loop over a list',
  '@for': 'Sass: a counting loop',
  '@while': 'Sass: a loop',
  '@debug': 'Sass: prints a debug message while compiling',
  '@warn': 'Sass: prints a warning while compiling',
  '@error': 'Sass: stops compiling with an error',
  '@custom-media': 'PostCSS (custom media queries): names a media query',
  '@custom-selector': 'PostCSS (custom selectors): names a selector',
};

// ------------------------------------------------------------ media queries

export const MEDIA_TYPES: Record<string, string> = {
  all: 'every kind of device (the default when no type is given)',
  screen: 'screens: computers, tablets, phones',
  print: 'printing, and the print preview',
  speech: 'speech synthesizers (screen readers)',
};

export interface Feature {
  summary: string;
  values?: Record<string, string>;
}

const range = (what: string, dir: 'min' | 'max' | 'exact') =>
  dir === 'min' ? `Matches when the ${what} is **at least** the given value: styles for that size **and up** ("mobile first").` : dir === 'max' ? `Matches when the ${what} is **at most** the given value: styles for that size **and smaller**.` : `Tests the ${what}; in a range query you can write \`(${what === 'viewport width' ? 'width' : 'height'} >= 600px)\`.`;

export const MEDIA_FEATURES: Record<string, Feature> = {
  width: { summary: range('viewport width', 'exact') },
  'min-width': { summary: range('viewport width', 'min') },
  'max-width': { summary: range('viewport width', 'max') },
  height: { summary: range('viewport height', 'exact') },
  'min-height': { summary: range('viewport height', 'min') },
  'max-height': { summary: range('viewport height', 'max') },
  'aspect-ratio': { summary: 'Tests the width-to-height ratio of the viewport, e.g. `(min-aspect-ratio: 16/9)`.' },
  'min-aspect-ratio': { summary: 'Matches viewports at least as wide (relative to their height) as the given ratio.' },
  'max-aspect-ratio': { summary: 'Matches viewports at most as wide (relative to their height) as the given ratio.' },
  orientation: { summary: 'Whether the viewport is taller or wider.', values: { portrait: 'taller than wide (a phone held upright)', landscape: 'wider than tall' } },
  'prefers-color-scheme': {
    summary: 'Whether the user has chosen a **light or dark** theme in their operating system or browser: the way to make a dark mode.',
    values: { dark: 'the user prefers a **dark** theme', light: 'the user prefers a light theme (or has no preference)' },
  },
  'prefers-reduced-motion': {
    summary: 'Whether the user asked the system to **minimize animations** (for example because motion makes them dizzy). Turn off or tone down animations then.',
    values: { reduce: 'the user wants **less motion**', 'no-preference': 'no preference set' },
  },
  'prefers-contrast': { summary: 'Whether the user asked for more (or less) **contrast**.', values: { more: 'more contrast', less: 'less contrast', 'no-preference': 'no preference', custom: 'a custom set of colors' } },
  'prefers-reduced-transparency': { summary: 'Whether the user asked for less transparency and blur effects.', values: { reduce: 'less transparency', 'no-preference': 'no preference' } },
  'forced-colors': { summary: 'Whether the browser forces a limited color palette, as in Windows High Contrast mode.', values: { active: 'forced colors are on', none: 'off' } },
  hover: { summary: 'Whether the **primary** pointing device can hover (a mouse can, a finger can\'t).', values: { hover: 'it can hover: a mouse or trackpad', none: 'it can\'t hover: a touch screen' } },
  'any-hover': { summary: 'Whether **any** available pointing device can hover.', values: { hover: 'some device can hover', none: 'none can' } },
  pointer: { summary: 'How precise the primary pointing device is: make touch targets bigger for `coarse`.', values: { fine: 'a precise pointer, like a mouse', coarse: 'an imprecise pointer, like a **finger**', none: 'no pointing device' } },
  'any-pointer': { summary: 'How precise any available pointing device is.', values: { fine: 'some device is precise', coarse: 'some device is imprecise', none: 'no pointing device' } },
  resolution: { summary: 'The pixel density of the screen, e.g. `(min-resolution: 2dppx)` for "retina" screens.' },
  'min-resolution': { summary: 'Matches screens with at least this pixel density: serve sharper images to high-density screens.' },
  'max-resolution': { summary: 'Matches screens with at most this pixel density.' },
  'display-mode': { summary: 'How a web app is shown: in a browser tab or installed as an app (PWA).', values: { browser: 'in a normal browser tab', standalone: 'installed, in its own window', 'minimal-ui': 'its own window with minimal browser controls', fullscreen: 'fullscreen' } },
  'color-gamut': { summary: 'Which range of colors the screen can show.', values: { srgb: 'about the sRGB range (every screen)', p3: 'the wider Display P3 range', rec2020: 'the even wider Rec. 2020 range' } },
  'dynamic-range': { summary: 'Whether the screen supports high dynamic range (HDR).', values: { standard: 'normal screens', high: 'HDR screens' } },
  update: { summary: 'How fast the device can update what it shows.', values: { fast: 'a normal screen', slow: 'an e-ink display', none: 'paper (print)' } },
  scripting: { summary: 'Whether JavaScript is available.', values: { enabled: 'scripts run', none: 'no scripting', 'initial-only': 'scripts only run at page load' } },
  monochrome: { summary: 'Whether the device is monochrome (black and white); with a number, how many bits per pixel.' },
  color: { summary: 'Whether the device has a color screen; with a number, how many bits per color.' },
  'inverted-colors': { summary: 'Whether the system inverts colors.', values: { inverted: 'colors are inverted', none: 'normal colors' } },
};

/** Container query features (for `@container`). */
export const CONTAINER_FEATURES: Record<string, string> = {
  width: 'the container\'s width',
  'min-width': 'the container is **at least** this wide',
  'max-width': 'the container is **at most** this wide',
  height: 'the container\'s height',
  'min-height': 'the container is at least this tall',
  'max-height': 'the container is at most this tall',
  'inline-size': 'the container\'s inline size (its width, in horizontal text)',
  'block-size': 'the container\'s block size',
  'aspect-ratio': 'the container\'s width-to-height ratio',
  orientation: 'whether the container is taller (`portrait`) or wider (`landscape`)',
};

// ---------------------------------------------------------------- elements

/** What common HTML elements are, for type selectors. */
export const ELEMENTS: Record<string, string> = {
  html: 'the root of the page', body: 'the visible content of the page', head: 'the page\'s metadata (not shown)',
  a: 'links', p: 'paragraphs', div: 'generic block containers', span: 'generic inline containers', img: 'images', svg: 'inline SVG graphics',
  ul: 'bulleted lists', ol: 'numbered lists', li: 'list items', dl: 'description lists', dt: 'description terms', dd: 'descriptions',
  h1: 'top-level headings', h2: 'second-level headings', h3: 'third-level headings', h4: 'fourth-level headings', h5: 'fifth-level headings', h6: 'sixth-level headings',
  header: 'page or section headers', footer: 'page or section footers', nav: 'navigation sections', main: 'the main content', section: 'sections', article: 'self-contained articles', aside: 'side content',
  button: 'buttons', input: 'form inputs', textarea: 'multi-line text inputs', select: 'drop-down lists', option: 'options of a `<select>`', label: 'form labels', form: 'forms', fieldset: 'groups of form fields', legend: 'captions of fieldsets',
  table: 'tables', thead: 'table header groups', tbody: 'table bodies', tfoot: 'table footers', tr: 'table rows', td: 'table cells', th: 'table header cells', caption: 'table captions',
  strong: 'important (bold) text', em: 'emphasized (italic) text', b: 'bold text', i: 'italic text', small: 'small print', code: 'inline code', pre: 'preformatted text', blockquote: 'quotations', q: 'inline quotations',
  hr: 'horizontal rules', br: 'line breaks', figure: 'figures', figcaption: 'figure captions', video: 'videos', audio: 'audio players', canvas: 'drawing canvases', iframe: 'embedded pages',
  details: 'disclosure widgets', summary: 'the visible heading of `<details>`', dialog: 'dialog boxes', picture: 'responsive images', source: 'media sources', abbr: 'abbreviations', time: 'dates and times', mark: 'highlighted text',
  rect: 'SVG rectangles', circle: 'SVG circles', path: 'SVG paths', g: 'SVG groups',
};

/** Hints for common attributes in attribute selectors. */
export const ATTRIBUTES: Record<string, string> = {
  href: 'the link target of `<a>` and `<link>`', src: 'the source URL of images, scripts and media', alt: 'the alternative text of images', title: 'the tooltip text',
  type: 'the kind of `<input>` or `<button>` (`text`, `checkbox`, `submit`, ...)', name: 'the name of a form field', value: 'the value of a form field', placeholder: 'the placeholder text of an input',
  disabled: 'whether a form control is disabled', checked: 'whether a checkbox or radio button is checked (initially)', required: 'whether a form field is required', hidden: 'whether the element is hidden',
  lang: 'the language of the content', dir: 'the text direction', id: 'the element\'s id', class: 'the element\'s classes', role: 'the ARIA role', target: 'where a link opens (`_blank` = a new tab)',
  rel: 'how a link relates to the page', open: 'whether `<details>` or `<dialog>` is open', download: 'whether a link downloads its target', tabindex: 'the keyboard focus order', contenteditable: 'whether the user can edit the content',
};
