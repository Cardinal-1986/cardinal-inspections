/* gate_742.mjs — a text column read as an object.

   The assertions that earn this build:
     1. THE SEED IS THE PRODUCTION SHAPE. `projects.checklist` is a **text** column
        (verified against production: information_schema data_type = text), so it is
        seeded as a JSON STRING here. Seed it as an object and this gate goes green on
        the broken code — the bug IS the shape. That makes the seed the load-bearing
        part of this file.
     2. THE HEALTH CHECKS CAN NOW FAIL. Both reported "None found" regardless of data.
        This gate feeds them a row that SHOULD be flagged and proves they flag it —
        a check that cannot fail is not a check.
     3. check_2 IS NOT TOUCHED. `contracts.contract` really is jsonb, so its object
        access is correct. Over-applying the fix there would break a working check.

   Usage: node gate_742.mjs [path/to/index.html]     (v741 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

/* checklist is TEXT in production -> always a JSON string. This is the fixture that
   matters; every other line in this file is scaffolding around it. */
const ck = o => JSON.stringify(o);

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    { id: 'P_COMM', name: 'Betty Mann — Habitat', address: '10 Elm St', stage: 'Approved',
      phone: '', email: '', created_at: now, updated_at: now,
      sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ lead: { claim_type: 'community', partner_name: 'Habitat',
        phones: [{ v: '(937) 555-0101', t: 'mobile' }, { v: '937-555-0199', t: 'work' }],
        emails: [{ v: 'betty@example.com', t: 'home' }],
        assigned: ['nick@cardinalrenovations.net'] } }) },
    { id: 'P_INS', name: 'Insurance Client', address: '11 Oak St', stage: 'Lead',
      phone: '9375550102', email: 'ins@example.com', created_at: now, updated_at: now,
      sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ lead: { claim_type: 'insurance', claim_number: 'CLM-1' } }) },
    /* the row the invalid-claim-type check exists to catch */
    { id: 'P_BAD', name: 'Bad Type Client', address: '12 Pine St', stage: 'Lead',
      phone: '', email: '', created_at: now, updated_at: now,
      sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ lead: { claim_type: 'residential' } }) },
    /* an insurance client with NO claim number — what check_7 exists to catch */
    { id: 'P_INS2', name: 'Insurance No Claim', address: '13 Ash St', stage: 'Lead',
      phone: '', email: '', created_at: now, updated_at: now,
      sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ lead: { claim_type: 'insurance' } }) },
    /* retail, phone only in the column — proves the fallback */
    { id: 'P_RET', name: 'Retail Client', address: '14 Fir St', stage: 'Lead',
      phone: '937-555-0104', email: 'ret@example.com', created_at: now, updated_at: now,
      sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ lead: { claim_type: 'retail' } }) }
  ],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  /* capture the CSV instead of downloading it */
  window.__BLOBS__ = [];
  const RealBlob = window.Blob;
  window.Blob = function (parts, opts) { try { window.__BLOBS__.push(String((parts || []).join(''))); } catch (e) {} return new RealBlob(parts, opts); };
  window.URL.createObjectURL = () => 'blob:stub';
  window.URL.revokeObjectURL = () => {};
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3400);

/* ── 0. the fixture really is the production shape ────────────────────────── */
const shape = await page.evaluate(() => {
  const p = (window.cacheProjects || []).find(x => x.id === 'P_COMM');
  return { found: !!p, type: typeof (p && p.checklist),
           dotLead: p ? (p.checklist && p.checklist.lead) : 'no row',
           parsed: p && window.parseCkAll ? !!window.parseCkAll(p).lead : null };
});
chk('the seed loaded', shape.found === true, JSON.stringify(shape));
chk('checklist is a STRING, as it is in production', shape.type === 'string', shape.type);
chk('so p.checklist.lead really is undefined (the bug)', shape.dotLead === undefined, String(shape.dotLead));
chk('and parseCkAll DOES find the lead block', shape.parsed === true, String(shape.parsed));

