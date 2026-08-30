/* render_appt — REAL Chromium render of the Appointment pane + rail.
   Inks against the composited ground, tap targets, sideways scroll, and
   the rail actually sitting above #cr-show's 9500. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('render_appt: playwright not found'); process.exit(2); }
const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
const b = await chromium.launch();
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };
for (const vp of [{w:390,h:844,n:'phone'},{w:1194,h:834,n:'iPad landscape'},{w:834,h:1194,n:'iPad portrait'}]) {
  const ctx = await b.newContext({ viewport:{width:vp.w,height:vp.h} });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://ap.test/')
    ? r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html})
    : r.fulfill({status:200,body:''}));
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
  await p.goto('https://ap.test/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(900);
  const res = await p.evaluate(async () => {
    const out = { opened:false, low:[], texts:0, wide:false, tap:[], railZ:0, showZ:0, railTop:false };
    /* mock supa so the picker paints rows */
    const rows = [{id:'p1',name:'Kim Lawson',stage:'Approved'},{id:'p2',name:'Bob Roof',stage:'Lead'}];
    const q = { select(){return q}, order(){return q}, limit(){return q}, eq(){return q},
                then(r){ return Promise.resolve({data:rows}).then(r); } };
    Object.defineProperty(window,'supa',{value:{from:()=>q,
      storage:{from:()=>({createSignedUrls:()=>Promise.resolve({data:[]}),
                          createSignedUrl:()=>Promise.resolve({data:{}})})}},writable:false});
    if(!window.CardinalAppointment){ out.err='no module'; return out; }
    await window.CardinalAppointment.open();
    await new Promise(r=>setTimeout(r,500));
    const v = document.getElementById('cr-appt');
    const rail = document.getElementById('cr-appt-rail');
    out.opened = v && getComputedStyle(v).display==='block' && rail && rail.classList.contains('on');
    out.railZ = rail ? parseInt(getComputedStyle(rail).zIndex,10) : 0;
    const sh = document.getElementById('cr-show');
    out.showZ = sh ? parseInt(getComputedStyle(sh).zIndex||'0',10) : 9500;
    out.railTop = out.railZ > 9500;
    const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
    const L=(r,g,bb)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(bb);
    const parse=s=>{const m=String(s).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null;};
    const grounds=el=>{const g=[];for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
      const cs=getComputedStyle(n);const bc=parse(cs.backgroundColor);
      if(bc&&bc.a>0.85)g.push(bc);
      for(const m of (cs.backgroundImage||'').matchAll(/rgba?\([^)]+\)/g)){
        const s2=parse(m[0]); if(s2&&s2.a>0.85)g.push(s2);}
      if(g.length&&bc&&bc.a>0.99)break;}
      if(!g.length)g.push({r:5,g:6,b:7,a:1});return g;};
    for(const root of [v, rail]){
      const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let t;
      while((t=walk.nextNode())){
        const s=(t.nodeValue||'').trim(); if(!s) continue;
        const el=t.parentElement; if(!el) continue;
        const cs=getComputedStyle(el);
        if(cs.visibility==='hidden'||cs.display==='none') continue;
        const rc=el.getBoundingClientRect(); if(rc.width<1||rc.height<1) continue;
        if(el.disabled) continue;             /* a dimmed disabled control is not body text */
        const ink=parse(cs.color); if(!ink) continue;
        out.texts++;
        const li=L(ink.r,ink.g,ink.b);
        let worst=99;
        for(const g of grounds(el)){const lg=L(g.r,g.g,g.b);
          const c=(Math.max(li,lg)+0.05)/(Math.min(li,lg)+0.05); if(c<worst)worst=c;}
        const px=parseFloat(cs.fontSize)||16; const bold=(parseInt(cs.fontWeight)||400)>=700;
        const floor=(px>=24||(px>=18.66&&bold))?3.0:4.5;
        if(worst<floor) out.low.push(s.slice(0,40)+' | '+cs.color+' '+px.toFixed(1)+'px = '+worst.toFixed(2)+':1');
      }
    }
    out.wide = v.scrollWidth > document.documentElement.clientWidth + 1;
    for(const el of [...v.querySelectorAll('button'), ...rail.querySelectorAll('button')]){
      const r=el.getBoundingClientRect();
      if(r.width<1||r.height<1) continue;
      if(r.width<44||r.height<44) out.tap.push((el.className||el.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height));
    }
    return out;
  });
  ok('['+vp.n+'] no page errors', errs.length===0, errs.join(' | '));
  ok('['+vp.n+'] pane + rail open', res.opened, res.err||'');
  ok('['+vp.n+'] rail z-index beats #cr-show 9500', res.railTop, 'railZ='+res.railZ);
  ok('['+vp.n+'] renders real text', res.texts > 10, 'texts='+res.texts);
  ok('['+vp.n+'] every ink clears its floor', res.low.length===0, res.low.join(' || '));
  ok('['+vp.n+'] no sideways scroll', !res.wide);
  ok('['+vp.n+'] every control >=44px', res.tap.length===0, res.tap.join(' | '));
  await ctx.close();
}
await b.close();
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail?1:0);
