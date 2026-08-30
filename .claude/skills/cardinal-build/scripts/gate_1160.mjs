/* gate_1160 — Why Cardinal, a client-facing screen about Cardinal.
 *
 *  1. The module exists and exports one API, once.
 *  2. The Vision hub emits a Why Cardinal tile — executed, not grepped —
 *     and the five that were there survive.
 *  3. The screen renders: run the shipped ensureView() against a real
 *     document and assert on the parsed DOM. The warranty ladder is the
 *     ROOFING WARRANTY table's own three rows, and Platinum Protection
 *     is ABSENT — OC_BRAND_RULES: Platinum Preferred only, Cardinal is
 *     Preferred, so quoting it is an over-claim.
 *  4. NO Owens Corning MARK is on the screen. The status is text only;
 *     the lockup needs official artwork and OC Local Marketing approval,
 *     and a session cannot approve it. An <img>/<svg> appearing here
 *     later is that gate being skipped.
 *  5. Every ink clears 4.5:1 on the Blackout ground, computed from the
 *     shipped stylesheet — not eyeballed. Cardinal red #c8202e is
 *     3.57:1 here and must never be text on this screen.
 *  6. It writes no scroll lock (the count stays at 13) and is registered
 *     in hideAllViews() with the DISPLAY lever, matching cr-occ/cr-fin.
 *
 * Negative control: argv[2] = the previous artifact. Must go RED.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

const blk = (tag, id) => {
  const a = src.indexOf(`<${tag} id="${id}"`);
  if (a < 0) return '';
  const b = src.indexOf(`</${tag}>`, a);
  return b < 0 ? '' : src.slice(a, b);
};
const js  = blk('script', 'cr-why-script');
const css = blk('style',  'cr-why-styles');

/* ── 1 · the module ────────────────────────────────────────── */
ok('cr-why-script block exists', js.length > 1500, 'len=' + js.length);
ok('cr-why-styles block exists', css.length > 800, 'len=' + css.length);
ok('exports window.CardinalWhy exactly once',
   (src.match(/window\.CardinalWhy\s*=/g) || []).length === 1);
ok('uses the Object.assign export idiom, never plain assignment',
   /window\.CardinalWhy\s*=\s*Object\.assign\(\s*window\.CardinalWhy\s*\|\|/.test(js));

/* ── 2 · the Vision hub tile, executed ─────────────────────── */
{
  const at = src.indexOf('\nfunction visionHtml(');
  let vh = null;
  if (at > -1) {
    const open = src.indexOf('{', at);
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
      else if (ch === '}') { depth--; if (!depth) { vh = src.slice(at + 1, i + 1); break; } }
    }
  }
  ok('visionHtml() found', !!vh);
  if (vh) {
    for (const admin of [true, false]) {
      let html = '';
      try { html = new Function('window', 'return (' + vh + ')()')({ is_admin: () => admin }); }
      catch (e) { ok('visionHtml runs (admin=' + admin + ')', false, e.message); continue; }
      const d = new JSDOM('<div id="r">' + html + '</div>').window.document;
      const t = d.querySelector('[data-go="why"]');
      ok('hub: Why Cardinal tile present (admin=' + admin + ')', !!t);
      if (t) {
        ok('hub: it is a button, wired by data-go (admin=' + admin + ')',
           t.tagName === 'BUTTON' && t.getAttribute('type') === 'button');
        ok('hub: carries the hub tile class (admin=' + admin + ')',
           t.classList.contains('cr-vh-tile'), t.className);
        ok('hub: has a title and a subtitle (admin=' + admin + ')',
           !!t.querySelector('.tt') && !!t.querySelector('.sb'));
      }
      /* the five that were already there must survive */
      for (const sel of ['[data-go="showroom"]', '[data-go="designer"]', '[data-go="colors"]',
                         'a[href="/popup.html"]'])
        ok('hub: ' + sel + ' still present (admin=' + admin + ')', !!d.querySelector(sel));
      ok('hub: Studio still admin-only (admin=' + admin + ')',
         !!d.querySelector('a[href="/studio.html"]') === admin);
    }
  }
}

