/*
 * drive_lifecycle.mjs — the FULL retail lifecycle, driven through the stage machine.
 *
 * Where e2e_drive.mjs proved each station REACHABLE, this drives one mock client
 * end-to-end through every pipeline stage with real clicks against the repo's own
 * index.html in Chromium + the recording mock (e2e_mock_supa.js):
 *
 *   Intake (Lead) → Prospect → Inspection report → Estimate (total, sign)
 *   → Approvals queue → Approve & create contract → contract SIGN (auto-Approved?)
 *   → Production board (Needs scheduling → Materials? → Build day) → Scheduled
 *   → Completed (walk-around buzz) → punch item blocks → close punch
 *   → Worksheet payment → Create invoice → Email → auto-Invoiced?
 *
 * It records, per station: writes attempted, NATIVE DIALOGS (count + text — the
 * iPad friction metric), notifications posted to /api/notify + /api/senddoc, and
 * a screenshot. Non-destructive by construction: nothing leaves the machine.
 *
 * Run:  node .claude/skills/cardinal-build/scripts/drive_lifecycle.mjs   (repo root)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ROOT = process.env.CARDINAL_ROOT || process.cwd();
const OUT = process.env.E2E_OUT || '/tmp/cardinal-lifecycle-shots';
mkdirSync(OUT, { recursive: true });
const APP_HTML = readFileSync(ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production' },
    { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' }
  ],
  projects: [], estimates: [], inspection_reports: [], contracts: [], punch_items: [],
  appointments: [], collections: [], commissions: [], crew_work_orders: [], ai_estimates: [],
  insurance_claims: [], crews: [], pricing_items: [], pricing_categories: []
};

const stations = [];
const pageErrors = [];
const NOTIFIES = [];          // captured /api/notify + /api/senddoc bodies
let DIALOGS = [];             // per-station dialog log (reset at each station)
let ALL_DIALOGS = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('pageerror', e => pageErrors.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });

/* ---- dialog policy: every native dialog is logged (friction) and answered ---- */
let dialogPolicy = () => ({ action: 'accept' });
page.on('dialog', async d => {
  const entry = { type: d.type(), message: d.message().slice(0, 220), default: d.defaultValue() };
  const pol = dialogPolicy(d) || { action: 'accept' };
  entry.answered = pol.action + (pol.text !== undefined ? `("${String(pol.text).slice(0, 60)}")` : '');
  DIALOGS.push(entry); ALL_DIALOGS.push(entry);
  try {
    if (pol.action === 'dismiss') await d.dismiss();
    else await d.accept(pol.text !== undefined ? String(pol.text) : (d.type() === 'prompt' ? d.defaultValue() : undefined));
  } catch (e) {}
});

/* ---- routing: local app, mock CDN, RECORD notify/senddoc bodies ---- */
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
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: `/* stub */ window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};` });
  }
  if (url.includes('/api/notify') || url.includes('/api/senddoc')) {
    let body = null; try { body = JSON.parse(route.request().postData() || 'null'); } catch (e) {}
    NOTIFIES.push({ api: url.includes('notify') ? 'notify' : 'senddoc',
      to: body && (body.emails || body.to), title: body && (body.title || body.subject || null) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"sent":1,"failed":0}' });
  }
  if (url.startsWith('https://app.cardinalroster.com/api/')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});

await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', size: 0, check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

async function shot(name) { try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); } catch (e) {} }
async function writes() { return await page.evaluate(() => (window.__WRITES__ || []).map(w => ({ table: w.table, op: w.op, payload: w.payload }))); }
async function clearWrites() { await page.evaluate(() => { window.__WRITES__ = []; }); }
async function stageBanner() {
  return await page.evaluate(() => {
    const b = document.getElementById('stageBanner');
    return b ? (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120) : null;
  });
}
async function projRow() {
  return await page.evaluate(() => {
    const p = (window.__SEED__.projects || [])[0];
    return p ? { id: p.id, stage: p.stage, name: p.name } : null;
  });
}
function record(station, status, detail, extra) {
  const s = Object.assign({ station, status, detail, dialogs: DIALOGS }, extra || {});
  stations.push(s);
  console.log(`\n### ${station}: ${status}\n${detail}`);
  if (DIALOGS.length) console.log('dialogs:', DIALOGS.map(d => `${d.type}:"${d.message.slice(0, 70)}"→${d.answered}`).join(' | '));
  DIALOGS = [];
}

