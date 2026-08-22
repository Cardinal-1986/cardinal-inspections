/* gate_975.mjs — the Community hub's numbers become doors (build 975).

   Every headline figure on the hub counted something real and then left you to
   find it by hand. Five KPI tiles, three "waiting" rows and two tally lists —
   ten dead ends, all of them wearing .cc-prow's cursor:pointer. And the one
   thing that made a door impossible: the All-bids filter bar lives INSIDE the
   All-bids fold, fold state was a DOM class render() destroyed, so applying a
   filter closed the table you were filtering.

   This is a real Chromium drive, not a source read: it seeds a community book,
   opens the hub, TAPS the tiles and reads what the table then shows.

     1  a live tile is a button; a zero tile is not a door
     2  Open bids counts the OPEN stages, not every community job ever
     3  tapping Open bids narrows All bids to exactly those rows
     4  ...and opens the fold it sent you to (it defaults closed)
     5  ...and the fold survives the next render (Apply used to close it)
     6  Due <= 7 days routes to the overdue / today / this-week band
     7  a waiting row is a door onto its own stage
     8  a by-stage tally row is a door
     9  a KPI tile draws ONE card, not three nested ones
    10  an overdue check-back finally goes red
    11  ...and reaches Due soon at all (it was Lead-only)
    12  a Production user gets three sibling waiting rows, not three nested
        unclosed ones

   Usage: node gate_975.mjs [path] — previous build = negative control; must go
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

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1194,height:834}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },140000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* ---- seed a community book with every state the doors have to separate ---- */
const seeded = await page.evaluate(()=>{
  const day = d => { const t = new Date(); t.setDate(t.getDate()+d); return t.toISOString().slice(0,10); };
  const J = (id, name, stage, lead, bid) => ({
    id:id, name:name, stage:stage, address:name + ' St', created_by:'theo@cardinalrenovations.net',
    updated_at:'2026-08-20T00:00:00Z', created_at:'2026-08-01T00:00:00Z',
    checklist: JSON.stringify({ lead: Object.assign({ claim_type:'community' }, lead||{}), bid: bid||{} })
  });
  window.cacheProjects = [
    J('c1','Alpha','Lead',      { partner_name:'Habitat For Humanity', bid_amount:10000, bid_due_at: day(-10) }),
    J('c2','Bravo','Lead',      { partner_name:'Habitat For Humanity', bid_amount:12000, bid_due_at: day(3) }),
    J('c3','Charlie','Lead',    { partner_name:'Second Chance',        bid_amount:9000 }),
    J('c4','Delta','Prospect',  { partner_name:'Second Chance',        bid_amount:8000 }),
    /* the parked job with a check-back it has sailed past — the second clock */
    J('c5','Echo','OnHold',     { partner_name:'Habitat For Humanity', bid_amount:7000, check_back_at: day(-5) }),
    J('c6','Foxtrot','Approved',{ partner_name:'Habitat For Humanity' }, { awarded_amount:25000 }),
    J('c7','Golf','Lost',       { partner_name:'Second Chance',        bid_amount:5000 }),
    J('c8','Hotel','Closed',    { partner_name:'Second Chance' },       { awarded_amount:15000 })
  ];
  try{ window.CardinalCommunityHub.show(); }catch(e){ return { err:String(e&&e.message||e) }; }
  return { n: window.cacheProjects.length };
});
await page.waitForTimeout(700);
await page.evaluate(()=>{ try{ window.CardinalCommunityHome.tab('bids'); }catch(e){} });
await page.waitForTimeout(500);

