/* gate_1444 — the insurance side is called Insurance (Theo's pick for question C, 2 Nov 2026).
 *
 *   A  the menu row that opens the insurance portal reads "Insurance" (desktop, where the
 *      CRMs section is open), and no visible menu row says Cardinal Truth
 *   B  the insurance home screen's heading is "Insurance" and no visible text on it says
 *      Cardinal Truth; its Back button is "Back to Insurance"
 *   C  the Brief (tap the header title) names the row Insurance, not Cardinal Truth
 *   D  the Clients directory's portal chips and columns say Insurance, never Claims (1440 wide)
 *   E  source: the quick-jump palette, Self Check and the portal picker carry the new name;
 *      the Claims pill that opens the claims LIST keeps its own name
 *
 *   NODE_OPTIONS="--require .../block_supa.cjs" node gate_1444.mjs [artifact]
 * Default artifact: the repo index.html. On build 1443 this gate must go RED.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || resolve(HERE, '../../../../index.html'));
process.env.APPFILE = FILE;
const L = await import(resolve(HERE, 'gate_1403_lib.mjs'));
const HTML = readFileSync(FILE, 'utf8');
setTimeout(() => { console.log('  ✗ FAIL gate timed out'); process.exit(1); }, 600000);

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 240) : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEED = "try{localStorage.setItem('cardinal.theme.rb','0');localStorage.setItem('cr-push-nudge-dismissed','1');}catch(e){}";
console.log('gate_1444 on ' + FILE);

/* visible text of an element, only from nodes that actually render */
const VIS = `(root) => { const out = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { const e = n.parentElement; if (!e || !e.getClientRects().length) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue; out.push(n.nodeValue); }
  return out.join(' ').replace(/\\s+/g, ' '); }`;

const B = await L.boot('theo', { instr: false, desktop: true, seed: SEED });
const page = B.page;
const E = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String(e.message).split('\n')[0] }));
await sleep(1500);

console.log('\nA  the menu');
{ const r = await E(() => { const o = document.querySelector('#navMenu .navopt[data-nav="cardinaltruth"]');
    const rows = [...document.querySelectorAll('#navMenu .navopt')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
    return { row: o ? o.textContent.replace(/\s+/g, ' ').trim() : null, old: rows.filter(t => /Cardinal Truth|Cardinal Claims/.test(t)) }; });
  ok(r.row === 'Insurance', 'A  the insurance portal row reads "Insurance"', r.row);
  ok(Array.isArray(r.old) && r.old.length === 0, 'A  no menu row says Cardinal Truth', r.old);
  const rail = await E(() => [...document.querySelectorAll('#cr-lnav *')].filter(e => !e.children.length && /Cardinal Truth/.test(e.textContent)).length);
  ok(rail === 0, 'A  the desktop rail says Cardinal Truth nowhere', rail);
}

console.log('\nB  the insurance home screen');
await E(() => window.showCardinalTruth && window.showCardinalTruth()); await sleep(1800);
{ const r = await E(new Function('return (' + `() => { const v = document.getElementById('cardinalTruthView'); const h = v && v.querySelector('h1.ins-h1');
    const vis = (${VIS})(v); const back = document.getElementById('icBackBtn');
    return { shown: !!(v && v.getClientRects().length), h1: h ? h.textContent.trim() : null, old: /Cardinal Truth/.test(vis), back: back ? back.getAttribute('aria-label') : null }; }` + ')')());
  ok(r.shown, 'B  the insurance home screen opens', r);
  /* the live hub renders its own dashboard (.cr-cth) over the original .ins-body, so the markup
     heading is read from source; the visible check below covers what actually paints */
  ok(/<h1 class="ins-h1">Insurance<\/h1>/.test(HTML) && !/<h1 class="ins-h1">Cardinal Truth/.test(HTML), 'B  its heading is "Insurance"');
  ok(r.old === false, 'B  no visible text on it says Cardinal Truth', r);
  ok(r.back === 'Back to Insurance', 'B  the Insurance Clients Back button is "Back to Insurance"', r.back);
}

console.log('\nC  the Brief');
await E(() => { const t = document.getElementById('brandTitle'); if (t) t.click(); }); await sleep(1200);
{ const r = await E(new Function('return (' + `() => { const fd = document.getElementById('cr-fd'); if (!fd) return { none: true };
    const vis = (${VIS})(fd); const rows = [...fd.querySelectorAll('.fdrow')].map(e => e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40));
    return { open: !!fd.getClientRects().length, ins: /\\bInsurance\\b/.test(vis), old: /Cardinal Truth/.test(vis), rows }; }` + ')')());
  ok(r.open && r.ins && r.old === false, 'C  the Brief names the row Insurance, not Cardinal Truth', r);
}
await E(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }); await sleep(500);

console.log('\nD  the Clients directory (1440 wide)');
await E(() => { if (window.showClientsView) window.showClientsView(); }); await sleep(1800);
{ const r = await E(() => { const v = document.getElementById('clientsView') || document.body;
    const chips = [...document.querySelectorAll('#cdCrmBar .cd-crmchip')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
    const heads = [...document.querySelectorAll('.cd-crmsec-h, .cd-fsec, .cd-ssec')].filter(e => e.getClientRects().length).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30));
    return { chips, heads }; });
  ok(Array.isArray(r.chips) && r.chips.some(t => /^Insurance\b/.test(t)), 'D  a portal chip reads Insurance', r.chips);
  ok(Array.isArray(r.chips) && !r.chips.some(t => /^Claims\b/.test(t)), 'D  no portal chip reads Claims', r.chips);
  ok(Array.isArray(r.heads) && !r.heads.some(t => /^Claims\b/.test(t)), 'D  no column or filter heading reads Claims', r.heads);
}
await B.browser?.close?.();

console.log('\nE  source');
ok(/label:'Insurance',\s+section:'Views'/.test(HTML) && !/label:'Cardinal Truth'/.test(HTML), 'E  the quick-jump palette lists Insurance');
ok(/\{ name:'Insurance', open:function\(\)\{\s*if\(typeof window\.showCardinalTruth/.test(HTML) && !/name:'Cardinal Claims'/.test(HTML), 'E  Self Check names the insurance step Insurance');
ok(/'Insurance portal'\]/.test(HTML) && !/'Cardinal Truth portal'/.test(HTML), 'E  Self Check names the Front Door control "Insurance portal"');
ok(!/Cardinal Truth lives here/.test(HTML), 'E  the portal picker’s description no longer names Cardinal Truth');
ok(/\{ go:'claims', label:'Claims' \}/.test(HTML), 'E  the Claims pill that opens the claims list keeps its name');
ok(/key:'insurance', label:'Insurance'/.test(HTML), 'E  the Clients directory label table says Insurance');

const FLOOR = 15;
const total = passes + fails.length;
if (total < FLOOR) { console.log(`  ✗ FAIL only ${total} checks ran (floor ${FLOOR})`); fails.push('floor'); }
console.log(`\n${fails.length ? 'GATE 1444 RED' : 'GATE 1444 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
