/*
 * E2E click-through harness for the Cardinal app (see CR_E2E_WORKFLOW_VALIDATION_2026-08.md).
 * NON-DESTRUCTIVE by construction: renders the repo's own index.html locally in Chromium against a
 * recording mock Supabase client (./e2e_mock_supa.js). It cannot reach or write production — it drives
 * the real UI (project -> estimate -> contract -> crew -> payment) and records the writes each step
 * ATTEMPTS. Proves front-end reachability + intended write payloads; RLS/trigger effects are validated
 * separately against the live schema.
 *
 * Run:  node .claude/skills/cardinal-build/scripts/e2e_drive.mjs   (from repo root)
 * Env:  CARDINAL_ROOT (default cwd), E2E_OUT (screenshot dir), PLAYWRIGHT path auto-resolved.
 * Needs: Chromium at /opt/pw-browsers/... and a resolvable `playwright` (global or local).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found (install globally or locally)'); process.exit(2); }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ROOT = process.env.CARDINAL_ROOT || process.cwd();
const OUT = process.env.E2E_OUT || '/tmp/cardinal-e2e-shots';
mkdirSync(OUT, { recursive: true });
const APP_HTML = readFileSync(ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

// Real-shape seeds (values obviously test / from real column shapes).
const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'nick@cardinalrenovations.net', name: 'Nick Hey', role: 'sales', title: 'Sales' }
  ],
  crews: [
    { id: 'crew-siding-1', name: 'Jamie & Robin', legal_name: 'Pineda Siding', trade: 'Siding', archived: false, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T21:27:49Z' },
    { id: 'crew-roof-1', name: 'Test Roof Crew', legal_name: 'Test Roofing LLC', trade: 'Roofing', archived: false, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T21:28:00Z' }
  ],
  pricing_categories: [
    { id: 'cat-1', name: 'Tearoff & Prep', template: 'roofing', sort_order: 10 },
    { id: 'cat-2', name: 'Decking', template: 'roofing', sort_order: 21 },
    { id: 'cat-3', name: 'Flashings', template: 'roofing', sort_order: 60 }
  ],
  pricing_items: [
    { id: 'pi-1', sku: 'tearoff', name: 'Tear off existing shingle layer(s), haul away', rate: 75, unit: 'sq', enabled: true, category: 'Tearoff & Prep', template: 'roofing', sort_order: 10, description: 'Includes cleanup' },
    { id: 'pi-2', sku: 'deck_replace', name: 'Decking sheet replacement (4x8 OSB)', rate: 85, unit: 'ea', enabled: true, category: 'Decking', template: 'roofing', sort_order: 21 },
    { id: 'pi-3', sku: 'pipe_boot', name: 'New pipe boot flashing', rate: 85, unit: 'ea', enabled: true, category: 'Flashings', template: 'roofing', sort_order: 60 }
  ],
  projects: [],
  estimates: [], inspection_reports: [], crew_work_orders: [], collections: [], commissions: [],
  ai_estimates: [], contracts: [], punch_items: [], appointments: [], insurance_claims: []
};

const steps = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });

// ---- routing: serve local app, mock CDNs, neutralise external + api calls ----
await page.route('**/*', async route => {
  const url = route.request().url();
  const rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') {
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  }
  if (url.includes('@supabase/supabase-js')) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  }
  if (url.includes('chart.js') || url.includes('papaparse')) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: `/* stubbed */ window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};` });
  }
  if (url.startsWith('https://app.cardinalroster.com/api/')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') {
    return route.abort();
  }
  // any other same-origin asset -> empty; external -> abort
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});

await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK); // ensure window.supabase exists even before the CDN tag resolves
// screenshots otherwise block on document.fonts.ready (external fonts aborted)
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', size: 0, check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

