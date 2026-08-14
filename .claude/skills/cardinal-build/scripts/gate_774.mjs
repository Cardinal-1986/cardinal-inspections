/* gate_774 — "+ ABC Supply" inside the estimate editor.
   Drives the whole seam in a real browser, because the thing that matters is
   not that the code exists but that a TAP lands a PRICED line:
     open an estimate      -> three source buttons, not two
     tap + ABC Supply       -> the sheet retitles, the Search button appears
     type + Enter/Search    -> ABC's catalog rows render
     tap a row              -> a line item, priced at the branch, with the
                               item number kept for a future purchase order
   Then the failure path, which is the whole reason this is not a blocking
   dialog: a price 401 must STILL add the line, at $0, with ABC's own sentence.
   And the money-saving behaviour: typing must never call ABC — only Enter or
   the button do, because every press is a paid round trip.

   Negative control: node gate_774.mjs <prev index.html>  ->  must go RED.
   Every interaction is guarded so the control REPORTS red instead of dying
   on a missing element (BUG_CLASSES 37 — a control that crashes proves
   nothing, and neither does one that passes vacuously).                    */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 120000);

const APP  = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

const ITEM  = '9466850010';
const DESC  = 'Owens Corning RhinoRoof U20 Synthetic Roofing Underlayment 10 Square Roll';
const PRICE = 76.00;
const PRICE_401 = 'ABC POST /api/pricing/v2/prices -> HTTP 401 — This user is not authorized to view pricing data for the provided shipTo number, 0003. Please try a different shipTo number';

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const checks = []; const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });
let searchCalls = 0, priceCalls = 0, priceMustFail = false;

const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2, hasTouch:true });
const page = await ctx.newPage();
page.on('pageerror', e => chk('no uncaught page error', false, String(e).slice(0,140)));

await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u.startsWith('https://app.cardinalroster.com/') && t === 'document')
    return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
  if (u.includes('@supabase/supabase-js'))
    return r.fulfill({ status:200, contentType:'application/javascript', body:MOCK });
  if (u.includes('chart.js') || u.includes('papaparse'))
    return r.fulfill({ status:200, contentType:'application/javascript', body:'window.Chart=function(){};window.Papa={parse:()=>({data:[]})};' });
  if (u.endsWith('/api/abc')) {
    let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch(_) {}
    const a = body.action || '';
    if (a === 'status')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ configured:true, connected:true, env:'production' }) });
    if (a === 'searchItems') {
      searchCalls++;
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ items:[{ itemNumber:ITEM, itemDescription:DESC, uom:'RL - Roll' }] }) });
    }
    if (a === 'priceItems') {
      priceCalls++;
      if (priceMustFail)
        return r.fulfill({ status:401, contentType:'application/json', body: JSON.stringify({ error: PRICE_401 }) });
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ lines:[{ id:'1', itemNumber:ITEM, unitPrice:PRICE }] }) });
    }
    return r.fulfill({ status:200, contentType:'application/json', body:'{}' });
  }
  if (t === 'font' || t === 'media') return r.fulfill({ status:200, body:'' });
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status:200, body:'' });
  return r.abort();
});

await page.addInitScript(s => { window.__SEED__ = s; }, {
  team_profiles:[{ email:'theo@cardinalrenovations.net', name:'Theo', role:'admin' }],
  projects:[{ id:'p1', name:'Mudd', stage:'Approved', crm:'retail' }],
  appointments:[], estimates:[], contracts:[], inspection_reports:[],
  project_photos:[], punch_items:[], collections:[],
});
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(3400);

// Theo's real account, so a price request can succeed
await page.evaluate(`localStorage.setItem('cardinal.abc', JSON.stringify({shipTo:'2153354-2',billTo:'2153354-1',branch:'106'}))`);

// ── 0. the export the editor depends on ────────────────────────────────
const api = await page.evaluate(`(()=>{ const A = window.CardinalABC || {};
  return { search: typeof A.search, price: typeof A.price, cfg: typeof A.cfg, open: typeof A.open }; })()`);
chk('CardinalABC exposes search/price/cfg to the editor',
    api.search === 'function' && api.price === 'function' && api.cfg === 'function', JSON.stringify(api));
chk('and open() still works (Object.assign kept the old surface)', api.open === 'function', api.open);

// ── 1. open the editor ─────────────────────────────────────────────────
const opened = await page.evaluate(`(async()=>{ try{
  await window.CardinalEstimates.openEditor({ id:'p1', name:'Mudd' });
  return true; }catch(e){ return String(e); } })()`);
await page.waitForTimeout(900);
chk('the estimate editor opens', opened === true, opened);

const btns = await page.evaluate(`(()=>{
  const h = document.querySelector('.cr-est-items-head'); if(!h) return null;
  return [...h.querySelectorAll('button')].map(b=>b.textContent.trim()); })()`);
