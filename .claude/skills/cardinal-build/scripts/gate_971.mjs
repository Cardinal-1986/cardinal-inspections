/* gate_971.mjs — a community bid can be marked submitted (build 971).

   Live data at audit time: 15 of 15 community jobs at stage Lead; 7 priced by a
   hand-typed checklist.lead.bid_amount; submitted_amount NULL on all 15; and the
   ONE job carrying estimate rows carries two $0.00 drafts. threadHtml's Lead arm
   was `acts: est ? [Mark it submitted, …] : [Price it]`, keyed on the estimate
   OBJECT — so the 7 hand-priced jobs were offered only "Price it", and the $0
   draft job got the submit button. This gate runs the SHIPPED threadHtml against
   each of those real shapes.

     1  a hand-typed price offers "Mark it submitted"   (the 7 frozen jobs)
     2  ...and says the price came off the bid form, not the builder
     3  a $0.00 draft estimate does NOT count as priced (the inverted case)
     4  a builder-priced bid offers submit and names its line count
     5  a job with no price anywhere still correctly says it needs pricing
     6  ...and can still log an amount by hand
     7  an already-logged amount says the stage has not moved yet
     8  an overdue bid reads "N days ago", never "in -N days"
     9  the secondary button is visually secondary (the .alt rule was inert)

   Usage: node gate_971.mjs [path] — previous build = negative control; must go
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

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* Extract the shipped cr-cc-script block and run threadHtml inside it, rather
   than re-implementing anything. The module is an IIFE, so it is re-evaluated
   with its dependencies stubbed and the two functions handed back. */
const i = APP.indexOf('<script id="cr-cc-script">');
const j = APP.indexOf('</script>', i);
const BLOCK = i === -1 ? '' : APP.slice(APP.indexOf('>', i)+1, j);
need('0 cr-cc-script block found', !!BLOCK, 'module missing');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{
  const u=r.request().url();
  if(u.startsWith('https://t.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html><head><style>'+
      (APP.match(/<style id="cr-cc-styles">([\s\S]*?)<\/style>/)||[])[1]+
      '</style></head><body><div id="cr-cc"><div class="ev"><button class="doit">A</button><button class="doit alt">B</button></div></div></body></html>'});
  return r.fulfill({status:200,body:''});
});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },90000);
await page.goto('https://t.test/x',{waitUntil:'domcontentloaded'});

/* 9 — the alt button must actually look secondary (equal-specificity trap) */
const alt = await page.evaluate(()=>{
  const a=document.querySelector('#cr-cc .ev .doit:not(.alt)');
  const b=document.querySelector('#cr-cc .ev .doit.alt');
  if(!a||!b) return null;
  const ca=getComputedStyle(a), cb=getComputedStyle(b);
  return { primaryBg:ca.backgroundColor, altBg:cb.backgroundColor, altBorder:cb.borderTopWidth };
});
need('9 the secondary button is visually distinct from the primary',
     !!(alt && alt.primaryBg !== alt.altBg),
     alt ? ('primary=' + alt.primaryBg + ' alt=' + alt.altBg) : 'buttons not found');

