/* Build 558 gate — the left menu on every page but two.
 *
 * Runs the SAME assertions against 557 and 558 from the same script, so every
 * line is its own negative control: a claim that only passes on the new file is
 * a change, and a claim that passes on both was never the bug.
 *
 * elementFromPoint is the measure throughout — it reports what the USER can
 * click, which is the only definition of "the nav is on this page" that matters.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';

function page(file) {
  const src = fs.readFileSync(file, 'utf8');
  const styles = [];
  for (let i = 0; ;) { const a = src.indexOf('<style', i); if (a < 0) break;
    const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
    styles.push(src.slice(o + 1, b)); i = b + 8; }
  const V = {};
  for (const m of src.matchAll(/<div\s+id="([A-Za-z0-9_]*[Vv]iew)"([^>]*)>/g)) {
    const st = /style="([^"]*)"/.exec(m[2]); V[m[1]] = st ? st[1] : '';
  }
  return { styles, V };
}
const NEW = page(SC + '/app/index_v558.html');
const OLD = page('/home/user/cardinal-inspections/index.html');
const EXCEPT = ['landingView', 'editorView'];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

async function measure(browser, mk, width) {
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  const navOn = width >= 1100;
  await p.setContent(`<html><head>${mk.styles.map(s => `<style>${s}</style>`).join('')}</head>
    <body class="${navOn ? 'cr-lnav-on' : ''}" style="--lnav-top:96px;--headh:110px">
      <header class="site" style="height:96px">hdr</header>
      ${navOn ? '<div id="cr-lnav"><div class="lnav-item">Pipeline</div></div>' : ''}
      ${Object.entries(mk.V).map(([id, st]) =>
        `<div id="${id}" style="${st}"><div class="wrap"><h1 style="margin:0">${id}</h1></div></div>`).join('\n')}
    </body></html>`, { waitUntil: 'load' });
  const out = {};
  for (const id of Object.keys(mk.V)) {
    out[id] = await p.evaluate((vid) => {
      document.querySelectorAll('[id$="View"]').forEach(n => n.style.display = 'none');
      const v = document.getElementById(vid); v.style.display = 'block';
      const nav = document.getElementById('cr-lnav');
      const cs = getComputedStyle(v);
      const hit = document.elementFromPoint(110, 500);
      const h1 = v.querySelector('h1');
      const cb = h1 ? h1.getBoundingClientRect() : null;
      const nb = nav ? nav.getBoundingClientRect() : null;
      return { pos: cs.position, left: cs.left,
               navHit: !!(nav && hit && (hit.id === 'cr-lnav' || nav.contains(hit))),
               contentLeft: cb ? Math.round(cb.left) : null,
               occluded: !!(nb && cb && cb.left < nb.right) };
    }, id);
  }
  await p.close();
  return out;
}

(async () => {
  const b = await chromium.launch();
  const before = await measure(b, OLD, 1440);
  const after  = await measure(b, NEW, 1440);
  const phone  = await measure(b, NEW, 900);
  const phoneB = await measure(b, OLD, 900);

  const fixed = Object.keys(after).filter(id => after[id].pos === 'fixed');
  const flow  = Object.keys(after).filter(id => after[id].pos !== 'fixed');
  const should = fixed.filter(id => !EXCEPT.includes(id));

  console.log(`\n${Object.keys(after).length} views · ${fixed.length} fixed · ${flow.length} normal flow\n`);
  console.log('THE FOUR THAT HAD TO CHANGE');
  console.log('  view'.padEnd(26) + 'nav 557'.padEnd(10) + 'nav 558'.padEnd(10) + 'content 557 -> 558');
  for (const id of should) {
    const B = before[id], A = after[id];
    console.log('  ' + id.padEnd(24) + (B.navHit ? 'yes' : 'NO').padEnd(10) +
      (A.navHit ? 'yes' : 'NO').padEnd(10) + `x=${B.contentLeft} -> x=${A.contentLeft}` +
      (B.occluded && !A.occluded ? '   (was under the menu)' : ''));
  }
  console.log();
  for (const id of should) {
    ok(`${id}: the menu is clickable`, after[id].navHit, 'covered');
    ok(`  and its content clears the menu (x=${after[id].contentLeft})`, !after[id].occluded,
       `x=${after[id].contentLeft}`);
  }

  console.log('\nTHE TWO EXCEPTIONS — must be UNCHANGED, full screen');
  for (const id of EXCEPT) {
    ok(`${id} still takes the whole screen`, !after[id].navHit && after[id].contentLeft === before[id].contentLeft,
       `navHit=${after[id].navHit} x=${before[id].contentLeft}->${after[id].contentLeft}`);
  }

  console.log('\nTHE OTHER 24 — already worked, must not regress');
  const flowOkA = flow.filter(id => after[id].navHit).length;
  const flowOkB = flow.filter(id => before[id].navHit).length;
  ok(`all ${flow.length} normal-flow views still reach the menu (${flowOkB} -> ${flowOkA})`,
     flowOkA === flow.length && flowOkB === flow.length, `${flowOkB} -> ${flowOkA}`);
  const moved = flow.filter(id => before[id].contentLeft !== after[id].contentLeft);
  ok('none of them moved a pixel', moved.length === 0, moved.join(','));

  console.log('\nTHE PHONE AT 900px — must be byte-for-byte the old behaviour');
  const drift = Object.keys(phone).filter(id => phone[id].contentLeft !== phoneB[id].contentLeft
                                             || phone[id].left !== phoneB[id].left);
  ok(`no view moved on a phone (checked all ${Object.keys(phone).length})`, drift.length === 0, drift.join(','));
  ok('left computes to 0px there, not 238px',
     should.every(id => phone[id].left === '0px' || phone[id].left === 'auto'),
     should.map(id => id + '=' + phone[id].left).join(' '));

  console.log('\n' + '='.repeat(70) + `\n  ${pass} passed, ${fail} failed\n` + '='.repeat(70));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
