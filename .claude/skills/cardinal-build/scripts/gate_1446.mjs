#!/usr/bin/env node
/* gate_1446 — Production's sky (Theo, 12 Nov 2026: "time of day in the production
 * screen with the calendar", picked from rendered preview v4).
 *
 *   A  the home pane opens on a .pbsky whose data-sky is the CLOCK's (dawn 5–9, day 9–16,
 *      sunset 16–20, night 20–5); the canvas is sized to it; the heading is still the one
 *      sans "Production" 1416 asserts (inside the sky now)
 *   B  every sky × weather the board can show keeps its title and eyebrow >= 4.5:1 against
 *      the ground .pbsky paints (the gradient is a SIBLING layer, never an ancestor of text)
 *   C  phone: the Today row is >= 44px, sits on the sky's lower edge and above the fold
 *   D  the forecast drives it: a rain day rains (data-wx="rain", chip "Rain · 80%"),
 *      a snow day snows
 *   E  the loop is not free: it runs while the sky is on screen and schedules NOTHING once
 *      the board is closed, on a list pane, or under prefers-reduced-motion
 *   F  desktop 1440: the sky spans both columns and the month starts on the row the boxes
 *      start on (1043's month-left grid, one row up now the title is inside the sky)
 *   G  the board keeps the account's theme: a Sun account's board ground is still light
 *
 *   node gate_1446.mjs [index.html]      must be RED on build 1445
 *   PW_CORE=<path to playwright-core>  PW_CHROMIUM=<browser exe>   (local runs)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const APP  = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' +
              readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 240) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function board(who, { w = 390, h = 844, mobile = true, reduce = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await page.addInitScript(SETUP);
  /* count the SKY's frames only. Other modules on this board schedule ~40 frames a second of their
     own (measured: 40/s on 1445 with no sky at all), so counting every requestAnimationFrame made a
     correct loop look like a leak. The loop is a named function declaration — count by its name. */
  await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__raf = 0;
    window.requestAnimationFrame = f => { if (f && f.name === 'skyLoop') window.__raf++; return raf(f); }; });
  await page.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3500);
  await page.evaluate(() => { try { window.CardinalProduction.open(); } catch (_) {} });
  await wait(1800);
  return { ctx, page, errs };
}
const frames = async (page, ms = 1000) => { const a = await page.evaluate(() => window.__raf); await wait(ms); return (await page.evaluate(() => window.__raf)) - a; };

