window.__probe = function(){
  const px = s => parseFloat(s)||0;
  const parse = c => { const m=(c||'').match(/rgba?\(([^)]+)\)/); if(!m) return null;
    const p=m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const stops = bi => { const out=[]; const re=/rgba?\([^)]+\)/g; let m;
    while((m=re.exec(bi||''))) { const c=parse(m[0]); if(c) out.push(c); } return out; };
  const lin = v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  const L = c => 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
  const ratio = (a,b) => { const l1=L(a),l2=L(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  // FIX 1: alpha compositing. A translucent layer is not a ground - it must be
  // painted OVER what is behind it. Scoring rgba(255,255,255,.12) as if it were
  // solid white reported white-on-white at 1:1 on a control that measures 9:1.
  const over = (bot, top) => { const a = top.a==null?1:top.a; return {
    r: top.r*a + bot.r*(1-a), g: top.g*a + bot.g*(1-a), b: top.b*a + bot.b*(1-a), a:1 }; };
  const opaqueGrad = st => st.length>0 && st.every(c => (c.a==null?1:c.a) === 1);
  // layers innermost -> outermost, stopping at the first thing that is actually opaque
  function layers(el){
    const out=[];
    for(let n=el; n && n!==document.documentElement; n=n.parentElement){
      const cs=getComputedStyle(n);
      const gs=stops(cs.backgroundImage);
      const bc=parse(cs.backgroundColor);
      if(gs.length) out.push(gs);
      // FIX 2: an OPAQUE GRADIENT stops the walk too. Only stopping on an opaque
      // background-COLOR walked straight past every gradient header and scored its
      // white title against the page eleven levels up.
      if(gs.length && opaqueGrad(gs)) return out;
      if(bc && bc.a>0){ out.push([bc]); if(bc.a===1) return out; }
    }
    const hb=parse(getComputedStyle(document.body).backgroundColor);
    out.push([hb && hb.a===1 ? hb : {r:255,g:255,b:255,a:1}]);
    return out;
  }
  // composite bottom-up, branching over each layer's stops, and score the WORST
  function grounds(el){
    const ls = layers(el);
    let cands = [ ls[ls.length-1][0] ];
    for(let i=ls.length-2; i>=0; i--){
      const next=[];
      for(const base of cands) for(const top of ls[i]) next.push(over(base, top));
      cands = next.slice(0,12);
    }
    return cands;
  }
  const res={ ink:[], small:[], overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, texts:0, ctrls:0 };
  document.querySelectorAll('.shell:not([hidden]) *').forEach(el=>{
    if(el.closest('section.dir[hidden]')) return;
    const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none') return;
    if(/^(BUTTON|A)$/.test(el.tagName)){ res.ctrls++;
      if(r.height<44) res.small.push('TAP '+(el.className||el.tagName)+' h='+Math.round(r.height)+' "'+(el.textContent||'').trim().slice(0,26)+'"'); }
    const own=[...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim());
    if(!own) return;
    const fg=parse(cs.color); if(!fg||fg.a===0) return;
    const fs=px(cs.fontSize), fw=parseInt(cs.fontWeight)||400;
    const large = fs>=24 || (fs>=18.66 && fw>=700);
    const floor = large?3.0:4.5;
    if(fs<11) res.small.push('TYPE '+fs+'px "'+(el.textContent||'').trim().slice(0,26)+'"');
    let worst=99, wg=null;
    grounds(el).forEach(g=>{ const rr=ratio(fg,g); if(rr<worst){worst=rr; wg=g;} });
    res.texts++;
    if(worst<floor) res.ink.push({ sel:(el.className||el.tagName)+'', t:(el.textContent||'').trim().slice(0,34),
      r:+worst.toFixed(2), floor, fs, fg:[fg.r,fg.g,fg.b], bg:wg?[Math.round(wg.r),Math.round(wg.g),Math.round(wg.b)]:null });
  });
  return res;
};
/* selftest hook: stamp a KNOWN-BAD ink into the page. The gate must report it.
   Proves the instrument speaks before any clean run is believed. */
window.__selftest = function(){
  var d = document.createElement('div');
  d.className = 'cr-selftest';
  d.style.cssText = 'background:#1a1a1a;color:#3a3a3a;font:400 12px sans-serif;padding:6px';
  d.textContent = 'selftest: this must be caught';
  (document.querySelector('.shell:not([hidden]) .lnd') || document.body).appendChild(d);
};
