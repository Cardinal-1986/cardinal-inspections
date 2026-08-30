/* render_why — a REAL Chromium render of #cr-why. jsdom proves structure;
   only an engine can say what a pixel is. Scores every text node against
   the ground its ancestors actually PAINT (colour and every gradient stop),
   which is the trap the doc set records: background-color is not the
   background. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
/* same resolution sentinel.js uses — playwright is global here, not local */
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('render_why: playwright not found'); process.exit(2); }
const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
const b = await chromium.launch();
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };
for (const vp of [{w:390,h:844,n:'phone'},{w:1194,h:834,n:'iPad landscape'},{w:834,h:1194,n:'iPad portrait'}]) {
  const ctx = await b.newContext({ viewport:{width:vp.w,height:vp.h} });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://why.test/')
    ? r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html})
    : r.fulfill({status:200,body:''}));
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).split('\n')[0]));
  await p.goto('https://why.test/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(900);
  const res = await p.evaluate(() => {
    const out = { opened:false, errs:[], low:[], texts:0, wide:false, w:0, sw:0, tap:[] };
    if (!window.CardinalWhy) { out.err='no CardinalWhy'; return out; }
    window.CardinalWhy.open();
    const v = document.getElementById('cr-why');
    if (!v) { out.err='no #cr-why'; return out; }
    out.opened = getComputedStyle(v).display === 'block';
    const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
    const L=(r,g,bb)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(bb);
    const parse=s=>{const m=String(s).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
      return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null;};
    /* every ground an ancestor actually paints: colour AND every gradient stop */
    const grounds=el=>{const g=[];for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
      const cs=getComputedStyle(n);const bc=parse(cs.backgroundColor);
      if(bc&&bc.a>0.85)g.push(bc);
      const bi=cs.backgroundImage||'';
      for(const m of bi.matchAll(/rgba?\([^)]+\)/g)){const s=parse(m[0]);if(s&&s.a>0.85)g.push(s);}
      if(g.length&&bc&&bc.a>0.99)break;}
      if(!g.length)g.push({r:5,g:6,b:7,a:1});return g;};
    const walk=document.createTreeWalker(v,NodeFilter.SHOW_TEXT);
    let t;
    while((t=walk.nextNode())){
      const s=(t.nodeValue||'').trim(); if(!s) continue;
      const el=t.parentElement; if(!el) continue;
      const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none') continue;
      const rc=el.getBoundingClientRect(); if(rc.width<1||rc.height<1) continue;
      const ink=parse(cs.color); if(!ink) continue;
      out.texts++;
      const li=L(ink.r,ink.g,ink.b);
      let worst=99;
      for(const g of grounds(el)){const lg=L(g.r,g.g,g.b);
        const c=(Math.max(li,lg)+0.05)/(Math.min(li,lg)+0.05); if(c<worst)worst=c;}
      const px=parseFloat(cs.fontSize)||16; const bold=(parseInt(cs.fontWeight)||400)>=700;
      const large = px>=24 || (px>=18.66 && bold);
      const floor = large?3.0:4.5;
      if(worst<floor) out.low.push(s.slice(0,42)+' | '+cs.color+' '+px.toFixed(1)+'px = '+worst.toFixed(2)+':1');
    }
    /* the page must not scroll sideways */
    out.w=document.documentElement.clientWidth; out.sw=v.scrollWidth;
    out.wide = v.scrollWidth > document.documentElement.clientWidth + 1;
    /* every control is a real tap target */
    v.querySelectorAll('button,a').forEach(el=>{const r=el.getBoundingClientRect();
      if(r.width<44||r.height<44) out.tap.push((el.className||el.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height));});
    return out;
  });
  ok('[' + vp.n + '] no page errors', errs.length === 0, errs.join(' | '));
  ok('[' + vp.n + '] the screen opens', res.opened, res.err || '');
  ok('[' + vp.n + '] it renders real text', res.texts > 40, 'text nodes=' + res.texts);
  ok('[' + vp.n + '] every ink clears its floor on the painted ground',
     res.low.length === 0, res.low.join('  ||  '));
  ok('[' + vp.n + '] the page does not scroll sideways', !res.wide,
     'scrollWidth=' + res.sw + ' client=' + res.w);
  ok('[' + vp.n + '] every control is >=44px', res.tap.length === 0, res.tap.join(' | '));
  await ctx.close();
}
await b.close();
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
