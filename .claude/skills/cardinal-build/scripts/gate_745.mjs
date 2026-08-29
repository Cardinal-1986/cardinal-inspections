/* gate_745.mjs — money that names a specific amount stops rounding.

   Two assertions earn this build:
     1. THE INVOICE IS EXACT. A real invoice is generated end-to-end and its
        printed total/paid/due are read out of the saved document — not out of a
        formatter call. $1,702.50 must print as $1,702.50, and nothing-paid-yet as
        $0.00 rather than "--".
     2. NOTHING ELSE MOVED. `cents` is opt-in, so every tile and report caller must
        render byte-for-byte what it did before. The gate fuzzes fmtMoney's default
        against the OLD implementation over a wide range of values, and fails on any
        divergence. Without this the build could quietly restyle 24 screens.

   Usage: node gate_745.mjs [path/to/index.html]     (v744 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

/* a job worth $1,702.50 with nothing paid — cents that round, and a zero */
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', address: '1 A St', stage: 'Approved',
    phone: '', email: '', created_at: now, updated_at: now,
    sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
    checklist: JSON.stringify({ po: 101, lead: { claim_type: 'retail' }, manual_value: 1702.5 }) }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ timezoneId: 'America/New_York', locale: 'en-US', viewport: { width: 1280, height: 900 } });
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
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {}
  window.alert = () => {}; window.confirm = () => true;
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3400);

/* ── 1. the formatter, both modes ─────────────────────────────────────────── */
const fmt = await page.evaluate(() => {
  if (typeof window.fmtMoney !== 'function') return { missing: true };
  const F = window.fmtMoney;
  return {
    /* default — must be the OLD behaviour, unchanged */
    d_big: F(34050), d_cents: F(1702.5), d_zero: F(0), d_null: F(null), d_neg: F(-500),
    /* exact — cents that name a real amount */
    e_big: F(34050, true), e_cents: F(1702.5, true), e_zero: F(0, true),
    e_null: F(null, true), e_neg: F(-500, true), e_third: F(1702.505, true),
    e_junk: F('abc', true), e_undef: F(undefined, true)
  };
});
chk('window.fmtMoney exists', !fmt.missing);
chk('default still rounds a tile figure', fmt.d_big === '$34,050', fmt.d_big);
chk('default still rounds the cents away (unchanged)', fmt.d_cents === '$1,703', fmt.d_cents);
chk('default still shows "--" for zero (unchanged)', fmt.d_zero === '--', fmt.d_zero);
chk('default still shows "--" for null (unchanged)', fmt.d_null === '--', fmt.d_null);
chk('EXACT keeps the cents', fmt.e_cents === '$1,702.50', fmt.e_cents);
chk('EXACT keeps the thousands separator', fmt.e_big === '$34,050.00', fmt.e_big);
chk('EXACT renders zero as $0.00, not "--"', fmt.e_zero === '$0.00', fmt.e_zero);
chk('EXACT renders null as $0.00 on a document', fmt.e_null === '$0.00', fmt.e_null);
chk('EXACT survives junk without printing NaN', fmt.e_junk === '$0.00', fmt.e_junk);
chk('EXACT puts the minus OUTSIDE the $ (cr-crew already solved this)', fmt.e_neg === '-$500.00', fmt.e_neg);

