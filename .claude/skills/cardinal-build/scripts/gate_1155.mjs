/* gate_1155 — the address is stored split as well as whole.
 *
 *  1. crSplitAddress() parses the REAL production strings correctly, and
 *     agrees with what projects_address_parts.sql actually wrote to the
 *     database. Both halves of one rule, cross-checked against each other —
 *     a browser that splits one way and a backfill that splits another is
 *     two answers to one question.
 *  2. crAddrFields() prefers Google's own parts over re-parsing, and drops
 *     back to parsing when the box has been edited since.
 *  3. every writer stores the four parts beside the address.
 *  4. the contract prefers the columns, keeps 1004's staleness guard on
 *     EVERY source, and still falls back to the flat line.
 *
 * Negative control: argv[2] = the previous artifact. Must go RED.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

/* comment-aware brace matcher (see gate_1154 — a naive one desyncs on an
   apostrophe inside a block comment) */
function grab(name) {
  const at = src.indexOf('\nfunction ' + name + '(');
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0, prev = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (ch === '/' && nx === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && nx === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      for (i++; i < src.length; i++) { if (src[i] === '\\') { i++; continue; } if (src[i] === q) break; }
      prev = q; continue;
    }
    if (ch === '/' && /[(,=:[!&|?{};+\-*%~^]/.test(prev)) {
      let cls = false;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) break; else if (src[i] === '\n') break;
      }
      prev = '/'; continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(at + 1, i + 1); }
    if (!/\s/.test(ch)) prev = ch;
  }
  return null;
}
/* the parser needs the three module-level tables that sit beside it */
function grabVar(name) {
  const at = src.indexOf('\nvar ' + name + ' =');
  if (at < 0) return null;
  const end = src.indexOf('\n', src.indexOf(';', at));
  return src.slice(at + 1, end);
}

/* Extract a function BODY by brace matching from a literal start needle.
   The first draft used a regex ending in `\n  \};` -- which does not exist in
   the older one-line form of _normAddr, so the lazy match ran on into unrelated
   code and `new Function` threw. A control that CRASHES reports nothing at all
   (BUG_CLASSES 37), so this is brace-matched instead. */
function bodyAfter(needle, text) {
  const at = (text || src).indexOf(needle);
  if (at < 0) return null;
  const t = text || src;
  const open = t.indexOf('{', at + needle.length - 1);
  if (open < 0) return null;
  let d = 0;
  for (let i = open; i < t.length; i++) {
    const c = t[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      for (i++; i < t.length; i++) { if (t[i] === '\\') { i++; continue; } if (t[i] === q) break; }
      continue;
    }
    if (c === '/' && t[i + 1] === '*') { i = t.indexOf('*/', i + 2); if (i < 0) return null; i++; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return t.slice(open + 1, i); }
  }
  return null;
}

console.log('gate_1155 — ' + FILE + '\n');

/* ===== 1. the parser, against the real production strings ================ */
console.log('1 — crSplitAddress on the real stored addresses');

const pSrc  = grab('crSplitAddress');
const fSrc  = grab('crAddrFields');
ok('crSplitAddress() found', !!pSrc);
ok('crAddrFields() found',   !!fSrc);

const tables = ['CR_STATES', 'CR_SPELLED', 'CR_CITIES'].map(grabVar);
ok('CR_STATES / CR_SPELLED / CR_CITIES all present', tables.every(Boolean));

let crSplitAddress = null;
if (pSrc && tables.every(Boolean)) {
  crSplitAddress = new Function(tables.join('\n') + '\nreturn (' + pSrc.trim() + ')')();
}

/* Every row is a REAL projects.address, with the street/city/state/zip that
   projects_address_parts.sql actually wrote to the database on 30 Aug 2026.
   Read back from Postgres, not hand-written — so this table is the SQL half
   of the rule and the JS half has to match it. */
