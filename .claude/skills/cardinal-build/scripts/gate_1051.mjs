/* gate_1051.mjs — build 1051: the two phone bugs Theo photographed.
 * Rig at 390px on a client profile (the exact width of the screenshots):
 *   [A trade panel] .acxjd .acxtrs spans BOTH grid columns, so it gets the
 *      card's full width and a checkbox label fits on ONE line. Measured, not
 *      asserted on CSS text: panel width must be ~the card width (>=250px at
 *      390px) and a label's box must be single-line (<24px tall). On 1050 the
 *      panel is 188px (or 110px when it lands in the label column) and the
 *      label wraps to 34px — "Roo fing".
 *   [B worksheet] on the DARK page, .wsrow and .wsempty must be dark grounds
 *      with light ink; on rb-light they must be byte-identical to 1050 (white
 *      #fff / #fbfaf9), so the dark pass cannot have moved light mode.
 * Run:  node gate_1051.mjs <artifact> [--control <index at 1050>]
 * The control must go RED.
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch(e){} }
if (!chromium) { console.error('gate_1051: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci+1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1051.mjs <index.html> [--control prev]'); process.exit(2); }

const SK = new URL('.', import.meta.url).pathname;
const CARD = readFileSync(SK+'sentinel_setup_cardinal.js','utf8');
const MOCK = readFileSync(SK+'e2e_mock_supa.js','utf8');
const SEED = `(function(){ if(!window.__SEED__) return;
  window.__SEED__.projects.push({ id:'pshot', name:'Maker Space Solutions LLC (Devon)', address:'8 Foundry Row',
    city:'Dayton', state:'OH', zip:'45402', stage:'OnHold', created_by:'theo@cardinalrenovations.net', sales_rep:null,
    checklist: JSON.stringify({ po:1099, job_category:'Residential', work_type:'Insurance', lead:{ assigned:[], insurance:{ carrier:'State Farm', claim_number:'CLM-1' } } }),
    phone:'937-555-0199', email:null, crm:'retail', created_at:'2026-07-01T10:00:00Z',
    updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-08-01T10:00:00Z' });
  window.__SEED__.projects.push({ id:'pret', name:'Dell Rowan', address:'40 Vine Ct', city:'Dayton',
    state:'OH', zip:'45402', stage:'Approved', created_by:'theo@cardinalrenovations.net', sales_rep:null,
    checklist: JSON.stringify({ po:1098, job_category:'Residential', work_type:'Retail', lead:{ assigned:[] } }),
    phone:null, email:null, crm:'retail', created_at:'2026-07-02T10:00:00Z',
    updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-08-02T10:00:00Z' }); })();`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

async function measure(html, light) {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://sentinel.test/')) return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG });
    return r.fulfill({ status:200, body:'' }); });
  await page.addInitScript(CARD); await page.addInitScript(SEED); await page.addInitScript(MOCK);
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.evaluate(`window.openProject('pshot')`);
  await page.waitForTimeout(1300);
  await page.evaluate(`(function(){ var b=document.getElementById('acxTrBtn'); if(b) b.click(); })()`);
  await page.waitForTimeout(400);
  const out = await page.evaluate(`(function(){
    var p = document.querySelector('.acxjd .acxtrs');
    var card = document.querySelector('.ackv.acxjd');
    var o = { panel: p ? Math.round(p.getBoundingClientRect().width) : -1,
              card: card ? Math.round(card.getBoundingClientRect().width) : -1,
              labelH: -1, labelW: -1, spanBoth: false, disp: '', ins: document.body.classList.contains('claim-insurance') };
    if (p) {
      var lab = p.querySelector('label span');
      if (lab) { var lr = lab.getBoundingClientRect();
                 o.labelH = Math.round(lr.height); o.labelW = Math.round(lr.width);
                 /* a wrapped inline span reports one rect PER LINE — 1 means the
                    word survived intact, 2+ means "Roo fing". No threshold. */
                 o.lines = lab.getClientRects().length;
                 o.word = (lab.textContent || '').trim(); }
      var cs = getComputedStyle(p);
      o.disp = cs.display;
      o.spanBoth = (cs.gridColumnStart === '2');
      /* the other half of the same rule. An author display: declaration beats
         the UA sheet's [hidden]{display:none}, so the panel needs an explicit
         [hidden] twin or it can never be collapsed. MEASURED on 1050: an
         insurance job carries hidden="" on load and paints anyway. */
      var had = p.hasAttribute('hidden');
      p.setAttribute('hidden', '');
      o.hiddenWorks = (getComputedStyle(p).display === 'none');
      if (!had) p.removeAttribute('hidden');
    }
    return o;
  })()`);
  const insWs = await page.evaluate(`(function(){
    var v=document.getElementById('paymentsView');
    if(typeof openPaymentsPage==='function') openPaymentsPage();
    var w=document.createElement('div');
    w.innerHTML='<div class="wsrow"><div class="wstitle">C</div></div>';
    v.appendChild(w);
    var e=v.querySelector('.wsrow'); var o={ rowBg:getComputedStyle(e).backgroundColor,
      page:getComputedStyle(document.body).backgroundColor };
    w.remove(); return o;
  })()`);
  /* the worksheet lives on the DARK page — that is the retail client. The
     insurance page paints cream and keeps these cards light on purpose, so it
     is measured separately below. */
  await page.evaluate(`window.openProject('pret')`);
  await page.waitForTimeout(1200);
  await page.evaluate(`(function(){ if(typeof openPaymentsPage==='function') openPaymentsPage(); })()`);
  await page.waitForTimeout(900);
  const ws = await page.evaluate(`(function(){
    var v = document.getElementById('paymentsView');
    if(!v) return { missing:true };
    var w = document.createElement('div');
    w.innerHTML = '<div class="wsrow"><div class="wstitle">Contract</div>'+
      '<div class="wsgrid"><div><label>Job Value</label><b>$0</b></div></div></div>'+
      '<div class="wsempty">No data to display</div>';
    v.appendChild(w);
    function g(s,p){ var e=v.querySelector(s); return e?getComputedStyle(e)[p]:'MISSING'; }
    var o = { rowBg:g('.wsrow','backgroundColor'), title:g('.wstitle','color'),
              emptyBg:g('.wsempty','backgroundColor'), val:g('.wsgrid b','color'),
              page:getComputedStyle(document.body).backgroundColor,
              ins:document.body.classList.contains('claim-insurance') };
    w.remove(); return o;
  })()`);
  await ctx.close(); await browser.close();
  return { jd: out, ws: ws, insWs: insWs };
}

function lum(rgb){ const m=rgb.match(/(\d+), (\d+), (\d+)/); if(!m) return null;
  return (+m[1]*0.299 + +m[2]*0.587 + +m[3]*0.114); }

function judge(dark, lite) {
  const f = [];
  const j = dark.jd;
  if (j.panel < 0) { f.push('the trade panel never rendered (rig fault — proves nothing)'); return f; }
  if (!j.ins) { f.push('rig fault: the seeded client is not an insurance claim — this gate must test the excluded theme'); return f; }
  if (!j.spanBoth) f.push(`trade panel is not in the value column (grid-column-start ${j.spanBoth})`);
  if (j.disp !== 'flex') f.push(`trade panel display is ${j.disp} — it is not the chip row the rebuild gives retail`);
  if (j.panel < 150) f.push(`trade panel ${j.panel}px inside a ${j.card}px card — squeezed into the 110px label column`);
  if (j.lines !== 1) f.push(`"${j.word}" renders across ${j.lines} lines — the word is breaking in half ("Roo fing")`);
  if (!j.hiddenWorks) f.push('the trade panel ignores hidden="" — it can never be collapsed on this CRM');
  const w = dark.ws;
  if (w.missing) { f.push('payments view missing (rig fault)'); return f; }
  if (lum(w.rowBg) > 120) f.push(`.wsrow is ${w.rowBg} on a ${w.page} page — a white card on the dark app`);
  if (lum(w.emptyBg) > 120) f.push(`.wsempty is ${w.emptyBg} on the dark page`);
  if (lum(w.title) < 120) f.push(`.wstitle is ${w.title} — dark ink on the new dark card`);
  if (lum(w.val) < 120) f.push(`.wsgrid b is ${w.val} — dark ink on the new dark card`);
  /* light mode must be byte-identical to what it always was */
  if (w.ins) f.push('rig fault: the worksheet was measured on the insurance page, not the dark one');
  const L = lite.ws;
  if (L.rowBg !== 'rgb(255, 255, 255)') f.push(`rb-light .wsrow moved: ${L.rowBg} (must stay white)`);
  if (L.emptyBg !== 'rgb(251, 250, 249)') f.push(`rb-light .wsempty moved: ${L.emptyBg}`);
  if (L.title !== 'rgb(43, 43, 43)') f.push(`rb-light .wstitle moved: ${L.title}`);
  /* the regression this build nearly shipped: a dark card on the CREAM
     insurance page, where these cards are light on purpose. */
  const I = dark.insWs;
  if (I && I.rowBg !== 'rgb(255, 255, 255)') f.push(`insurance page .wsrow went ${I.rowBg} — it must stay light on cream`);
  return f;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await measure(html, false), await measure(html, true));
for (const x of fails) console.log('  FAIL ' + x);
console.log(fails.length ? `GATE 1051 RED — ${fails.length} failure(s)`
  : 'GATE 1051 GREEN — panel spans the card, labels fit one line, worksheet dark; light untouched');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cf = judge(await measure(chtml, false), await measure(chtml, true));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cf.length} named failure(s) — ${cf.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const x of cf.slice(0,6)) console.log('    control-fail ' + x);
  if (!cf.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
