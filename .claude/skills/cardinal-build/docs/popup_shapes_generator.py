#!/usr/bin/env python3
"""
Theo, 3 Aug: "Ok so lets just re do the house shape to make everything line up
right, give me 5 different examples. A dormer isnt really needed depending on
the roof type."

Five real Dayton roof shapes, drawn FROM the shipped artwork (same palette,
same blends, same wall), each captioned with what it gives the book natively —
because he is right: several of these come with the valley built in, and the
dormer was only ever compensating for a roof that had none.
"""
ROOT = '/home/user/cardinal-inspections/'
SRC  = ROOT + '.claude/skills/cardinal-build/docs/popup_spreads_preview.html'
OUT  = '/tmp/claude-0/-home-user-cardinal-inspections/12c566e8-c7a6-55fe-b42e-970bf2f19144/scratchpad/shapes.html'

src = open(SRC, encoding='utf-8').read()
cut = src.index('var SPREADS=[')
head = src[:cut]

EXTRA = r"""
/* ═══ FIVE HOUSE SHAPES ══════════════════════════════════════════════
   All finished in Brownwood so the SHAPE is the only variable. The wall,
   windows, door, gutter and the now-permanent chimney are identical on
   every card; only what happens above the eave changes. */

function xwall(){
  var XLIT='#F0E6D4', XSHD='#D6C4A6', XTRIM='#8A7660',
      XGLASS='#8FB6CC', XGLASSL='#B9D6E4', XDOOR='#8F1620', XDOORS='#6B0F16',
      XMET='#AEB4BA', XMETS='#878D93';
  var s='';
  s+='<path d="M0,120 L40,84 L86,120 Z" fill="#8FA6B8" opacity=".55"/>';
  s+='<path d="M40,84 L86,120 L64,120 Z" fill="#75899B" opacity=".55"/>';
  s+='<path d="M214,120 L262,78 L300,120 Z" fill="#8FA6B8" opacity=".55"/>';
  s+='<path d="M262,78 L300,120 L278,120 Z" fill="#75899B" opacity=".55"/>';
  s+='<path d="M28,104 L272,104 L272,110 L28,110 Z" fill="#C9BFAE"/>';
  s+='<path d="M'+SPLIT+',104 L272,104 L272,110 L'+SPLIT+',110 Z" fill="#AFA593"/>';
  s+='<g fill="#6E6558">';
  for(var vx=40;vx<262;vx+=16) s+='<path d="M'+vx+',105.6 L'+(vx+9)+',105.6 L'+
     (vx+9)+',108.4 L'+vx+',108.4 Z"/>';
  s+='</g>';
  s+='<path d="M40,110 L260,110 L260,150 L40,150 Z" fill="'+XLIT+'"/>';
  s+='<path d="M'+SPLIT+',110 L260,110 L260,150 L'+SPLIT+',150 Z" fill="'+XSHD+'"/>';
  s+='<g stroke="'+XTRIM+'" stroke-width=".7" opacity=".35">';
  for(var y=117;y<150;y+=8) s+='<path d="M40,'+y+' L260,'+y+'"/>';
  s+='</g>';
  [[64,116],[196,116]].forEach(function(w){
    s+='<path d="M'+w[0]+','+w[1]+' L'+(w[0]+30)+','+w[1]+' L'+(w[0]+30)+','+(w[1]+24)+
       ' L'+w[0]+','+(w[1]+24)+' Z" fill="'+XGLASS+'" stroke="'+XTRIM+'" stroke-width="1.6"/>';
    s+='<path d="M'+w[0]+','+w[1]+' L'+(w[0]+30)+','+w[1]+' L'+w[0]+','+(w[1]+24)+' Z" fill="'+XGLASSL+'"/>';
    s+='<g stroke="'+XTRIM+'" stroke-width="1.6">'+
       '<path d="M'+(w[0]+15)+','+w[1]+' L'+(w[0]+15)+','+(w[1]+24)+'"/>'+
       '<path d="M'+w[0]+','+(w[1]+12)+' L'+(w[0]+30)+','+(w[1]+12)+'"/></g>';
  });
  s+='<path d="M136,120 L164,120 L164,150 L136,150 Z" fill="'+XDOOR+'"/>';
  s+='<path d="M152,120 L164,120 L164,150 L152,150 Z" fill="'+XDOORS+'"/>';
  s+='<circle cx="159" cy="136" r="1.6" fill="'+XMET+'"/>';
  s+='<path d="M28,100 L272,100 L272,104 L28,104 Z" fill="'+XMET+'"/>';
  s+='<path d="M'+SPLIT+',100 L272,100 L272,104 L'+SPLIT+',104 Z" fill="'+XMETS+'"/>';
  s+='<path d="M254,110 L260,110 L260,150 L254,150 Z" fill="'+XMETS+'"/>';
  return s;
}

/* Brownwood courses over any rectangle — the same vocabulary as shingleArt
   (starter, tab cycle, laminate shadow, lit/shaded split at 176), re-derived
   for straight edges. On a rectangle NOTHING needs trimming, which is the
   literal reading of "make everything line up right". */
function shingleRect(x0,x1,yTop,yBot){
  var B=BLEND.brownwood, F=B.F, S=B.S, E=B.E, SH=2.4, CH=8, TW=15, out='';
  function band(y0,y1,tl){
    var m=Math.min(SPLIT,x1), r='';
    if(m>x0) r+='<path d="M'+x0+','+y0+' L'+m+','+y0+' L'+m+','+y1+' L'+x0+','+y1+' Z" fill="'+tl+'"/>';
    if(x1>SPLIT && SPLIT>=x0) r+='<path d="M'+Math.max(SPLIT,x0)+','+y0+' L'+x1+','+y0+
      ' L'+x1+','+y1+' L'+Math.max(SPLIT,x0)+','+y1+' Z" fill="'+dk(tl)+'"/>';
    return r;
  }
  out+=band(yBot-4,yBot,F[3]);
  out+='<path d="M'+x0+','+(yBot-4)+' L'+x1+','+(yBot-4)+'" stroke="'+S+'" stroke-width="1.2" fill="none"/>';
  for(var c=0;;c++){
    var yb=yBot-4-c*CH; if(yb<=yTop+2) break;
    var yt=Math.max(yTop,yb-CH);
    out+=band(yt,yb,F[1]);
    var stag=(c%2)*(TW/2);
    for(var x=Math.ceil(x0/TW)*TW+stag,i=0;x<x1-3;x+=TW,i++){
      var xe=Math.min(x+TW-1.2,x1); if(xe-x<4) continue;
      var tone=F[(c*3+i)%4];
      out+='<path d="M'+x.toFixed(1)+','+yt+' L'+xe.toFixed(1)+','+yt+
           ' L'+xe.toFixed(1)+','+(yb-SH)+' L'+x.toFixed(1)+','+(yb-SH)+
           ' Z" fill="'+(x>=SPLIT?dk(tone):tone)+'"/>';
    }
    out+=band(yb-SH,yb,S);
    out+='<path d="M'+x0+','+yt+' L'+x1+','+yt+'" stroke="'+E+'" stroke-width=".8" opacity=".5" fill="none"/>';
  }
  return out;
}
function ridgeRun(x0,x1,y){
  var B=BLEND.brownwood, F=B.F, S=B.S, out='';
  /* the vent sits PROUD of the cap run — 2.9 units showing above it, the
     same raised-line proportion the hip roof's ridgeVent carries */
  out+='<path d="M'+(x0+4)+','+(y-6)+' L'+(x1-4)+','+(y-6)+' L'+(x1-4)+','+y+' L'+(x0+4)+','+y+' Z" fill="#3B4550"/>';
  out+='<path d="M'+(x0+4)+','+(y-5.4)+' L'+(x1-4)+','+(y-5.4)+'" stroke="#59636E" stroke-width=".7" fill="none"/>';
  var CW=8.6;
  for(var x=x0,i=0;x<x1;x+=CW,i++){
    var xe=Math.min(x+CW,x1), tone=F[i%4], sh=x>=SPLIT;
    out+='<path d="M'+x.toFixed(1)+','+(y-3.1)+' L'+xe.toFixed(1)+','+(y-3.1)+
         ' L'+xe.toFixed(1)+','+(y+3.1)+' L'+x.toFixed(1)+','+(y+3.1)+' Z" fill="'+(sh?dk(tone):tone)+'"/>';
    out+='<path d="M'+x.toFixed(1)+','+(y-3.1)+' L'+x.toFixed(1)+','+(y+3.1)+
         '" stroke="'+(sh?dk(S):S)+'" stroke-width="1.3" fill="none"/>';
  }
  return out;
}
function apron(){
  return '<path d="M31,97.2 L269,97.2 L269,101.8 L31,101.8 Z" fill="#F2F4F5" stroke="#98A0A5" stroke-width=".7"/>'+
         '<path d="M'+SPLIT+',97.2 L269,97.2 L269,101.8 L'+SPLIT+',101.8 Z" fill="#D2D7DA"/>';
}
function rakeV(x,y0,y1){
  return '<path d="M'+(x-1.2)+','+y0+' L'+(x+1.2)+','+y0+' L'+(x+1.2)+','+y1+' L'+(x-1.2)+','+y1+
         ' Z" fill="#F2F4F5" stroke="#98A0A5" stroke-width=".6"/>';
}
/* A full-height cross-gable wing — the thing the dormer was pretending to be.
   Its base is ON the eave, its wall is the house wall, and its rakes make two
   real valleys against the main roof behind it. */
function wing(cx, half, peakY){
  var XLIT='#F0E6D4', XSHD='#D6C4A6', XTRIM='#8A7660';
  var l=cx-half, r=cx+half, s='';
  // the valleys, as shadow on the main plane along both rakes
  s+='<path d="M'+(l-5)+',100 L'+(cx-4)+','+(peakY-1)+' L'+cx+','+(peakY+3)+' L'+l+',100 Z" fill="#000" opacity=".18"/>';
  s+='<path d="M'+(r+5)+',100 L'+(cx+4)+','+(peakY-1)+' L'+cx+','+(peakY+3)+' L'+r+',100 Z" fill="#000" opacity=".24"/>';
  s+='<path d="M'+l+',100 L'+cx+','+peakY+' L'+r+',100 Z" fill="'+XLIT+'"/>';
  s+='<path d="M'+cx+','+peakY+' L'+r+',100 L'+cx+',100 Z" fill="'+XSHD+'"/>';
  s+='<g stroke="'+XTRIM+'" stroke-width=".6" opacity=".35">';
  for(var y=peakY+8; y<98; y+=6){
    var w=half*(y-peakY)/(100-peakY);
    s+='<path d="M'+(cx-w).toFixed(1)+','+y+' L'+(cx+w).toFixed(1)+','+y+'"/>';
  }
  s+='</g>';
  s+='<g fill="none" stroke="#E8DFCD" stroke-width="2.6" stroke-linejoin="round">'+
     '<path d="M'+(l-3)+',101.4 L'+cx+','+(peakY-2.2)+' L'+(r+3)+',101.4"/></g>';
  s+='<g fill="none" stroke="#B9AC93" stroke-width=".9">'+
     '<path d="M'+(l-3)+',101.4 L'+cx+','+(peakY-2.2)+' L'+(r+3)+',101.4"/></g>';
  var wy=peakY+(100-peakY)*0.42;
  s+='<path d="M'+(cx-6)+','+wy+' L'+(cx+6)+','+wy+' L'+(cx+6)+','+(wy+10)+' L'+(cx-6)+','+(wy+10)+
     ' Z" fill="#8FB6CC" stroke="'+XTRIM+'" stroke-width="1.2"/>';
  s+='<path d="M'+cx+','+wy+' L'+cx+','+(wy+10)+'" stroke="'+XTRIM+'" stroke-width="1.1" fill="none"/>';
  return s;
}
function porch(){
  var s='';
  s+='<path d="M116,118.5 L184,118.5 L184,120 L116,120 Z" fill="#AEB4BA"/>';   // step flashing at the wall
  s+='<path d="M116,120 L184,120 L190,128 L110,128 Z" fill="#8A6B4A"/>';
  s+='<path d="M176,120 L184,120 L190,128 L176,128 Z" fill="#6B4F35"/>';
  s+='<path d="M113,124 L187,124" stroke="#3D2C1D" stroke-width=".8" fill="none" opacity=".6"/>';
  s+='<path d="M110,128 L190,128 L190,130.6 L110,130.6 Z" fill="#F2F4F5" stroke="#98A0A5" stroke-width=".6"/>';
  s+='<path d="M119,130.6 L123,130.6 L123,150 L119,150 Z" fill="#F2F4F5" stroke="#B9AC93" stroke-width=".7"/>';
  s+='<path d="M177,130.6 L181,130.6 L181,150 L177,150 Z" fill="#E4E7E9" stroke="#B9AC93" stroke-width=".7"/>';
  return s;
}

var SHAPES=[
  {n:'0', t:'As it is now — hip + dormer', sky:'day',
   w:'The current book: hip roof, ridge vent, and the dormer supplying the valley. Reference, not a contender.',
   build:function(){ return house({roof:'new'}); }},
  {n:'1', t:'The Rectangle — side gable', sky:'day',
   w:'One ridge, two rakes, one huge plane. Everything literally lines up: 4×8 sheets, courses, the layer stack — no diagonal trimming anywhere. No valley (spread 9 drops two words); the chimney carries the flashing spread. Simplest rebuild by far.',
   build:function(){ return xwall()+shingleRect(30,270,42,100)+apron()+
     rakeV(31.2,42,97)+rakeV(268.8,42,97)+ridgeRun(30,270,42)+chimney(); }},
  {n:'2', t:'The L — front gable, left', sky:'day',
   w:'The valley WITHOUT the dormer — two of them, where the wing meets the main roof, plus rakes, a full ridge, and step flashing up the wing walls. The classic Dayton starter home. My pick.',
   build:function(){ return xwall()+shingleRect(30,270,44,100)+apron()+
     rakeV(31.2,44,97)+rakeV(268.8,44,97)+ridgeRun(30,270,44)+chimney()+wing(96,44,52); }},
  {n:'3', t:'The T — front gable, centred-ish', sky:'day',
   w:'Same as 2 with the gable near the middle (nudged left of the chimney). The door reads as living in the gable — the Knock gets a porch feel. Valleys both sides.',
   build:function(){ return xwall()+shingleRect(30,270,44,100)+apron()+
     rakeV(31.2,44,97)+rakeV(268.8,44,97)+ridgeRun(30,270,44)+chimney()+wing(140,38,56); }},
  {n:'4', t:'The Hip + Gable', sky:'day',
   w:'Keeps the hip caps and ridge vent the book already has, adds the wing: valleys, rakes and a gable in one roof. Every feature present; the busiest fold.',
   build:function(){ return xwall()+
     '<path d="M34,100 L104,28 L196,28 L266,100 Z" fill="#4E3826"/>'+
     '<path d="M'+SPLIT+',100 L'+SPLIT+','+roofY(SPLIT).toFixed(1)+' L196,28 L266,100 Z" fill="#38281B"/>'+
     dripEdge()+shingleArt('brownwood',0,8,true)+ridgeVent()+hipCaps('brownwood')+
     chimney()+wing(94,42,54); }},
  {n:'5', t:'The Porch — side gable + shed porch', sky:'day',
   w:'No valley, but the step flashing moves to eye level, where the porch roof meets the wall — visible from the curb, which is where the client stands. Spread 9 goes eave-only.',
   build:function(){ return xwall()+shingleRect(30,270,42,100)+apron()+
     rakeV(31.2,42,97)+rakeV(268.8,42,97)+ridgeRun(30,270,42)+chimney()+porch(); }}
];

document.getElementById('grid').innerHTML = SHAPES.map(function(sp){
  return '<div class="sp'+(sp.n==='0'?'':'')+'">'+
    '<svg viewBox="0 0 300 190" aria-hidden="true">'+
      sky(sp.sky)+ground(false)+sp.build()+
    '</svg>'+
    '<div class="cap"><div class="no">SHAPE '+sp.n+'</div>'+
    '<div class="ti">'+sp.t+'</div><div class="wh">'+sp.w+'</div></div></div>';
}).join('');
document.getElementById('after').innerHTML =
  '<b>Pick by number.</b> The picked shape becomes roofY/spanAt in both files and all '+
  'spreads re-lay against it — figures, materials, chimney, the lot — plus the two '+
  'proposed scenes (Takeoff, Attic) slot in wherever you land on the running order. '+
  'Shapes 2, 3 and 4 make the dormer unnecessary, which was your point: the valley '+
  'comes with the roof. Shapes 1 and 5 have no valley — honest note: spread 9 would '+
  'say "at every eave" and the ice shield runs the eave only, which is also real '+
  'practice on a valley-less roof.';
})();
</script>
</body></html>
"""

open(OUT, 'w', encoding='utf-8').write(head + EXTRA)
print('wrote', OUT, len(head + EXTRA), 'bytes')
