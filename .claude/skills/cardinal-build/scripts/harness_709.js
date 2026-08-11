/* Build 709 — Phase 4: the cream Community surfaces are gone; the one parity
   gap (bid.submitted_amount's display + writer) moved to the black card.

   Executes the SHIPPED bidHtml and ccDoAct (sliced by brace-match) for the
   port, and the SHIPPED renderSection for the guaranteed-no-op edit. The
   deletions are asserted against the artifact (a deletion cannot be
   "executed" — absence is the assertion), plus the observer census.

   Negative control: the 708 artifact — bid strip present, logsub absent,
   census two higher → red.

   Usage: NODE_PATH=<scratchpad>/node_modules node harness_709.js [index.html] */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../../../index.html'));
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function slice(header) {
  const at = SRC.indexOf(header);
  if (at === -1) return null;
  let i = SRC.indexOf('{', at), depth = 0;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (!depth) return SRC.slice(at, i + 1); }
  }
  return null;
}

/* ── 1 · the deletions, asserted against the artifact ── */
ok('renderBidStrip is gone', SRC.indexOf('renderBidStrip') === -1);
ok('CardinalCommunityClient is gone (zero callers existed)', SRC.indexOf('CardinalCommunityClient') === -1);
ok('no cr-bidstrip reference anywhere', SRC.indexOf('cr-bidstrip') === -1);
ok('both attach rows are gone (renderer, CSS, health, print)',
  SRC.indexOf('cr-cp-attach') === -1 && SRC.indexOf('cr-cprop-attach') === -1);
ok('ensureAttachRow exists nowhere', SRC.indexOf('function ensureAttachRow') === -1);
/* count the way CLAUDE.md's census does — grep -cE is per-LINE; a multiline
   JS regex finds two extra cross-line matches and reads as a false 44 */
const obs = SRC.split('\n').filter(l => /\)\s*\.observe\(document\.body/.test(l)).length;
ok('two body observers retired with the cream face (census 42)', obs === 42, obs);
ok('the partner module export SURVIVES', SRC.indexOf('window.CardinalCommunityPartners') !== -1);
ok('…and its tick still maintains the nav menu entry', (() => {
  const t = slice('function tick(){\ntry{\nensureMenuOption();');
  return !!t && t.indexOf('pruneMenuOption') !== -1 && t.indexOf('ensureAttachRow') === -1;
})());
ok('the properties module export SURVIVES', SRC.indexOf('window.CardinalCommunityProperties') !== -1);
ok('cr-wo-styles survives (host mode renders the same markup)',
  SRC.indexOf('<style id="cr-wo-styles">') !== -1 &&
  /cr-print-styles[\s\S]{0,600}\.cr-wo-section/.test(SRC));
/* the remaining ❄ escapes are historical CHANGELOG entries — kept by
   Theo's decision, so the check is scoped to the pill, not the file */
ok('the back pill wears the house chevron, not the snowflake',
  SRC.indexOf("'\\u2039 Back to bid view'") !== -1 &&
  SRC.indexOf("'\\u2744 Back to bid view'") === -1);

/* ── 2 · cr-wo renderSection: guaranteed no-op with no connected host ── */
const woCode = 'var lastHost = null;\n' + (slice('function renderSection(host){') || '');
ok('shipped renderSection sliced', woCode.length > 200);
let woThrew = '', woWrites = 0;
try {
  const rs = new Function('window', 'document', 'isCommunityClient', 'canSee', 'removeSection', 'signWorkOrderUrls',
    '"use strict";\n' + woCode + '\nreturn renderSection;')(
    { currentProject: { id: 'x', checklist: '{}' } },
    { querySelector: () => null, getElementById: () => null,
      createElement: () => { woWrites++; return {}; } },
    () => true, () => true, () => {}, () => {});
  rs();            /* no host ever connected → must return before building anything */
} catch (e) { woThrew = e.message; }
ok('renderSection with no host is a guaranteed no-op (no throw, nothing built)',
  woThrew === '' && woWrites === 0, 'threw=' + woThrew + ' built=' + woWrites);

