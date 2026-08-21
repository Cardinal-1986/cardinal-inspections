/* gate_952.mjs — the desktop menu becomes the Card Stack (build 952).
   Theo's picks: design 1 (Card Stack) · 288px · retail slate-blue accent with
   the brushed-steel strip and steel icons · insurance red end to end (no teal
   anywhere in the rail) · community green · production yellow.
     1. WIDTH — the rail variable is 288 and the page pads by it
     2. CARDS — heading has 12px top radii and a 3.5px ::before strip, and the
        heading band is FLUSH with the card body (the overflow Theo caught)
     3. PORTALS — strip, icons and chip re-theme live on CRM switch; insurance
        shows NO teal; production (a skin, not a chip) themes via crmHead
     4. FLOORS — chip label and row label contrast computed ≥ 4.5:1
     5. LIGHT — rb-light flips the keyline icons to the deepened _LT twin
   Usage: node gate_952.mjs [path] — previous build = negative control (must
   FAIL named, not crash — interactions guarded, BUG_CLASSES 37). */
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

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2200);
await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  const w=document.getElementById('navWrap'); if(w) w.style.display='inline-block';
  if(typeof window.showHome==='function') try{window.showHome();}catch(_){}});
await page.waitForTimeout(1800);

function lum(r,g,b){const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
function parseRgb(s){const m=String(s).match(/(\d+),\s*(\d+),\s*(\d+)/); return m?[+m[1],+m[2],+m[3]]:null;}
function ratio(a,b){const A=lum(...a),B=lum(...b);const[h,l]=A>B?[A,B]:[B,A];return (h+0.05)/(l+0.05);}

async function probe(){
  return page.evaluate(()=>{
    const h=document.getElementById('cr-lnav'); if(!h) return null;
    const sec=h.querySelector('.lnav-sec'); const body=h.querySelector('.lnav-body:not([hidden])')||h.querySelector('.lnav-body');
    const chip=h.querySelector('.lnav-crm button.on');
    const icon=h.querySelector('.lnav-item svg.i2');
    const item=h.querySelector('.lnav-item');
    const cs=sec?getComputedStyle(sec):null, ps=sec?getComputedStyle(sec,'::before'):null;
    return {
      pad:getComputedStyle(document.body).paddingLeft,
      radius:cs?cs.borderTopLeftRadius:null,
      stripH:ps?ps.height:null,
      stripBg:ps?(ps.backgroundImage!=='none'?ps.backgroundImage:ps.backgroundColor):null,
      secW:sec?sec.getBoundingClientRect().width:0,
      bodyW:body?body.getBoundingClientRect().width:0,
      chipBg:chip?getComputedStyle(chip).backgroundColor:null,
      chipInk:chip?getComputedStyle(chip).color:null,
      iconFill:icon?getComputedStyle(icon).fill:null,
      itemInk:item?getComputedStyle(item).color:null,
      bodyBg:body?getComputedStyle(body).backgroundColor:null,
    };
  });
}
async function chip(k){ await page.evaluate(k=>{const b=document.querySelector('#cr-lnav .lnav-crm button[data-crm="'+k+'"]'); if(b)b.click();},k); await page.waitForTimeout(900); }

/* ── retail (boot state) ── */
let r=await probe();
need('rail mounted', !!r);
if(r){
  need('width is 288', r.pad==='288px', r.pad);
  need('card heading has 12px top radius', r.radius==='12px', String(r.radius));
  need('a 3.5px strip crosses the card top', r.stripH==='3.5px', String(r.stripH));
  need('retail strip is the brushed-steel gradient', /linear-gradient/.test(String(r.stripBg)), String(r.stripBg).slice(0,60));
  need('heading band is FLUSH with the card body', Math.abs(r.secW-r.bodyW)<=1, r.secW+' vs '+r.bodyW);
  need('retail chip is slate blue, not red', r.chipBg==='rgb(62, 108, 168)', String(r.chipBg));
  need('retail icons are steel', r.iconFill==='rgb(170, 180, 192)', String(r.iconFill));
  const cb=parseRgb(r.chipBg), ci=parseRgb(r.chipInk);
  need('retail chip label clears 4.5:1', cb&&ci&&ratio(cb,ci)>=4.5, cb&&ci?ratio(cb,ci).toFixed(2):'unparsed');
  const ib=parseRgb(r.bodyBg), ii=parseRgb(r.itemInk);
  need('row label clears 4.5:1 on the card body', ib&&ii&&ratio(ib,ii)>=4.5, ib&&ii?ratio(ib,ii).toFixed(2):'unparsed');
}

/* ── insurance: red end to end, zero teal ── */
await chip('insurance');
r=await probe();
need('insurance strip is red', !!r && r.stripBg==='rgb(200, 32, 46)', r?String(r.stripBg).slice(0,60):'no rail');
need('insurance chip is red', !!r && r.chipBg==='rgb(200, 32, 46)', r?String(r.chipBg):'');
need('insurance icons are the lighter cardinal', !!r && r.iconFill==='rgb(227, 92, 99)', r?String(r.iconFill):'');
need('no teal anywhere in the insurance rail', !!r && ![r.stripBg,r.chipBg,r.iconFill].some(v=>/45,\s*212,\s*191/.test(String(v))),
  r?[r.stripBg,r.chipBg,r.iconFill].join(' | ').slice(0,80):'');

/* ── community ── */
await chip('community');
r=await probe();
need('community strip is green', !!r && r.stripBg==='rgb(52, 211, 153)', r?String(r.stripBg).slice(0,60):'');
need('community icons are green', !!r && r.iconFill==='rgb(52, 211, 153)', r?String(r.iconFill):'');

/* ── production: a skin, themed via crmHead ── */
await page.evaluate(()=>{
  document.body.dataset.crmHead='production';
  const h=document.getElementById('cr-lnav'); if(h) h.dataset.sig='';
  const m=document.getElementById('navMenu');
  if(m){const d=document.createElement('span');m.appendChild(d);d.remove();}
});
await page.waitForTimeout(1400);
r=await probe();
need('production strip is yellow', !!r && r.stripBg==='rgb(245, 166, 35)', r?String(r.stripBg).slice(0,60):'');
need('production icons are amber', !!r && r.iconFill==='rgb(240, 162, 74)', r?String(r.iconFill):'');

/* ── rb-light: keyline icons take the deepened twin ── */
await page.evaluate(()=>{ delete document.body.dataset.crmHead;
  const h=document.getElementById('cr-lnav'); if(h) h.dataset.sig='';
  const m=document.getElementById('navMenu'); if(m){const d=document.createElement('span');m.appendChild(d);d.remove();} });
await page.waitForTimeout(1000);
await chip('retail');
await page.evaluate(()=>{ document.documentElement.setAttribute('data-theme','rb-light'); });
await page.waitForTimeout(400);
const lt=await page.evaluate(()=>{
  const i5=document.querySelector('#cr-lnav .lnav-item svg.i5');
  return i5?getComputedStyle(i5).stroke:null;
});
need('light theme keyline icons take the deepened retail twin', lt==='rgb(90, 100, 112)', String(lt));

await browser.close();
console.log('gate_952 ['+LABEL+']: '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  FAIL  '+f));
process.exit(fails.length?1:0);
