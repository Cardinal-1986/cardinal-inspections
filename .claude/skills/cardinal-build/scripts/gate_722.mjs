import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP, 'utf8');

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Test Job', stage: 'Prospect', checklist: JSON.stringify({ lead: {} }), sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net' }],
  contracts: [
    { id: 'C1', project_id: 'P1', status: 'draft', contract_number: 'CRC-1234-A', total: 10000, sent_at: null, contractor_signed_at: null, homeowner_signed_at: null, voided_at: null, void_reason: null,
      contract: { homeowner: { name: 'Test HO', email: 'ho@example.com' }, property_address: '1 Test Way', scope_summary: 'Roof replacement', total: 10000, contract_number: 'CRC-1234-A' } },
    { id: 'C2', project_id: 'P1', status: 'draft', contract_number: 'CRC-1234-B', total: 5000, sent_at: null, contractor_signed_at: null, homeowner_signed_at: null, voided_at: null,
      contract: { homeowner: { name: 'Test HO2' }, scope_summary: 'Repair', total: 5000 } }
  ],
  estimates: [], inspection_reports: [], ai_estimates: [], collections: [], commissions: []
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const checks = [];
function chk(name, cond, detail) { checks.push({ name, pass: !!cond, detail: detail || '' }); }
async function ceState() {
  return await page.evaluate(() => {
    const v = document.getElementById('cr-ce-view');
    const open = v && v.classList.contains('open');
    const acts = v ? [...v.querySelectorAll('[data-act]')].map(b => b.dataset.act) : [];
    const status = v ? (v.querySelector('.ce-status') ? v.querySelector('.ce-status').textContent.trim() : '') : '';
    const eyebrows = v ? [...v.querySelectorAll('.ce-eyebrow')].map(e => e.textContent.trim()) : [];
    return { open, acts, status, eyebrows };
  });
}
function lastWrite(t) { return page.evaluate((tbl) => { const w = (window.__WRITES__ || []).filter(x => x.table === tbl); return w.length ? w[w.length - 1] : null; }, t); }
function anyWrite(t, pred) { return page.evaluate(([tbl, p]) => { const f = new Function('x', 'return ' + p); return (window.__WRITES__ || []).filter(x => x.table === tbl).some(f); }, [t, pred]); }
function writeCount(t) { return page.evaluate((tbl) => (window.__WRITES__ || []).filter(x => x.table === tbl).length, t); }
async function clickCE(act) { try { await page.click(`#cr-ce-view [data-act="${act}"]`, { force: true, timeout: 3000 }); return true; } catch (e) { return false; } }

const hasLifecycle = await page.evaluate(() => window.openContractEditor && window.openContractEditor.constructor && window.openContractEditor.constructor.name === 'AsyncFunction');
chk('openContractEditor is the async (lifecycle) version', hasLifecycle);

// ---- open C1 (draft) ----
await page.evaluate(() => window.__WRITES__ = []);
await page.evaluate(() => window.openContractEditor({ id: 'C1' }));
await page.waitForTimeout(600);
let s = await ceState();
chk('editor opens for C1', s.open, JSON.stringify(s.acts));
chk('C1 shows Draft status', /draft/i.test(s.status), s.status);
chk('draft offers Send + Sign + Void', s.acts.includes('send') && s.acts.includes('sign') && s.acts.includes('void'), s.acts.join(','));

// ---- Mark sent ----
await clickCE("send");
await page.waitForTimeout(400);
let wSend = await lastWrite('contracts');
chk('Send writes contracts {status:sent, sent_at}', wSend && wSend.op === 'update' && wSend.payload.status === 'sent' && !!wSend.payload.sent_at, JSON.stringify(wSend && wSend.payload));
s = await ceState();
chk('after Send: status Sent, Send button gone, Sign remains', /sent/i.test(s.status) && !s.acts.includes('send') && s.acts.includes('sign'), s.status + ' / ' + s.acts.join(','));
chk('after Send: shows a "Sent" date line', s.eyebrows.some(e => /^Sent /.test(e)), s.eyebrows.join(' | '));

