/* Gate for 939 — the text-size control. Optional path arg = negative control.
   Everything is measured by RENDERED BOX: getComputedStyle().fontSize does NOT
   reflect zoom (it returned an identical 10px at every level and made the first
   version of this measurement report that no lever did anything). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const S='/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP_PATH=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const LABEL=process.argv[3]||(/v9\d\d/.test(APP_PATH)?'CONTROL':'SHIPPED');
const APP=readFileSync(APP_PATH,'utf8');
const SETUP=readFileSync(S+'sentinel_setup_cardinal.js','utf8')+'\n;\n'+readFileSync(S+'e2e_mock_supa.js','utf8');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('  ✗ '+m);} else console.log('  ✓ '+m); };
/* ⚠ BUG_CLASSES 37 — a negative control must report RED, never DIE. Against a
   tree with no control at all every querySelector(...).click() is a null
   dereference, and the run ends with a stack trace before printing a verdict.
   A crash reads as "not green" when it in fact proves nothing. Every tap goes
   through here so an absent control is a FAILURE with a name on it. */
async function tap(page, v){
  const hit = await page.evaluate(sel=>{
    const b=document.querySelector('[data-cr-text-set="'+sel+'"]');
    if(!b) return false; b.click(); return true; }, v).catch(()=>false);
  if(!hit){ fails++; console.log('  ✗ there is no "'+v+'" control on this build to tap'); }
  return hit;
}

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function open(){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const page=await ctx.newPage();
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=scottie',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1600);
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id);
    if(e){e.style.display='none';e.classList&&e.classList.remove('open');}});
    document.body.classList.add('standalone'); });
  await page.waitForTimeout(400);
  return {ctx,page};
}
const shot = page => page.evaluate(()=>{
  const nav=document.getElementById('pwaNav');
  const nb=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect():null;
  const txt=[...document.querySelectorAll('div,span,p,b,small,button')]
    .filter(e=>{const t=(e.textContent||'').trim(); if(t.length<4||t.length>40) return false;
      const cs=getComputedStyle(e); return cs.display!=='none' && e.getBoundingClientRect().width>10;})
    .slice(0,60).map(e=>e.getBoundingClientRect().height).filter(Boolean).sort((a,b)=>a-b);
  return { attr: document.documentElement.getAttribute('data-cr-text'),
           median: txt.length?Math.round(txt[Math.floor(txt.length/2)]*10)/10:null,
           navFlush: nb?Math.abs(nb.bottom-innerHeight)<=2:null,
           navFull:  nb?nb.width>=innerWidth-2:null,
           sideways: Math.max(0,Math.round(document.documentElement.scrollWidth-innerWidth)),
           pressed: [...document.querySelectorAll('[data-cr-text-set]')]
                      .map(b=>b.getAttribute('data-cr-text-set')+':'+b.getAttribute('aria-pressed')).join(' '),
           stored: (()=>{try{return localStorage.getItem('cr-textsize');}catch(e){return null;}})() };
});

console.log('\n=== text size ('+LABEL+') — '+APP_PATH+' ===');
const {ctx,page}=await open();

const base=await shot(page);
ok(base.attr===null, 'starts at Normal — no attribute until asked ('+base.attr+')');
ok(/md:true/.test(base.pressed), 'and the control says Normal: '+base.pressed);

const btns=await page.$$('[data-cr-text-set]');
ok(btns.length===3, 'three steps offered ('+btns.length+')');

// the control is REACHABLE — it lives in the drawer, so open the drawer for real
await page.evaluate(()=>{const b=document.getElementById('navBtn'); if(b) b.click();});
await page.waitForTimeout(500);
const reach=await page.evaluate(()=>{
  const b=document.querySelector('[data-cr-text-set="xl"]'); if(!b) return {ok:false};
  const r=b.getBoundingClientRect();
  const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
  return {ok:!!(t&&(t===b||b.contains(t))), hit:t?(t.id||t.className||t.tagName):null,
          w:Math.round(r.width), h:Math.round(r.height)};
});
ok(reach.ok, 'a tap on "Larger" reaches the button in the open drawer (hit: '+reach.hit+')');
ok(reach.h>=34 && reach.w>=34, 'and it is a real touch target: '+reach.w+'x'+reach.h+'px');

for (const [step,label] of [['lg','Large'],['xl','Larger']]) {
  if(!await tap(page, step)) continue;
  await page.waitForTimeout(450);
  const s=await shot(page);
  ok(s.attr===step, label+': the attribute is set ('+s.attr+')');
  ok(s.median>base.median, label+': text is genuinely BIGGER — median line '+base.median+'px -> '+s.median+'px');
  ok(s.navFlush===true, label+': the installed bottom bar is still flush');
  ok(s.navFull===true,  label+': and still full width');
  ok(s.sideways===0,    label+': nothing runs off the side ('+s.sideways+'px)');
  ok(new RegExp(step+':true').test(s.pressed), label+': the control reflects it — '+s.pressed);
  ok(s.stored===step,   label+': remembered on this device ('+s.stored+')');
}

// back to Normal, and it must actually go back
if(await tap(page,'md')){
  await page.waitForTimeout(400);
  const back=await shot(page);
  ok(back.attr===null, 'Normal clears the attribute again ('+back.attr+')');
  ok(Math.abs(back.median-base.median)<0.6, 'and the layout returns to where it started ('+base.median+' -> '+back.median+')');
}

// it survives a reload — the whole point of remembering it
await tap(page,'xl');
await page.waitForTimeout(300);
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForTimeout(1500);
const after=await page.evaluate(()=>({attr:document.documentElement.getAttribute('data-cr-text'),
  pressed:[...document.querySelectorAll('[data-cr-text-set]')].map(b=>b.getAttribute('data-cr-text-set')+':'+b.getAttribute('aria-pressed')).join(' ')}));
ok(after.attr==='xl', 'it survives a reload, applied before first paint ('+after.attr+')');
ok(/xl:true/.test(after.pressed), 'and the control does not lie about its state afterwards: '+after.pressed);

await ctx.close(); await browser.close();
console.log(fails?('\nRED — '+fails+' failed'):'\nGREEN — text size works, and the installed chrome survives both steps');
process.exit(fails?1:0);
