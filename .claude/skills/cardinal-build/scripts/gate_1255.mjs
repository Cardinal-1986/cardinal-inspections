/* gate_1255.mjs — the scheduled punch buzzes (4C).
     A  the planner, at fixed instants (Dayton time, DST on both sides):
        7am Wed → Theo's report + the 2-day (Curtis) and 5-day (Theo)
        escalations, held jobs never named; 6am → nothing; 3pm → Curtis
        "Plan Thursday"; 6pm → one list per person with stops tomorrow, linked
        to #route/<name>; Sat 6pm → Monday's list; Sunday → nothing;
        Mon 2 Nov 7:05 EST (12:05 UTC) → the report, 11:05 UTC → nothing
     B  the route: fail-closed without CRON_SECRET, 401 on a wrong secret;
        dry=1 sends nothing; a real run claims before sending, and a SECOND
        run of the same hour sends nothing; a person with no push
        subscription gets the buzz by email
     C  the server's stop rule agrees with the route page's day-strip counts
        on the same seed, for every person and every day
     D  in Chromium: #route/scottie at load opens Scottie's route and puts
        the hash back to #h; #punch opens the Punch List; a hashchange to
        #route/curtis while the app is open opens Curtis's route
   usage: node gate_1255.mjs [file.html] [api/punch-buzz.js] — RED on 1254, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const API=resolve(process.argv[3]||join(HERE,'../../../../api/punch-buzz.js'));
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();

let M=null; try{ if(existsSync(API)) M=await import(pathToFileURL(API).href); }catch(e){ console.log('  (could not load '+API+': '+e.message+')'); }
const plan=(M&&M.planBuzzes)||(()=>null);

/* the seed: Wed 7 Oct 2026 is "today" for section A */
const SC='scottie@cardinalrenovations.net', CU='curtis@cardinalrenovations.net', TH='theo@cardinalrenovations.net';
const base={ status:'open', photos:[], comments:[], steps:[], visits:[], kind:'punch' };
const ITEMS=[
  Object.assign({},base,{ id:'a1', project_id:'p1', title:'Ridge cap', assigned_to:SC, scheduled_at:'2026-10-08', scheduled_time:'13:00:00' }),
  Object.assign({},base,{ id:'a2', project_id:'p2', title:'Gutter guard', assigned_to:SC, scheduled_at:'2026-10-08', kind:'ticket' }),
  Object.assign({},base,{ id:'a3', project_id:'p1', title:'Storm door', assigned_to:CU, scheduled_at:'2026-10-07' }),
  Object.assign({},base,{ id:'a4', project_id:'p2', title:'Flashing', assigned_to:SC, scheduled_at:'2026-10-04' }),   /* 3 days late */
  Object.assign({},base,{ id:'a5', project_id:'p1', title:'Skylight', assigned_to:CU, scheduled_at:'2026-09-30' }),   /* 7 days late */
  Object.assign({},base,{ id:'a6', project_id:'p1', title:'Held one', assigned_to:SC, scheduled_at:'2026-09-29', hold_reason:'materials', hold_until:'2026-10-20' }),
  Object.assign({},base,{ id:'a7', project_id:'p2', title:'Queue', assigned_to:null, scheduled_at:null }),
  Object.assign({},base,{ id:'a8', project_id:'p1', title:'Done', status:'done', assigned_to:CU, done_at:'2026-10-06T18:00:00Z', scheduled_at:'2026-10-06' }),
  Object.assign({},base,{ id:'a9', project_id:'p2', title:'Monday job', assigned_to:CU, scheduled_at:'2026-10-12' })
];
const PROJ=[{id:'p1',name:'Mark Diamond'},{id:'p2',name:'Kathy May'}];
const at=s=>new Date(s);
const keys=b=>b?b.map(x=>x.key).sort().join(','):'null';

/* A */
const am=plan(ITEMS,PROJ,at('2026-10-07T11:05:00Z'));
need('A  7am Wed: report + both escalations', keys(am)==='am:2026-10-07,esc2:2026-10-07,esc5:2026-10-07', keys(am));
const rep=(am||[]).find(b=>b.key.startsWith('am:'))||{};
need('A  the report goes to Theo and counts it right', JSON.stringify(rep.to)===JSON.stringify([TH]) &&
  /Today: 1 stop \(Curtis 1\)/.test(rep.body||'') && /Past due: 2\./.test(rep.body||'') && /Unassigned: 1\./.test(rep.body||'') && /Closed yesterday: 1\./.test(rep.body||''), rep.body);
