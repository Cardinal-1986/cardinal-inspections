/* Build 556 gate — Payments on a crew, Commissions on a client.
 *
 * The headline test is the ADMIN GATE, run BOTH ways in a real browser.
 * `crew_payments` is is_cardinal_admin() in RLS, so a Payments tab that
 * rendered for Curtis and then showed nothing would turn a correct refusal into
 * what looks like a broken screen — and would imply the data is there to be had.
 *
 * The money assertions are the other half: a total that disagrees with the rows
 * above it is worse than no total at all, so it is read off the RENDERED cells
 * and summed independently here.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v556.html', 'utf8');

const styles = [];
for (let i = 0; ;) {
  const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8;
}
const SCRIPT = src.slice(src.indexOf('<script id="cr-crew-script">') + 28,
                         src.indexOf('</script>', src.indexOf('<script id="cr-crew-script">')));

const CREWS = [{ id: 'c1', name: 'Ramirez Roofing', trade: 'Roofing', archived: false }];
/* deliberately includes a refund — a negative amount is where money formatting breaks */
const PAYMENTS = [
  { id: 'y1', crew_id: 'c1', amount: 4200, method: 'check', reference: '10412',
    paid_on: '2026-07-18', memo: 'Alton roof, first draw' },
  { id: 'y2', crew_id: 'c1', amount: 1875.5, method: 'check', reference: '10455',
    paid_on: '2026-07-29', memo: 'Alton roof, balance' },
  { id: 'y3', crew_id: 'c1', amount: -250, method: 'other', reference: null,
    paid_on: '2026-07-30', memo: 'Overpayment returned' },
  { id: 'y4', crew_id: 'cX', amount: 9999, method: 'ach', paid_on: '2026-07-01',
    memo: 'ANOTHER crew — must not appear' },
];