/* ── 3 · the screen renders ────────────────────────────────── */
let doc = null;
{
  /* Execute the SHIPPED block the way a browser does — a jsdom
     realm's free `window` is not reachable from new w.Function(). */
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM(
    '<!doctype html><html><head>' + css + '</style></head><body>' +
    '<script>' + body + '<\/script></body></html>',
    { runScripts: 'dangerously' });
  const w = dom.window;
  try {
    if (!w.CardinalWhy) throw new Error('CardinalWhy never exported');
    w.CardinalWhy.open();
    doc = w.document;
  } catch (e) { ok('module runs and open() renders', false, e.message); }
  if (doc) {
    ok('module runs and open() renders', true);
    const v = doc.getElementById('cr-why');
    ok('#cr-why exists in the document', !!v);
    ok('open() shows it by DISPLAY, not a class', v && v.style.display === 'block',
       v && v.style.display);
    ok('has a heading', !!doc.querySelector('#cr-why .why-h'));
    ok('has a close control', !!doc.querySelector('#cr-why [data-why="close"]'));

    const txt = v ? v.textContent : '';
    /* the four chapters refaced from PANES.proof */
    for (const k of ['The company', 'Owens Corning', 'The warranty',
                     'What goes on your roof', 'Your right to cancel'])
      ok('chapter present: ' + k, txt.includes(k));

    /* facts that must survive the reface, verbatim from the proof pane */
    for (const [label, needle] of [
      ['Dayton',                  'Dayton'],
      ['licensed and insured',    'Licensed and insured'],
      ['pulls the permit',        'permit'],
      ['magnetic sweep',          'magnetic sweep'],
      ['Preferred Contractor',    'Preferred Contractor'],
      ['tear-off, no layovers',   'No layovers'],
      ['sheathing priced per sheet', 'per sheet'],
      ['ice and water shield',    'Ice and water shield'],
      ['synthetic, not felt',     'not felt'],
      ['new pipe boots',          'pipe boots'],
      ['ventilation',             'ventilation'],
      ['three business days',     'three business days'],
      ['ORC 1345.23',             '1345.23'],
    ]) ok('fact kept: ' + label, txt.includes(needle));

    /* the coaching asides must be GONE — this is a reface, not a copy */
    for (const [label, needle] of [
      ['"ask a competitor"',        'competitor'],
      ['"before they ask"',         'before they ask'],
      ['"then stop talking"',       'stop talking'],
      ['"saying it first is worth"', 'Saying it first'],
    ]) ok('rep coaching removed: ' + label, !txt.includes(needle), needle);

    /* the warranty ladder */
    const rows = [...doc.querySelectorAll('#cr-why .why-wtab tbody tr')];
    ok('warranty ladder has three rows, not one number', rows.length === 3, 'n=' + rows.length);
    for (const t of ['Standard', 'System Protection', 'Preferred Protection'])
      ok('ladder row: ' + t, rows.some(r => r.textContent.includes(t)));
    for (const [t, m, wk] of [['Standard', '25-year', '5-year'],
                              ['System Protection', '25-year', '10-year'],
                              ['Preferred Protection', '50-year', '10-year']]) {
      const r = rows.find(x => x.textContent.includes(t));
      ok('ladder ' + t + ' = ' + m + ' mfr / ' + wk + ' work',
         !!r && r.textContent.includes(m) && r.textContent.includes(wk),
         r && r.textContent.replace(/\s+/g, ' ').trim());
    }
    ok('Platinum Protection is ABSENT (Platinum Preferred only)',
       !/platinum/i.test(txt));
    ok('the workmanship years are called out as the ones that matter',
       /the one that matters/i.test(txt));

    /* ── 4 · no OC mark ── */
    ok('no <img> on the screen (an OC lockup needs artwork + approval)',
       !!v && v.querySelectorAll('img').length === 0);
    ok('no <svg> on the screen', !!v && v.querySelectorAll('svg').length === 0);
    ok('no background-image anywhere in the stylesheet',
       !/background-image/i.test(css) && !/url\(/i.test(css));
    ok('OC status is stated as text', txt.includes('Owens Corning'));
  }
}

/* ── 5 · every ink clears the floor on the Blackout ground ── */
{
  const hexes = [...new Set((css.match(/#[0-9a-fA-F]{6}\b/g) || []).map(h => h.toLowerCase()))];
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = h => {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const GROUND = '#050607';
  ok('the ground is the Blackout literal', hexes.includes(GROUND), hexes.join(' '));

  /* inks = every hex used in a `color:` declaration */
  const inks = [...new Set((css.match(/color\s*:\s*#[0-9a-fA-F]{6}/g) || [])
    .map(d => d.split('#')[1]).map(h => '#' + h.toLowerCase()))]
    .filter(h => h !== GROUND);
  ok('the stylesheet declares inks', inks.length >= 4, inks.join(' '));
  let low = [];
  for (const ink of inks) { const r = ratio(ink, GROUND); if (r < 4.5) low.push(ink + '=' + r.toFixed(2)); }
  ok('every declared ink clears 4.5:1 on ' + GROUND, low.length === 0, low.join(' '));
  ok('cardinal red #c8202e is NOT used as an ink here (3.57:1)',
     !inks.includes('#c8202e'), inks.join(' '));
  ok('but #c8202e IS used, as a ground/rule', /#c8202e/i.test(css));
}

/* ── 6 · the house rules ───────────────────────────────────── */
ok('writes NO scroll lock (no 14th writer)',
   !/body\s*\.\s*style\s*\.\s*overflow/.test(js) && !/style\.overflow/.test(js));
{
  const at = src.indexOf('function hideAllViews');
  let fn = '';
  if (at > -1) {
    const open = src.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (!depth) { fn = src.slice(at, i + 1); break; } }
    }
  }
  ok('registered in hideAllViews()', fn.includes("getElementById('cr-why')"));
  ok('hideAllViews uses the DISPLAY lever, not a class',
     /_why\s*\)\s*_why\.style\.display\s*=\s*'none'/.test(fn));
  /* the ones already there must survive */
  for (const id of ['cr-occ', 'cr-fin', 'cr-show'])
    ok('hideAllViews still clears ' + id, fn.includes(id));
}
ok('the dispatch routes data-go="why"',
   /if\(d === 'why'\)\{[\s\S]{0,120}CardinalWhy\.open\(\)/.test(src));
ok('single-theme: no rb-light twin, deliberately (a Vision surface)',
   !/rb-light/.test(css));

console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
