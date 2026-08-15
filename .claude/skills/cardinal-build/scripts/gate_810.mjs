/* gate_810 — the spec-book shell, delete, and render-again.

   810 replaced the Visualizer's stacked Prep page with a four-column shell:
   surface rail, searchable catalog with sticky brand headers, the photograph,
   and a render rail whose cards carry their own menu.

   What this gate is really guarding, in order of how much it would cost:

     1. DELETE ORDER. design_renders.job_id is ON DELETE SET NULL. Delete the
        job first and the render row is ORPHANED, not removed — it disappears
        from the rail and keeps sitting in the gallery. The render row must go
        first. Asserted against the actual call sequence, not the source text.

     2. THE DUPLICATE BLOCK IS GONE for a finished render. Theo hit this the
        moment the seed fix landed: "cant do another black sable". A done or
        failed job must be re-renderable; a queued one must still be refused,
        because THAT one really is waste.

     3. RENDER AGAIN INSERTS. A menu item that renders and does nothing is
        BUG_CLASSES 16 — the Studio Archive button was dead from 614 to 632.

     4. Search and profile chips actually narrow the list, "No change" survives
        every filter, and a swatch photograph beats the procedural texture.

   Negative control:  node gate_810.mjs <the 809 file from main>  ->  must go RED.

   Usage:
     node gate_810.mjs                 # the shipped file -> GREEN
     node gate_810.mjs <path>          # control                                  */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 120000);

