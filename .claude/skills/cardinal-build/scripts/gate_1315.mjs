/* gate_1315 — every send counts as sent; stages only move forward; no double invoices.
 *   A  A/R "Text" on a Completed job's invoice marks it sent AND moves the job to Invoiced
 *   B  ...the same on a CLOSED job marks the invoice sent but leaves the job Closed
 *   C  "Copy link" is not a send — nothing is marked
 *   D  two quick Create invoice taps make ONE invoice; a paid-in-full job makes none and says so;
 *      a job that already has an invoice asks first (No → none made)
 *   E  the payment form's button is live again on its second opening
 * Arg: [index.html] -> negative control (1314: must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import { waitAppReady, settle } from './gate_ready.mjs';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = fs.readFileSync(FILE, 'utf8');
const MOCK = fs.readFileSync(HERE + 'e2e_mock_supa.js', 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 170000);
const P = (id, stage) => ({ id, name: 'Client ' + id, stage, address: '1 Main St', phone: '9375550101', email: '', checklist: JSON.stringify({ lead: { claim_type: 'retail' } }), created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const C = (id, pid, total) => ({ id, project_id: pid, title: 'Contract — Client ' + pid, total, signed_at: '2026-09-01T12:00:00Z', html: '<p>x</p>', status: 'signed', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' });
const I = (id, pid) => ({ id, project_id: pid, title: 'Invoice — Client ' + pid, total: 20000, signed_at: null, html: '<p>inv</p>', status: 'unsent', share_token: 'aaaaaaaa-bbbb-cccc-dddd-00000000000' + id.slice(-1), created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' });
const SEED = { team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' }],
  projects: [P('j1', 'Completed'), P('j2', 'Closed'), P('j3', 'Completed'), P('j4', 'Completed'), P('j5', 'Completed'), P('j6', 'Completed')],
  inspection_reports: [C('c1', 'j1', 20000), I('i1', 'j1'), C('c2', 'j2', 20000), I('i2', 'j2'), C('c3', 'j3', 10000), C('c4', 'j4', 8000), C('c5', 'j5', 9000), I('i5', 'j5'), C('c6', 'j6', 20000), I('i6', 'j6')],
  collections: [{ id: 'k4', project_id: 'j4', amount: 8000, collected_at: '2026-10-01', created_at: '2026-10-01T12:00:00Z', type: 'final' }],
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


try {
  const { ctx, page } = await boot(null, false);
  await page.waitForTimeout(800);
  // sms:/mailto: navigations go nowhere in a test browser — keep the page
  await page.evaluate(() => { window.addEventListener('beforeunload', e => { e.preventDefault(); }); });
  const tap = async (attr, pid) => page.evaluate(([attr, pid]) => {
    window.__WRITES__ = [];
    const b = document.createElement('button'); b.setAttribute(attr, pid); document.body.appendChild(b); b.click(); b.remove();
  }, [attr, pid]);
  const writes = () => page.evaluate(() => (window.__WRITES__ || []).map(w => ({ t: w.table, op: w.op, p: w.payload })));
  const sentOn = (ws, id) => ws.some(w => w.t === 'inspection_reports' && w.op === 'update' && w.p && w.p.status === 'sent' && w.p.sent_at);
  const stageTo = (ws, stage) => ws.some(w => w.t === 'projects' && w.op === 'update' && w.p && (w.p.stage === stage || JSON.stringify(w.p).includes('"stage":"' + stage)));

  await tap('data-artext', 'j1'); await page.waitForTimeout(1500);
  let w = await writes();
  ok(sentOn(w) && stageTo(w, 'Invoiced'), 'A  Text from the A/R list: invoice marked sent and the job moves to Invoiced', JSON.stringify(w).slice(0, 300));
  await tap('data-artext', 'j2'); await page.waitForTimeout(1500);
  w = await writes();
  ok(sentOn(w) && !stageTo(w, 'Invoiced'), 'B  the same on a Closed job: marked sent, job stays Closed', JSON.stringify(w).slice(0, 300));
  await tap('data-arcopy', 'j6'); await page.waitForTimeout(1200);
  w = await writes();
  ok(!sentOn(w) && !stageTo(w, 'Invoiced'), 'C  Copy link is not a send', JSON.stringify(w).slice(0, 200));

  const d = await page.evaluate(async () => {
    const out = {}; const told = []; const asked = [];
    const kt = window.crTell, ka = window.crAsk, ke = window.openEditor;
    window.crTell = t => told.push(String(t)); window.crAsk = async q => { asked.push(String(q)); return false; };
    window.openEditor = async () => {};
    const pr = id => cacheProjects.find(p => p.id === id);
    window.__WRITES__ = [];
    const a1 = createInvoiceFor(pr('j3')), a2 = createInvoiceFor(pr('j3'));
    await Promise.all([a1, a2]); await new Promise(r => setTimeout(r, 600));
    out.j3 = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert').length;
    window.__WRITES__ = [];
    await createInvoiceFor(pr('j4'));
    out.j4 = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert').length;
    out.j4told = told.join(' | ');
    window.__WRITES__ = [];
    await createInvoiceFor(pr('j5'));
    out.j5 = (window.__WRITES__ || []).filter(x => x.table === 'inspection_reports' && x.op === 'insert').length;
    out.asked = asked.join(' | ');
    window.crTell = kt; window.crAsk = ka; window.openEditor = ke;
    try { window.CardinalAR.recordPayment(pr('j6')); } catch (e) { out.e1 = String(e); }
    const b = document.getElementById('crpay-save'); if (b) { b.disabled = true; b.textContent = 'Saving…'; }
    try { document.getElementById('crpay-cancel').click(); } catch (_) {}
    try { window.CardinalAR.recordPayment(pr('j6')); } catch (e) { out.e2 = String(e); }
    const b2 = document.getElementById('crpay-save');
    out.btn = b2 ? { dis: b2.disabled, txt: b2.textContent } : null;
    return out;
  });
  await ctx.close();
  ok(d.j3 === 1, 'D  two quick Create invoice taps → one invoice', 'inserts ' + d.j3);
  ok(d.j4 === 0 && /paid in full/i.test(d.j4told), 'D  a paid-in-full job: no invoice, and it says so', JSON.stringify({ n: d.j4, told: d.j4told }));
  ok(d.j5 === 0 && /already has an invoice/i.test(d.asked), 'D  a job that already has an invoice asks first (No → none made)', JSON.stringify({ n: d.j5, asked: d.asked }));
  ok(d.btn && d.btn.dis === false && /Record payment/.test(d.btn.txt), 'E  the payment form button is live on its second opening', JSON.stringify(d.btn));
} catch (e) { ok(false, 'gate crashed: ' + String(e && e.stack).slice(0, 300)); }
await browser.close();
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1315: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
