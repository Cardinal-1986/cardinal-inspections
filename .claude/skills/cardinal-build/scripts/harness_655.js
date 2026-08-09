/* Build 655 — insurance repair + write safety (CR-AUD-007/009/010/011/012/014/015),
   verified against the shipped artifact.

   The three riskiest pieces are EXECUTED in jsdom: the cr-iu unified()
   overlay (with a real null-column row + checklist values), forProject's
   rekeyed existence check (mocked supabase chains, recorded calls), and
   patchProjectCk's refetch-merge (a "concurrent" fresh row that differs
   from the local cache — the merge must land on the FRESH copy). The
   rest is structural.

   Usage: node harness_655.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function extractScript(id) {
  const t = '<script id="' + id + '">';
  const i = SRC.indexOf(t);
  if (i === -1) return null;
  return SRC.slice(i + t.length, SRC.indexOf('</script>', i));
}
function fnText(name) {
  const m = SRC.match(new RegExp('(async )?function ' + name + '\\s*\\([^)]*\\)\\s*\\{'));
  if (!m) return null;
  let depth = 0, started = false, k = m.index;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') { depth++; started = true; }
    else if (SRC[k] === '}') { depth--; if (started && depth === 0) break; }
  }
  return SRC.slice(m.index, k + 1);
}

(async function () {

console.log('\n── 009: coverage fields, executed through the shipped module ──');
{
  const iu = extractScript('cr-iu-script');
  ok('cr-iu-script extracted', !!iu);
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.parseCkAll = (pr) => { try { return JSON.parse(pr.checklist || '{}') || {}; } catch (e) { return {}; } };
  // a table row that HAS the columns but NULL (post-migration, value never written)
  const nullRow = { id: 'c1', project_id: 'p1', carrier: 'State Farm', coverage_type: null, ord_law: null,
    deductible: 1000, deductible_waived: false, approved_rcv: 28727.17, approved_acv: 19951.22,
    approved_depreciation: 8775.95, supplement_status: 'none', supplement_filed: null, supplement_approved: null };
  w.supa = { from: () => ({ select: async () => ({ data: [nullRow], error: null }) }),
             auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } };
  w.window.supa = w.supa;
  w.eval(iu.replace(/if\(document\.readyState === 'loading'\) document\.addEventListener\('DOMContentLoaded', start\);\nelse start\(\);/, '/* start suppressed for harness */'));
  await w.window.CardinalInsurance.refresh();
  const pr = { id: 'p1', checklist: JSON.stringify({ lead: { insurance: { coverage_type: 'RCV', ord_law: false } } }) };
  const u = w.window.CardinalInsurance.get(pr);
  ok('NULL table coverage_type no longer masks the checklist value (RCV shows)', u && u.coverage_type === 'RCV', JSON.stringify(u && u.coverage_type));
  ok('NULL table ord_law overlays to the checklist boolean false ("No", not blank)', u && u.ord_law === false, JSON.stringify(u && u.ord_law));

  // a row that carries ord_law === false itself: shape must NOT eat it
  const falseRow = { ...nullRow, coverage_type: 'ACV', ord_law: false };
  w.supa.from = () => ({ select: async () => ({ data: [falseRow], error: null }) });
  await w.window.CardinalInsurance.refresh();
  const u2 = w.window.CardinalInsurance.get({ id: 'p1', checklist: '{}' });
  ok('shape() preserves a real false ("No") instead of || null eating it', u2 && u2.ord_law === false, JSON.stringify(u2 && u2.ord_law));
  ok('table values win when present (ACV from the row, not the checklist)', u2 && u2.coverage_type === 'ACV');
}