/* ── 3 · the port: bidHtml's Recorded line, executed ── */
const bidCode = slice('function bidHtml(pr){');
ok('shipped bidHtml sliced', !!bidCode);
const escFn = s => String(s).replace(/[&<>"']/g,
  m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const usd = n => '$' + Number(n).toLocaleString('en-US');
function runBid(bid, est) {
  return new Function('liveEstimate', 'lead', 'homeownerOf', 'daysTo', 'bidOf', 'usd', 'esc', 'normStage', 'LABEL',
    '"use strict";\n' + bidCode + '\nreturn bidHtml;')(
    () => est, () => ({ partner_name: 'City of Kettering' }), () => 'K J', () => 3,
    () => bid, usd, escFn, s => s, { Lead: 'Bid Requested' })({ id: 'j', stage: 'Lead', address: '1 St' });
}
let h = runBid({ submitted_amount: 4200, submitted_at: '2026-08-01T00:00:00Z', awarded_amount: 3900 },
  { total: 4200, line_items: [] });
ok('Recorded line shows Submitted + date + Awarded',
  h.includes('Recorded ·') && h.includes('Submitted $4,200') && h.includes('on 2026-08-01') && h.includes('Awarded $3,900'), h.slice(h.indexOf('recline'), h.indexOf('recline') + 160));
ok('…with an Edit submitted action', h.includes('data-act="logsub"') && h.includes('Edit submitted'));
h = runBid({}, { total: 100, line_items: [] });
ok('no amounts → Log submitted offered', h.includes('No amounts recorded') && h.includes('Log submitted'));
h = runBid({ submitted_amount: 500 }, null);
ok('the line renders in the NO-ESTIMATE variant too (the strip did)',
  h.includes('Build the bid') && h.includes('Submitted $500'), h.slice(0, 120));

/* ── 4 · the writer: ccDoAct logsub, executed ── */
const ccCode = slice('async function ccDoAct(');
ok('shipped ccDoAct sliced', !!ccCode);
async function runAct(answer, bid) {
  const calls = { patches: [], audits: 0, rendered: 0 };
  const fn = new Function('bidOf', 'mergeCk', 'prompt', 'alert', 'window', 'render', 'confirm', 'lead', 'todayIso', 'ocOpen',
    '"use strict";\n' + ccCode + '\nreturn ccDoAct;')(
    () => bid,
    (pr, key, next) => { const cur = Object.assign({}, bid); Object.keys(next).forEach(k => {
      if (next[k] == null || next[k] === '') delete cur[k]; else cur[k] = next[k]; }); return cur; },
    () => answer, () => {},
    { patchProjectCk: async (pr, patch) => { calls.patches.push(patch); },
      auditLog: () => { calls.audits++; }, setStage: async () => {} },
    () => { calls.rendered++; }, () => true, () => ({}), () => '2026-08-11', () => {});
  await fn('logsub', { id: 'j' });
  return calls;
}
(async () => {
  let c = await runAct('4,750', {});
  ok('a typed amount writes bid.submitted_amount + _at through patchProjectCk',
    c.patches.length === 1 && c.patches[0].bid.submitted_amount === 4750 &&
    c.patches[0].bid.submitted_at === '2026-08-11' && c.rendered === 1,
    JSON.stringify(c.patches));
  c = await runAct('', { submitted_amount: 900, submitted_at: '2026-08-01' });
  ok('a BLANK clears both fields (the strip’s semantics)',
    c.patches.length === 1 && !('submitted_amount' in c.patches[0].bid) && !('submitted_at' in c.patches[0].bid),
    JSON.stringify(c.patches));
  c = await runAct(null, { submitted_amount: 900 });
  ok('Cancel writes nothing', c.patches.length === 0 && c.rendered === 0);
  c = await runAct('7000', { submitted_amount: 900, submitted_at: '2026-08-01' });
  ok('an edit keeps the original submitted date',
    c.patches.length === 1 && c.patches[0].bid.submitted_at === '2026-08-01', JSON.stringify(c.patches));

  console.log('\nHARNESS 709: ' + (fail ? 'RED (' + fail + ' failed)' : 'GREEN') +
    '  (' + pass + ' passed, ' + fail + ' failed)  on ' + path.basename(FILE));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
