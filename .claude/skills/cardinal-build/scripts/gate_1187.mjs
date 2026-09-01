#!/usr/bin/env node
/* gate_1187 — the seven-door parity build, proven in a real engine.
 *
 *   node gate_1187.mjs [cardinal-index.html] [showroom-index.html]
 *   node gate_1187.mjs --control   sweep the PREVIOUS build; the ?open= proofs
 *                                  must FAIL there, or this gate proves nothing
 *
 * Six things, all of which were asked for by name:
 *   1. ?open=appt cold-loads into The Appointment
 *   2. ?open=why  cold-loads into Why Cardinal
 *   3. a RELOAD preserves that entry behaviour
 *   4. no query -> the ordinary landing, unchanged
 *   5. every Showroom launcher tile carries its intended canonical URL
 *   6. all seven old hub capabilities are still reachable
 *
 * ⚠ THE CONTROL IS THE POINT. Checks 1-3 pass trivially against any build that
 * happens to open a module; run with --control against 1186 and they must go
 * RED, because ?open= did not exist there. A gate never seen to fail is not a
 * gate -- this repo has shipped two of those already.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CONTROL = process.argv.includes('--control');
const APP  = args[0] || resolve(dirname(new URL(import.meta.url).pathname), '../../../../index.html');
const SHOW = args[1] || '/home/user/cardinal-showroom/index.html';

const HTML  = readFileSync(APP, 'utf8');
const SETUP = ['./sentinel_setup_cardinal.js', './e2e_mock_supa.js']
  .map(p => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n;\n');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  → ' + detail : ''));
  cond ? pass++ : fail++;
};

const browser = await chromium.launch();
async function open(query) {
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
  await page.addInitScript(SETUP);
  await page.goto('https://cardinal.test/' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}
/* Visible = the module's own DISPLAY lever says so. Structural, not a guess. */
const shown = (page, id) => page.evaluate(i => {
  const e = document.getElementById(i);
  if (!e) return { there: false };
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return { there: true, display: cs.display, w: Math.round(r.width), h: Math.round(r.height) };
}, id);

console.log('gate_1187 ' + (CONTROL ? '(CONTROL — ?open= proofs MUST fail)' : '') + '\n  app: ' + APP);

/* ── 1 & 2 · cold load ────────────────────────────────────────────────── */
for (const [q, id, label] of [['?open=why', 'cr-why', 'Why Cardinal'],
                              ['?open=appt', 'cr-appt', 'The Appointment']]) {
  const { ctx, page, errs } = await open(q);
  const st = await shown(page, id);
  ok(`${q} cold-loads into ${label}`,
     st.there && st.display !== 'none' && st.h > 200,
     JSON.stringify(st));
  ok(`${q} raises no page error`, errs.length === 0, errs[0] || '');
  /* ── 3 · reload keeps it ─────────────────────────────────────────────── */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const st2 = await shown(page, id);
  ok(`${q} survives a reload`, st2.there && st2.display !== 'none' && st2.h > 200, JSON.stringify(st2));
  await ctx.close();
}

/* ── 4 · no query -> the ordinary landing, untouched ──────────────────── */
{
  const { ctx, page, errs } = await open('');
  const lv = await page.evaluate(() => {
    const e = document.getElementById('landingView');
    return e ? { built: e.dataset.crLrBuilt === '1', display: getComputedStyle(e).display,
                 tiles: e.querySelectorAll('[data-go]').length } : null;
  });
  const why = await shown(page, 'cr-why');
  const appt = await shown(page, 'cr-appt');
  ok('no query → the landing still builds', !!lv && lv.built, JSON.stringify(lv));
  ok('no query → Why Cardinal stays shut', !why.there || why.display === 'none', JSON.stringify(why));
  ok('no query → The Appointment stays shut', !appt.there || appt.display === 'none', JSON.stringify(appt));
  ok('no query → no page error', errs.length === 0, errs[0] || '');
  await ctx.close();
}

