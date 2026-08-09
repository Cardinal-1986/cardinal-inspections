/* Build 658 — ordinance & law stops lying.

   The whole build is one claim: NO INPUT PATH MAY PRODUCE "No" FROM AN
   ABSENCE. So the converters and the formatter are EXECUTED out of the
   artifact against every state, and there is a sweep asserting the three
   old false-makers are gone from code (not merely from a comment — the
   `!!ordLaw` token deliberately survives inside this build's own note,
   which is the comment-pollution trap; the assertions key on the
   defect's real shape).

   Usage: node harness_658.js [index.html]
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

console.log('\n── the formatter, executed against every state ──');
{
  const f = fnText('insOrdLawText');
  ok('insOrdLawText extracted', !!f);
  let T = () => '(no formatter)';
  if (f) {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
    w.eval(f + '\nwindow.__t = insOrdLawText;');
    T = w.__t;
  }
  ok('null → "Not stated" (the whole point)', T({ ord_law: null }) === 'Not stated', T({ ord_law: null }));
  ok('undefined/missing → "Not stated"', T({}) === 'Not stated', T({}));
  ok('no object at all → "Not stated"', T(undefined) === 'Not stated', T(undefined));
  ok('false → "No" (a real, deliberate negative still reads No)', T({ ord_law: false }) === 'No', T({ ord_law: false }));
  ok('true alone → "Yes"', T({ ord_law: true }) === 'Yes', T({ ord_law: true }));
  ok('true + wording → names what the document called it',
    T({ ord_law: true, ord_law_basis: 'Code Upgrade Coverage' }) === 'Yes — Code Upgrade Coverage',
    T({ ord_law: true, ord_law_basis: 'Code Upgrade Coverage' }));
  /* 660 SUPERSEDED: ord_law_limit was "any stated limit"; 660 made it precisely
     the ENDORSEMENT CAP (often % of Coverage A) and gave the scope amounts their
     own fields, so it now renders labelled "cap". The app is right. */
  ok('true + wording + cap → the full sentence, cap labelled as a cap',
    T({ ord_law: true, ord_law_basis: 'Code Upgrade', ord_law_limit: 10000 }) === 'Yes — Code Upgrade, cap $10,000.00',
    T({ ord_law: true, ord_law_basis: 'Code Upgrade', ord_law_limit: 10000 }));
  ok('a zero/blank limit is not printed as $0',
    T({ ord_law: true, ord_law_basis: 'X', ord_law_limit: 0 }) === 'Yes — X',
    T({ ord_law: true, ord_law_basis: 'X', ord_law_limit: 0 }));
  /* the load-bearing assertion */
  const nulls = [{ ord_law: null }, {}, { ord_law: undefined }, { ord_law: null, ord_law_basis: 'X' }];
  ok('NO absent-state input yields "No" anywhere', nulls.every(o => T(o) !== 'No'),
    JSON.stringify(nulls.map(T)));
}

console.log('\n── the converter: an untouched control cannot say No ──');
{
  const f = fnText('insOrdLawFromSelect');
  ok('insOrdLawFromSelect extracted', !!f);
  let C = () => '(no converter)';
  if (f) {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
    w.eval(f + '\nwindow.__c = insOrdLawFromSelect;');
    C = w.__c;
  }
  ok('"" → null (never false)', C('') === null, JSON.stringify(C('')));
  ok('null/undefined → null', C(null) === null && C(undefined) === null);
  ok('"yes" → true', C('yes') === true);
  ok('"no" → false (a deliberate No is still recordable)', C('no') === false, JSON.stringify(C('no')));
}

console.log('\n── the three old false-makers are gone from CODE ──');
{
  ok('lead form: the checkbox is a tri-state select',
    SRC.includes('<select id="ldInsOrdLaw">') && !SRC.includes('type="checkbox" id="ldInsOrdLaw"'));
  ok('lead form: reads .value through the shared converter, not .checked',
    SRC.includes("insOrdLawFromSelect(document.getElementById('ldInsOrdLaw').value)") &&
    !SRC.includes("getElementById('ldInsOrdLaw').checked"));
  ok('the form RESET clears the select (writing .checked on it would be inert)',
    SRC.includes("document.getElementById('ldInsOrdLaw').value = '';"));
  ok('editor: `ord_law: !!ordLaw` is gone (the token survives only in this build\'s comment)',
    !SRC.includes('ord_law: !!ordLaw'));
  ok('editor: a dismissed prompt no longer asserts a finding',
    SRC.includes("var ordLaw = _oa === '' ? null : (_oa.charAt(0) === 'y');"));
  ok('scope apply: a blank/null extraction no longer applies as false',
    SRC.includes("val = (val === '' || val === 'null' || val == null) ? null : (val === 'true');") &&
    !SRC.includes("val = (val === 'true');"));
}

