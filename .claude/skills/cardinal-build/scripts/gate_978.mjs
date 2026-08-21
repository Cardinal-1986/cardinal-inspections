/* gate_978.mjs — start a punch-out from anywhere, find one by PO (build 978).

   Two asks, one build. Filing a punch-out meant finding the Production board
   first; and the Punch & Repairs search said "item, client, address" and meant
   it — the PO number, which is how this office actually refers to a job, found
   nothing at all.

   The risk in the first half is a SECOND composer. cr-pb-script's openAdd() is
   the one add pipeline (Production board, the client profile's Punch Outs tab,
   and now two more doors); a page that grows its own form is a bug with a delay
   on it. Every assertion below therefore runs the SHIPPED function or measures
   a REAL render.

     1  the global + offers Punch-out, with the glyph the nav already uses
     2  ...and the dispatcher routes it to CardinalProduction.newPunch
     3  Punch & Repairs has its own + New, wired to the SAME door
     4  no second composer — openAdd/saveAdd are still one each
     5  newPunch refreshes the shared punch layer BEFORE drawing the job list
     6  ...and opens the composer with no job preset
     7  the SHIPPED match() finds a job by its PO, typed bare
     8  ...and typed with a hash
     9  ...and a DIFFERENT PO does not match (the fence — a hay that always
        matches is a search that has stopped filtering)
    10  name and address still match (978 extended the hay, it did not swap it)
    11  the placeholder says so
    12  adding one repaints Punch & Repairs, and only when it is on screen
    13  + New clears the 44px touch floor in a real render, both themes

   Usage: node gate_978.mjs [path] — previous build = negative control; must go
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

/* brace-match a whole function out of the artifact. Regex surgery on an
   expression cut a string literal in half once and produced "Invalid or
   unexpected token" — extract the FUNCTION, stub what it calls. */