console.log('\n── 015: bounded, session-gated load ──');
{
  const iu = extractScript('cr-iu-script');
  ok("select('*') is gone from the boot-path claims load", !iu.includes(".select('*')"));
  ok('the named columns cover every consumer (shape + cr-sp notes + cr-ic filed_at)',
    iu.includes("'supplement_notes,supplement_filed_at')") && iu.includes("'id,project_id,carrier,policy_number,claim_number,date_of_loss,'"));
  ok('start() waits for a session before the first load', iu.includes('getSession()') && iu.includes('onAuthStateChange'));
  ok('the auth listener unsubscribes after its one job', iu.includes('sub.data.subscription.unsubscribe()'));
}

console.log('\n── 010: the hub keeps its doors ──');
{
  const cth = extractScript('cr-cth-script');
  ['supplements', 'insresources', 'adjusters', 'claims'].forEach(d => {
    ok('render() draws a data-go="' + d + '" tool', cth.includes('data-go=\\"' + d + '\\"') || cth.includes("data-go=\"" + d + "\""));
    ok('wire() dispatches ' + d, cth.includes("if(d === '" + d + "'"));
  });
  ok('supplements routes through the Resource Library sub-page router',
    cth.includes("window._rlShowPage('rlPageSup')"));
  ok('adjusters opens the directory as from-hub', cth.includes('window.CardinalAdjusters.open(true)'));
  ok('claims uses the exported hub bridge', cth.includes('window.crOpenClaimsFromHub()'));
}

