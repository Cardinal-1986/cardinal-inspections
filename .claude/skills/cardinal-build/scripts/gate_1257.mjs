/* gate_1257.mjs — Company Documents stops trapping you.
     A  View on a contract master opens #cr-docview INSIDE the app, titled with
        the document's name; the page did not navigate and no window opened
     B  with pdf.js and the real PDF served (PDFJS_DIR=dir holding pdf.min.js +
        pdf.worker.min.js) every page is drawn on a canvas; SKIPPED, and said
        so, without it
     C  Back closes it and the Company Documents list is still there;
        hideAllViews() closes it too
     D  the Roof Pre-Install Guide's Preview opens in the viewer (not a window)
        and names the person looking — Theo (the rig's ?as= knows theo / curtis /
        scottie / nick only) — never the old hard-coded "Nick Hey"
     E  in the INSTALLED app (standalone) Download opens the share sheet with the
        absolute PDF address instead of navigating; in a browser it is left alone
     F  Preview and Download read at 4.5:1+ on their white rows; the Back bar's
        controls are 44px+ and read at 4.5:1+
   usage: node gate_1257.mjs [file.html] — RED on 1256, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=join(HERE,'../../../..');
const FILE=process.argv[2]||join(ROOT,'index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
const PD=process.env.PDFJS_DIR||'';
const PDFJS=(PD && existsSync(join(PD,'pdf.min.js'))) ? { lib:readFileSync(join(PD,'pdf.min.js')), worker:readFileSync(join(PD,'pdf.worker.min.js')) } : null;
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 220000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const CONTRAST=`(function(el){
  function rgb(s){ var m=String(s).match(/[\\d.]+/g)||[]; return m.map(Number); }
  function L(c){ var a=c.slice(0,3).map(function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  var fg=rgb(getComputedStyle(el).color), n=el, stack=[];
  while(n && n.nodeType===1){ var b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3 && !(b.length>=4 && b[3]===0)){ stack.push(b); if(b.length<4||b[3]>0.9) break; } n=n.parentElement; }
  var base=[255,255,255]; for(var i=stack.length-1;i>=0;i--){ var s=stack[i], a=s.length>=4?s[3]:1; base=[0,1,2].map(function(k){ return s[k]*a+base[k]*(1-a); }); }
  var x=L(fg), y=L(base); return Math.round(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05))*100)/100;
})`;
async function boot(as, standalone){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/docs/')){ const f=join(ROOT, decodeURIComponent(new URL(u).pathname)); return existsSync(f) ? r.fulfill({status:200,contentType:'application/pdf',body:readFileSync(f)}) : r.fulfill({status:404,body:''}); }
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(PDFJS && /pdf\.js\/3\.11\.174\/pdf\.min\.js/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:PDFJS.lib});
    if(PDFJS && /pdf\.js\/3\.11\.174\/pdf\.worker\.min\.js/.test(u)) return r.fulfill({status:200,contentType:'application/javascript',body:PDFJS.worker});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript((sa)=>{ window.__OPENED=0; const o=window.open; window.open=function(){ window.__OPENED++; return null; };
    window.__SHARED=[]; if(sa){ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); }catch(e){}
      navigator.share=function(d){ window.__SHARED.push(d); return Promise.resolve(); }; } }, !!standalone);
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__TELL=[]; window.crTell=function(m){ window.__TELL.push(String(m)); };
    const b=document.querySelector('[data-nav="companydocs"]'); if(b) b.click(); });
  await page.waitForTimeout(700);
  return page;
}
/* click a link with its REAL href (the handler reads it); returns dispatchEvent's
   answer — false means somebody called preventDefault. Only ever the LAST action
   on a page, because an un-intercepted click may navigate it. */
const clickLink=(p,sel)=>p.evaluate(s=>{ const a=document.querySelector(s); if(!a) return null;
  return a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); },sel);
const dv=p=>p.evaluate(()=>{ const v=document.getElementById('cr-docview'); return v ? { open:v.classList.contains('open'), ttl:(document.getElementById('dvTtl')||{}).textContent||'',
  canv:v.querySelectorAll('canvas').length, ifr:v.querySelector('iframe') ? (v.querySelector('iframe').getAttribute('srcdoc')||v.querySelector('iframe').getAttribute('src')||'') : '' } : { open:false, ttl:'', canv:0, ifr:'' }; });

