/* Build 560 gate — the Estimates builder is reachable past the menu.
 * #cr-est-view is created by JS, so the harness must create it the same way the
 * app does rather than expecting to find it in the markup. That is the whole
 * reason 558 missed this screen. */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
function mk(f){ const src=fs.readFileSync(f,'utf8'); const st=[];
  for(let i=0;;){const a=src.indexOf('<style',i); if(a<0)break;
    const o=src.indexOf('>',a),b=src.indexOf('</style>',o); if(b<0)break;
    st.push(src.slice(o+1,b)); i=b+8;} return st; }
const OLD=mk(SC+'/prev559.html'), NEW=mk(SC+'/app/index_v560.html');
let pass=0,fail=0;
const ok=(n,c,d)=>{c?(pass++,console.log('  PASS  '+n)):(fail++,console.log('  FAIL  '+n+(d?'  <'+d+'>':'')));};

async function probe(b, styles, width){
  const p=await b.newPage({viewport:{width,height:900},deviceScaleFactor:2});
  const navOn = width>=1100;
  await p.setContent(`<html><head>${styles.map(s=>`<style>${s}</style>`).join('')}</head>
    <body class="${navOn?'cr-lnav-on':''}" style="--lnav-top:96px;--headh:110px;background:#0b0b0f;margin:0">
      <header class="site" style="height:96px"></header>
      ${navOn?'<div id="cr-lnav"><div class="lnav-item">Pipeline</div></div>':''}
    </body></html>`,{waitUntil:'load'});
  // create the builder exactly as cr-est-script does
  const r = await p.evaluate(() => {
    const v=document.createElement('div'); v.id='cr-est-view'; v.className='open';
    v.innerHTML='<div class="cr-est-head"><h2>Estimate</h2><button data-act="save">Save</button></div>'+
                '<div class="cr-est-body"><nav class="cr-est-nav"></nav><div class="cr-est-main">form</div></div>';
    document.body.appendChild(v);
    const cs=getComputedStyle(v), nav=document.getElementById('cr-lnav');
    const hit=document.elementFromPoint(110,500);
    const head=getComputedStyle(v.querySelector('.cr-est-head'));
    return { left:cs.left, top:cs.top, z:cs.zIndex, display:cs.display,
             navHit: !!(nav && hit && (hit.id==='cr-lnav'||nav.contains(hit))),
             headShown: head.display!=='none',
             railShown: getComputedStyle(v.querySelector('.cr-est-nav')).display!=='none' };
  });
  await p.close(); return r;
}
(async()=>{
  const b=await chromium.launch();
  const B=await probe(b,OLD,1440), A=await probe(b,NEW,1440);
  const Bp=await probe(b,OLD,820),  Ap=await probe(b,NEW,820);

  console.log('\nDESKTOP 1440 — the menu must be reachable');
  console.log(`        559: left ${B.left} · z ${B.z} · menu reachable ${B.navHit}`);
  console.log(`        560: left ${A.left} · z ${A.z} · menu reachable ${A.navHit}`);
  ok('559 covered the menu outright', !B.navHit);
  ok('560 leaves the menu clickable', A.navHit, `hit=${A.navHit}`);
  ok(`the builder starts after the menu (left ${A.left})`, A.left==='238px', A.left);
  ok(`and below the app header (top ${A.top})`, A.top==='110px', A.top);
  ok(`z-index drops under the menu (${A.z}, was ${B.z})`, Number(A.z)<80, `${B.z} -> ${A.z}`);

  console.log('\nTHE BUILDER KEEPS ITS OWN CHROME');
  ok('its header bar is NOT hidden — it holds Save', A.headShown);
  ok('its 224px document outline still shows', A.railShown);

  console.log('\nPHONE 820 — must be byte-for-byte the full-screen takeover');
  console.log(`        559: left ${Bp.left} · z ${Bp.z}     560: left ${Ap.left} · z ${Ap.z}`);
  ok(`left unchanged (${Ap.left})`, Ap.left===Bp.left, `${Bp.left} -> ${Ap.left}`);
  ok(`z-index still 9500 (${Ap.z})`, Ap.z===Bp.z && Ap.z==='9500', `${Bp.z} -> ${Ap.z}`);
  ok(`top unchanged (${Ap.top})`, Ap.top===Bp.top, `${Bp.top} -> ${Ap.top}`);
  ok('and the outline rail is hidden on a phone, as before', !Ap.railShown && !Bp.railShown);

  console.log('\n'+'='.repeat(66)+`\n  ${pass} passed, ${fail} failed\n`+'='.repeat(66));
  await b.close(); process.exit(fail?1:0);
})();
