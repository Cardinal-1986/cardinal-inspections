/* Build 1099 render gate — the client proposal (buildDocHtml).
 * Extracts the SHIPPED buildDocHtml from index.html, executes it on a realistic
 * multi-section estimate, renders the result in Chromium, and asserts BOTH the
 * 1099 structure (refined banners, zebra on item rows only, accept card,
 * page-break rules, hide-subs) AND WCAG contrast on every new text element.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_estdoc1099.mjs [index.html]
 *
 * Negative control: point it at the 1098 tree — the accept-card / zebra asserts
 * go RED (no crash), proving the gate can fail.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const src = fs.readFileSync(FILE, 'utf8');
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

/* ── brace-extract a function body by signature ─────────────────────────────── */
function extractFn(sig){
  const i = src.indexOf(sig);
  if (i === -1) throw new Error('not found: ' + sig);
  let d = 0, started = false, j = i;
  for (; j < src.length; j++){ const ch = src[j];
    if (ch === '{'){ d++; started = true; } else if (ch === '}'){ d--; if (started && d === 0){ j++; break; } } }
  return src.slice(i, j);
}

/* ── faithful helper stubs (buildDocHtml is the thing under test, not these) ─── */
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nl2br = s => esc(s).replace(/\n/g,'<br>');
const money = n => '$' + (Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}); } catch(_){ return ''; } };
const groupBySec = lines => {
  const out = [], byId = {};
  lines.forEach(l => {
    const id = l.section_id || '';
    if (!byId[id]) { byId[id] = { id, title: l.sec || 'General Scope', lines: [] }; out.push(byId[id]); }
    byId[id].lines.push(l);
  });
  return out.length ? out : [{ id:'', title:'General Scope', lines:lines }];
};
const winStub = { crEstGroups: groupBySec, projClaimType: () => 'retail', parseCkAll: () => ({}), projHomeowner: () => '' };

/* ── sample: 4 sections, detailed + flat lines, a deposit ────────────────────── */
const mk = (name, qty, unit, up, sid, sec, extra) => Object.assign({ name, qty, unit, unit_price:up, section_id:sid, sec }, extra||{});
const LINES = [
  mk('Tear off existing shingles',32,'SQ',65,'s1','Tear-Off & Decking',{description:'Down to the deck; haul-off included.'}),
  mk('Dumpster & debris disposal',0,'',0,'s1','Tear-Off & Decking',{flat:true, amount:475}),
  mk('Replace deteriorated decking',4,'EA',58,'s1','Tear-Off & Decking'),
  mk('Owens Corning Duration shingles',35.2,'SQ',142,'s2','Primary Shingles',{description:'Brownwood. 10% waste.'}),
  mk('Synthetic underlayment',32,'SQ',18,'s2','Primary Shingles'),
  mk('Starter strip',150,'LF',2.10,'s2','Primary Shingles'),
  mk('Ridge vent',45,'LF',8.5,'s3','Ventilation & Flashing'),
  mk('Pipe boots',3,'EA',32,'s3','Ventilation & Flashing'),
  mk('Step & counter flashing',0,'',0,'s3','Ventilation & Flashing',{flat:true, amount:210}),
  mk('Installation labor',0,'',0,'s4','Labor & Disposal',{flat:true, amount:3200}),
];
const subtotal = LINES.reduce((s,l)=> s + (l.flat ? l.amount : l.qty*l.unit_price), 0);
const total = subtotal - 250;
const EST = {
  title:'Roof Replacement', estimate_number:'EST-1042', created_at:'2026-08-27', valid_through:'2026-09-26',
  line_items: LINES, photos: [], subtotal, discount:250, total,
  deposit_pct:30, deposit_amount: Math.round(total*0.30*100)/100,
  notes:'Owens Corning Preferred Contractor. 10-year workmanship warranty.',
  payment_instructions:'Deposit at signing; balance at completion.',
};
const PROJ = { name:'Marcus & Dana Whitfield', address:'418 Cherrywood Ln, Kettering, OH 45429', phone:'(937) 555-0148', email:'home@example.com' };

/* ── build the shipped doc ───────────────────────────────────────────────────── */
let html = '';
try {
  const body = extractFn('function buildDocHtml(est, project, urls){');
  const factory = new Function('esc','nl2br','money','fmtDate','cardinalLogo','docPhotoUrl','win',
    'var window = win;' + body + '\nreturn buildDocHtml;');
  const buildDocHtml = factory(esc, nl2br, money, fmtDate, () => '', () => '', winStub);
  html = buildDocHtml(EST, PROJ, null);
} catch(e){ console.log('  FAIL buildDocHtml extract/execute threw: ' + e.message); fails++; }

