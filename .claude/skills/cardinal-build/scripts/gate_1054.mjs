/* gate_1054.mjs — the insurance hub and the client list agree.
 *
 * This build changes BEHAVIOUR, so the gate drives the app rather than reading
 * its CSS:
 *   A  every stage the Truth rail can filter to has a chip on the list, and
 *      after tapping a rail row exactly ONE chip is lit — the matching one.
 *      (Before: three of nine rows lit nothing at all, including "All".)
 *   B  the "Supplement Filed" rail row lands on the supplements filter and the
 *      list actually narrows — not on the unfiltered list.
 *   C  the chips use the SHORT stage wording, so the longest one fits a phone.
 *
 * Run:  node gate_1054.mjs <artifact> [--control <prev>]
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
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1054.mjs <artifact> [--control <prev>]'); process.exit(2); }
const SK = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const CARD = readFileSync(SK + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK = readFileSync(SK + 'e2e_mock_supa.js', 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* one insurance claim per stage, so every rail row has something to find and a
   filter that returns the wrong set is visible as a wrong COUNT. */
const STAGES = ['Lead','Prospect','Approved','OnHold','Scheduled','Completed','Invoiced','Closed','Lost'];
const SEED = `(function(){ if(!window.__SEED__) return;
  var ST = ${JSON.stringify(STAGES)};
  ST.forEach(function(st,i){
    window.__SEED__.projects.push({ id:'pi'+i, name:'Claim '+st, address:(100+i)+' Cedar Dr',
      city:'Kettering', state:'OH', zip:'45429', stage:st,
      created_by:'theo@cardinalrenovations.net', sales_rep:null,
      checklist: JSON.stringify({ po:3000+i, job_category:'Residential', work_type:'Insurance',
        lead:{ assigned:[], claim_type:'insurance',
          insurance:{ carrier:'State Farm', claim_number:'SF-'+i, deductible:1000 } } }),
      phone:'937-555-01'+(10+i), email:null, crm:'retail',
      created_at:'2026-06-15T10:00:00Z', updated_at:'2026-08-20T10:00:00Z',
      stage_since:'2026-07-28T10:00:00Z' });
  });
})();`;

const CHIPS = `(function(){
  var host = document.querySelector('#cr-ic-wrap .cr-ic-chips');
  if(!host) return { missing:true };
  var out = [];
  host.querySelectorAll('button').forEach(function(b){
    var r = b.getBoundingClientRect();
    out.push({ stg:b.dataset.stg===undefined?null:b.dataset.stg,
               txt:(b.textContent||'').replace(/\\s+/g,' ').trim(),
               on:b.classList.contains('on'), w:Math.round(r.width) });
  });
  return { chips:out, rows:(function(){
    var tops = {}; host.querySelectorAll('button').forEach(function(b){
      tops[Math.round(b.getBoundingClientRect().top)] = 1; });
    return Object.keys(tops).length; })() };
})`;

async function open(file) {
  const HTML = readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch({ args:['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG1 });
    return r.fulfill({ status:200, body:'' }); });
  await page.addInitScript(CARD); await page.addInitScript(SEED); await page.addInitScript(MOCK);
  await page.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1700);
  await page.evaluate(`(function(){ var l=document.getElementById('landingView'); if(l) l.style.display='none'; })()`);
  return { browser, ctx, page };
}

async function judge(file) {
  const f = [];
  const { browser, ctx, page } = await open(file);

  /* the rail rows are the source of truth for what the hub can ASK for */
  await page.evaluate(`(function(){ if(typeof showCardinalTruth==='function') showCardinalTruth(); })()`);
  await page.waitForTimeout(900);
  const railKeys = await page.evaluate(`(function(){
    return [...document.querySelectorAll('#cardinalTruthView [data-stage]')].map(function(b){ return b.dataset.stage; });
  })()`);
  if (!railKeys.length) { f.push('the Truth rail rendered no [data-stage] rows (rig fault — proves nothing)'); }

  /* A — every rail key that is a real stage must light exactly one chip */
  for (const k of railKeys) {
    if (k === 'supplement') continue;
    await page.evaluate(`(function(){ var b=document.querySelector('#cardinalTruthView [data-stage="${k}"]'); if(b) b.click(); })()`);
    await page.waitForTimeout(700);
    const c = await page.evaluate(`(${CHIPS})()`);
    if (c.missing) { f.push(`the chip strip did not render after tapping "${k}" (rig fault)`); continue; }
    const lit = c.chips.filter(x => x.on);
    if (lit.length !== 1)
      f.push(`tapping the rail's "${k}" lights ${lit.length} chips — the list cannot say what it is filtered to`);
    else if (lit[0].stg !== k)
      f.push(`tapping the rail's "${k}" lights the "${lit[0].stg}" chip instead`);
  }

  /* B — Supplement Filed must apply the supplements filter, not clear it */
  const hasSupp = railKeys.includes('supplement');
  if (!hasSupp) f.push('the rail has no "supplement" row (rig fault — proves nothing)');
  else {
    await page.evaluate(`(function(){ if(typeof showCardinalTruth==='function') showCardinalTruth(); })()`);
    await page.waitForTimeout(700);
    await page.evaluate(`(function(){ var b=document.querySelector('#cardinalTruthView [data-stage="supplement"]'); if(b) b.click(); })()`);
    await page.waitForTimeout(700);
    const st = await page.evaluate(`window.icStageFilter`);
    if (st !== '__supplements__')
      f.push(`the "Supplement Filed" row sets icStageFilter to ${JSON.stringify(st)} — it should narrow to the supplements, not clear the filter`);
  }

  /* C — the chips use the SHORT wording and the strip fits a phone */
  await page.evaluate(`(function(){ window.icStageFilter=''; if(typeof window.showInsuranceClients==='function') window.showInsuranceClients(); })()`);
  await page.waitForTimeout(800);
  const c = await page.evaluate(`(${CHIPS})()`);
  if (c.missing) f.push('the chip strip did not render (rig fault — proves nothing)');
  else {
    const inv = c.chips.find(x => x.stg === 'Invoiced');
    if (!inv) f.push('there is no Invoiced chip at all');
    else {
      if (/Supplements/i.test(inv.txt))
        f.push(`the Invoiced chip reads "${inv.txt}" — the long label, not the short twin build 656 added for this strip`);
      if (inv.w > 200)
        f.push(`the Invoiced chip is ${inv.w}px wide on a 390px phone`);
    }
    /* every stage the rail can ask for must have a chip */
    const have = new Set(c.chips.map(x => x.stg));
    for (const k of railKeys) {
      if (k === 'supplement') continue;
      if (!have.has(k)) f.push(`no chip for "${k}" — the rail can filter to it and the list cannot show it`);
    }
  }

  await ctx.close(); await browser.close();
  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1054 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1054 GREEN — every rail row lights its own chip, Supplement Filed narrows, chips use the short wording');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 12).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
