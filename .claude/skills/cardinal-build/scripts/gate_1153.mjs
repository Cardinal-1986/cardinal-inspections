/* gate_1153.mjs — build 1153: Service Financial plan reference (staff screen).
 *
 * A menu-launched full-screen reference (#cr-fin) that lists the whole plan
 * catalog grouped, computes each plan's monthly from a typed amount, and shows
 * a dealer-fee column ONLY when finance_plan_fees returns rows (RLS grants that
 * to admins alone).
 *
 * Proves in Chromium:
 *   1. showFinanceRates() opens #cr-fin, hideAllViews() hides it, the Selling
 *      menu carries a data-go="finrates" item, and the nav route resolves.
 *   2. the catalog renders grouped (>=5 sections) with real plan ids.
 *   3. typing an amount computes monthlies: a factor plan = amount x factor,
 *      a 0% plan = amount / months, a same-as-cash plan shows "no monthly".
 *   4. WITH fee rows (admin): a "Dealer fee" column appears with a value.
 *   5. WITHOUT fee rows (non-admin): NO fee column anywhere.
 * Control (1152 tree): RED — showFinanceRates/#cr-fin do not exist.
 * Run: node gate_1153.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('gate_1153: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1153.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());

async function run(fees) {
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 860 } })).newPage();
  await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
    ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
    : r.fulfill({ status: 200, body: '' }));
  await page.addInitScript(SETUP);
  await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const out = await page.evaluate(`(async function(){
    const out = { ok:true, fail:[] };
    if (typeof window.showFinanceRates !== 'function') { out.ok=false; out.fail.push('showFinanceRates missing'); return out; }
    /* menu item + route */
    if (!document.querySelector('[data-go="finrates"]')) out.fail.push('no finrates menu item');
    /* stub the admin-gated fee fetch for THIS run */
    const FEES = ${JSON.stringify(fees)};
    const realFrom = window.supa.from.bind(window.supa);
    window.supa.from = function(t){
      if (t === 'finance_plan_fees') return { select(){ return Promise.resolve({ data: FEES, error: null }); } };
      return realFrom(t);
    };
    window.showFinanceRates();
    await new Promise(r=>setTimeout(r,600));
    const view = document.getElementById('cr-fin');
    if (!view || !view.classList.contains('open')) { out.fail.push('#cr-fin did not open'); return out; }
    const sects = view.querySelectorAll('.fin-sect');
    if (sects.length < 5) out.fail.push('expected >=5 grouped sections, got ' + sects.length);
    if (view.innerHTML.indexOf('#4212') === -1) out.fail.push('catalog rows not rendered (no #4212)');

    /* amount calculator */
    const amt = view.querySelector('[data-slot="fin-amt"]');
    amt.value = '46783';
    amt.dispatchEvent(new Event('input', { bubbles:true }));
    await new Promise(r=>setTimeout(r,200));
    function rowText(id){ const cells = Array.from(view.querySelectorAll('.fin-plan')); const c = cells.find(x=>x.textContent.trim()==='#'+id); return c ? c.parentNode.textContent : ''; }
    const money0 = v => '$' + Math.round(v).toLocaleString('en-US');
    // #4212 = 9.99%/60, factor 2.12% -> 46783 * 2.12%
    const exp4212 = money0(46783 * 2.12 / 100);
    if (rowText('4212').indexOf(exp4212) === -1) out.fail.push('factor monthly wrong for #4212, want ' + exp4212 + ' :: ' + rowText('4212').replace(/\\s+/g,' ').slice(0,80));
    // #3060 = 0% / 60 -> 46783 / 60
    const exp3060 = money0(46783 / 60);
    if (rowText('3060').indexOf(exp3060) === -1) out.fail.push('0% monthly wrong for #3060, want ' + exp3060);
    // #2024 same-as-cash -> no monthly
    if (rowText('2024').indexOf('no monthly') === -1) out.fail.push('same-as-cash #2024 should read "no monthly"');

    /* fee column presence */
    const hasFeeHeader = !!Array.from(view.querySelectorAll('th')).find(th=>/Dealer fee/i.test(th.textContent));
    out.hasFeeHeader = hasFeeHeader;
    out.feeVisible = view.innerHTML.indexOf('3.50%') !== -1; // 4212 fee when admin

    /* hideAllViews hides it */
    if (typeof window.hideAllViews === 'function'){ try{ window.hideAllViews(); }catch(e){} }
    out.hiddenByNav = getComputedStyle(view).display === 'none';

    out.ok = out.fail.length === 0;
    return out;
  })()`);
  await page.context().close();
  return out;
}

let ok = true;
const log = (b, m) => { console.log('  ' + (b ? '✓' : '✗') + ' ' + m); if (!b) ok = false; };
try {
  // admin: fees present
  const admin = await run([
    { plan_id:'4212', dealer_fee:3.50 }, { plan_id:'3060', dealer_fee:14.75 },
    { plan_id:'2024', dealer_fee:11.75 }, { plan_id:'BD580', dealer_fee:9.95 }
  ]);
  admin.fail.forEach(f => log(false, 'admin: ' + f));
  log(admin.hasFeeHeader === true, 'admin sees a Dealer fee column');
  log(admin.feeVisible === true, 'admin sees a fee value (3.50%)');
  log(admin.hiddenByNav === true, 'hideAllViews() hides #cr-fin');

  // non-admin: fees empty -> no fee column
  const rep = await run([]);
  rep.fail.forEach(f => log(false, 'non-admin: ' + f));
  log(rep.hasFeeHeader === false, 'non-admin sees NO Dealer fee column');
  log(rep.feeVisible === false, 'non-admin sees no fee value');
} catch (e) {
  console.error('gate_1153: harness threw:', String(e).split('\n')[0]);
  await browser.close();
  process.exit(1);
}
await browser.close();
console.log(ok ? 'gate_1153 GREEN — reference renders, amount calc computes, fees are admin-only' : 'gate_1153 RED');
process.exit(ok ? 0 : 1);
