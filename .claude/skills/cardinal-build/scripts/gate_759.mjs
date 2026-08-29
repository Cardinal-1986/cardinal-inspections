/* gate_759.mjs — Theo's four reports, as assertions. Covers builds 758 + 759.

   1. Insurance client cards fit the phone (was: 406px cards clipped at 390px).
   2. Photo Activity opens filtered to the CRM you came from, and the chips work.
   3. Production job rows put the address BELOW the name, and both truncate.
   4. The punch dossier can call the client, including when the number lives
      only in checklist.lead.homeowner_phone (11 of 34 production rows).

   ⚠️ The overflow checks measure the ELEMENT'S OWN rect against the card, not
   the container's — a container's bounding box cannot see inline overflow, so
   a container-only test passes on the broken build (my first probe did exactly
   that and under-reported report 3).

   Structured bail-outs, not crashes (BUG_CLASSES 37).
   Usage: node gate_759.mjs [path/to/index.html]    (v757 = negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ck = (t, extra) => JSON.stringify({ lead: Object.assign({ claim_type: t }, extra || {}) });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    /* the long address is the exact trigger for report 1 */
    { id: 'i1', name: 'Adam Gunn', stage: 'Prospect', crm: 'insurance', checklist: ck('insurance'),
      address: '9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309',
      phone: '9375551212', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'i2', name: 'Maker Space Solutions LLC (Devon)', stage: 'Approved', crm: 'insurance', checklist: ck('insurance'),
      address: '1630 E 5th St, Dayton, OH 45403-2304', phone: '', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    /* phone ONLY in the lead's homeowner field — the 11-of-34 case */
    { id: 'r1', name: 'Joeseph Estimate', stage: 'Approved', crm: 'retail',
      checklist: ck('retail', { homeowner_phone: '(937) 555-8899' }),
      address: '3879 Shadeland Ave Dayton OH, Dayton, OH 45430', phone: '', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    /* no phone anywhere — must show NO call button, honestly */
    { id: 'r2', name: 'Kimberly Guy', stage: 'Prospect', crm: 'retail', checklist: ck('retail'),
      address: '6633 Edenhill ave, Dayton, OH 45420', phone: '', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'c1', name: 'Habitat Job', stage: 'Approved', crm: 'community', checklist: ck('community'),
      address: '10 Community Way, Dayton, OH', phone: '', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
  ],
  insurance_claims: [
    { id: 'cl1', project_id: 'i1', carrier: 'Allstate Vehicle and Property Insurance Company', claim_number: '0802889162', status: 'filed', rcv: 22397.63, acv: 0, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T12:00:00Z' },
    { id: 'cl2', project_id: 'i2', carrier: 'State Farm', claim_number: '3584R158W', status: 'on_hold', rcv: 28727.17, acv: 0, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T12:00:00Z' },
  ],
  project_photos: [
    ...Array.from({ length: 4 }, (_, i) => ({ id: 'pi' + i, project_id: 'i1', data: PIX, storage_path: null, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-1' + (i + 1) + 'T09:00:00Z' })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: 'pr' + i, project_id: 'r1', data: PIX, storage_path: null, created_by: 'curtis@cardinalrenovations.net', created_at: '2026-08-1' + (i + 1) + 'T10:00:00Z' })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: 'pc' + i, project_id: 'c1', data: PIX, storage_path: null, created_by: 'curtis@cardinalrenovations.net', created_at: '2026-08-1' + (i + 1) + 'T11:00:00Z' })),
  ],
  punch_items: [
    { id: 'pu1', project_id: 'r2', title: 'giopujhgsiosjk', kind: 'punch', status: 'open', priority: 'normal', comments: '[]', created_by: 'curtis@cardinalrenovations.net', created_at: '2026-07-31T12:00:00Z' },
    { id: 'pu2', project_id: 'r1', title: 'Reseal pipe boot', kind: 'punch', status: 'open', priority: 'normal', comments: '[]', created_by: 'curtis@cardinalrenovations.net', created_at: '2026-07-31T12:00:00Z' },
  ],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
  commissions: [], draws: [], pricing_items: [], adjusters: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3300);
const go = async (c, ms) => { try { await page.evaluate(c); } catch (e) {} await page.waitForTimeout(ms || 900); };
const probe = async c => { try { return await page.evaluate(c); } catch (e) { return { __err: String(e).split('\n')[0].slice(0, 90) }; } };
await go(`(() => { const c = document.querySelector('.cr-lr-course'); if (c) c.click(); else if (window.showHome) showHome(); })()`);

/* ══ 1. Insurance client cards fit ══ */
await go(`window.showCardinalTruth()`, 700);
await go(`window.showInsuranceClients()`, 1400);
const r1 = await probe(`(() => {
  const rows = [...document.querySelectorAll('.cr-ic-row')];
  if (!rows.length) return { none: true };
  const vw = window.innerWidth;
  return {
    vw,
    worstRight: Math.max(...rows.map(r => Math.round(r.getBoundingClientRect().right))),
    anyOverflow: rows.some(r => Math.round(r.getBoundingClientRect().right) > vw),
    /* the money and the chip are the things Theo saw cut off */
    owedVisible: [...document.querySelectorAll('.cr-ic-row .owed')].every(e => Math.round(e.getBoundingClientRect().right) <= vw),
    chipVisible: [...document.querySelectorAll('.cr-ic-row .stg')].every(e => Math.round(e.getBoundingClientRect().right) <= vw),
    /* ⚠️ NOT a scrollWidth comparison. An INLINE box reports scrollWidth and
       clientWidth as 0, so "scrollWidth <= clientWidth + 1" is 0 <= 1 — a
       VACUOUS PASS that green-lit a broken build (the address was still
       overflowing the card by 32px, clipped by the page's overflow-x:hidden
       with no ellipsis). Assert the display mode and the element's OWN right
       edge against the card instead. */
    addrIsBlock: [...document.querySelectorAll('.cr-ic-row .ad')].every(e => getComputedStyle(e).display === 'block'),
    addrWithinCard: [...document.querySelectorAll('.cr-ic-row .ad')].every(e =>
      Math.round(e.getBoundingClientRect().right) <= Math.round(e.closest('.cr-ic-row').getBoundingClientRect().right)),
  };
})()`);
chk('1. insurance cards: the list rendered', !r1.none && !r1.__err, r1.__err || (r1.none ? 'no rows' : 'ok'));
if (!r1.none && !r1.__err) {
  chk('1. NO CARD RUNS PAST THE SCREEN', !r1.anyOverflow, `worstRight=${r1.worstRight} vw=${r1.vw}`);
  chk('1. the amount owed is fully on screen', r1.owedVisible);
  chk('1. the status chip is fully on screen', r1.chipVisible);
  chk('1. the address is a block, so the ellipsis can work', r1.addrIsBlock);
  chk('1. THE ADDRESS STAYS INSIDE ITS CARD', r1.addrWithinCard);
}

/* ══ 2. Photo Activity follows the CRM ══ */
await go(`window.showCardinalTruth()`, 700);
await go(`openPhotosView()`, 1600);
const r2 = await probe(`(() => {
  const byId = {}; (window.cacheProjects || []).forEach(p => byId[p.id] = p);
  const crmOf = pr => { const t = (window.projClaimType && window.projClaimType(pr)) || '';
    return (t === 'insurance' || t === 'community') ? t : 'retail'; };
  const tally = () => { const o = {};
    [...document.querySelectorAll('#phGrid .phc')].forEach(c => { const k = crmOf(byId[c.dataset.pid]); o[k] = (o[k] || 0) + 1; });
    return o; };
  return { chips: [...document.querySelectorAll('#phCrmChips [data-phcrm]')].map(b => b.getAttribute('data-phcrm') + (b.classList.contains('on') ? '*' : '')),
           scope: (document.getElementById('phScope') || {}).textContent,
           shown: (document.getElementById('phShown') || {}).textContent,
           tally: tally() };
})()`);
chk('2. a CRM chip row exists', !r2.__err && (r2.chips || []).length === 4, JSON.stringify(r2.chips || r2.__err));
chk('2. ARRIVING FROM INSURANCE PRESELECTS INSURANCE', (r2.chips || []).includes('insurance*'), JSON.stringify(r2.chips));
chk('2. only insurance photos are shown', JSON.stringify(r2.tally) === '{"insurance":4}', JSON.stringify(r2.tally));
chk('2. the subtitle states the filter', /Insurance only/.test(r2.scope || ''), r2.scope);
chk('2. and the count is honest about the rest', /4 of 12/.test(r2.shown || ''), r2.shown);
await go(`document.querySelector('#phCrmChips [data-phcrm=""]').click()`, 900);
const r2b = await probe(`(() => {
  const byId = {}; (window.cacheProjects || []).forEach(p => byId[p.id] = p);
  const crmOf = pr => { const t = (window.projClaimType && window.projClaimType(pr)) || '';
    return (t === 'insurance' || t === 'community') ? t : 'retail'; };
  const o = {}; [...document.querySelectorAll('#phGrid .phc')].forEach(c => { const k = crmOf(byId[c.dataset.pid]); o[k] = (o[k] || 0) + 1; });
  return { tally: o, scope: (document.getElementById('phScope') || {}).textContent };
})()`);
chk('2. tapping All widens it back to every CRM', (r2b.tally || {}).retail === 5 && (r2b.tally || {}).community === 3 && (r2b.tally || {}).insurance === 4, JSON.stringify(r2b.tally));
/* community route */
await go(`window.CardinalCommunityHub.show()`, 900);
await go(`openPhotosView()`, 1500);
const r2c = await probe(`(() => [...document.querySelectorAll('#phCrmChips [data-phcrm]')].map(b => b.getAttribute('data-phcrm') + (b.classList.contains('on') ? '*' : '')))()`);
chk('2. arriving from Community preselects Community', (r2c || []).includes('community*'), JSON.stringify(r2c));

/* ══ 3+4 TRIMMED (suite cleanup, 29 Aug 2026) ══
   Sections 3 (Production job rows) and 4 (call from the punch dossier) drove
   the PRE-767 Production board. Builds 766-772 rewrote cr-pb-styles/cr-pb-script
   WHOLESALE — .cr-pb-dtel / .cr-pb-dacts occur 0 times in the file, and 877's
   Self Check triage records the old board controls matching nothing. The call
   capability carried into the punch card (jobHtml, tel: via projPhone) under
   the 766-772-era gates. Sections 1-2 (insurance card fit, Photo Activity CRM
   chips) still guard living surfaces and stay. */
/* ══ source guards (trimmed with sections 3-4: the three pins on the
   pre-767 board's CSS went with it; these two guard living code) ══ */
const src = APP;
chk('one phone resolver, not a ninth regex', (src.match(/function projPhone\(pr\)\{/g) || []).length === 1);
chk('the photo chips reuse the app\'s chip classes', src.includes('<div class="ljchips" id="phCrmChips"></div>'));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