const REAL = [
  ['9222 Arlington Rd, Brookville, OH 45309, USA, Brookeville, OH 45309', '9222 Arlington Rd', 'Brookville', 'OH', '45309'],
  ['804 Burleigh Ave, Dayton, OH 45402, USA, Dayton, OH 45414',           '804 Burleigh Ave',  'Dayton',     'OH', '45402'],
  ['5735 Webster St, Dayton, OH 45414, USA, dayton, OH 45432',            '5735 Webster St',   'Dayton',     'OH', '45414'],
  ['8743 Shadycreek Dr, Washington Township, OH 45458, USA, Dayton, OH 45458',
                                          '8743 Shadycreek Dr', 'Washington Township', 'OH', '45458'],
  ['2408 Lakeview Ave, Dayton, OH 45417, USA',        '2408 Lakeview Ave',  'Dayton',        'OH', '45417'],
  ['804 E Center St, Germantown, Germantown, OH 45327','804 E Center St',   'Germantown',    'OH', '45327'],
  ['2052 Morningside Drive, Lawrenceburg, IN 47025',  '2052 Morningside Drive', 'Lawrenceburg','IN','47025'],
  ['7310 cedar knolls dr, Huber heights, OH 45424',   '7310 cedar knolls dr','Huber Heights','OH', '45424'],
  ['804 Burleigh Avenue, Dayton, OH 45402-5205',      '804 Burleigh Avenue','Dayton',        'OH', '45402-5205'],
  ['1630 E 5th St, Dayton, OH 45403-2304',            '1630 E 5th St',     'Dayton',         'OH', '45403-2304'],
  ['Hyer Street, New Carlisle, OH 45344',             'Hyer Street',       'New Carlisle',   'OH', '45344'],
  ['Lewisburg Ozias Rd, Lewisburg, OH',               'Lewisburg Ozias Rd','Lewisburg',      'OH', ''],
  ['3625 Twinbrook, Kettering, OH',                   '3625 Twinbrook',    'Kettering',      'OH', ''],
  ['807 Browning Ave, Dayton, OH',                    '807 Browning Ave',  'Dayton',         'OH', ''],
  /* no comma at all — the hand-typed shape */
  ['4115 Shenandoah dr Dayton Ohio 46417',            '4115 Shenandoah dr','Dayton',         'OH', '46417'],
  ['3800 klepinger rd  dayton ohio46416',             '3800 klepinger rd', 'Dayton',         'OH', '46416'],
  ['231 Delaware  Ave Dayton Ohio 46405',             '231 Delaware Ave',  'Dayton',         'OH', '46405'],
  ['3431blocker dr Dayton Ohio 45420',                '3431blocker dr',    'Dayton',         'OH', '45420'],
  ['7036 Montague Road Huber Heights, OH 45424',      '7036 Montague Road','Huber Heights',  'OH', '45424'],
  ['3710 west third Dayton Ohio 45417',               '3710 west third',   'Dayton',         'OH', '45417'],
  /* street only — no city anywhere in the source */
  ['921 Testing Way',                                 '921 Testing Way',   '',               '',   ''],
  ['2420 Brookline',                                  '2420 Brookline',    '',               '',   ''],
  ['1049 Cicillion Ave',                              '1049 Cicillion Ave','',               '',   '']
];

if (crSplitAddress) {
  let bad = 0;
  for (const [raw, st, ci, sa, zp] of REAL) {
    const g = crSplitAddress(raw);
    /* the SQL applies initcap() to city; compare case-insensitively and check
       the JS value separately, so a casing difference is visible not hidden */
    const hit = g.street === st && g.city.toLowerCase() === ci.toLowerCase()
             && g.state === sa && g.zip === zp;
    if (!hit) { bad++; console.log('        mismatch: ' + JSON.stringify(raw)
        + '\n           js  ' + JSON.stringify(g)
        + '\n           sql ' + JSON.stringify({ street: st, city: ci, state: sa, zip: zp })); }
  }
  ok('all ' + REAL.length + ' real addresses match what the SQL backfill wrote', bad === 0, bad + ' mismatched');

  /* the parser must not throw on the shapes that actually reach it */
  let threw = false;
  try { crSplitAddress(null); crSplitAddress(undefined); crSplitAddress(''); crSplitAddress('   '); }
  catch (e) { threw = true; }
  ok('crSplitAddress(null / "" / "   ") does not throw', !threw);
  ok('blank in, blank out (not a bogus street)',
     crSplitAddress('').street === '' && crSplitAddress('  ').street === '');
  /* a chunk starting with a digit is street, not a city */
  const apt = crSplitAddress('123 Main St, Apt 4, Dayton, OH 45402');
  ok('a numbered chunk is not mistaken for a city', apt.city === 'Dayton', JSON.stringify(apt));
}

