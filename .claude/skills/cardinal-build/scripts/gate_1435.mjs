/* gate_1435.mjs — build 1435, Theo's taste calls T1 C (Graphs & Reports) and T3 B (the eight form sheets go dark in dark mode).
 *
 *   node gate_1435.mjs [index.html]       (default: the repo's index.html; control: build 1434's tree)
 *
 * Chromium, the real app (gate_1403_lib's rig), measured — never read off the CSS:
 *   T1  Reports, dark + light, 1440 and 390, all three tabs (Company, Reps, Production):
 *       A  the pipe cards' left edge is the card's own 1px hairline, and no decorative red is left on Reports
 *          (card edges, table header rules, the reviews total rule). Red that stays on purpose: the SELECTED
 *          range/tab pill (a button), avatars, the Google mark, and the data itself.
 *       B  the panels follow the theme: obsidian in dark (unchanged), 557's light twin in light
 *       C  every text element (placeholders included) clears 4.5:1 (3:1 large) against its WORST ground:
 *          translucent row stripes composited over every stop of the card's gradient
 *       D  the canvas charts' tick and legend ink is the theme's (#b9bec7 dark / #5f6670 light) and clears 4.5:1
 *          against the card's worst stop
 *       E  a theme flip re-inks the charts already drawn — same chart objects, no rebuild — and back again
 *       F  the 1415 What's New line says what really happened (only the stat tiles lost their red cap)
 *   T3  the eight .projform sheets (profile, Add project + Edit client info, Roofing checklist, GC, Lead,
 *       New Lead with every disclosure open, Appointment with a row in edit, Signature), dark + light, 390 and 1280:
 *       A  dark: the sheet is the dark panel ground and no light ground is left inside it (bar the signature pad,
 *          the red buttons and the selected chip); light: the sheet is still white paper
 *       B  every text — field text, placeholders, labels, helper and error text, chips, stars, buttons — clears its floor
 *       C  the appointment row's small line and its ✕ read >= 4.5:1 on the sheet, and the ✕ is >= 44px (1433, kept)
 *       D  the signature pad stays a light writing surface in both themes
 *       E  the 44px targets hold on every field, chip and button that had them
 *       G  light is unchanged: the paper literals still paint (white sheet, #555 labels, #c9c2bf fields, beige chips)
 *   S   static: --sheet-* and --rpt-* are each declared in exactly ONE block (tokens, not an override layer),
 *       and the 1299 paper-ink chip rules are gone.
 * Light is set the real way — localStorage['cardinal.theme.rb']='1' in the seed, before boot (a reload lands on
 * sign-in in this rig: sw.js). sw.js is blocked; Chart.js 4.4.3 is served from ./vendor (the version index.html pins).
 * RED on 1433 with named failures, never a crash (BUG_CLASSES 37): every step records its own failure and carries on. */
import fs from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
process.env.APPFILE = FILE;
const { boot, log } = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 600000).unref();
const HERE = new URL('./', import.meta.url).pathname;
const CHART_PATHS = [HERE + 'vendor/chart.umd.min.js'];   /* Chart.js 4.4.3, the version index.html pins (MIT) */
const CHART = (() => { for (const p of CHART_PATHS) { try { return fs.readFileSync(p); } catch (e) {} } return null; })();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' && d != null ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SRC = fs.readFileSync(FILE, 'utf8');

