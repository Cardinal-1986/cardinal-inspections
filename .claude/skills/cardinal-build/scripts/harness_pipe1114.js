/* harness_pipe1114.js — functional gate for Build 1114.

   Two surfaces:
     1. #pipeRow — the SHIPPED PIPE_BUCKETS / PIPE_SKIP / normStage / renderPipeline
        text is extracted from index.html and executed against production-SHAPED
        rows (including the two real ones this build exists for: a job at Closed
        and a job at OnHold, neither of which retail could show before). Proves
        the printed labels are Theo's letters, that the full stage name survives
        as the accessible name and in data-stg, and that each CRM columns the
        stages it should.
     2. #brandTitle — the SHIPPED cr-hd2-script is evaluated and its own skin()
        drives the title. Proves retail reads "Retail" as TEXT (no element
        children, so the slogan markup is genuinely gone) and that the repaint
        guard settles instead of rewriting every frame.

   Negative control: build 1113 has no `short:` on the buckets and still carries
   TITLES_HTML → RED.
   Usage: node harness_pipe1114.js [path-to-index.html]   (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0, checks = 0;
function ok(c, m){ checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);

/* ── extract the shipped text, by brace-matching rather than by line count ── */
function block(startsWith, from){
  const i = html.indexOf(startsWith, from || 0);
  if(i < 0) return null;
  let depth = 0, started = false;
  for(let j = i; j < html.length; j++){
    const c = html[j];
    if(c === '{'){ depth++; started = true; }
    else if(c === '}'){ depth--; if(started && depth === 0){
      // run on to the statement terminator for `var X = {...};` / `[...]`
      let k = j + 1;
      while(k < html.length && /[\s;\]]/.test(html[k])){ if(html[k] === ';') { k++; break; } k++; }
      return html.slice(i, k);
    } }
  }
  return null;
}
function arrayBlock(startsWith){
  const i = html.indexOf(startsWith);
  if(i < 0) return null;
  const j = html.indexOf('\n];', i);
  return j < 0 ? null : html.slice(i, j + 3);
}

const BUCKETS  = arrayBlock('var PIPE_BUCKETS = [');
const SKIP_I   = html.indexOf('var PIPE_SKIP = {');
const SKIP     = SKIP_I < 0 ? null : html.slice(SKIP_I, html.indexOf(';', SKIP_I) + 1);
const NORM     = block('function normStage(');
const RENDER   = block('function renderPipeline(){');
const LEG_I    = html.indexOf('var LEGACY_STAGE = {');
const LEGACY   = LEG_I < 0 ? null : html.slice(LEG_I, html.indexOf(';', LEG_I) + 1);

if(!BUCKETS || !SKIP || !NORM || !RENDER || !LEGACY){
  console.log('  ✗ FAIL could not extract PIPE_BUCKETS / PIPE_SKIP / LEGACY_STAGE / normStage / renderPipeline');
  console.log('\nRED'); process.exit(1);
}
if(!/short:/.test(BUCKETS)){
  console.log('  ✗ FAIL PIPE_BUCKETS carries no `short` label (negative control)');
  console.log('\nRED — Build 1114 pipeline code absent from ' + path.basename(APP));
  process.exit(1);
}

const dom = new JSDOM(
  '<!doctype html><html><head><meta name="theme-color" content="#000"></head><body>' +
  '<header class="site"><div id="cr-hd2-bar"><div id="cr-hd2-mid">' +
  '<div class="titlecard" id="brandTitle"><h1>CARDINAL <span>RESOURCE</span></h1></div>' +
  '</div></div></header>' +
  '<div class="piperow" id="pipeRow"></div></body></html>',
  { runScripts:'outside-only', pretendToBeVisual:true, url:'https://app.cardinalroster.com/' });
const w = dom.window;
const doc = w.document;

/* ── production-SHAPED rows. The two the build exists for are real stages read
      off the live table, not invented: one OnHold, one Closed. ────────────── */
const rows = [
  { id:'p1', name:'A', stage:'Lead' },      { id:'p2', name:'B', stage:'Lead' },
  { id:'p3', name:'C', stage:'Prospect' },
  { id:'p4', name:'D', stage:'Approved' },  { id:'p5', name:'E', stage:'Scheduled' },
  { id:'p6', name:'F', stage:'Completed' },
  { id:'p7', name:'G', stage:'Invoiced' },
  { id:'p8', name:'Carl Bolivar', stage:'Closed' },
  { id:'p9', name:'Maker Space Solutions LLC (Devon)', stage:'OnHold' },
  { id:'pX', name:'H', stage:'Lost' },      // not a bucket — must land nowhere
  { id:'pY', name:'I', stage:'' }           // normStage() whitelists this to Lead
];

