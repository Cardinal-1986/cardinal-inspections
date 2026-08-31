/* gate_ready.mjs — wait for the app to BE ready, instead of guessing how long
 * it takes. Shared by the Chromium gates.
 *
 * WHY THIS EXISTS. Measured across the gate suite: **933 `waitForTimeout` calls
 * totalling 1,111,716 ms — 18.5 minutes of pure sleeping** — against 61
 * `waitForFunction` and zero `waitForSelector`. Every one of those sleeps is a
 * guess, and a guess fails in both directions:
 *
 *   too short on a loaded machine -> the gate reads a half-booted app and goes
 *     red on correct code, or worse, reads an empty DOM and passes VACUOUSLY
 *   too long on an idle one -> wall-clock nobody gets back
 *
 * Measured on the shipped tree: the app is fully booted at **555 ms** (pipecards
 * 84ms, main view 226ms, supabase 277ms, FrontDoor 474ms, DOM/header/crm stamp
 * 555ms). The gates were sleeping 3500 ms. Six times too long AND still unsafe.
 *
 * ⚠ AND PLAYWRIGHT'S AUTO-WAITING DOES NOT COVER IT. Auto-waiting applies to
 * `locator()` actions and `waitForSelector`. These gates use neither — they
 * sleep, then `page.evaluate`. So determinism has to be asserted here,
 * explicitly, rather than inherited from the library.
 *
 * THE RULE THAT MAKES THIS SAFE, and it is the whole point:
 * a readiness wait that gives up quietly is worse than a sleep, because the
 * gate then runs against a half-built page and reports a number nobody
 * distrusts. **These helpers THROW on timeout, naming the signals that never
 * came true.**
 *
 * ⚠ AND A THROWING HELPER PUTS THE BURDEN ON THE PREDICATE. The first attempt
 * at this killed `gate_1176` outright: the post-navigation wait asserted "the
 * home board rendered" (>=3 `.pipecard`), which is simply not true on every
 * gate's flow. The helper behaved correctly and the predicate was wrong — but
 * the gate died instead of reporting, which is BUG_CLASSES 37. Hence
 * `waitForSoft()` below: for "has the render settled" waits, where being wrong
 * about the predicate must not be fatal.
 */

/** Signals that the app has finished booting far enough to be inspected.
 *  Each is cheap, synchronous, and independently meaningful — if one never
 *  goes true the thrown error names it, which is the diagnosis. */
export const READY_SIGNALS = {
  /* ⚠ NO `document.readyState === 'complete'` HERE, AND THAT IS DELIBERATE.
     It was the first signal I reached for and it broke five of six gates, each
     hanging the full 30s and then throwing `domComplete=false`. The cause is
     the harness, not the app: these gates abort images, fonts and stylesheets
     in their route handler, so the window `load` event never fires and
     readyState never leaves 'interactive'. gate_1183 passed only because it
     serves images. A readiness signal must measure THE APP, never the test
     rig's own route policy — otherwise it reports on itself.
     (The failure was cheap to find only because the error names the stuck
     signal; a bare "timeout" would have cost a round of guessing.) */
  frontDoor:   () => !!(window.CardinalFrontDoor && window.CardinalFrontDoor.open),
  header:      () => !!document.getElementById('cr-hd2-bar'),
  crmStamp:    () => !!(document.body && document.body.dataset && document.body.dataset.crm),
};

async function pollUntil(page, srcMap, timeout) {
  await page.waitForFunction(defs => {
    for (const k in defs) {
      let fn;
      try { fn = eval('(' + defs[k] + ')'); } catch (_) { return false; }
      try { if (!fn()) return false; } catch (_) { return false; }
    }
    return true;
  }, srcMap, { timeout, polling: 50 });
}

/**
 * Wait until every named signal is true. THROWS if the deadline passes, naming
 * exactly which signals are still false — a bare "timeout" costs a round of
 * guessing.
 *
 * Boot readiness is the one place a throw is right: if the app never booted,
 * every assertion afterwards is meaningless and a red gate is the honest result.
 *
 * @param opts.timeout ms (default 30000 — generous on purpose. This is a
 *        CORRECTNESS bound, not a performance one: a fast machine leaves in
 *        ~0.6s, a loaded one is allowed to take its time instead of flaking.)
 */
export async function waitAppReady(page, opts = {}) {
  const need = opts.need || Object.keys(READY_SIGNALS);
  const timeout = opts.timeout || 30000;
  const src = {};
  for (const k of need) {
    if (!READY_SIGNALS[k]) throw new Error(`waitAppReady: no such signal "${k}"`);
    src[k] = READY_SIGNALS[k].toString();
  }
  const t0 = Date.now();
  try {
    await pollUntil(page, src, timeout);
  } catch (_) {
    const state = await page.evaluate(defs => {
      const out = {};
      for (const k in defs) {
        try { out[k] = !!eval('(' + defs[k] + ')')(); } catch (e) { out[k] = 'threw: ' + e.message; }
      }
      return out;
    }, src).catch(() => ({}));
    const stuck = Object.entries(state).filter(([, v]) => v !== true)
                        .map(([k, v]) => `${k}=${v}`).join(', ');
    throw new Error(`waitAppReady: app never became ready in ${timeout}ms — ` +
                    `still false: ${stuck || '(could not read state)'}`);
  }
  return Date.now() - t0;
}

