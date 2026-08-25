/* gate_abcorder.mjs -- the ABC placeOrder body shape.

   api/abc.js forwarded a bare object to POST /api/order/v2/orders for months.
   ABC's published example is an ARRAY of orders. Same defect class as the
   pricing body fixed at 763: a shape invented here rather than read from ABC.

   Every expectation below is taken from ABC's own verbatim example request at
   https://apidocs.abcsupply.com/place-orders/ -- asserted against THEIR
   published values, never against this file's own output.

   The functions are EXTRACTED FROM THE SHIPPED SOURCE and executed, not
   re-implemented. A gate that re-implements the thing it is testing agrees
   with itself and proves nothing.

   Usage: node gate_abcorder.mjs [path/to/abc.js]
   Control: the pre-fix api/abc.js has no orderPayload at all -- checks 1-9
   report a NAMED failure rather than throwing (BUG_CLASSES 37).
*/
import { readFile } from 'node:fs/promises';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/api/abc.js';
let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '\n          ' + detail : ''}`); }
};

/* Pull one top-level function out by brace-matching, so the gate runs the
   shipped text. Returns '' when absent -- the control's case. */
function fnText(src, name) {
  const head = src.indexOf('function ' + name + '(');
  if (head === -1) return '';
  let i = src.indexOf('{', head), depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(head, j + 1); }
  }
  return '';
}

const src = await readFile(FILE, 'utf8');

const consts = ["const DELIVERY_SERVICE = new Set(['COM','CPU','EXP','OTR','OTG','OTW','TPC']);",
                "const TYPE_CODE = new Set(['SO']);",
                "const MAX_LINES = 99;"].join('\n');
const payloadFn = fnText(src, 'orderPayload');
const problemFn = fnText(src, 'orderProblem');

/* Check 11 reads the DISPATCH, so it runs on both trees and fails the control
   on the real defect rather than merely on the builder's absence. The pre-fix
   line was:  abc('POST', '/api/order/v2/orders', b.payload || {})  -- a bare
   object, straight through, no shape and no refusal. */
const dStart = src.indexOf("case 'placeOrder'");
const dEnd = dStart === -1 ? -1 : src.indexOf("case '", dStart + 10);
const dispatch = dStart === -1 ? '' : src.slice(dStart, dEnd === -1 ? dStart + 1400 : dEnd);
const dispatchOk = /orderPayload\s*\(/.test(dispatch) &&
                   !/'\/api\/order\/v2\/orders'\s*,\s*b\.payload/.test(dispatch);

if (!payloadFn || !problemFn) {
  // The control lands here. Name it; never let a missing symbol throw.
  console.log(`gate_abcorder.mjs -> ${FILE}\n`);
  check('0. orderPayload and orderProblem exist in the shipped source', false,
        `orderPayload:${payloadFn ? 'found' : 'MISSING'} orderProblem:${problemFn ? 'found' : 'MISSING'}`);
  for (let i = 1; i <= 9; i++) check(`${i}. (not reachable without the builder)`, false, 'no builder to exercise');
  check('11. the placeOrder dispatch routes through the builder, not b.payload straight to ABC',
        dispatchOk, dispatch.split('\n')[1] || dispatch.slice(0, 120));
  console.log(`\nRED — ${pass} passed, ${fail} failed`);
  process.exit(1);
}

const build = new Function(consts + '\n' + payloadFn + '\n' + problemFn + '\nreturn orderPayload;')();

console.log(`gate_abcorder.mjs -> ${FILE}\n`);
check('0. orderPayload and orderProblem exist in the shipped source', true);

// A complete, realistic Cardinal order: Theo's real ship-to and branch.
const good = {
  branchNumber: '106',
  deliveryService: 'OTG',
  shipTo: {
    name: 'Cardinal Roofing & Renovations', number: '2153354-2',
    address: { line1: '123 Main St', city: 'Dayton', state: 'OH', postal: '45424', country: 'USA' },
  },
  items: [{ itemNumber: '11IWRRGU2', quantity: 3, uom: 'SQ', unitPrice: 76.00, description: 'Duration' }],
  requestId: 'cr-fixed-for-test',
};

const r = build(good);
check('1. a complete order is accepted', !r.error, r.error);
check('2. the body is an ARRAY of orders, not a bare object', Array.isArray(r.body),
      'got ' + Object.prototype.toString.call(r.body));

const o = (r.body || [])[0] || {};
check('3. top-level field names match ABC’s example',
      ['requestId','branchNumber','deliveryService','typeCode','currency','shipTo','lines']
        .every(k => k in o),
      'missing ' + ['requestId','branchNumber','deliveryService','typeCode','currency','shipTo','lines']
        .filter(k => !(k in o)).join(', '));
check('4. the ship-to is shipTo.number, not a top-level shipToNumber',
      o.shipTo && o.shipTo.number === '2153354-2' && !('shipToNumber' in o),
      JSON.stringify({ number: o.shipTo && o.shipTo.number, strayTopLevel: 'shipToNumber' in o }));

const ln = (o.lines || [])[0] || {};
check('5. a line carries orderedQty{value,uom} and unitPrice{value,uom}',
      ln.orderedQty && ln.orderedQty.value === 3 && ln.orderedQty.uom === 'SQ' &&
      ln.unitPrice && ln.unitPrice.value === 76 && ln.unitPrice.uom === 'SQ',
      JSON.stringify({ orderedQty: ln.orderedQty, unitPrice: ln.unitPrice }));

// ---- the refusals. Each one is money if it gets through. ----
const refuses = (label, mutate) => {
  const bad = JSON.parse(JSON.stringify(good));
  mutate(bad);
  const out = build(bad);
  return { ok: !!out.error && !out.body, why: out.error || 'ACCEPTED — no error returned' };
};

let t = refuses('', b => { delete b.deliveryService; });
check('6. refuses a missing deliveryService (delivery vs pickup has no safe default)', t.ok, t.why);

t = refuses('', b => { delete b.shipTo.address.city; });
check('7. refuses an incomplete ship-to address', t.ok, t.why);

t = refuses('', b => { b.items[0].quantity = 0; });
check('8. refuses a zero quantity', t.ok, t.why);

t = refuses('', b => { b.items = Array.from({ length: 100 }, (_, i) =>
      ({ itemNumber: 'X' + i, quantity: 1, uom: 'EA' })); });
check('9. refuses 100 lines rather than silently trimming to ABC’s 99', t.ok, t.why);
check('9b. and the refusal says to SPLIT, not that it trimmed',
      /split/i.test(t.why) && !/trim(med)?\b/i.test(t.why.replace(/rather than trimmed/, '')), t.why);

// A lone object handed in as payload must still be wrapped in an array.
const wrapped = build({ payload: { ...good, shipTo: good.shipTo, lines: [ { id:'1', itemNumber:'X', orderedQty:{value:1,uom:'EA'} } ], typeCode:'SO', currency:'USD' } });
check('10. a hand-supplied lone order object is wrapped into an array',
      Array.isArray(wrapped.body) && wrapped.body.length === 1, wrapped.error || JSON.stringify(wrapped.body));

check('11. the placeOrder dispatch routes through the builder, not b.payload straight to ABC',
      dispatchOk, dispatch.slice(0, 160));

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
