/* gate_795.mjs — Job Details, laid out like the AccuLynx card.
 *
 *   node gate_795.mjs [path/to/index.html]
 *   THEME=light  runs the whole thing against the light theme instead
 *
 *   A. four rows — Job Category, Work Type, Trade Type, Lead Source — as a
 *      two-column list with no grid gap
 *   B. labels: no colons, none of them wraps, and Initial Appt is gone
 *   C. the vertical rule exists AND is continuous (the rows have to touch)
 *   D. the <select>s lost their chrome but NOT their job — a change still
 *      round-trips through patchProjectCk and survives the re-render
 *   E. Trade Type is a button that reads like the other three, opens the six
 *      trades as chips, and ticking one still saves and updates the summary
 *   F. the four rows are even (the reason min-height:52px is there)
 *   G. contrast of every ink against its COMPOSITED ground
 *   H. an insurance profile is untouched — that CRM has its own palette
 *   I. the desktop gets the same layout and still does not wrap
 *
 * Negative control: run against 794 — must go RED, not crash. There is no
 * .acxjd on 794 at all, so every probe returns a sentinel rather than
 * dereferencing null. If a negative control can crash, it is not yet a control.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_795 on ' + FILE);

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed',
    address: '804 Burleigh Avenue, Dayton, OH 45402', email: 'bob@debuild.com', phone: '937-333-9192',
    claim_type: kind,
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-08-06T10:00:00Z', lead: { claim_type: kind },
      job_category: 'Residential', work_type: 'New', lead_source: 'Referral',
      trades: ['Roofing', 'Repairs'], t_Prospect: '2026-05-08T14:00:00Z' }),
    created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
});

async function boot(width, kind, theme) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 1000 },
    deviceScaleFactor: width > 700 ? 1 : 2, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, mkSeed(kind));
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(t => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'rb-light');
    else document.documentElement.removeAttribute('data-theme');
  }, theme);
  await page.evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); });
  await page.waitForTimeout(1800);
  return { browser, page };
}

/* Shared in-page helpers. The ground walk stops at the first FULLY OPAQUE
   background and collects gradient stops as well as colours — the 790 probe
   walked all the way to the page root and scored dark text on a white card
   against black, which produced sixteen false failures. */
const HELPERS = () => {
  window.__jd = {
    card() {
      const heads = Array.from(document.querySelectorAll('#acxMount h3.projsec'));
      const h = heads.find(x => /Job Details/i.test(x.textContent || ''));
      return h ? h.nextElementSibling : null;
    },
    kv() { const c = window.__jd.card(); return c ? c.querySelector('.ackv') : null; },
    parseRGB(s) {
      const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
      const p = m[1].split(',').map(x => parseFloat(x));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    },
    stops(bgImage) {
      const out = []; const re = /rgba?\([^)]+\)/g; let m;
      while ((m = re.exec(bgImage || '')) !== null) out.push(window.__jd.parseRGB(m[0]));
      return out.filter(Boolean);
    },
    /* Returns the candidate grounds AND, separately, the opaque backdrop the
       translucent ones composite against.
       ⚠ Keeping them in one list is a real bug I shipped into this harness and
       it reported five false failures: the white fallback was appended to the
       candidates and then SCORED, so #b9d3ec on a black card came back 1.55:1
       and a white chip label came back 1.00:1. White is the backdrop of last
       resort, never a ground the element actually sits on. */
    grounds(el) {
      const list = [];
      let opaque = null;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = getComputedStyle(n);
        const c = window.__jd.parseRGB(s.backgroundColor);
        for (const st of window.__jd.stops(s.backgroundImage)) list.push(st);
        if (c && c.a > 0) { list.push(c); if (c.a >= 1) { opaque = c; break; } }
      }
      if (!opaque) { opaque = { r: 255, g: 255, b: 255, a: 1 }; list.push(opaque); }
      return { list, opaque };
    },
    comp(fg, bg) {
      const a = fg.a === undefined ? 1 : fg.a;
      return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
    },
    lum(c) {
      const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    },
    ratio(a, b) { const la = window.__jd.lum(a), lb = window.__jd.lum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); },
    /* an element's background-image composites over its OWN background-colour,
       not the ancestor's; getting that backwards reads a dark card's wash as
       near-white and fails a passing ink at 1.05:1 */
    contrast(el) {
      if (!el) return null;
      const s = getComputedStyle(el);
      const ink = window.__jd.parseRGB(s.color); if (!ink) return null;
      const { list, opaque } = window.__jd.grounds(el);
      let worst = Infinity;
      for (const g of list) {
        const solid = g.a >= 1 ? g : window.__jd.comp(g, opaque);
        const r = window.__jd.ratio(window.__jd.comp(ink, solid), solid);
        if (r < worst) worst = r;
      }
      return Math.round(worst * 100) / 100;
    },
    /* value cells only — NOT the trade panel, which is display:none when shut
       and would report a zero-height rect that looks like a broken row */
    valueCells() {
      const kv = window.__jd.kv(); if (!kv) return [];
      return Array.from(kv.querySelectorAll(':scope > div')).filter(d => !d.classList.contains('acxtrs'));
    }
  };
};

