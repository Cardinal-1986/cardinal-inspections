/* gate_1211.mjs — Build 1211: the estimate builder's header stops duplicating
 * the thumb bar, and Publish still shows it is working.
 *
 *   node gate_1211.mjs [path/to/index.html]     the build must be GREEN
 *   node gate_1211.mjs <the 1210 artifact>      the control: RED
 *
 * Audit item 4. Two things are checked, and the SECOND is the one that matters
 * more than the feature:
 *
 *   A. on a phone the header's Save and Publish are gone and the bar's are there
 *   B. AT EVERY WIDTH, Save and Publish are reachable SOMEWHERE
 *
 * B is the invariant, and it is why this gate exists rather than a screenshot.
 * OPEN_ITEMS proposed hiding at <=760px — 1205's WRAP breakpoint — while the
 * phone bar only appears at <=700px. That would have left 701–760px with no
 * Save and no Publish anywhere on a money screen, and it would have looked
 * perfectly correct on a 390px phone and a 1194px desktop, which is where
 * anyone would have checked. The sweep below covers 701 and 760 on purpose.
 *
 * ⚠ Hidden, never removed: cr-epub's injectButton() bails unless it can find
 * the Save button and cr-e2c anchors on it too, so the gate asserts all three
 * injected controls are still present while two of them are invisible.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };

setTimeout(() => { console.log('\nGATE 1211 TIMEOUT'); process.exit(3); }, 420000).unref();

/* one place that answers "is this control usable by a person right now" —
   a programmatic click succeeds on a display:none node, so never ask the DOM
   whether the element exists when the question is whether it is on screen. */
const READ = function () {
  const view = document.getElementById('cr-est-view');
  const seen = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const head    = view && view.querySelector('.cr-est-head');
  const hSave   = head && head.querySelector('[data-act="save"]');
  const hPub    = document.getElementById('cr-epub-btn');
  const hE2C    = document.getElementById('cr-e2c-btn');
  const bSave   = view && view.querySelector('[data-act="bar-save"]');
  const bPub    = view && view.querySelector('[data-act="bar-publish"]');
  return {
    headH:  head ? Math.round(head.getBoundingClientRect().height) : -1,
    /* PRESENT in the DOM — what the two injectors need */
    hasSave: !!hSave, hasPub: !!hPub, hasE2C: !!hE2C,
    /* VISIBLE to a person */
    seeHeadSave: seen(hSave), seeHeadPub: seen(hPub), seeE2C: seen(hE2C),
    seeBarSave:  seen(bSave), seeBarPub:  seen(bPub),
  };
};

/* drive the bar's Publish and read BOTH buttons synchronously afterwards:
   handlePublishClick runs to its first await before yielding, and pubSet(true)
   is above that await. */
const DRIVE_PUBLISH = function () {
  const view = document.getElementById('cr-est-view');
  const bPub = view && view.querySelector('[data-act="bar-publish"]');
  const hPub = document.getElementById('cr-epub-btn');
  if (!bPub || !hPub) return { missing: true };
  const before = { bar: bPub.textContent.trim(), head: hPub.textContent.trim() };
  bPub.click();
  return { missing: false, before,
           barText: bPub.textContent.trim(), barDisabled: !!bPub.disabled,
           headText: hPub.textContent.trim(), headDisabled: !!hPub.disabled };
};

async function openBuilder(page) {
  return page.evaluate(async () => {
    const s = (window.__sentinelStates || []).find(x => x.name === 'estbuilder');
    if (!s) return 'no estbuilder state';
    try { await s.run(); } catch (e) { return 'threw: ' + e.message; }
    await new Promise(r => setTimeout(r, 1200));
    return 'ok';
  });
}

