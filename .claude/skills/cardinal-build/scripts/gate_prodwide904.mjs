import { createRequire } from 'module';
const require=createRequire(import.meta.url); let chromium;
for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js','utf8');
const SEED=JSON.parse(readFileSync(process.argv[3],'utf8')); const OUT=process.argv[4];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
let pass=0,fail=0; const ok=(l,c,x)=>{c?(pass++,console.log('  PASS '+l)):(fail++,console.log('  FAIL '+l+(x!==undefined?'  '+JSON.stringify(x):'')));};
async function probe(w,h){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}); const page=await ctx.newPage();
  await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
   if(u==='https://app.cardinalroster.com/') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
   if(u.includes('@supabase/supabase-js')) return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
   if(u.includes('chart.js')||u.includes('papaparse')) return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=function(){}};window.Papa={parse:()=>({data:[]}),unparse:()=>""};'});
   if(u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({status:200,contentType:'application/json',body:'{}'});
   if(t==='image'||t==='font'||t==='media'||t==='stylesheet') return r.abort();
   if(u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({status:200,body:''});
   return r.abort();});
  await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!(window.CardinalProduction&&window.CardinalProduction.open),{timeout:15000}).catch(()=>{});
  await page.evaluate(async()=>{try{await window.CardinalProduction.open();}catch(e){}await new Promise(r=>setTimeout(r,700));});
  const info=await page.evaluate(()=>{var w=document.querySelector('#cr-pb .pbwrap');var m=document.querySelector('#cr-pb .pbmonth');var cs=getComputedStyle(w);
    var mb=m.getBoundingClientRect(), tiles=document.querySelector('#cr-pb .pbtiles'); var tb=tiles?tiles.getBoundingClientRect():null;
    return {display:cs.display, cols:cs.gridTemplateColumns, monthLeft:Math.round(mb.left), monthRight:Math.round(mb.right), tilesLeft:tb?Math.round(tb.left):null, tilesTop:tb?Math.round(tb.top):null, monthTop:Math.round(mb.top)};});
  return {page,ctx,info};
}
// ultrawide
{ const {page,ctx,info}=await probe(3440,1440);
  console.log('ultrawide',JSON.stringify(info));
  ok('ultrawide: pbwrap is grid (two-column)', info.display==='grid', info.display);
  ok('ultrawide: two column tracks defined', info.cols.trim().split(/\s+/).length===2, info.cols);
  ok('ultrawide: tiles sit to the RIGHT of the calendar', info.tilesLeft!==null && info.tilesLeft > info.monthRight-5, {tilesLeft:info.tilesLeft,monthRight:info.monthRight});
  ok('ultrawide: tiles align near top with the calendar (dashboard, not stacked below)', info.tilesTop!==null && Math.abs(info.tilesTop-info.monthTop)<160, {tilesTop:info.tilesTop,monthTop:info.monthTop});
  const c=await ctx.newCDPSession(page); const {data}=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); writeFileSync(`${OUT}/v904_ultra.png`,Buffer.from(data,'base64'));
  await ctx.close(); }
// monitor 1440 — must be unchanged (single column, block)
{ const {ctx,info}=await probe(1440,900);
  console.log('monitor',JSON.stringify({display:info.display,tilesTop:info.tilesTop,monthTop:info.monthTop}));
  ok('monitor (1440): NOT grid — unchanged single column', info.display!=='grid', info.display);
  ok('monitor (1440): tiles stack BELOW the calendar (unchanged)', info.tilesTop>info.monthTop+100, {tilesTop:info.tilesTop,monthTop:info.monthTop});
  await ctx.close(); }
// mobile 390 — unchanged
{ const {ctx,info}=await probe(390,844);
  ok('mobile (390): NOT grid — unchanged', info.display!=='grid', info.display);
  await ctx.close(); }
console.log(`\n${fail===0?'GREEN':'RED'} — ${pass} passed, ${fail} failed`);
await b.close(); process.exit(fail===0?0:1);