const read = () => page.evaluate(()=>{
  const host = document.getElementById('cr-ch2');
  if(!host) return { err:'hub host missing' };
  const tiles = Array.from(host.querySelectorAll('.cc-kpi > *')).map(el=>({
    tag: el.tagName, key: el.getAttribute('data-cckpi'),
    label: (el.querySelector('.k')||{}).textContent, value: (el.querySelector('.v')||{}).textContent
  }));
  const allFold = host.querySelector('[data-fold="allbids"]');
  const rows = allFold ? Array.from(allFold.querySelectorAll('tbody tr')).map(tr=>tr.getAttribute('data-open')) : [];
  const shown = allFold ? (allFold.querySelector('.cc-bar .shown')||{}).textContent : null;
  const dueRows = Array.from(host.querySelectorAll('.cc-due')).map(el=>({
    id: el.getAttribute('data-open'),
    n: (el.querySelector('b')||{}).textContent,
    hot: !!(el.querySelector('b') && el.querySelector('b').classList.contains('hot'))
  }));
  const redPills = allFold ? Array.from(allFold.querySelectorAll('td[data-l="Due"] .cc-pill'))
    .map(p=>({ txt:(p.textContent||'').trim(), red:p.classList.contains('due') })) : [];
  return {
    tiles, rows, shown, dueRows, redPills,
    allOpen: !!(allFold && allFold.classList.contains('open')),
    queues: Array.from(host.querySelectorAll('[data-queue]')).map(e=>e.getAttribute('data-queue')),
    tallies: Array.from(host.querySelectorAll('[data-tally]')).map(e=>e.getAttribute('data-tally')+':'+e.getAttribute('data-val'))
  };
});

const base = await read();
need('0 the hub rendered with the seeded book', !base.err && base.tiles.length > 0,
     base.err || ('tiles=' + base.tiles.length + ' seed=' + JSON.stringify(seeded)));

const tile = k => base.tiles.filter(t=>t.key===k)[0];
const tileByLabel = s => base.tiles.filter(t=>String(t.label||'').indexOf(s)!==-1)[0];
need('1 a live tile is a button, and carries a door',
     !!(tile('open') && tile('open').tag === 'BUTTON'),
     'tiles: ' + JSON.stringify(base.tiles.map(t=>t.tag+':'+t.key+':'+t.label)));
need('2 Open bids counts the OPEN stages, not every community job',
     !!(tile('open') && tile('open').value === '5'),
     'Open bids reads ' + JSON.stringify(tile('open') && tile('open').value) + ' of 8 community jobs (5 are open)');

async function tap(sel){
  const ok = await page.evaluate((s)=>{
    const el = document.querySelector('#cr-ch2 ' + s);
    if(!el) return false;
    el.click(); return true;
  }, sel);
  await page.waitForTimeout(500);
  return ok;
}

/* ---- 3,4: the Open bids door ---- */
const tappedOpen = await tap('[data-cckpi="open"]');
const afterOpen = await read();
need('3 tapping Open bids narrows All bids to exactly those rows',
     tappedOpen && afterOpen.rows.length === 5 &&
     ['c1','c2','c3','c4','c5'].every(id=>afterOpen.rows.indexOf(id)!==-1),
     tappedOpen ? ('showing ' + afterOpen.rows.length + ' rows: ' + JSON.stringify(afterOpen.rows))
                : 'no [data-cckpi="open"] tile to tap');
need('4 ...and opens the All-bids fold, which defaults closed',
     afterOpen.allOpen === true,
     'fold open=' + afterOpen.allOpen + ' (base was ' + base.allOpen + ')');

/* ---- 5: the fold survives the next render — this is what Apply used to break ---- */
await page.evaluate(()=>{ try{ window.CardinalCommunityHub.render(); }catch(e){} });
await page.waitForTimeout(400);
const afterRender = await read();
need('5 the fold you are filtering in survives a render',
     afterRender.allOpen === true && afterRender.rows.length === 5,
     'open=' + afterRender.allOpen + ' rows=' + afterRender.rows.length);

/* ---- 6: the deadline door ---- */
await tap('[data-ch="clear"]').catch(()=>{});
await page.evaluate(()=>{ try{ window.CardinalCommunityHub.render(); }catch(e){} });
await page.waitForTimeout(300);
const tappedDue = await tap('[data-cckpi="due7"]');
const afterDue = await read();
need('6 Due <= 7 days routes to the overdue / today / this-week band',
     tappedDue && afterDue.rows.length === 3 &&
     ['c1','c2','c5'].every(id=>afterDue.rows.indexOf(id)!==-1),
     tappedDue ? ('showing ' + JSON.stringify(afterDue.rows) + ' (want c1 overdue, c2 in 3d, c5 parked past its check-back)')
               : 'no Due tile to tap');