chk('three item sources now, not two', !!btns && btns.some(t=>/ABC/i.test(t)), JSON.stringify(btns));

// ── 2. tap + ABC Supply ────────────────────────────────────────────────
const tapped = await page.evaluate(`(()=>{ const b=document.querySelector('[data-act="add-abc"]');
  if(!b) return 'no button'; b.click(); return true; })()`);
await page.waitForTimeout(500);
chk('+ ABC Supply is tappable', tapped === true, tapped);

const sheet = await page.evaluate(`(()=>{ const p=document.getElementById('cr-est-picker'); if(!p) return null;
  const go = p.querySelector('.abcgo');
  return { open: p.classList.contains('open'), pick: p.dataset.pick,
    title: (p.querySelector('.box-head h3')||{}).textContent,
    goShown: go ? getComputedStyle(go).display : 'missing',
    ph: (p.querySelector('.box-search input')||{}).placeholder }; })()`);
chk('the sheet says it is ABC now', sheet && /ABC/i.test(sheet.title||''), JSON.stringify(sheet && sheet.title));
chk('the Search ABC button is actually visible',
    !!sheet && sheet.goShown !== 'missing' && sheet.goShown !== 'none', sheet && sheet.goShown);
chk('the placeholder tells you what to type', !!sheet && /ABC/i.test(sheet.ph||''), sheet && sheet.ph);

