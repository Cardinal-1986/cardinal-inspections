/* gate_1159 — the presentation doors a rep actually uses.
 *
 *  1. The Vision hub emits a Pop-Up Roof tile — executed, not grepped:
 *     visionHtml() is run for admin AND non-admin, and the result is
 *     parsed. It must be a real <a href="/popup.html"> (the Studio
 *     tile's pattern), not a data-go dispatch this host cannot serve.
 *  2. The ordinary landing emits .cr-lr-book at last — the class has
 *     carried a full stylesheet since 761 with zero markup using it.
 *     The emitted literal is eval'd and parsed.
 *  3. .cr-lr-book is NOT width-gated. Its own comment says so: the
 *     book is phone-shaped, so it is offered everywhere the >=820px
 *     Showroom row is hidden. A copied .cr-lr-show gate would silently
 *     take it away from exactly the phones it is for.
 *  4. The designer dispatch appends present=1 only on a vision host.
 *     Extracted and run both ways against a stub location.
 *  5. visualizer/index.html honours ?present=1 and lands on Present.
 *
 * Negative control: argv[2] = the previous artifact. Must go RED.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const VZ   = process.argv[3] || 'visualizer/index.html';
const src  = fs.readFileSync(FILE, 'utf8');
const vz   = fs.existsSync(VZ) ? fs.readFileSync(VZ, 'utf8') : '';
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

/* comment/string-aware brace matcher (gate_1154's) */
function grab(name) {
  const at = src.indexOf('\nfunction ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (ch === '/' && nx === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && nx === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      for (i++; i < src.length; i++) { if (src[i] === '\\') { i++; continue; } if (src[i] === q) break; }
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (!depth) return src.slice(at + 1, i + 1); }
  }
  return null;
}

/* the cr-lr-script block — every emit below must live in the RENDERER,
   not merely somewhere in a 5.6MB file. */
const lrAt  = src.indexOf('<script id="cr-lr-script"');
const lrEnd = lrAt < 0 ? -1 : src.indexOf('</script>', lrAt);
const lrBlk = lrAt < 0 ? '' : src.slice(lrAt, lrEnd);
ok('cr-lr-script block located', lrBlk.length > 2000, 'len=' + lrBlk.length);

/* ── 1 · the Vision hub tile, executed ─────────────────────────── */
const vhSrc = grab('visionHtml');
ok('visionHtml() found', !!vhSrc);
if (vhSrc) {
  for (const admin of [true, false]) {
    let html = '';
    try {
      const f = new Function('window', 'return (' + vhSrc + ')()');
      html = f({ is_admin: () => admin });
    } catch (e) { ok('visionHtml runs (admin=' + admin + ')', false, e.message); continue; }
    const d = new JSDOM('<div id="r">' + html + '</div>').window.document;
    const a = d.querySelector('a[href="/popup.html"]');
    ok('hub: Pop-Up Roof tile present (admin=' + admin + ')', !!a);
    if (a) {
      ok('hub: it is an <a>, not a data-go button (admin=' + admin + ')',
         a.tagName === 'A' && !a.hasAttribute('data-go'));
      ok('hub: opens in a new tab, safely (admin=' + admin + ')',
         a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || ''));
      ok('hub: carries the hub tile class (admin=' + admin + ')',
         a.classList.contains('cr-vh-tile'), a.className);
      ok('hub: has a title and a subtitle (admin=' + admin + ')',
         !!a.querySelector('.tt') && !!a.querySelector('.sb'));
    }
    /* the four that were already there must survive */
    ok('hub: Presentations still present (admin=' + admin + ')',
       !!d.querySelector('[data-go="showroom"]'));
    ok('hub: Designer still present (admin=' + admin + ')',
       !!d.querySelector('[data-go="designer"]'));
    ok('hub: Colors still present (admin=' + admin + ')',
       !!d.querySelector('[data-go="colors"]'));
    ok('hub: Studio is admin-only, unchanged (admin=' + admin + ')',
       !!d.querySelector('a[href="/studio.html"]') === admin);
  }
}

