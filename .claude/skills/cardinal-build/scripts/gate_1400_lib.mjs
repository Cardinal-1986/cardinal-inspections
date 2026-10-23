import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
export const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP = fs.readFileSync(process.env.APPFILE || '/home/user/cardinal-inspections/index.html','utf8');
const MOCK = fs.readFileSync(S+'e2e_mock_supa.js','utf8');
const BASE = fs.readFileSync(S+'sentinel_setup_cardinal.js','utf8');
const PROD = fs.readFileSync(S+'sentinel_setup_production.js','utf8');
const EXTRA = fs.readFileSync(new URL('./gate_1400_seed.js', import.meta.url),'utf8');
export const log = [];
export async function boot(as, opts={}){
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => log.push('PAGEERROR ' + e.message + ' @ ' + (e.stack||'').split('\n').slice(1,3).join(' | ')));
  page.on('console', m => { if (m.type()==='error' || /unhandled|^TOAST/i.test(m.text())) log.push('CONSOLE.' + m.type() + ' ' + m.text().slice(0,300)); });
  page.on('dialog', d => { log.push('DIALOG ' + d.type() + ' ' + d.message().slice(0,200)); (opts.dialog||(x=>x.accept()))(d); });
  await page.route('**/*', async route => {
    const url = route.request().url(); const rt = route.request().resourceType();
    if (url === 'https://app.cardinalroster.com/' || url.startsWith('https://app.cardinalroster.com/?'))
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (url.includes('chart.js') || url.includes('papaparse'))
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (url.startsWith('https://app.cardinalroster.com/api/')) { log.push('API ' + route.request().method() + ' ' + url.replace('https://app.cardinalroster.com','') + ' ' + (route.request().postData()||'').slice(0,200)); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(() => { window.__T=[]; let cp; Object.defineProperty(window, 'CardinalProduction', { configurable:true, get(){ return cp; }, set(v){ window.__T.push('defined '+performance.now().toFixed(0)); const o=v.open, c=v.close; v.open=function(){ window.__T.push('open '+performance.now().toFixed(0)); return o.apply(this, arguments); }; v.close=function(){ window.__T.push('close '+performance.now().toFixed(0)+' '+new Error().stack.split('\n').slice(2,4).join('|')); return c.apply(this, arguments); }; cp=v; } }); const sm = () => { if (typeof window.showMain === 'function' && !window.showMain.__w) { const o = window.showMain; window.showMain = function(){ window.__T.push('showMain '+performance.now().toFixed(0)+' CP='+typeof cp); return o.apply(this, arguments); }; window.showMain.__w=1; } }; document.addEventListener('readystatechange', sm); });
  await page.addInitScript(BASE);
  await page.addInitScript(PROD);
  await page.addInitScript(EXTRA);
  await page.addInitScript(MOCK);
  if (opts.slowAuth) await page.addInitScript(() => { const cc = window.supabase.createClient; window.supabase.createClient = function(){ const c = cc.apply(this, arguments); const g = c.auth.getSession.bind(c.auth); c.auth.getSession = () => new Promise(r => setTimeout(() => r(g()), 3000)); return c; }; });
  await page.addInitScript(() => { window.__TOASTS__=[]; (function hook(){ var t=setInterval(function(){ if(window.crTell && !window.crTell.__h){ var o=window.crTell; window.crTell=function(m){ window.__TOASTS__.push(String(m)); console.log('TOAST '+m); return o.apply(this,arguments); }; window.crTell.__h=1; } },50); })(); window.addEventListener('unhandledrejection', e => console.error('UNHANDLED ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason))); });
  await page.goto('https://app.cardinalroster.com/?as=' + as, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return { browser, ctx, page };
}
export async function vis(page, sel='button, [role=button], a, .navopt, [data-go], [data-box]'){
  return page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && r.bottom>0 && r.top<innerHeight; }).map(e => (e.id?'#'+e.id+' ':'') + (e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]+' ':'') + (e.textContent||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40)), sel);
}
export const W = page => page.evaluate(() => (window.__WRITES__||[]).map(w => ({t:w.table, op:w.op, p: JSON.stringify(w.payload).slice(0,300)})));
export async function shot(page, n){ await page.screenshot({ path: new URL('./'+n+'.png', import.meta.url).pathname }); }
export const ov = page => page.evaluate(() => document.body.style.overflow + '|' + document.documentElement.style.overflow);
export async function tapSel(page, sel, why){
  const loc = page.locator(sel).filter({visible:true}).first(); if(!(await loc.count())){ log.push('NOTFOUND '+why+' '+sel); return false; }
  try { await loc.tap({timeout:4000}); } catch(e){ try{ await loc.click({timeout:3000, force:true}); }catch(e2){ log.push('TAPFAIL '+why+' '+e2.message.split('\n')[0].slice(0,120)); return false; } }
  await page.waitForTimeout(700); return true;
}
export async function tapText(page, re, scope='body', why=''){
  for (let k=0;k<3;k++){
    const loc = page.locator(scope).locator('button, [role=button], a, [data-go], .cbi, .navopt, [data-box], [data-act], [data-a], label, .cbn, [onclick]').filter({ hasText: re }).filter({ visible: true }).first();
    try { await loc.tap({ timeout: 3000 }); await page.waitForTimeout(700); return true; } catch(e){ if(k==2){ log.push('TAPFAIL '+why+' '+re+' '+e.message.split('\n')[0].slice(0,100)); return false; } await page.waitForTimeout(500); }
  }
}
export const snap = page => page.evaluate(() => document.body.innerHTML.length + ':' + (window.__WRITES__||[]).length);
export const openViews = page => page.evaluate(() => [...document.querySelectorAll('body > *')].filter(e=>{ const cs=getComputedStyle(e); const r=e.getBoundingClientRect(); return cs.display!=='none' && cs.visibility!=='hidden' && (cs.position==='fixed') && r.width>300 && r.height>500; }).map(e=>e.id||e.className));