function routes(page) {
  return page.route('**/*', async (route) => {
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
}

console.log('gate_1211 on ' + FILE + '\n');
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);

  /* ── A/B. the width sweep — the invariant, then the phone specifics ───── */
  console.log('A  Save and Publish are reachable at EVERY width');
  const WIDTHS = [390, 600, 700, 701, 760, 1194];
  const seenAt = {};
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 880 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await routes(page);
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    const st = await openBuilder(page);
    if (st !== 'ok') { ok(false, w + 'px: the estimate builder opens', st); await ctx.close(); continue; }
    const r = await page.evaluate(READ);
    seenAt[w] = r;
    ok(r.seeHeadSave || r.seeBarSave, w + 'px: SAVE is on screen somewhere',
       'head ' + r.seeHeadSave + ' / bar ' + r.seeBarSave);
    ok(r.seeHeadPub || r.seeBarPub, w + 'px: PUBLISH is on screen somewhere',
       'head ' + r.seeHeadPub + ' / bar ' + r.seeBarPub);
    await ctx.close();
  }

  /* ── C. on a phone the header copies are the ones that went ──────────── */
  console.log('\nB  on a phone the duplicates are the header ones');
  const p390 = seenAt[390];
  if (!p390) { ok(false, '390px was measured at all'); }
  else {
    ok(p390.seeHeadSave === false, 'the header Save is not on screen at 390px');
    ok(p390.seeHeadPub  === false, 'the header Publish is not on screen at 390px');
    ok(p390.seeBarSave  === true,  '  · the bar carries Save instead');
    ok(p390.seeBarPub   === true,  '  · the bar carries Publish instead');
    ok(p390.seeE2C      === true,  '  · "→ Contract" is untouched — it has no duplicate');
  }

  /* ── D. the anchor trap: hidden, never removed ───────────────────────── */
  console.log('\nC  hidden, never removed — the injectors still find their anchors');
  if (p390) {
    ok(p390.hasSave, 'the Save button is still IN THE DOM at 390px (cr-epub bails without it)');
    ok(p390.hasPub,  'cr-epub injected its Publish button at 390px');
    ok(p390.hasE2C,  'cr-e2c injected "→ Contract" at 390px — it anchors on the other two');
  }

  /* ── E. the breakpoint gap this gate exists for ──────────────────────── */
  console.log('\nD  701–760px keeps the header pair (the bar does not exist there)');
  for (const w of [701, 760]) {
    const r = seenAt[w];
    if (!r) { ok(false, w + 'px measured'); continue; }
    ok(r.seeBarSave === false && r.seeBarPub === false,
       w + 'px: the thumb bar is correctly absent above 700px');
    ok(r.seeHeadSave === true && r.seeHeadPub === true,
       w + 'px: so the HEADER still carries both — hiding at 760 would have stranded this width',
       'head save ' + r.seeHeadSave + ' / head pub ' + r.seeHeadPub);
  }

  /* ── F. Publish reports progress where the user can see it ───────────── */
  console.log('\nE  the bar\'s Publish shows it is working');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 880 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await routes(page);
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    const st = await openBuilder(page);
    if (st !== 'ok') ok(false, 'the builder opens for the publish drive', st);
    else {
      const d = await page.evaluate(DRIVE_PUBLISH);
      if (d.missing) ok(false, 'both publish buttons exist to drive');
      else {
        ok(d.before.bar === 'Publish', 'the bar button starts out reading "Publish"', d.before.bar);
        ok(/Publishing/.test(d.barText),
           'THE BAR BUTTON READS "Publishing…" AFTER THE TAP', JSON.stringify(d.barText));
        ok(d.barDisabled === true, '  · and is disabled while it runs');
        ok(/Publishing/.test(d.headText),
           '  · the real header button says the same thing — one state, not two',
           JSON.stringify(d.headText));
      }
    }
    await ctx.close();
  }

  /* ── G. desktop is untouched ─────────────────────────────────────────── */
  console.log('\nF  a desktop sees exactly what it saw before');
  const d1194 = seenAt[1194];
  if (d1194) {
    ok(d1194.seeHeadSave && d1194.seeHeadPub && d1194.seeE2C,
       'at 1194px the header still carries Save, Publish and → Contract');
    ok(d1194.seeBarSave === false && d1194.seeBarPub === false,
       '  · and the thumb bar stays off');
  }
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

/* a shrinking gate must fail, not go quietly green */
console.log('');
ok(checks >= 26, 'coverage floor: ' + checks + ' checks ran (>= 26)');

console.log('\n' + (fails === 0
  ? `GATE 1211 GREEN — ${checks} checks passed`
  : `GATE 1211 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
