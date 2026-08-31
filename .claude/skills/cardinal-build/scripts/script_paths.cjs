/* script_paths.cjs — where an HTML artifact's referenced files actually live.
 *
 * ONE IMPLEMENTATION, THREE CALLERS. `check_external_scripts.mjs` (ESM, via
 * createRequire), `module_source.cjs`, and anything else that needs to answer
 * "this artifact says src=X — what file is that?". CommonJS on purpose: eight of
 * the ten gates that need it are CJS and cannot `require` an .mjs.
 *
 * ⚠ THE ROOT IS THE REPO, NEVER process.cwd(). A site-absolute `src="/x.js"` is
 * served from the DEPLOY root. Gates are routinely pointed at a STAGED artifact
 * in a scratch directory, and taking the root from cwd made a perfectly present
 * file report MISSING — a gate going red on correct code. Every plausible root
 * is tried and a path counts as missing only if it is absent from all of them.
 */
const fs = require('fs');
const path = require('path');

function gitRootFrom(start) {
  let d = path.resolve(start);
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}
const ROOT = gitRootFrom(__dirname) || gitRootFrom(process.cwd()) || process.cwd();

/** Somebody else's server: never fetched, never checked. */
const isRemote = s => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(s) || /^data:/i.test(s);

/** Candidate absolute paths for one reference, best guess first. */
function resolveLocal(src, htmlPath) {
  const clean = String(src).split(/[?#]/)[0];
  const here = path.dirname(path.resolve(htmlPath));
  if (!clean.startsWith('/')) return [path.resolve(here, clean)];
  const rel = clean.slice(1);
  return [...new Set([ROOT, gitRootFrom(here), here].filter(Boolean).map(r => path.join(r, rel)))];
}

/** The first candidate that exists, or null. */
function existingLocal(src, htmlPath) {
  return resolveLocal(src, htmlPath).find(c => fs.existsSync(c)) || null;
}

/* Deliberately NOT the inline-script pattern's inverse: these WANT the ref. */
const SRC_RE  = /<script\b([^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*)>/gi;
const HREF_RE = /<link\b([^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*)>/gi;

function refs(html, re) {
  const out = [];
  for (const m of String(html).matchAll(re)) {
    const attrs = m[1];
    const url = (m[2] ?? m[3] ?? m[4] ?? '').trim();
    if (url) out.push({ url, attrs });
  }
  return out;
}

/** Every <script src>. `isModule` reflects type="module". */
const externalRefs = html => refs(html, SRC_RE).map(r => ({
  src: r.url, attrs: r.attrs,
  isModule: (/type\s*=\s*["']?([^"'\s>]+)/i.exec(r.attrs)?.[1] || '').toLowerCase() === 'module',
}));

/** Every <link> that is a stylesheet. rel is checked, so a preload or an icon
 *  is not mistaken for CSS. */
const stylesheetRefs = html => refs(html, HREF_RE)
  .filter(r => /\brel\s*=\s*["']?[^"'>]*\bstylesheet\b/i.test(r.attrs))
  .map(r => ({ href: r.url, attrs: r.attrs }));

module.exports = { ROOT, gitRootFrom, isRemote, resolveLocal, existingLocal, externalRefs, stylesheetRefs };
