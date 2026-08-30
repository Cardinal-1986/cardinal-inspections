/* gate_1154 — addresses fill street / city / state / zip.
 *
 * Proves four things, and proves them by EXECUTING the shipped functions
 * (extracted by brace-matching out of index.html) against the real data
 * shapes Google hands over — not against a re-implementation.
 *
 *   1. ldStreet no longer matches isAddressInput  (the doubling bug)
 *   2. BOTH Places paths request AND parse address components
 *   3. crAddrParts reads BOTH component shapes (long_name / longText)
 *   4. crAddrApply splits when the form has partner fields, and strips
 *      ", USA" when it does not
 *
 * Negative control: pass the previous build's artifact as argv[2]; every
 * check must go RED there. A gate never seen red proves nothing.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok  = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                           else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

/* --- extract a top-level `function NAME(...)` by brace matching ----------
 * Comment-aware ON PURPOSE. The naive version desynced on an apostrophe
 * inside a block comment ("Google's"), opened a phantom string, never found
 * the closing brace and swallowed the next module. That is this project's
 * own comments-lie-in-both-directions trap, inside the instrument. */
function grab(name) {
  const at = src.indexOf('\nfunction ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0, prev = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    /* comments */
    if (ch === '/' && nx === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && nx === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i++; continue; }
    /* strings and templates */
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === q) break;
      }
      prev = q; continue;
    }
    /* regex literal — only where a regex can legally start */
    if (ch === '/' && /[(,=:[!&|?{};+\-*%~^]/.test(prev)) {
      let cls = false;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) break;
        else if (src[i] === '\n') break;
      }
      prev = '/'; continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(at + 1, i + 1); }
    if (!/\s/.test(ch)) prev = ch;
  }
  return null;
}

console.log('gate_1154 — ' + FILE + '\n');

/* ===== 1. ldStreet is excluded from Google's autocomplete ================ */
console.log('1 — ldStreet no longer matches isAddressInput');

const isAddrSrc = grab('isAddressInput');
ok('isAddressInput() found in the file', !!isAddrSrc);

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
const { window } = dom;
global.window = window; global.document = window.document;

/* the REAL ldStreet element, lifted verbatim out of the shipped markup */
const ldRe = /<input[^>]*id="ldStreet"[^>]*>/;
const ldTag = (src.match(ldRe) || [''])[0];
ok('ldStreet input found in the markup', !!ldTag, ldTag);

let isAddressInput = null;
if (isAddrSrc) {
  isAddressInput = new Function('document', 'return (' + isAddrSrc.trim() + ')')(window.document);
}

if (isAddressInput && ldTag) {
  const host = window.document.createElement('div');
  host.innerHTML = ldTag;
  const ld = host.firstElementChild;
  /* the placeholder legitimately contains the word "address", which is why
     removing it from the id whitelist alone was NOT enough */
  ok('ldStreet placeholder really does contain "address" (the trap)',
     /address/i.test(ld.getAttribute('placeholder') || ''),
     JSON.stringify(ld.getAttribute('placeholder')));
  ok('isAddressInput(ldStreet) === false',
     isAddressInput(ld) === false,
     'returned ' + isAddressInput(ld));

  /* and the inputs that SHOULD still be claimed still are — this is the
     half that stops the fix being "turn the feature off" */
  const mk = (attrs) => { const d = window.document.createElement('div');
                          d.innerHTML = '<input type="text" ' + attrs + '>';
                          return d.firstElementChild; };
  ok('isAddressInput(#qiAddrInp) still true',
     isAddressInput(mk('id="qiAddrInp"')) === true);
  ok('isAddressInput(#qiNpAddr) still true',
     isAddressInput(mk('id="qiNpAddr"')) === true);
  ok('isAddressInput([data-field=address]) still true',
     isAddressInput(mk('data-field="address"')) === true);
  ok('a search box named "address search" is still refused',
     isAddressInput(mk('placeholder="Search address"')) === false);
}

/* ===== 2. both Places paths request AND parse components ================= */
console.log('\n2 — both Places paths request and parse components');

/* modern path: fetchFields must ASK for addressComponents */
const ff = src.match(/fetchFields\(\{[^}]*\}\)/g) || [];
ok('fetchFields() call found', ff.length >= 1, ff.length + ' found');
ok('every fetchFields() requests addressComponents',
   ff.length >= 1 && ff.every(s => /addressComponents/.test(s)),
   ff.join(' | '));