function extractFn(src, marker){
  const i = src.indexOf(marker);
  if(i === -1) return null;
  const o = src.indexOf('{', i);
  if(o === -1) return null;
  let d = 0;
  for(let k=o;k<src.length;k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(d === 0) return src.slice(i, k+1); }
  }
  return null;
}
const blockOf = id => { const i=APP.indexOf('<script id="'+id+'"'); if(i===-1) return ''; return APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</script>',i)); };
const PUNCH = blockOf('cr-punch-script');
const PB    = blockOf('cr-pb-script');
need('0a cr-punch-script found', !!PUNCH, 'missing');
need('0b cr-pb-script found', !!PB, 'missing');

const MATCH  = extractFn(PUNCH, 'function match(it){');
const NEWPUN = (function(){
  /* The export is an object property, not a declaration. ⚠ Locating it with a
     bare indexOf('newPunch') found the COMMENT above it first, and the slice
     then started at the word "async" INSIDE that prose — "Unexpected
     identifier 'one'". This project's own counting rule, biting a gate: match
     the property SHAPE, not the name. */
  const m = /newPunch\s*:\s*(async\s+)?function\s*\(/.exec(PB);
  if(!m) return null;
  const o = PB.indexOf('{', m.index + m[0].length - 1);
  if(o === -1) return null;
  let d = 0;
  for(let k=o;k<PB.length;k++){
    if(PB[k] === '{') d++;
    else if(PB[k] === '}'){ d--; if(d === 0) return PB.slice(m.index + m[0].indexOf(m[1] ? 'async' : 'function'), k+1); }
  }
  return null;
})();
const SAVEADD = extractFn(PB, 'async function saveAdd(){');
need('0c match() found in cr-punch-script', !!MATCH, 'not found');

/* ---- 1,2: the global + row and its dispatcher ---- */
need('1 the global + offers Punch-out with the nav glyph',
     /data-new="punch"[^>]*data-cri="ladder/.test(APP) && />Punch-out</.test(APP),
     'no Punch-out row, or it does not carry the ladder the nav uses for this page');

const DISP = (function(){
  const i = APP.indexOf("var kind = opt.getAttribute('data-new');");
  if(i === -1) return '';
  return APP.slice(i, i + 2600);
})();
need('2 the dispatcher routes punch to the ONE composer',
     /kind === 'punch'/.test(DISP) && /CardinalProduction/.test(DISP) && /newPunch/.test(DISP),
     'the punch branch is missing or does not go through CardinalProduction.newPunch');

/* ---- 3: the page button, wired to the same door ---- */
const PUNEW = (function(){
  const i = PUNCH.indexOf("getElementById('puNewBtn')");
  if(i === -1) return '';
  return PUNCH.slice(i, i + 420);
})();
need('3 Punch & Repairs has + New, wired to the same door',
     /id="puNewBtn"/.test(APP) && !!PUNEW && /newPunch/.test(PUNEW) && /CardinalProduction/.test(PUNEW),
     !/id="puNewBtn"/.test(APP) ? 'no + New button in the head'
       : 'the button is not wired to CardinalProduction.newPunch');

/* ---- 4: the fence — no second composer ---- */
const nOpen = (APP.match(/function openAdd\(/g) || []).length;
const nSave = (APP.match(/function saveAdd\(/g) || []).length;
need('4 no second composer — one openAdd, one saveAdd',
     nOpen === 1 && nSave === 1 && !/function\s+\w*[aA]dd\w*\(/.test(PUNCH.replace(/addEventListener/g,'')),
     'openAdd x' + nOpen + ', saveAdd x' + nSave +
     (/function\s+\w*[aA]dd\w*\(/.test(PUNCH.replace(/addEventListener/g,'')) ? ', and cr-punch-script grew an add function' : ''));

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

/* ⚠ BUG_CLASSES 37, the harness half: a shipped function pulled out of a 5 MB
   file references whatever its module had in scope. `with(new Proxy(...))`
   makes every unstubbed name resolve to a no-op returning '', so the function
   runs to completion and the assertion measures what it produced. Names stubbed
   for real always win — they sit on the proxy TARGET. */
const SCOPE = `
  var __stub = new Proxy(__real, {
    has: function(){ return true; },
    get: function(t, k){
      if(k === Symbol.unscopables) return undefined;
      if(k in t) return t[k];
      /* a native resolved through a with-scope is called with the SCOPE as its
         receiver, which throws "Illegal invocation". Bind host FUNCTIONS
         (lowercase by convention) — binding a CONSTRUCTOR strips its statics,
         and Array.bind(window) has no .isArray. */
      if(typeof window !== 'undefined' && k in window){
        var v = window[k];
        return (typeof v === 'function' && /^[a-z]/.test(String(k))) ? v.bind(window) : v;
      }
      return function(){ return ''; };
    }
  });
`;

/* ---- 5,6: run the SHIPPED newPunch against a recording shim ---- */
const np = await page.evaluate(async ({NEWPUN, SCOPE})=>{
  const out={err:null};
  if(!NEWPUN){ out.missing = true; return out; }
  try{
    const fn = new Function('SCOPE', `
      var __order = [];
      var __real = {
        items: [],
        punchRows: function(){ __order.push('rows'); return []; },
        openAdd: function(p){ __order.push('openAdd:' + (p === null ? 'null' : String(p))); }
      };
      eval(SCOPE);
      window.CardinalPunch = { reload: function(){ __order.push('reload');
        return Promise.resolve(true); } };
      /* NB no outer var __fn. Inside with(), the proxy answers has() for every
         name, so this assignment lands on the proxy TARGET — read it back off
         __real, not off a local that never sees it. */
      with(__stub){ __fn = ${NEWPUN}; }
      return __real.__fn(null).then(function(){ return __order; });
    `);
    out.order = await fn(SCOPE);
  }catch(e){ out.err = String(e&&e.message||e); }
  return out;
}, {NEWPUN, SCOPE});
const ord = (np && np.order) || [];
need('5 newPunch refreshes the shared layer BEFORE drawing the job list',
     ord.indexOf('reload') === 0 && ord.indexOf('reload') < ord.findIndex(x=>/^openAdd/.test(x)),
     np.missing ? 'newPunch is not exported' : np.err ? ('threw: '+np.err) : JSON.stringify(ord));
need('6 ...and opens the composer with no job preset',
     ord.some(x=>x === 'openAdd:null'),
     np.missing ? 'newPunch is not exported' : np.err ? ('threw: '+np.err) : JSON.stringify(ord));

/* ---- 7-10: run the SHIPPED match() over a job with a real PO ---- */
const m = await page.evaluate(({MATCH, SCOPE})=>{
  const out={err:null};
  if(!MATCH){ out.missing = true; return out; }
  try{
    const ask = (q) => {
      const fn = new Function('q','SCOPE', `
        var PR = { id:'p1', name:'Ada Whitfield', address:'118 Maple Grove Dr',
                   checklist: JSON.stringify({ po: 1042 }) };
        var __real = {
          PU: { q:q, sets:{} },
          projOf: function(){ return PR; },
          crmOf: function(){ return 'retail'; },
          kindOf: function(it){ return it.kind || 'punch'; },
          isUrgent: function(){ return false; },
          /* the main block's ONE po resolver, reproduced faithfully: a number
             above zero or nothing at all */
          poOf: function(pr){ try{ var p = JSON.parse(pr.checklist||'{}').po;
            return (typeof p === 'number' && p > 0) ? p : null; }catch(e){ return null; } }
        };
        eval(SCOPE);
        with(__stub){
          ${MATCH}
          return match({ id:'i1', project_id:'p1', title:'Reattach gutter',
                         detail:'north side', assigned_to:'curtis@cardinalrenovations.net',
                         kind:'punch', status:'open' });
        }
      `);
      return fn(q, SCOPE);
    };
    out.bare    = ask('1042');
    out.hashed  = ask('#1042');
    out.otherPo = ask('1043');
    out.name    = ask('whitfield');
    out.addr    = ask('maple grove');
    out.junk    = ask('zzzznotathing');
  }catch(e){ out.err = String(e&&e.message||e); }
  return out;
}, {MATCH, SCOPE});
const mdet = m.missing ? 'match() not found' : m.err ? ('threw: '+m.err) : JSON.stringify(m);
need('7 the search finds a job by its PO, typed bare',   m.bare === true,   mdet);
need('8 ...and typed with a hash',                        m.hashed === true, mdet);
need('9 ...and a DIFFERENT PO does not match',            m.otherPo === false && m.junk === false, mdet);
need('10 name and address still match',                   m.name === true && m.addr === true, mdet);

need('11 the placeholder says PO',
     /id="puSearch"[^>]*placeholder="[^"]*PO/.test(APP),
     'the search box still promises only item, client and address');

/* ---- 12: saveAdd tells the page, and only when it is showing ---- */
need('12 adding one repaints Punch & Repairs, only when on screen',
     !!SAVEADD && /renderPunchView/.test(SAVEADD) && /punchView/.test(SAVEADD) &&
     /style\.display\s*!==\s*'none'/.test(SAVEADD),
     !SAVEADD ? 'saveAdd not found'
       : !/renderPunchView/.test(SAVEADD) ? 'saveAdd never tells the punch page'
       : 'saveAdd repaints it unconditionally — no visibility guard');

/* ---- 13: the button, measured in a REAL render, both themes ---- */
for (const theme of ['dark','light']){
  const box = await page.evaluate((theme)=>{
    const root = document.documentElement;
    const had = root.getAttribute('data-theme');
    if(theme === 'light') root.setAttribute('data-theme','rb-light');
    else root.removeAttribute('data-theme');
    const view = document.getElementById('punchView');
    const btn  = document.getElementById('puNewBtn');
    const out = { found: !!btn };
    if(view && btn){
      const prev = view.style.display;
      view.style.display = 'block';
      const r = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      out.h = Math.round(r.height); out.w = Math.round(r.width);
      out.bg = cs.backgroundColor; out.ink = cs.color;
      out.vis = cs.visibility !== 'hidden' && cs.display !== 'none';
      view.style.display = prev;
    }
    if(had) root.setAttribute('data-theme', had); else root.removeAttribute('data-theme');
    return out;
  }, theme);
  need('13 + New clears the 44px touch floor and is visible (' + theme + ')',
       !!(box.found && box.vis && box.h >= 44 && box.w >= 44),
       box.found ? ('h=' + box.h + ' w=' + box.w + ' visible=' + box.vis) : 'no #puNewBtn in the document');
}

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_978 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