const TARGET = process.argv[2] || '/home/user/cardinal-inspections/visualizer/index.html';
const APP = readFileSync(TARGET, 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const OC = [
  { id:'oc1', name:'Onyx Black',   hex:'#232427', hex_verified:true,  swatch_path:null, family:'black', product_line:'Duration', status:'current', description:'Deep consistent black with dimensional variation. One of the top sellers nationally.', sort_order:1, hidden:false },
  { id:'oc2', name:'Black Sable',  hex:'#26282B', hex_verified:false, swatch_path:'swatches/oc/black-sable.jpg', family:'black', product_line:'Designer', status:'current', description:'Near-black with charcoal depth.', sort_order:2, hidden:false },
];
const MAT = [
  { id:'m1', category:'siding', manufacturer:'Mastic',      product_line:'Quest',                          color_name:'Harbor Blue',   hex:'#5C7186', hex_verified:false, swatch_path:null, finish:'low gloss', prompt:'p', negative:'', status:'current', sort_order:13 },
  { id:'m2', category:'siding', manufacturer:'Mastic',      product_line:'Cedar Discovery Board & Batten', color_name:'Rugged Canyon', hex:'#8A5C46', hex_verified:false, swatch_path:null, finish:'matte',     prompt:'p', negative:'', status:'current', sort_order:18 },
  { id:'m3', category:'siding', manufacturer:'CertainTeed', product_line:'Monogram',                       color_name:'Pacific Blue',  hex:'#4E6E8E', hex_verified:false, swatch_path:null, finish:'low gloss', prompt:'p', negative:'', status:'current', sort_order:23 },
  { id:'m4', category:'siding', manufacturer:'CertainTeed', product_line:'Cedar Impressions',              color_name:'Natural Cedar', hex:'#B08D64', hex_verified:false, swatch_path:null, finish:'matte',     prompt:'p', negative:'', status:'current', sort_order:26 },
  { id:'m5', category:'windows',manufacturer:'Andersen',    product_line:'100 Series',                     color_name:'Black',         hex:'#1B1B1B', hex_verified:false, swatch_path:null, finish:'painted',   prompt:'p', negative:'', status:'current', sort_order:54 },
];
const JOBS = [
  { id:'j-done', project_id:'p1', status:'done', source_path:'projects/p1/front.jpg',
    selections:{ roof:{ id:'oc1', name:'Onyx Black', sub:'OC Duration', hex:'#232427', prompt:'p', negative:'' } },
    render_path:'visualizer/j-done/render.jpg', preview_path:'visualizer/j-done/preview.jpg',
    masks:{ roof:'visualizer/j-done/mask_roof.png', siding:'visualizer/j-done/mask_siding.png' },
    error:null, created_at:'2026-08-14T22:07:00Z', duration_ms:38341, claimed_at:'2026-08-14T22:07:00Z' },
  { id:'j-done2', project_id:'p1', status:'done', source_path:'projects/p1/front.jpg',
    selections:{ roof:{ id:'oc1', name:'Onyx Black', sub:'OC Duration', hex:'#232427', prompt:'p', negative:'' },
                 siding:{ id:'m1', name:'Harbor Blue', sub:'Mastic Quest', hex:'#5C7186', prompt:'p', negative:'' } },
    render_path:'visualizer/j-done2/render.jpg', preview_path:'visualizer/j-done2/preview.jpg',
    masks:null, error:null, created_at:'2026-08-14T22:15:00Z', duration_ms:31000,
    claimed_at:'2026-08-14T22:15:00Z' },
  { id:'j-queued', project_id:'p1', status:'queued', source_path:'projects/p1/front.jpg',
    selections:{ roof:{ id:'oc2', name:'Black Sable', sub:'OC Designer', hex:'#26282B', prompt:'p', negative:'' } },
    render_path:null, preview_path:null, masks:null, error:null,
    created_at:'2026-08-14T22:20:00Z', duration_ms:null, claimed_at:null },
  /* A job the Spark has been holding for nine minutes. Theo hit this on
     15 Aug — "the render has been at running stage for several minutes" —
     and the screen had no sentence for it: stalled() only ever looked at
     QUEUED jobs. The real render took 12m13s and came back correct.
     claimed_at is COMPUTED, never hardcoded: a fixed timestamp silently
     stops meaning "nine minutes ago" the day after it is written. */
  { id:'j-running', project_id:'p1', status:'running', source_path:'visualizer/src/import.jpg',
    selections:{ roof:{ id:'oc2', name:'Black Sable', sub:'OC Designer', hex:'#26282B', prompt:'p', negative:'' },
                 siding:{ id:'m1', name:'Harbor Blue', sub:'Mastic Quest', hex:'#5C7186', prompt:'p', negative:'' } },
    render_path:null, preview_path:null, masks:null, error:null,
    created_at:new Date(Date.now() - 9.5 * 60000).toISOString(), duration_ms:null,
    claimed_at:new Date(Date.now() - 9 * 60000).toISOString() },
];
const RENDERS = [
  { id:'r1', job_id:'j-done', project_id:'p1', title:'Onyx Black', source_path:'projects/p1/front.jpg',
    render_path:'visualizer/j-done/render.jpg', preview_path:'visualizer/j-done/preview.jpg',
    selections:JOBS[0].selections, approved:false, created_at:'2026-08-14T22:07:40Z' },
  { id:'r2', job_id:'j-done2', project_id:'p1', title:'Onyx Black + Harbor Blue', source_path:'projects/p1/front.jpg',
    render_path:'visualizer/j-done2/render.jpg', preview_path:'visualizer/j-done2/preview.jpg',
    selections:JOBS[1].selections, approved:false, created_at:'2026-08-14T22:15:40Z' },
];

/* The stub records every call so the gate can assert on what the page DID,
   not on what its source says it would do. */
function mock() {
  return `
window.__EXIFJPEG_B64 = '/9j//gASR1BTIDM5Ljc1LC04NC4xOf/hAEBFeGlmAABJSSoACAAAAAEAJYgEAAEAAAAaAAAAAAAAAAIAAQACAAIAAABOAAAAAwACAAIAAABXAAAAAAAAAP/gABBKRklGAAEBAAABAAEAAP/bAEMAAwICAwICAwMDAwQDAwQFCAUFBAQFCgcHBggMCgwMCwoLCw0OEhANDhEOCwsQFhARExQVFRUMDxcYFhQYEhQVFP/bAEMBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIADAAQAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APD6KKK/Qz48KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/2Q==';
window.__EXIFJPEG = atob(window.__EXIFJPEG_B64);
window.__calls = [];
window.__signed = [];
/* A MUTABLE jobs table. An insert must be visible to the next select, exactly
   as PostgREST behaves — the duplicate guard reads the job list, so a stub
   whose list never grows makes a working guard look broken. */
window.__jobsTable = ${JSON.stringify(JOBS)};
window.confirm = function(){ window.__calls.push({op:'confirm'}); return true; };
window.__cc = [];            /* every /api/companycam body the page sent */
window.__uploads = [];       /* every storage upload, with its bytes */
window.__ccAdmin = true;     /* flipped per-scenario before load */
(function(){
  var real = window.fetch;
  window.fetch = function(url, opts){
    if(String(url).indexOf('/api/companycam') === 0){
      var body = {}; try { body = JSON.parse((opts && opts.body) || '{}'); } catch(e){}
      window.__cc.push({ body: body, auth: !!(opts && opts.headers && opts.headers.Authorization) });
      if(!window.__ccAdmin)
        return Promise.resolve(new Response(JSON.stringify({error:'Admins only'}),
          {status:403, headers:{'Content-Type':'application/json'}}));
      if(body.action === 'tags')
        return Promise.resolve(new Response(JSON.stringify({tags:[{id:'1',name:'Roof'}]}),
          {status:200, headers:{'Content-Type':'application/json'}}));
      if(body.action === 'list'){
        /* Mirrors the real route: a TEXT SEARCH runs against the index and
           never returns a cursor, so more means a bigger limit, clamped at
           100. There are 60 matching photos in this fixture, so 24 -> 48 -> 60
           and then it is genuinely everything. */
        var n = Math.min(body.limit || 30, 100), total = 60, out = [];
        for(var i = 1; i <= Math.min(n, total); i++)
          out.push({ id:'ccphoto' + i, description:'front elevation ' + i,
            captured_at:'2026-07-02', project_id:'ccp1', project_name:'Monica',
            project_address:'843 Farnam Dr', creator_name:'Curtis', annotated:false,
            thumb:'https://cdn.companycam.invalid/t/ccphoto' + i + '.jpg',
            preview:'https://cdn.companycam.invalid/p/ccphoto' + i + '.jpg' });
        return Promise.resolve(new Response(JSON.stringify({
          photos: out, next_cursor: null, has_next: false
        }), {status:200, headers:{'Content-Type':'application/json'}}));
      }
      if(body.action === 'fetch'){
        /* Mirrors api/companycam.js: with prefer:'original' it resolves the
           ORIGINAL and never an annotated type; without it, the library's
           default order lands on web_annotation — the small, marked-up copy
           that made the first imports look terrible. */
        var rend = body.prefer === 'original' ? 'original' : 'web_annotation';
        window.__lastRendition = rend;
        return Promise.resolve(new Response(JSON.stringify({
          id: body.id, mime:'image/jpeg', bytes: window.__EXIFJPEG.length,
          rendition: rend, description:'front elevation', captured_at:'2026-07-02',
          data: window.__EXIFJPEG_B64
        }), {status:200, headers:{'Content-Type':'application/json'}}));
      }
      return Promise.resolve(new Response('{}', {status:400, headers:{'Content-Type':'application/json'}}));
    }
    return real.apply(this, arguments);
  };
})();
window.supabase = { createClient: function(){ return {
  auth:{ getSession:function(){ return Promise.resolve({data:{session:{access_token:'stub-jwt', user:{email:'theo@cardinalrenovations.net'}}}}); },
         signOut:function(){ return Promise.resolve({}); } },
  from:function(t){
    /* p2 is Theo's screenshot: a real job with NO photographs on it. Without a
       second project the empty state cannot be reached at all, and the message
       it shows went untested for eight builds. */
    var rows = { oc_colors:${JSON.stringify(OC)}, materials:${JSON.stringify(MAT)},
                 projects:[{id:'p1',name:'James Tiege',stage:'Prospect'},
                           {id:'p2',name:'Carl Bolivar',stage:'Closed'}],
                 project_photos:[{id:'ph1',project_id:'p1',storage_path:'projects/p1/front.jpg',caption:'Front elevation',created_at:'2026-08-02'}],
                 design_jobs: window.__jobsTable, design_renders:${JSON.stringify(RENDERS)} }[t] || [];
    var b = {};
    ['select','order','limit','not','is'].forEach(function(m){ b[m] = function(){ return b; }; });
    /* .eq() FILTERS, the way PostgREST does. It used to be a no-op, so every
       project saw every project's photographs and jobs — which made "a job
       with nothing on it" impossible to express in the harness. */
    b.eq = function(col, val){
      if(rows.length && Object.prototype.hasOwnProperty.call(rows[0], col))
        rows = rows.filter(function(r){ return r[col] === val; });
      return b;
    };
    b.then = function(ok){ return Promise.resolve({data:rows,error:null}).then(ok); };
    b.maybeSingle = function(){ return Promise.resolve({data:rows[0]||null,error:null}); };
    return {
      select:function(){ return b; },
      insert:function(v){
        window.__calls.push({op:'insert',table:t,value:v});
        /* PostgREST returns the INSERTED row from .insert().select(), not the
           first row of the table. The stub used to hand back rows[0], which
           made the app's optimistic "add the new job to the list" look broken
           when it was the harness that was wrong. */
        var made = Object.assign({ id:'new-' + (window.__calls.length),
          status:'queued', render_path:null, preview_path:null, masks:null,
          error:null, created_at:new Date().toISOString(), duration_ms:null,
          claimed_at:null }, v);
        if(t === 'design_jobs') window.__jobsTable.unshift(made);
        var ib = {};
        ['select','order','limit','eq','not','is'].forEach(function(m){ ib[m]=function(){ return ib; }; });
        ib.then = function(ok){ return Promise.resolve({data:[made],error:null}).then(ok); };
        ib.maybeSingle = function(){ return Promise.resolve({data:made,error:null}); };
        return ib;
      },
      update:function(v){ window.__calls.push({op:'update',table:t,value:v}); return b; },
      delete:function(){ window.__calls.push({op:'delete',table:t});
        var d = { then:function(ok){ return Promise.resolve({data:[],error:null}).then(ok); } };
        d.eq = function(){ return d; }; return d; }
    };
  },
  storage:{ from:function(){ return {
    createSignedUrl:function(p){ return Promise.resolve({data:{signedUrl:'https://stub.invalid/'+p}}); },
    createSignedUrls:function(paths){ window.__signed.push(paths.slice());
      return Promise.resolve({data:paths.map(function(p){ return {path:p,signedUrl:'https://stub.invalid/'+p}; })}); },
    remove:function(files){ window.__calls.push({op:'remove',files:files.slice()});
      return Promise.resolve({data:files.map(function(f){ return {name:f}; }),error:null}); },
    upload:function(path, blob, opts){
      return blob.arrayBuffer().then(function(buf){
        window.__uploads.push({ path: path, bytes: new Uint8Array(buf), type: (opts||{}).contentType });
        return { data:{ path: path }, error:null };
      });
    }
  }; } }
}; } };`;
}

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport:{ width:1440, height:900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://viz.test/')) return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
  return r.fulfill({ status:200, body:'' });
});
await page.addInitScript(mock());
await page.goto('https://viz.test/', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(500);
await page.evaluate(`(async()=>{ const s=document.getElementById('vzProject');
  if(s){ s.value='p1'; s.dispatchEvent(new Event('change')); }
  await new Promise(r=>setTimeout(r,600)); })()`);

const has = sel => page.locator(sel).count().then(n => n > 0);

/* Click something that may not exist in an older artifact.
   Five times tonight a control CRASHED instead of reporting red, every one the
   same shape: an interaction on a selector the previous build does not have,
   Playwright waiting 30s, then an unhandled rejection that killed the run
   before it printed a line. A control that crashes proves nothing. This
   records a failure and carries on, which is what red is supposed to look
   like. Returns true if it clicked. */
async function tryClick(sel, why) {
  if (!(await has(sel))) { chk(why || ('a control exists: ' + sel), false, 'missing ' + sel); return false; }
  try { await page.click(sel, { timeout: 4000 }); return true; }
  catch (e) { chk(why || ('clickable: ' + sel), false, String(e.message).split('\n')[0]); return false; }
}

// ── 1. the shell exists at all ────────────────────────────────────────────
chk('the four-column shell is present', await has('.shell'));
chk('the surface rail is present', await has('#vzRail button'));
chk('the search box is present', await has('#vzSearch'));
chk('the render rail is present', await has('.renders'));
chk('the old stacked surface accordion is gone', !(await has('#vzSurfaces')));
chk('there is exactly one Render button', (await page.locator('#vzQueue').count()) === 1,
    await page.locator('#vzQueue').count());

/* Bail out cleanly if the shell is not there at all.
   Without this the control against 809 tries to click a rail that does not
   exist, Playwright waits 30s, the rejection is unhandled and the process dies
   having printed nothing — BUG_CLASSES 37, a control that crashes proves
   nothing. It has to REPORT red, not fall over. */
if (!(await has('.shell')) || !(await has('#vzRail button'))) {
  await browser.close();
  for (const c of checks) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.n + (c.d ? ('   [' + c.d + ']') : ''));
  console.log('  FAIL  the shell is absent — every later check is unreachable, not passing');
  console.log('RED — no spec-book shell in this artifact');
  process.exit(1);
}

