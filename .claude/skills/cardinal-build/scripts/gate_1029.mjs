/* gate_1029.mjs — build 1029: save stays in the room; the satellites stop guessing.
 * Chromium rig on the seeded walk. Proves:
 *   [in-place] clicking Save on the seeded draft KEEPS the editor open, writes
 *              through the mock, fires cr-est-saved with the row, and clears
 *              the dirty flag (Close then exits without asking);
 *   [dirty]    typing → Close asks; dismiss keeps the editor; accept closes it;
 *   [promise]  window.CardinalEstimates.save is exported and resolves a row;
 *   [estnum]   a NEW estimate's header reads "auto №" until first save;
 *   [phonebar] hidden on desktop, fixed flex bar at 390px with Save + Publish;
 *   [retired]  no waitForEditorClose anywhere; cr-ess listens for the events
 *              instead of observing the body (observer census −1 vs control);
 *   [close]    Cancel is labelled Close.
 * Run:  node gate_1029.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1029: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1029.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  let dialogMode = 'dismiss';
  page.on('dialog', d => { dialogs.push(d.message()); (dialogMode === 'accept' ? d.accept() : d.dismiss()).catch(() => {}); });
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.addInitScript(`document.addEventListener('cr-est-saved', function(e){
    window.__SAVED_EVTS = (window.__SAVED_EVTS || []).concat([{
      id: e.detail && e.detail.id, hasRow: !!(e.detail && e.detail.row),
      status: e.detail && e.detail.status, projectId: e.detail && e.detail.project && e.detail.project.id }]);
  });`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await page.waitForTimeout(600);

  const out = { dialogs };
  out.closeLabel = await page.evaluate(`(function(){
    var b = document.querySelector('#cr-est-view [data-act="close"]');
    return b ? b.textContent.trim() : 'MISSING';
  })()`);
  out.saveExported = await page.evaluate(
    `typeof (window.CardinalEstimates && window.CardinalEstimates.save) === 'function'`);
  out.barDesktop = await page.evaluate(`(function(){
    var b = document.querySelector('#cr-est-view .cr-est-phonebar');
    return b ? getComputedStyle(b).display : 'ABSENT';
  })()`);

  /* [in-place] click Save on the seeded draft */
  const writesBefore = await page.evaluate(`(window.__WRITES__ || []).filter(w => w.table === 'estimates').length`);
  await page.evaluate(`(function(){ var b = document.querySelector('#cr-est-view [data-act="save"]'); if (b) b.click(); })()`);
  await page.waitForTimeout(900);
  out.openAfterSave = await page.evaluate(`(function(){
    var v = document.getElementById('cr-est-view');
    return !!(v && v.classList.contains('open'));
  })()`);
  out.wrote = await page.evaluate(`(window.__WRITES__ || []).filter(w => w.table === 'estimates' && w.op === 'update').length`) > 0;
  out.evts = await page.evaluate(`window.__SAVED_EVTS || []`);
  out.writesBefore = writesBefore;

  /* [dirty cleared] Close straight after save must NOT ask */
  const dlgBefore = dialogs.length;
  await page.evaluate(`(function(){ var b = document.querySelector('#cr-est-view [data-act="close"]'); if (b) b.click(); })()`);
  await page.waitForTimeout(300);
  out.closeAskedWhenClean = dialogs.length > dlgBefore;
  out.closedClean = await page.evaluate(`(function(){
    var v = document.getElementById('cr-est-view');
    return !(v && v.classList.contains('open'));
  })()`);

  /* [dirty guard] reopen, type, Close → dialog; dismiss keeps it; accept closes */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await page.waitForTimeout(500);
  await page.evaluate(`(function(){
    var t = document.querySelector('#cr-est-view [data-f="title"]');
    if (t){ t.value = t.value + ' x'; t.dispatchEvent(new Event('input', { bubbles: true })); }
  })()`);
  const dlg2 = dialogs.length;
  dialogMode = 'dismiss';
  await page.evaluate(`(function(){ var b = document.querySelector('#cr-est-view [data-act="close"]'); if (b) b.click(); })()`);
  await page.waitForTimeout(300);
  out.dirtyAsked = dialogs.length > dlg2;
  out.dirtyMsg = dialogs[dialogs.length - 1] || '';
  out.stillOpenOnDismiss = await page.evaluate(`(function(){
    var v = document.getElementById('cr-est-view');
    return !!(v && v.classList.contains('open'));
  })()`);
  dialogMode = 'accept';
  await page.evaluate(`(function(){ var b = document.querySelector('#cr-est-view [data-act="close"]'); if (b) b.click(); })()`);
  await page.waitForTimeout(300);
  out.closedOnAccept = await page.evaluate(`(function(){
    var v = document.getElementById('cr-est-view');
    return !(v && v.classList.contains('open'));
  })()`);
  dialogMode = 'dismiss';

  /* [estnum] a NEW estimate reads "auto №" */
  await page.evaluate(`(function(){
    window.CardinalEstimates.openEditor({ id: 'p1', name: 'Mark Diamond' });
  })()`);
  await page.waitForTimeout(400);
  out.estnumNew = await page.evaluate(`(function(){
    var e = document.querySelector('#cr-est-view .estnum');
    return e ? e.textContent.trim() : 'MISSING';
  })()`);
  await browser.close();

  /* [phonebar mobile] separate narrow context */
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx2 = await b2.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const p2 = await ctx2.newPage();
  await p2.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await p2.addInitScript(SETUP_JS);
  await p2.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(900);
  await p2.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await p2.waitForTimeout(500);
  out.barPhone = await p2.evaluate(`(function(){
    var b = document.querySelector('#cr-est-view .cr-est-phonebar');
    if (!b) return { display: 'ABSENT' };
    var cs = getComputedStyle(b);
    return { display: cs.display, position: cs.position,
      save: !!b.querySelector('[data-act="bar-save"]'),
      publish: !!b.querySelector('[data-act="bar-publish"]') };
  })()`);
  await b2.close();
  return out;
}

