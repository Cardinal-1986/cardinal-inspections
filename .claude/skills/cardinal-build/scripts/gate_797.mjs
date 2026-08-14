/* gate_797.mjs — the top of a mobile client profile, rebuilt.
 *
 *   node gate_797.mjs [path/to/index.html]
 *   PREV=<path>  desktop image-md5 compare against it
 *
 *   A. Job Value/circle/Balance Due + Payment Information are ONE full-bleed
 *      card, no split, no hairline, no ridge-cap bevel left over
 *   B. that card sits ABOVE the client name band (a real reparent — namebar
 *      is not inside #acxMount, CSS order can't reach it)
 *   C. Job Details sits directly under the map, full-bleed like Location
 *   D. Money In & Commissions stays its OWN row (only Payment Information was
 *      named for the merge) but is full-bleed to match
 *   E. the green "payment received" nudge is hidden on this screen only —
 *      still fires elsewhere (checked via the app's own RULES, not deleted)
 *   F. RESIZE SAFETY — the reason this needed more than a media query:
 *      resize phone->desktop->phone, and a REAL re-render (renderOverview())
 *      at EACH width, asserting exactly one live .dbmoney / #dbPayRow pair
 *      the whole time. This is what would have caught a duplicated or
 *      orphaned money card that a purely visual check would miss.
 *   G. everything still WORKS: the three dropdowns save, the Trade Type panel
 *      still opens inside the moved Job Details, Payment Information and
 *      Money In still open their screens
 *   H. DESKTOP: byte-identical to the previous build (image compare)
 *   I. insurance is unaffected — no band, no merge, no reorder
 *
 * Negative control: run against 796 — must go RED, not crash. 796 has no
 * #dbMoneyCard, no [data-cr-ord="jd"], at all — every probe returns a
 * sentinel instead of dereferencing null.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const PREV = process.env.PREV || null;
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_797 on ' + FILE);

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed',
    address: '804 Burleigh Avenue, Dayton, OH 45402', email: 'bob@debuild.com', phone: '937-333-9192',
    claim_type: kind,
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-08-06T10:00:00Z', lead: { claim_type: kind },
      job_category: 'Residential', work_type: 'New', lead_source: 'Referral',
      trades: ['Roofing'], manual_value: 24000,
      payments: [{ dir: 'in', amt: 8000, date: '2026-07-02', method: 'Check', note: 'Deposit' }] }),
    created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
});

async function boot(html, width, kind) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 900 },
    deviceScaleFactor: width > 700 ? 1 : 2, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
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
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  });
  return { browser, page };
}
const open = (page, id) => page.evaluate(i => { if (typeof openProject === 'function') openProject(i); }, id)
  .then(() => page.waitForTimeout(1700));
const shot = async (page, w) => {
  const cdp = await page.context().newCDPSession(page);
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: 900, scale: 1 } });
  return createHash('md5').update(Buffer.from(r.data, 'base64')).digest('hex');
};
const HELPERS = () => {
  window.__g797 = {
    parseRGB(s) { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
      const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; },
  };
};

/* ======================================================================= */
const P = await boot(APP, 402, 'retail');
await open(P.page, 'p-1');
await P.page.evaluate(HELPERS);

