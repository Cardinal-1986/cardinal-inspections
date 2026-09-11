/* gate_1214.mjs — Chart.js and Papa Parse load on FIRST USE, not on every launch.
 *
 *   node gate_1214.mjs [path/to/index.html]   the build must be GREEN
 *   node gate_1214.mjs <the 1213 artifact>    the control: RED
 *
 * The claim is about the NETWORK, so the gate watches the network. It counts
 * requests, not source text: a `<script src>` removed from the markup but
 * re-added by some other path would pass a grep and fail here.
 *
 * ⚠ Section A is the one that matters and the one a naive gate gets wrong: it
 * asserts the two libraries are NOT fetched while the sign-in screen is up. A
 * check that only proves "they load when you open Reports" would pass on the
 * old eager build too, because they were already loaded.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };
setTimeout(() => { console.log('\nGATE 1214 TIMEOUT'); process.exit(3); }, 420000).unref();

const NOSESSION = `
export function createClient(){
  const noop = async () => ({ data:{ session:null, user:null }, error:null });
  return { auth:{ getSession:noop, getUser:noop,
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      signInWithPassword:noop, signOut:noop, resetPasswordForEmail:noop, updateUser:noop },
    from(){ const o={}; ['select','eq','neq','in','order','limit','like','ilike','or','not','gte','lte','insert','update','upsert','delete','range','single','maybeSingle'].forEach(m=>o[m]=()=>o);
      o.then=(r)=>Promise.resolve({data:[],error:null}).then(r); return o; },
    storage:{ from(){ return { createSignedUrl:async()=>({data:null,error:null}), createSignedUrls:async()=>({data:[],error:null}), upload:async()=>({data:null,error:null}), list:async()=>({data:[],error:null}) }; } },
    channel(){ return { on(){return this;}, subscribe(){return this;} }; },
    removeChannel(){}, rpc: async () => ({ data:null, error:null }) };
}
export default { createClient };`;

const CHART_URL = 'chart.umd.min.js';
const PAPA_URL  = 'papaparse.min.js';

function wire(page, hits, signedOut) {
  return page.route('**/*', async (route) => {
    const u = route.request().url(), rt = route.request().resourceType();
    if (u.includes(CHART_URL)) { hits.push('chart');
      /* a real, working Chart so the drawing half can be proven too */
      return route.fulfill({ status:200, contentType:'application/javascript',
        body: 'window.Chart=function(ctx,cfg){this.ctx=ctx;this.cfg=cfg;this.destroy=function(){};this.update=function(){};window.__charts=(window.__charts||0)+1;};window.Chart.defaults={};' }); }
    if (u.includes(PAPA_URL)) { hits.push('papa');
      return route.fulfill({ status:200, contentType:'application/javascript',
        body: 'window.Papa={parse:function(f,o){window.__papa=(window.__papa||0)+1;if(o&&o.complete)o.complete({data:[]});},unparse:function(){return "";}};' }); }
    if (u.includes('xlsx')) return route.fulfill({ status:200, contentType:'application/javascript', body:'window.XLSX={};' });
    if (u === 'https://app.cardinalroster.com/')
      return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js'))
      return route.fulfill({ status:200, contentType:'application/javascript', body: signedOut ? NOSESSION : MOCK });
    if (u.startsWith('https://app.cardinalroster.com/api/'))
      return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (rt === 'font') return route.fulfill({ status:200, contentType:'font/woff2', body:'' });
    if (rt === 'media') return route.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status:200, body:'' });
    return route.abort();
  });
}

