
/* Cardinal OC Colors — the product-line hub.  v2026-08-07 · build 620
   Reached from the Vision hub's Colors tile (data-go="colors").

   616 turned one flat wall of 30 cards into a LINE PICKER, Theo's design:
   "When clicking oc colors, 3 options. Duration, Oakridge, Discontinued. In
   Duration, a filter with Designer or a tab. A description in the duration
   page first of what makes it better." Plus Supreme, and FLEX as its own page.

   THREE LEVELS, and the back button must walk all three:
       hub  →  line page  →  colour detail
   State is two classes on #cr-occ: none = hub, .line = a line, .detail = a
   colour. .detail can sit on top of .line, so the stylesheet's .detail rules
   are written to out-specify the .line ones rather than rely on order alone.

   Rules this module exists to keep, all from settled decisions:
     1. `hidden` is not `status`. The query filters on hidden, never status.
        Discontinued colours keep a spot — now their OWN page — so an owner can
        identify an older roof and a rep can match a repair.
     2. A cover is Owens Corning's image. oc_color_photos holds OUR roofs, and
        the two render in visibly separate sections. Never mix them.
     3. NO SPEC FIGURE THAT ISN'T SOURCED. Every number in LINES below is
        quoted from an Owens Corning book Theo supplied — the file is named in
        `source` and shown on the page, and a patch-time assertion refuses to
        write a line that renders a spec table without naming its source.
        Oakridge and Supreme were held at ready:false for two builds precisely
        because nothing published by OC was reachable for them; they went live
        at 617 only once Theo supplied the actual Supreme data sheet and
        Oakridge brochure. A wind rating read aloud to a homeowner is close to
        a warranty claim — never fill one in from memory, from a search, or
        from a retailer listing.
     4. OAKRIDGE’S WIND NUMBER IS CONDITIONAL. 110 MPH is standard; 130 needs
        six nails AND Owens Corning starter along eaves and rakes. That is the
        brochure’s own footnote and it renders as a caution above the source
        line. Do not collapse that row to one number. */
