/* gate_976.mjs — a tarp is its own kind of punch-out (build 976).

   Punch outs were Punch / Ticket / Callback. A tarp is none of those: it is the
   thing we go and do straight away so the house stops taking water, and on a
   community job it is often done free before anything is bid.

   FIVE blocks own the kind and this is the normStage() shape — the card's label
   chain ENDS by calling anything it does not recognise a punch, so a kind added
   to the dropdown and nowhere else is silently mislabelled everywhere. Every
   assertion below therefore runs the SHIPPED code or measures a REAL render.

     1  the Add-an-item sheet offers Tarp
     2  the card names a tarp item "Tarp" — not "Punch-Out"
     3  ...and an unrecognised kind STILL falls back to Punch-Out (the fence)
     4  the Type filter can pull up every tarp
     5  the activity feed says "Tarp done", not "Repair closed"
     6  the Tarp chip is visually distinct from punch, ticket and callback
     7  ...and its ink clears 4.5:1 on the ground it really composites over
     8  ...in BOTH themes (half this project's colour bugs are a dark fix that
        broke light)

   Usage: node gate_976.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }
function lum(c){ const s=c.map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; }
function ratio(a,b){ const L1=lum(a),L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); }
function rgb(s){ const m=String(s||'').match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s/]+([\d.]+))?/);
  return m?[+m[1],+m[2],+m[3], m[4]===undefined?1:+m[4]]:null; }
/* a translucent chip paints OVER its row, not over the page — composite it */
function over(fg, bg){ const a=fg[3]; return [0,1,2].map(i=>Math.round(fg[i]*a + bg[i]*(1-a))); }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* ---- helpers: pull a whole function out of the artifact by brace-matching.
   Regex surgery on an expression cut a string literal in half and produced
   "Invalid or unexpected token" — extract the FUNCTION, stub what it calls. */
function extractFn(src, marker){
  const i = src.indexOf(marker);
  if(i === -1) return null;
  const o = src.indexOf('{', i);
  let d = 0;
  for(let k=o;k<src.length;k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(d === 0) return src.slice(i, k+1); }
  }
  return null;
}
const APPSRC = APP;
const OPENADD = extractFn(APPSRC, 'function openAdd(presetProjectId){');
const PKROW   = (function(){
  /* the card row builder that owns the label chain, in cr-pk-script */
  const i = APPSRC.indexOf("'<span class=\"pkey\">' + esc(it.kind ===");
  if(i === -1) return null;
  const s = APPSRC.lastIndexOf('function ', i);
  return extractFn(APPSRC.slice(s), 'function ');
})();
need('0a openAdd was found in the artifact', !!OPENADD, 'not found');
need('0b the card row builder was found', !!PKROW, 'not found');

/* ⚠ BUG_CLASSES 37, the harness half: a shipped function pulled out of a 5 MB
   file references whatever its module had in scope, and stubbing them one
   ReferenceError at a time is how a gate ends up crashing instead of reporting.
   `with(new Proxy(...))` makes EVERY unstubbed name resolve to a no-op that
   returns '', so the function runs to completion and the assertion measures
   what it produced. Names stubbed for real always win — they are on the target
   object, so the proxy never sees them. */
const SCOPE = `
  var __stub = new Proxy(__real, {
    has: function(){ return true; },
    get: function(t, k){
      if(k === Symbol.unscopables) return undefined;
      if(k in t) return t[k];
      /* a native resolved through a with-scope is called with the SCOPE as its
         receiver, which throws "Illegal invocation" (setTimeout, fetch, alert).
         ⚠ But binding a CONSTRUCTOR strips its statics — Array.bind(window) has
         no .isArray, which is the next error this hit. Bind host FUNCTIONS
         (lowercase by convention) and leave constructors and namespaces alone. */
      if(typeof window !== 'undefined' && k in window){
        var v = window[k];
        return (typeof v === 'function' && /^[a-z]/.test(String(k))) ? v.bind(window) : v;
      }
      return function(){ return ''; };
    }
  });
`;