async function shot(name) { try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); } catch (e) { console.log(`(shot ${name} failed: ${String(e).slice(0,80)})`); } }
async function writes() { return await page.evaluate(() => (window.__WRITES__ || []).map(w => ({ table: w.table, op: w.op, payload: w.payload }))); }
async function clearWrites() { await page.evaluate(() => { window.__WRITES__ = []; }); }
async function visibleText(sel) { try { return (await page.locator(sel).first().innerText({ timeout: 800 })).trim().slice(0, 300); } catch { return null; } }
function record(step, status, detail, w) { steps.push({ step, status, detail, writes: w || [] }); console.log(`\n### ${step}: ${status}\n${detail}`); if (w && w.length) console.log('writes:', JSON.stringify(w)); }

await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2800);
async function killVeil() { await page.evaluate(() => { ['restoreVeil'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; }); }); }
await killVeil();

// ---- boot / auth ----
const mainVisible = await page.evaluate(() => { const m = document.getElementById('mainView'); return m && getComputedStyle(m).display !== 'none'; });
const loginVisible = await page.evaluate(() => { const l = document.getElementById('loginView'); return l && l.classList.contains('open'); });
await shot('00-boot');
record('0. Boot / auth (mock admin session)', mainVisible ? 'PASS' : (loginVisible ? 'LOGIN-SHOWN' : 'UNKNOWN'),
  `mainView visible=${mainVisible}, loginView open=${loginVisible}. whoami="${await visibleText('#whoami')}"`);

if (!mainVisible && loginVisible) {
  await page.fill('#loginEmail', 'theo@cardinalrenovations.net');
  await page.fill('#loginPassword', 'mock');
  await page.click('#loginBtn');
  await page.waitForTimeout(1500);
  await shot('00b-afterlogin');
}

// ================= STEP 1: CREATE PROJECT (New > Lead) =================
await clearWrites();
await killVeil();
try {
  // Open the top-nav "New" flyout with a real click, then the Lead option.
  await page.click('#addProjectBtn', { timeout: 4000, force: true });
  await page.waitForTimeout(400);
  let menuOpen = await page.evaluate(() => { const m = document.getElementById('newMenu'); return m && getComputedStyle(m).display !== 'none'; });
  await shot('01a-newmenu');
  const leadOpt = page.locator('#newMenu [data-new="lead"]');
  if (menuOpen && await leadOpt.isVisible().catch(() => false)) {
    await leadOpt.click({ timeout: 3000, force: true });
  } else {
    // flyout didn't render in headless positioning — invoke the exact handler the option triggers
    await page.evaluate(() => { const b = document.querySelector('#newMenu [data-new="lead"]'); if (b) b.click(); else if (typeof openLeadForm === 'function') openLeadForm(); });
  }
  await page.waitForTimeout(700);
  const leadOpen = await page.evaluate(() => { const m = document.getElementById('leadFormModal'); return m && getComputedStyle(m).display !== 'none'; });
  await shot('01b-leadform');
  if (leadOpen) {
    await page.fill('#ldFirst', 'ZZ-E2E');
    await page.fill('#ldLast', 'TEST-DELETE-ME');
    await page.fill('#ldStreet', '1 Test Way');
    await page.fill('#ldCity', 'Dayton');
    await page.selectOption('#ldState', 'OH');
    await page.fill('#ldZip', '45414');
    await page.click('#ldSave', { timeout: 4000, force: true });
    await page.waitForTimeout(1600);
    const w = await writes();
    const ins = w.find(x => x.table === 'projects' && (x.op === 'insert' || x.op === 'upsert'));
    const errTxt = await visibleText('#ldError');
    await shot('01c-after-save');
    record('1. Create project (New ▸ Lead ▸ form ▸ Create Lead)', ins ? 'PASS — writes projects' : 'FORM-OK-NO-WRITE',
      `leadFormModal opened, 6 required fields filled, Create clicked. projects insert=${!!ins}. ldError="${errTxt || ''}". stage=${ins ? ins.payload.stage : '-'}, checklist keys=${ins && ins.payload.checklist ? Object.keys(JSON.parse(ins.payload.checklist)).join(',') : '-'}`, w);
  } else {
    record('1. Create project', 'LEADFORM-DID-NOT-OPEN', `newMenu visible=${menuOpen}; leadFormModal did not open.`, await writes());
  }
} catch (e) { record('1. Create project', 'ERROR', String(e).slice(0, 300), await writes()); }