// ── 2. the rail switches surfaces and the list follows ────────────────────
const railLabels = await page.evaluate(`[...document.querySelectorAll('#vzRail button')].map(b=>b.title)`);
chk('the rail carries every surface', railLabels.join(',') === 'Roof,Siding,Trim,Windows,Gutters', railLabels.join(','));
const roofBrands = await page.evaluate(`[...document.querySelectorAll('#vzList .lhead')].map(h=>h.firstChild.textContent)`);
chk('roofing shows Owens Corning and nothing else',
    roofBrands.length === 1 && roofBrands[0] === 'Owens Corning', JSON.stringify(roofBrands));
await page.click('#vzRail button[title="Siding"]');
await page.waitForTimeout(150);
const sideBrands = await page.evaluate(`[...document.querySelectorAll('#vzList .lhead')].map(h=>h.firstChild.textContent)`);
chk('siding groups under sticky brand headers',
    sideBrands.includes('Mastic') && sideBrands.includes('CertainTeed'), JSON.stringify(sideBrands));
chk('the brand header is actually sticky',
    await page.evaluate(`getComputedStyle(document.querySelector('#vzList .lhead')).position === 'sticky'`));

// ── 3. search and profile chips narrow it, "No change" survives ───────────
await page.fill('#vzSearch', 'pacific');
await page.waitForTimeout(150);
const found = await page.evaluate(`[...document.querySelectorAll('#vzList .crow')].map(r=>r.dataset.id)`);
chk('search narrows to the matching colour', found.length === 2 && found.includes('m3'), JSON.stringify(found));
chk('"No change" survives the search', found[0] === '', JSON.stringify(found));
await page.fill('#vzSearch', '');
await page.waitForTimeout(150);
const chips = await page.evaluate(`[...document.querySelectorAll('#vzProfiles button')].map(b=>b.textContent)`);
chk('profile chips appear when a surface has more than one profile',
    chips.includes('Board & Batten') && chips.includes('Lap'), JSON.stringify(chips));
await page.click(`#vzProfiles button:text-is("Board & Batten")`);
await page.waitForTimeout(150);
const bnb = await page.evaluate(`[...document.querySelectorAll('#vzList .crow')].map(r=>r.dataset.id).filter(Boolean)`);
chk('the Board & Batten chip cuts across brands, keeping only that profile',
    bnb.length === 1 && bnb[0] === 'm2', JSON.stringify(bnb));