/**
 * Wait for a caller-supplied predicate. THROWS if it never holds. Use where the
 * predicate is genuinely required for the assertions that follow.
 */
export async function waitFor(page, label, predicate, opts = {}) {
  const timeout = opts.timeout || 15000;
  const t0 = Date.now();
  try {
    await page.waitForFunction(predicate, opts.arg, { timeout, polling: 50 });
  } catch (_) {
    throw new Error(`waitFor("${label}") never became true in ${timeout}ms`);
  }
  return Date.now() - t0;
}

/**
 * Like waitFor, but returns false instead of throwing when the predicate never
 * holds — for "wait until the render settled" waits that REPLACE a fixed sleep.
 *
 * ⚠ This exists because of a real failure, not for tidiness. Converting the
 * gates' post-navigation sleep into a throwing `waitFor` on ">=3 pipecards"
 * killed gate_1176, whose flow does not land on the home board. Replacing a
 * sleep must never be able to make a gate CRASH where it used to report — a
 * crash reads as "not green" rather than "proved nothing" (BUG_CLASSES 37).
 * Worst case here degrades to exactly the old behaviour: a bounded wait.
 */
export async function waitForSoft(page, predicate, opts = {}) {
  const timeout = opts.timeout || 4000;
  try {
    await page.waitForFunction(predicate, opts.arg, { timeout, polling: 50 });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * The one honest fixed wait: a paint/animation settle where there is no
 * predicate to test because the thing being waited for is a CSS transition
 * finishing. Keep it small and rare — if you can name a condition, use waitFor.
 */
export const settle = (page, ms = 250) => page.waitForTimeout(ms);

/** Self-test: prove the helpers FAIL when they should, not just pass.
 *  A readiness helper only ever seen to pass proves nothing.
 *  Run: node gate_ready.mjs --selftest */
if (process.argv[2] === '--selftest') {
  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await b.newContext()).newPage();
  let pass = 0, fail = 0;
  const ok = (c, m) => { c ? (pass++, console.log('  ok   ' + m)) : (fail++, console.log('  FAIL ' + m)); };

  await page.setContent('<!doctype html><title>empty</title><body></body>');
  let err = null;
  try { await waitAppReady(page, { timeout: 1200 }); } catch (e) { err = e; }
  ok(!!err, 'a never-ready page throws instead of continuing');
  ok(err && /frontDoor/.test(err.message),
     'and the error NAMES the missing signal: ' + (err ? err.message.slice(0, 80) : '—'));

  await page.setContent('<!doctype html><title>t</title><body><div id="cr-hd2-bar"></div></body>');
  await page.evaluate(() => { window.CardinalFrontDoor = { open() {} }; document.body.dataset.crm = 'retail'; });
  let took = null;
  try { took = await waitAppReady(page, { timeout: 5000 }); } catch (e) { took = null; }
  ok(took !== null, `a ready page passes (in ${took}ms)`);
  ok(took !== null && took < 1000, 'and returns promptly rather than sleeping out a fixed budget');

  err = null;
  try { await waitFor(page, 'never true', () => window.__nope === 42, { timeout: 800 }); }
  catch (e) { err = e; }
  ok(!!err && /never became true/.test(err.message), 'waitFor throws on a condition that never holds');

  await page.evaluate(() => { setTimeout(() => { window.__yes = 1; }, 200); });
  let ok4 = true;
  try { await waitFor(page, 'becomes true', () => window.__yes === 1, { timeout: 4000 }); }
  catch (e) { ok4 = false; }
  ok(ok4, 'waitFor passes once the condition holds');

  /* the regression that killed gate_1176 — a soft wait must DEGRADE, not die */
  let threw = false, ret = null;
  try { ret = await waitForSoft(page, () => window.__never_ever === 7, { timeout: 500 }); }
  catch (_) { threw = true; }
  ok(!threw, 'waitForSoft does NOT throw when its predicate never holds');
  ok(ret === false, 'and it reports false so the caller can carry on — the gate_1176 fix');
  ok(await waitForSoft(page, () => window.__yes === 1, { timeout: 1000 }) === true,
     'waitForSoft returns true when the predicate does hold');

  await b.close();
  console.log('SELFTEST ' + (fail ? 'FAIL' : 'PASS') + ` (${pass}/${pass + fail})`);
  process.exit(fail ? 1 : 0);
}