/* ── 6 · every hub capability still reachable ─────────────────────────── */
{
  const { ctx, page } = await open('?vision=1');
  const hub = await page.evaluate(() => {
    const lv = document.getElementById('landingView');
    if (!lv) return null;
    return { go: [...lv.querySelectorAll('[data-go]')].map(b => b.dataset.go),
             vh: lv.querySelectorAll('.cr-vh, .cr-vh-tile').length,
             hrefs: [...lv.querySelectorAll('a[href]')].map(a => a.getAttribute('href')) };
  });
  /* ⚠ 1190 INVERTED THESE, IT DID NOT DELETE THEM. The Vision hub is gone —
     showroom.cardinalroster.com is the standalone Showroom since the 31 Aug
     cutover, so ?vision=1 painted a door to a place that no longer exists.
     Deleting the assertions would leave nothing to notice a resurrection, so
     they now assert the ABSENCE, and the ordinary landing's own tiles are
     asserted present so this cannot pass by rendering nothing at all. */
  /* ⚠ NOT `!go.includes('showroom')`. The first version of this used that and
     failed a correct tree: the ORDINARY landing has its own Showroom tile
     (it opens CardinalShowcase, which still lives in Cardinal). The tell that
     the HUB is gone is the hub's own markup, which nothing else emits. */
  ok('?vision=1 no longer paints a Vision hub',
     !!hub && hub.vh === 0 && !hub.go.includes('why'),
     hub && ('cr-vh nodes: ' + hub.vh + ' · ' + hub.go.join(',')));
  ok('the ordinary landing is what renders instead',
     !!hub && ['retail','insurance','community','designer'].every(k => hub.go.includes(k)),
     hub && hub.go.join(','));
  ok('its Pop-Up link is still CANONICAL, not a path',
     !!hub && hub.hrefs.includes('https://presentation.cardinalroster.com/popup.html'),
     hub && hub.hrefs.join(' '));
  ok('no relative /studio.html or /popup.html survives anywhere',
     !!hub && !hub.hrefs.some(h => h === '/studio.html' || h === '/popup.html'), '');
  await ctx.close();
}

/* ── 5 · the Showroom launcher ────────────────────────────────────────── */
{
  const S = readFileSync(SHOW, 'utf8');
  const WANT = {
    showcase  : null, colors: null,                        /* native */
    studio    : 'https://app.cardinalroster.com/studio.html',
    visualizer: 'https://app.cardinalroster.com/visualizer/?present=1',
    appt      : 'https://app.cardinalroster.com/?open=appt',
    why       : 'https://app.cardinalroster.com/?open=why',
    /* 1189: was the bare host. Measured in production, that URL serves the
       CRM, not the book -- gate_1189 is the one that proves the destination. */
    popup     : 'https://presentation.cardinalroster.com/popup.html',
  };
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.setContent('<script>' + S.slice(S.indexOf('var TILES'), S.indexOf('function drawLauncher')) +
                        'window.__T = TILES;</script>');
  const tiles = await page.evaluate(() => window.__T.map(t => ({ key: t.key, href: t.href || null, native: !t.href })));
  ok('the launcher has all seven doors', tiles.length === 7, tiles.map(t => t.key).join(','));
  for (const k of Object.keys(WANT)) {
    const t = tiles.find(x => x.key === k);
    ok('  ' + k.padEnd(11) + (WANT[k] ? '→ canonical URL' : '→ native'),
       !!t && t.href === WANT[k], t ? String(t.href) : 'MISSING');
  }
  ok('no launcher URL is a bare path',
     tiles.every(t => !t.href || /^https:\/\//.test(t.href)),
     tiles.filter(t => t.href && !/^https:/.test(t.href)).map(t => t.href).join(' '));
  await ctx.close();
}

await browser.close();
console.log((fail ? '\nRED — ' : '\nGREEN — ') + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
