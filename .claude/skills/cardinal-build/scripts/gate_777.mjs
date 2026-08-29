/* gate_777.mjs — CompanyCam photographs into the client Photo Album.
 *
 *   node gate_777.mjs [path/to/index.html]
 *
 * Drives the REAL artifact in Chromium with the recording mock:
 *   1. admin sees the From CompanyCam button on the album; a rep does not
 *      (api/companycam 403s non-admins — the button must not exist for them);
 *   2. opening the picker seeds the search with the client's own address and
 *      runs it; results render; the different-job photo is marked foreign;
 *   3. ticking two and pressing Add asks about the foreign one, fetches the
 *      bytes through /api/companycam (action:fetch), and lands TWO
 *      project_photos inserts through photoDb.add — the crew's caption on
 *      the row whose CompanyCam photo carried a description, and no
 *      coordinates anywhere in the row;
 *   4. Inspection Photos mode hides the button and closes the panel;
 *   5. source-level: listByProject selects section+caption back (the reload
 *      fix), and the mid-flight client-switch guards exist.
 *
 * Negative control: run against the 776 artifact — must go RED, not crash.
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
console.log('gate_777 on ' + FILE);

/* 1x1 white JPEG — must actually decode, resizeImageFile draws it on a canvas. */
const JPEG1 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const CC_LIST = {
  photos: [
    { id: 'cc-1', description: 'North slope hail damage', captured_at: '2026-07-30T10:00:00Z',
      project_id: 'x1', project_name: 'James Tiege', project_address: '1 Test Way, Dayton, OH',
      creator_name: 'Curtis', annotated: false, thumb: 'https://app.cardinalroster.com/t1.jpg', preview: '' },
    { id: 'cc-2', description: 'Second view', captured_at: '2026-07-30T10:05:00Z',
      project_id: 'x1', project_name: 'James Tiege', project_address: '1 Test Way, Dayton, OH',
      creator_name: 'Curtis', annotated: false, thumb: 'https://app.cardinalroster.com/t2.jpg', preview: '' },
    { id: 'cc-3', description: '', captured_at: '2026-06-01T09:00:00Z',
      project_id: 'x2', project_name: 'Somebody Else', project_address: '99 Other Rd, Dayton, OH',
      creator_name: 'Nick', annotated: false, thumb: 'https://app.cardinalroster.com/t3.jpg', preview: '' }
  ],
  next_cursor: null, has_next: false
};

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
const ccCalls = [];
page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/companycam')) {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
    ccCalls.push(body);
    if (body.action === 'list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CC_LIST) });
    if (body.action === 'fetch') {
      const src = CC_LIST.photos.find(p => p.id === body.id) || {};
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: body.id, mime: 'image/jpeg', bytes: 999, rendition: 'web',
        description: src.description || '', captured_at: src.captured_at || '', data: JPEG1
      }) });
    }
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
await page.waitForTimeout(1200);

console.log('\n--- 1. the button, and who gets it ---');
const s1 = await page.evaluate(() => {
  if (typeof openGalleryMode !== 'function') return { noFn: true };
  openGalleryMode('all');
  const b = document.getElementById('galCcBtn');
  const p = document.getElementById('galCcPanel');
  return { noFn: false,
    btnExists: !!b, btnShown: !!(b && b.style.display !== 'none'),
    panelExists: !!p, panelHidden: !!(p && p.style.display === 'none'),
    panelBeforeGrid: !!(p && p.compareDocumentPosition(document.getElementById('galGrid')) & Node.DOCUMENT_POSITION_FOLLOWING) };
});
ok('the From CompanyCam button exists on the album', !!s1.btnExists);
/* 789 folded the CompanyCam entry into the + Add photos button: #galCcBtn is
   deliberately never shown (the panel wiring still hangs off it), and the
   plus opens the picker for an admin, the device picker for everyone else. */
ok('an admin’s + button opens the CompanyCam picker (789)', await page.evaluate(() => {
  const g = id => document.getElementById(id);
  if (g('galCcBtn').style.display !== 'none') return false;   /* the old button must stay retired */
  g('galAddBtn').click();
  const opened = g('galCcPanel') && g('galCcPanel').style.display !== 'none';
  if (typeof galCcClose === 'function') galCcClose();
  return !!opened;
}));
ok('the picker panel exists and starts closed', !!(s1.panelExists && s1.panelHidden));
ok('the panel sits above the photo grid', !!s1.panelBeforeGrid);

/* Every probe below must REPORT on an artifact that lacks the feature —
   the negative control run has to go red, never crash. */
const s2 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  const real = window.currentUser;
  window.currentUser = { email: 'nick@cardinalrenovations.net' };
  openGalleryMode('all');
  g('galAddBtn').click();
  const hiddenForRep = !!(g('galCcPanel') && g('galCcPanel').style.display === 'none');
  window.currentUser = real;
  openGalleryMode('all');
  g('galAddBtn').click();
  const backForAdmin = !!(g('galCcPanel') && g('galCcPanel').style.display !== 'none');
  if (typeof galCcClose === 'function') galCcClose();
  return { hiddenForRep, backForAdmin };
});
ok('a rep’s + does NOT open the picker (server 403s them anyway)', !!s2.hiddenForRep);
ok('the admin gets it back on the next open', !!s2.backForAdmin);

