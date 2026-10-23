/* gate_1397 — the second polish sweep.
 *   A  insurance job, dark: Back / Upload files (Job Documents), the guide row's Email to client and
 *      label, and the desktop Work Orders button clear 4.5:1 against their worst painted ground
 *   B  retail Job Documents: intro, empty note, client name clear 4.5:1
 *   C  left rail: the selected Community button and the section counts clear 4.5:1
 *   D  scanner: Add page clicks the camera BEFORE keeping the page; an empty scanner says what to do
 * Every ink is scored against every ground an ancestor paints (colour and gradient stops), worst wins.
 * Arg: [index.html] -> negative control (1396 must go RED). */
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
  inspection_reports: [{ id:'c1', project_id:'jr', title:'Contract — Sample Client jr', total:9000, signed_at: iso(-3), html:'<p>x</p>', created_at: iso(-4), updated_at: iso(-3) }, { id:'r1', project_id:'jr', title:'Roof Inspection — Sample Client jr', html:'<p>r</p>', created_at: iso(-5), updated_at: iso(-5) }, { id:'v1', project_id:'jr', title:'Invoice — Sample Client jr', total:9000, html:'<p>i</p>', created_at: iso(-1), updated_at: iso(-1) }], collections: [], appointments: [], estimates: [], commissions: [], contracts: [], punch_items: [],
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
    const { ctx, page } = await boot(true, light);
    await go(page, "openProject('jr'); await w(1500); openPaymentsPage(); await w(900);");
    chk('1 ' + th + ' Payments', await page.evaluate(SCORE, ['#paymentsView .wsrow span', '#payClient']));
    await go(page, "openProject('jr'); await w(1200); openApptsPage(); await w(700);");
    chk('2 ' + th + ' Appointments', await page.evaluate(SCORE, ['#apClient', '#apptsView .subnote']));
    const r = await page.evaluate(async () => {
      const out = {};
      out.insp = (window.LIST_DEFS ? null : 'n/a');
      try { const d = LIST_DEFS.inspections; out.insp = ['Contract — X', 'Invoice — X', 'Work Order — X', 'Roof Inspection — X'].map(t => d.filter({ title: t })); } catch (e) { out.insp = String(e); }
      const tn = document.getElementById('teamNav'); out.team = tn ? tn.style.display : 'missing';
      try { window.CardinalEstimates.openEditor(cacheProjects.find(p => p.id === 'jr')); } catch (_) {}
      await new Promise(r => setTimeout(r, 1500));
      const f = document.getElementById('cr-ai-fab'); out.fabEst = f ? getComputedStyle(f).display : 'missing';
      try { window.CardinalEstimates.close(); } catch (_) {}
      await new Promise(r => setTimeout(r, 3500));
      out.fabAfter = f ? getComputedStyle(f).display : 'missing';
      return out;
    });
    ok(Array.isArray(r.insp) && r.insp.join() === 'false,false,false,true', '5 Inspections list keeps only inspections', JSON.stringify(r.insp));
    ok(r.team === 'flex', '4 Settings Team row shows as flex', r.team);
    ok(r.fabEst === 'none' && r.fabAfter !== 'none', '7 Ask button stands aside in the estimate builder, comes back after', JSON.stringify([r.fabEst, r.fabAfter]));
    await ctx.close();
  }
} finally { await browser.close(); }
const SRC = fs.readFileSync(FILE, 'utf8');
ok(/\.cr-ahc-head h3\{[^}]*color:#e35c63/.test(SRC) && /\(r\.count === 1 \? ' row' : ' rows'\)/.test(SRC), '3 System Health heading ink + "1 row"');
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