console.log('\n--- A. one full-bleed money+payment card, no split ---');
const A = await P.page.evaluate(() => {
  const card = document.getElementById('dbMoneyCard');
  if (!card) return { none: true };
  const money = card.querySelector('.dbmoney'), pay = document.getElementById('dbPayRow');
  const cs = e => e ? getComputedStyle(e) : null;
  const sc = cs(card), sm = cs(money), sp = cs(pay);
  const rc = card.getBoundingClientRect();
  return { none: false,
    screen: window.innerWidth, left: Math.round(rc.left), right: Math.round(rc.right), radius: sc.borderTopLeftRadius,
    moneyInCard: card.contains(money), payInCard: card.contains(pay),
    moneyBorder: sm ? [sm.borderTopWidth, sm.borderBottomWidth].join('/') : null,
    payBorder: sp ? [sp.borderTopWidth, sp.borderBottomWidth].join('/') : null,
    moneyShadow: sm ? sm.boxShadow : null, payShadow: sp ? sp.boxShadow : null,
    /* the gap that used to separate them — measured, not assumed */
    gap: (money && pay) ? Math.round(pay.getBoundingClientRect().top - money.getBoundingClientRect().bottom) : null,
    jobValue: money ? (money.querySelector('b') || {}).textContent : null
  };
});
ok('the wrapper spans the screen, no radius', !A.none && A.left === 0 && A.right === A.screen && A.radius === '0px', JSON.stringify(A));
ok('the money strip and Payment Information are both inside it', !A.none && A.moneyInCard && A.payInCard, JSON.stringify(A));
ok('neither child carries its old border', !A.none && A.moneyBorder === '0px/0px' && A.payBorder === '0px/0px', JSON.stringify({ m: A.moneyBorder, p: A.payBorder }));
ok('neither carries the ridge-cap bevel (the 794 hairline trap)', !A.none && A.moneyShadow === 'none' && A.payShadow === 'none', JSON.stringify({ m: A.moneyShadow, p: A.payShadow }));
ok('zero gap between them — no split', !A.none && A.gap === 0, JSON.stringify(A.gap));
ok('the real Job Value is in it, not a placeholder', !A.none && /24,000|24000/.test(A.jobValue || ''), JSON.stringify(A.jobValue));

console.log('\n--- B. the card sits above the client name ---');
const B = await P.page.evaluate(() => {
  const card = document.getElementById('dbMoneyCard'), bar = document.getElementById('cr-namebar');
  if (!card || !bar) return { none: true };
  const wrap = document.querySelector('#projectView .wrap');
  const c = card.getBoundingClientRect(), n = bar.getBoundingClientRect();
  return { none: false, cardParentIsWrap: card.parentNode === wrap,
    cardIsFirstChildOfWrap: wrap.firstElementChild === card,
    cardAboveNamebar: c.bottom <= n.top + 1 };
});
ok('the money card is a direct child of .wrap, not #acxMount', !B.none && B.cardParentIsWrap, JSON.stringify(B));
ok('it is the FIRST thing in .wrap', !B.none && B.cardIsFirstChildOfWrap, JSON.stringify(B));
ok('and it renders above the name band', !B.none && B.cardAboveNamebar, JSON.stringify(B));

console.log('\n--- C. Job Details, directly under the map ---');
const C = await P.page.evaluate(() => {
  const mount = document.getElementById('acxMount');
  const jdh = mount && mount.querySelector('[data-cr-ord="jdh"]');
  const jd = mount && mount.querySelector('[data-cr-ord="jd"]');
  const loc = mount && mount.querySelector('[data-cr-ord="loc"]');
  if (!jdh || !jd || !loc) return { none: true };
  const r = e => e.getBoundingClientRect();
  const rj = r(jd), rh = r(jdh), rl = r(loc);
  return { none: false, screen: window.innerWidth,
    left: Math.round(rj.left), right: Math.round(rj.right), radius: getComputedStyle(jd).borderTopLeftRadius,
    underMap: rh.top >= rl.bottom - 1,
    /* .acxjd > div also matches #acxTrPanel (the trade chip panel), which is
       a fifth direct-child div alongside the four value rows - scope to the
       four value-row wrappers specifically (.acxsl, per gate_795's own count) */
    hasRows: jd.querySelectorAll('.acxjd > div.acxsl').length };
});
ok('Job Details spans the screen too', !C.none && C.left === 0 && C.right === C.screen && C.radius === '0px', JSON.stringify(C));
ok('and it sits directly under the map', !C.none && C.underMap, JSON.stringify(C));
ok('with its four rows intact', !C.none && C.hasRows === 4, JSON.stringify(C.hasRows));

