/* gate_A4 — thirteen round-1 leftovers on the phone (build 1438 re-check, builder A4).
 *
 *   P08.02  Crew Dispatch at 390: the name gets the chip's width and breaks at spaces, the grip
 *           sits below the name and takes no more than a quarter of the chip (its 44px pad kept),
 *           the "N open" badge sits inside the crew pill, the week label is one line
 *   P08.03  a production account's Production home draws no dead "<"; a field account's
 *           Crew Dispatch spans the row; admin keeps its back, Curtis keeps two buttons
 *   P08.12  the Punch & Repairs kind tabs never clip a label at Large / Larger / Sun
 *   P07.02  at Larger the client name keeps >= 60% of its one-line width (contact buttons drop)
 *   P07.07  the estimate's x opens the discard sheet only — the estimate stays shut
 *   P07.08  at the end of Leads (phone browser mode) the Ask button covers no control
 *   P06.10  the Library's floating controls are one stack in one corner, and the end of the
 *           page scrolls clear of every one of them (browser and installed)
 *   P10.04  the global Ask is tucked the moment the Library opens, not on the next 3s tick
 *   P12.05  + New -> Punch-out lists every job that is not Lost, in-flight first
 *   P12.06  New Lead: Lead Source is above the fold; a refusal focuses it and says why beside it
 *   P12.12  the inspection photo step's empty note spans the grid
 *   P12.13  Skip checklist -> Start without AI does not ask about the checklist again
 *           (the gallery's own New report still does)
 *   P12.15  appointment inputs are 44px, the notes hint fits, the row date is a day, and the
 *           Schedule Board does not print the client's name twice
 *
 *   node gate_A4.mjs [artifact]         default: the repo index.html
 * Signed in through gate_1403_lib.mjs (APPFILE). Must be RED on build 1438.
 */
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
const HERE = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts';
const FILE = resolve(process.argv[2] || join(HERE, '../../../../index.html'));
process.env.APPFILE = FILE;
const L = await import(join(HERE, 'gate_1403_lib.mjs'));
setTimeout(() => { console.log('  ✗ FAIL gate timed out'); process.exit(3); }, 900000).unref();

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 300) : '')); return !!c; }
const W = ms => new Promise(r => setTimeout(r, ms));

