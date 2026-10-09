/* gate_1272.mjs — an estimate printed from an iPhone keeps the Letter layout
   (Theo, 9 Oct: Jacob's printout ran the description one word per line).
   Real Chromium, iPhone user agent, 390px, the installed-app estimate builder.
   Publish the estimate, press Print (1268's host path), then read it in print media.
     A  the print host is used (window.print, not the iframe)
     B  the document is laid out at the Letter text width, 7.2in = 691px,
        not at the phone's 390px
     C  so the description column is wide: at least half the page
     D  on a computer-width screen nothing about the iframe print changes
        (no host) — 1268's path for computers
   usage: node gate_1272.mjs [file.html] — RED on 1271, never a crash
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
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(ua, w){
  const ctx=await browser.newContext({viewport:{width:w,height:844},userAgent:ua,serviceWorkers:'block'});
  const page=await ctx.newPage(); page.on('dialog',d=>d.accept());
  await page.route('**/*', r=>r.request().url().startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''}));
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{ window.__printed=[]; window.print=function(){ window.__printed.push('page'); }; });
  await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
  await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{ const b=document.querySelector('#cr-est-view [data-act="bar-publish"]')||document.getElementById('cr-epub-btn'); if(b) b.click(); });
  await page.waitForTimeout(4500);
  await page.evaluate(()=>{ const f=document.getElementById('reportFrame'); if(f&&f.contentWindow) f.contentWindow.print=function(){ window.__printed.push('iframe'); };
    const b=document.getElementById('printBtn'); if(b) b.click(); });
  await page.waitForTimeout(800);
  return { ctx, page };
}

{ const { ctx, page } = await boot(IPHONE, 390);
  const p=await page.evaluate(()=>window.__printed.slice());
  need('A  iPhone: Print uses the page print (the host)', JSON.stringify(p)==='["page"]', JSON.stringify(p));
  await page.emulateMedia({ media:'print' });
  const r=await page.evaluate(()=>{ const h=document.getElementById('crPrintHost'); const sr=h&&h.shadowRoot; if(!sr) return { err:'no host' };
    const b=sr.querySelector('.crp-body'), t=sr.querySelector('table.items'); const td=t&&t.querySelector('td');
    return { body:b?Math.round(b.getBoundingClientRect().width):0, table:t?Math.round(t.getBoundingClientRect().width):0, desc:td?Math.round(td.getBoundingClientRect().width):0, txt:/ESTIMATE/i.test(b?b.textContent:'') }; });
  need('B  the copy is laid out at Letter text width (7.2in ≈ 691px), not the phone’s 390px', r.body>=686 && r.body<=696 && r.txt, JSON.stringify(r));
  need('C  so the description column gets at least half the page', r.table>=600 && r.desc>=r.table/2, JSON.stringify(r));
  await ctx.close(); }

{ const { ctx, page } = await boot(undefined, 1280);
  const p=await page.evaluate(()=>({ p:window.__printed.slice(), host:!!document.getElementById('crPrintHost') }));
  need('D  a computer keeps the iframe print, no host', JSON.stringify(p.p)==='["iframe"]' && !p.host, JSON.stringify(p));
  await ctx.close(); }

await browser.close();
console.log((fails.length?'GATE 1272 RED':'GATE 1272 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
