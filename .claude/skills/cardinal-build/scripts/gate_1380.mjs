/* gate_1380 — Email / Text / Call are always at the top of a retail client (Theo: "add a phone logo at the top like it
 *   was even if they don't have a number").
 *   A a client with no phone or email anywhere: all three buttons show, 44px; Call says "No phone number saved", nothing to dial
 *   B a client whose phone is only in the lead (homeowner_phone): Text and Call are live; Call's panel shows the number
 *   C a client with both on the job: unchanged — three live buttons, Email's panel shows the address
 * Arg: [index.html] -> negative control (1379: must go RED). */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP);
await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
const setup = (mode) => p.evaluate(async (mode) => {
  const pr = cacheProjects.find(x => !/insurance|community/.test(JSON.stringify(x.checklist || ''))) || cacheProjects[0];
  const ck = typeof pr.checklist === 'string' ? JSON.parse(pr.checklist || '{}') : (pr.checklist || {});
  ck.lead = Object.assign({}, ck.lead || {}, { claim_type: 'retail', phone: '', homeowner_phone: '', phones: [], email: '', emails: [] });
  if (mode === 'none') { pr.phone = ''; pr.email = ''; }
  if (mode === 'lead') { pr.phone = ''; pr.email = ''; ck.lead.homeowner_phone = '937-555-0142'; }
  if (mode === 'both') { pr.phone = '9375550101'; pr.email = 'client@example.com'; }
  pr.checklist = JSON.stringify(ck);
  try { closeProjModal && closeProjModal(); } catch (_) {}
  openProject(pr.id); await new Promise(r => setTimeout(r, 1500));
  const ic = [...document.querySelectorAll('#cr-namebar .nb-ico')];
  return ic.map(e => ({ act: e.getAttribute('data-cr-act'), off: e.classList.contains('nb-off'), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width), name: e.getAttribute('aria-label') }));
}, mode);
const pop = (act) => p.evaluate(async (act) => { const e = document.querySelector('#cr-namebar [data-cr-act="' + act + '"]'); if (!e) return null; e.click(); await new Promise(r => setTimeout(r, 200));
  const v = document.querySelector('#cr-namebar [data-cr-pop-val]'), g = document.querySelector('#cr-namebar [data-cr-pop-go]'); return { val: v && v.textContent, href: g && g.getAttribute('href') }; }, act);

let r = await setup('none');
ok(r.length === 3 && r.map(x => x.act).join() === 'email,text,call' && r.every(x => x.h >= 44 && x.w >= 44), 'A: no contact anywhere: Email, Text and Call all show, 44px', JSON.stringify(r));
const pn = await p.evaluate(async () => { const e = document.querySelector('#cr-namebar [data-cr-act="call"]'); if (!e) return 'no-button'; e.click(); await new Promise(r => setTimeout(r, 400));
  const m = document.getElementById('projModal'); return !!(m && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0); });
ok(pn === true, 'A: with no number, Call opens Edit client info to add it', pn);
try { await p.evaluate(() => { try { closeProjModal(); } catch (_) {} }); } catch (_) {}
r = await setup('lead');
ok(r.length === 3 && r.map(x => x.act).join() === 'email,text,call', 'B: phone only in the lead: all three show', JSON.stringify(r));
const pc = await pop('call');
ok(pc && /0142/.test(pc.val || '') && pc.go !== false && /^tel:\+?1?9375550142$/.test(pc.href || ''), 'B: Call\'s panel shows the lead\'s number and dials it', JSON.stringify(pc));
r = await setup('both');
ok(r.length === 3 && r.map(x => x.act).join() === 'email,text,call', 'C: both on the job: three live buttons, as before', JSON.stringify(r));
const pe = await pop('email');
ok(pe && pe.val === 'client@example.com' && pe.href === 'mailto:client@example.com', 'C: Email\'s panel unchanged', JSON.stringify(pe));
await b.close();
console.log(fail ? 'GATE 1380 RED — ' + fail + ' failing' : 'GATE 1380 GREEN');
process.exit(fail ? 1 : 0);
