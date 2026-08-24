/* gate_1056.mjs — the chase clock counts to a deadline, and you can reset it.
 *
 * Drives the REAL insurance hub in Chromium against the seeded mock and proves
 * BEHAVIOUR, not CSS:
 *
 *   1  every chase row says what it is counting to, not a bare number
 *   2  the wording is right for all three states — overdue, chased-recently,
 *      and the awaiting-release reason with its own longer policy
 *   3  the list sorts by HOW OVERDUE, so a 40-day claim chased two days ago
 *      falls BELOW a 20-day one nobody has touched (raw age says the opposite,
 *      which is exactly what the old sort did)
 *   4  "I chased them" is a real 44px control and only appears with a claim id
 *   5  clicking it writes BOTH halves — a claim_notes row AND last_chased_at —
 *      asserted on the RECORDED WRITES, not on the button's own state
 *   6  cancelling the prompt writes NOTHING
 *   7  the new ink clears the floor in BOTH insurance themes
 *
 * Run:  node gate_1056.mjs <artifact> [--control <prev>]
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
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1056.mjs <artifact> [--control <prev>]'); process.exit(2); }
const SK = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const CARD = readFileSync(SK + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK = readFileSync(SK + 'e2e_mock_supa.js', 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* Dates are computed IN THE PAGE from Date.now(), never hardcoded — a fixed
   ISO string makes the expected day count drift by one every midnight and the
   gate starts failing correct code on a calendar boundary. */
const SEED = `(function(){ if(!window.__SEED__) return;
  function ago(d){ return new Date(Date.now() - d*86400000).toISOString(); }
  function proj(id, name, stage, upd){
    return { id:id, name:name, address:'1 Test Way', city:'Kettering', state:'OH',
      zip:'45429', stage:stage, created_by:'theo@cardinalrenovations.net',
      sales_rep:null,
      checklist: JSON.stringify({ po:9000, job_category:'Residential',
        work_type:'Insurance', lead:{ assigned:[], claim_type:'insurance',
          insurance:{ carrier:'x', claim_number:'x', deductible:1000 } } }),
      phone:'937-555-0100', email:null, crm:'retail',
      created_at: ago(120), updated_at: upd, stage_since: upd };
  }
  /* RENFREW  supplement filed 20d ago, never chased -> policy first=14 -> +6 over
     ALVAREZ  supplement filed 40d ago, chased  2d ago -> policy again=7 -> -5 (not due)
     BOYD     Invoiced, sitting 25d,    never chased -> policy first=21 -> +4 over
     Raw age order is ALVAREZ(40) > BOYD(25) > RENFREW(20).
     Overdue order is RENFREW(+6) > BOYD(+4) > ALVAREZ(-5).
     The two orders disagree on purpose — that is the whole point of check 3. */
  window.__SEED__.projects.push(proj('p-ren','Renfrew','Prospect', ago(20)));
  window.__SEED__.projects.push(proj('p-alv','Alvarez','Prospect', ago(40)));
  window.__SEED__.projects.push(proj('p-boy','Boyd','Invoiced',   ago(25)));
  window.__SEED__.insurance_claims = [
    { id:'c-ren', project_id:'p-ren', carrier:'State Farm',
      supplement_status:'filed', supplement_filed:4200, supplement_filed_at:ago(20),
      last_chased_at:null, last_chased_by:null,
      approved_rcv:0, approved_acv:0, approved_depreciation:0, first_scope_rcv:0,
      deductible:1000, deductible_waived:false, supplement_approved:0 },
    { id:'c-alv', project_id:'p-alv', carrier:'Allstate',
      supplement_status:'filed', supplement_filed:9100, supplement_filed_at:ago(40),
      last_chased_at:ago(2), last_chased_by:'theo@cardinalrenovations.net',
      approved_rcv:0, approved_acv:0, approved_depreciation:0, first_scope_rcv:0,
      deductible:1000, deductible_waived:false, supplement_approved:0 },
    { id:'c-boy', project_id:'p-boy', carrier:'Erie',
      supplement_status:'none', supplement_filed:0, supplement_filed_at:null,
      last_chased_at:null, last_chased_by:null,
      approved_rcv:30000, approved_acv:24000, approved_depreciation:6000,
      first_scope_rcv:28000, deductible:1000, deductible_waived:false,
      supplement_approved:0 }
  ];
  window.__SEED__.claim_notes = [];
})();`;