/* ── 2 · the landing emits .cr-lr-book ────────────────────────── */
const bookAt = lrBlk.indexOf("'<a class=\"cr-lr-book\"");
ok('landing: .cr-lr-book emitted from inside the renderer', bookAt > -1);
if (bookAt > -1) {
  const endAt = lrBlk.indexOf("'</a>' +", bookAt);
  ok('landing: the emit run terminates', endAt > bookAt);
  if (endAt > bookAt) {
    const expr = lrBlk.slice(bookAt, endAt + "'</a>'".length);
    let html = '';
    try { html = new Function('return (' + expr + ')')(); }
    catch (e) { ok('landing: emit is a valid expression', false, e.message); }
    if (html) {
      const d = new JSDOM('<div id="r">' + html + '</div>').window.document;
      const a = d.querySelector('a.cr-lr-book');
      ok('landing: renders one .cr-lr-book anchor', !!a);
      if (a) {
        ok('landing: href is the book', a.getAttribute('href') === '/popup.html');
        ok('landing: new tab, safely',
           a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || ''));
        ok('landing: uses the styled parts (.ic/.tx/.tt/.sb/.go)',
           ['.ic', '.tx', '.tt', '.sb', '.go'].every(s => !!a.querySelector(s)));
        ok('landing: it is NOT the >=820px Showroom row class',
           !a.classList.contains('cr-lr-show'), a.className);
      }
    }
  }
}

/* ── 3 · .cr-lr-book is not width-gated ───────────────────────── */
{
  /* every @media block in the file that mentions .cr-lr-book */
  let gated = 0, seen = 0;
  const re = /@media[^{]*\{/g; let m;
  while ((m = re.exec(src))) {
    /* brace-match the media block */
    let depth = 0, end = -1;
    for (let i = m.index + m[0].length - 1; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = src.slice(m.index, end);
    if (body.includes('.cr-lr-book')) { gated++; }
  }
  seen = (src.match(/\.cr-lr-book/g) || []).length;
  ok('.cr-lr-book is styled at all', seen >= 5, 'refs=' + seen);
  ok('.cr-lr-book is NOT inside any @media gate', gated === 0, 'gated blocks=' + gated);
  /* and the Showroom row still IS gated — proof the check can tell them apart */
  let showGated = 0;
  const re2 = /@media[^{]*\{/g; let m2;
  while ((m2 = re2.exec(src))) {
    let depth = 0, end = -1;
    for (let i = m2.index + m2[0].length - 1; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) continue;
    if (src.slice(m2.index, end).includes('.cr-lr-show{display:flex}')) showGated++;
  }
  ok('control: the Showroom row IS still width-gated', showGated >= 1, 'n=' + showGated);
}

/* ── 4 · designer dispatch appends present=1 only on a vision host ─ */
{
  const at = lrBlk.indexOf("var _vz = (window.CR_VISUALIZER_URL");
  ok('designer: the door-aware branch exists', at > -1);
  if (at > -1) {
    const end = lrBlk.indexOf('window.location.href = _vz;', at);
    ok('designer: branch terminates', end > at);
    if (end > at) {
      const body = lrBlk.slice(at, end + 'window.location.href = _vz;'.length);
      for (const vision of [true, false]) {
        let href = '';
        const w = { CR_VISUALIZER_URL: null, location: { set href(v) { href = v; }, get href() { return href; } } };
        try {
          new Function('window', 'isVisionHost', body)(w, () => vision);
        } catch (e) { ok('designer: runs (vision=' + vision + ')', false, e.message); continue; }
        ok('designer: navigates (vision=' + vision + ')', !!href, href);
        ok('designer: present=1 ' + (vision ? 'IS' : 'is NOT') + ' appended (vision=' + vision + ')',
           /[?&]present=1/.test(href) === vision, href);
        ok('designer: still points at the visualizer (vision=' + vision + ')',
           href.startsWith('/visualizer/'), href);
      }
      /* a caller-set URL that already has a query must not get a second ? */
      let href2 = '';
      const w2 = { CR_VISUALIZER_URL: '/visualizer/?x=1',
                   location: { set href(v) { href2 = v; }, get href() { return href2; } } };
      new Function('window', 'isVisionHost', body)(w2, () => true);
      ok('designer: an existing query gets & not a second ?',
         href2 === '/visualizer/?x=1&present=1', href2);
    }
  }
}

/* ── 5 · the visualizer honours ?present=1 ────────────────────── */
{
  ok('visualizer: file read', vz.length > 1000);
  const at = vz.indexOf("present=1");
  ok('visualizer: reads present=1 from the query', at > -1);
  const m = vz.match(/if\s*\([\s\S]{0,60}?present=1[\s\S]{0,20}?\.test\(location\.search\)\)\s*\{\s*tab\('present'\);\s*refresh\(\);\s*\}/);
  ok('visualizer: switches to Present and refreshes', !!m);
  ok('visualizer: still defaults to Prep for every other way in',
     /document\.body\.classList\.add\('vz-prep'\);\s*\/\* Prep is the landing tab \*\//.test(vz));
  ok('visualizer: the deep-link runs after the catalog loads',
     /loadCatalog\(\)\.then\(loadProjects\)\.then\(/.test(vz));
}

console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