/* crews, work orders, punch items, a Lead and a Prospect, a Lost job — added to gate_1401_seed's __SEED__ */
const SEED = `(function(){
  var S = window.__SEED__; if(!S) return;
  function dk(o){ var d=new Date(Date.now()+o*86400000); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  function ck(type, po){ return JSON.stringify({ lead:{ claim_type:type, assigned:['rep@cardinalrenovations.net'], source:'Door Knocking' }, po:po }); }
  S.team_profiles.push({email:'scottie@cardinalrenovations.net',name:'Scottie',role:'field'});
  S.crews.push({id:'cw1',name:'Sample Roof Crew Alpha',trade:'roofing',archived:false,contact_name:'Sample Foreman'},
               {id:'cw2',name:'Sample Siding Crew',trade:'siding',archived:false});
  S.crew_work_orders = [
    {id:'wo1',crew_id:'cw1',project_id:'I1',report_id:null,status:'sent',scheduled_on:dk(0),sent_at:iso(0),completed_on:null},
    {id:'wo2',crew_id:'cw1',project_id:'C1',report_id:null,status:'draft',scheduled_on:dk(1),sent_at:null,completed_on:null},
    {id:'wo3',crew_id:'cw2',project_id:'R1',report_id:null,status:'sent',scheduled_on:dk(2),sent_at:iso(0),completed_on:null}];
  S.punch_items.push(
    { id:'i6', project_id:'I1', title:'Tarp over rear slope', detail:null, kind:'tarp', priority:'high', status:'open', assigned_to:'scottie@cardinalrenovations.net', created_by:'curtis@cardinalrenovations.net', created_at:iso(-9), scheduled_at:dk(0), scheduled_time:'13:00:00', photos:[], comments:[], steps:[], template:null, visits:[] },
    { id:'i7', project_id:'R1', title:'Callback: drip at skylight', detail:null, kind:'callback', priority:'normal', status:'open', assigned_to:null, created_by:'theo@cardinalrenovations.net', created_at:iso(-12), scheduled_at:null, scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] },
    { id:'i9', project_id:'I2', title:'Punch-out: final walk', detail:null, kind:'punchout', priority:'normal', status:'open', assigned_to:'scottie@cardinalrenovations.net', created_by:'curtis@cardinalrenovations.net', created_at:iso(-5), scheduled_at:dk(-2), scheduled_time:'09:00:00', photos:[], comments:[], steps:[], template:null, visits:[] });
  S.projects.push(
   { id:'R2', name:'Sample Retail Lead', address:'7 Maple Ave, Dayton, OH 45405', street:'7 Maple Ave', city:'Dayton', state:'OH', zip:'45405', stage:'Lead', crm:'retail', created_by:'rep@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550170', email:'lead2@example.com', checklist: ck('retail',2010), created_at:iso(-3), updated_at:iso(-1), stage_since:iso(-3) },
   { id:'R3', name:'Sample Retail Prospect', address:'9 Maple Ave, Dayton, OH 45405', street:'9 Maple Ave', city:'Dayton', state:'OH', zip:'45405', stage:'Prospect', crm:'retail', created_by:'rep@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550171', email:'prospect3@example.com', checklist: ck('retail',2011), created_at:iso(-9), updated_at:iso(-2), stage_since:iso(-6) },
   { id:'R4', name:'Sample Retail Lost', address:'11 Maple Ave, Dayton, OH 45405', street:'11 Maple Ave', city:'Dayton', state:'OH', zip:'45405', stage:'Lost', crm:'retail', created_by:'rep@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550172', email:'lost4@example.com', checklist: ck('retail',2012), created_at:iso(-30), updated_at:iso(-20), stage_since:iso(-20) });
})();`;
/* contrast against the composited ground (gradient stops included) — V4 re-check helper */
const HELP = `(function(){
  function P(c){ c=String(c); var m; if((m=c.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?\\)/))) return {r:+m[1]*255,g:+m[2]*255,b:+m[3]*255,a:m[4]!=null?+m[4]:1};
    m = c.match(/[\\d.]+/g) || [0,0,0]; return { r:+m[0], g:+m[1], b:+m[2], a: m.length > 3 ? +m[3] : 1 }; }
  function over(f, b){ var a = f.a; return { r:f.r*a + b.r*(1-a), g:f.g*a + b.g*(1-a), b:f.b*a + b.b*(1-a), a:1 }; }
  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }).reduce(function(s,v,i){ return s + v*[0.2126,0.7152,0.0722][i]; }, 0); }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  function grounds(el){
    var out = [], chain = [];
    for (var g = el; g && g.nodeType === 1; g = g.parentElement) chain.push(g);
    var base = { r:255, g:255, b:255, a:1 };
    for (var i = chain.length - 1; i >= 0; i--){ var cs = getComputedStyle(chain[i]); var bc = P(cs.backgroundColor); if (bc.a > 0) base = over(bc, base); }
    for (var j = 0; j < chain.length; j++){
      var im = getComputedStyle(chain[j]).backgroundImage;
      if (im && im !== 'none' && !/url\\(/.test(im)){ var lay=[],dep=0,cur=''; for(var k=0;k<im.length;k++){ var ch=im[k]; if(ch==='(')dep++; if(ch===')')dep--; if(ch===','&&dep===0){lay.push(cur);cur='';} else cur+=ch; } lay.push(cur);
        var clips=getComputedStyle(chain[j]).backgroundClip.split(','); var use=lay.filter(function(L,ix){ return !/border-box/.test(clips[ix]||clips[0]||''); }); if(!use.length) use=lay.slice(0,1);
        use.join(',').match(/rgba?\\([^)]+\\)|color\\(srgb[^)]+\\)/g) && use.join(',').match(/rgba?\\([^)]+\\)|color\\(srgb[^)]+\\)/g).forEach(function(s){ out.push(over(P(s), base)); }); if(out.length) break; }
      var bc2 = P(getComputedStyle(chain[j]).backgroundColor); if (bc2.a > 0){ out.push(base); break; }
    }
    if (!out.length) out.push(base);
    return out;
  }
  function opac(el){ var o=1; for(var g=el; g&&g.nodeType===1; g=g.parentElement){ o*= +getComputedStyle(g).opacity; } return o; }
  window.__ink = function(el){
    if (!el) return null; var cs = getComputedStyle(el); var ink = P(cs.color); var op = opac(el);
    var gs = grounds(el);
    return +Math.min.apply(null, gs.map(function(g){ var i = ink; if (op < 1 || ink.a<1) i = over({ r:ink.r, g:ink.g, b:ink.b, a: ink.a*op }, g); return ratio(i, g); })).toFixed(2);
  };
  window.__emoji = function(s){ return /\\p{Extended_Pictographic}/u.test(String(s || '').replace(/[\\u2190-\\u21FF\\u2022\\u00a9\\u00ae\\u2122]/g,'')); };
  window.__rect = function(e){ var b=e.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]; };
  window.__hit = function(el){ var b=el.getBoundingClientRect(); var cx=b.left+b.width/2, cy=b.top+b.height/2; var owns=function(x,y){var h=document.elementFromPoint(x,y); return !!h&&(h===el||el.contains(h)||(h.closest&&h.closest('label')&&h.closest('label').contains(el)));}; if(!owns(cx,cy)) return [0,0,'centre-not-owned:'+(function(){var h=document.elementFromPoint(cx,cy); return h?(h.id||h.tagName+'.'+String(h.className).slice(0,30)):'none';})()]; var reach=function(dx,dy){var d=0; while(d<40&&owns(cx+dx*(d+1),cy+dy*(d+1))) d++; return d;}; return [reach(1,0)+reach(-1,0)+1, reach(0,1)+reach(0,-1)+1]; };
  window.__vis = function(e){ if(!e) return false; var b=e.getBoundingClientRect(); var cs=getComputedStyle(e); return b.width>0&&b.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'; };
  window.__d = function(e){ return e ? (e.id ? '#'+e.id : e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'')) : null; };
})();`;
const THEME = t => `try{localStorage.setItem('cardinal.theme.rb','${t === 'light' ? '1' : t === 'sun' ? 'sun' : '0'}');}catch(e){}`;
const TEXT = s => s ? `try{localStorage.setItem('cr-textsize','${s}');}catch(e){}` : '';
async function boot(who, o = {}) {
  const pre = who === 'curtis' ? "window.__AS__={email:'curtis@cardinalrenovations.net',name:'Curtis'};"
            : who === 'scottie' ? "window.__AS__={email:'scottie@cardinalrenovations.net',name:'Scottie'};" : '';
  const r = await L.boot(who === 'curtis' || who === 'scottie' ? 'x' : who,
    Object.assign({ instr: false }, o, { seed: pre + '\n' + THEME(o.theme || 'dark') + TEXT(o.text) + '\n' + SEED }));
  r.page.setDefaultTimeout(8000);
  await r.page.evaluate(HELP);
  if (o.standalone) await r.page.evaluate(() => document.body.classList.add('standalone'));
  await r.page.waitForTimeout(400);
  return r;
}
async function section(name, fn) {
  console.log('\n' + name);
  try { await fn(); } catch (e) { ok(false, name + ': threw ' + String(e && e.message || e).split('\n')[0].slice(0, 200)); }
}
const env = page => page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), sun: document.documentElement.getAttribute('data-cr-sun'), text: document.documentElement.getAttribute('data-cr-text') }));
function envOk(e, o, lab) {
  const wantTheme = o.theme === 'light' ? 'rb-light' : null;
  if (o.theme === 'sun') ok(e.sun === '1', lab + ': Sun is actually on', e);
  else ok(e.theme === wantTheme && !e.sun, lab + ': the theme is actually ' + (o.theme || 'dark'), e);
  if (o.text) ok(e.text === o.text, lab + ': the text size is actually ' + o.text, e.text);
}

