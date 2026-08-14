/* gate_791.mjs — the client band, phone only.
 *
 *   node gate_791.mjs [path/to/index.html]
 *
 *   A. PHONE: the band replaces the old card, name + star, PO + pencil, and
 *      only the contact channels that actually exist;
 *   B. PHONE: the Overview dropdown and the ALL chip are gone on a profile,
 *      and still present when you are NOT on one;
 *   C. PHONE: pipeline bar directly under the band, edge to edge, then the map;
 *   D. the pencil OPENS THE EDIT FORM — it never did before this build;
 *   E. DESKTOP: byte-identical rendering to the previous build (image compare);
 *   F. insurance keeps its own card, adjuster rows and all.
 *
 * Negative control: run against 790 — must go RED, not crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const PREV = process.env.PREV || null;      /* for the desktop image compare */
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_791 on ' + FILE);

const mkSeed = kind => ({
  projects: [{ id: 'p-1', name: 'Bob DeBuilder', stage: 'Completed',
    address: '921 Testing Way, Dayton, OH 45420', email: 'bob@debuild.com', phone: '937-333-9192',
    /* projClaimType() reads the CHECKLIST's lead.claim_type, not a column of
       that name — an earlier seed set only the column and every project came
       back "unknown", so the insurance case was never actually exercised. */
    claim_type: kind,
    checklist: JSON.stringify({ po: 1032, stage_since: '2026-08-06T10:00:00Z', lead: { claim_type: kind } }),
    created_at: '2026-07-20T10:00:00Z', created_by: 'theo@cardinalrenovations.net' },
    /* a client with NO email and NO phone: the band must not draw dead buttons */
    { id: 'p-2', name: 'No Contact Ltd', stage: 'Lead', address: '1 Nowhere', claim_type: kind,
      checklist: JSON.stringify({ lead: { claim_type: kind } }), created_at: '2026-07-21T10:00:00Z', created_by: 'theo@cardinalrenovations.net' }],
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

console.log('\n--- A/B/C. the phone ---');
const P = await boot(APP, 402, 'retail');
/* before opening a client: the header controls must still be there */
const beforeOpen = await P.page.evaluate(() => {
  const vis = id => { const e = document.getElementById(id);
    return !!(e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'); };
  return { portal: vis('crPortalChip'), overview: vis('jobMenuSel'), projopen: document.body.classList.contains('projopen') };
});
await open(P.page, 'p-1');
const m = await P.page.evaluate(() => {
  const b = document.getElementById('cr-namebar');
  const cs = e => e ? getComputedStyle(e) : null;
  const r = e => { if (!e) return null; const q = e.getBoundingClientRect();
    return { left: Math.round(q.left), right: Math.round(q.right), top: Math.round(q.top) }; };
  const mount = document.getElementById('acxMount');
  const stage = mount && mount.querySelector('[data-cr-ord="stage"]');
  const loc = mount && mount.querySelector('[data-cr-ord="loc"]');
  const vis = id => { const e = document.getElementById(id);
    return !!(e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'); };
  const order = e => e ? getComputedStyle(e).order : null;
  return {
    bandShown: !!(b && cs(b).display !== 'none'),
    band: r(b), screen: window.innerWidth,
    name: b && b.querySelector('.nb-nm') ? b.querySelector('.nb-nm').textContent : null,
    star: !!(b && b.querySelector('[data-cr-fav]')),
    po: b && b.querySelector('.nb-po') ? b.querySelector('.nb-po').textContent : null,
    pencil: !!(b && b.querySelector('[data-cr-edit]')),
    icons: b ? [...b.querySelectorAll('.nb-ico')].map(a => a.getAttribute('href').split(':')[0]) : [],
    oldCard: !!(document.querySelector('#projectView .projinfo') || {}).offsetParent,
    portal: vis('crPortalChip'), overview: vis('jobMenuSel'),
    stageOrder: order(stage), locOrder: order(loc),
    stageBox: r(stage), locTop: loc ? Math.round(loc.getBoundingClientRect().top) : null,
    switchPrimary: !!document.querySelector('#projectView .projinfo #dbSwitchPrim')
      && !!(document.querySelector('#projectView .projinfo') || {}).offsetParent
  };
});
ok('the band is shown and the old card is not', m.bandShown && m.oldCard === false, JSON.stringify({ band: m.bandShown, old: m.oldCard }));
ok('it spans the whole screen', m.band && m.band.left === 0 && m.band.right === m.screen, JSON.stringify(m.band));
ok('name, star, PO and pencil are all in it',
  m.name === 'Bob DeBuilder' && m.star && /1032/.test(m.po || '') && m.pencil,
  JSON.stringify({ name: m.name, star: m.star, po: m.po, pencil: m.pencil }));
ok('email, text and call are the three actions',
  JSON.stringify(m.icons) === '["mailto","sms","tel"]', JSON.stringify(m.icons));
ok('Switch Primary is gone from view', m.switchPrimary === false);
ok('the Overview dropdown and ALL chip are hidden on a profile', !m.portal && !m.overview, JSON.stringify({ portal: m.portal, overview: m.overview }));
ok('...and they were there before opening a client', beforeOpen.portal || beforeOpen.overview, JSON.stringify(beforeOpen));
ok('the pipeline bar is ordered first and bleeds edge to edge',
  m.stageOrder === '1' && m.stageBox && m.stageBox.left === 0 && m.stageBox.right === m.screen,
  JSON.stringify({ order: m.stageOrder, box: m.stageBox }));
ok('the map card comes next', m.locOrder === '3' && m.locTop > m.stageBox.top, JSON.stringify({ locOrder: m.locOrder }));

console.log('\n--- D. the pencil actually opens the editor ---');
const pen = await P.page.evaluate(async () => {
  const modal = document.getElementById('projModal');
  const before = modal ? getComputedStyle(modal).display : null;
  /* returns instead of throwing: on the previous build there is no band at
     all, and a negative control has to report RED rather than blow up */
  const btn = document.querySelector('#cr-namebar [data-cr-edit]');
  if(!btn) return { noPencil: true, before, after: before };
  btn.click();
  await new Promise(r => setTimeout(r, 700));
  return { before, after: modal ? getComputedStyle(modal).display : null };
});
ok('tapping the pencil opens the edit form', pen.before === 'none' && pen.after !== 'none', JSON.stringify(pen));

console.log('\n--- a client with no phone and no email ---');
await P.page.evaluate(() => { const m2 = document.getElementById('projModal'); if (m2) m2.style.display = 'none'; });
await open(P.page, 'p-2');
const none = await P.page.evaluate(() => {
  const b = document.getElementById('cr-namebar');
  return { icons: b ? b.querySelectorAll('.nb-ico').length : -1,
           name: b && b.querySelector('.nb-nm') ? b.querySelector('.nb-nm').textContent : null };
});
ok('draws no dead contact buttons', none.icons === 0 && none.name === 'No Contact Ltd', JSON.stringify(none));
await P.browser.close();

console.log('\n--- F. insurance keeps its own card ---');
const I = await boot(APP, 402, 'insurance');
await open(I.page, 'p-1');
const ins = await I.page.evaluate(() => ({
  bodyClass: document.body.className,
  claimType: (typeof projClaimType === 'function' && window.currentProject) ? projClaimType(window.currentProject) : 'n/a',
  oldCard: !!(document.querySelector('#projectView .projinfo') || {}).offsetParent,
  band: !!(document.getElementById('cr-namebar') && getComputedStyle(document.getElementById('cr-namebar')).display !== 'none')
}));
ok('an insurance profile keeps its card and shows no band', ins.oldCard === true && ins.band === false, JSON.stringify(ins));
await I.browser.close();

console.log('\n--- E. the desktop is unchanged ---');
const D = await boot(APP, 1280, 'retail');
await open(D.page, 'p-1');
const deskNow = await shot(D.page, 1280);
const dm = await D.page.evaluate(() => {
  const vis = id => { const e = document.getElementById(id);
    return !!(e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'); };
  const mount = document.getElementById('acxMount');
  return { band: !!(document.getElementById('cr-namebar') && getComputedStyle(document.getElementById('cr-namebar')).display !== 'none'),
           oldCard: !!(document.querySelector('#projectView .projinfo') || {}).offsetParent,
           portal: vis('crPortalChip'), overview: vis('jobMenuSel'),
           mountDisplay: mount ? getComputedStyle(mount).display : null };
});
await D.browser.close();
ok('no band on the desktop', dm.band === false);
ok('the old card, Overview dropdown and ALL chip are all still there',
  dm.oldCard && dm.portal && dm.overview, JSON.stringify(dm));
ok('#acxMount is still a plain block (no reorder)', dm.mountDisplay === 'block', dm.mountDisplay);
if (PREV) {
  const P2 = await boot(readFileSync(PREV, 'utf8'), 1280, 'retail');
  await open(P2.page, 'p-1');
  const deskPrev = await shot(P2.page, 1280);
  await P2.browser.close();
  ok('the desktop renders IDENTICALLY to the previous build (image md5)',
    deskNow === deskPrev, deskNow.slice(0, 12) + ' vs ' + deskPrev.slice(0, 12));
} else {
  console.log('  (skip) desktop image compare — pass PREV=<previous index.html>');
}

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
