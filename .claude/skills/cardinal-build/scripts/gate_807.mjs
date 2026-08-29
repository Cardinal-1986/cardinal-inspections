/* gate_807 — the Exterior Visualizer, driven for real in Chromium.

   Chromium rather than jsdom because three of the claims are things jsdom
   cannot judge: that the sign-in card actually covers the app, that Present
   renders no queue control, and that the compare wipe moves.

   It stubs supabase-js at window level BEFORE the page's script runs, so what
   gets exercised is the shipped file, not a re-implementation. The mock
   records the createClient options and every write, because the two things
   most worth proving are invisible on screen:

     - the row queued is exactly the row spark/visualizer_worker.py reads
     - no coordinate travels with it (the CONTRACTOR_VISION_SUITE fence)

   Usage:
     node gate_807.mjs                    # the shipped file -> GREEN
     node gate_807.mjs <mutant path>      # negative control -> must go RED

   Its control is a MUTANT, not a previous build — this file has no previous
   build. build_mutant.sh-style edits are applied by the caller; see the
   commands in the build log entry for 807.                                  */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 120000);

const TARGET = process.argv[2] || '/home/user/cardinal-inspections/visualizer/index.html';
const APP    = readFileSync(TARGET, 'utf8');
const CRM    = readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');

const checks = [];
const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });

/* Real shapes, taken from production: oc_colors owns roofing and carries no
   prompt column; materials carries prompt/negative and its CHECK constraint
   excludes roofing. A fixture that gave oc_colors a prompt would have hidden
   the fact that the page has to compose one. */
const SEED = {
  oc_colors: [
    { id:'oc1', name:'Brownwood', hex:'#5A4634', family:'Brown', product_line:'Duration',
      status:'current', description:'warm brown blend', sort_order:10, hidden:false },
    { id:'oc2', name:'Shasta White', hex:'#E8E6DF', family:'White', product_line:'Duration',
      status:'current', description:null, sort_order:20, hidden:true },
    { id:'oc3', name:'Sedona Canyon', hex:'#8A5230', family:'Red', product_line:'Duration',
      status:'discontinued', description:null, sort_order:30, hidden:false },
  ],
  materials: [
    { id:'m1', category:'siding', manufacturer:'James Hardie', product_line:'HardiePlank',
      color_name:'Arctic White', hex:'#F2F2EE', finish:'Select Cedarmill',
      prompt:'fiber cement lap siding in Arctic White', negative:'vinyl, warped',
      status:'current', sort_order:10 },
    { id:'m2', category:'trim', manufacturer:'James Hardie', product_line:'HardieTrim',
      color_name:'Iron Gray', hex:'#4A4E54', finish:'Smooth',
      prompt:'fiber cement trim in Iron Gray', negative:'', status:'current', sort_order:10 },
    { id:'m3', category:'gutters', manufacturer:'Cardinal', product_line:'Seamless K-style',
      color_name:'Musket Brown', hex:'#4B3A2C', finish:null,
      prompt:'seamless aluminium K-style gutters in Musket Brown', negative:'',
      status:'current', sort_order:10 },
    { id:'m4', category:'windows', manufacturer:'ProVia', product_line:'Endure',
      color_name:'Bronze', hex:'#5B4632', finish:null,
      prompt:'vinyl windows with Bronze exterior', negative:'', status:'current', sort_order:10 },
  ],
  projects: [{ id:'p1', name:'Meeds wood', stage:'Approved', created_at:'2026-08-01' }],
  project_photos: [
    { id:'ph1', storage_path:'projects/p1/front.jpg', caption:'Front elevation',
      section:'exterior', created_at:'2026-08-02' },
  ],
  design_jobs: [],
  design_renders: [
    { id:'r1', job_id:'j1', title:'Brownwood · Arctic White',
      source_path:'projects/p1/front.jpg', render_path:'visualizer/j1/render.jpg',
      preview_path:'visualizer/j1/preview.jpg', approved:true,
      selections:{ roof:{ id:'oc1', name:'Brownwood', sub:'Owens Corning Duration' },
                   siding:{ id:'m1', name:'Arctic White', sub:'James Hardie HardiePlank' } },
      created_at:'2026-08-03' },
    { id:'r2', job_id:'j2', title:'Sedona Canyon', source_path:'projects/p1/front.jpg',
      render_path:'visualizer/j2/render.jpg', preview_path:'visualizer/j2/preview.jpg',
      approved:false, selections:{ roof:{ id:'oc3', name:'Sedona Canyon' } },
      created_at:'2026-08-04' },
  ],
};

