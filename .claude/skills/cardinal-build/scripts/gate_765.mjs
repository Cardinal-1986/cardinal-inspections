/* gate_765 — "Find my Ship-To" ends the guessing.
   Drives the REAL failure Theo hit and proves the cure end to end:
     price with shipTo 0003  -> ABC's 401 naming the ship-to
     Find my Ship-To         -> ABC's real accounts, with addresses
     tap one                 -> field + saved config updated
     price again             -> the request now carries the REAL number
   The last step is the one that matters: it asserts on the BODY the app
   sent, so a picker that looks right but doesn't reach pricing fails here.
   Negative control: node gate_765.mjs <prev index.html> -> RED.           */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 90000);

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

const REAL_SHIPTO = '1163698';
const PRICE_401 = 'ABC POST /api/pricing/v2/prices -> HTTP 401 — This user is not authorized to view pricing data for the provided shipTo number, 0003. Please try a different shipTo number';

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const checks = []; const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });
const priceBodies = [];

const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2, hasTouch:true });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u.startsWith('https://app.cardinalroster.com/') && t === 'document')
    return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
  if (u.includes('@supabase/supabase-js'))
    return r.fulfill({ status:200, contentType:'application/javascript', body:MOCK });
  if (u.includes('chart.js') || u.includes('papaparse'))
    return r.fulfill({ status:200, contentType:'application/javascript', body:'window.Chart=function(){};window.Papa={parse:()=>({data:[]})};' });
  if (u.endsWith('/api/abc')) {
    let body = {};
    try { body = JSON.parse(r.request().postData() || '{}'); } catch(_) {}
    const a = body.action || '';
    if (a === 'status')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ configured:true, connected:true, env:'production' }) });
    if (a === 'searchItems')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ items:[{ itemNumber:'9466850010',
          itemDescription:'Owens Corning RhinoRoof U20 Synthetic Roofing Underlayment 10 Square Roll',
          uom:'RL - Roll' }] }) });
    if (a === 'accounts')
      /* ABC's own documented response shape, verbatim keys */
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ shipTos: [
          { name:'HABITAT FOR HUMANITY', number:REAL_SHIPTO, status:'active',
            address:{ line1:'3720 STORMONT RD', city:'DAYTON', state:'OH', postal:'45426' },
            billTo:{ number:'2153354-1', name:'CARDINAL ROOFING & RENOV' } },
          { name:'MCCONNEL JOB', number:'1163699', status:'active',
            address:{ line1:'3725 OH-569', city:'URBANA', state:'OH', postal:'43078' },
            billTo:{ number:'2153354-1', name:'CARDINAL ROOFING & RENOV' } },
        ] }) });
    if (a === 'priceItems') {
      priceBodies.push(body);
      if (String(body.shipTo) === REAL_SHIPTO)
        return r.fulfill({ status:200, contentType:'application/json',
          body: JSON.stringify({ lines:[{ id:'1', itemNumber:'9466850010', unitPrice: 72.00 }] }) });
      return r.fulfill({ status:401, contentType:'application/json',
        body: JSON.stringify({ error: PRICE_401 }) });
    }
    return r.fulfill({ status:200, contentType:'application/json', body:'{}' });
  }
  if (t === 'font' || t === 'media') return r.fulfill({ status:200, body:'' });
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status:200, body:'' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, {
  team_profiles:[{ email:'theo@cardinalrenovations.net', name:'Theo', role:'admin' }],
  projects:[], appointments:[], estimates:[], contracts:[], inspection_reports:[],
  project_photos:[], punch_items:[], collections:[],
});
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(3200);

// Theo's exact broken state
await page.evaluate(`localStorage.setItem('cardinal.abc', JSON.stringify({shipTo:'0003',billTo:'2153354-1',branch:'106'}))`);
await page.evaluate(`window.CardinalABC.open()`);
await page.waitForTimeout(900);

// 1. reproduce the failure
await page.evaluate(`(()=>{ const q=document.querySelector('#cr-abc [data-q]'); q.value='underlayment';
  document.querySelector('#cr-abc [data-act="search"]').click(); })()`);
await page.waitForTimeout(1100);
await page.evaluate(`(()=>{const b=document.querySelector('#cr-abc .item [data-price]'); if(b) b.click();})()`);
await page.waitForTimeout(1100);
const failed = await page.evaluate(`(()=>{ const m=document.querySelector('#cr-abc .item [data-prmsg]');
  return m ? m.textContent : ''; })()`);
chk('reproduces the real 401, naming ship-to 0003',
    failed.includes('shipTo number, 0003'), failed.slice(0, 90));

// 2. the new button exists and is reachable
const hasBtn = await page.evaluate(`!!document.querySelector('#cr-abc [data-act="ship"]')`);
chk('"Find my Ship-To" button exists', hasBtn);

await page.evaluate(`(()=>{const b=document.querySelector('#cr-abc [data-act="ship"]'); if(b) b.click();})()`);
await page.waitForTimeout(1100);
const listed = await page.evaluate(`(()=>{
  const rows=[...document.querySelectorAll('#cr-abc [data-useship]')];
  const box=document.querySelector('#cr-abc [data-results]');
  return { n: rows.length, nums: rows.map(r=>r.getAttribute('data-useship')),
           text: box ? box.textContent : '' };
})()`);
chk('ABC\'s ship-to accounts are listed', listed.n === 2, 'rows=' + listed.n);
chk('each row shows the real number', listed.nums.includes(REAL_SHIPTO), JSON.stringify(listed.nums));
chk('the address is shown so a rep recognises the job',
    listed.text.includes('STORMONT') && listed.text.includes('DAYTON'), listed.text.slice(0, 120));

// 3. tapping one updates the field AND the saved config
await page.evaluate(`(()=>{const b=document.querySelector('#cr-abc [data-useship="${REAL_SHIPTO}"]'); if(b) b.click();})()`);
await page.waitForTimeout(500);
const after = await page.evaluate(`(()=>({
  field: (document.querySelector('#cr-abc [data-f="shipTo"]')||{}).value,
  saved: (JSON.parse(localStorage.getItem('cardinal.abc')||'{}')).shipTo,
}))()`);
chk('the Ship-To field is filled', after.field === REAL_SHIPTO, 'field=' + after.field);
chk('and it PERSISTS (saved config, survives reopen)', after.saved === REAL_SHIPTO, 'saved=' + after.saved);

// 4. the point of the whole build: pricing now sends the real number and succeeds
await page.evaluate(`(()=>{ const q=document.querySelector('#cr-abc [data-q]'); q.value='underlayment';
  document.querySelector('#cr-abc [data-act="search"]').click(); })()`);
await page.waitForTimeout(1100);
await page.evaluate(`(()=>{const b=document.querySelector('#cr-abc .item [data-price]'); if(b) b.click();})()`);
await page.waitForTimeout(1200);
const priced = await page.evaluate(`(()=>{ const i=document.querySelector('#cr-abc .item');
  return { pr: (i.querySelector('[data-pr]')||{}).textContent,
           msg: (i.querySelector('[data-prmsg]')||{}).textContent }; })()`);
const lastBody = priceBodies[priceBodies.length - 1] || {};
chk('the follow-up price request carries the REAL ship-to',
    String(lastBody.shipTo) === REAL_SHIPTO, 'sent shipTo=' + lastBody.shipTo);
chk('a real price renders', (priced.pr || '').includes('72.00'), JSON.stringify(priced));
chk('and no error line is left behind', !priced.msg, JSON.stringify(priced.msg));

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed') : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
