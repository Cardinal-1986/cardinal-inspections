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
];
const RENDERS = [
  { id:'r1', job_id:'j-done', title:'Onyx Black', source_path:'projects/p1/front.jpg',
    render_path:'visualizer/j-done/render.jpg', preview_path:'visualizer/j-done/preview.jpg',
    selections:JOBS[0].selections, approved:false, created_at:'2026-08-14T22:07:40Z' },
  { id:'r2', job_id:'j-done2', title:'Onyx Black + Harbor Blue', source_path:'projects/p1/front.jpg',
    render_path:'visualizer/j-done2/render.jpg', preview_path:'visualizer/j-done2/preview.jpg',
    selections:JOBS[1].selections, approved:false, created_at:'2026-08-14T22:15:40Z' },
];

/* The stub records every call so the gate can assert on what the page DID,
   not on what its source says it would do. */
function mock() {
  return `
window.__calls = [];
window.__signed = [];
window.confirm = function(){ window.__calls.push({op:'confirm'}); return true; };
window.supabase = { createClient: function(){ return {
  auth:{ getSession:function(){ return Promise.resolve({data:{session:{user:{email:'theo@cardinalrenovations.net'}}}}); },
         signOut:function(){ return Promise.resolve({}); } },
  from:function(t){
    var rows = { oc_colors:${JSON.stringify(OC)}, materials:${JSON.stringify(MAT)},
                 projects:[{id:'p1',name:'James Tiege',stage:'Prospect'}],
                 project_photos:[{id:'ph1',storage_path:'projects/p1/front.jpg',caption:'Front elevation',created_at:'2026-08-02'}],
                 design_jobs:${JSON.stringify(JOBS)}, design_renders:${JSON.stringify(RENDERS)} }[t] || [];
    var b = {};
    ['select','order','limit','eq','not','is'].forEach(function(m){ b[m] = function(){ return b; }; });
    b.then = function(ok){ return Promise.resolve({data:rows,error:null}).then(ok); };
    b.maybeSingle = function(){ return Promise.resolve({data:rows[0]||null,error:null}); };
    return {
      select:function(){ return b; },
      insert:function(v){ window.__calls.push({op:'insert',table:t,value:v}); return b; },
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
      return Promise.resolve({data:files.map(function(f){ return {name:f}; }),error:null}); }
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
const acts = await page.evaluate(`[...document.querySelectorAll('.rcard .acts button')].map(b=>b.textContent)`);
chk('Delete and Again are VISIBLE buttons on the card, not behind a menu',
    acts.includes('Delete') && acts.includes('Again'), JSON.stringify(acts));
chk('the delete button is on screen and big enough to hit',
    await page.evaluate(`(()=>{ const b=document.querySelector('.rcard .acts .del');
      if(!b) return false; const r=b.getBoundingClientRect();
      return r.width > 40 && r.height >= 32 && getComputedStyle(b).opacity === '1'; })()`));
chk('the old hidden dot menu is gone', !(await has('.rcard .more')));
await page.click('.rcard .acts .del');
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
    const c=[...document.querySelectorAll('.rcard .open')][0]; if(c) c.click();
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

  await page.click('#vzNext');
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

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.n + (c.d ? ('   [' + c.d + ']') : '')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
