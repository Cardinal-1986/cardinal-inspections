/* gate_802.mjs — Community Partners card decluttered: no repeated partner
 * name, real status chips, Tools tucked behind "More tools".
 *
 *   node gate_802.mjs [path/to/index.html]
 *
 *   A. a job row whose stored client name carries "— Partner Name" shows
 *      just the client's own name, not the redundant suffix
 *   B. a row whose name has no such suffix is untouched
 *   C. status chips render with the right text and class (bad/good/neutral)
 *      for due-today, overdue, out-for-decision and awarded
 *   D. the dollar amount and the data-open click-through still work -
 *      nothing about navigation changed
 *   E. Tools: New Bid is immediately visible; the other six are inside a
 *      closed-by-default <details>, and opening it reveals them, still wired
 *   F. the partner-level numbers (Win/Out/Awarded/Owed) are untouched
 *
 * Negative control: run against 801 — A/C/E must go RED, not crash.
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
console.log('gate_802 on ' + FILE);

function proj(id, name, stage, partner, bidAmount, dueAt) {
  var lead = { claim_type: 'community', partner_name: partner, bid_amount: bidAmount, bid_due_at: dueAt || null };
  return { id, name, stage, address: '100 Test St, Dayton, OH', claim_type: 'community',
    email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com', phone: '9375550100',
    checklist: JSON.stringify({ lead }),
    created_at: '2026-06-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net' };
}
// mirrors the real production shape found on the live DB: the partner name
// baked into the client's own name field with an em dash.
const SEED = {
  projects: [
    /* "due today" must BE today — the original hardcoded 2026-08-14 (the gate's
       authoring date) and correctly read "Nd overdue" ever after. */
    proj('p1', 'Zulema Hall — Habitat for Humanity', 'Lead', 'Habitat for Humanity', 12000,
      (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date())),   // due today
    proj('p2', 'Will Poindexter — Habitat for Humanity', 'Lead', 'Habitat for Humanity', 29460, '1900-01-01'), // deep overdue, stable
    proj('p3', 'Jacob Reyes', 'Prospect', 'Habitat for Humanity', 18425, null),   // no suffix in the name - must pass through
    proj('p4', 'Frank Ostrowski — Habitat for Humanity', 'Approved', 'Habitat for Humanity', 18500, null)      // awarded
  ],
  community_partners: [
    { id: 'cp1', name: 'Habitat for Humanity', partner_type: 'nonprofit', archived: false, confidential: false, prospective: false }
  ],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
};

async function boot(width) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width, height: 1400 },
    deviceScaleFactor: 1, isMobile: width <= 700, hasTouch: width <= 700 })).newPage();
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
    if (window.CardinalCommunityHub && typeof window.CardinalCommunityHub.show === 'function') window.CardinalCommunityHub.show();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = document.querySelector('button[data-pane="partners"]');
    if (b) b.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelectorAll('#cr-ch2 .pc .ph').forEach(h => h.click()); });
  await page.waitForTimeout(400);
  return { browser, page };
}

const P = await boot(402);

const rows = await P.page.evaluate(() => {
  return Array.from(document.querySelectorAll('#cr-ch2 .pc .brow')).map(b => ({
    name: b.querySelector('.x b') ? b.querySelector('.x b').textContent : null,
    chipText: b.querySelector('.bchip') ? b.querySelector('.bchip').textContent : null,
    chipCls: b.querySelector('.bchip') ? b.querySelector('.bchip').className : null,
    amt: b.querySelector('.amt') ? b.querySelector('.amt').textContent : null,
    pid: b.dataset.open
  }));
});
console.log('\n--- A/B. name suffix stripped only when it is really there ---');
const zulema = rows.find(r => r.pid === 'p1'), will = rows.find(r => r.pid === 'p2'),
      jacob = rows.find(r => r.pid === 'p3'), frank = rows.find(r => r.pid === 'p4');
ok('Zulema: "— Habitat for Humanity" stripped', !!zulema && zulema.name === 'Zulema Hall', JSON.stringify(zulema));
ok('Will: same stripped', !!will && will.name === 'Will Poindexter', JSON.stringify(will));
ok('Frank: same stripped', !!frank && frank.name === 'Frank Ostrowski', JSON.stringify(frank));
ok('Jacob: no suffix present, name untouched', !!jacob && jacob.name === 'Jacob Reyes', JSON.stringify(jacob));