// ---- Sign via the reused pad ----
await clickCE("sign");
await page.waitForTimeout(300);
const sigOpen = await page.evaluate(() => { const m = document.getElementById('sigModal'); return m && getComputedStyle(m).display !== 'none'; });
const armed = await page.evaluate(() => typeof window.__ceSigner === 'function');
chk('Sign opens the shared signature pad and arms the contract callback', sigOpen && armed, 'sigOpen=' + sigOpen + ' armed=' + armed);
// simulate a drawn signature, then Apply
await page.evaluate(() => { try { sigDrawn = true; } catch (e) { window.sigDrawn = true; } });
const cBefore = await writeCount('contracts');
await page.click('#sigApply', { force: true });
await page.waitForTimeout(500);
let wSign = await lastWrite('contracts');
chk('Sign writes contracts {status:signed, homeowner_signed_at, contractor_signed_at}', wSign && wSign.op === 'update' && wSign.payload.status === 'signed' && !!wSign.payload.homeowner_signed_at && !!wSign.payload.contractor_signed_at, JSON.stringify(wSign && Object.keys(wSign.payload)));
chk('Sign stores the signature PNG into the contract jsonb', wSign && wSign.payload.contract && typeof wSign.payload.contract.homeowner_signature === 'string' && wSign.payload.contract.homeowner_signature.startsWith('data:image'), wSign && wSign.payload.contract ? String(wSign.payload.contract.homeowner_signature).slice(0, 22) : 'none');
const disarmed = await page.evaluate(() => window.__ceSigner === null || typeof window.__ceSigner === 'undefined');
chk('contract callback is cleared after signing', disarmed);
const stageAdvanced = await anyWrite('projects', "x.op==='update' && x.payload && x.payload.stage==='Approved'");
chk('signing advances the job (setStage → projects stage=Approved)', stageAdvanced);
s = await ceState();
chk('after Sign: status Signed, no Send/Sign/Void', /signed/i.test(s.status) && !s.acts.includes('sign') && !s.acts.includes('send') && !s.acts.includes('void'), s.status + ' / ' + s.acts.join(','));

// ---- NEGATIVE: inspection_reports path is a no-op when unarmed ----
await page.evaluate(() => { window.__ceSigner = null; try { sigDrawn = true; } catch (e) { window.sigDrawn = true; } });
const cBeforeNoop = await writeCount('contracts');
await page.evaluate(() => { const m = document.getElementById('sigModal'); if (m) m.style.display = 'block'; document.getElementById('sigApply').click(); });
await page.waitForTimeout(400);
const cAfterNoop = await writeCount('contracts');
chk('unarmed sigApply (inspection_reports path) writes NO contract', cAfterNoop === cBeforeNoop, `before=${cBeforeNoop} after=${cAfterNoop}`);

// ---- Void a fresh draft (C2) ----
await page.evaluate(() => { window.__promptReason = 'test void'; window.prompt = () => window.__promptReason; });
await page.evaluate(() => window.openContractEditor({ id: 'C2' }));
await page.waitForTimeout(500);
await clickCE("void");
await page.waitForTimeout(400);
let wVoid = await lastWrite('contracts');
chk('Void writes contracts {status:voided, voided_at}', wVoid && wVoid.op === 'update' && wVoid.payload.status === 'voided' && !!wVoid.payload.voided_at, JSON.stringify(wVoid && wVoid.payload));

let fails = 0;
console.log('lifecycle editor present:', hasLifecycle);
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? '  (' + c.detail + ')' : ''}`); if (!c.pass) fails++; }
if (errs.length) console.log('PAGE ERRORS:', [...new Set(errs)].slice(0, 8).join(' | '));
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