await page.click(`#vzProfiles button:text-is("All")`);
await page.waitForTimeout(150);

// ── 4. swatches: a photograph beats the texture ───────────────────────────
await page.click('#vzRail button[title="Roof"]');
await page.waitForTimeout(300);
const signed = await page.evaluate(`(window.__signed||[]).flat()`);
chk('a swatch photograph is signed when the row has one',
    signed.includes('swatches/oc/black-sable.jpg'), JSON.stringify(signed));
const swClasses = await page.evaluate(`(()=>{ const r=[...document.querySelectorAll('#vzList .crow')].find(x=>x.dataset.id==='oc2');
  return r ? r.querySelector('.sw').className : 'missing'; })()`);
chk('that row paints the photograph, not the procedural texture', /\bphoto\b/.test(swClasses), swClasses);
const est = await page.evaluate(`(()=>{ const r=[...document.querySelectorAll('#vzList .crow')].find(x=>x.dataset.id==='oc1');
  return r ? !!r.querySelector('.est') : null; })()`);
chk('a VERIFIED hex carries no "est" mark', est === false, 'oc1 verified=true');
const est2 = await page.evaluate(`(()=>{ const r=[...document.querySelectorAll('#vzList .crow')].find(x=>x.dataset.id==='oc2');
  return r ? !!r.querySelector('.est') : null; })()`);
chk('an UNVERIFIED hex is marked "est" rather than passed off as a product colour', est2 === true);

// ── 5. picking fills the tray; the duplicate no longer blocks ─────────────
await page.click('#vzShots .shot');
await page.waitForTimeout(200);
chk('choosing a photograph paints the big stage', await has('#vzStage img'));
await page.click('#vzList .crow[data-id="oc1"]');
await page.waitForTimeout(150);
chk('the tray shows the pick', /Onyx Black/.test(await page.locator('#vzTray').innerText()));
chk('the rail marks the surface as set', await has('#vzRail button[aria-pressed="true"] .rdot'));
const label = await page.locator('#vzQueue').innerText();
chk('a DONE combination offers "Render again" instead of refusing', /Render again/i.test(label), label);
chk('the button is enabled for a repeat', !(await page.locator('#vzQueue').isDisabled()));
const before = await page.evaluate(`window.__calls.filter(c=>c.op==='insert').length`);
await page.click('#vzQueue');
await page.waitForTimeout(250);
const afterIns = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
chk('Render again actually inserts a job (a control that does nothing is BUG_CLASSES 16)',
    afterIns > before, before + ' -> ' + afterIns);

// a QUEUED duplicate must still be refused — that one really is waste
await page.click('#vzList .crow[data-id="oc2"]');
await page.waitForTimeout(150);
const qLabel = await page.locator('#vzQueue').innerText();
chk('a QUEUED duplicate is still refused, not offered again', !/again/i.test(qLabel), qLabel);

// ── 6. delete: render row BEFORE job row, then the files ──────────────────
await page.evaluate(`window.__calls = []`);
const acts = await page.evaluate(`[...document.querySelectorAll('.rcard[data-job="j-done"] .acts button')].map(b=>b.textContent)`);
chk('Delete and Again are VISIBLE buttons on the card, not behind a menu',
    acts.includes('Delete') && acts.includes('Again'), JSON.stringify(acts));
chk('the delete button is on screen and big enough to hit',
    await page.evaluate(`(()=>{ const b=document.querySelector('.rcard[data-job="j-done"] .acts .del');
      if(!b) return false; const r=b.getBoundingClientRect();
      return r.width > 40 && r.height >= 32 && getComputedStyle(b).opacity === '1'; })()`));
chk('the old hidden dot menu is gone', !(await has('.rcard[data-job="j-done"] .more')));
await tryClick('.rcard[data-job="j-done"] .acts .del', 'the delete button on a render card is reachable');
await page.waitForTimeout(400);
const seq = await page.evaluate(`window.__calls.filter(c=>c.op==='delete'||c.op==='remove')
  .map(c=>c.op==='remove'?'remove':('delete:'+c.table))`);
chk('delete removes the RENDER row before the JOB row (job_id is ON DELETE SET NULL)',
    seq[0] === 'delete:design_renders' && seq[1] === 'delete:design_jobs', JSON.stringify(seq));
const removed = await page.evaluate(`(window.__calls.find(c=>c.op==='remove')||{}).files||[]`);
chk('delete also removes the render, the preview AND the mask files',
    removed.length === 4 && removed.includes('visualizer/j-done/mask_siding.png'), JSON.stringify(removed));

// ── 6b. 812: stepping between renders inside the compare box ────────
//  Two renders exist in the fixture but only ONE has a design_renders row, so
//  this also proves the counter is built from openable renders rather than
//  from jobs — otherwise it would claim "1 of 2" with a second view that can
//  never be reached.
{
  const first = await page.evaluate(`(()=>{
    const c=document.querySelector('.rcard[data-job="j-done"] .open'); if(c) c.click();
    return new Promise(res=>setTimeout(()=>res({
      open: !document.getElementById('vzBox').classList.contains('hide'),
      title: document.getElementById('vzBoxT').textContent,
      pos: document.getElementById('vzPos').textContent,
      prevDis: document.getElementById('vzPrev').disabled,
      nextDis: document.getElementById('vzNext').disabled,
      navHidden: document.querySelector('#vzBox .nav').classList.contains('solo')
    }),300));
  })()`);
  chk('clicking a render card opens the compare box', first.open, first.title);
  chk('the arrows are shown when more than one render is openable', first.navHidden === false);
  chk('the counter counts only OPENABLE renders, not every job (3 jobs, 2 renders)',
      first.pos === '1 of 2', first.pos);
  chk('Previous is disabled on the first render', first.prevDis === true);
  chk('Next is enabled on the first render', first.nextDis === false);

  await tryClick('#vzNext', 'the Next arrow is reachable');
  await page.waitForTimeout(250);
  const second = await page.evaluate(`({
    title: document.getElementById('vzBoxT').textContent,
    pos: document.getElementById('vzPos').textContent,
    prevDis: document.getElementById('vzPrev').disabled,
    nextDis: document.getElementById('vzNext').disabled,
    after: document.getElementById('vzAfterImg').getAttribute('src') || ''
  })`);
  chk('Next steps to the following render', second.pos === '2 of 2', second.pos);
  chk('stepping actually changes the picture shown',
      /j-done2/.test(second.after), second.after.slice(-46));
  chk('the title follows the render', /Harbor Blue/.test(second.title), second.title);
  chk('Next is disabled at the end — no wrap to the first house',
      second.nextDis === true && second.prevDis === false);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  chk('ArrowRight at the end is a safe no-op',
      await page.evaluate(`document.getElementById('vzPos').textContent === '2 of 2'`));
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);
  chk('ArrowLeft steps back',
      await page.evaluate(`document.getElementById('vzPos').textContent === '1 of 2'`));

  chk('Escape still closes the box',
      await page.evaluate(`(()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
        return new Promise(r=>setTimeout(()=>r(document.getElementById('vzBox').classList.contains('hide')),150)); })()`));
}

