/* gate_1055.mjs — the Supplement Desk's evidence table (overhaul direction A).
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
 * Run:  node gate_1055.mjs <supplement.html> [--control <prev>]
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
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1055.mjs <supplement.html> [--control <prev>]'); process.exit(2); }
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
  function qb(table){
    var rows = table==='insurance_claims' ? CLAIMS
             : table==='inspection_reports' ? SCOPES : [];
    var api={}; ['select','eq','neq','order','limit','in','not','is','gte','lte','filter','range','ilike','or','insert','update']
      .forEach(function(k){ api[k]=function(){ return api; }; });
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
  await page.waitForTimeout(1200);

  /* drive analyze through the Desk's own path, with the scope guard satisfied */
  /* the Desk's OWN path: its scope list renders a radio (first one checked),
     analyze() reads that row and posts. Forcing S.scopeDoc would skip the very
     code the Desk runs in production. */
  const ready = await page.evaluate(`(function(){
    var r = document.querySelector('input[name=scopeDoc]:checked');
    var b = document.getElementById('analyzeBtn');
    if (!r || !b) return { radio:!!r, btn:!!b, note:(document.getElementById('scopeList')||{}).textContent||'' };
    b.click(); return { radio:true, btn:true };
  })()`);
  if (!ready.radio) { f.push('the scope list drew no document radio (rig fault — proves nothing): ' + String(ready.note).slice(0,90)); }
  await page.waitForTimeout(2200);

  let st = await page.evaluate(`(${READ})()`);
  if (st.gaps.length !== GAPS.length) {
    f.push(`the gap list rendered ${st.gaps.length} of ${GAPS.length} items (rig fault — proves nothing)`);
    await ctx.close(); await browser.close(); return f;
  }

  /* 1 — three chips per gap, telling the truth */
  const want = {
    g1: ['have','have','have'],   // 3 photos · measured · code
    g2: ['have','have','have'],
    g3: ['miss','miss','have'],   // no photo · no number · code
    g4: ['miss','soft','soft'],   // no photo · model count · no code backing
    g5: ['have','soft','soft']    // 1 photo · your number · no code backing
  };
  st.gaps.forEach(g => {
    if (g.chips.length !== 3) { f.push(`${g.id} shows ${g.chips.length} evidence chips, not 3`); return; }
    const got = g.chips.map(c => c.cls);
    const exp = want[g.id];
    if (!exp) return;
    if (got.join(',') !== exp.join(','))
      f.push(`${g.id} chips read ${got.join('/')} — expected ${exp.join('/')} (${g.chips.map(c=>c.txt).join(' · ')})`);
  });

  /* 2 — the two blocked items cannot be ticked */
  ['g3','g4'].forEach(id => {
    const g = st.gaps.find(x => x.id === id);
    if (!g) return;
    if (!g.blocked) f.push(`${id} is missing evidence but its card is not marked blocked`);
    if (!g.disabled) f.push(`${id} is missing evidence and its checkbox is STILL TICKABLE`);
    if (!g.hasOvr) f.push(`${id} is blocked with no "Include anyway" — a block with no way through`);
  });
  ['g1','g2','g5'].forEach(id => {
    const g = st.gaps.find(x => x.id === id);
    if (g && g.disabled) f.push(`${id} has all its evidence and is wrongly blocked`);
  });

  /* 3 — typing a quantity un-blocks live */
  await page.evaluate(`(function(){
    var card = document.querySelector('#gapList .gap[data-id="g3"]');
    var q = card && card.querySelector('.qty');
    if (q) { q.value = '42'; q.dispatchEvent(new Event('input', { bubbles:true })); }
  })()`);
  await page.waitForTimeout(300);
  st = await page.evaluate(`(${READ})()`);
  const g3 = st.gaps.find(x => x.id === 'g3');
  if (g3 && g3.chips[1] && g3.chips[1].cls === 'miss')
    f.push('typing a quantity on g3 left the measurement chip reading "no number"');
  if (g3 && !g3.disabled)
    f.push('g3 became tickable after only its QUANTITY was supplied — it still has no photo');

  /* 4 — Include anyway arms it and keeps the marker */
  await page.evaluate(`(function(){
    var b = document.querySelector('#gapList .gap[data-id="g4"] .ovr'); if (b) b.click();
  })()`);
  await page.waitForTimeout(250);
  st = await page.evaluate(`(${READ})()`);
  const g4 = st.gaps.find(x => x.id === 'g4');
  if (g4 && g4.disabled) f.push('"Include anyway" on g4 did not arm the checkbox');
  if (g4 && !g4.ovrNoteShown) f.push('g4 was overridden with no marker saying what it is missing');

  /* 5 — the DRAFT REQUEST carries only sendable items */
  await page.evaluate(`(function(){
    /* tick everything the UI will let us, plus try to force a blocked one */
    document.querySelectorAll('#gapList .gap .inc').forEach(function(b){
      if (!b.disabled) { b.checked = true; b.dispatchEvent(new Event('change', { bubbles:true })); }
    });
    /* and a stale tick on a still-blocked item, to prove draft() re-checks */
    if (window.S && window.S.gaps) {
      var blocked = window.S.gaps.find(function(g){ return g.id === 'g3'; });
      if (blocked) blocked.included = true;
    }
  })()`);
  await page.waitForTimeout(250);
  await page.evaluate(`(function(){ var b=document.getElementById('draftBtn'); if(b && !b.disabled) b.click(); })()`);
  await page.waitForTimeout(1200);

  const draftReq = sent.filter(x => x.mode === 'draft').pop();
  if (!draftReq) f.push('the draft request never fired (rig fault — proves nothing)');
  else {
    const ids = (draftReq.items || []).map(i => i.id).sort();
    if (ids.includes('g3'))
      f.push(`g3 reached the DRAFT REQUEST despite having no photo — sent ${ids.join(',')}`);
    ['g1','g2','g5'].forEach(id => {
      if (!ids.includes(id)) f.push(`${id} is fully evidenced and did NOT reach the draft (sent ${ids.join(',')})`);
    });
    if (!ids.includes('g4')) f.push('the overridden g4 did not reach the draft — the override does nothing');
  }
  await ctx.close(); await browser.close();

  /* 6 — the state tokens clear the floor in BOTH Desk themes.
   *
   * ⚠ THIS CHECK USED TO PROVE NOTHING ON THE CONTROL. It probed
   * .chip.have/.miss/.soft — classes that exist ONLY in the new build — so on
   * the 1054 tree those spans had no rule, getComputedStyle returned the
   * INHERITED body ink, and a comfortable ratio came back for a build whose
   * light theme genuinely failed. Coverage derived from what the page happens
   * to define is coverage that shrinks in silence.
   *
   * So probe the TOKENS, which exist in both builds and are the thing the fix
   * actually changed, and keep the chip probe beside it for the new build.
   * On 1054 the light theme has no --sd-ok/warn/crit twin at all: the dark
   * values fall through onto --sd-panel2 #EFEDE8 at 2.59 / 1.84 / 3.35. */
  for (const theme of ['light', 'dark']) {
    const o = await open(file, theme);
    const m = await o.page.evaluate(`(function(){
      function px(v){ var m=String(v).match(/(\\d+),\\s*(\\d+),\\s*(\\d+)/); return m?[+m[1],+m[2],+m[3]]:null; }
      /* a real gap card is the ground these inks actually sit on */
      var probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;background:var(--sd-panel2);color:#888';
      probe.innerHTML =
        '<span class="chip have"></span><span class="chip miss"></span><span class="chip soft"></span>' +
        '<i data-tok="--sd-ok"></i><i data-tok="--sd-warn"></i><i data-tok="--sd-crit"></i>';
      document.body.appendChild(probe);
      var bg = px(getComputedStyle(probe).backgroundColor);
      /* resolve each token by setting it as a colour and reading it back —
         a raw getPropertyValue can hand back an unresolved var() chain */
      var toks = [...probe.querySelectorAll('i')].map(function(i){
        i.style.color = 'var(' + i.dataset.tok + ')';
        return { name:i.dataset.tok, rgb:px(getComputedStyle(i).color) };
      });
      var chips = [...probe.querySelectorAll('.chip')].map(function(c){
        var cs = getComputedStyle(c);
        return { rgb:px(cs.color), styled: cs.color !== 'rgb(136, 136, 136)' };
      });
      var stampInk = null, stampGround = null;
      var sb = document.getElementById('sdBuild');
      if (sb) { stampInk = px(getComputedStyle(sb).color);
        var hd = sb.closest('header');
        stampGround = hd ? px(getComputedStyle(hd).backgroundColor) : null; }
      probe.remove();
      return { bg:bg, toks:toks, chips:chips, stampInk:stampInk, stampGround:stampGround,
               theme:document.documentElement.getAttribute('data-theme') };
    })()`);
    const L = c => { const f2 = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
      return 0.2126*f2(c[0]) + 0.7152*f2(c[1]) + 0.0722*f2(c[2]); };
    const cr = (a,b) => { const l1=L(a), l2=L(b); const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };

    if (m.theme !== theme) { f.push(`asked for the ${theme} theme and got ${JSON.stringify(m.theme)} (rig fault — proves nothing)`); }
    if (!m.bg) { f.push(`could not read the gap-card ground in ${theme} (rig fault)`); }
    else {
      /* the tokens — present in BOTH builds, so this is a real control */
      m.toks.forEach(t => {
        if (!t.rgb) { f.push(`${t.name} did not resolve to a colour in ${theme} (rig fault)`); return; }
        const r = cr(t.rgb, m.bg);
        if (r < 4.5) f.push(`${t.name} is ${r.toFixed(2)}:1 on the gap card in the ${theme} theme (floor 4.5)`);
      });
      /* the chips — new build only, and it must be a RULE not inherited ink */
      const names = ['have','miss','soft'];
      m.chips.forEach((c, i) => {
        if (!c.styled) { f.push(`.chip.${names[i]} has no rule of its own in ${theme} — it inherited its ink, so any ratio read here is meaningless`); return; }
        const r = cr(c.rgb, m.bg);
        if (r < 4.5) f.push(`.chip.${names[i]} is ${r.toFixed(2)}:1 on the gap card in the ${theme} theme (floor 4.5)`);
      });
      /* the build stamp added this build */
      if (!m.stampInk || !m.stampGround) f.push(`the Desk has no rendered build stamp (#sdBuild) in ${theme} — "which code is this" is unanswerable`);
      else { const r = cr(m.stampInk, m.stampGround);
        if (r < 4.5) f.push(`the build stamp is ${r.toFixed(2)}:1 on the header in the ${theme} theme (floor 4.5)`); }
    }
    await o.ctx.close(); await o.browser.close();
  }

  /* 7 — the page does not scroll sideways on a phone.
   *
   * Found by LOOKING at a fullPage screenshot: it came back 570px wide from a
   * 390px viewport. Measured, the Desk header was scrollWidth 423 on 390
   * BEFORE this build — "Sign out" has been off the right edge since 668 —
   * and the build stamp took it to 500.
   *
   * ⚠ MEASURE THE DRIVEN SCREEN. The first version of this check ran on the
   * page as loaded, where the gaps step does not exist yet: it read 390 and
   * reported clean while #filingType was still pushing the driven page to
   * 402. A viewport check on a screen the user never sees proves nothing. */
  {
    const o = await open(file, 'dark');
    await o.page.evaluate(SEED);
    await o.page.waitForTimeout(1200);
    await o.page.evaluate(`(function(){ var b=document.getElementById('analyzeBtn'); if(b) b.click(); })()`);
    await o.page.waitForTimeout(2400);
    const m = await o.page.evaluate(`(function(){
      var VW = document.documentElement.clientWidth, over = [];
      var gaps = document.querySelectorAll('#gapList .gap').length;
      document.querySelectorAll('*').forEach(function(e){
        var r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > VW + 1) {
          var id = e.id ? ('#' + e.id) : '';
          over.push(e.tagName.toLowerCase() + id + ' ends at ' + Math.round(r.right));
        }
      });
      return { vw:VW, scrollW:document.documentElement.scrollWidth, over:over.slice(0,6), gaps:gaps };
    })()`);
    if (!m.gaps) f.push('the overflow check ran before the gaps rendered (rig fault — proves nothing)');
    else if (m.scrollW > m.vw + 1)
      f.push(`the page scrolls sideways on a ${m.vw}px phone — scrollWidth ${m.scrollW}${m.over.length ? ' (' + m.over.join('; ') + ')' : ''}`);
    await o.ctx.close(); await o.browser.close();
  }

  return f;
}

const fails = await judge(FILE);
if (fails.length) {
  console.log(`GATE 1055 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1055 GREEN — evidence chips true, blocked items unsendable, override honest, both themes clear, no sideways scroll');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = await judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 40).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