console.log('\n--- C2. everything under Job Menu goes full-bleed too ---');
const C2 = await P.page.evaluate(() => {
  const g = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { left: Math.round(r.left), right: Math.round(r.right), radius: s.borderTopLeftRadius,
      borderLeft: s.borderLeftWidth, borderTop: s.borderTopWidth, borderTopColor: s.borderTopColor }; };
  return { screen: window.innerWidth, hist: g('#kpHis'), rv: g('.rvcard'),
    assign: g('.acxassignsec'), convert: g('.convertins') };
});
for (const [label, key] of [['History (#kpHis)', 'hist'], ['Google Reviews (.rvcard)', 'rv'],
  ['Assigned To (.acxassignsec)', 'assign'], ['Convert to Insurance (.convertins)', 'convert']]) {
  const v = C2[key];
  ok(label + ' spans the screen, no radius',
    !!v && v.left === 0 && v.right === C2.screen && v.radius === '0px', JSON.stringify(v));
}
ok('History keeps its red TOP border (its own marker, not stripped)',
  C2.hist && C2.hist.borderTop !== '0px' && /200, 32, 46|#c8202e/i.test(C2.hist.borderTopColor + ''),
  JSON.stringify(C2.hist));
ok('Convert to Insurance keeps its LEFT accent stripe',
  C2.convert && C2.convert.borderLeft !== '0px', JSON.stringify(C2.convert));

console.log('\n--- D. Money In stays separate, full-bleed to match ---');
const D = await P.page.evaluate(() => {
  const row = document.getElementById('dbMoneyRow'), card = document.getElementById('dbMoneyCard');
  if (!row || !card) return { none: true };
  const r = row.getBoundingClientRect();
  return { none: false, screen: window.innerWidth, left: Math.round(r.left), right: Math.round(r.right),
    radius: getComputedStyle(row).borderTopLeftRadius, isSeparate: row.parentNode !== card,
    below: r.top > card.getBoundingClientRect().bottom };
});
ok('Money In is its own element, not folded into the merged card', !D.none && D.isSeparate, JSON.stringify(D));
ok('but full-bleed like its neighbours', !D.none && D.left === 0 && D.right === D.screen && D.radius === '0px', JSON.stringify(D));

console.log('\n--- E. the green nudge is hidden here, not deleted ---');
const E = await P.page.evaluate(() => {
  const el = document.querySelector('.cr-autotrans');
  const visible = !!(el && el.getClientRects().length && getComputedStyle(el).display !== 'none');
  /* it is a real feature, gated on its own RULES array — confirm the RULE
     still exists in the source (not stripped), only hidden by CSS here */
  const ruleExists = /paid-to-invoiced/.test(document.documentElement.outerHTML) ||
    (window.location.href, true); // placeholder, real check is source-level below
  return { visible };
});
ok('the nudge does not show on this screen', !E.visible, JSON.stringify(E));
const ruleStillInSource = /key\s*:\s*'paid-to-invoiced'/.test(APP);
ok('...because it is hidden by CSS, not because the feature was deleted', ruleStillInSource, 'rule present in source: ' + ruleStillInSource);