const ROWS = `(function(){
  var host = document.querySelector('#cardinalTruthView .ins-body');
  if(!host) return { missing:'ins-body' };
  var wraps = [...host.querySelectorAll('.cr-cth-chasewrap')];
  var legacy = [...host.querySelectorAll('.cr-cth-chaserow')];
  var read = function(scope){
    var who = scope.querySelector('.who');
    var due = scope.querySelector('.duetxt');
    var btn = scope.querySelector('.cr-cth-chasedid') ||
              (scope.parentElement && scope.parentElement.querySelector
                 ? scope.parentElement.querySelector('.cr-cth-chasedid') : null);
    var r = btn ? btn.getBoundingClientRect() : null;
    return {
      name : who ? (who.querySelector('b') ? who.querySelector('b').textContent.trim() : '') : '',
      sub  : who ? (who.textContent || '').replace(/\\s+/g,' ').trim() : '',
      due  : due ? (due.textContent || '').trim() : null,
      stale: !!(scope.closest && scope.closest('.cr-cth-chasewrap')
                && scope.closest('.cr-cth-chasewrap').classList.contains('stale')),
      btnH : r ? Math.round(r.height) : null,
      btnId: btn ? btn.dataset.chased : null
    };
  };
  var list = (wraps.length ? wraps : legacy).map(function(el){
    return read(el.classList.contains('cr-cth-chasewrap')
      ? (el.querySelector('.cr-cth-chaserow') || el) : el);
  });
  return { wraps:wraps.length, rows:list };
})`;