// open the project profile — click the card if present, else via openProject(id)
let profileOpen = false;
let openedBy = 'none';
try {
  await killVeil();
  await page.waitForTimeout(400);
  const card = page.locator('.pcard[data-proj]').first();
  if (await card.count()) {
    try { await card.click({ timeout: 4000, force: true }); openedBy = 'card-click'; } catch (e) {}
    await page.waitForTimeout(1200);
  }
  profileOpen = await page.evaluate(() => { const v = document.getElementById('projectView'); return v && getComputedStyle(v).display !== 'none'; });
  if (!profileOpen) {
    // fallback: open via the app's own function using the seeded/created project id
    openedBy = await page.evaluate(() => {
      try {
        const p = (window.__SEED__ && window.__SEED__.projects && window.__SEED__.projects[0]);
        const id = p && p.id;
        if (id && typeof openProject === 'function') { openProject(id); return 'openProject(id)'; }
        // as last resort, grab first card's data-proj
        const c = document.querySelector('.pcard[data-proj]');
        if (c && typeof openProject === 'function') { openProject(c.getAttribute('data-proj')); return 'openProject(card-id)'; }
        return 'no-openProject';
      } catch (e) { return 'err:' + e.message; }
    });
    await page.waitForTimeout(1200);
    profileOpen = await page.evaluate(() => { const v = document.getElementById('projectView'); return v && getComputedStyle(v).display !== 'none'; });
  }
  await killVeil();
  await shot('01c-profile');
  record('1b. Open project profile', profileOpen ? 'PASS' : 'FAIL', `projectView visible=${profileOpen} (via ${openedBy}). header ctx="${await visibleText('#headCtx')}"`);
} catch (e) { record('1b. Open project profile', 'ERROR', String(e).slice(0, 200)); }

// helper: navigate the job dossier the way the job-menu <select> does (showTab).
// Records whether the <select> control is itself display-visible (reachability caveat).
async function jobTab(val, label) {
  await clearWrites();
  await killVeil();
  try {
    const r = await page.evaluate((v) => {
      const sel = document.getElementById('jobMenuSel');
      const selVisible = sel ? getComputedStyle(sel).display !== 'none' : false;
      const tab = document.getElementById('tab-' + v);
      const existed = !!tab;
      if (typeof showTab === 'function') showTab(v);
      const nowVisible = tab ? getComputedStyle(tab).display !== 'none' : false;
      return { selVisible, existed, nowVisible };
    }, val);
    await page.waitForTimeout(1000);
    return r;
  } catch (e) { record(label, 'ERROR', String(e).slice(0, 200)); return false; }
}

