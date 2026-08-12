/* gate_754.mjs — the header remembers which CRM you're in.

   Encodes Theo's complaint as assertions (audit_header.mjs measured the bug):
     1. From INSURANCE home, tapping banner "Leads" keeps the header insurance:
        body[data-crm-head]='insurance', header paint UNCHANGED from Truth home
        (computed backgroundColor+Image pair), title 'Insurance', switcher on
        Insurance — while body[data-crm] stays 'retail' so the PAGE ground and
        module gates are byte-for-byte the pre-754 behaviour.
     2. The gold home button from that shared screen returns to Cardinal Truth
        (it used to go to the retail dashboard).
     3. Same pair for COMMUNITY (hub + green).
     4. RETAIL regression: from retail home the same tap keeps retail steel and
        home returns to the retail dashboard — no behaviour change.
     5. The explicit CRM switcher still works from a shared screen.
     6. crmHead() resolution: view > open client's type > sticky portal —
        an open RETAIL client wins over an insurance portal.
     7. Page-ground proof: body computed background on the shared screen is
        IDENTICAL under insurance portal and retail portal (the naive fix
        painted the light insurance ground under retail-styled screens).

   Structured bail-outs, not crashes (BUG_CLASSES 37): on v753 (negative
   control) data-crm-head does not exist and home routes to retail — the gate
   must REPORT that red.

   Usage: node gate_754.mjs [path/to/index.html]     (v753 = negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    { id: 'r1', name: 'Retail One',  stage: 'Lead',     crm: 'retail',    checklist: ck('retail'),    created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'i1', name: 'Claim One',   stage: 'Prospect', crm: 'insurance', checklist: ck('insurance'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'c1', name: 'Habitat Job', stage: 'Approved', crm: 'community', checklist: ck('community'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
  ],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
  project_photos: [], punch_items: [], commissions: [], draws: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.evaluate(`(() => { const c = document.querySelector('.cr-lr-course'); if (c) c.click(); else if (window.showHome) showHome(); })()`);
await page.waitForTimeout(900);

const PROBE = `(() => {
  const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  const hd = document.querySelector('header.site');
  const cs = getComputedStyle(hd), bn = getComputedStyle(document.getElementById('crBanner'));
  const onChip = document.querySelector('#cbCrm [data-crm-go].on');
  return {
    crm: document.body.dataset.crm || '(unset)',
    head: document.body.dataset.crmHead || '(unset)',
    hdPaint: cs.backgroundColor + '|' + cs.backgroundImage.slice(0, 60),
    bnPaint: bn.backgroundColor,
    bodyPaint: getComputedStyle(document.body).backgroundColor + '|' + (getComputedStyle(document.body).backgroundImage || '').slice(0, 40),
    title: (document.querySelector('#brandTitle h1') || {}).textContent || '',
    switcherOn: onChip ? onChip.getAttribute('data-crm-go') : '(none)',
    truth: vis(document.getElementById('cardinalTruthView')),
    hub: vis(document.getElementById('communityHubView')),
    leads: vis(document.getElementById('leadsView')),
    main: vis(document.getElementById('mainView')),
  };
})()`;
const go = async code => { await page.evaluate(code); await page.waitForTimeout(850); return page.evaluate(PROBE); };

/* ── retail baseline ── */
const retailHome = await go(`window.showHome()`);
const retailLeads = await go(`document.querySelector('#crBanner [data-go="leads"]').click()`);
chk('RETAIL: shared screen keeps retail header', retailLeads.head === 'retail' || retailLeads.head === '(unset)', retailLeads.head);
chk('RETAIL: header paint unchanged on shared screen', retailLeads.hdPaint === retailHome.hdPaint);
const retailBack = await go(`document.getElementById('cr-hd2-home').click()`);
chk('RETAIL: home returns to the retail dashboard', retailBack.main && !retailBack.truth, JSON.stringify({ main: retailBack.main }));