const e2=(am||[]).find(b=>b.key.startsWith('esc2'))||{}, e5=(am||[]).find(b=>b.key.startsWith('esc5'))||{};
need('A  2-day escalation → Curtis, both late jobs, never the held one', JSON.stringify(e2.to)===JSON.stringify([CU]) && /^2 jobs 2\+ days past due$/.test(e2.title||'') && !/Held/.test(e2.body||'') && (e2.claims||[]).join(',')==='esc2:a4:2026-10-04,esc2:a5:2026-09-30', JSON.stringify({t:e2.title,c:e2.claims}));
need('A  5-day escalation → Theo, only the 7-day job', JSON.stringify(e5.to)===JSON.stringify([TH]) && (e5.claims||[]).join(',')==='esc5:a5:2026-09-30', JSON.stringify(e5.claims));
need('A  6am → nothing', keys(plan(ITEMS,PROJ,at('2026-10-07T10:05:00Z')))==='');
const pl=plan(ITEMS,PROJ,at('2026-10-07T19:05:00Z'))||[];
need('A  3pm → Curtis "Plan Thursday"', pl.length===1 && pl[0].title==='Plan Thursday' && pl[0].to[0]===CU && /Scottie 2/.test(pl[0].body) && /No date: 1/.test(pl[0].body), JSON.stringify(pl));
const cr=plan(ITEMS,PROJ,at('2026-10-07T22:05:00Z'))||[];
need('A  6pm → one list, Scottie\'s, linked to his route', cr.length===1 && cr[0].to[0]===SC && cr[0].title==='Your Thursday: 2 stops' && cr[0].url==='#route/scottie' && /^1:00 PM Mark Diamond/.test(cr[0].body), JSON.stringify(cr));
const sat=plan(ITEMS,PROJ,at('2026-10-10T22:05:00Z'))||[];
need('A  Sat 6pm → Monday\'s list', sat.length===1 && sat[0].key==='crew:2026-10-12:'+CU && sat[0].title==='Your Monday: 1 stop', keys(sat));
need('A  Sunday → nothing at any slot', ['11','19','22'].every(h=>keys(plan(ITEMS,PROJ,at('2026-10-11T'+h+':05:00Z')))===''));
need('A  after DST ends: 12:05 UTC is 7am, 11:05 UTC is not', keys(plan(ITEMS,PROJ,at('2026-11-02T12:05:00Z'))).startsWith('am:2026-11-02') && keys(plan(ITEMS,PROJ,at('2026-11-02T11:05:00Z')))==='');

