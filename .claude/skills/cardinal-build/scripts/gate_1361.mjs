// gate_1361 — Edit client info can move a job from Retail to Insurance (Theo's screenshot: Work type "Insurance
// (legacy — set Claim Type instead)", client still under Retail).
// A: a retail client on the legacy Insurance work type: the form shows Claim type with Retail on.
// B: re-picking the legacy Insurance work type selects Insurance; Save runs the Convert path (asks for the
//    carrier etc.) and the job's lead.claim_type becomes insurance.
// C: a job with no claim type but a legacy Insurance work type opens on Insurance.
// D: a Community job shows the note, not the chips, and Save leaves it community.
// E: a new lead started as Insurance is created with lead.claim_type insurance.
// node gate_1361.mjs [index.html]   (1360 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
let prompts = 0;
p.on('dialog', d => { if (d.type() === 'prompt') { prompts++; d.accept(prompts === 1 ? 'Test Mutual' : ''); } else d.accept(); });
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const S = window.__SEED__, out = {};
  const setCk = (id, fn) => { const pr = S.projects.find(x => x.id === id); const ck = JSON.parse(pr.checklist || '{}'); fn(ck); pr.checklist = JSON.stringify(ck); };
  setCk('p1', ck => { ck.lead = Object.assign({}, ck.lead || {}, { claim_type: 'retail', retail: true, insurance: null }); ck.work_type = 'Insurance'; ck.lead_source = 'Google / website'; });
  setCk('p2', ck => { ck.lead = Object.assign({}, ck.lead || {}); delete ck.lead.claim_type; delete ck.lead.retail; delete ck.lead.insurance; ck.work_type = 'Insurance'; ck.lead_source = 'Referral'; });
  const p3 = S.projects.find(x => x.id !== 'p1' && x.id !== 'p2');
  if (p3) { const ck = JSON.parse(p3.checklist || '{}'); ck.lead = Object.assign({}, ck.lead || {}, { claim_type: 'community' }); ck.lead_source = 'Referral'; p3.checklist = JSON.stringify(ck); out.p3 = p3.id; }
  await window.reload(); await pause(500);
  const on = () => { const c = document.querySelector('#pfClaimChips .pf-chip.on'); return c ? c.getAttribute('data-claim') : null; };
  const vis = id => { const e = document.getElementById(id); return !!(e && getComputedStyle(e).display !== 'none'); };
  const ct = id => { const pr = window.cacheProjects.find(x => x.id === id); return pr ? window.projClaimType(pr) : null; };
  /* A */
  window.openProject('p1'); await pause(1800);
  window.openProjModal(window.currentProject); await pause(300);
  out.a = { chips: vis('pfClaimChips'), on: on() };
  if (!document.getElementById('pfClaimChips')) return out;
  /* B */
  const wt = document.getElementById('pfWorkType'); wt.value = 'Insurance'; wt.dispatchEvent(new Event('change', { bubbles: true })); await pause(150);
  out.b1 = on();
  document.getElementById('pfSave').click(); await pause(3500);
  out.b2 = ct('p1');
  /* C */
  window.openProject('p2'); await pause(1800);
  window.openProjModal(window.currentProject); await pause(300);
  out.c = on();
  document.getElementById('pfCancel').click(); await pause(200);
  /* D */
  if (out.p3) {
    window.openProject(out.p3); await pause(1800);
    window.openProjModal(window.currentProject); await pause(300);
    out.d1 = { chips: vis('pfClaimChips'), note: vis('pfClaimNote') };
    document.getElementById('pfSave').click(); await pause(2500);
    out.d2 = ct(out.p3);
  }
  /* E */
  window.openProjModal(null); await pause(300);
  document.getElementById('pfName').value = 'Gate Lead 1361';
  const src = document.querySelector('#pfSourceChips .pf-chip'); if (src) src.click();
  const ins = document.querySelector('#pfClaimChips [data-claim="insurance"]'); if (ins) ins.click();
  const w0 = (window.__WRITES__ || []).length;
  document.getElementById('pfSave').click(); await pause(2500);
  const cr = (window.__WRITES__ || []).slice(w0).filter(w => w.table === 'projects' && w.op === 'insert')[0];
  const pl = cr && (Array.isArray(cr.payload) ? cr.payload[0] : cr.payload);
  try { out.e = JSON.parse(pl.checklist).lead; } catch (e) { out.e = null; }
  return out;
});
ok(r.a && r.a.chips && r.a.on === 'retail', 'A: the form shows Claim type, Retail on', JSON.stringify(r.a));
ok(r.b1 === 'insurance', 'B: picking the legacy Insurance work type selects Insurance', r.b1);
ok(r.b2 === 'insurance', 'B: Save moves the client to the Insurance tab (changeClaimType, the Convert path)', JSON.stringify({ ct: r.b2, prompts }));
ok(r.c === 'insurance', 'C: no claim type + legacy Insurance work type opens on Insurance', r.c);
ok(r.d1 && !r.d1.chips && r.d1.note && r.d2 === 'community', 'D: a Community job shows the note and stays community', JSON.stringify({ d1: r.d1, d2: r.d2 }));
ok(r.e && r.e.claim_type === 'insurance', 'E: a new lead started as Insurance is created as insurance', JSON.stringify(r.e));
await b.close();
console.log(fail ? 'GATE 1361 RED — ' + fail + ' failing' : 'GATE 1361 GREEN');
process.exit(fail ? 1 : 0);
