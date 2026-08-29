/* gate_762 — the Exterior Designer in Studio White: both doors still open it,
   it is FULL-BLEED (Theo: "get rid of the retail crm all over it" — no header,
   no left nav framing it), the picks live in a rail beside a hero-sized house
   view >=900px, the client-visible voice is showroom (DESIGN badge, CARDINAL
   DESIGNER tag — the letters AI appear nowhere a client reads), and it still
   offers ONLY sellable Owens Corning colours.

   Structural proofs in real Chromium (the 570-572 class made jsdom-only proof
   of full-screen views worthless):
   - Vision hub (?vision=1): a Designer tile, and tapping it opens #cr-des.
   - Ordinary landing ≥820px: an Exterior Designer door beside Showroom;
     at 390px that door is hidden (the .cr-lr-show gate) — phones use the hub.
   - hideAllViews() actually closes the view (the registration, exercised, not
     grepped) and navRestore's wrap actually wrapped open (__crNav true).
   - The roof panel renders from oc_colors and EXCLUDES hidden (Shasta White
     rule) and discontinued rows — the Designer offers what Cardinal can order.
   - The saved-designs gallery renders a seeded design_renders row with its
     AI CONCEPT badge, and the badge text is present on the compare stage tags.

   Negative control: run against the previous build — expect RED.
       node gate_762.mjs /path/to/prev.html  (761 artifact -> RED)                                   */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 90000);

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js', 'utf8');

const SEED = {
  team_profiles: [{ email:'theo@cardinalrenovations.net', name:'Theo', role:'admin' }],
  projects: [], appointments: [], estimates: [], contracts: [],
  inspection_reports: [], project_photos: [], punch_items: [], collections: [],
  oc_colors: [
    { id:'c1', name:'Onyx Black',  hex:'#232427', family:'black', product_line:'duration', status:'current',      description:'Deep consistent black.', sort_order:10, hidden:false },
    { id:'c2', name:'Brownwood',   hex:'#4E4238', family:'brown', product_line:'duration', status:'current',      description:'Rich warm brown.',       sort_order:31, hidden:false },
    { id:'c3', name:'Storm Cloud', hex:'#4A4E52', family:'grey',  product_line:'duration', status:'discontinued', description:'Dark grey.',             sort_order:4,  hidden:false },
    { id:'c4', name:'Shasta White',hex:'#B9B5AC', family:'grey',  product_line:'duration', status:'current',      description:'Light with grey.',       sort_order:24, hidden:true }
  ],
  design_renders: [
    { id:'r1', title:'Roof Onyx Black', project_id:null,
      source_path:'designer/x/source.jpg', render_path:'designer/x/render.jpg',
      choices:{ roof:{ label:'Onyx Black', hex:'#232427', instruction:'Owens Corning TruDefinition Duration architectural shingles in "Onyx Black"' } },
      via:'gemini-3.1-flash-image', created_by:'theo@cardinalrenovations.net',
      created_at:'2026-08-12T01:00:00Z', updated_at:'2026-08-12T01:00:00Z' }
  ]
};

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const checks = []; const chk = (n,c,d)=>checks.push({ n, pass:!!c, d:d===undefined?'':String(d) });

