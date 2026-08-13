/* gate_779.mjs — the roofing agreement's spec sheet, laid out like the master.
 *
 *   node gate_779.mjs [path/to/index.html] [--shot out.png]
 *
 * Renders the REAL contract template in Chromium at Letter width and proves:
 *   - two columns, with the house diagram in the right one;
 *   - every lettered option has a tappable box, including the six decking
 *     types and the two ridge-vent choices that used to be plain text;
 *   - the four dropdown kinds populate (style from the OC hub's own lines,
 *     colour from the colour wall, brand = Owens Corning with NO competitor
 *     named, quantities 0..13+);
 *   - a picked value survives a save — i.e. it lands as the `selected`
 *     ATTRIBUTE, not just the live property (the 750 trap);
 *   - ticking is exclusive within a group and free where the master allows
 *     more than one;
 *   - the checklist's decking type arrives already ticked.
 *
 * Negative control: run against 778 — must go RED, not crash.
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
const argv = process.argv.slice(2);
const shotIx = argv.indexOf('--shot');
const SHOT = shotIx > -1 ? argv[shotIx + 1] : null;
const FILE = (argv[0] && argv[0] !== '--shot') ? argv[0] : ROOT + '/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_779 on ' + FILE);

const OC_COLORS = [
  { name: 'Estate Gray', status: 'active', product_line: 'duration', family: 'gray', hidden: false },
  { name: 'Brownwood', status: 'active', product_line: 'duration', family: 'brown', hidden: false },
  { name: 'Sand Dune', status: 'discontinued', product_line: 'duration', family: 'tan', hidden: false },
  { name: 'Black Sable', status: 'active', product_line: 'designer', family: 'black', hidden: false }
];
const SEED = () => ({
  projects: [{ id: 'p-1', name: 'James Tiege', stage: 'Prospect', address: '2205 Rosemont Blvd, Dayton, OH 45420',
    email: 'jt@example.com', phone: '937-555-0100',
    checklist: JSON.stringify({ decking: 'Plywood', layers: '2 Layers', pitch: '6/12' }),
    created_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' }],
  oc_colors: OC_COLORS,
  project_photos: [], estimates: [], inspection_reports: [], punch_items: [], appointments: [],
  team_profiles: [], pricing_items: [], pricing_categories: []
});

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
page.on('dialog', async d => { await d.accept(); });
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'font' || rt === 'media') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED());
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none'; });
await page.evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); });
await page.waitForTimeout(1200);

/* Create the roofing agreement through the app's own path. */
await page.evaluate(() => {
  if (typeof createContractForCurrent === 'function') createContractForCurrent('roof');
});
await page.waitForTimeout(4000);
const frameReady = await page.evaluate(() => {
  const f = document.getElementById('reportFrame');
  return !!(f && f.contentDocument && f.contentDocument.querySelector('.specgrid, table.meta'));
});
ok('the roofing agreement opened in the editor', frameReady);

const doc = page.frameLocator('#reportFrame');
const S = async fn => page.evaluate(fn);

console.log('\n--- 1. the layout ---');
const L = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const grid = d.querySelector('.specgrid');
  if (!grid) return { none: true };
  const cols = d.querySelectorAll('.specgrid > .speccol');
  const fig = d.querySelector('.specgrid .roofdiag');
  const cs = getComputedStyle(grid);
  const secs = [].map.call(d.querySelectorAll('.specsec h3'), h => h.textContent.trim());
  const inRight = !!(fig && fig.closest('.speccol') === cols[1]);
  return { none: false, cols: cols.length, twoCol: /\S+\s+\S+/.test(cs.gridTemplateColumns),
    figInRight: inRight, secs, headColor: secs.length ? getComputedStyle(d.querySelector('.specsec h3')).color : null };
});
ok('the spec sheet is a two-column grid', !L.none && L.cols === 2 && L.twoCol, JSON.stringify({ cols: L.cols, tpl: L.twoCol }));
ok('the house diagram sits in the right column, beside its numbered items', !!L.figInRight);
ok('all thirteen numbered sections are present, plus Extra Structure',
  !L.none && L.secs.length === 14 && /^1\. Decking/.test(L.secs[0]) && /13\. Roof Pitch/.test(L.secs[L.secs.length - 1]),
  JSON.stringify(L.secs));