await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2800);
await page.evaluate(() => { const el = document.getElementById('restoreVeil'); if (el) el.style.display = 'none'; });

const mainVisible = await page.evaluate(() => { const m = document.getElementById('mainView'); return m && getComputedStyle(m).display !== 'none'; });
await shot('L00-boot');
record('S0 Boot (mock admin)', mainVisible ? 'PASS' : 'FAIL', `mainView visible=${mainVisible}`);

/* ================= S1: INTAKE — New ▸ Lead ================= */
await clearWrites();
{
  await page.click('#addProjectBtn', { force: true }).catch(() => {});
  await page.waitForTimeout(350);
  await page.evaluate(() => { const b = document.querySelector('#newMenu [data-new="lead"]'); if (b) b.click(); });
  await page.waitForTimeout(600);
  const formCensus = await page.evaluate(() => {
    const m = document.getElementById('leadFormModal');
    if (!m || getComputedStyle(m).display === 'none') return null;
    /* offsetParent!==null is the honest visibility test — getComputedStyle(el).display
       ignores hidden ANCESTORS, so it counts collapsed "More detail" fields and the
       display:none insurance box as visible (that produced the bogus "44 fields"). */
    const fields = [...m.querySelectorAll('input,select,textarea')].filter(el => el.type !== 'hidden' && el.offsetParent !== null);
    /* this form marks required with a visual "*" in the label + JS validation, not the
       HTML required attribute — count both so the census reflects what the user sees. */
    const required = fields.filter(el => {
      if (el.required || el.getAttribute('aria-required') === 'true') return true;
      const l = el.closest('label'); return l && /\*/.test(l.textContent);
    });
    return { total: fields.length, required: required.length,
      names: fields.map(f => f.id || f.name || f.placeholder || f.type).slice(0, 40) };
  });
  if (formCensus) {
    await page.fill('#ldFirst', 'ZZ-E2E');
    await page.fill('#ldLast', 'LIFECYCLE');
    // phone + email are dynamic "Add Another" rows with no fixed ids
    await page.evaluate(() => {
      const ph = document.querySelector('#ldPhones input[type="tel"], #ldPhones input');
      if (ph) { ph.value = '937-555-0100'; ph.dispatchEvent(new Event('input', { bubbles: true })); }
      const em = document.querySelector('#ldEmails input[type="email"], #ldEmails input');
      if (em) { em.value = 'zz-e2e@example.com'; em.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.fill('#ldStreet', '1 Test Way');
    await page.fill('#ldCity', 'Dayton');
    await page.selectOption('#ldState', 'OH').catch(() => {});
    await page.fill('#ldZip', '45414');
    await page.click('#ldSave', { force: true });
    await page.waitForTimeout(1500);
    const w = await writes();
    const ins = w.find(x => x.table === 'projects' && (x.op === 'insert' || x.op === 'upsert'));
    await shot('L01-intake');
    record('S1 Intake — New ▸ Lead', ins ? 'PASS' : 'NO-WRITE',
      `Lead modal: ${formCensus.total} visible fields, ${formCensus.required} marked required. 8 filled by driver. ` +
      `projects insert=${!!ins}${ins ? `, stage=${ins.payload.stage}` : ''}. Fields: ${formCensus.names.join(', ')}`,
      { writes: w, fieldCensus: formCensus });
  } else {
    record('S1 Intake', 'FORM-DID-NOT-OPEN', 'leadFormModal not visible', { writes: await writes() });
  }
}

/* ================= S1b: open profile ================= */
{
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const p = (window.__SEED__.projects || [])[0];
    if (p && typeof openProject === 'function') openProject(p.id);
  });
  await page.waitForTimeout(1200);
  const open = await page.evaluate(() => { const v = document.getElementById('projectView'); return v && getComputedStyle(v).display !== 'none'; });
  await shot('L01b-profile');
  record('S1b Open profile', open ? 'PASS' : 'FAIL', `projectView open=${open}. Stage banner: "${await stageBanner()}"`);
}

/* ================= S2: LEAD → PROSPECT (contactedBtn) ================= */
await clearWrites();
{
  const had = await page.evaluate(() => {
    const b = document.getElementById('contactedBtn');
    return b && getComputedStyle(b).display !== 'none';
  });
  // DOM click, not a coordinate click — a force-click lands on whatever element is
  // topmost at that point (a toast, the fab) and the handler never runs.
  if (had) { await page.evaluate(() => document.getElementById('contactedBtn').click()); await page.waitForTimeout(1100); }
  const w = await writes();
  const upd = w.find(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage === 'Prospect');
  const pr = await projRow();
  await shot('L02-prospect');
  record('S2 Lead → Prospect ("Client contacted")', upd ? 'PASS' : (had ? 'NO-WRITE' : 'NO-BUTTON'),
    `contactedBtn visible=${had}. stage now=${pr && pr.stage}. stage_since stamped=${!!(upd && upd.payload.stage_since)}. Banner: "${await stageBanner()}"`,
    { writes: w });
}

/* ================= S3: INSPECTION REPORT ================= */
await clearWrites();
{
  // dialog plan: confirm("No Roofing Inspection Checklist…") → OK (create anyway); prompt(title) → default
  dialogPolicy = d => ({ action: 'accept' });
  await page.evaluate(() => { if (typeof showTab === 'function') showTab('inspections'); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const b = document.getElementById('pNewReportBtn'); if (b) b.click(); });
  await page.waitForTimeout(2200);
  const w = await writes();
  const ins = w.find(x => x.table === 'inspection_reports' && x.op === 'insert');
  const editorOpen = await page.evaluate(() => { const v = document.getElementById('editorView'); return v && getComputedStyle(v).display !== 'none'; });
  await shot('L03-inspection');
  record('S3 Inspection report (+ New Report)', ins ? 'PASS' : 'NO-WRITE',
    `inspection_reports insert=${!!ins}${ins ? `, title="${ins.payload.title}"` : ''}; editor opened=${editorOpen}. ` +
    `NOTE the dialog cost below — a confirm() about the missing checklist, then a prompt() for a title, before any report exists.`,
    { writes: w });
  await page.evaluate(async () => { try { await closeEditor(); } catch (e) {} });
  await page.waitForTimeout(700);
}

/* ================= S4: ESTIMATE — roofing template, total, SIGN ================= */
await clearWrites();
{
  dialogPolicy = d => ({ action: 'accept' });   // prompt(title) → default; alert(signed…) → ok
  await page.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.style.display = 'block'; if (typeof showTab === 'function') showTab('estimates'); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const t = document.getElementById('pNewEstimateBtn'); if (t) t.click();
    const b = document.querySelector('#pEstMenu [data-tpl="roof"], #tab-estimates [data-tpl="roof"]');
    if (b) b.click();
  });
  await page.waitForTimeout(2200);
  let w = await writes();
  const ins = w.find(x => x.table === 'inspection_reports' && x.op === 'insert');
  const editorOpen = await page.evaluate(() => { const v = document.getElementById('editorView'); return v && getComputedStyle(v).display !== 'none'; });

  // give the estimate a total the way the wired table would land it, then Save
  const totSet = await page.evaluate(() => {
    try {
      const f = document.getElementById('reportFrame');
      const d = f && f.contentDocument;
      const el = d && d.getElementById('estTotal');
      if (!el) return 'no-estTotal';
      el.textContent = '$12,480.00';
      return 'set';
    } catch (e) { return 'err:' + e.message; }
  });
  await page.evaluate(() => { const b = document.getElementById('saveBtn'); if (b) b.click(); });
  await page.waitForTimeout(1300);
  w = await writes();
  const saved = w.find(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && Number(x.payload.total) > 0);

  // sign it: sigBtn → draw a stroke → Apply
  await page.evaluate(() => { const b = document.getElementById('sigBtn'); if (b) b.click(); });
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const c = document.getElementById('sigPad'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  if (box) {
    await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.w * (0.2 + i * 0.07), box.y + box.h * (0.5 + Math.sin(i) * 0.15));
    await page.mouse.up();
  }
  await page.evaluate(() => { const b = document.getElementById('sigApply'); if (b) b.click(); });
  await page.waitForTimeout(2200);
  w = await writes();
  const signedUpd = w.find(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && x.payload.signed_at);
  const estNotify = NOTIFIES.filter(n => n.api === 'notify').slice(-1)[0];
  await shot('L04-estimate-signed');
  record('S4 Estimate — template → total → sign', (ins && saved && signedUpd) ? 'PASS' : 'PARTIAL',
    `estimate doc insert=${!!ins}; total stamped on save=${!!saved} (estTotal ${totSet}); signed_at=${!!signedUpd}. ` +
    `Approvals notify fired=${!!estNotify}${estNotify ? ` to=${JSON.stringify(estNotify.to)} title="${estNotify.title}"` : ''}. ` +
    `Estimate signing routes to the admin APPROVALS queue (it does NOT advance stage — by design).`,
    { writes: w.slice(-6) });
  await page.evaluate(async () => { try { await closeEditor(); } catch (e) {} });
  await page.waitForTimeout(700);
}

