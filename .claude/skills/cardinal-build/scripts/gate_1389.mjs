/* gate_1389 — "→ Contract" makes the trade's Construction Agreement.
 *   A  a roofing estimate → "Contract — Roofing — …", the Roofing agreement (Project Specifications,
 *      Right to Cancel, data-sig slots), the estimate scope in its Notes box, the price carried
 *   B  a siding estimate → the Siding agreement, no question asked
 *   C  a roof + gutters estimate → the sheet asks; picking Gutters makes the Gutter agreement
 *   D  picking "General service contract" still makes the SERVICE CONTRACT, honestly labelled
 * Arg: [index.html] -> negative control (1388 must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SHOT = process.env.SHOT || '';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
const P = (id, stage) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '9375550101', email: 'c@example.com', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (pid) => ({ id: 'c' + pid, project_id: pid, title: 'Contract — Client ' + pid, total: 14800, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const I = (pid, status) => ({ id: 'i' + pid, project_id: pid, title: 'Invoice — Client ' + pid, total: 14800, html: '<p>i</p>', status, sent_at: status === 'sent' ? new Date(Date.now() - 4 * 86400000).toISOString() : null, share_token: 'aaaaaaaa-bbbb-cccc-dddd-0000000000' + pid, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' });
const E = (id, pid, title, lines) => ({ id, project_id: pid, estimate_number: 'EST-' + id, title, status: 'accepted', total: 12000, subtotal: 12000, deposit_pct: 30, deposit_amount: null, archived: false,
  line_items: lines.map(([name, sec], i) => ({ name, sec, section_id: 'sc_' + i, qty: 1, unit: 'ls', unit_price: 12000 / lines.length, amount: 12000 / lines.length, description: name + ' — scope text' })),
  created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('j1', 'Prospect'), P('j2', 'Prospect'), P('j3', 'Prospect'), P('j4', 'Prospect')],
  inspection_reports: [], collections: [], appointments: [],
  estimates: [E('e1', 'j1', 'Roof Replacement', [['Tear-off and new OC Duration shingles', 'Roof']]),
              E('e2', 'j2', 'Siding', [['Remove and replace vinyl siding', 'Siding']]),
              E('e3', 'j3', 'Roof and gutters', [['New shingles', 'Roof'], ['5in seamless gutters and downspouts', 'Gutters']]),
              E('e4', 'j4', 'Misc', [['Chimney cap', 'Repairs']])],
  commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { window.__pr = []; window.print = function(){ window.__pr.push(document.title); }; });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  await page.waitForTimeout(1500); await settle(page);
  return { ctx, page };
}


async function shot(page, path){
  try { const c = await page.context().newCDPSession(page);
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: 1800, scale: 1 } });
    fs.writeFileSync(path, Buffer.from(r.data, 'base64')); } catch (e) { console.log('  (screenshot skipped)'); }
}
const card = (page, id) => page.evaluate(async id => {
  openProject(id); await new Promise(r => setTimeout(r, 1300));
  const c = document.querySelector('#projectView .crji-card'); if (!c) return null;
  const btns = [...c.querySelectorAll('.crji-acts .crji-btn')];
  const bar = c.querySelector('.crji-bar i');
  return { reds: btns.filter(b => b.classList.contains('primary')).map(b => b.textContent.trim()),
    amt: (c.querySelector('.crji-amt') || {}).textContent || '', txt: c.textContent.replace(/\s+/g, ' '),
    bar: bar ? bar.style.width : null, minH: Math.min(...btns.map(b => b.getBoundingClientRect().height)),
    jump: !!document.querySelector('#projectView [data-crji-jump]'),
    pBal: (document.querySelector('#projectView .crjp-card b.crjp-bal') || {}).textContent || '',
    pBar: (document.querySelector('#projectView .crjp-card .crjp-pbar i') || { style: {} }).style.width || null,
    balCount: [...document.querySelectorAll('#projectView *')].filter(e => e.children.length === 0 && e.offsetParent && /^\s*Balance due\s*$/i.test(e.textContent)).length, balWhere: [...document.querySelectorAll('#projectView *')].filter(e => e.children.length === 0 && /^\s*Balance due\s*$/i.test(e.textContent)).map(e => (e.closest('[id],[class]')||{}).className + '|' + e.tagName + '|' + (e.offsetParent ? 'shown' : 'hidden')) };
}, id);
const run = (page, pid, eid, pick) => page.evaluate(async ([pid, eid, pick]) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const pr = cacheProjects.find(p => p.id === pid);
  const est = (window.__SEED__.estimates || []).find(e => e.id === eid);
  window.__WRITES__ = [];
  await window.CardinalEstimates.openEditor(pr, est); await w(1500);
  const b = document.getElementById('cr-e2c-btn'); if (!b) return { err: 'no → Contract button' };
  b.click();
  let asked = null;
  for (let i = 0; i < 40; i++) {
    await w(150);
    const sheet = document.querySelector('#crAsk.open');
    if (sheet) {
      const picks = [...sheet.querySelectorAll('.askpick')].map(x => x.getAttribute('data-pick'));
      if (picks.length) { asked = picks; const t = sheet.querySelector('.askpick[data-pick="' + pick + '"]'); if (t) t.click(); }
      else { const g = sheet.querySelector('.askgo'); if (g) g.click(); }
    }
    if (window.__WRITES__.some(x => x.table === 'inspection_reports' && x.op === 'insert')) break;
  }
  await w(800);
  const ins = window.__WRITES__.find(x => x.table === 'inspection_reports' && x.op === 'insert');
  const p = ins && (Array.isArray(ins.payload) ? ins.payload[0] : ins.payload) || {};
  const html = String(p.html || '');
  try { document.querySelectorAll('#crAsk.open .askno').forEach(n => n.click()); } catch (_) {}
  try { window.CardinalEstimates.close(); } catch (_) {}
  return { title: p.title || null, asked, spec: /Project Specifications/.test(html), cancel: /Right to Cancel/.test(html),
           sig: (html.match(/data-sig/g) || []).length, service: /SERVICE CONTRACT/.test(html), roofSpec: /Starter Shingles/.test(html),
           sidingSpec: /Siding Construction|SIDING CONSTRUCTION/.test(html), gutterSpec: /GUTTER CONSTRUCTION/.test(html),
           scope: /scope text/.test(html), price: /12,000/.test(html) };
}, [pid, eid, pick]);
try {
  const { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} document.body.dataset.crm = 'retail'; });
  const a = await run(page, 'j1', 'e1', null);
  ok(/^Contract . Roofing . /.test(a.title || '') && a.spec && a.cancel && a.sig > 0 && a.roofSpec && !a.service && !a.asked,
     'A1 roofing estimate → the Roofing Construction Agreement, no question asked', JSON.stringify(a));
  ok(a.scope && a.price, 'A2 the estimate scope is in the agreement and the price carried', JSON.stringify({ scope: a.scope, price: a.price }));
  const b = await run(page, 'j2', 'e2', null);
  ok(/^Contract . Siding . /.test(b.title || '') && b.sidingSpec && !b.asked, 'B  siding estimate → the Siding agreement', JSON.stringify(b));
  const c = await run(page, 'j3', 'e3', 'gutters');
  ok(c.asked && c.asked.join(',') === 'roof,siding,gutters,service' && /^Contract . Gutters . /.test(c.title || '') && c.gutterSpec,
     'C  roof + gutters → asks; Gutters makes the Gutter agreement', JSON.stringify(c));
  const d = await run(page, 'j4', 'e4', 'service');
  ok(d.asked && d.service && /^Contract . Client j4$/.test(d.title || ''), 'D  General service contract is still a choice', JSON.stringify(d));
  await ctx.close();
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1389: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
