/* gate_1258.mjs — "Add to calendar" on appointments (B1).
   Appointments are put straight into cacheAppts (the seed's appointment rows
   predate appt_date), then the day sheet is opened with openApptDay().
     A  every row in the day sheet has an "Add to calendar" button, 44px+,
        4.5:1+, in both themes — including rows the viewer cannot edit
     B  the button opens the sheet: the title, the date and time, three 44px+
        controls at 4.5:1+; Cancel closes it
     C  the .ics (apptIcs): CRLF, folded at 75 octets, one VEVENT; a timed
        appointment is DTSTART..+1h in floating time; a no-time build day is an
        all-day DATE event ending the next day (month end rolls over); a 11:30 PM
        start ends past midnight; SUMMARY carries the client; commas, semicolons
        and newlines are escaped; LOCATION is the job address
     D  "iPhone / Apple Calendar" downloads cardinal-appointment.ics, and the
        file is the same text apptIcs() builds
     E  "Google Calendar" is Google's TEMPLATE link with the same dates, title
        and address, opening off-site (target=_blank)
   usage: node gate_1258.mjs [file.html] — RED on 1257, never a crash
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
const APPTS=[
  { id:'c1', title:'Roof inspection, front; back', appt_date:'2026-10-09', appt_time:'10:30:00', project_id:'p1', notes:'Bring the ladder\nGate code 1234', kind:'appt', created_by:'theo@cardinalrenovations.net' },
  { id:'c2', title:'Build day', appt_date:'2026-10-09', appt_time:null, project_id:'p2', notes:null, kind:'job', created_by:'joan@cardinalrenovations.net' },
  { id:'c3', title:'Month end', appt_date:'2026-10-31', appt_time:null, project_id:null, notes:null, kind:'job', created_by:'theo@cardinalrenovations.net' },
  { id:'c4', title:'Late one', appt_date:'2026-10-09', appt_time:'23:30:00', project_id:null, notes:null, kind:'appt', created_by:'theo@cardinalrenovations.net' }
];
async function boot(theme, as){
  const page=await browser.newPage({viewport:{width:390,height:844}, acceptDownloads:true});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){} });
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as='+(as||'theo'),{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1800);
  await page.evaluate((A)=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    cacheAppts = A; if(typeof openApptDay==='function') openApptDay('2026-10-09'); }, APPTS);
  await page.waitForTimeout(500);
  return page;
}
const unfold=t=>t.replace(/\r\n /g,'');
for(const theme of ['dark','light']){
  const p=await boot(theme, theme==='dark'?'nick':'theo');
  const rows=await p.evaluate((C)=>{ const ratio=eval(C); return [...document.querySelectorAll('#apptList .apptrow')].map(r=>{ const b=r.querySelector('[data-apptcal]'); return b ? { id:r.getAttribute('data-aid'), h:Math.round(b.getBoundingClientRect().height), r:ratio(b), del:!!r.querySelector('.del') } : { id:r.getAttribute('data-aid'), h:0 }; }); }, CONTRAST);
  need('A  ['+theme+'] every row has Add to calendar, 44px+, 4.5:1+', rows.length===3 && rows.every(x=>x.h>=44 && x.r>=4.5), JSON.stringify(rows));
  if(theme==='dark') need('A  …including rows Nick cannot edit', rows.some(x=>x.h>=44 && !x.del), JSON.stringify(rows.map(x=>x.del)));
  await p.evaluate(()=>{ const b=document.querySelector('#apptList [data-apptcal="c1"]'); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); }); await p.waitForTimeout(300);
  const sh=await p.evaluate((C)=>{ const ratio=eval(C); const s=document.getElementById('apptCalSheet'); if(!s) return null;
    return { open:s.classList.contains('open'), txt:s.textContent, ctl:[...s.querySelectorAll('[data-cal], b, p')].map(e=>({ t:e.textContent.slice(0,24), h:Math.round(e.getBoundingClientRect().height), r:ratio(e), c:e.hasAttribute('data-cal') })) }; }, CONTRAST);
  need('B  ['+theme+'] the sheet opens, naming the appointment and its time', !!sh && sh.open && /Roof inspection, front; back/.test(sh.txt) && /2026-10-09 · 10:30 AM/.test(sh.txt), sh&&sh.txt.slice(0,120));
  need('B  ['+theme+'] three 44px+ controls, all text 4.5:1+', !!sh && sh.ctl.filter(c=>c.c).length===3 && sh.ctl.filter(c=>c.c).every(c=>c.h>=44) && sh.ctl.every(c=>c.r>=4.5), sh&&JSON.stringify(sh.ctl));
  if(theme==='dark'){
    const ics=await p.evaluate(()=>{ if(typeof apptIcs!=='function') return { a:'', b:'', c:'', d:'', g:'https://none.invalid/' }; return { a:apptIcs(cacheAppts[0]), b:apptIcs(cacheAppts[1]), c:apptIcs(cacheAppts[2]), d:apptIcs(cacheAppts[3]), g:apptGoogleUrl(cacheAppts[0]) }; });
    const A=unfold(ics.a), B=unfold(ics.b), Cc=unfold(ics.c), D=unfold(ics.d);
    need('C  CRLF line ends, every line ≤75 octets, one VEVENT', !!ics.a && ics.a.split('\r\n').every(l=>Buffer.byteLength(l)<=75) && !/[^\r]\n/.test(ics.a) && (A.match(/BEGIN:VEVENT/g)||[]).length===1 && /END:VCALENDAR\r\n$/.test(A));
    need('C  timed: 10:30 → 11:30, floating local time', /\r\nDTSTART:20261009T103000\r\n/.test(A) && /\r\nDTEND:20261009T113000\r\n/.test(A), (A.match(/DT(START|END)[^\r]*/g)||[]).join(' '));
    need('C  no time: an all-day event ending the next day', /DTSTART;VALUE=DATE:20261009\r\n/.test(B) && /DTEND;VALUE=DATE:20261010\r\n/.test(B));
    need('C  month end rolls into November', /DTEND;VALUE=DATE:20261101\r\n/.test(Cc));
    need('C  an 11:30 PM start ends after midnight', /DTEND:20261010T003000\r\n/.test(D), (D.match(/DTEND[^\r]*/)||[''])[0]);
    need('C  SUMMARY carries the client, escaped', /SUMMARY:Roof inspection\\, front\\; back — Mark Diamond\r\n/.test(A), (A.match(/SUMMARY[^\r]*/)||[''])[0]);
    need('C  LOCATION is the job address, notes keep their line breaks', /LOCATION:7990 Germantown Pike\\, Dayton\\, OH\\, 45418\r\n/.test(A) && /DESCRIPTION:Bring the ladder\\nGate code 1234\\nClient: Mark Diamond/.test(A), (A.match(/(LOCATION|DESCRIPTION)[^\r]*/g)||[]).join(' | '));
    const g=new URL(ics.g);
    need('E  Google: the TEMPLATE link with the same dates, title and place', g.hostname==='calendar.google.com' && g.searchParams.get('action')==='TEMPLATE' && g.searchParams.get('dates')==='20261009T103000/20261009T113000' && g.searchParams.get('text')==='Roof inspection, front; back — Mark Diamond' && /Germantown Pike/.test(g.searchParams.get('location')||''), ics.g.slice(0,160));
    need('E  …and it opens off-site', await p.evaluate(()=>{ const a=document.querySelector('#apptCalSheet a[data-cal="google"]'); return !!a && a.target==='_blank' && /^https:\/\/calendar\.google\.com\//.test(a.href); }));
    const [dl]=await Promise.all([ p.waitForEvent('download',{timeout:5000}).catch(()=>null),
      p.evaluate(()=>{ const b=document.querySelector('#apptCalSheet [data-cal="apple"]'); if(b) b.click(); }) ]);
    let body=''; if(dl){ try{ const fp=await dl.path(); body=readFileSync(fp,'utf8'); }catch(e){} }
    need('D  Apple: downloads cardinal-appointment.ics, the same text', !!dl && dl.suggestedFilename()==='cardinal-appointment.ics' && unfold(body).replace(/DTSTAMP:\w+/,'')===A.replace(/DTSTAMP:\w+/,''), dl?dl.suggestedFilename():'no download');
    need('D  and the sheet closes', await p.evaluate(()=>{ const s=document.getElementById('apptCalSheet'); return !!s && !s.classList.contains('open'); }));
    await p.evaluate(()=>{ const b=document.querySelector('#apptList [data-apptcal="c2"]'); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); }); await p.waitForTimeout(200);
    await p.evaluate(()=>{ const b=document.querySelector('#apptCalSheet [data-cal="cancel"]'); if(b) b.click(); }); await p.waitForTimeout(200);
    need('B  Cancel closes it', await p.evaluate(()=>{ const s=document.getElementById('apptCalSheet'); return !!s && !s.classList.contains('open'); }));
  }
  await p.close();
}
await browser.close();
console.log((fails.length?'GATE 1258 RED':'GATE 1258 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
