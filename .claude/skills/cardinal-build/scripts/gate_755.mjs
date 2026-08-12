/* gate_755.mjs — the banner speaks your CRM's language.

   What this has to prove:
     1. On INSURANCE the two pills read Clients / Claims; Clients opens the
        insurance client list, Claims opens the claims tracker.
     2. On COMMUNITY they read Partners / Bids; each opens the hub ON THAT TAB
        (the hub's own pane mechanism, not a modal).
     3. On RETAIL they read Contacts / Leads and behave exactly as before —
        including after a round-trip through another CRM (the swap must be
        reversible, not one-way).
     4. The pills are the SAME two elements re-labelled (no new entrances:
        pill count in the banner is unchanged).
     5. The Leads & Jobs subtitle says "All CRMs" (it showed every CRM's jobs
        while claiming "Retail only" — measured in the 754 audit).

   Structured bail-outs, not crashes (BUG_CLASSES 37): on v754 (negative
   control) the pills stay Contacts/Leads on insurance — those checks must
   REPORT red, not throw.

   Usage: node gate_755.mjs [path/to/index.html]     (v754 = negative control) */
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
  project_photos: [], punch_items: [], commissions: [], draws: [], community_partners: [],
  insurance_claims: [],
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

const PILLS = `(() => {
  const els = [...document.querySelectorAll('#crBanner [data-cr-slot], #crBanner [data-go="contacts"], #crBanner [data-go="leads"]')];
  const seen = new Set(); const out = [];
  for (const e of els) { if (seen.has(e)) continue; seen.add(e);
    out.push({ go: e.getAttribute('data-go'), label: e.textContent.trim(), shown: e.style.display !== 'none' }); }
  return { pills: out, count: document.querySelectorAll('#crBanner .cbn').length };
})()`;
const vis = id => `(() => { const e = document.getElementById('${id}'); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'; })()`;
/* Swallow evaluate errors into the report instead of crashing the gate: on
   the v754 negative control the swapped pills do not exist, so a bare
   `.click()` on the querySelector result throws — and a crashed control
   proves nothing (BUG_CLASSES 37). The absent element then fails the
   following visibility check, which is the red we want. */
let lastGoErr = '';
const go = async (code, ms) => {
  lastGoErr = '';
  try { await page.evaluate(code); }
  catch (e) { lastGoErr = String(e).split('\n')[0].slice(0, 100); }
  await page.waitForTimeout(ms || 850);
};

/* ── retail baseline ── */
await go(`window.showHome()`);
const p0 = await page.evaluate(PILLS);
chk('RETAIL: pills read Contacts / Leads', p0.pills.map(p => p.label).join('/') === 'Contacts/Leads', JSON.stringify(p0.pills));
const bannerPillCount = p0.count;

/* ── insurance ── */
await go(`window.showCardinalTruth()`);
const p1 = await page.evaluate(PILLS);
chk('INSURANCE: pills read Clients / Claims', p1.pills.map(p => p.label).join('/') === 'Clients/Claims', JSON.stringify(p1.pills));
chk('INSURANCE: both pills shown', p1.pills.every(p => p.shown));
chk('no new pills were added (same element count)', p1.count === bannerPillCount, p1.count + ' vs ' + bannerPillCount);
await go(`document.querySelector('#crBanner [data-go="insclients"]').click()`);
chk('Clients opens the insurance client list', await page.evaluate(vis('insClientsView')));
await go(`window.showCardinalTruth()`);
await go(`document.querySelector('#crBanner [data-go="claims"]').click()`);
chk('Claims opens the claims tracker', await page.evaluate(vis('cr-claims-mount')));

/* ── community ── */
await go(`window.CardinalCommunityHub.show()`);
const p2 = await page.evaluate(PILLS);
chk('COMMUNITY: pills read Partners / Bids', p2.pills.map(p => p.label).join('/') === 'Partners/Bids', JSON.stringify(p2.pills));
await go(`window.showHome()`); /* leave, then deep-link from retail-adjacent state */
await go(`window.CardinalCommunityHub.show()`);
await go(`document.querySelector('#crBanner [data-go="partners"]').click()`);
chk('Partners opens the hub', await page.evaluate(vis('communityHubView')));
chk('…on the Partners tab', await page.evaluate(`(() => { const b = document.querySelector('#communityHubView [data-pane="partners"], #cr-ch2 [data-pane="partners"]'); return !!b && b.classList.contains('on'); })()`));
await go(`document.querySelector('#crBanner [data-go="bids"]').click()`);
chk('Bids lands on the Bids tab', await page.evaluate(`(() => { const b = document.querySelector('#communityHubView [data-pane="bids"], #cr-ch2 [data-pane="bids"]'); return !!b && b.classList.contains('on'); })()`));

/* ── the swap is reversible ── */
await go(`window.showHome()`);
const p3 = await page.evaluate(PILLS);
chk('back on RETAIL: pills revert to Contacts / Leads', p3.pills.map(p => p.label).join('/') === 'Contacts/Leads', JSON.stringify(p3.pills));
await go(`document.querySelector('#crBanner [data-go="leads"]').click()`);
chk('retail Leads still opens Leads & Jobs', await page.evaluate(vis('leadsView')));
chk('the Leads & Jobs subtitle says All CRMs', await page.evaluate(`(() => { const e = document.querySelector('#leadsView .ljsub'); return !!e && /All CRMs/.test(e.textContent); })()`));
await go(`document.querySelector('#crBanner [data-go="contacts"]').click()`);
chk('retail Contacts still opens the client directory', await page.evaluate(`(() => { const e = document.getElementById('clientsView') || document.getElementById('cliList'); return !!e && e.getClientRects().length > 0; })()`));

/* ── source guards ── */
const src = APP;
chk('the markup pills are untouched (runtime swap only)', src.includes('<span class="cbn" data-go="contacts">Contacts</span>') && src.includes('<span class="cbn" data-go="leads">Leads</span>'));
chk('paintCrmPills exists exactly once', (src.match(/function paintCrmPills\(/g) || []).length === 1);
chk('the subtitle lie is gone', !src.includes('Retail only &middot;'));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
