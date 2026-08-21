/* audit_print.mjs — what a Cardinal contract ACTUALLY looks like on paper.

   Boots the real app, takes the real contract templates off `window`, and runs
   the REAL print path: the same `printFix` <style> the Print button injects,
   the same compactForPrint() pass, then Chromium's own print engine to PDF.

   It does not assert. It reports, so a print defect can be seen rather than
   argued about. Usage: node audit_print.mjs [index.html] [outdir] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const OUT=process.argv[3]||'/tmp/print';
mkdirSync(OUT,{recursive:true});
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1194,height:834}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* The exact style string the Print button injects. Read it OUT of the shipped
   handler rather than copying it, so this audit cannot drift from the app. */
const PRINTFIX = await page.evaluate(()=>{
  const s=[...document.querySelectorAll('script:not([src])')].map(x=>x.textContent).join('\n');
  const i=s.indexOf("st.id = 'printFix'"); if(i<0) return null;
  const j=s.indexOf('st.textContent =', i); const k=s.indexOf('d.head.appendChild(st)', j);
  return s.slice(j,k);
});
if(!PRINTFIX) { console.log('COULD NOT FIND printFix IN THE SHIPPED HANDLER'); process.exit(2); }

const NAMES=['ROOF_AGREEMENT','SIDING_AGREEMENT','GUTTER_AGREEMENT','CONTRACT_TEMPLATE'];
const docs = await page.evaluate(ns=>{const o={};ns.forEach(n=>{if(window[n])o[n]=window[n];});return o;}, NAMES);
console.log('templates found:', Object.keys(docs).join(', '));

for (const name of Object.keys(docs)) {
  const p2 = await browser.newPage();
  await p2.route('**/*', r=>{const u=r.request().url();
    if(u.startsWith('https://doc.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:docs[name]});
    return r.fulfill({status:200,body:''});});
  await p2.goto('https://doc.test/',{waitUntil:'domcontentloaded'});
  /* the real print path, in order */
  await p2.evaluate(src=>{
    const st=document.createElement('style'); st.id='printFix';
    /* eslint-disable no-eval */ let txt=null;
    eval(src.replace(/^\s*st\.textContent\s*=/, 'txt =').replace(/;\s*$/,''));
    st.textContent=txt; document.head.appendChild(st);
  }, PRINTFIX);
  const counts = await p2.evaluate(()=>({
    selects: document.querySelectorAll('select').length,
    inputs: document.querySelectorAll('input,textarea,button').length,
    ph: document.querySelectorAll('.ph').length,
    editable: document.querySelectorAll('[contenteditable]').length,
    runhead: document.querySelectorAll('.runhead').length
  }));
  const pdf = await p2.pdf({format:'Letter', printBackground:true, preferCSSPageSize:true});
  writeFileSync(join(OUT,name+'.pdf'), pdf);
  console.log(name, JSON.stringify(counts), pdf.length+' bytes');
  await p2.close();
}
await browser.close();
console.log('PDFs in', OUT);
