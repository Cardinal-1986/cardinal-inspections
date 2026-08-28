/* gate_1121.mjs — build 1121: the SOL apply writes its history row.
 *
 * applySolExtraction() is openSolReviewModal(extracted, fileName)'s SIBLING,
 * but its final .then called logScopeRead(..., fileName, extracted, ...) as if
 * it were nested — a ReferenceError inside a promise chain, so an unhandled
 * rejection nobody sees, on EVERY apply since 665. The claim writes earlier in
 * the chain completed, which is why it looked fine. Found by tsc --checkJs.
 *
 * Proves in Chromium: open the real modal with a known fileName, tick, tap the
 * real Apply button, and the scope_reads insert arrives with that doc_name and
 * the extraction — with zero page errors. The CONTROL (pre-1121) must show the
 * ReferenceError and no insert; if the control shows neither, the rig never
 * reached the broken line and proves nothing (BUG_CLASSES 37).
 * Run:  node gate_1121.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1121: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1121.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const r = await page.evaluate(`(async function(){
  ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(r => setTimeout(r, 700));
  /* record the scope_reads insert without losing the rest of the mock */
  var inserts = [];
  var realFrom = window.supa.from.bind(window.supa);
  window.supa.from = function(t){
    if (t === 'scope_reads') return { insert: function(row){ inserts.push(row); return Promise.resolve({ data: [row], error: null }); } };
    return realFrom(t);
  };
  /* the mock cannot complete the real claim bridge (its upsert chain never
     settles), which starves the .then under test. The seam being proven is the
     ARGUMENT PASSAGE into logScopeRead — stub the bridge to a resolved id. The
     control's ReferenceError happens while evaluating the call's arguments,
     so it still fires identically under this stub. */
  window.bridgeSolToClaim = function(){ return Promise.resolve('claim-x1'); };
  if (typeof openSolReviewModal !== 'function') return { rig: 'openSolReviewModal not global' };
  openSolReviewModal({ carrier: 'State Farm', totals: { rcv: 12000, acv: 9000 }, summary: 'hail, north slope' }, 'gunn_sol.pdf');
  await new Promise(r => setTimeout(r, 400));
  /* tick every offered field, not just the pre-ticks: on the seeded project
     the only pre-tick can be the notes row, whose branch returns before
     populating applied — logScopeRead's own guard then exits with nothing
     to prove either way. */
  document.querySelectorAll('#solRows .solChk').forEach(function(b){ b.checked = true; });
  var ticked = document.querySelectorAll('#solRows .solChk:checked').length;
  var btn = document.getElementById('solApplyBtn');
  if (!btn) return { rig: 'no apply button' };
  btn.click();
  await new Promise(r => setTimeout(r, 1500));
  return { ticked: ticked, inserts: inserts.map(x => ({ doc: x.doc_name, rcv: x.rcv, claim: x.claim_id, hasExtracted: !!x.extracted })) };
})()`);
await browser.close();

const fails = [];
if (r.rig) fails.push('rig fault — proves nothing: ' + r.rig);
else {
  if (!r.ticked) fails.push('rig fault — proves nothing: no field pre-ticked, apply would no-op');
  if (r.inserts.length !== 1) fails.push(`scope_reads got ${r.inserts.length} insert(s), want 1 — the history row did not write`);
  else {
    if (r.inserts[0].doc !== 'gunn_sol.pdf') fails.push(`doc_name is ${JSON.stringify(r.inserts[0].doc)} — the modal's fileName did not arrive`);
    if (!r.inserts[0].hasExtracted) fails.push('extracted payload missing from the history row');
    if (r.inserts[0].rcv !== 12000) fails.push(`rcv is ${r.inserts[0].rcv}, want 12000`);
    if (r.inserts[0].claim !== 'claim-x1') fails.push('claim_id from the bridge did not reach the row');
  }
  const ref = errs.filter(e => /ReferenceError/.test(e));
  if (ref.length) fails.push('ReferenceError reached the page: ' + ref[0]);
}
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1121 RED — ${fails.length} failure(s)` : 'GATE 1121 GREEN — history row written, named, to the cent');
console.log('  detail: ' + JSON.stringify(r) + (errs.length ? '  errs: ' + errs.slice(0,2).join(' | ') : ''));
process.exit(fails.length ? 1 : 0);
