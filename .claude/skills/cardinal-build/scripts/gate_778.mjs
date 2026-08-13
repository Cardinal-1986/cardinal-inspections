/* gate_778.mjs — Select all in the CompanyCam picker, and the profile photo
 * count that stayed at 0.
 *
 *   node gate_778.mjs [path/to/index.html]
 *
 * The count assertion reproduces Theo's report exactly: open a profile with
 * ZERO photographs (so the tile paints 0), add photographs, press Back, and
 * read the tile. On 777 it still says 0.
 *
 * Negative control: run against the 777 artifact — must go RED, not crash.
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
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_778 on ' + FILE);

const JPEG1 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const N = 6;   /* six results, so "select all" is visibly more than one tap */
const CC_LIST = { photos: Array.from({ length: N }, (_, i) => ({
  id: 'cc-' + (i + 1), description: 'Shot ' + (i + 1), captured_at: '2026-07-30T10:0' + i + ':00Z',
  project_id: 'x1', project_name: 'James Tiege', project_address: '1 Test Way, Dayton, OH',
  creator_name: 'Curtis', annotated: false, thumb: 'https://app.cardinalroster.com/t' + i + '.jpg', preview: ''
})), next_cursor: null, has_next: false };

const SEED = () => ({
  projects: [{ id: 'p-1', name: 'James Tiege', stage: 'Lead', address: '1 Test Way, Dayton, OH',
    email: 'jt@example.com', checklist: '{}', created_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' }],
  project_photos: [], estimates: [], inspection_reports: [], punch_items: [], appointments: [],
  team_profiles: [], pricing_items: [], pricing_categories: []
});

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
const page = await ctx.newPage();
const dialogs = [];
page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/companycam')) {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
    if (body.action === 'list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CC_LIST) });
    if (body.action === 'fetch') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: body.id, mime: 'image/jpeg', bytes: 999, rendition: 'web', description: '', captured_at: '', data: JPEG1 }) });
    return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"Unknown action"}' });
  }
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
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
await page.waitForTimeout(1500);

console.log('\n--- 0. the profile paints a zero Photos tile first (Theo\'s starting state) ---');
const tileBefore = await page.evaluate(() => {
  const el = document.getElementById('dbPhotoN');
  return el ? el.textContent.trim() : null;
});
ok('the Photos tile starts at 0', tileBefore === '0', tileBefore);

console.log('\n--- 1. Select all ---');
await page.evaluate(() => { openGalleryMode('all'); });
await page.waitForTimeout(400);
await page.evaluate(() => { const b = document.getElementById('galCcBtn'); if (b) b.click(); });
await page.waitForTimeout(900);
const s1 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  return { exists: !!g('galCcAllBtn'), label: g('galCcAllBtn') ? g('galCcAllBtn').textContent : null,
           results: document.querySelectorAll('#galCcGrid .gcc-p').length };
});
ok('the search returned 6 results', s1.results === 6, s1.results);
ok('a Select all control exists', !!s1.exists);
ok('it reads "Select all" while nothing is ticked', /Select all/.test(s1.label || ''), s1.label);

const s2 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  if (g('galCcAllBtn')) g('galCcAllBtn').click();
  return { checked: document.querySelectorAll('#galCcGrid [data-gcc-pick]:checked').length,
           addLabel: g('galCcAddBtn') ? g('galCcAddBtn').textContent : null,
           allLabel: g('galCcAllBtn') ? g('galCcAllBtn').textContent : null,
           stat: g('galCcStat') ? g('galCcStat').textContent : null };
});
ok('one tap ticks all six', s2.checked === 6, s2.checked);
ok('the Add button counts them', /Add 6 to album/.test(s2.addLabel || ''), s2.addLabel);
ok('the control flips to "Clear all"', /Clear all/.test(s2.allLabel || ''), s2.allLabel);
ok('the status says how many are ticked', /6 ticked/.test(s2.stat || ''), s2.stat);

const s3 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  if (g('galCcAllBtn')) g('galCcAllBtn').click();
  return { checked: document.querySelectorAll('#galCcGrid [data-gcc-pick]:checked').length,
           allLabel: g('galCcAllBtn') ? g('galCcAllBtn').textContent : null };
});
ok('a second tap clears them all', s3.checked === 0, s3.checked);
ok('and the control offers "Select all" again', /Select all/.test(s3.allLabel || ''), s3.allLabel);

/* A partial tick must still offer Select all — the useful move is to finish,
   not to clear. */
const s4 = await page.evaluate(() => {
  const c = document.querySelector('#galCcGrid [data-gcc-pick]');
  if (c) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }
  const a = document.getElementById('galCcAllBtn');
  return a ? a.textContent : null;
});
ok('one ticked out of six still offers "Select all"', /Select all/.test(s4 || ''), s4);

console.log('\n--- 2. add them, come back, and read the tile ---');
await page.evaluate(() => {
  const a = document.getElementById('galCcAllBtn'); if (a) a.click();       /* all six */
  const b = document.getElementById('galCcAddBtn'); if (b) b.click();
});
await page.waitForTimeout(6000);
const added = await page.evaluate(() => (window.__SEED__.project_photos || []).length);
ok('six photographs landed in the album', added === 6, added);
await page.evaluate(() => { const b = document.getElementById('galBackBtn'); if (b) b.click(); });
await page.waitForTimeout(1800);
const tileAfter = await page.evaluate(() => {
  const el = document.getElementById('dbPhotoN');
  return { n: el ? el.textContent.trim() : null, zero: el ? el.classList.contains('zero') : null,
           onProfile: (function(){ const p = document.getElementById('projectView'); return !!(p && getComputedStyle(p).display !== 'none'); })() };
});
ok('Back lands on the client profile', !!tileAfter.onProfile);
ok('the Photos tile now reads 6, not 0', tileAfter.n === '6', tileAfter.n);
ok('and it is no longer styled as empty', tileAfter.zero === false, String(tileAfter.zero));

console.log('\n--- 3. source-level ---');
ok('the album Back re-renders the overview, like every other sub-page',
  /setHeaderJobMenu\(true\);[\s\S]{0,400}renderOverview\(\);[\s\S]{0,80}window\.scrollTo\(0,0\);\n\}\);/.test(APP_HTML));
ok('the select-all warns about the album cap before the fetches, not after',
  APP_HTML.indexOf("' will fit (the album holds '") > -1);
ok('a failed AI caption names the step and offers the manual route',
  APP_HTML.indexOf('The AI caption did not run') > -1 &&
  APP_HTML.indexOf('double-tap the photo') > -1);
ok('the storage read failure is legible',
  APP_HTML.indexOf('the photo could not be read back from storage') > -1);

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
