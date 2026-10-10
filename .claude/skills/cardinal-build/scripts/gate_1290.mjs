#!/usr/bin/env node
/* gate_1290 — light mode in the drawer's style (the light twin of 1283–1289).
     A  light home: header ground flat white, no Georgia/monospace on the page
     B  light client page: client card, money, Job Menu tiles, sections all flat
        (no gradient, no drop shadow)
     C  light client page: no Georgia or monospace text
     D  light Leads: flat white lead cards, Segoe title
     E  dark is unchanged: the 1286 client-card ground is still #0F1521
   Usage: node gate_1290.mjs [index.html] — control: the 1289 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const SEL = ['.projinfo', '.dbmoney', '.dbrow', '.acxsec:not(.rvsec)', '.jabox', '.kpsec', '.crji-card', '.rvcard'];
const probe = async (light, state) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  try { await p.evaluate(async (s) => { await window.__sentinelStates.find(x => x.name === s).run(); }, state); } catch (e) {}
  await p.waitForTimeout(1200);
  const v = await p.evaluate((SEL) => {
    const odd = (R) => { const o = []; if (!R) return o; for (const e of R.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width) continue; if (e.closest('#cr-lnav')) continue; if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const f = getComputedStyle(e).fontFamily.split(',')[0]; if (/Georgia|monospace/i.test(f)) o.push(String(e.className).slice(0, 30) + ':' + f); } return o; };
    const hd = document.querySelector('header.site'); const hk = hd && getComputedStyle(hd);
    const PV = document.getElementById('projectView'); const boxes = [];
    if (PV) for (const s of SEL) for (const e of PV.querySelectorAll(s)) { if (!e.getBoundingClientRect().height) continue; const k = getComputedStyle(e); boxes.push({ s, bg: k.backgroundColor, grad: /gradient/.test(k.backgroundImage), sh: k.boxShadow !== 'none' }); }
    const pi = PV && PV.querySelector('.projinfo'); const pk = pi && getComputedStyle(pi);
    const LV = document.getElementById('leadsView'); const lj = LV ? [...LV.querySelectorAll('.ljcard')].filter(e => e.getBoundingClientRect().height).map(e => { const k = getComputedStyle(e); return { bg: k.backgroundColor, sh: k.boxShadow }; }) : [];
    const lt = LV && LV.querySelector('h1,h2,.viewhead'); 
    return { theme: document.documentElement.getAttribute('data-theme'), head: hk && { bgi: hk.backgroundImage, bg: hk.backgroundColor },
      oddMain: odd(document.getElementById('mainView')), oddPV: odd(PV), boxes, spine: pk && pk.borderLeftColor, piBg: pk && pk.backgroundColor, lj, ltF: lt && getComputedStyle(lt).fontFamily };
  }, SEL); await ctx.close(); return v; };
const h = await probe(true, 'home'), c = await probe(true, 'client'), l = await probe(true, 'leads'), d = await probe(false, 'client');
ok(h.theme === 'rb-light' && h.head && !/gradient/.test(h.head.bgi) && h.oddMain.length === 0, 'A  light home: flat header, no Georgia/monospace', JSON.stringify({ bgi: h.head && h.head.bgi.slice(0, 40), odd: h.oddMain.slice(0, 4) }));
const bad = c.boxes.filter(b => b.grad || b.sh);
ok(c.boxes.length >= 15 && bad.length === 0, 'B  light client: client card, money, Job Menu and sections are flat', `${c.boxes.length} boxes, ${bad.length} glossy: ${[...new Set(bad.map(b => b.s))].join(', ')}`);
ok(c.oddPV.length === 0, 'C  light client: no Georgia or monospace text', c.oddPV.slice(0, 5).join(', ') || 'none');
ok(l.lj.length > 0 && l.lj.every(b => b.bg === 'rgb(255, 255, 255)' && b.sh === 'none') && /Segoe UI/.test(String(l.ltF)), 'D  light Leads: flat white cards, Segoe title', JSON.stringify({ card: l.lj[0], f: l.ltF }));
ok(d.theme !== 'rb-light' && d.piBg === 'rgb(15, 21, 33)', 'E  dark: client card ground unchanged (#0F1521)', d.piBg);
await browser.close(); console.log(`GATE 1290 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
