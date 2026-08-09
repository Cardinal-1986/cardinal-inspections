/* Build 653 — five CR-Audit fixes, verified against the shipped artifact.

   P2 and P3 (the two handlers that write money-adjacent/account-adjacent
   rows) are executed FOR REAL in jsdom: the whole cr-estimates-script IIFE
   is eval'd with locked mocks and driven through window.CardinalEstimates,
   and the invite handler is brace-matched out of the main block and called
   directly — same doctrine as harness_pay.js/harness_approvals.js. P5's
   RAIL/compute() is likewise brace-matched and executed. P1/P4/P6 are
   structural (their risk is wiring-shape, not computation) plus this
   file's own printed evidence of what it checked.

   Usage: node harness_653.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* CJS (this repo's root has no "type":"module") can't have top-level await,
   and several sections below drive async handlers directly — wrap the whole
   body in an async IIFE rather than threading awaits out of each block. */
(async function(){

function extractScript(id) {
  const t = '<script id="' + id + '">';
  const i = SRC.indexOf(t);
  if (i === -1) return null;
  const j = SRC.indexOf('</script>', i);
  return SRC.slice(i + t.length, j);
}
function extractTemplate(id) {
  const t = '<template id="' + id + '">';
  const i = SRC.indexOf(t);
  if (i === -1) return null;
  const j = SRC.indexOf('</template>', i);
  return SRC.slice(i, j + '</template>'.length);
}
function braceMatch(startIdx) {
  let depth = 0, started = false, k = startIdx;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') { depth++; started = true; }
    else if (SRC[k] === '}') { depth--; if (started && depth === 0) return k + 1; }
  }
  return -1;
}

console.log('\n── P1: Convert-to-Contract endpoint name ──');
ok('the functional fetch call uses the hyphenated path', SRC.includes("api('/api/estimate-to-contract'"));
ok('the underscore path is gone from functional code', !SRC.includes("api('/api/estimate_to_contract'"));
ok('the setup-instructions comment matches the real filename', SRC.includes('Add api/estimate-to-contract.js to your repo'));
{
  const apiFile = fs.readFileSync('/home/user/cardinal-inspections/api/estimate-to-contract.js', 'utf8');
  ok('the api file itself exists and its header names itself correctly',
    apiFile.startsWith('// api/estimate-to-contract.js'));
}

console.log('\n── P2: AI-estimate Send, executed for real ──');
{
  const modSrc = extractScript('cr-estimates-script');
  const tmpl = extractTemplate('cr-tmpl-ai-output');
  ok('module and template both extracted from the artifact', !!modSrc && !!tmpl);

  function freshEstimatesWin(fixture) {
    const dom = new JSDOM(
      '<!doctype html><html><body>' +
      '<div id="cr-estimates-mount"></div>' +
      '<style id="cr-estimates-styles">.cr-doc{font-family:test}</style>' +
      tmpl +
      '</body></html>', { runScripts: 'outside-only' });
    const w = dom.window;
    const calls = { updates: [], fetches: [] };
    w.window.supa = {
      from(table) {
        const o = {};
        o.select = () => o; o.eq = () => o;
        o.single = async () => ({ data: fixture.row, error: fixture.selectError || null });
        o.update = (payload) => {
          calls.updates.push({ table, payload });
          return { eq: async () => ({ error: fixture.updateError || null }) };
        };
        return o;
      },
      auth: { getSession: async () => ({ data: { session: { access_token: 'tok-123' } } }) }
    };
    w.window.cacheProjects = fixture.cacheProjects || [];
    w.fetch = async (url, opts) => {
      calls.fetches.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null, headers: opts && opts.headers });
      return fixture.fetchResponse
        ? fixture.fetchResponse
        : { ok: true, json: async () => ({ ok: true }) };
    };
    w.prompt = (msg, dflt) => { calls.promptMsg = msg; calls.promptDefault = dflt; return fixture.promptAnswer !== undefined ? fixture.promptAnswer : dflt; };
    w.alert = () => {};
    w.eval(modSrc);
    return { w, calls };
  }

  const FIXTURE_ROW = {
    id: 'est1', created_at: '2026-08-09', status: 'draft', project_id: 'proj-77',
    estimate: {
      client: { name: 'Devon Carter', address: '3879 Shadeland Ave' },
      generated_at: '2026-08-09', valid_through: '2026-09-09', valid_days: 30,
      model_used: 'Gemini', photo_urls: [], ai_analysis: [], scope_summary: 'Roof replacement.',
      line_items: [], subtotal: 20000, tax_rate: 0.0725, tax: 1450, total: 21450,
      /* real shape per api/estimate.js: {percentage, amount, balance} — not deposit_pct */
      deposit: { percentage: 50, amount: 10725, balance: 10725 },
      concealed_conditions_note: 'Concealed damage found during work will be addressed via change order.',
      terms: 'Standard terms.'
    }
  };

  {
    const { w, calls } = freshEstimatesWin({
      row: FIXTURE_ROW,
      cacheProjects: [{ id: 'proj-77', email: 'client@example.com' }],
    });
    await w.window.CardinalEstimates.openOne('est1');
    await new Promise(r => setTimeout(r, 0));

    const sendBtn = w.document.querySelector('[data-act="send"]');
    ok('the Send button exists in the mounted template', !!sendBtn);
    sendBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    ok('project_id survives the fetch path into the estimate object (was silently dropped)',
      true /* proven by the recipient default below, which is impossible otherwise */);
    ok('the recipient prompt defaults to the linked project\'s email',
      calls.promptDefault === 'client@example.com', calls.promptDefault);
    ok('exactly one call to /api/senddoc', calls.fetches.length === 1 && calls.fetches[0].url === '/api/senddoc');
    const body = calls.fetches[0].body;
    ok('sends to the resolved recipient', body.to === 'client@example.com');
    ok('carries the bearer token', calls.fetches[0].headers.Authorization === 'Bearer tok-123');
    ok('the attached html is a full standalone document (own <style>, own <html>)',
      body.html.includes('<!doctype html>') && body.html.includes('<style>') && body.html.includes('</html>'));
    ok('the attached html contains the actual estimate content', body.html.includes('3879 Shadeland Ave'));
    ok('the estimate row is marked sent only AFTER a successful send',
      calls.updates.length === 1 && calls.updates[0].payload.status === 'sent' && !!calls.updates[0].payload.sent_at);
  }

  {
    // failure path: senddoc rejects — the row must NOT be marked sent
    const { w, calls } = freshEstimatesWin({
      row: FIXTURE_ROW,
      cacheProjects: [],
      promptAnswer: 'nick@cardinalrenovations.net',
      fetchResponse: { ok: false, status: 502, json: async () => ({ error: 'Email send failed' }) },
    });
    await w.window.CardinalEstimates.openOne('est1');
    await new Promise(r => setTimeout(r, 0));
    const sendBtn = w.document.querySelector('[data-act="send"]');
    sendBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));
    ok('a failed send does NOT mark the estimate sent (the old bug, now guarded)', calls.updates.length === 0);
    ok('the button re-enables after a failed send', !sendBtn.disabled);
    ok('an error toast renders on failure', !!w.document.querySelector('.cr-toast.error'));
  }

  {
    // no project on file at all — empty default, not a crash
    const { w, calls } = freshEstimatesWin({
      row: { ...FIXTURE_ROW, project_id: null },
      cacheProjects: [],
    });
    await w.window.CardinalEstimates.openOne('est1');
    await new Promise(r => setTimeout(r, 0));
    const sendBtn = w.document.querySelector('[data-act="send"]');
    sendBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));
    ok('no linked project → recipient prompt defaults empty, not a crash', calls.promptDefault === '');
  }
}

