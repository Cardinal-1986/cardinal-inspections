/* gate_1259.mjs — tapping an alert opens the job, even with the app open.
     A  sw.js's notificationclick, run in Node with a fake worker scope at
        https://app.cardinalroster.com/sw.js: a push carrying '#p/123/punch'
        opens https://app.cardinalroster.com/#p/123/punch — both when no window
        is open (openWindow) and when one is (navigate) — never /sw.js#…;
        '#route/scottie' and an absolute same-site URL resolve the same way
     B  in Chromium, signed in and sitting on Home, a hashchange to #p/p1/punch
        opens Mark Diamond on the Punch tab; a second one to #p/p2 opens Kathy May
     C  signed OUT, the same hashchange does nothing (the boot restore owns it)
   usage: node gate_1259.mjs [index.html] [sw.js] — RED on 1258, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const SWF=process.argv[3]||join(HERE,'../../../../sw.js');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();

/* A — the worker, with the browser's own URL rule: whatever navigate/openWindow
   receive is parsed against the WORKER's address, exactly as the spec says */
const SWURL='https://app.cardinalroster.com/sw.js', SCOPE='https://app.cardinalroster.com/';
async function click(url, open){
  const handlers={}; const seen=[];
  const self={ location:new URL(SWURL), registration:{ scope:SCOPE, showNotification:()=>Promise.resolve() },
    addEventListener:(t,f)=>{ (handlers[t]=handlers[t]||[]).push(f); }, skipWaiting:()=>Promise.resolve(), clients:null };
  const win={ focus:()=>Promise.resolve(), navigate:(u)=>{ seen.push(['navigate', new URL(u, SWURL).href]); return Promise.resolve(); } };
  const clients={ matchAll:()=>Promise.resolve(open?[win]:[]), openWindow:(u)=>{ seen.push(['openWindow', new URL(u, SWURL).href]); return Promise.resolve(); }, claim:()=>Promise.resolve() };
  self.clients=clients;
  const ctx=vm.createContext({ self, clients, caches:{ open:()=>Promise.resolve({ addAll:()=>Promise.resolve(), put:()=>Promise.resolve(), match:()=>Promise.resolve() }), keys:()=>Promise.resolve([]), match:()=>Promise.resolve() },
    fetch:()=>Promise.reject(new Error('no net')), URL, Promise, console:{ log(){}, warn(){}, error(){} }, setTimeout, Response:function(){}, Request:function(){} });
  try{ vm.runInContext(readFileSync(SWF,'utf8'), ctx); }catch(e){ return 'load: '+e.message; }
  const h=(handlers.notificationclick||[])[0]; if(!h) return 'no notificationclick';
  let p=null; h({ notification:{ close(){}, data:{ url } }, waitUntil:(x)=>{ p=x; } });
  try{ await p; }catch(e){}
  return seen;
}
for(const [u, want] of [['#p/123/punch', SCOPE+'#p/123/punch'], ['#route/scottie', SCOPE+'#route/scottie'], [SCOPE+'#p/9', SCOPE+'#p/9']]){
  const shut=await click(u,false), open=await click(u,true);
  need('A  "'+u+'" with no window open → openWindow '+want, Array.isArray(shut) && shut.length===1 && shut[0][0]==='openWindow' && shut[0][1]===want, JSON.stringify(shut));
  need('A  "'+u+'" with the app open → navigate '+want, Array.isArray(open) && open.length===1 && open[0][0]==='navigate' && open[0][1]===want, JSON.stringify(open));
}

/* B + C — the open app */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(signedOut){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate((so)=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    if(so){ window.__savedUser=currentUser; currentUser=null; } }, !!signedOut);
  return page;
}
const where=p=>p.evaluate(()=>({ id: (window.currentProject||{}).id || null, name: (window.currentProject||{}).name || null, tab: window.__curTab || null }));
const b=await boot(false);
await b.evaluate(()=>{ location.hash='#p/p1/punch'; }); await b.waitForTimeout(1200);
let w=await where(b);
need('B  signed in on Home: #p/p1/punch opens Mark Diamond on Punch', w.id==='p1' && w.tab==='punch', JSON.stringify(w));
await b.evaluate(()=>{ location.hash='#p/p2'; }); await b.waitForTimeout(1200);
w=await where(b);
need('B  a second alert (#p/p2) opens Kathy May', w.id==='p2', JSON.stringify(w));
await b.close();
const c=await boot(true);
await c.evaluate(()=>{ location.hash='#p/p1/punch'; }); await c.waitForTimeout(900);
w=await where(c);
need('C  signed out, the hashchange does nothing', w.id===null, JSON.stringify(w));
await c.close();
await browser.close();
console.log((fails.length?'GATE 1259 RED':'GATE 1259 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
