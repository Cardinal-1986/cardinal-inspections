/* gate_1138.mjs — build 1138: duplicate an estimate.
 *
 * A Duplicate button on a SAVED estimate copies the live state into a fresh
 * draft (no id / no estimate_number / status draft), so the next Save INSERTS
 * a new row; the original is untouched.
 *
 * Proves in Chromium (real editor, real button): open a saved estimate, tap
 * Duplicate, and the editor is now on a NEW draft — no id, title "… (copy)",
 * same line count and amounts, and Saving it calls insert (not update) so the
 * original row is not overwritten. Control (1137 tree): RED — no button.
 * Run: node gate_1138.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1138: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1138.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

let r; try { r = await page.evaluate(`(async function(){
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(res => setTimeout(res, 600));
  const row = { id:'est-src', project_id:'p1', archived:false, status:'sent',
    estimate_number:'EST-2026-0500', title:'Roof replacement', itemized:false, doc_id:'doc-x',
    line_items:[
      { name:'Tear-off & dispose', qty:1, unit:'EA', unit_price:0, amount:8000, flat:true, description:'Full tear-off.' },
      { name:'New roof system', qty:1, unit:'EA', unit_price:0, amount:38000, flat:true, description:'Duration shingles.' }
    ],
    subtotal:46000, discount:0, total:46000, deposit_pct:30, deposit_amount:13800, photos:[] };
  window.CardinalEstimates.openEditor('p1', row);
  await new Promise(res => setTimeout(res, 800));
  const view = document.getElementById('cr-est-view');
  const out = {};
  const dup = view.querySelector('[data-act="dup"]');
  out.btnExists = !!dup;
  out.srcLineCount = view.querySelectorAll('.cr-est-lineitem').length;
  if (!dup) return out;

  /* record what the insert path receives, without touching the rest of the mock */
  let inserts = 0, updates = 0, insertPayload = null;
  const realFrom = window.supa.from.bind(window.supa);
  function chainFor(single, listData){
    var c = {};
    c.eq = function(){ return c; };
    c.order = function(){ return Promise.resolve({ data: listData || [], error: null }); };
    c.select = function(){ return c; };
    c.single = function(){ return Promise.resolve({ data: single || null, error: null }); };
    return c;
  }
  window.supa.from = function(t){
    if (t !== 'estimates') return realFrom(t);
    return {
      update: function(){ updates++; return chainFor({ id:'est-src' }, null); },
      insert: function(p){ inserts++; insertPayload = Array.isArray(p) ? p[0] : p;
        return chainFor({ id:'est-copy', estimate_number:'EST-2026-0501' }, null); },
      select: function(){ return chainFor(null, []); }
    };
  };

  dup.click();
  await new Promise(res => setTimeout(res, 700));
  const titleInput = view.querySelector('[data-ef="title"], .cr-est-title, input.title, [data-lf="title"]');
  out.h2 = (view.querySelector('.cr-est-head h2') || {}).textContent || '';
  out.copyLineCount = view.querySelectorAll('.cr-est-lineitem').length;
  out.estnum = (view.querySelector('.estnum') || {}).textContent || '';
  /* now Save the copy and confirm it INSERTS, not updates */
  const saveBtn = view.querySelector('.cr-est-head [data-act="save"]');
  if (saveBtn) saveBtn.click();
  await new Promise(res => setTimeout(res, 700));
  out.inserts = inserts; out.updates = updates;
  out.insTitle = insertPayload ? insertPayload.title : null;
  out.insTotal = insertPayload ? insertPayload.total : null;
  out.insHasId = insertPayload ? ('id' in insertPayload) : null;
  return out;
})()`); } catch(e){ console.log('EVAL THREW:', String(e).split('\n')[0]); await browser.close(); process.exit(2); }
await browser.close();

const fails = [];
if (!r.btnExists) fails.push('no Duplicate button on a saved estimate');
else {
  if (r.copyLineCount !== r.srcLineCount) fails.push(`copy has ${r.copyLineCount} lines, source had ${r.srcLineCount}`);
  if (!/new estimate/i.test(r.h2)) fails.push(`after duplicate the editor is not a NEW draft (h2="${r.h2}")`);
  if (r.inserts !== 1) fails.push(`saving the copy did ${r.inserts} insert(s), want 1 — the original would be overwritten`);
  if (r.updates !== 0) fails.push(`saving the copy did ${r.updates} update(s) — that hits the ORIGINAL row`);
  if (!/\(copy\)/.test(r.insTitle || '')) fails.push(`copy title is ${JSON.stringify(r.insTitle)} — want "… (copy)"`);
  if (String(r.insTotal) !== '46000.00') fails.push(`copy total is ${r.insTotal}, want 46000.00`);
}
if (errs.length) fails.push('page errors: ' + errs.slice(0, 2).join(' | '));
for (const f of fails) console.log('  FAIL ' + f);
console.log('  detail: ' + JSON.stringify(r));
console.log(fails.length ? `GATE 1138 RED — ${fails.length} failure(s)` : 'GATE 1138 GREEN — 6 checks');
process.exit(fails.length ? 1 : 0);
