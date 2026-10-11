#!/usr/bin/env node
/* gate_1308 — on Leads & Jobs a Prospect's stripe AND badge are orange (1307 + 1308).
     A  a rendered Prospect card's spine is #ff7a00 and a Lead card's is still #FFE600
     B  the two stripes are far apart (not two yellows): hue differs by >= 25 degrees
     C  every other stage's spine is unchanged
     D  (1308) the P badge is the stripe's #ff7a00 and its letter clears 4.5:1 on it
   Usage: node gate_1307.mjs [index.html] — control: the 1307 tree (D RED) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 180000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3200);
const r = await p.evaluate(async () => {
  try { await window.__sentinelStates.find(x => x.name === 'leads').run(); } catch (e) {}
  await new Promise(z => setTimeout(z, 900));
  /* the seed carries no Prospect, so draw one card per stage with the SHIPPED ljCardHtml */
  const spn = {}, host = document.createElement('div'); document.body.appendChild(host);
  ['Lead', 'Prospect'].forEach((st, i) => { host.innerHTML = ljCardHtml({ id: 'g1307' + i, name: 'G', stage: st, checklist: '{}', address: '', phone: '', email: '' });
    const c = host.querySelector('.ljcard'); spn[st] = c ? c.style.getPropertyValue('--spn').trim() : null;
    const mc = host.querySelector('.ljmc'); if (mc && st === 'Prospect') { const cs = getComputedStyle(mc); spn._badge = cs.backgroundColor; spn._ink = cs.color; } });
  host.remove();
  return { spn, map: (typeof LJ_SPINE !== 'undefined') ? Object.assign({}, LJ_SPINE) : null };
}).catch(e => ({ err: String(e) }));
await b.close();
const hue = h => { const n = parseInt(h.replace('#', ''), 16), R = (n >> 16 & 255) / 255, G = (n >> 8 & 255) / 255, B = (n & 255) / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  if (!d) return 0; let x = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; x *= 60; return x < 0 ? x + 360 : x; };
const s = r.spn || {};
ok(s.Prospect && s.Prospect.toLowerCase() === '#ff7a00' && s.Lead && s.Lead.toUpperCase() === '#FFE600', 'A  rendered: Prospect stripe #ff7a00, Lead stripe still #FFE600', JSON.stringify(s));
ok(s.Prospect && s.Lead && Math.abs(hue(s.Prospect) - hue(s.Lead)) >= 25, 'B  the two stripes are a different colour, not two yellows', s.Prospect && s.Lead ? (Math.round(hue(s.Lead)) + '° vs ' + Math.round(hue(s.Prospect)) + '°') : '');
const WANT = { Lead:'#FFE600', OnHold:'#ff9f43', Approved:'#3dff9a', Scheduled:'#3dff9a', Completed:'#6fc3ff', Invoiced:'#c9a2ff', Closed:'#9aa4af', Lost:'#ff8a7a' };
ok(r.map && Object.keys(WANT).every(k => r.map[k] === WANT[k]), 'C  every other stage keeps its stripe', JSON.stringify(r.map));
const rgb = c => (String(c).match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = ([r, g, b2]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b2); };
const bg = rgb(s._badge || ''), fg = rgb(s._ink || ''), ratio = bg.length === 3 && fg.length === 3 ? (Math.max(lum(bg), lum(fg)) + .05) / (Math.min(lum(bg), lum(fg)) + .05) : 0;
ok(JSON.stringify(bg) === '[255,122,0]' && ratio >= 4.5, 'D  the P badge is #ff7a00 and its letter clears 4.5:1', JSON.stringify({ badge: s._badge, ink: s._ink, ratio: Math.round(ratio * 100) / 100 }));
console.log(`GATE 1308 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
