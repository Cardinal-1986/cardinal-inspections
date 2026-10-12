/* gate_1324 — the deductible box on every insurance contract, required before it goes out.
 *   A  insurance job, claim has the deductible: the first Share adds the box (carrier, RCV, $5,000.00
 *      deductible, out of pocket $5,000.00) above the signatures and shares NOTHING; the second shares
 *   B  upgrades typed ($3,870) -> saved document says out of pocket $8,870.00
 *   C  claim with no deductible: Share, Text, Email and Sign in person all refuse until it is typed;
 *      typed into the yellow blank (which keeps its .ph class) it then shares
 *   D  claim marked deductible WAIVED: refused, no box, nothing shared
 *   E  a retail contract: no box, shares on the first tap
 * Arg: [index.html] -> negative control (1323: must go RED, not crash). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
const P = (id, ct) => ({ id, name: 'Client ' + id, stage: 'Approved', address: '1 Main St', phone: '9375550100', email: 'c@example.com',
  checklist: JSON.stringify({ lead: { claim_type: ct } }), created_at: '2026-08-01T12:00:00Z', updated_at: new Date().toISOString() });
const C = pid => ({ id: 'c' + pid, project_id: pid, title: 'Contract — Roofing — Client ' + pid, total: 28373, html: '<p>x</p>', status: 'draft', created_at: '2026-08-01T12:00:00Z', updated_at: '2026-08-01T12:00:00Z' });
const CL = (pid, o) => Object.assign({ id: 'k' + pid, project_id: pid, carrier: 'Liberty Mutual', claim_number: '1', approved_rcv: 28375.48, approved_acv: 16210.74, deductible: 5000, deductible_waived: false, status: 'approved', created_at: '2026-08-01T12:00:00Z' }, o || {});
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('i1', 'insurance'), P('i2', 'insurance'), P('i3', 'insurance'), P('r1', 'retail')],
  inspection_reports: ['i1', 'i2', 'i3', 'r1'].map(C),
  insurance_claims: [CL('i1'), CL('i2', { deductible: null }), CL('i3', { deductible_waived: true })],
  document_versions: [], collections: [], owner_reviews: [], estimates: [],
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


const OPEN = async (page, id) => page.evaluate(async id => {
  const row = cacheRows.find(r => r.id === id);
  if (row) { await db.update(id, { html: window.ROOF_AGREEMENT }); row.html = window.ROOF_AGREEMENT; }
  await reload(); await openEditor(id); await new Promise(r => setTimeout(r, 1500)); return true;
}, id);
const TAP = async (page, btn, id) => page.evaluate(async ([btn, id]) => {
  const n0 = (window.__WRITES__ || []).length;
  const b = document.getElementById(btn); if (b) b.click();
  /* Email asks "no total — send anyway?" first (priceOkToSend); answer it, or the guard
     behind it is never reached and the email check is vacuous in both trees */
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 150));
    const go = [...document.querySelectorAll('button')].find(x => x.offsetParent !== null && (x.textContent || '').trim() === 'Continue');
    if (go) { go.click(); break; }
  }
  await new Promise(r => setTimeout(r, 1800));
  const w = (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'inspection_reports');
  const doc = document.getElementById('reportFrame').contentDocument;
  const box = doc && doc.querySelector('[data-cr-inspart]');
  const sig = doc && doc.querySelector('[data-sig]');
  const pad = document.getElementById('sigModal');
  const shared = w.some(x => x.payload && x.payload.share_token);
  /* the ways a send/sign shows it went ahead: the pad, the Who-is-signing picker, the email sheet */
  const picker = [...document.querySelectorAll('body > div')].find(d => /Who is signing\?/.test(d.textContent || ''));
  const em = document.getElementById('crEmailSheet');
  const emOpen = !!em && em.classList.contains('open');
  const r = { shared, box: !!box, txt: box ? box.innerText.replace(/\s+/g, ' ') : '',
    above: !!(box && sig && (box.compareDocumentPosition(sig) & Node.DOCUMENT_POSITION_FOLLOWING)),
    pad: (!!pad && pad.style.display === 'block') || !!picker, email: emOpen };
  if (pad) pad.style.display = 'none';
  if (picker) picker.remove();
  const no = document.getElementById('emShNo'); if (emOpen && no) no.click();
  await new Promise(r => setTimeout(r, 300));
  return r;
}, [btn, id]);
try {
  const { ctx, page } = await boot(null, false);
  globalThis.__DLG__ = [];
  await OPEN(page, 'ci1');
  const a1 = await TAP(page, 'shareBtn'), a2 = await TAP(page, 'shareBtn');
  ok(a1.box && a1.above && !a1.shared && /INSURANCE & YOUR PART/i.test(a1.txt) && /Liberty Mutual/.test(a1.txt) && /28,375\.48/.test(a1.txt) && /5,000\.00/.test(a1.txt) && /out of pocket \$5,000\.00/i.test(a1.txt) && /does not pay, waive or rebate/.test(a1.txt) && a2.shared,
     'A  first Share adds the box above the signatures and shares nothing; the second shares', JSON.stringify({ a1, a2: { shared: a2.shared } }));
  const B = await page.evaluate(async () => {
    const doc = document.getElementById('reportFrame').contentDocument;
    const u = doc.querySelector('[data-ip="upg"]'); if (u) u.textContent = '$3,870.00';
    const n0 = (window.__WRITES__ || []).length;
    await saveCurrent(); await new Promise(r => setTimeout(r, 500));
    const w = (window.__WRITES__ || []).slice(n0).filter(x => x.table === 'inspection_reports' && x.payload && x.payload.html);
    return { saved: w.some(x => /out of pocket[\s\S]{0,200}8,870\.00/i.test(x.payload.html)) };
  });
  ok(B.saved, 'B  upgrades typed -> the saved contract says out of pocket $8,870.00', JSON.stringify(B));
  await OPEN(page, 'ci2');
  /* Text goes FIRST on a fresh document: it is the tap that would mint the share token */
  const c1 = await TAP(page, 'textSignBtn'), c2 = await TAP(page, 'shareBtn'), c3 = await TAP(page, 'shareBtn'), c4 = await TAP(page, 'emailDocBtn'), c5 = await TAP(page, 'sigBtn');
  await page.evaluate(() => { const d = document.getElementById('reportFrame').contentDocument.querySelector('[data-ip="ded"]'); if (d) d.textContent = '$2,500.00'; });
  const c6 = await TAP(page, 'shareBtn');
  ok(c1.box && /\[0\.00\]/.test(c1.txt) && ![c1, c2, c3, c4].some(x => x.shared) && !c4.email && !c5.pad,
     'C  no deductible on the claim: Share, Text, Email and Sign in person all refuse', JSON.stringify({ c1: c1.txt.slice(0, 160), shared: [c1, c2, c3, c4].map(x => x.shared), email: c4.email, pad: c5.pad }));
  ok(c6.shared && /2,500\.00/.test(c6.txt), 'C2 typed into the yellow blank, the deductible counts and it shares', JSON.stringify(c6));
  await OPEN(page, 'ci3');
  const d1 = await TAP(page, 'shareBtn');
  ok(!d1.shared && !d1.box, 'D  claim marked deductible WAIVED: refused, no box', JSON.stringify(d1));
  await OPEN(page, 'cr1');
  const e1 = await TAP(page, 'shareBtn');
  ok(e1.shared && !e1.box, 'E  a retail contract: no box, shares on the first tap', JSON.stringify(e1));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed', String(e && e.stack || e).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1324: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
