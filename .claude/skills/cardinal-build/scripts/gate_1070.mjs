/* gate_1070 — the drafter reads the checklist, and is reachable from the toolbar.
 *
 * TWO HALVES, because the build has two:
 *   A · api/summarize.js, executed AS SHIPPED with a stubbed transport, so the
 *     assertions are about the prompt that would really be sent — not about a
 *     re-implementation of it. This is the project's "test the shipped
 *     function against real data shapes" rule.
 *   B · a real Chromium render of the editor, because every remaining claim is
 *     about the cascade, a live DOM pass, or a click that has to reach another
 *     document.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - only the nine PROPERTY facts may leave the browser. A checklist carrying
 *     a client name, an address or coordinates must send none of them.
 *   - #draftBtn must DELEGATE, not re-implement: exactly one /api/summarize
 *     handler in the parent document, before and after.
 *   - the toolbar button must not become the 14th writer of the scroll lock.
 *   - it must NOT appear on an estimate or a contract, which the same editor
 *     opens and whose sections mean something else entirely.
 *
 * ⚠ BUG_CLASSES 37 — on the 1069 control tree #draftBtn and #aiDraftBtn do not
 *   exist. Every lookup below tolerates absence and reports RED; none of them
 *   dereferences a null. A control that crashes proves nothing.
 *
 *   node gate_1070.mjs [index.html] [api/summarize.js]
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
const APIF = process.argv[3] || join(dirname(resolve(FILE)), 'api', 'summarize.js');
if (!existsSync(FILE)) { console.error('gate_1070: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js','e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE,f),'utf8')).join('\n;\n');

let pass = 0; const fails = [];
const ran = new Set();
const ok  = (n,d) => { pass++; ran.add(n.split(' ')[0]); console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { ran.add(n.split(' ')[0]); fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };

/* ⚠ A FLOOR, because a check that silently stops running is worse than a red
   one. The first negative control of this very gate proved it: the route
   failed to import against the control tree, A1-A6 never executed, and the
   only trace was a smaller number nobody reads. CLAUDE.md names this exact
   fault — "any test that derives its own check count needs a FLOOR". */
const MUST_RUN = ['A0','A1','A2','A3','A4','A5','A6',
                  'B0','B1','B2','B3','B4','B5','B6','B7','B8','B9',
                  'C1','C2','C3'];

console.log(`gate_1070 — ${FILE}\n           ${APIF}\n`);

/* ══ A · the route, executed as shipped ═════════════════════════════════ */
console.log('A · api/summarize.js — the prompt that would really be sent');

let handler = null;
try {
  handler = (await import(pathToFileURL(resolve(APIF)).href)).default;
} catch (e) {
  bad('A0 — the route imports', String(e.message || e).slice(0, 160));
}

/* Executes the real handler. Returns the prompt Gemini was handed, so every
   assertion below is about the shipped string, not a copy of it. */
async function callRoute(body) {
  let prompt = null, status = 0, payload = null;
  const realFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'gate-1070-stub';
  globalThis.fetch = async (url, opt) => {
    const u = String(url);
    if (u.includes('/auth/v1/user'))
      return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
    if (u.includes('generativelanguage')) {
      prompt = JSON.parse(opt.body).contents[0].parts[0].text;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'drafted.' }] } }] }) };
    }
    return { ok: false, status: 500, text: async () => 'unexpected host: ' + u };
  };
  const res = {
    status(c){ status = c; return this; },
    json(o){ payload = o; return this; }
  };
  try {
    await handler({ method: 'POST', headers: { authorization: 'Bearer stub' }, body }, res);
  } finally { globalThis.fetch = realFetch; }
  return { prompt, status, payload };
}

const FACTS = {
  'Structure': 'Single-family residence, detached garage',
  'Roof covering': 'Three-tab asphalt shingle',
  'Age': '22 years (estimated)',
  'Layers': '1',
  'Pitch': '6/12',
  'Decking': '1x8 nominal plank, gapped',
};

