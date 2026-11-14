#!/usr/bin/env node
/* gate_1448 — Crew Dispatch flags a booked job on a wet day (Theo, 13 Nov 2026: "flag only").
 *
 *   A  with the forecast calling Saturday wet (rain 80%), Saturday's booked job wears "Rain 80%"
 *      and the wet outline; a dry day's job wears nothing
 *   B  a storm day reads "Storm 70%" — the words are CardinalWx.flag(), the punch-outs' own (1295)
 *   C  with no forecast at all, no job wears a flag (the board is unchanged when the weather is unreachable)
 *   D  the flag ink is >= 4.5:1 on the card in Dark and in Light (it is --disp-wx, the header's wet ink)
 *
 *   node gate_1448.mjs [index.html]      must be RED on build 1447
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
              readFileSync(resolve(HERE, 'sentinel_setup_production.js'), 'utf8') + '\n;\n' +
              readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
/* the forecast, in the app's own cache shape: today dry, +1 rain 80%, +2 cloudy 20%, +5 storms 70% */
const WX = `(function(){ var d=new Date(), out={}; var plan=[{c:1,p:5},{c:61,p:80},{c:3,p:20},{c:0,p:5},{c:1,p:10},{c:95,p:70},{c:2,p:15}];
  for(var i=0;i<7;i++){ var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i); var k=x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); out[k]=plan[i]; }
  try{ localStorage.setItem('cr-dispwx', JSON.stringify({at:Date.now(), days:out})); }catch(e){} })();`;

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 260) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();

/* 1457: the page clock is pinned to a FRIDAY at 10:00. The shared seed (sentinel_setup_cardinal.js)
   puts work orders on +1, +5 and NEXT SUNDAY; this gate wants one on +2 (the dry day) — which is next
   Sunday only when today is a Friday. The gate was written and passed on Friday 13 Nov and was red on
   every other day: measured with GATE_NOW, Mon–Thu and Sat all RED 6/2, Fri GREEN 8/0. PR 772 hit it
   at 00:11 UTC on Sat 14 Nov (Friday evening in Dayton) with nothing wrong in the build. The seed, the
   forecast and the board all read the same pinned clock, so the gate now means the same thing every
   day. GATE_NOW overrides it. */
const PINNED = process.env.GATE_NOW ? new Date(process.env.GATE_NOW) : (() => {
  const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return d;
})();
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function dispatch({ light = false, forecast = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(PINNED);
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  page.on('dialog', d => d.accept());
  await page.route('**/*', r => r.request().url().startsWith('https://cardinal.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML })
    : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  if (light) await page.addInitScript("window.__sentinelTheme = 'rb-light';");
  await page.addInitScript(SETUP);
  if (forecast) await page.addInitScript(WX);
  await page.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await wait(3500);
  await page.evaluate(() => { try { window.CardinalProduction.open(); } catch (_) {} });
  await wait(1200);
  await page.evaluate(() => { const b = document.querySelector('#cr-pb [data-hub="dispatch"]'); if (b) b.click(); });
  await wait(1800);
  return { ctx, page, errs };
}
const readJobs = () => [...document.querySelectorAll('#cr-disp .dcell .job')].map(j => {
  const di = +((j.closest('.dcell').getAttribute('data-dc') || '|').split('|')[1]);
  const f = j.querySelector('.wxf');
  return { di, wet: j.classList.contains('wetd'), flag: f ? f.textContent.trim() : '' };
});
const inkContrast = () => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const f = document.querySelector('#cr-disp .job .wxf'); if (!f) return null;
  let g = null, e = f; while (e && !g) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) g = b; e = e.parentElement; }
  const x = lum(getComputedStyle(f).color), y = lum(g || 'rgb(0,0,0)');
  return { ink: getComputedStyle(f).color, ground: g, ratio: +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2) };
};

{
  const { ctx, page, errs } = await dispatch();
  const jobs = await page.evaluate(readJobs);
  const sat = jobs.filter(j => j.di === 1), dry = jobs.filter(j => j.di === 2), wed = jobs.filter(j => j.di === 5);
  ok('A the board has jobs on +1, +2 and +5 to test against', sat.length && dry.length && wed.length, jobs);
  ok('A a booked job on the rain day wears "Rain 80%" and the wet outline', sat.length && sat.every(j => j.wet && j.flag === 'Rain 80%'), sat);
  ok('A a job on a dry day wears nothing', dry.length && dry.every(j => !j.wet && !j.flag), dry);
  ok('B a storm day reads "Storm 70%" (CardinalWx.flag, the punch-outs\' words)', wed.length && wed.every(j => j.flag === 'Storm 70%'), wed);
  const d1 = await page.evaluate(inkContrast);
  ok('D dark: the flag is >= 4.5:1 on its card', d1 && d1.ratio >= 4.5, d1);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}
{
  const { ctx, page } = await dispatch({ light: true });
  const d2 = await page.evaluate(inkContrast);
  ok('D light: the flag is >= 4.5:1 on its card', d2 && d2.ratio >= 4.5, d2);
  await ctx.close();
}
{
  const { ctx, page } = await dispatch({ forecast: false });
  const jobs = await page.evaluate(readJobs);
  ok('C with no forecast, no job wears a flag', jobs.length && jobs.every(j => !j.flag && !j.wet), jobs);
  await ctx.close();
}

await browser.close();
console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed  (${APP})`);
process.exit(fail ? 1 : 0);
