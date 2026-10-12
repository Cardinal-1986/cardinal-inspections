#!/usr/bin/env node
/* gate_1291 — the Billed / Collected / Balance tiles are flat.
     A  dark:  every tile has no shadow and a 1px outline; ground still --crji-tile
     B  light: the same
   Usage: node gate_1291.mjs [index.html] — control: the 1290 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

const probe = async (light) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async () => { await window.__sentinelStates.find(x => x.name === 'client').run(); }); } catch (e) {}
  await p.waitForTimeout(1200);
  const v = await p.evaluate(() => { const tok = getComputedStyle(document.querySelector('.crji-card') || document.body).getPropertyValue('--crji-tile').trim();
    return { theme: document.documentElement.getAttribute('data-theme'), tok, tiles: [...document.querySelectorAll('#projectView .crji-nums>span')].filter(e => e.getBoundingClientRect().height).map(e => { const k = getComputedStyle(e); return { sh: k.boxShadow, bw: k.borderTopWidth, bg: k.backgroundColor }; }), bar: [...(document.querySelector('#projectView .crji-card.v2 .crji-bar') ? document.querySelectorAll('#projectView .crji-card.v2 .crji-bar') : (() => { const c = document.querySelector('#projectView .crji-card.v2'); if (!c) return []; const b = document.createElement('div'); b.className = 'crji-bar'; c.appendChild(b); return [b]; })())].filter(e => e.getBoundingClientRect().height).map(e => { const k = getComputedStyle(e); return { sh: k.boxShadow, bg: k.backgroundColor }; }) }; });
  await ctx.close(); return v; };
const hex = h => { const m = h.replace('#', ''); return `rgb(${parseInt(m.slice(0, 2), 16)}, ${parseInt(m.slice(2, 4), 16)}, ${parseInt(m.slice(4, 6), 16)})`; };
for (const light of [false, true]) { const r = await probe(light); const nm = light ? 'B  light' : 'A  dark';
  /* 1318 (Theo's pick "2"): the tiles became one paid bar. The rule carried over — flat, no shadow, on --crji-tile. */
  if (!r.tiles.length && r.bar.length) { ok(r.bar.every(t => t.sh === 'none' && (!r.tok || t.bg === hex(r.tok))), nm + ': the v2 paid bar is flat, ground on its token', JSON.stringify({ tok: r.tok, b: r.bar[0] })); continue; }
  ok(r.tiles.length === 3 && r.tiles.every(t => t.sh === 'none' && t.bw === '1px' && (!r.tok || t.bg === hex(r.tok))), nm + ': the three billing tiles are flat with an outline, ground on its token', JSON.stringify({ tok: r.tok, t: r.tiles[0], n: r.tiles.length })); }
await browser.close(); console.log(`GATE 1291 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