if (handler) {
  /* 1 — captions only: behaves exactly as it did before 1070 */
  {
    const r = await callRoute({ captions: ['granule loss on the south slope'] });
    r.status === 200 && /the photo observations below/.test(r.prompt || '') &&
      !/Property facts/.test(r.prompt || '')
      ? ok('A1 — captions only: unchanged, no fact block')
      : bad('A1 — captions only: unchanged, no fact block', `status ${r.status}`);
  }
  /* 2 — checklist only: this is the 400 that used to happen */
  {
    const r = await callRoute({ checklist: FACTS });
    if (r.status !== 200) bad('A2 — checklist alone drafts (used to be a 400)', `status ${r.status}: ${JSON.stringify(r.payload)}`);
    else if (!/the property facts below/.test(r.prompt || '')) bad('A2 — checklist alone drafts', 'prompt does not name the facts as its grounding');
    else if (/Photo observations:/.test(r.prompt || '')) bad('A2 — checklist alone drafts', 'prompt offers an empty photo-observations block');
    else if (!/- Age: 22 years \(estimated\)/.test(r.prompt || '')) bad('A2 — checklist alone drafts', 'the facts are not in the prompt');
    else ok('A2 — checklist alone drafts (used to be a 400)');
  }
  /* 3 — both, and the grounding is named honestly */
  {
    const r = await callRoute({ captions: ['granule loss'], checklist: FACTS });
    r.status === 200 && /the photo observations and the property facts below/.test(r.prompt || '') &&
      /Property facts recorded on site:/.test(r.prompt) && /Photo observations:/.test(r.prompt)
      ? ok('A3 — both sources: prompt names both, carries both')
      : bad('A3 — both sources: prompt names both, carries both', (r.prompt || '').slice(0, 140));
  }
  /* 4 — the section branch gets them too */
  {
    const r = await callRoute({ captions: ['lifted ridge cap'], checklist: FACTS, section: 'Roof Covering' });
    r.status === 200 && /"Roof Covering"/.test(r.prompt || '') && /Property facts recorded on site:/.test(r.prompt || '')
      ? ok('A4 — the per-section narrative gets the facts too')
      : bad('A4 — the per-section narrative gets the facts too', (r.prompt || '').slice(0, 140));
  }
  /* 5 — neither: still refuses, and says what to do */
  {
    const r = await callRoute({ captions: [], checklist: {} });
    r.status === 400 && /checklist/i.test(r.payload?.error || '')
      ? ok('A5 — nothing to draft from still refuses', r.payload.error.slice(0, 60) + '…')
      : bad('A5 — nothing to draft from still refuses', `status ${r.status}`);
  }
  /* 6 — the server caps independently of the browser */
  {
    const many = {}; for (let i = 0; i < 30; i++) many['k' + i] = 'v' + i;
    many.k0 = 'x'.repeat(500);
    const r = await callRoute({ checklist: many });
    const lines = (r.prompt || '').split('\n').filter(l => l.startsWith('- k'));
    const longest = Math.max(0, ...lines.map(l => l.length));
    lines.length === 12 && longest <= 40 + 200 + 2
      ? ok('A6 — server caps at 12 entries and truncates values', `${lines.length} lines, longest ${longest}`)
      : bad('A6 — server caps at 12 entries and truncates values', `${lines.length} lines, longest ${longest}`);
  }
}

/* ══ B · the editor, rendered ═══════════════════════════════════════════ */
console.log('\nB · the toolbar control, rendered');

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());

/* A checklist carrying THREE identity fields the nine-fact map does not know
   about. None of them may reach the request body. */
const PROJECT = `(() => {
  window.currentProject = { id:'p1', name:'Miller', checklist: JSON.stringify({
    structure:'Single-family residence, detached garage',
    rooftype:'Three-tab asphalt shingle',
    decking:'1x8 nominal plank, gapped',
    attic:'Yes', method:'Visual, non-invasive',
    age:'22', layers:'1', pitch:'6/12', condition:'Fair',
    client_name:'Dolores Miller', address:'118 Wilmington Ave, Dayton OH', lat:39.72, lon:-84.17
  })};
  return true;
})()`;

const OPEN = tpl => `(() => {
  const ev = document.getElementById('editorView');
  ev.classList.add('open'); ev.setAttribute('aria-hidden','false');
  const f = document.getElementById('reportFrame');
  const d = f.contentDocument;
  d.open(); d.write(window[${JSON.stringify(tpl)}] || '<p>not a report</p>'); d.close();
  if (typeof wireSummaryDraftButton === 'function') { try { wireSummaryDraftButton(d); } catch(e){} }
  if (typeof window.draftGate === 'function') window.draftGate();
  return !!d.querySelector('[data-cardinal-summary-heading]');
})()`;

