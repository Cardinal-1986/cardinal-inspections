/* gate_1134.mjs — build 1134: Edit estimate, straight from the finished document.
 *
 * A published estimate document opened in the DOC editor now carries an
 * "Edit estimate" toolbar button: resolves the live estimates row (doc_id /
 * contract_doc_id, falling back to the EST-YYYY-NNNN title prefix because the
 * doc_id write-back is a known swallowed failure), closes the document (saving
 * it), and opens the builder on that row.
 *
 * Proves in Chromium against the seeded mock (data layer stubbed for two doc
 * rows and one estimates row — the app functions under test run as shipped):
 *   1. an estimate-titled doc shows the button
 *   2. an inspection doc does NOT (the toolbar is otherwise untouched)
 *   3. clicking it closes the doc editor and opens the BUILDER on that row
 *      — resolved via the title-prefix fallback (doc_id deliberately absent,
 *        exercising the resilient path)
 *   4. no page errors
 * Control (the 1133 tree): RED — the button does not exist.
 * Run: node gate_1134.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1134: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1134.mjs [index.html]'); process.exit(2); }
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
await page.waitForTimeout(1400);

const r = await page.evaluate(`(async function(){
  const out = { errs: [] };
  ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(res => setTimeout(res, 700));

  /* data layer, stubbed: two docs and one estimates row. The doc row carries
     NO doc_id link on the estimate on purpose — the title-prefix fallback is
     the path under proof. */
  const DOCS = {
    doc9: { id: 'doc9', title: 'EST-2026-0042 \\u2014 Estimate \\u2014 Roof replacement', status: 'unsent',
            project_id: 'p1', html: '<div class="wrap"><h1>Estimate</h1><p>body</p></div>' },
    doc8: { id: 'doc8', title: 'Inspection Report \\u2014 12 May', status: 'unsent',
            project_id: 'p1', html: '<div class="wrap"><h1>Inspection</h1></div>' }
  };
  const realGet = window.db.get, realUpdate = window.db.update;
  window.db.get = async id => DOCS[id] ? DOCS[id] : realGet.call(window.db, id);
  window.db.update = async (id, f) => DOCS[id] ? { id } : realUpdate.call(window.db, id, f);
  const EST_ROW = { id: 'est9', project_id: 'p1', archived: false, status: 'draft',
    estimate_number: 'EST-2026-0042', title: 'Roof replacement', itemized: true,
    line_items: [{ name: 'Tear-off', qty: 1, unit: 'EA', unit_price: 100 }],
    subtotal: 100, discount: 0, total: 100, deposit_pct: 0, deposit_amount: 0, photos: [] };
  const realFrom = window.supa.from.bind(window.supa);
  window.supa.from = function(t){
    if (t !== 'estimates') return realFrom(t);
    const chain = { select(){ return chain; }, eq(){ return chain; }, order(){ return chain; },
      then(res){ res({ data: [EST_ROW], error: null }); } };
    return chain;
  };

  /* 1: estimate doc shows the button */
  await openEditor('doc9');
  await new Promise(res => setTimeout(res, 600));
  const btn = document.getElementById('editEstBtn');
  out.btnExists = !!btn;
  out.onEstDoc = btn ? getComputedStyle(btn).display !== 'none' : false;

  /* 2: inspection doc hides it */
  await closeEditor();
  await openEditor('doc8');
  await new Promise(res => setTimeout(res, 600));
  out.onInspDoc = btn ? getComputedStyle(btn).display !== 'none' : null;
  await closeEditor();

  /* 3: the click lands in the builder on the row */
  await openEditor('doc9');
  await new Promise(res => setTimeout(res, 600));
  if (btn) btn.click();
  out.trace = [];
  for (let k = 0; k < 6; k++) {
    await new Promise(res => setTimeout(res, 500));
    const est0 = document.getElementById('cr-est-view');
    out.trace.push((document.getElementById('editorView').classList.contains('open') ? 'D' : 'd')
      + (est0 ? (est0.classList.contains('open') ? 'E' : 'e') : '-'));
  }
  const docOpen = document.getElementById('editorView').classList.contains('open');
  const est = document.getElementById('cr-est-view');
  out.docClosed = !docOpen;
  out.builderOpen = !!(est && est.classList.contains('open'));
  out.rowLoaded = !!(est && est.querySelector('input[data-lf="name"]') &&
                     est.querySelector('input[data-lf="name"]').value === 'Tear-off');
  return out;
})()`);
await browser.close();

const fails = [];
if (!r.btnExists) fails.push('no #editEstBtn in the toolbar');
else {
  if (!r.onEstDoc) fails.push('button hidden on an estimate document');
  if (r.onInspDoc !== false) fails.push('button visible on an inspection document — must stay estimate-only');
  if (!r.docClosed) fails.push('the document editor stayed open after the click');
  if (!r.builderOpen) fails.push('the estimate builder did not open');
  if (!r.rowLoaded) fails.push('the builder opened without the resolved row (name input != "Tear-off")');
}
const ref = errs.filter(e => /Error/.test(e));
if (ref.length) fails.push('page errors: ' + ref.slice(0, 2).join(' | '));
for (const f of fails) console.log('  FAIL ' + f);
console.log('  detail: ' + JSON.stringify(r));
console.log(fails.length ? `GATE 1134 RED — ${fails.length} failure(s)` : 'GATE 1134 GREEN — 6 checks');
process.exit(fails.length ? 1 : 0);