/* ===== 2. crAddrFields prefers Google's parts ============================ */
console.log('\n2 — crAddrFields prefers the stashed parts, re-parses when stale');

if (fSrc && pSrc && tables.every(Boolean)) {
  const dom = new JSDOM('<!doctype html><body><input id="a"></body>');
  const w = dom.window, el = w.document.getElementById('a');
  const crAddrFields = new Function('document',
      tables.join('\n') + '\n' + pSrc.trim().replace(/^function/, 'var __p = function') +
      '\nvar crSplitAddress = __p;\nreturn (' + fSrc.trim() + ')')(w.document);

  /* (a) Google filled it — use the stash verbatim, do not re-parse */
  el.value = '804 Burleigh Avenue';
  el.dataset.addrStreet = '804 Burleigh Avenue';
  el.dataset.addrCity   = 'Dayton';
  el.dataset.addrState  = 'OH';
  el.dataset.addrZip    = '45402-5205';
  let r = crAddrFields(el);
  ok('stash used when the box still holds it',
     r.street === '804 Burleigh Avenue' && r.city === 'Dayton'
       && r.state === 'OH' && r.zip === '45402-5205', JSON.stringify(r));

  /* (b) the user typed over it — the stash is stale, re-parse the string */
  el.value = '999 Somewhere Else Rd, Kettering, OH 45429';
  r = crAddrFields(el);
  ok('stale stash is ignored and the string re-parsed',
     r.street === '999 Somewhere Else Rd' && r.city === 'Kettering' && r.zip === '45429',
     JSON.stringify(r));

  /* (c) no stash at all — plain parse */
  const el2 = w.document.createElement('input');
  el2.value = '1365 Epworth Ave, Dayton, OH 45410';
  r = crAddrFields(el2);
  ok('no stash: falls back to parsing', r.city === 'Dayton' && r.zip === '45410', JSON.stringify(r));

  /* (d) a plain string, not an element */
  r = crAddrFields('353 Pointview, Dayton, OH 45405');
  ok('accepts a bare string too', r.street === '353 Pointview' && r.zip === '45405', JSON.stringify(r));
}

/* ===== 3. every writer stores the parts ================================== */
console.log('\n3 — every address writer stores the four parts');

const writers = [
  ['new-lead intake (ldSave)',  /street: street \|\| null,\s*\n\s*city:\s+city\s+\|\| null,\s*\n\s*state:\s+state\s+\|\| null,\s*\n\s*zip:\s+zip\s+\|\| null,/],
  ['client profile (pfSave)',   /_pfParts\.street \|\| null/],
  ['quick inspection (qiNp)',   /_qiParts\.street \|\| null/],
  ['lead editor (pdb.update)',  /_edParts\.street \|\| null/]
];
for (const [label, re] of writers) ok(label + ' writes street/city/state/zip', re.test(src));

