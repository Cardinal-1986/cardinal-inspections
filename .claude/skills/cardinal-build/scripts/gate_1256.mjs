/* gate_1256.mjs — "Uncontacted" on the Leads cards (A3).
   Seed adds a Lead WITH a phone (pL) beside the stock Approved / Scheduled jobs.
     A  the Lead card shows "Uncontacted · <age>"; no other stage does
     B  tapping Call on the Lead card raises "Did you reach out to <name>?"
        — and the tap was not cancelled (the phone still dials)
     C  "Not yet" closes it and writes nothing
     D  "Mark contacted" writes stage = Prospect, and the chip is gone
     E  Call on a non-Lead card raises nothing
     F  the chip and the sheet read at 4.5:1+ and the sheet's buttons are
        44px+, in both themes
   usage: node gate_1256.mjs [file.html] — RED on 1255, never a crash
*/
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
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const CONTRAST=`(function(el){
  function rgb(s){ var m=String(s).match(/[\\d.]+/g)||[]; return m.map(Number); }
  function L(c){ var a=c.slice(0,3).map(function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  var fg=rgb(getComputedStyle(el).color), n=el, stack=[];
  while(n && n.nodeType===1){ var b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3 && !(b.length>=4 && b[3]===0)){ stack.push(b); if(b.length<4||b[3]>0.9) break; } n=n.parentElement; }
  var base=[255,255,255]; for(var i=stack.length-1;i>=0;i--){ var s=stack[i], a=s.length>=4?s[3]:1; base=[0,1,2].map(function(k){ return s[k]*a+base[k]*(1-a); }); }
  var x=L(fg), y=L(base); return Math.round(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05))*100)/100;
})`;
async function boot(theme){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){} });
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{ const S=window.__SEED__||{}; if(!S.projects) return;
    S.projects.push({ id:'pL', name:'Gate Newlead', address:'12 Elm St', city:'Dayton', state:'OH', zip:'45402', stage:'Lead',
      created_by:'nick@cardinalrenovations.net', sales_rep:'nick@cardinalrenovations.net', checklist:'{}', phone:'937-555-0199', email:'gate@example.com', crm:'retail',
      created_at:new Date(Date.now()-3*86400000).toISOString(), updated_at:new Date().toISOString() });
    /* every other tap on a tel:/sms: link is stopped here, at the window, in the
       CAPTURE phase — the Leads list stops propagation, so a bubble listener never sees it */
    window.addEventListener('click', e=>{ const a=e.target.closest&&e.target.closest('a[href^="tel:"],a[href^="sms:"],a[href^="mailto:"]'); if(a) e.preventDefault(); }, true); });
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__TELL=[]; window.crTell=function(m){ window.__TELL.push(String(m)); };
    if(typeof window.openLeadsView==='function') window.openLeadsView(); });
  await page.waitForTimeout(700);
  return page;
}
const tap=(p,sel)=>p.evaluate(s=>{ const b=document.querySelector(s); if(!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); return true; },sel);
const ask=p=>p.evaluate(()=>{ const a=document.getElementById('ljAsk'); return a ? { open:a.classList.contains('open'), txt:a.textContent } : { open:false, txt:'' }; });

for(const theme of ['dark','light']){
  const p=await boot(theme);
  if(theme==='dark'){
    const chips=await p.evaluate(()=>[...document.querySelectorAll('#ljList .ljcard')].map(c=>[c.getAttribute('data-lj'), (c.querySelector('.ljunc')||{}).textContent||'']));
    const lead=chips.find(c=>c[0]==='pL');
    need('A  the Lead card says Uncontacted · 3 days', !!lead && lead[1]==='Uncontacted · 3 days', JSON.stringify(lead));
    need('A  no other stage wears it', chips.filter(c=>c[0]!=='pL'&&c[0]!=='p3').every(c=>!c[1]) && chips.length>=2, JSON.stringify(chips));
    /* the call must not be cancelled: dispatch on the real link with its href
       neutralised (so headless Chromium does not navigate) and read
       dispatchEvent's own answer — false means somebody called preventDefault */
    const notPrevented=await p.evaluate(()=>{ const l=document.querySelector('#ljList .ljcard[data-lj="pL"] a.ljbtn[href^="tel:"]'); if(!l) return null;
      const keep=l.getAttribute('href'); l.setAttribute('href','javascript:void 0');
      const r=l.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); l.setAttribute('href',keep); return r; });
    await p.waitForTimeout(300);
    let a=await ask(p);
    need('B  Call on the Lead raises "Did you reach out to Gate Newlead?"', a.open && /Did you reach out to Gate Newlead\?/.test(a.txt), JSON.stringify(a));
    need('B  and the tap was not cancelled — the phone still dials', notPrevented===true, String(notPrevented));
    await p.evaluate(()=>{ window.__WRITES__=[]; });
    await tap(p,'#ljAsk [data-ask="no"]'); await p.waitForTimeout(300);
    need('C  Not yet closes it and writes nothing', !(await ask(p)).open && await p.evaluate(()=>(window.__WRITES__||[]).filter(w=>w.op!=='select').length===0));
    await tap(p,'#ljList .ljcard[data-lj="pL"] a.ljbtn[href^="sms:"]'); await p.waitForTimeout(300);
    await tap(p,'#ljAsk [data-ask="yes"]'); await p.waitForTimeout(800);
    const w=await p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='projects'&&x.op==='update').map(x=>x.payload));
    need('D  Mark contacted writes stage = Prospect', w.some(x=>x&&x.stage==='Prospect'), JSON.stringify(w).slice(0,200));
    need('D  and the chip is gone', await p.evaluate(()=>{ const c=document.querySelector('#ljList .ljcard[data-lj="pL"]'); return !!c && !c.querySelector('.ljunc'); }));
    await tap(p,'#ljList .ljcard[data-lj="p2"] a.ljbtn[href^="tel:"]'); await p.waitForTimeout(300);
    need('E  Call on a non-Lead card raises nothing', !(await ask(p)).open);
    await p.close(); continue;
  }
  await p.close();
}
for(const theme of ['dark','light']){
  const p=await boot(theme);
  await tap(p,'#ljList .ljcard[data-lj="pL"] a.ljbtn[href^="tel:"]'); await p.waitForTimeout(300);
  const g=await p.evaluate((C)=>{ const ratio=eval(C);
    const els=[document.querySelector('#ljList .ljcard[data-lj="pL"] .ljunc'), ...document.querySelectorAll('#ljAsk b, #ljAsk p, #ljAsk button')].filter(Boolean);
    return { n:els.length, ink:els.map(e=>[e.className||e.tagName, ratio(e)]), h:[...document.querySelectorAll('#ljAsk button')].map(b=>Math.round(b.getBoundingClientRect().height)) }; }, CONTRAST);
  need('F  ['+theme+'] the chip and the sheet read at 4.5:1+', g.n===5 && g.ink.every(x=>x[1]>=4.5), JSON.stringify(g.ink));
  need('F  ['+theme+'] the sheet buttons are 44px+', g.h.length===2 && g.h.every(h=>h>=44), JSON.stringify(g.h));
  await p.close();
}
await browser.close();
console.log((fails.length?'GATE 1256 RED':'GATE 1256 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
