/* Build 710 — the community stage flow moves, and a parked job stops lying.

   Executes the SHIPPED threadHtml, ccDoAct, partners() and compute() (each
   sliced by brace-match and run via new Function with mocks). Not a
   re-implementation. The label maps and the analytics OPEN map are asserted
   against the artifact — say so plainly: those two are pattern-checked.

   Negative control: the 709 artifact — no submit action, OnHold scored as a
   win, OnHold in neither analytics bucket, two label maps missing it → red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_710.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function slice(header, from) {
  const at = SRC.indexOf(header, from || 0);
  if (at === -1) return null;
  let i = SRC.indexOf('{', at), depth = 0;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (!depth) return SRC.slice(at, i + 1); }
  }
  return null;
}
const escFn = s => String(s).replace(/[&<>"']/g,
  m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const usd = n => '$' + Number(n || 0).toLocaleString('en-US');

/* ── 1 · the Lead state offers a real submit (CR-COM-004) ── */
const thread = slice('function threadHtml(pr){', SRC.indexOf('function bidHtml('));
const threadCode = thread || slice('function threadHtml(pr){', 49000 * 30);
ok('shipped threadHtml sliced', !!threadCode && threadCode.length > 400);
function runThread(stage, est) {
  return new Function('liveEstimate', 'lead', 'normStage', 'daysTo', 'usd', 'esc', 'ago', 'LABEL', 'events', 'homeownerOf', 'bidOf',
    '"use strict";\n' + threadCode + '\nreturn threadHtml;')(
    () => est, () => ({ partner_name: 'City of Kettering', bid_due_at: '2026-08-20', award_cycle: 'Spring grant round' }),
    s => s, () => 5, usd, escFn, () => '2d ago',
    { Lead: 'Bid Requested', Prospect: 'Bid Submitted', OnHold: 'Awaiting Funding' }, [], () => 'K J', () => ({}))(
    { id: 'j', stage: stage, created_at: '2026-08-01' });
}
let h = runThread('Lead', { total: 4200, line_items: [{}] });
ok('Lead + estimate → a real "Mark it submitted" action exists',
  h.includes('data-act="submitted"') && h.includes('Mark it submitted'), h.slice(0, 200));
ok('…with "Open the bid" beside it as the secondary', h.includes('data-act="open"') && h.includes('Open the bid'));
ok('…and the misleading "Submit the bid" label is gone', !h.includes('Submit the bid'));
h = runThread('Lead', null);
ok('Lead with NO estimate still offers only "Price it"',
  h.includes('Price it') && !h.includes('data-act="submitted"'));

