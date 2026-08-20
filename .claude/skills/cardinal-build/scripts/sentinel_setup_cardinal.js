/* sentinel setup — the CRM (index.html), signed in, walked through its screens.
 *
 *   node sentinel.js index.html \
 *        --setup .../sentinel_setup_cardinal.js,.../e2e_mock_supa.js \
 *        --since <previous artifact>
 *
 * ⚠ ORDER MATTERS, AND IT IS THE OPPOSITE OF WHAT IT LOOKS LIKE. THIS FILE
 * GOES FIRST. The mock reads `var STORE = (window.__SEED__ || {})` at its own
 * execution time, so a seed assigned after it lands in a variable nothing
 * reads — the store stays EMPTY and every screen renders its empty state.
 * Nothing errors. The walk completes. The report looks like a real sweep of a
 * populated app and is a sweep of nothing, which is the worst possible
 * failure for an instrument: confident, quiet and wrong.
 *
 * The first CRM run made exactly this mistake — mock first, seed second — and
 * swept twelve empty screens while reporting twelve screens. The three ink
 * findings it produced were real (they are chrome, present either way), but
 * the lists, cards and tables where small text actually lives were never
 * rendered at all.
 *
 * Putting this file first is safe: nothing here touches window.supabase, and
 * the app does not call createClient until boot, long after both init scripts
 * have run. seedLanded() below turns a repeat of this into a loud failure.
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

  /* SENTINEL_AS=scottie sweeps as Curtis/Scottie's production role instead of
     admin. Read from the page URL so it can be driven without editing a file. */
  try {
    var who = (location.search.match(/[?&]as=([\w.]+)/) || [])[1];
    if (who === 'scottie') window.__AS__ = { email:'scottie@cardinalrenovations.net', name:'Scottie' };
    else if (who === 'nick') window.__AS__ = { email:'nick@cardinalrenovations.net', name:'Nick' };
  } catch (e) {}

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
      { email:'scottie@cardinalrenovations.net', name:'Scottie',       role:'production', phone:null },
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
      /* 945: The Line renders four buckets + a pinned queue — a seed where every
         punch item is assigned and dated sweeps an EMPTY queue and proves
         nothing. i3 = the queue (unassigned, no day, old); i4 = Assigned
         (person, no day); i5 = Active (open visit stamped with TODAY'S local
         day key, computed so the ON SITE chip can actually light). */
      { id:'i3', project_id:'p1', title:'Downspout came loose', detail:null,
        kind:'punch', priority:'normal', status:'open', assigned_to:null,
        created_by:'theo@cardinalrenovations.net', created_at:'2026-08-13T12:00:00Z',
        scheduled_at:null, scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] },
      { id:'i4', project_id:'p1', title:'Soffit vent swap', detail:null,
        kind:'punch', priority:'normal', status:'open', assigned_to:'scottie@cardinalrenovations.net',
        created_by:'theo@cardinalrenovations.net', created_at:'2026-08-16T12:00:00Z',
        scheduled_at:null, scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] },
      { id:'i5', project_id:'p1', title:'Fix storm door', detail:null,
        kind:'punch', priority:'normal', status:'open', assigned_to:'curtis@cardinalrenovations.net',
        created_by:'theo@cardinalrenovations.net', created_at:'2026-08-19T12:00:00Z',
        scheduled_at:(function(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); })(),
        scheduled_time:null, photos:[], comments:[], steps:[], template:null,
        visits:[{ in:new Date(Date.now()-3600000).toISOString(), out:null,
                  by:'curtis@cardinalrenovations.net', name:'Curtis',
                  day:(function(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); })() }] },
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
    /* 948: the Magnet Board renders crews x the next 7 days - an empty crews
       seed sweeps an empty grid and proves nothing (the 945 lesson). Dates are
       COMPUTED so the rolling window always contains them: +1 day, +5 days,
       and the next Sunday (the worked-Sunday case). */
    crews: [
      { id:'c1', name:'Betos Home Improvements', legal_name:null, trade:'Roofing',  archived:false, contact_name:'Alberto Campuzano' },
      { id:'c2', name:'Pineda Siding',           legal_name:null, trade:'Siding',   archived:false, contact_name:'Jamie & Robin' },
      { id:'c3', name:'Bob The Beast Deaton',    legal_name:null, trade:'Windows',  archived:false, contact_name:'Robert W Deaton' },
      { id:'c4', name:'Jiminez Gutters',         legal_name:null, trade:'Gutters',  archived:false, contact_name:'Francisco Ramirez' },
      { id:'c5', name:'Amanda Hoskins',          legal_name:null, trade:'General',  archived:false, contact_name:null }
    ],
    crew_work_orders: (function(){
      function key(off){ var d=new Date(); d=new Date(d.getFullYear(),d.getMonth(),d.getDate()); d.setDate(d.getDate()+off);
        return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
      var sunOff=(7-new Date().getDay())%7; if(sunOff===0) sunOff=7;
      return [
        { id:'w1', crew_id:'c1', project_id:'p1', report_id:null, status:'sent',  scheduled_on:key(1), sent_at:'2026-08-19T12:00:00Z', completed_on:null },
        { id:'w2', crew_id:'c1', project_id:'p1', report_id:null, status:'draft', scheduled_on:key(5), sent_at:null, completed_on:null },
        { id:'w3', crew_id:'c2', project_id:'p1', report_id:null, status:'sent',  scheduled_on:key(sunOff), sent_at:'2026-08-19T12:00:00Z', completed_on:null }
      ];
    })(), crew_docs: [], crew_notes: [], crew_rates: [],
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

  /* ⚠ The drawer does NOT close with hideAllViews(), so without this every
     state AFTER the nav state was probed with the menu still over it — the
     first run reported four contrast failures that were really one screen
     bleeding into three others. A state must hand back the screen it names. */
  function closeDrawer() {
    document.body.classList.remove('cr-drawer-open', 'cr-drawer-lift');
    var m = document.getElementById('navMenu');
    if (m) m.classList.remove('open', 'show');
  }
  function closeAll() {
    closeDrawer();
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (e) {}
  }

  /* ⚠ Visible means VISIBLE, not present. Build 926 hides #navBtn on desktop
     (body.cr-lnav-on ... #navBtn{display:none!important}) because the left
     rail is the nav at that width — one nav, deliberately. Clicking it anyway
     opens a #navMenu that renders WHITE and that no desktop user can ever
     reach, and scoring its light-era inks manufactures findings. That is the
     staged-impossible-configuration trap, and this setup fell into it on its
     first run. */
  function onScreen(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var b = el.getBoundingClientRect();
    return b.width > 2 && b.height > 2;
  }

  /* ⚠ A silent empty store is what this guards. If the seed did not land, the
     walk must FAIL — not quietly probe a dozen empty states and call it a
     sweep. `seen` is checked against the fixtures this file actually declares,
     so it cannot pass vacuously. */
  function seedLanded() {
    var n = (window.__SEED__ && window.__SEED__.projects || []).length;
    if (n < 3) throw new Error('seed missing: __SEED__.projects has ' + n + ', expected 3');
    var rows = document.querySelectorAll(
      '[data-pid],[data-project],[data-open-project],.clirow,.ljrow,.pcard,.cr-pcard');
    if (!rows.length) throw new Error(
      'the store is EMPTY at render time — put sentinel_setup_cardinal.js BEFORE ' +
      'e2e_mock_supa.js in --setup, or the mock reads __SEED__ before it exists');
    return rows.length;
  }

  window.__sentinelStates = [
    { name:'home',        run: async function () {
        leaveLanding(); closeAll(); await pause(700); seedLanded(); } },
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
    /* "the navigation, whichever one this width actually has" — the phone
       drawer below the rail breakpoint, the left rail above it. Named for the
       job rather than the mechanism, so it stays honest at both widths. */
    { name:'nav',         run: async function () {
        leaveLanding(); closeAll();
        var b = document.getElementById('navBtn') ||
                document.querySelector('[data-cr-burger],.burger,#burger');
        if (onScreen(b)) { b.click(); await pause(600); return; }
        var rail = document.getElementById('cr-lnav');
        if (!onScreen(rail))
          throw new Error('neither the burger nor the rail is on screen — this width has no nav');
        await pause(400); } },
    { name:'dispatch',  run: async function () {
        leaveLanding(); closeAll();
        var dm = api('CardinalDispatch'); if (!dm) throw new Error('CardinalDispatch.open missing');
        await dm.open(); await pause(800); } },

    { name:'punch',  run: async function () {
        leaveLanding(); closeAll();
        if (typeof window.openPunchView !== 'function') throw new Error('openPunchView missing');
        await window.openPunchView(); await pause(700); } },

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
