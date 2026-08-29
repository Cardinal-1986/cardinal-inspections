/* gate_974.mjs — one community bid amount (build 974).

   Six definitions of "the amount" lived in three blocks, and two of them ranked
   the same two sources in OPPOSITE orders: cr-cc's card preferred the estimate
   builder and fell back to the hand-typed figure; cr-ch2's bidAmt preferred the
   hand-typed figure and fell back to the estimate. One job, two screens, two
   numbers. Analytics read neither and counted every builder-priced bid as $0.
   The Bid tab multiplied `it.price`, a key no line object in production has.

   Every assertion below runs the SHIPPED functions — extracted from the artifact
   by brace-matching and executed — not a re-implementation.

     1  the resolver exists and ranks awarded > submitted > builder > typed
     2  ...and answers "none" rather than inventing a number
     3  the card and the hub return the SAME amount for the same job  (the
        opposite-precedence bug, in one assertion)
     4  an awarded job reports the awarded figure, not a stale builder total
     5  a NON-itemized line uses `amount`; it does not multiply qty x unit_price
     6  ...and an itemized line still multiplies
     7  a job priced on the bid form is no longer told "No bid priced yet"
     8  analytics counts a builder-priced bid instead of $0
     9  awarding rebinds the bill-to to whoever funded it
    10  ...but a blank funder does NOT wipe the bill-to (mergeCk deletes '')
    11  the outcome form no longer seeds a stale partner id

   Usage: node gate_974.mjs [path] — previous build = negative control; must go
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

const blockOf = id => { const i=APP.indexOf('<script id="'+id+'"'); if(i===-1) return ''; return APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</script>',i)); };
const CC = blockOf('cr-cc-script');
const CH2 = blockOf('cr-ch2-script');
const CAN = blockOf('cr-can-script');
need('0 modules found', !!(CC && CH2 && CAN), 'cr-cc/cr-ch2/cr-can missing');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

const run = await page.evaluate(async ({CC, CH2, CAN})=>{
  const out = { err:null, notes:[] };
  const grab = (src, marker) => {
    const s = src.indexOf(marker); if(s === -1) return '';
    const o = src.indexOf('{', s); let d = 0;
    for(let k=o;k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(!d) return src.slice(s,k+1);} }
    return '';
  };
  const proj = (lead, bid) => ({ id:'p1', name:'Job', stage:'Lead',
    checklist: JSON.stringify({ claim_type:'community', lead: lead||{}, bid: bid||{} }) });

  try{
    /* ---- 1,2,4: the resolver itself, as the app exposes it ---- */
    out.hasResolver = (typeof window.commBidAmount === 'function');
    if(out.hasResolver){
      const R = window.commBidAmount;
      out.ladder = {
        awarded : R(proj({ bid_amount: 100 }, { awarded_amount: 900, submitted_amount: 500 }), { total: 700 }),
        logged  : R(proj({ bid_amount: 100 }, { submitted_amount: 500 }), { total: 700 }),
        builder : R(proj({ bid_amount: 100 }, {}), { total: 700 }),
        typed   : R(proj({ bid_amount: 100 }, {}), { total: 0 }),
        none    : R(proj({}, {}), null)
      };
    }

    /* ---- 3: the card and the hub, on ONE job that used to split them ---- */
    /* hand-typed 14,330 AND a builder total of 18,425: 973's card said 18,425
       and 973's hub said 14,330. */
    const split = proj({ bid_amount: 14330 }, {});
    const ccPriceOf = grab(CC, 'function priceOf(pr){');
    if(ccPriceOf){
      const cardFn = new Function('EST', `
        function lead(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } }
        function bidOf(pr){ try{ return (JSON.parse(pr.checklist||'{}').bid)||{}; }catch(e){ return {}; } }
        function liveEstimate(){ return EST; }
        ` + ccPriceOf + '; return priceOf;')({ total: 18425, line_items:[{},{},{}] });
      out.cardAmt = cardFn(split).amt;
      out.cardSrc = cardFn(split).src;
    } else out.notes.push('cr-cc priceOf not found');

    const hubBidAmt = grab(CH2, 'function bidAmt(pr){');
    if(hubBidAmt){
      const hubPrice = grab(CH2, 'function bidPrice(pr){');
      const hubFn = new Function('T', `
        function lead(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } }
        var estTot = { p1: T };
        ` + hubPrice + '\n' + hubBidAmt + '; return bidAmt;')(18425);
      out.hubAmt = hubFn(split);
    } else out.notes.push('cr-ch2 bidAmt not found');

    /* ---- 5,6,7: the Bid tab ---- */
    const bidHtml = grab(CC, 'function bidHtml(pr){');
    if(bidHtml){
      const mkBid = (EST) => new Function('EST', `
        function lead(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } }
        function bidOf(pr){ try{ return (JSON.parse(pr.checklist||'{}').bid)||{}; }catch(e){ return {}; } }
        function liveEstimate(){ return EST; }
        function homeownerOf(){ return 'Homeowner'; }
        function esc(s){ return String(s==null?'':s); }
        function usd(n){ return '$' + (Number(n)||0).toLocaleString('en-US'); }
        function daysTo(){ return 5; }
        function normStage(s){ return s || 'Lead'; }
        var LABEL = { Lead:'Bid Requested' };
        ` + (grab(CC, 'function priceOf(pr){')||'function priceOf(){ return {amt:0,src:"none"}; }') +
        '\n' + (grab(CC, 'function priceSrc(pr){')||'') + '\n' + bidHtml + '; return bidHtml;')(EST);

      /* a LUMP SUM line: unit_price 0, amount 12000 — the live shape on 14 of 18 rows.
         ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): build 1096 made pricing
         a PER-LINE choice — a line is lump-sum when it.flat === true; the
         estimate-level `itemized:false` is still written on save but "nothing
         1096+ reads it to render" (build log 1096). The fixture now declares the
         lump line the way the app does; the assertions are unchanged. */
      out.lump = mkBid({ total: 12000, itemized: false,
        line_items: [{ name:'OC Duration', qty: 11, unit:'EA', unit_price: 0, amount: 12000, flat: true }] })(proj({}, {}));
      /* an ITEMIZED line: 4 x 250 */
      out.itemized = mkBid({ total: 1000, itemized: true,
        line_items: [{ name:'Vent', qty: 4, unit:'EA', unit_price: 250, amount: 0 }] })(proj({}, {}));
      /* priced on the BID FORM, no builder estimate at all */
      out.handPriced = mkBid(null)(proj({ bid_amount: 14330 }, {}));
      out.unpriced   = mkBid(null)(proj({}, {}));
    } else out.notes.push('bidHtml not found');

    /* ---- 8: analytics ---- */
    const compute = grab(CAN, 'function compute(){');
    if(compute){
      const cFn = new Function('ROWS', `
        window.cacheProjects = ROWS;
        function ck(p){ try{ return JSON.parse(p.checklist||'{}'); }catch(e){ return {}; } }
        function stg(p){ return p.stage || 'Lead'; }
        function isComm(){ return true; }
        var WON = { Approved:1, Scheduled:1, Completed:1, Invoiced:1, Closed:1 };
        var OPEN = { Lead:1, Prospect:1, OnHold:1 };
        ` + compute + '; return compute;')([ Object.assign(proj({}, {}), { stage:'Approved' }) ]);
      /* no bid_amount anywhere; the money is a builder total the hub already holds */
      window.CardinalCommunityHub = window.CardinalCommunityHub || {};
      const realEstTotal = window.CardinalCommunityHub.estTotal;
      window.CardinalCommunityHub.estTotal = function(){ return 18425; };
      out.analytics = cFn();
      window.CardinalCommunityHub.estTotal = realEstTotal;
    } else out.notes.push('cr-can compute not found');

    /* ---- 9,10: ocSave's awarded arm, with the SHIPPED mergeCk ---- */
    const ocSave = grab(CC, 'async function ocSave(pr){');
    const mergeCk = grab(CC, 'function mergeCk(pr, key, next){');
    const ocMoney = grab(CC, 'function ocMoney(v){');
    if(ocSave && mergeCk && ocMoney){
      const mkSave = (OCSTATE) => new Function('OCSTATE', `
        var __PATCH__ = null;
        var oc = OCSTATE;
        function ck(p){ try{ return JSON.parse(p.checklist||'{}'); }catch(e){ return {}; } }
        function lead(pr){ return ck(pr).lead || {}; }
        function bidOf(pr){ return ck(pr).bid || {}; }
        function todayIso(){ return '2026-08-21'; }
        function render(){}
        async function load(){}
        var OC_AUDIT = {};
        window.patchProjectCk = function(pr, patch){ __PATCH__ = patch; return Promise.resolve(); };
        window.setStage = function(){ return Promise.resolve(); };
        window.auditLog = function(){};
        window.currentProject = null;
        ` + mergeCk + '\n' + ocMoney + '\n' + ocSave +
        '; return async function(pr){ await ocSave(pr); return __PATCH__; };')(OCSTATE);

      const had = proj({ partner_id:'old-id', partner_name:'Old Partner' }, {});
      out.rebind = null; out.blank = null;
      out.rebind = { p: await mkSave({ kind:'awarded', amount:'25000', decided:'2026-08-20',
        funded_by:'Habitat For Humanity', funded_id:'hab-id', tarped_at:'' })(had) };
      const had2 = proj({ partner_id:'old-id', partner_name:'Old Partner' }, {});
      out.blank = { p: await mkSave({ kind:'awarded', amount:'25000', decided:'2026-08-20',
        funded_by:'', funded_id:'', tarped_at:'' })(had2) };
    } else out.notes.push('ocSave/mergeCk/ocMoney not all found');
  }catch(e){ out.err = String(e && e.message || e); }
  return out;
}, {CC, CH2, CAN});

