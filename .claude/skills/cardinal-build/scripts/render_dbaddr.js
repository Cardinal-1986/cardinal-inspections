/* Build 637 — is the address actually readable, in every theme x CRM?
   jsdom cannot resolve which rule won. Chromium can. Every <style> block from
   the shipped file is injected, so specificity is decided by a real engine. */
const fs=require('fs'); const {chromium}=require('playwright-core');
const cssOf=f=>{const h=fs.readFileSync(f,'utf8'); const out=[];
  let i=0; while((i=h.indexOf('<style',i))!==-1){
    const s=h.indexOf('>',i)+1, e=h.indexOf('</style>',s);
    if(e===-1) break; out.push(h.slice(s,e)); i=e; }
  return out.join('\n');};
const lum=x=>{x=x.match(/\d+/g).slice(0,3).map(Number).map(v=>v/255)
  .map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*x[0]+0.7152*x[1]+0.0722*x[2];};
const ratio=(a,b)=>{const A=lum(a),B=lum(b),h=Math.max(A,B),l=Math.min(A,B);
  return (h+0.05)/(l+0.05);};

/* Walk up for the first non-transparent background, the way an eye does. */
/* ⚠️ THREE theme attributes, not one. data-theme drives --rbe-*, and --ct-* is
   gated on data-rltheme (docket = light, siren = dark). My first run set only
   data-theme, so every insurance number it printed was an artifact. */
const CASES=[
  ['retail    dark ', {}, '', ''],
  ['retail    light', {theme:'rb-light'}, '', ''],
  ['insurance siren', {}, 'claim-insurance', 'siren'],
  ['insurance docket', {theme:'rb-light'}, 'claim-insurance', 'docket'],
  ['community      ', {}, 'claim-community', ''],
];
(async()=>{
  const file=process.argv[2], label=process.argv[3];
  const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await br.newPage();
  console.log('\n=== ' + label + ' ===');
  for(const [nm,root,cls,rl] of CASES){
    await p.setContent(`<!doctype html><html${root.theme?` data-theme="${root.theme}"`:''}>
      <head><style>${cssOf(file)}</style></head>
      <body class="${cls}"${rl?` data-rltheme="${rl}"`:''}${cls.includes('community')?' data-crm="community"':''}><div id="projectView"><div class="acxsec"><div class="acxbody">
        <span class="dbaddr">&#128205; 7310 cedar knolls dr, Huber Heights, OH 45424</span>
      </div></div></div></body></html>`);
    const r=await p.evaluate(()=>{
      const el=document.querySelector('.dbaddr');
      const fg=getComputedStyle(el).color;
      let n=el, bg='rgba(0, 0, 0, 0)';
      while(n && n!==document.documentElement){
        const b=getComputedStyle(n).backgroundColor;
        if(b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)){ bg=b; break; }
        n=n.parentElement;
      }
      return {fg,bg};
    });
    let out;
    try{ out=ratio(r.fg,r.bg).toFixed(2)+':1'; }catch(_){ out='n/a'; }
    const bad = out!=='n/a' && parseFloat(out)<4.5;
    console.log(`  ${nm}  ink ${r.fg.padEnd(20)} card ${r.bg.padEnd(20)} ${out.padStart(8)} ${bad?'  <-- UNDER 4.5':''}`);
  }
  await br.close();
})();
