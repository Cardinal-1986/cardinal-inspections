/* render_navclear.mjs — content clears the installed app's bottom bar.
   (Was render_libnav961.mjs. Renamed at 962: it is a CLASS check now, not a
   one-build gate — see BUG_CLASSES 58.)

   Theo, on an installed iPhone PWA: "Scrolling hell again", with the sheet's
   last trade cut off behind the round button bar.

   THE MEASUREMENT THAT FOUND IT — and the one this gate keeps:
     body.standalone raises #pwaNav from its authored 160 to 9990 !important.
     #cr-est-picker was 9510. So elementFromPoint at the bottom of .box-list
     returned "#pwaNav": the last ~63px of the sheet was covered, and had been
     since the sheet was written. Build 960 is what made it fatal — with every
     section folded the list no longer overflows, so it cannot scroll, and the
     covered rows went from awkward to unreachable.

   ⚠ 962 CHANGED THE MECHANISM, AND THIS GATE NO LONGER NAMES ONE.
   961 raised a z-index. The app had already answered this twice — 595 for
   #projModal, 935 for #cr-pb-modal — with CLEARANCE and a fixed 88px constant,
   and 935 wrote down that clearance is the rule and a bigger z-index is not.
   962 reverted to that. So every assertion below tests the OUTCOME — is the
   last real content reachable, above the bar — which passes under either
   mechanism and would survive the next one. A gate pinned to the technique
   fails correct code the moment the technique changes.

   Runs at 390x844 with body.standalone forced, in BOTH states:
     1  the bar is really there and really above the sheet (the premise — if
        this stops being true the rest of this gate is measuring nothing)
     2  the sheet's own scroller carries the standalone clearance
     3  FOLDED: the list does not scroll (short) — the condition that made this
        fatal, asserted so the gate is testing the real situation
     4  FOLDED: the last real CONTENT sits above the bar's top edge (the
        padding below it may not, and need not — it is empty on purpose)
     5  FOLDED: a touch on the last section reaches the last section — an
        occlusion test, not an overlap test: the fix is z-order, so the two
        boxes still share a rectangle and always will
     6  OPEN: the list scrolls
     7  OPEN: scrolled to the end, the final ROW clears the bar and answers a
        touch
     8  the three other bottom-flush sheets carry the same 88px clearance —
        .cr-psheet, .paymodal-bd, .cr-cadj-bd. ⚠ Read off computed style on a
        synthesized element, so it proves the RULE resolves, not that the live
        screen is right; each of those sheets needs its own trigger and none is
        opened here. Said plainly rather than implied.

   Usage: node render_navclear.mjs [path] — previous build = negative control,
   must go RED with named failures and MUST NOT crash. */
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

/* Theo's own library shape: seven categories, a couple of items each */
const EXTRA=`(function(){try{var S=window.__SEED__;if(!S)return;var rows=[],n=0;
 function add(cat,k){for(var i=0;i<k;i++){n++;rows.push({id:'x'+n,category:cat,name:cat+' item '+(i+1),
  description:'A description long enough to wrap onto two lines on a phone screen',
  default_price:100+n,unit:'EA',active:true,sort_order:i});}}
 add('Codes',1);add('General',3);add('Gutters',3);add('Repair',1);add('Roofing',3);add('Siding',1);add('Windows',2);
 S.estimate_line_items=rows;}catch(e){}})();`;
const ALL_FOLDED = JSON.stringify({Codes:1,General:1,Gutters:1,Repair:1,Roofing:1,Siding:1,Windows:1});

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(folded){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript(EXTRA);
  await page.addInitScript(folded
    ? `try{localStorage.setItem('cr-est-libfold',${JSON.stringify(ALL_FOLDED)});}catch(e){}`
    : `try{localStorage.removeItem('cr-est-libfold');}catch(e){}`);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';});
    if(window.CardinalLineItems && window.CardinalLineItems.load) await window.CardinalLineItems.load();
    const p=(window.cacheProjects||[])[0];
    if(window.CardinalEstimates && window.CardinalEstimates.openEditor && p) await window.CardinalEstimates.openEditor(p);
  });
  await page.waitForTimeout(1100);
  /* the installed app, which is the only place this defect exists */
  await page.evaluate(()=>{ document.body.classList.add('standalone'); });
  await page.evaluate(()=>{ const b=document.querySelector('[data-act="add-lib"]'); if(b) b.click(); });
  await page.waitForTimeout(800);
  return page;
}
const READ = () => {
  const pk=document.getElementById('cr-est-picker');
  const list=pk?pk.querySelector('.box-list'):null;
  const nav=document.getElementById('pwaNav');
  const z=el=>el?getComputedStyle(el).zIndex:null;
  const R=el=>{ if(!el) return null; const b=el.getBoundingClientRect();
    return {top:Math.round(b.top),bottom:Math.round(b.bottom),h:Math.round(b.height)}; };
  const at=(y)=>{ const el=document.elementFromPoint(195,y); if(!el) return null;
    return el.id ? '#'+el.id : el.tagName+'.'+String(el.className||'').split(' ')[0]; };
  const inSheet=(y)=>{ const el=document.elementFromPoint(195,y); return !!(el && pk && pk.contains(el)); };
  const cats=[...(pk?pk.querySelectorAll('.cat'):[])];
  const last=cats[cats.length-1];
  const lr=R(last), nr=R(nav);
  return {
    open: !!(pk && pk.classList.contains('open')),
    pickerZ: z(pk), navZ: z(nav), navShown: nav?getComputedStyle(nav).display!=='none':false,
    listPadBottom: list? (parseFloat(getComputedStyle(list).paddingBottom)||0) : null,
    navRect: nr, listRect: R(list),
    scrollable: list? list.scrollHeight > list.clientHeight+1 : null,
    atListBottom: list? at(Math.min(innerHeight-2, R(list).bottom-6)) : null,
    listBottomInSheet: list? inSheet(Math.min(innerHeight-2, R(list).bottom-6)) : null,
    lastName: last? (last.querySelector('.cn')||{textContent:''}).textContent.trim() : null,
    lastRect: lr, navRect2: nr,
    /* OCCLUSION, not overlap. The fix is z-order: the sheet now paints over the
       nav, so the two boxes still share the same rectangle and always will —
       asserting they do not intersect fails correct code, which is exactly what
       the first version of this check did. What matters is who answers a touch
       there, and only a hit test knows that. */
    lastHit: (function(){ if(!lr) return null;
      const el=document.elementFromPoint(195, Math.round((lr.top+lr.bottom)/2));
      if(!el) return null;
      return { tag: el.id ? '#'+el.id : el.tagName+'.'+String(el.className||'').split(' ')[0],
               inSheet: !!(pk && pk.contains(el)),
               inLastCat: !!(last && last.contains(el)) }; })()
  };
};

