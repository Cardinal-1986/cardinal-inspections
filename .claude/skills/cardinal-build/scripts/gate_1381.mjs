/* gate_1381 — My Files (Owner Console): the owner's reports, reviews and plans, owner only.
 *   A  owner: the hub shows a My Files card counting only My Files rows; the Vault card
 *      still counts only its own six categories; My Files groups rows under its category
 *      headings in order; the Vault shows none of the My Files rows
 *   B  owner: Add uploads to photos/private/<owner email>/owner-files/... and inserts ONE
 *      owner_docs row with the chosen category; the card count goes up
 *   C  Joan (admin, not owner): no My Files card, open('files') refuses, and the Vault
 *      lists only its own rows even if My Files rows were somehow returned to her
 * Arg: [index.html] -> negative control (1380 must go RED, not crash).
 * Env: PW_MODULE (playwright entry), PW_CHROMIUM (browser executable). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)) + path.sep;
const PWM = process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(/^[A-Za-z]:/.test(PWM) ? pathToFileURL(PWM).href : PWM);
const FILE = process.argv[2] || path.join(HERE, '..', '..', '..', '..', 'index.html');
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);

const D = (id, label, category, storage_path) => ({ id, label, category, storage_path, file_name: label + '.pdf', mime: 'application/pdf', size_bytes: 120000, note: null, expires_on: null, created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-18T12:00:00Z' });
const SEED = () => ({
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin', title: 'Owner' },
                  { email: 'joan@cardinalrenovations.net', name: 'Joan', role: 'admin', title: 'Office' }],
  projects: [], crews: [], crew_payments: [], bank_register: [],
  owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [], crew_docs: [], crew_notes: [],
  owner_docs: [
    D('v1', 'EIN letter', 'formation', 'owner-vault/1_ein.pdf'),
    D('v2', 'General liability', 'insurance', 'owner-vault/2_gl.pdf'),
    D('f1', 'Sales full year 2026', 'sales', 'private/theo@cardinalrenovations.net/owner-files/1_sales.pdf'),
    D('f2', 'Joey Lehman review', 'team', 'private/theo@cardinalrenovations.net/owner-files/2_joey.pdf'),
    D('f3', 'Jacob Henderson review', 'team', 'private/theo@cardinalrenovations.net/owner-files/3_jacob.pdf')
  ],
  collections: [], commissions: [], company_templates: []
});

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  -> ' + d : '')); c ? pass++ : fail++; };

async function boot(as){
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:function(){return{data:[]}}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(([seed, as]) => { window.__SEED__ = JSON.parse(JSON.stringify(seed)); if (as) window.__AS__ = { email: as, name: as.split('@')[0] }; }, [SEED(), as]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window.currentUser && window.CardinalOwner), null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  return { ctx, page };
}
const wait = (page, ms) => page.waitForTimeout(ms);
const card = (k) => { const c = document.querySelector('#cr-owner [data-area="' + k + '"]'); return c ? { t: c.querySelector('.oc-t').textContent, n: c.querySelector('.oc-n').textContent } : null; };

try {
  /* ---------- A + B: the owner ---------- */
  let { ctx, page } = await boot(null);
  await page.evaluate(async () => { await window.CardinalOwner.open(); });
  await wait(page, 1500);
  const A1 = await page.evaluate(card, 'files');
  const A1v = await page.evaluate(card, 'vault');
  ok(!!A1 && A1.t === 'My Files' && A1.n === '3', 'A1 owner hub shows My Files counting its 3 rows', JSON.stringify(A1));
  ok(!!A1v && A1v.n === '2', 'A2 the Vault card still counts only its own 2 rows', JSON.stringify(A1v));
  await page.evaluate(() => { const c = document.querySelector('#cr-owner [data-area="files"]'); if (c) c.click(); });
  await wait(page, 800);
  const A3 = await page.evaluate(() => {
    const v = document.getElementById('cr-owner'); if (!v) return null;
    return { heads: [...v.querySelectorAll('.ow-ref')].map(e => e.textContent), rows: [...v.querySelectorAll('.ow-doc .ot')].map(e => e.firstChild.textContent),
             add: !!v.querySelector('[data-act="files-add"]'), cats: [...v.querySelectorAll('#ow-files-cat option')].map(o => o.value) };
  });
  ok(!!A3 && JSON.stringify(A3.heads) === JSON.stringify(['Sales & numbers', 'Team reviews']) && A3.rows.length === 3 && A3.rows.indexOf('EIN letter') === -1,
     'A3 My Files lists its 3 rows under Sales & numbers then Team reviews, and no Vault row', JSON.stringify(A3));
  ok(!!A3 && A3.add && JSON.stringify(A3.cats) === JSON.stringify(['sales', 'team', 'coaching', 'billing', 'partners']), 'A4 the add form offers exactly the five My Files categories', JSON.stringify(A3 && A3.cats));
  const A5 = await page.evaluate(async () => {
    await window.CardinalOwner.open('vault'); await new Promise(x => setTimeout(x, 600));
    const v = document.getElementById('cr-owner');
    return { rows: [...v.querySelectorAll('.ow-doc .ot')].map(e => e.firstChild.textContent), heads: [...v.querySelectorAll('.ow-ref')].map(e => e.textContent) };
  });
  ok(A5.rows.length === 2 && A5.heads.indexOf('Team reviews') === -1, 'A5 the Vault shows only its own 2 rows', JSON.stringify(A5));

  const B = await page.evaluate(async () => {
    await window.CardinalOwner.open('files'); await new Promise(x => setTimeout(x, 600));
    const v = document.getElementById('cr-owner');
    const fi = v.querySelector('#ow-files-file'); if (!fi) return { form: false };
    const dt = new DataTransfer(); dt.items.add(new File(['%PDF-1.4 test'], 'Jacob_Growth_Plan.pdf', { type: 'application/pdf' })); fi.files = dt.files;
    v.querySelector('#ow-files-label').value = 'Jacob 90-day plan';
    v.querySelector('#ow-files-cat').value = 'coaching';
    window.__WRITES__.length = 0;
    v.querySelector('[data-act="files-add"]').click(); await new Promise(x => setTimeout(x, 900));
    const w = window.__WRITES__;
    const up = w.filter(x => x.table === 'storage:photos' && x.op === 'upload');
    const ins = w.filter(x => x.table === 'owner_docs' && x.op === 'insert');
    const p = ins[0] && (Array.isArray(ins[0].payload) ? ins[0].payload[0] : ins[0].payload);
    const v2 = document.getElementById('cr-owner');
    return { form: true, ups: up.length, path: up[0] && up[0].payload.path, ins: ins.length, cat: p && p.category, label: p && p.label,
             heads: [...v2.querySelectorAll('.ow-ref')].map(e => e.textContent) };
  });
  ok(B.form && B.ups === 1 && /^private\/theo@cardinalrenovations\.net\/owner-files\/\d+_Jacob_Growth_Plan\.pdf$/.test(B.path || ''),
     'B1 Add uploads once, into the owner\'s private folder', JSON.stringify(B));
  ok(B.ins === 1 && B.cat === 'coaching' && B.label === 'Jacob 90-day plan' && (B.heads || []).indexOf('Coaching & training') !== -1,
     'B2 one owner_docs row with the chosen category, and it shows under Coaching & training', JSON.stringify(B));
  await page.evaluate(async () => { await window.CardinalOwner.open(); }); await wait(page, 600);
  const B3 = await page.evaluate(card, 'files');
  ok(!!B3 && B3.n === '4', 'B3 the My Files card now counts 4', JSON.stringify(B3));
  await ctx.close();

  /* ---------- C: Joan ---------- */
  ({ ctx, page } = await boot('joan@cardinalrenovations.net'));
  const C = await page.evaluate(async () => {
    await window.CardinalOwner.open(); await new Promise(x => setTimeout(x, 1200));
    const hasCard = !!document.querySelector('#cr-owner [data-area="files"]');
    const vaultN = (document.querySelector('#cr-owner [data-area="vault"] .oc-n') || {}).textContent;
    await window.CardinalOwner.open('files'); await new Promise(x => setTimeout(x, 600));
    const v = document.getElementById('cr-owner');
    const filesForm = !!(v && v.querySelector('[data-act="files-add"]'));
    await window.CardinalOwner.open('vault'); await new Promise(x => setTimeout(x, 600));
    const rows = [...document.querySelectorAll('#cr-owner .ow-doc .ot')].map(e => e.firstChild.textContent);
    return { hasCard, vaultN, filesForm, rows };
  });
  ok(C.hasCard === false && C.filesForm === false, 'C1 Joan (admin, not owner): no My Files card and the area refuses', JSON.stringify(C));
  ok(C.vaultN === '2' && C.rows.length === 2 && C.rows.indexOf('Joey Lehman review') === -1, 'C2 Joan\'s Vault lists only its own rows', JSON.stringify(C));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 400)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' - gate_1381: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
