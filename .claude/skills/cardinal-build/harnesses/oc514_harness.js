/* Functional gate for build 513-514 — the community outcome form and the
   second clock.

   It runs the SHIPPED module text, extracted from index_v505.html: cr-cc-script
   verbatim inside jsdom, and the hub's chDueIso / chDueBand / chCmp / chSorted
   lifted out of cr-ch2-script and executed against real-shaped rows. Nothing
   here re-implements the app.

   Data shapes are the real ones: projects.checklist is a JSON STRING, lead
   lives under checklist.lead, bid under checklist.bid, and nine of the ten
   community jobs carrying bid_due_at hold it as an EMPTY STRING. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] ||
  '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/app/index_v519.html';
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name); console.log('  ✗ ' + name + (extra !== undefined ? '  <<< ' + JSON.stringify(extra) : '')); }
}
function eq(name, got, want) { ok(name + '  [' + JSON.stringify(got) + ']', JSON.stringify(got) === JSON.stringify(want), { got, want }); }

/* ---- extract the shipped blocks ---------------------------------------- */
function block(id) {
  const open = html.indexOf('<script id="' + id + '">');
  if (open < 0) throw new Error('missing block ' + id);
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  return html.slice(start, end);
}
const CC = block('cr-cc-script');
const HUB = block('cr-ch2-script');
console.log('extracted cr-cc-script: ' + CC.length + ' chars, cr-ch2-script: ' + HUB.length + ' chars');
if (CC.length < 15000 || HUB.length < 30000) throw new Error('extractor captured too little — refusing to assert on it');

/* ---- real-shaped rows --------------------------------------------------- */
function proj(o) {
  const ck = { claim_type: 'community', lead: o.lead || {}, bid: o.bid || {} };
  if (o.stage_since) ck.stage_since = o.stage_since;
  return {
    id: o.id, name: o.name || null, address: o.address || '',
    stage: o.stage, created_by: 'jacob@cardinalrenovations.net',
    created_at: '2026-06-01T12:00:00Z', updated_at: '2026-07-20T12:00:00Z',
    checklist: JSON.stringify(ck),
  };
}
const iso = (d) => {
  const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + d);
  const m = t.getMonth() + 1, y = t.getDate();
  return t.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (y < 10 ? '0' : '') + y;
};

/* ======================================================================== */
console.log('\n== A. cr-cc-script — the outcome step, driven as the app drives it ==');

const dom = new JSDOM(
  '<!doctype html><html><body>' +
  '<div id="projectView"><div id="clientBanner"></div></div>' +
  '<div id="jaGrid"></div></body></html>',
  { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
global.window = w; global.document = w.document;
w.console = console;

/* Lock the mocks: the app's own boot can null a global a tick after it is set. */
function lock(name, val) { Object.defineProperty(w, name, { value: val, writable: false, configurable: true }); }

const patches = [];   // every patchProjectCk payload, in order
const stages = [];    // every setStage call
const audits = [];

lock('parseCkAll', (pr) => { try { return JSON.parse((pr && pr.checklist) || '{}') || {}; } catch (e) { return {}; } });
lock('projClaimType', (pr) => (w.parseCkAll(pr).claim_type || 'retail'));
lock('projHomeowner', (pr) => String((w.parseCkAll(pr).lead || {}).homeowner_name || '').trim());
lock('normStage', (s) => (['Lead', 'Prospect', 'OnHold', 'Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed', 'Lost'].indexOf(s) !== -1 ? s : 'Lead'));
lock('patchProjectCk', async (pr, patch) => {
  patches.push(JSON.parse(JSON.stringify(patch)));
  const all = JSON.parse(pr.checklist || '{}');
  Object.keys(patch).forEach((k) => { all[k] = patch[k]; });
  pr.checklist = JSON.stringify(all);
});
lock('setStage', async (pid, v) => {
  stages.push([pid, v]);
  const pr = w.currentProject;
  if (pr && String(pr.id) === String(pid)) {
    pr.stage = v;
    /* setStage's own fire-and-forget checklist patch, reproduced faithfully:
       it reads pr.checklist at call time and writes stage_since + t_<stage>. */
    const all = JSON.parse(pr.checklist || '{}');
    all.stage_since = '2026-07-31T18:00:00Z';
    all['t_' + v] = '2026-07-31T18:00:00Z';
    if (v === 'Lost') all.lost_at = '2026-07-31T18:00:00Z';
    pr.checklist = JSON.stringify(all);
  }
});
lock('auditLog', (t, d, p) => audits.push([t, d, p]));
lock('CardinalEstimates', { loadForProject: async () => [{ id: 'e1', total: 14200, status: 'open', line_items: [{ name: 'Roof', qty: 1, price: 14200 }] }] });
lock('CardinalCommunityPartners', {
  load: async () => true,
  /* The real roster, from the live-data audit: 6 Habitat jobs, 5 DHRN,
     1 Kitty Hawk. Deliberately NOT alphabetical here, so a passing
     Habitat-first assertion means the sort ran. */
  list: () => ([
    { id: 'p-kh', name: 'Kitty Hawk Realty', partner_type: 'property_manager' },
    { id: 'p-dhrn', name: 'Dayton Home Repair Network', partner_type: 'nonprofit' },
    { id: 'p-hab', name: 'Habitat for Humanity', partner_type: 'nonprofit' },
    { id: 'p-reb', name: 'ReBuild', partner_type: 'nonprofit' },
  ]),
});
lock('supa', {
  from: () => ({
    select: () => ({
      eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }), then: undefined }),
    }),
  }),
});
/* community_contacts uses .select('*').eq(...) with no order — give it a thenable */
w.supa.from = () => ({
  select: () => {
    const q = { eq: () => q, order: () => q, limit: async () => ({ data: [] }), then: (r) => r({ data: [] }) };
    return q;
  },
});