const L = (run && run.ladder) || {};
const S = v => (v && v.src) || '(none)';
const N = v => (v && v.amt);
need('1 the resolver ranks awarded > submitted > builder > typed',
     run.hasResolver && N(L.awarded)===900 && S(L.awarded)==='awarded' &&
     N(L.logged)===500 && S(L.logged)==='logged' &&
     N(L.builder)===700 && S(L.builder)==='builder' &&
     N(L.typed)===100 && S(L.typed)==='typed',
     run.err ? ('threw: '+run.err)
             : (run.hasResolver ? JSON.stringify(L) : 'window.commBidAmount does not exist'));
need('2 ...and refuses rather than inventing a number',
     N(L.none)===0 && S(L.none)==='none', JSON.stringify(L.none));
need('4 an awarded job reports the awarded figure, not a stale builder total',
     N(L.awarded)===900, 'got ' + N(L.awarded) + ' from ' + S(L.awarded));

need('3 the card and the hub return the SAME amount for one job',
     run.cardAmt != null && run.cardAmt === run.hubAmt,
     'card=' + run.cardAmt + ' (' + run.cardSrc + ')  hub=' + run.hubAmt +
     (run.notes.length ? '  [' + run.notes.join('; ') + ']' : ''));

const money = s => { const m = String(s||'').match(/\$[\d,]+/g); return m || []; };
need('5 a lump-sum line uses `amount`, not qty x unit_price',
     /\$12,000/.test(String(run.lump||'')) && !/>\$0</.test(String(run.lump||'')),
     'line amounts rendered: ' + JSON.stringify(money(run.lump).slice(0,4)));