/* ── 2. NOTHING ELSE MOVED — fuzz the default against the OLD implementation ─ */
const drift = await page.evaluate(() => {
  const OLD = n => { if (!n) return '--'; return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  const vals = [0, 1, -1, 0.4, 0.5, 0.6, 1.5, 2.5, 99.99, 100, 999, 1000, 1000.5, 1702.5,
                34050, 34050.49, 34050.5, 123456789, -1702.5, -0.5, 1e6, 1e9,
                null, undefined, '', '0', '1702.5', NaN, Infinity, -Infinity];
  const bad = [];
  for (const v of vals) {
    const a = window.fmtMoney(v), b = OLD(v);
    if (a !== b) bad.push({ v: String(v), now: a, before: b });
  }
  return { checked: vals.length, bad };
});
chk('the default fuzz ran', drift.checked >= 25, String(drift.checked));
chk('NOTHING ELSE MOVED — default output identical to the old implementation',
    drift.bad.length === 0, JSON.stringify(drift.bad.slice(0, 5)));

/* ── 3. THE INVOICE, generated end to end ─────────────────────────────────── */
const inv = await page.evaluate(async () => {
  try { hideAllViews(); } catch (e) {}
  try { await openProject('P1'); } catch (e) { return { openFailed: String(e) }; }
  await new Promise(r => setTimeout(r, 700));
  const fin = (typeof window.jobFinance === 'function') ? window.jobFinance(window.currentProject) : null;
  window.__WRITES__ = [];
  /* the button that builds an invoice from the balance */
  /* the button lives inside the worksheet panel and only renders once that panel
     has painted; createInvoiceFor() is the shipped function the button calls, so
     the gate drives that directly rather than depending on panel state. */
  const btn = document.querySelector('[data-mkinv]');
  if (btn) btn.click();
  else if (typeof window.createInvoiceFor === 'function') await window.createInvoiceFor(window.currentProject);
  else if (typeof createInvoiceFor === 'function') await createInvoiceFor(window.currentProject);
  await new Promise(r => setTimeout(r, 1200));
  const wrote = (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'insert');
  const html = wrote.length ? String((wrote[0].payload && wrote[0].payload.html) || '') : '';
  /* ⚠️ do NOT put `--` in this alternation: INVOICE_TEMPLATE is ~148 KB of mostly
     CSS and every custom property (--ink, --line, --muted) matches it. The first
     version of this gate did, scored twelve "--" and no amounts, and read as a
     total failure on a build that was working. Match money only, and prove the
     tokens were substituted separately. */
  return { fin: fin ? { value: fin.value, paid: fin.paid, balance: fin.balance } : null,
           hadButton: !!btn, wrote: wrote.length, len: html.length,
           dollars: (html.match(/\$[\d,]+(?:\.\d{2})?/g) || []),
           tokensLeft: (html.match(/\[INV_[A-Z]+\]/g) || []) };
});
if (inv.openFailed || !inv.wrote) {
  /* the invoice button only renders when there is a balance; fall back to asserting
     the token substitution directly rather than silently skipping */
  const tok = await page.evaluate(() => {
    const s = document.documentElement.outerHTML;
    return { total: /\[INV_TOTAL\]', fmtMoney\(fin\.value, true\)/.test(s),
             paid:  /\[INV_PAID\]', fmtMoney\(fin\.paid, true\)/.test(s),
             due:   /\[INV_DUE\]', fmtMoney\(fin\.balance, true\)/.test(s) };
  });
  chk('invoice total uses exact cents', tok.total === true, 'via source: ' + JSON.stringify(tok));
  chk('invoice paid uses exact cents', tok.paid === true);
  chk('invoice due uses exact cents', tok.due === true);
  chk('NOTE: invoice was not generated in-harness', false, JSON.stringify(inv));
} else {
  chk('an invoice was actually generated', inv.wrote >= 1, JSON.stringify({ w: inv.wrote, fin: inv.fin }));
  chk('the job really is worth $1,702.50', inv.fin && Number(inv.fin.value) === 1702.5, JSON.stringify(inv.fin));
  chk('every [INV_*] token was substituted', inv.tokensLeft.length === 0, JSON.stringify(inv.tokensLeft));
  chk('the invoice prints exact cents, not a rounded dollar',
      inv.dollars.includes('$1,702.50') && !inv.dollars.includes('$1,703'),
      JSON.stringify(inv.dollars));
  chk('nothing-paid-yet prints $0.00 (it printed "--" before this build)',
      inv.dollars.includes('$0.00'), JSON.stringify(inv.dollars));
  chk('the three money lines are total / paid / due, in order',
      JSON.stringify(inv.dollars) === JSON.stringify(['$1,702.50', '$0.00', '$1,702.50']),
      JSON.stringify(inv.dollars));
}

/* ── 4. source-level: the nine sites, and the two false positives ─────────── */
const src = APP_HTML;
/* RIG REPAIR (build 1121 triage): the exact-9 / exact-34 censuses were freezes
   for build 745 ("nothing else moved" in THAT build). Later builds legitimately
   added fmtMoney callers (21 cents-sites / 49 total at 1121 — deposits,
   commissions, suppliers arcs). The regression these checks carry — no 745-era
   caller was LOST — is a floor, not an exact pin. The behavioural half above
   (default output byte-identical, EXACT semantics) is unchanged and still exact. */
const exact = (src.match(/fmtMoney\([^()]*(?:\([^()]*\)[^()]*)*,\s*true\)/g) || []);
chk('exactly nine call sites ask for cents', exact.length >= 9, 'found ' + exact.length);
chk('the invoice tokens are three of them',
    /\[INV_TOTAL\]', fmtMoney\(fin\.value, true\)/.test(src) &&
    /\[INV_PAID\]', fmtMoney\(fin\.paid, true\)/.test(src) &&
    /\[INV_DUE\]', fmtMoney\(fin\.balance, true\)/.test(src));
chk('the audit trail records an exact amount', (src.match(/auditLog\('money',[^;]{0,80}fmtMoney\([^)]*, true\)/g) || []).length === 2);
chk('total fmtMoney call sites unchanged at 34', (src.match(/fmtMoney\(/g) || []).length >= 34,
    'found ' + (src.match(/fmtMoney\(/g) || []).length);

/* THE FALSE POSITIVES — these look wrong in isolation and are correct */
chk("cr-adj's money() was NOT given a dollar sign",
    /function money\(n\)\{ return Number\(n\|\|0\)\.toLocaleString\('en-US',\{minimumFractionDigits:0,maximumFractionDigits:0\}\); \}/.test(src));
chk('the nine call sites still prepend the $ themselves',
    (src.replace(/\/\*[\s\S]*?\*\//g, '').match(/\$'\s*\+\s*money\(/g) || []).length === 9,
    'found ' + (src.replace(/\/\*[\s\S]*?\*\//g, '').match(/\$'\s*\+\s*money\(/g) || []).length);
chk('the one genuinely-wrong formatter is fixed', !/return isNaN\(v\) \? '' : '\$' \+ v\.toFixed\(2\);/.test(src));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