/* ---- phone, Curtis (a field account: Sun by default) ---- */
{
  const { ctx, page, errs } = await board('curtis');
  const a = await page.evaluate(() => {
    const s = document.querySelector('#cr-pb .pbsky'); if (!s) return null;
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const want = h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 16 ? 'day' : h >= 16 && h < 20 ? 'sunset' : 'night';
    const cv = s.querySelector('canvas.pbskycv'), r = s.getBoundingClientRect(), h1 = s.querySelector('h1');
    return { sky: s.getAttribute('data-sky'), want, cvw: cv ? cv.width : 0, boxw: Math.round(r.width), dpr: devicePixelRatio,
             h1: h1 ? h1.textContent : null, spans: h1 ? h1.querySelectorAll('span').length : -1,
             ff: h1 ? getComputedStyle(h1).fontFamily : '', h: Math.round(r.height) };
  });
  ok('A1 the home pane opens on a sky', !!a, a);
  ok('A1 the sky is the clock\'s', a && a.sky === a.want, a && { sky: a.sky, want: a.want });
  ok('A1 the canvas is sized to the sky', a && a.cvw >= a.boxw && a.cvw <= Math.ceil(a.boxw * Math.min(a.dpr, 2)) + 2, a && { cvw: a.cvw, boxw: a.boxw });
  ok('A2 the heading is still the one sans "Production" (1416)', a && a.h1 === 'Production' && a.spans === 0 && !/georgia|times/i.test(a.ff), a && { h1: a.h1, ff: a.ff });

  /* B — every sky × weather, title and eyebrow against the ground .pbsky paints */
  const b = await page.evaluate(() => {
    const s = document.querySelector('#cr-pb .pbsky'); if (!s) return null;
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const out = [], keep = [s.getAttribute('data-sky'), s.getAttribute('data-wx')];
    for (const sky of ['dawn', 'day', 'sunset', 'night']) for (const wx of ['', 'rain', 'snow', 'cloud']) {
      s.setAttribute('data-sky', sky); if (wx) s.setAttribute('data-wx', wx); else s.removeAttribute('data-wx');
      const g = getComputedStyle(s).backgroundColor;
      const t = cr(getComputedStyle(s.querySelector('h1')).color, g), e = cr(getComputedStyle(s.querySelector('.pbsub')).color, g);
      const gAncestorGrad = /gradient/.test(getComputedStyle(s).backgroundImage);
      out.push({ k: sky + (wx ? '+' + wx : ''), t: +t.toFixed(2), e: +e.toFixed(2), grad: gAncestorGrad });
    }
    s.setAttribute('data-sky', keep[0]); if (keep[1]) s.setAttribute('data-wx', keep[1]); else s.removeAttribute('data-wx');
    return out;
  });
  ok('B every sky × weather keeps the title >= 4.5:1', b && b.every(x => x.t >= 4.5), b && b.filter(x => x.t < 4.5));
  ok('B every sky × weather keeps the eyebrow >= 4.5:1', b && b.every(x => x.e >= 4.5), b && b.filter(x => x.e < 4.5));
  ok('B the gradient is never painted by an ancestor of the text', b && b.every(x => !x.grad), b && b.filter(x => x.grad).map(x => x.k));

  const c = await page.evaluate(() => {
    const t = document.querySelector('#cr-pb .pbsky + .pbtoday'), s = document.querySelector('#cr-pb .pbsky'); if (!t || !s) return null;
    const r = t.getBoundingClientRect(), q = s.getBoundingClientRect(), nav = document.getElementById('pwaNav');
    const navTop = nav && nav.getClientRects().length ? nav.getBoundingClientRect().top : innerHeight;
    return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), skyBottom: Math.round(q.bottom), navTop: Math.round(navTop) };
  });
  ok('C the Today row is 44px, on the sky\'s lower edge, above the fold', c && c.h >= 44 && c.top < c.skyBottom && c.bottom > c.skyBottom && c.bottom <= c.navTop, c);

  /* E — the loop runs while it can be seen, and stops when it cannot */
  const on = await frames(page);
  ok('E the sky animates while the board is open', on >= 20, { frames: on });
  await page.evaluate(() => { const b = document.querySelector('#cr-pb [data-box="needs"]'); if (b) b.click(); });
  await wait(600);
  const list = await frames(page);
  ok('E a list pane schedules no sky frames', list <= 3 && !(await page.evaluate(() => !!document.querySelector('#cr-pb .pbsky'))), { frames: list });
  await page.evaluate(() => { try { window.CardinalProduction.restore({ pane: 'home' }); } catch (_) {} });
  await wait(600);
  await page.evaluate(() => { try { window.CardinalProduction.close(false); } catch (_) {} });
  await wait(300);
  const shut = await frames(page);
  ok('E a closed board schedules no sky frames', shut <= 3, { frames: shut });

  /* D — the forecast drives the sky */
  await page.evaluate(() => { window.CardinalWx = Object.assign(window.CardinalWx || {}, { day: () => ({ c: 61, p: 80 }) }); try { window.CardinalProduction.open(); } catch (_) {} });
  await wait(900);
  const d1 = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbsky'); const c = s && s.querySelector('.pbskywx'); return s ? { wx: s.getAttribute('data-wx'), chip: c ? c.textContent : null } : null; });
  ok('D a rain day rains, and says so', d1 && d1.wx === 'rain' && /Rain/.test(d1.chip || '') && /80%/.test(d1.chip || ''), d1);
  await page.evaluate(() => { window.CardinalWx.day = () => ({ c: 73, p: 60 }); try { window.CardinalProduction.refresh(); } catch (_) {} });
  await wait(900);
  const d2 = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbsky'); return s ? s.getAttribute('data-wx') : null; });
  ok('D a snow day snows', d2 === 'snow', d2);

  /* G — the board keeps the account's own theme (Sun for a field account) */
  const g = await page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.getElementById('cr-pb')).backgroundColor }));
  ok('G a Sun account\'s board ground stays light', g.theme === 'rb-light' && /rgb\((2[3-5]\d), (2[3-5]\d), (2[3-5]\d)\)/.test(g.bg), g);
  ok('no page errors on the phone', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ---- reduced motion: one still frame, no loop ---- */
{
  const { ctx, page } = await board('curtis', { reduce: true });
  const has = await page.evaluate(() => !!document.querySelector('#cr-pb .pbsky canvas'));
  const n = await frames(page);
  ok('E reduced motion: the sky is drawn but nothing animates', has && n <= 3, { has, frames: n });
  await ctx.close();
}

/* ---- desktop, Theo (Dark) ---- */
{
  const { ctx, page, errs } = await board('theo', { w: 1440, h: 900, mobile: false });
  const f = await page.evaluate(() => {
    const w = document.querySelector('#cr-pb .pbwrap.pbhome'), s = w && w.querySelector(':scope > .pbsky'), m = w && w.querySelector(':scope > .pbmonth'), t = w && w.querySelector(':scope > .pbtiles');
    if (!w || !s || !m || !t) return null;
    const cs = getComputedStyle(w), inner = w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const R = e => e.getBoundingClientRect();
    return { sky: Math.round(R(s).width), inner: Math.round(inner), skyBottom: Math.round(R(s).bottom), monthTop: Math.round(R(m).top), tilesTop: Math.round(R(t).top) };
  });
  ok('F desktop: the sky spans both columns', f && Math.abs(f.sky - f.inner) <= 2, f);
  ok('F desktop: the month starts on the boxes\' row, under the sky', f && f.monthTop >= f.skyBottom && Math.abs(f.monthTop - f.tilesTop) <= 24, f);
  ok('no page errors on desktop', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed  (${APP})`);
process.exit(fail ? 1 : 0);