console.log('gate_1214 on ' + FILE + '\n');
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);

  /* ── A. signed out, neither library is fetched ───────────────────────── */
  console.log('A  nothing downloads before sign-in');
  for (const w of [1440, 390]) {
    const hits = [];
    const ctx = await browser.newContext({ viewport:{ width:w, height:880 } });
    const page = await ctx.newPage();
    await wire(page, hits, true);
    await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3500);
    ok(!hits.includes('chart'), w + 'px signed out: Chart.js is NOT requested', hits.join(',') || 'no hits');
    ok(!hits.includes('papa'),  w + 'px signed out: Papa Parse is NOT requested', hits.join(',') || 'no hits');
    await ctx.close();
  }

  /* ── B. the markup carries no eager tag for either ───────────────────── */
  console.log('\nB  neither is a plain tag in the document any more');
  ok(!/<script[^>]+src="[^"]*chart\.umd\.min\.js"/.test(APP), 'no eager Chart.js tag in the markup');
  ok(!/<script[^>]+src="[^"]*papaparse\.min\.js"/.test(APP),  'no eager Papa Parse tag in the markup');
  ok(/<script[^>]+src="[^"]*supabase-js@2"/.test(APP),
     '  · supabase-js is STILL eager — the app cannot boot without it');

  /* ── C. opening Reports loads Chart.js and draws ─────────────────────── */
  console.log('\nC  a report loads it, and the charts actually draw');
  {
    const hits = [];
    const ctx = await browser.newContext({ viewport:{ width:1194, height:900 } });
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await wire(page, hits, false);
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3000);
    ok(!hits.includes('chart'), 'still not fetched after a signed-IN boot', hits.join(',') || 'no hits');

    const drove = await page.evaluate(async () => {
      if (typeof window.rptChart !== 'function') return 'rptChart is not reachable';
      const c = document.createElement('canvas'); c.id = 'gate1214canvas';
      document.body.appendChild(c);
      window.rptChart('gate1214canvas', { type:'bar', data:{ labels:['a'], datasets:[{ data:[1] }] } });
      for (let i = 0; i < 60 && !window.__charts; i++) await new Promise(r => setTimeout(r, 100));
      return { charts: window.__charts || 0, hasChart: typeof window.Chart !== 'undefined' };
    });
    if (typeof drove === 'string') { ok(false, 'the reports chart builder is reachable', drove); }
    else {
      ok(hits.includes('chart'), 'ASKING FOR A CHART FETCHES Chart.js', hits.join(',') || 'never fetched');
      ok(drove.hasChart === true, '  · and the library is in the page afterwards');
      ok(drove.charts >= 1, '  · and a chart was actually constructed', 'charts=' + drove.charts);
    }
    /* the memoised promise means a second chart does NOT refetch */
    const before = hits.filter(h => h === 'chart').length;
    await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.id = 'gate1214canvas2';
      document.body.appendChild(c);
      window.rptChart('gate1214canvas2', { type:'line', data:{ labels:['a'], datasets:[{ data:[1] }] } });
      await new Promise(r => setTimeout(r, 400));
    });
    ok(hits.filter(h => h === 'chart').length === before,
       '  · a second chart reuses it — one fetch, not seven', 'fetches=' + hits.filter(h => h === 'chart').length);
    await ctx.close();
  }

  /* ── D. the loaders exist and the killer guard is gone ───────────────── */
  console.log('\nD  the importer no longer refuses itself');
  ok(APP.includes('await ensurePapa();'),
     'openImportModal awaits the loader instead of checking a global');
  ok(!APP.includes("typeof Papa === 'undefined'"),
     'THE REFUSE-ON-FIRST-USE GUARD IS GONE — it would have killed the importer every time');
  ok(APP.includes('function ensurePapa() {') && APP.includes('function ensureChart(){'),
     'both memoised loaders are present');
  ok(APP.includes('function ensureXLSX() {'), '  · and the SheetJS loader they copy is untouched');

  /* ── E. the stale-node trap the lazy load introduces ─────────────────── */
  console.log('\nE  the canvas is re-queried after the load, never held across it');
  {
    const i = APP.indexOf('function rptChart(id, cfg){');
    const j = APP.indexOf('\nfunction rptRepName(', i);
    const fn = APP.slice(i, j);
    ok(i > 0 && j > i && fn.length > 200, 'the function was extracted', fn.length + ' chars');
    const iThen = fn.indexOf('ensureChart().then');
    const iLook = fn.indexOf('var el = document.getElementById(id);');
    ok(iThen > 0 && iLook > iThen,
       'the lookup happens INSIDE the callback, after the load',
       'then@' + iThen + ' lookup@' + iLook);
    ok(fn.split('var el = document.getElementById(id);').length - 1 === 1,
       '  · and exactly once, so no earlier reference survives');
  }
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

console.log('');
ok(checks >= 16, 'coverage floor: ' + checks + ' checks ran (>= 16)');
console.log('\n' + (fails === 0 ? `GATE 1214 GREEN — ${checks} checks passed`
                                : `GATE 1214 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
