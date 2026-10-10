#!/usr/bin/env node
/* gate_1288 — Leads, Punch, AR and Crews cards in the drawer's style, dark retail.
     A  dark: lead cards and punch cards are flat (no gradient, no drop shadow)
     B  dark: AR's cards/buttons and the Crews cards carry no drop shadow
     C  light: the lead card is still its white light-mode card
   Usage: node gate_1288.mjs [index.html] — control: the 1287 tree (RED, no crash) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 300000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const boot = async (light) => { const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500); return { ctx, p }; };
const look = (p, state, sel) => p.evaluate(async ([state, sel]) => { try { await window.__sentinelStates.find(x => x.name === state).run(); } catch (e) { return { err: String(e) }; }
  await new Promise(r => setTimeout(r, 900)); return [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().height > 30).map(e => { const k = getComputedStyle(e); return { grad: /gradient/.test(k.backgroundImage), sh: k.boxShadow !== 'none', bg: k.backgroundColor }; }); }, [state, sel]);
const { ctx, p } = await boot(false);
const leads = await look(p, 'leads', '#ljList .ljcard'), punch = await look(p, 'punch', '#punchView .pu-card, .pu-hero .pu-card');
ok(Array.isArray(leads) && leads.length > 0 && Array.isArray(punch) && punch.length > 0 && [...leads, ...punch].every(b => !b.grad && !b.sh), 'A  dark: lead and punch cards are flat', JSON.stringify({ leads: leads.length, punch: punch.length, glossy: [...(leads || []), ...(punch || [])].filter(b => b.grad || b.sh).length }));
const ar = await look(p, 'ar', '#cr-ar-view .crar-btn:not(.primary), #cr-ar-view .crar-empty'), crews = await look(p, 'crews', '#crewsView .crw-card');
ok(Array.isArray(ar) && ar.length > 0 && Array.isArray(crews) && crews.length > 0 && [...ar, ...crews].every(b => !b.sh), 'B  dark: AR and Crews cards carry no drop shadow', JSON.stringify({ ar: ar.length, crews: crews.length, shadowed: [...(ar || []), ...(crews || [])].filter(b => b.sh).length }));
await ctx.close();
const L = await boot(true); const ll = await look(L.p, 'leads', '#ljList .ljcard');
ok(Array.isArray(ll) && ll.length > 0 && ll.every(b => b.bg === 'rgb(255, 255, 255)'), 'C  light: the lead card is still white', JSON.stringify(ll && ll[0]));
await L.ctx.close(); await browser.close();
console.log(`\nGATE 1288 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
