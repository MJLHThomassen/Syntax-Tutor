// Verifies every documentation link used by the hover docs and comment docs.
//
//   node scripts/check-links.mjs            (run `node scripts/build.mjs` first)
//   node scripts/check-links.mjs --verbose  also list OK links
//
// Reports HTTP errors, cross-site redirects, and #fragments whose anchor is
// not an id/name in the fetched HTML. Same-site redirects are listed as "moved"
// (they still work). Exit code 1 if anything is broken.
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;
const verbose = process.argv.includes('--verbose');

// url -> Set of places that use it
const links = new Map();
const add = (url, where) => {
  if (!url) return;
  if (!links.has(url)) links.set(url, new Set());
  links.get(url).add(where);
};

const dir = 'dist/test';
for (const file of readdirSync(dir).filter((f) => /^lang-.*\.js$/.test(f))) {
  const mod = require(join(process.cwd(), dir, file));
  for (const [exportName, spec] of Object.entries(mod)) {
    if (!spec || typeof spec !== 'object') continue;
    const name = `${file}:${exportName}`;
    if (spec.docs) for (const [key, entry] of Object.entries(spec.docs)) add(entry.link, `${name} docs[${key}]`);
    if (spec.comments) {
      spec.comments.kinds.forEach((k) => add(k.link, `${name} comment kind "${k.title}"`));
      for (const [format, table] of Object.entries(spec.comments.tags))
        for (const [tag, doc] of Object.entries(table)) add(doc.link, `${name} ${format} tag ${tag}`);
    }
  }
}

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; syntax-tutor-link-check)',
  accept: 'text/html,application/xhtml+xml',
};

function anchorsOf(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) ids.add(m[1] ?? m[2] ?? m[3]);
  return ids;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HOST_GAP_MS = { 'learn.microsoft.com': 400 };
const lastHit = new Map();

// One fetch per page (links differing only by #fragment share it), with
// retries on 429/5xx and a minimum gap between requests to rate-limited hosts.
const pages = new Map();
function fetchPage(target) {
  if (!pages.has(target)) pages.set(target, doFetch(target));
  return pages.get(target);
}
async function doFetch(target) {
  const host = new URL(target).hostname;
  for (let attempt = 1; ; attempt++) {
    const gap = HOST_GAP_MS[host];
    if (gap) {
      const at = Math.max(Date.now(), (lastHit.get(host) ?? 0) + gap);
      lastHit.set(host, at);
      await sleep(at - Date.now());
    }
    let res;
    try {
      res = await fetch(target, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      if (attempt < 3) { await sleep(1000 * attempt); continue; }
      return { failed: `request failed: ${e.cause?.code ?? e.message}` };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * attempt;
      await sleep(Math.min(wait, 20000));
      continue;
    }
    return { status: res.status, ok: res.ok, finalUrl: res.url, html: res.ok ? await res.text() : '' };
  }
}

// status: ok | moved (same-site redirect, still works) | error | blocked
async function check(url) {
  const problems = [];
  const hashAt = url.indexOf('#');
  const target = hashAt < 0 ? url : url.slice(0, hashAt);
  const fragment = hashAt < 0 ? '' : decodeURIComponent(url.slice(hashAt + 1));
  const page = await fetchPage(target);
  if (page.failed) return { status: 'error', problems: [page.failed] };
  if (page.status === 403 || page.status === 429)
    return { status: 'blocked', problems: [`HTTP ${page.status} (site may block automated requests)`] };
  if (!page.ok) return { status: 'error', problems: [`HTTP ${page.status}`] };
  const finalUrl = new URL(page.finalUrl);
  const origUrl = new URL(target);
  let moved = false;
  if (finalUrl.hostname.replace(/^www\./, '') !== origUrl.hostname.replace(/^www\./, ''))
    problems.push(`cross-site redirect to ${page.finalUrl}`);
  else if (finalUrl.pathname.replace(/\/$/, '') !== origUrl.pathname.replace(/\/$/, '')) {
    moved = true;
    problems.push(`moved: redirects to ${page.finalUrl}`);
  }
  if (fragment && !anchorsOf(page.html).has(fragment)) {
    moved = false;
    problems.push(`anchor "#${fragment}" not found in page`);
  }
  return { status: problems.length ? (moved ? 'moved' : 'error') : 'ok', problems };
}

const urls = [...links.keys()];
const results = new Map();
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await check(url));
    }
  }),
);

const count = { ok: 0, moved: 0, error: 0, blocked: 0 };
for (const url of urls) {
  const r = results.get(url);
  count[r.status]++;
  if (r.status === 'ok' && !verbose) continue;
  const tag = { ok: 'OK     ', moved: 'MOVED  ', error: 'BROKEN ', blocked: 'BLOCKED' }[r.status];
  console.log(`${tag} ${url}`);
  for (const p of r.problems) console.log(`          ${p}`);
  if (r.status !== 'ok') {
    const where = [...links.get(url)];
    console.log(`          used by: ${where.slice(0, 3).join('; ')}${where.length > 3 ? ` (+${where.length - 3} more)` : ''}`);
  }
}
console.log(`\n${urls.length} unique links checked: ${count.ok} ok, ${count.moved} moved (same-site redirect), ${count.error} broken, ${count.blocked} blocked/unverifiable`);
process.exit(count.error ? 1 : 0);