/* run the shipped threadHtml against real row shapes */
const cases = await page.evaluate((BLOCK)=>{
  const out = { err:null, res:{} };
  try{
    const DAY = 86400000;
    const iso = d => new Date(Date.now() + d*DAY).toISOString().slice(0,10);
    /* stub only what threadHtml closes over; everything else is the shipped code */
    const mk = (estimate) => {
      const shim = `
        var __EST__ = ${JSON.stringify(estimate)};
        function liveEstimate(){ return __EST__; }
        function lead(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } }
        function bidOf(pr){ try{ return (JSON.parse(pr.checklist||'{}').bid)||{}; }catch(e){ return {}; } }
        function normStage(s){ return s || 'Lead'; }
        function usd(n){ return '$' + (Number(n)||0).toLocaleString('en-US'); }
        function fmtDay(d){ return String(d||''); }
        function daysTo(d){ if(!d) return null; return Math.round((new Date(d) - new Date()) / 86400000); }
        function esc(s){ return String(s==null?'':s); }
        var LABEL = { 'Lead':'Bid Requested', 'Prospect':'Bid Submitted', 'OnHold':'Awaiting Funding' };
        var auditRows = [];
        var events = [];
        function ago(iso){ return iso ? 'a while ago' : ''; }
      `;
      /* pull just the two functions we need out of the module text */
      const grab = (marker) => {
        const s = BLOCK.indexOf(marker);
        if(s === -1) return '';
        const o = BLOCK.indexOf('{', s);
        let d = 0;
        for(let k=o;k<BLOCK.length;k++){ if(BLOCK[k]==='{')d++; else if(BLOCK[k]==='}'){d--; if(!d) return BLOCK.slice(s,k+1);} }
        return '';
      };
      const priceOf = grab('function priceOf(pr){');
      const threadHtml = grab('function threadHtml(pr){');
      if(!threadHtml) return null;
      return new Function(shim + '\n' + priceOf + '\n' + threadHtml + '\n; return threadHtml;')();
    };
    const proj = (checklist, stage) => ({ id:'p1', stage: stage||'Lead', checklist: JSON.stringify(checklist) });

    /* 1,2 — a hand-typed price (7 of the 15 live jobs) */
    let fn = mk(null);
    out.res.typed = fn ? fn(proj({ lead:{ bid_amount: 14330, bid_due_at: iso(6) } })) : null;
    /* 3 — the inverted case: a $0.00 draft estimate is NOT a price */
    fn = mk({ total: '0.00', line_items: [], status:'draft' });
    out.res.zeroDraft = fn ? fn(proj({ lead:{ bid_amount: 0 } })) : null;
    /* 4 — a real builder total */
    fn = mk({ total: 18425, line_items: [{},{},{}], status:'draft' });
    out.res.builder = fn ? fn(proj({ lead:{} })) : null;
    /* 5,6 — nothing priced anywhere */
    fn = mk(null);
    out.res.none = fn ? fn(proj({ lead:{} })) : null;
    /* 7 — already logged */
    fn = mk(null);
    out.res.logged = fn ? fn(proj({ lead:{}, bid:{ submitted_amount: 12010, submitted_at:'2026-08-14' } })) : null;
    /* 8 — overdue */
    fn = mk(null);
    out.res.overdue = fn ? fn(proj({ lead:{ bid_amount: 9000, bid_due_at: iso(-10) } })) : null;
  }catch(e){ out.err = String(e && e.message || e); }
  return out;
}, BLOCK);

const R = (cases && cases.res) || {};
const txt = v => {
  if(v == null) return '';
  if(typeof v === 'string') return v;
  try{ return JSON.stringify(v); }catch(e){ return String(v); }
};
const hasSubmit = v => /Mark it submitted/.test(txt(v));

need('1 a hand-typed price offers "Mark it submitted"', hasSubmit(R.typed),
     cases && cases.err ? ('threw: '+cases.err) : ('got: ' + txt(R.typed).slice(0,180)));
need('2 ...and says the price came off the bid form', /bid form/i.test(txt(R.typed)),
     txt(R.typed).slice(0,180));
need('3 a $0.00 draft estimate does NOT count as priced',
     !hasSubmit(R.zeroDraft) && /needs pricing|Price it/i.test(txt(R.zeroDraft)),
     txt(R.zeroDraft).slice(0,180));
need('4 a builder-priced bid offers submit and names its line count',
     hasSubmit(R.builder) && /3 line items/.test(txt(R.builder)),
     txt(R.builder).slice(0,180));
need('5 no price anywhere still says it needs pricing',
     /needs pricing/i.test(txt(R.none)) && !hasSubmit(R.none),
     txt(R.none).slice(0,180));
need('6 ...and can still log an amount by hand', /logsub/.test(txt(R.none)),
     txt(R.none).slice(0,180));
need('7 an already-logged amount says the stage has not moved',
     hasSubmit(R.logged) && /stage not moved/i.test(txt(R.logged)),
     txt(R.logged).slice(0,180));
need('8 an overdue bid reads "days ago", never "in -N days"',
     /\d+ days ago/.test(txt(R.overdue)) && !/-\d+ days/.test(txt(R.overdue)) && !/in -/.test(txt(R.overdue)),
     'due text: ' + (txt(R.overdue).match(/Due[^<]*/) || ['(no due text)'])[0]);

/* the act itself: logging an amount must offer the stage move it stamps a date for */
const actSrc = (()=>{
  const s = BLOCK.indexOf("'logsub'");
  return s === -1 ? '' : BLOCK.slice(s, s + 2600);
})();
need('10 logging an amount offers the stage move', /setStage\(pr\.id, 'Prospect'\)/.test(actSrc),
     'no setStage in the logsub arm');
need('11 ...but never when the amount was cleared', /v0 !== ''/.test(actSrc),
     'the blank-clear path is not guarded');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_971 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
