/* gate_804.mjs — the permanent search row folds into a header lens.
 *
 *   node gate_804.mjs [path/to/index.html]
 *
 *   A. the row is collapsed by default and the lens is present, ON THE
 *      RIGHT (past Home) — not hard left on top of the centred title,
 *      which is what an order-less button does on this bar
 *   B. tapping the lens opens the row AND focuses the field (one tap to
 *      type), and tapping again closes it
 *   C. the search still works through the row when open — the field is the
 *      SAME #headSearch, hidden not removed, so its boot-bound listener lives
 *   D. ⚠ the moon is not lost: with the row collapsed it floats to the corner
 *      by the app's own .afloat mechanism, and it is still clickable
 *   E. ⚠ insurance's Docket/Siren switch is not stranded — it moved to the
 *      header and is reachable with the row collapsed
 *   F. the height actually comes back, on all three CRMs
 *
 * Negative control: run against 803 — A/B/E must go RED, not crash.
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
console.log('gate_804 on ' + FILE);

function proj(id, name, kind, partner) {
  const lead = { claim_type: kind };
  if (partner) { lead.partner_name = partner; lead.bid_amount = 12000; }
  return { id, name, stage: 'Lead', address: '100 Test St, Dayton, OH', claim_type: kind,
    email: 'x@x.com', phone: '9375550100', checklist: JSON.stringify({ lead }),
    created_at: '2026-06-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net' };
}
const SEED = {
  projects: [proj('c1', 'Zulema Hall — Habitat for Humanity', 'community', 'Habitat for Humanity'),
             proj('r1', 'Retail Job', 'retail'), proj('i1', 'Insurance Job', 'insurance')],
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
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.evaluate(() => {
  const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
  if (typeof window.showMain === 'function') window.showMain();
  const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  if (window.CardinalCommunityHub) window.CardinalCommunityHub.show();
});
await page.waitForTimeout(1800);

console.log('\n--- A. collapsed by default, lens on the RIGHT ---');
const A = await page.evaluate(() => {
  const row = document.getElementById('cr-hd2-srch');
  const lens = document.getElementById('cr-hd2-lens');
  const home = document.getElementById('cr-hd2-home');
  const mid = document.getElementById('cr-hd2-mid');
  if (!lens || !row || !home) return { none: true };
  const lr = lens.getBoundingClientRect(), hr = home.getBoundingClientRect();
  const mr = mid ? mid.getBoundingClientRect() : null;
  return { none: false,
    rowH: getComputedStyle(row).display === 'none' ? 0 : Math.round(row.getBoundingClientRect().height),
    lensX: Math.round(lr.left), homeX: Math.round(hr.left), lensW: Math.round(lr.width),
    // does it overlap the centred title? that was the order:0 failure mode
    overlapsTitle: !!(mr && lr.left < mr.right && lr.right > mr.left),
    hasIcon: !!lens.querySelector('svg') };
});
ok('the search row is collapsed on load', !A.none && A.rowH === 0, JSON.stringify(A));
ok('the lens exists and carries the app icon', !A.none && A.hasIcon, JSON.stringify(A));
ok('the lens sits to the RIGHT of Home, not on the title', !A.none && A.lensX > A.homeX && !A.overlapsTitle, JSON.stringify(A));

console.log('\n--- B. tap opens + focuses; tap again closes ---');
const B = await page.evaluate(async () => {
  const lens = document.getElementById('cr-hd2-lens');
  // guarded so the NEGATIVE CONTROL goes red rather than throwing — a crash
  // here would stop the run and D/E/F would never report at all
  if (!lens) return { none: true };
  lens.click();
  await new Promise(r => setTimeout(r, 350));
  const row = document.getElementById('cr-hd2-srch');
  const openH = getComputedStyle(row).display === 'none' ? 0 : Math.round(row.getBoundingClientRect().height);
  const focused = document.activeElement && document.activeElement.id;
  const aria = lens.getAttribute('aria-expanded');
  lens.click();
  await new Promise(r => setTimeout(r, 350));
  const closedH = getComputedStyle(row).display === 'none' ? 0 : Math.round(row.getBoundingClientRect().height);
  return { openH, focused, aria, closedH, aria2: lens.getAttribute('aria-expanded') };
});
ok('tapping opens the row', !B.none && B.openH > 0, JSON.stringify(B));
ok('and focuses the field — one tap to type', !B.none && B.focused === 'headSearch', JSON.stringify(B));
ok('aria-expanded tracks it', !B.none && B.aria === 'true' && B.aria2 === 'false', JSON.stringify(B));
ok('tapping again closes it', !B.none && B.closedH === 0, JSON.stringify(B));

console.log('\n--- C. the field is the same one, still wired ---');
const C = await page.evaluate(async () => {
  const lens = document.getElementById('cr-hd2-lens');
  if (!lens) return { none: true };
  lens.click();
  await new Promise(r => setTimeout(r, 300));
  const f = document.getElementById('headSearch');
  const inRow = !!(f && f.closest('#cr-hd2-srch'));
  f.value = 'zulema';
  const typed = f.value;
  lens.click();
  await new Promise(r => setTimeout(r, 250));
  const stillThere = !!document.getElementById('headSearch');
  return { inRow, typed, stillThere };
});
ok('#headSearch is the same element, inside the row', !C.none && C.inRow && C.typed === 'zulema', JSON.stringify(C));
ok('and survives the row closing (hidden, not removed)', !C.none && C.stillThere, JSON.stringify(C));

console.log('\n--- D. the moon floats to the corner, still clickable ---');
const D = await page.evaluate(async () => {
  // refreshVisibility runs on a 1s interval; give it two ticks
  await new Promise(r => setTimeout(r, 2400));
  const m = document.getElementById('cr-dark-toggle');
  if (!m) return { none: true };
  const cs = getComputedStyle(m), r = m.getBoundingClientRect();
  const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
  return { none: false, parent: m.parentElement === document.body ? 'body' : (m.parentElement.id || '?'),
    afloat: m.classList.contains('afloat'), shown: cs.display !== 'none',
    pos: cs.position, clickable: !!(hit && (hit === m || m.contains(hit))) };
});
ok('the moon stepped out to the corner (.afloat on body)', !D.none && D.parent === 'body' && D.afloat, JSON.stringify(D));
ok('it is visible, fixed, and nothing covers it', !D.none && D.shown && D.pos === 'fixed' && D.clickable, JSON.stringify(D));

console.log('\n--- E. insurance keeps its theme switch ---');
const E = await page.evaluate(async () => {
  if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth();
  await new Promise(r => setTimeout(r, 2200));
  const b = document.querySelector('.cr-ins-theme');
  if (!b) return { none: true };
  const cs = getComputedStyle(b), r = b.getBoundingClientRect();
  const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
  return { none: false, host: b.parentElement ? b.parentElement.id : null,
    shown: cs.display !== 'none' && r.width > 0,
    reachable: !!(hit && (hit === b || b.contains(hit))),
    rowCollapsed: getComputedStyle(document.getElementById('cr-hd2-srch')).display === 'none' };
});
ok('the Docket/Siren switch lives in the header now', !E.none && E.host === 'cr-hd2-bar', JSON.stringify(E));
ok('and is visible + reachable with the row collapsed', !E.none && E.shown && E.reachable && E.rowCollapsed, JSON.stringify(E));

console.log('\n--- F. the height actually comes back, all three CRMs ---');
const F = await page.evaluate(async () => {
  const out = {};
  const go = async (k, fn) => { fn(); await new Promise(r => setTimeout(r, 1500));
    const row = document.getElementById('cr-hd2-srch');
    const banner = document.getElementById('crBanner');
    out[k] = { row: getComputedStyle(row).display === 'none' ? 0 : Math.round(row.getBoundingClientRect().height),
               bannerTop: Math.round(banner.getBoundingClientRect().top) }; };
  await go('retail', () => { if (typeof window.showHome === 'function') window.showHome(); });
  await go('insurance', () => { if (typeof window.showCardinalTruth === 'function') window.showCardinalTruth(); });
  await go('community', () => { if (window.CardinalCommunityHub) window.CardinalCommunityHub.show(); });
  return out;
});
ok('retail: row gone, banner rides up under the header', F.retail.row === 0 && F.retail.bannerTop < 70, JSON.stringify(F.retail));
ok('insurance: same', F.insurance.row === 0 && F.insurance.bannerTop < 70, JSON.stringify(F.insurance));
ok('community: same', F.community.row === 0 && F.community.bannerTop < 70, JSON.stringify(F.community));

await browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
