/* gate_738.mjs — a priced document with no price asks first; an inspection report never does.
   The guard keys on whether the open document HAS an #estTotal node:
     readEstimateTotal() -> null  => no total field  => inspection report => WAVE THROUGH
     readEstimateTotal() -> 0     => priced but zero => ASK
     readEstimateTotal() -> >0    => priced          => SILENT

   The assertion that matters most is the WAVE-THROUGH. A guard that blocks a
   legitimate inspection report is worse than the bug it fixes, so this gate seeds
   a real report with no total node and proves it is never questioned.

   Usage: node gate_738.mjs [path/to/index.html]     (v737 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const doc = (total) => '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
  (total === null ? '<h1>Roof Inspection Report</h1><p>No price anywhere on this document.</p>'
                  : '<h1>Doc</h1><table><tfoot><tr><td class="price" id="estTotal">' + total + '</td></tr></tfoot></table>') +
  '</body></html>';

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Approved', sales_rep: 'theo@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [
    { id: 'D_ZERO',  title: 'Estimate — Bob DeBuilder',            project: 'Bob DeBuilder', project_id: 'P1', status: 'unsent', html: doc('$0.00'),      created_at: now, updated_at: now },
    { id: 'D_PRICED',title: 'Estimate — Bob DeBuilder priced',     project: 'Bob DeBuilder', project_id: 'P1', status: 'unsent', html: doc('$17,025.00'), created_at: now, updated_at: now },
    { id: 'D_REPORT',title: 'Roof Inspection — Bob DeBuilder',     project: 'Bob DeBuilder', project_id: 'P1', status: 'unsent', html: doc(null),         created_at: now, updated_at: now },
    { id: 'D_SENT',  title: 'Estimate — already sent',             project: 'Bob DeBuilder', project_id: 'P1', status: 'sent',   html: doc('$0.00'),      created_at: now, updated_at: now, sent_at: now }
  ],
  estimates: [], contracts: [], crew_work_orders: [], collections: [], commissions: [], draws: [], punch_items: [], appointments: []
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
  window.__ASKED__ = []; window.__ANSWER__ = false;
  window.confirm = function (m) { window.__ASKED__.push(String(m)); return !!window.__ANSWER__; };
  window.alert = function () {}; window.prompt = function () { return null; };
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
/* RIG REPAIR (build 1121 triage): builds 1080–1083 replaced window.confirm() with
   the in-app ask sheet — window.crAsk(msg) -> Promise<boolean>. crAsk is a
   window-assigned global, so reassigning it AFTER boot intercepts every bare
   call. Same contract as the confirm stub above: record, answer __ANSWER__. */
await page.evaluate(() => {
  window.crAsk = function (m) { window.__ASKED__.push(String(m || '')); return Promise.resolve(!!window.__ANSWER__); };
  window.crTell = function (m) { window.__ASKED__.push('TELL:' + String(m || '')); };
});
await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(900);

/* open a document and click Mark sent; report what was asked and what was written */
async function markSent(id, answer) {
  await page.evaluate(async d => {
    try { closeEditor && closeEditor(); } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
    await openEditor(d);
  }, id);
  await page.waitForFunction(() => {
    const f = document.getElementById('reportFrame');
    return f && f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerHTML.length > 10;
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return page.evaluate(async a => {
    window.__ASKED__ = []; window.__ANSWER__ = a; window.__WRITES__ = [];
    let readTotal = null;
    try { readTotal = readEstimateTotal(); } catch (e) { readTotal = 'THREW'; }
    document.getElementById('toggleStatusBtn').click();
    await new Promise(r => setTimeout(r, 900));
    return {
      readTotal,
      asked: window.__ASKED__.slice(),
      sentWrites: (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'update'
                    && w.payload && w.payload.status === 'sent').length
    };
  }, answer);
}

/* ── 1. a PRICED document reading $0 must ask ─────────────────────────────── */
{
  const r = await markSent('D_ZERO', false);
  chk('a $0 estimate is recognised as priced-but-zero', r.readTotal === 0, 'readEstimateTotal = ' + r.readTotal);
  chk('a $0 estimate ASKS before being marked sent', (r.asked || []).length === 1, JSON.stringify(r.asked));
  chk('the question names the zero total', /\$0\.00/.test((r.asked || [])[0] || ''), (r.asked || [])[0]);
  chk('answering NO does not mark it sent', r.sentWrites === 0, 'sent writes = ' + r.sentWrites);
}
{
  const r = await markSent('D_ZERO', true);
  chk('answering YES still sends it (not a dead button)', r.sentWrites >= 1, 'sent writes = ' + r.sentWrites);
}

/* ── 2. a priced document with a real total must NOT ask ──────────────────── */
{
  const r = await markSent('D_PRICED', false);
  chk('a priced estimate reads its total', Number(r.readTotal) === 17025, 'readEstimateTotal = ' + r.readTotal);
  chk('a priced estimate is NOT questioned', (r.asked || []).length === 0, JSON.stringify(r.asked));
  chk('and it is marked sent', r.sentWrites >= 1, 'sent writes = ' + r.sentWrites);
}

/* ── 3. THE ONE THAT MATTERS: an inspection report is never blocked ───────── */
{
  const r = await markSent('D_REPORT', false);
  chk('an inspection report has NO total field', r.readTotal === null, 'readEstimateTotal = ' + r.readTotal);
  chk('an inspection report is NEVER questioned', (r.asked || []).length === 0, JSON.stringify(r.asked));
  chk('an inspection report is marked sent exactly as before', r.sentWrites >= 1, 'sent writes = ' + r.sentWrites);
}

/* ── 4. UN-marking is a correction, never questioned ──────────────────────── */
{
  const r = await page.evaluate(async () => {
    try { closeEditor && closeEditor(); } catch (e) {}
    await new Promise(r2 => setTimeout(r2, 200));
    await openEditor('D_SENT');
    await new Promise(r2 => setTimeout(r2, 900));
    window.__ASKED__ = []; window.__ANSWER__ = false; window.__WRITES__ = [];
    document.getElementById('toggleStatusBtn').click();
    await new Promise(r2 => setTimeout(r2, 800));
    return { asked: window.__ASKED__.slice(),
             unsent: (window.__WRITES__ || []).filter(w => w.payload && w.payload.status === 'unsent').length };
  });
  chk('UN-marking a $0 document is never questioned', (r.asked || []).length === 0, JSON.stringify(r.asked));
  chk('and it really is un-marked', r.unsent >= 1, 'unsent writes = ' + r.unsent);
}

/* ── 5. the email path carries the same guard ─────────────────────────────── */
const emailGuard = await page.evaluate(() => {
  const s = document.documentElement.outerHTML;
  /* 1080+: priceOkToSend awaits crAsk, so callers read `!await priceOkToSend(`.
     Accept both spellings — the contract (both paths gated on it) is unchanged. */
  return { onEmail: /if\(!(?:await )?priceOkToSend\(/.test(s),
           onToggle: /if\(toSent && !(?:await )?priceOkToSend\(/.test(s),
           helper: (s.match(/function priceOkToSend\(what\)\{/g) || []).length,
           wavesThrough: /if\(t === null\) return true;/.test(s) };
});
chk('the Email-to-client path is guarded too', emailGuard.onEmail === true);
chk('the Mark-sent path is guarded', emailGuard.onToggle === true);
chk('priceOkToSend is defined exactly once', emailGuard.helper === 1, 'count ' + emailGuard.helper);
chk('the wave-through for documents with no total is present', emailGuard.wavesThrough === true);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
