/* gate_1260.mjs — edit an appointment instead of deleting it (Jacob).
   The seed's appointments table is replaced (the mock applies updates to it, so
   a save really lands and the reload reads it back), then the day sheet is
   opened with openApptDay().
     A  as NICK: his own row has Edit; Theo's row on the same day has none
        (apptCanEdit — and RLS "appt own or admin update" — say the same)
     B  as THEO, Edit on the 10:30 call: the form says "Edit appointment",
        shows the Date field, is filled from the row, the button reads
        "Save changes", Cancel edit shows, the row is marked .editing
     C  changing only the time writes EXACTLY { appt_time } — never project_id,
        which adb.update reads as "a job was attached" — and the row reads 11:15
     D  moving a BUILD DAY to Sat 10 Oct writes { appt_date } only, buzzes
        production once ("Build day set — Kathy May"), never re-offers the
        Pre-Install Guide, and the sheet jumps to Saturday
     E  Save with nothing changed writes nothing and leaves edit mode
     F  Cancel edit empties the form; the next Add books the OPEN day with none
        of the edited row's values
     G  an empty title, and a build day with its client removed, are refused
        with the same words as Add, and write nothing
     H  at 390px every row fits (no sideways scroll); Edit and Cancel edit are
        44px+ and read at 4.5:1+ in both themes
   usage: node gate_1260.mjs [file.html] — RED on 1259, never a crash
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
const CONTRAST=`(function(el){
  function rgb(s){ var m=String(s).match(/[\\d.]+/g)||[]; return m.map(Number); }
  function L(c){ var a=c.slice(0,3).map(function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  var fg=rgb(getComputedStyle(el).color), n=el, stack=[];
  while(n && n.nodeType===1){ var b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3 && !(b.length>=4 && b[3]===0)){ stack.push(b); if(b.length<4||b[3]>0.9) break; } n=n.parentElement; }
  var base=[255,255,255]; for(var i=stack.length-1;i>=0;i--){ var s=stack[i], a=s.length>=4?s[3]:1; base=[0,1,2].map(function(k){ return s[k]*a+base[k]*(1-a); }); }
  var x=L(fg), y=L(base); return Math.round(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05))*100)/100;
})`;
const APPTS=[
  { id:'e1', title:'Follow up call', appt_date:'2026-10-09', appt_time:'10:30:00', project_id:'p1', notes:'Ask about the gutters', kind:'appt', created_by:'theo@cardinalrenovations.net' },
  { id:'e2', title:'Build day', appt_date:'2026-10-09', appt_time:null, project_id:'p2', notes:null, kind:'job', created_by:'joan@cardinalrenovations.net' },
  { id:'e3', title:'Nick call', appt_date:'2026-10-09', appt_time:'14:00:00', project_id:null, notes:null, kind:'appt', created_by:'nick@cardinalrenovations.net' }
];
async function boot(as, theme){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){} });
  await page.addInitScript(SETUP);
  await page.addInitScript((A)=>{ const S=window.__SEED__; if(S) S.appointments=JSON.parse(JSON.stringify(A)); }, APPTS);
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate(async ()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__NTF=[]; window.notifyTeam=async function(to,s){ window.__NTF.push({to,s}); return {ok:true}; };
    window.__GUIDE=0; window.__apptEmailPreInstallGuide=function(){ window.__GUIDE++; };
    window.crTell=function(){}; window.prompt=function(){ window.__PROMPTED=(window.__PROMPTED||0)+1; return null; };
    cacheAppts = await adb.list(); openApptDay('2026-10-09'); });
  await page.waitForTimeout(400);
  return page;
}
const click=(p,sel)=>p.evaluate(s=>{ const b=document.querySelector(s); if(!b) return false; b.click(); return true; },sel);
const form=p=>p.evaluate(()=>{ const g=id=>document.getElementById(id); const vis=e=>!!e && getComputedStyle(e).display!=='none';
  return { head:(g('apptFormHead')||{}).textContent||'', date:vis(g('apptDateLbl'))?(g('apptDate')||{}).value:null, title:g('apptTitle').value, kind:g('apptKind').value,
    time:g('apptTime').value, client:g('apptClient').value, notes:g('apptNotes').value, save:g('apptSave').textContent, cancel:vis(g('apptEditCancel')),
    editing:[...document.querySelectorAll('#apptList .apptrow.editing')].map(r=>r.getAttribute('data-aid')).join(','), err:g('apptError').textContent,
    day:apptDay, dayTitle:g('apptDayTitle').textContent }; });
const writes=p=>p.evaluate(()=>(window.__WRITES__||[]).filter(w=>w.table==='appointments'&&w.op!=='select').map(w=>({op:w.op, payload:w.payload})));
const setv=(p,id,v)=>p.evaluate(([id,v])=>{ const e=document.getElementById(id); if(e) e.value=v; },[id,v]);   /* null-safe: the control build has no #apptDate */