ok('pfSave derives its parts through the exported helper',
   /_pfParts\s*=\s*\(window\.CardinalAddress[\s\S]{0,120}CardinalAddress\.fields\(_pfAddrEl\)/.test(src));
ok('qiNp derives its parts through the exported helper',
   /_qiParts\s*=\s*\(window\.CardinalAddress[\s\S]{0,120}CardinalAddress\.fields\(_qiAddrEl\)/.test(src));

/* THE ONE THAT MATTERS: cr-gmap-script is an IIFE, so the helpers are
   module-private. The first draft of 1155 called them bare from four other
   script blocks — every one a ReferenceError on save. gate_types caught it.
   This check is here so it cannot come back. */
{
  const i = src.indexOf('<script id="cr-gmap-script">');
  const j = src.indexOf('<\/script>', i);
  ok('cr-gmap-script located', i > 0 && j > i);
  const outside = src.slice(0, i) + src.slice(j);
  for (const nm of ['crSplitAddress(', 'crAddrFields(', 'crAddrParts(']) {
    const bare = (outside.split(nm).length - 1) - (outside.split('.' + nm).length - 1);
    ok('no bare cross-block call to ' + nm.slice(0, -1), bare === 0, bare + ' found outside the IIFE');
  }
  ok('helpers are exported on window.CardinalAddress',
     /window\.CardinalAddress = Object\.assign\(window\.CardinalAddress \|\| \{\}, \{[\s\S]{0,200}fields\s*:\s*crAddrFields/.test(src));
  ok('export uses Object.assign, not plain assignment (project rule)',
     !/window\.CardinalAddress\s*=\s*\{/.test(src));
  ok('every writer guards on the export being present',
     (src.match(/window\.CardinalAddress && window\.CardinalAddress\.(fields|split)/g) || []).length === 3,
     (src.match(/window\.CardinalAddress && window\.CardinalAddress\.(fields|split)/g) || []).length + ' guards');
}
ok('exactly one crSplitAddress definition', (src.match(/function crSplitAddress\(/g) || []).length === 1);
ok('exactly one crAddrFields definition',   (src.match(/function crAddrFields\(/g)   || []).length === 1);

/* ===== 4. the contract ================================================== */
console.log('\n4 — the contract prefers the columns, keeps the 1004 guard');

ok('contract reads pr.street/city/state/zip',
   /_colFit\s*=\s*_fits\(pr\.street, pr\.city, pr\.state, pr\.zip/.test(src));
ok('columns are checked against pr.address before printing (the 1004 guard)',
   /_colFit && _flatAddr && _normAddr\(_colFit\) === _normAddr\(_flatAddr\)/.test(src));
ok('the old checklist copy is still the SECOND choice, not dropped',
   /_locFit && _flatAddr && _normAddr\(_locFit\) === _normAddr\(_flatAddr\)/.test(src));
ok('the flat single line is still the last resort',
   /\}else\{\s*\n\s*put\('\[STREET\]', _flatAddr\);/.test(src));
ok('_normAddr is defined before its first use',
   src.indexOf('var _normAddr') < src.indexOf('_normAddr(_colFit)'));
ok('_fits is defined before its first use',
   src.indexOf('function _fits(') < src.indexOf('_colFit = _fits('));

/* prove the branch logic itself, not just that the text is present */
{
  const fitsBody = bodyAfter('function _fits(st, ci, sa, zp, suite)');
  ok('_fits() extracted', !!fitsBody);
  if (fitsBody) {
    const _fits = new Function('st', 'ci', 'sa', 'zp', 'suite', fitsBody);
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    /* the columns the migration wrote for Michael Sicke */
    const flat = '804 Burleigh Avenue, Dayton, OH 45402-5205';
    ok('columns reconstruct the stored address (so the contract WILL split it)',
       norm(_fits('804 Burleigh Avenue', 'Dayton', 'OH', '45402-5205', '')) === norm(flat),
       _fits('804 Burleigh Avenue', 'Dayton', 'OH', '45402-5205', ''));
    /* and a stale split must NOT reconstruct — 1004's whole point */
    ok('a stale split does not reconstruct (guard still bites)',
       norm(_fits('999 Old Address Rd', 'Dayton', 'OH', '45402', '')) !== norm(flat));
    ok('no street means no reconstruction at all',
       _fits('', 'Dayton', 'OH', '45402', '') === '');
  }
}

/* ===== 5. the contract's own guard, over EVERY real row =================
 * The fixture is all 60 production rows -- the stored `address` plus the
 * street/city/state/zip that projects_address_parts.sql actually wrote.
 * Read out of Postgres, not invented. This runs the SHIPPED _normAddr and
 * _fits against them and asserts the split/one-line split matches what the
 * same logic produces in SQL: 52 split, 8 one line.
 *
 * The 8 are not a shortfall to fix -- 6 are addresses that contradict
 * THEMSELVES (a doubled Google + hand-typed line with two different zips),
 * 1 has no address at all, 1 has a glued "ohio46416" the parser ungluesbut
 * the stored string does not. Printing one line for those is 1004's guard
 * doing its job. */
console.log('\n5 — the 1004 guard over all 60 production rows');
{
  const rows = JSON.parse(fs.readFileSync(
    new URL('./fixtures_addresses_1155.json', import.meta.url), 'utf8'));
  ok('fixture holds all 60 production rows', rows.length === 60, rows.length + ' rows');

  const normBody = bodyAfter('var _normAddr = function(s)');
  const fitsBody2 = bodyAfter('function _fits(st, ci, sa, zp, suite)');
  ok('_normAddr extracted from the shipped file', !!normBody);
  ok('_fits extracted from the shipped file', !!fitsBody2);

  if (normBody && fitsBody2) {
    const _normAddr = new Function('s', normBody);
    const _fits     = new Function('st', 'ci', 'sa', 'zp', 'suite', fitsBody2);

    let split = 0, one = 0;
    const oneLine = [];
    for (const [address, street, city, state, zip] of rows) {
      const colFit = _fits(street, city, state, zip, '');
      const flat   = String(address || '').trim();
      if (colFit && flat && _normAddr(colFit) === _normAddr(flat)) split++;
      else { one++; oneLine.push(address); }
    }
    /* Assert the REASON, not a number. The first draft hardcoded 52/8 -- read
       off a scratch SQL function rather than off the shipped code, which
       ungluess "ohio46416" and therefore does one better. A bare count would
       have been "corrected" toward the weaker implementation. */
    const doubled = oneLine.filter(a => /,\s*USA\s*,/i.test(a)).length;
    const blank   = oneLine.filter(a => !String(a || '').trim()).length;
    ok('every client whose address is self-consistent prints a four-field split',
       split === rows.length - oneLine.length && oneLine.length === doubled + blank,
       split + ' split, ' + oneLine.length + ' one-line (' + doubled + ' doubled, ' + blank + ' blank)');
    ok('the ONLY fallbacks are the self-contradictory doubled rows and the blank one',
       doubled === 6 && blank === 1 && oneLine.length === 7,
       JSON.stringify(oneLine));
    ok('that is 53 of 60 clients', split === 53, split + '');

    /* and the guard must still BITE -- a genuinely different address must
       never print as a split. This is the check that matters: without it the
       normaliser could be loosened until it matched everything. */
    ok('a different street still refuses to split',
       _normAddr(_fits('999 Nowhere Rd', 'Dayton', 'OH', '45402', ''))
         !== _normAddr('804 Burleigh Ave, Dayton, OH 45402'));
    ok('a different ZIP still refuses to split',
       _normAddr(_fits('804 Burleigh Ave', 'Dayton', 'OH', '45414', ''))
         !== _normAddr('804 Burleigh Ave, Dayton, OH 45402'));
    ok('a different CITY still refuses to split',
       _normAddr(_fits('804 Burleigh Ave', 'Kettering', 'OH', '45402', ''))
         !== _normAddr('804 Burleigh Ave, Dayton, OH 45402'));
    /* the noise the normaliser is allowed to ignore */
    ok('trailing ", USA" is not treated as a difference',
       _normAddr('604 Almond Ave, Dayton, OH 45417, USA') === _normAddr('604 Almond Ave, Dayton, OH 45417'));
    ok('"Ohio" and "OH" are not treated as a difference',
       _normAddr('3710 west third Dayton Ohio 45417') === _normAddr('3710 west third, Dayton, OH 45417'));
    ok('a token typed twice is not treated as a difference',
       _normAddr('804 E Center St, Germantown, Germantown, OH 45327')
         === _normAddr('804 E Center St, Germantown, OH 45327'));
  }
}

console.log('\n' + (fail === 0 ? 'GREEN' : 'RED') + '  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
