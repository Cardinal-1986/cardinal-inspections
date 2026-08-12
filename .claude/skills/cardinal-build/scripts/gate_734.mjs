/* gate_734.mjs — logging a check names the commission the DB trigger created.
   The commission is NOT written by the client: commission_on_collection is
   AFTER INSERT ON collections EXECUTE make_commission(), so at the moment
   miSaveColl's insert returns the app knows nothing about it. e2e_mock_supa.js
   now models that trigger (734) — without it this cannot be tested at all.

   The claim under test is also "zero extra queries", so the gate COUNTS the
   commissions reads across the save and asserts the number did not grow.

   Usage: node gate_734.mjs [path/to/index.html]     (v733 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function run(seed, drive) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, seed);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
  await page.waitForTimeout(1000);
  const out = await drive(page);
  await ctx.close();
  return out;
}

function seedFor(rep) {
  return {
    team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                    { email: 'nick@cardinalrenovations.net', name: 'Nick Hey', role: 'sales' }],
    projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Invoiced', sales_rep: rep,
                 checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
                 created_by: 'theo@cardinalrenovations.net', updated_at: now }],
    collections: [], commissions: [], draws: [],
    inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], punch_items: [], appointments: []
  };
}

/* open the collection form, type an amount, save, read the toast */
const logCollection = (amount) => async (page) => {
  await page.evaluate(() => {
    try { showTab('commissions'); } catch (e) {}
    const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
    if (window.commUi) { window.commUi.collForm = true; window.commUi.editColl = null; }
    try { renderCommissions(); } catch (e) {}
  });
  await page.waitForTimeout(800);
  /* the mock ALREADY logs every select into window.__READS__ as {table,n} — use its
     log rather than wrapping sb.from. The first cut set window.__READS__ = 0 to count
     with, which clobbered that array; the mock then threw "__READS__.push is not a
     function" INSIDE renderCommissions, its catch rendered "Could not load
     commissions", renderCommissions returned early, and the toast lost its commission
     clause. That read exactly like the feature being broken, and it was the gate. */
  await page.evaluate(() => { window.__WRITES__ = []; window.__READS__ = []; });
  await page.fill('#miAmt', String(amount));
  await page.evaluate(() => { const b = document.getElementById('miSave'); if (b) b.click(); });
  /* wait for the toast to EXIST rather than sleeping a guessed amount — a fixed
     sleep read the message mid-flight and reported the collection line without
     the commission clause, which looked exactly like the feature not working */
  await page.waitForFunction(() => document.querySelectorAll('#crToasts .crt').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return page.evaluate(() => ({
    toast: [...document.querySelectorAll('#crToasts .crt')].map(e => e.innerText.replace(/\s*×\s*$/, '').replace(/\s+/g, ' ').trim()),
    commissions: ((window.__SEED__ && window.__SEED__.commissions) || []).map(c => ({ amt: c.amount, rep: c.rep_email })),
    reads: (window.__READS__ || []).filter(r => r.table === 'commissions').length,
    /* ask the APP how it formats money and names a rep — hardcoding "$1,702.50"
       here asserted my assumption, not the app's behaviour. Same class as 732's
       mock-with-no-constraints.
       ⚠️ UPDATED AT BUILD 745: this call site now asks for exact cents
       (fmtMoney(x, true)), because a toast that names a specific commission
       should not round $1,702.50 to $1,703. The expectation has to be computed
       in the SAME mode as the call site or it drifts the moment either moves —
       this went red on 745 and the gate was what was stale, not the app. */
    expect: (function(){ try { return { money: fmtMoney(1702.5, true), rep: rptRepName('nick@cardinalrenovations.net') }; }
                         catch(e){ return { money: null, rep: null }; } })()
  }));
};

/* ── 1. the headline case: a job with a rep ───────────────────────────────── */
{
  const r = await run(seedFor('nick@cardinalrenovations.net'), logCollection(17025));
  const t = (r.toast || []).join(' | ');
  chk('the DB trigger really did create a commission', r.commissions.length === 1,
      JSON.stringify(r.commissions));
  chk('the toast names the collection', /Collection logged/.test(t) && /17,025/.test(t), t);
  chk('the toast names the COMMISSION AMOUNT, as the app formats money',
      !!r.expect.money && t.indexOf(r.expect.money) !== -1, `expected ${r.expect.money} in: ${t}`);
  chk('the toast names the REP BY NAME, not by email',
      !!r.expect.rep && t.indexOf('for ' + r.expect.rep) !== -1 && !/@/.test(t), `expected "for ${r.expect.rep}" in: ${t}`);
  chk('one commissions read across the save (no extra query added)', r.reads <= 1, 'commissions reads = ' + r.reads);
}

/* ── 2. a job with NO rep — no commission is correct, not a failure ───────── */
{
  const r = await run(seedFor(null), logCollection(5000));
  const t = (r.toast || []).join(' | ');
  chk('no rep on the job -> no commission row', r.commissions.length === 0, JSON.stringify(r.commissions));
  chk('no rep -> the toast still confirms the collection', /Collection logged/.test(t) && /5,000/.test(t), t);
  chk('no rep -> it does NOT invent a commission', !/commission/i.test(t), t);
  chk('no rep -> and it is not an error', !/#crToasts \.crt\.err/.test(t) && !/could not/i.test(t), t);
}

/* ── 3. EDITING an existing collection fires no trigger ───────────────────── */
{
  const seed = seedFor('nick@cardinalrenovations.net');
  seed.collections = [{ id: 'C0', project_id: 'P1', amount: 1000, collected_at: '2026-08-01',
                        type: 'other', created_by: 'theo@cardinalrenovations.net', created_at: now }];
  const r = await run(seed, async (page) => {
    await page.evaluate(() => {
      try { showTab('commissions'); } catch (e) {}
      const t = document.getElementById('tab-commissions'); if (t) t.style.display = 'block';
      if (window.commUi) { window.commUi.collForm = true; window.commUi.editColl = 'C0'; }
      try { renderCommissions(); } catch (e) {}
    });
    await page.waitForTimeout(800);
    await page.fill('#miAmt', '2000');
    await page.evaluate(() => { const b = document.getElementById('miSave'); if (b) b.click(); });
    await page.waitForTimeout(1800);
    return page.evaluate(() => ({
      toast: [...document.querySelectorAll('#crToasts .crt')].map(e => e.innerText.replace(/\s*×\s*$/, '').replace(/\s+/g, ' ').trim()),
      commissions: ((window.__SEED__ && window.__SEED__.commissions) || []).map(c => c.amount)
    }));
  });
  const t = (r.toast || []).join(' | ');
  chk('editing a collection creates no commission', r.commissions.length === 0, JSON.stringify(r.commissions));
  chk('editing -> the toast does not claim one was created', /Collection logged/.test(t) && !/commission/i.test(t), t);
}

/* ── 4. the "zero extra queries" claim, checked against the source ────────── */
const q = (APP_HTML.match(/from\('commissions'\)/g) || []).length;
chk('the app still makes exactly 5 commissions queries in source (none added)', q === 5, 'found ' + q);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
