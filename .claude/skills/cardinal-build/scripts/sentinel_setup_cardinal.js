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

  /* rb-light: the app themes ITSELF at boot — cr-rbtheme-toggle-script reads
     localStorage['cardinal.theme.rb'] and REMOVES a bare data-theme attribute
     when that key is not '1'. So the only honest way to sweep the light theme
     is to set the app's own key and let it apply it. The sentinel publishes
     the requested theme as window.__sentinelTheme (its own attribute set is
     kept for artifacts that read the attribute directly). Before this, every
     --themes rb-light sweep of the CRM was a second dark sweep under a light
     label (found 23 Aug 2026, manual-estimates audit). */
  try {
    if (window.__sentinelTheme === 'rb-light') localStorage.setItem('cardinal.theme.rb', '1');
  } catch (e) {}

  /* ⚠ THE PUSH NUDGE IS TIME-BASED, NOT STATE-BASED, AND IT POISONS A LONG WALK.
     Build 1014's bar (#crPushNudge) shows ONCE per device to a signed-in user
     who has never been asked. It is position:fixed near the bottom and it
     arrives on a retry timer roughly five seconds after boot — so in a walk of
     twenty-five screens it appears partway through and then sits over EVERY
     screen after that. Measured: it first showed at state 6 and was on screen
     for the remaining nineteen.

     That is not a leak in the walk and it is not a defect in the app — it is a
     dismissible bar doing exactly what it was built to do. But a sweep should
     represent the ordinary case, and the ordinary case is a user who has
     already answered it once. Setting the app's OWN dismissal key is how a
     returning device looks, so this stages a real configuration rather than
     suppressing an inconvenient one.

     Deliberately NOT done by hiding the element: the key is the app's own
     mechanism, and a rig that reaches past a feature's state into its DOM is
     the staged-impossible-configuration trap this file already warns about. */
  try { localStorage.setItem('cr-push-nudge-dismissed', '1'); } catch (e) {}

  /* SENTINEL_AS=scottie sweeps as Curtis/Scottie's production role instead of
     admin. Read from the page URL so it can be driven without editing a file. */
  try {
    var who = (location.search.match(/[?&]as=([\w.]+)/) || [])[1];
    if (who === 'scottie') window.__AS__ = { email:'scottie@cardinalrenovations.net', name:'Scottie' };
    else if (who === 'curtis') window.__AS__ = { email:'curtis@cardinalrenovations.net', name:'Curtis' };
    else if (who === 'nick') window.__AS__ = { email:'nick@cardinalrenovations.net', name:'Nick' };
  } catch (e) {}

  var LONG = 'Chimney flashing, step flashing and counter flashing all need replacing on the ' +
             'north elevation; the drip edge is undersized and the valley metal is rusted through.';

  function ck(po, extra) {
    /* 1167 made the home board count claim_type (projClaimType). These
       fixtures always MEANT retail — the row's own crm:'retail' column says
       so — but the checklist never carried the real discriminator, so the
       board filtered all three out and seedLanded() threw on the home state.
       The fixture was stale, not the app. */
    return JSON.stringify(Object.assign({
      po: po, lead: { assigned: [], claim_type: 'retail' }, meas: { squares: 32, pitch: '6/12' }
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
    estimates: [], project_photos: [], inspection_reports: [],
    /* 1158: the Invoices & AR view (1107-1157) reads these two. Both are
       ADDITIVE — no other state reads either table, so seeding them cannot
       move an existing render. `app_settings` carries the reminders master
       switch (1157) so the header paints its real Off state rather than the
       "Switch unavailable" error state a missing table produces; flip this
       to true to sweep the On copy, which is the longer of the two strings. */
    app_settings: [{ key:'payment_reminders_enabled', value:false }],
    payment_reminders: [],
    /* 992: the Line Item Library's category strip. The eight TABS are static —
       seeding cannot add or remove one — so this is here for the COUNT PILLS
       and for the estimates "Add from Library" sheet, which reads the same
       table through CardinalLineItems.all(). ⚠ `category` must match the
       module's own CATEGORIES array EXACTLY, capitalised: a lowercase
       'roofing' renders eight zero pills over a populated-looking list, and
       looks like a load failure. `active:true` is mandatory — loadItems()
       filters .eq('active', true) and the mock compares strictly. */
    estimate_line_items: [
      { id:'l1', category:'Roofing', name:'Architectural shingles, installed',
        description:'OC Duration per square, incl. synthetic underlayment and starter.',
        default_price:385, unit:'SQ', active:true, sort_order:1 },
      { id:'l2', category:'Roofing', name:'Tear-off, one layer',
        description:'Remove and haul one layer of three-tab.',
        default_price:65, unit:'SQ', active:true, sort_order:2 },
      { id:'l3', category:'Roofing', name:'Ridge vent',
        description:'Cut in and install ridge vent with shingle-over cap.',
        default_price:12, unit:'LF', active:true, sort_order:3 },
      { id:'l4', category:'Roofing', name:'Ice and water shield, valleys',
        description:null, default_price:2.4, unit:'LF', active:true, sort_order:4 },
      { id:'l5', category:'Siding', name:'Vinyl siding, D4 double-4',
        description:'Installed over house wrap.', default_price:6.5, unit:'SQ',
        active:true, sort_order:1 },
      { id:'l6', category:'Siding', name:'Soffit and fascia wrap',
        description:null, default_price:14, unit:'LF', active:true, sort_order:2 },
      { id:'l7', category:'Windows', name:'Double-hung replacement window',
        description:'White vinyl, low-E, installed and trimmed.',
        default_price:640, unit:'EA', active:true, sort_order:1 },
      { id:'l8', category:'Windows', name:'Window wrap, aluminium',
        description:null, default_price:55, unit:'EA', active:true, sort_order:2 },
      { id:'l9', category:'Gutters', name:'6" K-style seamless gutter',
        description:'.032 aluminium, hidden hangers 24" on centre.',
        default_price:9.5, unit:'LF', active:true, sort_order:1 },
      { id:'l10', category:'Gutters', name:'Downspout, 3x4',
        description:null, default_price:11, unit:'LF', active:true, sort_order:2 },
      { id:'l11', category:'Codes', name:'Drip edge to code, all eaves and rakes',
        description:'ORC / local amendment — undersized drip edge is the common failure.',
        default_price:3.1, unit:'LF', active:true, sort_order:1 },
      { id:'l12', category:'Repair', name:'Chimney flashing, step and counter',
        description:null, default_price:850, unit:'LS', active:true, sort_order:1 },
      { id:'l13', category:'Repair', name:'Decking replacement, per sheet',
        description:null, default_price:78, unit:'EA', active:true, sort_order:2 },
      { id:'l14', category:'General', name:'Dumpster and site protection',
        description:null, default_price:475, unit:'LS', active:true, sort_order:1 }
    ],
    /* 992: ONE claim, so the seven-tab Claim Detail strip (Settle / Client /
       Job / Contract / Documents / iTel / Record) can be rendered and measured.
       Columns are loadClaims()'s own select list; loadClaim() then takes
       select('*'), so anything absent is simply undefined, never an error. */
    insurance_claims: [
      { id:'cl1', project_id:'p1', homeowner_name:'Mark Diamond',
        property_address:'7990 Germantown Pike, Dayton OH 45418',
        carrier:'State Farm', claim_number:'55-4H29-118', cause_of_loss:'Hail',
        approved_rcv:24180.44, approved_acv:18922.10, approved_depreciation:5258.34,
        deductible:1000, status:'approved', filed_at:'2026-07-06T10:00:00Z',
        created_by:'theo@cardinalrenovations.net',
        created_at:'2026-07-06T10:00:00Z', updated_at:'2026-08-14T10:00:00Z' }
    ],
    insurance_payments: [
      { id:'ip1', claim_id:'cl1', amount:18922.10, kind:'acv',
        received_at:'2026-07-22', note:'ACV cheque, endorsed by the mortgage company',
        created_by:'theo@cardinalrenovations.net', created_at:'2026-07-22T10:00:00Z' }
    ],
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

  /* ⚠ 26 Aug 2026 (build 1076) — THE MISSING-MOCK CASE WAS SILENT, and it
     cost a whole sweep. This file's banner warns loudly about loading the two
     setup files in the WRONG ORDER, and seedLanded() makes that loud. It says
     nothing about loading only ONE, which is the easier mistake to make and
     fails in the quieter direction: without e2e_mock_supa.js the app never
     signs in, TEAM stays false, openProject() bails, #acxMount renders zero
     characters, and every state walks the same signed-out screen. Twenty-five
     states, no error, a report that reads like a sweep of the app.

     Every state calls leaveLanding() first, so this is the one place that
     catches it before a single render is scored. The mock's own
     `window.__WRITES__ = []` is the marker — it is the first thing it sets. */
  var _mockOk = false;
  function requireMock() {
    if (_mockOk) return;
    /* ⚠ Deliberately NOT latched on the first CALL, only on the first PASS.
       The first version latched before throwing, so exactly ONE state of
       twenty-five reported it and the other twenty-four went on to produce a
       full, confident report of the signed-out screen. Every state must fail,
       or the one line that told the truth is lost in the noise it caused. */
    if (!window.__WRITES__ || typeof window.supabase === 'undefined') {
      throw new Error(
        'sentinel_setup_cardinal: the supabase mock did not run. --setup needs ' +
        'BOTH files, seed first: ' +
        'sentinel_setup_cardinal.js,e2e_mock_supa.js — without the mock every ' +
        'state sweeps the signed-out screen and the report means nothing.');
    }
    _mockOk = true;
  }

  function leaveLanding() {
    requireMock();
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
    /* ⚠ THIS USED TO REMOVE CLASSES, AND THAT NEVER WORKED — found 25 Aug 2026.
       The drawer module does not keep an `open` flag; sync() DERIVES it, every
       time, straight from the DOM:

           function sync(){
             var open = menu.style.display === 'block' && isDrawer();
             menu.classList.toggle('cr-drawer-open', open);
             bd.classList.toggle('on', open);
           }

       and sync() is re-run by a MutationObserver on #navMenu behind a
       requestAnimationFrame. So stripping the classes was undone on the very
       next frame, with `display` still 'block'. The classes came back, the
       backdrop came back, and closeDrawer() returned cleanly having done
       nothing that survived a frame.

       That is why gate_setupleak still found navBackdrop over five states
       AFTER the modal fix: nav (state 10) opens the drawer and nothing since
       has genuinely shut it.

       ⚠ It also means the drawer-bleed this file's own banner records as fixed
       was only HALF fixed. The banner is right that the bleed was real and
       right about what it cost; the remedy it describes could not have worked.

       The lever must match the mechanism (CLAUDE.md, hideAllViews()): this
       screen is shown by `display`, so it is closed by `display` — and by
       exactly the line the app's own backdrop-click handler uses:
           bd.addEventListener('click', function(){ menu.style.display='none'; });
       Setting display lets sync() recompute open=false and retract the
       classes and the backdrop ITSELF, which is why nothing here needs to
       touch either one. */
    var m = document.getElementById('navMenu');
    if (m) m.style.display = 'none';
    document.body.classList.remove('cr-drawer-open', 'cr-drawer-lift');
  }
  /* ⚠ 992: hideAllViews() does NOT know about these two. Both were brace-match
     checked against the shipped function and neither name occurs in it, and
     both were confirmed empirically to survive a hideAllViews() call still
     carrying their .open class. A state that opens either one and does not
     close it leaves it covering EVERY LATER STATE — the same shape as the
     drawer bug this file's banner records, where one open menu bled into three
     screens and manufactured four contrast findings.

     Both close() calls are null-safe before their view has ever been built.
     ⚠ CardinalShowcase.close() takes an argument and it is load-bearing:
     close() with no argument calls window.showHome(), so a bare close()
     NAVIGATES rather than merely dismissing. hideAllViews() already closes
     that one correctly with close(false); it is listed here only so nobody
     "completes" the list by adding a bare close() for it. */
  function closeStragglers() {
    try { if (window.CardinalLineItems  && window.CardinalLineItems.close)  window.CardinalLineItems.close();  } catch (e) {}
    try { if (window.CardinalPhotoEditor && window.CardinalPhotoEditor.close) window.CardinalPhotoEditor.close(); } catch (e) {}
    closeRestOverlays();
  }

  /* ⚠ THE SAME BUG AS THE DRAWER ABOVE, AND IT SURVIVED THE DRAWER'S FIX.
     Found 25 Aug 2026 by the design audit, measured not guessed:

       screen        ckModal projModal  white-bg elements visible
       newproject    false   TRUE                8
       checklist     TRUE    TRUE               40
       signature     TRUE    TRUE               42
       … and TRUE/TRUE for all ten states after it, to showcase (25th)

     `hideAllViews()` does not know about the nine `display:none;position:fixed`
     overlays in static markup (#projModal #ckModal #gcModal #leadModal
     #leadFormModal #apptModal #sigModal #tskModal #qiWhoModal), and neither
     did this file. So from state 13 onward EVERY screen was probed with the
     checklist modal — a white card, 40+ light-era elements — sitting over it.
     Twelve of twenty-five states were not swept at all; they were the
     checklist wearing another screen's name.

     That is almost certainly what produced the "Cardinal Truth compositing
     artifacts" in the 25 Aug sentinel run: `truth` is state 23, deep inside
     the contaminated range, and the white ground being scored was never on
     that screen.

     ── WHY THIS IS A SNAPSHOT AND NOT A LIST OF IDS ──
     A hardcoded list of nine rots silently the moment a tenth modal ships —
     the sweep keeps passing and quietly stops covering it, which is this
     project's most expensive failure shape (a check that cannot fail).
     So: before any state runs, record every position:fixed element that the
     app itself leaves display:none AT REST. Those are exactly its dismissable
     overlays, by the app's own definition. Restoring them is a revert to the
     rest state, never a new opinion about what should be hidden.

     ⚠ It must be display, not a class. CLAUDE.md: writing display:none onto a
     CLASS-shown element is permanent damage — its own open path never clears
     the inline style, so the screen is dead on the second visit. Every element
     in this snapshot was inline-display:none to begin with, so setting it back
     is the one safe lever, and it is the same one the app's own Cancel buttons
     pull (`ckModal.style.display = 'none'`). */
  var REST_HIDDEN = null;
  function snapshotRestOverlays() {
    REST_HIDDEN = [];
    var all = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.display === 'none') REST_HIDDEN.push(el);
    }
    return REST_HIDDEN.length;
  }
  function closeRestOverlays() {
    if (!REST_HIDDEN) return;
    for (var i = 0; i < REST_HIDDEN.length; i++) {
      try { if (getComputedStyle(REST_HIDDEN[i]).display !== 'none') REST_HIDDEN[i].style.display = 'none'; } catch (e) {}
    }
    closeClassShownOverlays();
  }

  /* ⚠ THE REST SNAPSHOT CANNOT SEE AN OVERLAY THAT DOES NOT EXIST YET, and the
     worst leak in the walk was exactly that one. Found 25 Aug 2026, AFTER the
     modal fix, by the gate written for the modal fix:

       #cr-est-picker — absent from the DOM at rest, built when the estimates
       Add-from-Library sheet is first opened. position:fixed, inset:0,
       z-index:9510, 390x844. Opened by the 'estlibrary' state and then ON
       SCREEN for all fifteen states after it, COVERING the centre of the
       screen on thirteen of them (elementFromPoint at the centre lands inside
       it). Measured, not inferred.

     So twelve states were being measured through the checklist modal and then
     thirteen more through the estimate library picker. Between them that is
     most of the walk.

     ⚠ IT MUST BE CLOSED BY ITS CLASS, NEVER BY display. The rule is
     `#cr-est-picker.open{display:flex}` over a base `display:none`, and
     CLAUDE.md is explicit that writing display:none onto a CLASS-shown element
     is permanent damage — its own open path only adds the class back and never
     clears an inline style, so the screen is dead on the second visit.
     `closePicker()` itself is `picker.classList.remove('open')`; this does the
     same thing, generically.

     `.open` on a position:fixed element is this app's convention for a
     class-shown overlay (cr-sf, cr-pb, cr-est-view all use it), so keying on
     the convention rather than on a list of ids means a new one is covered the
     day it ships. Removing a class is always reversible; that is why this is
     safe to apply broadly. */
  function closeClassShownOverlays() {
    var open = document.querySelectorAll('.open');
    for (var i = 0; i < open.length; i++) {
      try {
        if (getComputedStyle(open[i]).position === 'fixed') open[i].classList.remove('open');
      } catch (e) {}
    }
  }
  /* The backdrop is not display-toggled — it is opacity + pointer-events via
     .on, so it never enters the snapshot and never left with the drawer. */
  function closeBackdrop() {
    var bd = document.getElementById('navBackdrop');
    if (bd && bd.classList) bd.classList.remove('on');
  }
  function closeAll() {
    /* Taken on the FIRST closeAll — i.e. at the top of state 1 ('home'),
       where the app is provably at rest (the leak probe that found this bug
       reports ckModal false, projModal false, 0 white elements there). Any
       later snapshot would bake an already-open modal in as "hidden at rest"
       and the mechanism would silently exclude the one thing it exists for. */
    if (REST_HIDDEN === null) {
      var n = snapshotRestOverlays();
      /* ⚠ A snapshot of zero disables this silently and every later sweep
         still reports a tidy CLEAN. The app ships nine such overlays in static
         markup; a handful is the floor, and being wrong loudly is the point. */
      if (n < 5) throw new Error(
        'overlay snapshot found only ' + n + ' fixed+hidden elements (expected ~9: ' +
        'projModal, ckModal, gcModal, leadModal, leadFormModal, apptModal, sigModal, ' +
        'tskModal, qiWhoModal). Either the walk started somewhere other than rest, ' +
        'or the modal family changed shape — do not sweep until this is understood.');
    }
    closeDrawer();
    closeBackdrop();
    closeStragglers();
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
    /* 1160: the Vision hub and Why Cardinal. Added because 1159 and
       1160 both changed the LANDING and the hub, and every state above
       calls leaveLanding() first — so the sentinel had no state that
       ever swept either surface, and a green run said nothing about
       them. 'vision' forces the hub branch on this hostname (the
       ?vision=1 override) and rebuilds the landing; 'why' opens the
       screen the hub now leads to. */
    { name:'vision',    run: async function () {
        closeAll();
        var lv = document.getElementById('landingView');
        if (!lv) throw new Error('no #landingView');
        /* Drive the REAL path. isVisionHost() is a LOCAL function inside
           cr-lr-script that build() calls directly; the window.CardinalLanding
           copy is an export, so overriding it changes nothing and the hub
           silently never renders (cost a run, 30 Aug). The local one reads
           location.search, so put ?vision=1 there instead. */
        try { history.replaceState(null, '', location.pathname + '?vision=1'); } catch (e) {}
        lv.dataset.crLrBuilt = '';
        if (typeof window.showLanding === 'function') { try { window.showLanding(); } catch (e) {} }
        lv.style.display = 'block';
        await pause(700);
        if (!lv.querySelector('.cr-vh'))
          throw new Error('the Vision hub did not render — .cr-vh absent');
      } },
    { name:'why',       run: async function () {
        closeAll();
        var m = api('CardinalWhy'); if (!m) throw new Error('CardinalWhy.open missing');
        m.open(); await pause(600);
        var v = document.getElementById('cr-why');
        if (!v || getComputedStyle(v).display === 'none')
          throw new Error('#cr-why did not open');
      } },
    { name:'appt',      run: async function () {
        closeAll();
        var m = api('CardinalAppointment'); if (!m) throw new Error('CardinalAppointment.open missing');
        await m.open(); await pause(700);
        var v = document.getElementById('cr-appt');
        if (!v || getComputedStyle(v).display === 'none')
          throw new Error('#cr-appt did not open');
      } },
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
    /* 960: the Add-from-Library sheet is a real screen with its own palette and
       its own dark override, and nothing was ever sweeping it — which is how a
       price sat at 2.16:1 on it. Opening the editor alone does not open the
       sheet, so a sweep that stopped at 'estimates' reported CLEAN and meant
       nothing by it. Best-effort: if the editor or the button is not there this
       state simply contributes no renders rather than throwing (BUG_CLASSES 37
       — a control that crashes proves nothing). */
    { name:'estlibrary',  run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalEstimates');
        var p = (window.cacheProjects || [])[0];
        if (m && m.openEditor && p) { try { await m.openEditor(p); } catch (e) {} }
        await pause(600);
        var b = document.querySelector('[data-act="add-lib"]');
        if (b) { b.click(); await pause(600); } } },
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
        m.style.display = 'block'; await pause(500); } },
    /* ── 992: the hidden-scrollbar surfaces ─────────────────────────────────
       Build 984 found that `.cr-cth-tabs` had been silently clipping "Closed"
       off its right edge, and added the CLIPPED check to catch the next one.
       It could not: a reach sweep of the walk as it stood measured ONE of the
       app's eleven hidden-scrollbar scrollers. The other ten were never in the
       DOM, or were in it at 0x0 — and an unmeasured scroller reads in the
       report exactly like a clean one.

       Each state below opens one such surface. They are ordinary states and
       they sweep the whole screen, not just the strip; the strip is only why
       they were written. What they must not do is fail quietly, so every one
       asserts its own strip is ON SCREEN and throws a NAMED error otherwise —
       the sentinel reports a throwing state, and a state that opened nothing
       would otherwise hand back the previous screen dressed as a feature. */

    /* All Leads & Jobs.
       ⚠ 1085 REMOVED the two filter strips this state used to assert on, and the
       old assertion ("the Milestone strip is not on screen") went red against a
       CORRECT build. Recorded because it is the good half of BUG_CLASSES' rule:
       roughly half the reds on this project are the harness being stale, and the
       named error is what made that legible in one run instead of three.

       Assert what the screen must have NOW: rows in the list, and the funnel
       that became the only phone-side filter picker.
       ⚠ Existence, not onScreen(), for the funnel — .ljctl is display:none above
       901px, where the rail is the picker instead. Asserting it visible at every
       viewport would stage a configuration the app never has.
       ⚠ And do NOT assert #ljActive is on screen: it is deliberately hidden when
       nothing is filtered, which is the ordinary case. */
    { name:'leads',        run: async function () {
        leaveLanding(); closeAll();
        if (typeof openLeadsView !== 'function') throw new Error('openLeadsView missing');
        openLeadsView(); await pause(700);
        var list = document.getElementById('ljList');
        if (!onScreen(list) || !list.children.length)
          throw new Error('the Leads list did not render — ' +
            (list ? list.children.length + ' rows' : 'no #ljList'));
        if (!document.getElementById('ljFunnelBtn'))
          throw new Error('#ljFunnelBtn is gone — since 1085 it is the only filter ' +
            'picker on a phone, so losing it loses filtering entirely');
        await pause(150); } },

    /* .cd-crmbar — the Client Directory's fixed CRM bar.
       ⚠ It is DELIBERATELY absent above 1100px: body.cr-lnav-on .cd-crmbar
       {display:none}, because the left rail is the navigation at that width.
       Asserting it on screen at every viewport would stage a configuration the
       app never has and manufacture a finding. Assert the VIEW, then the strip
       only where the app actually draws it. */
    { name:'clientdir',    run: async function () {
        leaveLanding(); closeAll();
        if (typeof openClientsDirectory !== 'function') throw new Error('openClientsDirectory missing');
        openClientsDirectory(); await pause(700);
        var v = document.getElementById('clientsView');
        if (!onScreen(v)) throw new Error('clientsView did not open — display is ' +
          (v ? getComputedStyle(v).display : 'no element'));
        var rail = document.body.classList.contains('cr-lnav-on');
        if (!rail && !onScreen(document.getElementById('cdCrmBar')))
          throw new Error('.cd-crmbar is missing at a width with no left rail'); } },

    /* the THIRD .ljchips — Photo Activity's CRM strip, a different screen. */
    { name:'photoactivity', run: async function () {
        leaveLanding(); closeAll();
        if (typeof window.openPhotosView !== 'function') throw new Error('openPhotosView missing');
        window.openPhotosView(); await pause(800);
        var v = document.getElementById('photosView');
        if (!onScreen(v)) throw new Error('photosView did not open'); } },

    /* #cr-pae-tabs — the Photo Album's section chips.
       ⚠ TWO prerequisites, and the second is easy to miss: a current project,
       AND galMode === 'all'. The cr-pae renderGallery wrapper returns to the
       ORIGINAL renderer for any other mode, so openGalleryMode('insp') builds
       no strip at all. The strip is also created lazily by ensureTabs(), which
       needs #galGrid to already exist. */
    { name:'album',        run: async function () {
        leaveLanding(); closeAll();
        if (typeof openProject !== 'function') throw new Error('openProject missing');
        openProject('p1'); await pause(800);
        if (typeof window.openGalleryMode !== 'function') throw new Error('openGalleryMode missing');
        window.openGalleryMode('all'); await pause(900);
        var t = document.getElementById('cr-pae-tabs');
        if (!onScreen(t)) throw new Error(
          'the album section strip is not on screen — galMode is ' +
          (window.galMode || 'all') + ' and #galGrid is ' +
          (document.getElementById('galGrid') ? 'present' : 'MISSING')); } },

    /* .cr-ped-row x2 — the photo editor's tool row and colour row.
       ⚠ #cr-ped is shown by a CLASS and is NOT registered in hideAllViews(),
       so closeAll() cannot dismiss it. closeStragglers() above is what does;
       do not "simplify" that away or this editor covers every later state. */
    { name:'photoeditor',  run: async function () {
        leaveLanding(); closeAll();
        var m = window.CardinalPhotoEditor;
        if (!m || !m.open) throw new Error('CardinalPhotoEditor.open missing');
        m.open({ section:'Post-Inspection',
                 _src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' });
        await pause(700);
        var el = document.getElementById('cr-ped');
        if (!el || !el.classList.contains('open'))
          throw new Error('#cr-ped did not open — it is shown by .open, never by display');
        var rows = el.querySelectorAll('.cr-ped-row');
        if (rows.length !== 2) throw new Error('.cr-ped-row count is ' + rows.length + ', expected 2'); } },

    /* .cr-lil-tabs — the Line Item Library's category strip.
       ⚠ Admin-gated on the module's OWN hardcoded list, not is_cardinal_admin().
       Under SENTINEL_AS=scottie / =nick, open() alerts and builds nothing —
       and that is CORRECT behaviour, so this state contributes no renders
       rather than throwing. A correct refusal must never report as a break.
       ⚠ Shown by a CLASS; not in hideAllViews(); see closeStragglers(). */
    { name:'lineitems',    run: async function () {
        leaveLanding(); closeAll();
        var m = window.CardinalLineItems;
        if (!m || !m.open) throw new Error('CardinalLineItems.open missing');
        var admin = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net']
          .indexOf(((window.currentUser && window.currentUser.email) || '').toLowerCase()) !== -1;
        if (!admin) { await pause(120); return; }
        m.open(); await pause(800);
        var v = document.getElementById('cr-lil-view');
        if (!v || !v.classList.contains('open'))
          throw new Error('#cr-lil-view did not open as an admin — it is shown by .open');
        var tabs = v.querySelectorAll('.cr-lil-tabs button');
        if (tabs.length !== 8)
          throw new Error('.cr-lil-tabs has ' + tabs.length + ' buttons, expected All + 7 categories'); } },

    /* .cr-ic-chips — Insurance Clients' stage filter.
       ⚠ Rendering is one animation frame late, behind a MutationObserver on
       #insClientsView[style] that defers through requestAnimationFrame. Measure
       too early and the strip is not there yet. */
    { name:'insclients',   run: async function () {
        leaveLanding(); closeAll();
        if (typeof window.showInsuranceClients !== 'function')
          throw new Error('showInsuranceClients missing');
        window.icStageFilter = '';
        window.showInsuranceClients(); await pause(900);
        var strip = document.querySelector('#insClientsView .cr-ic-chips');
        if (!onScreen(strip)) throw new Error(
          'the insurance stage strip is not on screen — its render defers through ' +
          'requestAnimationFrame behind a style MutationObserver'); } },

    /* .cr-cth-tabs — Cardinal Truth's own tab strip. This is the strip build
       984 fixed, and NOTHING has been measuring it since: the walk never
       opened this screen, so the fix has stood unguarded. */
    { name:'truth',        run: async function () {
        leaveLanding(); closeAll();
        if (typeof showCardinalTruth !== 'function') throw new Error('showCardinalTruth missing');
        showCardinalTruth(); await pause(800);
        var strip = document.querySelector('#cardinalTruthView .cr-cth-tabs');
        if (!onScreen(strip)) throw new Error('the Cardinal Truth tab strip is not on screen'); } },

    /* .cr-c-tabs.detail — the seven-tab Claim Detail strip. Needs a claim row;
       the seed carries exactly one (cl1) for this. */
    { name:'claimdetail',  run: async function () {
        leaveLanding(); closeAll();
        var m = window.CardinalClaims;
        if (!m || !m.openOne) throw new Error('CardinalClaims.openOne missing');
        await m.openOne('cl1'); await pause(900);
        var strip = document.querySelector('#cr-claims-mount .cr-c-tabs.detail');
        if (!onScreen(strip)) throw new Error(
          'the claim detail tab strip is not on screen — showDetail() falls back ' +
          'to the list when loadClaim() finds nothing, so __SEED__.insurance_claims ' +
          'has stopped carrying cl1'); } },

    /* .cr-sh-tabs — the Showcase's pill tabs.
       ⚠ open() takes NO argument here. open({showroom:true}) is the Vision hub's
       call and it REMOVES the fourth button, so copying that line measures a
       different strip. And close() with no argument navigates home; hideAllViews()
       already closes this one correctly with close(false). */
    /* 1158: Invoices & AR — the standing gate was BLIND to this screen while it
       grew across four builds (1107 dashboard, 1108 job card, 1156 reminder
       rows, 1157 the master switch). Admin-only, so it copies `lineitems`'
       shape: a non-admin refusal is CORRECT and contributes no renders rather
       than throwing. The seed carries no invoices on purpose, so this sweeps
       the chrome, the KPI tray, the empty state and the whole 1157 master row;
       the per-row reminder line (.crar-rem) needs a seeded invoice with a
       balance and is NOT covered yet — stated so nobody reads a green run as
       covering it. Shown by DISPLAY and registered in hideAllViews(). */
    { name:'ar',           run: async function () {
        leaveLanding(); closeAll();
        var admin = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net']
          .indexOf(((window.currentUser && window.currentUser.email) || '').toLowerCase()) !== -1;
        if (!admin) { await pause(120); return; }
        var m = window.CardinalAR;
        if (!m || !m.open) throw new Error('CardinalAR.open missing');
        m.open(); await pause(900);
        var v = document.getElementById('cr-ar-view');
        if (!v || v.style.display === 'none')
          throw new Error('#cr-ar-view did not open as an admin');
        var master = v.querySelector('.crar-master');
        if (!onScreen(master))
          throw new Error('the reminders master row is not on screen — 1157 put it above the KPI tray');
        /* remWire() paints this asynchronously off two reads; without it the
           row still says "Checking…" and the state/ink under test never renders. */
        var st = document.getElementById('crarMasterState');
        for (var i = 0; i < 12 && st && /Checking/.test(st.textContent); i++) await pause(150);
        if (st && /Checking/.test(st.textContent))
          throw new Error('the master switch never resolved past "Checking…" — remWire did not settle'); } },
    { name:'showcase',     run: async function () {
        leaveLanding(); closeAll();
        var m = api('CardinalShowcase'); if (!m) throw new Error('CardinalShowcase.open missing');
        m.open(); await pause(900);
        var el = document.getElementById('cr-show');
        if (!el || !el.classList.contains('open'))
          throw new Error('#cr-show did not open — it is shown by .open, never by display');
        var strip = el.querySelector('.cr-sh-tabs');
        if (!onScreen(strip)) throw new Error('the Showcase tab strip is not on screen'); } }
  ];
})();
