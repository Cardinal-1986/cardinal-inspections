const fs=require('fs'),path=require('path');
const {chromium}=require('playwright-core');
const FILE=path.resolve(process.argv[2]||'/home/user/cardinal-inspections/index.html');
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  PASS '+m)):(fail++,console.log('  FAIL '+m))};
(async()=>{
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const p=await br.newPage({viewport:{width:430,height:900}});
 await p.route('**',r=>r.request().url().startsWith('data:')?r.continue():r.abort());
 p.on('pageerror',()=>{});
 await p.setContent(fs.readFileSync(FILE,'utf8'),{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(900);
 const R=await p.evaluate(()=>{
  const rows=Array.from(document.querySelectorAll('.cbi'));
  const out={n:rows.length,noIcon:[],leftover:[],unsized:[],names:[]};
  rows.forEach(el=>{
   const svg=el.querySelector('svg.cri');
   const label=(el.textContent||'').trim();
   if(!svg) out.noIcon.push(label);
   else{
     // hydrate() must have consumed the attribute
     if(el.hasAttribute('data-cri')) out.leftover.push(label);
     const r=svg.getBoundingClientRect();
     if(el.getClientRects().length && !(r.width>4&&r.height>4)) out.unsized.push(label+' '+Math.round(r.width)+'x'+Math.round(r.height));
   }
   out.names.push(label);
   // any pictographic emoji left in the label?
   for(const ch of label){const o=ch.codePointAt(0);
     if((o>=0x1F000&&o<=0x1FAFF)||(o>=0x2600&&o<=0x27BF)||(o>=0x2300&&o<=0x23FF)) out.leftover.push('EMOJI '+label);}
  });
  out.total=window.CardinalIcons?window.CardinalIcons.names().length:0;
  return out;
 });
 console.log(`\n.cbi rows: ${R.n} · CardinalIcons glyphs: ${R.total}`);
 /* SIXTEEN, not the fourteen in source: Track and Reports are written as
    class="cbn" top-level nav and moved into the dropdown at runtime. */
 ok(R.n===16,`all sixteen Tools rows present (${R.n})`);
 /* A FLOOR. This said ===47 and 698 made it 51: the app was right and the
    gate was wrong. Third time this exact hardcoded-count mistake has been
    written into a gate in one session (icons692, here, projsec698). What
    695 cares about is that its own rows resolve, checked below. */
 ok(R.total>=47,`CardinalIcons carries at least the 47 present at 695 (${R.total})`);
 ok(R.noIcon.length===0,`every row has a drawn icon (missing: ${R.noIcon.join(', ')||'none'})`);
 ok(R.leftover.length===0,`no emoji and no unhydrated attribute left (${R.leftover.join(', ')||'none'})`);
 ok(R.unsized.length===0,`every on-screen icon has a real box (${R.unsized.join(', ')||'none'})`);
 await br.close();
 console.log(`\n${fail===0?'GREEN':'RED'} — ${pass} passed, ${fail} failed`);
 process.exit(fail?1:0);
})();
