/* gate_951.mjs — the Insurance tools join the slide-out menu (build 951).
   Theo's pick: 2 — ADD an Insurance section, Sell untouched, every portal.
     1. STRUCTURE — the drawer holds a section labelled "Insurance" with the
        seven tool rows, AND the original Insurance section is still renamed
        "CRMs" and still holds Cardinal Truth (renameSec renames the LAST
        matching heading — the order of the two sections is load-bearing)
     2. FOLD — the new heading folds like the others (count badge = 7, tap
        reveals the rows), and every revealed row clears the 44px tap floor
     3. ROUTING — each row reaches the same destination as its hub tile,
        proven with spies on the real globals; the Desk row NAVIGATES to
        /supplement.html (679's location.href rule)
     4. RAIL — at desktop width the left rail scrapes the section in with
        seven items, and none of the six new labels falls to the generic icon
   ⚠ REPAIRED at 998. This gate was written at 951, when the Insurance section
   was visible in every portal. Builds 954, 955 and 956 then made each section
   show ONLY in its own portal — Theo asked for it in three steps ("Insurance in
   retail first", then production/community, then "make insurance symmetric
   too"), and syncPortalSections() carries that rule with his words in its
   comment. The gate kept booting into RETAIL, where the Insurance section is
   now CORRECTLY hidden, and reported `Daily,Sell,CRMs,Resources,Admin` as if
   six things had been lost. Nothing was lost: switch to the insurance portal
   and all seven rows are there, in this exact order. Fix the gate when the
   gate is wrong; never bend the artifact to satisfy an old assumption.

   Usage: node gate_951.mjs [path] — previous build = negative control (must
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

const ROWS=['sol','library','supplements','insresources','adjusters','claimstracker','desk'];
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

/* ── phone: 390 ── */
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:u.includes('supplement.html')?'<html><body>desk</body></html>':APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';
  if(typeof window.showHome==='function') try{window.showHome();}catch(_){}});
await page.waitForTimeout(1200);
/* 998: the Insurance section lives in the INSURANCE portal (955-956). portalNow()
   reads body.dataset.crmHead || body.dataset.crm, and syncPortalSections() is
   what applies the rule — this is the app's own lever, not a staged state. */
async function portal(p){
  await page.evaluate(k=>{ document.body.dataset.crm=k; document.body.dataset.crmHead=k;
    try{ if(typeof syncPortalSections==='function') syncPortalSections(); }catch(_){ } }, p);
  await page.waitForTimeout(700);
}
await portal('insurance');

function openMenu(){ return page.evaluate(()=>{const m=document.getElementById('navMenu'); const b=document.getElementById('navBtn');
  if(m&&m.style.display!=='block'&&b) b.click();
  const m2=document.getElementById('navMenu'); return !!(m2&&m2.style.display==='block'); }); }

/* 1 — structure */
need('menu opens', await openMenu());
const struct=await page.evaluate(rows=>{
  const m=document.getElementById('navMenu'); if(!m) return null;
  const secs=[...m.querySelectorAll('.navsec')].filter(s=>s.style.display!=='none').map(s=>s.textContent.trim());
  const ins=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()==='Insurance');
  const insRows=[]; if(ins){let w=ins.nextElementSibling; while(w&&!w.classList.contains('navsec')){ if(w.classList.contains('navopt')) insRows.push(w.getAttribute('data-nav')); w=w.nextElementSibling; }}
  const crms=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()==='CRMs');
  let ctInCrms=false; if(crms){let w=crms.nextElementSibling; while(w&&!w.classList.contains('navsec')){ if(w.getAttribute&&w.getAttribute('data-nav')==='cardinaltruth') ctInCrms=true; w=w.nextElementSibling; }}
  return { secs, insRows, hasCrms:!!crms, ctInCrms,
    insCount: ins ? (ins.getAttribute('data-crcount')||'') : null,
    foldable: ins ? ins.hasAttribute('aria-expanded') : false };
}, ROWS);
need('an "Insurance" section exists', !!struct && struct.secs.includes('Insurance'), struct?struct.secs.join(','):'no menu');
need('it holds all seven tool rows in order', !!struct && JSON.stringify(struct.insRows)===JSON.stringify(ROWS), struct?struct.insRows.join(','):'');
need('the ORIGINAL section is still renamed CRMs', !!struct && struct.hasCrms);
need('Cardinal Truth still lives under CRMs (renameSec hit the right heading)', !!struct && struct.ctInCrms);

