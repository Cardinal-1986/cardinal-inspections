/* gate_1318 — the invoice card (Theo's pick 2) and Record payment.
 *   A  one red button, the right one: no invoice → Create invoice · draft → Send ·
 *      sent with a balance → Record payment · paid → none
 *   B  the card leads with the Balance due, shows a paid bar at the right width and "$X paid of $Y"
 *   C  Send opens Company text / My phone / Email; every card button is 44px or taller
 *   D  the strip's Balance due jumps to the card
 *   E  Record payment opens at the balance, Type Final on a sent invoice (Deposit before), today's LOCAL date,
 *      Card is a method, its buttons 44px
 * Arg: [index.html] -> negative control (1317: must go RED). */
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
  projects: [P('j1', 'Completed'), P('j2', 'Completed'), P('j3', 'Invoiced'), P('j4', 'Invoiced')],
  inspection_reports: [C('j1'), C('j2'), I('j2', 'unsent'), C('j3'), I('j3', 'sent'), C('j4'), I('j4', 'sent')],
  collections: [{ id: 'k3', project_id: 'j3', amount: 5000, collected_at: '2026-10-01', created_at: '2026-10-01T12:00:00Z', type: 'deposit' },
                { id: 'k4', project_id: 'j4', amount: 14800, collected_at: '2026-10-05', created_at: '2026-10-05T12:00:00Z', type: 'final' }],
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
    window.__SEED__ = seed; if (as) window.__AS__ = { email: as, name: as.split('@')[0] };
    try { if (light) localStorage.setItem('cardinal.theme.rb', '1'); } catch (_) {}
  }, [SEED, as, light]);
  await page.addInitScript(MOCK);
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
    jump: !!document.querySelector('#projectView [data-crji-jump]') };
}, id);
try {
  let { ctx, page } = await boot(null, false);
  await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} document.body.dataset.crm = 'retail'; });
  const c1 = await card(page, 'j1'), c2 = await card(page, 'j2'), c3 = await card(page, 'j3');
  if (SHOT) await shot(page, SHOT + '_j3_dark.png');
  const c4 = await card(page, 'j4');
  const R = x => JSON.stringify(x && x.reds);
  ok(c1 && R(c1) === '["Create invoice"]' && c2 && R(c2) === '["Send"]' && c3 && R(c3) === '["Record payment"]' && c4 && R(c4) === '[]',
     'A  one red button, the next step: Create invoice · Send · Record payment · none when paid', [c1, c2, c3, c4].map(R).join(' | '));
  ok(c3 && /9,800/.test(c3.amt) && c3.bar === '34%' && /\$5,000(\.00)? paid of \$14,800(\.00)?/.test(c3.txt) && c4 && /Paid/.test(c4.amt) && c4.bar === '100%',
     'B  balance due leads, bar 34% for $5,000 of $14,800, 100% when paid', JSON.stringify({ amt: c3 && c3.amt, bar: c3 && c3.bar, paidBar: c4 && c4.bar }));
  const sendm = await page.evaluate(async () => { openProject('j3'); await new Promise(r => setTimeout(r, 1300));
    const b = document.querySelector('#projectView .crji-card [data-inv-sendmenu]'); if (!b) return null; b.click();
    const row = document.querySelector('#projectView .crji-card .crji-sendrow');
    return { open: !!(row && !row.hidden), labels: row ? [...row.querySelectorAll('.crji-btn')].map(x => x.textContent.trim()) : [] }; });
  ok(sendm && sendm.open && JSON.stringify(sendm.labels) === '["Company text","My phone","Email"]' && Math.min(c1.minH, c2.minH, c3.minH, c4.minH) >= 44,
     'C  Send opens Company text / My phone / Email; every card button ≥ 44px', JSON.stringify({ sendm, minH: [c1.minH, c2.minH, c3.minH, c4.minH] }));
  ok(c3 && c3.jump, 'D  the strip’s Balance due is a jump to the card');
  const pm = await page.evaluate(async () => {
    const out = {};
    window.CardinalAR.recordPayment(cacheProjects.find(p => p.id === 'j3')); await new Promise(r => setTimeout(r, 300));
    out.amt = document.getElementById('crpay-amt').value; out.type = document.getElementById('crpay-type').getAttribute('data-v');
    out.date = document.getElementById('crpay-date').value; const d = new Date();
    out.local = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    out.card = !!document.querySelector('#crpay-method [data-m="card"]');
    out.minH = Math.min(...[...document.querySelectorAll('#cr-pay-modal button, #cr-pay-modal .crpay-in')].filter(b => b.getBoundingClientRect().height > 0).map(b => b.getBoundingClientRect().height));
    document.getElementById('crpay-cancel').click();
    window.CardinalAR.recordPayment(cacheProjects.find(p => p.id === 'j1')); await new Promise(r => setTimeout(r, 300));
    out.type1 = document.getElementById('crpay-type').getAttribute('data-v');
    document.getElementById('crpay-cancel').click();
    return out; });
  ok(pm.amt === '9800.00' && pm.type === 'final' && pm.type1 === 'deposit' && pm.date === pm.local && pm.card && pm.minH >= 44,
     'E  Record payment: $9,800.00, Final on a sent invoice (Deposit before), today local, Card, 44px', JSON.stringify(pm));
  await ctx.close();
  if (SHOT) { ({ ctx, page } = await boot(null, true)); await page.evaluate(() => { try { window.CardinalFrontDoor.close(); } catch (_) {} document.body.dataset.crm = 'retail'; });
    await card(page, 'j3'); await shot(page, SHOT + '_j3_light.png'); await ctx.close(); }
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1318: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