/* ================= S5: APPROVALS → APPROVE & CREATE CONTRACT → SIGN → Approved? ================= */
await clearWrites();
{
  dialogPolicy = d => ({ action: 'accept' });  // alert(contract created), alert(moved to APPROVED)
  // home, where the Approvals card renders
  await page.evaluate(() => { if (typeof renderHome === 'function') renderHome(); if (typeof renderPipeline === 'function') renderPipeline(); });
  await page.waitForTimeout(900);
  const apprState = await page.evaluate(() => {
    const b = document.querySelector('[data-approve]');
    return { present: !!b, label: b ? (b.innerText || '').trim() : null };
  });
  await shot('L05a-approvals');
  await page.evaluate(() => { const b = document.querySelector('[data-approve]'); if (b) b.click(); });
  await page.waitForTimeout(2500);
  let w = await writes();
  const contractIns = w.find(x => x.table === 'inspection_reports' && x.op === 'insert' && /^contract/i.test((x.payload.title || '')));
  const priceInDoc = contractIns ? /\$12,480\.00/.test(contractIns.payload.html || '') : false;

  // sign the contract in the editor
  await page.evaluate(() => { const b = document.getElementById('sigBtn'); if (b) b.click(); });
  await page.waitForTimeout(500);
  const box = await page.evaluate(() => {
    const c = document.getElementById('sigPad'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  if (box) {
    await page.mouse.move(box.x + box.w * 0.25, box.y + box.h * 0.45);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.w * (0.25 + i * 0.06), box.y + box.h * (0.45 + Math.cos(i) * 0.12));
    await page.mouse.up();
  }
  await page.evaluate(() => { const b = document.getElementById('sigApply'); if (b) b.click(); });
  await page.waitForTimeout(2600);
  w = await writes();
  const signedUpd = w.find(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && x.payload.signed_at);
  const stageUpd = w.find(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage === 'Approved');
  const pr = await projRow();
  const curtisNotify = NOTIFIES.filter(n => n.api === 'notify' && /APPROVED/i.test(n.title || '')).slice(-1)[0];
  await shot('L05b-contract-signed');
  record('S5 Approve & create contract → SIGN', (contractIns && signedUpd && stageUpd) ? 'PASS' : 'PARTIAL',
    `Approvals card present=${apprState.present}. contract doc insert=${!!contractIns} (estimate price carried into contract=${priceInDoc}); ` +
    `signed_at=${!!signedUpd}; AUTO-ADVANCE stage→Approved write=${!!stageUpd}; project.stage now=${pr && pr.stage}. ` +
    `Curtis buzz fired=${!!curtisNotify}${curtisNotify ? ` to=${JSON.stringify(curtisNotify.to)} title="${curtisNotify.title}"` : ''}.`,
    { writes: w.slice(-8) });
  await page.evaluate(async () => { try { await closeEditor(); } catch (e) {} });
  await page.waitForTimeout(700);
}

/* ================= S6: PRODUCTION — Needs scheduling → schedule → materials ================= */
await clearWrites();
{
  dialogPolicy = d => ({ action: 'accept' });
  await page.evaluate(() => { if (window.CardinalProduction) window.CardinalProduction.open(); });
  await page.waitForTimeout(1600);
  // the landing shows BOX COUNTS; the per-job blocker chips live one tap deeper —
  // tap into the Needs Ordered box the way a user would
  const state1 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const home = v ? (v.innerText || '') : '';
    const needsBox = v && v.querySelector('[data-box="needs"]');
    if (needsBox) needsBox.click();
    return { open: v && getComputedStyle(v).display !== 'none',
      boxCount1: /1[\s\S]{0,24}NEEDS ORDERED/i.test(home) || /NEEDS ORDERED/i.test(home),
      homeExcerpt: home.replace(/\s+/g, ' ').slice(0, 200) };
  });
  await page.waitForTimeout(900);
  const pane1 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const txt = v ? (v.innerText || '') : '';
    return { needsSched: /Needs scheduling/i.test(txt), excerpt: txt.replace(/\s+/g, ' ').slice(0, 260) };
  });
  state1.needsSched = pane1.needsSched;
  await shot('L06a-production-needs');
  await page.evaluate(() => { if (window.CardinalProduction) { window.CardinalProduction.close(false); window.CardinalProduction.open(); } });
  await page.waitForTimeout(900);

  // schedule the build day through the app's own appointment writer (the Schedule
  // Board drag is its own audited surface; the lifecycle needs the WRITE + the read-back)
  await page.evaluate(async () => {
    const p = (window.__SEED__.projects || [])[0];
    const d = new Date(Date.now() + 7 * 86400000);
    const pad = n => String(n).padStart(2, '0');
    await window.supa.from('appointments').insert({
      title: 'Build — ' + (p.name || ''), kind: 'job',
      appt_date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      appt_time: '08:00', project_id: p.id, notes: null
    });
    if (typeof adb !== 'undefined' && adb.list) { window.cacheAppts = await adb.list().catch(() => window.cacheAppts); }
    if (window.CardinalProduction) window.CardinalProduction.refresh();
  });
  await page.waitForTimeout(1300);
  const state2 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const needsBox = v && v.querySelector('[data-box="needs"]');
    if (needsBox) needsBox.click();
    return true;
  });
  await page.waitForTimeout(900);
  const pane2 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const txt = v ? (v.innerText || '') : '';
    return { materialsQ: /Materials\?/i.test(txt), needsSched: /Needs scheduling/i.test(txt),
      excerpt: txt.replace(/\s+/g, ' ').slice(0, 260) };
  });
  await shot('L06b-production-scheduled');
  await page.evaluate(() => { if (window.CardinalProduction) { window.CardinalProduction.close(false); window.CardinalProduction.open(); } });
  await page.waitForTimeout(800);

  // mark materials ordered from the client profile's Materials tab
  await page.evaluate(() => {
    if (window.CardinalProduction) window.CardinalProduction.close(false);
    const v = document.getElementById('projectView'); if (v) v.style.display = 'block';
    if (typeof showTab === 'function') showTab('materials');
    if (typeof renderMatOrderState === 'function') renderMatOrderState();
  });
  await page.waitForTimeout(700);
  const matBtn = await page.evaluate(() => {
    const b = document.querySelector('[data-matord="set"]');
    if (b) { b.click(); return true; } return false;
  });
  await page.waitForTimeout(1300);
  const w = await writes();
  const aIns = w.find(x => x.table === 'appointments' && x.op === 'insert');
  const ckUpd = w.find(x => x.table === 'projects' && x.op === 'update' && x.payload && /materials_ordered_at/.test(x.payload.checklist || ''));
  await page.evaluate(() => {
    if (window.CardinalProduction) { window.CardinalProduction.refresh(); window.CardinalProduction.open(); }
  });
  await page.waitForTimeout(1200);
  const state4 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const home = v ? (v.innerText || '') : '';
    const ordBox = v && v.querySelector('[data-box="ordered"]');
    if (ordBox) ordBox.click();
    return { orderedBox1: /1[\s\S]{0,26}ORDERED/i.test(home), homeExcerpt: home.replace(/\s+/g, ' ').slice(0, 200) };
  });
  await page.waitForTimeout(900);
  const pane4 = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const txt = v ? (v.innerText || '') : '';
    return { buildDay: /Build [A-Z][a-z]{2} \d/i.test(txt), excerpt: txt.replace(/\s+/g, ' ').slice(0, 260) };
  });
  await shot('L06c-production-ordered');
  record('S6 Production: chip walks Needs scheduling → Materials? → Build day',
    (state1.needsSched && pane2.materialsQ && matBtn && ckUpd && pane4.buildDay) ? 'PASS' : 'PARTIAL',
    `board open=${state1.open}; Needs-box chip before schedule: NeedsSched=${state1.needsSched}; after appointment(kind=job): Materials?=${pane2.materialsQ} (NeedsSched gone=${!pane2.needsSched}); ` +
    `Mark-ordered button=${matBtn}, checklist write=${!!ckUpd}; Ordered-box chip after: Build-day=${pane4.buildDay} ("${pane4.excerpt.slice(0, 120)}"). appointment insert=${!!aIns}.`,
    { writes: w.slice(-6) });
  await page.evaluate(() => { if (window.CardinalProduction) window.CardinalProduction.close(false); });
  await page.waitForTimeout(500);
}

