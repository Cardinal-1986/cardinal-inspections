#!/usr/bin/env python3
"""
Options page for Theo's two calls: a front DORMER, and a CUTAWAY after the
roof is done.

Generated FROM the contact sheet rather than hand-written, so the house, the
roof geometry, the shingle blend and the figures are the shipped ones. A
mock-up drawn beside the real artwork is how a palette once shipped to every
preview and never to the app.
"""
import re, os

ROOT  = '/home/user/cardinal-inspections/'
SRC   = ROOT + '.claude/skills/cardinal-build/docs/popup_spreads_preview.html'
OUT   = '/tmp/claude-0/-home-user-cardinal-inspections/12c566e8-c7a6-55fe-b42e-970bf2f19144/scratchpad/options.html'

src = open(SRC, encoding='utf-8').read()
cut = src.index('var SPREADS=[')
head = src[:cut]

EXTRA = r"""
/* ═══ THEO, 3 AUG ═══════════════════════════════════════════════════
   "If you put a gable in the front then make it a dormer? Looks weird.
    Maybe do like a cutout after the roof is done also"

   A GABLE DORMER EARNS ITS PLACE THREE WAYS, not just visually:
     1. Spread 9's caption already promises "every eave and valley" and this
        roof has no valley at all. A dormer makes one.
     2. Spread 11's flashing is a chimney and a pipe boot. Step flashing up a
        dormer cheek is THE flashing detail every roofer argues about.
     3. It breaks a very large blank slope, which is what looks weird.

   Straight on you do not see a dormer's cheeks or its valleys — they are
   edge-on. What you see is the gable face, the rake trim, the window, and a
   shadow where it lands on the main roof. So that is what is drawn, plus the
   two cheek lines that the flashing and the ice shield need to climb. */
var DRM = { W:36, BOT:78, EAVE:58, PEAK:43 };   // one place for the geometry
function dormerBox(cx){
  var h = DRM.W / 2;
  return { l: cx - h, r: cx + h, bot: DRM.BOT, eave: DRM.EAVE, peak: DRM.PEAK };
}
/* Anything laid on the main roof has to stop at the dormer or it paints
   straight over it. This is the same job spanAt does for the roof edge. */
function overDormer(x, y, cxs){
  for(var i = 0; i < (cxs || []).length; i++){
    var d = dormerBox(cxs[i]);
    if(x > d.l - 2 && x < d.r + 2 && y > d.peak - 2 && y < d.bot + 1) return true;
  }
  return false;
}
function dormer(cx, o){
  o = o || {};
  var d = dormerBox(cx), s = '';
  var LIT='#F0E6D4', SHD='#D6C4A6', TRIM='#8A7660',
      GLASS='#8FB6CC', GLASSL='#B9D6E4';
  var lit = cx < SPLIT, W = lit ? LIT : SHD;
  /* the shadow it throws onto the main roof — this is what makes it sit ON
     the slope rather than float above it */
  s += '<path d="M'+(d.l-3)+','+(d.bot+3)+' L'+(d.r+3)+','+(d.bot+3)+' L'+(d.r+3)+','+
       (d.bot+6)+' L'+(d.l-3)+','+(d.bot+6)+' Z" fill="#000" opacity=".22"/>';
  // face wall, then the gable above it
  s += '<path d="M'+d.l+','+d.bot+' L'+d.l+','+d.eave+' L'+d.r+','+d.eave+' L'+d.r+','+d.bot+' Z" fill="'+W+'"/>';
  s += '<path d="M'+cx+','+d.eave+' L'+d.r+','+d.eave+' L'+d.r+','+d.bot+' L'+cx+','+d.bot+' Z" fill="'+SHD+'"/>';
  s += '<path d="M'+d.l+','+d.eave+' L'+cx+','+d.peak+' L'+d.r+','+d.eave+' Z" fill="'+W+'"/>';
  s += '<path d="M'+cx+','+d.peak+' L'+d.r+','+d.eave+' L'+cx+','+d.eave+' Z" fill="'+SHD+'"/>';
  // lap siding on the face, same courses as the wall below
  s += '<g fill="none" stroke="'+TRIM+'" stroke-width=".6" opacity=".35">';
  for(var ly = d.eave + 5; ly < d.bot; ly += 5) s += '<path d="M'+d.l+','+ly+' L'+d.r+','+ly+'"/>';
  s += '</g>';
  // rake trim on the gable — a dormer with no rake board reads as a sticker
  s += '<g fill="none" stroke="#E8DFCD" stroke-width="2.4" stroke-linejoin="round">'+
       '<path d="M'+(d.l-2.5)+','+(d.eave+1.6)+' L'+cx+','+(d.peak-2)+' L'+(d.r+2.5)+','+(d.eave+1.6)+'"/></g>';
  s += '<g fill="none" stroke="#B9AC93" stroke-width=".8">'+
       '<path d="M'+(d.l-2.5)+','+(d.eave+1.6)+' L'+cx+','+(d.peak-2)+' L'+(d.r+2.5)+','+(d.eave+1.6)+'"/></g>';
  // the window
  var wx = cx - 8, wy = d.eave + 4;
  s += '<path d="M'+wx+','+wy+' L'+(wx+16)+','+wy+' L'+(wx+16)+','+(wy+13)+' L'+wx+','+(wy+13)+
       ' Z" fill="'+GLASS+'" stroke="'+TRIM+'" stroke-width="1.3"/>';
  s += '<path d="M'+wx+','+wy+' L'+(wx+16)+','+wy+' L'+wx+','+(wy+13)+' Z" fill="'+GLASSL+'"/>';
  s += '<g stroke="'+TRIM+'" stroke-width="1.1">'+
       '<path d="M'+(wx+8)+','+wy+' L'+(wx+8)+','+(wy+13)+'"/>'+
       '<path d="M'+wx+','+(wy+6.5)+' L'+(wx+16)+','+(wy+6.5)+'"/></g>';
  // ── what the cheeks carry, by stage
  if(o.ice){
    /* THE ICE SHIELD CLIMBS THE CHEEKS, and this is the valley the caption
       has been promising since spread 9 was written. First pass drew it as
       two hairline triangles you could not see at any size — a detail that
       does not read is a detail that is not there. It is a proper strip now,
       9 units wide, with its own grit. */
    s += '<g fill="#6E767B">'+
         '<path d="M'+(d.l-9)+','+(d.bot+2)+' L'+(d.l-1)+','+(d.eave-2)+' L'+(d.l+3)+','+(d.eave-2)+
         ' L'+(d.l+3)+','+(d.bot+2)+' Z"/>'+
         '<path d="M'+(d.r+9)+','+(d.bot+2)+' L'+(d.r+1)+','+(d.eave-2)+' L'+(d.r-3)+','+(d.eave-2)+
         ' L'+(d.r-3)+','+(d.bot+2)+' Z" fill="#565D62"/></g>';
    /* grit INSIDE the strips. The first version computed x with a sign flip
       that scattered half of it onto the bare roof beside them. */
    s += '<g fill="#C3C8CC" opacity=".75">';
    for(var gi = 0; gi < 16; gi++){
      var gt = (gi % 8) / 7, gy = d.bot + 2 - gt * (d.bot - d.eave + 4);
      var gx = (gi < 8) ? (d.l - 7 + (gi % 3) * 3) : (d.r - 1 + (gi % 3) * 3);
      s += '<circle cx="'+gx.toFixed(1)+'" cy="'+gy.toFixed(1)+'" r=".85"/>';
    }
    s += '</g>';
  }
  if(o.flash){
    /* STEP FLASHING — one bent piece per shingle course, lapped, climbing the
       cheek. It is the detail every roofer argues about and the one nobody
       photographs, and it only reads if the steps are actual steps: L-shaped
       pieces with a visible riser, not slivers. */
    s += '<g stroke="#6E6558" stroke-width=".5">';
    for(var i = 0; i < 5; i++){
      var yy = d.eave + 1 + i * 4.2, w = 7, h = 4.6;
      s += '<path d="M'+(d.l-w)+','+(yy+h)+' L'+(d.l-w)+','+(yy+h-2.6)+' L'+d.l+','+yy+
           ' L'+d.l+','+(yy+h)+' Z" fill="#C6CCD1"/>';
      s += '<path d="M'+(d.r+w)+','+(yy+h)+' L'+(d.r+w)+','+(yy+h-2.6)+' L'+d.r+','+yy+
           ' L'+d.r+','+(yy+h)+' Z" fill="#9EA5AB"/>';
    }
    s += '</g>';
  }
  return s;
}

/* ═══ THE CUTAWAY ═══════════════════════════════════════════════════
   "Maybe do like a cutout after the roof is done also."

   Two different cutaways, because they answer two different questions and
   the book needs both answered:

   A — THE LAYER STACK. A corner of the finished roof peeled back so you see
       what is under the shingles: deck, ice shield, felt, starter, shingle.
       This is "here is everything you paid for that you will never see."

   B — THE SECTION. A slice through the house showing rafters, the attic and
       the deck from underneath — which is the ONLY honest way to draw
       airflow. Right now spread 13's arrows travel over the shingles because
       there is nowhere else to put them. */
function cutLayers(){
  /* Stepped bands parallel to the eave, each lapping the one below, in the
     order they actually go on — read bottom to top.

     THE LEFT EDGE ASKS spanAt, IT DOES NOT CARRY A CONSTANT. First pass
     anchored every band at a fixed x=44, and at x=44 this roof is at y=89.7,
     not 100 — so the bottom two layers hung off the slope and over the
     gutter. Exactly the class the whole reshape has been about: a number that
     does not ask the geometry survives a shape change by being wrong. */
  var s = '', X1 = 150, BOT = 96, CH = 6.4;
  var L = [['#C9B084','DECK'], ['#6E767B','ICE & WATER'], ['#22262B','FELT'],
           ['#3D2C1D','STARTER'], ['#4E3826','SHINGLE']];
  function lft(y, k){ return Math.max(spanAt(y)[0] + 3, 34 + k); }
  // the shadow in the cut, so the layers sit in a recess rather than on top
  s += '<path d="M'+lft(BOT,0).toFixed(1)+','+BOT+' L'+X1+','+BOT+' L'+X1+','+
       (BOT - L.length * CH).toFixed(1)+' L'+lft(BOT - L.length * CH, 0).toFixed(1)+','+
       (BOT - L.length * CH).toFixed(1)+' Z" fill="#000" opacity=".38"/>';
  L.forEach(function(l, i){
    var y0 = BOT - i * CH, y1 = y0 - CH, k = i * 7;
    var a = lft(y0, k), b = lft(y1, k + 5);
    s += '<path d="M'+a.toFixed(1)+','+y0+' L'+X1+','+y0+' L'+X1+','+y1+' L'+b.toFixed(1)+
         ','+y1+' Z" fill="'+l[0]+'"/>';
    // the cut edge — this is what says "section with thickness", not "stripe"
    s += '<path d="M'+a.toFixed(1)+','+y0+' L'+b.toFixed(1)+','+y1+
         '" stroke="#F2ECDD" stroke-width="1.2" fill="none"/>';
    s += '<text x="'+(X1 - 2)+'" y="'+(y0 - 1.7)+'" font-size="5" text-anchor="end" '+
         'font-family="ui-monospace,monospace" font-weight="700" letter-spacing=".3" '+
         'fill="#F7F2E6">'+l[1]+'</text>';
  });
  // one shingle tab lifted at the cut, because a cut with nothing lifted
  // reads as a stain rather than as something you can look under
  s += '<path d="M'+X1+','+BOT+' L'+(X1+26)+','+BOT+' L'+(X1+21)+','+(BOT+9)+
       ' L'+(X1-2)+','+(BOT+7)+' Z" fill="#4E3826"/>';
  s += '<path d="M'+(X1+26)+','+BOT+' L'+(X1+21)+','+(BOT+9)+' L'+(X1+16)+','+(BOT+8.4)+
       ' L'+(X1+20)+','+BOT+' Z" fill="#2E2114"/>';
  s += '<path d="M'+X1+','+BOT+' L'+(X1-2)+','+(BOT+7)+'" stroke="#A5825C" stroke-width="1" fill="none"/>';
  return s;
}
function cutSection(){
  /* a slice taken out of the RIGHT third: you see the rafters, the underside
     of the deck, insulation on the attic floor, and the air actually moving
     through the space it moves through */
  var s = '', XL = 186, XR = 262;
  // the void behind the cut
  s += '<path d="M'+XL+',150 L'+XL+','+roofY(XL).toFixed(1)+' L'+XR+',100 L'+XR+',150 Z" fill="#1A1F26"/>';
  /* RAFTERS, CUT THROUGH — and this is the bit the first pass got wrong.
     They were vertical sticks hanging off the deck, which reads as studs or
     collar ties, not rafters. In a section you are looking at the CUT END of
     each rafter, so its depth runs PERPENDICULAR to the deck, not straight
     down. The right hip runs (70,72); perpendicular into the attic is
     (-72,70) normalised. Any roofer would have spotted the first version. */
  var pl = Math.sqrt(70*70 + 72*72), px = -72/pl, py = 70/pl, DEPTH = 8;
  s += '<g stroke="#8A6B4A" stroke-width="3" stroke-linecap="butt">';
  for(var i = 0; i < 6; i++){
    var x = XL + 6 + i * 13;
    if(x > XR - 4) break;
    var y = roofY(x) + 4;
    s += '<path d="M'+x.toFixed(1)+','+y.toFixed(1)+' L'+(x + px*DEPTH).toFixed(1)+','+
         (y + py*DEPTH).toFixed(1)+'"/>';
  }
  s += '</g>';
  // the deck from underneath, and the ridge board
  s += '<path d="M'+XL+','+roofY(XL).toFixed(1)+' L'+XR+',100 L'+XR+',104 L'+XL+','+(roofY(XL)+4).toFixed(1)+
       ' Z" fill="#C9B084"/>';
  // attic floor with insulation
  s += '<path d="M'+XL+',108 L'+XR+',108 L'+XR+',116 L'+XL+',116 Z" fill="#C6A6C8" opacity=".55"/>';
  s += '<g fill="none" stroke="#E0C8E2" stroke-width=".7" opacity=".7">';
  for(var k = XL + 4; k < XR; k += 7) s += '<path d="M'+k+',109 L'+(k+3)+',115"/>';
  s += '</g>';
  // and the air, in the space it actually travels
  var AIR = '#8FD4E8';
  function arrow(d, head){
    return '<path d="'+d+'" fill="none" stroke="'+AIR+'" stroke-width="2" stroke-linecap="round"/>'+
           '<path d="'+head+'" fill="'+AIR+'"/>';
  }
  s += arrow('M270,112 C262,110 254,108 248,105', 'M248,105 L254,105.6 L252,109.4 Z');
  s += arrow('M244,101 C230,92 214,78 200,60',    'M200,60 L204.4,64.6 L207.6,61 Z');
  /* AND OUT AT THE RIDGE. Air that goes up and stops is not ventilation, it
     is a dead end — the whole point of spread 13's caption is that half a
     system is no system, so the section has to show the exhaust too. */
  s += arrow('M192,40 C190,30 189,26 188,19', 'M188,19 L184,26 L192,26 Z');
  // the cut edge itself, bright, so it reads as a cut and not as a shadow
  s += '<path d="M'+XL+',150 L'+XL+','+roofY(XL).toFixed(1)+'" stroke="#F2ECDD" stroke-width="1.6" fill="none"/>';
  s += '<path d="M'+XL+','+roofY(XL).toFixed(1)+' L'+XR+',100" stroke="#F2ECDD" stroke-width="1.6" fill="none"/>';
  return s;
}

/* ── the options ─────────────────────────────────────────────────── */
var OPTS=[
  {g:'The dormer', n:'0', t:'As it is now', sky:'day',
   w:'One unbroken hip slope. This is what Theo called weird — and spread 9 promises “every eave and valley” over a roof with no valley on it.',
   build:function(){ return house({roof:'new'}); }},
  {g:'The dormer', n:'1', t:'One dormer, centred', sky:'day',
   w:'A gable dormer on the front slope. Makes a valley, gives the flashing spread its real detail, and breaks the slope.',
   build:function(){ return house({roof:'new'}) + dormer(150); }},
  {g:'The dormer', n:'2', t:'One dormer, off centre', sky:'day',
   w:'Same dormer at x=124, clear of the ridge vent above it and off the door’s axis. Asymmetry reads more like a real house.',
   build:function(){ return house({roof:'new'}) + dormer(124); }},
  {g:'The dormer', n:'3', t:'Two dormers', sky:'day',
   w:'A pair. More house, and two valleys — but it starts to fight the crew and the ladder for room on the slope.',
   build:function(){ return house({roof:'new'}) + dormer(112) + dormer(188); }},

  {g:'What it buys you', n:'4', t:'The Ice Shield, with the dormer', sky:'day',
   w:'The shield runs the eave AND climbs both cheeks. That is the valley the caption has been promising.',
   build:function(){ return house({roof:'ice'}) + dormer(150,{ice:true}); }},
  {g:'What it buys you', n:'5', t:'The Flashing, with the dormer', sky:'noon',
   w:'Step flashing up both cheeks — the detail every roofer argues about, and the one nobody photographs.',
   build:function(){ return house({roof:'felt'}) + dormer(150,{flash:true}) +
     fig(214,88,0.8,{arm:[[-8,-34],[-17,-32]]}); }},

  {g:'The cutaway', n:'A', t:'The layer stack', sky:'day',
   w:'A corner of the finished roof peeled back: deck, ice and water, felt, starter, shingle. Everything you paid for that you will never see again.',
   build:function(){ return house({roof:'new'}) + cutLayers(); }},
  {g:'The cutaway', n:'B', t:'The section', sky:'day',
   w:'A slice through the house — rafters, the deck from underneath, insulation, and the air travelling where it actually travels. This is what makes spread 13 honest.',
   build:function(){ return house({roof:'new'}) + cutSection(); }},
  {g:'The cutaway', n:'A+B', t:'Both, on the dormer house', sky:'day',
   w:'They answer different questions, so they can be two spreads rather than a choice: what is under the shingles, and how the roof breathes.',
   build:function(){ return house({roof:'new'}) + dormer(124) + cutLayers() + cutSection(); }}
];

var last='';
document.getElementById('grid').innerHTML = OPTS.map(function(sp){
  var hd = (sp.g !== last) ? '<div class="grouphead">'+sp.g+'</div>' : '';
  last = sp.g;
  return hd + '<div class="sp">'+
    '<svg viewBox="0 0 300 190" aria-hidden="true">'+
      sky(sp.sky)+ground(false)+sp.build()+
    '</svg>'+
    '<div class="cap"><div class="no">OPTION '+sp.n+'</div>'+
    '<div class="ti">'+sp.t+'</div><div class="wh">'+sp.w+'</div></div></div>';
}).join('');
document.getElementById('after').innerHTML =
  '<b>Pick a dormer number and a cutaway letter.</b> The dormer is not just a '+
  'shape change — it is what gives spread 9 the valley its caption already '+
  'claims, and spread 11 a flashing detail worth drawing. The cutaway is what '+
  'lets spread 13 put the airflow arrows inside the attic instead of over the '+
  'shingles, which is the simplification flagged on the last pass.';
})();
</script>
<style>
.grouphead{grid-column:1/-1;font:700 15px/1.2 ui-monospace,monospace;letter-spacing:.12em;
  text-transform:uppercase;color:#8F1620;margin:22px 0 2px;padding-top:14px;
  border-top:2px solid rgba(143,22,32,.25)}
.grouphead:first-child{margin-top:0;border-top:0;padding-top:0}
</style>
</body></html>
"""

# the head still has the sky()/house()/fig() etc; close it with our own tail
open(OUT, 'w', encoding='utf-8').write(head + EXTRA)
print('wrote', OUT, len(head + EXTRA), 'bytes')