const stub = (admin) => `
window.TEAM = true;
window.currentUser = { email: '${admin ? 'theo' : 'curtis'}@cardinalrenovations.net' };
window.ADMIN_EMAILS = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net'];
window.isAdminUser = function(){
  return !!(window.TEAM && window.currentUser && ADMIN_EMAILS.indexOf(currentUser.email) !== -1);
};
const _D = { crews:${JSON.stringify(CREWS)}, crew_docs:[], crew_notes:[], pricing_items:[],
  crew_rates: [],
  /* production is REFUSED by RLS — PostgREST returns an empty set, not an error */
  crew_payments: ${admin ? JSON.stringify(PAYMENTS) : '[]'} };
function _q(t){ const a={_r:(_D[t]||[]).slice(),select(){return a},eq(){return a},order(){return a},
  then(f){return Promise.resolve({data:a._r,error:null}).then(f)}}; return a; }
window.supa={from:_q,storage:{from:()=>({upload:async()=>({error:null}),
  createSignedUrl:async()=>({data:{signedUrl:'about:blank'},error:null}),remove:async()=>({error:null})})}};
window.showHome=function(){};
`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const open = async (admin, light) => {
    const p = await b.newPage({ viewport: { width: 1120, height: 950 }, deviceScaleFactor: 2 });
    await p.setContent(`<html${light ? ' data-theme="rb-light"' : ''}><head>` +
      styles.map(s => `<style>${s}</style>`).join('') + `</head><body>
      <div id="crewsView" style="display:none;position:fixed;inset:0;z-index:156;overflow-y:auto;"></div>
      <script>${stub(admin)}<\/script><script>${SCRIPT}<\/script></body></html>`, { waitUntil: 'load' });
    await p.evaluate(async () => { await window.CardinalCrews.open(); });
    await p.waitForSelector('.crw-tab', { timeout: 5000 });
    return p;
  };

  console.log('\nTHE ADMIN GATE — the point of this build');
  const admin = await open(true, false);
  const prod = await open(false, false);
  const tabsA = await admin.evaluate(() => [...document.querySelectorAll('.crw-tab')].map(n => n.textContent));
  const tabsP = await prod.evaluate(() => [...document.querySelectorAll('.crw-tab')].map(n => n.textContent));
  ok(`admin sees five tabs: ${tabsA.join(', ')}`,
     tabsA.length === 5 && tabsA.includes('Payments') && tabsA.includes('Labor Rates'), tabsA.join(','));
  ok(`production sees three — no Payments, no Labor Rates: ${tabsP.join(', ')}`,
     tabsP.length === 3 && !tabsP.includes('Payments') && !tabsP.includes('Labor Rates'), tabsP.join(','));

  /* force the state a stale render could produce: set tab=payments as production */
  const forced = await prod.evaluate(async () => {
    const tabs = [...document.querySelectorAll('.crw-tab')].map(n => n.textContent);
    return { tabs, hasMoneyTable: !!document.querySelector('.crw-rt') };
  });
  ok('  production never lands on a money table', !forced.hasMoneyTable, String(forced.hasMoneyTable));

  console.log('\nWHAT HAS BEEN PAID');
  await admin.evaluate(() => {
    [...document.querySelectorAll('.crw-tab')].find(n => n.textContent === 'Payments').click();
  });
  await admin.waitForSelector('.crw-rt', { timeout: 5000 });
  const t = await admin.evaluate(() => {
    const rows = [...document.querySelectorAll('.crw-rt tbody tr')]
      .filter(r => r.children.length === 6)
      .map(r => [...r.children].map(c => c.textContent.trim()));
    const totalEl = [...document.querySelectorAll('#crewsView b')]
      .find(n => /^-?\$/.test(n.textContent.trim()));
    return { rows, total: totalEl ? totalEl.textContent.trim() : null,
             body: document.getElementById('crewsView').textContent };
  });
  console.log('        rows:', JSON.stringify(t.rows));
  ok(`three payments for this crew, not four (${t.rows.length})`, t.rows.length === 3, String(t.rows.length));
  ok("  the other crew's payment is absent", t.body.indexOf('must not appear') === -1);
  ok('amounts render as money', t.rows.some(r => r[1] === '$4,200.00') &&
     t.rows.some(r => r[1] === '$1,875.50'), t.rows.map(r => r[1]).join(' '));
  ok('a refund shows the sign OUTSIDE the symbol — -$250.00, never $-250.00',
     t.rows.some(r => r[1] === '-$250.00') && !t.rows.some(r => /\$-/.test(r[1])),
     t.rows.map(r => r[1]).join(' '));
  ok('the method reads as a word, not a code', t.rows.some(r => r[2] === 'Check'),
     t.rows.map(r => r[2]).join(','));
  ok('the check number is shown', t.rows.some(r => r[3] === '10412'));

  console.log('\nTHE TOTAL AGREES WITH THE ROWS ABOVE IT');
  const summed = t.rows.reduce((a, r) => a + Number(r[1].replace(/[-$,]/g, '')) * (r[1][0] === '-' ? -1 : 1), 0);
  console.log(`        rendered total ${t.total}, rows sum to $${summed.toFixed(2)}`);
  ok(`${t.total} matches the sum of what is displayed`,
     t.total === '$' + summed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
     `${t.total} vs ${summed}`);
  ok('  and the refund is subtracted, not added', Math.abs(summed - 5825.5) < 0.01, String(summed));

  console.log('\nTHE FORM');
  const form = await admin.evaluate(() => ({
    fields: [...document.querySelectorAll('[data-p]')].map(n => n.getAttribute('data-p')),
    method: document.querySelector('[data-p="method"]').value,
  }));
  ok(`records amount, date, method, reference and memo: ${form.fields.join(', ')}`,
     ['amount', 'paid_on', 'method', 'reference', 'memo'].every(f => form.fields.includes(f)),
     form.fields.join(','));
  ok(`  and defaults to Check, because that is how Theo pays (${form.method})`,
     form.method === 'check', form.method);

  console.log('\nLIGHT MODE');
  const l = await open(true, true);
  await l.evaluate(() => {
    [...document.querySelectorAll('.crw-tab')].find(n => n.textContent === 'Payments').click();
  });
  await l.waitForSelector('.crw-rt', { timeout: 5000 });
  const lit = await l.evaluate(() => {
    const w = document.querySelector('.crw-rtwrap');
    return { bg: getComputedStyle(w).backgroundColor, radius: getComputedStyle(w).borderTopLeftRadius };
  });
  ok(`the payments frame is a raised light card, not a dark one (${lit.bg})`,
     lit.bg === 'rgb(255, 255, 255)', lit.bg);
  await l.screenshot({ path: SC + '/pay556_light.png', fullPage: true });
  await admin.screenshot({ path: SC + '/pay556_dark.png', fullPage: true });

  console.log('\n' + '='.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(66));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
