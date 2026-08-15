/* sentinel setup — the Exterior Visualizer, signed in with real-shaped data.
 *
 *   node sentinel.js visualizer/index.html --setup .../sentinel_setup_visualizer.js
 *
 * WITHOUT THIS THE SENTINEL ONLY EVER SEES THE LOGIN SCREEN. Every defect it
 * exists to catch — the collapsed tile, the ink on the dark ground, the rule
 * that never wins — lives behind the sign-in. A checker pointed at a login
 * form reports CLEAN and means nothing by it.
 *
 * The fixtures are shaped from the real tables, not invented (BUG_CLASSES 45:
 * a fixture invented rather than observed makes the stub agree with the code,
 * so both are wrong together). Columns and value shapes match what
 * design_jobs, oc_colors, materials and project_photos actually hold.
 *
 * One job deliberately has NO photographs on it — that is the empty state
 * Theo was looking at when he reported build 818, and an empty state that no
 * instrument ever renders is an empty state nobody has checked.
 */
window.supabase = {
  createClient: function () {
    var OC = [
      { id:'oc1', name:'Onyx Black',    hex:'#232427', hex_verified:true,  swatch_path:null,
        family:'black', product_line:'Duration', status:'current', sort_order:1, hidden:false,
        description:'Deep consistent black with dimensional variation.' },
      { id:'oc2', name:'Black Sable',   hex:'#26282B', hex_verified:false, swatch_path:null,
        family:'black', product_line:'Designer', status:'current', sort_order:2, hidden:false,
        description:'Near-black with charcoal depth.' },
      { id:'oc3', name:'Evergreen Mist',hex:'#4A5B4F', hex_verified:false, swatch_path:null,
        family:'green', product_line:'Duration', status:'discontinued', sort_order:9, hidden:false,
        description:'Muted green with grey undertone.' }
    ];
    var MAT = [
      { id:'m1', category:'siding',  manufacturer:'Mastic',      product_line:'Quest',
        color_name:'Harbor Blue',   hex:'#5C7186', hex_verified:false, swatch_path:null,
        finish:'low gloss', prompt:'p', negative:'', status:'current', sort_order:13 },
      { id:'m2', category:'siding',  manufacturer:'CertainTeed', product_line:'Cedar Impressions',
        color_name:'Colonial White',hex:'#E8E4DA', hex_verified:false, swatch_path:null,
        finish:'matte',     prompt:'p', negative:'', status:'current', sort_order:26 },
      { id:'m3', category:'windows', manufacturer:'Andersen',    product_line:'100 Series',
        color_name:'Black',         hex:'#1B1B1B', hex_verified:false, swatch_path:null,
        finish:'painted',   prompt:'p', negative:'', status:'current', sort_order:54 }
    ];
    var JOBS = [
      { id:'j1', project_id:'p1', status:'done', source_path:'projects/p1/front.jpg',
        selections:{ roof:{ id:'oc1', name:'Onyx Black', sub:'OC Duration', hex:'#232427', prompt:'p', negative:'' } },
        render_path:'visualizer/j1/render.jpg', preview_path:'visualizer/j1/preview.jpg',
        masks:{ roof:'visualizer/j1/mask_roof.png' }, error:null,
        created_at:'2026-08-14T22:07:00Z', duration_ms:38341, claimed_at:'2026-08-14T22:07:00Z' },
      { id:'j2', project_id:'p1', status:'queued', source_path:'projects/p1/front.jpg',
        selections:{ roof:{ id:'oc2', name:'Black Sable', sub:'OC Designer', hex:'#26282B', prompt:'p', negative:'' } },
        render_path:null, preview_path:null, masks:null, error:null,
        created_at:'2026-08-14T22:20:00Z', duration_ms:null, claimed_at:null }
    ];
    var RENDERS = [
      { id:'r1', job_id:'j1', project_id:'p1', title:'Onyx Black',
        source_path:'projects/p1/front.jpg', render_path:'visualizer/j1/render.jpg',
        preview_path:'visualizer/j1/preview.jpg', selections:JOBS[0].selections,
        approved:true, created_at:'2026-08-14T22:07:40Z' }
    ];
    var TABLES = {
      oc_colors: OC, materials: MAT, design_jobs: JOBS, design_renders: RENDERS,
      projects: [{ id:'p1', name:'James Tiege',  stage:'Prospect' },
                 { id:'p2', name:'Carl Bolivar', stage:'Closed' }],
      /* p2 has none — the empty strip is a real screen and wants checking */
      project_photos: [{ id:'ph1', project_id:'p1', storage_path:'projects/p1/front.jpg',
                         caption:'Front elevation', section:'roof', created_at:'2026-08-02' }]
    };
    return {
      auth: {
        getSession: function () {
          return Promise.resolve({ data: { session: { access_token:'sentinel',
            user: { email:'theo@cardinalrenovations.net' } } } });
        },
        signInWithPassword: function () { return Promise.resolve({ data:{}, error:null }); },
        signOut: function () { return Promise.resolve({}); }
      },
      from: function (t) {
        var rows = (TABLES[t] || []).slice();
        var b = {};
        ['select','order','limit','not','is'].forEach(function (m) { b[m] = function () { return b; }; });
        b.eq = function (col, val) {
          if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], col))
            rows = rows.filter(function (r) { return r[col] === val; });
          return b;
        };
        b.then = function (ok) { return Promise.resolve({ data: rows, error: null }).then(ok); };
        b.maybeSingle = function () { return Promise.resolve({ data: rows[0] || null, error: null }); };
        b.single = b.maybeSingle;
        return {
          select: function () { return b; },
          insert: function () { return { select: function () { return b; }, then: b.then }; },
          update: function () { return b; },
          delete: function () { var d = { then: b.then }; d.eq = function () { return d; }; return d; }
        };
      },
      storage: {
        from: function () {
          return {
            createSignedUrl: function (p) { return Promise.resolve({ data:{ signedUrl:'/img/' + p }, error:null }); },
            createSignedUrls: function (ps) {
              return Promise.resolve({ data: ps.map(function (p) {
                return { path:p, signedUrl:'/img/' + p }; }), error:null });
            },
            upload: function (p) { return Promise.resolve({ data:{ path:p }, error:null }); },
            remove: function (f) { return Promise.resolve({ data:f, error:null }); }
          };
        }
      }
    };
  }
};

