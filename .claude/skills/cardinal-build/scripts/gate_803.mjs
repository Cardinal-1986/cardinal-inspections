/* gate_803.mjs — #crBanner stops repeating the tab strip directly under it.
 *
 *   node gate_803.mjs [path/to/index.html]
 *
 *   A. Community hub open: the banner's Partners + Bids pills are hidden
 *      (the hub's own strip is a superset), and Photos/Production/Tools stay
 *   B. the hub's tab strip still carries all three tabs and still switches
 *   C. ⚠ THE ONE THAT MATTERS: navigate OFF the hub and the pills COME BACK.
 *      #crBanner is universal chrome; the strips are not. Hiding a pill for
 *      good would delete the only one-tap route back to Partners.
 *   D. Cardinal Truth open: "Clients" hides (the 801 strip covers it) but
 *      "Claims" STAYS — ROUTES.claims is crOpenClaims, a different screen
 *      that merely shares a word
 *   E. Retail: nothing hidden — no tab strip there, nothing is duplicated
 *   F. no repaint loop — the display write stays guarded, so an idle banner
 *      records zero attribute mutations (the 567/569 class)
 *
 * Negative control: run against 802 — A and D must go RED, not crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const ROOT = '/home/user/cardinal-inspections';
const FILE = process.argv[2] || ROOT + '/index.html';
const APP  = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(ROOT + '/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); } };
console.log('gate_803 on ' + FILE);

function proj(id, name, stage, kind, partner) {
  const lead = { claim_type: kind };
  if (partner) { lead.partner_name = partner; lead.bid_amount = 12000; }
  return { id, name, stage, address: '100 Test St, Dayton, OH', claim_type: kind,
    email: 'x@x.com', phone: '9375550100', checklist: JSON.stringify({ lead }),
    created_at: '2026-06-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net' };
}
const SEED = {
  projects: [
    proj('c1', 'Zulema Hall — Habitat for Humanity', 'Lead', 'community', 'Habitat for Humanity'),
    proj('r1', 'Retail Job', 'Lead', 'retail'),
    proj('i1', 'Insurance Job', 'Lead', 'insurance')
  ],
  community_partners: [{ id: 'cp1', name: 'Habitat for Humanity', partner_type: 'nonprofit', archived: false, confidential: false, prospective: false }],
  insurance_claims: [], 'rpc:supplement_stats': [{ avg_increase_pct: 14.2 }],
  appointments: [], estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 402, height: 900 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html', body: APP });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
  if (rt === 'media') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.evaluate(() => {
  const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
});

const PILLS = () => {
  window.__pills = () => {
    const out = {};
    document.querySelectorAll('#crBanner .cbn').forEach(e => {
      // the two dropdown pills render their caret inside the label, so their
      // textContent is "Production ▼" / "Tools ▼" — strip it, or a lookup by
      // the plain word silently reads undefined and fails a passing build.
      const t = (e.textContent || '').trim().split('\n')[0].replace(/\s*[▼▲]\s*$/, '').trim();
      out[t] = e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
    });
    return out;
  };
};
await page.evaluate(PILLS);

console.log('\n--- A. Community hub: the duplicated pills go ---');
await page.evaluate(() => { if (window.CardinalCommunityHub) window.CardinalCommunityHub.show(); });
await page.waitForTimeout(1600);
const A = await page.evaluate(() => window.__pills());
ok('Partners pill hidden while the hub strip is up', A['Partners'] === false, JSON.stringify(A));
/* 1091 renamed the Community pill 'Bids' -> 'Estimates' (display text only). */
ok('Bids/Estimates pill hidden too', (A['Estimates'] !== undefined ? A['Estimates'] : A['Bids']) === false, JSON.stringify(A));
ok('Photos / Production / Tools all stay', A['Photos'] === true && A['Production'] === true && A['Tools'] === true, JSON.stringify(A));

console.log('\n--- B. the hub strip still works ---');
const B = await page.evaluate(async () => {
  const tabs = Array.from(document.querySelectorAll('#cr-ch2 .tabbar [data-pane]')).map(e => e.dataset.pane);
  const p = document.querySelector('#cr-ch2 .tabbar [data-pane="partners"]');
  if (p) p.click();
  await new Promise(r => setTimeout(r, 600));
  const on = document.querySelector('#cr-ch2 .tabbar [data-pane].on');
  return { tabs, active: on ? on.dataset.pane : null };
});
ok('all three tabs still present', B.tabs.join(',') === 'clients,bids,partners', JSON.stringify(B));
ok('tapping Partners still switches the pane', B.active === 'partners', JSON.stringify(B));

console.log('\n--- C. off the hub the pills COME BACK (no route lost) ---');
const C = await page.evaluate(async () => {
  if (typeof window.openProject === 'function') window.openProject('c1');
  await new Promise(r => setTimeout(r, 1800));
  const strip = document.querySelector('#cr-ch2 .tabbar');
  return {
    stripOnScreen: !!(strip && strip.getClientRects().length),
    pills: window.__pills(),
    crm: document.body.dataset.crmHead || document.body.dataset.crm
  };
});
ok('the hub strip is genuinely gone from the screen', C.stripOnScreen === false, JSON.stringify(C));
ok('Partners pill is back', C.pills['Partners'] === true, JSON.stringify(C));
ok('Bids/Estimates pill is back', (C.pills['Estimates'] !== undefined ? C.pills['Estimates'] : C.pills['Bids']) === true, JSON.stringify(C));

console.log('\n--- D. Cardinal Truth: Clients hides, Claims STAYS ---');
const D = await page.evaluate(async () => {
  if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth();
  await new Promise(r => setTimeout(r, 1800));
  return { pills: window.__pills(),
    stripUp: !!document.querySelector('#cardinalTruthView .cr-cth-tabs') };
});
ok('the 801 strip is on screen', D.stripUp === true, JSON.stringify(D));
ok('Clients pill hidden (the strip covers it)', D.pills['Clients'] === false, JSON.stringify(D));
ok('Claims pill STAYS — crOpenClaims is a different screen', D.pills['Claims'] === true, JSON.stringify(D));

console.log('\n--- E. Retail: untouched, nothing is duplicated there ---');
const E = await page.evaluate(async () => {
  if (typeof window.showHome === 'function') window.showHome();
  await new Promise(r => setTimeout(r, 1800));
  return { pills: window.__pills(), crm: document.body.dataset.crmHead || document.body.dataset.crm };
});
ok('Contacts visible on retail', E.pills['Contacts'] === true, JSON.stringify(E));
ok('Leads visible on retail', E.pills['Leads'] === true, JSON.stringify(E));

console.log('\n--- F. no repaint loop (the guarded write survives) ---');
const F = await page.evaluate(async () => {
  let n = 0;
  const mo = new MutationObserver(recs => { n += recs.length; });
  mo.observe(document.getElementById('crBanner'), { attributes: true, subtree: true, attributeFilter: ['style'] });
  await new Promise(r => setTimeout(r, 1500));
  mo.disconnect();
  return { mutations: n };
});
ok('an idle banner records no style rewrites', F.mutations === 0, JSON.stringify(F));

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