/* ── 2 · ccDoAct 'submitted' writes the date + moves the stage ── */
const ccCode = slice('async function ccDoAct(');
ok('shipped ccDoAct sliced', !!ccCode);
async function runSubmit(bid, est, answer) {
  const calls = { patches: [], stages: [], audits: 0, rendered: 0 };
  const fn = new Function('bidOf', 'mergeCk', 'lead', 'liveEstimate', 'confirm', 'prompt', 'alert', 'window', 'render', 'todayIso', 'ocOpen',
    '"use strict";\n' + ccCode + '\nreturn ccDoAct;')(
    () => bid,
    (pr, key, next) => { const cur = Object.assign({}, bid); Object.keys(next).forEach(k => {
      if (next[k] == null || next[k] === '') delete cur[k]; else cur[k] = next[k]; }); return cur; },
    () => ({ partner_name: 'City of Kettering' }), () => est,
    () => answer !== false, () => null, () => {},
    { patchProjectCk: async (pr, p) => { calls.patches.push(p); },
      setStage: async (id, s) => { calls.stages.push(s); },
      auditLog: () => { calls.audits++; } },
    () => { calls.rendered++; }, () => '2026-08-11', () => {});
  await fn('submitted', { id: 'j' });
  return calls;
}
(async () => {
  let c = await runSubmit({}, { total: 4200 }, true);
  ok('confirming stamps submitted_at and carries the estimate total',
    c.patches.length === 1 && c.patches[0].bid.submitted_at === '2026-08-11' &&
    c.patches[0].bid.submitted_amount === 4200, JSON.stringify(c.patches));
  ok('…and moves the stage to Prospect (Bid Submitted)',
    c.stages.length === 1 && c.stages[0] === 'Prospect', JSON.stringify(c.stages));
  ok('…and audits + repaints', c.audits === 1 && c.rendered === 1);
  c = await runSubmit({ submitted_amount: 999, submitted_at: '2026-08-02' }, { total: 4200 }, true);
  /* guarded: on an artifact with no 'submitted' branch there is no patch at
     all, and the negative control must report a red, not crash */
  ok('an already-recorded amount and date are NOT overwritten',
    !!c.patches[0] && c.patches[0].bid.submitted_amount === 999 &&
    c.patches[0].bid.submitted_at === '2026-08-02', JSON.stringify(c.patches[0]));
  c = await runSubmit({}, { total: 100 }, false);
  ok('declining the confirm writes nothing and moves no stage',
    c.patches.length === 0 && c.stages.length === 0 && c.rendered === 0);

  /* ── 3 · the partner rollup: parked is money, and NOT a win (CR-COM-005) ── */
  const partnersCode = slice('function partners(){');
  ok('shipped partners() sliced', !!partnersCode);
  function runPartners(rows) {
    return new Function('projects', 'partnerOf', 'normStage', 'lead', 'bidAmt', 'ck', 'days', 'since', 'chDueIso', 'metaOf',
      '"use strict";\n' + partnersCode + '\nreturn partners;')(
      () => rows, () => 'Habitat', s => s, () => ({}), p => p.amt, () => ({}),
      () => 30, () => 3, () => '2026-09-01', () => ({ type: 'program', terms: '' }))();
  }
  let P = runPartners([{ id: 'a', stage: 'OnHold', amt: 12000 }, { id: 'b', stage: 'Approved', amt: 8000 }])[0];
  ok('a parked job lands in its own `parked` figure, not silently nowhere',
    P.parked === 12000, JSON.stringify({ parked: P.parked, out: P.out, awarded: P.awarded }));
  ok('…and gets a row on the partner card (tag "parked")',
    P.jobs.some(j => j.tag === 'parked'), JSON.stringify(P.jobs.map(j => j.tag)));
  ok('…and is NOT counted as decided', P.decided === 1, 'decided=' + P.decided);
  ok('…and is NOT counted as a win — the real defect', P.won === 1 && P.win === 100,
    'won=' + P.won + ' win%=' + P.win);
  P = runPartners([{ id: 'a', stage: 'OnHold', amt: 5000 }])[0];
  ok('a partner whose only job is parked has NO win rate (not 100%)',
    P.decided === 0 && P.win === null, 'decided=' + P.decided + ' win=' + P.win);
  P = runPartners([{ id: 'a', stage: 'Lost', amt: 1 }, { id: 'b', stage: 'Invoiced', amt: 2 }])[0];
  ok('the ordinary won/lost arithmetic is untouched', P.decided === 2 && P.won === 1 && P.win === 50);

  /* ── 4 · the hub headline: a parked total that exists ── */
  const computeCode = slice('function compute(){\nvar all = projects();');
  ok('shipped hub compute() sliced', !!computeCode);
  const runCompute = rows => new Function('projects', 'normStage', 'lead', 'bidAmt', 'ck', 'days', 'since',
    '"use strict";\n' + computeCode + '\nreturn compute;')(
    () => rows, s => s, () => ({}), p => p.amt, () => ({}), () => 1, () => 1)();
  let d = runCompute([{ id: 'a', stage: 'OnHold', amt: 12000 }, { id: 'b', stage: 'Lead', amt: 3000 }]);
  ok('parked money is now a figure of its own', d.parked === 12000, d.parked);
  ok('…and is still NOT counted as "out for decision" (nobody is deciding)', d.out === 3000, d.out);
  ok('…and does not enter the headline win rate', d.decided === 0 && d.win === null,
    'decided=' + d.decided);
  ok('the Parked cell renders only when there IS parked money',
    /d\.parked \? '<div><div class="k">Parked<\/div>/.test(SRC));

  /* ── 4b · the silent un-parking, and the button that opened the wrong thing ── */
  const orderCode = SRC.match(/var ORDER = \[[^\]]*\];/);
  ok('cr-ess ORDER now contains OnHold in its STAGES position',
    !!orderCode && /'Lead','Prospect','OnHold','Approved'/.test(orderCode[0]), orderCode && orderCode[0]);
  /* execute the shipped rank() + the guard's arithmetic on the shipped array */
  const rankCode = slice('function rank(stage){');
  ok('shipped rank() sliced', !!rankCode);
  const rank = new Function('"use strict";\n' + orderCode[0] + '\n' + rankCode + '\nreturn rank;')();
  ok('a PARKED job is no longer un-parked when an estimate is marked Sent',
    rank('OnHold') >= rank('Prospect'), 'rank(OnHold)=' + rank('OnHold') + ' rank(Prospect)=' + rank('Prospect'));
  ok('…while an ordinary Lead -> Prospect move still passes the guard',
    !(rank('Lead') >= rank('Prospect')), 'rank(Lead)=' + rank('Lead'));
  ok('…and a parked job can still be moved forward to Approved',
    !(rank('OnHold') >= rank('Approved')), 'rank(Approved)=' + rank('Approved'));

  let opened = [];
  const fnOpen = new Function('window', 'liveEstimate', 'alert', 'lead', 'bidOf', 'mergeCk', 'confirm', 'prompt', 'render', 'todayIso', 'ocOpen',
    '"use strict";\n' + ccCode + '\nreturn ccDoAct;')(
    { CardinalEstimates: { openEditor: function(){ opened.push(Array.from(arguments)); } } },
    () => ({ id: 'est-1', total: 4200, line_items: [{ name: 'x' }] }), () => {},
    () => ({}), () => ({}), () => ({}), () => true, () => null, () => {}, () => '2026-08-11', () => {});
  await fnOpen('open', { id: 'j' });
  ok('"Open the bid" hands the editor the PRICED estimate, not a blank draft',
    opened.length === 1 && opened[0].length === 2 && opened[0][1] && opened[0][1].id === 'est-1',
    JSON.stringify(opened));
  opened = [];
  await fnOpen('newbid', { id: 'j' });
  ok('…while "Build the bid" still opens a fresh one (one argument)',
    opened.length === 1 && opened[0].length === 1, JSON.stringify(opened));

  /* ── 5 · pattern-checked: the analytics buckets and the label maps ── */
  ok('analytics OPEN now includes OnHold, so open+won+lost sums to total',
    SRC.indexOf('var OPEN = { Lead:1, Prospect:1, OnHold:1 }') !== -1);
  const maps = (SRC.match(/'OnHold':\s*'Awaiting Funding'/g) || []).length;
  ok('all FOUR community label maps now name OnHold "Awaiting Funding"', maps === 4, maps);
  ok('the pin no longer truncates two stages to the same word "Bid"',
    SRC.indexOf("var SHORT = {") !== -1 && SRC.indexOf("'Lead':'Requested', 'Prospect':'Submitted'") !== -1 &&
    SRC.indexOf(".split(' ')[0]) + '</div></div>'") === -1);

  console.log('\nHARNESS 710: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
