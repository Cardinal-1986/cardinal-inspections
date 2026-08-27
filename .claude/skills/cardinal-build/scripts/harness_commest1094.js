/* Build 1094 functional harness — the Community estimates count + tap.
 *
 * Executes the SHIPPED commBidAmount() (extracted verbatim by brace-match) and
 * the SHIPPED _commEst decision against real project shapes — not a
 * re-implementation. Then structurally verifies the tap branch. Node, no jsdom.
 *
 *   node harness_commest1094.js [index.html]
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok  = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

/* ── extract commBidAmount verbatim by brace-matching ──────────────────────── */
function extract(sig){
  const i = src.indexOf(sig);
  if (i === -1) throw new Error('not found: ' + sig);
  let d = 0, started = false, j = i;
  for (; j < src.length; j++){
    const ch = src[j];
    if (ch === '{'){ d++; started = true; }
    else if (ch === '}'){ d--; if (started && d === 0){ j++; break; } }
  }
  return src.slice(i, j);
}
const commBidSrc = extract('function commBidAmount(pr, est){');
console.log('commBidAmount extracted: ' + commBidSrc.length + ' chars');

/* ── stub parseCkAll: return pr.checklist (the shape the real one parses to) ── */
let commBidAmount;
(function(){
  // eslint-disable-next-line no-unused-vars
  const parseCkAll = function(pr){ return (pr && pr.checklist) || {}; };
  // eslint-disable-next-line no-new-func
  commBidAmount = new Function('parseCkAll',
    commBidSrc + '\nreturn commBidAmount;')(parseCkAll);
})();

/* ── the SHIPPED _commEst decision (extract its return expression) ──────────── */
const cmMatch = src.match(/var _commEst = function\(n\)\{\s*return ([^;]+);\s*\};/);
ok(!!cmMatch, '_commEst present in shipped file');
// Evaluate the real expression with injected deps, faithful to the shipped text.
const commEstExpr = cmMatch ? cmMatch[1] : 'n';
function commEst(n, pr, isCommunityClient){
  // eslint-disable-next-line no-new-func
  return new Function('n', 'pr', 'isCommunityClient', 'commBidAmount',
    'return ' + commEstExpr + ';')(n, pr, isCommunityClient, commBidAmount);
}

/* ── real project shapes ───────────────────────────────────────────────────── */
const bonita   = { id:'b', checklist:{ lead:{ bid_amount:16360, claim_type:'community' } } };         // typed $16,360
const awarded  = { id:'a', checklist:{ bid:{ awarded_amount:22000 }, lead:{ claim_type:'community' } } };
const submitted= { id:'s', checklist:{ bid:{ submitted_amount:18000 }, lead:{ claim_type:'community' } } };
const noquote  = { id:'n', checklist:{ lead:{ claim_type:'community' } } };                            // community, nothing priced
const retail   = { id:'r', checklist:{ lead:{ bid_amount:16360, claim_type:'retail' } } };             // retail w/ stray field

/* ── 1. commBidAmount reads the right rung ─────────────────────────────────── */
ok(commBidAmount(bonita, null).amt === 16360 && commBidAmount(bonita, null).src === 'typed', 'typed bid → amt 16360 src typed');
ok(commBidAmount(awarded, null).src === 'awarded' && commBidAmount(awarded, null).amt === 22000, 'awarded rung wins');
ok(commBidAmount(submitted, null).src === 'logged' && commBidAmount(submitted, null).amt === 18000, 'submitted rung');
ok(commBidAmount(noquote, null).amt === 0 && commBidAmount(noquote, null).src === 'none', 'nothing priced → amt 0');

/* ── 2. _commEst decision (isCommunityClient mocked per case) ───────────────── */
const isComm = () => true, notComm = () => false;
ok(commEst(0, bonita, isComm) === 1,    'community + typed quote + 0 builder rows → 1');
ok(commEst(0, awarded, isComm) === 1,   'community + awarded + 0 rows → 1');
ok(commEst(0, noquote, isComm) === 0,   'community + nothing priced + 0 rows → 0');
ok(commEst(2, bonita, isComm) === 2,    'community + 2 builder rows → 2 (no double count)');
ok(commEst(0, retail, notComm) === 0,   'retail (non-community) + stray bid_amount → 0 (untouched)');
ok(commEst(3, retail, notComm) === 3,   'retail + 3 rows → 3 (untouched)');

/* ── 3. tap branch: structural proof it switches THIS card's Estimate tab ───── */
const jmI = src.indexOf('jm.querySelectorAll(\'[data-jm]\').forEach(function(t){');
const jmRegion = src.slice(jmI, jmI + 2000);
ok(/if\(t\.dataset\.jm === 'estimates'\)\{/.test(jmRegion), 'tap: estimates branch present in syncJobMenu onclick');
ok(/if\(t\.dataset\.jm === 'estimates'\)\{[\s\S]*?tab = 'bid';[\s\S]*?render\(\);[\s\S]*?return;/.test(jmRegion),
   "tap: estimates branch sets tab='bid', renders, returns");
// the estimates branch must sit BEFORE the generic b.click() fallthrough
const estIdx = jmRegion.indexOf("if(t.dataset.jm === 'estimates')");
const clickIdx = jmRegion.indexOf('b.click();');
ok(estIdx !== -1 && clickIdx !== -1 && estIdx < clickIdx, 'tap: estimates branch precedes the generic b.click() fallthrough');
// the pay precedent is intact
ok(/if\(t\.dataset\.jm === 'pay'\)\{/.test(jmRegion), 'tap: pay precedent still present');

/* ── 4. main router untouched (no widening of the shared estimates nav) ─────── */
ok(src.indexOf("else if(nav === 'estimates' || nav === 'aiestimates'){ if(window.crOpenEstimates) window.crOpenEstimates(); }") !== -1,
   'main router estimates nav unchanged');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — all checks passed');
process.exit(fails ? 1 : 0);
