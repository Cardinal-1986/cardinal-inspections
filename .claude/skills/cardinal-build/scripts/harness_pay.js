/* Build 650 — Money In & Commissions, both surfaces.

   Executes the SHIPPED code, not a re-implementation: the 650 section of the
   main block (renderCommissions and friends, sliced between its banner and
   var WO_TRADES) and the whole cr-pay-script module, each in a fresh jsdom
   window per scenario with a locked supa mock and role stubs. Asserts are
   structural (rendered strings, captured writes), never pixels.

   Run with TZ=America/New_York — commDate/dFmt parse date-only strings as
   LOCAL midnight; in a negative-offset zone the naive new Date('yyyy-mm-dd')
   shows the PREVIOUS day, so only a Dayton-like TZ can catch the regression.

   Usage: TZ=America/New_York node harness_pay.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* ── extract the shipped code ── */
const secA = SRC.indexOf('/* ══ 650: Money In & Commissions');
const secB = SRC.indexOf('var WO_TRADES');
const SEC = (secA !== -1 && secB > secA) ? SRC.slice(secA, secB) : null;
ok('the 650 Money-In section exists in the artifact', !!SEC);

const modA = SRC.indexOf('<script id="cr-pay-script">');
const modB = modA === -1 ? -1 : SRC.indexOf('</script>', modA);
const MOD = modA !== -1 ? SRC.slice(modA + '<script id="cr-pay-script">'.length, modB) : null;
ok('the cr-pay-script module exists in the artifact', !!MOD);

if (!SEC || !MOD) {
  console.log('\nRESULT: FAIL  (' + pass + ' passed, ' + fail + ' failed) — nothing to execute');
  process.exit(1);
}

/* ── a chainable supa mock that records every write ── */
function mkDb(fx, calls) {
  return { from(table) {
    const st = { table, op: 'select' };
    const o = {};
    o.select = (...a) => { st.select = a; return o; };
    o.order = () => o; o.limit = () => o;
    o.eq = (...a) => { (st.eq = st.eq || []).push(a); return o; };
    o.in = (...a) => { st.in = a; return o; };
    o.update = (p) => { st.op = 'update'; st.payload = p; return o; };
    o.insert = (p) => { st.op = 'insert'; st.payload = p; return o; };
    o.delete = () => { st.op = 'delete'; return o; };
    o.single = () => o;
    o.then = (res, rej) => {
      calls.push(st);
      const out = st.op === 'select'
        ? { data: (fx[table] || []).slice(), error: null, count: (fx[table] || []).length }
        : { data: { id: 'w' }, error: null };
      return Promise.resolve(out).then(res, rej);
    };
    return o;
  } };
}