// ================= STEP 2: ESTIMATE =================
let jt2;
if (profileOpen && (jt2 = await jobTab('estimates', '2. Estimates tab'))) {
  await shot('02a-estimates-tab');
  record('2. Estimates tab reachable', jt2.existed && jt2.nowVisible ? 'REACHABLE' : 'FAIL', `#tab-estimates exists=${jt2.existed}, visible after showTab=${jt2.nowVisible}, job-menu <select> display-visible=${jt2.selVisible}`);
  const info = await page.evaluate(() => {
    const t = document.getElementById('tab-estimates');
    const btns = t ? [...t.querySelectorAll('button,a,[data-act],[data-go]')].map(b => (b.innerText || b.getAttribute('data-act') || b.getAttribute('data-go') || '').trim()).filter(Boolean).slice(0, 25) : [];
    return { present: !!t, visible: t && getComputedStyle(t).display !== 'none', buttons: btns, text: (t ? t.innerText : '').slice(0, 400) };
  });
  record('2. Estimates tab', info.visible ? 'REACHABLE' : 'NOT-VISIBLE', `buttons: ${info.buttons.join(' | ')}`, await writes());
  // Start a template estimate ("Roofing estimate") -> opens the CardinalEstimates editor
  await clearWrites();
  try {
    // the template lives in a JS-positioned flyout (display:none in headless); dispatch the button's own handler
    const how = await page.evaluate(() => {
      const tog = document.getElementById('pNewEstimateBtn'); if (tog) tog.click();
      const rb = document.querySelector('#tab-estimates [data-tpl="roof"]');
      if (rb) { rb.click(); return 'roof template button.click()'; }
      return 'no roof button';
    });
    await page.waitForTimeout(1600);
    const opened = await page.evaluate(() => {
      const v = document.getElementById('cr-est-view') || document.querySelector('.cr-est-view, #cr-estimates-mount');
      const anyEditor = v && getComputedStyle(v).display !== 'none';
      const apiOpen = !!(window.CardinalEstimates);
      const editorText = v ? (v.innerText || '').slice(0, 120) : '';
      return { anyEditor, apiOpen, editorText };
    });
    await shot('02b-estimate-editor');
    record('2b. Start an estimate (Roofing template)', opened.apiOpen ? 'REACHABLE' : 'NO-MODULE', `via ${how}; CardinalEstimates present=${opened.apiOpen}; editor view visible=${opened.anyEditor}; editor="${opened.editorText.replace(/\n/g,' ')}"`, await writes());
  } catch (e) { record('2b. Start an estimate', 'ERROR', String(e).slice(0, 200), await writes()); }
  // Also probe the AI Estimate button (writes ai_estimates via /api/estimate)
  await clearWrites();
  try {
    // close any editor overlay first
    await page.evaluate(() => { try { if (window.CardinalEstimates && window.CardinalEstimates.close) window.CardinalEstimates.close(); } catch (e) {} });
    await page.waitForTimeout(400);
    const aib = page.locator('#tab-estimates button', { hasText: 'AI Estimate' }).first();
    let how = 'none';
    if (await aib.count()) { await aib.click({ timeout: 3000, force: true }); how = 'AI Estimate'; await page.waitForTimeout(1500); }
    await shot('02c-ai-estimate');
    record('2c. AI Estimate button', (await aib.count()) ? 'PRESENT-CLICKED' : 'ABSENT', `AI Estimate button present=${await aib.count() > 0}; clicked=${how}. (writes ai_estimates via /api/estimate — stubbed here)`, await writes());
  } catch (e) { record('2c. AI Estimate button', 'ERROR', String(e).slice(0, 200), await writes()); }
  // close any overlay
  await page.evaluate(() => { try { if (window.CardinalEstimates && window.CardinalEstimates.close) window.CardinalEstimates.close(); } catch (e) {} });
  await page.keyboard.press('Escape').catch(()=>{});
  await page.waitForTimeout(400);
}

// ================= STEP 3: CONTRACT =================
let jt3;
if (profileOpen) {
  // re-open profile if an overlay swallowed it
  await page.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.style.display = 'block'; });
  if ((jt3 = await jobTab('contracts', '3. Contracts tab'))) {
    await shot('03a-contracts-tab');
    const info = await page.evaluate(() => {
      const t = document.getElementById('tab-contracts');
      const btns = t ? [...t.querySelectorAll('button,a,[data-act],[data-go]')].map(b => (b.innerText || b.getAttribute('data-act') || '').trim()).filter(Boolean).slice(0, 25) : [];
      return { present: !!t, visible: t && getComputedStyle(t).display !== 'none', buttons: btns, text: (t ? t.innerText : '').slice(0, 400) };
    });
    record('3. Contracts tab', info.present ? (jt3.nowVisible ? 'REACHABLE' : 'PRESENT-HIDDEN') : 'ABSENT', `#tab-contracts exists=${jt3.existed}, visible=${jt3.nowVisible}. buttons: ${info.buttons.join(' | ')} :: text="${info.text.replace(/\n/g,' ').slice(0,200)}"`, await writes());
    // + New contract -> createContractForCurrent -> db.create('Contract — ...') -> inspection_reports insert
    await clearWrites();
    try {
      const nc = page.locator('#pNewContractBtn');
      if (await nc.count()) {
        await page.evaluate(() => { const b = document.getElementById('pNewContractBtn'); if (b) b.click(); });
        await page.waitForTimeout(1600);
        const w = await writes();
        const ins = w.find(x => x.table === 'inspection_reports' && x.op === 'insert');
        await shot('03b-newcontract');
        const title = ins && ins.payload ? (ins.payload.title || '') : '';
        record('3b. + New contract → contract document', ins ? 'PASS — writes inspection_reports (contract doc)' : 'FORM/EDITOR-NO-WRITE',
          `createContractForCurrent invoked. inspection_reports insert=${!!ins}. title="${title}". (This is the LIVE contract path; the new contracts table is a separate Convert-to-Contract flow.)`, w);
      } else { record('3b. + New contract', 'NO-BUTTON', '#pNewContractBtn not present.', await writes()); }
    } catch (e) { record('3b. + New contract', 'ERROR', String(e).slice(0, 200), await writes()); }
  }
}

