/* gate_984.mjs — the Cardinal Truth tab strip stops hiding its last tab (build 984).

   THE DEFECT. `.cr-cth-tabs` is a nowrap flex row with overflow-x:auto and
   scrollbar-width:none. At 390px its clientWidth is 354, and before 984 its
   scrollWidth was EXACTLY 354 at one-digit counts — zero slack. Any real claim
   count pushed the last tab past the edge, and because the scrollbar is hidden
   there was no affordance that anything was there. Build 983 made it 11px worse
   by converting `font:700 13px inherit` (discarded whole) into real longhands,
   so font-weight:700 finally applied and bold text is wider.

   THE FIX. flex-wrap:wrap + row-gap:4px. NO media query: flex-wrap only wraps
   when the content actually overflows, so the strip self-adjusts — measured
   2 rows at 360/390/414 and 1 row, byte-identical geometry, at 430/480/768/1194.

   ⚠ THE ASSERTION THAT MATTERS IS 4, NOT 1. A CSS-text check would pass on a
   stylesheet that never applies. 4 drives the app's OWN showCardinalTruth()
   entry point at 390px, sets a realistic two-digit count, and requires that
   EVERY tab's right edge sits inside the strip's client box — i.e. that a
   person can actually see "Closed". 5 is its negative control: it puts nowrap
   back on the live element and requires the check to go RED, so assertion 4
   cannot pass vacuously.

     1  the rule carries flex-wrap:wrap and a row-gap that beats the gap shorthand
     2  ...and row-gap comes AFTER gap:20px, or the shorthand wins
     3  no media query was introduced — the wrap is unconditional by design
     4  RENDERED: at 390px with 2-digit counts, no tab is clipped   ← load-bearing
     5  ...and that test CAN fail — restore nowrap and it goes red
     6  RENDERED: at 430px and above the strip is untouched — 1 row, same height
     7  the strip still cannot overflow horizontally at any tested width
     8  the active-tab underline still marks the active tab
     9  983's typography repair is intact — the tabs are still 13px/700

   Usage: node gate_984.mjs [path] — previous build = negative control; must go
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

/* ── static: read the rule out of cr-cth-styles, comments stripped ────────── */
function blockOf(id){
  const i = APP.indexOf('<style id="'+id+'"');
  if(i === -1) return '';
  return APP.slice(APP.indexOf('>', i)+1, APP.indexOf('</style>', i));
}
/* ⚠ strip comments FIRST. 984's own patch documents itself inside the rule it
   changes, and this repo has paid five times for a count that matched its own
   explanatory prose. */
const CTH = blockOf('cr-cth-styles');
const CTHC = CTH.replace(/\/\*[\s\S]*?\*\//g, '');
const ri = CTHC.indexOf('.cr-cth-tabs{');
const RULE = ri === -1 ? '' : CTHC.slice(ri, CTHC.indexOf('}', ri)+1);

need('0 cr-cth-styles and the .cr-cth-tabs rule were found', !!RULE, 'rule not located');
need('1 the rule wraps instead of clipping',
     /flex-wrap:\s*wrap/.test(RULE) && /row-gap:\s*4px/.test(RULE),
     'rule reads: ' + RULE.slice(0,200));
/* ⚠ ORDER IS LOAD-BEARING: `gap:20px` sets row-gap AND column-gap. A row-gap
   declared BEFORE it is overwritten and the fix ships with 20px rows. */
need('2 row-gap comes after the gap shorthand, so it wins',
     RULE.indexOf('row-gap:') > RULE.indexOf('gap:20px'),
     'row-gap at ' + RULE.indexOf('row-gap:') + ' vs gap:20px at ' + RULE.indexOf('gap:20px'));
need('3 no media query was introduced for this — wrap is unconditional',
     !/@media[^{]*\{[^}]*cr-cth-tabs\s*\{[^}]*flex-wrap/.test(CTHC),
     'a media query now gates the wrap; flex-wrap self-adjusts and does not need one');
need('9 983 typography intact — tabs still 13px/700',
     /font-weight:700/.test(CTHC.slice(CTHC.indexOf('.cr-cth-tabs button{'), CTHC.indexOf('.cr-cth-tabs button{')+260)) &&
     /font-size:13px/.test(CTHC.slice(CTHC.indexOf('.cr-cth-tabs button{'), CTHC.indexOf('.cr-cth-tabs button{')+260)),
     'the button rule lost its longhands');

/* ── rendered ─────────────────────────────────────────────────────────────── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },180000);

async function openTruth(width){
  const page=await browser.newPage({viewport:{width,height:900}});
  /* ⚠ serve by RESOURCE TYPE — an image answered with an empty body and no
     content-type never completes and the document never finishes loading. */
  await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
    if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
      return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
    return r.fulfill({status:200,contentType:'text/plain',body:''});});
  await page.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1400);
  /* drive the app's OWN entry point — never inject markup */
  await page.evaluate(()=>{ try{ if(typeof showCardinalTruth==='function') showCardinalTruth(); }catch(_){} });
  await page.waitForTimeout(1100);
  return page;
}
/* measure with a REALISTIC count. The fixture ships single digits, which is the
   one case the broken strip could still fit — testing only that would be a
   check that cannot fail. */
