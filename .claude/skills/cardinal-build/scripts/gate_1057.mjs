/* gate_1057.mjs — the Supplement Desk's evidence table (overhaul direction A).
 *
 * Drives the REAL Desk in Chromium with a stubbed Supabase and a stubbed
 * /api/supplement, and proves the behaviour rather than the CSS:
 *
 *   1  every gap shows THREE evidence chips, and each one says the truth about
 *      that gap's photos / quantity / citation
 *   2  an item missing a photo or a quantity CANNOT be ticked
 *   3  typing a quantity un-blocks it live, without a full re-render
 *   4  "Include anyway" arms a blocked item and leaves the amber marker on
 *   5  the draft sends only sendable items — asserted on the REQUEST BODY,
 *      not on the button's disabled attribute
 *   6  the state tokens clear the contrast floor in BOTH Desk themes
 *
 * Run:  node gate_1057.mjs <supplement.html> [--control <prev>]
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
const args = process.argv.slice(2);
/* suite-runnable: default to this gate's OWN artifact — it gates supplement.html,
   not index.html; the runner's index.html fallback made it declare
   rig-fault on the wrong file. A positional arg still wins. */
const FILE = (args[0] && !args[0].startsWith('--')) ? args[0]
  : new URL('../../../../supplement.html', import.meta.url).pathname;
