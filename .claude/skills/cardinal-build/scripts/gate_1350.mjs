// gate_1350 — Costs tab on the Payments card: costs + crew labor, gross profit and margin, Add a cost,
// reimburse / Mark reimbursed, the office's "Owed back to the team" list, and the rep's narrower view.
// node gate_1350.mjs [index.html]   (1349 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const NICK = 'nick@cardinalrenovations.net';

async function run(as) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=' + as, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  const r = await p.evaluate(async ({ as, NICK }) => {
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const S = window.__SEED__, out = {};
    const pr = S.projects.find(x => x.id === 'p1');
    pr.stage = 'Scheduled';
    if (as === 'nick') pr.sales_rep = NICK;
    const now = new Date().toISOString(), old = new Date(Date.now() - 5 * 864e5).toISOString();
    S.inspection_reports.push({ id: 'ctr-c', title: 'Contract — Roofing — Test', project_id: 'p1', status: 'sent', signed_at: now,
      total: 24850, html: '<html><body><p>x</p></body></html>', created_at: now, updated_at: now, created_by: 'theo@cardinalrenovations.net' });
    S.collections = [{ id: 'k1', project_id: 'p1', collected_at: '2026-10-10', amount: 12425, type: 'deposit', source: 'homeowner', method: 'check', created_by: 'theo@cardinalrenovations.net', created_at: old }];
    S.crews = (S.crews || []).concat([{ id: 'cw9', name: 'Tear-off Crew' }]);
    S.crew_payments = as === 'nick' ? [] : [{ id: 'cp9', crew_id: 'cw9', project_id: 'p1', amount: 5600, method: 'check', paid_on: '2026-10-14', created_at: now }];
    /* the mock has no RLS: seed what each role's policy would return */
    S.job_costs = as === 'nick'
      ? [{ id: 'j2', project_id: 'p1', kind: 'material', description: 'Menards · drip edge', amount: 356.40, spent_on: '2026-10-13', paid_by: NICK, reimburse: true, reimbursed_at: null, created_by: NICK, created_at: old }]
      : [
        { id: 'j1', project_id: 'p1', kind: 'material', description: 'ABC Supply · shingles', amount: 8912.40, spent_on: '2026-10-09', paid_by: 'company', reimburse: false, reimbursed_at: null, created_by: 'theo@cardinalrenovations.net', created_at: old },
        { id: 'j2', project_id: 'p1', kind: 'material', description: 'Menards · drip edge', amount: 356.40, spent_on: '2026-10-13', paid_by: NICK, reimburse: true, reimbursed_at: null, created_by: NICK, created_at: old },
        { id: 'j3', project_id: 'p1', kind: 'other', description: 'City permit', amount: 125, spent_on: '2026-10-08', paid_by: 'curtis@cardinalrenovations.net', reimburse: true, reimbursed_at: '2026-10-15T15:00:00Z', created_by: 'curtis@cardinalrenovations.net', created_at: old }];
    await window.reload(); await pause(500);
    window.openProject('p1'); await pause(2200);
    const card = () => document.querySelector('#projectView .crjp-card');
    const writes = (tbl, op) => (window.__WRITES__ || []).filter(w => w.table === tbl && w.op === op);
    const go = async () => { await pause(350); const g = document.querySelector('.askgo'); if (g) g.click(); await pause(1500); };
    if (!card()) { out.has = false; return out; }
    out.has = true;
    out.sum = card().querySelector('.crjp-sum').textContent.replace(/\s+/g, ' ');
    out.tabs = [...card().querySelectorAll('[data-crjp-tab]')].map(x => x.getAttribute('data-crjp-tab'));
    const ct = card().querySelector('[data-crjp-tab="cost"]');
    if (!ct) return out;
    ct.click(); await pause(200);
    out.costRows = [...card().querySelectorAll('.crjp-list .crjp-row')].map(x => x.textContent.replace(/\s+/g, ' '));
    out.need = (card().querySelector('.crjp-st.need') || {}).textContent;
    out.done = (card().querySelector('.crjp-st.done') || {}).textContent;
    out.markBtn = !!card().querySelector('[data-crjp-reimb]');
    // empty save refuses
    card().querySelector('[data-crjp-add]').click(); await pause(200);
    out.hasPaidBy = !!document.getElementById('crjpPaidBy');
    card().querySelector('[data-crjp-save]').click(); await pause(400);
    out.err = (document.getElementById('crjpErr') || {}).textContent;
    out.insertsAfterEmpty = writes('job_costs', 'insert').length;
    // fill it in
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    set('crjpDesc', 'Fuel, two trips to the yard'); set('crjpAmt', '280.40');
    card().querySelector('[data-crjp-kind="other"]').click(); await pause(150);
    out.descKept = document.getElementById('crjpDesc').value;
    if (document.getElementById('crjpPaidBy')) { set('crjpPaidBy', NICK); await pause(150); }
    out.reimbBox = !!(document.getElementById('crjpReimb') && document.getElementById('crjpReimb').checked);
    out.amtKept = document.getElementById('crjpAmt').value;
    card().querySelector('[data-crjp-save]').click(); await pause(1500);
    const ins = writes('job_costs', 'insert');
    out.inserted = ins.length ? (Array.isArray(ins[0].payload) ? ins[0].payload[0] : ins[0].payload) : null;
    out.rowsAfter = card() ? card().querySelectorAll('.crjp-list .crjp-row').length : 0;
    if (as !== 'nick') {
      const mb = card().querySelector('[data-crjp-reimb]');
      if (mb) { mb.click(); await go(); }
      out.reimbUpd = writes('job_costs', 'update').map(w => w.payload);
      window.CardinalAR.open(); await pause(1800);
      const g = document.querySelector('#cr-ar-view .crar-grp.owed');
      out.owed = g ? g.textContent.replace(/\s+/g, ' ').slice(0, 160) : null;
    }
    return out;
  }, { as, NICK });
  await ctx.close();
  return r;
}

