/* Build 660 — Ordinance & Law is "BC — Building Codes".

   658 taught the reader the PROSE names for this coverage. None of them
   appear on an Xactimate scope: there it is a COVERAGE CATEGORY coded "BC"
   with its own subtotal and summary page. Adam Gunn's estimate carries
   exactly that (Item Total $1,887.33, ACV Total $1,933.72) and the reader
   walked past it.

   The formatter is EXECUTED against Gunn's real figures, including the
   Allstate quirk that makes the ACV LARGER than the RCV — a build that
   assumed ACV <= RCV would look correct in a fixture and wrong on his job.

   Usage: node harness_660.js [index.html] [api/sol.js]
   Point both at the previous build as the negative control — it must go red. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APIF = process.argv[3] || '/home/user/cardinal-inspections/api/sol.js';
const SRC = fs.readFileSync(FILE, 'utf8');
const API = fs.readFileSync(APIF, 'utf8');

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

console.log('\n── the extractor knows the category code ──');
{
  ok('"BC-Building Codes" is named in the prompt', /BC-Building Codes/.test(API));
  ok('…and it is described as a CATEGORY, not a sentence',
    /COVERAGE CATEGORY, not as a sentence/i.test(API));
  ok('…and the dedicated summary page is called out', /Summary for BC-Building Codes/i.test(API));
  ok('a non-zero BC category is stated to BE the coverage',
    /A BC category with a non-zero total IS ordinance & law coverage/i.test(API));
  ok('the response shape asks for both category totals',
    /"ord_law_rcv": number or null/.test(API) && /"ord_law_acv": number or null/.test(API));
  ok('the model is warned NOT to assume ACV < RCV (the Allstate tax quirk)',
    /Do NOT assume the ACV is the smaller one/i.test(API) && /sales tax/i.test(API));
  ok('the endorsement cap is kept distinct from the scope amount',
    /policy endorsement cap/i.test(API) && /Never put a scope subtotal there/i.test(API));
  /* ⚠ "ice & water barrier" is split across a string-concatenation line break
     in the source ('... ice & water ' + 'barrier, ...'), so a contiguous match
     finds nothing and reports a false red on correct code. Match the prompt as
     the model receives it — concatenated — not as it is typed. */
  const PROMPT = API.replace(/'\s*\+\s*\n\s*'/g, '');
  ok('code-driven line items count as evidence when no category prints',
    /Lead-Safe/i.test(PROMPT) && /ice & water barrier/i.test(PROMPT) &&
    /still set ord_law true/i.test(PROMPT));
}

console.log('\n── the formatter, executed on Adam Gunn\'s real figures ──');
{
  const f = fnText('insOrdLawText');
  ok('insOrdLawText extracted', !!f);
  let T = () => '(no formatter)';
  if (f) {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
    w.eval(f + '\nwindow.__t = insOrdLawText;');
    T = w.__t;
  }
  const GUNN = { ord_law: true, ord_law_basis: 'BC-Building Codes',
                 ord_law_rcv: 1887.33, ord_law_acv: 1933.72 };
  ok('Gunn renders with the category name and BOTH totals, labelled',
    T(GUNN) === 'Yes — BC-Building Codes, $1,887.33 RCV / $1,933.72 ACV', T(GUNN));
  ok('the ACV being LARGER than the RCV is shown as-is, not "corrected"',
    T(GUNN).indexOf('$1,933.72 ACV') > T(GUNN).indexOf('$1,887.33 RCV'));
  ok('RCV alone still reads', T({ ord_law: true, ord_law_rcv: 1887.33 }) === 'Yes — $1,887.33 RCV',
    T({ ord_law: true, ord_law_rcv: 1887.33 }));
  ok('ACV alone still reads', T({ ord_law: true, ord_law_acv: 1933.72 }) === 'Yes — $1,933.72 ACV');
  ok('the endorsement cap is labelled a cap, not a scope amount',
    T({ ord_law: true, ord_law_limit: 25000 }) === 'Yes — cap $25,000.00',
    T({ ord_law: true, ord_law_limit: 25000 }));
  ok('a bare yes with no figures still reads Yes', T({ ord_law: true }) === 'Yes');
  /* 658's guarantees must survive */
  ok('null STILL reads "Not stated" (658 must not regress)', T({ ord_law: null }) === 'Not stated');
  ok('false STILL reads "No"', T({ ord_law: false }) === 'No');
  ok('no absent-state input yields "No"',
    [{ ord_law: null }, {}, { ord_law: undefined }].every(o => T(o) !== 'No'));
}

console.log('\n── the claims-module twin keeps step ──');
{
  const mod = block('cr-claims-script') || '';
  const local = fnText('ordLawText', mod);
  ok('the local twin exists', !!local);
  let L = () => '(none)';
  if (local) {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window;
    w.eval("function fmt(n){ return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); }\n" +
      local + '\nwindow.__l = ordLawText;');
    L = w.__l;
  }
  ok('it shows both category totals too',
    /1,887\.33 RCV/.test(L({ ord_law: true, ord_law_rcv: 1887.33, ord_law_acv: 1933.72 })) &&
    /1,933\.72 ACV/.test(L({ ord_law: true, ord_law_rcv: 1887.33, ord_law_acv: 1933.72 })),
    L({ ord_law: true, ord_law_rcv: 1887.33, ord_law_acv: 1933.72 }));
  ok('and STILL renders a real false as "No" with the global absent', L({ ord_law: false }) === 'No');
}

console.log('\n── the two figures reach and leave the screen ──');
{
  const iu = block('cr-iu-script') || '';
  ok('cr-iu shape() carries both', iu.includes('ord_law_rcv:   row.ord_law_rcv') && iu.includes('ord_law_acv:   row.ord_law_acv'));
  ok('the bounded select fetches both (655 named its columns — keep in step)',
    iu.includes("'coverage_type,ord_law,ord_law_basis,ord_law_limit,ord_law_rcv,ord_law_acv,'"));
  ok('the claim modal offers both, and labels the cap as a cap',
    SRC.includes('data-f="ord_law_rcv"') && SRC.includes('data-f="ord_law_acv"') &&
    SRC.includes('O&amp;L endorsement cap ($)'));
  ok('the modal payload sends both', SRC.includes("ord_law_rcv:       num('ord_law_rcv'),") &&
    SRC.includes("ord_law_acv:       num('ord_law_acv'),"));
  ok('the scope-review modal offers both for approval',
    SRC.includes("['O&L RCV',") && SRC.includes("['O&L ACV',"));
  ok('all three amounts coerce to numbers on apply',
    SRC.includes("path === 'ord_law_limit' || path === 'ord_law_rcv' || path === 'ord_law_acv'"));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
