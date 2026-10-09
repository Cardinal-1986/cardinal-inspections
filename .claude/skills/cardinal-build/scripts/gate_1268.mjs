/* gate_1268.mjs — Print / PDF on iPhone and iPad (Jacob: "it doesn't do anything").
   Real Chromium. window.print and each iframe's print are replaced by spies, so
   the gate sees WHICH print ran; the print view is then checked with print media.
     A  a computer keeps the iframe print (no host, page print not called)
     B  an iPhone user agent prints the PAGE: window.print runs, the iframe's
        print does not
     C  in print media only the document shows: the app is hidden, the host is
        visible, and the document's own text is in it
     D  the document's CSS still applies (its body rule styles the copy) and the
        app's CSS does not leak in; its @page rule moves to the page
     E  after printing, the host and its style are removed
     F  the report editor's Print button goes through it (a real report)
   usage: node gate_1268.mjs [file.html] — RED on 1267, never a crash
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
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const DOC='<!DOCTYPE html><html><head><style>@page{margin:0.5in;} body{color:rgb(1,2,3);font-family:Georgia;} .est-ttl{font-size:30px;}</style></head><body class="estdoc"><h1 class="est-ttl">ESTIMATE EST-2026-0912</h1><p>Prepared for Dave McCoy</p></body></html>';
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(ua){
  const ctx=await browser.newContext({viewport:{width:390,height:844}, userAgent: ua, serviceWorkers:'block'});
  const page=await ctx.newPage();
  page.on('dialog', d=>d.accept());
  await page.route('**/*', r=>{ const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''}); });
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{ window.__printed=[]; window.print=function(){ window.__printed.push('page'); }; });
  await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  return { ctx, page };
}
/* a stand-in document in an iframe, its print spied */
const mkFrame=(page)=>page.evaluate((html)=>new Promise(res=>{ const f=document.createElement('iframe'); f.id='g1268f';
  f.onload=()=>{ f.contentWindow.print=function(){ window.__printed.push('iframe'); }; res(true); }; f.srcdoc=html; document.body.appendChild(f); }), DOC);
const callPrint=(page)=>page.evaluate(()=>{ try{ return !!(window.CardinalPrint && window.CardinalPrint.frame(document.getElementById('g1268f'))); }catch(e){ return 'threw '+e.message; } });

/* A */
{ const { ctx, page } = await boot(undefined);
  await mkFrame(page); await callPrint(page);
  const r=await page.evaluate(()=>({ p:window.__printed.slice(), host:!!document.getElementById('crPrintHost') }));
  need('A  a computer keeps the iframe print', JSON.stringify(r.p)==='["iframe"]' && !r.host, JSON.stringify(r));
  await ctx.close(); }

/* B–E */
{ const { ctx, page } = await boot(IPHONE);
  await mkFrame(page); const ok=await callPrint(page);
  const r=await page.evaluate(()=>({ p:window.__printed.slice() }));
  need('B  an iPhone prints the PAGE, not the iframe', ok===true && JSON.stringify(r.p)==='["page"]', JSON.stringify({ok,r}));
  await page.emulateMedia({ media:'print' });
  const c=await page.evaluate(()=>{ const h=document.getElementById('crPrintHost'); const sr=h&&h.shadowRoot;
    const kids=[...document.body.children].filter(e=>e.id!=='crPrintHost'&&getComputedStyle(e).display!=='none').map(e=>e.id||e.tagName);
    const b=sr&&sr.querySelector('.crp-body'); const t=sr&&sr.querySelector('.est-ttl');
    const top=(document.getElementById('crPrintHostStyle')||{}).textContent||'';
    return { host:h?getComputedStyle(h).display:'none', visibleApp:kids.slice(0,5), text:b?b.textContent:'', color:b?getComputedStyle(b).color:'', font:t?getComputedStyle(t).fontSize:'', page:/@page\{margin:0.5in;\}/.test(top), cls:b?b.className:'' }; });
  need('C  in print, only the document shows: the app hidden, the host shown, its text inside', c.host==='block' && c.visibleApp.length===0 && /ESTIMATE EST-2026-0912/.test(c.text) && /Dave McCoy/.test(c.text), JSON.stringify(c));
  need('D  the document’s own CSS styles the copy (body rule, class rule, body class kept)', c.color==='rgb(1, 2, 3)' && c.font==='30px' && /estdoc/.test(c.cls), JSON.stringify(c));
  need('D  …and its @page rule moves to the page', c.page, JSON.stringify(c));
  await page.emulateMedia({ media:'screen' });
  const scr=await page.evaluate(()=>{ const h=document.getElementById('crPrintHost'); return h?getComputedStyle(h).display:'gone'; });
  need('D  on screen the host is invisible', scr==='none', scr);
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  const e=await page.evaluate(()=>({ h:!!document.getElementById('crPrintHost'), s:!!document.getElementById('crPrintHostStyle') }));
  need('E  after printing, the host and its style are removed', !e.h && !e.s, JSON.stringify(e));

  /* F — a real report in the editor, Print button */
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const x=document.getElementById(id); if(x) x.style.display='none';}); location.hash='#p/p1'; });
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{ try{ showTab('inspections'); }catch(_){} const b=document.getElementById('pNewReportBtn'); if(b) b.click(); });
  await page.evaluate(()=>{ const q=s=>document.querySelector(s); const n=q('#insgSheet [data-ig="next"]'); if(n) n.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ const s=document.querySelector('#insgSheet [data-ig="skip"]'); if(s) s.click(); });
  await page.waitForTimeout(700);
  await page.evaluate(()=>{ const s=document.querySelector('#insgSheet [data-ig="plain"]'); if(s) s.click(); });
  await page.waitForTimeout(600);
  /* no checklist on this job: the creator asks (crAsk) whether to go ahead */
  await page.evaluate(()=>{ const g=document.querySelector('#crAsk.open .askgo'); if(g) g.click(); });
  await page.waitForTimeout(3000);
  await page.evaluate(()=>{ window.__printed=[]; const f=document.getElementById('reportFrame'); if(f&&f.contentWindow) f.contentWindow.print=function(){ window.__printed.push('iframe'); }; const b=document.getElementById('printBtn'); if(b) b.click(); });
  await page.waitForTimeout(1500);
  const f=await page.evaluate(()=>{ const h=document.getElementById('crPrintHost'); window.__dbg={h:!!h, sr:!!(h&&h.shadowRoot), kids:h&&h.shadowRoot?[...h.shadowRoot.children].map(e=>e.tagName+'.'+e.className).join(','):'', len:h&&h.shadowRoot?h.shadowRoot.innerHTML.length:0}; return { dbg:window.__dbg, p:window.__printed.slice(), text:h&&h.shadowRoot&&h.shadowRoot.querySelector('.crp-body')?h.shadowRoot.querySelector('.crp-body').textContent:'' }; });
  need('F  the report editor’s Print prints the page, with the report in it', JSON.stringify(f.p)==='["page"]' && /Inspection Overview/.test(f.text), JSON.stringify({p:f.p,t:f.text.slice(0,80),dbg:f.dbg}));
  await ctx.close(); }

await browser.close();
console.log((fails.length?'GATE 1268 RED':'GATE 1268 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