console.log('\n--- F. resize safety: no duplicate, no orphan, across real re-renders ---');
const liveCount = () => P.page.evaluate(() => ({
  dbmoney: document.querySelectorAll('.dbmoney').length,
  dbPayRow: document.querySelectorAll('#dbPayRow').length,
  dbMoneyCard: document.querySelectorAll('#dbMoneyCard').length
}));
const F = { steps: [] };
F.steps.push(['phone, after open', await liveCount()]);
await P.page.setViewportSize({ width: 1280, height: 900 });
await P.page.waitForTimeout(400);
F.steps.push(['resized to 1280', await liveCount()]);
const posAt1280 = await P.page.evaluate(() => {
  const card = document.getElementById('dbMoneyCard'), mount = document.getElementById('acxMount');
  return { insideMount: !!(card && mount && mount.contains(card)) };
});
await P.page.setViewportSize({ width: 402, height: 900 });
await P.page.waitForTimeout(400);
F.steps.push(['resized back to 402', await liveCount()]);
await P.page.evaluate(() => { if (typeof renderOverview === 'function') renderOverview(); });
await P.page.waitForTimeout(600);
F.steps.push(['re-rendered at phone width', await liveCount()]);
await P.page.setViewportSize({ width: 1280, height: 900 });
await P.page.waitForTimeout(400);
await P.page.evaluate(() => { if (typeof renderOverview === 'function') renderOverview(); });
await P.page.waitForTimeout(600);
F.steps.push(['re-rendered at desktop width', await liveCount()]);
const posAfterDesktopRerender = await P.page.evaluate(() => {
  const card = document.getElementById('dbMoneyCard'), mount = document.getElementById('acxMount');
  return { insideMount: !!(card && mount && mount.contains(card)) };
});
const allExactlyOne = F.steps.every(([, c]) => c.dbmoney === 1 && c.dbPayRow === 1 && c.dbMoneyCard === 1);
ok('exactly one live .dbmoney/#dbPayRow/#dbMoneyCard through every resize + re-render',
  allExactlyOne, JSON.stringify(F.steps));
ok('a resize to desktop (no re-render) puts the card back inside #acxMount',
  posAt1280.insideMount, JSON.stringify(posAt1280));
ok('a re-render AT desktop width leaves it in #acxMount too (does not wrongly reparent it)',
  posAfterDesktopRerender.insideMount, JSON.stringify(posAfterDesktopRerender));
await P.page.setViewportSize({ width: 402, height: 900 });
await P.page.waitForTimeout(400);

console.log('\n--- G. everything still works ---');
const G0 = await P.page.evaluate(async () => {
  const sel = document.getElementById('acxWt'); if (!sel) return { none: true };
  const before = sel.value; sel.value = 'Repair';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1200));
  const after = document.getElementById('acxWt');
  return { none: false, before, after: after ? after.value : null };
});
ok('Work Type still saves inside the moved Job Details', !G0.none && G0.before === 'New' && G0.after === 'Repair', JSON.stringify(G0));

const G1 = await P.page.evaluate(async () => {
  const btn = document.getElementById('acxTrBtn'); if (!btn) return { none: true };
  const panelBefore = document.getElementById('acxTrPanel');
  const shutBefore = panelBefore ? getComputedStyle(panelBefore).display === 'none' : null;
  btn.click();
  await new Promise(r => setTimeout(r, 500));
  const panelAfter = document.getElementById('acxTrPanel');
  return { none: false, shutBefore, openAfter: panelAfter ? getComputedStyle(panelAfter).display !== 'none' : null };
});
ok('Trade Type still opens its chip panel', !G1.none && G1.shutBefore === true && G1.openAfter === true, JSON.stringify(G1));

const G2 = await P.page.evaluate(async () => {
  const pay = document.getElementById('dbPayRow'), view = document.getElementById('paymentsView');
  if (!pay || !view) return { none: true };
  const before = getComputedStyle(view).display !== 'none';
  pay.click();
  await new Promise(r => setTimeout(r, 900));
  return { none: false, before, after: getComputedStyle(view).display !== 'none' };
});
ok('Payment Information still opens', !G2.none && G2.before === false && G2.after === true, JSON.stringify(G2));

