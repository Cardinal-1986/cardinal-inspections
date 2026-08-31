#!/usr/bin/env node
/* gate_1188 — goToLanding() after the hostname check, driven in a real engine.
 *
 *   node gate_1188.mjs [cardinal-index.html] [showroom-index.html]
 *   node gate_1188.mjs --control          drive the PREVIOUS build instead
 *
 * The one thing this build must not do is leave somebody looking at nothing.
 * goToLanding() calls hideAllViews() BEFORE it picks a destination, so every
 * statement between those two is a window with the whole app hidden — the
 * 570-572 nav-trap shape. Six drives, each one a way into that window:
 *
 *   A  admin, from a deep screen   → home + the Front Door, landing torn down
 *   B  admin, through the drawer   → the same, by the control a person taps
 *   C  production account          → the BOARD, not the retail home (1038)
 *   D  ?vision=1                   → the Front Door, NOT the old Vision pane
 *   E  showHome() throws           → #mainView anyway (THE FLOOR)
 *   F  signed out                  → the login screen is not torn down
 *   plus  ?open= deep links, the Showroom launchers, and back/reload.
 *
 * ⚠ THE CONTROL IS THE POINT, and only D and E are expected to move.
 * A/B/C/F/deep-links/launchers are REGRESSION checks: they describe behaviour
 * 1187 already had and must stay green on both trees. D and E are the build:
 * on 1187, D shows #landingView (the host fork) and E leaves the screen blank
 * (the else-if with no else). If --control comes back all-green, this gate is
 * measuring nothing and must not be believed.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');

const HERE = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CONTROL = process.argv.includes('--control');
const APP  = args[0] || resolve(HERE, '../../../../index.html');
const SHOW = args[1] || '/home/user/cardinal-showroom/index.html';

const HTML  = readFileSync(APP, 'utf8');
const SEED  = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK  = readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
const SETUP = SEED + '\n;\n' + MOCK;

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  → ' + detail : ''));
  cond ? pass++ : fail++;
};
const browser = await chromium.launch();

/* signedIn=false uses the mock's OWN 729 knob, __NO_SESSION__, so getSession()
   answers null and the app reaches showLogin() by its real boot path.
   ⚠ The first version of this drive loaded the seed WITHOUT the mock, reasoning
   that no mock means no session. It does not: without window.supabase the app
   sets TEAM=false and runs its LOCAL mode, which shows #mainView and no login
   screen at all. F1 caught it — the check was measuring the wrong app. */
async function open(query, { signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://cardinal.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    return r.fulfill({ status: 200, body: '' });
  });
  if (!signedIn) await page.addInitScript('window.__NO_SESSION__ = true;');
  await page.addInitScript(SETUP);
  await page.goto('https://cardinal.test/' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}

/* WHAT "not stranded" MEANS, measured rather than asserted. Ask the page what
   is actually on screen: the id under the middle of the viewport, plus the
   display state of every top-level container this function can land on. An
   elementFromPoint that comes back BODY or HTML is the blank screen. */
const screenState = page => page.evaluate(() => {
  const at = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  const path = [];
  for (let e = at; e && e !== document.documentElement; e = e.parentElement) {
    if (e.id) path.push('#' + e.id);
    if (path.length > 8) break;
  }
  const one = id => {
    const e = document.getElementById(id);
    if (!e) return 'absent';
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 'hidden';
    const r = e.getBoundingClientRect();
    return (r.width > 40 && r.height > 40) ? 'shown' : 'zero';
  };
  return {
    hitTag: at ? at.tagName : null,
    hitPath: path,
    main: one('mainView'), landing: one('landingView'), login: one('loginView'),
    lib: one('resourceLibraryView'), truth: one('cardinalTruthView'),
    board: (document.getElementById('cr-pb') || {}).className || '',
    fdOpen: document.body.classList.contains('cr-fd-open') ||
            !!document.querySelector('#cr-fd.open'),
    landOn: document.body.classList.contains('cr-landing-on'),
    overflow: document.body.style.overflow
  };
});
/* Blank = the hit test landed on nothing but the page itself AND no top-level
   container is showing. Both halves, so a full-bleed background alone cannot
   report a blank screen as healthy. */
