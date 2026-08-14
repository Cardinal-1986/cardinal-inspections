/* gate_808 — the queue says why nothing is happening.

   807 shipped a grey "queued" chip that never changed. Theo hit it within ten
   minutes of the first real use and had to ask me to query the database, which
   a rep cannot do. This gate covers the sentence that replaced the silence.

   Four states, and getting any of them wrong is its own bug:

     never connected   no worker has ever claimed anything  -> say so, and how to start it
     asleep            a worker HAS claimed before          -> say when it was last seen
     just queued       under three minutes old              -> say NOTHING (crying wolf)
     nothing queued    -> say nothing

   Negative control:  node gate_808.mjs <the 807 file from main>  ->  must go RED.

   Usage:
     node gate_808.mjs                    # the shipped file -> GREEN
     node gate_808.mjs <path>             # control                                   */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 120000);

const TARGET = process.argv[2] || '/home/user/cardinal-inspections/visualizer/index.html';
const APP = readFileSync(TARGET, 'utf8');
const checks = [];
const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });

const ago = ms => new Date(Date.now() - ms).toISOString();
const MIN = 60000, HOUR = 3600000;

function mock(jobs) {
  return `window.__delays=[];
(function(){ var _st = window.setTimeout;
  window.setTimeout = function(f, d){ if(d >= 5000) window.__delays.push(d); return _st.apply(window, arguments); };
})();
window.supabase={createClient:function(){return{
 auth:{getSession:function(){return Promise.resolve({data:{session:{user:{email:'theo@cardinalrenovations.net'}}}})},
       signOut:function(){return Promise.resolve({})}},
 from:function(t){var rows={
   oc_colors:[{id:'oc1',name:'Brownwood',hex:'#5A4634',product_line:'Duration',status:'current',description:'warm brown',sort_order:1,hidden:false}],
   materials:[{id:'m1',category:'siding',manufacturer:'James Hardie',product_line:'HardiePlank',color_name:'Arctic White',hex:'#F2F2EE',finish:null,prompt:'p',negative:'',status:'current',sort_order:1}],
   projects:[{id:'p1',name:'James Tiege',stage:'Prospect'}],
   project_photos:[{id:'ph1',storage_path:'projects/p1/front.jpg',caption:'Front',created_at:'2026-08-02'}],
   design_jobs:${JSON.stringify(jobs)},
   design_renders:[]}[t]||[];
  var b={};['select','order','limit','eq','not','is'].forEach(function(m){b[m]=function(){return b}});
  b.then=function(ok){return Promise.resolve({data:rows,error:null}).then(ok)};
  b.maybeSingle=function(){return Promise.resolve({data:rows[0]||null,error:null})};
  return {select:function(){return b},insert:function(){return b},update:function(){return b}};},
 storage:{from:function(){return{createSignedUrl:function(p){return Promise.resolve({data:{signedUrl:'https://stub.invalid/'+p}})}}}}
}}};`;
}

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function look(jobs) {
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('https://viz.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});
  });
  await page.addInitScript(mock(jobs));
  await page.goto('https://viz.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.evaluate(`(async()=>{ const s=document.getElementById('vzProject');
    if(s){ s.value='p1'; s.dispatchEvent(new Event('change')); }
    await new Promise(r=>setTimeout(r,500)); })()`);
  const out = await page.evaluate(`(()=>{
    const el = document.getElementById('vzWait');
    if(!el) return { missing:true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    /* Score against what is ACTUALLY painted behind the text — walk up until
       something opaque. background-color alone lies when an ancestor paints. */
    let ground = null, n = el;
    while(n){ const c = getComputedStyle(n).backgroundColor;
      const m = c && c.match(/rgba?\\(([^)]+)\\)/);
      if(m){ const p = m[1].split(',').map(Number);
        if(p.length < 4 || p[3] === 1){ ground = 'rgb('+p[0]+', '+p[1]+', '+p[2]+')'; break; } }
      n = n.parentElement; }
    return { missing:false,
             shown: r.width>0 && r.height>0 && cs.display!=='none',
             text: (el.innerText||'').replace(/\\s+/g,' ').trim(),
             ink: cs.color, ground: ground,
             delays: (window.__delays||[]).slice(-4) };
  })()`);
  await ctx.close();
  return out;
}
/* Returns null rather than throwing when either colour is missing. The first
   version assumed both were strings; pointed at 807, where #vzWait does not
   exist, it threw and the whole control died before printing a single line.
   BUG_CLASSES 37 — a control that crashes proves nothing. */
function ratio(rgbA, rgbB) {
  if (typeof rgbA !== 'string' || typeof rgbB !== 'string') return null;
  const p = s => (s.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number);
  const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const L = a => 0.2126*lin(a[0]) + 0.7152*lin(a[1]) + 0.0722*lin(a[2]);
  let l1 = L(p(rgbA)), l2 = L(p(rgbB));
  if (l1 < l2) [l1, l2] = [l2, l1];
  return (l1 + 0.05) / (l2 + 0.05);
}

// ── 1. never connected — the state Theo actually hit ───────────────────────
const never = await look([
  { id:'j1', status:'queued', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Onyx Black'}},
    created_at: ago(10*MIN), claimed_at:null, error:null, render_path:null, preview_path:null, duration_ms:null },
  { id:'j2', status:'queued', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Onyx Black'},siding:{name:'Deep Ocean'}},
    created_at: ago(9*MIN), claimed_at:null, error:null, render_path:null, preview_path:null, duration_ms:null },
]);
chk('the waiting banner exists at all', !never.missing);
chk('never-connected: the banner is shown', never.shown === true);
chk('never-connected: it says the render machine has never connected',
    /never connected/i.test(never.text || ''), (never.text||'').slice(0,110));
chk('never-connected: it says nothing is lost', /nothing is lost/i.test(never.text||''));
chk('never-connected: it gives the command that fixes it',
    /visualizer_worker\.py/.test(never.text||''), (never.text||'').slice(-90));
chk('never-connected: it counts the waiting jobs correctly',
    /these 2 are/.test(never.text||''), (never.text||'').slice(0,150));
chk('never-connected: it does NOT invent a last-seen time',
    !/last picked up/i.test(never.text||''));
{ const r = ratio(never.ink, never.ground);
  chk('the banner text clears 4.5:1 on the ground Chromium actually paints',
      r !== null && r >= 4.5,
      r === null ? ('no banner to measure — ink=' + never.ink + ' ground=' + never.ground)
                 : (never.ink + ' on ' + never.ground + ' = ' + r.toFixed(2) + ':1')); }

// ── 2. asleep — a worker HAS been seen ─────────────────────────────────────
const asleep = await look([
  { id:'j1', status:'queued', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Onyx Black'}},
    created_at: ago(10*MIN), claimed_at:null, error:null, render_path:null, preview_path:null, duration_ms:null },
  { id:'j0', status:'done', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Driftwood'}},
    created_at: ago(3*HOUR), claimed_at: ago(3*HOUR), error:null,
    render_path:'visualizer/j0/render.jpg', preview_path:'visualizer/j0/preview.jpg', duration_ms:41000 },
]);
chk('asleep: the banner is shown', asleep.shown === true);
chk('asleep: it reports when the machine was last seen',
    /last picked up a job on/i.test(asleep.text||''), (asleep.text||'').slice(0,120));
chk('asleep: it does NOT claim the machine has never connected',
    !/never connected/i.test(asleep.text||''), (asleep.text||'').slice(0,120));
chk('asleep: singular wording for one job', /this one goes/.test(asleep.text||''),
    (asleep.text||'').slice(-70));

// ── 3. just queued — silence, or the banner is noise ───────────────────────
const fresh = await look([
  { id:'j1', status:'queued', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Onyx Black'}},
    created_at: ago(30000), claimed_at:null, error:null, render_path:null, preview_path:null, duration_ms:null },
]);
chk('just queued: NO banner — 30 seconds is not a fault', fresh.shown === false,
    'text=' + (fresh.text||''));
chk('just queued: still polls fast (6s), not backed off',
    (fresh.delays||[]).includes(6000), JSON.stringify(fresh.delays));

// ── 4. a stalled queue must not hammer the database forever ────────────────
chk('stalled: polling backs off to 30s instead of 10 requests a minute',
    (never.delays||[]).includes(30000) && !(never.delays||[]).includes(6000),
    JSON.stringify(never.delays));

// ── 5. nothing queued -> nothing said ──────────────────────────────────────
const done = await look([
  { id:'j0', status:'done', source_path:'projects/p1/front.jpg', selections:{roof:{name:'Driftwood'}},
    created_at: ago(3*HOUR), claimed_at: ago(3*HOUR), error:null,
    render_path:'visualizer/j0/render.jpg', preview_path:'visualizer/j0/preview.jpg', duration_ms:41000 },
]);
chk('nothing queued: no banner', done.shown === false, 'text=' + (done.text||''));

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
