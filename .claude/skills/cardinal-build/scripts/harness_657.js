/* Build 657 — read the scope already on file; claim fields; honest money.

   The routing decision is the whole build, so it is EXECUTED, not asserted
   about: readScopeOfLoss / readFiledScope / routeScopeToReader are
   brace-matched out of the artifact and run in jsdom against a stubbed
   CardinalSolUpload that records which door was taken. paneClient() and
   money() are likewise executed out of cr-claims-script.

   Usage: node harness_657.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(name, src) {
  src = src || SRC;
  const m = src.match(new RegExp('(async )?function ' + name + '\\s*\\([^)]*\\)\\s*\\{'));
  if (!m) return null;
  let d = 0, started = false, k = m.index;
  for (; k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) break; }
  }
  return src.slice(m.index, k + 1);
}
function block(id) {
  const t = '<script id="' + id + '">';
  const i = SRC.indexOf(t);
  return i === -1 ? null : SRC.slice(i + t.length, SRC.indexOf('</script>', i));
}

(async function () {

console.log('\n── P1: the size router, executed ──');
{
  const route = fnText('routeScopeToReader');
  const readF = fnText('readScopeOfLoss');
  const filed = fnText('readFiledScope');
  ok('routeScopeToReader exists', !!route);
  ok('readScopeOfLoss + readFiledScope extracted', !!readF && !!filed);

  function win(prepareResult, opts) {
    opts = opts || {};
    const dom = new JSDOM('<!doctype html><body>' +
      '<div id="solCardEl"></div><button id="solBtn">Upload</button>' +
      '<button id="solReadBtn">Read</button></body>', { runScripts: 'outside-only' });
    const w = dom.window;
    const calls = { prepared: null, url: null, inline: null, alerts: [], modal: null };
    w.currentProject = { id: 'p1' };
    w.auditLog = () => {};
    w.alert = (m) => calls.alerts.push(m);
    w.openSolReviewModal = (extracted, name) => { calls.modal = { extracted, name }; };
    w.sendScopeToReader = async (b64, mime, name) => { calls.inline = { len: b64.length, mime, name }; };
    w.window.CardinalSolUpload = {
      prepare: async (f) => { calls.prepared = { name: f.name, size: f.size }; return prepareResult; },
      extractFromUrl: async (u) => { calls.url = u; return { carrier: 'Allstate', rcv: 41000 }; },
    };
    if (opts.noPrepare) delete w.window.CardinalSolUpload;
    /* On a build with no router (the negative control) these evaluate to
       nothing and the callers below fail cleanly instead of throwing. */
    w.eval((route || '') + '\n' + (readF || '') + '\n' + (filed || '') +
      '\nwindow.__route = typeof routeScopeToReader === "function" ? routeScopeToReader : null;' +
      '\nwindow.__read  = typeof readScopeOfLoss    === "function" ? readScopeOfLoss    : null;' +
      '\nwindow.__filed = typeof readFiledScope     === "function" ? readFiledScope     : null;');
    return { w, calls };
  }
  const call = async (fn, ...a) => { if (typeof fn === 'function') { try { await fn(...a); } catch (e) { /* recorded by the assertions */ } } };
  const bigFile = { name: 'Adam Gunn Revised Estimate.pdf', size: 4.8 * 1024 * 1024, type: 'application/pdf' };
  const smallFile = { name: 'small.pdf', size: 200 * 1024, type: 'application/pdf' };

  {  // over the inline cap -> storage URL door
    const { w, calls } = win({ url: 'https://storage/sol/gunn.pdf' });
    await call(w.__read, bigFile);
    ok('a 4.8 MB scope goes through prepare()', calls.prepared && calls.prepared.size === bigFile.size);
    ok('…and is read via the storage URL, not posted inline', calls.url === 'https://storage/sol/gunn.pdf' && calls.inline === null, JSON.stringify(calls));
    ok('…and still opens the same review modal', !!calls.modal && calls.modal.extracted.carrier === 'Allstate');
  }
  {  // under the cap -> unchanged inline path
    const { w, calls } = win({ file: smallFile });
    w.FileReader = function () {
      this.readAsDataURL = () => { this.onload && this.onload(); };
      Object.defineProperty(this, 'result', { get: () => 'data:application/pdf;base64,QUJD' });
    };
    await call(w.__read, smallFile);
    ok('a small scope stays on the inline path (unchanged behaviour)', !!calls.inline && calls.url === null, JSON.stringify(calls));
  }
  {  // prepare refuses (over the hard cap) -> nothing is sent
    const { w, calls } = win(null);
    await call(w.__read, bigFile);
    ok('when prepare() refuses, nothing is sent either way', calls.url === null && calls.inline === null);
  }
  {  // the FILED door: stored dataURL -> File -> the same router
    const { w, calls } = win({ url: 'https://storage/sol/filed.pdf' });
    w.db = { get: async () => ({ id: 'd1', html: JSON.stringify({ file: 1, name: 'Gunn.pdf', mime: 'application/pdf', data: 'data:application/pdf;base64,QUJD' }) }) };
    w.fetch = async () => ({ blob: async () => ({ type: 'application/pdf', size: 3 }) });
    w.File = function (parts, name, o) { this.name = name; this.type = (o || {}).type; this.size = 6418120; };
    await call(w.__filed, 'd1');
    ok('the filed scope is converted and routed (not posted inline)',
      calls.prepared && calls.prepared.name === 'Gunn.pdf' && calls.url && calls.inline === null, JSON.stringify(calls));
  }
  ok('no sixth /api/sol pipeline — still exactly one fetch site',
    (SRC.match(/fetch\('\/api\/sol'/g) || []).length === 1,
    (SRC.match(/fetch\('\/api\/sol'/g) || []).length);
}

console.log('\n── P2: the two Scope-of-Loss buttons ──');
{
  ok('filing a scope offers to read it on the spot',
    SRC.includes("if(typeKey === 'scope_of_loss' && typeof routeScopeToReader === 'function'){"));
  ok('…and says plainly that filing alone does not update the claim',
    SRC.includes('Filing alone does not update the claim.'));
  ok('the doc-slot control no longer reads as the extractor',
    SRC.includes("(dt.key === 'scope_of_loss' ? 'File a copy' : 'Upload')"));
}

console.log('\n── P3: Coverage Type + Ord. & Law on the claims screen ──');
{
  const mod = block('cr-claims-script');
  const pane = fnText('paneClient', mod);
  ok('paneClient extracted', !!pane);
  ok('the module knows the fields now (was 0 occurrences)',
    mod.includes('coverage_type') && mod.includes('ord_law'));

  function render(claim) {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
    const w = dom.window;
    w.eval(
      'var state = { claim: ' + JSON.stringify(claim) + ' };\n' +
      'function esc(s){ return String(s == null ? "" : s); }\n' +
      'function fmtDate(d){ return String(d); }\n' +
      'function causeLabel(c){ return String(c); }\n' +
      'function sect(n, t, btn, body){ return body; }\n' +
      pane + '\nwindow.__out = paneClient();');
    return w.__out;
  }
  /* read the rendered cell WITHOUT throwing when the row is absent — the
     negative control must report a clean red, not crash on match()[1] */
  const cell = (claim, label) => {
    const m = render(claim).match(new RegExp(label + '<\\/div><div class="val[^"]*">([^<]*)<'));
    return m ? m[1] : '(row absent)';
  };
  ok('ord_law false renders "No" (not blank — the 655 trap)', cell({ ord_law: false }, 'Ord\\. &amp; Law') === 'No', cell({ ord_law: false }, 'Ord\\. &amp; Law'));
  ok('ord_law true renders "Yes"', cell({ ord_law: true }, 'Ord\\. &amp; Law') === 'Yes');
  ok('ord_law null renders "Not set"', cell({ ord_law: null }, 'Ord\\. &amp; Law') === 'Not set');
  ok('coverage_type renders its value', render({ coverage_type: 'RCV' }).includes('>RCV<'));
  ok('coverage_type null renders "Not set"', cell({ coverage_type: null }, 'Coverage Type') === 'Not set');

  ok('the edit modal offers both fields', SRC.includes('data-f="coverage_type"') && SRC.includes('data-f="ord_law"'));
  ok('the modal rows are SIBLINGS, not nested inside the adjuster row',
    /<\/div>\s*<\/div>\s*\n\s*<!-- 657:[\s\S]{0,400}?<div class="cr-c-modal-row">\s*\n\s*<div>\s*\n\s*<label>Coverage Type<\/label>/.test(SRC));
  // the payload converts to a real boolean — extracted from the artifact,
  // guarded so a build without it fails clean instead of throwing
  const convM = SRC.match(/ord_law:\s*\(function\(\)\{[\s\S]*?\}\)\(\)/);
  ok('the payload builds ord_law from the select', !!convM);
  const run = convM
    ? (() => {
        const w2 = new JSDOM('<!doctype html><body><select data-f="ord_law">' +
          '<option value="">a</option><option value="yes">b</option><option value="no">c</option>' +
          '</select></body>', { runScripts: 'outside-only' }).window;
        const conv = convM[0].replace(/^ord_law:\s*/, '');
        return (v) => { w2.document.querySelector('[data-f="ord_law"]').value = v;
          return w2.eval('(function(modal){ return ' + conv + '; })(document)'); };
      })()
    : () => '(no converter)';
  ok('payload sends a real boolean true for Yes', run('yes') === true);
  ok('payload sends a real boolean false for No', run('no') === false, JSON.stringify(run('no')));
  ok('payload sends null for Not set (never the empty string)', run('') === null);
}

console.log('\n── P4: never-entered money stops reading $0 ──');
{
  const mod = block('cr-claims-script');
  const money = fnText('money', mod);
  const fmt = fnText('fmt', mod);
  ok('money() exists beside fmt()', !!money && !!fmt);
  /* guarded so a build without money() reports red rather than crashing */
  let M = () => '(no money())';
  if (money && fmt) {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
    w.eval(fmt + '\n' + money + '\nwindow.__m = money;');
    M = w.__m;
  }
  ok('null renders as an em dash, not $0', M(null) === '—', M(null));
  ok('undefined renders as an em dash', M(undefined) === '—');
  ok('a REAL zero still renders $0 (a carrier can approve nothing)', M(0) === '$0', M(0));
  ok('a real figure still formats', M(28727.17) === '$28,727.17', M(28727.17));
  ok('the four Financials cells use money()',
    (SRC.match(/\$\{money\((rcv|acv|depr|c\.deductible)\)\}/g) || []).length === 4,
    (SRC.match(/\$\{money\(/g) || []).length);
  ok('fmt() itself is untouched (other callers want the zero)',
    fmt.includes('Number(n || 0)'));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