const JOB = proj({
  id: 'j-minnie', name: 'Minnie marsh kent', address: '3710 west third',
  stage: 'Prospect',
  lead: { homeowner_name: 'Minnie marsh kent', partner_name: 'Habitat for Humanity', partner_id: 'p-hab', bid_due_at: '', work_type: 'Roofing' },
  bid: { submitted_amount: 14200, submitted_at: '2026-07-01T12:00:00Z' },
});
w.currentProject = JOB;

w.eval('(function(){' + CC + '})()');

const settle = () => new Promise((r) => setTimeout(r, 60));
/* Wait for a condition rather than for a fixed number of ticks. Switching jobs
   goes through check() -> await load() -> render(), which is more microtasks
   than a couple of settles reliably covers; clicking a button that belongs to
   the PREVIOUS job then makes the app's own guard drop the flow (correctly),
   which reads as a failure but is the harness being early. */
async function until(cond, what, tries) {
  for (let i = 0; i < (tries || 40); i++) { if (cond()) return true; await settle(); }
  throw new Error('timed out waiting for: ' + what);
}
/* Switch the visible job the way the app sees it, then wait until the client
   page has actually repainted for it. */
async function goto(pr) {
  w.currentProject = pr;
  /* The module wakes on a MutationObserver over document.body. Assigning
     window.currentProject mutates nothing, so nothing would fire — whereas real
     navigation repaints the view and always does. Poke the DOM the same way. */
  const nudge = w.document.createElement('span');
  w.document.getElementById('projectView').appendChild(nudge);
  nudge.remove();
  await until(() => {
    const m = mount();
    return m && m.querySelector('[data-act], .cc-oc') && m.textContent.length > 0 &&
      (!pr.address || m.textContent.indexOf(pr.address) !== -1);
  }, 'client page to repaint for ' + pr.id);
}
const mount = () => w.document.getElementById('cr-cc');
const q = (sel) => (mount() ? mount().querySelector(sel) : null);
const qa = (sel) => (mount() ? Array.from(mount().querySelectorAll(sel)) : []);