console.log('\n── 011: the claim card, executed with recorded calls ──');
{
  const fp = fnText('forProject');
  ok('forProject extracted', !!fp);
  ok('selects the real column (name), client_name is gone from the select',
    fp.includes("select('id, insurance_claim_id, name, address, checklist')"));
  ok('no read of proj.client_name survives anywhere in it', !fp.includes('proj.client_name'));

  // execute: pointer NULL but a claim exists keyed the correct way → must render linked card, never Create
  const dom = new JSDOM('<!doctype html><body><div id="m"></div></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  const calls = { linked: null, createOrLink: null };
  w.window.supa = { from: (table) => {
    const o = {};
    o.select = () => o; o.eq = () => o; o.is = () => o; o.or = () => o;
    o.single = async () => ({ data: { id: 'p1', insurance_claim_id: null, name: 'Devon Carter', address: '1 Elm St', checklist: '{}' }, error: null });
    o.limit = async () => (table === 'insurance_claims' ? { data: [{ id: 'claim-9' }], error: null } : { data: [], error: null });
    return o;
  } };
  const runner = new w.Function('renderLinkedClaimCard', 'renderCreateOrLinkCard', 'linkClaimToProject',
    'return (' + fp + ')("p1", document.getElementById("m"));');
  await runner.call(w,
    async (el, id) => { calls.linked = id; },
    (el, opts) => { calls.createOrLink = opts; },
    () => {});
  ok('a claim linked only via insurance_claims.project_id IS found (no duplicate-claim offer)',
    calls.linked === 'claim-9' && calls.createOrLink === null, JSON.stringify(calls));
}

console.log('\n── 012: four handlers check their writes ──');
{
  ok('payment delete checks the result', SRC.includes("const r = await window.supa.from('insurance_payments').delete().eq('id', p.id);") && SRC.includes("if (r.error) { toast('Could not delete: ' + r.error.message, 'error'); return; }"));
  ok('supplement delete checks the result', SRC.includes("const r = await window.supa.from('insurance_supplements').delete().eq('id', s.id);"));
  ok('AI-draft discard checks the result (creDiscard convention)', SRC.includes("Could not discard: "));
  ok('claim modal save catches thrown failures (offline tap now reports)', SRC.includes("errEl.textContent = 'Could not save: ' + (e.message || e);"));
}

console.log('\n── 014: one stage vocabulary ──');
{
  ok('the shared map exists with OnHold and the rail\'s Invoiced wording',
    SRC.includes("var INS_STAGE_LABEL = {") &&
    SRC.includes("'OnHold':'On Hold'") &&
    SRC.includes("'Invoiced':'Awaiting Depreciation / Supplements'"));
  ok('CD_STAGE_LABEL.insurance points at the shared map', SRC.includes('insurance: INS_STAGE_LABEL,'));
  ok('IC_LABEL points at the shared map', SRC.includes('var IC_LABEL = INS_STAGE_LABEL;'));
  ok('cr-insstage falls back through window.INS_STAGE_LABEL', SRC.includes('var INS_LABEL = window.INS_STAGE_LABEL || {'));
  ok('cr-ic falls back through window.INS_STAGE_LABEL', SRC.includes('var LABEL = window.INS_STAGE_LABEL || {'));
  /* first draft of this assertion matched the NEW fallback's tail (same
     Closed/Lost/}; ending as the old literal) — the distinguishing feature
     of the new literals is OnHold, so key on that instead */
  ok('the divergent literals are gone: no stage map says Archived for insurance Closed',
    !SRC.includes("'Closed':'Archived', 'Lost':'Denied'"));
  ok('both standalone fallbacks carry OnHold (same wording as the shared map)',
    SRC.includes("'OnHold':    'On Hold',") && SRC.includes("'OnHold':'On Hold', 'Scheduled':'Scheduled',"));
  ok("no insurance STAGE map still says 'Awaiting RCV' (claim STATUS vocabulary untouched)",
    !SRC.includes("'Invoiced':'Awaiting RCV'") && !SRC.includes("'Invoiced':  'Awaiting RCV'") &&
    SRC.includes("{ v: 'awaiting_rcv',      l: 'Awaiting RCV' }"));
}

console.log('\n── 007: patchProjectCk merges onto the FRESH row, executed ──');
{
  const ppc = fnText('patchProjectCk');
  ok('patchProjectCk extracted', !!ppc);
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const w = dom.window;
  const written = {};
  // local cache is STALE: it never saw the other device's `payments` key
  const pr = { id: 'p1', checklist: JSON.stringify({ tasks: [{ t: 'old' }] }) };
  // the DB has the other device's write
  const freshDb = JSON.stringify({ tasks: [{ t: 'old' }], payments: [{ dir: 'in', amt: 500 }] });
  const boot =
    'window.TEAM = true;\n' +
    'window.currentProject = null;\n' +
    'window.cacheProjects = [];\n' +
    'window.sb = { from: function(){ return { select: function(){ return { eq: function(){ return { single: async function(){ return { data: { checklist: ' + JSON.stringify(freshDb) + ' }, error: null }; } }; } }; } }; } };\n' +
    'window.pdb = { update: async function(id, fields){ window.__written = fields.checklist; } };\n' +
    'window.__fn = ' + ppc + ';';
  w.eval(boot.replace('async function patchProjectCk', 'async function'));
  await w.__fn(pr, { comments: [{ text: 'from THIS device' }] });
  const out = JSON.parse(w.__written);
  ok('the OTHER device\'s payments survive the merge (old code destroyed them)',
    Array.isArray(out.payments) && out.payments.length === 1, JSON.stringify(out));
  ok('this device\'s patch lands too', Array.isArray(out.comments) && out.comments[0].text === 'from THIS device');
  ok('untouched keys ride along', Array.isArray(out.tasks));

  // fetch failure → falls back to the local copy, never worse than before
  const w2 = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
  w2.eval(boot
    .replace('async function patchProjectCk', 'async function')
    .replace(/single: async function\(\)\{ return \{ data: [^}]+\}, error: null \}; \}/,
             'single: async function(){ throw new Error("offline"); }'));
  await w2.__fn({ id: 'p1', checklist: JSON.stringify({ tasks: [1] }) }, { comments: [2] });
  const out2 = JSON.parse(w2.__written);
  ok('a failed refetch degrades to the old local-merge behavior, still writes',
    Array.isArray(out2.tasks) && Array.isArray(out2.comments), JSON.stringify(out2));

  ok('the seven direct checklist writers outside the chokepoint are NOT churned here (follow-up, listed in PR)',
    SRC.includes("client.from('projects').update({ checklist: next })"));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
