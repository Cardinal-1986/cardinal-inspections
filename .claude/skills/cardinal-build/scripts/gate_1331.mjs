/* gate_1331 — install photos are required to mark a job Completed (Theo's 3A + 3.2B).
 *   A  Curtis, roofing job with no install photos: Completed is refused, the stage is not written,
 *      and the install sheet opens with all 8 slots
 *   B  a repair job has no set: Completed goes through
 *   C  all 8 photos with notes on Wood replaced + Flashing: Completed goes through
 *   D  all 8 photos but Wood replaced has no note: refused (3.2B)
 *   E  Theo can complete it anyway after saying why: stage written, an owner_reviews row records it
 *   F  on the sheet: Before saves straight away as "Install · Before"; Wood replaced will not save
 *      without its note, and saves with it as the caption
 * Arg: [index.html] -> negative control (1330: must go RED, not crash). */
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
  projects: [P('r1', 'Roofing'), P('rp', 'Repair'), P('r3', 'Roofing'), P('r4', 'Roofing'), P('r5', 'Roofing'), P('r6', 'Roofing')],
  project_photos: [].concat(PH('r3', ROOF), PH('r4', ROOF, true)),
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


const stageTry = (page, id) => page.evaluate(async id => {
  const n0 = (window.__WRITES__ || []).length;
  let ret; try { ret = await setStage(id, 'Completed'); } catch (e) { ret = 'throw ' + e; }
  await new Promise(r => setTimeout(r, 300));
  const w = (window.__WRITES__ || []).slice(n0);
  const sheet = document.getElementById('cr-inst-sheet');
  return { ret: String(ret), wroteStage: w.some(x => x.table === 'projects' && x.payload && x.payload.stage === 'Completed'),
    orv: w.filter(x => x.table === 'owner_reviews').map(x => (x.payload && (x.payload.reason || (x.payload[0] || {}).reason)) || ''),
    sheetOpen: !!(sheet && sheet.classList.contains('open')), slots: sheet ? sheet.querySelectorAll('[data-in-slot]').length : 0 };
}, id);
const closeSheet = page => page.evaluate(() => { try { window.CardinalInstall.close(); } catch (_) {} });

{ const { ctx, page } = await boot('curtis@cardinalrenovations.net');
  const A = await stageTry(page, 'r1');
  ok(!A.wroteStage && A.sheetOpen && A.slots === 8, 'A  Curtis: no install photos → Completed refused, sheet opens with 8 slots', JSON.stringify(A));
  await closeSheet(page);
  const B = await stageTry(page, 'rp');
  ok(B.wroteStage, 'B  a repair job has no set → Completed goes through', JSON.stringify(B));
  const C = await stageTry(page, 'r3');
  ok(C.wroteStage, 'C  all 8 photos + both notes → Completed goes through', JSON.stringify(C));
  await closeSheet(page);
  const D = await stageTry(page, 'r4');
  ok(!D.wroteStage, 'D  all 8 photos but Wood replaced has no note → refused', JSON.stringify(D));
  await closeSheet(page);

  /* F — the sheet itself */
  const F = await (async () => {
    try {
      await page.evaluate(() => window.CardinalInstall.open(cacheProjects.find(p => p.id === 'r6')));
      await page.waitForTimeout(500);
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
      const shoot = async i => {
        const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.click('#cr-inst-sheet [data-in-slot="' + i + '"]')]);
        await fc.setFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
        await page.waitForTimeout(900);
      };
      const n0 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await shoot(0);
      const afterBefore = await page.evaluate(n0 => (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'project_photos').map(x => x.payload && (x.payload.section || (x.payload[0] || {}).section)), n0);
      const why0 = await page.evaluate(() => document.getElementById('inWhy').textContent);
      if (!afterBefore.length) return { err: 'Before did not save; sheet says: ' + why0 };
      await shoot(2);
      const paneShown = await page.evaluate(() => !document.getElementById('inPane').hidden);
      const n1 = await page.evaluate(() => (window.__WRITES__ || []).length);
      await page.click('#inSave'); await page.waitForTimeout(400);
      const refused = await page.evaluate(n1 => (window.__WRITES__ || []).slice(n1).filter(x => x.table === 'project_photos').length === 0, n1);
      await page.fill('#inNote', '4 sheets OSB by the chimney');
      await page.click('#inSave'); await page.waitForTimeout(900);
      const wood = await page.evaluate(n1 => (window.__WRITES__ || []).slice(n1).filter(x => x.table === 'project_photos').map(x => { const p = x.payload && (x.payload.section ? x.payload : x.payload[0]); return p.section + '|' + p.caption; }), n1);
      return { afterBefore, paneShown, refused, wood };
    } catch (e) { return { err: String(e).slice(0, 900) }; }
  })();
  ok(!F.err && F.afterBefore && F.afterBefore.length === 1 && F.afterBefore[0] === 'Install · Before', 'F1 Before saves straight away as "Install · Before"', JSON.stringify(F));
  ok(!F.err && F.paneShown && F.refused && F.wood && F.wood.length === 1 && F.wood[0] === 'Install · Wood replaced|4 sheets OSB by the chimney',
    'F2 Wood replaced asks for its note, refuses without it, saves it as the caption', JSON.stringify(F));
  await ctx.close(); }

{ const { ctx, page } = await boot('theo@cardinalrenovations.net');
  page.removeAllListeners('dialog');
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('Crew phone died; photos are in CompanyCam') : d.accept());
  const p = stageTry(page, 'r5');
  /* crAsk: tap its go button */
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    const did = await page.evaluate(() => { const b = [...document.querySelectorAll('.askgo')].find(x => x.offsetParent !== null); if (b) { b.click(); return true; } return false; });
    if (did) break;
  }
  const E = await p;
  ok(E.wroteStage && E.orv.length === 1 && /^Completed without install photos: Crew phone died/.test(E.orv[0]), 'E  Theo completes it anyway with a reason → stage written + Owner Review row', JSON.stringify(E));
  await ctx.close(); }

await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1331: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