/* ── seeds: light the real way; Reports data for all three tabs; one appointment today ── */
const THEME = light => light ? "try{localStorage.setItem('cardinal.theme.rb','1')}catch(e){}" : "try{localStorage.removeItem('cardinal.theme.rb')}catch(e){}";
const SEED = `(function(){ var S = window.__SEED__; if(!S) return;
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  function dk(o){ var d=new Date(Date.now()+o*86400000); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function ck(o){ return JSON.stringify(Object.assign({ lead:{ claim_type:'retail', assigned:[] } }, o)); }
  var me='theo@cardinalrenovations.net', rep='rep@cardinalrenovations.net';
  S.projects.push(
    { id:'RA', name:'Sample Retail A', address:'1 Elm St', stage:'Approved', crm:'retail', created_by:me, checklist:ck({ lead_source:'Referral', t_Approved:iso(-8), job_cost:6000, manual_value:11000, review_requested_at:iso(-5), review_left_at:iso(-3) }), created_at:iso(-20), updated_at:iso(-8), stage_since:iso(-8) },
    { id:'RB', name:'Sample Retail B', address:'2 Elm St', stage:'Completed', crm:'retail', created_by:rep, checklist:ck({ lead_source:'Door knock', t_Approved:iso(-15), t_Completed:iso(-4), job_cost:9000, manual_value:8000, review_requested_at:iso(-4) }), created_at:iso(-25), updated_at:iso(-4), stage_since:iso(-4) },
    { id:'RC', name:'Sample Retail C', address:'3 Elm St', stage:'Lead', crm:'retail', created_by:rep, checklist:ck({ lead_source:'Google / website' }), created_at:iso(-40), updated_at:iso(-30), stage_since:iso(-30) },
    { id:'RD', name:'Sample Retail D', address:'4 Elm St', stage:'Lost', crm:'retail', created_by:me, checklist:ck({ lead_source:'Referral', lost_at:iso(-6), loss_reason:'Price' }), created_at:iso(-22), updated_at:iso(-6), stage_since:iso(-6) },
    { id:'RE', name:'Sample Retail E', address:'5 Elm St', stage:'Prospect', crm:'retail', created_by:me, checklist:ck({ lead_source:'Yard sign' }), created_at:iso(-9), updated_at:iso(-2), stage_since:iso(-2) });
  S.appointments = [ { id:'apJ', project_id:'RA', kind:'appt', appt_date:dk(0), appt_time:'09:30', title:'Inspection @ 1 Elm St', notes:'Bring the ladder', created_by:me, created_at:iso(0) } ];
})();`;

/* ── in-page instruments: worst-ground contrast (stripes over every gradient stop), red, luminance ── */
const TOOLS = `window.__J = (function(){
  function parse(v){ var m = v && String(v).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 }; }
  function lin(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
  function lum(c){ return 0.2126*lin(c.r) + 0.7152*lin(c.g) + 0.0722*lin(c.b); }
  function ratio(a,b){ var x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  function over(t,b){ var a = t.a; return { r:t.r*a+b.r*(1-a), g:t.g*a+b.g*(1-a), b:t.b*a+b.b*(1-a), a:1 }; }
  /* the grounds a text sits on: translucent layers composited over EACH stop of the first gradient below
     them, or over the first opaque colour (CLAUDE.md rig trap 2 — background-color is not the background) */
  function grounds(el){ var stack = [], e = el, bases = null;
    while(e && e.nodeType === 1){ var cs = getComputedStyle(e), bi = cs.backgroundImage;
      var stops = bi && bi !== 'none' ? (bi.match(/rgba?\\([^)]+\\)/g) || []).map(parse).filter(function(c){ return c && c.a > 0.5; }) : [];
      if(stops.length){ bases = stops; break; }
      var c = parse(cs.backgroundColor); if(c && c.a > 0){ if(c.a >= 0.99){ bases = [c]; break; } stack.push(c); }
      e = e.parentElement; }
    if(!bases) bases = [parse(getComputedStyle(document.body).backgroundColor) || { r:255, g:255, b:255, a:1 }];
    return bases.map(function(b){ return stack.reduceRight(function(acc, c){ return over(c, acc); }, { r:b.r, g:b.g, b:b.b, a:1 }); }); }
  function worst(ink, el){ var c = parse(ink); return Math.min.apply(null, grounds(el).map(function(g){ return ratio(over(c, g), g); })); }
  function isRed(v){ var c = parse(v); return !!c && c.a > 0.3 && c.r > 150 && c.g < 90 && c.b < 100 && c.r > 1.8*c.g; }
  function key(el){ var b = []; for(var e = el, i = 0; e && i < 3; e = e.parentElement, i++){ if(e.id){ b.unshift('#'+e.id); break; } var t = e.tagName.toLowerCase(); var cl = (typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '').trim().split(/\\s+/)[0]; if(cl) t += '.'+cl; b.unshift(t); } return b.join(' '); }
  function vis(el){ if(!el.getClientRects().length) return false; var cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }
  /* every text-bearing element under root, scored; form controls by their own ink, plus their placeholder */
  function texts(root){ var out = [];
    [root].concat([].slice.call(root.querySelectorAll('*'))).forEach(function(el){
      if(!vis(el)) return; var cs = getComputedStyle(el);
      var own = [].some.call(el.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); }) || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
      if(el.tagName === 'INPUT' && /^(checkbox|radio|file|hidden)$/.test(el.type)) own = false;
      if(!own) return;
      var fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight, 10), large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      out.push({ k:key(el), t:(el.value || el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,26), r:+worst(cs.color, el).toFixed(2), floor: large ? 3 : 4.5, ink:cs.color });
      if(/^(INPUT|TEXTAREA)$/.test(el.tagName) && el.placeholder && !el.value){ var ph = getComputedStyle(el, '::placeholder').color;
        out.push({ k:key(el)+'::placeholder', t:el.placeholder.slice(0,26), r:+worst(ph, el).toFixed(2), floor:4.5, ink:ph }); }
    }); return out; }
  return { parse:parse, lum:lum, ratio:ratio, grounds:grounds, worst:worst, isRed:isRed, key:key, vis:vis, texts:texts };
})();`;

