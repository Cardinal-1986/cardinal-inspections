/* gate_1016.mjs — the printed contract shows all of its own words (build 1016).

   This gate does not read CSS. It opens a REAL contract in the REAL editor,
   presses the REAL Download button (the artifact a client is actually emailed),
   then prints those exact bytes through Chromium and measures the PAGES.

     0  a real agreement is open in the editor
     1  the downloaded document carries the print fix
     2  nothing is painted over: no text block sits fully inside the header strip
     3  the swallowed sentence is visible — "Terms and Conditions form…"
     4  the running header still appears on EVERY page
        (the trap this gate exists for: an earlier attempt scored ZERO hidden
         text by moving the header off the top of the page. Absence of collision
         is not the goal; a header above readable text is.)
     5  the address footer still prints
     6  page count does not run away
     7  ensurePrintFix is reached from BOTH the print and the download buttons
     8  the .runhead element is hidden in print, not deleted — documents saved
        before today still carry it and must keep rendering on screen

   Usage: node gate_1016.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

const TO=setTimeout(()=>{console.log('GATE TIMEOUT');process.exit(3);}, 180000);
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1194,height:834}});
const PNG=Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await page.route('**/*', r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',body:PNG});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* 7 — both buttons reach the fix. Asserted on the SOURCE, because a call site
   that exists is the contract; the spelling of the call is not. */
const src = await page.evaluate(()=>[...document.querySelectorAll('script:not([src])')].map(x=>x.textContent).join('\n'));
const defOK = /function\s+ensurePrintFix\s*\(/.test(src);
const printSeg = src.slice(src.indexOf("getElementById('printBtn')"), src.indexOf("getElementById('printBtn')")+900);
const dlSeg    = src.slice(src.indexOf("getElementById('dlBtn')"),    src.indexOf("getElementById('dlBtn')")+900);
need('7a ensurePrintFix is defined', defOK);
need('7b the Print button reaches it', /ensurePrintFix\s*\(/.test(printSeg));
need('7c the Download button reaches it', /ensurePrintFix\s*\(/.test(dlSeg));

const DOCS=[['ROOF_AGREEMENT','rep-r'],['SIDING_AGREEMENT','rep-s'],['GUTTER_AGREEMENT','rep-g']];
const BAND=[54.0,73.2];      /* the strip the old fixed header painted */
const grabbed={};

for (const [tplName,id] of DOCS){
  const opened = await page.evaluate(async ([tplName,id])=>{
    const tpl=window[tplName]; if(!tpl) return 'no '+tplName;
    if(typeof window.openEditor!=='function') return 'no openEditor';
    window.__SEED__.inspection_reports=[{id,title:'Contract — Test',html:tpl,project:'T',project_id:'p1',status:'draft',total:0}];
    await window.openEditor(id);
    await new Promise(r=>setTimeout(r,1300));
    const f=document.getElementById('reportFrame');
    return (f&&f.contentDocument&&f.contentDocument.body) ? 'ok' : 'no document';
  },[tplName,id]);
  need('0 '+tplName+' opens in the editor', opened==='ok', String(opened));
  if(opened!=='ok') continue;

  /* press the real Download button, with only the file sink stubbed */
  const html = await page.evaluate(async ()=>{
    let cap=null;
    try{ window.CardinalDownload = Object.assign({}, window.CardinalDownload, {
      html:(h)=>{cap=h;return true;}, frame:(f)=>{const d=f&&f.contentDocument;cap=d?d.documentElement.outerHTML:null;return true;} }); }catch(e){}
    const b=document.getElementById('dlBtn');
    if(!b) return null;                       /* BUG_CLASSES 37: report, never throw */
    b.click();
    await new Promise(r=>setTimeout(r,900));
    return cap;
  });
  need('1 '+tplName+': the Download button produced a document', !!html);
  if(!html) continue;
  grabbed[tplName]=html;
  need('1b '+tplName+': it carries the print fix', /id="printFix"/.test(html));
  need('8 '+tplName+': the .runhead element survives in the document', /class="runhead"/.test(html));

  const p2=await browser.newPage();
  await p2.route('**/*', r=>{const u=r.request().url();
    if(u.startsWith('https://doc.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});
    if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',body:PNG});
    return r.fulfill({status:200,body:''});});
  await p2.goto('https://doc.test/',{waitUntil:'domcontentloaded'});
  const pdf=await p2.pdf({format:'Letter',printBackground:true,preferCSSPageSize:true});
  await p2.close();
  grabbed[tplName+'__pdf']=pdf;
}
await browser.close();
clearTimeout(TO);

/* ---- measure the PDFs ---- */
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
const dir=mkdtempSync(join(tmpdir(),'g989-'));
const wanted=[];
for(const k of Object.keys(grabbed)) if(k.endsWith('__pdf')){ const n=k.replace('__pdf',''); writeFileSync(join(dir,n+'.pdf'),grabbed[k]); wanted.push(n); }
let measured={};
if(wanted.length){
  const py=`
import pymupdf, json, sys
BAND=(${BAND[0]},${BAND[1]}); out={}
for n in ${JSON.stringify(wanted)}:
    d=pymupdf.open("${dir}/"+n+".pdf"); hid=[]; heads=0
    for p in d:
        t=p.get_text()
        if 'Cardinal Roofing' in t[:260]: heads+=1
        for b in p.get_text('blocks'):
            if 'Cardinal Roofing' in b[4] and b[3]-b[1]<20: continue
            inter=max(0,min(b[3],BAND[1])-max(b[1],BAND[0]))
            if inter>0 and inter/(b[3]-b[1])>0.92: hid.append(b[4].strip()[:60])
    txt=''.join(p.get_text() for p in d)
    out[n]={'pages':d.page_count,'hidden':hid,'heads':heads,
            'tcVisible': 'Terms and Conditions form' in txt,
            'footer': '5735 Webster' in txt}
print(json.dumps(out))`;
  try{ measured=JSON.parse(execFileSync('python3',['-c',py],{encoding:'utf8'})); }
  catch(e){ fails.push('PDF measurement failed — '+String(e.message||e).slice(0,140)); }
}
const CAP={ROOF_AGREEMENT:6,SIDING_AGREEMENT:5,GUTTER_AGREEMENT:6};
for(const n of wanted){
  const m=measured[n];
  if(!m){ need('2 '+n+': measured', false, 'no measurement'); continue; }
  need('2 '+n+': no contract text is painted over', m.hidden.length===0, m.hidden.length+' hidden: '+JSON.stringify(m.hidden.slice(0,3)));
  need('3 '+n+': the Terms-and-Conditions sentence is in the document', m.tcVisible);
  need('4 '+n+': the running header appears on every page', m.heads===m.pages, m.heads+' of '+m.pages+' pages');
  need('5 '+n+': the address footer still prints', m.footer);
  need('6 '+n+': page count has not run away', m.pages<=CAP[n], m.pages+' pages (cap '+CAP[n]+')');
}
need('floor: every contract was actually measured', wanted.length===3, wanted.length+' of 3');

console.log('--- gate_1016 ('+LABEL+') ---');
for(const f of fails) console.log('  FAIL  '+f);
console.log(`${passes} passed, ${fails.length} failed`);
console.log(fails.length? 'RED' : 'GREEN');
process.exit(fails.length?1:0);