const THEME = process.env.THEME || 'dark';
const LABELS = ['Job Category', 'Work Type', 'Trade Type', 'Lead Source'];

/* ======================================================================= */
const P = await boot(402, 'retail', THEME);
await P.page.evaluate(HELPERS);

console.log('\n--- A. four rows, two columns, no gap ---');
const A = await P.page.evaluate(() => {
  const card = window.__jd.card(), kv = window.__jd.kv();
  if (!card || !kv) return { none: true, cardCls: card ? card.className : null, kvCls: kv ? kv.className : null };
  const s = getComputedStyle(kv);
  return { none: false, cardCls: card.className, kvCls: kv.className,
    cols: s.gridTemplateColumns, colCount: s.gridTemplateColumns.split(' ').filter(Boolean).length,
    rowGap: s.rowGap, colGap: s.columnGap,
    spans: kv.querySelectorAll(':scope > span').length,
    values: window.__jd.valueCells().length,
    panel: !!kv.querySelector('#acxTrPanel') };
});
ok('the card carries the 795 hooks',
  !A.none && /\bacxjdsec\b/.test(A.cardCls || '') && /\bacxjd\b/.test(A.kvCls || ''), JSON.stringify(A));
ok('exactly two columns', !A.none && A.colCount === 2, JSON.stringify(A.cols));
ok('no grid gap — the rows have to touch for the rule to be continuous',
  !A.none && parseFloat(A.rowGap) === 0 && parseFloat(A.colGap) === 0,
  JSON.stringify({ row: A.rowGap, col: A.colGap }));
ok('four label/value pairs, plus the trade panel',
  !A.none && A.spans === 4 && A.values === 4 && A.panel, JSON.stringify(A));

console.log('\n--- B. the labels ---');
const B = await P.page.evaluate(() => {
  const kv = window.__jd.kv(); if (!kv) return { none: true, labels: [] };
  return { none: false, labels: Array.from(kv.querySelectorAll(':scope > span')).map(e => ({
    t: (e.textContent || '').trim(),
    wraps: e.scrollWidth > e.clientWidth + 1,
    nowrap: getComputedStyle(e).whiteSpace })) };
});
ok('the four AccuLynx labels, in order, with no colons',
  !B.none && JSON.stringify(B.labels.map(l => l.t)) === JSON.stringify(LABELS),
  JSON.stringify(B.labels.map(l => l.t)));
ok('and none of them wraps',
  !B.none && B.labels.length > 0 && B.labels.every(l => !l.wraps && l.nowrap === 'nowrap'),
  JSON.stringify(B.labels.filter(l => l.wraps).map(l => l.t)));
ok('Initial Appt is off this card',
  !B.none && !B.labels.some(l => /Initial Appt/i.test(l.t)), JSON.stringify(B.labels.map(l => l.t)));