// ── 3. typing must NOT call ABC (every press is a paid round trip) ──────
const before = searchCalls;
await page.evaluate(`(()=>{ const i=document.querySelector('#cr-est-picker .box-search input'); if(!i) return;
  i.value='underlay'; i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await page.waitForTimeout(700);
/* must not pass vacuously on a build with no ABC mode — require the mode first */
chk('typing does not call ABC (a paid round trip per keystroke)',
    !!sheet && sheet.pick === 'abc' && searchCalls === before,
    'mode=' + (sheet && sheet.pick) + ' calls +' + (searchCalls - before));

// ── 4. Search does ─────────────────────────────────────────────────────
await page.evaluate(`(()=>{ const i=document.querySelector('#cr-est-picker .box-search input');
  if(i) i.value='underlayment';
  const g=document.querySelector('#cr-est-picker .abcgo'); if(g) g.click(); })()`);
await page.waitForTimeout(1200);
chk('the Search button calls ABC exactly once', searchCalls === before + 1, 'calls=' + searchCalls);

const rows = await page.evaluate(`(()=>{ const l=document.querySelector('#cr-est-picker .box-list');
  if(!l) return null; const r=[...l.querySelectorAll('[data-abc]')];
  return { n:r.length, text: l.textContent, hasNum: l.textContent.includes('${ITEM}') }; })()`);
chk('ABC rows render', !!rows && rows.n === 1, rows && ('rows=' + rows.n));
chk('the row shows the item number a rep can read back',
    !!rows && rows.hasNum, rows && (rows.text||'').slice(0,80));

// ── 5. THE POINT: tap it and a priced line lands ────────────────────────
await page.evaluate(`(()=>{ const r=document.querySelector('#cr-est-picker [data-abc]'); if(r) r.click(); })()`);
await page.waitForTimeout(1400);

const st = await page.evaluate(`(()=>{ const s = window.CardinalEstimates && window.CardinalEstimates.currentState
  ? window.CardinalEstimates.currentState() : null;
  return s ? s.line_items : null; })()`);
const line = (st && st.length) ? st[st.length - 1] : null;
chk('a line item was added', !!line, JSON.stringify(st));
chk('priced at the branch price ABC returned',
    !!line && Number(line.unit_price) === PRICE, line && line.unit_price);
chk('the amount follows the price', !!line && Number(line.amount) === PRICE, line && line.amount);
chk('the description carries the item number',
    !!line && String(line.description||'').includes(ITEM), line && line.description);
chk('the unit came across', !!line && /Roll|RL/i.test(String(line.unit||'')), line && line.unit);
chk('abc_item is kept on the line (a purchase order will need it)',
    !!line && String(line.abc_item) === ITEM, line && line.abc_item);
chk('the price request actually went out', priceCalls >= 1, 'priceCalls=' + priceCalls);

const closed = await page.evaluate(`(()=>{ const p=document.getElementById('cr-est-picker');
  return p ? !p.classList.contains('open') : 'missing'; })()`);
chk('the sheet closes after picking', closed === true, closed);

// ── 5b. THE RECURRING ONE: this build shipped a 3.06:1 button once. ────
// Computed, not looked at. Composited ground, walking up only while the
// ground is transparent — an element's own opaque background IS the ground.
const ink = await page.evaluate(`(()=>{
  function parse(c){const m=String(c).match(/-?[\\d.]+/g); if(!m||m.length<3) return null;
    const a=m.length>3?parseFloat(m[3]):1; if(a===0) return null; return [+m[0],+m[1],+m[2],a];}
  function paints(n){const cs=getComputedStyle(n),o=[];const bc=parse(cs.backgroundColor);if(bc)o.push(bc);
    const bi=cs.backgroundImage||''; if(bi&&bi!=='none'){
      (bi.match(/rgba?\\([^)]+\\)/g)||[]).forEach(s=>{const p=parse(s);if(p)o.push(p);});
      (bi.match(/#[0-9a-f]{6}\\b/gi)||[]).forEach(h=>{h=h.slice(1);
        o.push([parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),1]);});}
    return o;}
  function stack(el){const o=[];let n=el;
    while(n&&n.nodeType===1){const p=paints(n);p.forEach(g=>o.push(g));
      if(p.some(g=>g[3]===1))return o; n=n.parentElement;}
    o.push([255,255,255,1]);return o;}
  function flat(g){return [0,1,2].map(i=>g[i]*g[3]+255*(1-g[3]));}
  function over(f,b){const a=f[3];return [0,1,2].map(i=>f[i]*a+b[i]*(1-a));}
  function lum(c){const s=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
    return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}
  function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
  function score(sel){const el=document.querySelector(sel); if(!el) return null;
    const cs=getComputedStyle(el),fg=parse(cs.color); if(!fg) return null;
    let worst=99; for(const g of stack(el)){const b=flat(g); const r=ratio(over(fg,b),b); if(r<worst) worst=r;}
    const px=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight,10)>=700;
    return { r:+worst.toFixed(2), floor:(px>=24||(bold&&px>=18.66))?3.0:4.5, ink:cs.color };}
  return { abc: score('[data-act="add-abc"]'), go: score('#cr-est-picker .abcgo') };
})()`);
chk('+ ABC Supply clears the contrast floor on the ground it paints on',
    !!ink.abc && ink.abc.r >= ink.abc.floor,
    ink.abc ? (ink.abc.r + ':1 vs floor ' + ink.abc.floor + '  ' + ink.abc.ink) : 'missing');
chk('Search ABC clears it too',
    !!ink.go && ink.go.r >= ink.go.floor,
    ink.go ? (ink.go.r + ':1 vs floor ' + ink.go.floor + '  ' + ink.go.ink) : 'missing');

// ── 6. the failure path: a 401 must NOT strand the estimate ─────────────
priceMustFail = true;
page.once('dialog', d => d.accept());
await page.evaluate(`(()=>{ const b=document.querySelector('[data-act="add-abc"]'); if(b) b.click(); })()`);
await page.waitForTimeout(400);
await page.evaluate(`(()=>{ const i=document.querySelector('#cr-est-picker .box-search input');
  if(i) i.value='underlayment';
  const g=document.querySelector('#cr-est-picker .abcgo'); if(g) g.click(); })()`);
await page.waitForTimeout(1200);
const n0 = (await page.evaluate(`(()=>{ const s=window.CardinalEstimates.currentState(); return s?s.line_items.length:0; })()`));
await page.evaluate(`(()=>{ const r=document.querySelector('#cr-est-picker [data-abc]'); if(r) r.click(); })()`);
await page.waitForTimeout(1600);
const st2 = await page.evaluate(`(()=>{ const s=window.CardinalEstimates.currentState(); return s?s.line_items:null; })()`);
const l2 = (st2 && st2.length) ? st2[st2.length - 1] : null;
chk('a price failure still adds the line', !!st2 && st2.length === n0 + 1, 'lines ' + n0 + ' -> ' + (st2 && st2.length));
chk('...at $0, for the rep to type in by hand', !!l2 && Number(l2.unit_price) === 0, l2 && l2.unit_price);
chk('...still carrying the item number', !!l2 && String(l2.abc_item) === ITEM, l2 && l2.abc_item);

// ── 7. the library half is untouched ───────────────────────────────────
await page.evaluate(`(()=>{ const b=document.querySelector('[data-act="add-lib"]'); if(b) b.click(); })()`);
await page.waitForTimeout(500);
const lib = await page.evaluate(`(()=>{ const p=document.getElementById('cr-est-picker'); if(!p) return null;
  const go=p.querySelector('.abcgo');
  return { pick:p.dataset.pick, title:(p.querySelector('.box-head h3')||{}).textContent,
           go: go ? getComputedStyle(go).display : 'missing' }; })()`);
chk('back in Library mode the title reverts', !!lib && /Library/i.test(lib.title||''), lib && lib.title);
chk('and the ABC Search button is hidden again', !!lib && lib.go === 'none', lib && lib.go);

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed') : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
