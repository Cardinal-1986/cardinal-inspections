/* gate_1393 — readability on every job (both themes, phone + desktop).
 *   A  insurance job, dark: Back / Upload files (Job Documents), the guide row's Email to client and
 *      label, and the desktop Work Orders button clear 4.5:1 against their worst painted ground
 *   B  retail Job Documents: intro, empty note, client name clear 4.5:1
 *   C  left rail: the selected Community button and the section counts clear 4.5:1
 *   D  scanner: Add page clicks the camera BEFORE keeping the page; an empty scanner says what to do
 * Every ink is scored against every ground an ancestor paints (colour and gradient stops), worst wins.
 * Arg: [index.html] -> negative control (1392 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 400000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const iso = d => new Date(Date.now() + d * 86400000).toISOString();
const P = (id, type) => ({ id, name: 'Sample Client ' + id, stage: 'Approved', address: '1 Main St', email: 'c@example.com',
  checklist: JSON.stringify({ lead: { claim_type: type }, job: { trade: 'Roofing' } }), created_at: iso(-30), updated_at: iso(-30) });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('jr', 'retail'), P('ji', 'insurance'), P('jc', 'community')],
  inspection_reports: [], collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [],
  insurance_claims: [{ id: 'ic1', project_id: 'ji', carrier: 'Sample Carrier', claim_number: 'X-1', status: 'open', created_at: iso(-9) }] };
const SCORE = sels => {
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (t, b) => { const a = t[3]; return [t[0] * a + b[0] * (1 - a), t[1] * a + b[1] * (1 - a), t[2] * a + b[2] * (1 - a), 1]; };
  const out = {};
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') { out[sel] = null; continue; }
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e); const imgs = (cs.backgroundImage || '').match(/rgba?\([^)]+\)/g); const bc = parse(cs.backgroundColor);
      if (imgs && imgs.length) layers.push({ stops: imgs.map(parse), base: bc }); else if (bc && bc[3] > 0) layers.push({ stops: [bc] });
      if (bc && bc[3] >= 0.99) break;
    }
    let cands = [[255, 255, 255, 1]];
    const bb = parse(getComputedStyle(document.body).backgroundColor); if (bb && bb[3] > 0.5) cands = [[bb[0], bb[1], bb[2], 1]];
    for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i], nx = [];
      for (const c of cands) { let b = c; if (L.base && L.base[3] > 0) b = over(L.base, b); for (const s of L.stops) nx.push(s ? over(s, b) : b); } cands = nx.slice(0, 12); }
    const fg = parse(getComputedStyle(el).color); let w = 99;
    for (const b of cands) { const f = fg[3] < 1 ? over(fg, b) : fg; w = Math.min(w, cr(f, b)); }
    out[sel] = +w.toFixed(2);
  }
  return out;
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function boot(phone, light){
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 900 } });
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
  await page.addInitScript(([seed, light]) => { window.__SEED__ = seed; try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {} }, [SEED, light]);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page); await page.waitForTimeout(1500); await settle(page);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} });
  return { ctx, page };
}
const go = (page, code) => page.evaluate(async code => { const w = ms => new Promise(r => setTimeout(r, ms)); await (eval('(async()=>{' + code + '})'))(); await w(900); }, code);
const chk = (tag, res) => { for (const [sel, r] of Object.entries(res)) { if (r == null) { ok(false, tag + ' ' + sel + ' rendered'); continue; } ok(r >= 4.5, tag + ' ' + sel + ' ≥ 4.5:1', r + ':1'); } };
try {
  for (const light of [false, true]) {
    const th = light ? 'light' : 'dark';
    let { ctx, page } = await boot(true, light);
    await go(page, "openProject('ji'); await w(1500); openDocsPage();");
    chk('A ' + th + ' phone insurance docs', await page.evaluate(SCORE, ['#jdBackBtn', '#jdUploadBtn']));
    await go(page, "openProject('ji'); await w(1500);");
    chk('A ' + th + ' phone insurance client', await page.evaluate(SCORE, ['#projectView .db-guiderow .dbg-t', '#projectView .db-guiderow .btn.ghost']));
    await go(page, "openProject('jr'); await w(1500); openDocsPage();");
    chk('B ' + th + ' phone retail docs', await page.evaluate(SCORE, ['#docsView p.subnote', '#jdClient']));
    await ctx.close();
    ({ ctx, page } = await boot(false, light));
    await go(page, "openProject('ji'); await w(1500);");
    chk('A ' + th + ' desktop insurance header', await page.evaluate(SCORE, ['header.site #woQuick']));
    await go(page, "document.body.dataset.crm='community'; try{ window.CardinalCommunityHub.show(); }catch(_){}; await w(1500);");
    chk('C ' + th + ' desktop rail', await page.evaluate(SCORE, ['#cr-lnav .lnav-crm button.on', '#cr-lnav .lnav-sec .cnt']));
    await ctx.close();
  }
  /* D — scanner */
  const { ctx, page } = await boot(true, false);
  const d = await page.evaluate(async () => {
    const order = [];
    const inp = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function(){ if (this.type === 'file') order.push('camera'); };
    const c = document.createElement('canvas'); c.width = 600; c.height = 800; const x = c.getContext('2d');
    x.fillStyle = '#333'; x.fillRect(0, 0, 600, 800); x.fillStyle = '#fff'; x.fillRect(80, 90, 440, 600);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    window.CardinalScan.open(new File([blob], 'p.jpg', { type: 'image/jpeg' }), function(){});
    await new Promise(r => setTimeout(r, 1500));
    const root = document.getElementById('cr-scan');
    const mo = new MutationObserver(() => { if (root.querySelector('.scn-thumbs img') && order.indexOf('kept') < 0) order.push('kept'); });
    mo.observe(root.querySelector('.scn-thumbs'), { childList: true });
    root.querySelector('[data-scn="add"]').click();
    await new Promise(r => setTimeout(r, 2500));
    mo.disconnect();
    const note = root.querySelector('.scn-note').textContent;
    root.querySelector('[data-scn="retake"]').click();
    await new Promise(r => setTimeout(r, 300));
    const note2 = root.querySelector('.scn-note').textContent;
    HTMLInputElement.prototype.click = inp;
    return { order, note, note2, rot: root.querySelector('[data-scn="rotate"]').disabled };
  });
  ok(d.order[0] === 'camera' && d.order.indexOf('kept') > 0, 'D  Add page opens the camera first, keeps the page after', JSON.stringify(d.order));
  ok(/1 page kept/.test(d.note), 'D  after Add page the note says a page is kept', d.note);
  ok(/No photo yet|kept/.test(d.note2) && d.rot === true, 'D  with no photo: the note says what to do and Rotate is off', d.note2 + ' rot=' + d.rot);
  await ctx.close();
} finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
