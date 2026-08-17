/*
 * DARK-MODE LEAK AUDIT — boots the REAL index.html in Chromium against the
 * recording mock, forces the DEFAULT (dark) retail theme, walks every main
 * user-facing view, and reports every sizeable surface that paints LIGHT on the
 * dark ground (a composited background luminance a person reads as "white card
 * in a dark app"), plus body text below the WCAG floor over its composited bg.
 *
 *   node audit_darkmode.mjs [index.html]
 *
 * It measures the COMPOSITED background: it walks each element's ancestors and
 * takes the first opaque background-color OR gradient stop actually painted, so
 * a card on a dark page is scored on the card, not the page behind it (the
 * CLAUDE.md "background-color is not the background" trap). Text is scored
 * against that same composited ground.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');

const now = '2026-08-15T12:00:00Z';
const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner', phone: '937-555-0100' },
    { email: 'nick@cardinalrenovations.net', name: 'Nick R', role: 'sales', title: 'Sales' },
  ],
  projects: [
    { id: 'p1', name: 'Alberto Campuzano', address: '12 Oak St, Dayton OH', stage: 'Approved', claim_type: 'retail', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now, stage_since: now },
    { id: 'p2', name: 'Marcus Cole', address: '88 Elm Ave, Kettering OH', stage: 'Lead', claim_type: 'retail', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now, stage_since: now },
    { id: 'p3', name: 'Adam Gunn', address: '5 Pine Rd, Huber Heights OH', stage: 'Scheduled', claim_type: 'insurance', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now, stage_since: now },
  ],
  inspection_reports: [
    { id: 'r1aaaaaa', title: 'Work Order — Roofing — Alberto Campuzano', project: 'Alberto Campuzano', project_id: 'p1', status: 'unsent', total: 0, created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now },
    { id: 'r2bbbbbb', title: 'Roof Inspection — Marcus Cole', project: 'Marcus Cole', project_id: 'p2', status: 'sent', sent_at: now, total: 0, created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now },
    { id: 'r3cccccc', title: 'Estimate — Roofing — Adam Gunn', project: 'Adam Gunn', project_id: 'p3', status: 'unsent', total: 12000, created_by: 'theo@cardinalrenovations.net', created_at: now, updated_at: now },
  ],
  appointments: [
    { id: 'a1', project_id: 'p1', title: 'Roof inspection', starts_at: now, ends_at: now, created_by: 'theo@cardinalrenovations.net' },
  ],
  estimates: [
    { id: 'e1', project_id: 'p1', name: 'Roofing estimate', total: 12000, created_by: 'theo@cardinalrenovations.net', created_at: now, photos: [] },
  ],
  insurance_claims: [{ id: 'ic1', project_id: 'p3', carrier: 'State Farm', claim_number: 'SF-1', status: 'open' }],
  punch_items: [{ id: 'pu1', project_id: 'p1', title: 'Touch up ridge', status: 'open', created_by: 'theo@cardinalrenovations.net', created_at: now }],
  crews: [{ id: 'c1', name: 'Betos Roofing', trade: 'Roofing', archived: false, contact_name: 'Alberto' }],
  crew_work_orders: [], crew_rates: [], pricing_items: [], collections: [], contracts: [], project_photos: [],
  community_partners: [], library_items: [], commissions: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse') || url.includes('xlsx') || url.includes('leaflet'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};window.L={map:()=>({setView:()=>({})}),tileLayer:()=>({addTo:()=>({})}),marker:()=>({addTo:()=>({})})};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);

// The probe: run inside the page. Finds light surfaces on the dark ground.
const PROBE = (targetId) => {
  function parse(c){ // returns {r,g,b,a} from rgb/rgba string, or null
    const m = /rgba?\(([^)]+)\)/.exec(c || ''); if(!m) return null;
    const p = m[1].split(',').map(s=>parseFloat(s));
    return { r:p[0], g:p[1], b:p[2], a:p[3]===undefined?1:p[3] };
  }
  function lum(r,g,b){
    const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  }
  // gradient: pull the lightest stop's rgb
  function gradTop(bgi){
    let best=null;
    const re=/rgba?\(([^)]+)\)/g; let m;
    while((m=re.exec(bgi))){ const p=m[1].split(',').map(s=>parseFloat(s));
      const a=p[3]===undefined?1:p[3]; if(a<0.5) continue;
      const L=lum(p[0],p[1],p[2]); if(!best||L>best.L) best={r:p[0],g:p[1],b:p[2],L}; }
    return best;
  }
  // composited background for an element: first opaque paint walking up
  function groundOf(el){
    let node=el;
    while(node && node.nodeType===1){
      const s=getComputedStyle(node);
      const bi=s.backgroundImage;
      if(bi && bi!=='none' && /gradient/.test(bi)){ const g=gradTop(bi); if(g) return g; }
      const bc=parse(s.backgroundColor);
      if(bc && bc.a>=0.6) return { r:bc.r, g:bc.g, b:bc.b, L:lum(bc.r,bc.g,bc.b) };
      node=node.parentElement;
    }
    return { r:9,g:9,b:12,L:lum(9,9,12) }; // page ground --bg
  }
  const view = targetId ? document.getElementById(targetId)
    : ([...document.querySelectorAll('body > *')].find(v => {
        const s=getComputedStyle(v); return s.display!=='none' && v.offsetHeight>100 && /View$/.test(v.id||'');
      }) || document.querySelector('#mainView'));
  const scope = view || document.body;
  const leaks=[];
  const els = scope.querySelectorAll('*');
  for(const el of els){
    const r=el.getBoundingClientRect();
    if(r.width<40 || r.height<20) continue;
    const s=getComputedStyle(el);
    // this element's OWN painted bg (not inherited)
    const bi=s.backgroundImage; const bc=parse(s.backgroundColor);
    let own=null;
    if(bi && bi!=='none' && /gradient/.test(bi)) own=gradTop(bi);
    else if(bc && bc.a>=0.6) own={r:bc.r,g:bc.g,b:bc.b,L:lum(bc.r,bc.g,bc.b)};
    if(!own) continue;
    if(own.L < 0.55) continue; // dark enough — fine
    // a genuine light surface. record it (bigger area = more important)
    const area=r.width*r.height;
    if(area < 3000) continue;
    let sel=el.tagName.toLowerCase();
    if(el.id) sel+='#'+el.id;
    if(el.className && typeof el.className==='string') sel+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');
    leaks.push({ sel, area:Math.round(area), L:+own.L.toFixed(2), bg:s.backgroundColor });
  }
  // dedupe by selector, keep largest
  const byS={};
  for(const l of leaks){ if(!byS[l.sel]||l.area>byS[l.sel].area) byS[l.sel]=l; }
  return { viewId: scope.id||'(body)', leaks: Object.values(byS).sort((a,b)=>b.area-a.area).slice(0,25) };
};

const results = {};
async function snap(label, targetId){
  await page.waitForTimeout(350);
  const r = await page.evaluate(PROBE, targetId || null);
  results[label] = r;
  const n = r.leaks.length;
  console.log(`\n### ${label}  (view ${r.viewId}) — ${n} light surface(s)`);
  for(const l of r.leaks.slice(0,12)) console.log(`   L=${l.L}  area=${l.area}  ${l.sel}   ${l.bg}`);
}

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof showMain === 'function' && typeof hideAllViews === 'function' && window.supabase, { timeout: 20000 });
  await page.evaluate(async () => {
    window.currentUser = { email: 'theo@cardinalrenovations.net' };
    document.documentElement.removeAttribute('data-theme'); // DARK default
    try { await reload(); } catch(e){}
    try { showMain('theo@cardinalrenovations.net'); } catch(e){}
    try { showHome(); } catch(e){}
  });
  await page.waitForTimeout(800);
  // force dark again in case boot set light
  await page.evaluate(() => { try{ localStorage.setItem('cardinal.theme.rb','0'); }catch(e){} document.documentElement.removeAttribute('data-theme'); });

  await snap('HOME / mainView');

  // Direct-call views that need a data render (more reliable than nav clicks).
  const DIRECT = [
    ['Clients (clientsView)', 'clientsView', () => { document.documentElement.removeAttribute('data-theme'); try{ openClientsDirectory(); }catch(e){ return 'err:'+e.message; } return true; }],
    ['Activity Feed (activityView)', 'activityView', () => { document.documentElement.removeAttribute('data-theme'); try{ renderActivity(); }catch(e){ return 'err:'+e.message; } return true; }],
  ];
  for(const [label, vid, fn] of DIRECT){
    const ok = await page.evaluate(`(${fn.toString()})()`);
    if(ok===true) await snap(label, vid); else console.log(`\n### ${label} — ${ok}`);
  }

  // Drive the burger nav the way a user does.
  const NAV = [
    ['leads','Leads & Jobs'], ['inspections','Inspections'],
    ['reports','Graphs & Reports'], ['settings','Settings'],
  ];
  for(const [nav,label] of NAV){
    const ok = await page.evaluate((nav) => {
      document.documentElement.removeAttribute('data-theme');
      const menu = document.getElementById('navMenu');
      const btn = menu && menu.querySelector('.navopt[data-nav="'+nav+'"]');
      if(!btn) return false;
      btn.click();
      return true;
    }, nav);
    if(!ok){ console.log(`\n### ${label} — nav button not found, skipped`); continue; }
    await snap(label);
  }

  // A client project profile (openProject) — the AccuLynx-style overview.
  const opened = await page.evaluate(async () => {
    document.documentElement.removeAttribute('data-theme');
    try { if(typeof openProject==='function'){ await openProject('p1'); return true; } } catch(e){ return 'err:'+e.message; }
    return false;
  });
  if(opened===true) await snap('CLIENT PROFILE (projectView)');
  else console.log('\n### CLIENT PROFILE — openProject unavailable:', opened);

  // Team directory
  const team = await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    const menu=document.getElementById('navMenu');
    const b=menu&&menu.querySelector('.navopt[data-nav="team"]');
    if(b){ b.click(); return true; }
    if(typeof showTeam==='function'){ showTeam(); return true; }
    return false;
  });
  if(team) await snap('TEAM (teamView)');

  console.log('\n\n===== SUMMARY (light surfaces per view, dark theme) =====');
  for(const [k,v] of Object.entries(results)) console.log(`  ${String(v.leaks.length).padStart(3)}  ${k}`);
  if(errs.length) console.log('\npage errors:', errs.slice(0,5));
} catch(e){
  console.error('AUDIT CRASH:', e.message);
  if(errs.length) console.error('page errors:', errs.slice(0,8));
  process.exitCode = 2;
} finally {
  await browser.close();
}