const stranded = s => (s.hitTag === 'BODY' || s.hitTag === 'HTML' || s.hitTag === null) &&
                      s.main !== 'shown' && s.landing !== 'shown' &&
                      s.login !== 'shown' && !/\bopen\b/.test(s.board);

console.log('gate_1188 ' + (CONTROL ? '(CONTROL — D and E must FAIL here)' : '') +
            '\n  app: ' + APP + '\n');

/* ── A · admin, from a deep screen ─────────────────────────────────────── */
{
  const { ctx, page, errs } = await open('');
  await page.evaluate(() => window.showResourceLibrary && window.showResourceLibrary());
  await page.waitForTimeout(400);
  const before = await screenState(page);
  ok('A0 the Resource Library really opened first', before.lib === 'shown', JSON.stringify(before.lib));
  await page.evaluate(() => window.goToLanding());
  await page.waitForTimeout(700);
  const s = await screenState(page);
  ok('A1 admin lands on a visible view',        !stranded(s), JSON.stringify(s));
  ok('A2 admin lands on the CRM home',          s.main === 'shown', s.main);
  ok('A3 the Library is torn down behind it',   s.lib !== 'shown', s.lib);
  ok('A4 the landing pane is not shown',        s.landing !== 'shown', s.landing);
  ok('A5 body.cr-landing-on is cleared',        s.landOn === false, String(s.landOn));
  ok('A6 the Front Door is open over it',       s.fdOpen === true, String(s.fdOpen));
  ok('A7 the page can still scroll',            s.overflow !== 'hidden', s.overflow || '(empty)');
  ok('A8 no page error',                        errs.length === 0, errs[0] || '');

  /* back / reload — the trapped-state half of the ask */
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(900);
  const b = await screenState(page);
  ok('A9 back does not blank the screen',       !stranded(b), JSON.stringify(b));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const r = await screenState(page);
  ok('A10 reload does not blank the screen',    !stranded(r), JSON.stringify(r));
  await ctx.close();
}