async function bootJ(light, w) {
  const r = await boot('theo', { instr: false, seed: THEME(light) + SEED, desktop: w > 500 });
  const { page } = r;
  await page.route(/\/sw\.js(\?.*)?$/, rt => rt.abort());
  if (CHART) await page.route(/chart\.js@4\.4\.3\/dist\/chart\.umd\.min\.js/, rt => rt.fulfill({ status: 200, contentType: 'application/javascript', body: CHART }));
  await page.addInitScript(() => { try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return new Promise(function () {}); }; } catch (e) {} });
  if (w > 500) await page.setViewportSize({ width: w, height: 900 });
  await page.addScriptTag({ content: TOOLS });
  const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'rb-light' ? 'light' : 'dark');
  r.theme = th;
  return r;
}
const T = l => l ? 'light' : 'dark';

/* ═══════════════════════════════ S · static ═══════════════════════════════ */
{
  const decl = name => [...SRC.matchAll(new RegExp('(?<![\\w-])' + name + '[a-z0-9-]+\\s*:', 'g'))].map(m => m.index);
  const inOne = (name, sel) => { const i = SRC.indexOf(sel); if (i < 0) return { ok: false, why: 'no block ' + sel }; const j = SRC.indexOf('}', i); const d = decl(name); return { ok: d.length > 0 && d.every(x => x > i && x < j), why: d.length + ' declarations' }; };
  const a = inOne('--sheet-', ':root:not([data-theme="rb-light"]) .projform{');
  ok(a.ok, 'S  every --sheet-* token is declared in ONE dark-only block on .projform (tokens, not a layer)', a.why);
  const b = inOne('--rpt-', ':root[data-theme="rb-light"] #reportsView{');
  ok(b.ok, 'S  every --rpt-* token is declared in ONE light block on #reportsView', b.why);
  ok(!/\.projform \.chipbtn\{--cr-stack:"1299/.test(SRC), "S  1299's paper-ink chip rules for a white sheet in dark are gone");
}
/* T1 F — the CHANGELOG correction */
{
  const m = SRC.match(/\{ b: 1415, d:'[^']+', t:'[^']*', s:'([^']*)'/);
  const s = m ? m[1] : '';
  ok(/^Home cards and the stat tiles on Reports lose the red stripe/.test(s) && !/Home and Reports cards lose the red stripe/.test(SRC),
     "T1 F  the 1415 What's New line says only the Reports stat tiles lost their red stripe", s.slice(0, 90));
}

/* ═══════════════════════════════ T1 · REPORTS ═══════════════════════════════ */
const CHART_INK = { dark: '#b9bec7', light: '#5f6670' };
for (const light of [false, true]) for (const w of [1440, 390]) {
  const tag = `T1 ${T(light)} ${w}`;
  let r;
  try {
    r = await bootJ(light, w); const { page } = r;
    ok(r.theme === T(light), `${tag}: the app booted in ${T(light)}`, r.theme);
    await page.evaluate(() => openReportsView()); await sleep(1600);
    for (const tab of ['company', 'reps', 'production']) {
      await page.evaluate(t => { const c = document.querySelector('#rptTabs .hstat[data-t="' + t + '"]'); if (c) c.click(); }, tab).catch(() => {});
      await sleep(1300);
      const m = await page.evaluate(() => {
        const J = window.__J, V = document.getElementById('reportsView');
        const cards = [...V.querySelectorAll('.pipecard, .rptkpi')].filter(J.vis);
        const edges = cards.filter(c => c.classList.contains('pipecard')).map(c => { const cs = getComputedStyle(c); return { lw: cs.borderLeftWidth, lc: cs.borderLeftColor, rw: cs.borderRightWidth, rc: cs.borderRightColor }; });
        /* decorative red: any border or background in red that is not a selected pill (a button) or an avatar */
        const deco = [];
        for (const el of V.querySelectorAll('*')) { if (!J.vis(el)) continue; if (el.closest('.hstat.on, .tmav, svg')) continue; const cs = getComputedStyle(el);
          for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && J.isRed(cs['border' + s + 'Color'])) deco.push(J.key(el) + ' border-' + s.toLowerCase() + ' ' + cs['border' + s + 'Color']);
          if (J.isRed(cs.backgroundColor)) deco.push(J.key(el) + ' background ' + cs.backgroundColor); }
        const faces = cards.map(c => getComputedStyle(c).backgroundImage);
        const texts = J.texts(V);
        const charts = [];
        if (window.Chart && window.rptCharts) for (const id of Object.keys(rptCharts)) { const el = document.getElementById(id); if (!el || !J.vis(el)) continue; const c = rptCharts[id];
          let ticks = [], legend = null; try { ticks = Object.values(c.scales || {}).map(s => s.options.ticks.color); } catch (e) {}
          try { legend = c.legend && c.legend.options.display !== false ? c.legend.options.labels.color : null; } catch (e) {}
          const card = el.closest('.pipecard'); const inks = ticks.concat(legend ? [legend] : []);
          const worst = inks.length && card ? Math.min(...inks.map(i => { const h = String(i); const rgb = /^#/.test(h) ? 'rgb(' + [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)).join(',') + ')' : h; return J.worst(rgb, card); })) : 0;
          charts.push({ id, ticks, legend, worst: +worst.toFixed(2) }); }
        return { n: cards.length, edges, deco, faces, texts, charts, hasChart: !!window.Chart && typeof Chart === 'function' };
      });
      const t2 = `${tag} ${tab}`;
      ok(m.n >= 3, `${t2}: the cards rendered`, m.n + ' cards');
      const badEdge = m.edges.filter(e => e.lw !== '1px' || e.lc !== e.rc);
      ok(m.edges.length && !badEdge.length, `T1 A ${t2}: every pipe card's left edge is its own 1px hairline`, badEdge.slice(0, 2).map(e => e.lw + ' ' + e.lc + ' vs ' + e.rc).join(' | '));
      ok(!m.deco.length, `T1 A ${t2}: no decorative red on Reports (edges, rules, fills)`, m.deco.slice(0, 4).join(' | '));
      const wantFace = light ? /rgb\(255, 255, 255\) 0%.*rgb\(236, 238, 242\) 100%/ : /rgb\(44, 45, 54\) 0%.*rgb\(8, 8, 11\) 100%/;
      const badFace = m.faces.filter(f => !wantFace.test(f));
      ok(m.faces.length && !badFace.length, `T1 B ${t2}: the panels are ${light ? "557's light twin" : 'obsidian (unchanged)'}`, badFace[0] && badFace[0].slice(0, 110));
      const bad = m.texts.filter(x => x.r < x.floor);
      const lo = m.texts.reduce((w, x) => (!w || x.r / x.floor < w.r / w.floor) ? x : w, null);
      ok(m.texts.length >= 20 && !bad.length, `T1 C ${t2}: all ${m.texts.length} texts clear their floor against the worst ground`, bad.length ? bad.slice(0, 4).map(x => x.r + ' "' + x.t + '" ' + x.k + ' ' + x.ink).join(' · ') : (lo ? 'worst ' + lo.r + ':1 "' + lo.t + '" ' + lo.k : ''));
      if (!CHART) ok(false, `T1 D ${t2}: Chart.js could not be loaded from ./vendor, so the chart ink was not measured`);
      else {
        const want = CHART_INK[T(light)];
        const badC = m.charts.filter(c => !c.ticks.concat(c.legend ? [c.legend] : []).every(x => String(x).toLowerCase() === want) || c.worst < 4.5);
        ok(m.charts.length >= 1 && !badC.length, `T1 D ${t2}: ${m.charts.length} chart(s) ink ${want}, >= 4.5:1 on the card's worst stop`, badC.slice(0, 2).map(c => c.id + ' ' + JSON.stringify(c.ticks) + ' legend ' + c.legend + ' ' + c.worst).join(' | '));
      }
    }
  } catch (e) { ok(false, `${tag}: run crashed`, String(e.message || e).split('\n')[0]); }
  finally { if (r) await r.browser.close(); }
}
/* T1 E — a flip re-inks the drawn charts: same objects, no rebuild, and back */
{
  let r;
  try {
    r = await bootJ(false, 1440); const { page } = r;
    await page.evaluate(() => openReportsView()); await sleep(1800);
    const read = () => page.evaluate(() => { const o = {}; if (!window.rptCharts) return o; for (const id of Object.keys(rptCharts)) { const c = rptCharts[id]; let t = null; try { t = Object.values(c.scales || {}).map(s => s.options.ticks.color)[0] || (c.legend ? c.legend.options.labels.color : null); } catch (e) {} o[id] = { uid: c.id, ink: t }; } return { charts: o, built: window.Chart && Chart.instances ? Object.keys(Chart.instances).length : -1, theme: document.documentElement.getAttribute('data-theme') || 'dark' }; });
    const a = await read();
    await page.evaluate(() => window.CardinalRBTheme.toggle()); await sleep(900);
    const b = await read();
    await page.evaluate(() => window.CardinalRBTheme.toggle()); await sleep(900);
    const c = await read();
    const ids = o => Object.values(o.charts).map(x => x.uid).join(',');
    const inks = o => [...new Set(Object.values(o.charts).map(x => String(x.ink).toLowerCase()))].join(',');
    ok(Object.keys(a.charts).length >= 3 && a.theme === 'dark' && b.theme === 'rb-light' && c.theme === 'dark', 'T1 E  the flip happened: dark -> light -> dark, with the charts drawn', [a.theme, b.theme, c.theme, Object.keys(a.charts).length].join(' '));
    ok(inks(a) === '#b9bec7' && inks(b) === '#5f6670' && inks(c) === '#b9bec7', 'T1 E  the drawn charts re-ink on the flip (#b9bec7 -> #5f6670 -> #b9bec7)', [inks(a), inks(b), inks(c)].join(' -> '));
    ok(ids(a) === ids(b) && ids(b) === ids(c) && a.built === b.built && b.built === c.built, 'T1 E  ...without rebuilding them (same chart objects, same instance count)', ids(a) + ' | ' + ids(b) + ' | built ' + a.built + '/' + b.built + '/' + c.built);
  } catch (e) { ok(false, 'T1 E  run crashed', String(e.message || e).split('\n')[0]); }
  finally { if (r) await r.browser.close(); }
}

/* ═══════════════════════════════ T3 · THE FORM SHEETS ═══════════════════════════════ */
const STATES = [
  { name: 'profile', host: 'profileView', open: () => { openMyProfile(); document.getElementById('upFlash').textContent = '✓ Saved'; document.getElementById('upError').textContent = 'First and last name are required.';
      const h = document.getElementById('pushIosHint'); h.style.display = 'block';
      const st = document.getElementById('pushStatus'); st.textContent = 'Permission was not granted.'; st.style.color = st.style.color; } },
  { name: 'profile-test-alert', host: 'profileView', open: async () => { openMyProfile(); document.getElementById('testAlertBtn').click(); await new Promise(r => setTimeout(r, 900)); } },
  { name: 'addproject', host: 'projModal', open: () => { openProjModal(); const c = document.querySelector('#pfSourceChips .pf-chip'); if (c) c.click(); document.getElementById('pfError').textContent = 'Client name is required.'; } },
  { name: 'editclient', host: 'projModal', open: () => { openProjModal(cacheProjects.find(p => p.id === 'RA') || cacheProjects[0]); } },
  { name: 'checklist', host: 'ckModal', open: () => { currentProject = cacheProjects.find(p => p.id === 'RA') || cacheProjects[0]; openChecklist(); document.getElementById('ckError').textContent = 'Rate all six assets.'; } },
  { name: 'gc', host: 'gcModal', open: () => { currentProject = cacheProjects.find(p => p.id === 'RA') || cacheProjects[0]; openGeneralCk(); document.getElementById('gcError').textContent = 'Rate all six assets.'; } },
  { name: 'lead', host: 'leadModal', open: () => openLeadModal([{ kind: 'roof', reasons: 'Shingles rated Poor' }, { kind: 'gutters', reasons: 'Rated Critical' }]) },
  { name: 'newlead', host: 'leadFormModal', open: () => { openLeadForm();
      const more = document.getElementById('ldMoreBtn'); if (more && more.getAttribute('aria-expanded') !== 'true') more.click();
      const ins = document.querySelector('#leadFormModal input[name="ldClaimType"][value="insurance"]'); if (ins) ins.click();
      const pk = document.getElementById('ldPartnerCk'); if (pk && !pk.checked) pk.click();
      const nc = document.getElementById('ldNoContactWrap'); if (nc) nc.style.display = 'block';
      const lac = document.getElementById('cr-lac-toggle'); if (lac) lac.click();
      const sg = document.getElementById('ldSugg'); if (sg) { sg.innerHTML = '<div>100 Sample Rd, Dayton OH</div><div>102 Sample Rd, Dayton OH</div>'; sg.style.display = 'block'; }
      document.getElementById('ldError').textContent = 'Add a phone or an email.'; } },
  { name: 'appointment', host: 'apptModal', open: async () => { const d = new Date(); const ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      for (let i = 0; i < 6; i++) { openApptDay(ds); await new Promise(r => setTimeout(r, 700)); if (document.querySelector('#apptModal .apptrow')) break; }
      document.getElementById('apptError').textContent = 'Give it a title.'; } },
  { name: 'appointment-editing', host: 'apptModal', open: async () => { const d = new Date(); const ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      for (let i = 0; i < 6; i++) { openApptDay(ds); await new Promise(r => setTimeout(r, 700)); if (document.querySelector('#apptModal .apptrow')) break; }
      const e = document.querySelector('#apptModal .apptrow .apptedit'); if (e) e.click(); } },
  { name: 'signature', host: 'sigModal', open: () => { try { sigReset(); } catch (e) {} document.getElementById('sigModal').style.display = 'block'; } },
];
const HOSTS = [...new Set(STATES.map(s => s.host))];
/* Pre-existing debt this build did NOT cause and does not own — printed as DEBT, never silently passed, and
   RED if it gets worse than the value measured on 1433. Light is out of T3's scope by Theo's own terms. */
const DEBT_INK = [ { theme: 'light', key: /#ldScopeNote$/, max: 4.19, why: "light: #8a6f66 on the insurance box's #f2f4f8 (since the box shipped; light is unchanged by T3)" } ];
const DEBT_TAP = [ { key: /^#leadList div\.apptrow button\.btn$/, min: 41, why: "the Leads-from-this-inspection 'Create estimate' button is 41px tall in both themes on 1433 too" } ];
const debtLine = m => console.log('  DEBT  ' + m);
const LIGHT_EXPECT = [   /* the paper literals light mode must still paint (G) */
  ['#projModal .projform', 'backgroundColor', 'rgb(255, 255, 255)'], ['#projModal .projform label', 'color', 'rgb(85, 85, 85)'],
  ['#pfName', 'borderTopColor', 'rgb(201, 194, 191)'], ['#pfName', 'backgroundColor', 'rgb(255, 255, 255)'], ['#pfName', 'color', 'rgb(0, 0, 0)'],
  ['#pfSourceChips .pf-chip:not(.on)', 'backgroundColor', 'rgb(240, 232, 208)'], ['#projModalTitle', 'color', 'rgb(27, 27, 27)'],
];
for (const light of [false, true]) for (const w of [390, 1280]) {
  const tag = `T3 ${T(light)} ${w}`;
  let r;
  try {
    r = await bootJ(light, w); const { page } = r;
    ok(r.theme === T(light), `${tag}: the app booted in ${T(light)}`, r.theme);
    if (w <= 500) await page.evaluate(() => document.body.classList.add('standalone'));
    for (const st of STATES) {
      const t2 = `${tag} ${st.name}`;
      try {
        await page.evaluate(hs => { hs.forEach(h => { const e = document.getElementById(h); if (e) e.style.display = 'none'; }); }, HOSTS);
        await page.evaluate('(' + st.open.toString() + ')()'); await sleep(700);
        const m = await page.evaluate(host => {
          const J = window.__J, H = document.getElementById(host); if (!H || !J.vis(H)) return { none: 'did not open' };
          const cards = [...H.querySelectorAll('.projform')].filter(J.vis); if (!cards.length) return { none: 'no visible .projform' };
          const sheet = cards.map(c => getComputedStyle(c).backgroundColor);
          const texts = [].concat(...cards.map(c => J.texts(c)));
          /* a light ground left inside a dark sheet: any own background with luminance > 0.25, bar the deliberate ones */
          const light = [];
          for (const c of cards) for (const el of c.querySelectorAll('*')) { if (!J.vis(el) || el.matches('#sigPad, .btn:not(.ghost):not(.dark), .pf-chip.on')) continue;
            const bg = J.parse(getComputedStyle(el).backgroundColor); if (bg && bg.a > 0.5 && J.lum(bg) > 0.25) light.push(J.key(el) + ' ' + getComputedStyle(el).backgroundColor); }
          const pad = document.getElementById('sigPad'); const padBg = pad && J.vis(pad) ? getComputedStyle(pad).backgroundColor : null;
          const row = H.querySelector('.apptrow'); let appt = null;
          if (host === 'apptModal' && row) { const sm = row.querySelector('.bd small'), del = row.querySelector('.del'); const q = del ? del.getBoundingClientRect() : null;
            appt = { small: sm ? +J.worst(getComputedStyle(sm).color, sm).toFixed(2) : null, del: del ? +J.worst(getComputedStyle(del).color, del).toFixed(2) : null, w: q ? Math.round(q.width) : 0, h: q ? Math.round(q.height) : 0 }; }
          /* the targets that were 44px: fields, chips, buttons, trade rows, the row's own buttons */
          const small = [];
          for (const c of cards) for (const el of c.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), select, .btn, .chipbtn, .pf-chip, label.tradeopt, .apptrow .del, .apptrow .apptedit, .apptrow .apptcal')) {
            if (!J.vis(el)) continue; const q = el.getBoundingClientRect(); if (q.height < 43.5) small.push(J.key(el) + ' ' + Math.round(q.height)); }
          return { sheet, texts, light, padBg, appt, small };
        }, st.host);
        if (m.none) { ok(false, `${t2}: the sheet opens`, m.none); continue; }
        const wantSheet = light ? 'rgb(255, 255, 255)' : 'rgb(22, 22, 27)';
        const sheetOk = m.sheet.every(s => s === wantSheet);
        ok(sheetOk, `T3 A ${t2}: the sheet is ${light ? 'white paper (unchanged)' : 'the dark panel ground'}`, m.sheet.join(','));
        if (!light) ok(!m.light.length, `T3 A ${t2}: no light ground is left inside the dark sheet`, m.light.slice(0, 4).join(' | '));
        let bad = m.texts.filter(x => x.r < x.floor);
        bad = bad.filter(x => { const d = DEBT_INK.find(d => d.theme === T(light) && d.key.test(x.k)); if (!d) return true;
          if (x.r + 0.01 < d.max) return true; debtLine(`T3 B ${t2}: ${x.r} ${x.k} — ${d.why}`); return false; });
        const lo = m.texts.filter(x => !DEBT_INK.some(d => d.theme === T(light) && d.key.test(x.k))).reduce((w, x) => (!w || x.r / x.floor < w.r / w.floor) ? x : w, null);
        ok(m.texts.length >= 3 && !bad.length, `T3 B ${t2}: all ${m.texts.length} texts clear their floor`, bad.length ? bad.slice(0, 4).map(x => x.r + ' "' + x.t + '" ' + x.k + ' ' + x.ink).join(' · ') : (lo ? 'worst ' + lo.r + ':1 "' + lo.t + '" ' + lo.k : ''));
        if (st.host === 'apptModal') ok(m.appt && m.appt.small >= 4.5 && m.appt.del >= 4.5 && m.appt.w >= 44 && m.appt.h >= 44, `T3 C ${t2}: the row's small line and ✕ read >= 4.5:1, the ✕ is >= 44px`, JSON.stringify(m.appt));
        if (st.host === 'sigModal') ok(m.padBg === 'rgb(255, 255, 255)', `T3 D ${t2}: the signature pad stays a light writing surface`, m.padBg);
        const smallBad = m.small.filter(s => { const k = s.replace(/ \d+$/, ''), h = +s.split(' ').pop(); const d = DEBT_TAP.find(d => d.key.test(k));
          if (!d || h < d.min) return true; debtLine(`T3 E ${t2}: ${s}px — ${d.why}`); return false; });
        ok(!smallBad.length, `T3 E ${t2}: the 44px targets hold`, smallBad.slice(0, 4).join(' | '));
        if (light && st.name === 'addproject') {
          const g = await page.evaluate(exp => exp.map(([sel, prop, want]) => { const e = document.querySelector(sel); const v = e ? getComputedStyle(e)[prop] : 'missing'; return v === want ? null : sel + ' ' + prop + ' ' + v; }).filter(Boolean), LIGHT_EXPECT);
          ok(!g.length, `T3 G ${t2}: light still paints the paper literals`, g.join(' | '));
        }
      } catch (e) { ok(false, `${t2}: crashed`, String(e.message || e).split('\n')[0]); }
    }
    const errs = log.filter(l => /PAGEERROR/.test(l)); log.length = 0;
    ok(!errs.length, `${tag}: no page errors`, errs.slice(0, 2).join(' | '));
  } catch (e) { ok(false, `${tag}: run crashed`, String(e.message || e).split('\n')[0]); }
  finally { if (r) await r.browser.close(); }
}

console.log((fail ? 'GATE 1435 RED' : 'GATE 1435 GREEN') + ` — ${pass} passed, ${fail} failed (DEBT lines are pre-existing, not counted, and go RED if they worsen)`);
process.exit(fail ? 1 : 0);
