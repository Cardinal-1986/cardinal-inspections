/* gate_1209.mjs — on a phone, the client name band comes BEFORE the money card.
 *
 *   node gate_1209.mjs [path/to/index.html]     the build must be GREEN
 *   node gate_1209.mjs <1208 index.html>        the control: RED
 *
 * Audit option 9 / finding A6. Build 797 put the merged money card ABOVE the
 * name band on a phone, from preview_v3/v4 and confirmed live. Theo reversed
 * that on 10 Sep 2026. This gate holds the NEW order so nobody restores 797's
 * on the strength of 797's own build-log entry — and `gate_797.mjs` section B
 * was flipped in the same build rather than left to rot asserting the opposite.
 *
 *   A  STATIC — stamp, changelog, the insertion point, and the guard.
 *   B  PHONE 402 — the name band renders ABOVE the money card. THE RED-MAKER.
 *   C  IDEMPOTENCE — the guard actually settles. Five forced re-renders must
 *      reparent #dbMoneyCard ZERO times. A guard that cannot succeed is the
 *      567/569 repaint class and would wake every body observer per render;
 *      moving the insertion point without flipping the guard does exactly that.
 *   D  DESKTOP 1194 — unchanged: the card is back inside #acxMount.
 *   E  797's OTHER half survives — one card, both children inside it.
 *   F  RESIZE phone->desktop->phone with a real re-render at each width.
 *   G  INSURANCE is untouched — no card, no reorder.
 *
 * ⚠ Every geometry check asserts a REAL box first. gate_1207's first two drafts
 * measured 0x0 rects and passed on |0-0| < 20 — a check that cannot fail is
 * worse than no check.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');

const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (x !== undefined ? '  — ' + x : '')); }
  return c;
};
console.log('gate_1209 on ' + FILE);

/* ------------------------------------------------------------------ A ---- */
console.log('\n--- A. static ---');
const st = APP.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok('app stamp is 1209 or above', !!st && Number(st[1]) >= 1209, st ? 'build ' + st[1] : 'none');
ok('CHANGELOG carries a build-1209 entry', /\{\s*b:\s*1209\s*,/.test(APP));
ok('the card is inserted AFTER the name band',
   APP.includes('wrapEl.insertBefore(moneyCard, namebar.nextSibling);'));
ok("797's insertion point is gone",
   !APP.includes('wrapEl.insertBefore(moneyCard, namebar);'));
ok('the idempotence guard is previousElementSibling',
   APP.includes('moneyCard.previousElementSibling !== namebar'));
ok('...and the unsatisfiable nextElementSibling guard is gone',
   !APP.includes('moneyCard.nextElementSibling !== namebar'));
ok('the desktop path is untouched',
   APP.includes('mount.insertBefore(moneyCard, moneyCardHomeNext);'));

/* ------------------------------------------------------------------------ */
const mkSeed = kind => ({
  projects: [{
    id: 'p-1', name: 'Mark Diamond', stage: 'Lead',
    address: '804 Burleigh Avenue, Dayton, OH 45402',
    email: 'mark@example.com', phone: '937-333-9192', claim_type: kind,
    checklist: JSON.stringify({
      po: 1032, stage_since: '2026-09-01T10:00:00Z', lead: { claim_type: kind },
      job_category: 'Residential', work_type: 'New', lead_source: 'Referral',
      trades: ['Roofing']
    }),
    created_at: '2026-09-01T10:00:00Z', created_by: 'theo@cardinalrenovations.net'
  }],
  estimates: [], inspection_reports: [], project_photos: [], punch_items: [],
  appointments: [], team_profiles: [], pricing_items: [], pricing_categories: [], oc_colors: []
});

async function boot(width, kind) {
  const { chromium } = require_(PW);
  const browser = await launchChromium(chromium);
  const ctx = await browser.newContext({
    viewport: { width, height: 900 }, colorScheme: 'dark',
    isMobile: width <= 700, hasTouch: width <= 700, deviceScaleFactor: width > 700 ? 1 : 2
  });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.route('**/*', async (route) => {
    const u = route.request().url(), rt = route.request().resourceType();
    if (u === 'https://app.cardinalroster.com/')
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript',
        body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (u.startsWith('https://app.cardinalroster.com/api/'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'font') return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    if (rt === 'media') return route.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, mkSeed(kind));
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
    if (typeof window.showMain === 'function') window.showMain();
    const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
  });
  return { browser, page };
}
const openProj = (page) => page
  .evaluate(() => { if (typeof openProject === 'function') openProject('p-1'); })
  .then(() => page.waitForTimeout(1800));

/* the one probe both B and F use, so they cannot disagree about what "above"
   means. Returns sentinels rather than dereferencing null, so a control tree
   with no #dbMoneyCard reports RED instead of crashing (BUG_CLASSES 37). */
const ORDER = () => {
  const card = document.getElementById('dbMoneyCard');
  const bar = document.getElementById('cr-namebar');
  if (!card || !bar) return { none: true, card: !!card, bar: !!bar };
  const c = card.getBoundingClientRect(), n = bar.getBoundingClientRect();
  return {
    none: false,
    cardBox: [Math.round(c.width), Math.round(c.height)],
    barBox: [Math.round(n.width), Math.round(n.height)],
    cardTop: Math.round(c.top), barTop: Math.round(n.top),
    barBottom: Math.round(n.bottom), cardBottom: Math.round(c.bottom),
    real: c.width > 20 && c.height > 20 && n.width > 20 && n.height > 20,
    barAboveCard: n.bottom <= c.top + 1,
    cardAboveBar: c.bottom <= n.top + 1,
    parentIsWrap: !!(card.parentNode && card.parentNode.classList &&
                     card.parentNode.classList.contains('wrap')),
    prevIsBar: card.previousElementSibling === bar
  };
};

let browser = null;
try {
  /* ---------------------------------------------------------------- B ---- */
  console.log('\n--- B. phone 402 — the person before the money ---');
  let P = await boot(402, 'retail');
  browser = P.browser;
  await openProj(P.page);
  const B = await P.page.evaluate(ORDER);
  ok('the money card and the name band both rendered', !B.none, JSON.stringify(B));
  ok('both have a REAL box (not a 0x0 pass)', !B.none && B.real,
     'card ' + JSON.stringify(B.cardBox) + ' bar ' + JSON.stringify(B.barBox));
  ok('the NAME BAND renders above the money card', !B.none && B.real && B.barAboveCard,
     'bar bottom ' + B.barBottom + ' vs card top ' + B.cardTop);
  ok('...and 797\'s order is genuinely gone', !B.none && !B.cardAboveBar,
     'cardAboveBar=' + B.cardAboveBar);
  ok('the card is still in .wrap (keeps its full bleed)', !B.none && B.parentIsWrap);
  ok('and it is the name band\'s immediate next element', !B.none && B.prevIsBar);

  /* ---------------------------------------------------------------- C ---- */
  console.log('\n--- C. the guard settles (567/569 repaint class) ---');
  /* ⚠ NOT re-renders. A real render destroys and rebuilds the wrapper by
     design — 797 removes the stale one and makes a new one every time — so
     counting moves across renderOverview() calls measures 797's architecture,
     not this build's guard, and reports the same 10 on 1208 and 1209 alike.
     My first draft did exactly that and failed correct code.
     The guard governs the OTHER path: syncMoneyCard() with no fresh .dbmoney
     under #acxMount, which is what the resize listener triggers. Same width in
     and out, so the phone/desktop decision does not change and a correct guard
     makes every one of these a no-op. Leave the guard as nextElementSibling
     and this reparents on every tick. */
  const C = await P.page.evaluate(async () => {
    const wrap = document.querySelector('#projectView .wrap');
    if (!wrap) return { none: true };
    let moves = 0;
    const mo = new MutationObserver(recs => {
      for (const r of recs) {
        for (const n of r.addedNodes) if (n.id === 'dbMoneyCard') moves++;
        for (const n of r.removedNodes) if (n.id === 'dbMoneyCard') moves++;
      }
    });
    mo.observe(wrap, { childList: true });
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('resize'));
      await new Promise(r => setTimeout(r, 220));   // past the 150ms debounce
    }
    await new Promise(r => setTimeout(r, 300));
    mo.disconnect();
    const card = document.getElementById('dbMoneyCard');
    const bar = document.getElementById('cr-namebar');
    return { none: false, moves, stillOne: document.querySelectorAll('#dbMoneyCard').length,
             stillAfterBar: !!(card && bar && card.previousElementSibling === bar) };
  });
  ok('five resize ticks reparent the card ZERO times', !C.none && C.moves === 0,
     'moves=' + C.moves + ' (a guard that cannot succeed moves it every tick)');
  ok('exactly one #dbMoneyCard survives them', !C.none && C.stillOne === 1, 'n=' + C.stillOne);
  ok('and it is still under the name band', !C.none && C.stillAfterBar);

  /* ---------------------------------------------------------------- E ---- */
  console.log('\n--- E. 797\'s merge is untouched ---');
  const E = await P.page.evaluate(() => {
    const card = document.getElementById('dbMoneyCard');
    if (!card) return { none: true };
    const m = document.querySelector('.dbmoney'), p = document.getElementById('dbPayRow');
    const sm = m && getComputedStyle(m), sp = p && getComputedStyle(p);
    return { none: false,
      moneyInside: !!(m && card.contains(m)), payInside: !!(p && card.contains(p)),
      radius: getComputedStyle(card).borderTopLeftRadius,
      childBorders: [sm ? sm.borderTopWidth : null, sp ? sp.borderTopWidth : null].join('/') };
  });
  ok('.dbmoney is still inside the card', !E.none && E.moneyInside);
  ok('#dbPayRow is still inside the card', !E.none && E.payInside);
  ok('the wrapper is still square-cornered (full bleed)', !E.none && E.radius === '0px', E.radius);
  ok('neither child got its old border back', !E.none && E.childBorders === '0px/0px', E.childBorders);

  /* ---------------------------------------------------------------- F ---- */
  console.log('\n--- F. resize phone -> desktop -> phone, re-rendering at each ---');
  const F = [];
  for (const w of [1194, 402]) {
    await P.page.setViewportSize({ width: w, height: 900 });
    await P.page.evaluate(() => { if (typeof window.renderOverview === 'function') window.renderOverview(); });
    await P.page.waitForTimeout(600);
    F.push([w, await P.page.evaluate(() => {
      const card = document.getElementById('dbMoneyCard');
      const mount = document.getElementById('acxMount');
      return { n: document.querySelectorAll('#dbMoneyCard').length,
               inMount: !!(card && mount && mount.contains(card)),
               money: document.querySelectorAll('.dbmoney').length,
               pay: document.querySelectorAll('#dbPayRow').length };
    })]);
  }
  ok('exactly one card / .dbmoney / #dbPayRow at every width',
     F.every(([, r]) => r.n === 1 && r.money === 1 && r.pay === 1), JSON.stringify(F));
  ok('at 1194 the card goes home to #acxMount', F[0][1].inMount, JSON.stringify(F[0]));
  ok('back at 402 it leaves #acxMount again', !F[1][1].inMount, JSON.stringify(F[1]));
  const F2 = await P.page.evaluate(ORDER);
  ok('and the name band is STILL above it after the round trip',
     !F2.none && F2.real && F2.barAboveCard, JSON.stringify(F2));
  await browser.close(); browser = null;

  /* ---------------------------------------------------------------- D ---- */
  console.log('\n--- D. desktop 1194 from a cold boot ---');
  const D0 = await boot(1194, 'retail');
  browser = D0.browser;
  await openProj(D0.page);
  const D = await D0.page.evaluate(() => {
    const card = document.getElementById('dbMoneyCard');
    const mount = document.getElementById('acxMount');
    const bar = document.getElementById('cr-namebar');
    if (!card || !mount) return { none: true };
    const barVisible = !!(bar && bar.getBoundingClientRect().height > 5);
    return { none: false, inMount: mount.contains(card), barVisible };
  });
  ok('the card lives inside #acxMount on desktop (unchanged by 1209)',
     !D.none && D.inMount, JSON.stringify(D));
  await browser.close(); browser = null;

  /* ---------------------------------------------------------------- G ---- */
  console.log('\n--- G. insurance is untouched ---');
  const I = await boot(402, 'insurance');
  browser = I.browser;
  await openProj(I.page);
  const G = await I.page.evaluate(() => ({
    card: document.querySelectorAll('#dbMoneyCard').length,
    insBody: document.body.className.indexOf('claim-insurance') !== -1
  }));
  ok('an insurance profile is recognised as one', G.insBody, JSON.stringify(G));
  ok('and it has no money card at all — no merge, no reorder', G.card === 0, JSON.stringify(G));
  await browser.close(); browser = null;
} catch (e) {
  ok('the Chromium sections ran', false, String((e && e.message) || e).slice(0, 200));
} finally {
  if (browser) { try { await browser.close(); } catch (_) {} }
}

console.log('\n' + (fail === 0
  ? `GATE 1209 GREEN — ${pass} passed, 0 failed`
  : `GATE 1209 RED — ${fail} failed, ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
