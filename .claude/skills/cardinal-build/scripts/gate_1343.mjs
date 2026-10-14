// Build 1343 — a rename never changes a document's kind; an uploaded estimate's amount can be corrected.
// Runs the SHIPPED crKeepDocKind and isEstimateTitle. Usage: node gate_1343.mjs [index.html] (1342 = RED)
import fs from 'fs';
const s = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); else console.log('  ok  ' + m); };
function fn(name) {
  const i = s.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}' && --d === 0) return s.slice(i, k + 1); }
}
const src = fn('crKeepDocKind'), est = fn('isEstimateTitle');
ok(!!src, 'crKeepDocKind is defined');
if (src && est) {
  const rows = [
    { id: 'c', title: 'Contract — Handwritten agreement — Client' },
    { id: 'e', title: 'EST-2026-0910 — Estimate — Client' },
    { id: 'i', title: 'Invoice — Client' },
    { id: 'o', title: 'Change Order — Client' },
    { id: 'f', title: 'File: notes.pdf' },
  ];
  const K = new Function('cacheRows', est + '\n' + src + '\nreturn crKeepDocKind;')(rows);
  ok(K('c', 'Client Exterior Contract') === 'Contract — Client Exterior Contract', 'a contract renamed without "Contract" first stays a contract');
  ok(K('c', 'Contract — Exterior — Client') === 'Contract — Exterior — Client', 'a rename that keeps the word is left alone');
  ok(new Function(est + '; return isEstimateTitle;')()(K('e', 'Roof Repair for Client')), 'an estimate stays an estimate (number kept)');
  ok(K('e', 'Roof Repair for Client').startsWith('EST-2026-0910 — '), 'the estimate number survives the rename');
  ok(/^invoice/i.test(K('i', 'Final bill')), 'an invoice stays an invoice');
  ok(/^change order/i.test(K('o', 'Extra plywood')), 'a change order stays a change order');
  ok(K('f', 'File: renamed.pdf') === 'File: renamed.pdf', 'a plain file is untouched');
  ok(K('missing', 'Anything') === 'Anything', 'an unknown row is untouched');
}
const u = s.indexOf("fields.title = crKeepDocKind(id, fields.title)");
ok(u > 0 && s.slice(u - 900, u).includes("update: async function(id, fields){") && s.slice(u, u + 400).includes('869: no signal'),
   'the documents db.update applies it before any write');
const ed = fn('editEstimateFromDoc') || '';
ok(/hasAttribute\('data-cr-upload'\)/.test(ed) && ed.indexOf("data-cr-upload") < ed.indexOf('No live estimate'),
   'Edit estimate handles an uploaded estimate before the "no live estimate" message');
ok(/db\.update\(cur\.id, \{ total:/.test(ed), 'it saves the corrected amount as the document total');
if (fails.length) { console.log('GATE 1343 RED — ' + fails.length + ' failing'); fails.forEach(m => console.log('  FAIL ' + m)); process.exit(1); }
console.log('GATE 1343 GREEN');