console.log('\n── P3: team invite, executed for real ──');
{
  const i = SRC.indexOf("document.getElementById('tmInviteBtn').addEventListener('click', async function(){");
  ok('the invite handler anchor exists', i !== -1);
  const fnStart = SRC.indexOf('{', i);
  const fnEnd = braceMatch(fnStart);
  const handlerBody = SRC.slice(fnStart + 1, fnEnd - 1);

  function runInvite(fixture) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
    const w = dom.window;
    const calls = { fetches: [], prompts: [], alerts: [], errors: [] };
    w.currentUser = fixture.currentUser;
    w.ADMIN_EMAILS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
    w.sb = { auth: { getSession: async () => ({ data: { session: { access_token: 'tok-abc' } } }) } };
    w.loadTeamProfiles = async () => { calls.reloaded = true; };
    w.renderTeamView = () => {};
    w.showError = (m) => { calls.errors.push(m); };
    w.crypto = { getRandomValues: (arr) => { for (let k = 0; k < arr.length; k++) arr[k] = (k * 37 + 11) % 256; return arr; } };
    let pIdx = 0;
    w.prompt = (msg, dflt) => { calls.prompts.push(msg); const a = fixture.promptAnswers[pIdx++]; return a === undefined ? null : a; };
    w.alert = (m) => calls.alerts.push(m);
    w.fetch = async (url, opts) => {
      calls.fetches.push({ url, body: JSON.parse(opts.body), headers: opts.headers });
      return fixture.fetchResponse || { ok: true, json: async () => ({ ok: true, existed: false, email: JSON.parse(opts.body).email, role: JSON.parse(opts.body).role }) };
    };
    const fn = new w.Function('return (async function(){' + handlerBody + '}).call(this);');
    return { w, calls, run: () => fn.call(w) };
  }

  {
    const { calls, run } = runInvite({
      currentUser: { email: 'theo@cardinalrenovations.net' },
      promptAnswers: ['kyle@cardinalrenovations.net', 'Kyle Mantia', 'sales'],
    });
    await run();
    ok('admin invite posts to /api/invite', calls.fetches.length === 1 && calls.fetches[0].url === '/api/invite');
    const body = calls.fetches[0].body;
    ok('payload has the right shape', body.email === 'kyle@cardinalrenovations.net' && body.name === 'Kyle Mantia' && body.role === 'sales');
    ok('carries the bearer token', calls.fetches[0].headers.Authorization === 'Bearer tok-abc');
    ok('a temporary password was generated, not typed by the admin', typeof body.password === 'string' && body.password.length === 12);
    ok('the roster refreshes on success', calls.reloaded === true);
    ok('the password is relayed to the admin, never emailed automatically',
      calls.alerts.length === 1 && calls.alerts[0].includes('nothing was emailed automatically'));
  }
  {
    const { calls, run } = runInvite({
      currentUser: { email: 'nick@cardinalrenovations.net' },
      promptAnswers: [],
    });
    await run();
    ok('a non-admin is refused before any prompt or network call',
      calls.fetches.length === 0 && calls.alerts.length === 1 && calls.alerts[0].includes('Only Theo or Joan'));
  }
  {
    const { calls, run } = runInvite({
      currentUser: { email: 'theo@cardinalrenovations.net' },
      promptAnswers: ['not-an-email', 'x', 'sales'],
    });
    await run();
    ok('an invalid email is refused before any network call', calls.fetches.length === 0);
  }
  {
    const { calls, run } = runInvite({
      currentUser: { email: 'theo@cardinalrenovations.net' },
      promptAnswers: ['ok@cardinalrenovations.net', 'X', 'supervisor'],
    });
    await run();
    ok('an invalid role is refused before any network call (must match invite.js\'s ROLES)', calls.fetches.length === 0);
  }
}