// ── 6c. 813: CompanyCam as a photograph source ──────────────────────
//  Three fences, and each has a wrong version that ships silently:
//    a) the tab must NOT appear for a non-admin (403 from the route)
//    b) the full photograph must come through /api/companycam, never the CDN
//    c) EXIF must be gone BEFORE the upload — the worker's own strip happens
//       after this, so a GPS coordinate would already be sitting in the bucket
/* Bail cleanly when the source bar is absent. Pointed at 812 the first
   version clicked a tab that did not exist, the evaluate rejected, and the
   whole control died having printed nothing — BUG_CLASSES 37 for the third
   time tonight, each time in a gate rather than in the app. A control that
   crashes proves nothing; it has to REPORT red. */
/* Guard on EVERY element the block below touches, not just the first one.
   This crashed against 813 — which HAS the tab but not the picker — because
   the guard checked #vzSrcCC and the code then reached for #vzCCBox. Fourth
   BUG_CLASSES 37 of the session, and every one of them was the same shape: an
   interaction added without extending the structural guard in front of it. */
if (!(await has('#vzSrcCC')) || !(await has('#vzCCBox')) || !(await has('#vzCCGrid'))) {
  chk('the CompanyCam source bar exists', await has('#vzSrcCC'), 'tab');
  chk('814: the tab opens a full picker screen, not a strip', await has('#vzCCBox'),
      'no #vzCCBox in this artifact');
  chk('the picker has a grid to fill', await has('#vzCCGrid'));
} else {
  const opened = await page.evaluate(`(()=>{
    document.getElementById('vzSrcCC').click();
    return new Promise(res=>setTimeout(()=>res({
      tabShown: !document.getElementById('vzSrcCC').classList.contains('hide'),
      pickerOpen: !document.getElementById('vzCCBox').classList.contains('hide'),
      probed: (window.__cc||[]).some(c=>c.body.action==='tags'),
      authed: (window.__cc||[]).every(c=>c.auth === true)
    }),250));
  })()`);
  chk('the CompanyCam tab appears for an admin', opened.tabShown === true);
  chk('the tab is decided by ASKING the route, not by re-implementing its role check',
      opened.probed === true);
  chk('every CompanyCam call carries the signed-in bearer token', opened.authed === true);
  chk('814: the tab opens a full picker screen, not a strip', opened.pickerOpen === true);

  await page.fill('#vzCCq', '843 Farnam');
  await page.click('#vzCCgo');
  await page.waitForTimeout(400);
  const first = await page.evaluate(`({
    tiles: document.querySelectorAll('#vzCCGrid .cctile').length,
    moreShown: !document.getElementById('vzCCMore').hidden,
    note: document.getElementById('vzCCNote').textContent
  })`);
  chk('searching fills the picker grid', first.tiles === 24, first.tiles + ' tiles');
  chk('the query reached the route as typed',
      await page.evaluate(`(window.__cc||[]).some(c=>c.body.action==='list' && c.body.q==='843 Farnam')`));
  chk('the count is shown', /24 shown/.test(first.note), first.note);

  /* 814: the tiles must be big enough to tell one elevation from another —
     that is the whole reason the picker exists. */
  const tile = await page.evaluate(`(()=>{ const t=document.querySelector('#vzCCGrid .cctile');
    if(!t) return null; const r=t.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height) }; })()`);
  chk('picker tiles are large (>=200px wide), not 78px thumbnails',
      tile && tile.w >= 200, tile ? (tile.w + 'x' + tile.h) : 'none');

  chk('Load more is offered when there is more to get', first.moreShown === true);
  await page.click('#vzCCMore');
  await page.waitForTimeout(350);
  const second = await page.evaluate(`({
    tiles: document.querySelectorAll('#vzCCGrid .cctile').length,
    asked: (window.__cc||[]).filter(c=>c.body.action==='list').map(c=>c.body.limit)
  })`);
  chk('Load more actually loads more', second.tiles === 48, second.tiles + ' tiles');
  chk('it does it by raising the limit — a text search has no cursor',
      second.asked.join(',') === '24,48', second.asked.join(','));

  await page.click('#vzCCMore');
  await page.waitForTimeout(350);
  const third = await page.evaluate(`({
    tiles: document.querySelectorAll('#vzCCGrid .cctile').length,
    moreShown: !document.getElementById('vzCCMore').hidden,
    foot: document.getElementById('vzCCFootNote').textContent
  })`);
  chk('it stops at the real end of the results', third.tiles === 60, third.tiles + ' tiles');
  chk('and SAYS it is the end rather than leaving a dead button',
      third.moreShown === false && /everything matching/i.test(third.foot), third.foot);

  /* Back to the top of the grid before picking. After two Load mores the
     grid is scrolled, and clicking a tile that is off-screen is not what a
     rep does — they scroll up and click the one they can see. The tile's size
     is asserted separately above, so this is not papering over a hit-target
     problem. */
  await page.evaluate(`document.getElementById('vzCCGrid').scrollTop = 0`);
  await page.waitForTimeout(150);
  /* Tiles must not overlap. aspect-ratio on a 1fr grid column did not size the
     implicit row, so every tile spilled ~90px into the one below it. This is
     the check that caught it, and it is geometry rather than a class name. */
  const overlap = await page.evaluate(`(()=>{
    const g=document.getElementById('vzCCGrid');
    const a=g.querySelector('[data-ccid="ccphoto1"]').getBoundingClientRect();
    const b=g.querySelector('[data-ccid="ccphoto7"]').getBoundingClientRect();
    return { same: Math.abs(a.left-b.left) < 2, gap: Math.round(b.top - a.bottom) };
  })()`);
  chk('picker tiles do not overlap the row beneath them',
      overlap.same && overlap.gap >= 0, 'gap ' + overlap.gap + 'px between row 1 and row 2');

  /* 817: THE PHONE. The tile height sat on the <img>, and a grid row is sized
     from the button's intrinsic contribution, which ignores a child's explicit
     height — so on a 390px screen the row came out 14px and every photograph
     was clipped to a sliver. Desktop was fine throughout, which is exactly why
     this has to be measured at a phone width and not assumed. */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const phone = await page.evaluate(`(()=>{
    const ts=[...document.querySelectorAll('#vzCCGrid .cctile')];
    if(ts.length < 4) return null;
    const r=i=>ts[i].getBoundingClientRect();
    const img=ts[0].querySelector('img').getBoundingClientRect();
    let worst=0;
    for(let i=0;i<ts.length-1;i++)
      for(let j=i+1;j<ts.length;j++){
        const a=r(i),b=r(j);
        const ov=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        const oh=Math.min(a.right,b.right)-Math.max(a.left,b.left);
        if(ov>1&&oh>1) worst=Math.max(worst,ov);
      }
    return { w:Math.round(r(0).width), h:Math.round(r(0).height),
             imgH:Math.round(img.height), overlap:Math.round(worst),
             perRow: ts.filter(t=>Math.abs(t.getBoundingClientRect().top-r(0).top)<2).length };
  })()`);
  chk('817: on a 390px phone the tiles have real height, not a 14px sliver',
      phone && phone.h >= 120, phone ? (phone.w + 'x' + phone.h) : 'fewer than 4 tiles');
  chk('817: the image fills the tile rather than overflowing it',
      phone && Math.abs(phone.imgH - phone.h) <= 6, phone ? ('img ' + phone.imgH + ' vs tile ' + phone.h) : '');
  chk('817: no two tiles overlap at phone width',
      phone && phone.overlap === 0, phone ? (phone.overlap + 'px worst overlap') : '');
  chk('817: the phone shows two tiles per row, not one letterbox strip',
      phone && phone.perRow === 2, phone ? (phone.perRow + ' per row') : '');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(250);

  await tryClick('#vzCCGrid .cctile[data-ccid="ccphoto1"]', 'a picker tile is reachable');
  await page.waitForTimeout(800);

  const imported = await page.evaluate(`(()=>{
    const u = (window.__uploads||[])[0];
    if(!u) return { none:true };
    const b = u.bytes;
    let exif = false;
    for(let i=0;i<b.length-1;i++) if(b[i]===0xFF && b[i+1]===0xE1){ exif = true; break; }
    let gps = false;
    for(let i=0;i<b.length-2;i++)
      if(b[i]===0x47&&b[i+1]===0x50&&b[i+2]===0x53){ gps = true; break; }
    return { path:u.path, len:b.length, exif, gps, jpeg: b[0]===0xFF && b[1]===0xD8 };
  })()`);
  chk('picking a CompanyCam photo uploads it into the bucket', !imported.none, imported.path);
  chk('it lands under visualizer/ where the write policy allows staff',
      /^visualizer\/src\//.test(imported.path || ''), imported.path);
  chk('the uploaded file is a real JPEG', imported.jpeg === true);
  chk('EXIF is STRIPPED before upload — no APP1 segment survives', imported.exif === false);
  chk('no GPS tag survives in the uploaded bytes', imported.gps === false);
  chk('the full photograph came through /api/companycam, never the CDN',
      await page.evaluate(`(window.__cc||[]).some(c=>c.body.action==='fetch' && c.body.id==='ccphoto1')`));

  /* 815: the rendition is most of the quality. The route's DEFAULT order is
     the Resource Library's — annotated web copy first, original last — so the
     Visualizer has to ask, and asking is what this proves. */
  chk('815: the import asks for the ORIGINAL rendition, not the library default',
      await page.evaluate(`(window.__cc||[]).some(c=>c.body.action==='fetch' && c.body.prefer==='original')`));
  chk('815: it therefore never receives an ANNOTATED copy',
      await page.evaluate(`window.__lastRendition === 'original'`),
      await page.evaluate(`String(window.__lastRendition)`));
  chk('815: the screen reports which rendition arrived, not just "Imported"',
      /original/.test(await page.evaluate(`document.getElementById('vzCCNote').textContent`)),
      await page.evaluate(`document.getElementById('vzCCNote').textContent`));

  const after = await page.evaluate(`({
    closed: document.getElementById('vzCCBox').classList.contains('hide'),
    src: (document.querySelector('.canvas .stage img')||{}).src || '',
    scroll: document.body.style.overflow
  })`);
  chk('the picker closes once the photograph is in', after.closed === true);
  chk('the imported photograph becomes the chosen one on the stage',
      /visualizer\/src\//.test(after.src), after.src.slice(-44));
  chk('closing releases the scroll lock', after.scroll === '', 'overflow=' + after.scroll);

  /* THE THING THAT MATTERS: can you actually render the photograph you just
     imported? Everything above is choosing; this is the button that spends
     the Spark. */
  await page.click('#vzList .crow[data-id="oc1"]');
  await page.waitForTimeout(200);
  const ready = await page.evaluate(`({
    disabled: document.getElementById('vzQueue').disabled,
    label: document.getElementById('vzQueue').textContent,
    sum: document.getElementById('vzSum').textContent,
    tray: document.getElementById('vzTray').textContent
  })`);
  chk('after a CompanyCam import the Render button is ENABLED',
      ready.disabled === false, 'label=' + ready.label + ' | ' + ready.sum);
  const before = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
  await page.click('#vzQueue');
  await page.waitForTimeout(400);
  const fired = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
  chk('clicking Render on an imported photograph queues a job',
      fired > before, before + ' -> ' + fired + ' | ' + await page.evaluate(`document.getElementById('vzSum').textContent`));

  /* ── 820: a RUNNING job says how long it has been running ────────────
     The render was never the problem — the screen was silent. A card showed
     the creation DATE while a job was in the machine, which answers a
     question nobody asks; the only question is "is this still going?" */
  await page.evaluate(`(()=>{ const s=document.getElementById('vzProject');
    s.value='p1'; s.dispatchEvent(new Event('change')); })()`);
  await page.waitForTimeout(600);
  const runCard = await page.evaluate(`(()=>{
    const c=[...document.querySelectorAll('#vzJobs .rcard')]
      .find(x=>x.dataset.job==='j-running');
    if(!c) return { missing:true };
    return { cap: c.querySelector('.cap i') ? c.querySelector('.cap i').textContent : '',
             chip: c.querySelector('.st') ? c.querySelector('.st').textContent : '' };
  })()`);
  chk('820: the running job renders a card at all (not a vacuous pass)',
      !runCard.missing, JSON.stringify(runCard));
  chk('820: a running card shows ELAPSED time, not the creation date',
      /^\d+m \d+s$|^\d+s$/.test((runCard.cap || '').trim()), 'cap = "' + runCard.cap + '"');
  chk('820: and it reads about nine minutes, so it is a real clock not a constant',
      /^9m /.test((runCard.cap || '').trim()), runCard.cap);

  const banner = await page.evaluate(`(()=>{ const w=document.getElementById('vzWait');
    return { hidden: w.classList.contains('hide'), text: w.textContent.trim() }; })()`);
  /* ⚠ The first version of this asserted only `hidden === false` and PASSED —
     on the 808 QUEUED banner, which was showing for a different job entirely.
     A visible banner is not a banner about the right thing. Assert the
     sentence, not the visibility. */
  chk('820: the wait banner speaks for a long-RUNNING job, not the queued one',
      banner.hidden === false && /rendering/i.test(banner.text),
      banner.hidden ? 'banner hidden with a 9-minute render in flight' : banner.text.slice(0, 90));
  chk('820: it says how many minutes rather than a vague "still working"',
      /\b9 minutes in\b/.test(banner.text), banner.text.slice(0, 90));
  /* ⚠ It must NOT call this a failure. A cold Spark reloads three models
     before it draws a pixel; the longest real render was 12m13s and correct.
     Telling someone their good render looks stuck is worse than silence. */
  chk('820: and it does NOT call a long render stuck, failed or broken',
      !/stuck|fail|broken|error/i.test(banner.text), banner.text.slice(0, 90));

  /* ── 818: the stage has to agree with the button ───────────────────────
     Theo: "Now the render button does not function." It functioned perfectly.
     The SCREEN was lying — changing the job nulled chosenShot while the
     previous job's photograph stayed painted on the stage, so a correctly
     disabled button sat underneath a picture saying it should work. A
     disabled button beside a photograph reads as a broken button.

     A CompanyCam import is the one exception: it belongs to no job, and the
     order of work is import it, THEN file it against a job. */
  const ccKept = await page.evaluate(`(()=>{
    const s=document.getElementById('vzProject'); s.value='p2'; s.dispatchEvent(new Event('change'));
    return new Promise(r=>setTimeout(()=>r({
      picked: s.value,
      src: (document.querySelector('.canvas .stage img')||{}).src || '',
      disabled: document.getElementById('vzQueue').disabled,
      msg: document.getElementById('vzSum').textContent
    }),500));
  })()`);
  chk('818: the harness can actually reach a second job (not a vacuous pass)',
      ccKept.picked === 'p2', 'select landed on "' + ccKept.picked + '"');
  chk('818: a CompanyCam import SURVIVES changing the job — import first, file it second',
      /visualizer\/src\//.test(ccKept.src), ccKept.src.slice(-46) || '(the stage went empty)');
  /* Asserted on the BUTTON, not only on the painted pixels. The stage image
     survives a job change in the previous build too — by accident, because
     nothing cleared it — so a check that only reads the <img> cannot tell the
     two builds apart. Whether the photograph is still CHOSEN is the question,
     and Render is where that shows. */
  chk('818: and it is still the CHOSEN photograph — Render stays live across the change',
      ccKept.disabled === false, ccKept.msg);

  /* And the strip on that job is empty, which is the screen Theo was looking
     at. It said "Add them in the app first." — naming the one route that was
     not open to him — while CompanyCam, which was, went unmentioned. */
  const offer = await page.evaluate(`document.getElementById('vzShots').innerHTML`);
  chk('818: an empty photo strip offers CompanyCam instead of only naming what is missing',
      /vzShotsCC/.test(offer), offer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80));
  if (await tryClick('#vzShotsCC', '818: the offer in the empty strip is clickable')) {
    await page.waitForTimeout(250);
    chk('818: and it opens the picker (a control that renders but does nothing is BUG_CLASSES 16)',
        !(await page.evaluate(`document.getElementById('vzCCBox').classList.contains('hide')`)));
    await page.evaluate(`document.getElementById('vzCCX').click()`);
    await page.waitForTimeout(200);
  }

  /* A JOB photograph is the opposite case: it belongs to the job it came
     from, so it goes when the job does — and the stage goes with it. */
  await page.evaluate(`(()=>{ const s=document.getElementById('vzProject');
    s.value='p1'; s.dispatchEvent(new Event('change')); })()`);
  await page.waitForTimeout(600);
  await tryClick('#vzShots .shot', '818: a job photograph is reachable');
  await page.waitForTimeout(250);
  chk('818: the job photograph IS on the stage before the switch (not a vacuous pass)',
      await has('#vzStage img'));
  const cleared = await page.evaluate(`(()=>{
    const s=document.getElementById('vzProject'); s.value='p2'; s.dispatchEvent(new Event('change'));
    return new Promise(r=>setTimeout(()=>r({
      img: !!document.querySelector('#vzStage img'),
      disabled: document.getElementById('vzQueue').disabled,
      msg: document.getElementById('vzSum').textContent
    }),500));
  })()`);
  chk('818: changing the job CLEARS the stage — no photograph left above a dead button',
      cleared.img === false, cleared.img ? 'a photograph is still painted' : '');
  chk('818: and the button is disabled, so the screen and the button now agree',
      cleared.disabled === true, cleared.msg);

  /* ── 816: the two defects that produced TEN jobs in thirteen seconds ──── */

  /* A job is required. Without one the row carries project_id NULL, refresh()
     bails on it and the rail filters by project_id — so the Spark renders a
     picture nobody can ever see. */
  const noJob = await page.evaluate(`(()=>{
    const s=document.getElementById('vzProject'); s.value=''; s.dispatchEvent(new Event('change'));
    return new Promise(r=>setTimeout(()=>r({
      disabled: document.getElementById('vzQueue').disabled,
      msg: document.getElementById('vzSum').textContent
    }),300));
  })()`);
  chk('816: with no job selected the Render button is DISABLED',
      noJob.disabled === true, noJob.msg);
  chk('816: and it says to pick a job rather than failing silently',
      /pick a job/i.test(noJob.msg), noJob.msg);
  const n0 = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
  await page.evaluate(`document.getElementById('vzQueue').click()`);
  await page.waitForTimeout(250);
  chk('816: forcing a click with no job queues NOTHING',
      (await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`)) === n0);

  /* And the button must stay locked while an insert is in flight. sum() runs
     from the poll and used to re-enable it a second later, so every extra
     click a rep made — because nothing had appeared yet — bought another
     render. */
  await page.evaluate(`(()=>{ const s=document.getElementById('vzProject');
    s.value='p1'; s.dispatchEvent(new Event('change')); })()`);
  await page.waitForTimeout(500);
  /* A FRESH combination, or the duplicate guard short-circuits before the
     lock is ever reached and the burst assertion passes at zero — which is
     exactly what it did the first time I wrote it. A check that cannot fail
     is worse than no check. */
  await tryClick('#vzShots .shot', 'a job photograph is reachable');
  await page.waitForTimeout(200);
  await tryClick('#vzRail button[title="Siding"]', 'the Siding rail button is reachable');
  await page.waitForTimeout(200);
  await page.click('#vzList .crow[data-id="m3"]');
  await page.waitForTimeout(250);
  chk('816: the burst test starts from an ENABLED button (not a vacuous pass)',
      (await page.evaluate(`document.getElementById('vzQueue').disabled`)) === false,
      await page.evaluate(`document.getElementById('vzSum').textContent`));
  const n1 = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
  const burst = await page.evaluate(`(async()=>{
    const b=document.getElementById('vzQueue');
    for(let i=0;i<6;i++){ b.click(); await new Promise(r=>setTimeout(r,30)); }
    /* let the poll run, which is what used to unlock it */
    await new Promise(r=>setTimeout(r,900));
    return { disabledDuring: b.disabled };
  })()`);
  const n2 = await page.evaluate(`window.__calls.filter(c=>c.op==='insert'&&c.table==='design_jobs').length`);
  chk('816: six rapid clicks queue EXACTLY one job, not six',
      n2 - n1 === 1, (n2 - n1) + ' job(s) from 6 clicks');
}

// ── 7. it must not scroll sideways, at either width ───────────────────────
//  The shell is four fixed-ish columns. On Theo's 1194px iPad they cannot all
//  survive, so the CSS stacks them — if that media query is wrong the body
//  scrolls horizontally and the page feels broken before anything is read.
for (const [w, h] of [[2000, 1100], [1440, 900], [1194, 834]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(200);
  const over = await page.evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
  chk('no horizontal body scroll at ' + w + 'px', !over);
  /* And the shell must END inside the viewport. The first version subtracted a
     hardcoded 58px header; the header measures 68, so the bottom row — the
     disclaimer saying these are proposals, not photographs — fell off the
     screen on the iPad. fitShell() measures instead of assuming. */
  const spill = await page.evaluate(`(()=>{ const s=document.querySelector('.shell');
    return s ? Math.round(s.getBoundingClientRect().bottom - innerHeight) : 999; })()`);
  chk('the shell ends inside the viewport at ' + w + 'px (no clipped disclaimer)',
      spill <= 1, spill + 'px past the bottom');
  chk('the legal disclaimer is visible at ' + w + 'px',
      await page.evaluate(`(()=>{ const d=document.querySelector('.canvas .disclaim');
        if(!d) return false; const r=d.getBoundingClientRect();
        return r.bottom <= innerHeight + 1 && r.height > 0; })()`));

  /* 811: the shell must USE the monitor. main caps at 1400px and centres,
     which left an ultrawide with black bars either side and the photograph
     floating small in a large empty stage. */
  const fill = await page.evaluate(`(()=>{ const s=document.querySelector('.shell');
    return s ? Math.round(s.getBoundingClientRect().width) : 0; })()`);
  chk('the shell spans the full window at ' + w + 'px (no centred 1400px cap)',
      fill >= w - 2, fill + ' of ' + w + 'px');
  const img = await page.evaluate(`(()=>{ const i=document.querySelector('.canvas .stage img'),
      st=document.querySelector('.canvas .stage');
    if(!i||!st) return null; const a=i.getBoundingClientRect(), b=st.getBoundingClientRect();
    return { fill: Math.round(100*(a.width*a.height)/(b.width*b.height)),
             w: Math.round(a.width) }; })()`);
  chk('the photograph scales UP to fill its stage at ' + w + 'px',
      img && img.fill >= 45, img ? (img.fill + '% of the stage, ' + img.w + 'px wide') : 'no image');
}

// tab switching must not throw — #vzBar was deleted in 810 and tab() referenced it
await page.click('#tabPresent'); await page.waitForTimeout(120);
await page.click('#tabPrep');    await page.waitForTimeout(120);
chk('switching Present <-> Prep does not throw (the old #vzBar is gone)',
    pageErrors.length === 0, pageErrors.join(' | '));

// ── 8. nothing threw ──────────────────────────────────────────────────────
chk('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));

/* Write the picture. Assertions prove structure; only a render shows whether
   the thing reads — 628 shipped 347 green assertions over a checkbox whose
   shape meant the opposite of what was intended. */
if (process.env.GATE_SHOTS) {
  for (const [name, w, h] of [['wide', 2000, 1100], ['desk', 1440, 900], ['ipad', 1194, 834]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    await page.screenshot({ path: process.env.GATE_SHOTS + '/viz-' + name + '.png' });
  }
  console.log('  (screenshots written to ' + process.env.GATE_SHOTS + ')');
}

/* ── 9. the fence: a NON-ADMIN must never see the CompanyCam tab ──────────
   The route answers 403 to anyone who is not an admin. A tab that is drawn and
   then returns nothing reads as broken software rather than as a permission,
   and this check is what keeps the two in step. Its own context, because the
   probe runs once at sign-in. */
{
  const ctx2 = await browser.newContext({ viewport:{ width:1440, height:900 } });
  const p2 = await ctx2.newPage();
  const err2 = [];
  p2.on('pageerror', e => err2.push(String(e)));
  await p2.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://viz.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200, body:''});
  });
  await p2.addInitScript(mock());
  await p2.addInitScript('window.__ccAdmin = false;');
  await p2.goto('https://viz.test/', { waitUntil:'domcontentloaded' });
  await p2.waitForTimeout(700);
  const asRep = await p2.evaluate(`({
    hidden: !document.getElementById('vzSrcCC') ||
            document.getElementById('vzSrcCC').classList.contains('hide'),
    probed: (window.__cc||[]).some(c=>c.body.action==='tags'),
    listed: (window.__cc||[]).some(c=>c.body.action==='list'),
    fetched:(window.__cc||[]).some(c=>c.body.action==='fetch')
  })`);
  chk('a 403 from the route leaves the CompanyCam tab HIDDEN', asRep.hidden === true);
  chk('it still asked — the ANSWER hides it, not a client-side role guess',
      asRep.probed === true);
  chk('nothing was listed or fetched for a non-admin',
      asRep.listed === false && asRep.fetched === false);
  chk('a refused probe throws nothing at the user', err2.length === 0, err2.join(' | '));
  await ctx2.close();
}

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.n + (c.d ? ('   [' + c.d + ']') : '')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