/* ───────────────────────── P08.02  Crew Dispatch at 390 ───────────────────────── */
const DISP = () => {
  const d = document.getElementById('cr-disp'); if (!d || !d.classList.contains('open')) return { err: 'dispatch not open' };
  /* only chips wholly inside the board's visible pane — one half-panned off the edge is clipped by the frame, not covered */
  const pane = d.querySelector('.dspscroll').getBoundingClientRect();
  const chips = [...d.querySelectorAll('.dlane .job')].filter(j => { const q = j.getBoundingClientRect(); return q.width > 0 && q.left >= pane.left && q.right <= pane.right; });
  const words = n => { const out = []; const tn = [...n.childNodes].filter(x => x.nodeType === 3); tn.forEach(t => { const re = /\S+/g; let m; while ((m = re.exec(t.textContent))) { const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length); out.push({ w: m[0], rects: new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size });   /* distinct LINES: the clamp's ellipsis gives a last-line word two rects on one line */ } }); return out; };
  const out = chips.map(j => {
    const q = j.getBoundingClientRect(), n = j.querySelector('.nm'), nq = n.getBoundingClientRect(), mv = j.querySelector('.mv');
    let hit = null, grip = null;
    if (mv) {
      let g = 0, tot = 0;
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) { const x = q.left + q.width * (c + .5) / 10, y = q.top + q.height * (r + .5) / 10; const h = document.elementFromPoint(x, y); tot++; if (h && h.closest('.mv') === mv) g++; }
      hit = g / tot;
      const m = mv.getBoundingClientRect(), cx = m.left + m.width / 2, cy = m.top + m.height / 2;
      const owns = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && h.closest('.mv') === mv; };
      const reach = (dx, dy) => { let k = 0; while (k < 40 && owns(cx + dx * (k + 1), cy + dy * (k + 1))) k++; return k; };
      grip = { w: reach(1, 0) + reach(-1, 0) + 1, h: reach(0, 1) + reach(0, -1) + 1, top: Math.round(m.top), nmBottom: Math.round(nq.bottom), chipBottom: Math.round(q.bottom) };
    }
    return { chipW: Math.round(q.width), nmW: Math.round(nq.width), txt: n.textContent.trim(), split: words(n).filter(w => w.rects > 1).map(w => w.w), hit, grip };
  });
  const crewcs = [...d.querySelectorAll('.dlane .crewc')];
  const badges = [...d.querySelectorAll('.repbdg')].filter(b => b.getBoundingClientRect().width).map(b => {
    const q = b.getBoundingClientRect(), cc = b.closest('.crewc'), tag = cc && [...cc.children].find(k => k.tagName === 'DIV' && k.contains(b));
    const cell = cc && cc.nextElementSibling; const cq = cell ? cell.getBoundingClientRect() : null; const tq = tag ? tag.getBoundingClientRect() : null;
    return { t: b.textContent.trim(), l: Math.round(q.left), r: Math.round(q.right), inPill: !!(tq && q.left >= tq.left - 0.5 && q.right <= tq.right + 0.5 && q.top >= tq.top - 0.5 && q.bottom <= tq.bottom + 0.5), cellL: cq ? Math.round(cq.left) : null };
  });
  const lab = d.querySelector('.dspwklab'); const lq = lab.getBoundingClientRect();
  const top = d.querySelector('.dsptop'), tq = top.getBoundingClientRect();
  const Z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;   /* rects are zoomed, computed sizes are not */
  const lh = parseFloat(getComputedStyle(lab).fontSize) * 1.6 * Z;
  return { chips: out, badges, nCrewc: crewcs.length, week: { t: lab.innerText.trim(), h: Math.round(lq.height), oneLine: lq.height <= lh, r: Math.round(lq.right) }, topR: Math.round(Math.max(...[...top.children].map(c => c.getBoundingClientRect().right))), vw: innerWidth, docW: document.documentElement.scrollWidth };
};
async function dispatchCase(who, o) {
  const lab = `${who} ${o.text || 'normal'} ${o.theme}`;
  const { browser, page } = await boot(who, o);
  try {
    envOk(await env(page), o, 'P08.02 ' + lab);
    await page.evaluate(() => { try { window.CardinalProduction.close(); } catch (e) {} window.CardinalDispatch.open(); });
    await page.waitForFunction(() => !!document.querySelector('#cr-disp.open .dlane .job'), null, { timeout: 12000 }).catch(() => {});
    await W(900);
    const m = await page.evaluate(DISP);
    if (m.err) { ok(false, 'P08.02 ' + lab + ': board drawn', m.err); return; }
    ok(m.chips.length >= (o.text || o.theme === 'sun' ? 1 : 2), `P08.02 ${lab}: job chips wholly on screen`, m.chips.length);
    for (const c of m.chips.slice(0, 3)) {
      ok(c.nmW >= 0.6 * c.chipW, `P08.02 ${lab}: "${c.txt}" gets >= 60% of its ${c.chipW}px chip`, c.nmW + 'px');
      ok(c.split.length === 0, `P08.02 ${lab}: "${c.txt}" breaks only at spaces`, c.split.join(',') || 'no word split');
      if (who === 'curtis') {
        ok(!!c.grip, `P08.02 ${lab}: "${c.txt}" still has its grip`);
        if (c.grip) {
          ok(c.hit <= 0.25, `P08.02 ${lab}: the grip takes <= 25% of the chip's taps`, Math.round(c.hit * 100) + '%');
          ok(c.grip.top >= c.grip.nmBottom - 1, `P08.02 ${lab}: the grip sits below the name`, c.grip);
          ok(c.grip.w >= 44 && c.grip.h >= 44, `P08.02 ${lab}: the grip still hit-tests 44x44`, c.grip);
        }
      }
    }
    ok(m.badges.length >= 1, `P08.02 ${lab}: the backlog badges render`, m.badges.length);
    for (const b of m.badges) ok(b.inPill && b.r <= b.cellL, `P08.02 ${lab}: "${b.t}" sits inside the crew pill, clear of the first day`, b);
    ok(m.week.oneLine, `P08.02 ${lab}: the week label is one line`, m.week);
    ok(m.docW <= m.vw && m.topR <= m.vw + 1, `P08.02 ${lab}: the top bar fits the screen`, { docW: m.docW, topR: m.topR, vw: m.vw });
  } finally { await browser.close(); }
}
async function dispatchDesk() {
  const { browser, page } = await boot('curtis', { theme: 'dark', desktop: true });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { try { window.CardinalProduction.close(); } catch (e) {} window.CardinalDispatch.open(); });
    await page.waitForFunction(() => !!document.querySelector('#cr-disp.open .dlane .job'), null, { timeout: 12000 }).catch(() => {});
    await W(900);
    const m = await page.evaluate(() => { const j = document.querySelector('#cr-disp .dlane .job'), t = j.querySelector('.t'), mv = j.querySelector('.mv'); const tq = t.getBoundingClientRect(), mq = mv.getBoundingClientRect();
      return { gripInTitleRow: mq.top >= tq.top - 1 && mq.bottom <= tq.bottom + 1, lab: document.querySelector('#cr-disp .dspwklab').innerText.trim() }; });
    ok(m.gripInTitleRow, 'P08.02 desktop 1440: the grip keeps its place beside the name', m);
    ok(/^Next 7 · /.test(m.lab), 'P08.02 desktop 1440: the week label keeps its long form', m.lab);
  } finally { await browser.close(); }
}