const p=await boot('theo', false);
const VIEW='#cdDocList .cdocrow a.btn:not([data-cddl])';
const url0=await p.evaluate(()=>location.href);
/* the View link must be intercepted with its REAL href in place (the handler reads it) */
const viewed=await p.evaluate(s=>{ const a=document.querySelector(s); if(!a) return null; return a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); }, VIEW);
await p.waitForTimeout(PDFJS?2500:900);
let d=await dv(p);
need('A  View opens the viewer inside the app', viewed===false && d.open, JSON.stringify({viewed, open:d.open}));
need('A  titled with the document\'s name', d.ttl==='Construction Agreement (Master)', d.ttl);
need('A  the page did not navigate and no window opened', await p.evaluate(u=>location.href===u && window.__OPENED===0, url0));
if(PDFJS){
  const pages=await p.evaluate(async()=>{ const lib=await loadPdfJs(); const pdf=await lib.getDocument('docs/Cardinal_Roofing_Contract.pdf').promise; return pdf.numPages; });
  need('B  every page of the PDF is drawn ('+pages+')', d.canv===pages && pages>0, 'canvases '+d.canv);
} else {
  console.log('  SKIP  B  page drawing — set PDFJS_DIR to a folder holding pdf.min.js + pdf.worker.min.js');
  /* the rig serves an EMPTY reader script, so loadPdfJs never answers: the viewer must fall back */
  await p.waitForTimeout(12500);
  const fb=await dv(p);
  need('B  with no working reader, the PDF still shows (the browser\'s own view, after 12 s)', fb.open && /Cardinal_Roofing_Contract\.pdf$/.test(fb.ifr), JSON.stringify(fb));
}
const bar=await p.evaluate((C)=>{ const ratio=eval(C); return [...document.querySelectorAll('#cr-docview .dvback, #cr-docview .dvact, #cr-docview .dvttl')].filter(e=>e.getClientRects().length).map(e=>({c:e.className, h:Math.round(e.getBoundingClientRect().height), r:ratio(e)})); }, CONTRAST);
need('F  the Back bar: 44px+ controls, 4.5:1+ ink', bar.length===3 && bar.filter(b=>b.c!=='dvttl').every(b=>b.h>=44) && bar.every(b=>b.r>=4.5), JSON.stringify(bar));
await p.evaluate(()=>{ const b=document.querySelector('#cr-docview [data-dv="back"]'); if(b) b.click(); }); await p.waitForTimeout(500);
d=await dv(p);
need('C  Back closes it, Company Documents still showing', !d.open && await p.evaluate(()=>getComputedStyle(document.getElementById('companyDocsView')).display!=='none'));
await p.evaluate(s=>{ const a=document.querySelector(s); if(a) a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); }, VIEW); await p.waitForTimeout(400);
await p.evaluate(()=>{ try{ window.hideAllViews(); }catch(e){} }); await p.waitForTimeout(200);
need('C  hideAllViews() closes it', !(await dv(p)).open);
await p.evaluate(()=>{ const b=document.querySelector('[data-nav="companydocs"]'); if(b) b.click(); }); await p.waitForTimeout(500);
await p.evaluate(()=>{ const b=document.querySelector('[data-cr-guide-preview-doc="preinstall_roof"]'); if(b) b.click(); }); await p.waitForTimeout(1200);
d=await dv(p);
need('D  the guide Preview opens in the viewer, not a window', d.open && /Roof Pre-Install Guide/.test(d.ttl) && await p.evaluate(()=>window.__OPENED===0), JSON.stringify({open:d.open,ttl:d.ttl}));
need('D  it names Theo, the person looking, never "Nick Hey"', /Your Sales Rep &mdash; Theo Dorion/.test(d.ifr) && !/Nick Hey/.test(d.ifr), (d.ifr.match(/Your Sales Rep[^<]{0,40}/)||[''])[0]);
await p.evaluate(()=>{ const b=document.querySelector('#cr-docview [data-dv="back"]'); if(b) b.click(); }); await p.waitForTimeout(400);
const ink=await p.evaluate((C)=>{ const ratio=eval(C); return [...document.querySelectorAll('#cdDocList .btn.ghost')].filter(e=>e.getClientRects().length).map(e=>[e.textContent.trim(), ratio(e)]); }, CONTRAST);
need('F  Preview and Download are readable (4.5:1+)', ink.length>=4 && ink.every(x=>x[1]>=4.5), JSON.stringify(ink));
const br=await clickLink(p,'#cdDocList .cdocrow a[data-cddl]');
need('E  in a browser, Download is left alone', br===true && await p.evaluate(()=>window.__SHARED.length===0), String(br));
await p.close();

const s=await boot('theo', true);
const sr=await clickLink(s,'#cdDocList .cdocrow a[data-cddl]');
const sh=await s.evaluate(()=>window.__SHARED);
need('E  in the installed app, Download opens the share sheet', sr===false && sh.length===1 && /^https:\/\/sentinel\.test\/docs\/Cardinal_Roofing_Contract\.pdf$/.test(sh[0].url), JSON.stringify({sr, sh}));
await s.close();
await browser.close();
console.log((fails.length?'GATE 1257 RED':'GATE 1257 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