/* ---- 1: the real sheet, built by the SHIPPED openAdd ---- */
const sheet = await page.evaluate(async ({OPENADD, SCOPE})=>{
  const out={err:null};
  try{
    if(!OPENADD){ out.noOpener = true; return out; }
    const run = new Function('document','SCOPE', `
      /* NB no outer var modal here. Inside with(), the proxy answers has() for
         every name, so openAdd's assignment to modal lands on the PROXY TARGET.
         Read it back off __real, not off a local that never sees it.
         (No backticks in this comment: it lives inside a template literal.) */
      var __real = {
        modal: null,
        /* RIG REPAIR 29 Aug 2026 (triage at build 1121): build 1090 moved modal
           creation out of openAdd into ensurePbModal(mode) (the shared add/day
           sheet). Through the proxy that call was a no-op, modal stayed null and
           modal.innerHTML threw. Stub it the way the module does. */
        ensurePbModal: function(){
          if(!__real.modal) __real.modal = document.createElement('div');
          return __real.modal;
        },
        closeAdd: function(){},
        boardJobs: function(){ return [{ pr:{ id:'p1', name:'Test job', stage:'Approved' } }]; },
        projectFor: function(){ return null; },
        normStage: function(s){ return s || 'Lead'; },
        esc: function(s){ return String(s==null?'':s); },
        shortName: function(s){ return String(s||''); }
      };
      eval(SCOPE);
      with(__stub){
        ${OPENADD}
        openAdd('p1');
      }
      return __real.modal;
    `);
    const modal = run(document, SCOPE);
    if(!modal){ out.noSelect = true; return out; }
    const sel = modal.querySelector('select[data-f="kind"]');
    if(!sel){ out.noSelect = true; return out; }
    out.options = Array.from(sel.options).map(o=>o.value+':'+o.textContent.trim());
  }catch(e){ out.err = String(e&&e.message||e); }
  return out;
}, {OPENADD, SCOPE});
need('1 the Add-an-item sheet offers Tarp',
     !!(sheet.options && sheet.options.some(o=>/^tarp:/i.test(o))),
     sheet.err ? ('threw: '+sheet.err)
       : sheet.noOpener ? 'openAdd not found'
       : sheet.noSelect ? 'the sheet has no kind select'
       : 'offers: ' + JSON.stringify(sheet.options));

/* ---- 2,3,5: the SHIPPED label chain and activity label, executed ---- */
const src = APP;
const ACTSRC = (function(){
  const i = src.indexOf("label:(it.kind === 'callback' ?");
  if(i === -1) return '';
  return src.slice(i, src.indexOf('), who:', i) + 1);
})();

const ran = await page.evaluate(({PKROW, ACTSRC, SCOPE})=>{
  const out={err:null};
  try{
    /* run the SHIPPED row builder and read the label it printed, rather than
       re-implementing the chain or regexing it out of a string */
    const NAME = PKROW.slice(9, PKROW.indexOf('('));
    const html = (kind) => {
      const fn = new Function('kind','SCOPE', `
        var it = { id:'i1', kind:kind, title:'Reattach gutter', status:'open', priority:'normal' };
        var __real = {
          it: it,
          esc: function(s){ return String(s==null?'':s); },
          svg: function(){ return ''; },
          ago: function(){ return 'today'; },
          usd: function(n){ return '$'+(Number(n)||0); },
          fmtDay: function(d){ return String(d||''); },
          initials: function(){ return 'TD'; },
          projectFor: function(){ return null; }
        };
        eval(SCOPE);
        with(__stub){
          ${PKROW}
          return ${NAME}(it);
        }
      `);
      return String(fn(kind, SCOPE) || '');
    };
    const pkey = (h) => { const m = String(h).match(/<span class="pkey">([^<]*)<\/span>/); return m ? m[1] : null; };
    out.tarp    = pkey(html('tarp'));
    out.unknown = pkey(html('gremlin'));
    out.punch   = pkey(html('punch'));
    const act = (kind)=>{
      const m = ACTSRC.match(/label:\(([\s\S]*)\)$/);
      if(!m) return null;
      return new Function('it', 'return (' + m[1] + ');')({kind:kind});
    };
    out.actTarp  = act('tarp');
    out.actPunch = act('punch');
  }catch(e){ out.err = String(e&&e.message||e); }
  return out;
}, {PKROW, ACTSRC, SCOPE});

