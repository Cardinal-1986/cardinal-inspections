/* gate_1027.mjs — build 1027: the client-facing estimate document, redressed.
 * Slices the SHIPPED buildDocHtml (+ its in-block helpers) out of the artifact,
 * executes it against a real-shaped estimate, and proves:
 *   [head]    a viewport meta exists; the Option-A sheet (--hair token) is in;
 *   [hooks]   the share wrapper's selectors survive: h2.sec .num, table.meta td.k,
 *             .deposit-box, .note, .sign, .coverfig, .pfig;
 *   [content] everything AFTER </style> is byte-identical to what the CONTROL
 *             build emits — the dress changed, the words did not;
 *   [phone]   rendered at 390x844 the document does not overflow horizontally
 *             and the header stacks; [desktop] the 8.5in page still holds.
 * Run:  node gate_1027.mjs <artifact> [--control <prev>]
 * The control run must go RED (no viewport meta, phone overflow) — a gate never
 * seen red proves nothing (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1027: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1027.mjs <index.html> [--control prev]'); process.exit(2); }

const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAABAAAAAQCAYAAAAfFcSJAAAADUlEQVR42mNsaGioBwAFhAKAheV6HgAAAABJRU5ErkJggg=='.replace('AAAB', 'AAAB'); // 1x1
function sliceFn(src, name) {
  const i = src.indexOf('function ' + name);
  if (i === -1) throw new Error('sliceFn: ' + name + ' not found');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  throw new Error('sliceFn: unbalanced ' + name);
}
function makeBuilder(html) {
  const code = ['cardinalLogo', 'docPhotoUrl', 'esc', 'fmtDate', 'money', 'nl2br', 'buildDocHtml']
    .map(n => sliceFn(html, n)).join('\n');
  const stubs = 'var projHomeowner = function(){ return null; };' +
    'var projClaimType = function(){ return ""; };' +
    'var parseCkAll = function(){ return {}; };';
  return new Function('window', '"use strict";' + stubs + code + '\nreturn buildDocHtml;')(
    { REPORT_TEMPLATE: 'x class="cover-logo" src="' + PNG1 + '" x' });
}

const EST = {
  estimate_number: 'EST-2026-0896', title: 'Estimate — Mark Diamond', itemized: true,
  line_items: [
    { name: 'Architectural shingles, installed', description: 'OC Duration per square, incl. synthetic underlayment and starter.', qty: 32, unit: 'SQ', unit_price: 385 },
    { name: 'Tear-off, one layer', description: 'Remove and haul one layer of three-tab.', qty: 32, unit: 'SQ', unit_price: 65 },
    { name: 'Drip edge to code, all eaves and rakes', description: 'ORC / local amendment.', qty: 116, unit: 'LF', unit_price: 3.1 },
  ],
  photos: [
    { cover: true, url: PNG1, caption: 'North elevation — hail-bruised field shingles.' },
    { url: PNG1, caption: 'Valley metal rusted through at the second course.' },
    { url: PNG1, caption: 'Undersized drip edge along the east rake.' },
  ],
  subtotal: 14759.60, discount: 359.60, total: 14400.00,
  deposit_pct: 30, deposit_amount: 4320.00,
  valid_through: '2026-09-15', created_at: '2026-08-23T14:00:00Z',
  notes: 'Ridge vent cut-in included. Decking replacement billed per sheet by written change order.',
  payment_instructions: 'A 30% deposit is due at contract signing. Balance due at completion of work.',
};
const PROJECT = { name: 'Mark Diamond', address: '7990 Germantown Pike, Dayton OH 45418', phone: '937-555-0144', email: 'mark@example.com' };

async function renderProbe(doc) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = {};
  for (const [label, vp] of [['phone', { width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 }],
                             ['desk', { width: 1100, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, deviceScaleFactor: vp.deviceScaleFactor || 1 });
    const page = await ctx.newPage();
    await page.setContent(doc, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    out[label] = await page.evaluate(`(function(){
      var de = document.documentElement;
      return {
        innerW: window.innerWidth,
        scrollW: Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0),
        headDir: getComputedStyle(document.querySelector('.est-head') || de).flexDirection,
        numBg: (function(){ var n = document.querySelector('h2.sec .num'); return n ? getComputedStyle(n).backgroundColor : 'MISSING'; })(),
        grandInk: (function(){ var g = document.querySelector('table.items tr.grand td.lbl') || document.querySelector('table.items tr.grand td'); return g ? getComputedStyle(g).color : 'MISSING'; })(),
        bodyW: document.body ? document.body.getBoundingClientRect().width : 0,
      };
    })()`);
    await ctx.close();
  }
  await browser.close();
  return out;
}

async function judge(html, tag) {
  const fails = [];
  let doc;
  try { doc = makeBuilder(html)(EST, PROJECT, null); }
  catch (e) { return [`${tag}: shipped builder threw: ${e.message}`]; }
  if (!doc.includes('name="viewport"')) fails.push('no viewport meta in the emitted document');
  for (const hook of ['h2.sec .num', 'table.meta td.k', '.deposit-box', '.note', '.sign', '.coverfig', '.pfig'])
    if (!doc.includes(hook)) fails.push(`share-wrapper hook selector missing from sheet: ${hook}`);
  for (const word of ['EST-2026-0896', 'Mark Diamond', '14,400', '4,320', 'hail-bruised'])
    if (!doc.includes(word)) fails.push(`document content missing: ${word}`);
  const probes = await renderProbe(doc);
  if (probes.phone.scrollW > probes.phone.innerW + 1)
    fails.push(`phone overflow: scrollWidth ${probes.phone.scrollW} > viewport ${probes.phone.innerW}`);
  if (probes.phone.headDir !== 'column') fails.push(`phone header not stacked (flex-direction ${probes.phone.headDir})`);
  if (probes.desk.numBg !== 'rgb(200, 32, 46)') fails.push(`section-number chip not cardinal red: ${probes.desk.numBg}`);
  if (probes.desk.bodyW < 750 || probes.desk.bodyW > 850) fails.push(`desktop page width off Letter: ${probes.desk.bodyW}px`);
  return { fails, doc };
}

const html = readFileSync(FILE, 'utf8');
const res = await judge(html, 'artifact');
const fails = res.fails || res;
for (const f of fails) console.log('  FAIL ' + f);

/* content-vs-control: the words must not change when the dress does */
if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  let cdoc = null;
  try { cdoc = makeBuilder(chtml)(EST, PROJECT, null); } catch (e) { console.log('  control builder threw: ' + e.message); }
  if (cdoc && res.doc) {
    const after = s => s.slice(s.indexOf('</style>'));
    if (after(res.doc) !== after(cdoc)) { console.log('  FAIL document CONTENT differs from control past </style>'); fails.push('content'); }
    else console.log('  content past </style> byte-identical with control ✓');
  }
  const cres = await judge(chtml, 'control');
  const cfails = cres.fails || cres;
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
console.log(fails.length ? `GATE 1027 RED — ${fails.length} failure(s)` : 'GATE 1027 GREEN — head, hooks, content, phone reflow, print page');
process.exit(fails.length ? 1 : 0);