need('5b ...and the qty cell is dropped on a lump sum, as the print document does',
     !/class="q">11 EA/.test(String(run.lump||'')),
     'qty cell still shown on a non-itemized line');
need('6 an itemized line still multiplies qty x unit_price',
     /\$1,000/.test(String(run.itemized||'')),
     'line amounts rendered: ' + JSON.stringify(money(run.itemized).slice(0,4)));
/* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): build 1091 renamed
   Community "bid" wording to "estimate", so the shipped phrase is now
   "No estimate priced yet". Match either so the assertion stays non-vacuous
   in both eras; the contract is unchanged. */
need('7 a job priced on the bid form is not told "No bid/estimate priced yet"',
     !/No (bid|estimate) priced yet/.test(String(run.handPriced||'')) && /\$14,330/.test(String(run.handPriced||'')),
     String(run.handPriced||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,150));
need('7b ...while a genuinely unpriced job still says so',
     /No (bid|estimate) priced yet/.test(String(run.unpriced||'')),
     String(run.unpriced||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,120));

const AN = run.analytics || {};
const wonAmt = (()=>{ try{ return AN.partners ? Object.values(AN.partners)[0].wonAmt : (AN.won && AN.won[0] && AN.won[0].amt); }catch(e){ return null; } })();
need('8 analytics counts a builder-priced bid instead of $0',
     wonAmt === 18425,
     'won amount computed as ' + JSON.stringify(wonAmt) +
     (run.notes.length ? '  [' + run.notes.join('; ') + ']' : ''));

const RB = (run.rebind && run.rebind.p && run.rebind.p.lead) || {};
need('9 awarding rebinds the bill-to to whoever funded it',
     RB.partner_name === 'Habitat For Humanity' && RB.partner_id === 'hab-id',
     JSON.stringify(RB));
const BL = (run.blank && run.blank.p && run.blank.p.lead) || {};
need('10 ...but a blank funder does not wipe the bill-to',
     BL.partner_name === 'Old Partner' && BL.partner_id === 'old-id',
     JSON.stringify(BL));

need('11 the outcome form no longer seeds a stale partner id',
     /funded_id : '',/.test(CC) && !/funded_id : l\.partner_id \|\| '',/.test(CC),
     'ocOpen still seeds the current partner id into funded_id');
need('12 one ladder, not six — the old duplicated expression is gone',
     !/var amt = est \? est\.total : \(Number\(l\.bid_amount\) \|\| 0\);/.test(APP),
     'the duplicated amt expression is still in the file');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_974 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