(async function run() {
  await settle(); await settle();

  ok('client page mounted for a community job', !!mount());
  const outBtn = qa('[data-act="outcome"]')[0];
  ok('Prospect card offers "Record the outcome"', !!outBtn && /Record the outcome/.test(outBtn.textContent));
  eq('the old Awarded / Not awarded pair is gone from the card',
    qa('[data-act="won"], [data-act="lost"]').length, 0);

  /* --- step 1 --- */
  outBtn.click(); await settle();
  ok('step 1 renders inside #cr-cc as a pane, not an overlay',
    !!q('.cc-oc') && q('.cc-oc').closest('#cr-cc') === mount());
  eq('body scroll was NOT locked (no 14th writer)', w.document.body.style.overflow, '');
  eq('four outcomes, and "Still waiting" is second',
    qa('.cc-oc .big [data-oc="pick"]').map((b) => b.getAttribute('data-k')),
    ['awarded', 'waiting', 'referred', 'lost']);
  ok('no reason field anywhere in the flow', !/reason/i.test(q('.cc-oc').innerHTML.replace(/No reason (field|needed)[^<]*/gi, '')));
  ok('the pin / tabs / thread are replaced while the step is open',
    !q('.pin') && !q('.tabbar') && !q('.thread'));

  /* --- still waiting --- */
  qa('[data-oc="pick"]').find((b) => b.getAttribute('data-k') === 'waiting').click();
  await settle();
  const segs = qa('[data-oc="months"]');
  eq('four horizons offered', segs.map((s) => s.textContent), ['3 mo', '6 mo', '1 yr', '2 yr']);
  eq('1 yr is preselected', segs.filter((s) => s.classList.contains('on')).map((s) => s.getAttribute('data-m')), ['12']);
  const cb = q('[data-f="check_back_at"]');
  ok('check-back date prefilled a year out', !!cb && cb.value === iso(0).slice(0, 4) * 1 + 1 + iso(0).slice(4) || !!cb);
  const oneYear = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 12); const m = d.getMonth() + 1, y = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (y < 10 ? '0' : '') + y; })();
  eq('...and it is exactly +12 months, built at local midnight', cb.value, oneYear);

  /* typing a date must not repaint (caret) but must drop the segment highlight */
  cb.value = '2027-03-01';
  cb.dispatchEvent(new w.Event('input', { bubbles: true }));
  eq('hand-picking a date clears the segment highlight in place',
    qa('[data-oc="months"]').filter((s) => s.classList.contains('on')).length, 0);
  ok('...without repainting the field out from under the caret', w.document.contains(cb));

  const cyc = q('[data-f="award_cycle"]');
  cyc.value = 'Habitat Critical Repair — FY28 cycle';
  cyc.dispatchEvent(new w.Event('input', { bubbles: true }));
  const tarp = q('[data-f="tarped_at"]');
  tarp.value = '2026-07-22';
  tarp.dispatchEvent(new w.Event('input', { bubbles: true }));

  q('[data-oc="save"]').click();
  await settle(); await settle();

  eq('Park it wrote exactly one checklist patch', patches.length, 1);
  eq('...it patched lead only, not bid', Object.keys(patches[0]), ['lead']);
  eq('...check_back_at is the hand-picked date', patches[0].lead.check_back_at, '2027-03-01');
  eq('...award_cycle stored', patches[0].lead.award_cycle, 'Habitat Critical Repair — FY28 cycle');
  eq('...tarped_at stored', patches[0].lead.tarped_at, '2026-07-22');
  eq('...and the empty-string bid_due_at was left ALONE, not stripped',
    patches[0].lead.bid_due_at, '');
  eq('...partner untouched', patches[0].lead.partner_name, 'Habitat for Humanity');
  eq('stage set to OnHold', stages, [['j-minnie', 'OnHold']]);
  eq('audit line written', audits.map((a) => a[1]), ['Parked — waiting on funding']);

  /* the ordering invariant: checklist patch BEFORE setStage, so setStage's
     own fire-and-forget patch cannot clobber the outcome fields */
  const after = JSON.parse(w.currentProject.checklist);
  eq('setStage ran after, so stage_since survives', typeof after.stage_since, 'string');
  eq('...and so does check_back_at', after.lead.check_back_at, '2027-03-01');
  eq('...and t_OnHold', typeof after.t_OnHold, 'string');

  await settle();
  ok('flow closed and the thread came back', !q('.cc-oc') && !!q('.thread'));
  const held = qa('[data-act="outcome"]')[0];
  ok('OnHold shows a parked card that can re-enter the flow', !!held);
  ok('...and names the cycle and the check-back date',
    /FY28 cycle/.test(mount().textContent) && /Mar 1, 2027/.test(mount().textContent));
  ok('...and shows the tarp date', /Tarped Jul 22, 2026/.test(mount().textContent));

  /* --- awarded, on a fresh job --- */
  patches.length = 0; stages.length = 0; audits.length = 0;
  const J2 = proj({
    id: 'j-will', name: 'Will poindexter', address: '4115 Shenandoah dr', stage: 'Prospect',
    lead: { homeowner_name: 'Will poindexter', partner_name: 'Habitat for Humanity', partner_id: 'p-hab', bid_due_at: '' },
    bid: { submitted_amount: 29460 },
  });
  await goto(J2);
  qa('[data-act="outcome"]')[0].click(); await settle();
  qa('[data-oc="pick"]').find((b) => b.getAttribute('data-k') === 'awarded').click(); await settle();

  const sel = q('[data-f="funded_by"]');
  ok('Funded by is a select off the live roster, not a hardcoded list', !!sel && sel.tagName === 'SELECT');
  eq('Habitat sorts first, then alphabetical',
    Array.from(sel.options).map((o) => o.value).filter(Boolean),
    ['Habitat for Humanity', 'Dayton Home Repair Network', 'Kitty Hawk Realty', 'ReBuild']);

  const amt = q('[data-f="amount"]');
  amt.value = '$11,800'; amt.dispatchEvent(new w.Event('input', { bubbles: true }));
  q('[data-oc="save"]').click(); await settle(); await settle();

  eq('awarded_amount parsed off a formatted string, into checklist.bid',
    patches[0].bid.awarded_amount, 11800);
  eq('...and NOT into checklist.lead (that would fork the bid strip)',
    patches[0].lead.awarded_amount, undefined);
  eq('submitted_amount preserved', patches[0].bid.submitted_amount, 29460);
  ok('awarded_at stamped', typeof patches[0].bid.awarded_at === 'string' && patches[0].bid.awarded_at.length === 10);
  eq('funded_by recorded', patches[0].lead.funded_by, 'Habitat for Humanity');
  eq('stage set to Approved', stages, [['j-will', 'Approved']]);

  /* --- referred onward --- */
  patches.length = 0; stages.length = 0;
  const J3 = proj({
    id: 'j-clara', name: 'Clara garrett', address: '1668 Wesleyan rd', stage: 'Prospect',
    lead: { homeowner_name: 'Clara garrett', partner_name: 'Habitat for Humanity', partner_id: 'p-hab', bid_due_at: '' },
    bid: { submitted_amount: 10770 },
  });
  await goto(J3);
  qa('[data-act="outcome"]')[0].click(); await settle();
  qa('[data-oc="pick"]').find((b) => b.getAttribute('data-k') === 'referred').click(); await settle();
  const rsel = q('[data-f="referred_to"]');
  rsel.value = 'Dayton Home Repair Network';
  rsel.dispatchEvent(new w.Event('change', { bubbles: true }));
  q('[data-oc="save"]').click(); await settle(); await settle();

  eq('referred_to recorded', patches[0].lead.referred_to, 'Dayton Home Repair Network');
  eq('the Bill to follows the referral', patches[0].lead.partner_name, 'Dayton Home Repair Network');
  eq('...and so does partner_id, taken off the picked roster row', patches[0].lead.partner_id, 'p-dhrn');
  ok('referred_at stamped', typeof patches[0].lead.referred_at === 'string');
  ok('check_back_at carried', typeof patches[0].lead.check_back_at === 'string');
  eq('a referral parks the job', stages, [['j-clara', 'OnHold']]);

  /* --- not awarded --- */
  patches.length = 0; stages.length = 0;
  const J4 = proj({
    id: 'j-bonita', name: 'Bonita wilburn', address: '3800 klepinger rd', stage: 'Prospect',
    lead: { homeowner_name: 'Bonita wilburn', partner_name: 'Dayton Home Repair Network', bid_due_at: '' },
    bid: { submitted_amount: 16360 },
  });
  await goto(J4);
  qa('[data-act="outcome"]')[0].click(); await settle();
  qa('[data-oc="pick"]').find((b) => b.getAttribute('data-k') === 'lost').click(); await settle();
  eq('not-awarded asks for nothing but the tarp date',
    qa('.cc-oc [data-oc="in"]').map((i) => i.getAttribute('data-f')), ['tarped_at']);
  q('[data-oc="save"]').click(); await settle(); await settle();
  eq('stage set to Lost', stages, [['j-bonita', 'Lost']]);
  eq('no loss_reason written', JSON.parse(w.currentProject.checklist).loss_reason, undefined);
  ok('lost_at still stamped by setStage', !!JSON.parse(w.currentProject.checklist).lost_at);

  /* --- leaving mid-flow --- */
  const J5 = proj({ id: 'j-alton', name: 'Alton James', address: '948 Huron Ave', stage: 'Prospect', lead: { homeowner_name: 'Alton James', partner_name: 'Habitat for Humanity', bid_due_at: '' } });
  await goto(J5);
  qa('[data-act="outcome"]')[0].click(); await settle();
  ok('flow open on Alton', !!q('.cc-oc'));
  await goto(JOB);                           // user walks to a different job
  ok('walking to another job drops the flow rather than carrying it over', !q('.cc-oc'));

  /* --- a retail job must never see any of this --- */
  const R = proj({ id: 'r-1', stage: 'Prospect', lead: {} });
  R.checklist = JSON.stringify({ claim_type: 'retail', lead: {} });
  w.currentProject = R;
  const n2 = w.document.createElement('span');
  w.document.getElementById('projectView').appendChild(n2); n2.remove();
  await until(() => !mount(), 'community page to remove itself on a retail job');
  ok('retail job: the community client page removes itself entirely', !mount());
  eq('...and hands the profile back', w.document.body.classList.contains('cr-cc-open'), false);

  /* ==================================================================== */
  console.log('\n== B. cr-ch2-script — the second clock, shipped functions ==');

  /* Lift the four shipped functions out of the hub and run them for real.
     They close over lead/days/normStage, all of which are defined in the same
     block, so the slice has to carry those too. */
  function fn(name) {
    const at = HUB.indexOf('function ' + name + '(');
    if (at < 0) throw new Error('no ' + name);
    let i = HUB.indexOf('{', at), d = 0;
    for (; i < HUB.length; i++) {
      if (HUB[i] === '{') d++;
      else if (HUB[i] === '}') { d--; if (!d) return HUB.slice(at, i + 1); }
    }
    throw new Error('unbalanced ' + name);
  }
  const CH_SORTS = /var CH_SORTS = \[[\s\S]{0,400}?\];/.exec(HUB)[0];
  const CH_GROUPS = /var CH_GROUPS = \[[\s\S]{0,1400}?\n\];/.exec(HUB)[0];
  const src = [
    'var window = GLOBAL;',
    fn('ck'), fn('lead'), fn('normStage'), fn('days'),
    fn('chDueIso'), fn('chOnHold'), fn('chDueBand'),
    CH_SORTS,
    'return { chDueIso:chDueIso, chOnHold:chOnHold, chDueBand:chDueBand, CH_SORTS:CH_SORTS, days:days };',
  ].join('\n');
  const hub = new Function('GLOBAL', src)(w);
  console.log('  (hub slice: ' + src.length + ' chars of shipped code)');

  const parked = proj({ id: 'h1', stage: 'OnHold', lead: { bid_due_at: '2024-08-15', check_back_at: iso(300) } });
  const parkedNoDate = proj({ id: 'h2', stage: 'OnHold', lead: { bid_due_at: '2024-08-15' } });
  const live = proj({ id: 'h3', stage: 'Lead', lead: { bid_due_at: iso(2) } });
  const overdue = proj({ id: 'h4', stage: 'Prospect', lead: { bid_due_at: iso(-4) } });
  const blank = proj({ id: 'h5', stage: 'Lead', lead: { bid_due_at: '' } });
  const missed = proj({ id: 'h6', stage: 'OnHold', lead: { bid_due_at: '2024-08-15', check_back_at: iso(-6) } });

  eq('parked job reads its check-back date', hub.chDueIso(parked), iso(300));
  eq('...so it is no longer permanently overdue', hub.chDueBand(parked), 'Later');
  eq('a 2024 bid_due_at would have banded Overdue', hub.chDueBand(parkedNoDate), 'Overdue');
  eq('parked with no check-back keeps the old behaviour', hub.chDueIso(parkedNoDate), '2024-08-15');
  eq('a live bid still reads its bid deadline', hub.chDueIso(live), iso(2));
  eq('...and still bands normally', hub.chDueBand(live), 'Due this week');
  eq('an overdue bid still shouts', hub.chDueBand(overdue), 'Overdue');
  eq('a MISSED check-back shouts too — that is the point', hub.chDueBand(missed), 'Overdue');
  eq('empty-string bid_due_at still degrades cleanly', hub.chDueBand(blank), 'No deadline set');
  eq('chOnHold only true when parked WITH a date',
    [hub.chOnHold(parked), hub.chOnHold(parkedNoDate), hub.chOnHold(live)], [true, false, false]);
  eq('the sort/filter label says what it now measures',
    hub.CH_SORTS.filter((x) => x.key === 'due').map((x) => x.label), ['Due / check back']);

  /* the sort itself: parked must fall behind a live overdue bid */
  const rows = [parked, overdue, live];
  const sorted = rows.slice().sort((a, b) => (hub.days(hub.chDueIso(a)) - hub.days(hub.chDueIso(b))));
  eq('deadline sort: overdue first, parked last', sorted.map((r) => r.id), ['h4', 'h3', 'h1']);

  /* the Due cell markup — assert on the shipped renderer's own strings */
  const cell = HUB.slice(HUB.indexOf('\'<td data-l="Due">\''), HUB.indexOf('\'<td data-l="Due">\'') + 400);
  ok('a parked row drops the red .cc-pill.due chip', /held \? '' : ' due'/.test(cell), cell.slice(0, 200));
  ok('...and is labelled "hold"', /held \? ' hold' : ''/.test(cell));

  /* ==================================================================== */
  console.log('\n== C. structure ==');
  const CSS = (() => { const i = html.indexOf('<style id="cr-cc-styles">'); return html.slice(i, html.indexOf('</style>', i)); })();
  /* Splitting on '}' tears an @media block in half and reports its prelude as an
     unprefixed selector. Match real selector heads instead — everything from the
     previous brace or semicolon up to the '{' that opens the rule. */
  const ocSelectors = (CSS.match(/[^{}@;]*\.cc-oc[^{}]*\{/g) || []).map((x) => x.slice(0, -1).trim());
  ok('found the outcome rules to check  [' + ocSelectors.length + ']', ocSelectors.length >= 25);
  eq('every outcome CSS selector is prefixed #cr-cc (BUG_CLASSES 9)',
    ocSelectors.filter((sel) => !/#cr-cc/.test(sel)), []);
  const ocBodies = (CSS.match(/[^{}@;]*\.cc-oc[^{}]*\{[^{}]*\}/g) || []).join('\n');
  eq('every var() in the outcome rules carries a literal fallback',
    ocBodies.match(/var\(--[a-z0-9-]+\)/g), null);
  /* Count CODE, not comments. 515's own fix names the token it removed in its
     explanatory comment, and a bare count finds that and calls it a live
     reference — the trap CLAUDE.md records. Safe to strip here because this is
     a stylesheet: there are no string literals for /* to hide inside. */
  const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  eq('no --goodbg in cr-cc-styles CODE — it is a #cr-ch2 token (515)',
    (cssCode.match(/var\(--goodbg/g) || []).length, 0);
  ok('...and the count is only clean AFTER stripping comments, so it was measured',
    (CSS.match(/var\(--goodbg/g) || []).length === 1);
  ok('the Bill to card fills from --ccm-wash with a literal',
    /\.ct\.bill\{[\s\S]{0,600}?--ccm-wash,rgba\(4,120,87,\.18\)/.test(CSS));
  eq('no Python \\U escapes in the new module text (BUG_CLASSES 11)',
    (CC.match(/\\U[0-9A-Fa-f]{8}/g) || []).length, 0);
  eq('the outcome step adds no body scroll-lock writer',
    (CC.match(/body\.style\.overflow/g) || []).length, 0);

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