/* ================= S7: Approved → Scheduled → Completed via stage arrows ================= */
await clearWrites();
{
  dialogPolicy = d => ({ action: 'accept' });   // confirm(Advance to …?) ×2
  await page.evaluate(() => { const v = document.getElementById('projectView'); if (v) v.style.display = 'block'; if (typeof showTab === 'function') showTab('overview'); });
  await page.waitForTimeout(600);
  for (const target of ['Scheduled', 'Completed']) {
    await page.evaluate(() => {
      const a = document.querySelector('#stageBanner .stgarrow[data-dir="1"]');
      if (a) a.click();
    });
    await page.waitForTimeout(1400);
  }
  const w = await writes();
  const sUpd = w.filter(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage);
  const pr = await projRow();
  const walkNotify = NOTIFIES.filter(n => n.api === 'notify' && /complete/i.test(n.title || '')).slice(-1)[0];
  await shot('L07-completed');
  record('S7 Approved → Scheduled → Completed (stage arrows)',
    (pr && pr.stage === 'Completed') ? 'PASS' : 'PARTIAL',
    `stage writes: ${sUpd.map(x => x.payload.stage).join(' → ')}; now=${pr && pr.stage}. ` +
    `Walk-around buzz fired=${!!walkNotify}${walkNotify ? ` to=${JSON.stringify(walkNotify.to)} title="${walkNotify.title}"` : ''}. ` +
    `Each arrow costs a native confirm() — see dialogs.`,
    { writes: w.slice(-4) });
}

