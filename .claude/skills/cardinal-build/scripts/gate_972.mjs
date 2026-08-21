/* gate_972.mjs — the community card stops going quiet after a job is awarded.

   threadHtml had arms for Lead/Prospect/OnHold/Approved/Completed only. Scheduled,
   Invoiced, Closed and Lost rendered nothing — and the Completed arm was itself
   UNREACHABLE, because nothing the card exposes could produce Completed (the only
   producers live inside #projectView children the takeover rule hides). So the
   invoice step could never be reached either.

   Runs the SHIPPED threadHtml against each stage, plus source assertions on the acts.

     1  FLOOR: every one of the nine stages renders a card (no arm may silently vanish)
     2  Scheduled says so and offers to mark the build complete
     3  ...and is honest when no build day is visible to this user (appointments are
        readable only by their creator — "nothing booked" is a claim we cannot make)
     4  Invoiced shows what went out and opens Payment Information
     5  Closed is QUIET — no urgent state, no action
     6  Lost is QUIET too, and never asks why (community records no loss reason)
     7  the second half never reads the stale BID deadline
     8  'Mark the build complete' exists as a real act (makes Completed reachable)
     9  'Get on the calendar' no longer just flips the stage — it opens the composer
    10  ...and there is exactly ONE path to Scheduled, not two
    11  the pin stops painting permanent amber for a deadline that has passed

   Usage: node gate_972.mjs [path] — previous build = negative control; must go RED
   with named failures and MUST NOT crash (BUG_CLASSES 37). */
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

/* (971's alt-button check lives in gate_971; this gate is about the arms) */
/* SKIP */ if(false) {
const alt = await page.evaluate(()=>{
  const a=document.querySelector('#cr-cc .ev .doit:not(.alt)');
  const b=document.querySelector('#cr-cc .ev .doit.alt');
  if(!a||!b) return null;
  const ca=getComputedStyle(a), cb=getComputedStyle(b);
  return { primaryBg:ca.backgroundColor, altBg:cb.backgroundColor, altBorder:cb.borderTopWidth };
});
}


/* run the shipped threadHtml against every stage */
const cases = await page.evaluate((BLOCK)=>{
  const out = { err:null, res:{} };
  try{
    const DAY = 86400000;
    const iso = d => new Date(Date.now() + d*DAY).toISOString().slice(0,10);
    const grab = (marker) => {
      const s = BLOCK.indexOf(marker);
      if(s === -1) return '';
      const o = BLOCK.indexOf('{', s);
      let d = 0;
      for(let k=o;k<BLOCK.length;k++){ if(BLOCK[k]==='{')d++; else if(BLOCK[k]==='}'){d--; if(!d) return BLOCK.slice(s,k+1);} }
      return '';
    };
    const mk = (estimate, schedDay) => {
      const shim = `
        var __EST__ = ${JSON.stringify(estimate)};
        function liveEstimate(){ return __EST__; }
        function lead(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } }
        function bidOf(pr){ try{ return (JSON.parse(pr.checklist||'{}').bid)||{}; }catch(e){ return {}; } }
        function ck(pr){ try{ return JSON.parse(pr.checklist||'{}'); }catch(e){ return {}; } }
        function normStage(s){ return s || 'Lead'; }
        function usd(n){ return '$' + (Number(n)||0).toLocaleString('en-US'); }
        function fmtDay(d){ return String(d||''); }
        function isoDay(d){ try{ return new Date(d).toISOString().slice(0,10); }catch(e){ return ''; } }
        function daysTo(d){ if(!d) return null; return Math.round((new Date(d) - new Date()) / 86400000); }
        function esc(s){ return String(s==null?'':s); }
        function ago(d){ return d ? 'a while ago' : ''; }
        var LABEL = { 'Lead':'Bid Requested','Prospect':'Bid Submitted','OnHold':'Awaiting Funding','Lost':'Not Awarded' };
        var SHORT = {};
        var events = [];
        window.CardinalProduction = ${schedDay ? `{ schedFor: function(){ return new Date('${schedDay}T12:00:00Z'); } }` : 'null'};
      `;
      const fns = grab('function priceOf(pr){') + '\n' + grab('function threadHtml(pr){');
      if(!fns.trim()) return null;
      return new Function(shim + '\n' + fns + '\n; return threadHtml;')();
    };
    const proj = (stage, checklist) => ({ id:'p1', name:'Test Job', stage: stage,
      created_at:'2026-06-01', checklist: JSON.stringify(checklist||{ lead:{} }) });

    const STAGES = ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'];
    out.res.floor = {};
    STAGES.forEach(st=>{
      const fn = mk(null, null);
      out.res.floor[st] = fn ? fn(proj(st, { lead:{ bid_amount: 9000 }, bid:{ awarded_amount: 12500 } })) : null;
    });
    /* Scheduled WITH a visible build day */
    let fn = mk(null, iso(4));
    out.res.schedWith = fn ? fn(proj('Scheduled', { lead:{}, bid:{ awarded_amount: 12500 } })) : null;
    /* Scheduled with NO visible day (appointments are per-creator) */
    fn = mk(null, null);
    out.res.schedNone = fn ? fn(proj('Scheduled', { lead:{}, bid:{} })) : null;
    /* the stale bid deadline must not leak into the second half */
    fn = mk(null, iso(4));
    out.res.staleDue = fn ? fn(proj('Scheduled', { lead:{ bid_due_at: iso(-120) }, bid:{} })) : null;
  }catch(e){ out.err = String(e && e.message || e); }
  return out;
}, BLOCK);