const MOCK = `
window.__seen = { opts:null, inserts:[], updates:[] };
(function(){
  var DB = ${JSON.stringify(SEED)};
  function res(data){ return { data: data, error: null }; }
  function builder(table, mode, payload){
    var rows = (DB[table] || []).slice();
    var b = {};
    ['select','order','limit','eq','not','in','filter','is'].forEach(function(m){
      b[m] = function(){ return b; };
    });
    b.maybeSingle = function(){ return Promise.resolve(res(payload || rows[0] || null)); };
    b.single = b.maybeSingle;
    b.then = function(ok, no){ return Promise.resolve(res(rows)).then(ok, no); };
    if (mode === 'insert') {
      window.__seen.inserts.push({ table: table, row: payload });
      b.then = function(ok, no){ return Promise.resolve(res(payload)).then(ok, no); };
    }
    if (mode === 'update') {
      window.__seen.updates.push({ table: table, row: payload });
      b.then = function(ok, no){ return Promise.resolve(res(payload)).then(ok, no); };
    }
    return b;
  }
  window.supabase = {
    createClient: function(url, key, opts){
      window.__seen.opts = opts || null;
      return {
        auth: {
          getSession: function(){
            return Promise.resolve({ data: { session: window.__SESSION__ || null } });
          },
          signInWithPassword: function(c){
            if (String(c.password) !== 'right') return Promise.resolve({ error: { message: 'Invalid login credentials' } });
            return Promise.resolve({ data: { user: { email: c.email } }, error: null });
          },
          signOut: function(){ return Promise.resolve({}); },
        },
        from: function(t){
          return {
            select: function(){ return builder(t, 'select'); },
            insert: function(p){ return builder(t, 'insert', p); },
            update: function(p){ return builder(t, 'update', p); },
          };
        },
        storage: { from: function(){ return { createSignedUrl: function(p){
          return Promise.resolve({ data: { signedUrl: 'https://stub.invalid/' + p + '?sig=1' } });
        } }; } },
      };
    }
  };
})();`;

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function open(session) {
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://viz.test/'))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
    if (u.includes('supabase-js'))            // the real CDN never loads; the stub stands in
      return r.fulfill({ status:200, contentType:'application/javascript', body:'' });
    if (u.startsWith('https://stub.invalid/')) return r.fulfill({ status:200, body:'' });
    return r.abort();
  });
  if (session) await page.addInitScript(`window.__SESSION__ = ${JSON.stringify(session)};`);
  await page.addInitScript(MOCK);
  await page.goto('https://viz.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const vis = 'el => { if(!el) return false; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width>0 && r.height>0 && c.display!=="none" && c.visibility!=="hidden"; }';

// ── 1. signed out: the app must not be behind the card ─────────────────────
{
  const { ctx, page } = await open(null);
  const o = await page.evaluate(`(()=>{ const vis = ${vis};
    return { card: vis(document.getElementById('vzSignin')),
             app:  vis(document.getElementById('vzApp')),
             key:  (window.__seen.opts||{}).auth ? window.__seen.opts.auth.storageKey : null,
             persist: (window.__seen.opts||{}).auth ? window.__seen.opts.auth.persistSession : null };
  })()`);
  chk('signed out: the sign-in card is shown', o.card === true);
  chk('signed out: the app is NOT rendered behind it', o.app === false, 'app visible=' + o.app);
  chk('its own auth storage key, so three apps on one origin cannot fight',
      o.key === 'cr-viz-auth', o.key);
  chk('the session is persisted — this is the Studio complaint', o.persist === true, o.persist);
  await ctx.close();
}

// ── 2. a stored session must not ask again ─────────────────────────────────
{
  const { ctx, page } = await open({ user:{ email:'theo@cardinalrenovations.net' } });
  const o = await page.evaluate(`(()=>{ const vis = ${vis};
    const txt = document.body.innerText || '';
    /* 809-826 rebuilt the PREP picker: surfaces are picked one at a time on
       the #vzRail buttons and the options render as .crow rows in #vzList
       (the spec book), with a No-change row (empty data-id) always on top and
       brands as .lhead group headers. Drive the rail to census every surface;
       the OLD probe read .opt[data-surface], which no longer exists. */
    const surf = {};
    document.querySelectorAll('#vzRail button').forEach(rb => {
      rb.click();                       /* drawList() is synchronous */
      const rows = Array.from(document.querySelectorAll('#vzList .crow'));
      surf[(rb.title || '').toLowerCase()] = {
        total: rows.length,
        real:  rows.filter(r => r.dataset.id).length,
        ids:   rows.map(r => r.dataset.id).filter(Boolean),
        heads: Array.from(document.querySelectorAll('#vzList .lhead'))
                 .map(h => (h.textContent || '').trim()),
        disc:  !!document.querySelector('#vzList .crow[data-id="oc3"] .badge.disc'),
      };
    });
    const rb0 = document.querySelector('#vzRail button'); if (rb0) rb0.click();
    return { card: vis(document.getElementById('vzSignin')),
             app:  vis(document.getElementById('vzApp')),
             surf,
             comboA: window.CardinalVisualizer.comboKey('p.jpg',{roof:{id:'a'},siding:{id:'b'}}),
             comboB: window.CardinalVisualizer.comboKey('p.jpg',{siding:{id:'b'},roof:{id:'a'}}),
             roofPrompt: window.CardinalVisualizer.roofPrompt({name:'Brownwood',product_line:'Duration',description:'warm brown blend'}) };
  })()`);
  chk('a stored session goes straight in — no second sign-in', o.card === false && o.app === true,
      'card=' + o.card + ' app=' + o.app);
  /* +1 per surface for the "No change" row (empty data-id). */
  const R = (o.surf || {}).roof || {};
  chk('roof options come from oc_colors (Shasta White is hidden, so 2 + No change)',
      R.total === 3 && R.real === 2, JSON.stringify(R));
  chk('a hidden colour is not offered', Array.isArray(R.ids) && !R.ids.includes('oc2'),
      'oc2 present=' + (Array.isArray(R.ids) && R.ids.includes('oc2')));
  chk('a discontinued colour keeps a badged spot', R.disc === true, 'oc3 badge=' + R.disc);
  /* brands render as the .lhead group headers since the spec-book rework */
  chk('every roof option is Owens Corning — materials never supplies a shingle',
      Array.isArray(R.heads) && R.heads.length > 0 &&
      R.heads.every(s => /Owens Corning/.test(s)), JSON.stringify(R.heads));
  chk('siding/trim/windows/gutters come from materials',
      ['siding','trim','windows','gutters'].every(k =>
        o.surf[k] && o.surf[k].real === 1 && o.surf[k].total === 2),
      JSON.stringify(o.surf));
  chk('comboKey is order-independent', o.comboA === o.comboB, o.comboA + ' vs ' + o.comboB);
  chk('the roof prompt is composed from the colour, since oc_colors has none',
      /Owens Corning Duration in Brownwood/.test(o.roofPrompt) &&
      /warm brown blend/.test(o.roofPrompt), o.roofPrompt);
  await ctx.close();
}

// ── 3. queueing writes exactly the row the worker reads ────────────────────
{
  const { ctx, page } = await open({ user:{ email:'theo@cardinalrenovations.net' } });
  const o = await page.evaluate(`(async ()=>{
    document.querySelector('#vzProject').value = 'p1';
    document.querySelector('#vzProject').dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,400));
    const shot = document.querySelector('#vzShots .shot');
    const before = document.getElementById('vzQueue').disabled;
    if (shot) shot.click();
    /* the 809-826 picker: roof list is up by default; siding sits behind
       its rail button. */
    const roof = document.querySelector('#vzList .crow[data-id="oc1"]');
    if (roof) roof.click();
    const mid = document.getElementById('vzQueue').disabled;
    const sidRail = Array.from(document.querySelectorAll('#vzRail button'))
                      .find(b => b.title === 'Siding');
    if (sidRail) sidRail.click();
    const sid = document.querySelector('#vzList .crow[data-id="m1"]');
    if (sid) sid.click();
    document.getElementById('vzQueue').click();
    await new Promise(r=>setTimeout(r,400));
    return { shotFound: !!shot, before, mid,
             inserts: window.__seen.inserts,
             summary: document.getElementById('vzSum').textContent };
  })()`);
  chk('the photo strip rendered a job photograph', o.shotFound === true);
  chk('Queue is refused before anything is chosen', o.before === true);
  chk('Queue opens once a photo and a material are chosen', o.mid === false);

  const ins = (o.inserts || []).filter(i => i.table === 'design_jobs')[0];
  chk('queueing inserted one design_jobs row', !!ins, JSON.stringify(o.inserts));
  const row = (ins && ins.row) || {};
  chk('the job carries the storage path the worker downloads',
      row.source_path === 'projects/p1/front.jpg', row.source_path);
  chk('created_by is the signed-in user — RLS refuses the insert otherwise',
      row.created_by === 'theo@cardinalrenovations.net', row.created_by);
  chk('selections are keyed by surface, with the prompt AND negative frozen in',
      row.selections && row.selections.roof && row.selections.siding &&
      typeof row.selections.roof.prompt === 'string' && row.selections.roof.prompt.length > 20 &&
      typeof row.selections.roof.negative === 'string' && row.selections.roof.negative.length > 5,
      JSON.stringify(row.selections && row.selections.roof));
  /* The fence, asserted at the third of three sites — schema, worker, and here.
     ⚠ The first version wrote /\\b…\\b/ in a plain regex LITERAL, where \\b is an
     escaped backslash and not a word boundary. It could never match anything
     and passed on every input. Hence the self-test on the line below: an
     assertion guarding a privacy fence has to be shown to fail. */
  const GEO = /\b(lat|lon|lng|latitude|longitude|gps|coord)\b/;
  const flat = JSON.stringify(row).toLowerCase();
  chk('the coordinate test is not vacuous — it catches a planted lat',
      GEO.test(JSON.stringify({ lat: 39.75, lon: -84.19 }).toLowerCase()));
  chk('NO coordinate travels with a job (the GPS/EXIF fence)',
      !GEO.test(flat), flat.slice(0, 160));
  /* 822 added `engine` (spark | gemini, CHECK-constrained) to the row. */
  chk('the job names only fields the worker reads — nothing spread in',
      JSON.stringify(Object.keys(row).sort()) ===
      JSON.stringify(['created_by','engine','project_id','selections','source_path']) &&
      (row.engine === 'spark' || row.engine === 'gemini'),
      JSON.stringify(Object.keys(row).sort()) + ' engine=' + row.engine);
  await ctx.close();
}

// ── 4. Present is pre-rendered and approved-only ───────────────────────────
{
  const { ctx, page } = await open({ user:{ email:'theo@cardinalrenovations.net' } });
  const o = await page.evaluate(`(async ()=>{ const vis = ${vis};
    document.querySelector('#vzProject').value = 'p1';
    document.querySelector('#vzProject').dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,400));
    document.getElementById('tabPresent').click();
    await new Promise(r=>setTimeout(r,400));
    const txt = document.getElementById('vzPresent').innerText || '';
    const tiles = document.querySelectorAll('#vzGal .tile').length;
    document.querySelector('#vzGal .tile') && document.querySelector('#vzGal .tile').click();
    await new Promise(r=>setTimeout(r,300));
    const boxOpen = vis(document.getElementById('vzBox'));
    const sl = document.getElementById('vzSlide');
    sl.value = 20; sl.dispatchEvent(new Event('input'));
    const w20 = document.getElementById('vzAfter').style.width;
    sl.value = 80; sl.dispatchEvent(new Event('input'));
    const w80 = document.getElementById('vzAfter').style.width;
    return { tiles, boxOpen, w20, w80,
             approvedShown: txt.includes('Brownwood'),
             unapprovedShown: txt.includes('Sedona Canyon'),
             queueBar: vis(document.getElementById('vzBar')),
             beforeSrc: document.getElementById('vzBefore').src,
             afterSrc: document.getElementById('vzAfterImg').src };
  })()`);
  chk('Present shows the approved render', o.approvedShown === true);
  chk('Present HIDES the unapproved one — a person approves before a customer sees it',
      o.unapprovedShown === false);
  chk('exactly the approved renders are tiled', o.tiles === 1, o.tiles);
  chk('there is NO queue control in front of a homeowner', o.queueBar === false);
  chk('tapping a tile opens the compare box', o.boxOpen === true);
  chk('the wipe actually moves', o.w20 === '20%' && o.w80 === '80%', o.w20 + ' / ' + o.w80);
  chk('before is the original photograph, after is the render — not the same image',
      /front\.jpg/.test(o.beforeSrc) && /render\.jpg/.test(o.afterSrc) &&
      o.beforeSrc !== o.afterSrc, o.beforeSrc + ' | ' + o.afterSrc);
  await ctx.close();
}

// ── 5. separation: the claim that made this a separate file ────────────────
const CRM_MARKERS = ['Cardinal Pipeline','Accounts Receivable','Punch & Repairs',
                     'Schedule Board','Sales Floor','Import from AccuLynx','crmNow'];
const found = CRM_MARKERS.filter(m => APP.includes(m));
chk('ZERO CRM surfaces exist in this file at all', found.length === 0, JSON.stringify(found));
/* The control for that assertion: the same test on index.html must FAIL, or it
   is not discriminating anything. */
chk('…and that test can fail — index.html trips every one of those markers',
    CRM_MARKERS.filter(m => CRM.includes(m)).length >= 5,
    CRM_MARKERS.filter(m => CRM.includes(m)).length + '/' + CRM_MARKERS.length);
chk('no service key, no secret, in a file served to a tablet',
    !/service_role|SERVICE_KEY|sk-|GEMINI_API_KEY|ANTHROPIC_API_KEY/.test(APP));
chk('renders never touch the job file — project_photos is only ever READ',
    !/from\('project_photos'\)[\s\S]{0,200}(insert|update|delete)/.test(APP));

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