/* ================= S8: PUNCH — add blocks invoice; close clears ================= */
await clearWrites();
{
  dialogPolicy = d => ({ action: 'accept' });
  await page.evaluate(() => {
    const p = (window.__SEED__.projects || [])[0];
    if (window.CardinalProduction && window.CardinalProduction.addFor) window.CardinalProduction.addFor(p.id);
  });
  await page.waitForTimeout(900);
  const formUp = await page.evaluate(() => {
    const m = document.getElementById('cr-pb-modal');
    return m && m.classList.contains('open');
  });
  if (formUp) {
    await page.evaluate(() => {
      const m = document.getElementById('cr-pb-modal');
      m.querySelector('[data-f="title"]').value = 'Reset downspout at NE corner';
      const asg = m.querySelector('[data-f="assigned"]');
      if (asg) asg.value = 'scottie@cardinalrenovations.net';
      m.querySelector('[data-act="save"]').click();
    });
    await page.waitForTimeout(1800);
  }
  let w = await writes();
  const pIns = w.find(x => x.table === 'punch_items' && x.op === 'insert');
  const assignNotify = NOTIFIES.filter(n => n.api === 'notify' && /Reset downspout/i.test(n.title || '')).slice(-1)[0];

  // Completed + open punch must BLOCK — the job (build day booked) sits in the
  // Scheduled box; its blocker chip is on the job row inside that box
  await page.evaluate(() => { if (window.CardinalProduction) { window.CardinalProduction.open(); window.CardinalProduction.refresh(); } });
  await page.waitForTimeout(1300);
  const homeBlocked = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const home = v ? (v.innerText || '') : '';
    const b = v && v.querySelector('[data-box="sched"]');
    if (b) b.click();
    return { punchBox1: /1[\s\S]{0,26}PUNCH-OUTS/i.test(home) };
  });
  await page.waitForTimeout(900);
  const blocked = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const txt = v ? (v.innerText || '') : '';
    return { blocked: /open item|punch item/i.test(txt), excerpt: txt.replace(/\s+/g, ' ').slice(0, 200) };
  });
  await shot('L08a-punch-blocks');
  await page.evaluate(() => { if (window.CardinalProduction) { window.CardinalProduction.close(false); } });
  await page.waitForTimeout(400);

  // close it through the shared pipeline (the delegate-first 771 path)
  const closed = await page.evaluate(async () => {
    try {
      const P = window.CardinalPunch;
      const rows = (P && typeof P.rows === 'function') ? P.rows() : [];
      const mine = rows.find(r => /Reset downspout/.test(r.title || ''));
      if (!mine) return 'row-not-found';
      await P.toggle(mine.id);
      return 'toggled';
    } catch (e) { return 'err:' + e.message; }
  });
  await page.waitForTimeout(1500);
  w = await writes();
  const closeUpd = w.find(x => x.table === 'punch_items' && x.op === 'update' && x.payload && x.payload.status === 'done');
  await page.evaluate(() => {
    if (window.CardinalProduction) { window.CardinalProduction.open(); window.CardinalProduction.refresh(); }
  });
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const b = v && v.querySelector('[data-box="sched"]');
    if (b) b.click();
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => {
    const v = document.getElementById('cr-pb');
    const txt = v ? (v.innerText || '') : '';
    return { ready: /Ready to invoice/i.test(txt), stillBlocked: /open item|punch item/i.test(txt),
      excerpt: txt.replace(/\s+/g, ' ').slice(0, 200) };
  });
  await shot('L08b-punch-closed');
  record('S8 Punch: add blocks, close clears',
    (pIns && blocked.blocked && closeUpd && after.ready && !after.stillBlocked) ? 'PASS' : 'PARTIAL',
    `punch insert=${!!pIns}; assignee buzz fired=${!!assignNotify}${assignNotify ? ` to=${JSON.stringify(assignNotify.to)}` : ''}; ` +
    `punch box count=1: ${homeBlocked.punchBox1}; Sched-box job chip blocked=${blocked.blocked} ("${blocked.excerpt.slice(0, 110)}"); ` +
    `toggle via CardinalPunch=${closed}; status:done write=${!!closeUpd} (done_by stamped=${!!(closeUpd && closeUpd.payload.done_by)}); ` +
    `after close: Ready-to-invoice=${after.ready}, still-blocked=${after.stillBlocked}.`,
    { writes: w.slice(-5) });
  await page.evaluate(() => { if (window.CardinalProduction) window.CardinalProduction.close(false); });
  await page.waitForTimeout(500);
}

