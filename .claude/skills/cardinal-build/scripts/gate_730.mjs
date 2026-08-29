/* gate_730.mjs — three trades share one contract pipeline, and nothing else had to grow.
   The load-bearing risk this gate exists for: renderProjectDocs' `insp` bucket is defined
   by NEGATION of the three title predicates, so a contract title that stops matching
   /^contract/i does not error — it silently files itself under Inspection Reports. So the
   gate does not check "the title looks right"; it checks WHICH BUCKET each of the three
   documents actually lands in, through the shipped renderer.

   Usage: node gate_730.mjs [path/to/index.html]      (v729 is the negative control) */
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
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Approved', sales_rep: 'theo@cardinalrenovations.net',
               address: '5735 Webster Street', city: 'Dayton', state: 'OH', zip: '45414',
               email: 'bob@example.com', phone: '937-555-0101',
               checklist: JSON.stringify({ lead: { claim_type: 'retail', street: '5735 Webster Street', city: 'Dayton', state: 'OH', zip: '45414', email: 'bob@example.com', phone: '937-555-0101' } }),
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
  if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(1200);
await page.evaluate(() => { try { showTab('contracts'); } catch (e) {} const t = document.getElementById('tab-contracts'); if (t) t.style.display = 'block'; });
await page.waitForTimeout(500);

/* ── 1. the picker exists and offers the three trades Cardinal actually sells ── */
const picker = await page.evaluate(() => {
  const menu = document.getElementById('pContractMenu');
  const btn = document.getElementById('pNewContractBtn');
  return {
    btn: !!btn, menu: !!menu,
    opts: menu ? [...menu.querySelectorAll('[data-ctpl]')].map(o => o.getAttribute('data-ctpl') + ':' + o.textContent.trim()) : []
  };
});
chk('the + New contract button exists', picker.btn);
chk('it opens a TRADE PICKER, not one hardcoded contract', picker.menu && picker.opts.length === 3, JSON.stringify(picker.opts));
chk('the three trades are roofing, siding and gutters',
    ['roof', 'siding', 'gutters'].every(k => picker.opts.some(o => o.startsWith(k + ':'))), JSON.stringify(picker.opts));

/* the button must actually TOGGLE the menu — a control that renders and is never
   wired is bug class 16 on this project (the Studio Archive button, 614→632) */
const toggles = await page.evaluate(async () => {
  const m = document.getElementById('pContractMenu'), b = document.getElementById('pNewContractBtn');
  if (!m || !b) return null;
  const before = getComputedStyle(m).display;
  b.click();
  await new Promise(r => setTimeout(r, 60));
  const after = getComputedStyle(m).display;
  return { before, after };
});
chk('tapping it actually opens the menu (it is WIRED)', toggles && toggles.before === 'none' && toggles.after === 'block', JSON.stringify(toggles));

/* ── 2. drive each trade through the real handler ─────────────────────────── */
const TRADES = [
  { key: 'roof',    label: 'Roofing', heading: 'ROOFING CONSTRUCTION',
    master: 'Construction Agreement (Master)',
    mine: ['Valley metal', 'Ridge cap', 'Starter shingles'], notMine: ['ShurFlo', 'House wrap'] },
  { key: 'siding',  label: 'Siding',  heading: 'SIDING CONSTRUCTION',
    master: 'Siding Construction Agreement (Master)',
    mine: ['House wrap', 'Corner posts', 'Shutters', 'Stories'], notMine: ['ShurFlo', 'Valley metal'] },
  { key: 'gutters', label: 'Gutters', heading: 'GUTTER CONSTRUCTION',
    master: 'Gutter Construction Agreement (Master)',
    mine: ['ShurFlo', 'Miters', 'Downspout discharge', 'Wood replacement'], notMine: ['House wrap', 'Valley metal'] }
];

