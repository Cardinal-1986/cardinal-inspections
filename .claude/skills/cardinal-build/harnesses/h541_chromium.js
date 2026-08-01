/* Build 541 gate — the SHIPPED showTab() driven against the SHIPPED panes.
 *
 * The risk in this build is one line, and it is not in the diff:
 *
 *     ['overview',...].forEach(function(t){
 *       document.getElementById('tab-' + t).style.display = ...
 *     });
 *
 * No null guard. So the name in showTab's list and the pane in the markup have
 * to ship together — split them and EVERY showTab() call throws and tab
 * switching dies across the whole client profile. The negative control at the
 * bottom proves that is a real hazard and not a theory: it runs the new list
 * against the OLD markup and requires it to throw.
 *
 * Chromium rather than jsdom — jsdom is not installed here, and a real engine
 * is the stronger choice anyway.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const now = fs.readFileSync(SC + '/app/index_v541.html', 'utf8');
const prev = fs.readFileSync(SC + '/app/index_v540.html', 'utf8');

const fn = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && !--d) return src.slice(i, k + 1);
  }
};
const sel = (src) => {
  const a = src.indexOf('<select id="jobMenuSel"');
  return src.slice(a, src.indexOf('</select>', a) + 9);
};
/* the panes, by id, straight out of the shipped markup */
const paneIds = (src) => [...src.matchAll(/<div id="tab-([a-z-]+)"/g)].map(m => m[1]);

const SHOWTAB = fn(now, 'showTab');
console.log(`  extracted showTab (${SHOWTAB.length} chars)`);
console.log(`  panes in 541: ${paneIds(now).join(', ')}`);
console.log(`  panes in 540: ${paneIds(prev).join(', ')}`);
if (!SHOWTAB.includes("'contracts'")) throw new Error('bad capture — no contracts in showTab');

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

const pageFor = (src) => {
  const ids = paneIds(src);
  return { ids, html: `${sel(src)}${ids.map(t =>
    `<div id="tab-${t}" style="display:${t === 'overview' ? 'block' : 'none'};"></div>`).join('')}
<script>
window.refreshInspGalN = function(){};   /* showTab calls it for inspections */
window.__err = null;
try { ${SHOWTAB}; window.showTab = showTab; } catch(e){ window.__err = e.message; }
<\/script>` };
};

console.log('\nSTRUCTURE — the block MOVED, it was not copied');
const est = now.slice(now.indexOf('<div id="tab-estimates"'), now.indexOf('<div id="tab-contracts"'));
const ctr = now.slice(now.indexOf('<div id="tab-contracts"'), now.indexOf('<div id="tab-checklists"'));
ok('the + New contract button is in tab-contracts', ctr.includes('id="pNewContractBtn"'));
ok('  and its list with it', ctr.includes('id="contractDocsMount"'));
ok('  it is GONE from tab-estimates', !est.includes('pNewContractBtn') && !est.includes('contractDocsMount'));
ok('  the estimates list did not come along', est.includes('estDocsMount') && !ctr.includes('estDocsMount'));
ok('exactly one of each id in the whole file — not duplicated',
   (now.match(/id="pNewContractBtn"/g) || []).length === 1 &&
   (now.match(/id="contractDocsMount"/g) || []).length === 1);
ok('the pane has its own way back to Overview like every sibling',
   ctr.includes("showTab('overview')"));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();

  console.log('\nBEHAVIOUR — every tab, through the shipped switcher');
  const cur = pageFor(now);
  await p.setContent(cur.html, { waitUntil: 'load' });
  ok('showTab loaded without error', await p.evaluate(() => window.__err) === null,
     await p.evaluate(() => window.__err));

  for (const t of cur.ids) {
    const r = await p.evaluate((name) => {
      try { window.showTab(name); } catch (e) { return { threw: e.message }; }
      return { vis: [...document.querySelectorAll('[id^="tab-"]')]
        .filter(n => n.style.display === 'block').map(n => n.id.slice(4)) };
    }, t);
    ok(`showTab('${t}') → only tab-${t} visible`,
       !r.threw && r.vis && r.vis.length === 1 && r.vis[0] === t,
       r.threw || (r.vis || []).join(','));
  }

  const dd = await p.evaluate(() => {
    window.showTab('contracts');
    return { value: document.getElementById('jobMenuSel').value,
             hasOption: !!document.querySelector('#jobMenuSel option[value="contracts"]') };
  });
  ok('  the header dropdown follows along', dd.value === 'contracts', dd.value);
  ok('  and offers Contracts as a choice at all', dd.hasOption);

  console.log('\nNEGATIVE CONTROL — why the pane and the list had to ship together');
  const old = pageFor(prev);                     /* 540 markup: no tab-contracts */
  await p.setContent(old.html.replace(
    /try \{ function showTab[\s\S]*?window\.showTab = showTab; \}/,
    `try { ${SHOWTAB}; window.showTab = showTab; }`), { waitUntil: 'load' });
  const control = await p.evaluate(() => {
    try { window.showTab('overview'); return { threw: null }; }
    catch (e) { return { threw: e.message }; }
  });
  ok('541\'s showTab against 540\'s markup THROWS — the missing guard is real, ' +
     'so splitting this across two builds would have killed tab switching',
     !!control.threw, 'it did not throw, so this control proves nothing');
  if (control.threw) console.log('        ' + control.threw.split('\n')[0]);

  console.log('\n' + '='.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(60));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