/* legacy path: the widget's fields list must include address_components */
ok('legacy widget requests address_components',
   /fields\s*:\s*\[[^\]]*address_components/.test(src));

/* and BOTH must hand them to the one parser */
ok('modern path parses: crAddrParts(place.addressComponents)',
   src.includes('crAddrParts(place.addressComponents)'));
ok('legacy path parses: crAddrParts(place.address_components)',
   src.includes('crAddrParts(place.address_components)'));
/* count CALL sites only — `crAddrApply(input,` also matches the function's
   own definition, which is how this check first read 3 and failed correct
   code. Scope the pattern to an assignment. */
{
  const calls = (src.match(/=\s*crAddrApply\(input, parts,/g) || []).length;
  const defs  = (src.match(/function crAddrApply\(/g) || []).length;
  ok('exactly two crAddrApply CALL sites (one per Places path)', calls === 2, calls + ' found');
  ok('crAddrApply defined exactly once', defs === 1, defs + ' found');
}

/* The old behaviour must be GONE from both paths: taking the formatted
   string whole and using it as the address.
   NOTE these two are written against the form the code ACTUALLY had --
   `var addr = place.formattedAddress || ...`. The first draft asserted on
   `input.value = place.formatted_address`, a spelling that never existed,
   so both checks passed on the control and could never have failed. */
ok('modern path no longer takes formattedAddress whole',
   !/var addr = place\.formattedAddress/.test(src));
ok('legacy path no longer takes formatted_address whole',
   !/var addr = place\.formatted_address/.test(src));

/* ===== 3. crAddrParts reads BOTH component shapes ======================= */
console.log('\n3 — crAddrParts reads both Google component shapes');

const partsSrc = grab('crAddrParts');
ok('crAddrParts() found in the file', !!partsSrc);

let crAddrParts = null;
if (partsSrc) crAddrParts = new Function('return (' + partsSrc.trim() + ')')();

/* the real shapes, as the two libraries actually return them */
const LEGACY = [
  { types:['street_number'],               long_name:'804',      short_name:'804' },
  { types:['route'],                       long_name:'Burleigh Avenue', short_name:'Burleigh Ave' },
  { types:['locality','political'],        long_name:'Dayton',   short_name:'Dayton' },
  { types:['administrative_area_level_1'], long_name:'Ohio',     short_name:'OH' },
  { types:['country','political'],         long_name:'United States', short_name:'US' },
  { types:['postal_code'],                 long_name:'45402',    short_name:'45402' },
  { types:['postal_code_suffix'],          long_name:'1234',     short_name:'1234' }
];
const MODERN = LEGACY.map(c => ({ types:c.types, longText:c.long_name, shortText:c.short_name }));

if (crAddrParts) {
  for (const [label, comps] of [['legacy long_name', LEGACY], ['modern longText', MODERN]]) {
    const p = crAddrParts(comps);
    ok(label + ': street === "804 Burleigh Avenue"', p.street === '804 Burleigh Avenue', p.street);
    ok(label + ': city === "Dayton"',                p.city   === 'Dayton',              p.city);
    ok(label + ': state === "OH" (short, not "Ohio")', p.state === 'OH',                 p.state);
    ok(label + ': zip === "45402"',                  p.zip    === '45402',               p.zip);
    ok(label + ': zip4 === "1234"',                  p.zip4   === '1234',                p.zip4);
    ok(label + ': country is NOT folded into any field',
       ![p.street, p.city, p.state, p.zip].some(v => /United States|US$/.test(v)),
       JSON.stringify(p));
  }
  /* a rural pick with a route and no street number is still a street */
  const rural = crAddrParts([{ types:['route'], long_name:'Township Road 12' },
                             { types:['locality'], long_name:'Brookville' }]);
  ok('unnumbered route still yields a street', rural.street === 'Township Road 12', rural.street);
  /* and no components at all must not throw */
  let threw = false;
  try { crAddrParts(null); crAddrParts(undefined); crAddrParts([]); } catch (e) { threw = true; }
  ok('crAddrParts(null / [] ) does not throw', !threw);
}

/* ===== 4. crAddrApply — splits when it can, strips ", USA" when it can't = */
console.log('\n4 — crAddrApply splits, or strips ", USA"');

const applySrc = grab('crAddrApply');
ok('crAddrApply() found in the file', !!applySrc);

let crAddrApply = null;
if (applySrc) crAddrApply = new Function('Event', 'document', 'return (' + applySrc.trim() + ')')(window.Event, window.document);

if (crAddrApply && crAddrParts) {
  const parts = crAddrParts(LEGACY);
  const FULL  = '804 Burleigh Avenue, Dayton, OH 45402, USA';

  /* (a) a form WITH partner fields: split across four boxes */
  const d1 = new JSDOM('<!doctype html><body><form>' +
    '<input id="a" type="text">' +
    '<input id="c" autocomplete="address-level2">' +
    '<select id="s" autocomplete="address-level1"><option value=""></option><option value="OH">OH</option></select>' +
    '<input id="z" autocomplete="postal-code">' +
    '</form></body>');
  const w1 = d1.window, g1 = (id) => w1.document.getElementById(id);
  /* the function builds Events — run it with THIS window's globals */
  /* jsdom does not run scripts, so `new win.Function(...)` is still NODE's
     Function and a bare `Event` inside the extracted code resolves to Node's
     global Event — which jsdom's dispatchEvent rejects. Inject the window's
     own Event and document rather than trusting the realm. */
  const applyIn = (win) =>
    new Function('Event', 'document', 'return (' + applySrc.trim() + ')')(win.Event, win.document);
  const ret1 = applyIn(w1)(g1('a'), parts, FULL);

  ok('split: address box holds ONLY the street', g1('a').value === '804 Burleigh Avenue', g1('a').value);
  ok('split: city box filled',  g1('c').value === 'Dayton', g1('c').value);
  ok('split: state box filled', g1('s').value === 'OH',     g1('s').value);
  ok('split: zip box filled with zip+4', g1('z').value === '45402-1234', g1('z').value);
  ok('split: returns the street', ret1 === '804 Burleigh Avenue', ret1);
  ok('split: address box does NOT contain the city (the doubling bug)',
     !/Dayton/.test(g1('a').value), g1('a').value);
  ok('split: nothing anywhere contains ", USA"',
     ![g1('a'), g1('c'), g1('s'), g1('z')].some(e => /USA/.test(e.value)));

  /* (b) a form with NO partner fields: keep the whole line, minus ", USA" */
  const d2 = new JSDOM('<!doctype html><body><form><input id="a" type="text"></form></body>');
  const w2 = d2.window, a2 = w2.document.getElementById('a');
  const ret2 = applyIn(w2)(a2, parts, FULL);
  ok('no partners: keeps the whole address line',
     a2.value === '804 Burleigh Avenue, Dayton, OH 45402', a2.value);
  ok('no partners: ", USA" is stripped', !/USA/.test(a2.value), a2.value);
  ok('no partners: returns the same string', ret2 === a2.value, ret2);
  ok('no partners: parts are still stashed for a caller that wants them',
     a2.dataset.addrCity === 'Dayton' && a2.dataset.addrState === 'OH'
       && a2.dataset.addrZip === '45402-1234',
     JSON.stringify(a2.dataset));

  /* (c) partner fields present but the pick has no street (a city-level
         pick) — must NOT blank the address box */
  const d3 = new JSDOM('<!doctype html><body><form>' +
    '<input id="a" type="text"><input id="c" autocomplete="address-level2"></form></body>');
  const w3 = d3.window, a3 = w3.document.getElementById('a');
  const cityOnly = crAddrParts([{ types:['locality'], long_name:'Dayton' },
                                { types:['administrative_area_level_1'], short_name:'OH' }]);
  applyIn(w3)(a3, cityOnly, 'Dayton, OH, USA');
  ok('city-level pick does not blank the address box', a3.value.length > 0, JSON.stringify(a3.value));
  ok('city-level pick still strips ", USA"', !/USA/.test(a3.value), a3.value);

  /* (d) the split must fire change events, or a framework-bound field
         never learns it was filled */
  const d4 = new JSDOM('<!doctype html><body><form>' +
    '<input id="a" type="text"><input id="c" autocomplete="address-level2"></form></body>');
  const w4 = d4.window;
  let seen = 0;
  w4.document.getElementById('c').addEventListener('change', () => seen++);
  w4.document.getElementById('c').addEventListener('input',  () => seen++);
  applyIn(w4)(w4.document.getElementById('a'), parts, FULL);
  ok('filling a partner field fires input + change', seen === 2, seen + ' event(s)');
}

console.log('\n' + (fail === 0 ? 'GREEN' : 'RED') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