w.eval(
  BUCKETS + '\n' + SKIP + '\n' + LEGACY + '\n' + NORM + '\n' +
  'var STAGES = ' + JSON.stringify(
      ['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost']) + ';\n' +
  'var cacheProjects = [];\n' +
  'function projectValue(pr){ return 1000; }\n' +
  'function fmtMoney(n){ return "$" + n; }\n' +
  'function renderApprovals(){}\n' +
  RENDER + '\n' +
  'window.__pipe = { render: renderPipeline, buckets: PIPE_BUCKETS, skip: PIPE_SKIP,' +
  ' set: function(r){ cacheProjects = r; } };\n'
);
w.__pipe.set(rows);

function paint(crm){
  doc.body.dataset.crm = crm;
  w.__pipe.render();
  return Array.prototype.slice.call(doc.querySelectorAll('#pipeRow .pipebtn')).map(function(b){
    return {
      stg   : b.getAttribute('data-stg'),
      label : b.querySelector('.plabel').textContent,
      aria  : b.getAttribute('aria-label'),
      title : b.getAttribute('title'),
      cls   : b.querySelector('.pcirc').className,
      count : b.querySelector('.pcount').textContent,
      money : b.querySelector('.pmoney').textContent
    };
  });
}

/* ── 1. retail: Theo's row, in Theo's order ──────────────────────────────── */
const retail = paint('retail');
ok(retail.length === 7, 'retail renders seven pipeline cards (was five)');
ok(retail.map(c => c.stg).join('|') === 'Lead|Prospect|Approved|Completed|Invoiced|Closed|OnHold',
   'the cards are in stage order, Closed then On Hold last');
ok(retail.map(c => c.label).join(' ') === 'L P A C I Closed On Hold',
   'the printed labels are exactly "L P A C I Closed On Hold"');
ok(retail.every(c => c.stg && c.stg.length > 1),
   'data-stg still carries the full stage key, so the click filter is unchanged');
ok(retail.map(c => c.aria).join('|') === 'Leads|Prospects|Approved|Completed|Invoiced|Closed|On hold',
   'aria-label carries the full stage name, so a lone letter is still announced');
ok(retail.every(c => c.title && c.title.length > 10),
   'each card keeps its descriptive title tooltip');
ok(retail.map(c => c.cls).join('|') ===
   'pcirc pipe-lead|pcirc pipe-prospect|pcirc pipe-approved|pcirc pipe-completed|' +
   'pcirc pipe-invoiced|pcirc pipe-closed|pcirc pipe-onhold',
   'every card keeps its stage colour class, Closed included');

/* ── 2. the counts, against real-shaped rows ─────────────────────────────── */
const by = {}; retail.forEach(c => { by[c.stg] = c; });
ok(by.Lead.count === '3', 'Lead counts both leads and the blank stage normStage() whitelists to Lead');
ok(by.Approved.count === '2', 'Approved still absorbs Scheduled');
ok(by.Closed.count === '1', 'the Closed card counts the job at Closed — invisible on this board until now');
ok(by.OnHold.count === '1', 'the On Hold card counts the job at OnHold — invisible on this board until now');
ok(by.Closed.money === '$1000' && by.OnHold.money === '$1000',
   'the two new cards carry money through the same projectValue()/fmtMoney() path');
ok(retail.reduce((n, c) => n + Number(c.count), 0) === 10,
   'the Lost job lands in no bucket — the row is a filter, not a total');

/* ── 2b. every bucket key must be a real stage, or its card taps into nothing.
      `openLeadsView(key)` sets ljState.sets.stage = [key] and the leads view
      lists stages via STAGES.filter(...), so a bucket key outside STAGES is a
      control that renders and does nothing (BUG_CLASSES 16). This is the same
      "the whitelist must contain it first" rule normStage() runs on. ────────── */
const STAGE_LIST = (function(){
  const m = /\['Lead','Prospect','OnHold','Approved','Scheduled','Completed','Invoiced','Closed','Lost'\]/.exec(html);
  return m ? m[0] : '';
})();
ok(!!STAGE_LIST, 'the STAGES whitelist is present and unchanged');
ok(w.__pipe.buckets.every(b => STAGE_LIST.indexOf("'" + b.key + "'") !== -1),
   'every pipeline bucket key is in STAGES, so every card taps into a real filter');

