/* Build 1099 structural harness — the wiring the render can't see.
 * Proves the preview show/hide-subtotals toggle is WIRED (not a dead control),
 * the banner rule was refined IN PLACE (no stacked override), the zebra parity
 * is threaded, and the acceptance card replaced the bare sign block.
 *
 *   node harness_estdoc1099.js [index.html]
 *
 * Negative control: point it at the 1098 tree — the 1099 wiring asserts go RED.
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const src = fs.readFileSync(path, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

function braceExtract(sig){
  const i = src.indexOf(sig); if (i === -1) return '';
  let d = 0, started = false, j = i;
  for (; j < src.length; j++){ const ch = src[j];
    if (ch === '{'){ d++; started = true; } else if (ch === '}'){ d--; if (started && d === 0){ j++; break; } } }
  return src.slice(i, j);
}

/* ── 1. the preview toggle is present AND wired ─────────────────────────────── */
ok(src.indexOf('<button data-act="pv-subs" type="button">Hide subtotals</button>') !== -1,
   'the "Hide subtotals" button is in the preview toolbar');
const ensure = braceExtract('function ensurePreview(){');
ok(/_subsBtn\.onclick = function\(\)\{[\s\S]{0,260}classList\.toggle\('hide-subs'\)/.test(ensure),
   'the toggle is wired — it flips the hide-subs class on the preview document');
ok(/textContent = hid \? 'Show subtotals' : 'Hide subtotals'/.test(ensure),
   'the button label reflects state (Hide/Show)');
const openp = braceExtract('async function openPreview(){');
ok(/_sb\.style\.display = \(html\.indexOf\('class="sec-sub"'\) !== -1\)/.test(openp),
   'openPreview hides the toggle when the quote has no per-section subtotals');
ok(/_sb\.textContent = 'Hide subtotals'/.test(openp),
   'openPreview resets the toggle label on each open');

/* ── 2. buildDocHtml carries the hide-subs + 1099 CSS ───────────────────────── */
const doc = braceExtract('function buildDocHtml(est, project, urls){');
ok(doc.indexOf('body.hide-subs table.items tr.sec-sub{display:none}') !== -1,
   'hide-subs CSS hides per-section subtotals in the document');
ok(doc.indexOf('table.items tr.zeb td{background:#f7f6f3}') !== -1, 'zebra CSS present (item rows)');
ok(doc.indexOf('table.items tfoot{break-inside:avoid}') !== -1, 'totals block is kept together on print');
ok(doc.indexOf('table.items tr.sec-banner{break-after:avoid}') !== -1, 'a banner never orphans from its first row');
ok(/h2\.sec\{[^}]*break-after:avoid\}/.test(doc), 'section headings keep with their content on print');

/* ── 3. the banner rule was REFINED IN PLACE — not stacked (accumulation) ────── */
const bannerRules = (doc.match(/table\.items tr\.sec-banner td\{/g) || []).length;
ok(bannerRules === 1, 'exactly ONE tr.sec-banner td rule (refined in place, no override stacked): ' + bannerRules);
ok(/table\.items tr\.sec-banner td\{background:#f3efe8;border-top:2px solid var\(--red\);border-left:3px solid var\(--red\)/.test(doc),
   'the banner rule itself carries the red left accent + deeper tint');

/* ── 4. zebra parity is threaded through the section builder ─────────────────── */
ok(/function rowFor\(l, zi\)\{/.test(doc), 'rowFor takes a zebra index');
ok(doc.indexOf("var _cls = 'avoid-break' + (zi % 2 === 1 ? ' zeb' : '');") !== -1, 'rowFor computes the zebra class');
ok(/var _zeb = 0;\s*\n\s*var itemRows = docGroups\.map/.test(doc), 'a continuous zebra counter precedes the section map');
ok(/g\.lines\.map\(function\(l\)\{ return rowFor\(l, _zeb\+\+\); \}\)/.test(doc), 'each line is handed the next parity');
ok((doc.match(/'<tr class="' \+ _cls \+ '">/g) || []).length === 3, 'all three rowFor returns use the computed class (3)');

/* ── 5. the acceptance card replaced the bare sign block ─────────────────────── */
ok(doc.indexOf("var acceptBlock =") !== -1, 'acceptBlock is built');
ok(/acRecap \+= '<div class="ac-cell hi">[\s\S]{0,120}Deposit Due at Signing/.test(doc),
   'the recap adds the deposit + balance cells only when a deposit exists');
ok(doc.indexOf('<div class="ac-hd">Acceptance &amp; Authorization</div>') !== -1, 'card heading present');
ok(doc.indexOf("'<div class=\"sign avoid-break\">' +") === -1, 'the old bare sign block is gone from the builder');
ok(/'<div class="accept-card avoid-break">' \+/.test(doc), 'the return renders the acceptance card');
ok(/\.ac-cell \.ac-k\{[^}]*color:var\(--muted\)/.test(doc),
   'acceptance labels use --muted (>=4.5:1 on white), not the sub-floor --faint');

console.log(fails ? ('\nHARNESS RED — ' + fails + ' failure(s)') : '\nHARNESS GREEN — toggle wired, banner refined in place, zebra threaded, card in');
process.exit(fails ? 1 : 0);
