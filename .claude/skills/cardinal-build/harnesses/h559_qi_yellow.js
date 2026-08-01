/* Build 559 gate — the REAL quickInspView markup, the REAL stylesheets, Chromium.
 * 558 is loaded from disk as its own control, so every claim is before/after. */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
function mk(file){
  const src = fs.readFileSync(file,'utf8'); const styles=[];
  for(let i=0;;){const a=src.indexOf('<style',i); if(a<0)break;
    const o=src.indexOf('>',a), b=src.indexOf('</style>',o); if(b<0)break;
    styles.push(src.slice(o+1,b)); i=b+8;}
  const s=src.indexOf('<div id="quickInspView"'), e=src.indexOf('<div id="qiWhoModal"');
  return { styles, view: src.slice(s,e) };
}
const rel=h=>{const f=c=>(c/=255)<=.03928?c/12.92:((c+.055)/1.055)**2.4;
  const [r,g,b]=h.match(/\d+/g).map(Number);return .2126*f(r)+.7152*f(g)+.0722*f(b);};
const ratio=(a,b)=>{const[x,y]=[rel(a),rel(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);};
let pass=0,fail=0;
const ok=(n,c,d)=>{c?(pass++,console.log('  PASS  '+n)):(fail++,console.log('  FAIL  '+n+(d?'  <'+d+'>':'')));};

async function probe(b, m, shot){
  const p = await b.newPage({viewport:{width:820,height:900},deviceScaleFactor:2});
  await p.setContent(`<html><head>${m.styles.map(x=>`<style>${x}</style>`).join('')}</head>
    <body data-crm="retail" style="background:#0b0b0f;margin:0">${m.view}</body></html>`,{waitUntil:'load'});
  await p.evaluate(()=>{
    document.getElementById('quickInspView').style.display='block';
    document.getElementById('qiForLine').textContent='2117 Alton Ave · Ramirez Roofing';
    document.getElementById('qiChips').innerHTML=
      '<span class="qichip act">Elevations</span><span class="qichip">Ridge</span>'+
      '<span class="qichip done">Decking ✓</span><span class="qichip">Flashing</span>';
    document.getElementById('qiStream').innerHTML=
      '<div class="qibub ai">Locked in for <b>2117 Alton Ave</b>. Tap a shot suggestion or just start shooting.</div>'+
      '<div class="qibub me">Front elevation done</div>'+
      '<div class="qibub ai">Two layers visible at the rake. Want me to note it?</div>';
  });
  const r = await p.evaluate(()=>{
    const g=(s,prop)=>{const el=document.querySelector(s); if(!el)return null;
      const cs=getComputedStyle(el); return prop?cs[prop]:cs;};
    const panel=document.querySelector('#quickInspView .wrap');
    const ps=getComputedStyle(panel);
    const chip=document.querySelector('#quickInspView .qichip:not(.act):not(.done)');
    const cs=getComputedStyle(chip);
    const bub=document.querySelector('#quickInspView .qibub.ai');
    const bs=getComputedStyle(bub);
    const cbtn=document.querySelector('#quickInspView .qibar .chipbtn');
    const cbs=getComputedStyle(cbtn);
    return {
      panelBg:ps.backgroundColor, panelShadow:ps.boxShadow, panelRadius:ps.borderTopLeftRadius,
      headColor:g('#quickInspView .viewhead','color'),
      headFill:g('#quickInspView .viewhead','webkitTextFillColor'),
      subColor:g('#qiForLine','color'),
      chipBg:cs.backgroundColor, chipColor:cs.color, chipFill:cs.webkitTextFillColor, chipShadow:cs.boxShadow,
      bubBg:bs.backgroundColor, bubColor:bs.color, bubShadow:bs.boxShadow,
      cbtnBg:cbs.backgroundColor, cbtnFill:cbs.webkitTextFillColor,
      camBg:g('#qiCamBtn','backgroundColor'),
      picBg:g('#qiPickBtn','backgroundColor'),
      finBg:g('#qiFinishBtn','backgroundColor'),
      actBg:g('#quickInspView .qichip.act','backgroundColor'),
      doneBg:g('#quickInspView .qichip.done','backgroundColor'),
      doneFill:g('#quickInspView .qichip.done','webkitTextFillColor'),
      barBg:g('#quickInspView .qibar','backgroundColor'),
      bodyBg:getComputedStyle(document.body).backgroundColor,
    };
  });
  if(shot) await p.screenshot({path:SC+'/'+shot, fullPage:true});
  await p.close(); return r;
}
(async()=>{
  const b=await chromium.launch();
  /* the control is the previous BUILD, not the working tree — the tree now holds 559 */
  const B=await probe(b, mk(SC+'/prev558.html'));
  const A=await probe(b, mk(SC+'/app/index_v559.html'), 'qi_after.png');

  console.log('\nTHE ACTUAL COMPLAINT — the heading was invisible');
  console.log(`        558: heading ${B.headColor} on a ${B.bodyBg} page  ->  ${ratio(B.headColor,'rgb(11,11,15)').toFixed(2)}:1`);
  console.log(`        559: heading ${A.headColor} on ${A.panelBg}  ->  ${ratio(A.headColor,A.panelBg).toFixed(2)}:1`);
  ok(`the title was under floor before (${ratio(B.headColor,'rgb(11,11,15)').toFixed(2)}:1)`,
     ratio(B.headColor,'rgb(11,11,15)') < 3);
  ok(`and clears it now (${ratio(A.headColor,A.panelBg).toFixed(2)}:1)`, ratio(A.headColor,A.panelBg) >= 4.5,
     ratio(A.headColor,A.panelBg).toFixed(2));
  ok(`the subline too (${ratio(A.subColor,A.panelBg).toFixed(2)}:1, was ${ratio(B.subColor,'rgb(11,11,15)').toFixed(2)}:1)`,
     ratio(A.subColor,A.panelBg) >= 4.5, ratio(A.subColor,A.panelBg).toFixed(2));

  console.log('\nTHE YELLOW PANEL');
  ok(`is pure yellow #FFD400 (${A.panelBg})`, A.panelBg==='rgb(255, 212, 0)', A.panelBg);
  ok('is RECESSED — inset shadow, not a drop shadow', /inset/.test(A.panelShadow), A.panelShadow.slice(0,60));
  ok(`has rounded corners (${A.panelRadius})`, parseFloat(A.panelRadius)>=14, A.panelRadius);
  ok('and 558 had no panel at all', B.panelBg==='rgba(0, 0, 0, 0)'||B.panelBg!=='rgb(255, 212, 0)', B.panelBg);

  console.log('\nTHE BOXES WITHIN — dark, sunk, white text');
  ok(`chips are near-black (${A.chipBg}), were white (${B.chipBg})`,
     A.chipBg==='rgb(20, 17, 12)' && B.chipBg!=='rgb(20, 17, 12)', `${B.chipBg} -> ${A.chipBg}`);
  ok(`bubbles are near-black (${A.bubBg}), were white (${B.bubBg})`,
     A.bubBg==='rgb(20, 17, 12)', `${B.bubBg} -> ${A.bubBg}`);
  ok(`white text on them — ${ratio(A.bubColor,A.bubBg).toFixed(1)}:1`,
     A.bubColor==='rgb(255, 255, 255)' && ratio(A.bubColor,A.bubBg)>=4.5, A.bubColor);
  ok('they are SUNK — inset shadow at rest', /inset/.test(A.bubShadow) && /inset/.test(A.chipShadow),
     A.bubShadow.slice(0,50));

  console.log('\nTHE -webkit-text-fill-color TRAP');
  console.log(`        558 chipbtn fill: ${B.cbtnFill}   559: ${A.cbtnFill}`);
  ok(`the note buttons would have been dark-on-dark without it (${A.cbtnFill})`,
     A.cbtnFill==='rgb(255, 255, 255)', A.cbtnFill);
  ok(`and the heading's fill is reset too (${A.headFill})`, A.headFill===A.headColor, A.headFill);

  console.log('\nSEMANTIC COLOUR MUST SURVIVE');
  ok(`Camera stays cardinal red (${A.camBg})`, A.camBg===B.camBg, `${B.camBg} -> ${A.camBg}`);
  ok(`Finish stays green (${A.finBg})`, A.finBg===B.finBg, `${B.finBg} -> ${A.finBg}`);
  ok(`Photos is the dark secondary, NOT a second red button (${A.picBg})`,
     A.picBg==='rgb(20, 17, 12)' && A.picBg!==A.camBg, `cam ${A.camBg} / photos ${A.picBg}`);
  ok(`the active chip stays red (${A.actBg})`, A.actBg==='rgb(200, 32, 46)', A.actBg);
  ok(`the done chip is NO LONGER green (${A.doneBg}), was ${B.doneBg}`,
     A.doneBg!=='rgb(46, 125, 50)' && A.doneBg==='rgb(20, 17, 12)', `${B.doneBg} -> ${A.doneBg}`);
  ok(`it reads as done via the panel yellow instead (${A.doneFill})`,
     A.doneFill==='rgb(255, 212, 0)', A.doneFill);
  ok('FINISH IS THE ONLY GREEN ON THE PAGE',
     [A.camBg,A.picBg,A.actBg,A.doneBg,A.chipBg,A.bubBg,A.panelBg]
       .every(c => c!=='rgb(46, 125, 50)') && A.finBg==='rgb(46, 125, 50)',
     `finish ${A.finBg} · done ${A.doneBg} · act ${A.actBg}`);

  console.log('\nTHE BLACK PAGE IS LEFT ALONE');
  ok(`body background unchanged (${A.bodyBg})`, A.bodyBg===B.bodyBg, `${B.bodyBg} -> ${A.bodyBg}`);
  ok(`the cream note bar is gone (${A.barBg}, was ${B.barBg})`,
     A.barBg==='rgba(0, 0, 0, 0)' && B.barBg!=='rgba(0, 0, 0, 0)', `${B.barBg} -> ${A.barBg}`);

  console.log('\n'+'='.repeat(70)+`\n  ${pass} passed, ${fail} failed\n`+'='.repeat(70));
  await b.close(); process.exit(fail?1:0);
})();
