/* gate_1273.mjs — edit the email before it goes (Theo, 9 Oct: "allow us to edit
   the email subject and body"). Real Chromium, the INSTALLED app at 390px, the
   estimate builder → Publish → Email to client. /api/senddoc is a recording stub.
     A  Email to client opens a sheet (no native prompt) with To, Subject and
        Message prefilled: the client's address, "<title> — Cardinal Roofing &
        Renovations", and the message the email has always carried
     B  Send can be tapped in the installed app (not under the bottom nav)
     C  Cancel sends nothing
     D  what the rep typed is what goes: to, subject and message reach senddoc
     E  an empty message is refused in the sheet, and nothing is sent
     (A also proves the fix for a just-published document: before 1273 the app
      did not know its client, so To was blank and the greeting read "Hi,")
   usage: node gate_1273.mjs [file.html] — RED on 1272, never a crash
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
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 220000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const page=await ctx.newPage();
const dialogs=[]; page.on('dialog', d=>{ dialogs.push(d.type()+':'+d.message().slice(0,40)); d.dismiss(); });
const sent=[];
await page.route('**/*', async r=>{ const u=r.request().url();
  if(u.startsWith('https://sentinel.test/api/senddoc')){ try{ sent.push(JSON.parse(r.request().postData()||'{}')); }catch(_){ sent.push({}); } return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); }
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''}); });
await page.addInitScript(()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); }catch(_){} });
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2600);
await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await page.waitForTimeout(1500);
await page.evaluate(()=>{ const b=document.querySelector('#cr-est-view [data-act="bar-publish"]')||document.getElementById('cr-epub-btn'); if(b) b.click(); });
await page.waitForTimeout(4500);
const answerAsk=()=>page.evaluate(()=>{ const g=document.querySelector('#crAsk.open .askgo'); if(g) g.click(); });
async function openSheet(){ await page.evaluate(()=>{ const b=document.getElementById('emailDocBtn'); if(b) b.click(); });
  for(let i=0;i<16;i++){ await page.waitForTimeout(400); await answerAsk(); if(await page.$('#crEmailSheet.open')) return true; } return false; }

/* A */
const opened=await openSheet();
const a=await page.evaluate(()=>{ const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  return { to:v('emShAddr'), subj:v('emShSubj'), msg:v('emShMsg'), title:(document.getElementById('titleInput')||{}).value||'' }; });
need('A  Email to client opens the sheet, no native prompt', opened && dialogs.filter(d=>d.startsWith('prompt')).length===0, JSON.stringify({opened,dialogs}));
need('A  …To is the client’s address', a.to==='dave@dsmccoy.com' || /@/.test(a.to||''), JSON.stringify(a.to));
need('A  …Subject is "<title> — Cardinal Roofing & Renovations"', !!a.subj && / — Cardinal Roofing & Renovations$/.test(a.subj), JSON.stringify(a.subj));
need('A  …Message is the email’s usual words', /^Hi .+,\n\nPlease find your .+ attached\./.test(a.msg||'') && /Questions\? Just reply to this email\.$/.test(a.msg||''), JSON.stringify((a.msg||'').slice(0,120)));

/* B */
const hit=await page.evaluate(()=>{ const b=document.getElementById('emShGo'); if(!b) return 'missing'; b.scrollIntoView({block:'nearest'}); const r=b.getBoundingClientRect();
  const t=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); return t===b?'hit':'covered by '+(t?(t.id||(t.closest('[id]')||{}).id||t.tagName):'nothing'); });
need('B  Send can be tapped in the installed app', hit==='hit', hit);

/* C */
await page.evaluate(()=>{ const b=document.getElementById('emShNo'); if(b) b.click(); });
await page.waitForTimeout(1500);
need('C  Cancel sends nothing and closes', sent.length===0 && !(await page.$('#crEmailSheet.open')), JSON.stringify({n:sent.length}));

/* E */
await openSheet();
await page.evaluate(()=>{ const m=document.getElementById('emShMsg'); if(m) m.value='   '; const b=document.getElementById('emShGo'); if(b) b.click(); });
await page.waitForTimeout(800);
const est=await page.evaluate(()=>(document.getElementById('emShSt')||{}).textContent||'');
need('E  an empty message is refused, nothing sent', /message/i.test(est) && sent.length===0, JSON.stringify({est,n:sent.length}));

/* D */
await page.evaluate(()=>{ const s=(id,v)=>{ const e=document.getElementById(id); if(e) e.value=v; };
  s('emShAddr','dave.mccoy@example.com'); s('emShSubj','Your roof estimate from Jacob');
  s('emShMsg','Dave,\n\nGreat meeting you today. Here is the estimate we talked about.\n\nJacob');
  const b=document.getElementById('emShGo'); if(b) b.click(); });
for(let i=0;i<30 && !sent.length;i++){ await page.waitForTimeout(400); await answerAsk(); }
const s0=sent[0]||{};
need('D  what the rep typed is what goes: to, subject, message', s0.to==='dave.mccoy@example.com' && s0.subject==='Your roof estimate from Jacob' && s0.message==='Dave,\n\nGreat meeting you today. Here is the estimate we talked about.\n\nJacob' && typeof s0.html==='string' && s0.html.length>1000, JSON.stringify({to:s0.to,subject:s0.subject,message:s0.message}));

await browser.close();
console.log((fails.length?'GATE 1273 RED':'GATE 1273 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