console.log('\n--- C. status chips ---');
ok('Zulema (due today) reads "Due today", bad class', !!zulema && zulema.chipText === 'Due today' && zulema.chipCls.includes('bad'), JSON.stringify(zulema));
ok('Will (deep overdue) reads "…d overdue", bad class', !!will && /d overdue$/.test(will.chipText) && will.chipCls.includes('bad'), JSON.stringify(will));
ok('Jacob (Prospect / chase) reads "Out for decision"', !!jacob && jacob.chipText === 'Out for decision', JSON.stringify(jacob));
ok('Frank (Approved / awarded) reads "Awarded", good class', !!frank && frank.chipText === 'Awarded' && frank.chipCls.includes('good'), JSON.stringify(frank));

console.log('\n--- D. dollar amounts and click-through untouched ---');
ok('Zulema still shows her $12,000', !!zulema && zulema.amt === '$12,000', JSON.stringify(zulema));
const clickWorks = await P.page.evaluate(() => {
  window.__opened = null;
  window.openProject = function(id){ window.__opened = id; };
  const row = document.querySelector('#cr-ch2 .pc .brow[data-open="p1"]');
  if (!row) return { none: true };
  row.click();
  return { none: false, opened: window.__opened };
});
ok('clicking a row still calls openProject with the right id', !clickWorks.none && clickWorks.opened === 'p1', JSON.stringify(clickWorks));

console.log('\n--- E. Tools: New Bid up front, six behind a closed sheet ---');
const tools = await P.page.evaluate(() => {
  const primary = document.querySelector('#cr-ch2 .tools button.primary');
  const details = document.querySelector('#cr-ch2 .cc-moretools');
  if (!details) return { none: true };
  const before = { open: details.open, visible6: details.querySelectorAll('.tools button').length };
  details.querySelector('summary').click();
  return {
    none: false,
    primaryVisible: !!primary && primary.closest('details') === null,
    primaryText: primary ? primary.textContent : null,
    beforeOpen: before.open, beforeCount: before.visible6,
    afterOpen: details.open,
  };
});
ok('New Bid is not inside the collapsed details', !tools.none && tools.primaryVisible, JSON.stringify(tools));
/* 1092 MOVED the Analytics button out of the Tools sheet into the hub tab
   strip ("moved, not duplicated" — build log); five tools remain inside. */
ok('closed by default, with the 5 secondary tools inside it (analytics moved to the strip at 1092)',
  !tools.none && !tools.beforeOpen && tools.beforeCount === 5, JSON.stringify(tools));
ok('clicking the summary opens it', !tools.none && tools.afterOpen === true, JSON.stringify(tools));
const dataGoWired = await P.page.evaluate(() => {
  /* analytics left the sheet at 1092 — probe a tool still inside it, and prove
     the analytics door survived its move to the strip rather than being lost. */
  const btn = document.querySelector('#cr-ch2 .cc-moretools [data-go="activity"]');
  const an  = document.querySelector('#cr-ch2 [data-go="analytics"]');
  return { sheet: !!btn && typeof btn.onclick === 'function',
           analytics: !!an && typeof an.onclick === 'function',
           analyticsInSheet: !!(an && an.closest('.cc-moretools')) };
});
ok('a tool inside the sheet is still wired (data-go dispatch untouched)',
  dataGoWired.sheet, JSON.stringify(dataGoWired));
ok('the analytics door survived its 1092 move to the strip, wired, outside the sheet',
  dataGoWired.analytics && !dataGoWired.analyticsInSheet, JSON.stringify(dataGoWired));

console.log('\n--- F. partner-level numbers untouched ---');
const nums = await P.page.evaluate(() => {
  const pc = document.querySelector('#cr-ch2 .pc');
  if (!pc) return { none: true };
  const vs = Array.from(pc.querySelectorAll('.pnums .v')).map(e => e.textContent.trim());
  return { none: false, vs };
});
// out = 12000+29460+18425 = 59885 (Lead+Prospect); awarded = 18500 (Approved)
ok('Out totals the three non-awarded bids ($59,885)', !nums.none && nums.vs.includes('$59,885'), JSON.stringify(nums));
ok('Awarded totals Frank’s bid ($18,500)', !nums.none && nums.vs.includes('$18,500'), JSON.stringify(nums));

await P.browser.close();
console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