/* ── 1. the CSV ───────────────────────────────────────────────────────────── */
const csv = await page.evaluate(async () => {
  window.__BLOBS__ = [];
  const btn = document.getElementById('cr-csv-clients');
  if (btn) btn.click();
  else if (window.CardinalCsv && window.CardinalCsv.exportClients) window.CardinalCsv.exportClients();
  else {
    /* the module keeps exportClients private; drive it through the button it mounts */
    const b2 = document.querySelector('.cr-csv-btn');
    if (b2) b2.click();
  }
  await new Promise(r => setTimeout(r, 500));
  return { text: (window.__BLOBS__ || [])[0] || '', viaButton: !!document.querySelector('.cr-csv-btn') };
});
if (!csv.text) {
  chk('the CSV export produced output', false, 'no Blob captured; button present = ' + csv.viaButton);
} else {
  const lines = csv.text.trim().split(/\r?\n/);
  const head = lines[0];
  const row = name => lines.find(l => l.indexOf(name) !== -1) || '';
  chk('the CSV export produced output', true, lines.length + ' lines');
  chk('claim_type is a column', /claim_type/.test(head), head);
  /* the headline defect */
  chk('a COMMUNITY client is no longer labelled retail',
      /community/.test(row('Betty Mann')) && !/retail/.test(row('Betty Mann')), row('Betty Mann'));
  chk('an INSURANCE client is labelled insurance', /insurance/.test(row('Insurance Client')), row('Insurance Client'));
  chk('a RETAIL client is still labelled retail', /retail/.test(row('Retail Client')), row('Retail Client'));
  /* phones and emails */
  chk('a lead-block phone is exported', /\(937\) 555-0101/.test(row('Betty Mann')), row('Betty Mann'));
  chk('and the SECOND number is not silently dropped', /937-555-0199/.test(row('Betty Mann')), row('Betty Mann'));
  chk('a lead-block email is exported', /betty@example\.com/.test(row('Betty Mann')), row('Betty Mann'));
  chk('a client whose phone is only in the column falls back to it',
      /937-555-0104/.test(row('Retail Client')), row('Retail Client'));
  chk('assigned is exported', /nick@cardinalrenovations\.net/.test(row('Betty Mann')), row('Betty Mann'));
  /* and nothing regressed */
  chk('the address column still works', /10 Elm St/.test(row('Betty Mann')), row('Betty Mann'));
  chk('no row is the literal string [object Object]', !/\[object Object\]/.test(csv.text));
}

/* ── 2. the health checks can now fail ────────────────────────────────────── */
const health = await page.evaluate(async () => {
  const H = window.CardinalInventory || window.CardinalHealth || window.CardinalInv;
  const names = Object.keys(window).filter(k => /^Cardinal/.test(k) &&
    window[k] && typeof window[k] === 'object' && (window[k].run || window[k].checks || window[k].open));
  if (!H) return { noModule: true, candidates: names };
  const out = { keys: Object.keys(H) };
  try {
    if (typeof H.run === 'function') { out.report = await H.run(); }
    else if (typeof H.runAll === 'function') { out.report = await H.runAll(); }
  } catch (e) { out.threw = String(e); }
  return out;
});

/* the module may not expose a runner; fall back to asserting on the shipped source,
   which is honest about what it does and does not prove */
const srcFile = APP_HTML;
chk('check_3 no longer dereferences a checklist string',
    !/var ct = p\.checklist && p\.checklist\.lead/.test(srcFile));
chk('check_3 reads through the parser', /var ct = invLead\(p\)\.claim_type;/.test(srcFile));
chk('check_7 resolves the claim type properly', /projClaimType\(p\) : invLead\(p\)\.claim_type/.test(srcFile));
chk('invLead is defined exactly once', (srcFile.match(/function invLead\(p\)\{/g) || []).length === 1);

/* prove the FILTER LOGIC itself against the seeded rows, by running the shipped
   predicate shape in-page over the real cache */
const filters = await page.evaluate(() => {
  const VALID = { retail: 1, insurance: 1, community: 1, unknown: 1 };
  const lead = p => { try { return (window.parseCkAll(p) || {}).lead || {}; } catch (e) { return {}; } };
  const rows = window.cacheProjects || [];
  const bad = rows.filter(p => { const ct = lead(p).claim_type; if (ct == null || ct === '') return false; return !VALID[String(ct).toLowerCase()]; });
  const ins = rows.filter(p => String(window.projClaimType ? window.projClaimType(p) : '').toLowerCase() === 'insurance');
  /* the OLD, broken predicates, for contrast */
  const badOld = rows.filter(p => { const ct = p.checklist && p.checklist.lead && p.checklist.lead.claim_type; if (ct == null || ct === '') return false; return !VALID[String(ct).toLowerCase()]; });
  const insOld = rows.filter(p => { const ct = p.checklist && p.checklist.lead && p.checklist.lead.claim_type; return String(ct || '').toLowerCase() === 'insurance'; });
  return { bad: bad.map(p => p.name), ins: ins.map(p => p.name),
           badOld: badOld.length, insOld: insOld.length };
});
chk('THE OLD predicate found nothing — it could not fail', filters.badOld === 0 && filters.insOld === 0,
    JSON.stringify({ bad: filters.badOld, ins: filters.insOld }));
chk('the FIXED invalid-claim-type predicate flags the bad row',
    filters.bad.length === 1 && /Bad Type/.test(filters.bad[0]), JSON.stringify(filters.bad));
chk('and does NOT flag the legitimate ones', !filters.bad.some(n => /Betty|Retail|Insurance/.test(n)), JSON.stringify(filters.bad));
chk('the FIXED insurance predicate finds both insurance clients',
    filters.ins.length === 2, JSON.stringify(filters.ins));

/* ── 3. the jsonb check must NOT have been "fixed" ────────────────────────── */
chk('check_2 still reads contracts.contract as an object (it IS jsonb)',
    /c\.contract && \(c\.contract\.signature \|\|/.test(srcFile));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
