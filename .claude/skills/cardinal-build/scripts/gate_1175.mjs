/* gate_1175 — the Vision hub's two inks meet the floor, measured in a real
 * engine on the real vision pane (?vision=1). Optional path arg -> negative
 * control (1174: 3.44 and 3.24, must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(path.join(HERE, 'e2e_mock_supa.js'), 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => { c ? pass++ : (fail++, bad.push(m)); };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 60000);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url.startsWith('https://app.cardinalroster.com/?vision=1') || url === 'https://app.cardinalroster.com/')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={};' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '{}' });
  return route.abort();
});
await page.addInitScript(() => { window.__SEED__ = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }], projects: [] }; });
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/?vision=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const s = await page.evaluate(() => {
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = s => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); const [h, l] = la > lb ? [la, lb] : [lb, la]; return (h + 0.05) / (l + 0.05); };
  function ground(el) {
    for (let p = el; p; p = p.parentElement) {
      const bg = parse(getComputedStyle(p).backgroundColor);
      const a = (getComputedStyle(p).backgroundColor.match(/[\d.]+/g) || [])[3];
      if (bg && (a === undefined || parseFloat(a) > 0.98)) return bg;
    }
    return [11, 13, 12];
  }
  const out = {};
  const w = document.querySelector('.cr-vh-word');
  if (w) out.word = +ratio(parse(getComputedStyle(w).color), ground(w)).toFixed(2);
  const f = document.querySelector('.cr-vh-flow span');
  if (f) out.flow = +ratio(parse(getComputedStyle(f).color), ground(f)).toFixed(2);
  out.present = { word: !!w, flow: !!f };
  return out;
});
ok(s.present.word, 'the vision wordmark rendered');
ok(s.present.flow, 'the Studio flow line rendered (admin)');
ok(s.word >= 4.5, 'wordmark ink >= 4.5, got ' + s.word);
ok(s.flow >= 4.5, 'flow-line ink >= 4.5, got ' + s.flow);
ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join('|'));
await b.close();
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail) + (fail ? '\n  - ' + bad.join('\n  - ') : ''));
process.exit(fail ? 1 : 0);