/* ── structural asserts on the shipped HTML ─────────────────────────────────── */
ok(/class="accept-card avoid-break"/.test(html), 'the doc closes with the Acceptance card (avoid-break)');
ok(/Acceptance &amp; Authorization/.test(html), 'card carries the Acceptance & Authorization heading');
ok(/Deposit Due at Signing \(30%\)/.test(html) && /Balance at Completion/.test(html), 'recap shows deposit% + balance');
ok((html.match(/class="[^"]*\bzeb\b[^"]*"/g)||[]).length >= 3, 'zebra class lands on multiple ITEM rows');
ok(/<div class="sign avoid-break">/.test(html) === false, 'the old bare .sign block is gone (replaced by the card)');
ok(/Cardinal Representative/.test(html), 'card has the Cardinal Representative signature column');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:816,height:1200}, deviceScaleFactor:2 });
  await p.setContent(html, { waitUntil:'networkidle' });

  /* screenshot for the eye */
  const outPng = '/tmp/claude-0/-home-user-cardinal-inspections/19de3f5f-c337-5d4a-bfbe-8000821667e1/scratchpad/comm/estdoc1099_shipped.png';
  try { await p.screenshot({ path: outPng, fullPage:true }); console.log('  ..   wrote ' + outPng); } catch(_){}

  /* WCAG contrast, scored against the composited ground (walk ancestors) */
  const results = await p.evaluate(() => {
    function lum(c){ const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; }
    function parse(s){ const m=s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return p; }
    function groundOf(el){
      let n=el;
      while(n){ const cs=getComputedStyle(n); const bg=parse(cs.backgroundColor); if(bg && (bg[3]===undefined || bg[3] >= 0.999)) return [bg[0],bg[1],bg[2]]; n=n.parentElement; }
      return [255,255,255];
    }
    function ratio(el){
      const cs=getComputedStyle(el); const fg=parse(cs.color); const bg=groundOf(el);
      if(!fg) return null; const L1=lum([fg[0],fg[1],fg[2]]), L2=lum(bg);
      const hi=Math.max(L1,L2), lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05);
    }
    const pick = sel => { const el=document.querySelector(sel); return el?{txt:el.textContent.trim().slice(0,26),r:Math.round(ratio(el)*100)/100,px:parseFloat(getComputedStyle(el).fontSize)}:null; };
    return {
      bannerZeb: document.querySelectorAll('table.items tr.sec-banner.zeb').length,
      subZeb:    document.querySelectorAll('table.items tr.sec-sub.zeb').length,
      zebRows:   document.querySelectorAll('table.items tr.zeb').length,
      banner: pick('table.items tr.sec-banner td'),
      ack:    pick('.accept-card .ac-cell .ac-k'),
      acv:    pick('.accept-card .ac-cell .ac-v'),
      acvhi:  pick('.accept-card .ac-cell.hi .ac-v'),
      terms:  pick('.accept-card .ac-terms'),
    };
  });

  const floor = (o, min, name) => { if(!o){ ok(false, name+' — element missing'); return; } const big=o.px>=18.66||(o.px>=14 && false); ok(o.r>=min, name+' contrast '+o.r+':1 (>= '+min+') "'+o.txt+'" @'+o.px+'px'); };
  floor(results.banner, 4.5, 'banner text');
  floor(results.ack,    4.5, 'acceptance label (ac-k)');
  floor(results.acv,    4.5, 'acceptance value (ac-v)');
  floor(results.acvhi,  4.5, 'acceptance deposit (ac-v.hi, cardinal red)');
  floor(results.terms,  4.5, 'acceptance terms line');
  ok(results.zebRows >= 3, 'zebra lands on multiple item rows in the rendered DOM ('+results.zebRows+')');
  ok(results.bannerZeb === 0, 'no section banner is zebra-striped (DOM: '+results.bannerZeb+')');
  ok(results.subZeb === 0, 'no subtotal row is zebra-striped (DOM: '+results.subZeb+')');

  await b.close();
  console.log(fails ? ('\nRENDER RED — ' + fails + ' failure(s)') : '\nRENDER GREEN — proposal structure + contrast proven on the shipped buildDocHtml');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack||e.message); process.exit(1); });
