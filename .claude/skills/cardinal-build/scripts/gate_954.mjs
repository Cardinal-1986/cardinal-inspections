/* gate_954.mjs — the Insurance tools move into the menu (build 954).
     1. COVERAGE FIRST — every destination the retired hub Tools rail carried
        still has a door in the menu. This assert is the licence for the cut:
        if it fails, a door was retired with no twin (the prime doctrine).
     2. RAIL GONE — the Cardinal Truth screen renders no .cr-cth-tools tool
        tiles, while the dashboard it belongs to (owed card, pipeline, chase)
        and the Insurance Clients LEAD tile are untouched
     3. AUTO-OPEN — switching INTO insurance opens the menu's Insurance
        section (shared fold store), and a user collapse afterwards STICKS
        (a state re-asserted every pass would be a repaint loop)
     4. PORTAL SECTIONS — Insurance hides in Retail; Sell shows only in
        Retail; Cardinal Truth (the door back) survives in retail's CRMs
   Usage: node gate_954.mjs [path] — previous build = negative control (must
   FAIL named, not crash — interactions guarded, BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2600);
await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';
  if(typeof window.showHome==='function') try{window.showHome();}catch(_){}});
await page.waitForTimeout(2600);

async function chip(k){ await page.evaluate(k=>{const b=document.querySelector('#cr-lnav .lnav-crm button[data-crm="'+k+'"]'); if(b)b.click();},k); await page.waitForTimeout(1000); }
function menuNavs(){ return page.evaluate(()=>[...document.querySelectorAll('#navMenu .navopt')].map(b=>b.getAttribute('data-nav')||b.id)); }

/* ── 1: COVERAGE — the licence for retiring the rail ────────────────────── */
await chip('insurance');
const navs=await menuNavs();
/* the eight the rail carried; `claims` is the menu's claimstracker, `board`
   has lived under Daily since 951 deliberately did not repeat it. */
const NEEDED=[['sol','sol'],['library','library'],['supplements','supplements'],
  ['insresources','insresources'],['adjusters','adjusters'],['claims','claimstracker'],
  ['desk','desk'],['board','board']];
const missing=NEEDED.filter(([rail,menu])=>!navs.includes(menu));
need('every retired Tools destination still has a menu door',
  missing.length===0, missing.map(m=>m[0]).join(','));

/* ── 2: the hub renders no tool tiles, but keeps its dashboard ──────────── */
const hub=await page.evaluate(()=>{
  if(typeof window.showCardinalTruth==='function'){ try{ window.showCardinalTruth(); }catch(_){} }
  return null;
});
await page.waitForTimeout(1800);
const hubState=await page.evaluate(()=>{
  const v=document.getElementById('cardinalTruthView');
  if(!v || v.style.display==='none') return {closed:true};
  const rendered=!!v.querySelector('.cr-cth-wrap');
  const toolTiles=[...v.querySelectorAll('.cr-cth-tools button')]
    .map(b=>b.getAttribute('data-go')).filter(Boolean);
  return {
    rendered,
    toolTiles,
    rules:[...v.querySelectorAll('.cr-cth-rule')].map(r=>r.textContent.trim()),
    owed: !!v.querySelector('.cr-cth-owed'),
    chase: !!v.querySelector('.cr-cth-chase'),
    leadClients: !!v.querySelector('.cr-cth-tools.lead [data-go="clients"]'),
  };
});
need('the Cardinal Truth dashboard still renders', !!hubState && hubState.rendered, JSON.stringify(hubState).slice(0,90));
need('no Tools heading remains on the hub',
  !!hubState && !hubState.closed && !hubState.rules.some(r=>/^tools$/i.test(r)),
  hubState&&hubState.rules?hubState.rules.join(','):'');
/* the tool tiles are gone; the LEAD Insurance Clients tile is not a tool tile */
need('no tool tiles remain on the hub',
  !!hubState && hubState.toolTiles.filter(g=>g!=='clients').length===0,
  hubState?hubState.toolTiles.join(','):'');
