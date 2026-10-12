/* gate_1323 — a change order, written and signed on the phone (Theo's pick 2B: photo required).
 *   A  the client page has a Change order tile, and it opens the sheet
 *   B  Homeowner signs stays OFF with a price and no photo, and with a photo and no price
 *   C  photo + price: signing opens the app's one pad (lifted above the sheet); applying it saves a
 *      "Change Order — <client>" document with total + signed_at, and the photo goes to the job
 *   D  the job value grows by the change order: $20,000 contract -> $25,350
 *   E  server: the pay link asks for it ($20k + $5,350 − $5k paid = $20,350.00); an UNSIGNED one is ignored
 *   F  remind.js and owedOn add it too; owedOn still byte-identical in pay.js / share.js
 * Arg: [repo root] -> negative control (1322 tree: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const ROOT = (process.argv[2] || '/home/user/cardinal-inspections').replace(/\/$/, '') + '/';
const APP_HTML = fs.readFileSync(ROOT + 'index.html', 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const today = new Date().toISOString().slice(0, 10);
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [{ id: 'j1', name: 'Dana Test', stage: 'Scheduled', address: '1 Main St', phone: '', email: '', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  inspection_reports: [{ id: 'c1', project_id: 'j1', title: 'Contract — Dana Test', total: 20000, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }],
  collections: [], photos: [], document_versions: [], owner_reviews: [],
  appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };

async function boot(as, light){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: 'Curtis' };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  return { ctx, page };
}


function stubFetch(o){
  globalThis.fetch = async (url) => {
    const u = String(url); const j = b => ({ ok: true, status: 200, json: async () => b });
    if (u.includes('share_token=eq.')) return j([{ id: 'inv1', project_id: 'j1', project: 'Dana Test', html: o.html || '<html><body><p>Invoice</p></body></html>', title: 'Invoice — Dana Test', total: o.invTotal == null ? 20000 : o.invTotal, signed_at: null }]);
    if (u.includes('/collections')) return j([{ amount: 5000 }]);
    if (u.includes('/inspection_reports?project_id')) return j(o.docs);
    if (u.includes('/contracts?project_id')) return j(o.table || []);
    if (u.includes('/projects?id=eq.')) return j([{ checklist: JSON.stringify(o.ck || {}) }]);
    return j([]);
  };
}
async function shareBar(o){
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'; stubFetch(o);
  const mod = await import(ROOT + 'api/share.js?v=' + Math.random());
  let body = ''; await mod.default({ query: { t: 'aaaaaaaa-bbbb-cccc-dddd-000000000001' }, headers: {} }, { status() { return this; }, setHeader() {}, send(b) { body = b; }, end(b) { body = b || body; } });
  const i = body.indexOf('id="crPayBar"'); if (i < 0) return 'no bar';
  return (body.slice(i, i + 3000).match(/\$[\d,]+\.\d\d/) || ['no amount'])[0];
}
try {
  const { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { showMain(currentUser.email); } catch (e) {} });
  await page.waitForTimeout(900);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  await settle(page);
  const A = await page.evaluate(async () => {
    openProject('j1'); await new Promise(r => setTimeout(r, 1400));
    const t = document.querySelector('[data-jm="changeorder"]'); if (t) t.click();
    await new Promise(r => setTimeout(r, 500));
    const m = document.getElementById('cr-co-sheet');
    return { tile: !!t, open: !!m && m.classList.contains('open') && getComputedStyle(m).display === 'block', before: (window.jobFinance && jobFinance(cacheProjects.find(p => p.id === 'j1')).value) || null };
  });
  ok(A.tile && A.open, 'A  the client page has a Change order tile and it opens the sheet', JSON.stringify(A));
  const B = await page.evaluate(async () => {
    const q = id => document.getElementById(id), sign = () => { const b = q('coSign'); return b ? b.disabled : null; };
    const d = document.querySelector('[data-co-desc="0"]'), a = document.querySelector('[data-co-amt="0"]');
    if (d) { d.value = 'Soffit build-out, front gable'; d.dispatchEvent(new Event('input', { bubbles: true })); }
    if (a) { a.value = '4500'; a.dispatchEvent(new Event('input', { bubbles: true })); }
    const noPhoto = sign(), why = (q('coWhy') || {}).textContent || '';
    const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#a33'; g.fillRect(0, 0, 40, 30);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const fi = q('coFile'); let set = false;
    if (fi && blob) { const dt = new DataTransfer(); dt.items.add(new File([blob], 'found.png', { type: 'image/png' })); fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true })); set = true; }
    if (a) { a.value = ''; a.dispatchEvent(new Event('input', { bubbles: true })); }
    const noPrice = sign();
    if (a) { a.value = '4500'; a.dispatchEvent(new Event('input', { bubbles: true })); }
    const add = document.querySelector('[data-co-add]'); if (add) add.click();
    const d1 = document.querySelector('[data-co-desc="1"]'), a1 = document.querySelector('[data-co-amt="1"]');
    if (d1) { d1.value = 'OSB decking, 17 sheets'; d1.dispatchEvent(new Event('input', { bubbles: true })); }
    if (a1) { a1.value = '850'; a1.dispatchEvent(new Event('input', { bubbles: true })); }
    return { noPhoto, why, set, noPrice, ready: sign(), tot: (q('coTot') || {}).textContent || '' };
  });
  ok(B.noPhoto === true && /photo/i.test(B.why) && B.set && B.noPrice === true && B.ready === false && /5,350\.00/.test(B.tot),
     'B  Homeowner signs stays off without a photo, and without a price; on with both (total $5,350.00)', JSON.stringify(B));
  const C = await page.evaluate(async () => {
    const before = (window.__WRITES__ || []).length;
    const b = document.getElementById('coSign'); if (b) b.click();
    await new Promise(r => setTimeout(r, 300));
    const pad = document.getElementById('sigModal');
    const padUp = !!pad && pad.style.display === 'block' && Number(pad.style.zIndex) > 12000;
    const c = document.createElement('canvas'); c.width = 10; c.height = 10;
    if (typeof window.__ceSigner === 'function') { const cb = window.__ceSigner, id = window.__ceSignerId; window.__ceSigner = null; pad.style.display = 'none'; await cb(c.toDataURL('image/png'), id); }
    await new Promise(r => setTimeout(r, 1500));
    const w = (window.__WRITES__ || []).slice(before);
    const ins = w.filter(x => x.table === 'inspection_reports' && x.op === 'insert').map(x => JSON.stringify(x.payload));
    const up = w.filter(x => x.table === 'inspection_reports' && x.op === 'update').map(x => JSON.stringify(x.payload));
    const ph = w.filter(x => /photo/.test(x.table || '') || /storage/.test(x.op || '')).length;
    const doc = (cacheRows || []).find(r => /^change order/i.test(r.title || ''));
    const m = document.getElementById('cr-co-sheet');
    return { padUp, ins: ins.length, title: ins.some(s => /Change Order — Dana Test/.test(s)), sigImg: ins.some(s => /Homeowner signature/.test(s)), photoInDoc: ins.some(s => /What was found/.test(s)),
      up: up.some(s => /5350/.test(s) && /signed_at/.test(s)), ph, cached: !!doc && Number(doc.total) === 5350 && !!doc.signed_at, closed: !!m && !m.classList.contains('open'), padZ: pad && pad.style.zIndex };
  });
  ok(C.padUp && C.ins === 1 && C.title && C.sigImg && C.photoInDoc && C.up && C.cached && C.closed,
     'C  signing opens the pad above the sheet and saves a signed Change Order document (total, signed_at, photo, signature)', JSON.stringify(C));
  ok(C.ph > 0, 'C2 the full photo also goes to the job\'s photos', JSON.stringify({ ph: C.ph }));
  const D = await page.evaluate(() => { const pr = cacheProjects.find(p => p.id === 'j1'); return window.jobFinance ? jobFinance(pr).value : null; });
  ok(A.before === 20000 && D === 25350, 'D  the job value grows by the change order: $20,000 -> $25,350', JSON.stringify({ before: A.before, after: D }));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed (browser)', String(e && e.stack || e).slice(0, 300)); }

try {
  const CON = { title: 'Contract — Dana Test', total: 20000, signed_at: '2026-09-01' };
  const CO = { title: 'Change Order — Dana Test', total: 5350, signed_at: '2026-10-12' };
  const signed = await shareBar({ docs: [CON, CO] });
  const unsigned = await shareBar({ docs: [CON, Object.assign({}, CO, { signed_at: null })] });
  ok(signed === '$20,350.00' && unsigned === '$15,000.00', 'E  the pay link asks for a signed change order ($20,350.00) and ignores an unsigned one ($15,000.00)', JSON.stringify({ signed, unsigned }));
} catch (e) { ok(false, 'gate crashed (server)', String(e && e.stack || e).slice(0, 300)); }
const rem = fs.readFileSync(ROOT + 'api/remind.js', 'utf8');
const ow = f => { const s = fs.readFileSync(ROOT + 'api/' + f, 'utf8'); const a = s.indexOf('async function owedOn'); return s.slice(a, s.indexOf('\n}\n', a)); };
ok(/\^change order\/i/.test(rem) && /signedTotal \+ manual \+ coTotal/.test(rem) && /coTotal/.test(ow('pay.js')) && ow('pay.js') === ow('share.js'),
   'F  remind.js and owedOn count it too; owedOn is still byte-identical in pay.js and share.js');
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1323: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
