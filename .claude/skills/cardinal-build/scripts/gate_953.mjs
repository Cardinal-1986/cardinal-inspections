/* gate_953.mjs — the menu learns the portals (build 953).
     1. SECTIONS — a Production section (Production Board, Crew Dispatch,
        Punch & Repairs, Suppliers moved from Sell) and a Community section
        (injected Hub/Partners/Prospects + static New Bid); CRMs keeps
        Cardinal Truth; the Insurance section (951) is intact
     2. ROUTING — each new row reaches its real destination, spied
     3. SELL HIDES — visible in Retail; hidden (heading + rows) in Insurance,
        Community, and Production (via crmHead); restored on return to Retail
        WITHOUT un-hiding Objection Coach (reorg's own hide must survive)
     4. RAIL — in Insurance the rail scrape has no Sell section but has
        Production and Community; no new label falls to the generic icon
   Usage: node gate_953.mjs [path] — previous build = negative control (must
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
await page.waitForTimeout(2600); /* community rows arrive on cr-menu-script's poll */

function secRows(name){
  return page.evaluate(name=>{
    const m=document.getElementById('navMenu'); if(!m) return null;
    const sec=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()===name);
    if(!sec) return null;
    const rows=[]; let w=sec.nextElementSibling;
    while(w&&!(w.classList&&w.classList.contains('navsec'))){
      if(w.classList&&w.classList.contains('navopt'))
        rows.push({nav:w.getAttribute('data-nav'),id:w.id||'',txt:(w.textContent||'').trim().slice(0,26),hidden:w.style.display==='none'});
      w=w.nextElementSibling;
    }
    return {hidden:sec.style.display==='none', rows};
  }, name);
}

/* ── 1: structure ── */
const prod=await secRows('Production');
need('a Production section exists', !!prod);
/* as an ADMIN, reorg() relocates Suppliers under Admin (508's rule) — the
   suppliers-in-Production assert runs in the scottie boot at the end. */
need('it holds Board / Dispatch / Punch',
  !!prod && ['prodboard','dispatch','punch'].every(n=>prod.rows.some(r=>r.nav===n)),
  prod?prod.rows.map(r=>r.nav).join(','):'');
const com=await secRows('Community');
need('a Community section exists', !!com);
need('it holds the injected Hub / Partners / Prospects and New Bid',
  !!com && ['cr-nav-communityhub','cr-nav-communitypartners','cr-nav-communityprospects'].every(id=>com.rows.some(r=>r.id===id))
        && com.rows.some(r=>r.nav==='newbid'),
  com?com.rows.map(r=>r.id||r.nav).join(','):'');
const crms=await secRows('CRMs');
need('CRMs keeps Cardinal Truth (and only its own rows)', !!crms && crms.rows.some(r=>r.nav==='cardinaltruth')
  && !crms.rows.some(r=>r.id==='cr-nav-communityhub'), crms?crms.rows.map(r=>r.id||r.nav).join(','):'');
const ins=await secRows('Insurance');
need('the 951 Insurance section is intact', !!ins && ins.rows.length===7, ins?String(ins.rows.length):'');
const sellSuppliers=await page.evaluate(()=>{
  const m=document.getElementById('navMenu');
  const sec=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()==='Sell');
  let w=sec?sec.nextElementSibling:null;
  while(w&&!(w.classList&&w.classList.contains('navsec'))){
    if(w.getAttribute&&w.getAttribute('data-nav')==='suppliers') return true;
    w=w.nextElementSibling;
  }
  return false;
});
need('Suppliers is no longer inside Sell', !sellSuppliers);

/* ── 2: routing, spied ── */
await page.evaluate(()=>{ window.__calls=[];
  window.CardinalProduction={open:()=>window.__calls.push('prod')};
  window.CardinalDispatch={open:()=>window.__calls.push('disp')};
  window.openPunchView=()=>window.__calls.push('punch');
  window.CardinalNewBid={open:()=>window.__calls.push('bid')};
  window.CardinalCommunityHub={show:()=>window.__calls.push('hub')};
  window.CardinalCommunityPartners={openDirectory:()=>window.__calls.push('partners'),openProspects:()=>window.__calls.push('prospects')}; });
for(const sel of ['[data-nav="prodboard"]','[data-nav="dispatch"]','[data-nav="punch"]','[data-nav="newbid"]','#cr-nav-communityhub','#cr-nav-communitypartners','#cr-nav-communityprospects']){
  const ok=await page.evaluate(sel=>{const b=document.querySelector('#navMenu '+sel); if(!b) return false; b.click(); return true;}, sel);
  need('row '+sel+' exists and was clicked', ok);
}
await page.waitForTimeout(400); /* makeOpt handlers fire on a 50ms timeout */
const calls=await page.evaluate(()=>window.__calls);
need('all seven rows route to their real destinations',
  JSON.stringify(calls)===JSON.stringify(['prod','disp','punch','bid','hub','partners','prospects']), JSON.stringify(calls));

