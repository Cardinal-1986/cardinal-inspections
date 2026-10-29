#!/usr/bin/env node
/* gate_1299 — the reds that were the APP's, found by running every gate.
     A  a cold open of a punch-out link (#p/<id>/punch) lands on THAT client's
        Punch Outs tab, not Home (broken since 1165: showHome() pushed #h first)
     B  ...and a plain client link (#p/<id>) still lands on Overview
     C  the desktop rail's Switch portal row wears Theo's yellow in dark and
        538's amber in light (the rules said data-k="landing"; 1165 renamed it)
     D  the outline Cancel on a WHITE form sheet reads in dark mode (1292 made it
        light ink on a see-through chip: 1.22:1)
     E  the dispatch board's crew tags keep their monospace (1287's one-typeface
        rule reached Production and Dispatch, which are left alone)
     F  no native alert()/confirm() outside crAsk/crTell's own fallbacks (lexer)
   Usage: node gate_1299.mjs [index.html]   control: the 1298 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const lum = c => { const m = String(c).match(/\d+(\.\d+)?/g); if (!m) return 0; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function boot({ w = 390, hash = '', light = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 } }); const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo' + hash, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4200);
  return { ctx, p };
}

/* A, B */
{ const { ctx, p } = await boot({ hash: '#p/p1/punch' });
  const r = await p.evaluate(() => ({ proj: window.currentProject ? window.currentProject.name : null, tab: window.__curTab || null, hash: location.hash })).catch(() => ({}));
  ok(r.proj === 'Mark Diamond' && r.tab === 'punch', 'A  a cold punch-out link lands on the client’s Punch Outs tab', JSON.stringify(r)); await ctx.close(); }
{ const { ctx, p } = await boot({ hash: '#p/p1' });
  const r = await p.evaluate(() => ({ proj: window.currentProject ? window.currentProject.name : null, tab: window.__curTab || null })).catch(() => ({}));
  ok(r.proj === 'Mark Diamond' && r.tab === 'overview', 'B  a cold client link lands on Overview', JSON.stringify(r)); await ctx.close(); }

/* C */
/* J16 (judge 16 polish) — DELIBERATELY CHANGED: the row's 539 yellow / 1035 amber is
   deleted at source, so it must now wear the same ink as a normal rail row (Clients),
   and must not be the old yellow / amber. */
for (const [light, old] of [[false, 'rgb(240, 198, 81)'], [true, 'rgb(138, 97, 0)']]) {
  const { ctx, p } = await boot({ w: 1194, light });
  try { await p.evaluate(async () => { await window.__sentinelStates[0].run(); }); await p.waitForTimeout(700); } catch (e) {}
  const c = await p.evaluate(() => { const g = k => { const e = document.querySelector('#cr-lnav .lnav-item[data-k="' + k + '"] .lnav-tx'); return e ? getComputedStyle(e).color : 'MISSING'; }; return [g('switchportal'), g('clients')]; }).catch(() => ['ERR', 'ERR']);
  ok(c[0] !== 'MISSING' && c[0] === c[1] && c[0] !== old, 'C  Switch portal row ' + (light ? 'light' : 'dark') + ': the normal rail ink (J16)', c.join(' vs ')); await ctx.close();
}

/* D */
{ const { ctx, p } = await boot();
  const r = await p.evaluate(() => { try { hideAllViews(); } catch (e) {} const m = document.getElementById('projModal'); if (!m) return null; m.style.display = 'block';
    const b = document.getElementById('pfCancel'); const f = m.querySelector('.projform'); if (!b || !f) return null;
    return { c: getComputedStyle(b).color, g: getComputedStyle(f).backgroundColor, theme: document.documentElement.getAttribute('data-theme') }; }).catch(() => null);
  const rr = r ? ratio(r.c, r.g) : 0;
  ok(rr >= 4.5 && !(r && r.theme), 'D  dark: Cancel on the white Add-project sheet clears 4.5:1', rr + ':1 ' + JSON.stringify(r)); await ctx.close(); }

/* E */
{ const { ctx, p } = await boot({ w: 1194 });
  try { await p.evaluate(async () => { const s = window.__sentinelStates.find(x => x.name === 'dispatch'); if (s) await s.run(); }); await p.waitForTimeout(900); } catch (e) {}
  const f = await p.evaluate(() => { const e = document.querySelector('#cr-disp .crewc .cn'); return e ? getComputedStyle(e).fontFamily : 'MISSING'; }).catch(() => 'ERR');
  ok(/mono|menlo|consolas|courier/i.test(f) && !/^'?Segoe UI/i.test(f), 'E  dispatch crew tags keep their monospace (Dispatch is left alone)', f); await ctx.close(); }
await browser.close();

/* F — the lexer, so a comment cannot count */
const count = needle => { try { const o = execFileSync('python3', [join(HERE, 'jslex_count.py'), FILE, needle], { encoding: 'utf8' }); const m = o.match(/in CODE\s*:\s*(\d+)/); return m ? +m[1] : -1; } catch (e) { return -1; } };
const al = count('alert('), cf = count('confirm(');
ok(al === 1, 'F  exactly one alert( in code (crTell’s own fallback)', 'in CODE: ' + al);
ok(cf === 1, 'F  exactly one confirm( in code (crAsk’s own fallback)', 'in CODE: ' + cf);

console.log(`GATE 1299 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