async function strip(page, {nowrap=false, count='12'}={}){
  return await page.evaluate(({nowrap,count})=>{
    const s=document.querySelector('.cr-cth-tabs');
    if(!s) return {absent:true};
    if(nowrap){ s.style.flexWrap='nowrap'; s.style.rowGap='0px'; }
    s.querySelectorAll('button b').forEach(b=>b.textContent=count);
    s.scrollLeft=0; s.getBoundingClientRect();
    const sr=s.getBoundingClientRect();
    const cs=getComputedStyle(s);
    const btns=[...s.querySelectorAll('button')];
    const clipped=btns.filter(b=>{
      const r=b.getBoundingClientRect();
      return r.right > sr.left + s.clientWidth + 0.5;
    }).map(b=>(b.innerText||'').trim().replace(/\s+/g,' '));
    const on=s.querySelector('button.on');
    return {
      tabs: btns.length,
      clipped,
      overflow: s.scrollWidth - s.clientWidth,
      height: Math.round(sr.height),
      rows: [...new Set(btns.map(b=>Math.round(b.getBoundingClientRect().top)))].length,
      wrap: cs.flexWrap,
      fs: btns[0] ? getComputedStyle(btns[0]).fontSize : null,
      fw: btns[0] ? getComputedStyle(btns[0]).fontWeight : null,
      activeUnderline: on ? getComputedStyle(on).borderBottomColor : null,
      activeIsRed: on ? getComputedStyle(on).borderBottomColor !== 'rgba(0, 0, 0, 0)' : null,
    };
  }, {nowrap,count});
}

const p390 = await openTruth(390);
const at390 = await strip(p390);

if(at390.absent){
  need('4 RENDERED: no tab is clipped at 390px with 2-digit counts', false, '.cr-cth-tabs did not render');
  need('5 ...and that test CAN fail', false, 'could not run — strip absent');
  need('8 the active tab still carries its underline', false, 'could not run — strip absent');
} else {
  need('4 RENDERED: no tab is clipped at 390px with 2-digit counts',
       at390.clipped.length === 0 && at390.tabs >= 4,
       at390.tabs + ' tabs, clipped: ' + JSON.stringify(at390.clipped) +
       ', overflow ' + at390.overflow + 'px, rows ' + at390.rows + ', flex-wrap ' + at390.wrap);
  /* 5 — the negative control ON THE LIVE ELEMENT. Put nowrap back and the very
     same check must go red, or assertion 4 proves nothing. */
  const broken = await strip(p390, {nowrap:true});
  need('5 ...and that test CAN fail — nowrap restored clips a tab',
       broken.clipped && broken.clipped.length > 0,
       'with flex-wrap:nowrap the strip clipped ' + JSON.stringify(broken && broken.clipped) +
       ' (overflow ' + (broken && broken.overflow) + 'px) — expected at least one clipped tab');
  need('8 the active tab still carries its underline',
       at390.activeIsRed !== false,
       'active tab border-bottom-color: ' + at390.activeUnderline);
}
await p390.close();

/* 6,7 — wider widths must be untouched */
const wide = {};
for(const w of [430, 768, 1194]){
  const pg = await openTruth(w);
  wide[w] = await strip(pg);
  await pg.close();
}
const untouched = Object.entries(wide).filter(([,v]) => !v.absent && v.rows === 1 && v.height === 46);
need('6 RENDERED: 430px and above are untouched — 1 row, 46px',
     untouched.length === 3,
     Object.entries(wide).map(([w,v])=>w+'px:'+(v.absent?'absent':(v.rows+' row(s) '+v.height+'px'))).join('  '));
need('7 the strip cannot overflow horizontally at any tested width',
     !at390.absent && at390.overflow <= 0 &&
     Object.values(wide).every(v=>!v.absent && v.overflow <= 0),
     '390px:' + (at390.absent?'absent':at390.overflow) + '  ' +
     Object.entries(wide).map(([w,v])=>w+'px:'+(v.absent?'absent':v.overflow)).join('  '));

clearTimeout(watchdog);
await browser.close();
console.log(`gate_984 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
