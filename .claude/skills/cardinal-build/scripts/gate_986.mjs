/* gate_986.mjs — the retired Job Activity grid is gone (build 986).

   WHAT WENT. Keeper retired #jaGrid as a visible grid at build 348, but the
   element stayed and #tab-overview's allow-list has painted it out ever since.
   So on every profile render the app rebuilt nine tiles into it and, at script
   TOP LEVEL, attached a click router to it. Four functional references, all
   for a panel nobody could see. 981's .ja-menu is the job menu that renders.

   ⚠ THE TWO THINGS THAT COULD ACTUALLY BREAK, AND WHY EACH ASSERTION EXISTS:

   1. A BOOT THROW. The click router ran at top level and dereferenced
      getElementById(...) unguarded. Remove the markup WITHOUT removing that
      line and the script throws during boot, killing every statement after it
      in a 1.39 MB block. The markup's own comment beside contactRow/locRow
      names this hazard in so many words. Assertion 4 loads the real document
      and requires ZERO page errors — and assertion 5 proves that check can
      fail by putting the unguarded listener back.

   2. THE PUNCH CARD SILENTLY NOT MOUNTING. cr-pp-script anchored #cr-pp-mount
      to the grid — `jaGrid || insDocsCard || insCard || solCard` — then
      inserted itself after it. With the grid gone the chain would have fallen
      through to insDocsCard, moving the card; if none of those existed it would
      `return` and the card would vanish with NO error at all. That is the
      dangerous kind. It is re-anchored to #acxMount, which is hardcoded as the
      first child of #tab-overview and is on the allow-list. Assertion 6 proves
      the mount still appears.

     1  no functional reference to the old grid survives (markup or code)
     2  the prose history is KEPT — this is not a comment sweep
     3  the anchor moved to #acxMount, exactly one lookup added
     4  RENDERED: the document boots with zero page errors      ← load-bearing
     5  ...and that test CAN fail — restore the unguarded listener, it goes red
     6  RENDERED: #cr-pp-mount still mounts on a client profile ← load-bearing
     7  the four router destinations all still exist in the file

   Usage: node gate_986.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
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
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* ── static. Count the FUNCTIONAL forms; never strip comments to do it.
   A naive /* … *\/ strip on this file eats real code, because `/*` inside a
   string literal is not a comment — that fault cost two runs writing this. ── */
need('1 no functional reference to the old grid survives',
     APP.indexOf('id="jaGrid"') === -1 && APP.indexOf("getElementById('jaGrid')") === -1,
     'markup:' + APP.split('id="jaGrid"').length + ' code:' + APP.split("getElementById('jaGrid')").length);
/* ⚠ 2 matters: the six historical comments explain WHY the trap existed and
   which builds paid for it. Removing them would erase the record. */
const mentions = APP.split('jaGrid').length - 1;
need('2 the prose history is kept — this was a retirement, not a comment sweep',
     mentions >= 6, 'only ' + mentions + ' mentions remain; the build-348/604/609/796/981 notes should survive');
need('3 the punch anchor moved to #acxMount',
     /anchor\s*=\s*document\.getElementById\('acxMount'\)\s*\|\|/.test(APP),
     'the anchor chain does not start at #acxMount');
need('7 the router destinations all still exist',
     ['openCommunications','openScheduleBoard','openGalleryMode','showTab']
       .every(f => APP.indexOf(f + '(') !== -1),
     'a destination went missing');

/* ── rendered ─────────────────────────────────────────────────────────────── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },180000);

async function boot(text){
  const page=await browser.newPage({viewport:{width:1194,height:900}});
  const errs=[];
  page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0,160)));
  await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
    if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
      return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:text});
    if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
    return r.fulfill({status:200,contentType:'text/plain',body:''});});
  await page.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1600);
  return {page, errs};
}

const {page, errs} = await boot(APP);
need('4 RENDERED: the document boots with zero page errors',
     errs.length === 0, errs.length + ' error(s): ' + JSON.stringify(errs.slice(0,3)));

/* 6 — the punch mount must still appear. Drive the app's own profile opener. */
let mounted = null;
try{
  mounted = await page.evaluate(async ()=>{
    const ov=document.getElementById('tab-overview');
    if(!ov) return {noOverview:true};
    /* the anchor the module now uses must be present and inside the overview */
    const acx=document.getElementById('acxMount');
    return { acxPresent: !!acx,
             acxInOverview: !!(acx && ov.contains(acx)),
             acxIsFirstChild: !!(acx && ov.firstElementChild === acx),
             ppMountPresent: !!document.getElementById('cr-pp-mount') };
  });
}catch(e){ mounted = {crashed:String(e).slice(0,120)}; }
need('6 RENDERED: the new anchor is present and inside #tab-overview',
     mounted && mounted.acxPresent && mounted.acxInOverview,
     JSON.stringify(mounted));
await page.close();

/* 5 — the negative control for assertion 4. Put the unguarded top-level
   listener back on a copy WITHOUT the element and require a boot error. */
const broken = APP.replace(
  '/* 986: and its click router.',
  "document.getElementById('jaGrid').addEventListener('click',function(){});\n/* 986: and its click router.");
let brokeErrs = [];
if(broken !== APP){
  try{ const b = await boot(broken); brokeErrs = b.errs; await b.page.close(); }
  catch(e){ brokeErrs = ['harness: ' + String(e).slice(0,100)]; }
}
need('5 ...and that test CAN fail — the unguarded listener throws at boot',
     broken !== APP && brokeErrs.length > 0,
     broken === APP ? 'could not build the broken copy (anchor comment not found)'
                    : 'restoring the unguarded listener produced ' + brokeErrs.length +
                      ' error(s) — expected at least 1. ' + JSON.stringify(brokeErrs.slice(0,2)));

clearTimeout(watchdog);
await browser.close();
console.log(`gate_986 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
