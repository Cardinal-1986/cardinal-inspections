/* Functional gate for build 516 — the desktop left menu.
 *
 * This one loads the WHOLE REAL index.html in Chromium off file://, boots it,
 * and drives the actual sidebar. Not a slice, not a mock of the markup: the
 * real 3 MB document with all 103 script blocks running. Network is blocked at
 * the route level so nothing reaches Supabase or the CDN — which is also a fair
 * approximation of the app on a bad connection.
 *
 * It matters that this runs in a real engine: the sidebar is a layout change,
 * and jsdom resolves neither the media query that gates it nor the calc() that
 * sizes the content cap.
 */
const { chromium } = require('playwright');

const BASE = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/app/';
const FILE = process.argv[2] || (BASE + 'index_v507.html');

let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); } };
const eq = (n, got, want) => ok(n + '  [' + JSON.stringify(got) + ']', JSON.stringify(got) === JSON.stringify(want), { got, want });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  /* Let the local document through; block everything remote so the run is
     deterministic and nothing touches the real database. */
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file://')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));

  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  /* Put the DOM into the state the app itself puts it in when someone is signed
     in — the three signals showLogin()/the signed-in path actually set. Without
     this the page sits on the post-login landing, where the menu correctly
     refuses to mount. */
  async function signIn() {
    await page.evaluate(() => {
      document.querySelector('header.site').style.display = '';
      document.getElementById('landingView').style.display = 'none';
      document.getElementById('navWrap').style.display = 'inline-block';
      const lv = document.getElementById('loginView');
      if (lv) lv.classList.remove('open');
    });
    await page.waitForTimeout(900);
  }
  await signIn();

  console.log('== A. mounts on a desktop ==');

  const mounted = await page.evaluate(() => {
    const n = document.getElementById('cr-lnav');
    if (!n) return { mounted: false };
    const r = n.getBoundingClientRect();
    const head = document.querySelector('header.site').getBoundingClientRect();
    return {
      mounted: true,
      width: Math.round(r.width),
      left: Math.round(r.left),
      top: Math.round(r.top),
      headBottom: Math.round(head.bottom),
      bodyClass: document.body.classList.contains('cr-lnav-on'),
      padLeft: getComputedStyle(document.body).paddingLeft,
      z: getComputedStyle(n).zIndex,
      sections: [...n.querySelectorAll('.lnav-sec')].map((s) => s.textContent.replace(/[▼\s]+/g, ' ').trim()),
      items: [...n.querySelectorAll('.lnav-item')].map((i) => i.textContent.trim()),
      open: [...n.querySelectorAll('.lnav-sec')].filter((s) => s.getAttribute('aria-expanded') === 'true')
        .map((s) => s.getAttribute('data-sec')),
      crms: [...n.querySelectorAll('[data-crm]')].map((b) => b.textContent.trim()),
    };
  });

  ok('the sidebar mounted on a 1440px desktop', mounted.mounted, mounted);
  if (!mounted.mounted) { console.log('page errors:', errs.slice(0, 8)); process.exit(1); }
  eq('238 px wide, hard against the left edge', [mounted.width, mounted.left], [238, 0]);
  ok('it starts below the fixed header, measured not guessed  [top ' + mounted.top + ' vs header bottom ' + mounted.headBottom + ']',
    Math.abs(mounted.top - mounted.headBottom) <= 2, mounted);
  ok('it sits under the header in the stack, not over it  [z ' + mounted.z + ']', Number(mounted.z) < 90);
  eq('body gets the matching padding so nothing hides behind it', mounted.padLeft, '238px');
  eq('the three CRMs are mirrored from the banner', mounted.crms, ['Retail', 'Insurance', 'Community']);

  console.log('\n  sections found: ' + JSON.stringify(mounted.sections));
  console.log('  items found:    ' + mounted.items.length);

  console.log('\n== B. it mirrors the LIVE menu, not a hardcoded copy ==');

  const live = await page.evaluate(() => {
    const m = document.getElementById('navMenu');
    const secs = [...m.querySelectorAll('.navsec')].filter((s) => s.style.display !== 'none')
      .map((s) => s.textContent.trim());
    const opts = [...m.querySelectorAll('.navopt')].filter((o) => o.style.display !== 'none' && o.id !== 'signOutBtn')
      .map((o) => o.textContent.trim()).filter(Boolean);
    return { secs, opts };
  });
  console.log('  live #navMenu sections: ' + JSON.stringify(live.secs));

  ok('picked up the RUNTIME rename Insurance → CRMs', mounted.sections.some((s) => /CRMs/.test(s)), mounted.sections);
  ok('picked up the RUNTIME rename Office → Resources', mounted.sections.some((s) => /Resources/.test(s)), mounted.sections);
  ok('no section still called "Insurance" or "Office"',
    !mounted.sections.some((s) => /^(Insurance|Office)\b/.test(s)), mounted.sections);
  eq('every visible item in the live menu is in the sidebar',
    live.opts.filter((o) => !mounted.items.includes(o)), []);
  eq('and the sidebar invents nothing that is not in the live menu',
    mounted.items.filter((i) => !live.opts.includes(i)), []);
  ok('runtime-injected items came through (Community Hub / Self Check / Sales Floor …)',
    mounted.items.some((i) => /Community Hub/.test(i)) || mounted.items.some((i) => /Self Check/.test(i)), mounted.items);
  ok('the hidden item "Recents" was NOT mirrored', !mounted.items.some((i) => /Recents/.test(i)), mounted.items);
  ok('the palette hint and Sign out are not mirrored as menu rows',
    !mounted.items.some((i) => /Quick jump|Sign out/i.test(i)), mounted.items);

  console.log('\n== C. collapsible, and it remembers ==');

  eq('Daily and Sell start open; the rest fold', mounted.open.sort(), ['daily', 'sell']);
  ok('items appended past the last heading land in "More", not dropped  [' +
    mounted.sections.filter((s) => /^More/.test(s)) + ']',
    mounted.sections.some((s) => /^More/.test(s)), mounted.sections);

  const collapsed = await page.evaluate(() => {
    const sec = document.querySelector('#cr-lnav .lnav-sec[data-sec="daily"]');
    sec.click();
    const body = document.getElementById(sec.getAttribute('aria-controls'));
    return {
      expanded: sec.getAttribute('aria-expanded'),
      hidden: body.hidden,
      display: getComputedStyle(body).display,
      stored: JSON.parse(localStorage.getItem('cardinal.lnav.sections') || '{}'),
    };
  });
  eq('clicking a heading collapses it', [collapsed.expanded, collapsed.hidden, collapsed.display],
    ['false', true, 'none']);
  eq('and the choice is written down', collapsed.stored.daily, 0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await signIn();
  const remembered = await page.evaluate(() => {
    const sec = document.querySelector('#cr-lnav .lnav-sec[data-sec="daily"]');
    const sell = document.querySelector('#cr-lnav .lnav-sec[data-sec="sell"]');
    return { daily: sec && sec.getAttribute('aria-expanded'), sell: sell && sell.getAttribute('aria-expanded') };
  });
  eq('after a reload it is still collapsed, and Sell is still open',
    [remembered.daily, remembered.sell], ['false', 'true']);

  console.log('\n== D. one dispatcher — the row clicks the REAL menu button ==');

  const clicked = await page.evaluate(() => {
    /* instrument the real .navopt, then click the MIRROR and see if the real
       one fired. If the sidebar ever grows its own routing this fails. */
    const real = [...document.querySelectorAll('#navMenu .navopt')]
      .find((o) => /Clients/.test(o.textContent) && o.style.display !== 'none');
    let fired = 0;
    real.addEventListener('click', () => { fired++; }, true);
    const mirror = [...document.querySelectorAll('#cr-lnav .lnav-item')]
      .find((i) => i.textContent.trim() === real.textContent.trim());
    if (!mirror) return { err: 'no mirror row for ' + real.textContent.trim() };
    /* the section it lives in may be collapsed — click it directly, the app
       does not require visibility to dispatch */
    mirror.click();
    return { fired, label: real.textContent.trim() };
  });
  eq('clicking the sidebar row fires the real .navopt  [' + clicked.label + ']', clicked.fired, 1);

  const crmClick = await page.evaluate(() => {
    const real = document.querySelector('#cbCrm [data-crm-go="community"]');
    let fired = 0;
    real.addEventListener('click', () => { fired++; }, true);
    document.querySelector('#cr-lnav [data-crm="community"]').click();
    return fired;
  });
  eq('and the CRM button fires the banner\'s own control', crmClick, 1);

  console.log('\n== E. the content cap ==');

  /* Two wrong assertions on this one test, both mine. [0] is #bannerMount, which
     carries a deliberate ID override; and five views already set their OWN width
     (Settings 640, Communications 900, Audit 980, Activity 1500, Schedule Board
     1700) with selectors that rightly out-specify a plain class rule — squeezing
     a 1700px calendar to 1180 would be a regression dressed as a fix.

     So the property worth asserting is not "everything is 1180". It is that
     NOTHING is left unbounded: every .wrap now has either the app's own
     deliberate width or the new cap, and `none` — the thing that made the page
     stretch — is gone. */
  const cap = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.wrap:not(.masthead)')];
    const val = (e) => getComputedStyle(e).maxWidth;
    const OWN = ['640px', '900px', '980px', '1500px', '1700px'];
    return {
      total: all.length,
      unbounded: all.filter((e) => val(e) === 'none').map((e) => e.id || 'wrap'),
      /* 518 made the cap proportional — min(2400px, 92%) — so it resolves to a
         different pixel value at every viewport. Asserting a literal would tie
         the test to one screen size, which is the mistake the cap itself was
         fixing. Count the ones the cap governs by elimination instead. */
      atCap: all.filter((e) => !['none', '100%'].includes(val(e)) && !OWN.includes(val(e))).length,
      ownWidth: all.filter((e) => OWN.includes(val(e)))
        .map((e) => (e.parentElement && e.parentElement.id) + ':' + val(e)),
      mastMax: (() => { const m = document.querySelector('.wrap.masthead'); return m ? val(m) : null; })(),
    };
  });
  eq('NOTHING is left unbounded — max-width:none is gone from every .wrap', cap.unbounded, []);
  ok('the new cap covers the bulk of them  [' + cap.atCap + ' of ' + cap.total + ']',
    cap.atCap >= 15, cap);
  ok('views with their own deliberate width keep it, uncrushed  [' + cap.ownWidth.join(', ') + ']',
    cap.ownWidth.length === 5 &&
    cap.ownWidth.some((x) => /boardView:1700px/.test(x)) &&
    cap.ownWidth.some((x) => /settingsView:640px/.test(x)), cap);
  ok('the masthead inside the fixed header is NOT capped  [' + cap.mastMax + ']',
    cap.mastMax === 'none' || cap.mastMax === '100%', cap);

  console.log('\n== F. phones and the signed-out screen are untouched ==');

  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(700);
  const narrow = await page.evaluate(() => ({
    node: !!document.getElementById('cr-lnav'),
    cls: document.body.classList.contains('cr-lnav-on'),
    pad: getComputedStyle(document.body).paddingLeft,
    caps: [...document.querySelectorAll('.wrap:not(.masthead)')]
      .filter((e) => !['none', '100%', '640px', '900px', '980px', '1500px', '1700px']
        .includes(getComputedStyle(e).maxWidth)).length,
  }));
  eq('below 1100px the sidebar is gone and the body padding with it',
    [narrow.node, narrow.cls, narrow.pad], [false, false, '0px']);
  eq('...and the added cap lifts, so phone layout is exactly as before',
    narrow.caps, 0);
  /* the proportions Theo photographed: a fixed cap left a narrow island on an
     ultrawide. Check the real ratio at his width, not a pixel count. */
  await page.setViewportSize({ width: 3440, height: 1000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const m = document.getElementById('mainView'); if (m) m.style.display = 'block'; });
  await page.waitForTimeout(700);
  const wide = await page.evaluate(() => {
    const nav = document.getElementById('cr-lnav');
    if (!nav) return { err: 'no sidebar at 3440' };
    const navW = nav.getBoundingClientRect().width;
    const el = [...document.querySelectorAll('.wrap:not(.masthead)')]
      .find((e) => e.offsetParent !== null && e.id !== 'bannerMount' && e.getBoundingClientRect().width > 200);
    if (!el) return { err: 'no visible content wrap' };
    const r = el.getBoundingClientRect();
    return { content: Math.round(r.width), gutter: Math.round(r.left - navW) };
  });
  ok('on a 3440 ultrawide the content uses the screen  [' + JSON.stringify(wide) + ']',
    !wide.err && wide.content >= 2200 && wide.gutter < 550, wide);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(700);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(900);
  const back = await page.evaluate(() => !!document.getElementById('cr-lnav'));
  ok('widening brings it back', back);

  const signedOut = await page.evaluate(() => {
    document.querySelector('header.site').style.display = 'none';
    return new Promise((r) => setTimeout(() => r({
      node: !!document.getElementById('cr-lnav'),
      cls: document.body.classList.contains('cr-lnav-on'),
    }), 900));
  });
  eq('with the header hidden (signed out) it removes itself',
    [signedOut.node, signedOut.cls], [false, false]);

  /* The screenshot caught this and the earlier assertions did not: on the
     post-login LANDING the header is still there, so a header-only test let the
     menu mount behind #landingView. */
  const landing = await page.evaluate(() => {
    document.querySelector('header.site').style.display = '';
    document.getElementById('navWrap').style.display = 'inline-block';
    document.getElementById('landingView').style.display = 'block';
    return new Promise((r) => setTimeout(() => r({
      node: !!document.getElementById('cr-lnav'),
      cls: document.body.classList.contains('cr-lnav-on'),
    }), 900));
  });
  eq('and it stays off the post-login landing screen too',
    [landing.node, landing.cls], [false, false]);

  const signedOutNav = await page.evaluate(() => {
    document.getElementById('landingView').style.display = 'none';
    document.getElementById('navWrap').style.display = 'none';
    return new Promise((r) => setTimeout(() => r(!!document.getElementById('cr-lnav')), 900));
  });
  eq('and off the login screen, keyed on the app\'s own navWrap flag', signedOutNav, false);

  console.log('\n== G. no damage ==');
  const real = errs.filter((e) => !/Failed to fetch|NetworkError|ERR_FAILED|Load failed|fetch/i.test(e));
  eq('no page errors beyond the blocked network', real.slice(0, 6), []);
  if (errs.length) console.log('  (blocked-network noise suppressed: ' + errs.length + ' entries)');

  try{ await page.screenshot({ path: BASE + '../lnav_desktop.png', timeout: 8000 }); }
  catch(_){ console.log('  (screenshot skipped — webfonts never resolve with the network blocked)'); }
  await browser.close();

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