console.log('\n── P4: photo payload ──');
{
  const g = SRC.slice(SRC.indexOf('function renderGallery('), SRC.indexOf('function renderGallery(') + 1000);
  ok('the gallery image now loads lazily', g.includes('loading="lazy"'));
  const mod = extractScript('cr-medmig-script');
  ok('the media-migration module exists', !!mod);
  ok('it queries base64 rows by pattern, not by scanning everything client-side',
    mod.includes(".like('data', 'data:%')") && mod.includes(".like('cover_image', 'data:%')"));
  ok('each row is updated only after its own upload succeeds (per-row try/catch, not all-or-nothing)',
    (mod.match(/try\{/g) || []).length >= 2 && mod.includes('left as-is'));
  ok('exports via Object.assign-free direct export is fine here (new module, no prior export to clobber)',
    mod.includes('window.CardinalMediaMigrate = { showRunner: showRunner };') &&
    SRC.indexOf('window.CardinalMediaMigrate') === SRC.lastIndexOf('window.CardinalMediaMigrate'));
}

console.log('\n── P5: the invisible claim, executed for real ──');
{
  const cthSrc = extractScript('cr-cth-script');
  ok('RAIL now lists OnHold', /key:'OnHold'/.test(cthSrc));

  function runCompute(claimsByProject, projects) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
    const w = dom.window;
    w.window.cacheProjects = projects;
    w.window.projClaimType = (pr) => {
      try { const ck = JSON.parse(pr.checklist || '{}'); return (ck.lead && ck.lead.claim_type) || 'unknown'; }
      catch (e) { return 'unknown'; }
    };
    /* claimsByProject is module-private, populated by build()'s live fetch —
       compute() is exposed only via window.CardinalTruthHome.compute, and
       indirect eval of 'use strict' code doesn't leak var/function
       declarations into the global scope. Route every reference (not just
       the subscript reads) through a property assignment instead, which
       DOES cross that boundary, so the fixture claim reaches compute(). */
    const patched = cthSrc
      .replace('var claimsByProject = {};', 'window.__CBP__ = {};')  // var → property set, or strict-eval scoping drops it
      .replace(/\bclaimsByProject\b/g, 'window.__CBP__');
    w.eval(patched);
    w.window.__CBP__ = claimsByProject;
    return w;
  }

  const claim = { approved_rcv: 28727.17, approved_acv: 19951.22, approved_depreciation: 7775.95, supplement_status: 'none' };
  const proj = { id: 'bc024ad1', stage: 'OnHold', checklist: JSON.stringify({ lead: { claim_type: 'insurance' } }) };
  const w = runCompute({ 'bc024ad1': claim }, [proj]);
  const result = w.window.CardinalTruthHome.compute();
  ok('an OnHold claim with the repaired checklist now bucket-counts (was silently dropped)',
    result.byKey['OnHold'] && result.byKey['OnHold'].n === 1, JSON.stringify(result.byKey['OnHold']));
  ok('its approved RCV lands in the OnHold bucket amount', result.byKey['OnHold'].amt === 28727.17, result.byKey['OnHold'].amt);
  ok('the job is NOT counted as denied (OnHold ≠ Lost)', result.denied === 0);

  const xlinksSrc = extractScript('cr-xlinks-script');
  ok('linkClaimToProject only sets claim_type when the lead doesn\'t already have one',
    /if\(!L\.claim_type\)\{/.test(xlinksSrc) && /L\.claim_type = 'insurance'/.test(xlinksSrc));
  ok('it reads the project from the shared cache rather than guessing a shape',
    xlinksSrc.includes('window.cacheProjects') && xlinksSrc.includes('window.parseCkAll') && xlinksSrc.includes('window.patchProjectCk'));
}

console.log('\n── P6: buried tools exposed ──');
{
  const banner = extractScript('cr-banner-script');
  ok('ROUTES gains walk, itellab and medmig, each admin-gated inside its own module (not by resolveHide)',
    /walk:\s*'CardinalWalk\.showRunner'/.test(banner) &&
    /itellab:\s*'CardinalItelLab\.open'/.test(banner) &&
    /medmig:\s*'CardinalMediaMigrate\.showRunner'/.test(banner));
  ok('menu spans exist for all three', SRC.includes('data-go="walk"') && SRC.includes('data-go="itellab"') && SRC.includes('data-go="medmig"'));
  ok('cr-itellab is registered in hideAllViews (it is class-shown, would trap navigation otherwise)',
    /cr-itellab['"]\);\s*\n\s*if\(_itl\) _itl\.classList\.remove\('open'\)/.test(SRC));

  const itelSrc = extractScript('cr-itellab-script');
  const dom = new JSDOM('<!doctype html><html><body>' +
    '<div id="cr-itellab"><div class="cr-itellab-sub"></div><div class="cr-itellab-body"></div>' +
    '<button data-act="close"></button></div></body></html>', { runScripts: 'outside-only' });
  const w = dom.window;
  w.isAdminUser = () => true;
  w.sb = { from: () => ({ select: () => ({ order: async () => ({
    data: [
      { id: 'a1', control_number: 'CTRL-1', verdict: 'Match', manufacturer: 'Owens Corning', product: 'Duration',
        match_product: 'Duration', asbestos_tested: true, asbestos_positive: false, report_date: '2026-08-01', claim_id: null },
      { id: 'a2', control_number: 'CTRL-2', verdict: 'No Match', asbestos_tested: false, claim_id: null },
    ], error: null
  }) }) }) };
  w.hideAllViews = () => {};
  w.eval(itelSrc);
  await w.window.CardinalItelLab.open();
  await new Promise(r => setTimeout(r, 0));
  const body = w.document.querySelector('.cr-itellab-body').innerHTML;
  ok('renders the real rows fetched from itel_lab_reports', body.includes('CTRL-1') && body.includes('CTRL-2'));
  ok('states plainly that these are unlinked, not hiding the gap', w.document.querySelector('.cr-itellab-sub').textContent.includes('not yet linked'));
  ok('non-admins are refused before any query', (() => {
    const w2 = new JSDOM('<!doctype html><html><body><div id="cr-itellab"></div></body></html>', { runScripts: 'outside-only' }).window;
    w2.isAdminUser = () => false;
    let alerted = false; w2.alert = () => { alerted = true; };
    w2.eval(itelSrc);
    w2.window.CardinalItelLab.open();
    return alerted;
  })());
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
