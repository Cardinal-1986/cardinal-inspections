/* gate_1333 — every crew can be booked from the dispatch board (Theo: "tried to pick Santiago, he
 * can't be selected. Only Beto").
 *   A  nothing armed: quiet roofing crews still fold (the board stays short) — 1 row + "4 idle"
 *   B  a Needs-a-crew job armed: all 5 roofing crews have a row of day squares, Santiago included
 *   C  tapping a day on Santiago's row opens the work order with Santiago preset
 * Arg: [index.html] -> negative control (1332: must go RED on B/C, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
const ck = wt => JSON.stringify({ work_type: wt, lead: { work_type: wt } });
const P = (id, wt, stage) => ({ id, name: 'Client ' + id, stage: stage || 'Scheduled', address: '1 Main St', phone: '9375550100', email: 'c@example.com',
  checklist: ck(wt), sales_rep: 'jacob@cardinalrenovations.net', created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() });
const ROOF = ['Before','Tear-off','Wood replaced','Ice & water','Flashing','Ridge / vents','Finished roof','Yard + magnet'];
const PH = (pid, slots, noNote) => slots.map((l, i) => ({ id: pid + 'ph' + i, project_id: pid, data: 'data:image/png;base64,iVBORw0KGgo=', storage_path: null,
  section: 'Install \u00b7 ' + l, caption: (l === 'Wood replaced' || l === 'Flashing') ? (noNote && l === 'Wood replaced' ? '' : '4 sheets OSB') : null, created_at: '2026-10-13T12:00:00Z' }));
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
                  { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' }],
  projects: [P('r1', 'Roofing', 'Scheduled')],
  crews: [['c1','Alberto Campuzano Rutledge'],['c2','Daniel Sarceno'],['c3','Diego Hernandez'],['c4','Felipe'],['c5','Santiago Gutierrez']]
    .map(([id, name]) => ({ id, name, trade: 'Roofing', archived: false, created_at: '2026-08-01T12:00:00Z' })),
  crew_work_orders: [],
  project_photos: [], meas_docs: [],
  inspection_reports: [], document_versions: [], collections: [], owner_reviews: [], estimates: [], insurance_claims: [],
  appointments: [], commissions: [], contracts: [], punch_items: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); page.on('dialog', d => { (globalThis.__DLG__ = globalThis.__DLG__ || []).push(d.type() + ':' + d.message().slice(0, 60)); d.type() === 'prompt' ? d.accept('client@example.com') : d.accept(); });
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
  await page.addInitScript(([seed, as, light]) => {
    window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await page.waitForTimeout(500); await settle(page);
  return { ctx, page };
}


const { ctx, page } = await boot('curtis@cardinalrenovations.net');
const rows = () => page.evaluate(() => [...document.querySelectorAll('.dlane .crewc .cn')].map(e => e.textContent.trim()));
let A, B, C;
try {
  await page.evaluate(() => window.CardinalDispatch.open());
  await page.waitForTimeout(1500);
  A = { rows: await rows(), idle: await page.evaluate(() => { const i = document.querySelector('[data-idle="Roofing"]'); return i ? i.textContent.trim() : ''; }) };
  await page.evaluate(() => { const c = document.querySelector('.uch[data-pid="r1"]'); if (c) c.click(); });
  await page.waitForTimeout(700);
  B = { rows: await rows(), armed: await page.evaluate(() => !!document.querySelector('.uch.armed')) };
  const n0 = await page.evaluate(() => { window.__WOP__ = null; const o = window.openWorkOrderPicker; window.openWorkOrderPicker = function (p, preset) { window.__WOP__ = { pid: p && p.id, preset }; }; return 1; });
  await page.evaluate(() => {
    const lane = [...document.querySelectorAll('.dlane')].find(l => /Santiago/.test(l.textContent));
    const cell = lane && [...lane.querySelectorAll('.dcell')].find(c => !c.classList.contains('sun'));
    if (cell) cell.click();
  });
  await page.waitForTimeout(700);
  C = await page.evaluate(() => window.__WOP__);
} catch (e) { A = A || { err: String(e).slice(0, 200) }; }
ok(A && A.rows && A.rows.filter(r => /Alberto|Daniel|Diego|Felipe|Santiago/.test(r)).length === 1 && /4 idle roofing crews/.test(A.idle || ''),
  'A  nothing armed: quiet crews still fold (1 row + "4 idle roofing crews")', JSON.stringify(A));
ok(B && B.armed && ['Alberto','Daniel','Diego','Felipe','Santiago'].every(n => B.rows.some(r => r.indexOf(n) >= 0)),
  'B  a job armed: all 5 roofing crews have a row to tap, Santiago included', JSON.stringify(B));
ok(C && C.pid === 'r1' && C.preset && C.preset.crew_id === 'c5', 'C  tapping a day on Santiago’s row opens the work order with Santiago preset', JSON.stringify(C));
await ctx.close();
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1333: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