ok('section headings are Cardinal red', L.headColor === 'rgb(200, 32, 46)', L.headColor);

console.log('\n--- 2. a box on every lettered option ---');
const B = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const grp = g => d.querySelectorAll('.cbx[data-group="' + g + '"]').length;
  return { decking: grp('rdk'), vent: grp('rvt'), rdp: grp('rdp'), riw: grp('riw'),
           rst: grp('rst'), rrc: grp('rrc'),
           flashing: d.querySelectorAll('.specsec .cbx:not([data-group])').length,
           /* .opts is the blank line; .fill is the SAME row once the checklist
              has answered it (750's collapse). This seed carries both values,
              so the honest assertion is "two such rows exist, filled or not" —
              asserting .opts alone reds on correct behaviour. */
           opts: d.querySelectorAll('.specgrid .opts, .specgrid .fill').length,
           filled: [].map.call(d.querySelectorAll('.specgrid .fill'), n => n.textContent.trim()),
           lettersWithoutBox: (function () {
             /* every "A." / "1." label inside the grid must be inside a .sopt or a .specline */
             let bad = 0;
             d.querySelectorAll('.specgrid .soptrow').forEach(r => {
               r.querySelectorAll('.sopt').forEach(s => { if (!s.querySelector('.cbx')) bad++; });
             });
             return bad;
           })() };
});
ok('the six decking types are tick boxes', B.decking === 6, B.decking);
ok('the two ridge-vent choices are tick boxes', B.vent === 2, B.vent);
ok('deck protection / ice & water / starter / ridge cap keep theirs',
  B.rdp === 3 && B.riw === 2 && B.rst === 2 && B.rrc === 4,
  JSON.stringify([B.rdp, B.riw, B.rst, B.rrc]));
ok('flashing and extra structure are multi-pick (ungrouped)', B.flashing === 6, B.flashing);
ok('no option row carries a label without a box', B.lettersWithoutBox === 0, B.lettersWithoutBox);
ok('layers and pitch stay single fill-in lines, as on the master', B.opts === 2, B.opts);
ok('and they arrive filled when the roofing checklist already answered them',
  B.filled.length === 2 && B.filled.indexOf('2 Layers') > -1 && B.filled.indexOf('6/12') > -1,
  JSON.stringify(B.filled));

console.log('\n--- 3. the dropdowns ---');
const D = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const of = k => [].map.call(d.querySelectorAll('select[data-crsel="' + k + '"]'),
    s => [].map.call(s.options, o => o.textContent));
  return { style: of('style'), brand: of('brand'), occ: of('occ'), qty: of('qty'), trim: of('trim') };
});
ok('Style offers the OC lines the colour wall itself sells',
  D.style.length === 1 && D.style[0].some(t => /Duration/.test(t)) && D.style[0].some(t => /Oakridge/.test(t)),
  JSON.stringify(D.style));
ok('Brand offers Owens Corning', D.brand.length === 1 && D.brand[0].some(t => /Owens Corning/.test(t)), JSON.stringify(D.brand));
ok('Brand names NO competitor (OC_BRAND_RULES)',
  D.brand.length === 1 && !D.brand[0].some(t => /(GAF|CertainTeed|Atlas|Malarkey|TAMKO|IKO)/i.test(t)),
  JSON.stringify(D.brand));
ok('Colour still reads the colour wall, discontinued badged',
  D.occ.length === 1 && D.occ[0].some(t => /Estate Gray/.test(t)) && D.occ[0].some(t => /discontinued/.test(t)),
  JSON.stringify(D.occ));
ok('six quantity dropdowns, 0 through 13+',
  D.qty.length === 6 && D.qty.every(o => o.indexOf('0') > -1 && o.indexOf('13+') > -1), D.qty.length);
