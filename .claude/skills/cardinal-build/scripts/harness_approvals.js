/* Build 652 — the Approvals queue and the Contracts tile.

   Brace-matches the SHIPPED renderApprovals() out of the artifact and runs it
   in jsdom against fixture projects — so pointing this at the previous build
   executes the OLD filter and the stage-advanced scenario goes red, which is
   the negative control. Structural checks cover the new Contracts tile and
   the router fall-through it rides.

   The scenario that matters is the one Theo hit: a job advanced to Approved
   BY HAND three days before the client signed. The old filter (Lead/Prospect
   only) hid that signature from the queue forever.

   Usage: node harness_approvals.js [index.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* extract the shipped function by brace-matching, never by line window */
function extract(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i === -1) return null;
  let depth = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') depth++;
    else if (SRC[k] === '}') { depth--; if (!depth) return SRC.slice(i, k + 1); }
  }
  return null;
}
const FN = extract('renderApprovals');
ok('renderApprovals extracted from the artifact', !!FN);
if (!FN) { console.log('\nRESULT: FAIL (nothing to execute)'); process.exit(1); }

function run(scen) {
  const dom = new JSDOM('<!doctype html><html><body>' +
    '<div id="approvalsCard" style="display:none"><div id="approvalsList"></div></div>' +
    '</body></html>', { runScripts: 'outside-only' });
  const w = dom.window;
  const stubs = `
    function isAdminUser(){ return ${scen.admin !== false}; }
    var cacheProjects = ${JSON.stringify(scen.projects)};
    var cacheRows = ${JSON.stringify(scen.rows)};
    function normStage(s){ return s || 'Lead'; }
    function parseCkAll(pr){ return pr.__ck || {}; }
    function isEstimateTitle(t){ return /^(EST|Estimate)/i.test(String(t||'')) || /— Estimate —/.test(String(t||'')); }
    function isContractTitle(t){ return /^contract/i.test(String(t||'').trim()); }
    function projectValue(pr){ return pr.__val || 0; }
    function esc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){
      return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]; }); }
    function timeAgo(x){ return 'today'; }
    function fmtMoney(n){ return '$' + Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); }
  `;
  w.eval(stubs + '\n' + FN + '\n;window.__run = renderApprovals;');
  w.__run();
  return {
    display: w.document.getElementById('approvalsCard').style.display,
    list: w.document.getElementById('approvalsList').innerHTML,
  };
}

const SIGNED_EST = (pid) => ({ project_id: pid, title: 'EST-2026-0896 — Estimate — X', signed_at: '2026-08-09T15:35:03Z', total: null });
const CONTRACT = (pid) => ({ project_id: pid, title: 'Contract — X', signed_at: null, total: null });

console.log('\n── the Joeseph case: stage advanced by hand BEFORE the signature ──');
{
  const r = run({
    projects: [{ id: 'p1', name: 'Joeseph Estimate', stage: 'Approved', __ck: {}, __val: 20525 }],
    rows: [SIGNED_EST('p1')],
  });
  ok('an Approved-stage job with a signed estimate SHOWS in the queue', r.display === 'block', r.display);
  ok('the row names the job, the value, and offers Approve & create contract',
    r.list.includes('Joeseph Estimate') && r.list.includes('$20,525') && r.list.includes('data-approve="p1"'));
}
{
  const r = run({
    projects: [{ id: 'p2', name: 'Sched Job', stage: 'Scheduled', __ck: {}, __val: 9000 }],
    rows: [SIGNED_EST('p2')],
  });
  ok('Scheduled works too — any live stage can owe a contract', r.display === 'block');
}

console.log('\n── no regressions on the original behavior ──');
{
  const r = run({
    projects: [{ id: 'p3', name: 'Fresh Lead', stage: 'Lead', __ck: {}, __val: 5000 }],
    rows: [SIGNED_EST('p3')],
  });
  ok('a Lead with a signed estimate still shows (the original case)', r.display === 'block' && r.list.includes('Fresh Lead'));
}
{
  const r = run({ projects: [{ id: 'p4', name: 'No sig', stage: 'Lead', __ck: {} }], rows: [] });
  ok('no signed estimate → card hides itself', r.display === 'none');
}
{
  const r = run({
    admin: false,
    projects: [{ id: 'p5', name: 'X', stage: 'Lead', __ck: {} }],
    rows: [SIGNED_EST('p5')],
  });
  ok('non-admins never see the card', r.display === 'none');
}

console.log('\n── the exclusions that keep the queue honest ──');
{
  const r = run({
    projects: [{ id: 'p6', name: 'Has contract', stage: 'Lead', __ck: {} }],
    rows: [SIGNED_EST('p6'), CONTRACT('p6')],
  });
  ok('a job already carrying a contract document is NOT re-listed', r.display === 'none');
}
{
  const r = run({
    projects: [
      { id: 'p7', name: 'Lost job', stage: 'Lost', __ck: {} },
      { id: 'p8', name: 'Closed job', stage: 'Closed', __ck: {} },
    ],
    rows: [SIGNED_EST('p7'), SIGNED_EST('p8')],
  });
  ok('Lost and Closed stay out', r.display === 'none');
}
{
  const r = run({
    projects: [{ id: 'p9', name: 'Already approved', stage: 'Approved', __ck: { wf_approved: { at: 'x' } } }],
    rows: [SIGNED_EST('p9')],
  });
  ok('wf_approved keeps a job out (approve once, gone)', r.display === 'none');
}
{
  const r = run({
    projects: [{ id: 'p10', name: 'Manual worksheet', stage: 'Lead', __ck: { manual_value: 12000 } }],
    rows: [SIGNED_EST('p10')],
  });
  ok('a manual-value job needs no generated contract', r.display === 'none');
}

console.log('\n── the Contracts tile, structurally ──');
ok('the job menu renders a Contracts tile', SRC.includes("jt(dbIc('docs'), 'Contracts', '', 'contracts')"));
ok('the router fall-through it rides still exists', SRC.includes('else{ showTab(act); }'));
ok("showTab knows the contracts tab (it always did)", SRC.includes("'contracts','workorders','commissions'"));
ok('the Money In tile survived beside it', SRC.includes("jt(dbIc('estimates'), 'Money In', '', 'commissions')"));

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
