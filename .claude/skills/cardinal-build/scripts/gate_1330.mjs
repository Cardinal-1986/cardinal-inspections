/* gate_1330 — one way to make an estimate (Theo's pick C).
 *   A  "From a template" → Roofing opens the BUILDER with the Owens Corning Preferred line at $525,
 *      and no old fill-in form document is created
 *   B  → Gutters opens the builder's Library at Gutters (5" vs 6" is a choice)
 *   C  an old-form estimate with one priced line: the saved page marks the 11 unpriced lines and
 *      carries the rule that hides them; the editor still shows every line
 *   D  an old-form estimate with nothing priced keeps every line (a blank to print and hand-fill)
 *   E  printing marks the 11 unpriced lines for the print rule, and restorePrintMarks clears them
 * Arg: [index.html] -> negative control (1329: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 180000);
const BODY = n => '<!DOCTYPE html><html><head><title>' + n + '</title></head><body><h1>Estimate ' + n + '</h1>' +
  '<table class="items"><tr><td>Roof replacement</td><td>$5,000.00</td></tr></table>' + '<p>' + 'x'.repeat(4000) + '</p></body></html>';
const P = { id: 'p1', name: 'Client One', stage: 'Prospect', address: '1 Main St', phone: '9375550100', email: 'c@example.com',
  checklist: '{}', created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() };
const D = id => ({ id, project_id: 'p1', title: 'EST-2026-09' + id + ' — Estimate — Client One', total: 5000, html: BODY(id), status: 'sent',
  created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P], inspection_reports: [],
  estimate_line_items: [
    { id: 'oc', name: 'Owens Corning Preferred Roofing System', description: 'Remove existing layers', default_price: 525, category: 'Roofing', unit: 'SQ', active: true, sort_order: 1 },
    { id: 'ds', name: 'DECRA Stone-Coated Steel Roofing System', description: 'd', default_price: 1500, category: 'Roofing', unit: 'SQ', active: true, sort_order: 2 },
    { id: 'g5', name: '5" K-Style Seamless Gutters & Downspouts', description: 'd', default_price: 0, category: 'Gutters', unit: 'LF', active: true, sort_order: 3 },
    { id: 'g6', name: '6" K-Style Seamless Gutters & Downspouts', description: 'd', default_price: 0, category: 'Gutters', unit: 'LF', active: true, sort_order: 4 }],
  document_versions: [], collections: [], owner_reviews: [], estimates: [], insurance_claims: [],
  appointments: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.on('dialog', d => d.accept());
await page.route('**/*', async route => {
  const url = route.request().url(); const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await waitAppReady(page);
await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
await page.waitForTimeout(900);
await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
await page.waitForTimeout(500); await settle(page);



const menu = (kind) => page.evaluate(async kind => {
  const n0 = (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'insert').length;
  try { document.getElementById('cr-est-picker') && document.getElementById('cr-est-picker').classList.remove('open'); } catch (_) {}
  try { window.CardinalEstimates.close(); } catch (_) {}
  try { currentProject = (window.cacheProjects || []).find(p => p.id === 'p1') || { id: 'p1', name: 'Client One' }; } catch (e) { return { err: 'currentProject: ' + e }; }
  const o = document.querySelector('#pEstMenu .estopt[data-tpl="' + kind + '"]'); if (!o) return { err: 'no menu option' };
  o.click();
  await new Promise(r => setTimeout(r, 1600));
  const v = document.getElementById('cr-est-view');
  const st = window.CardinalEstimates && window.CardinalEstimates.currentState ? window.CardinalEstimates.currentState() : null;
  const pk = document.getElementById('cr-est-picker');
  const n1 = (window.__WRITES__ || []).filter(w => w.table === 'inspection_reports' && w.op === 'insert').length;
  return { builder: !!(v && v.classList.contains('open')), lines: st ? st.line_items.map(l => l.name + '@' + l.unit_price) : null,
    picker: !!(pk && pk.classList.contains('open')), query: pk ? (pk.querySelector('.box-search input') || {}).value : null,
    pitems: pk ? [...pk.querySelectorAll('.p-item')].map(x => x.textContent.trim().slice(0, 12)) : [], formDocs: n1 - n0 };
}, kind);

