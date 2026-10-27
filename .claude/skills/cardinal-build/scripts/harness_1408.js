/* Build 1408 — a second rep on a job (checklist.lead.assigned[1]).

   Executes the SHIPPED text, not a re-implementation: the helpers beside assignedRepOf, the Assigned To
   card's markup expression and its change handlers (sliced out of renderOverview), ljCardHtml, the client
   list's Assigned filter (cr-rf) and prodVisibleAppt — each pulled out of index.html by brace-matching or
   by its own anchors, and run in jsdom against real data shapes (assigned is a JSON array, index 0 primary).

       node harness_1408.js                    # build 1408 -> GREEN
       node harness_1408.js prev_1407.html     # main@1407  -> RED (negative control)

   Every extraction is wrapped: a missing symbol on the control records a FAIL and carries on
   (BUG_CLASSES 37 — a control that crashes proves nothing).                                              */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  -> ' + n : '')); } };
const tryRun = (label, fn) => { try { return fn(); } catch (e) { ok(label + ' (ran)', false, e && e.message); return undefined; } };

/* brace-match a `function NAME(` declaration out of a slice of the file */
function fnText(name, from, to) {
  const hay = SRC.slice(from || 0, to || SRC.length);
  const i = hay.indexOf('function ' + name + '(');
  if (i === -1) throw new Error('no function ' + name);
  let j = hay.indexOf('{', i), d = 0, k = j;
  for (; k < hay.length; k++) { const c = hay[k]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return hay.slice(i, k + 1);
}
const between = (a, b) => { const i = SRC.indexOf(a); if (i === -1) throw new Error('anchor missing: ' + a.slice(0, 50));
  const j = SRC.indexOf(b, i + a.length); if (j === -1) throw new Error('end anchor missing: ' + b.slice(0, 50)); return SRC.slice(i, j); };

const P = 'rep.a@example.test', J = 'jacob@cardinalrenovations.net', Y = 'rep.b@example.test', T = 'theo@cardinalrenovations.net';
const NAMES = { [P]: 'Rep A', [J]: 'Jacob', [Y]: 'Rep B', [T]: 'Theo' };   /* placeholder reps, not real staff */
const ROSTER = Object.keys(NAMES).map(e => ({ email: e, name: NAMES[e] }));
const mk = (assigned, extra) => Object.assign({ id: 'p1', name: 'Smith', address: '1 Main St', created_by: 'theo@cardinalrenovations.net',
  stage: 'Lead', checklist: JSON.stringify({ lead: assigned === undefined ? {} : { assigned } }) }, extra || {});

const dom = new JSDOM('<!doctype html><div id="mount"></div>', { runScripts: 'outside-only' });
const w = dom.window;
w.parseCkAll = pr => { try { return JSON.parse(pr.checklist || '{}'); } catch (_) { return {}; } };
w.esc = s => String(s == null ? '' : s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
w.rptRepName = e => NAMES[e] || '';

/* ---------- 1. the helpers ---------- */
console.log('helpers (shipped text)');
const helpers = (() => { const a = SRC.indexOf('function assignedRepOf('); let got = 0;
  ['assignedRepOf', 'secondRepOf', 'crWithPrimary', 'repIsOnJob'].forEach(n => {
    tryRun('extract ' + n, () => { w.eval(fnText(n, a, a + 4000) + ';window.' + n + '=' + n + ';'); got++; }); });
  return got === 4; })();
tryRun('helpers', () => {
  ok('secondRepOf reads index 1', w.secondRepOf(mk([P, J])) === J, w.secondRepOf(mk([P, J])));
  ok('secondRepOf null with one rep', w.secondRepOf(mk([P])) === null);
  ok('secondRepOf null when it repeats the primary (any case)', w.secondRepOf(mk([P, P.toUpperCase()])) === null);
  ok('secondRepOf null with no primary at index 0', w.secondRepOf(mk(['', J])) === null);
  ok('secondRepOf null-safe on no lead / bad JSON', w.secondRepOf(mk(undefined)) === null && w.secondRepOf({ checklist: '{bad' }) === null);
  ok('assignedRepOf still index 0', w.assignedRepOf(mk([P, J])) === P);
  ok('crWithPrimary keeps the second rep', JSON.stringify(w.crWithPrimary([P, J], Y)) === JSON.stringify([Y, J]));
  ok('crWithPrimary clears the second when it becomes primary', JSON.stringify(w.crWithPrimary([P, J], J)) === JSON.stringify([J]));
  ok('crWithPrimary with no array', JSON.stringify(w.crWithPrimary(undefined, Y)) === JSON.stringify([Y]));
  ok('repIsOnJob: primary', w.repIsOnJob(mk([P, J]), P) === true);
  ok('repIsOnJob: second', w.repIsOnJob(mk([P, J]), J) === true);
  ok('repIsOnJob: neither', w.repIsOnJob(mk([P, J]), Y) === false);
});

/* ---------- 2. the Assigned To card ---------- */
console.log('Assigned To card (shipped markup + handlers)');
const cardExpr = tryRun('extract card markup', () => between('  /* ---- assigned to ---- */', '  /* 420: Convert to Insurance'));
const handlers = tryRun('extract card handlers', () => between("  var asg = document.getElementById('dbAssignSel');", '  acxBindOnce(mount);'));
let writes = [], audits = [], notes = [], salesRep = [], errors = [], renders = 0;
function stage(pr, admin) {
  writes = []; audits = []; notes = []; salesRep = []; errors = []; renders = 0;
  const env = {
    pr, isAdminUser: () => admin, TEAM_ROSTER: ROSTER, ICO: () => '',
    patchProjectCk: async (p, patch) => { writes.push(JSON.parse(JSON.stringify(patch))); p.checklist = JSON.stringify(Object.assign(w.parseCkAll(p), patch)); },
    auditLog: (k, msg) => audits.push(k + '|' + msg),
    renderOverview: () => { renders++; }, showError: m => errors.push(m), clientLink: () => '',
    tmRoleOf: () => 'Sales',
    sb: { from: () => ({ select: () => ({ eq: async () => ({ count: 0 }) }),
      update: (o) => ({ eq: () => ({ select: () => ({ single: async () => { salesRep.push(o.sales_rep); return {}; } }) }) }) }) },
  };
  w.__env = env;
  w.notifyTeam = (to) => notes.push(to.join(','));
  w.currentUser = { email: 'theo@cardinalrenovations.net' };
  const keys = Object.keys(env);
  const body = 'var html = "";\n' + cardExpr + '\ndocument.getElementById("mount").innerHTML = html;\n' + handlers;
  w.eval('(function(' + keys.join(',') + '){' + body + '}).apply(null, [' + keys.map(k => '__env.' + k).join(',') + ']);');
}
const settle = () => new Promise(r => setTimeout(r, 30));
const change = (id, v) => { const s = w.document.getElementById(id);
  if (!s) { ok('#' + id + ' exists to change', false); return; }
  if (!Array.from(s.options).some(o => o.value === v)) { const o = w.document.createElement('option'); o.value = v; s.appendChild(o); }
  s.value = v; s.dispatchEvent(new w.Event('change')); };
const text = () => w.document.getElementById('mount').textContent.replace(/\s+/g, ' ').trim();

(async () => {
  if (cardExpr && handlers) {
    try {
      // a: admin, two reps — both shown, second picker present, primary excluded from it
      stage(mk([P, J]), true);
      const line = w.document.querySelector('.dbassign .dbrep2row .dbrep2');
      ok('card shows "Second rep: Jacob"', !!line && line.textContent === 'Second rep: Jacob', line && line.textContent);
      ok('primary line unchanged: .dbrep b is Rep A', (w.document.querySelector('.dbrep b') || {}).textContent === 'Rep A');
      const s2 = w.document.getElementById('dbAssign2Sel');
      ok('second picker is a child of the card', !!s2 && s2.matches('.acxassignsec .dbassign .dbrep2row > select.acxsel'));
      const vals = s2 ? Array.from(s2.options).map(o => o.value) : [];
      ok('second picker never lists the primary', vals.indexOf(P) === -1 && vals.indexOf(J) !== -1, vals.join(' '));
      ok('second picker offers Remove when set', vals.indexOf('__clear') !== -1);

      // b: set the second rep -> one write [P, Y], audit, NO notification, NO sales_rep write
      change('dbAssign2Sel', Y); await settle();
      ok('set second writes [primary, second]', writes.length === 1 && JSON.stringify(writes[0].lead.assigned) === JSON.stringify([P, Y]), JSON.stringify(writes));
      ok('set second is audit-logged', audits.length === 1 && audits[0] === 'assign|Second rep set to Rep B — Smith', audits.join(' / '));
      ok('set second sends NO notification', notes.length === 0, notes.join(' / '));
      ok('set second does not touch sales_rep (commission)', salesRep.length === 0, salesRep.join(','));

      // c: clear
      stage(mk([P, J]), true);
      change('dbAssign2Sel', '__clear'); await settle();
      ok('clear writes [primary] only', writes.length === 1 && JSON.stringify(writes[0].lead.assigned) === JSON.stringify([P]), JSON.stringify(writes));
      ok('clear is audit-logged with who was removed', audits[0] === 'assign|Second rep removed (Jacob) — Smith', audits[0]);
      ok('clear sends NO notification', notes.length === 0);

      // d: refuse primary == second even if the option were forced
      stage(mk([P, J]), true);
      change('dbAssign2Sel', P); await settle();   /* change() force-adds the option the picker never offers */
      ok('second == primary is refused (no write)', writes.length === 0, JSON.stringify(writes));

      // e: reassign primary keeps the second
      stage(mk([P, J]), true);
      change('dbAssignSel', Y); await settle();
      ok('primary reassign keeps the second: [Rep B, Jacob]', writes.length === 1 && JSON.stringify(writes[0].lead.assigned) === JSON.stringify([Y, J]), JSON.stringify(writes));
      ok('primary reassign still notifies the new primary only', notes.length === 1 && notes[0] === Y, notes.join(' / '));
      ok('commission rep follows the PRIMARY', salesRep.length === 1 && salesRep[0] === Y, salesRep.join(','));

      // f: reassign primary TO the current second -> second clears (never primary == second)
      stage(mk([P, J]), true);
      change('dbAssignSel', J); await settle();
      ok('primary -> current second clears the second slot', JSON.stringify((writes[0] || {}).lead && writes[0].lead.assigned) === JSON.stringify([J]), JSON.stringify(writes));

      // g: non-admin sees the line, no pickers; nothing when unset
      stage(mk([P, J]), false);
      ok('rep (non-admin) sees "Second rep: Jacob", no pickers', /Second rep: Jacob/.test(text()) && !w.document.getElementById('dbAssign2Sel') && !w.document.getElementById('dbAssignSel'));
      stage(mk([P]), false);
      ok('rep (non-admin) sees no second line when none set', !w.document.querySelector('.dbrep2row'));

      // h: admin, no primary at index 0 -> no second picker
      stage(mk(undefined), true);
      ok('no primary yet -> no second picker, a hint instead', !w.document.getElementById('dbAssign2Sel') && /Assign a rep first/.test(text()), text());
    } catch (e) { ok('card section ran', false, e && e.stack); }
  } else ok('card section extracted', false);

  /* ---------- 3. Leads & Jobs card chip ---------- */
  console.log('Leads & Jobs card');
  tryRun('ljCardHtml', () => {
    const t = fnText('ljCardHtml') + '\n' + fnText('ljAssignedEmail') + '\n' + fnText('ljRepLabel');
    Object.assign(w, { LJ_SPINE: {}, LJ_SOLID: {}, LJ_INK: {}, LJ_UNASSIGNED: 'Unassigned', ljState: { sel: null },
      normStage: s => s, ljTrades: () => [], ljAge: () => 'today', ljPhoneSvg: () => '', ljSmsSvg: () => '', ljMailSvg: () => '' });
    w.eval(t + '\nwindow.ljCardHtml=ljCardHtml;');
    const d = w.document.createElement('div');
    d.innerHTML = w.ljCardHtml(mk([P, J]));
    const rep = d.querySelector('.ljcard .ljmain .ljrep');
    const chip = rep && rep.querySelector('.ljrep2');
    ok('card groups under the primary: .ljrep starts "Rep A"', !!rep && rep.firstChild && rep.firstChild.nodeValue === 'Rep A', rep && rep.innerHTML);
    ok('chip "2nd: Jacob" inside .ljrep', !!chip && chip.textContent === '2nd: Jacob', chip && chip.outerHTML);
    d.innerHTML = w.ljCardHtml(mk([P]));
    ok('no chip with one rep', !d.querySelector('.ljrep2'));
  });

  /* ---------- 4. "mine": the client-list Assigned = Me filter, and the calendar ---------- */
  console.log('mine filters');
  tryRun('cr-rf matches()', () => {
    const start = SRC.indexOf('<script id="cr-rf-script">'); const end = SRC.indexOf('</script>', start);
    const body = 'var filter = "__me";\n' + fnText('myEmail', start, end) + '\n' + fnText('repOf', start, end) + '\n' + fnText('matches', start, end) + '\nwindow.__rfMatches = matches;';
    w.eval('(function(){' + body + '})();');
    w.currentUser = { email: J };
    ok('Assigned = Me includes a job where I am the second rep', w.__rfMatches(mk([P, J])) === true);
    ok('Assigned = Me still excludes a job I am not on', w.__rfMatches(mk([P, Y])) === false);
    w.currentUser = { email: P };
    ok('Assigned = Me still includes the primary', w.__rfMatches(mk([P, J])) === true);
  });
  tryRun('prodVisibleAppt', () => {
    w.eval('var ADMIN_EMAILS=["theo@cardinalrenovations.net"], PRODUCTION_EMAILS=["curtis@cardinalrenovations.net"];var currentUser={email:"' + J + '"};var cacheProjects=[' + JSON.stringify(mk([P, J])) + '];\n' + fnText('prodVisibleAppt') + '\nwindow.__pva=prodVisibleAppt;');
    ok('the second rep sees the job day on their calendar', w.__pva({ kind: 'job', project_id: 'p1' }) === true);
    w.eval('currentUser={email:"' + Y + '"};');
    ok('a rep not on the job still does not', w.__pva({ kind: 'job', project_id: 'p1' }) === false);
  });

  /* ---------- 4b. who earns the 10% (app mirror of make_commission) + the confirm text ---------- */
  console.log('commission recipient');
  tryRun('crCommissionRep', () => {
    const a = SRC.indexOf('function assignedRepOf(');
    const v = SRC.slice(a, a + 8000).match(/var CR_NO_COMMISSION = '[^']+';/);
    if (!v) throw new Error('no CR_NO_COMMISSION');
    w.tmRoleOf = em => (em === T || em === 'joan@cardinalrenovations.net') ? 'Admin' : (em === 'curtis@cardinalrenovations.net' ? 'Production' : 'Sales');
    w.eval(v[0] + '\n' + fnText('crCommissionRep', a, a + 8000) + ';window.crCommissionRep=crCommissionRep;');
    const e1 = w.crCommissionRep(mk([T, J], { sales_rep: T }));
    ok('Theo primary + Jacob second -> Jacob earns (second)', !!e1 && e1.email === J && e1.second === true, JSON.stringify(e1));
    const e2 = w.crCommissionRep(mk([P, J], { sales_rep: P }));
    ok('rep primary + Jacob second -> the primary only', !!e2 && e2.email === P && e2.second === false, JSON.stringify(e2));
    ok('Theo job, no second -> nobody (unchanged)', w.crCommissionRep(mk([T], { sales_rep: T })) === null);
    const e4 = w.crCommissionRep(mk([P, T], { sales_rep: P }));
    ok('Theo as second under a rep primary -> the primary', !!e4 && e4.email === P && !e4.second, JSON.stringify(e4));
    ok('Theo never earns: Theo second on an owner job -> nobody', w.crCommissionRep(mk(['curtis@cardinalrenovations.net', T], { sales_rep: T })) === null);
  });
  await (async () => { try {
    const t = 'async ' + fnText('payMigrateLegacyIn');
    let asked = '';
    Object.assign(w, { payLegacyIn: () => [{ p: { amt: 1000, dir: 'in' }, i: 0 }], fmtMoney: n => '$' + n, payMigrateDrop: () => 0,
      crAsk: async m => { asked = m; return false; }, sb: {}, crTell: () => {} });
    w.eval(t + ';window.payMigrateLegacyIn=payMigrateLegacyIn;');
    const run = async pr => { asked = ''; w.eval('var currentProject = ' + JSON.stringify(pr) + ';'); await w.payMigrateLegacyIn(); return asked; };
    let q = await run(mk([T, J], { sales_rep: T }));
    ok('confirm names the second rep: "...created for Jacob (second rep)."', q.indexOf('so a 10% commission will be created for Jacob (second rep).') !== -1, JSON.stringify(q.slice(-120)));
    q = await run(mk([P, J], { sales_rep: P }));
    ok('confirm on a rep job names the primary: "...created for Rep A."', q.indexOf('so a 10% commission will be created for Rep A.') !== -1, JSON.stringify(q.slice(-120)));
    q = await run(mk([T], { sales_rep: T }));
    ok('confirm on a Theo job with no second rep promises no commission', q.indexOf('commission will be created') === -1, JSON.stringify(q.slice(-120)));
  } catch (e) { ok('confirm text (ran)', false, e && e.message); } })();

  /* ---------- 5. the other two primary writers keep the second rep ---------- */
  console.log('other reassign paths');
  ok('Bulk reassign uses crWithPrimary', SRC.indexOf("ck.lead.assigned = (typeof window.crWithPrimary === 'function') ? window.crWithPrimary(ck.lead.assigned, email) : [email];") !== -1);
  ok('Community job rep picker uses crWithPrimary', SRC.indexOf("L.assigned = (typeof window.crWithPrimary === 'function') ? window.crWithPrimary(L.assigned, v) : [v];") !== -1);
  ok('no primary writer still overwrites the whole array', SRC.indexOf('L.assigned = [asg.value];') === -1 && SRC.indexOf('ck.lead.assigned = [email];') === -1);

  const label = fail ? 'RED' : 'GREEN';
  console.log('\n' + label + ' — ' + pass + ' passed, ' + fail + ' failed  (' + path.basename(FILE) + ')');
  process.exit(fail ? 1 : 0);
})();