/* B — the handler, with fetch stubbed */
const H=M&&M.default;
async function call(env, q, store){
  const old={...process.env}; Object.assign(process.env, env);
  const sent={ push:0, mail:[] }; const realFetch=global.fetch;
  global.fetch=async (u,o={})=>{ u=String(u);
    const J=(x)=>({ ok:true, status:200, json:async()=>x, text:async()=>JSON.stringify(x) });
    if(u.includes('/punch_items')) return J(ITEMS);
    if(u.includes('/projects')) return J(PROJ);
    if(u.includes('/push_subs')) return J(u.includes(encodeURIComponent(TH))?[{endpoint:'e1',sub:{endpoint:'e1'}}]:[]);
    if(u.includes('/punch_buzz_log')){ const rows=JSON.parse(o.body).filter(r=>!store.has(r.key)); rows.forEach(r=>store.add(r.key)); return J(rows); }
    if(u.includes('api.resend.com')){ sent.mail.push(JSON.parse(o.body)); return J({id:'x'}); }
    return J([]); };
  const RealDate=Date; const fixed=new RealDate('2026-10-07T22:05:00Z');
  global.Date=class extends RealDate{ constructor(...a){ super(...(a.length?a:[fixed.getTime()])); } static now(){ return fixed.getTime(); } };
  let out={code:0,body:null}; const res={ status(c){ out.code=c; return this; }, json(b){ out.body=b; return this; } };
  try{ await H({ headers:{ authorization: env.__auth||'' }, query:q||{} }, res); }catch(e){ out.err=e.message; }
  global.fetch=realFetch; global.Date=RealDate; process.env=old;
  return Object.assign(out,{sent});
}
if(H){
  const st=new Set();
  const r0=await call({ CRON_SECRET:'', __auth:'Bearer x' },{},st);
  need('B  no CRON_SECRET → refused', r0.code===401, JSON.stringify(r0.body));
  const r1=await call({ CRON_SECRET:'s3', __auth:'Bearer nope', SUPABASE_SERVICE_ROLE_KEY:'k' },{},st);
  need('B  wrong secret → 401', r1.code===401);
  const ok={ CRON_SECRET:'s3', __auth:'Bearer s3', SUPABASE_SERVICE_ROLE_KEY:'k', RESEND_API_KEY:'r', VAPID_PRIVATE_KEY:'' };
  const r2=await call(ok,{dry:'1'},st);
  need('B  dry=1 plans and sends nothing', r2.body&&r2.body.dry===true && r2.body.buzzes.length===1 && st.size===0 && r2.sent.mail.length===0, JSON.stringify(r2.body).slice(0,160));
  const r3=await call(ok,{},st);
  need('B  a real run claims, then emails Scottie (no push subscription)', st.has('crew:2026-10-08:'+SC) && r3.sent.mail.length===1 && r3.sent.mail[0].to[0]===SC && /Your Thursday/.test(r3.sent.mail[0].subject) && /#route\/scottie/.test(r3.sent.mail[0].html), JSON.stringify(r3.body).slice(0,200));
  const r4=await call(ok,{},st);
  need('B  the same hour again sends nothing', r4.sent.mail.length===0 && r4.body && r4.body.sent.length===0, JSON.stringify(r4.body).slice(0,160));
} else need('B  api/punch-buzz.js exports a handler', false);

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(hash){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=curtis'+(hash||''),{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2600);
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}}); });
  return page;
}
const rstate=p=>p.evaluate(()=>{ const r=document.getElementById('cr-route'); return { open:!!r&&r.classList.contains('open'), h1:r?((r.querySelector('h1')||{}).textContent||''):'', hash:location.hash,
  punch:(()=>{ const v=document.getElementById('punchView'); return !!v && getComputedStyle(v).display!=='none'; })(),
  counts: r ? [...r.querySelectorAll('[data-rt="day"]')].map(b=>[b.getAttribute('data-v'), parseInt((b.querySelector('small')||{}).textContent||'0',10)]) : [] }; });

/* C + D */
const p1=await boot('#route/scottie');
let s1=await rstate(p1);
need('D  #route/scottie at load opens Scottie\'s route', s1.open && /Scottie/.test(s1.h1), JSON.stringify({o:s1.open,h:s1.h1}));
need('D  …and the hash goes back to #h', s1.hash==='#h', s1.hash);
if(M && M._stopsFor && s1.open){
  const rows=await p1.evaluate(()=>window.CardinalPunch.rows());
  const now=new Date(); let bad=[];
  for(const w of ['scottie','curtis']){
    await p1.evaluate(e=>window.CardinalRoute.open(e), w+'@cardinalrenovations.net'); await p1.waitForTimeout(300);
    const c=(await rstate(p1)).counts;
    c.forEach(([k,n])=>{ const s=M._stopsFor(rows, w+'@cardinalrenovations.net', k, now).length; if(s!==n) bad.push(w+' '+k+': page '+n+' server '+s); });
  }
  need('C  server stop rule = route page counts, every person, every day', bad.length===0, bad.join('; '));
} else need('C  server stop rule = route page counts', false, 'no _stopsFor export or no route');
await p1.close();
const p2=await boot('#punch');
const s2=await rstate(p2);
need('D  #punch at load opens the Punch List', s2.punch && !s2.open && s2.hash==='#h', JSON.stringify({p:s2.punch,h:s2.hash}));
await p2.evaluate(()=>{ location.hash='#route/curtis'; }); await p2.waitForTimeout(900);
const s3=await rstate(p2);
need('D  a hashchange to #route/curtis opens Curtis\'s route', s3.open && /Curtis/.test(s3.h1), JSON.stringify({o:s3.open,h:s3.h1}));
await p2.close();
await browser.close();
console.log((fails.length?'GATE 1255 RED':'GATE 1255 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