const A = await menu('roof');
ok(!A.err && A.builder && A.lines && A.lines.length === 1 && /Owens Corning Preferred/.test(A.lines[0]) && /@525$/.test(A.lines[0]) && A.formDocs === 0,
  'A  Roofing opens the builder with the OC Preferred line at $525, no old form made', JSON.stringify(A));
const B = await menu('gutters');
ok(!B.err && B.builder && B.picker && B.query === 'Gutters' && B.pitems.length === 2, 'B  Gutters opens the Library at Gutters', JSON.stringify(B));

/* C–E: an old-form estimate document */
const oldForm = (priced) => page.evaluate(async priced => {
  try { window.CardinalEstimates.close(); } catch (_) {}
  try { document.getElementById('cr-est-picker') && document.getElementById('cr-est-picker').classList.remove('open'); } catch (_) {}
  let html = ESTIMATE_TEMPLATE;
  if (priced) {
    html = html.replace('<span class="ph" data-rq="squares">[28.5]</span>', '18')
               .replace('<td class="rate"><span class="ph">[0.00]</span></td>', '<td class="rate">535.00</td>');
  }
  const id = await db.create('Estimate — Client One' + (priced ? '' : ' blank'), html, 'Client One', 'p1');
  await reload(); await openEditor(id); await new Promise(r => setTimeout(r, 1500));
  const fd = document.getElementById('reportFrame').contentDocument;
  const rows = [...fd.querySelectorAll('#estItems tr.li')];
  const n0 = (window.__WRITES__ || []).length;
  try { __histLock = true; } catch (_) {}
  await saveCurrent();
  try { __histLock = false; } catch (_) {}
  const w = (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'inspection_reports' && x.payload && typeof x.payload.html === 'string').pop();
  const saved = w ? w.payload.html : '';
  const marked = (saved.match(/<tr class="li"[^>]*data-unpriced="1"/g) || []).length;
  const visible = rows.filter(r => fd.defaultView.getComputedStyle(r).display !== 'none').length;
  /* the client's view of the saved page */
  const cd = new DOMParser().parseFromString(saved, 'text/html');
  const ifr = document.createElement('iframe'); ifr.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px'; document.body.appendChild(ifr);
  ifr.srcdoc = saved; await new Promise(r => { ifr.onload = r; setTimeout(r, 1500); });
  const crow = [...ifr.contentDocument.querySelectorAll('#estItems tr.li')];
  const clientShown = crow.filter(r => ifr.contentWindow.getComputedStyle(r).display !== 'none').length;
  ifr.remove();
  let printMarked = -1, afterRestore = -1;
  try { compactForPrint(fd); printMarked = fd.querySelectorAll('#estItems tr.li[data-emptyrow]').length; restorePrintMarks(fd); afterRestore = fd.querySelectorAll('#estItems tr.li[data-emptyrow]').length; } catch (e) { printMarked = 'err ' + e; }
  return { rows: rows.length, marked, css: /crUnpricedCss/.test(saved), visible, clientShown, printMarked, afterRestore };
}, priced);

const C = await oldForm(true);
ok(C.rows === 12 && C.marked === 11 && C.css && C.visible === 12 && C.clientShown === 1,
  'C  priced old form: saved page hides the 11 unpriced lines; the editor shows all 12', JSON.stringify(C));
ok(C.printMarked === 11 && C.afterRestore === 0, 'E  print marks the 11 unpriced lines, and restores them after', JSON.stringify(C));
const Dn = await oldForm(false);
ok(Dn.rows === 12 && Dn.marked === 0 && !Dn.css && Dn.clientShown === 12 && Dn.printMarked === 0, 'D  nothing priced: every line stays (a blank to hand-fill)', JSON.stringify(Dn));

await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1330: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
