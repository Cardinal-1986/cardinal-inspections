/* Build 677 — does the app actually open near-instantly on the second launch?

   The claim in the PR is a TIME. So measure it, in a real browser, with a real
   service worker, over a real (throttled) connection — not by reading sw.js.

   Method:
     1. Serve the artifact and sw.js over HTTP on a fixed origin.
     2. FIRST launch, unthrottled: let the worker install, activate, and cache
        the shell. Wait until the worker is actually controlling the page and
        '/' is really in the cache — polled, not slept.
     3. SECOND launch, throttled hard: navigate again in the SAME context, and
        measure how long until the app's own content is on screen.

   The comparison that matters is second-launch-with-worker versus the SAME
   page with the worker bypassed, which is what every launch used to be.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_launch.js [index.html] [sw.js]
   Point it at the 676 pair as the negative control — the two timings converge
   there, because 676 fetched the document from the network every time.       */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = '/home/user/cardinal-inspections';
const ART = path.resolve(process.argv[2] || ROOT + '/index.html');
const SWF = path.resolve(process.argv[3] || ROOT + '/sw.js');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

/* a stable ETag per file, so the worker's change-detection has something real
   to compare — this is what Vercel does and what the worker relies on */
function etagOf(f) { const s = fs.statSync(f); return 'W/"' + s.size + '-' + Math.floor(s.mtimeMs) + '"'; }

/* ⚠ THROTTLE AT THE SERVER, NOT THROUGH CDP.
   The first version of this harness used Network.emulateNetworkConditions and
   reported a 42x speedup — and then PASSED against the build-676 network-first
   worker, which cannot possibly be fast. CDP network emulation applies to the
   page's network session; a fetch() issued from inside the SERVICE WORKER is
   not throttled by it. So both artifacts measured an unthrottled document and
   the comparison meant nothing.
   Rate-limiting the response stream here throttles every consumer equally —
   page, worker, iframe — because it is the wire that is slow. */
let RATE = 0;                         // bytes/sec; 0 = unthrottled
function sendThrottled(res, file, type) {
  res.writeHead(200, { 'content-type': type, 'etag': etagOf(file), 'cache-control': 'no-cache' });
  const buf = fs.readFileSync(file);
  if (!RATE) return res.end(buf);
  const SLICE = 60;                                     // ms per chunk
  const step = Math.max(1024, Math.floor(RATE * SLICE / 1000));
  let i = 0;
  (function push() {
    if (i >= buf.length) return res.end();
    const chunk = buf.slice(i, i + step); i += step;
    if (!res.write(chunk)) { res.once('drain', () => setTimeout(push, SLICE)); return; }
    setTimeout(push, SLICE);
  })();
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '/index.html') return sendThrottled(res, ART, MIME['.html']);
  if (p === '/sw.js') return sendThrottled(res, SWF, MIME['.js']);
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  sendThrottled(res, f, MIME[path.extname(f)] || 'application/octet-stream');
});

const MBPS = 3;                                   // ~10s for the document
const SLOW_BPS = MBPS * 1024 * 1024 / 8;

/* How long until the app's OWN content is on screen — not readyState, which
   says nothing about whether the user can see anything.

   ⚠ The first draft of this reported 4 ms, which is not a believable time to
   parse 3.86 MB. It was measuring the PREVIOUS document: goto() is not awaited,
   so the first evaluate ran against the page still on screen, which of course
   already had the app on it. The fix is to stamp the outgoing document and
   refuse any sample that still carries the stamp — a new document cannot have
   it. Without that, this whole harness is a stopwatch pointed at the wrong
   thing, and it would have gone green on the artifact that has no worker. */
