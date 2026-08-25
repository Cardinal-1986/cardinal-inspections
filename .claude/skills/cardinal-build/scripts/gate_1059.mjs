/* gate_1059.mjs — the Supplement Desk's evidence table (overhaul direction A).
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
 * Run:  node gate_1059.mjs <supplement.html> [--control <prev>]
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
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1059.mjs <supplement.html> [--control <prev>]'); process.exit(2); }
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
  var PHOTOS = [];
  for (var pi = 0; pi < 27; pi++) {              /* production average is 27.4 */
    PHOTOS.push({ id:'ph'+pi, project_id:'p1', storage_path:'photos/p1/'+pi+'.jpg',
                  data:null, created_at:'2026-08-'+String(1+(pi%20)).padStart(2,'0')+'T10:00:00Z' });
  }
  window.__PHOTOS__ = PHOTOS;
  var NOTES = [
    { id:'n1', body:'Met the adjuster on site 12 Aug. He allowed ONE shingle on the south slope and did not price the other three.', created_at:'2026-08-12T15:00:00Z', created_by:'theo@cardinalrenovations.net' },
    { id:'n2', body:'Chased Allstate \u2014 called, left a message.', created_at:'2026-08-20T15:00:00Z', created_by:'theo@cardinalrenovations.net' }
  ];
  window.__NOTES__ = NOTES;
  function qb(table){
    var rows = table==='insurance_claims' ? CLAIMS
             : table==='inspection_reports' ? SCOPES
             : table==='claim_notes' ? NOTES
             : table==='project_photos' ? PHOTOS : [];
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
      createSignedUrls:function(paths){ return Promise.resolve({
        data:(paths||[]).map(function(p){ return { signedUrl:'https://sentinel.test/sig/'+p+'?t=1' }; }),
        error:null }); } }; } }
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



/* the route's photos answer: two items, one pointing at a photograph and one
   deliberately not, plus an honest skip count (27 sent, 20 read) */
const PHOTO_ANSWER = {
  scope_summary: 'Hail bruising across three slopes; step flashing reused at the chimney.',
  photos_read: 20, photos_skipped: 7,
  /* ⚠ THE ENFORCED SHAPE, not the model's raw answer. The route runs every
     gap through enforceGaps() before replying — id assigned, citation copied
     from the pack, photos:[] and included:false seeded. A mock of the RAW
     model answer is fiction: it has no id, and the first version of this gate
     used one, which is why the Desk threw instead of rendering. */
  gaps: [
    { id:'g1', pack_id:'step_counter_flashing', item:'Step & counter flashing, chimney',
      why:'Photograph 2 shows the original step flashing bedded in fresh sealant.',
      basis:'code', citation:'RCO R905.2.8.3',
      qty:14, unit:'LF', qty_src:'model', confidence:'medium',
      wants_photo:true, photos:[], included:false, photo_index:2,
      carrier:{ decision:null, note:'', decided_at:null }, rebuttal:null },
    { id:'g2', pack_id:null, item:'Detached gutter run, north elevation',
      why:'Visible separation at the fascia.',
      basis:'scope-consistency', citation:null,
      qty:null, unit:'LF', qty_src:null, confidence:'low',
      wants_photo:true, photos:[], included:false, photo_index:null,
      carrier:{ decision:null, note:'', decided_at:null }, rebuttal:null }
  ]
};