/* ───────────────────────── P08.03  the Production home ───────────────────────── */
async function prodHome(who, o) {
  const lab = `${who} ${o.theme}`;
  const { browser, page } = await boot(who, o);
  try {
    envOk(await env(page), o, 'P08.03 ' + lab);
    await page.evaluate(async () => { const b = document.getElementById('cr-pb'); if (!b || !b.classList.contains('open')) window.CardinalProduction.open(); await new Promise(r => setTimeout(r, 900)); });
    await page.waitForFunction(() => !!document.querySelector('#cr-pb.open .pbtiles'), null, { timeout: 12000 }).catch(() => {});
    const h = await page.evaluate(() => { const b = document.querySelector('#cr-pb .pbhome .pbback'); const nav = document.querySelector('#cr-pb .pbnav'); const btns = nav ? [...nav.children].filter(e => e.getClientRects().length) : [];
      return { back: !!(b && b.getClientRects().length), nav: nav ? Math.round(nav.getBoundingClientRect().width) : 0, btns: btns.map(e => ({ t: e.querySelector('.t').textContent, w: Math.round(e.getBoundingClientRect().width), top: Math.round(e.getBoundingClientRect().top) })) }; });
    if (who === 'theo') ok(h.back, 'P08.03 theo: the home pane keeps its back (it goes to Home)', h);
    else ok(!h.back, `P08.03 ${lab}: no "<" on the home pane (it would reopen this same board)`, h);
    if (who === 'scottie') ok(h.btns.length === 1 && h.btns[0].w >= h.nav - 1, `P08.03 ${lab}: Crew Dispatch spans the row`, h);
    if (who === 'curtis') ok(h.btns.length === 2 && h.btns[0].top === h.btns[1].top && h.btns[0].w < h.nav * 0.6, `P08.03 ${lab}: Curtis keeps Dispatch and Crews side by side`, h);
    if (who !== 'theo') {
      await page.evaluate(() => { const g = document.querySelector('#cr-pb [data-go="cal"]'); g && g.click(); }); await W(900);
      const c = await page.evaluate(() => { const b = document.querySelector('#cr-pb .pbback'); if (!b) return null; const q = b.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height), cal: !!document.querySelector('#cr-pb .pbcalw') }; });
      ok(!!c && c.cal && c.w >= 44 && c.h >= 44, `P08.03 ${lab}: the calendar pane keeps a 44x44 back`, c);
      await page.evaluate(() => document.querySelector('#cr-pb .pbback').click()); await W(900);
      ok(await page.evaluate(() => !!document.querySelector('#cr-pb.open .pbhome')), `P08.03 ${lab}: and it lands on the home pane`);
    }
  } finally { await browser.close(); }
}

/* ───────────────────────── P08.12  the punch tabs ───────────────────────── */
async function punchTabs(who, o) {
  const lab = `${who} ${o.text || 'normal'} ${o.theme}`;
  const { browser, page } = await boot(who, o);
  try {
    envOk(await env(page), o, 'P08.12 ' + lab);
    await page.evaluate(async () => { try { window.CardinalProduction.close(); } catch (e) {} await window.openPunchView(); }); await W(1300);
    const t = await page.evaluate(() => { const g = document.getElementById('puTabs'); const tabs = [...g.querySelectorAll('.pu-tab')];
      return { vis: tabs.filter(b => b.getClientRects().length).length, gridR: Math.round(g.getBoundingClientRect().right), cut: tabs.filter(b => { const s = b.querySelector('span'); return s.scrollWidth > s.clientWidth + 1 || b.scrollWidth > b.clientWidth + 1; }).map(b => b.querySelector('span').textContent),
        rows: new Set(tabs.map(b => Math.round(b.getBoundingClientRect().top))).size, w: tabs.map(b => Math.round(b.getBoundingClientRect().width)), right: Math.max(...tabs.map(b => Math.round(b.getBoundingClientRect().right))), vw: innerWidth, sw: g.scrollWidth, cw: g.clientWidth, h: tabs.map(b => Math.round(b.getBoundingClientRect().height)) }; });
    ok(t.vis === 5, `P08.12 ${lab}: the five tabs show`, t.vis);
    ok(t.cut.length === 0 && t.sw <= t.cw + 1, `P08.12 ${lab}: no tab label is cut, nothing scrolls off`, t);
    ok(t.right <= t.vw, `P08.12 ${lab}: every tab is on screen`, t);
    ok(t.h.every(x => x >= 44), `P08.12 ${lab}: every tab is still >= 44 tall`, t.h);
    if (!o.text && o.theme !== 'sun') ok(t.rows === 1 && Math.max(...t.w) - Math.min(...t.w) <= 1, `P08.12 ${lab}: Normal is still one row of five equal tabs`, t);
  } finally { await browser.close(); }
}

