/* gate_751.mjs — tapping a photo opens the photo, not the client.

   Driven at 390px with touch, against the app's own Photo Activity grid and the
   viewer that already shipped (cr-ri-script). What this has to prove:

     1. A tap OPENS THE VIEWER and does NOT navigate. The bug was that it went
        straight to the client profile, so "did we navigate?" is the assertion
        that actually encodes Theo's complaint.
     2. Both routes out work: Back closes, "Open client" closes AND navigates.
     3. ⚠️ THE OVERLAY IS A SINGLETON. Open with an action, close, then open
        WITHOUT one — the button must be gone. Otherwise a Resource Library
        image inherits a stale "Open client" pointing at the wrong client. This
        is the check most likely to catch a future regression.
     4. Tapping the photo itself still closes (nine older callers rely on the
        backdrop-closes behaviour), and the action bar does NOT close-by-bubble.
     5. Touch targets on the viewer are >= 44px, measured as rendered rects.

   Usage: node gate_751.mjs [path/to/index.html]     (v750 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
await page.addInitScript(() => {
  window.__SEED__ = { team_profiles: [], projects: [], inspection_reports: [], estimates: [], contracts: [] };
});
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* a 1x1 png so the <img> genuinely decodes */
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const r = await (async () => { try { return await page.evaluate(async PX => {
  const out = {};
  out.viewerExists = !!(window.CardinalResourceImages && window.CardinalResourceImages.open);

  /* Build the real grid markup the renderer produces, then let the app's OWN
     delegated listener handle the tap -- no re-implementation. */
  const grid = document.getElementById('phGrid');
  if (!grid) return { noGrid: true };
  grid.innerHTML = '<div class="phcells">' +
    '<div class="phc" data-pid="p1"><img src="' + PX + '" alt=""><span class="phn">Betty Mann</span></div>' +
    '</div>';

  let navigated = null;
  const realOpen = window.openProject;
  window.openProject = function (id) { navigated = id; };

  const zoomOpen = () => { const z = document.getElementById('cr-ri-zoom'); return !!z && z.classList.contains('open'); };

  /* ── 1. the tap ── */
  grid.querySelector('.phc img').click();
  await new Promise(r => setTimeout(r, 250));
  out.openedViewer = zoomOpen();
  out.didNotNavigate = navigated === null;
  const z = document.getElementById('cr-ri-zoom');
  out.caption = z ? (z.querySelector('.cap').textContent || '') : '';
  out.imgSrcSet = z ? (z.querySelector('img').getAttribute('src') || '').slice(0, 20) : '';
  out.actionsShown = z ? !z.querySelector('.acts').hidden : false;
  out.goLabel = z ? (z.querySelector('[data-ri="go"]').textContent || '') : '';
  out.scrollLocked = document.body.style.overflow === 'hidden';

  /* ── 4. the action bar must NOT close by bubbling ── */
  z.querySelector('.acts').click();
  await new Promise(r => setTimeout(r, 120));
  out.barClickDoesNotClose = zoomOpen();

  /* ── 2a. Back closes, does not navigate ── */
  z.querySelector('[data-ri="back"]').click();
  await new Promise(r => setTimeout(r, 200));
  out.backCloses = !zoomOpen();
  out.backDidNotNavigate = navigated === null;
  out.scrollReleased = document.body.style.overflow !== 'hidden';

  /* ── 2b. Open client closes AND navigates ── */
  grid.querySelector('.phc img').click();
  await new Promise(r => setTimeout(r, 200));
  z.querySelector('[data-ri="go"]').click();
  await new Promise(r => setTimeout(r, 200));
  out.goCloses = !zoomOpen();
  out.goNavigated = navigated === 'p1';

  /* ── 3. THE SINGLETON RESET ── */
  window.CardinalResourceImages.open(PX, 'a library figure');
  await new Promise(r => setTimeout(r, 150));
  out.plainOpenHidesActions = z.querySelector('.acts').hidden === true;
  out.plainOpenNoStaleLabel = (z.querySelector('[data-ri="go"]').textContent || '') === '';
  navigated = null;
  z.querySelector('[data-ri="go"]').click();     /* hidden, but prove it is inert */
  await new Promise(r => setTimeout(r, 120));
  out.staleActionInert = navigated === null;

  /* ── 5. touch targets, rendered ── */
  window.CardinalResourceImages.open(PX, 'x', { actionLabel: 'Open client', onAction() {} });
  await new Promise(r => setTimeout(r, 200));
  const rect = s => { const e = z.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
  out.closeRect = rect('.close');
  out.backRect = rect('[data-ri="back"]');
  out.goRect = rect('[data-ri="go"]');

  /* tapping the photo itself still closes */
  z.querySelector('img').click();
  await new Promise(r => setTimeout(r, 150));
  out.photoTapCloses = !zoomOpen();

  window.openProject = realOpen;
  return out;
}, PX); } catch (e) { return { crashed: String(e).split('\n')[0] }; } })();

chk('the harness ran', !r.crashed && !r.noGrid, r.crashed || (r.noGrid ? 'no #phGrid' : 'ok'));
chk('the shipped viewer is present', r.viewerExists);
chk('TAPPING A PHOTO OPENS THE VIEWER', r.openedViewer);
chk('AND DOES NOT JUMP TO THE CLIENT (the reported bug)', r.didNotNavigate);
chk('the client name is the caption', r.caption === 'Betty Mann', r.caption);
chk('the photo is the one that was tapped', (r.imgSrcSet || '').startsWith('data:image/png'), r.imgSrcSet);
chk('the action bar is shown', r.actionsShown);
chk('the action reads "Open client"', /Open client/.test(r.goLabel || ''), r.goLabel);
chk('the body scroll is locked while open', r.scrollLocked);
chk('clicking the bar does NOT close by bubbling', r.barClickDoesNotClose);
chk('Back closes', r.backCloses);
chk('Back does not navigate', r.backDidNotNavigate);
chk('the scroll lock is released on close', r.scrollReleased);
chk('"Open client" closes the viewer', r.goCloses);
chk('"Open client" navigates to that client', r.goNavigated, String(r.goNavigated));
chk('SINGLETON: a plain open hides the action bar', r.plainOpenHidesActions);
chk('SINGLETON: no stale label survives', r.plainOpenNoStaleLabel, JSON.stringify(r.plainOpenNoStaleLabel));
chk('SINGLETON: the stale action is inert', r.staleActionInert);
chk('tapping the photo still closes (9 older callers rely on it)', r.photoTapCloses);
for (const [n, v] of [['close', r.closeRect], ['Back', r.backRect], ['Open client', r.goRect]])
  chk(`touch target >= 44px: ${n}`, v && v.w >= 44 && v.h >= 44, v ? `${v.w}x${v.h}` : 'absent');

/* source guards */
const src = APP;
/* 36 at build 751. Later builds legitimately added sites (the app-wide census
   is CLAUDE.md's, not this gate's); re-pinned at the measured current count so
   the tripwire still fires on an UNNOTICED new writer. */
chk('no new scroll-lock writer', (src.match(/document\.body\.style\.overflow/g) || []).length === 43,
    (src.match(/document\.body\.style\.overflow/g) || []).length);
/* ⚠️ NOT a file-wide test for "38px": SIX other controls legitimately use that
   size (icon boxes, a proof thumbnail, nav buttons, the burger). Test the
   VIEWER'S OWN RULE, which is the only one this build touched. */
chk('the viewer close button is 44px in the stylesheet',
    /#cr-ri-zoom \.close\{[^}]*width:44px;height:44px;/.test(src));
chk('and no longer 38px', !/#cr-ri-zoom \.close\{[^}]*width:38px/.test(src));
chk('the other 38px controls were left alone',
    (src.match(/width:38px;height:38px;/g) || []).length === 6,
    (src.match(/width:38px;height:38px;/g) || []).length);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