async function judge(file) {
  const f = [];
  const { browser, ctx, page, sent } = await open(file, 'light');
  /* the route stub in the shared head answers analyze/draft; add photos */
  await page.route('**/api/supplement', r => {
    let post = {}; try { post = JSON.parse(r.request().postData() || '{}'); } catch (e) {}
    sent.push(post);
    if (post.mode === 'photos')
      return r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(PHOTO_ANSWER) });
    if (post.mode === 'draft')
      return r.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ subject:'RE', letter_html:'<p>d</p>' }) });
    return r.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ scope_summary:'s', gaps: [] }) });
  });

  const opened = await page.evaluate(SEED);
  if (!opened) { f.push('no claim row rendered (rig fault — proves nothing)'); await ctx.close(); await browser.close(); return f; }
  await page.waitForTimeout(1400);

  /* 1 — the door exists and is reachable WITHOUT a scope */
  const door = await page.evaluate(`(function(){
    var b=document.getElementById('photoBtn');
    if(!b) return { missing:true };
    var r=b.getBoundingClientRect();
    return { missing:false, disabled:!!b.disabled, h:Math.round(r.height), txt:(b.textContent||'').trim(),
             hint: !!document.getElementById('photoHint') };
  })()`);
  if (door.missing) { f.push('there is no "Read the photographs" door — the Desk is still dead until a scope arrives'); }
  else {
    if (door.disabled) f.push('the photographs door is disabled — the whole point is that it works before a scope exists');
    if (door.h && door.h < 44) f.push(`the photographs door is ${door.h}px tall, under the 44px floor`);
    if (!door.hint) f.push('no explanation beside the door saying what it is for');
  }
  if (door.missing) { await ctx.close(); await browser.close(); return f; }

  /* 2 — it posts mode:'photos' with signed URLs, newest first */
  await page.evaluate(`(function(){ var b=document.getElementById('photoBtn'); if(b) b.click(); })()`);
  await page.waitForTimeout(2200);
  const post = sent.filter(p => p.mode === 'photos').pop();
  if (!post) f.push('tapping the door posted no photos request');
  else {
    if (!Array.isArray(post.photos) || !post.photos.length) f.push('the photos request carried no photographs');
    else {
      if (post.photos.length !== 27) f.push(`sent ${post.photos.length} photographs, expected all 27 (the route does the capping, and says so)`);
      if (!post.photos.every(p => p && p.url && p.path)) f.push('a photograph was sent without a url or a storage path');
      /* newest first: loadPhotos orders ASCENDING, so index 0 must be the LAST stored */
      const first = post.photos[0] && post.photos[0].path;
      if (first !== 'photos/p1/26.jpg') f.push(`the first photograph sent is ${JSON.stringify(first)} — they must go newest first, so 26 leads`);
      if (post.photos.some(p => /^data:/.test(p.url))) f.push('a raw data: URI was sent instead of a signed storage URL');
    }
    if (post.scope) f.push('the photos request carried a scope — this mode is for when there is not one');
  }

  /* 3 — the answer renders through the SAME gap list */
  const st = await page.evaluate(`(function(){
    var cards=[...document.querySelectorAll('#gapList .gap')];
    return { n:cards.length, ids:cards.map(function(c){ return c.getAttribute('data-id'); }),
      chips:cards.map(function(c){ return [...c.querySelectorAll('.ev .chip')].map(function(x){ return (x.textContent||'').trim(); }); }),
      ticked:cards.filter(function(c){ var i=c.querySelector('.inc'); return i && i.checked; }).length,
      blocked:cards.filter(function(c){ return c.classList.contains('blocked'); }).length,
      note:(document.getElementById('analyzeNote')||{}).textContent||'' };
  })()`);
  if (st.n !== 2) f.push(`the photographs produced ${st.n} gap cards, expected 2 (rig fault if 0 — the shared renderer is what proves reuse)`);
  /* 4 — The Walk's rule: nothing arrives ticked */
  if (st.ticked !== 0) f.push(`${st.ticked} item(s) arrived pre-ticked from the model — a person must confirm first`);
  /* 5 — the model's photo_index became real evidence; the item without one stays blocked */
  if (st.n === 2) {
    const withPhoto = st.chips.find(c => c.some(t => /photo/i.test(t) && !/no photo/i.test(t)));
    if (!withPhoto) f.push('the item the model pointed at a photograph for has no PHOTO evidence chip — photo_index was not wired to g.photos');
    const noPhoto = st.chips.find(c => c.some(t => /no photo/i.test(t)));
    if (!noPhoto) f.push('the item the model named without pointing at a photograph is NOT marked missing a photo — the AI got a shortcut past the evidence gate');
    if (st.blocked < 1) f.push('no item is blocked, so an item with no photograph and no quantity could go straight onto a letter');
  }
  /* 6 — the skip count is SHOWN, never swallowed */
  if (!/Read 20/.test(st.note)) f.push(`the note does not say how many photographs were read: ${JSON.stringify(st.note.slice(0,90))}`);
  if (!/skipped 7/.test(st.note)) f.push(`27 were sent and 20 read, and the screen does not say 7 were skipped: ${JSON.stringify(st.note.slice(0,90))}`);

  await ctx.close(); await browser.close();
  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1059 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1059 GREEN — the Desk works before a scope, newest first, nothing pre-ticked, the skip count is shown');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 20).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