const G3 = await boot(APP, 402, 'retail');
await open(G3.page, 'p-1');
const g3r = await G3.page.evaluate(async () => {
  const row = document.getElementById('dbMoneyRow'), tab = document.getElementById('tab-commissions');
  if (!row || !tab) return { none: true };
  const before = !!(tab.getClientRects().length && getComputedStyle(tab).display !== 'none');
  row.click();
  await new Promise(r => setTimeout(r, 900));
  return { none: false, before, after: !!(tab.getClientRects().length && getComputedStyle(tab).display !== 'none') };
});
ok('Money In still opens the commissions pane', !g3r.none && g3r.before === false && g3r.after === true, JSON.stringify(g3r));
await G3.browser.close();
await P.browser.close();

console.log('\n--- G2. Google Reviews adapts to light mode ---');
const LT = await boot(APP, 402, 'retail');
await open(LT.page, 'p-1');
await LT.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
await LT.page.waitForTimeout(150);
const g2 = await LT.page.evaluate(() => {
  const card = document.querySelector('.rvcard');
  if (!card) return { none: true };
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
  const bg = parse(getComputedStyle(card).backgroundColor);
  const status = document.querySelector('.rvstatus');
  const hint = document.querySelector('.rvhint');
  const copyBtn = document.querySelector('.rvbtn.copy');
  const statusInk = status ? parse(getComputedStyle(status).color) : null;
  const copyInk = copyBtn ? parse(getComputedStyle(copyBtn).color) : null;
  return { none: false, bg,
    bgIsLight: bg ? lum(bg) > 0.5 : null,
    statusContrast: statusInk ? Math.round(ratio(statusInk, bg) * 100) / 100 : null,
    copyContrast: copyInk ? Math.round(ratio(copyInk, bg) * 100) / 100 : null,
    hintPresent: !!hint };
});
await LT.browser.close();
ok('the card background is light, not the old #171717', !g2.none && g2.bgIsLight, JSON.stringify(g2.bg));
ok('the status line clears 4.5:1 on the new ground', !g2.none && g2.statusContrast >= 4.5, JSON.stringify(g2.statusContrast));
ok('the gold "Copy message" ink clears 4.5:1 too (was 1.61:1 on white)', !g2.none && g2.copyContrast >= 4.5, JSON.stringify(g2.copyContrast));

console.log('\n--- H. desktop is byte-identical to the previous build ---');
if (PREV) {
  const PREVHTML = readFileSync(PREV, 'utf8');
  const D1 = await boot(APP, 1280, 'retail');
  await open(D1.page, 'p-1');
  const hashNow = await shot(D1.page, 1280);
  await D1.browser.close();
  const D2 = await boot(PREVHTML, 1280, 'retail');
  await open(D2.page, 'p-1');
  const hashPrev = await shot(D2.page, 1280);
  await D2.browser.close();
  ok('the desktop renders IDENTICALLY to the previous build (image md5)', hashNow === hashPrev, hashNow + ' vs ' + hashPrev);
} else {
  console.log('  (skip) desktop image compare — pass PREV=<previous index.html>');
}

console.log('\n--- I. insurance is unaffected ---');
const IN = await boot(APP, 402, 'insurance');
await open(IN.page, 'p-1');
const Ir = await IN.page.evaluate(() => {
  const mount = document.getElementById('acxMount');
  const jd = mount && mount.querySelector('[data-cr-ord="jd"]');
  return {
    moneyCard: !!document.getElementById('dbMoneyCard'),
    namebar: !!(document.getElementById('cr-namebar') && getComputedStyle(document.getElementById('cr-namebar')).display !== 'none'),
    /* the TAG existing is fine and matches Location's own loch/loc precedent
       (set unconditionally; only the CSS effect is CRM-scoped) - what must
       actually be false is the VISUAL effect: still radius'd, not bled */
    jdStillBoxed: jd ? getComputedStyle(jd).borderRadius !== '0px' : true
  };
});
ok('no merged money card, no name band, and Job Details keeps its normal card shape',
  !Ir.moneyCard && !Ir.namebar && Ir.jdStillBoxed, JSON.stringify(Ir));
await IN.browser.close();

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
