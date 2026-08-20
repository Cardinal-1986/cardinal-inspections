/* gate_944.mjs — the tap-target pass (build 944).
   Two proofs in one gate:
   1. THE WALK — drives the app's own navigation through 22 destinations at
      390×844 and 1194×834, measuring every button/a[href]/input/select/
      [role=button] on screen. A control under 44px tall (or 24px wide) is a
      failure. A checkbox/radio inside a <label> is measured by the LABEL's
      rect — activating a label activates its control, and the raw-rect audit
      cannot see that (the .pu-box lesson, BUG_CLASSES 40).
   2. THE PAD PROOF — the #crBanner CRM chips are fixed header chrome and were
      deliberately NOT grown; their target is a 44px ::after pad. A rect walk
      cannot see it, so this drives a REAL mouse click 9px above the chip's
      box and asserts the CRM actually switches (and that the pseudo box
      computes 44px).
   Usage:
     node gate_944.mjs                     # the shipped index.html — expect GREEN
     node gate_944.mjs <path-to-prev>      # negative control — expect RED
   On build 943 the walk reports ~400 failures and the pad proof misses:
   this gate has been seen red. Never trust a gate that hasn't. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

const NAV=['clients','leads','board','activity','inspections','quickinsp','estimates','pricing',
           'suppliers','crews','pay','reports','feed','recents','companydocs','coach',
           'cardinaltruth','communityhub','community-partners','portal','settings','landing'];

const PROBE = () => {
  const taps=[];
  document.querySelectorAll('button,a[href],input,select,textarea,[role="button"]').forEach(e=>{
    const cs=getComputedStyle(e);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none') return;
    let target=e;
    if(e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio')){
      const lb=e.closest('label'); if(lb) target=lb;
    }
    const b=target.getBoundingClientRect();
    if(b.width<4||b.height<4) return;
    if(b.top>innerHeight||b.bottom<0) return;
    const cx=Math.round(Math.max(1,Math.min(innerWidth-2,b.left+b.width/2)));
    const cy=Math.round(Math.max(1,Math.min(innerHeight-2,b.top+b.height/2)));
    if(b.top>=0&&b.bottom<=innerHeight){
      const top=document.elementFromPoint(cx,cy);
      if(!top||!(top===target||target.contains(top)||top.contains(target))) return;
    }
    /* class 40: a >=44px ::before/::after pad satisfies the floor invisibly */
    for (const pe of ['::after','::before']){
      const ps=getComputedStyle(e,pe);
      if(ps.content!=='none'&&parseFloat(ps.height)>=44) return;
    }
    if(b.height<44-0.5||b.width<24)
      taps.push({ sel:e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\s+/)[0]:''),
                  w:Math.round(b.width), h:Math.round(b.height),
                  t:(e.textContent||e.value||e.type||'').trim().slice(0,22) });
  });
  return taps;
};

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
let failures=[];
async function boot(w,h){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
      body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';e.classList&&e.classList.remove('open');}});});
  await page.waitForTimeout(400);
  return page;
}

/* ── 1. the walk ── */
for (const [w,h,label] of [[390,844,'phone'],[1194,834,'tablet']]){
  const page=await boot(w,h);
  for (const nav of NAV){
    const went = await page.evaluate(n=>{
      try{ if(typeof hideAllViews==='function') hideAllViews(); }catch(e){}
      for (const k in window){
        if(!/^Cardinal[A-Z]/.test(k)) continue;
        const m=window[k];
        if(m && typeof m.close==='function'){ try{ m.close(false); }catch(e){} }
      }
      try{ if(typeof hideAllViews==='function') hideAllViews(); }catch(e){}
      const b=document.querySelector('[data-nav="'+n+'"]');
      if(!b) return false;
      b.click(); return true;
    }, nav).catch(()=>false);
    if(!went) continue;
    await page.waitForTimeout(480);
    for (const step of [0,1,2]){
      if(step){ const moved=await page.evaluate(k=>{const before=window.scrollY;
          window.scrollTo(0,Math.round(innerHeight*0.9*k)); return window.scrollY!==before;},step).catch(()=>false);
        if(!moved) break; await page.waitForTimeout(250); }
      let r; try{ r=await page.evaluate(PROBE); }catch(e){ continue; }
      r.forEach(x=>failures.push({...x, screen:nav, vp:label}));
    }
    await page.evaluate(()=>window.scrollTo(0,0)).catch(()=>{});
  }
  await page.close();
  console.error('  walk done: '+label);
}
const seen=new Set(), D=[];
for (const t of failures){ const k=t.sel+'|'+t.screen+'|'+t.vp+'|'+t.w+'x'+t.h+'|'+t.t;
  if(seen.has(k))continue; seen.add(k); D.push(t); }
const G={};
for (const t of D){ (G[t.sel]=G[t.sel]||[]).push(t); }
console.log('WALK — '+D.length+' failing control(s) across '+Object.keys(G).length+' selector(s)');
for (const sel of Object.keys(G).sort((a,b)=>G[b].length-G[a].length).slice(0,40)){
  const rows=G[sel];
  console.log('  '+sel.padEnd(30)+' n='+String(rows.length).padStart(3)+'  '
    +[...new Set(rows.map(r=>r.w+'x'+r.h))].slice(0,4).join(' ')+'  '
    +[...new Set(rows.map(r=>r.screen))].join(',').slice(0,44));
}

/* ── 2. the pad proof ── */
let padOK=false;
{
  const page=await boot(1194,834);
  await page.evaluate(()=>{const b=document.querySelector('[data-nav="clients"]'); if(b) b.click();});
  await page.waitForTimeout(600);
  const info=await page.evaluate(()=>{
    const chip=[...document.querySelectorAll('#crBanner .cbcrm b')].find(b=>/insurance/i.test(b.textContent));
    if(!chip) return null;
    const cs=getComputedStyle(chip,'::after');
    const r=chip.getBoundingClientRect();
    return {padH:cs.height, rect:{x:r.x,y:r.y,w:r.width}};
  });
  if(info){
    await page.mouse.click(info.rect.x+info.rect.w/2, info.rect.y-9);
    await page.waitForTimeout(700);
    const crm=await page.evaluate(()=>document.body.dataset.crm||'retail');
    padOK = parseFloat(info.padH)>=44 && crm==='insurance';
    console.log('PAD  — ::after '+info.padH+', click 9px above the chip -> crm='+crm+(padOK?' (caught by the pad)':' (MISSED)'));
  } else console.log('PAD  — insurance chip not found');
  await page.close();
}
await browser.close();
const green = D.length===0 && padOK;
console.log(green?'GATE 944 GREEN — every walked control meets the floor and the banner pad catches real clicks'
                 :'GATE 944 RED — '+D.length+' sub-44 control(s)'+(padOK?'':' and the banner pad proof failed'));
process.exit(green?0:1);
