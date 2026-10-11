#!/usr/bin/env node
/* gate_1287 — one typeface across the app in dark retail (Theo: option B).
     A  dark: no Georgia or monospace text on home, client, leads, client directory,
        estimates, punch, AR, production or sales floor
     B  dark: the drawer keeps its own section labels (excluded on purpose)
     C  light (since 1290): the Leads title is Segoe too
     D  dark: Why Cardinal keeps its own designed title face (1289 — presentation screens excluded)
   Usage: node gate_1287.mjs [index.html] — control: the 1286 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 400000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const boot = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500); return { ctx, p };
};
const scan = (p) => p.evaluate(() => { const odd = []; for (const e of document.body.querySelectorAll('*')) { if (e.closest('#cr-lnav, svg')) continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
  const k = getComputedStyle(e); if (k.visibility === 'hidden') continue; if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
  const f = k.fontFamily.split(',')[0]; if (/Georgia|monospace|Courier|Consolas/i.test(f)) odd.push(String(e.className).slice(0, 20) + ':' + f.replace(/"/g, '')); } return odd; });
const run = (p, s) => p.evaluate(async (s) => { try { await window.__sentinelStates.find(x => x.name === s).run(); return true; } catch (e) { return false; } }, s);
const { ctx, p } = await boot(false);
const STATES = ['home', 'client', 'leads', 'clientdir', 'estimates', 'punch', 'ar', 'production', 'salesfloor'];
const res = {}; for (const s of STATES) { await run(p, s); await p.waitForTimeout(900); res[s] = await scan(p); }
const badS = Object.entries(res).filter(([, v]) => v.length);
ok(badS.length === 0, `A  dark: no Georgia or monospace text on ${STATES.length} screens`, badS.map(([k, v]) => `${k}: ${v.slice(0, 2).join(', ')} (${v.length})`).join(' | ') || 'none');
const nav = await p.evaluate(() => { const e = document.querySelector('#cr-lnav .lnav-sec'); return e ? getComputedStyle(e).fontFamily : null; });
ok(!!nav && /monospace/i.test(nav), 'B  dark: the drawer keeps its own section labels', String(nav).slice(0, 40));
/* 1289: the client-facing presentation screens keep their own type */
await run(p, 'why'); await p.waitForTimeout(900);
const why = await p.evaluate(() => { const h = document.querySelector('#cr-why h1, #cr-why h2, #cr-why [class*="title"]'); return h ? getComputedStyle(h).fontFamily : null; });
ok(!!why && !/Segoe UI/.test(why.split(',')[0]), 'D  dark: Why Cardinal (client-facing) keeps its own title face (1289)', String(why).slice(0, 40));
await ctx.close();
const L = await boot(true); await run(L.p, 'leads'); await L.p.waitForTimeout(900);
const lt = await L.p.evaluate(() => { const e = document.querySelector('.ljtitle'); return { theme: document.documentElement.getAttribute('data-theme'), f: e ? getComputedStyle(e).fontFamily : null }; });
ok(lt.theme === 'rb-light' && /Segoe UI/.test(String(lt.f)) && !/Georgia/.test(String(lt.f)), 'C  light (build 1290): the Leads title is Segoe too', JSON.stringify(lt));
await L.ctx.close(); await browser.close();
console.log(`\nGATE 1287 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