ok('the two trim colour dropdowns are untouched (750)',
  D.trim.length === 3 && D.trim[0].some(t => /Musket Brown/.test(t)), D.trim.length);

if (SHOT) {   /* before ANY test interaction: the preview must be a clean sheet */
  /* Screenshot the DOCUMENT, not the iframe element: Playwright's element
     screenshot waits on the frame's own document.fonts, which the init-script
     stub never reached (it patched the top document only) and which therefore
     never settles. Rendering the contract HTML standalone is also the truer
     preview — it is exactly what gets printed and emailed. */
  const html = await S(() => document.getElementById('reportFrame').contentDocument.documentElement.outerHTML);
  const shot = await ctx.newPage();
  await shot.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.fulfill({ status: 200, body: '' }));
  await shot.setViewportSize({ width: 900, height: 1400 });
  await shot.setContent(html, { waitUntil: 'domcontentloaded' });
  await shot.waitForTimeout(900);
  await shot.screenshot({ path: SHOT, fullPage: true });
  await shot.close();
  console.log('\nwrote ' + SHOT);
}

console.log('\n--- 4. a pick has to survive the save ---');
const P = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const s = d.querySelector('select[data-crsel="qty"]');
  if (!s) return { missing: true };       /* the control run has none — report, never throw */
  s.value = '4';
  s.dispatchEvent(new Event('change', { bubbles: true }));
  const clone = s.cloneNode(true);        /* what serializeFrame() actually keeps */
  const chosen = clone.querySelector('option[selected]');
  return { live: s.value, survives: chosen ? chosen.value : null };
});
ok('the picked quantity is written as the selected ATTRIBUTE, so a clone keeps it',
  P.live === '4' && P.survives === '4', JSON.stringify(P));

console.log('\n--- 5. ticking behaves ---');
const T = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const boxes = d.querySelectorAll('.cbx[data-group="rdk"]');
  const free = d.querySelectorAll('.specsec .cbx:not([data-group])');
  if (boxes.length < 3 || free.length < 2) return { missing: true, grouped: [], freeBoth: false };
  boxes[0].click(); boxes[2].click();     /* exclusive: only the last stays */
  const after = [].map.call(boxes, b => b.textContent);
  free[0].click(); free[1].click();       /* flashing: chimney AND wall */
  return { grouped: after, freeBoth: free[0].textContent === '☑' && free[1].textContent === '☑' };
});
ok('a grouped row keeps exactly one tick', T.grouped.filter(t => t === '☑').length === 1, JSON.stringify(T.grouped));
ok('flashing lets you tick more than one', !!T.freeBoth);

console.log('\n--- 6. the checklist prefill ---');
const K = await S(() => {
  const d = document.getElementById('reportFrame').contentDocument;
  const src = d.documentElement.outerHTML;
  return { ticked: (src.match(/data-val="[^"]*"[^>]*>☑/g) || []).length,
           html: (window.__SEED__.inspection_reports[0] || {}).html || '' };
});
ok('the saved template arrives with the checklist decking type already ticked',
  /data-group="rdk" data-val="Plywood">&#9745;/.test(K.html) || /data-val="Plywood">☑/.test(K.html),
  K.html ? K.html.slice(K.html.indexOf('data-val="Plywood"') - 60, K.html.indexOf('data-val="Plywood"') + 60) : 'no saved html');

console.log('\n--- 7. source-level ---');
ok('the OC hub exposes its lines rather than the contract restating them',
  APP_HTML.indexOf('lines: function(){') > -1 && APP_HTML.indexOf('CardinalColors.lines()') > -1);
ok('only lines the hub is ready to sell are offered', APP_HTML.indexOf('L.ready !== false') > -1);
ok('the decking prefill ticks a box instead of collapsing a text span',
  APP_HTML.indexOf('data-opts="decking"') === -1 && APP_HTML.indexOf('(function(deck){') > -1);



await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