/* ---- 7,8: the rows nobody could tap ---- */
need('7 a waiting row is a door onto its own stage',
     base.queues.length >= 1 && base.queues.indexOf('Prospect') !== -1,
     'waiting rows carry: ' + JSON.stringify(base.queues));
await page.evaluate(()=>{ try{ window.CardinalCommunityHome.tab('clients'); window.CardinalCommunityHub.render(); }catch(e){} });
await page.waitForTimeout(400);
const clientsView = await read();
need('8 a by-stage tally row is a door',
     clientsView.tallies.some(t=>t.indexOf('stage:')===0) &&
     clientsView.tallies.some(t=>t.indexOf('partner:')===0),
     'tally rows carry: ' + JSON.stringify(clientsView.tallies.slice(0,6)));

/* ---- 9: the nested-card artifact ---- */
const nest = await page.evaluate(()=>{
  const t = document.querySelector('#cr-ch2 .cc-kpi > *');
  if(!t) return null;
  const k = t.querySelector('.k'), v = t.querySelector('.v');
  const g = e => e ? getComputedStyle(e) : null;
  const ck = g(k), cv = g(v), ct = g(t);
  return { tile: ct.borderLeftWidth, k: ck ? ck.borderLeftWidth : null, v: cv ? cv.borderLeftWidth : null,
           kBg: ck ? ck.backgroundImage.slice(0,20) : null };
});
need('9 a KPI tile draws ONE card, not three nested',
     !!(nest && nest.tile !== '0px' && nest.k === '0px' && nest.v === '0px'),
     nest ? ('tile=' + nest.tile + '  .k=' + nest.k + '  .v=' + nest.v) : 'no tile found');

/* ---- 10,11: the second clock ---- */
await page.evaluate(()=>{ try{ window.CardinalCommunityHome.tab('bids'); window.CardinalCommunityHub.render(); }catch(e){} });
await page.waitForTimeout(400);
const bids = await read();
need('11 an overdue check-back reaches Due soon at all',
     bids.dueRows.some(r=>r.id==='c5'),
     'Due soon shows: ' + JSON.stringify(bids.dueRows.map(r=>r.id)));
await tap('[data-cckpi="open"]');
const opened = await read();
const c5pill = (opened.redPills||[]).filter(p=>/hold/.test(p.txt))[0];
need('10 an overdue check-back goes red',
     !!(c5pill && c5pill.red),
     c5pill ? ('the held chip reads "' + c5pill.txt + '" and red=' + c5pill.red)
            : ('no held chip among ' + JSON.stringify((opened.redPills||[]).map(p=>p.txt))));

/* ---- 12: the Production user's unclosed divs ---- */
const prod = await page.evaluate((APPSRC)=>{
  const i = APPSRC.indexOf('<script id="cr-ch2-script"');
  const blk = APPSRC.slice(APPSRC.indexOf('>', i)+1, APPSRC.indexOf('</script>', i));
  const s = blk.indexOf('function queue(label, list');
  if(s === -1) return { err:'queue() not found' };
  const o = blk.indexOf('{', s); let d = 0, fn = '';
  for(let k=o;k<blk.length;k++){ if(blk[k]==='{')d++; else if(blk[k]==='}'){d--; if(!d){ fn = blk.slice(s,k+1); break; }} }
  const run = new Function('role', `
    function usd(n){ return '$' + (Number(n)||0); }
    function stageLabels(k){ return k; }
    var doors = {};
    ` + fn + '; return queue;');
  const html = run('prod')('Chase a decision', [{amt:1},{amt:2}], 'Prospect') +
               run('prod')('Get on the calendar', [{amt:3}], 'Approved');
  const box = document.createElement('div');
  box.innerHTML = html;
  return { top: box.children.length, nestedRows: box.querySelectorAll('.cc-prow .cc-prow').length };
}, APP);
need('12 a Production user gets sibling waiting rows, not nested unclosed ones',
     !!(prod && prod.top === 2 && prod.nestedRows === 0),
     prod && prod.err ? prod.err : ('top-level rows=' + (prod&&prod.top) + '  nested=' + (prod&&prod.nestedRows)));

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_975 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