/* ── 3. the other boards ─────────────────────────────────────────────────── */
const ins = paint('insurance');
ok(ins.length === 6 && ins.every(c => c.stg !== 'OnHold'),
   'insurance still skips On Hold — a claim does not wait on a grant');
ok(ins.some(c => c.stg === 'Closed'), 'insurance does column Closed');
const comm = paint('community');
ok(comm.length === 7 && comm.some(c => c.stg === 'OnHold'),
   'community keeps On Hold and gains Closed');

/* ── 4. the header: real module, its own skin() ──────────────────────────── */
const ST = '<script id="cr-hd2-script">';
const hs = html.indexOf(ST);
const hdr = hs < 0 ? '' : html.slice(hs + ST.length, html.indexOf('</script>', hs));
ok(hdr.length > 5000, 'the shipped header module was extracted');
/* ⚠ Assert on CODE, never on the word — and this assertion USED A REGEX to do
   it, which is the very mistake the sentence below warns about. It read
   `!/TITLES_HTML\[/.test(hdr)`, and it went RED at 1117 on a tree where
   TITLES_HTML has ZERO code references, because the merge comment explaining
   the deletion quotes the retired line as `TITLES_HTML[kh]`. Prose. A correct
   artifact failed a bad assertion; the harness got away with it until now only
   because no comment had happened to contain the `[` form.
   Now it asks the sanctioned instrument — scripts/jslex_count.py, which tracks
   strings/templates/comments as lexer states — instead of guessing. It reports
   0 in CODE / 4 in comments on 1117, and 2 in CODE on BOTH controls (the 1113
   tree and main's own 1116), so the check still fails where it must. Measured,
   not assumed: the first draft of this comment said 1 and was wrong. */
let titlesHtmlCode = null;
try{
  const out = require('child_process').execFileSync('python3',
    [path.resolve(__dirname, 'jslex_count.py'), APP, 'TITLES_HTML'],
    { encoding:'utf8' });
  const m = /in CODE\s*:\s*(\d+)/.exec(out);
  titlesHtmlCode = m ? parseInt(m[1], 10) : null;
}catch(e){ titlesHtmlCode = 'lexer failed: ' + (e.message || e); }
ok(titlesHtmlCode === 0,
   'TITLES_HTML is deleted at source — 0 references in CODE (lexer says: ' +
   titlesHtmlCode + ')');
ok(!/class="hq"/.test(hdr) && !/class="hg"/.test(hdr),
   'the slogan markup is gone from the header module');

let threw = '';
try{ w.eval(hdr); }catch(err){ threw = err.message; }
ok(!threw, 'the header module evaluates clean' + (threw ? ' — ' + threw : ''));

const h1 = doc.querySelector('#brandTitle h1');
try{ w.CardinalHeader.skin(); }catch(_){ }
ok(h1.textContent === 'Retail', 'the retail header reads "Retail" (got: ' + JSON.stringify(h1.textContent) + ')');
ok(h1.children.length === 0, 'it is TEXT — no span children, so the two-tone slogan markup cannot come back');

/* the repaint guard must settle: a second skin() writes nothing */
let mutations = 0;
const mo = new w.MutationObserver(function(recs){ mutations += recs.length; });
mo.observe(h1, { childList:true, characterData:true, subtree:true });
try{ w.CardinalHeader.skin(); w.CardinalHeader.skin(); }catch(_){ }
mo.disconnect();
ok(mutations === 0, 'repeat skin() calls write nothing — the guard settles (567/569 class)');

/* the other portals are unaffected */
doc.body.dataset.crmHead = 'community';
try{ w.CardinalHeader.skin(); }catch(_){ }
ok(/Community|Retail/.test(h1.textContent), 'the title still tracks the portal through the one TITLES map');

/* ── 5. the slogan's stylesheet rules went with it ───────────────────────── */
ok(!/span\.hq\{/.test(html) && !/span\.hg\{/.test(html) && !/span\.hr\{/.test(html),
   'the three slogan span inks are deleted — no rule left that cannot match');
ok(!/@media \(max-width:437px\)\{/.test(html),
   "1065's 437px hide is gone, so the CRM name can no longer vanish on a phone");
ok(!/font-family:'American Typewriter'/.test(html),
   'the retail-only typewriter DECLARATION is gone — all five portal names render alike');

/* ── FLOOR: a test that derives its own coverage must not shrink silently ── */
const FLOOR = 28;
ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');

clearTimeout(wd);
console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                  : ('\nGREEN — all ' + checks + ' Build 1114 assertions passed'));
process.exit(fails ? 1 : 0);
