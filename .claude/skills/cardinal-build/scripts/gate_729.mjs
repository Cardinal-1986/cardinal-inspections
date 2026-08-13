/* gate_729.mjs — the boot splash covers the half-painted window and always lifts.
   Two halves, because neither alone is worth much:

   A. REAL BYTES, THROTTLED. The document is brotli-compressed and served from a
      local http server with Content-Encoding: br, then Chromium is throttled
      through CDP to a weak signal. This is the only way to observe the window
      the splash exists for — with the file on disk it is over in one frame.
      Asserts what is UNDER THE THUMB at 2s, not what the DOM says.

   B. MOCKED BOOT. Every path out of boot must remove it: signed in (showMain),
      signed out (showLogin), and boot throwing (the IIFE's own catch). Plus the
      backstop timer, and that nothing of it is left behind afterwards.

   Usage: node gate_729.mjs [path/to/index.html]      (v728 is the negative control)
   Against v728 the six splash assertions go RED — it has been seen to fail. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';
import { brotliCompressSync, constants as ZC } from 'zlib';
import http from 'http';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d || '' });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/* ══════════════════════════════════════════════════════════════════════════
   A. the real document, brotli, on a weak signal
   ══════════════════════════════════════════════════════════════════════════ */
const BR = brotliCompressSync(Buffer.from(APP_HTML, 'utf8'), {
  params: { [ZC.BROTLI_PARAM_QUALITY]: 11, [ZC.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(APP_HTML) }
});
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'br', 'Content-Length': BR.length });
  res.end(BR);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
console.log(`  serving ${BR.length.toLocaleString()} brotli bytes on :${PORT}`);

{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await ctx.newPage();
  /* only the document may come off the wire; everything else would just add
     latency we are not measuring here */
  await page.route('**/*', r => (r.request().url() === `http://127.0.0.1:${PORT}/` ? r.continue() : r.abort()));
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  /* the paint observer has to be installed BEFORE navigation — evaluating after
     an un-awaited goto() races the execution context and reports nothing */
  await page.addInitScript(() => {
    window.__FP__ = null;
    try {
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) if ((e.name === 'first-paint' || e.name === 'first-contentful-paint') && !window.__FP__)
          window.__FP__ = { at: Math.round(e.startTime), name: e.name, splash: !!document.getElementById('crSplash') };
      }).observe({ type: 'paint', buffered: true });
    } catch (e) {}
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8
  });

  page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' }).catch(() => {});

  /* 1.5s in: on this link the document is nowhere near down. What is under the
     thumb? Everything is read in ONE evaluate — the app's own boot removes the
     splash around 2.1s here (the parser reaches the boot IIFE at 42% of the
     file), so two evaluates in sequence race it and the second reads null. */
  await page.waitForTimeout(1500);
  const at2s = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const sp = document.getElementById('crSplash');
    let ring = null;
    if (sp) { const r = sp.querySelector('.crsp-ring'); if (r) { const c = getComputedStyle(r); ring = c.animationName + ' ' + c.borderTopColor; } }
    return { fp: window.__FP__, readyState: document.readyState,
             hit: el ? (el.id || el.className || el.tagName) : null,
             inSplash: !!(sp && el && sp.contains(el)), ring,
             text: sp ? sp.innerText.replace(/\s+/g, ' ').trim() : null,
             ground: sp ? getComputedStyle(sp).backgroundColor : null,
             covers: sp ? (sp.getBoundingClientRect().width >= innerWidth && sp.getBoundingClientRect().height >= innerHeight) : false,
             fakePct: sp ? /%|\d+\s*\/\s*\d+/.test(sp.innerText) : null,
             fakeBar: sp ? !!sp.querySelector('progress,[role=progressbar]') : null };
  });
  const fp = at2s.fp || {};
  chk('the splash is on screen by FIRST PAINT', fp.splash === true, fp.name + ' @' + fp.at + 'ms, splash=' + fp.splash);
  chk('at 1.5s the document is STILL LOADING (the window is real)', at2s.readyState !== 'complete', 'readyState=' + at2s.readyState);
  chk('at 1.5s the centre of the screen IS the splash', at2s.inSplash === true, 'hit=' + at2s.hit);
  chk('at 1.5s it fills the viewport', at2s.covers === true, JSON.stringify(at2s.covers));
  chk('at 1.5s it says what it is doing', /loading/i.test(at2s.text || '') && /cardinal/i.test(at2s.text || ''), at2s.text);
  chk('the ring is actually spinning (not a frozen mark)', /crspspin/.test(at2s.ring || ''), at2s.ring);
  chk('its ground is the document ground #09090C', at2s.ground === 'rgb(9, 9, 12)', at2s.ground);
  chk('it does NOT show a progress number we cannot measure',
      at2s.fakePct === false && at2s.fakeBar === false, 'pct=' + at2s.fakePct + ' bar=' + at2s.fakeBar);

  /* CDP, not page.screenshot() — playwright's waits for fonts, and fonts are
     exactly what has not arrived yet on a throttled link */
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const { writeFileSync } = await import('fs');
    writeFileSync('/tmp/claude-0/-home-user-cardinal-inspections/f3a6e9a6-4280-517c-92b7-d56b9e8a504e/scratchpad/splash_15s.png', Buffer.from(data, 'base64'));
    console.log('  1.5s screenshot: saved');
  } catch (e) { console.log('  1.5s screenshot: ' + e); }
  await ctx.close();
}
server.close();

