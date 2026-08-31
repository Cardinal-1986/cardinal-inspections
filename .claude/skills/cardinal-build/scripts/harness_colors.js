/* OC Colors harness (builds 616-620) — runs the SHIPPED cr-occ-script text
 * against REAL oc_colors row shapes. Not a re-implementation: the module is
 * sliced out of index.html and executed, so what is proved here is what
 * deployed.
 *
 * WHAT THIS COVERS, and why each one is here rather than being obvious:
 *   - the three-level nav (hub -> line -> colour) in both directions. A back
 *     button that walks the wrong way is the 570-572 class with extra steps.
 *   - the claims the module exists to keep true. This screen is handed to
 *     homeowners, so a wrong number is not a rendering bug, it is a false
 *     statement about a warranty:
 *       * every line rendering a spec table names its source document
 *       * Oakridge's wind row is never a flat 130 (it is conditional on six
 *         nails and OC starter, per the brochure's own footnote)
 *       * the SureNail tested figures never render without their basis line
 *       * no competitor is ever named
 *       * FLEX shows only the nine colours FLEX is made in
 *       * `hidden` filters the wall, `status` never does — a discontinued
 *         colour keeps its badged spot because old roofs need matching
 *
 * WHAT THIS DOES NOT COVER, stated rather than implied:
 *   - layout. jsdom does no layout, so the 618 presentation styles, the >=44px
 *     targets and the phone pixel baseline are all proved in Chromium instead.
 *   - colour. var() inside a shorthand comes back rgba(0,0,0,0) here.
 *   - whether any of it sells. That is Theo's eyes, and nothing else.
 *
 * Usage: node harness_colors.js [path/to/index.html]
 */
const fs = require('fs');
/* ⚠ REPO ROOT, NOT A HARDCODED ABSOLUTE PATH. These harnesses carried
   an absolute path to one particular machine baked in — the sandbox they were
   written in. They ran perfectly there and are unrunnable anywhere else,
   which stayed invisible for as long as nothing else ever ran them. The first
   real CI run found it in 27 seconds: harness_tray reads three .sql files by
   absolute path UNCONDITIONALLY, so on the runner it fell 57 passes -> 4 and
   the ratchet went red on the pass count. Resolved from the repo instead. */
const CR_ROOT = require('./script_paths.cjs').ROOT + '/';
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(process.argv[2] || CR_ROOT + 'index.html', 'utf8');
/* ⚠ MODULE TEXT COMES FROM module_source.cjs, NOT FROM A BLOCK SLICE.
   This gate used to cut its module out of index.html by `<script id="cr-occ-script">`.
   That stops working the instant the module becomes an external file, which is
   what the Showroom relocation does — and it stops working SILENTLY, handing
   the gate an empty string so every assertion fails for a reason the output
   never names. The resolver finds the module inline today and in the file it is
   relocated to tomorrow, and returns byte-identical text either way. */
const MS = require('./module_source.cjs');
const FILE = process.argv[2] || CR_ROOT + 'index.html';
/* threw `no cr-occ-script` before; throws a named error now — same behaviour. */
const OCC = MS.moduleText(html, 'colors.js', { htmlPath: FILE, missing: 'throw' });

/* Real shapes, verbatim proportions from the live table:
   designer 9 (1 coty + 6 current + 2 new) · duration 11 current + 5 discontinued
   · other 5 discontinued · Shasta White hidden. Trimmed to a representative
   set that still exercises every branch.

   ⚠ THESE ROWS NOW LIVE IN ONE FILE, fixtures/oc_colors_rows.json, because
   audit_contrast needs the same rows and a second copy is how two gates come to
   disagree about what "the table" looks like. audit_contrast had been asking for
   a `rows616.json` that was never committed and self-disabling without it; this
   IS that fixture, recovered from the one place a real-shaped set already
   existed rather than invented afresh. */
