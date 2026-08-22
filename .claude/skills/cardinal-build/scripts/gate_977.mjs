/* gate_977.mjs — a community job can sit on a waitlist (build 977).

   Theo: "with some of these organizations we help communities by doing tarps for
   free without bidding yet so they stay on a waitlist."

   The design decision this gate exists to protect: the job stays at stage Lead
   and carries a FLAG. STAGES is shared with retail and insurance, so a
   Community-only 'Waitlist' stage would appear in both other pipelines, and
   normStage() would silently turn any row given it into a Lead before the
   whitelist shipped. Assertion 1 is that fence.

     1  STAGES is untouched — no Community-only stage leaked into retail
     2  a waitlisted job's card says it is waiting, not that it needs pricing
     3  ...and names the free tarp and how long it has waited
     4  ...and offers the way back off, not another price prompt
     5  an unpriced job is offered the way ON to the waitlist
     6  a PRICED job is not (it is a bid, not a favour)
     7  the hub stops counting a waitlisted job as an open bid
     8  ...and counts it on its own
     9  the Waitlist tile is a door onto exactly those jobs
    10  tarped_at is REUSED, not duplicated

   Usage: node gate_977.mjs [path] — previous build = negative control; must go
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
need('0 modules found', !!(CC && CH2), 'cr-cc/cr-ch2 missing');

/* ---- 1: the fence. Cheap, and it is the whole reason for the flag design ---- */
const stagesM = APP.match(/\['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'\]/g) || [];
/* ⚠ scope the assertion to the REGION, not the file. A file-wide search for the
   word finds the KPI tile's label and the filter facet's label, both legitimate,
   and fails a correct patch — this project's own "scope the count" rule. */
const stagesIdx = APP.indexOf("var STAGES");
const stagesRegion = stagesIdx === -1 ? '' : APP.slice(stagesIdx, stagesIdx + 400);
need('1 STAGES is untouched — no Community stage leaked into retail',
     stagesM.length >= 1 && stagesIdx !== -1 && !/Waitlist/.test(stagesRegion),
     'STAGES copies=' + stagesM.length + '  region names Waitlist=' + /Waitlist/.test(stagesRegion));
need('10 tarped_at is reused, not duplicated',
     !/tarp_date|tarped_on|waitlist_tarp/.test(APP),
     'a second tarp-date field was invented');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1194,height:834}});
await page.route('**/*', r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },140000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* ---- 2-6: the SHIPPED threadHtml, run against real job shapes ---- */
const cards = await page.evaluate((CC)=>{
  const out={err:null};
  const grab=(src, marker)=>{ const s=src.indexOf(marker); if(s===-1) return '';
    const o=src.indexOf('{',s); let d=0;
    for(let k=o;k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(!d) return src.slice(s,k+1);} } return ''; };
  try{
    const th = grab(CC, 'function threadHtml(pr){');
    const wl = grab(CC, 'function waitlisted(pr){');
    const wd = grab(CC, 'function waitDays(pr){');
    const po = grab(CC, 'function priceOf(pr){');
    if(!th){ out.noFn = true; return out; }
    const day = d => { const t=new Date(); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };
    const mk = (estimate) => new Function('EST','SCOPE', `
      var __real = {
        liveEstimate: function(){ return EST; },
        lead: function(pr){ try{ return (JSON.parse(pr.checklist||'{}').lead)||{}; }catch(e){ return {}; } },
        bidOf: function(pr){ try{ return (JSON.parse(pr.checklist||'{}').bid)||{}; }catch(e){ return {}; } },
        ck: function(pr){ try{ return JSON.parse(pr.checklist||'{}')||{}; }catch(e){ return {}; } },
        normStage: function(s){ return s || 'Lead'; },
        usd: function(n){ return '$' + (Number(n)||0).toLocaleString('en-US'); },
        fmtDay: function(d){ return String(d||''); },
        daysTo: function(d){ if(!d) return null; return Math.round((new Date(d) - new Date())/86400000); },
        esc: function(s){ return String(s==null?'':s); },
        since: function(){ return 3; }, ago: function(){ return 'a while ago'; },
        todayIso: function(){ return '${day(0)}'; },
        LABEL: { Lead:'Bid Requested', Prospect:'Bid Submitted', OnHold:'Awaiting Funding' },
        events: [], auditRows: [],
        commBidAmount: (typeof window.commBidAmount === 'function') ? window.commBidAmount : null,
        commBidSource: (typeof window.commBidSource === 'function') ? window.commBidSource : null
      };
      var __stub = new Proxy(__real, {
        has: function(){ return true; },
        get: function(t,k){
          if(k === Symbol.unscopables) return undefined;
          if(k in t) return t[k];
          if(typeof window !== 'undefined' && k in window){
            var v = window[k];
            return (typeof v === 'function' && /^[a-z]/.test(String(k))) ? v.bind(window) : v;
          }
          return function(){ return ''; };
        }
      });
      with(__stub){
        ${po}
        ${wl}
        ${wd}
        ${th}
        return threadHtml;
      }
    `)(estimate, null);
    const proj = (lead, stage) => ({ id:'p1', name:'Job', stage: stage||'Lead',
      checklist: JSON.stringify({ lead: Object.assign({ claim_type:'community' }, lead||{}), bid:{} }) });

    const fn0 = mk(null);
    out.waiting  = fn0(proj({ waitlist_at: day(-14), tarped_at: day(-14), partner_name:'Habitat for Humanity' }));
    out.unpriced = fn0(proj({ partner_name:'Habitat for Humanity' }));
    const fnP = mk({ total: 18425, line_items:[{},{},{}] });
    out.priced   = fnP(proj({ partner_name:'Habitat for Humanity' }));
  }catch(e){ out.err = String(e && e.message || e); }
  return out;
}, CC);