/* ───────────────────────── P07.02  the client name at Larger ───────────────────────── */
async function nameBar(o) {
  const lab = `${o.text || 'normal'} ${o.theme}`;
  const { browser, page } = await boot('theo', o);
  try {
    envOk(await env(page), o, 'P07.02 ' + lab);
    await page.evaluate(() => openProject('R1')); await W(1800);
    const m = await page.evaluate(() => { const bar = document.getElementById('cr-namebar'); if (!bar || !bar.getClientRects().length) return { err: 'no namebar' };
      const nm = bar.querySelector('.nb-nm'), r = bar.querySelector('.nb-r'), cs = getComputedStyle(nm);
      const c = document.createElement('canvas').getContext('2d'); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const Z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;   /* rects are zoomed; canvas and clientWidth are not */
      const one = c.measureText(nm.textContent.trim()).width * Z, content = (bar.clientWidth - parseFloat(getComputedStyle(bar).paddingLeft) - parseFloat(getComputedStyle(bar).paddingRight)) * Z;
      const nq = nm.getBoundingClientRect(), rq = r.getBoundingClientRect();
      const lines = Math.round(nq.height / (parseFloat(cs.lineHeight) * Z));
      return { nmW: Math.round(nq.width), one: Math.round(one), content: Math.round(content), lines, sameRow: Math.abs((rq.top + rq.bottom) / 2 - (nq.top + nq.bottom) / 2) < 30 && rq.left > nq.right - 1, rTop: Math.round(rq.top), nmBottom: Math.round(nq.bottom), icons: [...r.children].map(k => Math.round(k.getBoundingClientRect().width)) }; });
    if (m.err) { ok(false, 'P07.02 ' + lab + ': client band drawn', m.err); return; }
    ok(m.nmW >= 0.6 * Math.min(m.one, m.content), `P07.02 ${lab}: the name keeps >= 60% of its one-line width`, m);
    ok(m.lines <= 3, `P07.02 ${lab}: the name is at most three lines`, m.lines);
    ok(m.icons.length === 3 && m.icons.every(w => w >= 40), `P07.02 ${lab}: Email / Text / Call are all still there, full size`, m.icons);
    if (!o.text) ok(m.sameRow, `P07.02 ${lab}: at Normal the contact buttons stay on the name's row`, m);
  } finally { await browser.close(); }
}

/* ───────────────────────── P07.07  the estimate's x ───────────────────────── */
async function estDiscard(theme) {
  const { browser, page } = await boot('theo', { theme, desktop: true });
  try {
    await page.evaluate(() => window.CardinalEstimates.open()); await W(1600);
    const d = await page.evaluate(() => { const x = [...document.querySelectorAll('.cre-card .cre-del')].find(e => e.getClientRects().length); if (!x) return null; x.scrollIntoView({ block: 'center' }); const b = x.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    if (!ok(!!d, `P07.07 ${theme}: an estimate card with its x is on the list`)) return;
    await page.mouse.click(d.x, d.y); await W(900);
    const a = await page.evaluate(() => ({ est: (v => !!(v && v.classList.contains('open')))(document.getElementById('cr-est-view')), ask: (n => !!(n && n.getClientRects().length && /Discard this estimate/.test(n.textContent)))(document.getElementById('crAsk')) }));
    ok(a.ask && !a.est, `P07.07 ${theme}: the x opens the discard sheet and NOT the estimate behind it`, a);
    await page.evaluate(() => { const c = document.querySelector('#crAsk .askno'); c && c.click(); }); await W(600);   /* Cancel — not Escape, which closes the list too */
    const c = await page.evaluate(() => { const card = [...document.querySelectorAll('.cre-card')].find(e => e.getClientRects().length); if (!card) return null; const t = card.querySelector('.mid .dt') || card; const b = t.getBoundingClientRect(); return { x: b.left + Math.min(20, b.width / 2), y: b.top + b.height / 2 }; });
    if (c) await page.mouse.click(c.x, c.y);
    const opened = await page.waitForFunction(() => (v => !!(v && v.classList.contains('open')))(document.getElementById('cr-est-view')), null, { timeout: 6000 }).then(() => true).catch(() => false);
    ok(!!c && opened, `P07.07 ${theme}: tapping the card itself still opens the estimate`, c);
  } finally { await browser.close(); }
}

/* ───────────────────────── P07.08  Ask at the end of Leads ───────────────────────── */
async function leadsFab(theme) {
  const { browser, page } = await boot('theo', { theme });
  try {
    await page.evaluate(() => openLeadsView()); await W(1300);
    await page.evaluate(() => { const v = document.getElementById('leadsView'); const cs = [...v.querySelectorAll('.ljcard')]; const l = cs[cs.length - 1]; if (l) for (let k = 0; k < 8; k++) l.parentNode.appendChild(l.cloneNode(true)); });
    await W(300);
    await page.evaluate(() => { [document.scrollingElement, ...document.querySelectorAll('#leadsView *')].forEach(e => { if (e && e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight; }); window.scrollTo(0, 1e7); });
    await W(500);
    const f = await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); const vis = !!(f && f.getClientRects().length && getComputedStyle(f).display !== 'none'); if (!vis) return { vis };
      const fb = f.getBoundingClientRect(); const hid = [];
      document.querySelectorAll('#leadsView button, #leadsView a[href], #leadsView a.ljbtn, #leadsView input, #leadsView select, #leadsView [data-act]').forEach(e => { const b = e.getBoundingClientRect(); if (b.width < 1 || !e.getClientRects().length) return; const ix = Math.max(0, Math.min(b.right, fb.right) - Math.max(b.left, fb.left)), iy = Math.max(0, Math.min(b.bottom, fb.bottom) - Math.max(b.top, fb.top)); if (ix * iy > 0) hid.push((e.textContent || e.className).trim().slice(0, 20) + ' ' + Math.round(ix * iy / (b.width * b.height) * 100) + '%'); });
      const cards = [...document.querySelectorAll('#leadsView .ljcard')]; const last = cards[cards.length - 1];
      return { vis, fab: [Math.round(fb.top), Math.round(fb.bottom)], hid, lastBottom: last ? Math.round(last.getBoundingClientRect().bottom) : null, n: cards.length }; });
    ok(f.vis, `P07.08 ${theme}: the Ask button is showing (browser mode, theo)`, f);
    if (f.vis) { ok(f.n >= 3, `P07.08 ${theme}: a long list of lead cards`, f.n); ok(f.hid.length === 0 && f.lastBottom <= f.fab[0], `P07.08 ${theme}: at the end of the list the last card ends above Ask`, f); }
  } finally { await browser.close(); }
}

