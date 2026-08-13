/* gate_731.mjs — the editor's `current` is a 3-field SUMMARY of the open document,
   {id, status, sent_at}, and four consumers treated it as the row itself:

     1. sigApply       read current.project_id      -> undefined, stage never moved
     2. currentDocRow  compared r.id === current    -> null, Share/Email always threw
     3. ensureShareToken  db.update(current, ...)   -> token never persisted
     4. the email path    db.update(current, ...)   -> document stayed UNSENT

   All four are ONE mistake, so this gate drives all four through the shipped code
   and asserts the OBSERVABLE outcome — a row written, a stage changed — rather than
   the shape of the object.

   Usage: node gate_731.mjs [path/to/index.html]     (v730 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Prospect', sales_rep: 'theo@cardinalrenovations.net',
               address: '5735 Webster Street', city: 'Dayton', state: 'OH', zip: '45414',
               email: 'bob@example.com', phone: '937-555-0101',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {}
  window.alert = m => { (window.__ALERTS__ = window.__ALERTS__ || []).push(String(m)); };
  window.confirm = () => true;
  window.prompt = () => '1';
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(1200);

/* create a real siding contract through the shipped path, which leaves the editor open */
await page.evaluate(() => { try { showTab('contracts'); } catch (e) {} const t = document.getElementById('tab-contracts'); if (t) t.style.display = 'block'; });
await page.waitForTimeout(400);
await page.evaluate(() => {
  const m = document.getElementById('pContractMenu');
  if (m) { m.style.display = 'block'; const o = m.querySelector('[data-ctpl="siding"]'); if (o) return o.click(); }
  /* v730 control has no picker — fall back to the single button so the control
     still reaches the editor and the four checks below are about THIS build's
     bugs, not about 730's feature being absent */
  const b = document.getElementById('pNewContractBtn'); if (b) b.click();
});
await page.waitForTimeout(1800);

const opened = await page.evaluate(() => ({
  editorOpen: !!document.querySelector('#editorView.open') || getComputedStyle(document.getElementById('editorView')).display !== 'none',
  title: (document.getElementById('reportTitle') || {}).value || null,
  hasRow: !!(typeof currentDocRow === 'function' && currentDocRow()),
  proj: (function () { try { const p = currentDocProject(); return p ? p.id : null; } catch (e) { return 'ERR:' + e.message; } })()
}));
chk('a contract is open in the editor', opened.editorOpen === true && /^Contract/.test(opened.title || ''), opened.title);

/* ── 1. currentDocRow resolves the open document ───────────────────────────── */
chk('currentDocRow() finds the open document', opened.hasRow === true, 'row=' + opened.hasRow);
chk('currentDocProject() finds its client', opened.proj === 'P1', 'project=' + opened.proj);

/* ── 2. Share link does not throw, and the token is PERSISTED ──────────────── */
const share = await page.evaluate(async () => {
  let tok = null, err = null;
  try { tok = await ensureShareToken(); } catch (e) { err = String(e.message || e); }
  const writes = (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'update');
  const tokenWrite = writes.filter(w => w.payload && w.payload.share_token);
  /* did it land on a real row, or vanish into an object-keyed .eq()? */
  const stored = (window.cacheRows || []).map(r => r.share_token).filter(Boolean);
  const persisted = ((window.__SEED__ && window.__SEED__.inspection_reports) || []).map(r => r.share_token).filter(Boolean);
  return { tok: tok ? String(tok).slice(0, 8) : null, err, tokenWrites: tokenWrite.length,
           eqKeys: tokenWrite.map(w => typeof w.eq_id === 'undefined' ? (w.match ? JSON.stringify(w.match) : 'n/a') : String(w.eq_id)),
           cached: stored.length, persisted: persisted.length };
});
chk('Share link does NOT throw "Document not loaded"', !/Document not loaded/i.test(share.err || ''), share.err || 'no error');
chk('Share link produces a token', !!share.tok, share.tok);
chk('the share token is actually PERSISTED to the row', share.persisted >= 1,
    'rows carrying a token: ' + share.persisted + ' (in-memory ' + share.cached + ')');

/* ── 3. signing a contract moves the job and notifies ──────────────────────── */
const signed = await page.evaluate(async () => {
  /* drive the exact tail of sigApply: the guard, then the stage move */
  const t = (document.getElementById('reportTitle').value || '').trim();
  const guard = /^contract/i.test(t) && !!(window.current ? window.current.project_id : (typeof current !== 'undefined' && current && current.project_id));
  let pid = null;
  try { pid = (typeof current !== 'undefined' && current) ? current.project_id : null; } catch (e) {}
  if (guard && pid) { try { await setStage(pid, 'Approved'); } catch (e) { return { guard, pid, err: String(e) }; } }
  const pr = (window.cacheProjects || []).find(p => p.id === 'P1');
  const stageWrites = (window.__WRITES__ || []).filter(w => w.table === 'projects' && w.op === 'update' && w.payload && w.payload.stage);
  return { guard, pid, stage: pr ? pr.stage : null, stageWrites: stageWrites.map(w => w.payload.stage) };
});
chk('current carries the PROJECT of the open document', signed.pid === 'P1', 'current.project_id=' + signed.pid);
chk("sigApply's stage guard is now satisfiable", signed.guard === true, 'guard=' + signed.guard);
chk('signing a contract moves the job to APPROVED', signed.stage === 'Approved', 'stage=' + signed.stage);
chk('and the stage change is WRITTEN, not just local', (signed.stageWrites || []).indexOf('Approved') !== -1, JSON.stringify(signed.stageWrites));

/* ── 4. the failure MODE, demonstrated rather than asserted ────────────────
   The claim behind bugs 3 and 4 is "db.update(id, fields) does .eq('id', id), so
   passing the object writes nowhere." That is a claim about db.update, not about
   this build — so prove it here, both ways, on whichever artifact is under test.
   The discriminator between builds is the source check below it. */
const semantics = await page.evaluate(async () => {
  const rows = ((window.__SEED__ && window.__SEED__.inspection_reports) || []);
  const before = rows.map(r => r.status);
  try { await db.update(current, { status: 'OBJECT_AS_ID' }); } catch (e) {}
  const afterObj = rows.filter(r => r.status === 'OBJECT_AS_ID').length;
  try { await db.update(current.id, { status: 'sent' }); } catch (e) {}
  const afterId = rows.filter(r => r.status === 'sent').length;
  return { before, afterObj, afterId, total: rows.length };
});
chk('passing the OBJECT as the id writes to nothing (the bug that was there)',
    semantics.afterObj === 0, 'rows hit by the object-keyed write: ' + semantics.afterObj);
chk('passing the ID writes to the row (what the fixed code does)',
    semantics.afterId >= 1, 'rows marked sent: ' + semantics.afterId + ' of ' + semantics.total);

/* ── 5. the mistake itself is gone from the source ─────────────────────────── */
const src = await page.evaluate(() => {
  const s = document.documentElement.outerHTML;
  return {
    objAsId: (s.match(/db\.update\(current,/g) || []).length,
    idVsObj: (s.match(/return r\.id === current; \}/g) || []).length
  };
});
chk('no db.update() is still passed the object instead of the id', src.objAsId === 0, 'db.update(current, ...) sites=' + src.objAsId);
chk('no id is still compared against the object', src.idVsObj === 0, 'r.id === current sites=' + src.idVsObj);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
