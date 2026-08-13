/* gate_764 — ABC's rejection text is readable.
   Chromium, not jsdom: two of the three faults were LAYOUT (a 120px float)
   and TEXT ENCODING, neither of which jsdom can judge.

   Reproduces the real failure: a long ABC 401 sentence containing "->",
   which is exactly what 763 produced on screen as a clipped "-&gt;".
   Negative control: node gate_764.mjs <prev index.html> -> RED.            */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 90000);

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

/* The real thing, verbatim in shape: long, contains "->", and the part that
   matters ("not authorized...") sits well past the old 60-character cut. */
const ABC_ERR = 'ABC POST /api/pricing/v2/prices -> HTTP 401 — This user is not authorized to price for the ship-to account provided';

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const checks = []; const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });

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
  /* /api/abc: status -> connected; searchItems -> one real-shaped row;
     priceItems -> the 401 the app must render legibly. */
  if (u.endsWith('/api/abc')) {
    let action = '';
    try { action = JSON.parse(r.request().postData() || '{}').action || ''; } catch(_) {}
    if (action === 'status')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ configured:true, connected:true, env:'production' }) });
    if (action === 'searchItems')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ items:[{ itemNumber:'9466850010',
          itemDescription:'Owens Corning RhinoRoof U20 Synthetic Roofing Underlayment 10 Square Roll',
          uom:'RL - Roll' }] }) });
    if (action === 'priceItems')
      return r.fulfill({ status:401, contentType:'application/json',
        body: JSON.stringify({ error: ABC_ERR }) });
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

// account numbers live in localStorage; seed them so the price button proceeds
await page.evaluate(`localStorage.setItem('cardinal.abc', JSON.stringify({shipTo:'0003',billTo:'2153354-1',branch:'106'}))`);
await page.evaluate(`window.CardinalABC.open()`);
await page.waitForTimeout(900);
await page.evaluate(`(()=>{ const q=document.querySelector('#cr-abc [data-q]'); q.value='underlayment';
  document.querySelector('#cr-abc [data-act="search"]').click(); })()`);
await page.waitForTimeout(1200);

const found = await page.evaluate(`!!document.querySelector('#cr-abc .item [data-price]')`);
chk('a search result rendered', found);

await page.evaluate(`document.querySelector('#cr-abc .item [data-price]').click()`);
await page.waitForTimeout(1200);

const r = await page.evaluate(`(()=>{
  const item = document.querySelector('#cr-abc .item');
  const msg = item.querySelector('[data-prmsg]');
  if(!msg) return { missing:true };
  const mb = msg.getBoundingClientRect(), ib = item.getBoundingClientRect();
  return {
    text: msg.textContent,
    width: Math.round(mb.width),
    itemWidth: Math.round(ib.width),
    overflowsRight: mb.right > ib.right + 1,
    // does the visible text run past the element's own box?
    clipped: msg.scrollWidth > msg.clientWidth + 1,
    display: getComputedStyle(msg).display,
  };
})()`);

chk('the message element exists', !r.missing, JSON.stringify(r).slice(0, 200));
chk('ABC\'s full sentence is present, not truncated',
    r.text === '${ABC_ERR}'.replace('${ABC_ERR}', ABC_ERR), JSON.stringify(r.text));
chk('the reason past the old 60-char cut survives',
    (r.text || '').includes('not authorized to price for the ship-to account provided'));
chk('"->" renders literally, not as "-&gt;" (no double-escape)',
    (r.text || '').includes('-> HTTP 401') && !(r.text || '').includes('&gt;'), r.text);
chk('it uses the item\'s full width, not the 120px float',
    r.width > 200, 'msg=' + r.width + 'px item=' + r.itemWidth + 'px');
/* Must require the element FIRST: on the pre-fix build these read undefined,
   and `!undefined` is true — the check would pass on a build that has no
   message element at all. A vacuous pass is worse than no check. */
chk('nothing is clipped or overflowing',
    !r.missing && r.clipped === false && r.overflowsRight === false,
    'clipped=' + r.clipped + ' overflowsRight=' + r.overflowsRight);

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed') : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
