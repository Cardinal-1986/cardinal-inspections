#!/usr/bin/env node
/* gate_1447 — Production's sky, the three extras Theo approved from preview v3/v4 (13 Nov 2026):
 *
 *   A  a sticky bar lives OUTSIDE .pbwrap (never a home-grid cell), is hidden (visibility) while
 *      the sky is on screen, and appears once the board scrolls past it — with today's date and
 *      the SAME words the Today row shows (one todayBits(), two readers)
 *   B  its + Add opens the add sheet
 *   C  today's hours drive the chip and the sky: a dry hour now with rain at +2h reads
 *      "44° · Rain from <h>" and is not drawn raining; a wet hour now reads "Rain now" and rains
 *   D  CardinalWx exports loadHours/hours, and the call asks for hourly probability in Fahrenheit
 *   E  the bar's date and words are >= 4.5:1 on its own ground, in Dark and in Light
 *   F  desktop: the home grid is untouched — the month still starts on the boxes' row
 *
 *   node gate_1447.mjs [index.html]      must be RED on build 1446
 *   PW_CORE=<playwright-core path>  PW_CHROMIUM=<browser exe>   (local runs)
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
async function board(who, { w = 390, h = 844, mobile = true, light = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  if (light) await page.addInitScript("window.__sentinelTheme = 'rb-light';");
  await page.addInitScript(SETUP);
  await page.goto('https://cardinal.test/?as=' + who, { waitUntil: 'domcontentloaded' });
  await wait(3500);
  await page.evaluate(() => { try { window.CardinalProduction.open(); } catch (_) {} });
  await wait(1600);
  return { ctx, page, errs };
}
const contrast = () => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2); };
  const s = document.querySelector('#cr-pb .pbstick'); if (!s) return null;
  const g = getComputedStyle(s).backgroundColor;
  return { date: cr(getComputedStyle(s.querySelector('b')).color, g), words: cr(getComputedStyle(s.querySelector('small')).color, g), g };
};

/* ---- phone, Theo (Dark) ---- */
{
  const { ctx, page, errs } = await board('theo');
  const a0 = await page.evaluate(() => {
    const s = document.querySelector('#cr-pb .pbstick'); if (!s) return null;
    const t = document.querySelector('#cr-pb .pbtoday .t');
    return { outside: !s.closest('.pbwrap'), vis: getComputedStyle(s).visibility, date: (s.querySelector('b') || {}).textContent,
             words: (s.querySelector('small') || {}).textContent, today: t ? t.textContent : null };
  });
  ok('A the sticky bar exists outside the home grid', a0 && a0.outside, a0);
  ok('A it is hidden while the sky is on screen', a0 && a0.vis === 'hidden', a0 && a0.vis);
  ok('A it says what the Today row says', a0 && a0.words && a0.words === a0.today, a0 && { bar: a0.words, row: a0.today });
  await page.evaluate(() => { const b = document.getElementById('cr-pb'), s = b && b.querySelector('.pbsky'); if (b && s) b.scrollTop = s.offsetTop + s.offsetHeight + 300; });
  await wait(700);
  const a1 = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbstick'); if (!s) return null; const r = s.getBoundingClientRect(), p = document.getElementById('cr-pb').getBoundingClientRect();
    return { on: s.classList.contains('on'), vis: getComputedStyle(s).visibility, top: Math.round(r.top - p.top), h: Math.round(r.height) }; });
  ok('A past the sky, the bar is shown at the top of the board', a1 && a1.on && a1.vis === 'visible' && Math.abs(a1.top) <= 1 && a1.h >= 44, a1);
  const e1 = await page.evaluate(contrast);
  ok('E dark: the bar\'s date and words are >= 4.5:1', e1 && e1.date >= 4.5 && e1.words >= 4.5, e1);
  await page.evaluate(() => { const b = document.querySelector('#cr-pb .pbstick .pbchip[data-add]'); if (b) b.click(); });
  await wait(700);
  const b1 = await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); return m ? { open: m.classList.contains('open'), mode: m.getAttribute('data-mode') } : null; });
  ok('B the bar\'s + Add opens the add sheet', b1 && b1.open, b1);
  await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); if (m) m.classList.remove('open'); const b = document.getElementById('cr-pb'); if (b) b.scrollTop = 0; });

  /* C — today's hours drive the chip and the sky */
  const hr = await page.evaluate(() => new Date().getHours());
  if (hr <= 21) {
    const c1 = await page.evaluate(h => {
      const ymd = (() => { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })();
      window.CardinalWx.hours = () => ({ day: ymd, t: 44, nowc: 3, hrs: [{ h, p: 10, c: 3 }, { h: h + 2, p: 80, c: 61 }] });
      window.CardinalProduction.refresh();
      return null;
    }, hr);
    await wait(800);
    const c1r = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbsky'); const c = s && s.querySelector('.pbskywx'); return s ? { wx: s.getAttribute('data-wx'), chip: c ? c.textContent : null } : null; });
    const want = ((hr + 2) % 12 || 12) + (hr + 2 < 12 ? 'am' : 'pm');
    ok('C a dry hour with rain later reads "44° · Rain from ' + want + '"', c1r && c1r.chip === '44° · Rain from ' + want, c1r);
    ok('C ... and the sky is not drawn raining yet', c1r && c1r.wx !== 'rain', c1r);
  } else ok('C (late evening: the "from" check needs two hours left today — skipped, not failed)', true);
  await page.evaluate(h => {
    const ymd = (() => { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })();
    window.CardinalWx.hours = () => ({ day: ymd, t: 41, nowc: 61, hrs: [{ h, p: 90, c: 61 }] });
    window.CardinalProduction.refresh();
  }, hr);
  await wait(800);
  const c2 = await page.evaluate(() => { const s = document.querySelector('#cr-pb .pbsky'); const c = s && s.querySelector('.pbskywx'); return s ? { wx: s.getAttribute('data-wx'), chip: c ? c.textContent : null } : null; });
  ok('C a wet hour now reads "Rain now" and rains', c2 && c2.wx === 'rain' && c2.chip === '41° · Rain now', c2);

  /* D — the module and the call */
  const d1 = await page.evaluate(() => ({ lh: typeof (window.CardinalWx || {}).loadHours, h: typeof (window.CardinalWx || {}).hours }));
  ok('D CardinalWx exports loadHours and hours', d1.lh === 'function' && d1.h === 'function', d1);
  ok('D the hourly call asks for probability by the hour, in Fahrenheit',
     /hourly=precipitation_probability/.test(HTML) && /temperature_unit=fahrenheit/.test(HTML));
  ok('no page errors (dark phone)', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ---- phone, Light ---- */
{
  const { ctx, page } = await board('theo', { light: true });
  await page.evaluate(() => { const b = document.getElementById('cr-pb'), s = b && b.querySelector('.pbsky'); if (b && s) b.scrollTop = s.offsetTop + s.offsetHeight + 300; });
  await wait(700);
  const e2 = await page.evaluate(contrast);
  ok('E light: the bar\'s date and words are >= 4.5:1', e2 && e2.date >= 4.5 && e2.words >= 4.5, e2);
  await ctx.close();
}

/* ---- desktop: the grid is untouched ---- */
{
  const { ctx, page, errs } = await board('theo', { w: 1440, h: 900, mobile: false });
  const f = await page.evaluate(() => {
    const w = document.querySelector('#cr-pb .pbwrap.pbhome'), s = w && w.querySelector(':scope > .pbsky'), m = w && w.querySelector(':scope > .pbmonth'), t = w && w.querySelector(':scope > .pbtiles');
    if (!w || !s || !m || !t || !document.querySelector('#cr-pb > .pbstick')) return null;
    const R = e => e.getBoundingClientRect();
    return { skyBottom: Math.round(R(s).bottom), monthTop: Math.round(R(m).top), tilesTop: Math.round(R(t).top) };
  });
  ok('F desktop: the bar sits outside the grid and the month still starts on the boxes\' row', f && f.monthTop >= f.skyBottom && Math.abs(f.monthTop - f.tilesTop) <= 24, f);
  ok('no page errors (desktop)', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed  (${APP})`);
process.exit(fail ? 1 : 0);