/* A — Nick */
const n=await boot('nick','dark');
const nr=await n.evaluate(()=>[...document.querySelectorAll('#apptList .apptrow')].map(r=>[r.getAttribute('data-aid'), !!r.querySelector('[data-apptedit]')]));
const nm=Object.fromEntries(nr);   /* the list orders untimed rows first — compare by id, not position */
need('A  Nick: Edit on his own row, none on Theo\'s or Joan\'s', nr.length===3 && nm.e3===true && nm.e1===false && nm.e2===false, JSON.stringify(nr));
await n.close();

/* B–G — Theo, dark */
const t=await boot('theo','dark');
await click(t,'#apptList [data-apptedit="e1"]'); await t.waitForTimeout(300);
let f=await form(t);
need('B  Edit fills the form from the row and says so', f.head==='Edit appointment' && f.date==='2026-10-09' && f.title==='Follow up call' && f.kind==='appt' && f.time==='10:30' && f.client==='p1' && f.notes==='Ask about the gutters', JSON.stringify(f));
need('B  …"Save changes", Cancel edit, and the row marked', f.save==='Save changes' && f.cancel && f.editing==='e1', JSON.stringify({s:f.save,c:f.cancel,e:f.editing}));
await t.evaluate(()=>{ window.__WRITES__=[]; });
await setv(t,'apptTime','11:15'); await click(t,'#apptSave'); await t.waitForTimeout(900);
let w=await writes(t);
need('C  only the time changed → the write is exactly { appt_time: "11:15" }', w.length===1 && w[0].op==='update' && JSON.stringify(w[0].payload)==='{"appt_time":"11:15"}', JSON.stringify(w));
const row1=await t.evaluate(()=>{ const r=document.querySelector('#apptList .apptrow[data-aid="e1"] .tm'); return r?r.textContent:''; });
f=await form(t);
need('C  the row now reads 11:15 and the form is back to Add', /11:15/.test(row1) && f.head==='+ Add appointment' && f.date===null && f.save==='Add' && !f.cancel && f.editing==='', JSON.stringify({row1, head:f.head, save:f.save}));
need('C  no buzz, no guide offer for a plain appointment', await t.evaluate(()=>window.__NTF.length===0 && window.__GUIDE===0 && !window.__PROMPTED));
/* D — move the build day */
await t.evaluate(()=>{ window.__WRITES__=[]; window.__NTF=[]; window.__GUIDE=0; });
await click(t,'#apptList [data-apptedit="e2"]'); await t.waitForTimeout(300);
await setv(t,'apptDate','2026-10-10'); await click(t,'#apptSave'); await t.waitForTimeout(1000);
w=await writes(t);
need('D  moving a build day writes { appt_date } only', w.length===1 && JSON.stringify(w[0].payload)==='{"appt_date":"2026-10-10"}', JSON.stringify(w));
const ntf=await t.evaluate(()=>window.__NTF);
need('D  production is told once, by name', ntf.length===1 && /Build day set/.test(ntf[0].s||'') && /Kathy May/.test(ntf[0].s||''), JSON.stringify(ntf));
need('D  the Pre-Install Guide is not offered again', await t.evaluate(()=>window.__GUIDE===0 && !window.__PROMPTED));
f=await form(t);
need('D  the sheet jumps to Saturday, with the build day on it', f.day==='2026-10-10' && /Saturday/.test(f.dayTitle) && await t.evaluate(()=>!!document.querySelector('#apptList .apptrow[data-aid="e2"]')), JSON.stringify({day:f.day,t:f.dayTitle}));
/* E — unchanged save */
await t.evaluate(()=>{ openApptDay('2026-10-09'); window.__WRITES__=[]; });
await click(t,'#apptList [data-apptedit="e1"]'); await t.waitForTimeout(200);
await click(t,'#apptSave'); await t.waitForTimeout(500);
f=await form(t);
need('E  Save with no change writes nothing and leaves edit mode', (await writes(t)).length===0 && f.head==='+ Add appointment', JSON.stringify({w:await writes(t), head:f.head}));
/* G — validation (before F, while a row is open) */
await click(t,'#apptList [data-apptedit="e1"]'); await t.waitForTimeout(200);
await setv(t,'apptTitle',''); await click(t,'#apptSave'); await t.waitForTimeout(300);
f=await form(t);
need('G  an empty title is refused', f.err==='Enter what the appointment is.' && (await writes(t)).length===0, f.err);
await click(t,'#apptEditCancel'); await t.waitForTimeout(200);
await t.evaluate(()=>{ openApptDay('2026-10-10'); });
await click(t,'#apptList [data-apptedit="e2"]'); await t.waitForTimeout(200);
await setv(t,'apptClient',''); await click(t,'#apptSave'); await t.waitForTimeout(300);
f=await form(t);
need('G  a build day with no client is refused, in Add\'s words', /Pick the job this build day is for/.test(f.err) && (await writes(t)).length===0, f.err);
/* F — cancel, then Add */
await click(t,'#apptEditCancel'); await t.waitForTimeout(200);
f=await form(t);
need('F  Cancel edit empties the form and hides the date', f.head==='+ Add appointment' && f.title==='' && f.time==='' && f.notes==='' && f.client==='' && f.kind==='appt' && f.date===null, JSON.stringify(f));
await setv(t,'apptTitle','New one'); await click(t,'#apptSave'); await t.waitForTimeout(800);
w=await writes(t);
const ins=w.filter(x=>x.op==='insert').map(x=>Array.isArray(x.payload)?x.payload[0]:x.payload);
need('F  the next Add books the open day with nothing carried over', ins.length===1 && ins[0].appt_date==='2026-10-10' && ins[0].title==='New one' && !ins[0].project_id && ins[0].kind==='appt' && !ins[0].appt_time, JSON.stringify(ins));
await t.close();