function judge(html, o) {
  const fails = [];
  if (o.closeLabel !== 'Close') fails.push(`exit button labelled ${JSON.stringify(o.closeLabel)} (want Close)`);
  if (!o.saveExported) fails.push('CardinalEstimates.save is not exported');
  if (!o.openAfterSave) fails.push('editor CLOSED on Save — save-in-place missing');
  if (!o.wrote) fails.push('Save produced no estimates update through the mock');
  if (!o.evts.length) fails.push('no cr-est-saved event fired');
  else {
    const e = o.evts[0];
    if (!e.hasRow || !e.id) fails.push(`cr-est-saved detail incomplete: ${JSON.stringify(e)}`);
    if (e.projectId == null) fails.push('cr-est-saved detail lacks project');
  }
  if (o.closeAskedWhenClean) fails.push('Close asked for confirmation right after a save (dirty not cleared)');
  if (!o.closedClean) fails.push('Close did not close a clean editor');
  if (!o.dirtyAsked) fails.push('Close did NOT ask before discarding typed changes');
  else if (!/unsaved/i.test(o.dirtyMsg)) fails.push(`dirty prompt odd: ${JSON.stringify(o.dirtyMsg)}`);
  if (!o.stillOpenOnDismiss) fails.push('dismissing the dirty prompt still closed the editor');
  if (!o.closedOnAccept) fails.push('accepting the dirty prompt did not close the editor');
  if (o.estnumNew !== 'auto №') fails.push(`new estimate number chip: ${JSON.stringify(o.estnumNew)} (want "auto №")`);
  if (o.barDesktop !== 'none') fails.push(`phonebar on desktop: ${o.barDesktop} (want none)`);
  if (o.barPhone.display !== 'flex' || o.barPhone.position !== 'fixed')
    fails.push(`phonebar at 390px: ${JSON.stringify(o.barPhone)}`);
  else if (!o.barPhone.save || !o.barPhone.publish) fails.push('phonebar missing Save/Publish');
  if (html.includes('waitForEditorClose(')) fails.push('a waitForEditorClose call survives');
  if (html.includes('crEssHooked')) fails.push('cr-ess still hooks buttons instead of listening');
  if (!html.includes("new CustomEvent('cr-est-published'")) fails.push('publish does not announce cr-est-published');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const o = await sweep(html);
const fails = judge(html, o);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1029 RED — ${fails.length} failure(s)` : 'GATE 1029 GREEN — in-place save, dirty guard, promise, estnum, phonebar, retired polls');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const co = await sweep(chtml);
  const cfails = judge(chtml, co);
  const obsA = (html.match(/\.observe\(document\.body/g) || []).length;
  const obsC = (chtml.match(/\.observe\(document\.body/g) || []).length;
  if (obsA !== obsC - 1) { cfails.push(`observer census: artifact ${obsA} vs control ${obsC} (want -1)`); console.log(`  FAIL observer census: ${obsA} vs ${obsC}`); }
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 8)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
