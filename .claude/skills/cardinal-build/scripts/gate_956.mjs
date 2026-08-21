/* gate_956.mjs — the menu is symmetric (build 956).
   956 is one rule: the Insurance section is hidden unless the portal IS
   insurance (it used to hide only in retail). The whole five-portal x
   four-section matrix rides along, because a symmetry claim is only worth
   anything if every cell is checked — the control proves the three cells
   that changed (insurance shown in production / community / sales).
     1. SCOPING — Production shows ONLY in the production portal, Community
        ONLY in community, Insurance not in retail, Sell in retail AND on the
        Sales Floor (the 954 regression this build repairs)
     2. THE DOORS SURVIVE — every portal stays reachable when its section is
        hidden: the Production row in Daily, the CRM switcher, Cardinal Truth
     3. SUPPLIERS — lives in Daily now, visible in EVERY portal
     4. NO COLLATERAL — Daily/Resources never hide; hiding a section never
        un-hides a row some other rule hid (coach stays hidden)
   Usage: node gate_956.mjs [path] — previous build = negative control (must
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

/* portalNow reads crmHead||crm; set BOTH, the way skin() does (BUG_CLASSES 55) */
async function portal(p){
  await page.evaluate(p=>{ document.body.dataset.crm=p; document.body.dataset.crmHead=p; }, p);
  await page.waitForTimeout(800);
}
function sec(name){
  return page.evaluate(name=>{
    const m=document.getElementById('navMenu'); if(!m) return {miss:true};
    const all=[...m.querySelectorAll('.navsec')].filter(s=>s.textContent.trim()===name);
    if(!all.length) return {miss:true};
    const s=all[all.length-1];
    const rows=[]; let w=s.nextElementSibling;
    while(w&&!(w.classList&&w.classList.contains('navsec'))){
      if(w.classList&&w.classList.contains('navopt')) rows.push({nav:w.getAttribute('data-nav')||w.id,hidden:w.style.display==='none'});
      w=w.nextElementSibling;
    }
    return {hidden:s.style.display==='none', rows};
  }, name);
}
function rowShown(nav){
  return page.evaluate(nav=>{
    const b=document.querySelector('#navMenu .navopt[data-nav="'+nav+'"]');
    return b?{hidden:b.style.display==='none'}:{miss:true};
  }, nav);
}

/* ── 1: scoping, portal by portal ── */
/* true = the section must be HIDDEN in that portal. 956 made Insurance
   symmetric: hidden everywhere except the insurance portal. */
const MATRIX=[
  ['retail',     {Sell:false, Insurance:true,  Production:true,  Community:true }],
  ['insurance',  {Sell:true,  Insurance:false, Production:true,  Community:true }],
  ['production', {Sell:true,  Insurance:true,  Production:false, Community:true }],
  ['community',  {Sell:true,  Insurance:true,  Production:true,  Community:false}],
  ['sales',      {Sell:false, Insurance:true,  Production:true,  Community:true }],
];
for(const [p, want] of MATRIX){
  await portal(p);
  for(const [name, shouldHide] of Object.entries(want)){
    const s=await sec(name);
    need('in '+p+': '+name+' is '+(shouldHide?'hidden':'shown'),
      !s.miss && s.hidden===shouldHide, s.miss?'section missing':('hidden='+s.hidden));
  }
  /* 3: Suppliers is in Daily and never hides */
  const sup=await rowShown('suppliers');
  need('in '+p+': Suppliers is reachable', !sup.miss && !sup.hidden, JSON.stringify(sup));
  /* 4: Daily never hides */
  const daily=await sec('Daily');
  need('in '+p+': Daily never hides', !daily.miss && !daily.hidden);
}

/* ── 2: the doors into each portal survive ── */
await portal('retail');
const doors=await page.evaluate(()=>({
  productionRow: !!document.querySelector('#navMenu #cr-nav-production') ,
  productionShown: (()=>{const b=document.querySelector('#navMenu #cr-nav-production'); return b?b.style.display!=='none':false;})(),
  cardinalTruth: (()=>{const b=document.querySelector('#navMenu .navopt[data-nav="cardinaltruth"]'); return b?b.style.display!=='none':false;})(),
  crmSwitcher: !!document.querySelector('#cr-lnav .lnav-crm button[data-crm="community"]'),
}));
need('the Production row in Daily is the door into production', doors.productionRow && doors.productionShown, JSON.stringify(doors));
need('Cardinal Truth stays reachable in retail', doors.cardinalTruth);
need('the CRM switcher (door to community) is present', doors.crmSwitcher);

/* Suppliers must be OUT of the Production section. ⚠ For an ADMIN it does not
   end up in Daily either — reorg() relocates it under Admin (the 508 rule), and
   an assert expecting Daily here fails correct code. The Daily placement is
   proven in the non-admin boot below, where reorg leaves it alone. */
const prodRows=(await sec('Production')).rows.map(r=>r.nav);
need('Suppliers is out of the Production section', !prodRows.includes('suppliers'), prodRows.join(','));

/* ── 4: no collateral — coach stays hidden through a portal round-trip ── */
await portal('insurance'); await portal('retail');
const coach=await rowShown('coach');
need('Objection Coach stays hidden after a portal round-trip', !coach.miss && coach.hidden, JSON.stringify(coach));

await page.close();

/* ── 5: as SCOTTIE (non-admin) Suppliers sits in DAILY and shows in every portal ── */
const p2=await browser.newPage({viewport:{width:1440,height:900}});
await p2.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await p2.addInitScript(SETUP);
await p2.goto('https://sentinel.test/?as=scottie',{waitUntil:'domcontentloaded'});
await p2.waitForTimeout(2600);
await p2.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';});
await p2.waitForTimeout(1800);
const crewDaily=await p2.evaluate(()=>{
  const m=document.getElementById('navMenu'); if(!m) return null;
  const s=[...m.querySelectorAll('.navsec')].find(x=>x.textContent.trim()==='Daily');
  if(!s) return null;
  const rows=[]; let w=s.nextElementSibling;
  while(w&&!(w.classList&&w.classList.contains('navsec'))){
    if(w.classList&&w.classList.contains('navopt')) rows.push(w.getAttribute('data-nav')||w.id);
    w=w.nextElementSibling;
  }
  return rows;
});
need('for the crew, Suppliers sits in Daily', !!crewDaily && crewDaily.includes('suppliers'), crewDaily?crewDaily.join(','):'no Daily');
/* and it survives being in the community portal, where Production is hidden */
await p2.evaluate(()=>{ document.body.dataset.crm='community'; document.body.dataset.crmHead='community'; });
await p2.waitForTimeout(800);
const crewSup=await p2.evaluate(()=>{
  const b=document.querySelector('#navMenu .navopt[data-nav="suppliers"]');
  return b?{hidden:b.style.display==='none'}:{miss:true};
});
need('for the crew, Suppliers stays reachable in the community portal', !crewSup.miss && !crewSup.hidden, JSON.stringify(crewSup));
await p2.close();

await browser.close();
console.log('gate_956 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
