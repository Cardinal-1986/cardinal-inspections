/* gate_1053.mjs — the insurance CRM's reach pass.
 *
 *   A  the header title never overlaps a header BUTTON at 360 / 390 / 430.
 *      Measured as real box intersection, not as a width prediction.
 *   B  no label in the client card's meta column wraps mid-word. Measured with
 *      a Range over the text node — getClientRects() on a BLOCK returns 1 no
 *      matter how the text wraps, which is how this defect hid.
 *   C  every named control clears the 44px floor on a phone.
 *
 * Run:  node gate_1053.mjs <artifact> [--control <prev>]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
const args = process.argv.slice(2);
const FILE = args[0];
const ci = args.indexOf('--control');
const CONTROL = ci >= 0 ? args[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1053.mjs <artifact> [--control <prev>]'); process.exit(2); }
const SK = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const CARD = readFileSync(SK + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK = readFileSync(SK + 'e2e_mock_supa.js', 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const SEED = `(function(){ if(!window.__SEED__) return;
  window.__SEED__.projects.push({ id:'pins', name:'Harold & Marla Renfrew', address:'2184 Cedarbrook Dr',
    city:'Kettering', state:'OH', zip:'45429', stage:'Approved',
    created_by:'theo@cardinalrenovations.net', sales_rep:null,
    checklist: JSON.stringify({ po:2201, job_category:'Residential', work_type:'Insurance',
      lead:{ assigned:[], claim_type:'insurance',
        insurance:{ carrier:'State Farm', claim_number:'SF-88213', deductible:2500 } } }),
    phone:'937-555-0177', email:'renfrew@example.com', crm:'retail',
    created_at:'2026-06-15T10:00:00Z', updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-07-28T10:00:00Z' });
})();`;

/* the header check: real box intersection against the header's own BUTTONS */
const HDR = `(function(){
  var bar = document.getElementById('cr-hd2-bar');
  if(!bar) return { missing:true };
  var mid = document.getElementById('cr-hd2-mid');
  var h1  = bar.querySelector('#brandTitle h1');
  if(!mid || !h1) return { missing:true };
  var mr = mid.getBoundingClientRect();
  var laps = [];
  bar.querySelectorAll('button, a[href]').forEach(function(b){
    if(mid.contains(b) || b.contains(mid)) return;
    var br = b.getBoundingClientRect();
    if(br.width < 4 || br.height < 4) return;
    var ox = Math.min(mr.right, br.right) - Math.max(mr.left, br.left);
    var oy = Math.min(mr.bottom, br.bottom) - Math.max(mr.top, br.top);
    if(ox > 1 && oy > 1)
      laps.push((b.id || b.className || b.tagName) + ' by ' + Math.round(ox) + 'x' + Math.round(oy));
  });
  return { laps:laps, title:(h1.textContent||'').trim().slice(0,24) };
})`;

/* the label check: a Range gives one rect PER RENDERED LINE; the element's own
   getClientRects() gives 1 for a block however its text wraps. */
const LABELS = `(function(){
  var out = [];
  document.querySelectorAll('#projectView .projmeta .mlbl').forEach(function(e){
    var tn = null;
    for(var i=0;i<e.childNodes.length;i++)
      if(e.childNodes[i].nodeType===3 && e.childNodes[i].nodeValue.trim()){ tn = e.childNodes[i]; break; }
    if(!tn) return;
    var rg = document.createRange(); rg.selectNodeContents(tn);
    out.push({ label:tn.nodeValue.trim(), lines:rg.getClientRects().length });
  });
  return out;
})`;

const FLOOR = `(function(){
  var SELS = [
    ['#cr-ic-search','Insurance Clients search'],
    ['#cr-ic-wrap .cr-ic-sort button','Insurance Clients sort'],
    ['#cr-ic-wrap .cr-ic-chips button','Insurance Clients stage chips'],
    ['#insToggleBtn','claim panel toggle'], ['#insEditBtn','claim Edit'],
    ['#insMoreBtn','More details'], ['#acxTrBtn','trade-type toggle'],
    ['#solBtn','Upload SOL'], ['.insdocupload','insurance doc Upload'],
    ['.dbmtabs .dbmdir','Directions'], ['.dbstgarr','stage arrows'],
    ['#delClientBtn','Delete Client'], ['.rvbtn','review buttons']
  ];
  var bad = [];
  SELS.forEach(function(p){
    document.querySelectorAll(p[0]).forEach(function(e){
      var cs = getComputedStyle(e);
      if(cs.display==='none'||cs.visibility==='hidden') return;
      var r = e.getBoundingClientRect();
      if(r.width < 1 || r.height < 1) return;
      /* 0.5px of slack: a 43.99 box rounds to 44 on screen and is not a defect */
      if(r.width < 43.5 || r.height < 43.5)
        bad.push(p[1] + ' (' + p[0] + ') ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
  });
  /* one per selector is enough to name the problem */
  var seen = {}, out = [];
  bad.forEach(function(b){ var k=b.split(' (')[0]; if(!seen[k]){seen[k]=1; out.push(b);} });
  return out;
})`;

async function open(file, width) {
  const HTML = readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch({ args:['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport:{ width, height:844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG1 });
    return r.fulfill({ status:200, body:'' }); });
  await page.addInitScript(CARD); await page.addInitScript(SEED); await page.addInitScript(MOCK);
  await page.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1700);
  return { browser, ctx, page };
}

async function judge(file) {
  const f = [];
  /* A — the header, on the insurance hub, at three phone widths */
  for (const w of [360, 390, 430]) {
    const { browser, ctx, page } = await open(file, w);
    await page.evaluate(`(function(){ var l=document.getElementById('landingView'); if(l) l.style.display='none';
      if(typeof showCardinalTruth==='function') showCardinalTruth(); })()`);
    await page.waitForTimeout(900);
    const h = await page.evaluate(`(${HDR})()`);
    if (h.missing) f.push(`the header did not render at ${w}px (rig fault — proves nothing)`);
    else h.laps.forEach(l => f.push(`at ${w}px the title "${h.title}" overlaps ${l}`));
    await ctx.close(); await browser.close();
  }
  /* B + C — the insurance client profile at phone width */
  const { browser, ctx, page } = await open(file, 390);
  await page.evaluate(`(async function(){ var l=document.getElementById('landingView'); if(l) l.style.display='none';
    await window.openProject('pins'); })()`);
  await page.waitForTimeout(1300);
  const ins = await page.evaluate(`document.body.classList.contains('claim-insurance')`);
  if (!ins) { f.push('rig fault: the seeded job did not open as an insurance claim'); }
  const labels = await page.evaluate(`(${LABELS})()`);
  if (!labels.length) f.push('no meta labels rendered (rig fault — proves nothing)');
  labels.forEach(l => { if (l.lines !== 1) f.push(`"${l.label}" wraps across ${l.lines} lines — it is breaking mid-word`); });
  const floor = await page.evaluate(`(${FLOOR})()`);
  floor.forEach(b => f.push(`under the 44px floor: ${b}`));
  await ctx.close(); await browser.close();
  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1053 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1053 GREEN — no header overlap at 360/390/430, no wrapped label, every named control ≥44px');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 12).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
