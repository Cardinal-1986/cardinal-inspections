/* gate_1269.mjs — the estimate's thumb bar in the INSTALLED app (Theo, 9 Oct:
   "There's still no publish button or a way to email").
   Real Chromium at 390px with navigator.standalone = true, so the app runs as the
   installed PWA and shows its bottom nav (#pwaNav, z 9990).
     A  Save, Email and Publish are each the element a tap at their centre hits
        (on 1268 the nav was on top of the whole bar)
     B  in the browser (not installed) the bar is where it always was, bottom 0
     C  Email publishes, the published estimate opens, and its Email to client
        runs — one tap
     D  Publish alone does NOT start an email
   usage: node gate_1269.mjs [file.html] — RED on 1268, never a crash
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
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function boot(installed){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await ctx.newPage();
  page.on('dialog', d=>d.accept());
  await page.route('**/*', r=>{ const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''}); });
  if(installed) await page.addInitScript(()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); }catch(_){} });
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2600);
  const st=await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); if(!s) return 'no estbuilder state';
    try{ await s.run(); }catch(e){ return 'threw: '+e.message; } await new Promise(r=>setTimeout(r,1500)); return 'ok'; });
  return { ctx, page, st };
}
const HIT=(page,act)=>page.evaluate((act)=>{ const b=document.querySelector('#cr-est-view [data-act="'+act+'"]'); if(!b) return 'missing';
  const r=b.getBoundingClientRect(); if(!r.width) return 'not shown'; const t=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
  return t && (t===b || b.contains(t)) ? 'hit' : ('covered by '+(t?(t.id||(t.closest('[id]')||{}).id||t.tagName):'nothing')); }, act);

/* A, C, D — installed */
{ const { ctx, page, st } = await boot(true);
  need('setup  the estimate builder opens in the installed app', st==='ok' && await page.evaluate(()=>document.body.classList.contains('standalone')), st);
  const h={ save:await HIT(page,'bar-save'), email:await HIT(page,'bar-email'), pub:await HIT(page,'bar-publish') };
  need('A  installed app: Save, Email and Publish can each be tapped (not under the bottom nav)', h.save==='hit' && h.email==='hit' && h.pub==='hit', JSON.stringify(h));

  /* D first: Publish alone */
  await page.evaluate(()=>{ window.__WRITES__=[]; window.__emailTaps=0;
    const eb=document.getElementById('emailDocBtn'); if(eb) eb.addEventListener('click', ()=>{ window.__emailTaps++; }, true); });
  await page.evaluate(()=>{ const b=document.querySelector('#cr-est-view [data-act="bar-publish"]'); if(b) b.click(); });
  await page.waitForTimeout(4000);
  const d=await page.evaluate(()=>({ ins:(window.__WRITES__||[]).filter(x=>x.table==='inspection_reports'&&x.op==='insert').length, taps:window.__emailTaps,
    ed:getComputedStyle(document.getElementById('editorView')).display }));
  need('D  Publish alone publishes and opens the estimate, and does NOT start an email', d.ins===1 && d.ed!=='none' && d.taps===0, JSON.stringify(d));

  /* C: back to the builder, Email */
  await page.evaluate(async()=>{ try{ await closeEditor(); }catch(_){} });
  await page.waitForTimeout(800);
  await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{ window.__WRITES__=[]; window.__emailTaps=0; const b=document.querySelector('#cr-est-view [data-act="bar-email"]'); if(b) b.click(); });
  await page.waitForTimeout(6000);
  const c=await page.evaluate(()=>({ ins:(window.__WRITES__||[]).filter(x=>x.table==='inspection_reports'&&x.op==='insert').length, taps:window.__emailTaps,
    ed:getComputedStyle(document.getElementById('editorView')).display, doc:(document.getElementById('reportFrame')||{dataset:{}}).dataset.docId||'' }));
  need('C  Email publishes the estimate, opens it, and runs its Email to client', c.ins===1 && c.ed!=='none' && !!c.doc && c.taps===1, JSON.stringify(c));
  await ctx.close(); }

/* B — the browser, unchanged */
{ const { ctx, page, st } = await boot(false);
  const b=await page.evaluate(()=>{ const bar=document.querySelector('#cr-est-view .cr-est-phonebar'); return bar?{d:getComputedStyle(bar).display,b:getComputedStyle(bar).bottom}:null; });
  need('B  in the browser the bar is where it always was (bottom 0)', st==='ok' && b && b.d==='flex' && b.b==='0px' && await HIT(page,'bar-publish')==='hit', JSON.stringify({st,b}));
  await ctx.close(); }

await browser.close();
console.log((fails.length?'GATE 1269 RED':'GATE 1269 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
