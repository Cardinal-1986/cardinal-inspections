/* gate_1253.mjs — trades on the New Lead form (Joan).
     A  the New Lead form shows the six trade boxes WITHOUT "More detail"
     B  each trade label is 44px tall or more and reads at 4.5:1 or better on
        its own ground, in both themes
     C  creating a lead with Roofing + Gutters, Residential and Repair writes
        checklist.trades = ["Roofing","Gutters"], job_category = "Residential",
        work_type = "Repair" — the flat keys Job Details reads
     D  reopening the form starts with every trade unticked
   usage: node gate_1253.mjs [file.html] — RED on 1252, never a crash
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
  var fg=rgb(getComputedStyle(el).color), n=el, bg=null;
  while(n && n.nodeType===1){ var b=rgb(getComputedStyle(n).backgroundColor); if(b.length>=3 && (b.length<4||b[3]>0.5)){ bg=b; break; } n=n.parentElement; }
  if(!bg) bg=[255,255,255];
  var a=L(fg), c=L(bg); return Math.round(((Math.max(a,c)+0.05)/(Math.min(a,c)+0.05))*100)/100;
})`;
async function boot(theme){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  if(theme==='light') await page.addInitScript(()=>{ window.__sentinelTheme='rb-light'; });
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=joan',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__TELL=[]; window.crTell=function(m){ window.__TELL.push(String(m)); };
    if(typeof window.openLeadForm==='function') window.openLeadForm(); });
  await page.waitForTimeout(500);
  return page;
}
for(const theme of ['dark','light']){
  const p=await boot(theme);
  const r=await p.evaluate((C)=>{ const ratio=eval(C); const g=document.getElementById('ldTrades'); if(!g) return null;
    const labs=[...g.querySelectorAll('label')];
    return { vis: g.getClientRects().length>0 && getComputedStyle(g).display!=='none',
             vals: labs.map(l=>l.querySelector('input').value).join(','),
             h: labs.map(l=>Math.round(l.getBoundingClientRect().height)),
             ink: labs.map(l=>ratio(l)) }; }, CONTRAST);
  if(theme==='dark'){
    need('A  the six trade boxes are on the New Lead form', !!r && r.vals==='Roofing,Siding,Gutters,Windows,Repairs,Misc', r&&r.vals);
    need('A  they show without "More detail"', !!r && r.vis);
  }
  need('B  ['+theme+'] every trade label is 44px or more', !!r && r.h.every(h=>h>=44), r&&r.h.join(','));
  need('B  ['+theme+'] every trade label reads at 4.5:1+', !!r && r.ink.every(x=>x>=4.5), r&&r.ink.join(','));
  if(theme==='dark'){
    await p.evaluate(()=>{
      const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.value=v; };
      set('ldFirst','Gate'); set('ldLast','Lead'); set('ldStreet','12 Elm St'); set('ldCity','Dayton'); set('ldZip','45402');
      set('ldCategory','Residential'); set('ldWorkType','Repair'); set('ldSource','Referral');
      const nc=document.getElementById('ldNoContact'); if(nc) nc.checked=true;
      const ct=document.querySelector('input[name="ldClaimType"][value="retail"]'); if(ct) ct.checked=true;
      document.querySelectorAll('#ldTrades input').forEach(cb=>{ cb.checked=(cb.value==='Roofing'||cb.value==='Gutters'); });
      window.__WRITES__=[];
      document.getElementById('ldSave').click();
    });
    await p.waitForTimeout(1500);
    const ins=await p.evaluate(()=>{ const w=(window.__WRITES__||[]).filter(x=>x.table==='projects'&&x.op==='insert'); const pl=w[0]&&(Array.isArray(w[0].payload)?w[0].payload[0]:w[0].payload);
      let ck=null; try{ ck=pl&&JSON.parse(pl.checklist); }catch(e){} return { n:w.length, ck, err:(document.getElementById('ldError')||{}).textContent||'', tell:window.__TELL }; });
    need('C  the lead was created', ins.n===1, JSON.stringify({n:ins.n, err:ins.err, tell:ins.tell}).slice(0,200));
    const ck=ins.ck||{};
    need('C  checklist.trades = Roofing, Gutters', JSON.stringify(ck.trades)==='["Roofing","Gutters"]', JSON.stringify(ck.trades));
    need('C  job_category and work_type are saved flat', ck.job_category==='Residential' && ck.work_type==='Repair', JSON.stringify({c:ck.job_category,w:ck.work_type}));
    await p.evaluate(()=>{ const m=document.getElementById('leadFormModal'); if(m) m.style.display='none'; if(window.openLeadForm) window.openLeadForm(); });
    await p.waitForTimeout(400);
    need('D  reopening starts with every trade unticked', await p.evaluate(()=>[...document.querySelectorAll('#ldTrades input')].length===6 && [...document.querySelectorAll('#ldTrades input')].every(cb=>!cb.checked)));
  }
  await p.close();
}
await browser.close();
console.log((fails.length?'GATE 1253 RED':'GATE 1253 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
