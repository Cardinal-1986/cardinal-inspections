#!/usr/bin/env node
/* gate_1477 — Production: the sky's words on a ground, small targets, Dispatch by keyboard.
 *
 *   A  a pale cloud (#ebebec) parked behind the sky's text, in day/night rain and night snow: the title holds
 *      >= 3:1 and the date and subtitle >= 4.5:1 against the REAL composited pixel beside them (screenshot, not CSS)
 *   B  the punch tick is a 44px target (the pad round the 22px box answers a tap 20px off its centre)
 *   C  Dispatch's filter chips are 44 x 44 or more
 *   D  Dispatch by keyboard: Enter on a trade band folds it; Enter on a Needs-a-crew card arms it;
 *      the job card's name is a focusable control (its Move button stays the only button inside)
 *
 *   node gate_1477.mjs [index.html]      must be RED on build 1476
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { inflateSync } from 'zlib';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PW = process.env.PW_CORE || (existsSync('/opt/node22/lib/node_modules/playwright/index.js') ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');
const { chromium } = require(PW);
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = process.argv.slice(2).find(a => !a.startsWith('--')) || resolve(HERE, '../../../../index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, n, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 360) : '')); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 260000).unref();

/* one pixel out of a PNG screenshot (8-bit RGB/RGBA, filter byte first) */
function px(png) {
  let o = 8, ct = 2, idat = [];
  while (o < png.length) {
    const len = png.readUInt32BE(o), type = png.toString('ascii', o + 4, o + 8), data = png.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') ct = data[9];
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  return [raw[1], raw[2], raw[3]];
}
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgb = s => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function page(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss());
  /* GATE_NOW=2026-11-15T15:00:00 pins the browser's day, so the gate can be proved on every weekday */
  if (process.env.GATE_NOW) await p.clock.install({ time: new Date(process.env.GATE_NOW) });
  await p.route('**/*', r => r.request().url().startsWith('https://cardinal.test/') ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML }) : r.fulfill({ status: 200, contentType: 'text/plain', body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://cardinal.test/?as=theo', { waitUntil: 'domcontentloaded' }); await wait(3800);
  await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'production').run(); }); await wait(1800);
  return { ctx, p };
}

/* A */
let { ctx, p } = await page(390, 844);
const worst = [];
for (const [sky, wx] of [['day', 'rain'], ['night', 'rain'], ['sunset', 'rain'], ['night', 'snow'], ['dawn', 'snow']]) {
  const boxes = await p.evaluate(([sky, wx]) => {
    const s = document.querySelector('#cr-pb .pbsky'); s.setAttribute('data-sky', sky); s.setAttribute('data-wx', wx);
    s.querySelectorAll('canvas').forEach(c => c.style.visibility = 'hidden');
    let cl = s.querySelector('.g1477cloud');
    if (!cl) { cl = document.createElement('div'); cl.className = 'g1477cloud'; cl.style.cssText = 'position:absolute;inset:0;z-index:1;background:#ebebec;pointer-events:none'; s.appendChild(cl); }
    const out = {};
    for (const [k, sel] of [['title', 'h1'], ['date', '.pbmon'], ['sub', '.pbsub']]) {
      const e = s.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      /* the ground just beside the words: 3px left of the box (the subtitle's own padding when it has one) */
      out[k] = { x: Math.max(1, Math.round(r.left) - 3), y: Math.round(r.top + r.height / 2), ink: cs.color, floor: k === 'title' ? 3 : 4.5 };
    }
    return out;
  }, [sky, wx]);
  await wait(250);
  for (const k of Object.keys(boxes)) {
    const b = boxes[k];
    /* CDP, not page.screenshot: that one waits on web fonts, which this rig routes to empty bodies */
    const cdp = await ctx.newCDPSession(p);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: 1, height: 1, scale: 1 } });
    const g = px(Buffer.from(shot.data, 'base64'));
    const r = ratio(rgb(b.ink), g);
    worst.push({ sky: sky + '+' + wx, k, r: +r.toFixed(2), floor: b.floor, ground: g });
  }
}
const bad = worst.filter(w => w.r < w.floor);
ok(worst.length >= 12 && bad.length === 0, 'A  sky words hold their floor over a pale cloud (real pixels)', bad.length ? bad : worst.map(w => w.sky + ' ' + w.k + ' ' + w.r));
await ctx.close();