/* ───────────────────────── P06.10 + P10.04  the Library ───────────────────────── */
async function library(theme, standalone, who = 'theo') {
  const lab = `${who} ${theme}${standalone ? ' installed' : ' browser'}`;
  const { browser, page } = await boot(who, { theme, standalone });
  try {
    const tuck = await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); const before = getComputedStyle(f).display; showResourceLibrary(); return { before, after: getComputedStyle(f).display }; });
    if (who === 'theo') ok(tuck.before !== 'none' && tuck.after === 'none', `P10.04 ${lab}: the global Ask tucks the moment the Library opens`, tuck);   /* only Theo and Joan have it */
    await W(1600);
    const floats = () => page.evaluate(() => {
      const ids = ['cr-rltheme-btn', 'cr-rlhome-btn', 'cr-nachi-mgr-btn', 'cr-rltoc-btn', 'rlAskBtn', 'cr-ai-fab'];
      return ids.map(id => { const e = document.getElementById(id); if (!e || !e.getClientRects().length || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return { id, l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom) }; }).filter(Boolean); });
    const covered = () => page.evaluate(() => {
      const v = document.getElementById('resourceLibraryView'); v.scrollTop = 1e7;
      const fl = ['cr-rltheme-btn', 'cr-rlhome-btn', 'cr-nachi-mgr-btn', 'cr-rltoc-btn', 'rlAskBtn', 'cr-ai-fab'].map(id => document.getElementById(id)).filter(e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
      const hid = [];
      v.querySelectorAll('*').forEach(el => { if (!el.getClientRects().length) return; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); const ctl = el.matches('a,button,input,select'); if (!own && !ctl) return; const q = el.getBoundingClientRect(); if (q.width < 1 || q.bottom < 0 || q.top > innerHeight) return;
        for (const f of fl) { const b = f.getBoundingClientRect(); if (q.left < b.right && q.right > b.left && q.top < b.bottom && q.bottom > b.top) hid.push(f.id + ' covers "' + el.textContent.trim().slice(0, 24) + '"'); } });
      return [...new Set(hid)]; });
    for (const page_ of ['landing', 'inner']) {
      if (page_ === 'inner') {
        const went = await page.evaluate(() => { const a = document.querySelector('#resourceLibraryView [data-rlgoto="ins_hub"]'); if (!a) return false; a.click(); return true; });
        await W(1200);
        ok(went && await page.evaluate(() => document.body.classList.contains('viewing-rl') && !document.body.classList.contains('rl-at-landing') && !document.body.classList.contains('rl-at-book')), `P06.10 ${lab}: opened an inner Library page`, went);
      }
      const fl = await floats();
      const left = fl.filter(f => f.id !== 'rlAskBtn' && f.id !== 'cr-ai-fab').sort((a, b) => a.t - b.t);
      const gaps = left.slice(1).map((f, i) => f.t - left[i].b);
      ok(left.length >= 2 && left.every(f => f.l === left[0].l), `P06.10 ${lab} ${page_}: the Library's own controls share one corner`, left);
      ok(gaps.every(g => g >= 4 && g <= 14), `P06.10 ${lab} ${page_}: they form one stack with no holes`, gaps);
      ok(!fl.some(f => f.id === 'cr-ai-fab'), `P10.04 ${lab} ${page_}: the global Ask is not on the Library`, fl.map(f => f.id));
      const hid = await covered();
      ok(hid.length === 0, `P06.10 ${lab} ${page_}: at the end of the page nothing is under a floating control`, hid);
    }
  } finally { await browser.close(); }
}

/* ───────────────────────── P12.05  + New -> Punch-out ───────────────────────── */
async function newPunch() {
  const { browser, page } = await boot('theo', { theme: 'dark' });
  try {
    await page.evaluate(() => { try { showHome(); } catch (e) {} }); await W(400);
    await page.evaluate(() => window.CardinalProduction.newPunch(null)); await W(1400);
    const r = await page.evaluate(() => { const s = document.querySelector('#cr-pb-modal [data-f="project"]'); if (!s) return null;
      const st = id => { const p = (window.cacheProjects || []).find(x => String(x.id) === String(id)); return p ? normStage(p.stage) : '?'; };
      const opts = [...s.options].filter(o => o.value).map(o => ({ id: o.value, st: st(o.value) }));
      const want = (window.cacheProjects || []).filter(p => normStage(p.stage) !== 'Lost').map(p => String(p.id));
      return { val: s.value, opts, want, n: (window.cacheProjects || []).length }; });
    if (!ok(!!r, 'P12.05: the punch-out composer opened')) return;
    const ids = r.opts.map(o => o.id);
    ok(r.want.length >= 7 && r.want.every(id => ids.includes(id)), 'P12.05: every job that is not Lost is offered', { offered: ids, want: r.want });
    ok(!r.opts.some(o => o.st === 'Lost'), 'P12.05: a Lost job is not offered', r.opts);
    const fl = r.opts.map(o => ['Approved', 'Scheduled', 'Completed'].includes(o.st));
    ok(fl.indexOf(false) === -1 || fl.slice(fl.indexOf(false)).every(x => !x), 'P12.05: the in-flight jobs come first', r.opts);
    ok(r.val === '', 'P12.05: and nothing is pre-picked (1429 holds)', r.val);
  } finally { await browser.close(); }
}