need('the Insurance Clients lead tile survives', !!hubState && hubState.leadClients);
need('the owed card and chase list are untouched', !!hubState && hubState.owed && hubState.chase);

/* ── 3: auto-open on entering insurance, and a collapse that sticks ─────── */
await page.evaluate(()=>{ try{ localStorage.setItem('cardinal.lnav.sections', JSON.stringify({insurance:0})); }catch(_){ } });
await chip('retail');
await chip('insurance');
const opened=await page.evaluate(()=>{
  let st={}; try{ st=JSON.parse(localStorage.getItem('cardinal.lnav.sections')||'{}'); }catch(_){}
  const h=document.getElementById('cr-lnav');
  const sec=h?[...h.querySelectorAll('.lnav-sec')].find(s=>String(s.textContent||'').replace(/[^A-Za-z ]/g,'').trim()==='Insurance'):null;
  return { store:st.insurance, expanded: sec?sec.getAttribute('aria-expanded'):null };
});
need('entering insurance opens the Insurance section', opened.store===1 && opened.expanded==='true',
  'store='+opened.store+' aria='+opened.expanded);
/* collapse it by hand — the next pass must NOT re-open it (no forced state) */
await page.evaluate(()=>{
  const h=document.getElementById('cr-lnav');
  const sec=h?[...h.querySelectorAll('.lnav-sec')].find(s=>String(s.textContent||'').replace(/[^A-Za-z ]/g,'').trim()==='Insurance'):null;
  if(sec) sec.click();
});
await page.waitForTimeout(1400);
const stuck=await page.evaluate(()=>{
  let st={}; try{ st=JSON.parse(localStorage.getItem('cardinal.lnav.sections')||'{}'); }catch(_){}
  return st.insurance;
});
need('a manual collapse STICKS while you stay in insurance', stuck===0, String(stuck));

/* ── 4: portal sections ─────────────────────────────────────────────────── */
function secShown(name){
  return page.evaluate(name=>{
    const m=document.getElementById('navMenu'); if(!m) return null;
    const secs=[...m.querySelectorAll('.navsec')].filter(s=>s.textContent.trim()===name);
    if(!secs.length) return {miss:true};
    const sec=secs[secs.length-1];
    const rows=[]; let w=sec.nextElementSibling;
    while(w&&!(w.classList&&w.classList.contains('navsec'))){
      if(w.classList&&w.classList.contains('navopt')) rows.push({nav:w.getAttribute('data-nav'),hidden:w.style.display==='none'});
      w=w.nextElementSibling;
    }
    return {hidden:sec.style.display==='none', rows};
  }, name);
}
let ins=await secShown('Insurance'), sell=await secShown('Sell');
need('in insurance: the Insurance section shows', !ins.miss && !ins.hidden);
need('in insurance: Sell hides', !sell.miss && sell.hidden);
await chip('retail');
ins=await secShown('Insurance'); sell=await secShown('Sell');
need('in retail: the Insurance section hides', !ins.miss && ins.hidden, ins.miss?'no section':'shown');
need('in retail: every Insurance row hides too', !ins.miss && ins.rows.every(r=>r.hidden),
  ins.miss?'':ins.rows.filter(r=>!r.hidden).map(r=>r.nav).join(','));
need('in retail: Sell shows', !sell.miss && !sell.hidden);
const ct=await page.evaluate(()=>{
  const b=document.querySelector('#navMenu .navopt[data-nav="cardinaltruth"]');
  return b?{hidden:b.style.display==='none'}:{miss:true};
});
need('in retail: Cardinal Truth (the door back) is NOT hidden', !ct.miss && !ct.hidden, JSON.stringify(ct));
const railRetail=await page.evaluate(()=>{
  const h=document.getElementById('cr-lnav'); if(!h) return null;
  return [...h.querySelectorAll('.lnav-sec')].map(s=>String(s.textContent||'').replace(/[^A-Za-z ]/g,'').trim());
});
need('the retail rail shows Sell and no Insurance section',
  !!railRetail && railRetail.includes('Sell') && !railRetail.includes('Insurance'),
  railRetail?railRetail.join(','):'');

await browser.close();
console.log('gate_954 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