need('2 the card names a tarp item "Tarp"', ran.tarp === 'Tarp',
     ran.err ? ('threw: '+ran.err) : ('a tarp renders as ' + JSON.stringify(ran.tarp)));
need('3 ...and an unrecognised kind still falls back to Punch-Out',
     ran.unknown === 'Punch-Out' && ran.punch === 'Punch-Out',
     'unknown=' + JSON.stringify(ran.unknown) + ' punch=' + JSON.stringify(ran.punch));
need('5 the activity feed says the tarp is done, not repaired',
     /tarp/i.test(String(ran.actTarp||'')) && !/repair/i.test(String(ran.actTarp||'')) &&
     /repair/i.test(String(ran.actPunch||'')),
     'tarp=' + JSON.stringify(ran.actTarp) + ' punch=' + JSON.stringify(ran.actPunch));

/* ---- 4: the filter facet ---- */
need('4 the Type filter can pull up every tarp',
     /vals:\s*\['punch','ticket','callback','tarp'\]/.test(src),
     'the Type facet does not list tarp');

/* ---- 6,7,8: the chip, measured in a REAL render, both themes ---- */
async function chips(theme){
  return await page.evaluate((theme)=>{
    const root = document.documentElement;
    const had = root.getAttribute('data-theme');
    if(theme === 'light') root.setAttribute('data-theme','rb-light');
    else root.removeAttribute('data-theme');
    let host = document.getElementById('__g976');
    if(!host){ host = document.createElement('div'); host.id='__g976'; document.body.appendChild(host); }
    /* the chip lives inside .pp-row inside #ppPage — reproduce that exactly, so
       the ground it composites over is the row's, not the page's */
    host.innerHTML = '<div id="ppPage"><div class="pp-row">' +
      ['punch','ticket','callback','tarp']
        .map(k=>'<span class="kind '+k+'" data-k="'+k+'">'+k+'</span>').join('') +
      '</div></div>';
    const rowBg = getComputedStyle(host.querySelector('.pp-row')).backgroundColor;
    const out = { rowBg, theme, chips:{} };
    host.querySelectorAll('.kind').forEach(el=>{
      const cs = getComputedStyle(el);
      out.chips[el.getAttribute('data-k')] = { bg: cs.backgroundColor, ink: cs.color };
    });
    if(had) root.setAttribute('data-theme', had); else root.removeAttribute('data-theme');
    return out;
  }, theme);
}
for (const theme of ['dark','light']){
  const c = await chips(theme);
  const t = c.chips.tarp, p = c.chips.punch;
  const distinct = !!(t && p && (t.bg !== p.bg || t.ink !== p.ink)) &&
                   t.bg !== (c.chips.ticket||{}).bg && t.bg !== (c.chips.callback||{}).bg;
  need('6 the Tarp chip is distinct from the other kinds (' + theme + ')', distinct,
       t ? ('tarp=' + t.bg + '/' + t.ink + '  punch=' + (p&&p.bg) + '/' + (p&&p.ink)) : 'no tarp chip');
  const row = rgb(c.rowBg), chip = t && rgb(t.bg), ink = t && rgb(t.ink);
  let r = 0;
  if(row && chip && ink) r = ratio(ink.slice(0,3), over(chip, row));
  need('7 the Tarp ink clears 4.5:1 on its real ground (' + theme + ')', r >= 4.5,
       'ratio=' + r.toFixed(2) + '  ink=' + (t&&t.ink) + '  chip over row=' +
       (row && chip ? JSON.stringify(over(chip,row)) : '?'));
}

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_976 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