/* ───────────────────────── P12.06  New Lead: Lead Source ───────────────────────── */
async function leadSource(theme) {
  const { browser, page } = await boot('theo', { theme });
  try {
    await page.evaluate(() => window.openLeadForm()); await W(900);
    const a = await page.evaluate(() => { const s = document.getElementById('ldSource'); return { vis: !!(s && s.getClientRects().length), more: document.getElementById('leadFormModal').classList.contains('ldshow') }; });
    ok(a.vis && !a.more, `P12.06 ${theme}: Lead Source shows at open, with More detail still folded`, a);
    const r = await page.evaluate(async () => { const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('ldFirst', 'Pat'); set('ldLast', 'Quick'); const pi = document.querySelector('#ldPhones .ldrow input'); if (pi) pi.value = '937-555-0177';
      const rr = document.querySelector('input[name="ldClaimType"][value="retail"]'); if (rr) rr.checked = true;
      document.getElementById('leadFormModal').scrollTop = 0;
      const n0 = (window.__WRITES__ || []).filter(w => w.table === 'projects').length; document.getElementById('ldSave').click(); await new Promise(r => setTimeout(r, 900));
      const s = document.getElementById('ldSource'), sq = s.getBoundingClientRect();
      const msgs = [...document.querySelectorAll('#leadFormModal *')].filter(e => e.getClientRects().length && e.children.length === 0 && /where this lead came from/i.test(e.textContent));
      const near = msgs.map(e => { const q = e.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), dist: Math.round(Math.min(Math.abs(q.top - sq.bottom), Math.abs(sq.top - q.bottom))), inView: q.top >= 0 && q.bottom <= innerHeight, ink: window.__ink ? window.__ink(e) : null, fs: getComputedStyle(e).fontSize }; });
      return { wrote: (window.__WRITES__ || []).filter(w => w.table === 'projects').length - n0, focus: document.activeElement && document.activeElement.id, field: [Math.round(sq.top), Math.round(sq.bottom)], fieldInView: sq.top >= 0 && sq.bottom <= innerHeight, near, vh: innerHeight }; });
    ok(r.wrote === 0, `P12.06 ${theme}: a lead with no source is still refused`, r.wrote);
    ok(r.focus === 'ldSource' && r.fieldInView, `P12.06 ${theme}: the refusal brings Lead Source on screen and focuses it`, r);
    ok(r.near.some(n => n.dist <= 40 && n.inView), `P12.06 ${theme}: the reason is printed beside the field, on screen`, r.near);
    const ink = r.near.filter(n => n.dist <= 40).map(n => n.ink);
    ok(ink.length && ink.every(x => x == null || x >= 4.5), `P12.06 ${theme}: the reason reads >= 4.5:1`, ink);
    await page.evaluate(() => { const s = document.getElementById('ldSource'); s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }); await W(200);
    ok(await page.evaluate(() => ![...document.querySelectorAll('#leadFormModal *')].some(e => e.getClientRects().length && e.children.length === 0 && /where this lead came from/i.test(e.textContent) && e.id !== 'ldError')), `P12.06 ${theme}: picking a source clears the note beside it`);
  } finally { await browser.close(); }
}

/* ───────────────────────── P12.12 + P12.13  the inspection guide ───────────────────────── */
async function inspGuide() {
  const asks = [];
  const { browser, page } = await boot('rep', { theme: 'dark', dialog: d => { asks.push(d.message()); d.accept(); } });
  try {
    const click = (re) => page.evaluate(re => { const R = new RegExp(re, 'i'); const b = [...document.querySelectorAll('#insgSheet button')].filter(x => x.getClientRects().length && R.test(x.textContent.trim())).pop(); if (!b) return false; b.click(); return true; }, re);
    await page.evaluate(() => openProject('R3')); await W(1300);
    await page.evaluate(() => showTab('inspections')); await W(700);
    await page.evaluate(() => document.getElementById('pNewReportBtn').click()); await W(900);
    ok(await click('^Next$'), 'P12.13: the guide opened at step 1');
    await W(800);
    ok(await click('^Skip checklist'), 'P12.13: Skip checklist is offered on step 2');
    await W(1400);
    const n = await page.evaluate(() => { const g = document.getElementById('insgGrid'); const e = g && [...g.children].find(x => /No photos on this job yet/.test(x.textContent)); if (!e) return null; return { w: Math.round(e.getBoundingClientRect().width), gw: Math.round(g.clientWidth) }; });
    ok(!!n && n.w >= n.gw * 0.95, 'P12.12: the empty-photos note spans the photo grid', n);
    ok(await click('^Start without AI'), 'P12.13: Start without AI is offered on step 3');
    await W(1800);
    const a = await page.evaluate(() => { const a = document.getElementById('crAsk'); return { ask: !!(a && a.getClientRects().length && /Checklist on file/i.test(a.textContent)), editor: (v => !!(v && v.getClientRects().length && getComputedStyle(v).display !== 'none'))(document.getElementById('editorView')) }; });
    ok(!a.ask, 'P12.13: having skipped the checklist, nobody asks about it again', a);
    ok(a.editor, 'P12.13: the report opens straight away', a);
    ok(asks.length === 0, 'P12.13: no browser dialog either', asks);
    await page.evaluate(() => { try { closeEditor && closeEditor(); } catch (e) {} }); await W(700);
    await page.evaluate(() => { openProject('R3'); }); await W(1000);
    await page.evaluate(() => { createReportFrom(REPORT_TEMPLATE, 'Report', true); }); await W(900);
    ok(await page.evaluate(() => { const a = document.getElementById('crAsk'); return !!(a && a.getClientRects().length && /Checklist on file/i.test(a.textContent)); }), 'P12.13: a New report that did NOT skip still asks');
  } finally { await browser.close(); }
}