const t = await run('theo');
ok(t.has, 'the Payments card is on the client page');
if (t.has) {
  ok(JSON.stringify(t.tabs) === '["in","out","cost","all"]', 'office tabs: Received, Paid out, Costs, All', JSON.stringify(t.tabs));
  ok(/Costs\s*\$14,993\.80/.test(t.sum), 'costs = job costs + crew labor ($14,993.80)', t.sum);
  ok(/Gross profit\s*\$9,856\.20/.test(t.sum) && /Margin\s*39\.7%/.test(t.sum), 'gross profit $9,856.20 and margin 39.7%', t.sum);
  ok(t.costRows && t.costRows.length === 4 && t.costRows.some(x => /Tear-off Crew/.test(x) && /LABOR/.test(x) && /from Crews/.test(x)), 'Costs tab lists the crew payment as labor from Crews', JSON.stringify(t.costRows));
  ok(/Reimburse Nick · Needs paid/.test(t.need || '') && t.markBtn, 'a pocket-paid cost reads Needs paid with Mark reimbursed', t.need);
  ok(/Reimbursed Oct 15/.test(t.done || ''), 'a paid-back one reads Reimbursed with its date', t.done);
  ok(t.hasPaidBy, 'the office picks who paid');
  ok(/Say what it was for/.test(t.err || '') && t.insertsAfterEmpty === 0, 'an empty cost is refused before it reaches the database', t.err);
  ok(t.descKept === 'Fuel, two trips to the yard' && t.amtKept === '280.40', 'typed values survive a repaint (kind chip, paid-by)', t.descKept + ' / ' + t.amtKept);
  ok(t.reimbBox, 'choosing a person ticks Reimburse');
  ok(t.inserted && t.inserted.kind === 'other' && Number(t.inserted.amount) === 280.4 && t.inserted.paid_by === NICK && t.inserted.reimburse === true, 'Save writes the cost with kind, amount, payer and reimburse', JSON.stringify(t.inserted));
  ok(t.rowsAfter === 5, 'the new cost appears in the list', t.rowsAfter);
  ok(t.reimbUpd && t.reimbUpd.length === 1 && t.reimbUpd[0].reimbursed_at, 'Mark reimbursed writes reimbursed_at', JSON.stringify(t.reimbUpd));
  ok(t.owed && /Owed back to the team/.test(t.owed), 'Invoices & Payments lists what is owed back to the team', t.owed);
}
const n = await run('nick');
ok(n.has, 'a rep sees the card');
if (n.has) {
  ok(JSON.stringify(n.tabs) === '["in","cost"]', 'rep tabs: Received and My receipts only', JSON.stringify(n.tabs));
  ok(!/Gross profit|Margin|Costs/.test(n.sum), 'a rep never sees costs, profit or margin', n.sum);
  ok(!n.hasPaidBy, 'a rep cannot choose who paid');
  ok(n.inserted && n.inserted.paid_by === NICK && n.inserted.reimburse === true, 'a rep\'s receipt is paid by them and marked to reimburse', JSON.stringify(n.inserted));
}
await b.close();
console.log(fail ? 'GATE 1350 RED — ' + fail + ' failing' : 'GATE 1350 GREEN');
process.exit(fail ? 1 : 0);