const txt = v => String(v==null?'':v);
need('2 a waitlisted job says it is waiting, not that it needs pricing',
     /waitlist/i.test(txt(cards.waiting)) && !/needs pricing/i.test(txt(cards.waiting)),
     cards.err ? ('threw: '+cards.err) : (cards.noFn ? 'threadHtml not found'
       : txt(cards.waiting).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,160)));
need('3 ...and names the free tarp and how long it has waited',
     /tarped free/i.test(txt(cards.waiting)) && /waiting 14 days/i.test(txt(cards.waiting)),
     txt(cards.waiting).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,180));
need('4 ...and offers the way back off, not another price prompt',
     /data-act="unwait"/.test(txt(cards.waiting)) && !/data-act="logsub"/.test(txt(cards.waiting)),
     'acts: ' + JSON.stringify((txt(cards.waiting).match(/data-act="[a-z]+"/g)||[])));
need('5 an unpriced job is offered the way ON to the waitlist',
     /data-act="waitlist"/.test(txt(cards.unpriced)),
     'acts: ' + JSON.stringify((txt(cards.unpriced).match(/data-act="[a-z]+"/g)||[])));
need('6 a PRICED job is not offered it — that is a bid, not a favour',
     !/data-act="waitlist"/.test(txt(cards.priced)),
     'acts: ' + JSON.stringify((txt(cards.priced).match(/data-act="[a-z]+"/g)||[])));

/* ---- 7,8,9: the hub, driven for real ---- */
const seeded = await page.evaluate(()=>{
  const day = d => { const t=new Date(); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };
  const J = (id,name,stage,lead) => ({ id:id, name:name, stage:stage, address:name+' St',
    created_by:'theo@cardinalrenovations.net', updated_at:'2026-08-20T00:00:00Z', created_at:'2026-08-01T00:00:00Z',
    checklist: JSON.stringify({ lead: Object.assign({ claim_type:'community' }, lead||{}), bid:{} }) });
  window.cacheProjects = [
    J('c1','Alpha','Lead',     { partner_name:'Habitat for Humanity', bid_amount:10000 }),
    J('c2','Bravo','Lead',     { partner_name:'Habitat for Humanity', bid_amount:12000 }),
    J('c3','Charlie','Prospect',{ partner_name:'Second Chance',       bid_amount:9000 }),
    /* two on the waitlist: tarped free, never bid */
    J('c4','Delta','Lead',     { partner_name:'Habitat for Humanity', waitlist_at: day(-14), tarped_at: day(-14) }),
    J('c5','Echo','Lead',      { partner_name:'Second Chance',        waitlist_at: day(-3),  tarped_at: day(-3) })
  ];
  try{ window.CardinalCommunityHub.show(); }catch(e){ return { err:String(e&&e.message||e) }; }
  return { n: window.cacheProjects.length };
});
await page.waitForTimeout(700);
await page.evaluate(()=>{ try{ window.CardinalCommunityHome.tab('bids'); }catch(e){} });
await page.waitForTimeout(500);

const read = () => page.evaluate(()=>{
  const host = document.getElementById('cr-ch2');
  if(!host) return { err:'no hub host' };
  const tiles = Array.from(host.querySelectorAll('.cc-kpi > *')).map(el=>({
    key: el.getAttribute('data-cckpi'),
    label: (el.querySelector('.k')||{}).textContent,
    value: (el.querySelector('.v')||{}).textContent
  }));
  const fold = host.querySelector('[data-fold="allbids"]');
  return { tiles,
    rows: fold ? Array.from(fold.querySelectorAll('tbody tr')).map(t=>t.getAttribute('data-open')) : [] };
});
const base = await read();
const tile = k => base.tiles.filter(t=>t.key===k)[0] || base.tiles.filter(t=>/waitlist/i.test(String(t.label)))[0];
const openTile = base.tiles.filter(t=>/open bids/i.test(String(t.label)))[0];

need('7 the hub stops counting a waitlisted job as an open bid',
     !!(openTile && openTile.value === '3'),
     'Open bids reads ' + JSON.stringify(openTile && openTile.value) +
     ' — 5 community jobs, 2 of them waitlisted, so 3 are open');
const wt = base.tiles.filter(t=>/waitlist/i.test(String(t.label)))[0];
need('8 ...and counts the waitlist on its own',
     !!(wt && wt.value === '2'),
     wt ? ('Waitlist reads ' + wt.value) : ('no Waitlist tile — tiles: ' +
       JSON.stringify(base.tiles.map(t=>t.label + '=' + t.value))));

const tapped = await page.evaluate(()=>{
  const el = document.querySelector('#cr-ch2 [data-cckpi="wait"]');
  if(!el) return false; el.click(); return true;
});
await page.waitForTimeout(600);
const after = await read();
need('9 the Waitlist tile is a door onto exactly those jobs',
     tapped && after.rows.length === 2 && ['c4','c5'].every(id=>after.rows.indexOf(id)!==-1),
     tapped ? ('showing ' + JSON.stringify(after.rows) + ' (want c4, c5)') : 'no Waitlist tile to tap');

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_977 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