/* H — layout and ink, both themes */
for(const theme of ['dark','light']){
  const p=await boot('theo',theme);
  await click(p,'#apptList [data-apptedit="e1"]'); await p.waitForTimeout(300);
  const h=await p.evaluate((C)=>{ const ratio=eval(C);
    const rows=[...document.querySelectorAll('#apptList .apptrow')].map(r=>({id:r.getAttribute('data-aid'), over:r.scrollWidth-r.clientWidth}));
    const ctl=[...document.querySelectorAll('#apptList [data-apptedit], #apptEditCancel')].filter(e=>e.getClientRects().length).map(e=>({t:e.textContent, h:Math.round(e.getBoundingClientRect().height), r:ratio(e)}));
    return { rows, ctl, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }, CONTRAST);
  need('H  ['+theme+'] every row fits at 390px', h.rows.length===3 && h.rows.every(r=>r.over<=1) && h.page<=1, JSON.stringify(h.rows));
  /* Theo is an admin: Edit on all three rows, plus Cancel edit = 4 */
  need('H  ['+theme+'] Edit and Cancel edit: 44px+, 4.5:1+', h.ctl.length===4 && h.ctl.every(c=>c.h>=44 && c.r>=4.5), JSON.stringify(h.ctl));
  await p.close();
}
await browser.close();
console.log((fails.length?'GATE 1260 RED':'GATE 1260 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
