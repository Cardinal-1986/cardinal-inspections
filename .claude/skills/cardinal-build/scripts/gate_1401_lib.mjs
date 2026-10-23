import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
export const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP = fs.readFileSync(process.env.APPFILE || '/home/user/cardinal-inspections/index.html','utf8');
const MOCK = fs.readFileSync(S+'e2e_mock_supa.js','utf8');
const BASE = fs.readFileSync(new URL('./gate_1401_seed.js', import.meta.url),'utf8');
export const log = [];
export async function boot(as, opts={}){
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext(opts.desktop ? { viewport:{width:1280,height:900} } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
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
    if (url.startsWith('https://app.cardinalroster.com/api/')) { log.push('API ' + route.request().method() + ' ' + url.replace('https://app.cardinalroster.com','') + ' ' + (route.request().postData()||'').slice(0,200)); const k=Object.keys(opts.api||{}).find(k=>url.includes(k)); return route.fulfill({ status: 200, contentType: 'application/json', body: k ? JSON.stringify(opts.api[k]) : '{}' }); }
    if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
    if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
    return route.abort();
  });
  await page.addInitScript(BASE);
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
export const W = page => page.evaluate(() => (window.__WRITES__||[]).map(w => ({t:w.table, op:w.op, p: String(JSON.stringify(w.payload)).slice(0,300)})));
export async function shot(page, n){ await page.screenshot({ path: (process.env.SHOTDIR||'/tmp')+'/'+n+'.png' }); }
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
export async function navTo(page, text){
  await page.locator('#navBtn').tap().catch(()=>page.locator('#navBtn').click({force:true}));
  await page.waitForTimeout(500);
  const ok = await page.evaluate(t => {
    const o = [...document.querySelectorAll('.navopt')].find(e => e.textContent.trim().replace(/\s+/g,' ').replace(/^\S+\s/, m=>/^[\u{1F300}-\u{1FAFF}☀-➿]/u.test(m)?'':m) === t || e.textContent.trim().endsWith(t) && e.textContent.trim().length < t.length+4);
    if(!o) return 'nf';
    if(o.offsetParent === null){ let s = o.closest('.navgroup, [data-sec], details, .navsecwrap'); const h = s && s.querySelector('.navsec, summary'); if(h) h.click(); }
    return o.offsetParent === null ? 'hidden' : 'ok';
  }, text);
  const loc = page.locator('.navopt').filter({ hasText: text }).filter({ visible: true }).first();
  try { await loc.tap({ timeout: 3000 }); } catch(e) { try { await loc.click({ force:true, timeout:2000 }); } catch(e2){ log.push('NAVFAIL '+text+' '+ok); return false; } }
  await page.waitForTimeout(1500); return true;
}
export const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/[ \t]+/g,' ').replace(/\n+/g,' ¶ ').slice(0, 3000) : 'NONE ' + s; }, sel);
export async function portal(page, key){
  await page.locator('#brandTitle').tap().catch(()=>{}); await page.waitForTimeout(600);
  const loc = page.locator(`[data-go="${key}"]`).filter({visible:true}).first();
  try { await loc.tap({timeout:3000}); } catch(e){ log.push('PORTALFAIL '+key); return false; }
  await page.waitForTimeout(2000); return true;
}
export async function drawer(page, label){
  await page.locator('#navBtn').tap().catch(()=>{}); await page.waitForTimeout(600);
  const r = await page.evaluate(l => { const o=[...document.querySelectorAll('#cr-lnav *, .cr-lnav *, nav *')].filter(e=>e.children.length<4 && e.textContent.trim()===l); return o.map(e=>e.tagName+'.'+e.className+' vis='+(e.offsetParent!==null)); }, label);
  return r;
}
export async function go(page, text){
  await page.locator('#navBtn').tap().catch(()=>{}); await page.waitForTimeout(500);
  const r = await page.evaluate(t => {
    const opts = [...document.querySelectorAll('#navMenu .navopt')].filter(e => e.textContent.replace(/\s+/g,' ').trim().replace(/^[^A-Za-z]+/,'') === t);
    if(!opts.length) return 'nf';
    const o = opts[0]; o.setAttribute('data-audit-tgt','1');
    if(o.offsetParent === null){ let p = o; while(p && p.parentElement && p.parentElement.id !== 'navMenu') p = p.parentElement; let s = p; while(s && !(s.classList && s.classList.contains('navsec'))) s = s.previousElementSibling; if(s) s.click(); }
    return o.offsetParent === null ? 'hidden' : 'ok';
  }, text);
  await page.waitForTimeout(400);
  const loc = page.locator('[data-audit-tgt]');
  try { await loc.tap({ timeout: 3000 }); } catch(e) { log.push('GOFAIL '+text+' '+r); await page.evaluate(()=>document.querySelector('[data-audit-tgt]')?.removeAttribute('data-audit-tgt')); return false; }
  await page.evaluate(()=>document.querySelector('[data-audit-tgt]')?.removeAttribute('data-audit-tgt'));
  await page.waitForTimeout(1800); return true;
}
export async function portal2(page, name){
  await page.locator('#brandTitle').tap().catch(()=>{}); await page.waitForTimeout(700);
  const loc = page.locator('.fdrow').filter({ hasText: name }).filter({visible:true}).first();
  try { await loc.tap({timeout:3000}); } catch(e){ log.push('PORTALFAIL '+name); return false; }
  await page.waitForTimeout(2200); return true;
}