/* ── 3: Sell hides per portal ── */
async function sellState(){ const s=await secRows('Sell'); return s?{hidden:s.hidden, rows:s.rows}:null; }
async function chip(k){ await page.evaluate(k=>{const b=document.querySelector('#cr-lnav .lnav-crm button[data-crm="'+k+'"]'); if(b)b.click();},k); await page.waitForTimeout(900); }
let s=await sellState();
need('Sell is visible in Retail', !!s && !s.hidden);
await chip('insurance'); s=await sellState();
need('Sell heading hides in Insurance', !!s && s.hidden);
need('every Sell row hides in Insurance', !!s && s.rows.every(r=>r.hidden), s?s.rows.filter(r=>!r.hidden).map(r=>r.nav||r.txt).join(','):'');
await chip('community'); s=await sellState();
need('Sell stays hidden in Community', !!s && s.hidden);
await page.evaluate(()=>{ document.body.dataset.crmHead='production'; });
await page.waitForTimeout(700); s=await sellState();
need('Sell hides in Production (crmHead)', !!s && s.hidden);
await page.evaluate(()=>{ delete document.body.dataset.crmHead; document.body.dataset.crm='retail'; });
await page.waitForTimeout(700);
await chip('retail'); s=await sellState();
need('Sell returns in Retail', !!s && !s.hidden);
need('...but Objection Coach STAYS hidden (reorg’s hide survives the round-trip)',
  !!s && s.rows.some(r=>r.nav==='coach'&&r.hidden), s?s.rows.filter(r=>r.nav==='coach').map(r=>String(r.hidden)).join(','):'no coach row');

/* ── 4: the rail in Insurance ── */
await chip('insurance');
await page.waitForTimeout(900);
const rail=await page.evaluate(()=>{
  const h=document.getElementById('cr-lnav'); if(!h) return null;
  const names=[...h.querySelectorAll('.lnav-sec')].map(s=>String(s.textContent||'').replace(/[^A-Za-z ]/g,'').trim());
  const keys=['productionboard','crewdispatch','punchrepairs','newbid'];
  const generic=keys.filter(k=>{const el=h.querySelector('.lnav-item[data-k="'+k+'"]');
    if(!el) return true; const svg=el.querySelector('svg.i2'); return !svg||/r="4\.6"/.test(svg.innerHTML);});
  return {names, generic};
});
need('the rail in Insurance has NO Sell section', !!rail && !rail.names.includes('Sell'), rail?rail.names.join(','):'');
need('the rail has Production and Community sections', !!rail && rail.names.includes('Production') && rail.names.includes('Community'), rail?rail.names.join(','):'');
need('no new label falls to the generic icon', !!rail && rail.generic.length===0, rail?rail.generic.join(','):'');

await page.close();

/* ── 5: as SCOTTIE (production, non-admin) Suppliers lives in Production ── */
const p2=await browser.newPage({viewport:{width:390,height:844}});
await p2.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await p2.addInitScript(SETUP);
await p2.goto('https://sentinel.test/?as=scottie',{waitUntil:'domcontentloaded'});
await p2.waitForTimeout(2600);
await p2.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';});
await p2.waitForTimeout(1600);
const crew=await p2.evaluate(()=>{
  const m=document.getElementById('navMenu'); if(!m) return null;
  const sec=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()==='Production');
  if(!sec) return null;
  const rows=[]; let w=sec.nextElementSibling;
  while(w&&!(w.classList&&w.classList.contains('navsec'))){
    if(w.classList&&w.classList.contains('navopt')) rows.push(w.getAttribute('data-nav'));
    w=w.nextElementSibling;
  }
  return rows;
});
need('for the crew (non-admin) Suppliers lives in the Production section',
  !!crew && crew.includes('suppliers'), crew?crew.join(','):'no Production section');
/* the phone drawer: a real portal switch writes BOTH crm attributes (skin()
   keeps data-crm-head authoritative) — emulate that, then Sell must hide in
   the raw menu the drawer renders. */
await p2.evaluate(()=>{ document.body.dataset.crm='insurance'; document.body.dataset.crmHead='insurance'; });
await p2.waitForTimeout(700);
/* the drawer paints .navsec/.navopt display:flex !important, so a passing
   style.display alone proved nothing (it did, once) - assert the RENDERED box
   with the menu open. */
await p2.evaluate(()=>{const b=document.getElementById('navBtn'); if(b)b.click();});
await p2.waitForTimeout(600);
const phoneSell=await p2.evaluate(()=>{
  const sec=[...document.querySelectorAll('#navMenu .navsec')].find(s=>s.textContent.trim()==='Sell');
  if(!sec) return {miss:true};
  return { disp:sec.style.display, h:Math.round(sec.getBoundingClientRect().height) };
});
need('the phone drawer hides Sell in Insurance (rendered box is gone)',
  !phoneSell.miss && phoneSell.disp==='none' && phoneSell.h===0,
  phoneSell.miss?'no sec':('display='+phoneSell.disp+' h='+phoneSell.h));
await p2.close();

await browser.close();
console.log('gate_953 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