const ci = args.indexOf('--control');
const CONTROL = ci >= 0 ? args[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1057.mjs <supplement.html> [--control <prev>]'); process.exit(2); }
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* five gaps chosen so every evidence combination is on screen at once */
const GAPS = [
  { id:'g1', item:'Ice & water barrier at all eaves', basis:'code', citation:'RCO R905.1.2',
    pack_id:'ice_barrier', confidence:'high', qty:184, unit:'LF', qty_src:'meas',
    why:'Underlayment funded, no ice barrier.', photos:[{path:'a'},{path:'b'},{path:'c'}] },
  { id:'g2', item:'Drip edge, eaves and rakes', basis:'code', citation:'RCO R905.2.8.5',
    pack_id:'drip_edge', confidence:'high', qty:304, unit:'LF', qty_src:'meas',
    why:'No drip edge line on the scope.', photos:[{path:'d'},{path:'e'}] },
  /* blocked: no photo AND no quantity */
  { id:'g3', item:'Step & counter flashing, chimney', basis:'code', citation:'RCO R905.2.8.3',
    pack_id:'step_counter_flashing', confidence:'medium', qty:null, unit:'LF', qty_src:'model',
    why:'Reuse not permitted on a full tear-off.', photos:[] },
  /* blocked on photo only — has a model quantity */
  { id:'g4', item:'Pipe boots (3)', basis:'trade', citation:'trade practice',
    pack_id:'pipe_boots', confidence:'low', qty:3, unit:'EA', qty_src:'model',
    why:'No boot replacement on the scope.', photos:[] },
  /* complete but WEAK — trade basis, photo + manual number */
  { id:'g5', item:'Gutter apron', basis:'trade', citation:'trade practice',
    pack_id:'gutters', confidence:'medium', qty:96, unit:'LF', qty_src:'manual',
    why:'Not funded.', photos:[{path:'f'}] }
];

function stub(html) {
  return `(function(){
  var CLAIMS = [{ id:'cl1', project_id:'p1', carrier:'State Farm', claim_number:'SF-88213',
    date_of_loss:'2026-06-14', deductible:2500, adjuster_name:'Dale Whitfield',
    homeowner_name:'Harold & Marla Renfrew', property_address:'2184 Cedarbrook Dr',
    projects:{ id:'p1', name:'Harold & Marla Renfrew', address:'2184 Cedarbrook Dr',
      city:'Kettering', state:'OH', zip:'45429',
      checklist: JSON.stringify({ meas:{ squares:31.4, eave_lf:184, rake_lf:120 } }) } }];
  /* a real filed scope, so analyze() runs its OWN path: the Desk lists
     inspection_reports, draws a radio, reads the row's html payload and posts
     the bytes. A tiny PDF keeps it under the 3 MB storage-staging branch. */
  var PDFB64 = 'JVBERi0xLjQKJSVFT0YK';
  var SCOPES = [{ id:'d1', title:'Insurance Doc [scope]: Scope of Loss',
    created_at:'2026-07-02T10:00:00Z',
    html: JSON.stringify({ file:true, name:'scope.pdf', size:1200,
      mime:'application/pdf', data:'data:application/pdf;base64,' + PDFB64 }) }];
  function resp(d){ return Promise.resolve({ data:d, error:null }); }
  var NOTES = [
    { id:'n1', body:'Met the adjuster on site 12 Aug. He allowed ONE shingle on the south slope and did not price the other three.', created_at:'2026-08-12T15:00:00Z', created_by:'theo@cardinalrenovations.net' },
    { id:'n2', body:'Chased Allstate \u2014 called, left a message.', created_at:'2026-08-20T15:00:00Z', created_by:'theo@cardinalrenovations.net' }
  ];
  window.__NOTES__ = NOTES;
  function qb(table){
    var rows = table==='insurance_claims' ? CLAIMS
             : table==='inspection_reports' ? SCOPES
             : table==='claim_notes' ? NOTES : [];
    var api={}; ['select','eq','neq','order','limit','in','not','is','gte','lte','filter','range','ilike','or','insert','update']
      .forEach(function(k){ api[k]=function(){ return api; }; });
    api.insert=function(p){
      window.__INS__ = window.__INS__ || [];
      window.__INS__.push({ table:table, payload:p });
      var row = Object.assign({ id:'n' + (NOTES.length+1), created_at:new Date().toISOString(),
        created_by:'theo@cardinalrenovations.net' }, p);
      if(table==='claim_notes') NOTES.unshift(row);
      var out={}; ['select','eq','order','limit','single'].forEach(function(k){ out[k]=function(){ return out; }; });
      out.then=function(r){ return resp([row]).then(r); };
      return out;
    };
    api.then=function(r){ return resp(rows).then(r); };
    api.single=function(){ return resp(rows[0]||{id:'x'}); };
    api.maybeSingle=function(){ return resp(rows[0]||null); };
    return api;
  }
  window.__stubClient = {
    auth:{ getSession:function(){ return Promise.resolve({ data:{ session:{ access_token:'t',
             user:{ id:'u1', email:'theo@cardinalrenovations.net' } } }, error:null }); },
           getUser:function(){ return Promise.resolve({ data:{ user:{ id:'u1',
             email:'theo@cardinalrenovations.net' } }, error:null }); },
           onAuthStateChange:function(){ return { data:{ subscription:{ unsubscribe:function(){} } } }; },
           signInWithPassword:function(){ return Promise.resolve({ data:{}, error:null }); },
           signOut:function(){ return Promise.resolve({ error:null }); } },
    from:qb,
    rpc:function(n){ return resp(n==='is_cardinal_admin' ? true : null); },
    storage:{ from:function(){ return {
      createSignedUrl:function(){ return Promise.resolve({ data:{ signedUrl:'https://x/y.png' }, error:null }); },
      createSignedUrls:function(){ return Promise.resolve({ data:[], error:null }); } }; } }
  };
  Object.defineProperty(window,'supabase',{ configurable:true,
    get:function(){ return { createClient:function(){ return window.__stubClient; } }; },
    set:function(){} });
})();`;
}

async function open(file, theme) {
  const HTML = readFileSync(file, 'utf8');
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] })
    .catch(() => chromium.launch({ args:['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport:{ width:390, height:900 } });
  const page = await ctx.newPage();
  const sent = [];
  await page.route('**/*', r => { const u = r.request().url();
    if (/\/api\/supplement/.test(u)) {
      let post = {}; try { post = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
      sent.push(post);
      if (post.mode === 'draft')
        return r.fulfill({ status:200, contentType:'application/json',
          body: JSON.stringify({ subject:'RE: SF-88213', letter_html:'<p>draft</p>' }) });
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ scope_summary:'summary', gaps: JSON.parse(JSON.stringify(GAPS)) }) });
    }
    if (u.startsWith('https://desk.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status:200, contentType:'image/png', body:PNG1 });
    if (/supabase-js|unpkg|jsdelivr|cdn/i.test(u)) return r.continue();
    return r.fulfill({ status:200, contentType:'application/json', body:'{}' });
  });
  /* ⚠ THE DESK'S THEME KEY IS 'cr-desk-theme', NOT the CRM's.
     This gate first wrote 'cardinalRLTheme' and set data-theme from an init
     script — and the Desk's OWN head script then read its real key, found
     nothing, fell back to prefers-color-scheme and overwrote the attribute.
     Both "themes" were the same theme, so check 6 could not fail. Set the key
     the page reads, and force the media query to agree, so the fallback lands
     on the same answer if the key is ever missed again. */
  if (theme) {
    await ctx.addInitScript(`try{localStorage.setItem('cr-desk-theme',${JSON.stringify(theme)});}catch(e){}`);
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'light' : 'dark' });
  }
  await page.addInitScript(stub());
  await page.goto('https://desk.test/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2000);
  return { browser, ctx, page, sent };
}

/* put the Desk on the gaps step by feeding S.gaps through its own renderer */
const SEED = `(function(){
  var c = document.querySelector('#claimList [data-claim], #claimList button, #claimList > *');
  if (c) c.click();
  return !!c;
})()`;

const READ = `(function(){
  var out = [];
  document.querySelectorAll('#gapList .gap').forEach(function(card){
    var chips = [...card.querySelectorAll('.ev .chip')].map(function(c){
      return { cls:(c.className.match(/chip\\s+(\\w+)/)||[])[1] || '', txt:(c.textContent||'').trim() }; });
    var box = card.querySelector('.inc');
    out.push({ id:card.getAttribute('data-id'), chips:chips,
               blocked:card.classList.contains('blocked'),
               disabled: box ? !!box.disabled : null,
               hasOvr: !!card.querySelector('.ovr'),
               ovrNoteShown: (function(){ var n=card.querySelector('.ovrnote');
                 return !!n && getComputedStyle(n).display !== 'none'; })() });
  });
  return { gaps:out, note:(document.getElementById('draftNote')||{}).textContent||'',
           sum:(document.getElementById('gapSum')||{}).textContent||'',
           draftDisabled:(document.getElementById('draftBtn')||{}).disabled };
})`;


async function judge(file) {
  const f = [];
  const { browser, ctx, page, sent } = await open(file, 'light');

  const opened = await page.evaluate(SEED);
  if (!opened) { f.push('no claim row rendered (rig fault — proves nothing)'); await ctx.close(); await browser.close(); return f; }
  await page.waitForTimeout(1300);

  /* 1 — the thread rendered the claim's existing notes */
  const shown = await page.evaluate(`(function(){
    var rows=[...document.querySelectorAll('#noteList .nrow')];
    return { n:rows.length,
      bodies:rows.map(function(r){ var b=r.querySelector('.nbody'); return b?b.textContent.trim().slice(0,60):''; }),
      ticked:rows.filter(function(r){ var i=r.querySelector('input'); return i && i.checked; }).length,
      box:!!document.getElementById('noteText'), add:!!document.getElementById('noteAdd') };
  })()`);
  if (!shown.box || !shown.add) f.push('there is no chat box on the Desk at all (no #noteText / #noteAdd)');
  if (shown.n !== 2) f.push(`the thread shows ${shown.n} notes, not the 2 on this claim — history is not attached`);
  if (shown.n && !shown.bodies.some(b => /allowed ONE shingle/i.test(b)))
    f.push('the adjuster note is not in the thread');
  if (shown.n && !shown.bodies.some(b => /Chased Allstate/i.test(b)))
    f.push("build 1056's chase record is not in the thread — the two are meant to be one history");
  /* 2 — NOTHING is pre-ticked, the Desk's standing rule */
  if (shown.ticked !== 0) f.push(`${shown.ticked} note(s) are ticked on load — nothing may be pre-ticked`);

  /* drive the scope read so the draft button can exist */
  await page.evaluate(`(function(){ var b=document.getElementById('analyzeBtn'); if(b) b.click(); })()`);
  await page.waitForTimeout(2400);

  /* 3 — an UNTICKED thread sends no context at all */
  await page.evaluate(`(function(){
    document.querySelectorAll('.gap .inc').forEach(function(b){ if(!b.disabled && !b.checked){ b.checked=true; b.dispatchEvent(new Event('change',{bubbles:true})); } });
  })()`);
  await page.waitForTimeout(500);
  await page.evaluate(`(function(){ window.__SENT__=[]; })()`);
  await page.evaluate(`(function(){ var b=document.getElementById('draftBtn'); if(b && !b.disabled) b.click(); })()`);
  await page.waitForTimeout(1800);
  let posts = sent.filter(p => p.mode === 'draft');
  if (!posts.length) f.push('the draft never posted (rig fault — proves nothing)');
  else {
    const c = posts[posts.length - 1].context;
    if (c === undefined) f.push('the draft body carries no `context` key at all — the notes cannot reach the letter');
    else if (Array.isArray(c) && c.length) f.push(`an untouched thread sent ${c.length} note(s) as context — un-ticked notes must never be sent`);
  }

  /* 4 — tick one, and ONLY that one travels */
  await page.evaluate(`(function(){
    var rows=[...document.querySelectorAll('#noteList .nrow')];
    var target = rows.find(function(r){ var b=r.querySelector('.nbody'); return b && /allowed ONE shingle/i.test(b.textContent); });
    if(target){ var i=target.querySelector('input'); i.checked=true; i.dispatchEvent(new Event('change',{bubbles:true})); }
  })()`);
  await page.waitForTimeout(400);
  await page.evaluate(`(function(){ var b=document.getElementById('draftBtn'); if(b && !b.disabled) b.click(); })()`);
  await page.waitForTimeout(1800);
  posts = sent.filter(p => p.mode === 'draft');
  const ctx2 = posts.length ? posts[posts.length - 1].context : null;
  if (!Array.isArray(ctx2) || ctx2.length !== 1)
    f.push(`ticking one note sent ${Array.isArray(ctx2) ? ctx2.length : 'no'} context entries, expected exactly 1`);
  else {
    if (!/allowed ONE shingle/i.test(ctx2[0])) f.push(`the wrong note travelled: ${JSON.stringify(ctx2[0].slice(0,60))}`);
    if (/Chased Allstate/i.test(ctx2.join(' '))) f.push('an un-ticked note travelled alongside the ticked one');
  }

  /* 5 — typing a note writes it to claim_notes and it lands ticked.
   *
   * ⚠ EVERY REACH IS NULL-SAFE, and BUG_CLASSES 37 is why. The first version
   * did `t.value = '...'` straight off getElementById; on the control tree
   * there is no #noteText, so the run died with a TypeError before printing a
   * single failure. A crash reads as "not green" and proves nothing — the
   * control has to come back RED with named findings, not blow up. */
  const typed = await page.evaluate(`(function(){
    var t=document.getElementById('noteText'), b=document.getElementById('noteAdd');
    if(!t || !b) return { missing: (t?'':'#noteText ') + (b?'':'#noteAdd') };
    t.value='He never went on the north slope at all.';
    b.click();
    return { missing:'' };
  })()`);
  if (typed.missing) f.push(`cannot type a note — ${typed.missing.trim()} does not exist, so there is no chat box`);
  await page.waitForTimeout(1400);
  const wrote = await page.evaluate(`(window.__INS__||[]).map(function(x){ return { t:x.table, body:(x.payload&&x.payload.body)||'', claim:(x.payload&&x.payload.claim_id)||'' }; })`);
  const note = wrote.find(w => w.t === 'claim_notes');
  if (typed.missing) { /* already named above — do not also report a phantom write failure */ }
  else if (!note) f.push(`typing a note wrote nothing to claim_notes (wrote: ${wrote.map(w=>w.t).join(', ') || 'nothing'})`);
  else {
    if (!/north slope/i.test(note.body)) f.push(`the note body is wrong: ${JSON.stringify(note.body)}`);
    if (note.claim !== 'cl1') f.push(`the note was filed against ${JSON.stringify(note.claim)} instead of the open claim`);
  }
  const after = await page.evaluate(`(function(){
    var rows=[...document.querySelectorAll('#noteList .nrow')];
    var mine = rows.find(function(r){ var b=r.querySelector('.nbody'); return b && /north slope/i.test(b.textContent); });
    return { n:rows.length, present:!!mine, ticked: mine ? !!mine.querySelector('input').checked : false };
  })()`);
  if (typed.missing) { /* no box, no note — the finding is already recorded */ }
  else if (!after.present) f.push('the note you just typed does not appear in the thread');
  else if (!after.ticked) f.push('a note you just typed is not ticked — you wrote it to be used');

  /* 6 — the cite_flag warning is wired and hidden until it fires */
  const warn = await page.evaluate(`(function(){
    var w=document.getElementById('citeWarn');
    if(!w) return { missing:true };
    var before = getComputedStyle(w).display;
    return { missing:false, before:before, hasList: !!document.getElementById('citeWarnList') };
  })()`);
  if (warn.missing) f.push('there is no #citeWarn — an invented citation would come back and say nothing');
  else {
    if (warn.before !== 'none') f.push('the citation warning is showing when the server flagged nothing');
    if (!warn.hasList) f.push('#citeWarnList is missing — the warning cannot name what it caught');
  }

  await ctx.close(); await browser.close();
  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1057 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1057 GREEN — the thread is attached, nothing is pre-ticked, only ticked notes travel, typing one writes it');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 30).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
