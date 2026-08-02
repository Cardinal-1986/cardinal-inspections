/* Build 565 gate.
 * The retry storm is a BEHAVIOURAL bug, so the harness runs the shipped
 * attachAutocomplete + the shipped rAF scanner against a failing loadMaps() and
 * COUNTS the attempts across many frames. Reading the source would not prove it
 * stopped; only running it does. */
const fs=require('fs'); const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const SC='/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
function grab(file){
  const s=fs.readFileSync(file,'utf8');
  const a=s.indexOf('async function attachAutocomplete(input){');
  let i=s.indexOf('{',a), d=0, k;
  for(k=i;k<s.length;k++){ if(s[k]==='{')d++; else if(s[k]==='}'){d--; if(!d)break;} }
  return s.slice(a,k+1);
}
const OLD=grab(SC+'/prev563.html'), NEW=grab(SC+'/app/index_v565.html');
let pass=0,fail=0;
const ok=(n,c,d)=>{c?(pass++,console.log('  PASS  '+n)):(fail++,console.log('  FAIL  '+n+(d?'  <'+d+'>':'')));};

async function run(b, fnSrc, frames){
  const p=await b.newPage();
  await p.setContent('<input id="idStreet"><input id="pfAddress"><input id="rcc0">',{waitUntil:'load'});
  return await p.evaluate(async ({fnSrc, frames}) => {
    let warns=0; const realWarn=console.warn;
    console.warn=function(){ warns++; };
    window.__crGmapWarned = undefined;
    /* loadMaps always throws — exactly the no-key production condition */
    window.loadMaps = async function(){ throw new Error('no google maps key configured'); };
    window.isAddressInput = () => true;
    const attach = eval('(' + fnSrc.replace(/^async function attachAutocomplete/, 'async function') + ')');
    /* the shipped scanner, verbatim in shape */
    for(let f=0; f<frames; f++){
      document.querySelectorAll('input').forEach(function(input){
        if(input.dataset.crAutocomplete === '1') return;
        attach(input);
      });
      await new Promise(r=>setTimeout(r,0));
    }
    await new Promise(r=>setTimeout(r,40));
    console.warn=realWarn;
    const marks=[...document.querySelectorAll('input')].map(i=>i.dataset.crAutocomplete||'(empty)');
    return { warns, marks };
  }, {fnSrc, frames});
}
(async()=>{
  const b=await chromium.launch();
  const FRAMES=40;
  const O=await run(b,OLD,FRAMES), N=await run(b,NEW,FRAMES);
  console.log(`\nTHE RETRY STORM — 3 address fields, ${FRAMES} animation frames`);
  console.log(`        563: ${O.warns} warnings · guards left as ${JSON.stringify(O.marks)}`);
  console.log(`        565: ${N.warns} warnings · guards left as ${JSON.stringify(N.marks)}`);
  ok(`563 retried every frame and logged ${O.warns} times`, O.warns >= FRAMES, String(O.warns));
  ok('563 left every guard cleared, which is what caused the loop',
     O.marks.every(m=>m==='(empty)'), JSON.stringify(O.marks));
  ok(`565 attempts ONCE per field and logs once (${N.warns})`, N.warns === 1, String(N.warns));
  ok('565 leaves every guard set, so the scanner skips them forever',
     N.marks.every(m=>m==='1'), JSON.stringify(N.marks));
  ok(`a ${Math.round(O.warns/Math.max(N.warns,1))}x reduction over ${FRAMES} frames alone`,
     N.warns < O.warns/10, `${O.warns} -> ${N.warns}`);
  console.log('\n'+'='.repeat(64)+`\n  ${pass} passed, ${fail} failed\n`+'='.repeat(64));
  await b.close(); process.exit(fail?1:0);
})();
