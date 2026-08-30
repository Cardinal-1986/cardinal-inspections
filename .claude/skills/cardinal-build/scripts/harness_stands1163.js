/* Build 1163 — the morning strip counts Community, and shares its resolver.
   Extracts the SHIPPED functions (never a re-implementation) and runs them
   against production data shapes. Coverage floor: a check that stops matching
   must go red, not quiet. Takes an optional path arg → negative control. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '../../../..', 'index.html');
const src = fs.readFileSync(file, 'utf8');
let pass = 0, fail = 0;
function ok(cond, msg){ if(cond){ pass++; } else { fail++; console.log('  ✗ ' + msg); } }
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

function block(id){
  const a = src.indexOf('<script id="' + id + '">');
  if(a < 0) return null;
  return src.slice(a, src.indexOf('</script>', a));
}
function fn(text, name){
  const i = text.indexOf('function ' + name + '(');
  if(i < 0) return null;
  let d = 0, j = text.indexOf('{', i);
  for(let k = j; k < text.length; k++){
    if(text[k] === '{') d++;
    else if(text[k] === '}' && --d === 0) return text.slice(i, k + 1);
  }
  return null;
}

/* ── the ch2 resolver, executed against real shapes ── */
const ch2 = block('cr-ch2-script');
ok(!!ch2, 'cr-ch2-script block found');
const pieces = ['ck','lead','days','chDueIso','chOnHold','chWaiting','projects','chDueBidsCount']
  .map(n => ch2 && fn(ch2, n));
ok(pieces.every(Boolean), 'all 8 resolver functions extracted (got ' + pieces.filter(Boolean).length + ')');
console.log('  extracted chars:', pieces.filter(Boolean).reduce((s,t)=>s+t.length,0));

const DAY = 86400000, now = Date.now();
const iso = d => new Date(now + d * DAY).toISOString().slice(0, 10);
function proj(stage, leadObj, crm){
  return { stage, checklist: JSON.stringify({ lead: Object.assign({ claim_type: crm || 'community' }, leadObj || {}) }) };
}
const rows = [
  proj('Lead',     { bid_due_at: iso(-34) }),                              // overdue → COUNTS
  proj('Lead',     { bid_due_at: iso(-20) }),                              // overdue → COUNTS
  proj('Lead',     { bid_due_at: iso(5) }),                                // future → no
  proj('Lead',     {}),                                                    // no date → no
  proj('OnHold',   { bid_due_at: iso(-300), check_back_at: iso(-3) }),     // parked, check-back past → COUNTS
  proj('OnHold',   { bid_due_at: iso(-300), check_back_at: iso(30) }),     // parked, check-back future → no (the second clock)
  proj('Lead',     { bid_due_at: iso(-10), waitlist_at: iso(-40) }),       // waitlisted → no bid → no
  proj('Prospect', { bid_due_at: iso(-10) }),                              // submitted → no
  proj('Lead',     { bid_due_at: iso(-10) }, 'retail'),                    // not community → no
];
const sandbox = {
  window: {
    cacheProjects: rows,
    projClaimType: pr => { try { return JSON.parse(pr.checklist).lead.claim_type; } catch(_) { return 'unknown'; } },
    /* the shipped ck() delegates to window.parseCkAll — the checklist column is
       a JSON string in production, and this is the global that parses it. The
       first run of this harness omitted it and failed CORRECT code. */
    parseCkAll: pr => { try { return JSON.parse(pr.checklist) || {}; } catch(_) { return {}; } },
  },
  normStage: s => ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'].indexOf(s) !== -1 ? s : 'Lead',
  JSON, Date, Number, String, Math, console,
};
vm.createContext(sandbox);
if(pieces.every(Boolean)){
  vm.runInContext(pieces.join('\n'), sandbox);
  const got = vm.runInContext('chDueBidsCount()', sandbox);
  ok(got === 3, 'dueBids = 3 on the mixed set (got ' + got + ')');
  ok(vm.runInContext('chOnHold(window.cacheProjects[4])', sandbox) === true, 'parked-with-check-back recognised');
  ok(vm.runInContext('days(chDueIso(window.cacheProjects[5]))', sandbox) > 0, 'second clock: future check-back outranks ancient bid_due_at');
  ok(vm.runInContext('chWaiting(window.cacheProjects[6])', sandbox) === true, 'waitlist excluded via chWaiting');
  sandbox.window.cacheProjects = [];
  ok(vm.runInContext('chDueBidsCount()', sandbox) === 0, 'empty cache → 0, no throw');
  sandbox.window.projClaimType = undefined;
  ok(vm.runInContext('chDueBidsCount()', sandbox) === 0, 'missing projClaimType → 0, no throw');
} else { fail += 6; }

/* ── the morning strip, executed with a mocked hub ── */
const mo = block('cr-morning-script') || (() => {
  const a = src.indexOf("window.renderMorningStrip");
  if(a < 0) return null;
  const b = src.lastIndexOf('<script', a);
  return src.slice(b, src.indexOf('</script>', a));
})();
ok(!!mo, 'morning-strip block found');
const mfn = ['n', 'todayKey', 'counts'].map(nm => mo && fn(mo, nm));
ok(mfn.every(Boolean), 'n/todayKey/counts extracted');
const sb2 = { window: {
    CardinalCommunityHub: { dueBids: () => 3 },
    CardinalTruthHome: { chase: () => [1] },
    CardinalPunch: { rows: () => [{status:'open',priority:'high'}] },
    crApprovalsPending: () => [1,2],
    CardinalProduction: { schedFor: () => true },
    cacheProjects: [], cacheAppts: [],
  }, Array, Number, Date, Math, console };
vm.createContext(sb2);
if(mfn.every(Boolean)){
  vm.runInContext(mfn.join('\n'), sb2);
  const c = vm.runInContext('counts()', sb2);
  ok(c.bids === 3, 'counts().bids reads CardinalCommunityHub.dueBids (got ' + c.bids + ')');
  ok(c.chase === 1 && c.appr === 2, 'existing resolvers untouched (chase=' + c.chase + ' appr=' + c.appr + ')');
  sb2.window.CardinalCommunityHub = undefined;
  ok(vm.runInContext('counts()', sb2).bids === 0, 'hub missing → bids 0, no throw');
} else { fail += 3; }

/* ── structural: render, zero-guard, door, export — CODE, not comments ── */
ok(mo && mo.includes("!c.appr && !c.date && !c.punch && !c.chase && !c.bids && !c.today"),
   'zero-guard includes bids (the strip cannot hide while bids are overdue)');
ok(mo && mo.includes("chip('hot',  c.bids,"), 'bids chip renders hot');
ok(mo && /a === 'bids'.+CardinalCommunityHub.+\.show\(\)/.test(mo), 'bids chip is a DOOR to the hub');
ok(mo && mo.includes("window.CardinalStands = Object.assign(window.CardinalStands || {}, { counts: counts })"),
   'CardinalStands.counts exported via Object.assign');
ok(ch2 && /dueBids\s*:\s*chDueBidsCount,/.test(ch2), 'hub export carries dueBids');

const TOTAL = pass + fail;
ok(TOTAL >= 18, 'coverage floor: ' + TOTAL + ' checks ran (need ≥ 18)');
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
