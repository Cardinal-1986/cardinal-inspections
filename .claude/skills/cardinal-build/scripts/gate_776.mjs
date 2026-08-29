/* gate_776.mjs — Publish tells the truth.
 *
 *   node gate_776.mjs [path/to/index.html]
 *
 * Three runs against the real artifact in Chromium:
 *   A. happy path      — document made, doc_id written, document editor opens,
 *                        and the "Mark it as Sent" prompt still appears.
 *   B. slow save       — __MOCK_DELAY__ holds every query open past the 9s
 *                        editor-close wait: the user must be TOLD, not left
 *                        looking at a button that flickered.
 *   C. failed publish  — __MOCK_FAIL__ on the document table: nothing may claim
 *                        "Estimate published."
 *
 * Negative control: on 775, B is silent and C claims success.
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
console.log('gate_776 on ' + FILE);

const SEED = () => ({
  projects: [{ id: 'p-1', name: 'ZZ Publish Test', stage: 'Prospect', address: '1 Test Way, Dayton, OH',
    email: 'zz@example.com', checklist: '{}', created_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' }],
  estimates: [], inspection_reports: [], punch_items: [], appointments: [], team_profiles: [],
  pricing_items: [], pricing_categories: []
});

async function run(label, knobs) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message()); await d.accept(); });
  await page.route('**/*', async route => {
    const url = route.request().url(), rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
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
  await page.evaluate(() => {
    if (window.CardinalEstimates && window.CardinalEstimates.openEditor) window.CardinalEstimates.openEditor(window.currentProject, null);
  });
  await page.waitForTimeout(1800);
  /* knobs go on AFTER the editor is open, so only the publish round trip is affected */
  await page.evaluate(k => { if (k.delay) window.__MOCK_DELAY__ = k.delay; if (k.failTable) window.__MOCK_FAIL__ = k.failTable; }, knobs);
  /* 1080-1083 replaced window.confirm/alert with the in-app crAsk/crTell sheet:
     intercept both and record what the app SAYS, auto-answering yes. */
  await page.evaluate(() => {
    window.__asks = [];
    window.crAsk = function (m) { window.__asks.push('confirm: ' + String(m || '')); return Promise.resolve(true); };
    window.crTell = function (m) { window.__asks.push('alert: ' + String(m || '')); };
  });
  const hadBtn = await page.evaluate(() => { const b = document.getElementById('cr-epub-btn'); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(knobs.wait || 9000);
  const state = await page.evaluate(() => ({
    btnText: (document.getElementById('cr-epub-btn') || {}).textContent || null,
    docs: (window.__SEED__.inspection_reports || []).map(r => r.title),
    estimates: (window.__SEED__.estimates || []).map(e => ({ n: e.estimate_number, doc: e.doc_id || null })),
    documentEditorOpen: (function () { const e = document.getElementById('editorView'); return !!(e && getComputedStyle(e).display !== 'none'); })(),
    asks: window.__asks || []
  }));
  await browser.close();
  return { label, hadBtn, dialogs: dialogs.concat(state.asks), state };
}

console.log('\n--- A. happy path ---');
const A = await run('happy', { wait: 9000 });
ok('the Publish button exists', A.hadBtn);
ok('a document is created', A.state.docs.length === 1, JSON.stringify(A.state.docs));
ok('doc_id is written back onto the estimate', !!(A.state.estimates[0] && A.state.estimates[0].doc));
ok('the document editor opens', A.state.documentEditorOpen);
ok('the "Mark it as Sent" prompt still appears', A.dialogs.some(d => /Estimate published/.test(d)),
  JSON.stringify(A.dialogs));
ok('no failure message on the happy path', !A.dialogs.some(d => /has not finished saving/.test(d)));

console.log('\n--- B. the save never lands (1029: save-in-place — the promise is the signal) ---');
/* 1029 retired the 9s editor-close wait: publish now AWAITS save() itself, so
   "the save never lands" is a save that FAILS — save() speaks, publish stands
   down. The 776 rule (never silent, never a false claim) is what we hold. */
const B = await run('savefail', { failTable: 'estimates', wait: 9000 });
ok('the user is TOLD the estimate did not save', B.dialogs.some(d => /save failed|could not save/i.test(d)),
  JSON.stringify(B.dialogs));
ok('the button is returned to "Publish", not left spinning', /Publish/.test(B.state.btnText || '') && !/Publishing/.test(B.state.btnText || ''),
  B.state.btnText);
ok('nothing claims it published', !B.dialogs.some(d => /Estimate published/.test(d)), JSON.stringify(B.dialogs));

console.log('\n--- C. the document write fails ---');
const C = await run('fail', { failTable: 'inspection_reports', wait: 11000 });
ok('no document was made (the failure is real)', C.state.docs.length === 0, JSON.stringify(C.state.docs));
ok('NOTHING announces "Estimate published."', !C.dialogs.some(d => /Estimate published/.test(d)),
  JSON.stringify(C.dialogs));

console.log('\n--- source-level guards ---');
ok('neither handler gives up in silence any more', !/if\(!closed\) return;/.test(APP_HTML));
/* 1029 retired both 9s waits ON PURPOSE (save-in-place: the editor no longer
   closes on Save, so the poll would hang and give up on every publish). Hold
   the retirement: no live call remains, and both sites say why. */
ok('the 9s waits are retired with their reason stated (1029)',
  !/waitForEditorClose\(/.test(APP_HTML) &&
  (APP_HTML.match(/waitForEditorClose retired/g) || []).length === 2);
ok('the published claim is gated on a real doc_id',
  /var docId = await publish\(est, projectBefore\);\s*\nif\(!docId\)\{ return; \}/.test(APP_HTML));

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