/* 2 — fold + floors */
const fold=await page.evaluate(()=>{
  const m=document.getElementById('navMenu'); if(!m) return null;
  const ins=[...m.querySelectorAll('.navsec')].find(s=>s.textContent.trim()==='Insurance');
  if(!ins) return null;
  const before=ins.getAttribute('aria-expanded');
  const cnt=ins.getAttribute('data-crcount');
  if(before==='false') ins.click();
  const rows=[]; let w=ins.nextElementSibling;
  while(w&&!w.classList.contains('navsec')){ if(w.classList.contains('navopt')){const r=w.getBoundingClientRect(); rows.push({nav:w.getAttribute('data-nav'),h:r.height,visible:r.height>0&&!w.hasAttribute('data-crhide')});} w=w.nextElementSibling; }
  return { foldable: before!==null, cnt, rows };
});
need('the heading folds like the others', !!fold && fold.foldable, fold?'aria-expanded absent':'no section');
need('its count badge says 7', !!fold && String(fold.cnt)==='7', fold?String(fold.cnt):'');
need('tapping the heading reveals all seven rows', !!fold && fold.rows.length===7 && fold.rows.every(r=>r.visible), fold?fold.rows.map(r=>r.nav+':'+(r.visible?'ok':'hidden')).join(','):'');
need('every revealed row clears the 44px tap floor', !!fold && fold.rows.length===7 && fold.rows.every(r=>r.h>=44), fold?fold.rows.map(r=>r.nav+':'+Math.round(r.h)).join(','):'');

/* 3 — routing, spied on the real globals */
await page.evaluate(()=>{ window.__calls=[];
  window.CardinalSolIntake={open:()=>window.__calls.push(['sol'])};
  window.showResourceLibrary=()=>window.__calls.push(['lib']);
  window._rlShowPage=p=>window.__calls.push(['rlpage',p]);
  window.CardinalAdjusters={open:a=>window.__calls.push(['adj',a===true])};
  window.crOpenClaimsFromHub=()=>window.__calls.push(['claims']); });
for(const nav of ['sol','library','supplements','insresources','adjusters','claimstracker']){
  await openMenu();
  const clicked=await page.evaluate(n=>{const b=document.querySelector('#navMenu .navopt[data-nav="'+n+'"]'); if(!b) return false; b.click(); return true;}, nav);
  need('row "'+nav+'" exists and was clicked', clicked);
}
const calls=await page.evaluate(()=>window.__calls);
const EXPECT=[['sol'],['lib'],['lib'],['rlpage','rlPageSup'],['lib'],['rlpage','rlPageInsHub'],['adj',true],['claims']];
need('the six spied rows route exactly like the hub tiles',
  JSON.stringify(calls)===JSON.stringify(EXPECT), JSON.stringify(calls));
await openMenu();
const deskClicked=await page.evaluate(()=>{const b=document.querySelector('#navMenu .navopt[data-nav="desk"]'); if(!b) return false; b.click(); return true;});
need('Desk row exists and was clicked', deskClicked);
if(deskClicked){ await page.waitForTimeout(900);
  need('Desk row NAVIGATES to /supplement.html (679 rule)', page.url().includes('/supplement.html'), page.url()); }
await page.close();

/* 4 — the desktop rail */
const wide=await browser.newPage({viewport:{width:1440,height:900}});
await wide.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await wide.addInitScript(SETUP);
await wide.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await wide.waitForTimeout(2200);
await wide.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';
  if(typeof window.showHome==='function') try{window.showHome();}catch(_){}});
await wide.waitForTimeout(1800);
/* 998: this is a SECOND page and it needs the portal too — the phone page's
   switch does not carry over. Booting it in retail is why the rail check
   reported the Insurance section missing while the menu check passed. */
await wide.evaluate(()=>{ document.body.dataset.crm='insurance'; document.body.dataset.crmHead='insurance';
  try{ if(typeof syncPortalSections==='function') syncPortalSections(); }catch(_){ } });
await wide.waitForTimeout(1000);
const rail=await wide.evaluate(()=>{
  const h=document.getElementById('cr-lnav'); if(!h) return null;
  /* the heading's textContent is chevron+label+count ("▼Insurance7") —
     strip everything but letters before comparing */
  const sec=[...h.querySelectorAll('.lnav-sec')].find(s=>String(s.textContent||'').replace(/[^A-Za-z ]/g,'').trim()==='Insurance');
  const keys=['scopeofloss','resourcelibrary','supplementtemplates','insuranceresources','adjusterdirectory','claimstracker','supplementdesk'];
  const items=keys.map(k=>{const el=h.querySelector('.lnav-item[data-k="'+k+'"]'); if(!el) return {k,miss:true};
    const svg=el.querySelector('svg.i2'); const html=svg?svg.innerHTML:'';
    return {k, generic:/r="4\.6"/.test(html)}; });
  return { mounted:true, hasSec:!!sec, items };
});
need('the desktop rail mounted', !!rail);
need('the rail scraped the Insurance section in', !!rail && rail.hasSec);
need('all seven items are in the rail', !!rail && rail.items.every(i=>!i.miss), rail?rail.items.filter(i=>i.miss).map(i=>i.k).join(','):'');
need('none of the new labels falls to the generic icon', !!rail && rail.items.every(i=>!i.miss&&!i.generic), rail?rail.items.filter(i=>i.generic).map(i=>i.k).join(','):'');
await wide.close();
await browser.close();

console.log('gate_951 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