console.log('\n--- 2. open seeds the address and searches ---');
await page.evaluate(() => { const b = document.getElementById('galCcBtn'); if (b) b.click(); });
await page.waitForTimeout(900);
const s3 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  return {
    panelOpen: !!(g('galCcPanel') && g('galCcPanel').style.display !== 'none'),
    q: g('galCcQ') ? g('galCcQ').value : null,
    cells: document.querySelectorAll('#galCcGrid .gcc-p').length,
    foreign: document.querySelectorAll('#galCcGrid .gcc-p.foreign').length,
    stat: g('galCcStat') ? g('galCcStat').textContent : null
  };
});
ok('the panel opens', !!s3.panelOpen);
ok('the search box is seeded with the client address', s3.q === '1 Test Way, Dayton, OH', s3.q);
ok('the seeded search ran by itself and rendered 3 photographs', s3.cells === 3, s3.cells);
ok('exactly the different-job photo is marked foreign', s3.foreign === 1, s3.foreign);
ok('the status says what to do next', /tick/i.test(s3.stat || ''), s3.stat);

console.log('\n--- 3. tick two, Add, and the album takes them ---');
const s4 = await page.evaluate(() => {
  const cells = document.querySelectorAll('#galCcGrid .gcc-p');
  const tick = i => { const c = cells[i] && cells[i].querySelector('[data-gcc-pick]'); if (c) { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); } };
  tick(0); tick(2);   /* cc-1 (captioned, same job) + cc-3 (foreign) */
  const a = document.getElementById('galCcAddBtn');
  return { addLabel: a ? a.textContent : null };
});
ok('the Add button counts the ticks', /Add 2 to album/.test(s4.addLabel || ''), s4.addLabel);
/* 1080-1083: the foreign-photo challenge is crAsk now, not window.confirm —
   record and auto-accept it so the add proceeds as a user's Yes would. */
await page.evaluate(() => {
  window.__asks = [];
  window.crAsk = function (m) { window.__asks.push('confirm: ' + String(m || '')); return Promise.resolve(true); };
  window.crTell = function (m) { window.__asks.push('alert: ' + String(m || '')); };
});
await page.evaluate(() => { const a = document.getElementById('galCcAddBtn'); if (a) a.click(); });
await page.waitForTimeout(3500);
const s5 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  const rows = (window.__SEED__.project_photos || []);
  return {
    rows: rows.map(r => ({ caption: r.caption, section: r.section, project: r.project_id,
      keys: Object.keys(r).sort().join(','), hasData: !!r.data })),
    galCount: g('galCount') ? g('galCount').textContent : null,
    stat: g('galCcStat') ? g('galCcStat').textContent : null,
    unticked: document.querySelectorAll('#galCcGrid [data-gcc-pick]:checked').length
  };
});
const asks = dialogs.concat(await page.evaluate(() => window.__asks || []));
ok('the foreign tick was challenged first', asks.some(d => /different job/.test(d)), JSON.stringify(asks));
ok('two photographs landed in project_photos', s5.rows.length === 2, JSON.stringify(s5.rows));
ok('both rows belong to this client', s5.rows.every(r => r.project === 'p-1'));
ok("the crew's caption came across on the captioned one", s5.rows.some(r => r.caption === 'North slope hail damage'), JSON.stringify(s5.rows.map(r => r.caption)));
ok('the uncaptioned one carries no caption', s5.rows.some(r => r.caption === undefined || r.caption === null));
ok('no coordinates on either row (the GPS fence)', s5.rows.every(r => !/(^|,)(lat|lon|latitude|longitude)(,|$)/.test(r.keys)), s5.rows[0] && s5.rows[0].keys);
ok('the bytes went through /api/companycam action:fetch, one per photo',
  ccCalls.filter(c => c.action === 'fetch').length === 2, JSON.stringify(ccCalls));
ok('the album header re-counted (2 / 50)', /2\s*\/\s*50/.test(s5.galCount || ''), s5.galCount);
ok('the panel reports what happened', /2 copied into the album/.test(s5.stat || ''), s5.stat);
ok('the ticks were cleared after the add', s5.unticked === 0, s5.unticked);

console.log('\n--- 4. Inspection Photos mode gets neither button nor panel ---');
const s6 = await page.evaluate(() => {
  const g = id => document.getElementById(id);
  openGalleryMode('insp');
  return { btnHidden: !!(g('galCcBtn') && g('galCcBtn').style.display === 'none'),
           panelHidden: !!(g('galCcPanel') && g('galCcPanel').style.display === 'none') };
});
ok('the button hides in Inspection Photos mode', !!s6.btnHidden);
ok('an open panel is closed by the mode switch', !!s6.panelHidden);

console.log('\n--- 5. source-level guards ---');
ok('listByProject selects section+caption back (the reload fix)',
  APP_HTML.indexOf("'id,project_id,data,storage_path,created_by,created_at,section,caption'") > -1);
ok('the import re-checks whose album is open before writing',
  /currentProject\.id === pid\)\{\s*\n\s*await addGalleryFiles\(files, metas\);/.test(APP_HTML));
ok('the fetch loop bails if the album moved to another client',
  APP_HTML.indexOf("if(!currentProject || currentProject.id !== pid) break;") > -1);
ok('the room cap respects GAL_MAX before fetching anything',
  APP_HTML.indexOf('var take = picked.slice(0, room);') > -1);
ok('photoDb.add only gains an OPTIONAL extra (no caller broke)',
  APP_HTML.indexOf('add: async function(projectId, dataUrl, extra){') > -1 &&
  APP_HTML.indexOf(', extra || {})') > -1);

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
