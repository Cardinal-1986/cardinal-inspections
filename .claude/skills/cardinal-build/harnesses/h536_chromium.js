/* Build 536 gate + preview. Source lnav rules and the new A block are BOTH in
 * the page, so every assertion answers "which rule won" — the 481 lesson.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v536.html', 'utf8');

const block = (id) => {
  const a = src.indexOf('<style id="' + id + '">');
  return src.slice(a, src.indexOf('</style>', a) + 8);
};
const lnav = block('cr-lnav-styles');   // the source rules
const A = block('cr-lnav-a-styles');    // the override
if (!lnav.includes('.lnav-item.on') || !A.includes('.lnav-item.on')) throw new Error('bad capture');

const MENU = [['DAILY', [['Landing'], ['Clients'], ['Import from AccuLynx'], ['Leads & Jobs', 6],
                         ['Production', 4], ['Schedule Board']]],
              ['SELL', [['Sales Floor'], ['Quick Inspection'], ['Inspections', 4], ['Estimates', 2]]],
              ['CRMS', [['Cardinal Truth'], ['Community Hub', 7]]]];

const nav = () => `<nav id="cr-lnav">
  <div class="lnav-crm"><button class="on">Retail</button><button>Insurance</button><button>Community</button></div>
  ${MENU.map(([s, items]) => `<button class="lnav-sec"><span class="chev">▾</span>${s}<span class="cnt">${items.length}</span></button>
  <div class="lnav-body">${items.map(([t, c], i) =>
    `<button class="lnav-item${s === 'DAILY' && i === 3 ? ' on' : ''}">${t}${c ? `<span class="cnt" style="margin-left:auto">${c}</span>` : ''}</button>`).join('')}</div>`).join('')}
</nav>`;

/* block() returns the captured <style>…</style> INCLUDING its tags, so these
   must NOT be nested inside another <style> — the first inner </style> closes
   the outer one and everything after it renders as visible text. Caught by the
   screenshot; the assertions had passed anyway because the captured blocks are
   valid style elements in their own right. */
const page = `<style>
:root{--lnav-w:238px;--lnav-top:0px;--lnav-crmc:#c8202e;--rbe-ink:#cfd6df;--rbe-head:#fff;
      --rbe-mute:#9aa0a8;--rbe-mute2:#6d747e;--rbe-line:#232329;--rbe-panel:#16161B;
      --rbe-panelbd:#24242c;--rbe-railbg:#0E0E12}
</style>
${lnav}
${A}
<style>
#cr-lnav{position:relative !important;top:0 !important;bottom:auto !important;height:520px}
body{margin:0;display:flex;gap:0}
.pg{padding:22px 26px;flex:1;font:600 12px 'Segoe UI',Arial,sans-serif}
</style>
<div id="lt" style="display:flex;background:#eceef0">${nav()}<div class="pg" style="color:#6b6b6b">LIGHT — carved channel, white card in the well</div></div>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 2 });
  let pass = 0, fail = 0;
  const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                              : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
  const g = (s, k) => p.evaluate(([ss, kk]) => {
    const e = document.querySelector(ss); return e ? getComputedStyle(e)[kk] : null; }, [s, k]);

  // ── LIGHT ────────────────────────────────────────────────────────────────
  await p.setContent(page, { waitUntil: 'load' });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
  await p.waitForTimeout(140);
  console.log('\nLIGHT — shadow-led well');
  const lsh = await g('#cr-lnav', 'boxShadow');
  ok('nav is recessed (inset shadow beats the source rule)', lsh.includes('inset'), lsh);
  ok('  ground is the grey channel, not the dark rail',
     await g('#cr-lnav', 'backgroundColor') === 'rgb(242, 243, 245)', await g('#cr-lnav', 'backgroundColor'));
  ok('section header is a banded strip', (await g('.lnav-sec', 'boxShadow')).includes('inset'));
  ok('active row is a WHITE card in the well',
     await g('.lnav-item.on', 'backgroundColor') === 'rgb(255, 255, 255)',
     await g('.lnav-item.on', 'backgroundColor'));
  ok('  with the cardinal bar and a lift',
     /200, 32, 46/.test(await g('.lnav-item.on', 'boxShadow')), await g('.lnav-item.on', 'boxShadow'));
  await p.screenshot({ path: SC + '/lnav536-light.png', fullPage: true });

  // ── DARK ─────────────────────────────────────────────────────────────────
  await p.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('lt').style.background = '#09090C';
    document.querySelector('.pg').style.color = '#7d8695';
    document.querySelector('.pg').textContent = 'DARK — carved channel, navy card in the well';
  });
  await p.waitForTimeout(140);
  console.log('\nDARK — highlight-led well (designed, not recoloured)');
  const dsh = await g('#cr-lnav', 'boxShadow');
  ok('nav is recessed', dsh.includes('inset'), dsh);
  ok('  ground is 535\'s well colour #0A0E16',
     await g('#cr-lnav', 'backgroundColor') === 'rgb(10, 14, 22)', await g('#cr-lnav', 'backgroundColor'));
  ok('  the inner catch is a LIGHT edge, not a white one copied from light mode',
     dsh.includes('255, 255, 255, 0.055'), dsh);
  ok('  and it differs from the light rule — not a recolour', dsh !== lsh);
  ok('active row is a NAVY card, not a red wash',
     !(await g('.lnav-item.on', 'backgroundColor')).includes('200, 32, 46'),
     await g('.lnav-item.on', 'backgroundColor'));
  ok('  still carries the cardinal bar',
     /200, 32, 46/.test(await g('.lnav-item.on', 'boxShadow')));
  ok('section band is navy, not grey', (await g('.lnav-sec', 'boxShadow')).includes('inset'));
  await p.screenshot({ path: SC + '/lnav536-dark.png', fullPage: true });

  console.log('\n' + '='.repeat(52) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(52));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
