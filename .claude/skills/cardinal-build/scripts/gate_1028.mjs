/* gate_1028.mjs — build 1028: the AI moves inside the estimate editor.
 * Chromium rig, /api/caption MOCKED. Proves on the seeded draft (e3) with two
 * injected photos (one uncaptioned, one rep-captioned):
 *   [fill]   the empty caption gets the AI caption; the rep's caption is NEVER
 *            overwritten (asserted in BOTH sweeps = the fill-not-overwrite x3);
 *   [append] the overview lands at the END of Scope Notes after the rep's text,
 *            and alone when notes were empty;
 *   [cover]  with no star, the AI's cover_index is honored; with the rep's star
 *            set, the AI's nomination is IGNORED;
 *   [wire]   the request carried BOTH photos as data URLs + existing captions;
 *   [doors]  the walls have no new-ai door, "+ New estimate" is the primary,
 *            showList didn't throw (lanes render); #pAiEstimateBtn is gone;
 *            the admin App Walk no longer walks the AI door;
 *   [api]    api/caption.js carries the estimateAssist branch.
 * Run:  node gate_1028.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1028: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1028.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const MOCK = { overview: 'AI OVERVIEW SENTENCE.', captions: ['AI CAP ONE', 'AI CAP TWO'], cover_index: 1, via: 'mock' };

/* photos + notes ride in gate-side, AFTER the seed — the shared walk stays clean */
const inject = (coverOnFirst, presetNotes) => `(function(){
  var t = window.__SEED__ && window.__SEED__.estimates;
  if (!t) throw new Error('gate_1028: __SEED__.estimates missing');
  var e3 = t.filter(function(r){ return r.status === 'draft'; })[0];
  if (!e3) throw new Error('gate_1028: no draft row in seed');
  e3.photos = [
    { url: 'https://sentinel.test/ph1.png', caption: ''${coverOnFirst ? ', cover: true' : ''} },
    { url: 'https://sentinel.test/ph2.png', caption: 'Rep wrote this' },
  ];
  e3.notes = ${JSON.stringify(presetNotes)};
})();`;

async function editorSweep(html, coverOnFirst, presetNotes) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  const capReqs = [];
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && /\/api\/caption$/.test(u)) {
      try { capReqs.push(JSON.parse(r.request().postData() || '{}')); } catch (_) { capReqs.push({}); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK) });
    }
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.addInitScript(inject(coverOnFirst, presetNotes));
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await page.waitForTimeout(600);

  const out = { reqs: capReqs };
  out.btn = await page.evaluate(`(function(){
    var b = document.querySelector('#cr-est-view [data-act="ai-assist"]');
    return b ? b.textContent.trim() : null;
  })()`);
  if (out.btn == null) { await browser.close(); return out; }

  await page.evaluate(`(function(){ document.querySelector('#cr-est-view [data-act="ai-assist"]').click(); })()`);
  /* the assist awaits two photo fetches + the POST; poll for the render */
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const done = await page.evaluate(`(function(){
      var n = document.querySelector('#cr-est-view [data-f="notes"]');
      return !!(n && n.value.indexOf('AI OVERVIEW') !== -1);
    })()`);
    if (done) break;
  }
  Object.assign(out, await page.evaluate(`(function(){
    var caps = {};
    document.querySelectorAll('#cr-est-view .cr-est-photo').forEach(function(el){
      caps[el.dataset.pi] = {
        caption: (el.querySelector('.caption') || {}).value || '',
        cover: el.classList.contains('is-cover'),
      };
    });
    var n = document.querySelector('#cr-est-view [data-f="notes"]');
    return { caps: caps, notes: n ? n.value : 'MISSING' };
  })()`));
  await browser.close();
  return out;
}

async function doorsSweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.evaluate(`Promise.resolve(window.__sentinelStates[0].run())`);
  await page.waitForTimeout(700);
  const walls = await page.evaluate(`(function(){
    var m = document.getElementById('cr-estimates-mount');
    var nm = m && m.querySelector('[data-act="new-manual"]');
    return {
      newAi: !!(m && m.querySelector('[data-act="new-ai"]')),
      newManualTxt: nm ? nm.textContent.trim() : 'MISSING',
      newManualPrimary: !!(nm && nm.classList.contains('primary')),
      lanes: m ? m.querySelectorAll('[data-cre-lanes] .cre-lane').length : 0,
    };
  })()`);
  await page.evaluate(`Promise.resolve(window.__sentinelStates[4].run())`);
  await page.waitForTimeout(800);
  const prof = await page.evaluate(`(function(){
    return {
      pAi: !!document.getElementById('pAiEstimateBtn'),
      estMenu: !!document.getElementById('pEstMenu'),
    };
  })()`);
  await browser.close();
  return { walls, prof };
}