console.log('\n--- C. the vertical rule, and it is continuous ---');
const C = await P.page.evaluate(() => {
  const vals = window.__jd.valueCells(); if (!vals.length) return { none: true };
  const widths = vals.map(v => getComputedStyle(v).borderLeftWidth);
  const alpha = vals.map(v => { const c = window.__jd.parseRGB(getComputedStyle(v).borderLeftColor); return c ? c.a : null; });
  const rects = vals.map(v => v.getBoundingClientRect());
  let maxGap = 0;
  for (let i = 1; i < rects.length; i++) maxGap = Math.max(maxGap, Math.abs(rects[i].top - rects[i - 1].bottom));
  return { none: false, widths, alpha, maxGap, lefts: [...new Set(rects.map(r => Math.round(r.left)))] };
});
ok('every value cell carries the 1px rule',
  !C.none && C.widths.length === 4 && C.widths.every(x => x === '1px'), JSON.stringify(C.widths));
ok('the rule is actually visible, not a transparent border',
  !C.none && C.alpha.every(a => a !== null && a > 0.05), JSON.stringify(C.alpha));
ok('and it is one continuous line — rows touch, one x',
  !C.none && C.maxGap <= 1 && C.lefts.length === 1, JSON.stringify({ maxGap: C.maxGap, lefts: C.lefts }));

console.log('\n--- D. the dropdowns lost the box, not the job ---');
const D0 = await P.page.evaluate(() => {
  const card = window.__jd.card(); if (!card) return { none: true };
  const sel = card.querySelector('#acxCat'); if (!sel) return { none: true };
  const s = getComputedStyle(sel);
  const row = sel.closest('.acxsl');
  const caret = row ? getComputedStyle(row, '::after') : null;
  const carets = card.querySelectorAll('.acxsl').length;
  return { none: false, appearance: s.appearance || s.webkitAppearance,
    bgAlpha: (window.__jd.parseRGB(s.backgroundColor) || { a: 1 }).a,
    border: s.borderTopWidth, height: Math.round(sel.getBoundingClientRect().height),
    caretW: caret ? caret.width : null, caretContent: caret ? caret.content : null, carets };
});
ok('the select has no native chrome',
  !D0.none && D0.appearance === 'none' && D0.bgAlpha === 0 && D0.border === '0px', JSON.stringify(D0));
ok('a caret is drawn on ALL FOUR rows — "a dropdown next to each"',
  !D0.none && D0.carets === 4 && D0.caretContent !== 'none' && parseFloat(D0.caretW) > 0,
  JSON.stringify({ rows: D0.carets, content: D0.caretContent, w: D0.caretW }));
ok('and it is still a 44px touch target', !D0.none && D0.height >= 40, JSON.stringify(D0.height));

const D1 = await P.page.evaluate(async () => {
  const card = window.__jd.card(); if (!card) return { none: true };
  const sel = card.querySelector('#acxWt'); if (!sel) return { none: true };
  const before = sel.value;
  sel.value = 'Repair';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1400));
  const after = window.__jd.card().querySelector('#acxWt');
  return { none: false, before, after: after ? after.value : null };
});
ok('changing Work Type still saves and survives the re-render',
  !D1.none && D1.before === 'New' && D1.after === 'Repair', JSON.stringify(D1));

console.log('\n--- E. Trade Type: one row, six trades behind it ---');
const E0 = await P.page.evaluate(() => {
  const card = window.__jd.card(); if (!card) return { none: true };
  const btn = card.querySelector('#acxTrBtn'), panel = card.querySelector('#acxTrPanel');
  if (!btn || !panel) return { none: true };
  const bs = getComputedStyle(btn), sel = card.querySelector('#acxCat');
  const ss = sel ? getComputedStyle(sel) : null;
  return { none: false, tag: btn.tagName, text: (btn.textContent || '').trim(),
    panelShut: getComputedStyle(panel).display === 'none',
    expanded: btn.getAttribute('aria-expanded'),
    /* it has to look like the other three, or it is not "a dropdown next to
       each" - same ink, same size, same absence of a box */
    sameInk: !!ss && bs.color === ss.color,
    sameFont: !!ss && bs.fontSize === ss.fontSize && bs.fontWeight === ss.fontWeight,
    noBox: bs.borderTopWidth === '0px' && (window.__jd.parseRGB(bs.backgroundColor) || { a: 1 }).a === 0 };
});
ok('Trade Type prints the trades on one line, the way AccuLynx does',
  !E0.none && E0.text === 'Roofing, Repairs', JSON.stringify(E0.text));