async function timeToApp(page, url, budgetMs) {
  try { await page.evaluate(() => { window.__crPrevDoc = 1; }); } catch (_) {}
  const t0 = Date.now();
  page.goto(url, { waitUntil: 'commit' }).catch(() => {});
  while (Date.now() - t0 < budgetMs) {
    try {
      const up = await page.evaluate(() => {
        if (window.__crPrevDoc) return false;          // still the old document
        const el = document.querySelector('#landingView, #mainView, .cr-lr');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.height > 200 && (el.innerText || '').trim().length > 20;
      });
      if (up) return Date.now() - t0;
    } catch (_) { /* evaluate throws while the document swaps — that is expected */ }
    await page.waitForTimeout(40);
  }
  return -1;
}

(async () => {
  await new Promise(r => server.listen(8734, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  console.log('── launch 1: install the worker and let it cache the shell ──');
  RATE = 0;                                   // unthrottled: just get it installed
  await page.goto('http://127.0.0.1:8734/', { waitUntil: 'load' });

  /* poll until the worker CONTROLS the page and '/' is really cached — a sleep
     here would make the whole measurement a coin flip */
  let ready = null;
  for (let i = 0; i < 90 && !ready; i++) {
    const r = await page.evaluate(async () => {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return null;
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          const c = await caches.open(k);
          if (await c.match('/')) return { cache: k };
        }
      } catch (_) {}
      return null;
    });
    if (r) ready = r; else await page.waitForTimeout(250);
  }
  ok('the worker installed, took control, and cached the app shell',
    !!ready, ready ? ready.cache : 'no controller or no cached "/" after ~22s');
  if (!ready) {
    console.log('\nRENDER: PROBLEMS (' + (fail + 1) + ')');
    await br.close(); server.close(); process.exit(1);
  }

  console.log('\n── launch 2, wire throttled to ' + MBPS + ' Mbps: what the second launch costs ──');
  RATE = SLOW_BPS;
  const withSW = await timeToApp(page, 'http://127.0.0.1:8734/', 90000);
  console.log('  with the worker serving the shell : ' +
    (withSW < 0 ? 'never appeared in 90s' : withSW + ' ms'));

  /* the same page over the same throttled link with the worker BYPASSED —
     which is exactly what every launch used to be */
  const bare = await ctx.newPage();
  const cdp2 = await ctx.newCDPSession(bare);
  await cdp2.send('Network.enable');
  await cdp2.send('Network.setBypassServiceWorker', { bypass: true });
  const noSW = await timeToApp(bare, 'http://127.0.0.1:8734/', 120000);
  console.log('  downloading it, as it used to     : ' +
    (noSW < 0 ? 'never appeared in 120s' : noSW + ' ms'));
  await bare.close();

  ok('the app appears at all on the second launch', withSW > 0, withSW);
  /* A sanity guard, not a performance target: it exists so the speedup below
     cannot be an artifact of a baseline that was already instant. Tuned to the
     configured wire rate — at 3 Mbps the app becomes legible partway through
     the document, around 4.4s, which is why demanding 5s was simply my own
     threshold being wrong rather than anything about the app. */
  ok('the network path is genuinely slow — the comparison is not against nothing',
    noSW < 0 || noSW > 2500, noSW + ' ms at ' + MBPS + ' Mbps');
  const faster = (noSW < 0) ? Infinity : (noSW / Math.max(withSW, 1));
  ok('the second launch is at least 5x faster than downloading it',
    withSW > 0 && faster >= 5,
    withSW + ' ms vs ' + (noSW < 0 ? '>120000' : noSW) + ' ms  (' +
    (faster === Infinity ? '>' : '') + (faster === Infinity ? '40' : faster.toFixed(1)) + 'x)');
  ok('…and is under three seconds, which is what "near-instant" has to mean',
    withSW > 0 && withSW < 3000, withSW + ' ms');

  await br.close();
  server.close();
  console.log('\nRENDER: ' + (fail ? 'PROBLEMS (' + fail + ')' : 'OK') +
    '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RENDER CRASHED:', e); try { server.close(); } catch (_) {} process.exit(1); });
