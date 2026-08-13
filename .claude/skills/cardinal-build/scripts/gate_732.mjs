/* gate_732.mjs — the app must not ask the `contracts` table for columns or values
   it does not have. Three sites did, and none of them threw:

     doVoid()                     status:'voided'   -> CHECK refuses; Void never worked
     check_1_advancedNoSignedContract   .not('signed_at'...)  -> no such column
     check_2_signedNoSignature          .select(...signed_at) -> no such column

   The last two degrade to their own "Cannot verify" branch, which is why two
   integrity checks reported a soft warning for their whole life instead of ever
   checking anything.

   THE SCHEMA BELOW IS THE LIVE ONE, read from project yipslubcptjoarblzbpl:
     select column_name from information_schema.columns
      where table_schema='public' and table_name='contracts';
     select conname, pg_get_constraintdef(oid) from pg_constraint
      where conrelid='public.contracts'::regclass and contype='c';
   Re-read it rather than trusting this comment if the table has changed.

   Usage: node gate_732.mjs [path/to/index.html]     (v731 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = readFileSync(APP, 'utf8');

const CONTRACT_COLUMNS = ['id', 'created_at', 'updated_at', 'created_by', 'project_id',
  'source_ai_estimate_id', 'source_project_id', 'template', 'contract_number', 'contract',
  'total', 'status', 'sent_at', 'contractor_signed_at', 'homeowner_signed_at',
  'voided_at', 'void_reason', 'signed_pdf_url'];
const CONTRACT_STATUS = ['draft', 'sent', 'signed', 'void', 'change_ordered'];

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

/* ── A. static scan of the shipped source ────────────────────────────────────
   These are the cheap checks, and they are the ones that would have caught the
   original defect — no browser needed, just the schema written down. */

/* every column named in a .from('contracts') chain: select lists, .not(), .eq() */
const chains = [...SRC.matchAll(/from\('contracts'\)([\s\S]{0,400}?)(?:;|\n\s*\n)/g)].map(m => m[1]);
const named = new Set();
for (const c of chains) {
  for (const m of c.matchAll(/\.select\(\s*'([^']*)'/g))
    m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => named.add(s));
  for (const m of c.matchAll(/\.(?:not|eq|neq|is|gt|lt|gte|lte|in|order)\(\s*'([a-z_]+)'/g))
    named.add(m[1]);
  for (const m of c.matchAll(/\.update\(\s*\{([^}]*)\}/g))
    [...m[1].matchAll(/([a-z_]+)\s*:/g)].forEach(x => named.add(x[1]));
}
const unknown = [...named].filter(c => c && c !== '*' && !CONTRACT_COLUMNS.includes(c));
chk('every column the app names on `contracts` exists in the table',
    unknown.length === 0, unknown.length ? 'NOT IN SCHEMA: ' + unknown.join(', ') : `${named.size} columns, all real`);

/* signed_at specifically — the one that was wrong, called out by name so the
   failure message says what to fix */
chk('nothing references contracts.signed_at (the column is homeowner_signed_at)',
    !/\bsigned_at['"]\s*,\s*['"]is['"]/.test(SRC) && !/contract_number,\s*contract,\s*signed_at/.test(SRC),
    'signed_at filters: ' + (SRC.match(/\.not\('signed_at'/g) || []).length);

/* every status literal written to contracts must satisfy the CHECK */
const statusWrites = [...SRC.matchAll(/status\s*:\s*'([a-z_]+)'/g)].map(m => m[1]);
const contractish = statusWrites.filter(s => /^(void|voided|draft|signed|change_ordered)/.test(s));
const badStatus = contractish.filter(s => !CONTRACT_STATUS.includes(s));
chk('every contract status literal satisfies contracts_status_check',
    badStatus.length === 0, badStatus.length ? 'REFUSED BY CHECK: ' + badStatus.join(', ') : contractish.join(', '));

/* ── B. drive the two health checks ─────────────────────────────────────────── */
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Approved', sales_rep: 'theo@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  /* one signed contract with no signature in the blob — check_2's exact target */
  contracts: [{ id: 'C1', project_id: 'P1', status: 'signed', template: 'roofing',
                contract_number: 'CRC-1', total: 1000, contract: {}, created_by: 'theo@cardinalrenovations.net',
                homeowner_signed_at: now, contractor_signed_at: now, sent_at: now, voided_at: null }],
  inspection_reports: [], estimates: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SRC });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
/* the real PostgREST answers an unknown column with an error; the mock is lenient,
   so teach it to reject one for this run — otherwise the control would pass */
await page.addInitScript(cols => {
  window.__STRICT_CONTRACT_COLS__ = cols;
}, CONTRACT_COLUMNS);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* wrap the mock so a query naming a column outside the real schema errors the way
   PostgREST does (42703), which is what made these two checks silently useless */
await page.evaluate(cols => {
  const allow = new Set(cols);
  const sb = window.supa || window.sb;
  if (!sb || !sb.from) return;
  const origFrom = sb.from.bind(sb);
  sb.from = function (t) {
    const q = origFrom(t);
    if (t !== 'contracts') return q;
    const bad = [];
    const wrap = (name) => {
      const f = q[name];
      if (typeof f !== 'function') return;
      q[name] = function (a, ...rest) {
        if (typeof a === 'string') {
          const cs = name === 'select' ? a.split(',').map(s => s.trim()) : [a];
          cs.forEach(c => { if (c && c !== '*' && !allow.has(c)) bad.push(c); });
        }
        return f.call(q, a, ...rest);
      };
    };
    ['select', 'not', 'eq', 'is', 'in', 'order'].forEach(wrap);
    const origThen = q.then.bind(q);
    q.then = function (res, rej) {
      if (bad.length) return Promise.resolve({ data: null, error: { code: '42703', message: 'column contracts.' + bad[0] + ' does not exist' } }).then(res, rej);
      return origThen(res, rej);
    };
    return q;
  };
}, CONTRACT_COLUMNS);

/* the check functions live inside cr-inv-script's IIFE — the public door is
   CardinalInvariants.run(), which is also how the app itself reaches them */
const health = await page.evaluate(async () => {
  if (!window.CardinalInvariants || typeof window.CardinalInvariants.run !== 'function') return { missing: true };
  try {
    const rows = await window.CardinalInvariants.run();
    const by = {};
    (rows || []).forEach(r => { by[r.key] = r; });
    return by;
  } catch (e) { return { threw: String(e.message || e) }; }
});
chk('the invariants module is reachable', !health.missing && !health.threw, JSON.stringify(health).slice(0, 120));
const c1 = health['advanced-no-contract'] || {};
const c2 = health['signed-no-sig'] || {};
chk('health check 1 actually runs (not "Cannot verify")',
    !/cannot verify/i.test(c1.message || '') && !c1.missing, JSON.stringify(c1).slice(0, 180));
chk('health check 2 actually runs (not "Cannot verify")',
    !/cannot verify/i.test(c2.message || '') && !c2.missing, JSON.stringify(c2).slice(0, 180));
/* the seed is one signed contract whose blob has no signature — check 2 must SEE it */
chk('health check 2 finds the seeded signature-less contract', Number(c2.count) === 1, 'count=' + c2.count);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