ok('it reads as the same control as the other three',
  !E0.none && E0.sameInk && E0.sameFont && E0.noBox, JSON.stringify(E0));
ok('and it starts shut', !E0.none && E0.panelShut && E0.expanded === 'false', JSON.stringify(E0));

const E1 = await P.page.evaluate(async () => {
  const card = window.__jd.card(); if (!card) return { none: true };
  const btn = card.querySelector('#acxTrBtn'); if (!btn) return { none: true };
  btn.click();
  await new Promise(r => setTimeout(r, 900));
  const c2 = window.__jd.card();
  const panel = c2.querySelector('#acxTrPanel');
  if (!panel) return { none: true };
  const on = panel.querySelector('.acxTr:checked'), off = panel.querySelector('.acxTr:not(:checked)');
  const cs = i => i ? getComputedStyle(i.nextElementSibling) : null;
  const a = cs(on), b = cs(off);
  const box = off ? getComputedStyle(off) : null;
  return { none: false, open: getComputedStyle(panel).display !== 'none',
    chips: panel.querySelectorAll('label').length,
    inputHidden: !!box && box.opacity === '0' && Math.round(parseFloat(box.width)) <= 2,
    chipTag: on ? on.nextElementSibling.tagName : null,
    onBg: a && a.backgroundColor, offBg: b && b.backgroundColor,
    onBd: a && a.borderTopColor, offBd: b && b.borderTopColor,
    onInk: a && a.color, offInk: b && b.color,
    minH: a ? Math.round(parseFloat(a.minHeight)) : null,
    /* the panel must sit in column 2 so the vertical rule is not broken */
    panelLeft: Math.round(panel.getBoundingClientRect().left),
    valueLeft: Math.round(window.__jd.valueCells()[0].getBoundingClientRect().left) };
});
ok('tapping it opens the six trades',
  !E1.none && E1.open && E1.chips === 6, JSON.stringify({ open: E1.open, chips: E1.chips }));
ok('they are chips — the native checkbox is hidden but still in the layout',
  !E1.none && E1.inputHidden && E1.chipTag === 'SPAN', JSON.stringify({ hidden: E1.inputHidden, tag: E1.chipTag }));
ok('a picked trade differs from an unpicked one in ground, border AND ink',
  !E1.none && E1.onBg !== E1.offBg && E1.onBd !== E1.offBd && E1.onInk !== E1.offInk,
  JSON.stringify({ on: [E1.onBg, E1.onBd, E1.onInk], off: [E1.offBg, E1.offBd, E1.offInk] }));
ok('the chips are a real tap target', !E1.none && E1.minH >= 32, JSON.stringify(E1.minH));
ok('the panel sits under the value column, so the rule is unbroken',
  !E1.none && E1.panelLeft === E1.valueLeft, JSON.stringify({ panel: E1.panelLeft, value: E1.valueLeft }));

const E2 = await P.page.evaluate(async () => {
  const card = window.__jd.card(); if (!card) return { none: true };
  const panel = card.querySelector('#acxTrPanel'); if (!panel) return { none: true };
  const sid = Array.from(panel.querySelectorAll('.acxTr')).find(x => x.value === 'Siding');
  if (!sid) return { none: true };
  const before = sid.checked;
  sid.closest('label').click();
  await new Promise(r => setTimeout(r, 1400));
  const c2 = window.__jd.card();
  const p2 = c2.querySelector('#acxTrPanel');
  const again = p2 ? Array.from(p2.querySelectorAll('.acxTr')).find(x => x.value === 'Siding') : null;
  const roofing = p2 ? Array.from(p2.querySelectorAll('.acxTr')).find(x => x.value === 'Roofing') : null;
  const btn = c2.querySelector('#acxTrBtn');
  return { none: false, before, after: again ? again.checked : null,
    roofingKept: roofing ? roofing.checked : null,
    summary: btn ? (btn.textContent || '').trim() : null,
    stillOpen: p2 ? getComputedStyle(p2).display !== 'none' : null };
});
ok('ticking a trade saves it and it comes back checked',
  !E2.none && E2.before === false && E2.after === true, JSON.stringify(E2));