/* The CompanyCam tab unhides only when /api/companycam answers, so without
   this the sentinel never renders the picker at all — and the picker is where
   two of tonight's three defects lived. */
(function () {
  var real = window.fetch;
  window.fetch = function (url, init) {
    if (String(url).indexOf('/api/companycam') !== -1) {
      var body = {};
      try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
      var photos = [];
      for (var i = 0; i < 12; i++) photos.push({
        id: 'cc' + i, description: 'Front elevation', project_address: '843 Farnam Dr',
        project_name: 'Monica', captured_at: '2026-07-02',
        uris: [{ type:'thumbnail', url:'/img/cc' + i + '-t.jpg' },
               { type:'web',       url:'/img/cc' + i + '-w.jpg' },
               { type:'original',  url:'/img/cc' + i + '.jpg' }]
      });
      return Promise.resolve(new Response(JSON.stringify({ tags: [], photos: photos }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return real.apply(this, arguments);
  };
})();

/* ── states ────────────────────────────────────────────────────────────────
   The screens worth checking, in the order a rep reaches them. Both of the
   layout defects of 14-15 Aug lived inside the CompanyCam picker, which does
   not exist in the DOM until it is opened — a sweep of the landing page would
   have reported CLEAN straight through both of them.

   Each state LEAVES THE PAGE WHERE THE NEXT ONE EXPECTS IT. They run in
   order against one page, so a state that opens something must close it. */
window.__sentinelStates = [
  { name: 'prep', run: async () => {
      var s = document.getElementById('vzProject');
      if (s) { s.value = 'p1'; s.dispatchEvent(new Event('change')); }
      await new Promise(r => setTimeout(r, 500));
      var shot = document.querySelector('#vzShots .shot');
      if (shot) shot.click();
      await new Promise(r => setTimeout(r, 250));
      var row = document.querySelector('#vzList .crow[data-id]');
      if (row) row.click();
      await new Promise(r => setTimeout(r, 250));
    } },

  { name: 'emptyjob', run: async () => {
      /* A job with no photographs — the screen behind build 818. An empty
         state nothing ever renders is an empty state nobody has checked. */
      var s = document.getElementById('vzProject');
      if (s) { s.value = 'p2'; s.dispatchEvent(new Event('change')); }
      await new Promise(r => setTimeout(r, 500));
    } },

  { name: 'picker', run: async () => {
      var b = document.getElementById('vzSrcCC');
      if (b) b.click();
      await new Promise(r => setTimeout(r, 400));
      var f = document.getElementById('vzCCForm');
      if (f) f.dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(r => setTimeout(r, 700));
    } },

  { name: 'renders', run: async () => {
      var x = document.getElementById('vzCCX');
      if (x) x.click();
      await new Promise(r => setTimeout(r, 250));
      var s = document.getElementById('vzProject');
      if (s) { s.value = 'p1'; s.dispatchEvent(new Event('change')); }
      await new Promise(r => setTimeout(r, 600));
    } }
];