function judgeEditor(tag, a, b) {
  const fails = [];
  if (a.btn == null) { fails.push('no [data-act="ai-assist"] button in the editor'); return fails; }
  /* sweep A: no star — fill, append, honor cover_index */
  if (a.caps['0'] && a.caps['0'].caption !== 'AI CAP ONE') fails.push(`empty caption not filled: ${JSON.stringify(a.caps['0'])}`);
  if (a.caps['1'] && a.caps['1'].caption !== 'Rep wrote this') fails.push(`rep caption OVERWRITTEN (A): ${JSON.stringify(a.caps['1'])}`);
  if (a.notes !== 'Existing scope note.\n\nAI OVERVIEW SENTENCE.') fails.push(`overview did not APPEND: ${JSON.stringify(a.notes)}`);
  if (!a.caps['1'] || !a.caps['1'].cover) fails.push('cover_index 1 not honored when nothing starred');
  if (a.caps['0'] && a.caps['0'].cover) fails.push('cover landed on photo 0 despite cover_index 1');
  const req = a.reqs[0];
  if (!req) fails.push('no request reached /api/caption');
  else {
    if (!Array.isArray(req.images) || req.images.length !== 2) fails.push(`request images: ${req.images && req.images.length}`);
    else if (!req.images.every(u => /^data:image\//.test(u))) fails.push('request images are not data URLs');
    if (!req.captions || req.captions[1] !== 'Rep wrote this') fails.push('existing captions not sent as context');
  }
  /* sweep B: rep's star set — never moved; empty notes get the overview alone */
  if (b.caps['0'] && !b.caps['0'].cover) fails.push('rep-starred cover was MOVED (B)');
  if (b.caps['1'] && b.caps['1'].cover) fails.push('AI nomination overrode the rep star (B)');
  if (b.caps['1'] && b.caps['1'].caption !== 'Rep wrote this') fails.push('rep caption OVERWRITTEN (B)');
  if (b.notes !== 'AI OVERVIEW SENTENCE.') fails.push(`empty notes should hold overview alone: ${JSON.stringify(b.notes)}`);
  return fails;
}

function judgeDoors(d, html) {
  const fails = [];
  if (d.walls.newAi) fails.push('walls still render the [data-act="new-ai"] door');
  if (d.walls.newManualTxt !== '+ New estimate') fails.push(`new-manual label: ${JSON.stringify(d.walls.newManualTxt)}`);
  if (!d.walls.newManualPrimary) fails.push('new-manual is not the primary button');
  if (d.walls.lanes < 3) fails.push(`walls lanes ${d.walls.lanes} — showList likely threw`);
  if (d.prof.pAi) fails.push('#pAiEstimateBtn still rendered on the client profile');
  if (!d.prof.estMenu) fails.push('#pEstMenu missing — the door removal took its neighbour');
  if (html.includes("name  : 'Tap + New AI'")) fails.push('the admin App Walk still walks the AI door');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const A = await editorSweep(html, false, 'Existing scope note.');
const B = await editorSweep(html, true, '');
const D = await doorsSweep(html);
const fails = [...judgeEditor('artifact', A, B), ...judgeDoors(D, html)];
const api = readFileSync(new URL('../../../../api/caption.js', import.meta.url).pathname, 'utf8');
if (!api.includes('function estimateAssist') || !api.includes('images')) fails.push('api/caption.js lacks the estimateAssist mode');
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1028 RED — ${fails.length} failure(s)` : 'GATE 1028 GREEN — fill/append/cover x2, wire, doors, walk, api');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cA = await editorSweep(chtml, false, 'Existing scope note.');
  const cB = await editorSweep(chtml, true, '');
  const cD = await doorsSweep(chtml);
  const cfails = [...judgeEditor('control', cA, cB), ...judgeDoors(cD, chtml)];
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