ok('...without dropping the trades that were already on',
  !E2.none && E2.roofingKept === true, JSON.stringify(E2.roofingKept));
ok('the summary above updates to match',
  !E2.none && E2.summary === 'Roofing, Siding, Repairs', JSON.stringify(E2.summary));
ok('and the panel stays open through the save — the reason acxTrOpen is module state',
  !E2.none && E2.stillOpen === true, JSON.stringify(E2.stillOpen));

console.log('\n--- F. the rows are even ---');
const F = await P.page.evaluate(() => {
  const vals = window.__jd.valueCells(); if (!vals.length) return { none: true };
  const hs = vals.map(v => Math.round(v.getBoundingClientRect().height));
  return { none: false, hs, spread: Math.max(...hs) - Math.min(...hs) };
});
ok('all four rows are the same height', !F.none && F.spread <= 1, JSON.stringify(F));

console.log('\n--- G. contrast against the composited ground (' + THEME + ') ---');
const G = await P.page.evaluate(() => {
  const kv = window.__jd.kv(), card = window.__jd.card();
  if (!kv || !card) return { none: true };
  const panel = card.querySelector('#acxTrPanel');
  const on = panel && panel.querySelector('.acxTr:checked');
  const off = panel && panel.querySelector('.acxTr:not(:checked)');
  return { none: false,
    label:   window.__jd.contrast(kv.querySelector(':scope > span')),
    value:   window.__jd.contrast(card.querySelector('#acxCat')),
    trade:   window.__jd.contrast(card.querySelector('#acxTrBtn')),
    chipOn:  on ? window.__jd.contrast(on.nextElementSibling) : null,
    chipOff: off ? window.__jd.contrast(off.nextElementSibling) : null };
});
for (const k of ['label', 'value', 'trade', 'chipOn', 'chipOff']) {
  ok('  ' + k + ' clears the 4.5:1 body floor',
    !G.none && typeof G[k] === 'number' && G[k] >= 4.5, JSON.stringify(G[k]));
}
await P.browser.close();

console.log('\n--- H. insurance keeps its own card ---');
const H = await boot(402, 'insurance', THEME);
await H.page.evaluate(HELPERS);
const Hr = await H.page.evaluate(() => {
  const kv = window.__jd.kv();
  if (!kv) return { noCard: true };
  const v = kv.querySelector(':scope > div');
  return { noCard: false, ruleWidth: v ? getComputedStyle(v).borderLeftWidth : null };
});
ok('an insurance profile does NOT get the retail rule',
  Hr.noCard || Hr.ruleWidth === null || Hr.ruleWidth === '0px' || Hr.ruleWidth === 'medium',
  JSON.stringify(Hr));
await H.browser.close();

console.log('\n--- I. the desktop gets it too, and still does not wrap ---');
const I = await boot(1280, 'retail', THEME);
await I.page.evaluate(HELPERS);
const Ir = await I.page.evaluate(() => {
  const kv = window.__jd.kv(); if (!kv) return { none: true };
  const s = getComputedStyle(kv);
  const labels = Array.from(kv.querySelectorAll(':scope > span'));
  const v = window.__jd.valueCells()[0];
  return { none: false, colCount: s.gridTemplateColumns.split(' ').filter(Boolean).length,
    anyWrap: labels.some(e => e.scrollWidth > e.clientWidth + 1),
    labelW: labels.length ? Math.round(labels[0].getBoundingClientRect().width) : null,
    rule: v ? getComputedStyle(v).borderLeftWidth : null };
});
ok('two columns on the desktop as well',
  !Ir.none && Ir.colCount === 2 && Ir.rule === '1px', JSON.stringify(Ir));
ok('no label wraps at 1280px, and the label column stays narrow',
  !Ir.none && !Ir.anyWrap && Ir.labelW !== null && Ir.labelW < 220, JSON.stringify({ wrap: Ir.anyWrap, w: Ir.labelW }));
await I.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