const ROWS = JSON.parse(fs.readFileSync(__dirname + '/fixtures/oc_colors_rows.json', 'utf8'));
const SELLABLE = ROWS.filter(r => r.status !== 'discontinued').length;   // 6
const DEAD     = ROWS.filter(r => r.status === 'discontinued').length;   // 3

let pass = 0, fail = 0;
const ok = (l, c) => { if(c){ pass++; console.log('  PASS ' + l); }
                       else { fail++; console.log('  FAIL ' + l); } };

(async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
                        { url:'https://showroom.cardinalroster.com/', runScripts:'outside-only' });
  const w = dom.window;
  let closed = 0, hideCalls = 0;
  const q = {
    select(){ return this; },
    eq(col, val){ if(col === 'hidden') this._hidden = val; return this; },
    order(){ return this; },
    then(res){ return Promise.resolve(this._tbl === 'oc_colors'
        ? { data: ROWS.filter(r => !r.hidden), error:null }
        : { data: [], error:null }).then(res); },
  };
  Object.defineProperty(w, 'supa', { configurable:true, value:{
    from(t){ const o = Object.create(q); o._tbl = t; return o; },
    storage:{ from(){ return { createSignedUrls: async (p) =>
      ({ data:p.map(x => ({ signedUrl:'https://signed.test/' + x })), error:null }) }; } },
  }});
  w.currentUser = { email:'theo@cardinalrenovations.net' };
  w.is_admin = () => true;
  w.hideAllViews = () => { hideCalls++; };
  w.showHome = () => { closed++; };

  w.eval(OCC);
  await w.CardinalColors.open();
  const V = w.document.getElementById('cr-occ');
  const back = () => V.querySelector('#occBack').click();
  const tiles = () => [...V.querySelectorAll('.occ-line')];

  // ---- level 1: the hub ----
  ok('opens on the HUB, not a wall', !V.classList.contains('line') && !V.classList.contains('detail'));
  ok('#cr-occ is display-shown', V.style.display === 'block');
  ok('open() called hideAllViews first', hideCalls === 1);
  ok('hub lists five lines', tiles().length === 5);
  /* Deliberately NOT asserting the grid is visually hidden here — jsdom does no
     layout and cannot resolve the :not(.line):not(.detail) rules, so any check
     would pass vacuously. That proof lives in the Chromium run (c616.js). */

  ok('617: no "Coming" tiles left — every line is live',
     tiles().filter(t => t.classList.contains('soon')).length === 0);
  ok('all five lines are openable buttons',
     tiles().filter(t => t.hasAttribute('data-line')).length === 5);
  ok('Supreme leads with the wind gap that sells the upgrade',
     /60 MPH/.test(tiles()[3].textContent));
  ok('Oakridge shows BOTH wind numbers on the tile, never just 130',
     /110\s*\/\s*130 MPH/.test(tiles()[2].textContent) &&
     !/(^|[^\/\d])130 MPH/.test(tiles()[2].textContent.replace('110 / 130 MPH','')));
  ok('Duration tile counts only sellable colours',
     new RegExp(SELLABLE + ' colours').test(tiles()[0].textContent));
  ok('Discontinued tile counts only the dead ones',
     new RegExp(DEAD + ' colours').test(tiles()[4].textContent));

  // ---- THE HONESTY GATE, restated for 617 ----
  // Every line that renders a spec table must name where the figures came from.
  ok('every spec table names its source document', (() => {
    const src = w.eval('(function(){try{return JSON.stringify([]);}catch(e){return "";}})()');
    return ['duration','flex','oakridge','supreme'].every(k => {
      const seg = OCC.slice(OCC.indexOf("key:'" + k + "'"));
      const src2 = /source:'([^']*)'/.exec(seg);
      const spx = /specs:\[([\s\S]*?)\n    \]/.exec(seg);
      return src2 && src2[1].length > 3 && spx && spx[1].trim().length > 0;
    });
  })());
  /* 621: the glance carries BOTH figures, the way Oakridge's always has.
     Asserting on /130 MPH/ alone passed until the pair arrived and then
     failed against a correct file — the tile reads '130/160 MPH' now. */
  ok('Duration tile shows its sourced figures at a glance',
     /130\/160 MPH/.test(tiles()[0].textContent) && /Class 3/.test(tiles()[0].textContent));
  ok('621: the Duration tile never shows the 160 alone, without its 130 base',
     !/(^|[^\/])160 MPH/.test(tiles()[0].textContent));
  ok('FLEX tile shows Class 4 and the insurance lever',
     /Class 4/.test(tiles()[1].textContent) && /insurance/i.test(tiles()[1].textContent));

  // ---- level 2: a line page ----
  V.querySelector('.occ-line[data-line="duration"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('Duration opens a LINE page', V.classList.contains('line') && !V.classList.contains('detail'));
  ok('description comes first, as asked', !!V.querySelector('.occ-lead .occ-blurb'));
  /* 9 rows at 617 — 617 added the TRU PROtection period for parity with the two
     lines that arrived with it. Counted, not guessed: an assertion frozen at the
     old number reads as a regression when the table legitimately grows. */
  ok('…and a spec table under it', V.querySelectorAll('.occ-spec tr').length === 9);
  ok('the spec table names where the figures came from',
     /Beauty Book/.test(V.querySelector('.occ-src').textContent));
  ok('Duration renders only sellable colours', V.querySelectorAll('.occ-card').length === SELLABLE);
  ok('no discontinued colour leaks onto the Duration page',
     !/Storm Cloud|Amber|Bourbon/.test(V.querySelector('#occGrid').innerHTML));

  // the Designer filter Theo asked for by name
  const chip = (t) => [...V.querySelectorAll('.occ-chip')].find(c => c.textContent.trim() === t);
  const tab  = (t) => [...V.querySelectorAll('.occ-tab')].find(c => c.textContent.trim() === t);
  ok('617: Designer is a TAB, not a chip among the shades',
     !!tab('Designer Series') && !!tab('Standard') && !chip('Designer Series'));
  ok('…and the tab strip is a separate element from the chip bar',
     V.querySelector('#occTabs').querySelectorAll('.occ-tab').length === 3 &&
     V.querySelector('#occFilters').querySelectorAll('.occ-tab').length === 0);
  tab('Designer Series').click(); await new Promise(r => setTimeout(r, 10));
  ok('Designer filters to the designer rows only',
     V.querySelectorAll('.occ-card').length === ROWS.filter(r => r.product_line === 'designer' && r.status !== 'discontinued').length);
  tab('Standard').click(); await new Promise(r => setTimeout(r, 10));
  ok('Standard excludes the designer rows',
     V.querySelectorAll('.occ-card').length === ROWS.filter(r => r.product_line !== 'designer' && r.status !== 'discontinued').length);
  tab('All colours').click(); await new Promise(r => setTimeout(r, 10));
  ok('All colours restores the full line', V.querySelectorAll('.occ-card').length === SELLABLE);

  // ---- level 3: a colour, and the walk back ----
  V.querySelector('.occ-card').click();
  await new Promise(r => setTimeout(r, 20));
  ok('a card opens the colour DETAIL', V.classList.contains('detail'));
  ok('detail still separates our roofs from the cover',
     /Our roofs in this colour/.test(V.innerHTML) && /not manufacturer photography/i.test(V.innerHTML));

  back(); await new Promise(r => setTimeout(r, 20));
  ok('BACK from a colour returns to ITS LINE — not the hub, not closed',
     V.classList.contains('line') && !V.classList.contains('detail') &&
     V.querySelector('#occTitle').textContent.indexOf('Duration') !== -1);
  ok('…and the line still shows its colours', V.querySelectorAll('.occ-card').length === SELLABLE);
  ok('…and nothing closed on the way', closed === 0);

  back(); await new Promise(r => setTimeout(r, 20));
  ok('BACK from a line returns to the HUB',
     !V.classList.contains('line') && !V.classList.contains('detail') && tiles().length === 5);
  ok('…still nothing closed', closed === 0);

  back(); await new Promise(r => setTimeout(r, 20));
  ok('BACK from the hub closes out to home', closed === 1);

  // ---- the Discontinued page ----
  await w.CardinalColors.open();
  V.querySelector('.occ-line[data-line="discontinued"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('Discontinued page holds exactly the dead colours',
     V.querySelectorAll('.occ-card').length === DEAD);
  ok('replaced_by is on the CARD now, not only in detail',
     /Closest current: <b>Gray Tweed<\/b>/.test(V.querySelector('#occGrid').innerHTML));
  ok('a dead colour with no replacement recorded simply omits the line',
     (V.querySelector('#occGrid').innerHTML.match(/Closest current/g) || []).length === 2);
  ok('no Designer tab where the line has no designer rows', !tab('Designer Series'));
  ok('…and the tab strip is emptied, not left stale from the previous line',
     V.querySelector('#occTabs').innerHTML === '');

  // ---- the Oakridge caution: the one row that must never be a single number ----
  await w.CardinalColors.open();
  V.querySelector('.occ-line[data-line="oakridge"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('Oakridge renders a spec table', V.querySelectorAll('.occ-spec tr').length === 10);
  ok('its wind row shows 110 / 130, not 130 alone',
     /110 \/ 130 MPH/.test(V.querySelector('.occ-lead').textContent));
  ok('the caution ships and states the 6-nail + starter condition',
     !!V.querySelector('.occ-note2') &&
     /6-nail application and Owens Corning\u00ae Starter Shingle/.test(V.querySelector('.occ-note2').textContent));
  ok('the caution sits ABOVE the source line, so it is read first',
     V.querySelector('.occ-lead').innerHTML.indexOf('occ-note2') <
     V.querySelector('.occ-lead').innerHTML.indexOf('occ-src'));
  ok('Oakridge names its source document',
     /Oakridge Brochure \(10024153\)/.test(V.querySelector('.occ-src').textContent));
  ok('Oakridge has no colour grid and no tab strip (no rows in the catalogue)',
     V.querySelectorAll('.occ-card').length === 0 && V.querySelector('#occTabs').innerHTML === '');

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="supreme"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('Supreme states 60 MPH, from its data sheet',
     /60 MPH limited warranty/.test(V.querySelector('.occ-lead').textContent) &&
     /Supreme Product Data Sheet/.test(V.querySelector('.occ-src').textContent));
  ok('neither unrated line invents an impact class',
     /Not stated in the product data sheet/.test(V.querySelector('.occ-lead').textContent));
  ok('Supreme carries no caution block (nothing conditional about 60)',
     !V.querySelector('.occ-note2'));

  // ================= 618: the three presentation styles =================
  await w.CardinalColors.open();

  ok('618: default style is roofs — a roofing showroom opens on a roof',
     V.dataset.style === 'roofs');
  const styBtns = () => [...V.querySelectorAll('.occ-sty')];
  ok('the switcher offers exactly three styles',
     styBtns().length === 3 &&
     styBtns().map(b => b.dataset.sty).join(',') === 'roofs,compare,feature');
  ok('the current style is the pressed one',
     styBtns().find(b => b.dataset.sty === 'roofs').getAttribute('aria-pressed') === 'true');

  // ROOFS — heroes on the tiles, and the honest treatment for the two without
  const tile = (k) => V.querySelector('.occ-line[data-line="' + k + '"]');
  ok('roofs: a line with colours fronts a real signed cover',
     /--hero:url/.test(tile('duration').getAttribute('style') || ''));
  /* The leak guard, stated as an assertion rather than left to a pixel diff:
     the tile must NEVER carry an inline background-image, because nothing
     below 820px sizes or positions one and the phone would grow a tiled roof.
     --hero is consumed only inside the min-width query. */
  ok('roofs: the hero is a custom property, never an inline background-image',
     !/background-image/.test(tile('duration').getAttribute('style') || ''));
  ok('roofs: Oakridge and Supreme carry NO photograph…',
     !/background-image/.test(tile('oakridge').getAttribute('style') || '') &&
     !/background-image/.test(tile('supreme').getAttribute('style') || ''));
  ok('…and their wind rating becomes the artwork instead',
     tile('oakridge').dataset.nophoto === '110' && tile('supreme').dataset.nophoto === '60');
  ok('a line\u2019s hero is always one of ITS OWN colours, never borrowed', (() => {
    const styleOf = (k) => (tile(k).getAttribute('style') || '');
    /* innerHTML decodes &quot; to a real quote, so read the attribute as-is. */
    const url = (k) => (styleOf(k).match(/--hero:\s*url\(["']?([^"')]+)["']?\)/) || [])[1] || '';
    const own = (k, pred) => {
      const u = url(k); if(!u) return false;
      return ROWS.filter(pred).some(r => u.indexOf(r.slug) !== -1);
    };
    const live = r => r.status !== 'discontinued';
    const dead = r => r.status === 'discontinued';
    return own('duration', live) && own('flex', live) && own('discontinued', dead);
  })());
  ok('Discontinued fronts a DISCONTINUED roof, not a sellable one', (() => {
    const u = (tile('discontinued').getAttribute('style')||'').match(/--hero:\s*url\(["']?([^"')]+)["']?\)/);
    if(!u) return false;
    const slug = ROWS.find(r => u[1].indexOf(r.slug) !== -1);
    return slug && slug.status === 'discontinued';
  })());

  // COMPARE — bars drawn from `chart`
  styBtns().find(b => b.dataset.sty === 'compare').click();
  await new Promise(r => setTimeout(r, 20));
  ok('compare: the style switches and is marked on the view', V.dataset.style === 'compare');
  ok('compare: the hub becomes a board', V.querySelector('.occ-hub').classList.contains('board'));
  ok('compare: every sellable line draws a bar',
     V.querySelectorAll('.cmp-track').length === 4);
  /* SELF-COMPUTING, deliberately. These were hardcoded percentages (100 / 85 /
     46) until 621 raised the scale maximum from 130 to Duration's new
     conditional 160, at which point every one of them went red for a
     completely correct reason. Deriving them from the same `chart` figures the
     renderer reads means the next scale change costs nothing, and removes the
     temptation to edit magic numbers until a red goes away. */
  const CHART = {};
  for (const m of OCC.matchAll(/\n    key:'(\w+)'[\s\S]{0,4000}?chart:\{ mph:(\d+), ext:(null|\d+)/g)) {
    CHART[m[1]] = { mph: +m[2], ext: m[3] === 'null' ? null : +m[3] };
  }
  ok('harness: chart figures were actually extracted from the shipped module',
     Object.keys(CHART).length === 4, JSON.stringify(CHART));
  const TOP = Math.max(...Object.values(CHART).map(c => c.ext || c.mph));
  const expect = v => 'width:' + Math.round((v / TOP) * 100) + '%';
  ok('compare: the scale maximum is the largest figure on the board, not a literal',
     TOP === 160, 'TOP=' + TOP);
  for (const key of ['duration', 'flex', 'oakridge', 'supreme']) {
    ok('compare: ' + key + ' draws its own sourced figure to scale',
       tile(key).querySelector('.cmp-fill').getAttribute('style') === expect(CHART[key].mph),
       tile(key).querySelector('.cmp-fill').getAttribute('style') + ' vs ' + expect(CHART[key].mph));
  }

  // THE one that matters most
  const oakBar = tile('oakridge');
  ok('compare: Oakridge draws 110 SOLID, not a flat 130',
     oakBar.querySelector('.cmp-fill').getAttribute('style') === expect(110));
  ok('compare: …with the 130 portion drawn as a separate hatched extension',
     !!oakBar.querySelector('.cmp-ext'));
  ok('compare: …and the condition written beside the number',
     /110 MPH/.test(oakBar.querySelector('.cmp-num').textContent) &&
     /6 nails and OC starter/.test(oakBar.querySelector('.cmp-num').textContent));
  /* 621: the extension must land INSIDE the track. It positions at
     left:pct(mph), so while the scale was a hardcoded 130 Duration's base sat
     at left:100% and the band was clipped away entirely by overflow:hidden --
     the one visual that marks a condition, gone, and silently. Pixel geometry
     is Chromium's job; what jsdom can prove is that left + width never exceeds
     100%. */
  for (const el of V.querySelectorAll('.cmp-ext')) {
    const st = el.getAttribute('style') || '';
    const left = parseInt((st.match(/left:(\d+)%/) || [])[1], 10);
    const wide = parseInt((st.match(/width:(\d+)%/) || [])[1], 10);
    ok('compare: the hatched extension sits inside the track (' + st + ')',
       Number.isFinite(left) && Number.isFinite(wide) && wide > 0 && left + wide <= 100);
  }

  /* 621: every conditional line writes its OWN condition. Oakridge's second
     number is a CAUTION -- quote the lower one unless the roof was built that
     way -- and Duration's is an UPSELL you earn by installing the full system.
     One shared string would print a false warranty statement under one of
     them, which is exactly what the hardcoded caption would have done. */
  ok('compare: exactly the three conditional lines draw an extension',
     V.querySelectorAll('.cmp-ext').length === 3);
  /* Assert the INVARIANT, not the wording. These pinned the exact marketing
     string until 622 reworded the caption, and then failed against a correct
     file. What must hold is that Duration's caption carries its own 160
     condition and never Oakridge's nailing one — the copy above it is Theo's
     to change without breaking a gate. */
  const capOf = k => tile(k).querySelector('.cmp-num').textContent;
  ok('compare: Duration\u2019s condition is its own, not Oakridge\u2019s',
     /\b160\b/.test(capOf('duration')) && !/6 nails/.test(capOf('duration')));
  ok('compare: FLEX carries the same 160 condition',
     /\b160\b/.test(capOf('flex')) && !/6 nails/.test(capOf('flex')));

  /* ---- 622: the claim, and the qualifier that keeps it true ---- */
  V.querySelector('#occBack') && V.querySelector('#occBack').click();
  await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="duration"]').click();
  await new Promise(r => setTimeout(r, 20));
  const note = () => V.querySelector('.occ-note2');
  ok('622: the block is titled as Cardinal\u2019s claim, not as a caution',
     !!note() && /Cardinal installs the complete Owens Corning/.test(note().textContent) &&
     !/Read this before quoting/.test(note().textContent));
  ok('622: it still names all four required components',
     ['Hip & Ridge','Underlayment','eaves and the rakes','Ice & Water Barrier','Ventilation']
       .every(p => note().textContent.indexOf(p) !== -1));
  /* THE assertion that keeps the claim honest. "Standard" is not "always": a
     component can be substituted or declined, and that roof carries 130.
     Losing this sentence turns a conditional truth into an unconditional
     statement about a warranty, in front of a homeowner. */
  ok('622: the 130 fallback survives \u2014 standard is not the same as always',
     /carries the 130 MPH warranty instead/.test(note().textContent) &&
     /confirm the specification before quoting 160/.test(note().textContent));
  ok('622: the warranty stays Owens Corning\u2019s to grant, not Cardinal\u2019s',
     /Owens Corning requires/.test(note().textContent) &&
     !/Cardinal warrants/.test(V.textContent));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="oakridge"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('622: Oakridge keeps the CAUTION heading \u2014 its second number still warns',
     /Read this before quoting the wind number/.test(V.querySelector('.occ-note2').textContent) &&
     !/Cardinal installs/.test(V.querySelector('.occ-note2').textContent));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="flex"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('622: FLEX carries the same claim and the same qualifier',
     /Cardinal installs the complete Owens Corning/.test(V.querySelector('.occ-note2').textContent) &&
     /carries the 130 MPH warranty instead/.test(V.querySelector('.occ-note2').textContent));
  ok('compare: Supreme stays unconditional \u2014 no extension, no caption',
     !tile('supreme').querySelector('.cmp-ext') &&
     !/only with|full OC/.test(tile('supreme').querySelector('.cmp-num').textContent));
  ok('compare: impact chips come from chart, and only FLEX is Class 4',
     tile('flex').querySelector('.cmp-chip').textContent === 'Class 4' &&
     tile('duration').querySelector('.cmp-chip').textContent === 'Class 3' &&
     tile('oakridge').querySelector('.cmp-chip').textContent === 'Not stated');
  ok('compare: Discontinued has no chart and draws no bar',
     !tile('discontinued').querySelector('.cmp-track'));

  // the choice is remembered
  ok('the style is persisted for next time',
     w.localStorage.getItem('cr-occ-style') === 'compare');
  styBtns().find(b => b.dataset.sty === 'feature').click();
  await new Promise(r => setTimeout(r, 20));
  ok('feature: switches, and goes back to photo tiles rather than bars',
     V.dataset.style === 'feature' && !V.querySelector('.cmp-track'));

  // a style must never change what the lines SAY
  styBtns().find(b => b.dataset.sty === 'roofs').click();
  await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="oakridge"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('style is presentation only — Oakridge\u2019s caution still ships in every style',
     !!V.querySelector('.occ-note2') &&
     /6-nail application and Owens Corning\u00ae Starter Shingle/.test(V.querySelector('.occ-note2').textContent));

  // ================= 619: FLEX has its own, shorter palette =================
  await w.CardinalColors.open();
  V.querySelector('.occ-line[data-line="flex"]').click();
  await new Promise(r => setTimeout(r, 20));
  const flexNames = [...V.querySelectorAll('.occ-card')].map(c => c.dataset.slug);
  const FLEX9 = ['brownwood','driftwood','estate-gray','onyx-black','teak',
                 'black-sable','sand-dune','storm-cloud','summer-harvest'];
  ok('619: FLEX shows ONLY colours FLEX is made in',
     flexNames.every(s => FLEX9.indexOf(s) !== -1), JSON.stringify(flexNames));
  ok('619: a Duration-only colour cannot be ordered off the FLEX page',
     flexNames.indexOf('merlot') === -1 && flexNames.indexOf('evergreen-mist') === -1);
  ok('619: the discontinued FLEX colours are filtered out of the sellable page',
     flexNames.indexOf('storm-cloud') === -1 && flexNames.indexOf('summer-harvest') === -1);
  ok('619: FLEX no longer claims Duration\u2019s whole range',
     !/the colours below are the same ones/.test(V.querySelector('.occ-lead').textContent) &&
     /only made in the short list below/.test(V.querySelector('.occ-lead').textContent));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="duration"]').click();
  await new Promise(r => setTimeout(r, 20));
  const durNames = [...V.querySelectorAll('.occ-card')].map(c => c.dataset.slug);
  ok('619: Duration was NOT narrowed with it — it keeps its full palette',
     durNames.length > flexNames.length && durNames.indexOf('merlot') !== -1);
  ok('619: every FLEX colour is also a Duration colour (a subset, not a rival list)',
     flexNames.every(s => durNames.indexOf(s) !== -1));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="discontinued"]').click();
  await new Promise(r => setTimeout(r, 20));
  const deadNames = [...V.querySelectorAll('.occ-card')].map(c => c.dataset.slug);
  ok('619: the two discontinued FLEX colours still appear where they belong',
     deadNames.indexOf('storm-cloud') !== -1);

  // ================= 620: the SureNail proof =================
  await w.CardinalColors.open();
  V.querySelector('.occ-line[data-line="duration"]').click();
  await new Promise(r => setTimeout(r, 20));
  const lead = () => V.querySelector('.occ-lead');
  ok('620: Duration leads with the SureNail claim, not the Oakridge comparison',
     /first and only reinforced nailing zone ON THE FACE/.test(lead().textContent));
  ok('620: three tested figures render', V.querySelectorAll('.occ-proof .pf').length === 3);
  ok('620: the figures are the sell-sheet ones',
     [...V.querySelectorAll('.occ-proof .pf b')].map(e => e.textContent).join(',') === '2×,9×,2×');
  /* THE assertion that matters: a multiple with no basis is a marketing number. */
  ok('620: the comparison basis ships WITH the figures, never without',
     !!V.querySelector('.occ-pbasis') &&
     /single-layer nailing zones/.test(V.querySelector('.occ-pbasis').textContent) &&
     /Up to/.test(V.querySelector('.occ-pbasis').textContent));
  ok('620: the basis sits AFTER the figures, so the claim is read then qualified',
     lead().innerHTML.indexOf('occ-proof') < lead().innerHTML.indexOf('occ-pbasis'));
  ok('620: the sell sheet is named as a source alongside the beauty book',
     /SureNail Sell Sheet \(10020692\)/.test(V.querySelector('.occ-src').textContent));
  ok('620: no competitor is named on a client-facing screen',
     !/\b(IKO|GAF|CertainTeed|Malarkey|TAMKO)\b/.test(V.innerHTML));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="flex"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('620: FLEX carries the same strip and the same figures',
     V.querySelectorAll('.occ-proof .pf').length === 3 && !!V.querySelector('.occ-pbasis'));

  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="oakridge"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('620: Oakridge claims NO SureNail figures — it does not have the strip',
     !V.querySelector('.occ-proof') && !V.querySelector('.occ-pbasis'));

  /* Supreme matters more than Oakridge here, not less: it is the cheap line, so a
     borrowed SureNail figure on it would be the most profitable lie on the screen.
     Absence is not a claim — the data sheet does not mention the strip, so we say
     nothing about it either way. */
  V.querySelector('#occBack').click(); await new Promise(r => setTimeout(r, 20));
  V.querySelector('.occ-line[data-line="supreme"]').click();
  await new Promise(r => setTimeout(r, 20));
  ok('620: Supreme claims NO SureNail figures either',
     !V.querySelector('.occ-proof') && !V.querySelector('.occ-pbasis'));

  // ---- invariants ----
  ok('module still adds no global scroll-lock writer', !/body\.style\.overflow/.test(OCC));
  ok('618: the line content is WRAPPED, so the split never grids #cr-occ itself',
     /id="occBody"/.test(OCC));
  ok('618: nothing writes an inline display onto #cr-occ except open/close',
     (OCC.match(/VIEW\.style\.display/g) || []).length === 2);
  ok('hideAllViews still closes #cr-occ with display:none',
     /getElementById\('cr-occ'\)[\s\S]{0,80}style\.display = 'none'/.test(html));
  ok('#cr-occ still registered in OVERLAY_IDS and PANES',
     /OVERLAY_IDS = \[[\s\S]{0,180}'cr-occ'/.test(html) && /var PANES = \[[\s\S]{0,220}'cr-occ'/.test(html));
  ok('the query still filters on hidden, never status',
     /\.eq\('hidden', false\)/.test(OCC) && !/\.eq\('status'/.test(OCC));
  ok('every --occ-* reference in the new CSS carries a literal fallback', (() => {
    /* includeOpenTag: this assertion's text began at the `<style id=...>` tag
       itself, so the tag must survive relocation or the shape changes. */
    const css = MS.moduleText(html, 'colors.css', { htmlPath: FILE, missing: 'throw', includeOpenTag: true });
    const refs = css.match(/var\(--occ-[a-z0-9-]+[^)]*\)/g) || [];
    return refs.length > 0 && refs.every(r => /,\s*[#a-z0-9]/i.test(r));
  })());

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