async function boot(width, url){
  const ctx = await browser.newContext({ viewport:{ width, height: width<500?844:834 }, deviceScaleFactor:2, hasTouch:true });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u.startsWith('https://app.cardinalroster.com/') && t === 'document')
      return r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:APP });
    if (u.includes('@supabase/supabase-js'))
      return r.fulfill({ status:200, contentType:'application/javascript', body:MOCK });
    if (u.includes('chart.js') || u.includes('papaparse'))
      return r.fulfill({ status:200, contentType:'application/javascript', body:'window.Chart=function(){this.destroy=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (t === 'font' || t === 'media') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status:200, body:'' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto(url, { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(3200);
  return { ctx, page };
}

/* ── A: the Vision hub door, iPad width ─────────────────────────────── */
{
  const { ctx, page } = await boot(1194, 'https://app.cardinalroster.com/?vision=1');
  const tile = await page.evaluate(`(()=>{
    const t = document.querySelector('.cr-vh-tile[data-go="designer"]');
    return t ? { found:true, text:t.textContent } : { found:false };
  })()`);
  chk('hub: Designer tile present', tile.found, tile.text || 'absent');
  await page.evaluate(`(()=>{const t=document.querySelector('.cr-vh-tile[data-go="designer"]');if(t)t.click();})()`);
  await page.waitForTimeout(1400);
  const opened = await page.evaluate(`(()=>{
    const v = document.getElementById('cr-des');
    if(!v || !v.classList.contains('open')) return { open:false };
    const cs = getComputedStyle(v);
    return { open:true, display:cs.display, pos:cs.position,
      chips: v.querySelectorAll('#desChips .des-chip').length,
      drop: !!v.querySelector('.des-drop'),
      genDisabled: (v.querySelector('#desGen')||{}).disabled === true,
      /* The OUTCOME Back needs, not the mechanism: the central __crNav wrap
         races a 400ms timer against parsing the last script in a 4.2MB
         document, so open() also records state itself. Either path landing
         satisfies this. */
      histView: (history.state && history.state.view) || '' };
  })()`);
  chk('hub tap opens #cr-des (.open, rendered)', opened.open && opened.display === 'block' && opened.pos === 'fixed', JSON.stringify(opened));
  chk('five surface chips render', opened.chips === 5, 'chips=' + opened.chips);
  chk('photo drop zone renders; Generate starts disabled', opened.drop && opened.genDisabled);
  chk('opening records history state (Back can restore)', opened.histView === 'designer', 'history.state.view=' + opened.histView);

  await page.evaluate(`(()=>{const c=[...document.querySelectorAll('#desChips .des-chip')].find(x=>x.dataset.surf==='roof');if(c)c.click();})()`);
  await page.waitForTimeout(700);
  const roof = await page.evaluate(`(()=>{
    const p = document.querySelector('#desPanel');
    const names = [...(p ? p.querySelectorAll('.des-sw .nm') : [])].map(n=>n.textContent);
    return { names: names, leave: names.some(n=>n.indexOf('Leave as is')!==-1) };
  })()`);
  const has = n => roof.names.some(x => x.indexOf(n) !== -1);
  chk('roof panel offers sellable OC colours', has('Onyx Black') && has('Brownwood'), roof.names.join(' | ').slice(0,120));
  chk('discontinued colour NOT offered (Storm Cloud)', !has('Storm Cloud'));
  chk('hidden colour NOT offered (Shasta White rule)', !has('Shasta White'));
  chk('a Leave-as-is choice exists', roof.leave);

  const gal = await page.evaluate(`(()=>{
    const cards = [...document.querySelectorAll('#desGal .des-card')];
    return { n: cards.length,
      badge: cards.length ? (cards[0].querySelector('.ai')||{}).textContent : '',
      title: cards.length ? (cards[0].querySelector('.t')||{}).textContent : '' };
  })()`);
  chk('saved design renders in the gallery', gal.n === 1, JSON.stringify(gal));
  chk('gallery badge reads DESIGN (showroom voice)', gal.badge === 'DESIGN', gal.badge);

  const layout = await page.evaluate(`(()=>{
    const sc = document.querySelector('#cr-des .des-stagecol');
    const rl = document.querySelector('#cr-des .des-rail');
    if(!sc || !rl) return { missing:true };
    const a = sc.getBoundingClientRect(), b = rl.getBoundingClientRect();
    const wrap = document.querySelector('#cr-des .des-wrap');
    const hasAI = /\bAI\b/.test((wrap && wrap.textContent) || '');
    return { sideBySide: b.left >= a.right - 4, stageW: Math.round(a.width), hasAI };
  })()`);
  chk('>=900px: picks rail sits BESIDE the stage (house is the hero)', !layout.missing && layout.sideBySide, JSON.stringify(layout));
  chk('client-visible text contains no bare word AI', layout.hasAI === false);

  await page.evaluate(`window.hideAllViews()`);
  await page.waitForTimeout(500);
  const closed = await page.evaluate(`(()=>{
    const v = document.getElementById('cr-des');
    return { open: !!(v && v.classList.contains('open')) };
  })()`);
  chk('hideAllViews() closes the Designer (registration exercised)', !closed.open);
  const reopens = await page.evaluate(`(async()=>{ if(!window.CardinalDesigner) return false;
    await window.CardinalDesigner.open();
    const v=document.getElementById('cr-des'); return !!(v && v.classList.contains('open')); })()`);
  chk('open() still works after the history wrap', reopens);
  await ctx.close();
}

/* ── B: the ordinary landing door, desktop/iPad width ───────────────── */
{
  const { ctx, page } = await boot(1194, 'https://app.cardinalroster.com/');
  const door = await page.evaluate(`(()=>{
    const b = document.querySelector('.cr-lr-show[data-go="designer"]');
    if(!b) return { found:false };
    return { found:true, display:getComputedStyle(b).display, text:b.textContent.slice(0,60) };
  })()`);
  chk('landing: Exterior Designer door present', door.found, door.text || 'absent');
  chk('landing door visible at 1194px', door.found && door.display !== 'none', door.display);
  const fabBefore = await page.evaluate(`(()=>{
    const b = document.getElementById('cr-dark-toggle');
    return b ? b.getClientRects().length > 0 : false;
  })()`);
  await page.evaluate(`(()=>{const b=document.querySelector('.cr-lr-show[data-go="designer"]');if(b)b.click();})()`);
  await page.waitForTimeout(1400);
  const opened = await page.evaluate(`(()=>{
    const v = document.getElementById('cr-des');
    if(!v || !v.classList.contains('open')) return { open:false };
    const r = v.getBoundingClientRect();
    return { open:true, top:r.top, left:r.left, w:Math.round(r.width),
             lnav: document.body.classList.contains('cr-lnav-on') };
  })()`);
  chk('landing door opens the Designer', opened.open);
  chk('FULL-BLEED: no header above, no left nav beside (top 0, left 0, full width)',
      opened.open && opened.top === 0 && opened.left === 0 && opened.w === 1194,
      JSON.stringify(opened));
  /* refreshVisibility runs on a 1s interval — outwait one full tick. */
  await page.waitForTimeout(1600);
  const fabAfter = await page.evaluate(`(()=>{
    const b = document.getElementById('cr-dark-toggle');
    if(!b) return { present:false };
    const afloat = b.classList.contains('afloat');
    const r = b.getBoundingClientRect();
    const el = r.width ? document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) : null;
    const des = document.getElementById('cr-des');
    /* The 694 mechanism does not display:none the button — it stops FLOATING
       (z 9550) and drops back where the full-bleed view covers it. So the
       honest probe is stacking: not afloat, and the point where the button
       sits answers to the Designer, not the button. Rects alone pass
       vacuously — that is what the first version of this check got wrong. */
    return { present:true, afloat: afloat,
             covered: !!(des && (el === null || des.contains(el))) };
  })()`);
  chk('theme toggle: on the landing before, NOT floating over the Designer after (694 exclusion)',
      fabBefore === true && fabAfter.present === true && fabAfter.afloat === false && fabAfter.covered === true,
      'before=' + fabBefore + ' after=' + JSON.stringify(fabAfter));
  await ctx.close();
}

/* ── C: phone width — the landing door hides, the hub still serves ──── */
{
  const { ctx, page } = await boot(390, 'https://app.cardinalroster.com/');
  const door = await page.evaluate(`(()=>{
    const b = document.querySelector('.cr-lr-show[data-go="designer"]');
    return b ? getComputedStyle(b).display : 'missing';
  })()`);
  chk('phone: landing door hidden by the ≥820 gate', door === 'none', door);
  await ctx.close();
  const v2 = await boot(390, 'https://app.cardinalroster.com/?vision=1');
  await v2.page.evaluate(`(()=>{const t=document.querySelector('.cr-vh-tile[data-go="designer"]');if(t)t.click();})()`);
  await v2.page.waitForTimeout(1200);
  const opened = await v2.page.evaluate(`(()=>{
    const v = document.getElementById('cr-des');
    if(!v || !v.classList.contains('open')) return { open:false };
    const sc = v.querySelector('.des-stagecol'), rl = v.querySelector('.des-rail');
    if(!sc || !rl) return { open:true, missing:true };
    return { open:true, stacked: rl.getBoundingClientRect().top >= sc.getBoundingClientRect().bottom - 4 };
  })()`);
  chk('phone: hub tile opens the Designer', opened.open);
  chk('phone: stage and rail STACK below 900px', opened.open && opened.stacked === true, JSON.stringify(opened));
  await v2.ctx.close();
}

await browser.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass?'  PASS  ':'  FAIL  ') + c.n + (c.d?('   ['+c.d+']'):'')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed') : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
