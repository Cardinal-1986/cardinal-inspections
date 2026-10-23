/* gate_1388 — three findings from the estimate-to-payment run.
 *   A  Record payment opened as a Deposit with nothing paid starts at the job's DEPOSIT
 *      (estimate deposit_amount > deposit_pct), not the whole balance; Final swaps to the balance and back;
 *      a typed amount is never overwritten; Final on a sent invoice still starts at the balance (1318)
 *   B  Download in the document editor names the PDF after the document title (#reportTitle)
 *   C  "→ Contract" no longer claims the 3-Day Notice is included
 * Arg: [index.html] -> negative control (1387 must go RED). */
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
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('j1', 'Approved'), P('j2', 'Approved'), P('j3', 'Invoiced')],
  inspection_reports: [C('j1'), C('j2'), C('j3'), I('j3', 'sent')],
  collections: [{ id: 'k3', project_id: 'j3', amount: 5000, collected_at: '2026-10-01', created_at: '2026-10-01T12:00:00Z', type: 'deposit' }],
  appointments: [],
  estimates: [{ id: 'e1', project_id: 'j1', estimate_number: 'EST-1', status: 'accepted', total: 14800, deposit_pct: 30, deposit_amount: 4000, archived: false, line_items: [], created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z' },
              { id: 'e2', project_id: 'j2', estimate_number: 'EST-2', status: 'sent', total: 14800, deposit_pct: 25, deposit_amount: null, archived: false, line_items: [], created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z' }], commissions: [], contracts: [], punch_items: [], insurance_claims: [] };
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
try {
  const { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} document.body.dataset.crm = 'retail'; });
  const r = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
    const open = async id => { window.CardinalAR.recordPayment(cacheProjects.find(p => p.id === id)); await w(900); };
    const amt = () => document.getElementById('crpay-amt').value, type = () => document.getElementById('crpay-type').getAttribute('data-v');
    const tap = t => document.querySelector('#crpay-type [data-t="' + t + '"]').click();
    const cancel = () => document.getElementById('crpay-cancel').click();
    await open('j1'); out.j1 = [type(), amt()]; tap('final'); out.j1f = amt(); tap('deposit'); out.j1d = amt();
    document.getElementById('crpay-amt').value = '1234.00'; tap('final'); out.typed = amt(); cancel();
    await open('j2'); out.j2 = [type(), amt()]; cancel();
    await open('j3'); out.j3 = [type(), amt()]; cancel();
    return out; });
  ok(r.j1[0] === 'deposit' && r.j1[1] === '4000.00', 'A1 deposit with nothing paid starts at the estimate deposit_amount ($4,000), not $14,800', JSON.stringify(r.j1));
  ok(r.j1f === '14800.00' && r.j1d === '4000.00', 'A2 Final swaps to the balance, Deposit swaps back', r.j1f + ' / ' + r.j1d);
  ok(r.typed === '1234.00', 'A3 a typed amount is never overwritten by the swap', r.typed);
  ok(r.j2[0] === 'deposit' && r.j2[1] === '3700.00', 'A4 no dollar deposit → the estimate deposit_pct (25% of $14,800 = $3,700)', JSON.stringify(r.j2));
  ok(r.j3[0] === 'final' && r.j3[1] === '9800.00', 'A5 Final on a sent invoice still starts at the balance (1318)', JSON.stringify(r.j3));
  const d = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    try { await window.openEditor('cj1'); } catch (e) { return { err: String(e) }; }
    await w(1800);
    const t = document.getElementById('reportTitle'); if (!t) return { err: 'no #reportTitle' };
    t.value = 'Contract — Roofing — Sample Client';
    window.__pr = [];
    document.querySelectorAll('iframe').forEach(f => { try { f.contentWindow.print = function(){ window.__pr.push(document.title); }; } catch (_) {} });
    document.getElementById('dlBtn').click(); await w(2500);
    return { pr: window.__pr.slice() }; });
  ok(d.pr && d.pr.length >= 1 && /Contract . Roofing . Sample Client/.test(d.pr[0]), 'B  Download names the PDF after the document title', JSON.stringify(d));
  const src = fs.readFileSync(FILE, 'utf8');
  ok(src.indexOf('The 3-Day Notice is included.') === -1 && /does not carry the Notice of Cancellation/.test(src), 'C  "→ Contract" no longer claims the 3-Day Notice is included');
  await ctx.close();
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1388: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
