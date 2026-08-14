/* gate_805 — the showroom door stops rendering the CRM.

   Drives BOTH hostnames in a real browser, because this build's whole risk is
   asymmetric: showroom must change completely and app must not change at all.

     showroom.cardinalroster.com  -> Vision hub only. No CRM anywhere.
     app.cardinalroster.com       -> the CRM, exactly as before.

   What it is really testing is the fault Theo photographed: signing in at
   showroom painted the pipeline, the schedule, AR, punch items carrying a
   client's name, and a staff email address. Root cause was measured, not
   guessed — a probe at the decision line reported window.CardinalLanding
   'undefined' and _vision false while location.hostname was
   showroom.cardinalroster.com, because that object is defined ~22,000 lines
   further down the file than the code asking.

   Negative control:  node gate_805.mjs <804 index.html>  ->  must go RED.
   Every lookup is guarded so the control reports red instead of dying
   (BUG_CLASSES 37: a control that crashes proves nothing).                 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 180000);

const APP  = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

const checks = []; const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/* Deliberately a real client name and a real staff address: the assertion is
   that neither reaches a customer-facing screen. */
const SEED = {
  team_profiles:[{ email:'theo@cardinalrenovations.net', name:'Theo', role:'admin' }],
  projects:[{ id:'p1', name:'Meeds wood', stage:'Approved', crm:'retail' }],
  punch_items:[{ id:'pi1', project_id:'p1', title:'Needs wood left side',
                 status:'open', urgency:'urgent', assigned_to:'scottie@cardinalrenovations.net' }],
  appointments:[], estimates:[], contracts:[], inspection_reports:[],
  project_photos:[], collections:[],
};

async function look(origin) {
  const ctx = await browser.newContext({ viewport:{ width:1400, height:900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u.startsWith(origin) && t === 'document')
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
    if (u.includes('@supabase/supabase-js'))
      return r.fulfill({ status:200, contentType:'application/javascript', body:MOCK });
    if (u.includes('chart.js') || u.includes('papaparse'))
      return r.fulfill({ status:200, contentType:'application/javascript',
        body:'window.Chart=function(){};window.Papa={parse:()=>({data:[]})};' });
    if (t === 'font' || t === 'media' || t === 'image') return r.fulfill({ status:200, body:'' });
    if (u.startsWith(origin)) return r.fulfill({ status:200, body:'' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  /* #h because that is the hash Theo's screenshot was taken at. */
  await page.goto(origin + '/#h', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(5200);

  const out = await page.evaluate(`(()=>{
    const vis = el => { if(!el) return false; const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width>0 && r.height>0 && cs.display!=='none' && cs.visibility!=='hidden'; };
    const txt = document.body ? (document.body.innerText || '') : '';
    const CRM = ['Cardinal Pipeline','Accounts Receivable','Work Schedule','Client Projects',
                 'Punch & Repairs','Schedule Board','Sales Floor','Import from AccuLynx'];
    let topmost = '';
    try { const el = document.elementFromPoint(40, 35);
          topmost = el ? (el.tagName + '.' + (el.className || '')) : ''; } catch(e) {}
    const hs = document.querySelector('header.site');
    return {
      hub:       !!document.querySelector('.cr-vh'),
      mainView:  vis(document.getElementById('mainView')),
      leftnav:   vis(document.querySelector('#cr-lnav, .cr-lnav')),
      header:    hs ? getComputedStyle(hs).display : 'missing',
      crm:       CRM.filter(s => txt.includes(s)),
      staff:     /cardinalrenovations\\.net/.test(txt),
      client:    txt.includes('Meeds wood') || txt.includes('Needs wood'),
      topmost:   topmost,
      visionAttr: document.body ? document.body.getAttribute('data-cr-vision') : null,
    };
  })()`).catch(e => ({ error: String(e && e.message || e) }));
  await ctx.close();
  return out;
}

// ── the customer-facing door ───────────────────────────────────────────────
const s = await look('https://showroom.cardinalroster.com');
chk('showroom: page evaluated', !s.error, s.error);
chk('showroom: the Vision hub is built', !!s.hub);
chk('showroom: the CRM main view is NOT rendered', s.mainView === false, 'mainView=' + s.mainView);
chk('showroom: the CRM left rail is NOT rendered', s.leftnav === false, 'leftnav=' + s.leftnav);
chk('showroom: the site header is refused, not merely covered',
    s.header === 'none', 'computed display=' + s.header);
chk('showroom: ZERO CRM surfaces on screen',
    Array.isArray(s.crm) && s.crm.length === 0, JSON.stringify(s.crm));
chk('showroom: no staff email address on screen', s.staff === false);
chk('showroom: no client name on screen', s.client === false);
chk('showroom: the hub is what a tap at the top actually hits',
    typeof s.topmost === 'string' && s.topmost.includes('cr-vh'), s.topmost);
chk('showroom: the document is marked for CSS to key off', s.visionAttr === '1', s.visionAttr);

// ── the CRM, which must be untouched ───────────────────────────────────────
const a = await look('https://app.cardinalroster.com');
chk('app: page evaluated', !a.error, a.error);
chk('app: the CRM still renders', a.mainView === true, 'mainView=' + a.mainView);
chk('app: the CRM surfaces are all still there',
    Array.isArray(a.crm) && a.crm.length >= 5, JSON.stringify(a.crm));
chk('app: the site header is still shown', a.header !== 'none', 'computed display=' + a.header);
chk('app: no Vision hub on the CRM', a.hub === false);
chk('app: NOT marked as a vision host', !a.visionAttr, a.visionAttr);

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