/* ══════════════════════════════════════════════════════════════════════════
   B. every way out of boot
   ══════════════════════════════════════════════════════════════════════════ */
const now = new Date().toISOString();
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Lead', sales_rep: 'theo@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: {} }), created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  collections: [], commissions: [], draws: [], punch_items: [], inspection_reports: [],
  estimates: [], contracts: [], crew_work_orders: [], appointments: []
};

async function boot(opts) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (u.includes('@supabase/supabase-js')) {
      if (opts.noSupabase) return r.abort();               /* the CDN never arrives */
      return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    }
    if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  if (!opts.noSupabase) await page.addInitScript(MOCK);
  if (opts.signedOut) await page.addInitScript(() => { window.__NO_SESSION__ = true; });
  if (opts.hangAuth) await page.addInitScript(() => { window.__HANG_AUTH__ = true; });
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  return { ctx, page };
}
const gone = p => p.evaluate(() => ({
  el: !!document.getElementById('crSplash'),
  overflow: document.body.style.overflow,
  hit: (function () { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? (e.id || e.className || e.tagName) : null; })()
}));

/* B1 — signed in: showMain() */
{
  const { ctx, page } = await boot({});
  await page.waitForTimeout(4000);
  const g = await gone(page);
  chk('signed-in boot REMOVES the splash from the DOM', g.el === false, JSON.stringify(g));
  chk('signed-in boot leaves nothing over the page', g.hit !== 'crSplash', 'hit=' + g.hit);
  chk('the splash never touched the global scroll lock', g.overflow === '' || g.overflow === undefined, 'body.style.overflow=' + JSON.stringify(g.overflow));
  await ctx.close();
}

/* B2 — signed out: showLogin() */
{
  const { ctx, page } = await boot({ signedOut: true });
  await page.waitForTimeout(4000);
  const g = await gone(page);
  const login = await page.evaluate(() => { const l = document.getElementById('loginView'); return !!(l && (l.classList.contains('open') || getComputedStyle(l).display !== 'none')); });
  chk('signed-out boot reaches the sign-in card', login === true, 'loginView open=' + login);
  chk('signed-out boot REMOVES the splash', g.el === false, JSON.stringify(g));
  await ctx.close();
}

/* B3 — the supabase CDN never arrives, so the boot IIFE throws. Its own catch
   calls showLogin(), which must lift the splash rather than leave the user
   staring at a spinner for the full backstop. */
{
  const { ctx, page } = await boot({ noSupabase: true });
  await page.waitForTimeout(4000);                                  /* well inside the 8s cap */
  const g = await gone(page);
  chk('a THROWN boot (dead CDN) still lifts the splash, long before the backstop', g.el === false, JSON.stringify(g));
  await ctx.close();
}

/* B4 — the one outcome that reaches neither showMain nor showLogin: getSession
   never settles. Now the backstop timer is the only thing left. */
{
  const { ctx, page } = await boot({ hangAuth: true });
  await page.waitForTimeout(4000);
  const early = await page.evaluate(() => !!document.getElementById('crSplash'));
  chk('a WEDGED boot keeps the splash up at 4s (it did not bail early)', early === true, 'present=' + early);
  await page.waitForTimeout(6000);                                  /* past the 8s cap */
  const late = await gone(page);
  chk('the BACKSTOP lifts it even when boot never finishes', late.el === false, JSON.stringify(late));
  chk('and leaves nothing over the page', late.hit !== 'crSplash', 'hit=' + late.hit);
  await ctx.close();
}

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