async function open(file, theme) {
  const HTML = readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch({ args:['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport:{ width:390, height:900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG1 });
    return r.fulfill({ status:200, body:'' }); });
  /* the insurance CRM's own key — it stamps document.body with data-rltheme */
  if (theme) await ctx.addInitScript(`try{localStorage.setItem('cardinalRLTheme',${JSON.stringify(theme)});}catch(e){}`);
  await page.addInitScript(CARD); await page.addInitScript(SEED); await page.addInitScript(MOCK);
  await page.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.evaluate(`(function(){ var l=document.getElementById('landingView'); if(l) l.style.display='none'; })()`);
  await page.evaluate(`(function(){ if(typeof showCardinalTruth==='function') showCardinalTruth(); })()`);
  await page.waitForTimeout(1400);
  return { browser, ctx, page };
}

async function judge(file) {
  const f = [];
  const { browser, ctx, page } = await open(file, 'docket');

  const st = await page.evaluate(`(${ROWS})()`);
  if (st.missing) { f.push(`the hub body never rendered (rig fault — proves nothing): ${st.missing}`); await ctx.close(); await browser.close(); return f; }
  const by = {};
  st.rows.forEach(r => { by[r.name] = r; });
  for (const n of ['Renfrew','Alvarez','Boyd']) {
    if (!by[n]) f.push(`no chase row for ${n} (rig fault — proves nothing; got ${st.rows.map(r=>r.name).join(', ') || 'nothing'})`);
  }
  if (f.length) { await ctx.close(); await browser.close(); return f; }

  /* 1+2 — the wording */
  for (const n of ['Renfrew','Alvarez','Boyd']) {
    if (by[n].due == null) f.push(`the ${n} row shows a bare day count with nothing saying what it is counting to`);
  }
  if (by.Renfrew.due != null && !/6 days overdue/.test(by.Renfrew.due))
    f.push(`Renfrew is 20 days on a 14-day policy and reads ${JSON.stringify(by.Renfrew.due)} — expected "6 days overdue"`);
  if (by.Boyd.due != null && !/4 days overdue/.test(by.Boyd.due))
    f.push(`Boyd is 25 days awaiting release on a 21-day policy and reads ${JSON.stringify(by.Boyd.due)} — expected "4 days overdue"`);
  if (by.Alvarez.due != null && !/chased 2d ago/.test(by.Alvarez.due))
    f.push(`Alvarez was chased 2 days ago and its row does not say so — reads ${JSON.stringify(by.Alvarez.due)}`);
  if (by.Alvarez.due != null && !/next in 5/.test(by.Alvarez.due))
    f.push(`Alvarez should be counting to the 7-day FOLLOW-UP interval ("next in 5") — reads ${JSON.stringify(by.Alvarez.due)}`);

  /* the red must mean past-the-policy, not past a hardcoded 30 */
  if (by.Alvarez.stale) f.push('Alvarez is 40 days old but was chased 2 days ago — it must NOT be marked stale');
  if (!by.Renfrew.stale) f.push('Renfrew is 6 days past its policy and is not marked stale');
  if (!by.Boyd.stale)    f.push('Boyd is 4 days past its policy and is not marked stale');

  /* 3 — sorted by overdue, not raw age */
  const order = st.rows.map(r => r.name).filter(n => ['Renfrew','Alvarez','Boyd'].includes(n));
  if (order.indexOf('Alvarez') !== order.length - 1)
    f.push(`sorted ${order.join(' > ')} — Alvarez is the oldest at 40 days but was just chased, so it must sort LAST`);
  if (order.indexOf('Renfrew') > order.indexOf('Boyd'))
    f.push(`sorted ${order.join(' > ')} — Renfrew (+6 over) must sort above Boyd (+4 over)`);

  /* 4 — the control exists and clears the 44px floor */
  for (const n of ['Renfrew','Alvarez','Boyd']) {
    if (!by[n].btnId) { f.push(`the ${n} row has no "I chased them" control — the chase cannot be recorded`); continue; }
    if (by[n].btnH != null && by[n].btnH < 44)
      f.push(`${n}'s "I chased them" is ${by[n].btnH}px tall, under the 44px floor`);
  }

  /* 4b — nothing on the row is clipped to an ellipsis.
   *
   * ⚠ ADDED AFTER A SCREENSHOT, NOT AFTER A FAILURE. Every assertion above
   * reads textContent, which is the FULL string however narrow the box is —
   * so the first build passed all of them while the screen actually showed
   * "6 days ov…" and "chased 2d …". Measured: the new button took .who from
   * 185px to 70px. scrollWidth vs clientWidth is the difference a picture
   * can see and textContent cannot. */
  const clip = await page.evaluate(`(function(){
    var out = [];
    document.querySelectorAll('.cr-cth-chaserow').forEach(function(r){
      var nm = r.querySelector('.who b');
      ['.who small', '.duetxt'].forEach(function(sel){
        r.querySelectorAll(sel).forEach(function(e){
          if(e.scrollWidth > Math.ceil(e.getBoundingClientRect().width) + 1)
            out.push((nm ? nm.textContent.trim() : '?') + ' ' + sel + ' "' +
                     (e.textContent||'').trim() + '" needs ' + e.scrollWidth +
                     'px in ' + Math.round(e.getBoundingClientRect().width) + 'px');
        });
      });
    });
    return out;
  })()`);
  clip.forEach(c => f.push(`clipped to an ellipsis on a 390px phone — ${c}`));

  /* 6 — CANCEL FIRST, so a leaked write from it cannot be mistaken for check 5 */
  await page.evaluate(`(function(){ window.__WRITES__ = []; window.prompt = function(){ return null; }; })()`);
  await page.evaluate(`(function(){ var b=document.querySelector('[data-chased="c-ren"]'); if(b) b.click(); })()`);
  await page.waitForTimeout(700);
  const cancelled = await page.evaluate(`(window.__WRITES__||[]).map(function(w){ return w.table+':'+w.op; })`);
  if (cancelled.length)
    f.push(`cancelling the prompt still wrote ${cancelled.join(', ')} — a cancelled chase must write nothing`);

  /* 5 — the real thing, asserted on the recorded writes */
  await page.evaluate(`(function(){ window.__WRITES__ = []; window.prompt = function(){ return 'called State Farm, left a message'; }; })()`);
  await page.evaluate(`(function(){ var b=document.querySelector('[data-chased="c-ren"]'); if(b) b.click(); })()`);
  await page.waitForTimeout(1400);
  const w = await page.evaluate(`(window.__WRITES__||[]).map(function(x){
    return { table:x.table, op:x.op, payload:x.payload };
  })`);
  const note = w.find(x => x.table === 'claim_notes' && x.op === 'insert');
  const stamp = w.find(x => x.table === 'insurance_claims' && x.op === 'update');
  if (!note) f.push(`no claim_notes row was written — the human record of the chase is lost (wrote: ${w.map(x=>x.table+':'+x.op).join(', ') || 'nothing'})`);
  else {
    const body = String(note.payload && note.payload.body || '');
    if (!/called State Farm, left a message/.test(body))
      f.push(`the claim_notes body does not carry what the user typed: ${JSON.stringify(body)}`);
    if (!/State Farm/.test(body)) f.push('the claim_notes body does not name the carrier');
    if (note.payload && note.payload.claim_id !== 'c-ren')
      f.push(`the note was filed against ${JSON.stringify(note.payload && note.payload.claim_id)} instead of c-ren`);
  }
  if (!stamp) f.push('last_chased_at was never stamped — the clock will keep nagging about a call that was made');
  else if (!(stamp.payload && stamp.payload.last_chased_at))
    f.push(`the claim update carries no last_chased_at: ${JSON.stringify(stamp.payload)}`);

  /* and the row must now say so, without a reload */
  await page.waitForTimeout(600);
  const after = await page.evaluate(`(${ROWS})()`);
  const ren2 = (after.rows || []).find(r => r.name === 'Renfrew');
  if (ren2 && ren2.due != null && !/chased today/.test(ren2.due))
    f.push(`after recording a chase the Renfrew row still reads ${JSON.stringify(ren2.due)} — it should say it was chased today`);
  if (ren2 && ren2.stale)
    f.push('Renfrew is still marked stale immediately after being chased');

  await ctx.close(); await browser.close();

  /* 7 — the new ink clears the floor in BOTH insurance themes */
  for (const theme of ['docket', 'siren']) {
    const o = await open(file, theme);
    const m = await o.page.evaluate(`(function(){
      function px(v){ var m=String(v).match(/(\\d+),\\s*(\\d+),\\s*(\\d+)/); return m?[+m[1],+m[2],+m[3]]:null; }
      var applied = document.body.getAttribute('data-rltheme');
      var wrap = document.querySelector('.cr-cth-chasewrap.stale');
      var due  = wrap ? wrap.querySelector('.duetxt') : null;
      var btn  = wrap ? wrap.querySelector('.cr-cth-chasedid') : null;
      function ground(el){
        var n = el, seen = null;
        while(n && n !== document.documentElement){
          var c = px(getComputedStyle(n).backgroundColor);
          var a = parseFloat((getComputedStyle(n).backgroundColor.match(/[\\d.]+\\)$/)||['1)'])[0]);
          if(c && a === 1){ seen = c; break; }
          n = n.parentElement;
        }
        return seen || px(getComputedStyle(document.body).backgroundColor);
      }
      return { applied:applied,
        due : due ? { ink:px(getComputedStyle(due).color), bg:ground(due) } : null,
        btn : btn ? { ink:px(getComputedStyle(btn).color), bg:px(getComputedStyle(btn).backgroundColor) } : null };
    })()`);
    const L = c => { const f2 = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
      return 0.2126*f2(c[0]) + 0.7152*f2(c[1]) + 0.0722*f2(c[2]); };
    const cr = (a,b) => { const l1=L(a), l2=L(b); const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
    if (m.applied !== theme) f.push(`asked for the ${theme} insurance theme and body says ${JSON.stringify(m.applied)} (rig fault — proves nothing)`);
    if (!m.due) f.push(`no overdue chase row rendered in ${theme} — the contrast check measured nothing`);
    else if (m.due.ink && m.due.bg) {
      const r = cr(m.due.ink, m.due.bg);
      if (r < 4.5) f.push(`the overdue wording is ${r.toFixed(2)}:1 in the ${theme} theme (floor 4.5)`);
    }
    if (!m.btn) f.push(`no "I chased them" control rendered in ${theme} — the contrast check measured nothing`);
    else if (m.btn.ink && m.btn.bg) {
      const r = cr(m.btn.ink, m.btn.bg);
      if (r < 4.5) f.push(`"I chased them" is ${r.toFixed(2)}:1 in the ${theme} theme (floor 4.5)`);
    }
    await o.ctx.close(); await o.browser.close();
  }
  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1056 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1056 GREEN — rows name their deadline, sort by overdue, and a chase writes both halves');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 30).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