/* B */
({ ctx, p } = await page(390, 844));
await p.evaluate(() => { const b = document.querySelector('#cr-pb [data-go="cal"]'); b && b.click(); }); await wait(1300);
const bx = await p.evaluate(() => {
  const e = [...document.querySelectorAll('#cr-pb .pbitem .bx')].find(x => x.getClientRects().length); if (!e) return null;
  e.scrollIntoView({ block: 'center' });
  const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = (dx, dy) => { const h = document.elementFromPoint(cx + dx, cy + dy); return !!(h && h.closest('.bx') === e); };
  return { w: Math.round(r.width), right: hit(20, 0), down: hit(0, 20), left: hit(-20, 0), up: hit(0, -20) };
});
ok(!!bx && bx.right && bx.down && bx.left && bx.up, 'B  the punch tick answers a tap 20px from its centre (44px target)', bx);

/* C, D */
await p.evaluate(async () => { await window.CardinalDispatch.open(); }); await wait(2200);
const c = await p.evaluate(() => [...document.querySelectorAll('#cr-disp .dspfilt .fc')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent, Math.round(r.width), Math.round(r.height)]; }));
ok(c.length && c.every(x => x[1] >= 44 && x[2] >= 44), 'C  Dispatch filter chips are 44 x 44', c);

/* read the job name BEFORE a band is folded: folding Roofing hides Betos's jobs, and the one left (Pineda's, on
   the next Sunday) is off the 7-day board when today IS Sunday - this check went red in CI on a Sunday */
const nm = await p.evaluate(() => { const n = document.querySelector('#cr-disp .job .nm'); const j = n && n.closest('.job');
  return n ? { role: n.getAttribute('role'), tab: n.tabIndex, jobRole: j.getAttribute('role'), buttonsIn: j.querySelectorAll('button,[role="button"]').length } : null; });
const band0 = await p.evaluate(() => { const b = document.querySelector('#cr-disp .dband[data-band]:not(.repband)'); if (!b) return null; b.focus(); return { k: b.getAttribute('data-band'), focused: document.activeElement === b, tab: b.tabIndex }; });
await p.keyboard.press('Enter'); await wait(600);
const band1 = await p.evaluate(k => { const b = document.querySelector('#cr-disp .dband[data-band="' + k + '"]'); return b ? { exp: b.getAttribute('aria-expanded'), summary: !!(b.nextElementSibling && b.nextElementSibling.classList.contains('dsum')) } : null; }, band0 && band0.k);
const u0 = await p.evaluate(() => { const u = document.querySelector('#cr-disp .uch[data-pid]'); if (!u) return null; u.focus(); return { pid: u.getAttribute('data-pid'), focused: document.activeElement === u }; });
await p.keyboard.press('Enter'); await wait(600);
const u1 = await p.evaluate(pid => { const u = document.querySelector('#cr-disp .uch[data-pid="' + pid + '"]'); return u ? { armed: u.classList.contains('armed'), pressed: u.getAttribute('aria-pressed') } : null; }, u0 && u0.pid);
ok(!!band0 && band0.focused && !!band1 && band1.summary && band1.exp === 'false', 'D  Enter on a trade band folds it', { band0, band1 });
ok(!!u0 && u0.focused && !!u1 && u1.armed && u1.pressed === 'true', 'D  Enter on a Needs-a-crew card arms it', { u0, u1 });
ok(!!nm && nm.role === 'button' && nm.tab === 0 && nm.jobRole == null, 'D  the job name is the keyboard control; the card is not a button around a button', nm);
await ctx.close();

await browser.close();
console.log(`GATE 1477 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