async function at(width, tpl) {
  const ctx = await browser.newContext({ viewport:{width,height:900} });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u=r.request().url();
    if(u.startsWith('https://g70.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});
    return r.fulfill({status:200,body:''});
  });
  await page.addInitScript(SETUP);
  await page.goto('https://g70.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
  await page.evaluate(PROJECT);
  const isReport = await page.evaluate(OPEN(tpl));
  await page.waitForTimeout(250);
  return { ctx, page, isReport };
}

/* ── B1 · desktop: the button exists, sits in #edSecondary, and shows ──── */
{
  const { ctx, page, isReport } = await at(1440, 'REPORT_TEMPLATE');
  if (!isReport) bad('B0 — the fixture really is a report', 'no [data-cardinal-summary-heading]');
  else ok('B0 — the fixture really is a report');
  const r = await page.evaluate(`(() => {
    const b = document.getElementById('draftBtn');
    if (!b) return { absent:true };
    const sec = document.getElementById('edSecondary');
    const c = getComputedStyle(b), box = b.getBoundingClientRect();
    return { inSecondary: !!(sec && sec.contains(b)),
             visible: c.display!=='none' && box.width>1 && box.height>1,
             label: (b.textContent||'').trim(), h: Math.round(box.height) };
  })()`);
  if (r.absent) bad('B1 — #draftBtn exists in the toolbar', 'no #draftBtn in the document');
  else {
    r.inSecondary ? ok('B1 — #draftBtn is inside #edSecondary (so the drawer finds it)')
                  : bad('B1 — #draftBtn is inside #edSecondary', 'it is somewhere else');
    r.visible ? ok('B2 — 1440px: shown in the toolbar', `"${r.label}", ${r.h}px`)
              : bad('B2 — 1440px: shown in the toolbar', 'draftGate() left it hidden on a report');
  }
  await ctx.close();
}

/* ── B3 · it must NOT show on an estimate — same editor, other document ── */
{
  const { ctx, page } = await at(1440, '__not_a_template__');
  const shown = await page.evaluate(`(() => {
    const b = document.getElementById('draftBtn');
    if (!b) return null;
    return getComputedStyle(b).display !== 'none';
  })()`);
  if (shown === null) bad('B3 — hidden on a non-report', 'no #draftBtn to test');
  else shown === false ? ok('B3 — hidden when the open document is not an inspection report')
                       : bad('B3 — hidden when the open document is not an inspection report', 'it rendered anyway');
  await ctx.close();
}

/* ── B4 · phone: it lands in the 1069 drawer, and locks no scroll ─────── */
{
  const { ctx, page } = await at(390, 'REPORT_TEMPLATE');
  const before = await page.evaluate(`document.body.style.overflow`);
  const hasMore = await page.evaluate(`!!document.getElementById('edMoreBtn')`);
  if (hasMore) { await page.click('#edMoreBtn'); await page.waitForTimeout(200); }
  const r = await page.evaluate(`(() => {
    const d = document.getElementById('edDrawer');
    const rows = d ? [...d.querySelectorAll('.edrow')].map(x=>(x.textContent||'').trim()) : [];
    return { rows, overflow: document.body.style.overflow };
  })()`);
  r.rows.includes('Draft narrative')
    ? ok('B4 — 390px: "Draft narrative" is a row in the More drawer', r.rows.length + ' rows')
    : bad('B4 — 390px: "Draft narrative" is a row in the More drawer', 'rows: ' + (r.rows.join(', ') || '(none)'));
  r.overflow === before
    ? ok('B5 — no 14th writer of the global scroll lock', `body.style.overflow unchanged ("${before}")`)
    : bad('B5 — no 14th writer of the global scroll lock', `"${before}" -> "${r.overflow}"`);
  await ctx.close();
}

/* ── B6 · the click DELEGATES, and the body carries the nine facts ────── */
{
  const { ctx, page } = await at(1440, 'REPORT_TEMPLATE');
  const r = await page.evaluate(`(async () => {
    const doc = document.getElementById('reportFrame').contentDocument;
    const inDoc = doc.getElementById('aiDraftBtn');
    if (!inDoc) return { noInDoc:true };
    let delegated = 0;
    inDoc.addEventListener('click', () => { delegated++; }, true);
    /* capture the request the SHIPPED handler makes, rather than rebuilding it */
    let body = null;
    const real = window.fetch;
    window.fetch = async (u, o) => {
      if (String(u).includes('/api/summarize')) { body = JSON.parse(o.body); 
        return { ok:true, json: async () => ({ summary:'drafted.' }) }; }
      return real(u, o);
    };
    window.aiHeaders = async () => ({ 'Content-Type':'application/json' });
    const tb = document.getElementById('draftBtn');
    if (!tb) return { noToolbar:true };
    tb.click();
    await new Promise(r => setTimeout(r, 600));
    window.fetch = real;
    return { delegated, body,
             handlers: [...document.querySelectorAll('#draftBtn')].length };
  })()`);
  if (r.noInDoc)   bad('B6 — the toolbar delegates to the in-document button', 'no #aiDraftBtn in the report');
  else if (r.noToolbar) bad('B6 — the toolbar delegates to the in-document button', 'no #draftBtn in the toolbar');
  else {
    r.delegated === 1
      ? ok('B6 — one tap on the toolbar fires the in-document button exactly once')
      : bad('B6 — one tap on the toolbar fires the in-document button exactly once', `fired ${r.delegated} times`);
    const keys = Object.keys((r.body && r.body.checklist) || {});
    keys.length >= 8
      ? ok('B7 — the request carries the checklist facts', keys.length + ': ' + keys.join(', '))
      : bad('B7 — the request carries the checklist facts', 'got ' + JSON.stringify(r.body && r.body.checklist));
    /* THE FENCE. The fixture checklist carries three identity fields on purpose. */
    const leaked = JSON.stringify(r.body || {}).match(/Dolores|Wilmington|39\.72|-84\.17/g);
    !leaked
      ? ok('B8 — no identity leaves the browser', 'name, address and coordinates all absent from the body')
      : bad('B8 — no identity leaves the browser', 'LEAKED: ' + [...new Set(leaked)].join(', '));
    const brackets = keys.filter(k => k.includes('[') || k.includes(']'));
    brackets.length === 0
      ? ok('B9 — fact labels are the report\'s own words, brackets stripped')
      : bad('B9 — fact labels are the report\'s own words, brackets stripped', brackets.join(', '));
  }
  await ctx.close();
}

await browser.close();

/* ── C · one pipeline: the source itself ────────────────────────────────── */
console.log('\nC · one pipeline');
{
  const n = (HTML.match(/fetch\('\/api\/summarize'/g) || []).length;
  n === 2 ? ok('C1 — exactly two /api/summarize call sites, as before 1070')
          : bad('C1 — exactly two /api/summarize call sites', `found ${n}`);
  const b = (HTML.match(/checklist: ckFactsNow\(\)/g) || []).length;
  b === 2 ? ok('C2 — both of them send the checklist')
          : bad('C2 — both of them send the checklist', `found ${b}`);
  /* the fact list must come from CK_REPORT_MAP, not a fourth hand-written copy */
  const f = (HTML.match(/function ckFactsFor\(/g) || []).length;
  const usesMap = /function ckFactsFor\(cl\)\{[\s\S]{0,400}?CK_REPORT_MAP/.test(HTML);
  f === 1 && usesMap
    ? ok('C3 — one fact builder, and it reads CK_REPORT_MAP')
    : bad('C3 — one fact builder, and it reads CK_REPORT_MAP', `defs ${f}, readsMap ${usesMap}`);
}

/* the floor. A0 is exempt: it only prints when the import FAILS. */
{
  const missing = MUST_RUN.filter(id => id !== 'A0' && !ran.has(id));
  if (missing.length)
    bad('FLOOR — every check ran', missing.length + ' never executed: ' + missing.join(', '));
  else ok('FLOOR — every check ran', MUST_RUN.length - 1 + ' of ' + (MUST_RUN.length - 1));
}

console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}`);
process.exit(0);
