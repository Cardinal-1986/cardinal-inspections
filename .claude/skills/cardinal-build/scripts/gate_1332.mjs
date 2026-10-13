/* gate_1332 — several PDFs at once (Theo: "allow us to upload more than one pdf at a time").
 *   A  Measurements: two PDFs picked together → two reports filed
 *   B  Insurance documents: two files picked together → two documents filed
 *   C  Work orders: the upload takes several, and stores each
 *   D  every one-file door still works with one file (no regression)
 * Arg: [index.html] -> negative control (1331: must go RED, not crash). */
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
  projects: [P('r1', 'Roofing')],
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


const pdf = n => ({ name: n, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%' + n + '\n%%EOF') });
const writes = page => page.evaluate(() => (window.__WRITES__ || []).map(w => ({ t: w.table, op: w.op, title: w.payload && (w.payload.title || (w.payload[0] || {}).title), name: w.payload && (w.payload.name || (w.payload[0] || {}).name) })));
const { ctx, page } = await boot('theo@cardinalrenovations.net');
await page.evaluate(() => { try { currentProject = cacheProjects.find(p => p.id === 'r1'); } catch (e) {} });

/* A — measurements */
let A;
try {
  const multi = await page.evaluate(() => document.getElementById('msFileInput').multiple);
  const n0 = (await writes(page)).length;
  await page.evaluate(() => { try { __msUpSrc = 'Field'; } catch (_) {} });
  await page.setInputFiles('#msFileInput', [pdf('a.pdf'), pdf('b.pdf')]);
  await page.waitForTimeout(1500);
  const w = (await writes(page)).slice(n0).filter(x => x.t === 'meas_docs' && x.op === 'insert');
  A = { multi, filed: w.length };
} catch (e) { A = { err: String(e).slice(0, 200) }; }
ok(A.multi === true && A.filed === 2, 'A  Measurements: two PDFs at once → two reports filed', JSON.stringify(A));

/* B — insurance documents */
let B;
try {
  const multi = await page.evaluate(() => document.getElementById('insDocFileInput').multiple);
  const n0 = (await writes(page)).length;
  await page.evaluate(() => { pickAndUploadInsDoc('estimate'); });
  await page.setInputFiles('#insDocFileInput', [pdf('est1.pdf'), pdf('est2.pdf')]);
  await page.waitForTimeout(1800);
  const w = (await writes(page)).slice(n0).filter(x => x.t === 'inspection_reports' && x.op === 'insert' && /^Insurance Doc \[estimate\]/.test(x.title || ''));
  B = { multi, filed: w.length, titles: w.map(x => x.title) };
} catch (e) { B = { err: String(e).slice(0, 200) }; }
ok(B.multi === true && B.filed === 2, 'B  Insurance documents: two files at once → two documents filed', JSON.stringify(B));

/* C — work orders: the markup takes several, and the handler stores each (the section is
   community-only, so this reads the shipped handler rather than staging a partner job) */
const C = (() => {
  const i = APP_HTML.indexOf("'<input type=\"file\" data-wo-file"); const seg = APP_HTML.slice(i, i + 4000);
  return { multiple: /data-wo-file multiple/.test(seg.slice(0, 80)), loops: /for\(var wi = 0; wi < list\.length; wi\+\+\)\{\s*try\{ await uploadFile\(list\[wi\]\); \}/.test(seg) };
})();
ok(C.multiple && C.loops, 'C  Work orders: the upload takes several and stores each', JSON.stringify(C));

/* D — one file still files once, in both doors */
let D;
try {
  const n0 = (await writes(page)).length;
  await page.evaluate(() => { try { __msUpSrc = 'Field'; } catch (_) {} });
  await page.setInputFiles('#msFileInput', [pdf('one.pdf')]);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { pickAndUploadInsDoc('estimate'); });
  await page.setInputFiles('#insDocFileInput', [pdf('one-ins.pdf')]);
  await page.waitForTimeout(1500);
  const w = (await writes(page)).slice(n0);
  D = { meas: w.filter(x => x.t === 'meas_docs' && x.op === 'insert').length, ins: w.filter(x => x.t === 'inspection_reports' && x.op === 'insert' && /^Insurance Doc/.test(x.title || '')).length };
} catch (e) { D = { err: String(e).slice(0, 200) }; }
ok(D.meas === 1 && D.ins === 1, 'D  one file still files exactly once in each door', JSON.stringify(D));
await ctx.close();
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1332: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