/* ── B · the control a person actually taps ────────────────────────────── */
{
  const { ctx, page, errs } = await open('');
  const tapped = await page.evaluate(() => {
    const row = document.querySelector('.navopt[data-nav="landing"]');
    if (!row) return false;
    row.click();
    return true;
  });
  await page.waitForTimeout(800);
  const s = await screenState(page);
  ok('B1 the drawer still HAS a Landing row',   tapped === true);
  ok('B2 tapping it reaches a visible view',    tapped && !stranded(s), JSON.stringify(s));
  ok('B3 tapping it opens the Front Door',      tapped && s.fdOpen === true, String(s.fdOpen));
  ok('B4 no page error',                        errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── C · production account — 1038's doctrine ──────────────────────────── */
{
  const { ctx, page, errs } = await open('?as=curtis');
  await page.evaluate(() => window.goToLanding());
  await page.waitForTimeout(900);
  const s = await screenState(page);
  const prod = await page.evaluate(() => ({
    isProd: typeof window.isProductionUser === 'function' ? !!window.isProductionUser() : null,
    boardOpen: !!document.querySelector('#cr-pb.open')
  }));
  ok('C1 the rig really is a production account', prod.isProd === true, String(prod.isProd));
  ok('C2 production lands on the board',          prod.boardOpen === true, s.board);
  ok('C3 production is not stranded',             !stranded(s), JSON.stringify(s));
  ok('C4 no page error',                          errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── D · ?vision=1 — THE BUILD. Control must fail this. ────────────────── */
{
  const { ctx, page, errs } = await open('?vision=1');
  const pre = await screenState(page);
  ok('D0 ?vision=1 still cold-loads the Vision pane (untouched)',
     pre.landing === 'shown', JSON.stringify(pre.landing));
  await page.evaluate(() => window.goToLanding());
  await page.waitForTimeout(900);
  const s = await screenState(page);
  ok('D1 goToLanding no longer re-shows the Vision pane', s.landing !== 'shown', s.landing);
  ok('D2 it lands on the CRM home instead',               s.main === 'shown', s.main);
  ok('D3 the Front Door is the way back',                 s.fdOpen === true, String(s.fdOpen));
  ok('D4 nobody is stranded on the way',                  !stranded(s), JSON.stringify(s));
  ok('D5 no page error',                                  errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── E · THE FLOOR. Control must fail this. ────────────────────────────── */
{
  const { ctx, page, errs } = await open('');
  /* Break the destination the way a renderer throwing would break it, and
     make sure the production branch cannot answer instead. Nothing else is
     touched: hideAllViews() still runs, so the app really does pass through
     the all-hidden window this check exists for. */
  const broke = await page.evaluate(() => {
    if (typeof window.showHome !== 'function') return false;
    window.showHome = function () { throw new Error('gate_1188: destination refused'); };
    window.isProductionUser = function () { return false; };
    return true;
  });
  await page.evaluate(() => { try { window.goToLanding(); } catch (e) { window.__threw__ = String(e); } });
  await page.waitForTimeout(700);
  const s = await screenState(page);
  const threw = await page.evaluate(() => window.__threw__ || null);
  ok('E0 the rig really did break the destination', broke === true);
  ok('E1 goToLanding does not throw out',           threw === null, threw || '');
  ok('E2 the floor shows #mainView anyway',         s.main === 'shown', s.main);
  ok('E3 the screen is not blank',                  !stranded(s), JSON.stringify(s));
  ok('E4 the Front Door still opens',               s.fdOpen === true, String(s.fdOpen));
  ok('E5 no page error',                            errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── F · signed out ────────────────────────────────────────────────────── */
{
  const { ctx, page } = await open('', { signedIn: false });
  const pre = await screenState(page);
  ok('F1 signed out lands on the login screen', pre.login === 'shown', JSON.stringify(pre.login));
  await page.evaluate(() => { try { window.goToLanding && window.goToLanding(); } catch (e) {} });
  await page.waitForTimeout(700);
  const s = await screenState(page);
  ok('F2 goToLanding does not tear the login screen down', s.login === 'shown', s.login);
  ok('F3 a signed-out user is never stranded',             !stranded(s), JSON.stringify(s));
  await ctx.close();
}

/* ── deep links, unchanged by this build ───────────────────────────────── */
for (const [q, id, label] of [['?open=appt', 'cr-appt', 'The Appointment'],
                              ['?open=why',  'cr-why',  'Why Cardinal']]) {
  const { ctx, page } = await open(q);
  const st = await page.evaluate(i => {
    const e = document.getElementById(i);
    if (!e) return { there: false };
    const r = e.getBoundingClientRect();
    return { there: true, display: getComputedStyle(e).display, h: Math.round(r.height) };
  }, id);
  ok(`G ${q} still cold-loads into ${label}`,
     st.there && st.display !== 'none' && st.h > 200, JSON.stringify(st));
  await ctx.close();
}

/* ── the Showroom launchers, unchanged by this build ───────────────────── */
{
  const S = existsSync(SHOW) ? readFileSync(SHOW, 'utf8') : '';
  ok('H0 the Showroom file is readable', !!S, SHOW);
  for (const u of ['https://app.cardinalroster.com/studio.html',
                   'https://app.cardinalroster.com/?open=appt',
                   'https://app.cardinalroster.com/?open=why',
                   'https://presentation.cardinalroster.com/popup.html'])
    ok('H the Showroom still launches ' + u, S.includes(u));
  ok('H no launcher fell back to a bare path',
     !/url\s*:\s*['"]\/(studio|popup)\.html/.test(S));
}

await browser.close();
console.log('\n' + (fail ? 'RED' : 'GREEN') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
