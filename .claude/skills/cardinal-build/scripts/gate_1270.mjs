/* gate_1270.mjs — the emailed estimate (Theo, 9 Oct, two iPhone screenshots: the
   logo and the photo as "?" boxes, "Editing mode" printed across the top).
   Real Chromium, installed-app phone, the 1269 path: estimate builder → Email.
   The logo path and a storage photo are served as real images; /api/senddoc is
   a recording stub. A second editing banner is planted, as a double-open leaves.
     A  the email request is made
     B  the attached html has NO editing banner (both removed)
     C  every <img> in it is a data: URI — the logo (PNG) and the photo (JPEG)
     D  no site-relative src survives, inlined or not
     E  the document on screen still has exactly one banner (it is the editor)
   usage: node gate_1270.mjs [file.html] — RED on 1269, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const LOGO=readFileSync(join(HERE,'../../../../cardinal-report-logo.png'));
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
function png(w,h){ const crc=(b)=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}let x=0xffffffff;for(const v of b)x=t[(x^v)&255]^(x>>>8);return (x^0xffffffff)>>>0;};
  const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const raw=Buffer.alloc((w*3+1)*h); for(let y=0;y<h;y++){ raw[y*(w*3+1)]=0; for(let x=0;x<w;x++){ const o=y*(w*3+1)+1+x*3; raw[o]=(Math.random()*256)|0; raw[o+1]=(Math.random()*256)|0; raw[o+2]=(y*3)&255; } }
  const ih=Buffer.alloc(13); ih.writeUInt32BE(w,0); ih.writeUInt32BE(h,4); ih[8]=8; ih[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]); }
const PHOTO=png(1600,1200);   /* noisy, so it is well over 400 KB like a phone photo and must be scaled to JPEG */
const PHOTO_URL='https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/projects/p1/cover.jpg?token=x';

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const page=await ctx.newPage();
page.on('dialog', d=>d.accept('dave@dsmccoy.com'));
let sent=null;
await page.route('**/*', async r=>{ const u=r.request().url();
  if(u.startsWith('https://sentinel.test/api/senddoc')){ try{ sent=JSON.parse(r.request().postData()||'{}'); }catch(_){ sent={}; } return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); }
  if(u.startsWith('https://sentinel.test/cardinal-report-logo.png')) return r.fulfill({status:200,contentType:'image/png',body:LOGO,headers:{'access-control-allow-origin':'*'}});
  /* 1277: the OC Preferred lockup ships beside the logo and must travel inside the email too */
  if(u.startsWith('https://sentinel.test/oc-preferred-contractor.png')){ try{ return r.fulfill({status:200,contentType:'image/png',body:readFileSync(join(HERE,'../../../../oc-preferred-contractor.png')),headers:{'access-control-allow-origin':'*'}}); }catch(_){ return r.fulfill({status:404,body:''}); } }
  if(u.startsWith('https://yipslubcptjoarblzbpl.supabase.co/storage/')) return r.fulfill({status:200,contentType:'image/png',body:PHOTO,headers:{'access-control-allow-origin':'*'}});
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''}); });
await page.addInitScript(()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); }catch(_){} });
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2600);
await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await page.waitForTimeout(1500);
/* publish, and once the estimate is open, plant the photo and a second banner, then Email to client */
await page.evaluate(()=>{ const b=document.querySelector('#cr-est-view [data-act="bar-publish"]') || document.getElementById('cr-epub-btn'); if(b) b.click(); });
await page.waitForTimeout(4500);
const planted=await page.evaluate((url)=>{ const f=document.getElementById('reportFrame'); const d=f&&f.contentDocument; if(!d||!d.body) return 'no doc';
  const im=d.createElement('img'); im.src=url; im.className='g1270-photo'; d.body.appendChild(im);
  const h=d.querySelector('[data-cardinal-hint]'); if(h) d.body.insertBefore(h.cloneNode(true), d.body.firstChild);
  return d.querySelectorAll('[data-cardinal-hint]').length; }, PHOTO_URL);
await page.evaluate(()=>{ const b=document.getElementById('emailDocBtn'); if(b) b.click(); });
for(let i=0;i<40 && !sent;i++){ await page.waitForTimeout(500);
  await page.evaluate(()=>{ const g=document.querySelector('#crAsk.open .askgo'); if(g) g.click();
    /* 1273: the address is asked in a sheet now, not a prompt */
    const s=document.querySelector('#crEmailSheet.open'); if(s){ const a=document.getElementById('emShAddr'); if(a && !a.value) a.value='dave@dsmccoy.com'; const b=document.getElementById('emShGo'); if(b) b.click(); } }); }

need('A  the email request is made (with the banner planted twice: '+planted+')', !!sent && typeof sent.html==='string', sent?Object.keys(sent).join(','):'not sent');
const html=String((sent&&sent.html)||'');
const r=await page.evaluate((h)=>{ const d=new DOMParser().parseFromString(h,'text/html');
  const imgs=[...d.querySelectorAll('img')].map(i=>i.getAttribute('src')||'');
  return { hints:d.querySelectorAll('[data-cardinal-hint]').length, banner:/Editing mode/.test(d.body?d.body.textContent:''), n:imgs.length,
    nonData:imgs.filter(s=>!/^data:/.test(s)).map(s=>s.slice(0,80)), rel:imgs.filter(s=>s.startsWith('/')), png:imgs.some(s=>s.startsWith('data:image/png')), jpg:imgs.some(s=>s.startsWith('data:image/jpeg')) }; }, html);
need('B  the attached file has NO editing banner', r.hints===0 && !r.banner, JSON.stringify({h:r.hints,b:r.banner}));
need('C  every picture is inside the file: the logo as PNG, the photo as JPEG', r.n>=2 && r.nonData.length===0 && r.png && r.jpg, JSON.stringify(r));
need('D  no site-relative picture address goes out', r.rel.length===0, JSON.stringify(r.rel));
const e=await page.evaluate(()=>{ const f=document.getElementById('reportFrame'); const d=f&&f.contentDocument; return d?d.querySelectorAll('[data-cardinal-hint]').length:-1; });
need('E  the editor on screen is untouched (the banner is still there for the rep)', e>=1, String(e));

await browser.close();
console.log((fails.length?'GATE 1270 RED':'GATE 1270 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
