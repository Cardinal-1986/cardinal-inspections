/* sentinel setup — the CRM (index.html), signed in, walked through its screens.
 *
 *   node sentinel.js index.html \
 *        --setup .../e2e_mock_supa.js,.../sentinel_setup_cardinal.js \
 *        --since <previous artifact>
 *
 * ORDER MATTERS: the mock must come first — it defines window.supabase, which
 * the app calls during boot. This file only seeds it and declares the walk.
 *
 * WITHOUT THIS THE SENTINEL ONLY EVER SEES THE LOGIN SCREEN, and a sweep of a
 * login form reports CLEAN and means nothing by it. Every class this thing
 * exists to catch — the ink on the dark ground (7 times), the collapsed box,
 * the rule that never wins — lives behind the sign-in, and half of it lives
 * inside a panel that does not exist until something opens it.
 *
 * The fixtures are shaped from the real tables, not invented (BUG_CLASSES 45:
 * a fixture invented rather than observed makes the stub agree with the code,
 * so both are wrong together). Column names and value shapes below match what
 * projects / punch_items / appointments / objections / team_profiles hold.
 *
 * One project deliberately carries NO punch items, no photos and no estimate —
 * the empty state. An empty state no instrument ever renders is an empty state
 * nobody has checked. */
(function () {
  'use strict';

  var LONG = 'Chimney flashing, step flashing and counter flashing all need replacing on the ' +
             'north elevation; the drip edge is undersized and the valley metal is rusted through.';

  function ck(po, extra) {
    return JSON.stringify(Object.assign({
      po: po, lead: { assigned: [] }, meas: { squares: 32, pitch: '6/12' }
    }, extra || {}));
  }

  window.__SEED__ = {
    team_profiles: [
      { email:'theo@cardinalrenovations.net',    name:'Theo Dorion',   role:'admin',      phone:'937-555-0101' },
      { email:'joan@cardinalrenovations.net',    name:'Joan Dorion',   role:'admin',      phone:null },
      { email:'curtis@cardinalrenovations.net',  name:'Curtis',        role:'production', phone:null },
      { email:'nick@cardinalrenovations.net',    name:'Nick',          role:'sales',      phone:null }
    ],
    projects: [
      { id:'p1', name:'Mark Diamond', address:'7990 Germantown Pike', city:'Dayton', state:'OH', zip:'45418',
        stage:'Approved', created_by:'theo@cardinalrenovations.net', sales_rep:null, checklist:ck(1048),
        phone:'937-555-0144', email:'mark@example.com', crm:'retail',
        created_at:'2026-08-01T10:00:00Z', updated_at:'2026-08-18T10:00:00Z', stage_since:'2026-08-10T10:00:00Z' },
      { id:'p2', name:'Kathy May', address:'145 Rosemont Blvd', city:'Dayton', state:'OH', zip:'45405',
        stage:'Scheduled', created_by:'joan@cardinalrenovations.net', sales_rep:'nick@cardinalrenovations.net',
        checklist:ck(1069), phone:'937-555-0177', email:null, crm:'retail',
        created_at:'2026-08-05T10:00:00Z', updated_at:'2026-08-19T10:00:00Z', stage_since:'2026-08-15T10:00:00Z' },
      /* the empty one — no punch items, no photos, no estimate, no phone */
      { id:'p3', name:'Unassigned Caller', address:'', stage:'Lead',
        created_by:'joan@cardinalrenovations.net', sales_rep:null, checklist:ck(1070),
        phone:null, email:null, crm:'retail',
        created_at:'2026-08-19T22:00:00Z', updated_at:'2026-08-19T22:00:00Z', stage_since:'2026-08-19T22:00:00Z' }
    ],
    punch_items: [
      { id:'i1', project_id:'p1', title:'Remove rear chimney, patch damaged shingles', detail:LONG,
        kind:'ticket', priority:'high', status:'open', assigned_to:'curtis@cardinalrenovations.net',
        created_by:'theo@cardinalrenovations.net', created_at:'2026-08-18T23:18:36Z',
        scheduled_at:'2026-08-27', scheduled_time:'09:00:00', photos:[], comments:[], steps:[], template:null },
      { id:'i2', project_id:'p1', title:'Gutter re-hang, north run', detail:null,
        kind:'punch', priority:'normal', status:'done', assigned_to:'curtis@cardinalrenovations.net',
        created_by:'theo@cardinalrenovations.net', created_at:'2026-08-17T14:00:00Z',
        done_at:'2026-08-18T16:00:00Z', done_by:'curtis@cardinalrenovations.net',
        scheduled_at:'2026-08-19', scheduled_time:null, photos:[], comments:[], steps:[], template:null }
    ],
    appointments: [
      { id:'a1', project_id:'p1', when:'2026-08-21T14:00:00Z', note:'Roof inspection', kind:'inspection',
        created_by:'theo@cardinalrenovations.net' },
      { id:'a2', project_id:'p2', when:'2026-08-22T18:30:00Z', note:LONG, kind:'adjuster',
        created_by:'theo@cardinalrenovations.net' }
    ],
    objections: [
      { id:'o1', category:'At the Door', title:'I am not interested', sort:1,
        reply:'Understood. Most people say that before they know a neighbour two doors down had the same hail.',
        why:'It is a reflex, not an answer.' },
      { id:'o2', category:'Price', title:'That is too expensive', sort:1,
        reply:'Compared with what? Let us put the two scopes side by side.', why:'Price without scope is not a number.' }
    ],
    /* honestly empty — the app must render these states, and it has shipped
       bugs in exactly this direction before */
    estimates: [], insurance_claims: [], project_photos: [], inspection_reports: [],
    crews: [], crew_work_orders: [], crew_docs: [], crew_notes: [], crew_rates: [],
    owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [],
    owner_docs: [], pricing_items: [], commissions: [], community_partners: [], punch_steps: []
  };

  /* ── the walk ─────────────────────────────────────────────────────────────
     Each state leaves the app on ONE screen. A state that fails to open is
     REPORTED by the sentinel rather than swallowed — a state that silently
     did nothing would hand back the landing page dressed as a feature. */
  function pause(ms) { return new Promise(function (r) { setTimeout(r, ms || 420); }); }

  function leaveLanding() {
    ['landingView', 'loginView'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.style.display = 'none'; if (e.classList) e.classList.remove('open'); }
    });
  }
  function api(name) { return window[name] && window[name].open ? window[name] : null; }
  function closeAll() {
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {}
  }

  window.__sentinelStates = [
    { name:'home',        run: async function () { leaveLanding(); closeAll(); await pause(600); } },
    { name:'client',      run: async function () {
        leaveLanding(); closeAll();
        if (typeof openProject === 'function') openProject('p1');
        else if (typeof showProject === 'function') showProject('p1');
        else throw new Error('no client-profile opener found');
        await pause(700); } },
    { name:'production',  run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalProduction'); if (!m) throw new Error('CardinalProduction.open missing');
        m.open(); await pause(700); } },
    { name:'salesfloor',  run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalSalesFloor'); if (!m) throw new Error('CardinalSalesFloor.open missing');
        m.open(); await pause(700); } },
    { name:'storm',       run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalStorm'); if (!m) throw new Error('CardinalStorm.open missing');
        m.open(); await pause(700); } },
    { name:'colors',      run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalColors'); if (!m) throw new Error('CardinalColors.open missing');
        m.open(); await pause(700); } },
    { name:'crews',       run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalCrews'); if (!m) throw new Error('CardinalCrews.open missing');
        m.open(); await pause(700); } },
    { name:'estimates',   run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalEstimates'); if (!m) throw new Error('CardinalEstimates.open missing');
        m.open(); await pause(700); } },
    { name:'drawer',      run: async function () {
        leaveLanding(); closeAll();
        var b = document.getElementById('burger') ||
                document.querySelector('[data-cr-burger],.burger,#navBtn');
        if (!b) throw new Error('no burger button found');
        b.click(); await pause(600); } },
    { name:'newproject',  run: async function () {
        leaveLanding(); closeAll();
        if (typeof openProjModal !== 'function') throw new Error('openProjModal missing');
        openProjModal(); await pause(600); } },
    { name:'checklist',   run: async function () {
        leaveLanding(); closeAll();
        if (typeof openChecklist !== 'function') throw new Error('openChecklist missing');
        if (window.projects && window.projects[0]) window.currentProject = window.projects[0];
        openChecklist(); await pause(600); } },
    { name:'signature',   run: async function () {
        leaveLanding(); closeAll();
        var m = document.getElementById('sigModal'); if (!m) throw new Error('sigModal missing');
        try { if (typeof sigReset === 'function') sigReset(); } catch (e) {}
        m.style.display = 'block'; await pause(500); } }
  ];
})();
