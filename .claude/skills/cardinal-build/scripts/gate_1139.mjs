/* gate_1139.mjs — build 1139: pin your own default assembly.
 *
 * A star on YOUR saved assemblies sets it as your default; the default pins to
 * a top "★ My Default" group in the +Assembly picker. Per-user (is_default on
 * estimate_assemblies), one default enforced app-side (clears the others).
 *
 * Proves in Chromium (real picker, real star): a saved assembly of mine shows
 * a star, tapping it writes is_default=true (and clears my prior default),
 * re-renders with my pick in the "★ My Default" group at the TOP, and an
 * assembly that is NOT mine shows no star. Control (1138 tree): RED — no star.
 * Run: node gate_1139.mjs [artifact]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1139: playwright not found'); process.exit(2); }
const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const FILE = process.argv[2] || REPO + 'index.html';
if (!existsSync(FILE)) { console.error('usage: node gate_1139.mjs [index.html]'); process.exit(2); }
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'].map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const html = readFileSync(FILE, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 414, height: 896 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
  : r.fulfill({ status: 200, body: '' }));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

let r;
try { r = await page.evaluate(`(async function(){
  if (typeof openProject === 'function') openProject('p1');
  await new Promise(res => setTimeout(res, 600));
  const ME = (typeof myEmail === 'function') ? myEmail() : 'theo@cardinalrenovations.net';

  /* seed the assemblies table: two mine (one already default), one someone else's */
  let ROWS = [
    { id:'a-mine1', name:'My Full Roof', trade:'Roofing', created_by: ME, is_default:false,
      lines:[{ name:'Tear-off', qty:1, unit:'SQ', unit_price:0 }, { name:'Duration', qty:1, unit:'SQ', unit_price:0 }] },
    { id:'a-mine2', name:'My Repair Kit', trade:'Repair', created_by: ME, is_default:true,
      lines:[{ name:'Patch', qty:1, unit:'EA', unit_price:0 }] },
    { id:'a-theirs', name:'Nick Siding', trade:'Siding', created_by:'nick@cardinalrenovations.net', is_default:false,
      lines:[{ name:'D4', qty:1, unit:'SQ', unit_price:0 }] }
  ];
  let updates = [];
  const realFrom = window.supa.from.bind(window.supa);
  window.supa.from = function(t){
    if (t !== 'estimate_assemblies') return realFrom(t);
    const st = { patch:null, flt:{} };
    const api = {
      select(){ return api; },
      order(){ return Promise.resolve({ data: ROWS.map(x => Object.assign({}, x)), error:null }); },
      update(p){ st.patch = p; return api; },
      eq(c, v){ st.flt[c] = v; return api; },
      /* thenable: an awaited update().eq().eq() applies the patch to matching rows */
      then(res){
        if (st.patch) ROWS.forEach(row => {
          let m = true; for (const k in st.flt) if (String(row[k]) !== String(st.flt[k])) m = false;
          if (m) { Object.assign(row, st.patch); updates.push({ patch: st.patch, flt: Object.assign({}, st.flt) }); }
        });
        res({ data:null, error:null });
      }
    };
    return api;
  };
  /* open the editor, then the REAL +Assembly button — openPicker('assembly')
     calls loadAssemblies() itself (against the mock installed above) and
     renders the picker. No module-private call from the gate. */
  await window.CardinalEstimates.openEditor('p1', { project_id:'p1', title:'X', itemized:false, line_items:[], status:'draft' });
  await new Promise(res => setTimeout(res, 600));
  const addBtn = document.querySelector('#cr-est-view [data-act="add-assembly"]');
  if (!addBtn) return { rig: 'no +Assembly button' };
  addBtn.click();
  await new Promise(res => setTimeout(res, 700));
  const picker = document.getElementById('cr-est-picker');
  if (!picker || !picker.querySelector('.asm-card')) return { rig: 'picker did not render assemblies' };
  const out = { errs: [] };
  const cardOf = id => picker.querySelector('.asm-card[data-aid="'+id+'"]');
  out.mineHasStar   = !!(cardOf('a-mine1') && cardOf('a-mine1').querySelector('[data-apin]'));
  out.theirsNoStar  = !!(cardOf('a-theirs') && !cardOf('a-theirs').querySelector('[data-apin]'));
  /* the current default (a-mine2) should sit in the top group */
  const groups = [...picker.querySelectorAll('.asm-grouphd')].map(h => h.textContent.trim());
  out.topGroup = groups[0] || '';
  out.mine2InTop = (() => { const g = picker.querySelector('.asm-group'); return !!(g && g.querySelector('.asm-card[data-aid="a-mine2"]')); })();

  /* now star a-mine1 → it should become the default, a-mine2 cleared */
  const star1 = cardOf('a-mine1') && cardOf('a-mine1').querySelector('[data-apin]');
  if (!star1) { out.mine1NowDefault = false; out.mine2Cleared = false; out.updateCount = 0; out.mine1PinnedTop = false; return out; }
  star1.click();
  await new Promise(res => setTimeout(res, 600));
  out.mine1NowDefault = ROWS.find(x => x.id==='a-mine1').is_default === true;
  out.mine2Cleared    = ROWS.find(x => x.id==='a-mine2').is_default === false;
  out.updateCount = updates.length;
  const g2 = document.getElementById('cr-est-picker').querySelector('.asm-group');
  out.mine1PinnedTop = !!(g2 && g2.querySelector('.asm-card[data-aid="a-mine1"]'));
  return out;
})()`); } catch (e) { console.log('  FAIL rig fault — proves nothing: ' + String(e).split('\n')[0]); await browser.close(); process.exit(1); }
await browser.close();

if (r.rig) { console.log('  FAIL rig fault — proves nothing: ' + r.rig); process.exit(1); }
const fails = [];
if (!r.mineHasStar) fails.push('my saved assembly has no star');
if (!r.theirsNoStar) fails.push("someone else's assembly shows a star — must be mine-only");
if (!/My Default/.test(r.topGroup)) fails.push(`top group is "${r.topGroup}", want the ★ My Default group`);
if (!r.mine2InTop) fails.push('the current default did not sit in the top group');
if (!r.mine1NowDefault) fails.push('starring did not set is_default=true on the tapped assembly');
if (!r.mine2Cleared) fails.push('the previous default was not cleared — two defaults');
if (!r.mine1PinnedTop) fails.push('after starring, the new default is not pinned to the top');
if (errs.length) fails.push('page errors: ' + errs.slice(0, 2).join(' | '));
for (const f of fails) console.log('  FAIL ' + f);
console.log('  detail: ' + JSON.stringify(r));
console.log(fails.length ? `GATE 1139 RED — ${fails.length} failure(s)` : 'GATE 1139 GREEN — 7 checks');
process.exit(fails.length ? 1 : 0);