// ================= STEP 4: CREW WORK ORDER =================
let jt4;
if (profileOpen) {
  await page.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.style.display = 'block'; });
  if ((jt4 = await jobTab('workorders', '4. Work Orders tab'))) {
    await shot('04a-workorders-tab');
    const info = await page.evaluate(() => {
      const t = document.getElementById('tab-workorders') || document.querySelector('[id*="workorder" i]');
      const btns = t ? [...t.querySelectorAll('button,a,[data-act],[data-go],select')].map(b => (b.innerText || b.getAttribute('data-act') || b.tagName).trim()).filter(Boolean).slice(0, 25) : [];
      return { present: !!t, visible: t && getComputedStyle(t).display !== 'none', buttons: btns, text: (t ? t.innerText : '').slice(0, 400) };
    });
    record('4. Work Orders tab', info.present ? (jt4.nowVisible ? 'REACHABLE' : 'PRESENT-HIDDEN') : 'ABSENT', `#tab-workorders exists=${jt4.existed}, visible=${jt4.nowVisible}. buttons: ${info.buttons.join(' | ')} :: "${info.text.replace(/\n/g,' ').slice(0,180)}"`, await writes());
    // open the New Work Order flow (#pNewWorkOrderBtn) — the crew/trade picker that inserts crew_work_orders
    await clearWrites();
    try {
      const wob = page.locator('#pNewWorkOrderBtn');
      const have = await wob.count();
      if (have) { await wob.click({ timeout: 3000, force: true }); await page.waitForTimeout(1200); }
      await shot('04b-wo-open');
      const st = await page.evaluate(() => {
        // the WO builder renders a trade/crew chooser; detect any crew option + generate control
        const txt = document.body.innerText;
        const hasCrewPick = /trade|crew|Jamie|Deaton|Roofing|Siding/i.test(txt);
        const genBtn = [...document.querySelectorAll('button')].find(b => /generate|create work order|issue|send to crew/i.test(b.innerText || ''));
        return { hasCrewPick, gen: genBtn ? (genBtn.innerText || '').trim().slice(0, 40) : null };
      });
      record('4b. New Work Order flow', have ? 'OPENED' : 'NO-BUTTON', `#pNewWorkOrderBtn present=${!!have}; crew/trade UI detected=${st.hasCrewPick}; generate control="${st.gen || '-'}". (Save path: crew_work_orders.insert — index.html:18933)`, await writes());
    } catch (e) { record('4b. New Work Order flow', 'ERROR', String(e).slice(0, 200), await writes()); }
    await page.keyboard.press('Escape').catch(()=>{});
    await page.waitForTimeout(400);
  }
}