/* ── insurance ── */
const truthHome = await go(`window.showCardinalTruth()`);
chk('INSURANCE home: data-crm=insurance', truthHome.crm === 'insurance', truthHome.crm);
chk('INSURANCE home: data-crm-head=insurance', truthHome.head === 'insurance', truthHome.head);
const insLeads = await go(`document.querySelector('#crBanner [data-go="leads"]').click()`);
chk('tap Leads: the leads screen opens', insLeads.leads);
chk('tap Leads: PAGE stays retail-grounded (data-crm=retail)', insLeads.crm === 'retail', insLeads.crm);
chk('tap Leads: HEADER stays insurance (data-crm-head)', insLeads.head === 'insurance', insLeads.head);
chk('tap Leads: header paint IDENTICAL to Truth home', insLeads.hdPaint === truthHome.hdPaint, insLeads.hdPaint);
chk('tap Leads: banner paint identical to Truth home', insLeads.bnPaint === truthHome.bnPaint, insLeads.bnPaint);
chk('tap Leads: title still reads Insurance', insLeads.title.trim() === 'Insurance', insLeads.title.trim());
chk('tap Leads: switcher still highlights Insurance', insLeads.switcherOn === 'insurance', insLeads.switcherOn);
chk('tap Leads: page ground = the retail-portal ground (no light wash)', insLeads.bodyPaint === retailLeads.bodyPaint, insLeads.bodyPaint);
chk('crmHead() resolves insurance on the shared screen',
    await page.evaluate(`window.CardinalHeader && window.CardinalHeader.crmHead ? window.CardinalHeader.crmHead() : '(absent)'`) === 'insurance');
const insBack = await go(`document.getElementById('cr-hd2-home').click()`);
chk('HOME FROM LEADS RETURNS TO CARDINAL TRUTH (the reported bug)', insBack.truth && !insBack.main, JSON.stringify({ truth: insBack.truth, main: insBack.main }));

/* burger route too */
await go(`window.showCardinalTruth()`);
await go(`(() => { document.getElementById('navBtn').click(); document.querySelector('#navMenu [data-nav="leads"]').click(); })()`);
const insBack2 = await go(`document.getElementById('cr-hd2-home').click()`);
chk('same via the burger: home returns to Cardinal Truth', insBack2.truth, JSON.stringify({ truth: insBack2.truth }));

/* an open RETAIL client outranks the sticky insurance portal */
const withRetailClient = await go(`(() => { window.currentProject = (window.cacheProjects || []).filter(p => p.id === 'r1')[0]; window.showHome(); })()`);
chk('an open retail client wins over the insurance portal', withRetailClient.head === 'retail', withRetailClient.head);
await go(`(() => { window.currentProject = null; })()`);

/* ── community ── */
const hubHome = await go(`window.CardinalCommunityHub.show()`);
chk('COMMUNITY home: data-crm-head=community', hubHome.head === 'community', hubHome.head);
const comLeads = await go(`document.querySelector('#crBanner [data-go="leads"]').click()`);
chk('tap Leads: header stays community', comLeads.head === 'community', comLeads.head);
chk('tap Leads: header paint identical to hub home', comLeads.hdPaint === hubHome.hdPaint);
chk('tap Leads: page stays retail-grounded', comLeads.crm === 'retail', comLeads.crm);
const comBack = await go(`document.getElementById('cr-hd2-home').click()`);
chk('home returns to the Community hub', comBack.hub && !comBack.main, JSON.stringify({ hub: comBack.hub }));

/* ── the explicit switcher still works from a shared screen ── */
await go(`document.querySelector('#crBanner [data-go="leads"]').click()`);
const switched = await go(`document.querySelector('#cbCrm [data-crm-go="insurance"]').click()`);
chk('switcher from a shared screen: Insurance opens Cardinal Truth', switched.truth && switched.head === 'insurance', JSON.stringify({ truth: switched.truth, head: switched.head }));

/* ── source guards ── */
const src = APP;
chk('26 header selectors migrated to data-crm-head', (src.match(/body\[data-crm-head="/g) || []).length === 26, (src.match(/body\[data-crm-head="/g) || []).length);
chk('the two page grounds did NOT move', src.includes('body[data-crm="community"]{background:var(--ccm-ground,#0e100f)}') && src.includes('body[data-crm="insurance"]{background:var(--ct-bg)}'));
chk('PIPE_SKIP still reads the page CRM', src.includes("var _crm = document.body.dataset.crm || 'retail';"));
chk('openLeadForm defaults from crmHead', src.includes('(_h.crmHead || _h.crm)'));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