const R = (cases && cases.res) || {};
const txt = v => (v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)));

/* 1 — FLOOR: the set of stages is asserted, never derived (a vanished arm must fail) */
const STAGES = ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'];
/* A card is not enough: threadHtml falls back to a generic "Bid requested" entry
   whenever no arm matched, so a vanished arm would still render something. The
   floor asserts each stage names ITS OWN state. */
const EXPECT = { Lead:/needs pricing|ready to submit|Submitted/i, Prospect:/decision/i,
  OnHold:/Parked|funding/i, Approved:/Awarded/i, Scheduled:/Build scheduled/i,
  Completed:/invoice/i, Invoiced:/Invoiced/i, Closed:/Closed/i, Lost:/Not Awarded|did not come/i };
const silent = STAGES.filter(st => !EXPECT[st].test(txt((R.floor||{})[st])));
need('1 every one of the nine stages names its own state', silent.length === 0,
     cases && cases.err ? ('threw: '+cases.err) : ('generic or missing: ' + JSON.stringify(silent)));

need('2 Scheduled says so and offers to mark the build complete',
     /Build scheduled/.test(txt(R.schedWith)) && /Mark the build complete/.test(txt(R.schedWith)),
     txt(R.schedWith).slice(0,200));
need('2b ...and shows the booked day', /Build day/.test(txt(R.schedWith)),
     txt(R.schedWith).slice(0,200));
need('3 Scheduled is honest when no day is visible to this user',
     /calendar/i.test(txt(R.schedNone)) && !/nothing is booked|not booked/i.test(txt(R.schedNone)),
     txt(R.schedNone).slice(0,220));
need('4 Invoiced shows what went out and opens Payment Information',
     /Invoiced/.test(txt((R.floor||{}).Invoiced)) && /Payment Information/.test(txt((R.floor||{}).Invoiced)),
     txt((R.floor||{}).Invoiced).slice(0,200));
need('5 Closed is quiet — no urgent state, no action',
     !/ev now/.test(txt((R.floor||{}).Closed)) && !/data-act/.test(txt((R.floor||{}).Closed)),
     txt((R.floor||{}).Closed).slice(0,200));
need('6 Lost is quiet and never asks why',
     !/ev now/.test(txt((R.floor||{}).Lost)) && !/data-act/.test(txt((R.floor||{}).Lost)) && !/reason/i.test(txt((R.floor||{}).Lost)),
     txt((R.floor||{}).Lost).slice(0,200));
need('7 the second half never reads the stale bid deadline',
     !/-\d+ days/.test(txt(R.staleDue)) && !/120 days/.test(txt(R.staleDue)),
     txt(R.staleDue).slice(0,220));

/* source assertions: the acts behind the buttons */
const CC = BLOCK;
need('8 "complete" is a real act, so Completed is reachable',
     /a === 'complete'/.test(CC) && /setStage\(pr\.id, 'Completed'\)/.test(CC),
     'no complete act in cr-cc-script');
need('9 schedule opens the composer instead of flipping the stage',
     /openApptDay/.test(CC) && /apptKind/.test(CC),
     'schedule act does not reach the calendar');
need('10 there is exactly ONE path to Scheduled, not two',
     !/setStage\(pr\.id, 'Scheduled'\)/.test(CC),
     'a direct setStage to Scheduled still exists beside the composer');
need('11 the pin stops painting amber for a deadline already passed',
     /dueLive972/.test(APP) && /due >= 0/.test(APP),
     'pin urgency still ungated');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_972 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
