/* Build 561 gate.
 * The point of this harness: styleMounts() writes position/inset/zIndex as INLINE
 * styles. A stylesheet rule without !important cannot beat that at any
 * specificity. So the harness applies those inline styles EXACTLY as the shipped
 * function does, then checks who won. Anything less would prove nothing. */
const fs=require('fs'); const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const SC='/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
function mk(f){const src=fs.readFileSync(f,'utf8');const st=[];
  for(let i=0;;){const a=src.indexOf('<style',i); if(a<0)break;
    const o=src.indexOf('>',a),b=src.indexOf('</style>',o); if(b<0)break;
    st.push(src.slice(o+1,b)); i=b+8;}
  const s=src.indexOf('<div id="qiStartView"'), e=src.indexOf('<div id="quickInspView"');
  return {st, qiStart: src.slice(s,e)};}
const OLD=mk(SC+'/prev560.html'), NEW=mk(SC+'/app/index_v561.html');
const MOUNTS=['cr-estimates-mount','cr-pricing-mount','cr-claims-mount'];
let pass=0,fail=0;
const ok=(n,c,d)=>{c?(pass++,console.log('  PASS  '+n)):(fail++,console.log('  FAIL  '+n+(d?'  <'+d+'>':'')));};

async function probe(b,m,width){
  const p=await b.newPage({viewport:{width,height:900},deviceScaleFactor:2});
  const navOn=width>=1100;
  await p.setContent(`<html><head>${m.st.map(s=>`<style>${s}</style>`).join('')}</head>
    <body class="${navOn?'cr-lnav-on':''}" data-crm="retail"
          style="--lnav-top:96px;--headh:110px;background:#0b0b0f;margin:0">
      <header class="site" style="height:96px"></header>
      ${navOn?'<div id="cr-lnav"><div class="lnav-item">Pipeline</div></div>':''}
      <div id="cr-estimates-mount"></div><div id="cr-pricing-mount"></div><div id="cr-claims-mount"></div>
      ${m.qiStart}
    </body></html>`,{waitUntil:'load'});
  const r=await p.evaluate((MOUNTS)=>{
    /* styleMounts(), verbatim from the shipped source */
    MOUNTS.forEach(function(id){ var el=document.getElementById(id); if(!el)return;
      el.style.position='fixed'; el.style.inset='0'; el.style.zIndex='200';
      el.style.overflowY='auto'; el.style.webkitOverflowScrolling='touch'; });
    const out={mounts:{}};
    const nav=document.getElementById('cr-lnav');
    MOUNTS.forEach(function(id){
      const el=document.getElementById(id); el.style.display='block';
      const cs=getComputedStyle(el);
      const hit=document.elementFromPoint(110,500);
      out.mounts[id]={left:cs.left,top:cs.top,z:cs.zIndex,
        navHit:!!(nav&&hit&&(hit.id==='cr-lnav'||nav.contains(hit)))};
      el.style.display='none';
    });
    const qs=document.getElementById('qiStartView');
    qs.style.display='block';
    const w=qs.querySelector('.wrap'), h=qs.querySelector('.viewhead');
    out.qi={panelBg:getComputedStyle(w).backgroundColor,
            radius:getComputedStyle(w).borderTopLeftRadius,
            shadow:getComputedStyle(w).boxShadow,   /* NOT sliced — a 40-char cut chopped 'inset' to 'inse' and failed a correct rule */
            headColor:getComputedStyle(h).color,
            headFill:getComputedStyle(h).webkitTextFillColor};
    return out;
  },MOUNTS);
  await p.close(); return r;
}
const rel=h=>{const f=c=>(c/=255)<=.03928?c/12.92:((c+.055)/1.055)**2.4;
  const[r,g,b]=h.match(/\d+/g).map(Number);return .2126*f(r)+.7152*f(g)+.0722*f(b);};
const ratio=(a,b)=>{const[x,y]=[rel(a),rel(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);};

(async()=>{
  const b=await chromium.launch();
  const B=await probe(b,OLD,1440), A=await probe(b,NEW,1440);
  const Ap=await probe(b,NEW,820), Bp=await probe(b,OLD,820);

  console.log('\nBEATING THE INLINE STYLES styleMounts() WRITES');
  for(const id of MOUNTS){
    const o=B.mounts[id], n=A.mounts[id];
    console.log(`        ${id.padEnd(20)} 560: left ${o.left} z ${o.z} nav ${o.navHit}  ->  561: left ${n.left} z ${n.z} nav ${n.navHit}`);
  }
  for(const id of MOUNTS){
    ok(`${id}: covered the menu before`, !B.mounts[id].navHit);
    ok(`  and the menu is reachable now (left ${A.mounts[id].left}, z ${A.mounts[id].z})`,
       A.mounts[id].navHit && A.mounts[id].left==='238px' && Number(A.mounts[id].z)<80,
       `left=${A.mounts[id].left} z=${A.mounts[id].z} nav=${A.mounts[id].navHit}`);
  }

  console.log('\nQUICK INSPECTION — THE START STEP, THE PAGE IN THEO\'S SCREENSHOT');
  console.log(`        560: panel ${B.qi.panelBg} · title ${B.qi.headColor} -> ${ratio(B.qi.headColor,'rgb(11,11,15)').toFixed(2)}:1 on the page`);
  console.log(`        561: panel ${A.qi.panelBg} · title ${A.qi.headColor} -> ${ratio(A.qi.headColor,A.qi.panelBg).toFixed(2)}:1 on the panel`);
  ok(`the title was invisible before (${ratio(B.qi.headColor,'rgb(11,11,15)').toFixed(2)}:1)`,
     ratio(B.qi.headColor,'rgb(11,11,15)')<3);
  ok(`it now has the yellow panel (${A.qi.panelBg})`, A.qi.panelBg==='rgb(255, 212, 0)', A.qi.panelBg);
  ok(`and clears the floor (${ratio(A.qi.headColor,A.qi.panelBg).toFixed(2)}:1)`,
     ratio(A.qi.headColor,A.qi.panelBg)>=4.5);
  ok('the panel is recessed, same as the stream step', /inset/.test(A.qi.shadow), A.qi.shadow.slice(0,70));
  ok(`its fill colour is reset too (${A.qi.headFill})`, A.qi.headFill===A.qi.headColor, A.qi.headFill);

  console.log('\nPHONE 820 — nothing may move');
  const drift=MOUNTS.filter(id=>Ap.mounts[id].left!==Bp.mounts[id].left||Ap.mounts[id].z!==Bp.mounts[id].z);
  ok(`all three mounts unchanged on a phone (z ${Ap.mounts[MOUNTS[0]].z}, left ${Ap.mounts[MOUNTS[0]].left})`,
     drift.length===0, drift.join(','));

  console.log('\n'+'='.repeat(72)+`\n  ${pass} passed, ${fail} failed\n`+'='.repeat(72));
  await b.close(); process.exit(fail?1:0);
})();
