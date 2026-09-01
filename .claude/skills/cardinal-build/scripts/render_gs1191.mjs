/* render_gs1191 — REAL Chromium render of the 1191 discovery steps
   (Welcome / Why now / Priorities / Plans) plus the shield, at three
   viewports. Inks against the composited ground (colour AND gradient
   stops — the doc set's trap), tap targets >=44px, no sideways scroll,
   the rail contained in the viewport, and the ACTIVE chip visible
   inside the scrollable strip (>=700px only; below that the counter
   takes over by design). Mocked supa — read-only, no data touched.
   Control: point it at the 1190 artifact — welcome never paints. */
import fs from 'node:fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('render_gs1191: playwright not found'); process.exit(2); }
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

  await p.evaluate(() => {
    const rows = [{ id:'p1', name:'Kim Lawson', stage:'Approved', address:'12 Oak St, Dayton OH', checklist:'{}' }];
    const mk = t => { const q = { _t:t, _eq:{} };
      for (const m of ['select','order','limit']) q[m] = () => q;
      q.eq = (k,v) => { q._eq[k]=v; return q; };
      q.single = () => q; q.maybeSingle = () => q;
      q.then = res => Promise.resolve({ data: q._t==='projects' ? rows : [] }).then(res);
      return q; };
    Object.defineProperty(window,'supa',{value:{ from: t=>mk(t),
      storage:{ from: () => ({ createSignedUrls: () => Promise.resolve({data:[]}),
                               createSignedUrl:  () => Promise.resolve({data:{}}) }) } },writable:false});
    window.patchProjectCk = () => Promise.resolve();
  });

  const probe = async (name, prep) => {
    await p.evaluate(prep);
    await p.waitForTimeout(420);
    const res = await p.evaluate((wide700) => {
      const out = { low:[], texts:0, wide:false, tap:[], railIn:true, chipVis:true };
      const v = document.getElementById('cr-appt');
      const rail = document.getElementById('cr-appt-rail');
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
        if(!root) continue;
        const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        let t;
        while((t=walk.nextNode())){
          const s=(t.nodeValue||'').trim(); if(!s) continue;
          const el=t.parentElement; if(!el) continue;
          const cs=getComputedStyle(el);
          if(cs.visibility==='hidden'||cs.display==='none') continue;
          const rc=el.getBoundingClientRect(); if(rc.width<1||rc.height<1) continue;
          if(el.disabled) continue;
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
      out.wide = v && v.scrollWidth > document.documentElement.clientWidth + 1;
      for(const el of [...(v?v.querySelectorAll('button, textarea, input'):[]),
                       ...(rail?rail.querySelectorAll('button'):[])]){
        const r=el.getBoundingClientRect();
        if(r.width<1||r.height<1) continue;
        if(r.width<44||r.height<44) out.tap.push((el.className||el.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height));
      }
      if(rail){
        const rr = rail.getBoundingClientRect();
        out.railIn = rr.left >= -1 && rr.right <= document.documentElement.clientWidth + 1;
        if(wide700){
          const strip = rail.querySelector('[data-slot="strip"]');
          const on = strip ? strip.querySelector('.ar-step.on') : null;
          if(strip && on){
            const sr = strip.getBoundingClientRect(), or = on.getBoundingClientRect();
            out.chipVis = or.left >= sr.left - 1 && or.right <= sr.right + 1;
          }
        }
      }
      return out;
    }, vp.w >= 700);
    ok('['+vp.n+'] '+name+': renders real text', res.texts > 5, 'texts='+res.texts);
    ok('['+vp.n+'] '+name+': every ink clears its floor', res.low.length===0, res.low.join(' || '));
    ok('['+vp.n+'] '+name+': no sideways scroll', !res.wide);
    ok('['+vp.n+'] '+name+': every control >=44px', res.tap.length===0, res.tap.join(' | '));
    ok('['+vp.n+'] '+name+': rail inside the viewport', res.railIn);
    if (vp.w >= 700)
      ok('['+vp.n+'] '+name+': active chip visible in the strip', res.chipVis);
  };

  const opened = await p.evaluate(async () => {
    if (!window.CardinalAppointment) return false;
    await window.CardinalAppointment.open();
    return true;
  });
  ok('['+vp.n+'] module opens', opened);
  await p.waitForTimeout(700);
  await p.evaluate(() => { const j = document.querySelector('#cr-appt .ap-job'); j && j.click(); });
  await p.waitForTimeout(700);
  const onWelcome = await p.evaluate(() =>
    !!document.querySelector('#cr-appt [data-gs-pane="welcome"]'));
  ok('['+vp.n+'] pick lands on Welcome', onWelcome);

  await probe('welcome', () => {});
  await probe('why now', () => { const b2=document.querySelector('#cr-appt [data-gs="next"]'); b2&&b2.click(); });
  await p.evaluate(() => { const c=document.querySelector('#cr-appt .gs-card[data-k="storm"]'); c&&c.click(); });
  await probe('why now (selected)', () => {});
  await probe('priorities', () => { const b2=document.querySelector('#cr-appt [data-gs="next"]'); b2&&b2.click(); });
  await p.evaluate(() => { const c=document.querySelector('#cr-appt .gs-card[data-k="price"]'); c&&c.click();
    const c2=document.querySelector('#cr-appt .gs-card[data-k="warranty"]'); c2&&c2.click(); });
  await probe('priorities (ranked)', () => {});
  await probe('plans', () => { const b2=document.querySelector('#cr-appt [data-gs="next"]'); b2&&b2.click(); });
  await probe('shield', () => { const c=document.querySelector('#cr-appt-rail .ar-step'); c&&c.click(); });

  ok('['+vp.n+'] no page errors', errs.length===0, errs.join(' | '));
  await ctx.close();
}
await b.close();
console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail?1:0);