function freshWin() {
  const dom = new JSDOM('<!doctype html><html><body>' +
    '<div id="commMount"></div><div id="payView" style="display:none"></div>' +
    '</body></html>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.confirm = () => true;
  w.alert = () => {};
  return w;
}

const NICK = 'nick@cardinalrenovations.net', JOEY = 'joey@cardinalrenovations.net';
const THEO = 'theo@cardinalrenovations.net';
const NAMES = { [NICK]: 'Nick Hey', [JOEY]: 'Joseph Lehman', [THEO]: 'Theo Dorion' };

/* ── scenario runner for the client-profile tab section ── */
async function runTab(role, fx, salesRep) {
  const w = freshWin();
  const calls = [];
  const stubs = `
    var sb = __DB__;
    var currentProject = { id:'p1', name:'Betty Mann', sales_rep: ${JSON.stringify(salesRep)} };
    var currentUser = { email:'${role === 'admin' ? THEO : role === 'prod' ? 'curtis@cardinalrenovations.net' : NICK}' };
    var cacheProjects = [currentProject];
    function isAdminUser(){ return ${role === 'admin'}; }
    function isProductionUser(){ return ${role === 'prod'}; }
    function rptRepName(e){ return (${JSON.stringify(NAMES)})[e] || (e ? e.split('@')[0] : 'Unknown'); }
    function teamEmails(){ return ${JSON.stringify([NICK, JOEY, THEO, 'curtis@cardinalrenovations.net'])}; }
    function tmRoleOf(e){ return e === '${THEO}' ? 'Admin' : (e.indexOf('curtis') === 0 ? 'Production' : 'Sales'); }
    function woEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){
      return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]; }); }
  `;
  w.__DB__ = mkDb(fx, calls);
  w.eval(stubs + '\n' + SEC + '\n;window.__render = renderCommissions; window.__commDate = commDate; window.__commToday = commToday;');
  await w.__render();
  return { w, html: w.document.getElementById('commMount').innerHTML, calls };
}

const TABFX = {
  collections: [
    { id: 'c1', project_id: 'p1', collected_at: '2026-08-01', amount: 17025, type: 'deposit', source: 'insurance', notes: '' },
    { id: 'c2', project_id: 'p1', collected_at: '2026-08-08', amount: 20225, type: 'final', source: 'insurance', notes: 'incl supp' },
  ],
  commissions: [
    { id: 'm1', collection_id: 'c1', project_id: 'p1', rep_email: NICK, amount: 1702.50, basis: '10% of deposit collection', status: 'pending', paid_on: null, reference: null },
    { id: 'm2', collection_id: 'c2', project_id: 'p1', rep_email: NICK, amount: 2022.50, basis: '10% of final collection', status: 'paid', paid_on: '2026-08-08', reference: null },
  ],
  draws: [
    { id: 'd1', rep_email: NICK, project_id: 'p1', amount: 500, status: 'outstanding', paid_at: '2026-08-09', notes: '' },
  ],
};

(async () => {

console.log('\n── the tab: date math (TZ=' + (process.env.TZ || 'unset') + ') ──');
{
  const { w } = await runTab('admin', TABFX, NICK);
  const d = w.__commDate('2026-08-09');
  ok('commDate("2026-08-09") stays Aug 9 in a negative-offset zone', /Aug/.test(d) && /\b9\b/.test(d), d);
  const naive = new w.Date('2026-08-09').getDate();
  ok('  (control: the naive parse really would have said the 8th here)', naive === 8, 'naive=' + naive);
  ok('commToday() is a yyyy-mm-dd string', /^\d{4}-\d{2}-\d{2}$/.test(w.__commToday()));
}

console.log('\n── the tab: admin sees the whole board ──');
{
  const { html } = await runTab('admin', TABFX, NICK);
  ok('sales rep line names Nick and the 10%', html.includes('Sales rep:') && html.includes('Nick Hey') && html.includes('10% of every dollar collected'));
  ok('rep select renders for admin, sales + Theo only', html.includes('id="miRepSel"') && !html.includes('curtis@cardinalrenovations.net'));
  ok('lock marker shows once money is logged', html.includes('&#128274;') || html.includes('\u{1F512}'));
  ok('Money in table lists both checks with type labels', html.includes('Deposit') && html.includes('Final') && html.includes('$17,025.00') && html.includes('$20,225.00'));
  /* innerHTML read-back serializes &#9679; as the literal character — assert
     on what the DOM holds, not on the source entity (test was wrong once) */
  ok('per-collection commission state: one Paid dot, one Owed dot', html.includes('● Paid') && html.includes('○ Owed'));
  ok('log buttons: collection AND draw for admin', html.includes('+ Log Collection') && html.includes('+ Log Draw'));
  ok('collection rows carry Edit and Remove for admin', html.includes('data-micedit="c1"') && html.includes('data-micdel="c1"'));
  ok('draws table renders with Mark repaid', html.includes('Draws on this job') && html.includes('data-midrawrepaid="d1"'));
  ok('totals: collected 37,250 · owed 1,702.50 · paid 2,022.50 · draws 500', html.includes('$37,250.00') && html.includes('$1,702.50') && html.includes('$2,022.50') && html.includes('$500.00'));
  ok('net to Nick = owed − draws = 1,202.50, not red', html.includes('$1,202.50') && !html.includes('style="color:#c8202e">$1,202.50'));
  ok('commission table shows Owed, never the raw word pending', html.includes('>Owed<') && !/>pending</.test(html));
  ok('manual entry is collapsed behind its toggle', html.includes('Manual entry…') && !html.includes('id="cmRep"'));
}

console.log('\n── the tab: production logs money but never draws ──');
{
  const { html } = await runTab('prod', TABFX, NICK);
  ok('production gets + Log Collection', html.includes('+ Log Collection'));
  ok('production gets NO draw button, NO rep select, NO manual entry', !html.includes('+ Log Draw') && !html.includes('miRepSel') && !html.includes('Manual entry'));
  ok('production can edit a collection but not remove it', html.includes('data-micedit="c1"') && !html.includes('data-micdel'));
  ok('no commission Remove buttons for production', !html.includes('data-delcomm'));
}

console.log('\n── the tab: a rep reads and touches nothing ──');
{
  const fx = { collections: TABFX.collections, commissions: TABFX.commissions, draws: TABFX.draws };
  const { html } = await runTab('rep', fx, NICK);
  ok('no forms at all for a rep', !html.includes('+ Log Collection') && !html.includes('+ Log Draw') && !html.includes('Manual entry'));
  ok('the money still reads: rows and totals render', html.includes('$17,025.00') && html.includes('$1,202.50'));
}

console.log('\n── the tab: edge cases ──');
{
  const { html } = await runTab('admin', TABFX, THEO);
  ok('owner project says so instead of paying anyone', html.includes('owner project'));
}
{
  const fx = {
    collections: TABFX.collections,
    commissions: [{ id: 'm1', collection_id: 'c1', project_id: 'p1', rep_email: NICK, amount: 210, basis: '', status: 'pending', paid_on: null }],
    draws: [{ id: 'd1', rep_email: NICK, project_id: 'p1', amount: 500, status: 'outstanding', paid_at: '2026-08-09' }],
  };
  const { html } = await runTab('admin', fx, NICK);
  ok('draw > commission: net −290 renders red (spec edge 6)', html.includes('color:#c8202e') && html.includes('-$290.00'));
}
{
  const fx = { collections: [], commissions: [], draws: [] };
  const { html } = await runTab('admin', fx, null);
  ok('empty job: honest empties, no lock, rep unset text', html.includes('No collections logged') && html.includes('until a rep is set') && !html.includes('&#128274;'));
}

/* ── scenario runner for the cr-pay module ── */
async function runPay(role, fx) {
  const w = freshWin();
  const calls = [];
  Object.defineProperty(w, 'supa', { value: mkDb(fx, calls), writable: false });
  w.my_email = () => role === 'admin' ? THEO : role === 'prod' ? 'curtis@cardinalrenovations.net' : NICK;
  w.is_admin = () => role === 'admin';
  w.is_full_access = () => role === 'admin' || role === 'prod';
  w.rptRepName = (e) => NAMES[e] || (e ? e.split('@')[0] : 'Unknown');
  w.teamEmails = () => [NICK, JOEY, THEO];
  w.tmRoleOf = (e) => e === THEO ? 'Admin' : 'Sales';
  w.hideAllViews = () => {};
  w.showHome = () => {};
  const csv = { rows: null };
  w.CardinalCsv = { download: (rows) => { csv.rows = rows; } };
  w.eval(MOD);
  await w.CardinalPay.open();
  return { w, calls, csv, view: () => w.document.getElementById('payView') };
}
const today = new Date();
const TODAY = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
const PAYFX = {
  commissions: [
    { id: 'm1', rep_email: NICK, project_name: 'Betty Mann', amount: 210, basis: '10% of supplemental collection', status: 'pending', paid_on: null, created_at: '2026-08-09' },
    { id: 'm2', rep_email: JOEY, project_name: 'Smith Job', amount: 840, basis: '10% of deposit collection', status: 'pending', paid_on: null, created_at: '2026-08-09' },
    { id: 'm3', rep_email: NICK, project_name: 'Smith Job', amount: 1702, basis: '10% of final collection', status: 'paid', paid_on: TODAY, created_at: '2026-08-01' },
    { id: 'm4', rep_email: 'jacob@cardinalrenovations.net', project_name: 'Jones Job', amount: 525, basis: '', status: 'paid', paid_on: TODAY, created_at: '2026-08-01' },
    { id: 'm5', rep_email: NICK, project_name: 'Old Job', amount: 900, basis: '', status: 'paid', paid_on: '2025-12-19', created_at: '2025-12-19' },
  ],
  draws: [
    { id: 'd1', rep_email: NICK, project_name: 'Betty Mann', amount: 500, status: 'outstanding', paid_at: '2026-08-09' },
  ],
};

console.log('\n── CardinalPay: the Friday screen ──');
{
  const { w, calls, csv, view } = await runPay('admin', PAYFX);
  const html = view().innerHTML;
  ok('view is open and titled Commissions', view().style.display === 'block' && html.includes('Commissions'));
  ok('owed rows: Nick 210 with −500 draws → net −290 red', html.includes('$210.00') && html.includes('$290.00') && html.includes('pay-neg'));
  ok('owed rows: Joey 840 net green', html.includes('$840.00') && html.includes('pay-pos'));
  ok('active draws card lists the 500 with Mark repaid', html.includes('Active draws') && html.includes('data-repay="d1"'));
  ok('this week: Nick 1,702 + Jacob 525, total 2,227', html.includes('$1,702.00') && html.includes('$525.00') && html.includes('$2,227.00'));
  ok('Mark All Paid and Export CSV are offered', html.includes('Mark All Paid') && html.includes('Export CSV'));

  /* the two-button choice, then Pay net */
  view().querySelector('[data-pay="' + NICK + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const html2 = view().innerHTML;
  ok('Mark Paid opens the net-vs-full choice with both figures', html2.includes('Pay net') && html2.includes('Pay full') && html2.includes('draws repaid') && html2.includes('draws stay'));
  ok('negative net is explained in words', html2.includes('rep owes the difference'));
  calls.length = 0;
  view().querySelector('[data-paynet="' + NICK + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));
  const cu = calls.find(c => c.table === 'commissions' && c.op === 'update');
  const du = calls.find(c => c.table === 'draws' && c.op === 'update');
  ok('pay net: commissions update targets exactly Nick’s pending id', !!cu && JSON.stringify(cu.in) === JSON.stringify([['id', ['m1']]].flat()) || (!!cu && JSON.stringify(cu.in[1]) === JSON.stringify(['m1'])), cu && JSON.stringify(cu.in));
  ok('pay net: status→paid with a date and paid_by, amount untouched', !!cu && cu.payload.status === 'paid' && !!cu.payload.paid_on && cu.payload.paid_by === THEO && !('amount' in cu.payload));
  ok('pay net: the draw is marked repaid in the same action', !!du && du.payload.status === 'repaid' && JSON.stringify(du.in[1]) === JSON.stringify(['d1']), du && JSON.stringify(du.in));

  /* CSV */
  view().querySelector('[data-act="csv"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('CSV goes through CardinalCsv with one row per commission', Array.isArray(csv.rows) && csv.rows.length === 5 && csv.rows[0].rep && 'amount' in csv.rows[0]);
}

console.log('\n── CardinalPay: My Earnings for a rep ──');
{
  const fx = { commissions: PAYFX.commissions.filter(r => r.rep_email === NICK), draws: PAYFX.draws };
  const { view } = await runPay('rep', fx);
  const html = view().innerHTML;
  ok('titled My Earnings', html.includes('My Earnings'));
  ok('paid this year excludes last December’s check', html.includes('$1,702.00') && !html.includes('$2,602.00'));
  ok('owed now 210, draws 500, next check −290 red', html.includes('$210.00') && html.includes('$500.00') && html.includes('-$290.00') && html.includes('pay-neg'));
  ok('recent commissions name the jobs', html.includes('Betty Mann') && html.includes('Smith Job'));
  ok('read-only: no Mark Paid, no draw form, no CSV', !html.includes('Mark Paid') && !html.includes('New draw') && !html.includes('Export CSV'));
}

console.log('\n── CardinalPay: production gets a sentence, not a broken screen ──');
{
  const { view } = await runPay('prod', { commissions: [], draws: [] });
  const html = view().innerHTML;
  ok('the refusal is worded, not empty', html.includes('nothing for Production here'));
  ok('no money figures render', !html.includes('$'));
}

console.log('\n── wiring in the rest of the file ──');
ok('payView is registered in hideAllViews’ display list', SRC.includes("['payView','crewsView','cr-estimates-mount',"));
ok('burger menu has the item and the dispatch branch', SRC.includes('data-nav="pay"') && SRC.includes("else if(nav === 'pay'){ if(window.CardinalPay) window.CardinalPay.open(); }"));
ok('navRestore knows the view and history wraps it', SRC.includes("case 'pay':") && SRC.includes("window.navSetView('pay')"));
ok('the delegation handles the four new actions', SRC.includes("closest('[data-micedit]')") && SRC.includes("closest('[data-micdel]')") && SRC.includes("closest('[data-midrawrepaid]')") && SRC.includes("closest('[data-delcomm]')"));
ok('pdb.list now fetches sales_rep', SRC.includes('created_at,updated_at,sales_rep'));
ok('the module never writes a commission amount', !/from\('commissions'\)[\s\S]{0,200}update\([^)]*amount/.test(MOD));
ok('no new scroll-lock writer (the 13 stay 13)', !MOD.includes('document.body.style.overflow'));
ok('CardinalPay exports via Object.assign, never plain assignment', MOD.includes("window.CardinalPay = Object.assign(window.CardinalPay || {}"));

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH:', e); process.exit(1); });
