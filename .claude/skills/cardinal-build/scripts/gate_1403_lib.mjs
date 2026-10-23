import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const S='/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP=fs.readFileSync(process.env.APPFILE||'/home/user/cardinal-inspections/index.html','utf8');
const MOCK=fs.readFileSync(S+'e2e_mock_supa.js','utf8');
const BASE=fs.readFileSync(S+'gate_1401_seed.js','utf8');
export const log=[];
// instrumentation: flag bare date-only strings parsed as UTC, and UTC slices of "now"
const INSTR = `(function(){
  var OD=Date; window.__DHITS__={};
  function hit(kind){ try{ var st=(new Error().stack||'').split('\\n').slice(2,5).map(function(s){return (s.match(/:(\\d+):\\d+\\)?$/)||[])[1]+'@'+((s.match(/at ([\\w.$<>]+)/)||[])[1]||'?');}).join(' < '); var k=kind+' '+st; window.__DHITS__[k]=(window.__DHITS__[k]||0)+1; }catch(e){} }
  var P=OD.prototype.toISOString;
  OD.prototype.toISOString=function(){ var r=P.call(this); try{ var loc=this.getFullYear()+'-'+String(this.getMonth()+1).padStart(2,'0')+'-'+String(this.getDate()).padStart(2,'0'); if(r.slice(0,10)!==loc) hit('ISO!=LOCAL'); }catch(e){} return r; };
  var parse=OD.parse;
  function ND(){ var a=arguments; if(!(this instanceof ND)) return OD(); if(a.length===1 && typeof a[0]==='string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(a[0])) hit('BAREDATE'); return a.length===0? new OD(OD.now()) : new (Function.prototype.bind.apply(OD,[null].concat([].slice.call(a))))(); }
  ND.prototype=OD.prototype; ND.now=function(){return OD.now();}; ND.UTC=OD.UTC; ND.parse=function(s){ if(typeof s==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) hit('BAREPARSE'); return parse(s); };
  Object.defineProperty(ND,'name',{value:'Date'}); window.Date=ND;
})();`;
export async function boot(as, opts={}){
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await browser.newContext(Object.assign(opts.desktop?{viewport:{width:1280,height:900}}:{viewport:{width:390,height:844},hasTouch:true,isMobile:true},{timezoneId:'America/New_York'}));
  const page=await ctx.newPage();
  if(opts.clock) await page.clock.install({time:new Date(opts.clock)});
  page.on('pageerror',e=>log.push('PAGEERROR '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
  page.on('console',m=>{ if(m.type()==='error'||/^TOAST/.test(m.text())) log.push('CONSOLE.'+m.type()+' '+m.text().slice(0,300)); });
  page.on('dialog',d=>{ log.push('DIALOG '+d.type()+' '+d.message().slice(0,200)); (opts.dialog||(x=>x.accept()))(d); });
  await ctx.route('**/*',async route=>{ const url=route.request().url(); const rt=route.request().resourceType();
    if(url==='https://app.cardinalroster.com/'||url.startsWith('https://app.cardinalroster.com/?')) return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    if(url.includes('@supabase/supabase-js')) return route.fulfill({status:200,contentType:'application/javascript',body:MOCK});
    if(url.includes('chart.js')||url.includes('papaparse')) return route.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};'});
    if(url.startsWith('https://app.cardinalroster.com/api/')){ log.push('API '+route.request().method()+' '+url.replace('https://app.cardinalroster.com','')+' '+(route.request().postData()||'').slice(0,400)); if(opts.apiDown && opts.apiDown.v) { log.push('  ^aborted'); return route.abort('internetdisconnected'); } if(opts.apiDelay) await new Promise(r=>setTimeout(r,opts.apiDelay)); return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(opts.apiBody||{ok:true,sent:1})}); }
    if(rt==='image'||rt==='font'||rt==='media'||rt==='stylesheet') return route.abort();
    if(url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({status:200,body:''});
    return route.abort(); });
  if(opts.instr!==false) await ctx.addInitScript(INSTR);
  await ctx.addInitScript(BASE);
  if(opts.seed) await ctx.addInitScript(opts.seed);
  await ctx.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/?as='+as,{waitUntil:'domcontentloaded'});
  if(opts.clock) { for(let i=0;i<10;i++){ await page.clock.runFor(500); } } else await page.waitForTimeout(2500);
  return {browser,ctx,page};
}