/* ================= S9: WORKSHEET payment → CREATE INVOICE → EMAIL → Invoiced? ================= */
await clearWrites();
{
  // dialog plan: alert(Invoice #… created) → ok; prompt(Send to:) → default (client email);
  // confirm(follow-up in 3 days?) → DISMISS (drive the "no" path once)
  dialogPolicy = d => d.type() === 'confirm' && /follow-up/i.test(d.message())
    ? { action: 'dismiss' } : { action: 'accept' };
  await page.evaluate(() => {
    const v = document.getElementById('projectView'); if (v) v.style.display = 'block';
    if (typeof openPaymentsPage === 'function') openPaymentsPage();
  });
  await page.waitForTimeout(1000);
  const wsState = await page.evaluate(() => {
    const m = document.getElementById('wsMount');
    const inp = m && m.querySelector('.wspaid');
    return { rows: m ? m.querySelectorAll('.wsrow').length : 0,
      payEnabled: inp ? !inp.disabled : false,
      invBtn: !!(m && m.querySelector('[data-mkinv]')),
      text: m ? (m.innerText || '').replace(/\s+/g, ' ').slice(0, 200) : null };
  });
  await shot('L09a-worksheet');
  // log a partial payment against the signed contract
  if (wsState.payEnabled) {
    await page.fill('#wsMount .wspaid', '5000');
    await page.evaluate(() => {
      const inp = document.querySelector('#wsMount .wspaid');
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(1200);
  }
  let w = await writes();
  const payUpd = w.find(x => x.table === 'projects' && x.op === 'update' && /"paid":5000/.test(x.payload.checklist || ''));

  // Create invoice
  await page.evaluate(() => { const b = document.querySelector('#wsMount [data-mkinv]'); if (b) b.click(); });
  await page.waitForTimeout(2400);
  w = await writes();
  const invIns = w.find(x => x.table === 'inspection_reports' && x.op === 'insert' && /^invoice/i.test(x.payload.title || ''));
  const editorOpen = await page.evaluate(() => { const v = document.getElementById('editorView'); return v && getComputedStyle(v).display !== 'none'; });
  const invHtmlOk = invIns ? (/\$12,480\.00/.test(invIns.payload.html || '') && /\$5,000\.00/.test(invIns.payload.html || '')) : false;
  await shot('L09b-invoice');

  // Email it → auto-Invoiced
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#editorView button')];
    const b = btns.find(x => /email to client/i.test(x.innerText || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2600);
  w = await writes();
  const sentUpd = w.find(x => x.table === 'inspection_reports' && x.op === 'update' && x.payload && x.payload.status === 'sent');
  const stageUpd = w.find(x => x.table === 'projects' && x.op === 'update' && x.payload && x.payload.stage === 'Invoiced');
  const sendMail = NOTIFIES.filter(n => n.api === 'senddoc').slice(-1)[0];
  const pr = await projRow();
  await shot('L09c-emailed');
  record('S9 Payment → Create invoice → Email → auto-Invoiced',
    (invIns && sentUpd && stageUpd && pr.stage === 'Invoiced') ? 'PASS' : 'PARTIAL',
    `Worksheet: ${wsState.rows} contract row(s), payment input enabled=${wsState.payEnabled}, Create-invoice button=${wsState.invBtn}; ` +
    `payment write=${!!payUpd}; invoice doc insert=${!!invIns} (totals correct in doc: ${invHtmlOk}); ` +
    `senddoc called=${!!sendMail} to=${sendMail && JSON.stringify(sendMail.to)}; status→sent=${!!sentUpd}; AUTO-ADVANCE stage→Invoiced=${!!stageUpd}; final stage=${pr && pr.stage}.`,
    { writes: w.slice(-8) });
  await page.evaluate(async () => { try { await closeEditor(); } catch (e) {} });
}

/* ================= S10: FINAL AUDIT — stamps, history, censuses ================= */
{
  const final = await page.evaluate(() => {
    const p = (window.__SEED__.projects || [])[0];
    let ck = {}; try { ck = JSON.parse(p.checklist || '{}'); } catch (e) {}
    const stamps = Object.keys(ck).filter(k => /^t_|stage_since|wf_approved|materials_ordered/.test(k));
    const docs = (window.__SEED__.inspection_reports || []).map(r => ({ title: r.title, total: r.total || null, signed: !!r.signed_at, status: r.status || null }));
    const punch = (window.__SEED__.punch_items || []).map(i => ({ title: i.title, status: i.status, done_by: i.done_by || null }));
    return { stage: p.stage, stage_since: p.stage_since || ck.stage_since || null, stamps, ck: { wf_approved: !!ck.wf_approved, materials_ordered_at: ck.materials_ordered_at || null, ws: ck.ws || null }, docs, punch };
  });
  record('S10 Final state audit', final.stage === 'Invoiced' ? 'PASS' : 'CHECK',
    `stage=${final.stage}; docs=${JSON.stringify(final.docs)}; punch=${JSON.stringify(final.punch)}; ` +
    `checklist stamps=${final.stamps.join(',')}; materials_ordered_at=${!!final.ck.materials_ordered_at}; worksheet=${JSON.stringify(final.ck.ws)}`,
    { finalState: final });
}

/* ---- report ---- */
const dialogCount = ALL_DIALOGS.length;
const summary = {
  stations: stations.map(s => ({ station: s.station, status: s.status })),
  totalNativeDialogs: dialogCount,
  dialogByType: ALL_DIALOGS.reduce((m, d) => { m[d.type] = (m[d.type] || 0) + 1; return m; }, {}),
  notifies: NOTIFIES,
  pageErrors: [...new Set(pageErrors)].slice(0, 30)
};
writeFileSync(OUT + '/lifecycle-report.json', JSON.stringify({ summary, stations }, null, 2));
console.log('\n===== LIFECYCLE SUMMARY =====');
console.log(stations.map(s => `${s.status.padEnd(9)} ${s.station}`).join('\n'));
console.log(`\nNative dialogs across the run: ${dialogCount} — ${JSON.stringify(summary.dialogByType)}`);
console.log('Notifications fired: ' + NOTIFIES.map(n => `[${n.api}] ${n.title || '(doc email)'} → ${JSON.stringify(n.to)}`).join(' ; '));
console.log('\nPAGE ERRORS: ' + (summary.pageErrors.join(' | ') || '(none)'));
console.log('Report: ' + OUT + '/lifecycle-report.json');
await browser.close();