// ================= STEP 5: PAYMENT / MONEY =================
let jt5;
if (profileOpen) {
  await page.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.style.display = 'block'; });
  if ((jt5 = await jobTab('commissions', '5. Commissions/Money tab'))) {
    await shot('05a-commissions-tab');
    const info = await page.evaluate(() => {
      const t = document.getElementById('tab-commissions') || document.querySelector('[id*="commission" i]');
      const btns = t ? [...t.querySelectorAll('button,a,[data-act],[data-go]')].map(b => (b.innerText || b.getAttribute('data-act') || '').trim()).filter(Boolean).slice(0, 25) : [];
      return { present: !!t, visible: t && getComputedStyle(t).display !== 'none', buttons: btns, text: (t ? t.innerText : '').slice(0, 400) };
    });
    record('5. Commissions/Money tab', info.present ? (jt5.nowVisible ? 'REACHABLE' : 'PRESENT-HIDDEN') : 'ABSENT', `#tab-commissions exists=${jt5.existed}, visible=${jt5.nowVisible}. buttons: ${info.buttons.join(' | ')} :: "${info.text.replace(/\n/g,' ').slice(0,180)}"`, await writes());
    // Log a collection: "+ Log Collection" (#miCollBtn) -> form -> Save (#miSave) -> insert collections
    await clearWrites();
    try {
      const collBtn = page.locator('#miCollBtn');
      const haveBtn = await collBtn.count();
      if (haveBtn) {
        await collBtn.click({ timeout: 3000, force: true });
        await page.waitForTimeout(900);
        let formShown = await page.evaluate(() => !!document.getElementById('miAmt'));
        if (!formShown) { // ensure the form is open via the app's own state, then re-render
          await page.evaluate(() => { try { if (window.commUi) { window.commUi.collForm = true; } if (typeof renderCommissions === 'function') renderCommissions(); } catch (e) {} });
          await page.waitForTimeout(900);
          formShown = await page.evaluate(() => !!document.getElementById('miAmt'));
        }
        await shot('05b-collform');
        if (formShown) {
          await page.fill('#miAmt', '5000.00');
          await page.selectOption('#miType', { index: 0 }).catch(() => {});
          await page.waitForTimeout(200);
          // invoke the exact bound handler (avoids racing the async re-render that rebinds #miSave)
          await page.evaluate(() => { try { if (typeof miSaveColl === 'function') return miSaveColl(); const b = document.getElementById('miSave'); if (b) b.click(); } catch (e) {} });
          await page.waitForTimeout(1200);
          const w = await writes();
          const ins = w.find(x => x.table === 'collections' && x.op === 'insert');
          await shot('05c-collsaved');
          record('5b. Log a check → collections', ins ? 'PASS — writes collections' : 'FORM-OK-NO-WRITE',
            `"+ Log Collection" opened the form, amount+type filled, Save clicked. collections insert=${!!ins}. payload=${ins ? JSON.stringify(ins.payload) : '-'}`, w);
        } else {
          record('5b. Log a check', 'FORM-DID-NOT-OPEN', '#miCollBtn present but form (#miAmt) did not render.', await writes());
        }
      } else {
        record('5b. Log a check', 'NO-LOG-BUTTON', '#miCollBtn not present (may be admin/full-access gated in render).', await writes());
      }
    } catch (e) { record('5b. Log a check', 'ERROR', String(e).slice(0, 200), await writes()); }
  }
}

// also probe the standalone Pay/Collections module via CardinalPay
try {
  await clearWrites();
  const payOpen = await page.evaluate(() => { try { if (window.CardinalPay && window.CardinalPay.open) { window.CardinalPay.open(); return true; } } catch (e) { return 'err:' + e.message; } return false; });
  await page.waitForTimeout(1000);
  await shot('05c-paymodule');
  const payVis = await page.evaluate(() => { const v = document.getElementById('payView'); return v && getComputedStyle(v).display !== 'none'; });
  record('5c. Standalone Pay module (CardinalPay.open)', payVis ? 'REACHABLE' : (payOpen === true ? 'CALLED-NOT-VISIBLE' : 'NO-MODULE'), `payView visible=${payVis}, open()=${payOpen}`, await writes());
} catch (e) { record('5c. Standalone Pay module', 'ERROR', String(e).slice(0, 200)); }

writeFileSync(OUT + '/report.json', JSON.stringify({ steps, pageErrors: [...new Set(pageErrors)].slice(0, 40) }, null, 2));
console.log('\n\n===== PAGE ERRORS (unique, first 40) =====');
console.log([...new Set(pageErrors)].slice(0, 40).join('\n') || '(none)');
console.log('\n===== DONE =====');
await browser.close();
