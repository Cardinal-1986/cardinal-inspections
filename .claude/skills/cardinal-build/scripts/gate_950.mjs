/* gate_950.mjs — sideways scrolling repaired everywhere (build 950).
   BUG_CLASSES 30 (a horizontal scroller with no overscroll-behavior-x hands
   the swipe to the page / the back gesture — struck at 697, again at 950):
     1. PUNCH TABS FIT — at 390px the four tabs fit their box with the seed's
        counts, AND still fit when every badge is forced to a two-digit "88"
        (the fit 945 promised and never had: 373px in a 358px box)
     2. PUNCH TABS CONTAIN — computed overscroll-behavior-x is 'contain'
     3. MAGNET BOARD CONTAINS — .dspscroll computed 'contain' (it pans on the
        phone by design; without containment the pan chains to iOS back-nav)
     4. STYLESHEET WALK — .cr-cth-tabs and .cd-crmbar rules each declare
        overscroll-behavior-x:contain (walked through Chromium's own parsed
        rules, the instrument comments cannot fool)
   Usage: node gate_950.mjs [path] — previous build = negative control (must
   FAIL all four named, not crash — interactions guarded, BUG_CLASSES 37). */
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
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=scottie',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1700);
await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  if(window.openPunchView) window.openPunchView();});
await page.waitForTimeout(1200);

/* ── 1+2: punch tabs ── */
const tabs=await page.evaluate(()=>{
  const t=document.getElementById('puTabs'); if(!t) return null;
  const seedFit={sw:t.scrollWidth, cw:t.clientWidth};
  /* worst case: every badge two digits */
  t.querySelectorAll('.pu-tab .n').forEach(n=>{ n.textContent='88'; });
  const wideFit={sw:t.scrollWidth, cw:t.clientWidth};
  return { seedFit, wideFit, ob:getComputedStyle(t).overscrollBehaviorX };
});
need('punch tabs found', !!tabs);
if(tabs){
  need('four tabs FIT at 390 (seed counts)', tabs.seedFit.sw<=tabs.seedFit.cw,
    tabs.seedFit.sw+' > '+tabs.seedFit.cw);
  need('still fit with every badge at "88"', tabs.wideFit.sw<=tabs.wideFit.cw,
    tabs.wideFit.sw+' > '+tabs.wideFit.cw);
  need('punch tabs contain the sideways swipe', tabs.ob==='contain', String(tabs.ob));
}

/* ── 3: the Magnet Board's pan container ── */
await page.evaluate(()=>{ if(window.CardinalDispatch&&window.CardinalDispatch.open) window.CardinalDispatch.open(); });
await page.waitForTimeout(1200);
const board=await page.evaluate(()=>{
  const el=document.getElementById('cr-disp'); if(!el||!el.classList.contains('open')) return null;
  const s=el.querySelector('.dspscroll'); if(!s) return {miss:'no .dspscroll'};
  return { ob:getComputedStyle(s).overscrollBehaviorX,
           pans:s.scrollWidth>s.clientWidth };
});
need('Magnet Board pan container contains the swipe',
  board && !board.miss && board.ob==='contain',
  board?JSON.stringify(board):'board not open');
need('board still pans at 390 (containment did not kill the scroll)',
  board && board.pans===true, board?String(board.pans):'-');

/* ── 4: stylesheet walk for the two rules not on a cheap screen ── */
const sheets=await page.evaluate(()=>{
  const out={cth:null, crmbar:null};
  for(const ss of document.styleSheets){
    let rules; try{ rules=ss.cssRules; }catch(e){ continue; }
    if(!rules) continue;
    const walk=(rs)=>{ for(const r of rs){
      if(r.selectorText){
        if(/\.cr-cth-tabs$/.test(r.selectorText)) out.cth=r.style.getPropertyValue('overscroll-behavior-x')||out.cth;
        if(/\.cd-crmbar$/.test(r.selectorText))   out.crmbar=r.style.getPropertyValue('overscroll-behavior-x')||out.crmbar;
      }
      if(r.cssRules&&r.cssRules.length) walk(r.cssRules);   /* examine THEN descend (the 685 trap) */
    } };
    walk(rules);
  }
  return out;
});
need('.cr-cth-tabs rule declares containment', sheets.cth==='contain', String(sheets.cth));
need('.cd-crmbar rule declares containment', sheets.crmbar==='contain', String(sheets.crmbar));

await browser.close();
console.log('gate_950 ['+LABEL+']  PASS '+passes+'  FAIL '+fails.length);
fails.forEach(f=>console.log('  FAIL: '+f));
process.exit(fails.length?1:0);
