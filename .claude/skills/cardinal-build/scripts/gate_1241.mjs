/* gate_1241.mjs — build 1241: every text on the eight shared .projform forms clears its floor, both themes.
   The forms: profile card, Add project, Roofing checklist, the GC form, Lead, New Lead, Appointment,
   Signature. They are white "paper" cards in BOTH themes — that is the current design and this gate
   does not judge it; it scores every text-bearing element against its composited ground.
   Found at 1241 and fixed: the profile e-mail (3.95), "* Required" (3.12) and the address toggle's
   chevron (2.38). RED on 1240 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1241.mjs [file.html]
*/
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
import { dirname, resolve } from 'path';
const here = dirname(new URL(import.meta.url).pathname);
import { existsSync } from 'fs';
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const art = resolve(process.argv[2] || resolve(here, '../../../../index.html')); const shotdir = null, tag = '';
const HOSTS=['profileView','projModal','ckModal','gcModal','leadModal','leadFormModal','apptModal','sigModal'];
const b = await launchChromium(chromium);
const report={};
for (const th of ['dark','rb-light']) for (const id of HOSTS) {
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.route(/^https?:/, r=>{const u=r.request().url(); return /fonts\.(googleapis|gstatic)/.test(u)? r.abort(): r.continue();});
  await p.addInitScript(t=>{window.__sentinelTheme=t},th);
  for(const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js']) await p.addInitScript(readFileSync(here+'/'+f,'utf8'));
  await p.goto('file://'+art,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2600);
  await p.evaluate(()=>window.__sentinelStates.find(s=>s.name==='home').run()).catch(()=>{});
  await p.waitForTimeout(500);
  const r = await p.evaluate(id=>{
    const host=document.getElementById(id); if(!host) return {none:'no host'};
    const card = host.classList.contains('projform') ? host : host.querySelector('.projform');
    let e=card; while(e && e!==document.body){ if(getComputedStyle(e).display==='none') e.style.display = (e===host? 'block':'block'); e=e.parentElement; }
    host.style.display = host.style.display || 'block';
    if(getComputedStyle(host).display==='none') host.style.display='block';
    card.scrollIntoView({block:'start'});
    const parse=c=>{const m=String(c).match(/rgba?\(([^)]+)\)/); if(!m) return null; const v=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0],v[1],v[2],v.length>3?v[3]:1];};
    const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
    const ground=el=>{let e=el,st=[];while(e){const c=parse(getComputedStyle(e).backgroundColor); if(c&&c[3]>0) st.push(c); if(c&&c[3]>=.95) break; e=e.parentElement;} let g=[9,9,12]; for(let i=st.length-1;i>=0;i--){const c=st[i]; g=[0,1,2].map(k=>c[k]*c[3]+g[k]*(1-c[3]));} return g;};
    const ratio=el=>{const i=parse(getComputedStyle(el).color),g=ground(el); const c=[0,1,2].map(k=>i[k]*i[3]+g[k]*(1-i[3])); const a=lum(c),b=lum(g); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    const key=el=>{const bits=[];for(let e=el,i=0;e&&i<3;e=e.parentElement,i++){ if(e.id){bits.unshift('#'+e.id);break;} let t=e.tagName.toLowerCase(); const c=(typeof e.className==='string'?e.className:'').trim().split(/\s+/)[0]; if(c)t+='.'+c; bits.unshift(t);} return bits.join(' ');};
    const cardBg=getComputedStyle(card).backgroundColor;
    const fails={}; let n=0;
    for(const el of card.querySelectorAll('*')){
      if(!el.getClientRects().length) continue;
      const own=[...el.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()) || ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(el.tagName);
      if(!own) continue;
      const cs=getComputedStyle(el); if(cs.visibility==='hidden') continue;
      n++;
      const fs=parseFloat(cs.fontSize), bold=+cs.fontWeight>=700, large=fs>=24||(bold&&fs>=18.66);
      const rr=ratio(el), floor=large?3:4.5;
      if(rr<floor){ const k=key(el); if(!fails[k]||fails[k].r>rr) fails[k]={r:+rr.toFixed(2),ink:cs.color,txt:(el.innerText||el.value||el.placeholder||'').trim().slice(0,24)}; }
    }
    return {cardBg, n, fails};
  }, id).catch(e=>({none:String(e)}));
  report[th+' '+id]=r;
  if(shotdir){ const cdp=await p.context().newCDPSession(p); const {data}=await cdp.send('Page.captureScreenshot',{format:'png'}); writeFileSync(`${shotdir}/${id}_${th}_${tag}.png`, Buffer.from(data,'base64')); }
  await p.close();
}
await b.close();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
for (const [k, v] of Object.entries(report)) {
  if (v.none) { ok(false, k + ': the form opens', v.none); continue; }
  ok(v.n >= 3, k + ': the form rendered its text', v.n + ' texts');
  const f = Object.entries(v.fails);
  ok(f.length === 0, k + ': every text clears its floor (4.5:1, 3:1 large)', f.map(([kk, vv]) => vv.r + ' "' + vv.txt + '" ' + kk).join(' · '));
}
console.log((fail ? 'GATE 1241 RED' : 'GATE 1241 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
