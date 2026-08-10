const fs=require('fs'),path=require('path');
const {chromium}=require('playwright-core');
const FILE=path.resolve(process.argv[2]||'/home/user/cardinal-inspections/index.html');
let pass=0,fail=0; const ok=(c,m)=>{c?(pass++,console.log('  PASS '+m)):(fail++,console.log('  FAIL '+m))};
const CARD='<div class="pcard pcbadge stg-Lead"><div class="pcini">K</div><div class="pcbd">'
 +'<div class="pcr1"><span class="pcnm">Karrie Johnson</span><span class="pcpo">1043</span></div>'
 +'<div class="pcad">804 E Center St</div></div></div>';
(async()=>{
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const SRC=fs.readFileSync(FILE,'utf8'); const res={};
 for(const [tn,theme] of [['dark',null],['light','rb-light']]){
  const p=await br.newPage({viewport:{width:430,height:420}});
  await p.route('**',r=>r.request().url().startsWith('data:')?r.continue():r.abort());
  p.on('pageerror',()=>{});
  await p.setContent(SRC,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(700);
  res[tn]=await p.evaluate(({card,theme})=>{
   if(theme)document.documentElement.setAttribute('data-theme',theme);
   const host=document.querySelector('#historyMount')||document.body;
   for(let n=host;n&&n.nodeType===1;n=n.parentElement){
     if(getComputedStyle(n).display==='none') n.style.setProperty('display','block','important');}
   const w=document.createElement('div'); w.innerHTML=card; host.appendChild(w);
   const po=w.querySelector('.pcpo');
   const px=s=>{const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s||'');
     return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null};
   const over=(f,b)=>f[3]>=1?f:[0,1,2].map(i=>Math.round(f[i]*f[3]+b[i]*(1-f[3]))).concat([1]);
   const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
     return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
   const rat=(a,b)=>{let x=lum(a),y=lum(b); if(y>x){const t=x;x=y;y=t;} return Math.round(((x+.05)/(y+.05))*100)/100};
   const gs=[]; for(let n=po;n&&n.nodeType===1;n=n.parentElement){
     const s=getComputedStyle(n), bi=s.backgroundImage||'';
     (bi.match(/rgba?\([^)]+\)/g)||[]).forEach(c=>{const q=px(c); if(q)gs.push(q)});
     const bc=px(s.backgroundColor); if(bc&&bc[3]>0)gs.push(bc);
     if(gs.length)break;}
   const base=[255,255,255,1]; const grounds=(gs.length?gs:[base]).map(c=>over(c,base));
   const ink=px(getComputedStyle(po).color);
   let worst=null; grounds.forEach(g=>{const v=rat(over(ink,g),g); if(worst===null||v<worst)worst=v});
   const maps={};
   ['LJ_SOLID','LJ_INK','LJ_SPINE','STAGE_COLORS','STAGE_INK'].forEach(n=>{
     try{ maps[n]=(eval(n)||{}).OnHold||null; }catch(e){ maps[n]='ERR'; }});
   return {color:getComputedStyle(po).color, ratio:worst, maps:maps,
};
  },{card:CARD,theme});
  await p.close();
 }
 console.log('\ndark ',JSON.stringify(res.dark));
 console.log('light',JSON.stringify(res.light));
 ok(res.dark.color!==res.light.color, `the PO ink changes with the theme (${res.dark.color} -> ${res.light.color})`);
 ok(res.dark.ratio>=4.5, `dark PO clears the floor (${res.dark.ratio}:1)`);
 ok(res.light.ratio>=4.5, `light PO clears the floor (${res.light.ratio}:1) — was 1.79`);
 const m=res.dark.maps;
 ['LJ_SOLID','LJ_INK','LJ_SPINE','STAGE_COLORS','STAGE_INK'].forEach(n=>
   ok(!!m[n] && m[n]!=='ERR', `${n} has an OnHold entry (${m[n]})`));
 ok(m.LJ_SOLID!=='#8a93a1', `OnHold no longer borrows Lead's grey (${m.LJ_SOLID})`);
 ok(m.LJ_SOLID!==m.STAGE_COLORS, 'the two palettes give it their own colour, as every other stage does');
 /* OPEN lives inside a module scope, so the page cannot be asked for it —
    the first version evaluated it in global scope, got 'n/a', and failed a
    correct file. Read it from the SOURCE, which is where the claim lives. */
 ok(SRC.indexOf('OPEN = { Lead:1, Prospect:1 }') !== -1,
    'OPEN is untouched — it decides which stages count as open work, not what colour they are');
 await br.close();
 console.log(`\n${fail===0?'GREEN':'RED'} — ${pass} passed, ${fail} failed`);
 process.exit(fail?1:0);
})();