console.log('\n── every display site goes through the one formatter ──');
{
  ok('profile insurance panel', SRC.includes("cell('Ord. &amp; Law',  insOrdLawText(I))"));
  ok('claims screen Claim Info', SRC.includes("kv('Ord. &amp; Law', ordLawText(c), 'Not stated')"));
  /* the fallback has to be CORRECT, not just present: an early draft fell
     through to '' and kv() then printed "Not stated" for a real false — a
     fresh way to be deceiving. Execute the module-local twin with the global
     absent and prove it still says No. */
  {
    const mod = block('cr-claims-script') || '';
    const local = fnText('ordLawText', mod);
    ok('the claims module carries its own correct twin', !!local);
    let L = () => '(none)';
    if (local) {
      const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
      w.eval('function fmt(n){ return String(n); }\n' + local + '\nwindow.__l = ordLawText;');
      L = w.__l;   /* window.insOrdLawText deliberately NOT defined */
    }
    ok('with the global missing, a real false STILL reads "No", not blank', L({ ord_law: false }) === 'No', L({ ord_law: false }));
    ok('with the global missing, null yields "" so kv() prints "Not stated"', L({ ord_law: null }) === '');
    ok('with the global missing, true still reads "Yes"', L({ ord_law: true }) === 'Yes');
  }
  ok('no hand-rolled ternary survives at any display site',
    !SRC.includes("I.ord_law ? 'Yes' : (I.ord_law === false ? 'No' : '')") &&
    !SRC.includes("c.ord_law === true ? 'Yes' : (c.ord_law === false ? 'No' : '')"));
  /* 660 SUPERSEDED: the single "O&L Limit" row became three — RCV, ACV and cap. */
  ok('the scope-review modal shows the wording and the amounts',
    SRC.includes("['O&L Called',      'ord_law_basis',") && SRC.includes("['O&L cap',         'ord_law_limit',"));
  ok('the claim modal lets a human correct the wording and limit',
    SRC.includes('data-f="ord_law_basis"') && SRC.includes('data-f="ord_law_limit"'));
  ok('the claim modal payload carries both new fields',
    SRC.includes("ord_law_basis:     get('ord_law_basis'),") && SRC.includes("ord_law_limit:     num('ord_law_limit'),"));
  ok('the claim modal select reuses the shared converter',
    SRC.includes('window.insOrdLawFromSelect(modal.querySelector'));
}

console.log('\n── the two new columns reach the screen ──');
{
  const iu = block('cr-iu-script') || '';
  ok('cr-iu shape() carries basis + limit', iu.includes('ord_law_basis: row.ord_law_basis || null,'));
  /* 660 SUPERSEDED: two more columns joined the named select and the line split. */
  ok('the bounded select fetches them (655 named its columns — keep them in step)',
    iu.includes("ord_law,ord_law_basis,ord_law_limit,ord_law_rcv,ord_law_acv,"));
}

console.log('\n── the extractor knows the aliases (api/sol.js) ──');
{
  let api = '';
  try { api = fs.readFileSync('/home/user/cardinal-inspections/api/sol.js', 'utf8'); } catch (e) {}
  ok('api/sol.js read', !!api);
  const aliases = ['ordinance or law', 'law and ordinance', 'code upgrade', 'code coverage',
                   'code compliance', 'building code', 'Coverage D'];
  ok('every alias Theo named is in the prompt', aliases.every(a => api.includes(a)),
    aliases.filter(a => !api.includes(a)).join(', '));
  ok('the tri-state rule is stated explicitly to the model',
    /never use false to mean/i.test(api) && /set it to NULL/i.test(api));
  ok('the response shape asks for the wording and the limit',
    api.includes('"ord_law_basis": string or null') && api.includes('"ord_law_limit": number or null'));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