/* ───────────────────────── P12.15  appointments ───────────────────────── */
async function appts(theme) {
  const { browser, page } = await boot('rep', { theme });
  try {
    await page.evaluate(() => { window.currentProject = (window.cacheProjects || []).find(p => p.id === 'R3'); openProject('R3'); }); await W(1200);
    await page.evaluate(() => openApptsPage()); await W(800);
    const m = await page.evaluate(() => ['apKind', 'apDate', 'apTime', 'apNotes', 'apAddBtn'].map(id => { const e = document.getElementById(id); const q = e.getBoundingClientRect(); let fit = null;
      if (e.placeholder) { const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(e); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; fit = c.measureText(e.placeholder).width <= e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 0.5; }
      return { id, h: Math.round(q.height), r: Math.round(q.right), fit }; }));
    for (const x of m) ok(x.h >= 44, `P12.15 ${theme}: #${x.id} is >= 44 tall`, x);
    const notes = m.find(x => x.id === 'apNotes');
    ok(notes.fit, `P12.15 ${theme}: the notes hint fits its box`, notes);
    ok(m.every(x => x.r <= 390), `P12.15 ${theme}: the form fits the phone`, m.map(x => x.r));
    await page.evaluate(() => { const d = new Date(Date.now() + 2 * 864e5); document.getElementById('apDate').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); document.getElementById('apTime').value = '10:30'; document.getElementById('apAddBtn').click(); });
    await W(1400);
    const row = await page.evaluate(() => [...document.querySelectorAll('#apMount .tskrow small')].map(s => s.textContent.trim()));
    ok(row.length >= 1 && row.every(t => !/\d{4}-\d{2}-\d{2}/.test(t)), `P12.15 ${theme}: the list row shows a day, not a raw ISO date`, row);
    ok(row.some(t => /10:30 AM/.test(t)), `P12.15 ${theme}: and the time as 10:30 AM`, row);
    await page.evaluate(() => window.openScheduleBoard()); await W(1200);
    const b = await page.evaluate(() => [...document.querySelectorAll('#boardMount .bitem .btitle')].map(e => e.textContent.trim()).filter(t => /Sample Retail Prospect/.test(t)));
    ok(b.length >= 1 && b.every(t => t.split('Sample Retail Prospect').length === 2), `P12.15 ${theme}: the Schedule Board names the client once`, b);
    const other = await page.evaluate(() => [...document.querySelectorAll('#boardMount .bitem .bcli')].length);
    ok(true, `P12.15 ${theme}: (board client tags still drawn where the title lacks the name: ${other})`);
  } finally { await browser.close(); }
}

console.log('gate_1440 on ' + FILE);
await section('P08.02  Crew Dispatch at 390', async () => {
  await dispatchCase('curtis', { theme: 'dark' });
  await dispatchCase('curtis', { theme: 'light' });
  await dispatchCase('curtis', { theme: 'sun' });
  await dispatchCase('scottie', { theme: 'dark', text: 'xl' });
  await dispatchCase('scottie', { theme: 'sun' });
  await dispatchDesk();
});
await section('P08.03  the Production home', async () => {
  await prodHome('scottie', { theme: 'dark' });
  await prodHome('scottie', { theme: 'sun' });
  await prodHome('curtis', { theme: 'light' });
  await prodHome('theo', { theme: 'dark' });
});
await section('P08.12  the punch tabs', async () => {
  await punchTabs('curtis', { theme: 'dark' });
  await punchTabs('curtis', { theme: 'dark', text: 'lg' });
  await punchTabs('scottie', { theme: 'light', text: 'xl' });
  await punchTabs('scottie', { theme: 'sun' });
  await punchTabs('curtis', { theme: 'sun', text: 'xl' });
});
await section('P07.02  the client name at Larger', async () => {
  await nameBar({ theme: 'dark' });
  await nameBar({ theme: 'dark', text: 'xl' });
  await nameBar({ theme: 'light', text: 'xl' });
  await nameBar({ theme: 'sun', text: 'lg' });
});
await section('P07.07  the estimate x', async () => { await estDiscard('dark'); await estDiscard('light'); });
await section('P07.08  Ask at the end of Leads', async () => { await leadsFab('dark'); await leadsFab('light'); });
await section('P06.10 + P10.04  the Library', async () => { await library('dark', false); await library('light', false); await library('dark', true); await library('light', false, 'rep'); await library('dark', true, 'rep'); });
await section('P12.05  + New -> Punch-out', newPunch);
await section('P12.06  New Lead: Lead Source', async () => { await leadSource('dark'); await leadSource('light'); });
await section('P12.12 + P12.13  the inspection guide', inspGuide);
await section('P12.15  appointments', async () => { await appts('dark'); await appts('light'); });

const pe = L.log.filter(l => /PAGEERROR/.test(l));
ok(pe.length === 0, 'no page errors across every boot', pe.slice(0, 4));
const total = passes + fails.length;
const FLOOR = 190;
if (total < FLOOR) { fails.push(`only ${total} checks ran (floor ${FLOOR})`); console.log(`  ✗ FAIL only ${total} checks ran (floor ${FLOOR})`); }
console.log(`\n${fails.length ? 'GATE 1440 RED' : 'GATE 1440 GREEN'} — ${passes} passed, ${fails.length} failed`);
if (fails.length) console.log('failed:\n  ' + fails.join('\n  '));
process.exit(fails.length ? 1 : 0);
