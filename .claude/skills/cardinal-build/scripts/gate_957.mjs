/* gate_957.mjs — scroll containment belongs on the box that scrolls (build 957).
   Theo: "the scroll gets stuck here … the finger does nothing at all" on the
   Cardinal Truth screen. `overscroll-behavior:contain` sat on .ins-body, which
   has overflow:visible — it cannot consume a gesture, and on iOS it stops the
   gesture chaining up to #cardinalTruthView, which can. Dead pane.
     1. NO NON-SCROLLER declares overscroll-behavior anywhere in the app — the
        audit that found this, promoted to an assertion so the class cannot
        return quietly. Walks Chromium's OWN parsed rules (a text grep cannot
        tell a scroller from a non-scroller).
     2. CONTAINMENT ON THE SCROLLERS — #cardinalTruthView and .pu-sheet .panel
        compute overscroll-behavior-y: contain, so the page behind is still
        held when either is open
     3. STILL SCROLLS — the pane reaches its full range under scroll input;
        a containment fix that killed the scroll would be worse than the bug
   ⚠ Chromium cannot reproduce the iOS symptom — it scrolls this pane on wheel
   input in both trees. This gate proves the CAUSE is gone and nothing regressed;
   Theo's phone is the gate for the cure.
   Usage: node gate_957.mjs [path] — previous build = negative control. */
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
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2600);
await page.evaluate(()=>{ document.body.classList.add('standalone');
  ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';
  if(typeof window.showCardinalTruth==='function') try{ window.showCardinalTruth(); }catch(_){}});
await page.waitForTimeout(2000);

/* ── 1: the audit, as an assertion ──
   ⚠ Checked at the COMPUTED level, on elements — not at the declaration level,
   on rules. The first version of this check flagged any RULE that declares
   containment whose selector matches a non-scrolling element, which stayed red
   after the fix because the base .piperow rule still exists and still matches
   (a later breakpoint resets it). What matters is whether containment is in
   EFFECT on a box with no scrollport, and only the computed value knows. */
const audit=await page.evaluate(()=>{
  const bad=[];
  for(const el of document.querySelectorAll('*')){
    const cs=getComputedStyle(el);
    if(cs.display==='none') continue;
    const yContained=/contain|none/.test(cs.overscrollBehaviorY);
    const xContained=/contain|none/.test(cs.overscrollBehaviorX);
    if(!yContained && !xContained) continue;
    const scrollsY=/auto|scroll|hidden/.test(cs.overflowY);
    const scrollsX=/auto|scroll|hidden/.test(cs.overflowX);
    if((yContained && !scrollsY) || (xContained && !scrollsX)){
      const id=el.id?('#'+el.id):'';
      const cls=(el.className||'').toString().trim().split(/\s+/).slice(0,2).join('.');
      bad.push((id||('.'+cls)||el.tagName.toLowerCase())+' ['+cs.overflowY+'/'+cs.overflowX+']');
    }
  }
  return [...new Set(bad)];
});
need('no box with containment in EFFECT lacks a scrollport', audit.length===0, audit.slice(0,6).join(' | '));

/* ── 2: containment landed on the real scrollers ── */
const onScrollers=await page.evaluate(()=>{
  const v=document.getElementById('cardinalTruthView');
  const body=v?v.querySelector('.ins-body.cr-cth'):null;
  const out={ view:v?getComputedStyle(v).overscrollBehaviorY:null,
              viewOverflow:v?getComputedStyle(v).overflowY:null,
              insBody:body?getComputedStyle(body).overscrollBehaviorY:null };
  const sheet=document.getElementById('puShAssign');
  if(sheet){
    sheet.classList.add('open');
    const panel=sheet.querySelector('.panel');
    out.sheet=getComputedStyle(sheet).overscrollBehaviorY;
    out.panel=panel?getComputedStyle(panel).overscrollBehaviorY:null;
    out.panelOverflow=panel?getComputedStyle(panel).overflowY:null;
    sheet.classList.remove('open');
  }
  return out;
});
need('the Cardinal Truth SCROLLER contains the swipe', onScrollers.view==='contain', String(onScrollers.view));
need('its non-scrolling child no longer does', onScrollers.insBody!=='contain', String(onScrollers.insBody));
need('the punch sheet PANEL (the scroller) contains it', onScrollers.panel==='contain', String(onScrollers.panel));
need('the punch sheet BACKDROP no longer does', onScrollers.sheet!=='contain', String(onScrollers.sheet));
need('the panel is genuinely a scroller', /auto|scroll/.test(String(onScrollers.panelOverflow)), String(onScrollers.panelOverflow));

/* ── 3: the pane still reaches its full range ── */
await page.evaluate(()=>{ document.getElementById('cardinalTruthView').scrollTop=0; });
await page.mouse.move(195,500);
for(let i=0;i<10;i++) await page.mouse.wheel(0,200);
await page.waitForTimeout(500);
const scrolled=await page.evaluate(()=>{
  const v=document.getElementById('cardinalTruthView');
  return { top:v.scrollTop, max:v.scrollHeight-v.clientHeight };
});
need('the Cardinal Truth pane still scrolls its full range',
  scrolled.max>100 && scrolled.top>=scrolled.max-2, scrolled.top+'/'+scrolled.max);

await browser.close();
console.log('gate_957 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
