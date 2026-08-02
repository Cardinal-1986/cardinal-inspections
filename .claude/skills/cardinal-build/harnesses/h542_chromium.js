/* Build 542 gate — the SHIPPED prefill run against a REAL client record.
 *
 * prefillClientInfo() and the ROOF_AGREEMENT template are extracted from the
 * built artifact and executed. The project fed to them is Bob DeBuilder's
 * actual row, checklist and all, pulled from production earlier today — he is
 * the one client whose roof has been inspected, so he is the only record that
 * can prove the three collapses fire. Dan Thompson runs as the control: a real
 * client with no inspection, whose option rows must print as they do on paper.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v542.html', 'utf8');

const fn = (name) => {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no function ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && !--d) return src.slice(i, k + 1);
  }
};
const tmpl = (name) => {
  const a = src.indexOf('var ' + name + ' = `');
  const b = src.indexOf('`;', a + name.length + 8);
  return src.slice(a + name.length + 8, b);
};

const BODY = tmpl('ROOF_AGREEMENT_BODY');
const PREFILL = fn('prefillClientInfo');
console.log(`  ROOF_AGREEMENT_BODY ${BODY.length} chars · prefillClientInfo ${PREFILL.length} chars`);
if (!PREFILL.includes("collapse('pitch'")) throw new Error('bad prefill capture');

/* real rows, out of production */
const BOB = { id: 'd11b3888', name: 'Bob DeBuilder', phone: '', email: '',
  address: '921 Testing Way',
  checklist: JSON.stringify({ po: 1032, pitch: '6/12', layers: '2 Layers',
    decking: '1x6 Plank / Spaced Lumber', rooftype: 'Asphalt shingle',
    lead: { location: { street: '921 Testing Way', suite: '', city: 'Dayton',
                        state: 'OH', zip: '45420' } } }) };
const DAN = { id: '21e1990d', name: 'Dan Thompson', phone: '', email: '',
  address: '2825 Arden Ave, Dayton, OH 45420',
  checklist: JSON.stringify({ po: 1036, lead: { claim_type: 'retail',
    location: { street: '2825 Arden Ave', suite: '', city: 'Dayton',
                state: 'OH', zip: '45420' } } }) };

const page = `<div id="out"></div>
<script>
${fn('esc')}
function fmtLongDate(d){ return d.toDateString(); }
function poOf(pr){ try { return JSON.parse(pr.checklist).po; } catch(e){ return null; } }
function parseCkAll(pr){ try { return JSON.parse(pr.checklist || '{}'); } catch(e){ return {}; } }
function projClaimType(){ return 'retail'; }
function projHomeowner(){ return ''; }
${PREFILL}
window.TPL = ${JSON.stringify(BODY)};
window.fill = function(pr){ return prefillClientInfo(window.TPL, pr); };
<\/script>`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await p.setContent(page, { waitUntil: 'load' });

  console.log('\nBOB DeBUILDER — a real client whose roof HAS been inspected');
  const bob = await p.evaluate((pr) => {
    const html = window.fill(pr);
    const d = document.createElement('div'); d.innerHTML = html;
    const text = d.textContent;
    return { html,
      fills: [...d.querySelectorAll('.fill')].map(n => n.textContent),
      blanks: d.querySelectorAll('.ph').length,
      optsLeft: [...d.querySelectorAll('.opts')].map(n => n.dataset.opts),
      hasOSB: text.includes('A. OSB') };
  }, BOB);
  console.log('        filled: ' + JSON.stringify(bob.fills));
  for (const [what, want] of [['the address street', '921 Testing Way'],
                              ['the city', 'Dayton'], ['the state', 'OH'], ['the zip', '45420'],
                              ['his name as Buyer', 'Bob DeBuilder'],
                              ['roof pitch off the inspection', '6/12'],
                              ['existing layers off the inspection', '2 Layers'],
                              ['decking type off the inspection', '1x6 Plank / Spaced Lumber']]) {
    ok(`${what} → ${want}`, bob.fills.includes(want), bob.fills.join(' | '));
  }
  ok('all three option rows COLLAPSED — nothing left to circle',
     bob.optsLeft.length === 0, bob.optsLeft.join(','));
  ok('  so the lettered decking options are gone from the page', !bob.hasOSB);
  ok('the rest of the form is still blanks to fill', bob.blanks > 25, String(bob.blanks));

  console.log('\nDAN THOMPSON — the control: a real client with NO inspection');
  const dan = await p.evaluate((pr) => {
    const html = window.fill(pr);
    const d = document.createElement('div'); d.innerHTML = html;
    return { fills: [...d.querySelectorAll('.fill')].map(n => n.textContent),
             optsLeft: [...d.querySelectorAll('.opts')].map(n => n.dataset.opts),
             hasOSB: d.textContent.includes('A. OSB') };
  }, DAN);
  ok('his address still fills', dan.fills.includes('2825 Arden Ave'), dan.fills.join(' | '));
  ok('but all three option rows SURVIVE — they print as on paper',
     dan.optsLeft.length === 3, dan.optsLeft.join(','));
  ok('  the lettered decking options are on the page', dan.hasOSB);

  console.log('\nTHE DOCUMENT ITSELF');
  const doc = await p.evaluate(() => {
    const d = document.createElement('div'); d.innerHTML = window.TPL;
    return { totals: d.querySelectorAll('#estTotal').length,
             secs: [...d.querySelectorAll('h2.sec')].map(n => n.textContent),
             text: d.textContent };
  });
  ok('exactly one #estTotal for the editor to recompute', doc.totals === 1, String(doc.totals));
  ok('all 13 numbered specification sections',
     [...Array(13)].every((_, i) => doc.text.includes(`${i + 1}. `)));
  ok('the statutory pages are POINTED AT, not retyped',
     doc.text.includes('Company Documents') && doc.text.includes('Notice of Cancellation') &&
     !doc.text.includes('you may cancel this transaction. If you cancel'));

  await p.evaluate((pr) => {
    document.getElementById('out').innerHTML =
      '<style>body{font-family:Georgia,serif;font-size:11pt;color:#1b1b1b;background:#fff;padding:24px}' +
      '.ph{background:#fff6c4;padding:0 3px;border-radius:2px}' +
      '.fill{background:#dff3e0;padding:0 3px;border-radius:2px;font-weight:700}' +
      'h2.sec{font-size:13pt;font-weight:800;margin:18px 0 6px;padding-bottom:4px;border-bottom:2px solid #C8202E}' +
      'table.meta,table.items{border-collapse:collapse;width:100%;margin:6px 0 12px;font-size:10pt}' +
      'table.meta td,table.items td,table.items th{border:1px solid #d9d9d9;padding:6px 9px;vertical-align:top}' +
      'table.meta td.k{background:#f6f6f6;font-weight:700;width:26%}' +
      '.descbox{border:1px solid #d9d9d9;padding:8px;min-height:34px}</style>' + window.fill(pr);
  }, BOB);
  await p.screenshot({ path: SC + '/roof542.png', fullPage: true });

  console.log('\n' + '='.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(58));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