(function(){
'use strict';
var VIEW = null, COLORS = [], LINE = '', FAM = '', COLL = '', CUR = null;

/* ---------------------------------------------------------------------------
   618 — three presentation styles, switchable, ABOVE 820px ONLY.

   Theo, having been asked to pick one: "What if you could filter between 3
   styles?" Different moments want different things — roofs first for a warm
   lead, the comparison board when you are justifying why not the cheap shingle.

     roofs    full-bleed roof cards            (default: a roofing showroom
                                                should open on a roof)
     compare  every line as a bar to scale
     feature  editorial spread

   THE PHONE IS UNTOUCHED. Every style collapses below 820px to exactly what
   shipped at 617, and the switcher is display:none there — a control that does
   nothing visible is worse than no control.
--------------------------------------------------------------------------- */
var STYLES = [['roofs','Roofs'], ['compare','Compare'], ['feature','Feature']];
var STYLE = 'roofs';
function styleLoad(){
  try{
    var v = localStorage.getItem('cr-occ-style');
    if(v && STYLES.some(function(s){ return s[0] === v; })) STYLE = v;
  }catch(_){}
  return STYLE;
}
function styleSet(v){
  STYLE = v;
  try{ localStorage.setItem('cr-occ-style', v); }catch(_){}
  if(VIEW) VIEW.dataset.style = v;
  hub(); styleBar();
}
function styleBar(){
  var bar = VIEW && VIEW.querySelector('#occStyles'); if(!bar) return;
  bar.innerHTML = STYLES.map(function(s){
    return '<button type="button" class="occ-sty" data-sty="' + esc(s[0]) + '" aria-pressed="' +
           (STYLE === s[0] ? 'true' : 'false') + '">' + esc(s[1]) + '</button>';
  }).join('');
  bar.querySelectorAll('.occ-sty').forEach(function(b){
    b.onclick = function(){ styleSet(b.dataset.sty); };
  });
}

/* ---------------------------------------------------------------------------
   The product lines.

   `match` decides which catalogue rows land on a line's page. Duration and FLEX
   share one palette — Theo, of the FLEX brochure: "The is flex but the color is
   the same" — so they deliberately match the same rows rather than duplicating
   any data. Verified against the books: FLEX's palette (Brownwood, Driftwood,
   Estate Gray, Onyx Black, Teak, Black Sable) is a subset of Duration's.

   `specs` rows are [label, value]. Both strings are escaped on render.
   `ready:false` renders a "Coming" tile that cannot be opened — the same
   convention the Colors tile itself used between builds 593 and 615.
--------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   FLEX does NOT come in Duration's whole palette.

   616 matched FLEX to the same rows as Duration on the strength of Theo's
   "The is flex but the color is the same". He meant the colour RENDERS the
   same — a FLEX Onyx Black looks like a Duration Onyx Black — not that FLEX is
   made in all of them. The FLEX brochure lists nine, under two headings:

     classic  Brownwood · Driftwood · Estate Gray · Onyx Black · Teak
     vibrant  Black Sable · Sand Dune · Storm Cloud · Summer Harvest

   and Owens Corning's own line comparison independently says "9 Colors
   Available Regionally" for DurationFLEX. Two sources, same count.

   Showing all twenty let a rep stand on the FLEX page, pick Merlot, and order
   a roof in a colour FLEX is not made in — the same class of error as selling
   a discontinued colour, which is the thing this module exists to prevent.

   ⚠ This list mirrors the brochure. If it grows, the brochure grew: check the
   document, do not add a slug because it looks like it belongs. Two of the
   nine (Storm Cloud, Summer Harvest) are discontinued and so are filtered out
   by `match` — they still appear on the Discontinued page, as they should.
--------------------------------------------------------------------------- */
var FLEX_COLOURS = ['brownwood','driftwood','estate-gray','onyx-black','teak',
                    'black-sable','sand-dune','storm-cloud','summer-harvest'];

var LINES = [
  {
    key:'duration',
    name:'TruDefinition® Duration®',
    kind:'Architectural shingle',
    ready:true,
    glance:'130/160 MPH · Class 3 impact · Limited Lifetime',
    blurb:'Cardinal’s standard, and SureNail® is what sells it. Owens Corning’s own claim: it is the first and only reinforced nailing zone ON THE FACE of the shingle — a wide, highly visible woven-fabric strip embedded where the nails actually go, so a crew can see the target instead of guessing at it. Where that fabric overlays both shingle layers it forms Triple Layer Protection®, up to a 200% wider common bond than a standard shingle, and that is what resists “nail pull” in high wind. It is not only about grip: a shingle may not be covered under warranty at all if it is not fastened in the right place.',
    specs:[
      ['Shingle type',      'Architectural (laminate)'],
      ['Limited warranty',  'Limited Lifetime — for as long as you own your home'],
      ['Wind resistance',   '130 MPH limited warranty \u00b7 160 MPH with the Owens Corning\u00ae Total Protection Roofing System\u00ae \u2014 see the note below'],
      ['Impact resistance', 'UL 2218 / FM 4473 — Class 3'],
      ['Algae resistance',  '25-year limited warranty (StreakGuard®)'],
      ['Fire resistance',   'ASTM E108 / UL 790 — Class A'],
      ['Wind classification','ASTM D3161 Class F \u00b7 ASTM D7158 Class H'],
      ['Nailing',           'SureNail\u00ae Technology'],
      ['Non-prorated period','TRU PROtection\u00ae \u2014 10 years']
    ],
    noteTitle:'Cardinal installs the complete Owens Corning\u00ae system.',
    note:'That is what qualifies this roof for the 160 MPH wind warranty rather than 130. Owens Corning requires at least FOUR Total Protection Roofing System\u00ae components \u2014 Hip & Ridge, OC Underlayment (Titanium\u00ae or RhinoRoof\u00ae), Starter shingles on BOTH the eaves and the rakes, and either an OC Ice & Water Barrier or an OC Ventilation product \u2014 and Cardinal installs all four as standard. The higher warranty applies to work from 1 August 2026. If a component is substituted or declined on a particular job, that roof carries the 130 MPH warranty instead, so confirm the specification before quoting 160.',
    /* OC's tested figures. The basis line is NOT optional: the comparison is
       against competing products with wide, SINGLE-LAYER nailing zones, nailed
       in the middle of the allowable zone. A multiple with no basis is a
       marketing number; with the basis it is a claim that survives being
       questioned across a kitchen table. Same discipline as Oakridge's footnote. */
    proof:{
      rows:[['2\u00d7','better nail pull-through resistance'],
            ['9\u00d7','better nail blow-through resistance'],
            ['2\u00d7','better delamination resistance']],
      basis:'Up to. Owens Corning testing against competing products with wide, single-layer nailing zones, following manufacturers\u2019 installation instructions and nailing in the middle of the allowable nailing zone.'
    },
    hero:'onyx-black',
    chart:{ mph:130, ext:160, extNote:'160 on Cardinal\u2019s standard OC system install',
            impact:'Class 3', impactKey:'c3', warranty:'Limited Lifetime' },
    source:'TruDefinition Duration Beauty Book, and the SureNail Sell Sheet (10020692) for the tested figures, and the Owens Corning Sales notice of 1 Aug 2026 for the 160 MPH Total Protection warranty',
    match:function(c){
      return c.status !== 'discontinued' &&
             (c.product_line === 'duration' || c.product_line === 'designer');
    }
  },
  {
    key:'flex',
    name:'TruDefinition® Duration® FLEX®',
    kind:'Impact-rated architectural shingle',
    ready:true,
    glance:'130/160 MPH · Class 4 impact · insurance discount',
    blurb:'The impact-rated one. SBS-modified asphalt absorbs the energy of storm debris, which earns two of the industry’s highest impact ratings — UL 2218 and FM 4473 Class 4 — and may qualify a homeowner for an insurance discount. It uses the same TruDefinition® colour platform as Duration, so a colour reads the same on either shingle — but FLEX is only made in the short list below, not the full Duration range.',
    specs:[
      ['Shingle type',      'Architectural (laminate), SBS-modified'],
      ['Limited warranty',  'Limited Lifetime'],
      ['Wind resistance',   '130 MPH limited warranty \u00b7 160 MPH with the Owens Corning\u00ae Total Protection Roofing System\u00ae \u2014 see the note below'],
      ['Impact resistance', 'UL 2218 / FM 4473 — Class 4, the highest rating. May qualify for a homeowner insurance discount.'],
      ['Algae resistance',  '25-year limited warranty (StreakGuard®)'],
      ['Nailing',           'SureNail\u00ae Technology'],
      ['Non-prorated period','TRU PROtection\u00ae \u2014 10 years']
    ],
    noteTitle:'Cardinal installs the complete Owens Corning\u00ae system.',
    note:'That is what qualifies this roof for the 160 MPH wind warranty rather than 130. Owens Corning requires at least FOUR Total Protection Roofing System\u00ae components \u2014 Hip & Ridge, OC Underlayment (Titanium\u00ae or RhinoRoof\u00ae), Starter shingles on BOTH the eaves and the rakes, and either an OC Ice & Water Barrier or an OC Ventilation product \u2014 and Cardinal installs all four as standard. The higher warranty applies to work from 1 August 2026. If a component is substituted or declined on a particular job, that roof carries the 130 MPH warranty instead, so confirm the specification before quoting 160.',
    /* OC's tested figures. The basis line is NOT optional: the comparison is
       against competing products with wide, SINGLE-LAYER nailing zones, nailed
       in the middle of the allowable zone. A multiple with no basis is a
       marketing number; with the basis it is a claim that survives being
       questioned across a kitchen table. Same discipline as Oakridge's footnote. */
    proof:{
      rows:[['2\u00d7','better nail pull-through resistance'],
            ['9\u00d7','better nail blow-through resistance'],
            ['2\u00d7','better delamination resistance']],
      basis:'Up to. Owens Corning testing against competing products with wide, single-layer nailing zones, following manufacturers\u2019 installation instructions and nailing in the middle of the allowable nailing zone.'
    },
    hero:'estate-gray',
    chart:{ mph:130, ext:160, extNote:'160 on Cardinal\u2019s standard OC system install',
            impact:'Class 4', impactKey:'c4', warranty:'Limited Lifetime' },
    source:'TruDefinition Duration FLEX brochure, and the SureNail Sell Sheet (10020692) for the tested figures, and the Owens Corning Sales notice of 1 Aug 2026 for the 160 MPH Total Protection warranty',
    match:function(c){
      return c.status !== 'discontinued' && FLEX_COLOURS.indexOf(c.slug) !== -1;
    }
  },
  {
    key:'oakridge',
    name:'Oakridge®',
    kind:'Laminated (architectural) shingle',
    ready:true,
    glance:'110/130 MPH · Limited Lifetime',
    blurb:'The step up from a three-tab. Owens Corning\u2019s own wording: a full double layer in the nailing zone gives Oakridge greater integrity and better holding power compared with shingles that have single-layer nail zones. It is a laminated shingle with a Limited Lifetime warranty \u2014 but read the wind line below carefully, because the number depends on how it is nailed.',
    specs:[
      ['Shingle type',       'Laminated (architectural)'],
      ['Limited warranty',   'Limited Lifetime \u2014 for as long as you own your home. 40-Year Limited on commercial projects.'],
      ['Wind resistance',    '110 / 130 MPH limited warranty \u2014 see the note below'],
      ['Algae resistance',   '25-year limited warranty (StreakGuard\u00ae). Installation must include an Owens Corning Hip & Ridge product.'],
      ['Fire resistance',    'ASTM E108 / UL 790 \u2014 Class A'],
      ['Wind classification','ASTM D3161 Class F \u00b7 ASTM D7158 Class H'],
      ['Impact resistance',  'Not stated in the product brochure'],
      ['Nailing',            'Full double layer in the nailing zone'],
      ['Non-prorated period','TRU PROtection\u00ae \u2014 10 years'],
      ['Size / exposure',    '13\u00bc\u2033 \u00d7 39\u215c\u2033 \u00b7 5\u215d\u2033 exposure']
    ],
    /* The footnote is NOT decoration. Quoting 130 on a four-nail roof states
       something false about a warranty, and this is the exact ‡‡ text from the
       brochure. Never shorten this row to a single number. */
    noteTitle:'Read this before quoting the wind number.',
    note:'110 MPH is standard with 4-nail application. 130 MPH applies ONLY with 6-nail application and Owens Corning\u00ae Starter Shingle along eaves and rakes, per the installation instructions. Quote 110 unless the roof was actually built that way.',
    hero:null,
    /* ext is the hatched part of the bar. It exists so the board can never draw
       Oakridge as a flat 130 — same rule as the spec row, same reason. */
    chart:{ mph:110, ext:130, extNote:'130 only with 6 nails and OC starter',
            impact:'Not stated', impactKey:'cn', warranty:'Limited Lifetime' },
    source:'Oakridge Brochure (10024153)',
    match:null
  },
  {
    key:'supreme',
    name:'Supreme®',
    kind:'Three-tab strip shingle',
    ready:true,
    glance:'60 MPH \u00b7 25-year \u00b7 the entry line',
    blurb:'The value line \u2014 Owens Corning\u2019s own framing is a balance of curb appeal, weather resistance and value. It is a flat three-tab rather than a laminated shingle, the warranty runs 25 years rather than a lifetime, and the wind warranty is 60 MPH against Duration\u2019s 130. That gap is the honest reason to put a better shingle on a house in this part of Ohio.',
    specs:[
      ['Shingle type',       'Three-tab strip'],
      ['Limited warranty',   '25-Year Limited'],
      ['Wind resistance',    '60 MPH limited warranty'],
      ['Algae resistance',   '10-year limited warranty (StreakGuard\u00ae), available on a regional basis'],
      ['Fire resistance',    'ASTM E108 / UL 790 \u2014 Class A'],
      ['Wind classification','ASTM D3161 Class F \u00b7 ASTM D7158 Class H'],
      ['Impact resistance',  'Not stated in the product data sheet'],
      ['Non-prorated period','TRU PROtection\u00ae \u2014 5 years'],
      ['Size / exposure',    '12\u2033 \u00d7 36\u2033 \u00b7 5\u2033 exposure']
    ],
    note:'',
    hero:null,
    chart:{ mph:60, ext:null, impact:'Not stated', impactKey:'cn', warranty:'25 years' },
    source:'Supreme Product Data Sheet (10013324)',
    match:null
  },
  {
    key:'discontinued',
    name:'Discontinued',
    kind:'No longer available to order',
    ready:true,
    glance:'For identifying and matching an existing roof',
    blurb:'Cardinal has been roofing for years, and a homeowner cannot name the colour on a twelve-year-old roof from the driveway. These are kept so an existing roof can be identified and a repair matched. None of them can be ordered. Where Owens Corning has a current colour that comes closest, it is named on the card.',
    specs:[], note:'', source:'',
    hero:'bourbon', chart:null,
    match:function(c){ return c.status === 'discontinued'; }
  }
];

function lineOf(key){
  for(var i = 0; i < LINES.length; i++) if(LINES[i].key === key) return LINES[i];
  return null;
}

function sb(){ return (typeof supa !== 'undefined' && supa) ? supa : (window.supa || null); }
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function amStaff(){ try{ return !!(window.currentUser && window.currentUser.email); }catch(_){ return false; } }
function amAdmin(){ try{ return !!(window.is_admin && window.is_admin()); }catch(_){ return false; } }

/* Sign for DISPLAY ONLY. Never write a signed URL back onto a row — the
   estimates lesson: a signed URL persisted into a record expires and corrupts
   it permanently. */
async function signMany(paths){
  var out = {}, list = (paths || []).filter(Boolean);
  if(!list.length) return out;
  var cl = sb(); if(!cl || !cl.storage) return out;
  try{
    var r = await cl.storage.from('photos').createSignedUrls(list, 3600);
    if(!r || r.error || !Array.isArray(r.data)) return out;
    /* 633: key by the path the API answered FOR, falling back to position.
       This has keyed by position since 630 and got away with it because both
       requested paths usually existed. 633 asks for a third that is absent on
       every photograph the first time it runs, and a compacted response would
       then hand each photo its neighbour's picture — silently, and wrongly. */
    r.data.forEach(function(d, i){
      if(!d || !d.signedUrl || d.error) return;
      out[d.path || list[i]] = d.signedUrl;
    });
  }catch(e){ try{ if(window.report) window.report(e, 'Colors', 'sign'); }catch(_){} }
  return out;
}

function ensureView(){
  if(VIEW && document.body.contains(VIEW)) return VIEW;
  VIEW = document.getElementById('cr-occ');
  if(VIEW) return VIEW;
  VIEW = document.createElement('div');
  VIEW.id = 'cr-occ';
  VIEW.innerHTML =
    '<div class="occ-head">' +
      '<button type="button" class="occ-back" id="occBack">← Back</button>' +
      '<div class="occ-title"><b id="occTitle">Colors</b><span id="occSub">Owens Corning shingle colours</span></div>' +
      '<div class="occ-styles" id="occStyles" role="group" aria-label="Presentation style"></div>' +
    '</div>' +
    '<div class="occ-hub" id="occHub"></div>' +
    /* 618: the line content is WRAPPED so a style can make it two columns.
       The grid could not go on #cr-occ itself — open() sets an inline
       display:block there, and an inline style beats every stylesheet rule at
       any specificity. That is the styleMounts() / showApp() trap this repo
       has now hit three times; it does not get a fourth. */
    '<div class="occ-body2" id="occBody">' +
      '<div class="occ-lead" id="occLead"></div>' +
      '<div class="occ-tabs" id="occTabs"></div>' +
      '<div class="occ-filters" id="occFilters"></div>' +
      '<div class="occ-count" id="occCount"></div>' +
      '<div class="occ-grid" id="occGrid"></div>' +
    '</div>' +
    '<div class="occ-detail" id="occDetail"></div>';
  VIEW.dataset.style = styleLoad();
  document.body.appendChild(VIEW);
  /* Three levels, so this walks back one at a time rather than closing. */
  VIEW.querySelector('#occBack').onclick = function(){
    if(VIEW.classList.contains('detail')) return showLine(LINE);
    if(VIEW.classList.contains('line'))   return showHub();
    close();
  };
  return VIEW;
}

function tags(c){
  var t = [];
  if(c.status === 'coty') t.push('<span class="occ-tag coty">Color of the Year' + (c.coty_year ? ' ' + c.coty_year : '') + '</span>');
  else if(c.coty_year)   t.push('<span class="occ-tag was">' + c.coty_year + ' Color of the Year</span>');
  if(c.status === 'new')          t.push('<span class="occ-tag new">New</span>');
  if(c.status === 'discontinued') t.push('<span class="occ-tag disc">Discontinued</span>');
  return t.join('');
}

/* 616 fix: the card sub-line used to be a binary — designer or "TruDefinition
   Duration" — so the five rows carrying product_line='other' (Slate Grey, Aged
   Cedar, Desert Tan, Summer Harvest, Bourbon) were all labelled Duration, which
   is a product claim nobody recorded. They are old discontinued colours whose
   line was never captured. Say the manufacturer and stop there; do not guess. */
function lineLabel(c){
  if(c.product_line === 'designer') return 'Designer Collection';
  if(c.product_line === 'duration') return 'TruDefinition Duration';
  return 'Owens Corning';
}

function shot(c){
  if(c._src) return '<div class="occ-shot"><img src="' + esc(c._src) + '" alt="' + esc(c.name) + '" loading="lazy"></div>';
  /* No cover. Fall back to the hex — but every hex in this table is eyeballed
     and hex_verified is false, so say so on the card rather than let a rep
     hold a tablet up to a house and call it the colour. */
  return '<div class="occ-shot"><div class="occ-swatch" style="background:' + esc(c.hex || '#333') + ';">' +
         '<div class="occ-unver">Approximate colour — not a verified swatch</div></div></div>';
}

/* ---- the hub: pick a line ------------------------------------------------ */
function bar(L){
  /* The comparison bar, drawn from `chart`. The scale maximum is COMPUTED from
     the largest figure any line carries. It was hardcoded to 130 until 621, and
     Duration's new 160 would have divided to 123% inside an overflow:hidden
     track — rendering pinned at full width, reading as MAXED rather than as
     BIGGEST, with the hatched extension pushed outside the track and clipped
     away entirely. Both failures were silent. Do not put a literal back.

     A conditional line draws a SOLID base plus a HATCHED extension, and each
     supplies its OWN `extNote`. That is not tidiness: Oakridge's 110/130 is a
     CAUTION (quote the lower number unless the roof was built that way) and
     Duration's 130/160 is an UPSELL (quote the higher only when the system was
     actually installed). Same geometry, opposite sales meaning — sharing one
     string would print a false warranty statement under one of them. */
  var c = L.chart;
  if(!c) return '<div class="cmp"><div class="cmp-num soft">' + esc(L.glance) + '</div></div>';
  var top = LINES.reduce(function(m, x){
    return Math.max(m, (x.chart && (x.chart.ext || x.chart.mph)) || 0); }, 1);
  var pct = function(v){ return Math.round((v / top) * 100); };
  return '<div class="cmp">' +
    '<div class="cmp-track">' +
      '<div class="cmp-fill" style="width:' + pct(c.mph) + '%"></div>' +
      (c.ext ? '<div class="cmp-ext" style="left:' + pct(c.mph) + '%;width:' + (pct(c.ext) - pct(c.mph)) + '%"></div>' : '') +
    '</div>' +
    '<div class="cmp-num">' + c.mph + ' MPH' +
      (c.ext ? ' <small>\u2014 ' + esc(c.extNote) + '</small>' : '') +
    '</div>' +
  '</div>' +
  '<div class="cmp-right">' +
    '<span class="cmp-chip cmp-' + esc(c.impactKey) + '">' + esc(c.impact) + '</span>' +
    '<div class="cmp-warr">' + esc(c.warranty) + '</div>' +
  '</div>';
}

function hub(){
  var box = VIEW.querySelector('#occHub');
  var board = (STYLE === 'compare');
  box.className = 'occ-hub' + (board ? ' board' : '');
  var head = board
    ? '<div class="cmp-head"><span>Line</span><span>Wind resistance limited warranty</span><span>Impact \u00b7 warranty</span></div>'
    : '';
  box.innerHTML = head + LINES.map(function(L){
    var n = L.match ? COLORS.filter(L.match).length : 0;
    var sub = L.ready
      ? (n ? n + (n === 1 ? ' colour' : ' colours') + ' \u00b7 ' + esc(L.glance) : esc(L.glance))
      : esc(L.glance);
    /* A CUSTOM PROPERTY, not background-image. Setting the image directly here
       painted it on the PHONE as well — below 820px nothing sizes or positions
       it, so the tile grew a tiled roof. --hero is consumed only inside the
       min-width query, so the phone cannot be reached. Caught by a pixel diff
       against the 617 baseline, not by any structural assertion. */
    var img = (!board && L._hero)
      ? ' style="--hero:url(&quot;' + esc(L._hero) + '&quot;)"' : '';
    /* No photograph exists for Oakridge or Supreme. data-nophoto turns the wind
       rating itself into the graphic rather than borrowing another line's roof. */
    var np = (!board && !L._hero && L.chart) ? ' data-nophoto="' + esc(String(L.chart.mph)) + '"' : '';
    return '<button type="button" class="occ-line" data-line="' + esc(L.key) + '"' + img + np + '>' +
      '<div class="occ-lname">' + esc(L.name) + '<span class="occ-go">\u2192</span></div>' +
      '<div class="occ-lkind">' + esc(L.kind) + '</div>' +
      '<div class="occ-lsub">' + sub + '</div>' +
      (board ? bar(L) : '') +
    '</button>';
  }).join('');
  box.querySelectorAll('.occ-line[data-line]').forEach(function(b){
    b.onclick = function(){ showLine(b.dataset.line); };
  });
}

/* ---- a line page: description, specs, then its colours ------------------- */
function lead(L){
  var box = VIEW.querySelector('#occLead');
  var html = '';
  if(L.blurb) html += '<p class="occ-blurb">' + esc(L.blurb) + '</p>';
  /* 620: the SureNail proof. Theo: "Sure nail strip is what sells the duration
     compared to competitors." Figures first, because that is what a customer
     remembers; the basis underneath, because that is what makes them true. */
  if(L.proof){
    html += '<div class="occ-proof">' + L.proof.rows.map(function(r){
      return '<div class="pf"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>';
    }).join('') + '</div>' +
    '<div class="occ-pbasis">' + esc(L.proof.basis) + '</div>';
  }
  if(L.specs && L.specs.length){
    html += '<table class="occ-spec"><tbody>' + L.specs.map(function(r){
      return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('') + '</tbody></table>';
    /* Name where the figures came from. A warranty number on a client-facing
       screen has to be attributable, not just plausible. */
    /* 617: the note rides ABOVE the source line and is styled as a caution,
       because on Oakridge it is the difference between a true and a false
       statement about a warranty. */
    /* 622: the TITLE is per-line for the same reason 621 moved the bar caption
       there. On Oakridge this block is a caution — quote the lower number
       unless the roof was built that way. On Duration it is now the opposite:
       Cardinal installs the full system, so the higher number is earned rather
       than hoped for. One shared heading framed a selling point as a warning.
       Anything that reads differently on two lines belongs on the line. */
    if(L.note)   html += '<div class="occ-note2"><b>' + esc(L.noteTitle || 'Read this before quoting the wind number.') + '</b> ' + esc(L.note) + '</div>';
    if(L.source) html += '<div class="occ-src">Specifications as published by Owens Corning — ' + esc(L.source) + '.</div>';
  }
  box.innerHTML = html;
}

function render(){
  var g = VIEW.querySelector('#occGrid');
  var L = lineOf(LINE);
  if(!L || !L.match){ g.innerHTML = ''; VIEW.querySelector('#occCount').textContent = ''; return; }
  var list = COLORS.filter(L.match).filter(function(c){
    if(FAM  && c.family !== FAM) return false;
    if(COLL === 'designer' && c.product_line !== 'designer') return false;
    if(COLL === 'standard' && c.product_line === 'designer') return false;
    return true;
  });
  VIEW.querySelector('#occCount').textContent =
    list.length + (list.length === 1 ? ' colour' : ' colours');
  if(!list.length){ g.innerHTML = '<div class="occ-empty">No colours match that filter.</div>'; return; }
  g.innerHTML = list.map(function(c){
    return '<button type="button" class="occ-card" data-slug="' + esc(c.slug) + '">' +
      shot(c) +
      '<div class="occ-meta">' +
        '<div class="occ-name">' + esc(c.name) + '</div>' +
        '<div class="occ-sub">' + esc(lineLabel(c)) + '</div>' +
        '<div class="occ-tags">' + tags(c) + '</div>' +
        /* 616: the replacement on the CARD, not just in detail — a repair match
           should read straight off the grid without opening anything, which is
           the whole reason these rows still have a spot. */
        (c.status === 'discontinued' && c.replaced_by
          ? '<div class="occ-repl">Closest current: <b>' + esc(c.replaced_by) + '</b></div>' : '') +
      '</div></button>';
  }).join('');
  g.querySelectorAll('.occ-card').forEach(function(b){
    b.onclick = function(){ openColor(b.dataset.slug); };
  });
}

function filters(){
  var L = lineOf(LINE);
  if(!L || !L.match){
    VIEW.querySelector('#occFilters').innerHTML = '';
    VIEW.querySelector('#occTabs').innerHTML = '';
    return;
  }
  var pool = COLORS.filter(L.match);
  var fams = [];
  pool.forEach(function(c){ if(c.family && fams.indexOf(c.family) === -1) fams.push(c.family); });
  fams.sort();

  /* 617: Theo — "Also tab designer series". The collection split is a real TAB
     STRIP now, not another chip in the same row as the shades: two different
     kinds of choice should not look identical. Shades stay chips below it. */
  var hasDes = pool.some(function(c){ return c.product_line === 'designer'; });
  var hasStd = pool.some(function(c){ return c.product_line !== 'designer'; });
  var tabs = VIEW.querySelector('#occTabs');
  if(hasDes && hasStd){
    var T = [['','All colours'], ['standard','Standard'], ['designer','Designer Series']];
    tabs.innerHTML = T.map(function(t){
      return '<button type="button" class="occ-tab" data-c="' + esc(t[0]) + '" aria-pressed="' +
             (COLL === t[0] ? 'true' : 'false') + '">' + esc(t[1]) + '</button>';
    }).join('');
    tabs.querySelectorAll('.occ-tab').forEach(function(b){
      b.onclick = function(){ COLL = b.dataset.c || ''; filters(); render(); };
    });
  } else { tabs.innerHTML = ''; }

  var html = '';
  html += '<button type="button" class="occ-chip" data-f="" aria-pressed="' + (FAM ? 'false' : 'true') + '">Every shade</button>';
  html += fams.map(function(f){
    return '<button type="button" class="occ-chip" data-f="' + esc(f) + '" aria-pressed="' + (FAM === f ? 'true' : 'false') + '">' +
           esc(f.charAt(0).toUpperCase() + f.slice(1)) + '</button>';
  }).join('');

  var bar = VIEW.querySelector('#occFilters');
  bar.innerHTML = html;
  bar.querySelectorAll('.occ-chip').forEach(function(b){
    b.onclick = function(){
      FAM = b.dataset.f || '';
      filters(); render();
    };
  });
}

/* 907: covers had no rendition and every hub hero, line tile and detail hero
   loaded the ~284KB ORIGINAL \u2014 the "pictures load super slow in the showroom"
   report. The photos bucket has Supabase image transforms enabled (verified
   against the render endpoint), so sign each cover with a width/quality
   transform: ~284KB \u2192 ~55KB, no backfill and nothing new stored. Only the
   SINGULAR createSignedUrl takes a transform (the batch signMany does not), so
   these fire in parallel. Any cover whose transform sign fails falls back to a
   plain signed original via signMany, so a hiccup degrades to the old behaviour
   rather than a blank card. 'our roofs' photos already load 150KB -t thumbs. */
async function signCoversSmall(paths, w){
  var cl = sb(); if(!cl || !cl.storage) return {};
  var list = (paths || []).filter(Boolean), out = {};
  await Promise.all(list.map(async function(p){
    try{
      var r = await cl.storage.from('photos').createSignedUrl(p, 3600,
        { transform:{ width:(w || 800), quality:72, resize:'contain' } });
      if(r && !r.error && r.data && r.data.signedUrl) out[p] = r.data.signedUrl;
    }catch(e){}
  }));
  return out;
}
async function load(){
  var cl = sb(); if(!cl) return;
  var r = await cl.from('oc_colors')
    .select('id,name,slug,hex,hex_verified,family,product_line,status,replaced_by,description,sort_order,cover_image_path,cover_credit,coty_year,hidden')
    .eq('hidden', false)
    .order('sort_order', { ascending:true });
  if(r.error || !r.data){ COLORS = []; return; }
  COLORS = r.data;
  var _paths = COLORS.map(function(c){ return c.cover_image_path; });
  var map = await signCoversSmall(_paths, 800);
  var _missing = _paths.filter(function(p){ return p && !map[p]; });
  if(_missing.length){ var _orig = await signMany(_missing); Object.assign(map, _orig); }
  COLORS.forEach(function(c){ c._src = c.cover_image_path ? map[c.cover_image_path] : null; });
  /* A line's hero is one of its OWN colours' covers — already signed above, so
     no second round trip and nothing new written anywhere.

     The named slug is only a preference. If that colour is hidden, or loses its
     cover, fall back to the first colour on the SAME line that has one. Never
     reach outside the line: a Duration roof standing in for Oakridge would be a
     false product claim, which is why the two lines with no colours at all get
     `hero:null` and the typographic treatment instead of a borrowed photo.
     Without this fallback a missing cover left Discontinued rendering a blank
     card, because it has no `chart` to fall back on either. */
  LINES.forEach(function(L){
    L._hero = null;
    if(!L.hero || !L.match) return;
    var mine = COLORS.filter(L.match);
    var named = mine.filter(function(c){ return c.slug === L.hero && c._src; })[0];
    var any   = named || mine.filter(function(c){ return !!c._src; })[0];
    L._hero = (any && any._src) || null;
  });
}

function showHub(){
  VIEW.classList.remove('detail'); VIEW.classList.remove('line');
  LINE = ''; CUR = null; FAM = ''; COLL = '';
  VIEW.querySelector('#occTitle').textContent = 'Colors';
  VIEW.querySelector('#occSub').textContent = 'Owens Corning shingle lines';
  hub();
  VIEW.scrollTop = 0;
}

function showLine(key){
  var L = lineOf(key); if(!L || !L.ready) return showHub();
  if(LINE !== key){ FAM = ''; COLL = ''; }
  LINE = key; CUR = null;
  VIEW.classList.remove('detail');
  VIEW.classList.add('line');
  VIEW.querySelector('#occTitle').textContent = L.name;
  VIEW.querySelector('#occSub').textContent = L.kind;
  lead(L); filters(); render();
  VIEW.scrollTop = 0;
}

async function openColor(slug){
  var c = COLORS.filter(function(x){ return x.slug === slug; })[0];
  if(!c) return;
  CUR = c;
  VIEW.classList.add('detail');
  VIEW.querySelector('#occTitle').textContent = c.name;
  VIEW.querySelector('#occSub').textContent = lineLabel(c);
  VIEW.scrollTop = 0;

  var d = VIEW.querySelector('#occDetail');
  var hero = c._src
    ? '<div class="occ-hero"><img src="' + esc(c._src) + '" alt="' + esc(c.name) + '" loading="lazy" decoding="async">' +
      (c.cover_credit ? '<div class="occ-credit">' + esc(c.cover_credit) + '</div>' : '') + '</div>'
    : '<div class="occ-hero"><div class="occ-swatch" style="background:' + esc(c.hex || '#333') + ';">' +
      '<div class="occ-unver">Approximate colour — not a verified swatch</div></div></div>';

  d.innerHTML = hero +
    '<div class="occ-body">' +
      '<div class="occ-h">' + esc(c.name) + '</div>' +
      '<div class="occ-tags" style="margin-top:9px">' + tags(c) + '</div>' +
      (c.description ? '<div class="occ-desc">' + esc(c.description) + '</div>' : '') +
      (c.status === 'discontinued'
        ? '<div class="occ-note"><b>Discontinued.</b> Shown so an older roof can be identified' +
          (c.replaced_by ? ' — closest current colour is <b>' + esc(c.replaced_by) + '</b>' : '') +
          '. Not available to order.</div>'
        : '') +
    '</div>' +
    '<div class="occ-sec"><b>Our roofs in this colour</b>' +
      '<span>Cardinal installs, not manufacturer photography.</span></div>' +
    '<div id="occOurs" class="occ-none">Loading…</div>' +
    '<div class="occ-actions">' +
      /* 631: only rendered when there is something to do, and it says HOW MANY.
         A permanently visible "Optimise" invites re-running it on a page that
         is already fine. */
      (amAdmin() ? '<button type="button" class="occ-btn ghost" id="occOpt" hidden></button>' : '') +
      (amStaff() ? '<button type="button" class="occ-btn" id="occAdd">Add our roofs</button>' +
                   /* 630: `multiple`. Theo: "I can't multi select from my files.
                      One at a time would take forever." */
                   '<input type="file" id="occFile" accept="image/*" multiple>' : '') +
    '</div>';

  if(amStaff()){
    var fi = d.querySelector('#occFile');
    d.querySelector('#occAdd').onclick = function(){ fi.click(); };
    fi.onchange = function(){
      if(fi.files && fi.files.length) upload(Array.prototype.slice.call(fi.files));
      /* Clear it, or picking the same file twice in a row fires no change event
         and reads as "nothing happened". */
      fi.value = '';
    };
  }
  ours(c);
}

async function ours(c){
  var box = VIEW.querySelector('#occOurs'); if(!box) return;
  var cl = sb(); if(!cl){ box.textContent = ''; return; }
  var r = await cl.from('oc_color_photos')
    .select('id,storage_path,project_address,captured_on,caption,is_hero,sort_order,created_by')
    .eq('color_id', c.id)
    .order('is_hero', { ascending:false })
    .order('sort_order', { ascending:true });
  if(r.error || !r.data || !r.data.length){
    box.className = 'occ-none';
    box.textContent = 'No Cardinal roofs recorded in this colour yet.';
    return;
  }
  /* 630: ask for the DISPLAY rendition and fall back to the original — the same
     move as 624. Photos uploaded before 630 have no -d twin, so the fallback is
     load-bearing rather than defensive: without it every pre-630 photo vanishes
     from the grid. Both paths are signed in ONE round trip. */
  var rows = r.data;
  /* 633: three renditions signed in ONE round trip. The order of the fallback
     below is the whole point — thumb for the tile, then the older display copy,
     then the original. A photo from any era still renders. */
  var want = [];
  rows.forEach(function(p){
    want.push(thumbOf(p.storage_path));
    want.push(dispOf(p.storage_path));
    want.push(p.storage_path);
  });
  var map = await signMany(want);
  OURS = rows.filter(function(p){
    return map[thumbOf(p.storage_path)] || map[dispOf(p.storage_path)] || map[p.storage_path];
  });
  OURS.forEach(function(p){
    var t = map[thumbOf(p.storage_path)], d = map[dispOf(p.storage_path)];
    p._src  = t || d || map[p.storage_path];
    p._full = map[p.storage_path] || d || t;
    p._cap  = p.project_address || p.caption || 'Cardinal install';
    /* 633: the test moved from "has no -d" to "has no -t". A photo with a
       display copy but no thumbnail predates this build and is exactly what the
       page is still paying for — 0.65 MB a tile against a 270px tile. */
    p._needsOpt = !t;
    /* Prefer the display copy as the source to re-encode FROM: 1400px is ample
       for a 640px thumbnail and costs 0.65 MB to fetch instead of 3.42 MB. */
    p._optFrom = d || map[p.storage_path];
  });
  var canDel = amAdmin();
  box.className = 'occ-ours';
  box.innerHTML = OURS.map(function(p, i){
    return '<figure>' +
      '<img src="' + esc(p._src) + '" alt="' + esc(p._cap) + '" loading="lazy" data-shot="' + i + '">' +
      (canDel ? '<button type="button" class="occ-del" data-del="' + esc(p.id) +
                '" aria-label="Delete this photo">\u00d7</button>' : '') +
      '<figcaption>' + esc(p._cap) + '</figcaption></figure>';
  }).join('');
  box.querySelectorAll('img[data-shot]').forEach(function(im){
    im.onclick = function(){ openShot(parseInt(im.dataset.shot, 10) || 0); };
  });
  box.querySelectorAll('[data-del]').forEach(function(b){
    b.onclick = function(){ removeOurs(b.dataset.del, b); };
  });
  paintOptBtn();
}

/* 631: shows itself only when photos actually predate 630. */
function paintOptBtn(){
  var b = VIEW && VIEW.querySelector('#occOpt');
  if(!b) return;
  var n = OURS.filter(function(p){ return p._needsOpt; }).length;
  b.hidden = !n;
  if(n){
    b.textContent = 'Optimise ' + n + ' photo' + (n === 1 ? '' : 's');
    b.onclick = function(){ optimiseOurs(); };
  }
}

/* The display twin of a path, matching the Showcase's own convention. Kept
   local rather than imported: the Showcase's dispPath() is not exported, and
   one four-line function is cheaper than widening that module's API. */
function dispOf(path){ return sfx(path, '-d'); }
/* 633: the tile rendition. Same shape as dispOf so the two cannot drift. */
function thumbOf(path){ return sfx(path, '-t'); }
function sfx(path, tag){
  if(!path) return '';
  var dot = path.lastIndexOf('.');
  return dot === -1 ? (path + tag) : (path.slice(0, dot) + tag + path.slice(dot));
}

var OURS = [], SHOT = 0;

/* 630, Theo: "I accidentally uploaded a duplicate with no way to delete."
   The row goes first. If the storage object refuses or has already gone, the
   row is still gone and the grid is right — an orphaned object costs pennies,
   a row pointing at nothing renders as a hole. Deliberate order. */
async function removeOurs(id, btn){
  var cl = sb(); if(!cl || !id) return;
  var row = null;
  for(var i = 0; i < OURS.length; i++){ if(String(OURS[i].id) === String(id)) row = OURS[i]; }
  if(btn){ btn.disabled = true; }
  try{
    var del = await cl.from('oc_color_photos').delete().eq('id', id).select('id');
    if(del && del.error) throw del.error;
    /* Refused by RLS comes back with no error and no rows — check the rows. */
    if(!del || !del.data || !del.data.length) throw new Error('Not allowed \u2014 admin only.');
    if(row && row.storage_path){
      try{ await cl.storage.from('photos').remove(
        [row.storage_path, dispOf(row.storage_path), thumbOf(row.storage_path)]); }catch(_){}
    }
    await ours(CUR);
  }catch(e){
    if(btn) btn.disabled = false;
    try{ if(window.report) window.report(e, 'Colors', 'delete'); }catch(_){}
    try{ if(window.toast) window.toast('Could not delete \u2014 ' + (e && e.message ? e.message : 'try again'));
         else crTell('Could not delete'); }catch(_){}
  }
}

/* 631 — re-encode in place what 630 could only fix on the way up.
   Same paths, same shrink, upsert:true. The row is never touched, so this
   cannot orphan anything: the worst case is a photo that stays as it was. */
async function optimiseOurs(){
  var cl = sb(); if(!cl) return;
  var todo = OURS.filter(function(p){ return p._needsOpt && p._full; });
  if(!todo.length) return;
  var btn = VIEW.querySelector('#occOpt');
  if(btn) btn.disabled = true;

  var done = 0, failed = 0, before = 0, after = 0;
  for(var i = 0; i < todo.length; i++){
    if(btn) btn.textContent = 'Optimising ' + (i + 1) + ' of ' + todo.length + '\u2026';
    try{
      /* ⚠️ Fetch to a BLOB first. shrink() does URL.createObjectURL(file), which
         is same-origin and keeps the canvas clean; pointing it at the remote
         https URL would taint the canvas and make toBlob() throw. Named trap on
         this project — see the CompanyCam picker. */
      /* 633: fetch the DISPLAY copy where one exists, not the original. A
         640px thumbnail does not need a 3840px source, and this turns a 3.42 MB
         download per photo into 0.65 MB — on an iPad, over a phone connection,
         that is the difference between usable and not. */
      var from = todo[i]._optFrom || todo[i]._full;
      var res = await fetch(from);
      if(!res.ok) throw new Error('could not read the photo (' + res.status + ')');
      var blob = await res.blob();
      before += blob.size;
      var file = new File([blob], 'source.jpg', { type: blob.type || 'image/jpeg' });

      var thumb = await shrinkOne(file, 'thumb');
      if(!thumb) throw new Error('Image tools unavailable \u2014 reload and try again.');
      after += thumb.size;

      /* 633: the ORIGINAL IS NOT TOUCHED. 631 re-encoded it and gained almost
         nothing, because a drone photo is already about 3840px — that is where
         "39.9 down to 29 MB" came from. What the page actually pays for is the
         tile, so this writes only the missing thumbnail. Nothing is overwritten,
         which also makes a failed run cost nothing at all. */
      var up = await cl.storage.from('photos')
                       .upload(thumbOf(todo[i].storage_path), thumb,
                               { contentType:'image/jpeg', upsert:true });
      if(up && up.error) throw up.error;
      done++;
    }catch(e){
      failed++;
      try{ if(window.report) window.report(e, 'Colors', 'optimise'); }catch(_){}
    }
  }

  if(done) await ours(CUR);
  if(btn) btn.disabled = false;
  paintOptBtn();
  try{
    var mb = function(n){ return (n / 1048576).toFixed(1) + ' MB'; };
    /* 633: report the number Theo actually FEELS — what this page will load
       next time — not the change in the stored original. 631's toast said
       "39.9 MB down to 29 MB", which was true of the originals and told him
       nothing about why the page was still slow. */
    var msg = done
      ? (done + ' photo' + (done === 1 ? '' : 's') + ' \u2014 this page now loads ' +
         mb(after) + ' instead of ' + mb(before))
      : 'Nothing needed optimising';
    if(failed) msg += ' \u00b7 ' + failed + ' failed';
    if(window.toast) window.toast(msg); else crTell(msg);
  }catch(_){}
}

/* 630, Theo: "make the photo open full screen and be able to swipe through".
   Its own overlay, not the Showcase's openLens — that one is a client-facing
   presentation surface reading showcase paths. This is an internal browse. */
function openShot(i){
  if(!OURS.length) return;
  SHOT = Math.max(0, Math.min(i, OURS.length - 1));
  var el = document.getElementById('cr-occ-shot');
  if(!el){
    el = document.createElement('div');
    el.id = 'cr-occ-shot';
    el.innerHTML = '<img alt=""><div class="cap"></div><div class="n"></div>' +
      '<button type="button" class="x" aria-label="Close">\u2715</button>' +
      '<button type="button" class="prev" aria-label="Previous">\u2039</button>' +
      '<button type="button" class="next" aria-label="Next">\u203a</button>';
    (VIEW || document.body).appendChild(el);
    el.querySelector('.x').onclick = closeShot;
    el.querySelector('.prev').onclick = function(){ stepShot(-1); };
    el.querySelector('.next').onclick = function(){ stepShot(1); };
    /* Tapping the backdrop closes; tapping the photo does not, so a mis-tap
       while looking does not throw you out. */
    el.addEventListener('click', function(ev){ if(ev.target === el) closeShot(); });
    var x0 = null, y0 = null;
    el.addEventListener('touchstart', function(ev){
      if(ev.touches.length !== 1) return;
      x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
    }, { passive:true });
    el.addEventListener('touchend', function(ev){
      if(x0 === null) return;
      var t = ev.changedTouches && ev.changedTouches[0];
      if(t){
        var dx = t.clientX - x0, dy = t.clientY - y0;
        /* Horizontal intent only, and a real distance — otherwise a vertical
           flick or a tap would step the photo. */
        if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) stepShot(dx < 0 ? 1 : -1);
      }
      x0 = y0 = null;
    }, { passive:true });
  }
  el.classList.add('open');
  paintShot();
  onShotKey.on = true;
  document.addEventListener('keydown', onShotKey);
}

function paintShot(){
  var el = document.getElementById('cr-occ-shot');
  if(!el) return;
  var p = OURS[SHOT]; if(!p) return;
  el.querySelector('img').src = p._full || p._src;
  el.querySelector('img').alt = p._cap;
  el.querySelector('.cap').textContent = p._cap;
  el.querySelector('.n').textContent = (SHOT + 1) + ' of ' + OURS.length;
  el.querySelector('.prev').disabled = SHOT === 0;
  el.querySelector('.next').disabled = SHOT === OURS.length - 1;
}

function stepShot(d){
  var n = SHOT + d;
  if(n < 0 || n >= OURS.length) return;
  SHOT = n; paintShot();
}

function onShotKey(ev){
  if(ev.key === 'Escape') return closeShot();
  if(ev.key === 'ArrowLeft') return stepShot(-1);
  if(ev.key === 'ArrowRight') return stepShot(1);
}

function closeShot(){
  var el = document.getElementById('cr-occ-shot');
  if(el) el.classList.remove('open');
  document.removeEventListener('keydown', onShotKey);
}

/* 630 — MEASURED, and it explains two of Theo's reports at once.
   The photos bucket refuses anything over 10 MB (file_size_limit = 10485760),
   and this function sent RAW camera bytes: the six photos already on Onyx Black
   are 5.37-8.04 MB each. Bigger ones were refused outright ("upload fails"),
   and the survivors made the grid ~40 MB to paint, which is an iPad locking up
   while scrolling. Shrinking fixes both, and converts HEIC to JPEG on the way —
   without which an iPhone photo renders for Theo in Safari and is a broken box
   for anyone on Chrome. */
/* 633: ONE place that knows whether the image toolchain is there, because the
   optimiser wants the thumbnail alone and composing it out of shrinkFor() would
   re-encode a 3840px copy per photo only to throw it away — the expensive half
   of the work, on an iPad. Returns null when the toolchain is missing, and every
   caller treats null as "fail loudly rather than upload raw". */
async function shrinkOne(file, name){
  /* ⚠ WAS window.CardinalShowcase — the cross-module reach that blocked moving
     Showcase on its own. Now the Showroom's own utility; no dependency on
     another presentation module. */
  var S = window.CardinalShowroomImages;
  if(!S || typeof S.shrink !== 'async function' || !S.renditions || !S.renditions[name]) return null;
  return await S.shrink(file, S.renditions[name].max, S.renditions[name].q);
}
async function shrinkFor(file){
  /* 633: full for the lightbox, thumb for the grid. DISP is deliberately NOT
     written any more — nothing on this screen shows a 1400px image, and writing
     a rendition no consumer reads is storage and upload time spent on nothing.
     Older photos keep theirs and the grid still falls back to it. */
  var full = await shrinkOne(file, 'full'); if(!full) return null;
  var thumb = await shrinkOne(file, 'thumb'); if(!thumb) return null;
  return { full: full, thumb: thumb };
}

async function upload(files){
  var cl = sb(); if(!cl || !CUR) return;
  var list = (files || []).filter(Boolean);
  if(!list.length) return;
  var btn = VIEW.querySelector('#occAdd');
  var say = function(t){ if(btn) btn.textContent = t; };
  if(btn) btn.disabled = true;

  var done = 0, failed = 0;
  for(var i = 0; i < list.length; i++){
    say(list.length > 1 ? ('Uploading ' + (i + 1) + ' of ' + list.length + '\u2026') : 'Uploading\u2026');
    try{
      /* slug comes from the DB, never recomputed here — a second derivation is
         how photos end up filed under a colour that no longer matches. */
      var small = await shrinkFor(list[i]);
      if(!small) throw new Error('Image tools unavailable \u2014 reload and try again.');
      /* A uuid, not Date.now(): several files picked at once land in the same
         millisecond, and with upsert:false the collision throws. That is a bug
         `multiple` would have created on its first use. */
      var id   = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
               : String(Date.now()) + Math.random().toString(16).slice(2);
      var path = 'oc-colors/' + CUR.slug + '/' + id + '.jpg';
      var up = await cl.storage.from('photos')
                       .upload(path, small.full, { contentType:'image/jpeg', upsert:false });
      if(up && up.error) throw up.error;
      /* The thumbnail is best-effort: the grid falls back to the full image, so a
         failed twin costs weight, not the photograph. */
      try{
        await cl.storage.from('photos')
                .upload(thumbOf(path), small.thumb, { contentType:'image/jpeg', upsert:true });
      }catch(_){}
      var ins = await cl.from('oc_color_photos')
                        .insert({ color_id: CUR.id, storage_path: path }).select('id');
      if(ins && ins.error) throw ins.error;
      if(!ins || !ins.data || !ins.data.length) throw new Error('Saved nothing \u2014 staff only.');
      done++;
    }catch(e){
      failed++;
      try{ if(window.report) window.report(e, 'Colors', 'upload'); }catch(_){}
    }
  }

  if(done) await ours(CUR);
  /* Say what actually happened. The old version said "Upload failed" for any
     fault and nothing at all on success, which is how a 10 MB refusal read as
     the whole feature being broken. */
  try{
    if(failed && window.toast) window.toast(
      failed + ' of ' + list.length + ' could not be added' + (done ? ' \u2014 the other ' + done + ' went up' : ''));
    else if(failed) crTell(failed + ' of ' + list.length + ' could not be added');
  }catch(_){}
  if(btn){ btn.disabled = false; btn.textContent = 'Add our roofs'; }
}

async function open(){
  ensureView();
  /* 630: a lightbox left open from a previous visit would sit over the hub. */
  try{ closeShot(); }catch(_){}
  try{ if(typeof window.hideAllViews === 'function') window.hideAllViews(); }catch(_){}
  VIEW.style.display = 'block';
  VIEW.dataset.style = styleLoad();
  styleBar();
  showHub();
  VIEW.querySelector('#occHub').innerHTML = '<div class="occ-empty">Loading…</div>';
  await load();
  showHub();
  try{ if(window.navPush) window.navPush('cr-occ'); }catch(_){}
}
function close(){
  if(VIEW) VIEW.style.display = 'none';
  try{ if(typeof window.showHome === 'function') window.showHome(); }catch(_){}
}

window.CardinalColors = Object.assign(window.CardinalColors || {}, {
  open: open,
  close: close,
  /* 750: the shingle-colour dropdown on the roofing agreement reads THIS, so
     `oc_colors` still has exactly one reader in the app. load() touches VIEW
     nowhere, so it is safe with no hub mounted, and going through it means the
     dropdown inherits the hidden filter and the sort order rather than
     re-stating them -- Shasta White is hidden and stays out by construction. */
  list: async function(){
    if(!COLORS.length){ try{ await load(); }catch(_){ } }
    return COLORS.map(function(c){
      return { name: c.name, status: c.status, line: c.product_line };
    });
  },
  /* 779: the contract's Shingle STYLE dropdown reads this, for the same reason
     750 pointed its colour dropdown at list() — so the sellable range has ONE
     definition. LINES is what the hub itself sells from, so a line added there
     reaches the contract with no second edit. `ready` is respected: a line the
     hub is not offering yet must not appear on something a client signs. */
  lines: function(){
    return LINES.filter(function(L){ return L.ready !== false; })
                .map(function(L){ return { key: L.key, name: L.name, kind: L.kind }; });
  },
  reload: async function(){
    if(!VIEW) return;
    await load();
    if(LINE){ filters(); render(); } else { hub(); }
  }
});
})();