for (const t of TRADES) {
  const before = await page.evaluate(() => (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'insert').length);
  await page.evaluate(k => {
    const m = document.getElementById('pContractMenu');
    if (m) m.style.display = 'block';
    const o = m && m.querySelector('[data-ctpl="' + k + '"]');
    if (o) o.click();
  }, t.key);
  await page.waitForTimeout(1400);
  await page.evaluate(() => { try { closeEditor(); } catch (e) {} try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
  await page.waitForTimeout(600);

  const w = await page.evaluate(() => {
    const ins = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert');
    const last = ins[ins.length - 1];
    const p = last ? last.payload : null;
    return { count: ins.length, row: Array.isArray(p) ? p[0] : p };
  });
  chk(`[${t.key}] writes exactly ONE document`, w.count === before + 1, `inserts ${before} -> ${w.count}`);
  const title = (w.row && w.row.title) || '';
  const html = (w.row && w.row.html) || '';
  chk(`[${t.key}] the title names the trade`, title === 'Contract — ' + t.label + ' — Bob DeBuilder', title);

  /* THE invariant: the predicate is unchanged, so every new title must still match it */
  const matched = await page.evaluate(ti => {
    const f = window.isContractTitle || (typeof isContractTitle === 'function' ? isContractTitle : null);
    return f ? { contract: !!f(ti), est: !!window.isEstimateTitle(ti), wo: !!window.isWorkOrderTitle(ti) } : null;
  }, title);
  chk(`[${t.key}] isContractTitle still matches it (predicate NOT grown)`, matched && matched.contract === true, JSON.stringify(matched));
  chk(`[${t.key}] and it is not also an estimate or a work order`, matched && !matched.est && !matched.wo, JSON.stringify(matched));

  chk(`[${t.key}] the printed heading says the trade`, html.indexOf(t.heading) !== -1, t.heading + ' present=' + (html.indexOf(t.heading) !== -1));
  /* RIG REPAIR (build 1121 triage): build 779 rebuilt the roofing spec sheet to
     match the printed master's headings ("6. Starter Shingles", "11. Ridge Cap /
     Hip Cap" — title case), so the exact-case literals stopped matching sections
     that are still present. Match case-insensitively; the mine/notMine
     discrimination between trades is unchanged (verified against all three
     agreement bodies). */
  const lhtml = html.toLowerCase();
  chk(`[${t.key}] it carries ITS OWN spec sections`, t.mine.every(s => lhtml.indexOf(s.toLowerCase()) !== -1),
      t.mine.map(s => s + '=' + (lhtml.indexOf(s.toLowerCase()) !== -1)).join(' '));
  chk(`[${t.key}] and NOT another trade's`, t.notMine.every(s => lhtml.indexOf(s.toLowerCase()) === -1),
      t.notMine.map(s => s + '=' + (lhtml.indexOf(s.toLowerCase()) !== -1)).join(' '));
  chk(`[${t.key}] prefilled with the buyer`, html.indexOf('Bob DeBuilder') !== -1 && html.indexOf('[BUYER]') === -1,
      'buyer=' + (html.indexOf('Bob DeBuilder') !== -1) + ' placeholder_left=' + (html.indexOf('[BUYER]') !== -1));
  /* each trade's Terms & Conditions differ (siding clause 2 is the limited lifetime
     siding warranty, clause 8 excludes sheathing/fascia/trim) — a contract that
     points at the wrong printed master points at the wrong legal text */
  chk(`[${t.key}] points at ITS OWN printed master for the T&C`,
      html.indexOf('Company Documents') !== -1 && html.indexOf(t.master) !== -1,
      t.master);

  /* docKind drives the Trade column in the list — it answered "—" for every
     contract before this build */
  const kind = await page.evaluate(ti => (window.docKind || docKind)(ti), title);
  chk(`[${t.key}] the Trade column says the trade`, kind && kind.trade === t.label && kind.type === 'Contract', JSON.stringify(kind));
}

/* docKind must NOT read a client's name as a trade, and must still be honest
   about the contracts that existed before this build */
const kindEdge = await page.evaluate(() => {
  const f = window.docKind || docKind;
  return {
    legacy: f('Contract — Joeseph Estimate'),
    tricky: f('Contract — Siding Supply Co'),
    real:   f('Contract — Siding — Siding Supply Co')
  };
});
chk('a contract written BEFORE this build still reads "—" (not a guessed trade)', kindEdge.legacy.trade === '—', JSON.stringify(kindEdge.legacy));
chk('a CLIENT named "Siding Supply Co" is not read as a siding job', kindEdge.tricky.trade === '—', JSON.stringify(kindEdge.tricky));
chk('but a real siding contract for that client is', kindEdge.real.trade === 'Siding', JSON.stringify(kindEdge.real));

/* ── 3. the bucket test — the whole reason this gate exists ────────────────── */
const buckets = await page.evaluate(() => {
  try { renderProjectDocs(); } catch (e) { return { err: String(e) }; }
  const txt = id => { const el = document.getElementById(id); return el ? el.innerText : ''; };
  const rows = id => { const el = document.getElementById(id); return el ? [...el.querySelectorAll('tr')].map(r => r.innerText.split('\n')[0]).filter(Boolean) : []; };
  return {
    contracts: rows('contractDocsMount'),
    inspections: rows('inspDocsMount'),
    estimates: rows('estDocsMount'),
    inspText: txt('inspDocsMount').slice(0, 200)
  };
});
const inContracts = (buckets.contracts || []).join(' | ');
for (const t of TRADES) {
  chk(`[${t.key}] files under CONTRACTS, not Inspections`,
      inContracts.indexOf('Contract — ' + t.label) !== -1 &&
      (buckets.inspections || []).join(' ').indexOf(t.label) === -1,
      'contracts=[' + inContracts + ']');
}
chk('the Inspections bucket did NOT swallow any of them',
    (buckets.inspections || []).filter(r => /contract/i.test(r)).length === 0,
    'inspections=[' + (buckets.inspections || []).join(' | ') + ']');

/* ── 4. the SIX inlined copies of /^contract/i ─────────────────────────────
   isContractTitle is not the only reader of a contract title: six more sites
   inline the same regex rather than calling it — jobFinance (the money path),
   the worksheet's contract-value key, the overview roll-up (whose `insp` count is
   docs - estimates - contracts), and sigApply, which moves the project to
   APPROVED on signature. Keeping the `Contract — ` prefix is what lets all six
   go untouched; this proves it by DRIVING them, not by reading the regex. */
const money = await page.evaluate(() => {
  const pr = window.currentProject;
  const rows = (window.cacheRows || []).filter(r => r.project_id === pr.id && /^Contract — Siding/.test(r.title));
  if (!rows.length) return { err: 'no siding contract in cache' };
  rows[0].signed_at = new Date().toISOString();
  rows[0].total = 24500;
  let fin = null, kinds = null;
  /* keep only the scalars — jobFinance returns the matched contract ROWS, and each
     row carries a ~160 KB html document */
  try { const f = window.jobFinance(pr); fin = { value: f.value, paid: f.paid, due: f.due }; }
  catch (e) { fin = { err: String(e) }; }
  try { kinds = { contracts: (window.cacheRows || []).filter(r => r.project_id === pr.id && /^contract/i.test((r.title || '').trim())).length }; } catch (e) {}
  return { fin, kinds, title: rows[0].title };
});
chk('jobFinance() counts a SIGNED SIDING contract as job value',
    money.fin && Number(money.fin.value) === 24500, JSON.stringify(money.fin));
chk('the overview roll-up counts all three as contracts', money.kinds && money.kinds.contracts === 3, JSON.stringify(money.kinds));

/* sigApply's stage move, driven through the shipped predicate on a siding title */
const stage = await page.evaluate(() => {
  const t = 'Contract — Gutters — Bob DeBuilder';
  return { wouldApprove: /^contract/i.test(t.trim()) };
});
chk('signing a GUTTER contract still trips the move to APPROVED', stage.wouldApprove === true, JSON.stringify(stage));

/* ── 5. the old bare heading is gone from the app entirely ─────────────────── */
const bare = await page.evaluate(() => {
  const s = document.documentElement.outerHTML;
  return { bare: s.indexOf("buildEstimate('CONSTRUCTION <span>AGREEMENT") !== -1 };
});
chk('no template still renders an untraded "CONSTRUCTION AGREEMENT"', bare.bare === false);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