/* ── FOLDED — the state in Theo's screenshots ── */
{
  const page=await boot(true);
  const f=await page.evaluate(READ);
  need('1 the installed bar is present and above the sheet (the premise)',
       !!(f && f.navShown && f.navRect && f.navRect.h > 0 && Number(f.navZ) > Number(f.pickerZ)),
       f?('#pwaNav z='+f.navZ+' shown='+f.navShown+' vs sheet z='+f.pickerZ):'nothing rendered');
  need('2 the list carries the standalone clearance',
       !!(f && f.listPadBottom >= 88),
       f?('.box-list padding-bottom = '+f.listPadBottom+'px (need >= 88)'):'nothing rendered');
  need('3 folded: the list is short and does not scroll (the fatal condition)',
       !!(f && f.open && f.scrollable === false),
       f?('open='+f.open+' scrollable='+f.scrollable):'nothing rendered');
  need('4 folded: the last real content sits above the bar',
       !!(f && f.lastRect && f.navRect && f.lastRect.bottom <= f.navRect.top),
       f?('last content ends at '+(f.lastRect&&f.lastRect.bottom)+', bar starts at '+
          (f.navRect&&f.navRect.top)):'nothing rendered');
  need('5 folded: a touch on the last section reaches the last section',
       !!(f && f.lastName && f.lastHit && f.lastHit.inSheet && f.lastHit.inLastCat && f.lastHit.tag !== '#pwaNav'),
       f?(f.lastName+' hit='+JSON.stringify(f.lastHit)+' rect='+JSON.stringify(f.lastRect)+
          ' nav='+JSON.stringify(f.navRect)):'nothing rendered');
  await page.context().close();
}

/* ── OPEN — the everyday state ── */
{
  const page=await boot(false);
  const f=await page.evaluate(READ);
  need('6 open: the list scrolls',
       !!(f && f.scrollable === true),
       f?('scrollable='+f.scrollable):'nothing rendered');

  const g=await page.evaluate(()=>{
    const pk=document.getElementById('cr-est-picker');
    const list=pk?pk.querySelector('.box-list'):null;
    if(!list) return null;
    list.scrollTop = list.scrollHeight;
    const items=[...list.querySelectorAll('.p-item')];
    const last=items[items.length-1];
    if(!last) return { noItems:true };
    const b=last.getBoundingClientRect();
    const nav=document.getElementById('pwaNav');
    const el=document.elementFromPoint(195, Math.min(innerHeight-2, b.bottom-6));
    return { bottom:Math.round(b.bottom), vh:innerHeight,
      navTop: nav? Math.round(nav.getBoundingClientRect().top) : null,
      hit: el? (el.id?'#'+el.id:el.tagName+'.'+String(el.className||'').split(' ')[0]) : null,
      inSheet: !!(el && pk.contains(el)) };
  });
  need('7 open: scrolled to the end, the final row clears the bar',
       !!(g && !g.noItems && g.navTop && g.bottom <= g.navTop && g.inSheet && g.hit !== '#pwaNav'),
       g?JSON.stringify(g):'no list');

  /* 8: the sibling sheets. Computed style on a synthesized element — this
     proves the RULE resolves under body.standalone, not that each live screen
     is right. Each needs its own trigger; none is opened here. */
  const sib = await page.evaluate(()=>{
    const out = {};
    for(const cls of ['cr-psheet','paymodal-bd','cr-cadj-bd']){
      const d=document.createElement('div');
      d.className=cls; d.style.position='fixed'; d.style.left='-9999px';
      document.body.appendChild(d);
      out[cls]=parseFloat(getComputedStyle(d).paddingBottom)||0;
      d.remove();
    }
    return out;
  });
  need('8 the three sibling bottom sheets carry the same 88px clearance',
       !!(sib && sib['cr-psheet']>=88 && sib['paymodal-bd']>=88 && sib['cr-cadj-bd']>=88),
       JSON.stringify(sib));
  await page.context().close();
}

await browser.close();
console.log('\nrender_navclear ['+LABEL+'] '+FILE);
console.log('  passed: '+passes+'   failed: '+fails.length);
fails.forEach(f=>console.log('  FAIL  '+f));
console.log(fails.length? '\nRED' : '\nGREEN — 8/8');
process.exit(fails.length?1:0);
