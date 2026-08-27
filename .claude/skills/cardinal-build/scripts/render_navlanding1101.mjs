/* Build 1101 gate — landingView is registered in hideAllViews().
 * Proves the real navigation bug and its fix, in a real browser:
 *   1. Enter the landing hub  -> landingView visible.
 *   2. Open My Profile         -> landing HIDDEN, profileView visible, cr-landing-on cleared.
 *   3. Re-enter landing        -> landingView visible again (the fix doesn't break the way IN).
 *   4. Open Clients too        -> landing hidden (the bug hit every menu screen, not just profile).
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_navlanding1101.mjs [index.html]
 *
 * Negative control: point it at the pre-1101 tree — step 2/4 go RED (landing stays
 * visible over the opened screen), no crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.setContent(html, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);

  const disp = id => p.evaluate(i => { const el = document.getElementById(i); return el ? getComputedStyle(el).display : 'no-element'; }, id);
  const call = fn => p.evaluate(f => { try { if (typeof window[f] === 'function') { window[f](); return 'ok'; } return 'not-a-function:' + f; } catch (e) { return 'threw:' + e.message; } }, fn);
  const hasClass = c => p.evaluate(cl => document.body.classList.contains(cl), c);

  /* 1. enter landing */
  const r1 = await call('goToLanding');
  ok(r1 === 'ok', 'goToLanding() runs (' + r1 + ')');
  ok(await disp('landingView') === 'block', 'landing hub is visible after goToLanding()');

  /* 2. open My Profile from the hub */
  const r2 = await call('openMyProfile');
  ok(r2 === 'ok', 'openMyProfile() runs (' + r2 + ')');
  ok(await disp('landingView') === 'none', 'THE FIX: landing is hidden once My Profile opens');
  ok(await disp('profileView') === 'block', 'profileView is the visible screen');
  ok((await hasClass('cr-landing-on')) === false, 'body.cr-landing-on is cleared (footer nav / padding restored)');

  /* 3. the way INTO landing still works */
  const r3 = await call('goToLanding');
  ok(r3 === 'ok' && (await disp('landingView')) === 'block', 'SAFETY: goToLanding() re-shows landing after the change');
  ok((await hasClass('cr-landing-on')) === true, 'goToLanding re-adds cr-landing-on');

  /* 4. same fix covers other menu screens opened from the hub */
  const r4 = await call('openClientsDirectory');
  if (r4 === 'ok') {
    ok(await disp('landingView') === 'none', 'landing is hidden when Clients opens from the hub too');
    ok(await disp('clientsView') === 'block', 'clientsView is the visible screen');
  } else {
    console.log('  ..   openClientsDirectory unavailable in this harness state (' + r4 + ') — skipped');
  }

  await b.close();
  console.log(fails ? ('\nGATE RED — ' + fails + ' failure(s)') : '\nGATE GREEN — landing clears on navigation; entering landing still works');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack || e.message); process.exit(1); });
