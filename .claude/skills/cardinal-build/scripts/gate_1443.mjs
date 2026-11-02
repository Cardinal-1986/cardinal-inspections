/* gate_1443 — round-1 leftovers: accessibility and sheets (builder A5, made on build 1438): P07.05, P07.06, P07.10, P07.11, P07.12, P10.03.
 *
 *   A  P07.05  the document editor's Back chip is a <button>, its hit area is 44px, Enter takes it back
 *              to the client, and the pill keeps its 22/24px look
 *   B  P07.06  Open full claim (and the claim card's body) opens the claim once; Community partner
 *              buttons, the punch card's + Add, the stage ⋮ (a labelled button), Remember me, Forgot
 *              password, punch search and the document title are all >= 44px by hit area
 *   C  P07.10  Production out-of-month day numbers, Community zero counts and the Clients bar counts
 *              clear 4.5:1 against their composited ground in Dark, Light and Sun, with no opacity
 *   D  P07.11  the top bar, the home list cards, the A/R card and the Clients cards take focus and
 *              Enter; New Lead / Add project are role=dialog aria-modal with a name; Tab (and
 *              Shift+Tab) never leaves New Lead, Add project or the estimate builder; at 390 every
 *              new role=button on the top bar still clears the 44px floor
 *   E  P07.12  the listed controls have accessible names; the calendar arrows say Previous / Next month
 *   F  P10.03  Escape and Back close the Ask sheet without moving the page; Escape closes Self Check
 *
 * Signed in through gate_1403_lib (gate_1401_seed.js: R1 retail, I1 insurance with claim clI1, C1
 * community, ctI1 a signed contract), APPFILE = the artifact. Floor: 70 checks.
 *   node gate_1443.mjs [artifact]        default: the repo index.html. On build 1442 this must go RED.
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || resolve(HERE, '../../../../index.html'));
process.env.APPFILE = FILE;
const L = await import(resolve(HERE, 'gate_1403_lib.mjs'));
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 1500000).unref();
const W = ms => new Promise(r => setTimeout(r, ms));

let passes = 0; const fails = [];
function ok(c, msg, det) { if (c) passes++; else fails.push(msg); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + msg + (det !== undefined ? '  — ' + (typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 260) : '')); return !!c; }

const THEME = t => `try{ localStorage.setItem('cardinal.theme.rb', '${t === 'light' ? '1' : t === 'sun' ? 'sun' : '0'}'); }catch(e){}`;
const HELP = `(function(){
  function P(c){ c=String(c); var m; if((m=c.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?\\)/))) return {r:+m[1]*255,g:+m[2]*255,b:+m[3]*255,a:m[4]!=null?+m[4]:1};
    m = c.match(/[\\d.]+/g) || [0,0,0]; return { r:+m[0], g:+m[1], b:+m[2], a: m.length > 3 ? +m[3] : 1 }; }
  function over(f, b){ var a = f.a; return { r:f.r*a + b.r*(1-a), g:f.g*a + b.g*(1-a), b:f.b*a + b.b*(1-a), a:1 }; }
  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }).reduce(function(s,v,i){ return s + v*[0.2126,0.7152,0.0722][i]; }, 0); }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  /* every ground an ancestor paints: colours composited bottom-up, and every gradient stop; score the worst */
  function grounds(el){
    var out = [], chain = [];
    for (var g = el; g && g.nodeType === 1; g = g.parentElement) chain.push(g);
    var base = { r:255, g:255, b:255, a:1 };
    for (var i = chain.length - 1; i >= 0; i--){ var bc = P(getComputedStyle(chain[i]).backgroundColor); if (bc.a > 0) base = over(bc, base); }
    for (var j = 0; j < chain.length; j++){
      var im = getComputedStyle(chain[j]).backgroundImage;
      if (im && im !== 'none' && !/url\\(/.test(im)){ var lay=[],dep=0,cur=''; for(var k=0;k<im.length;k++){ var ch=im[k]; if(ch==='(')dep++; if(ch===')')dep--; if(ch===','&&dep===0){lay.push(cur);cur='';} else cur+=ch; } lay.push(cur);
        var clips=getComputedStyle(chain[j]).backgroundClip.split(','); var use=lay.filter(function(L,ix){ return !/border-box/.test(clips[ix]||clips[0]||''); }); if(!use.length) use=lay.slice(0,1);
        var st = use.join(',').match(/rgba?\\([^)]+\\)|color\\(srgb[^)]+\\)/g); if (st) st.forEach(function(s){ out.push(over(P(s), base)); }); if(out.length) break; }
      var bc2 = P(getComputedStyle(chain[j]).backgroundColor); if (bc2.a > 0){ out.push(base); break; }
    }
    if (!out.length) out.push(base);
    return out;
  }
  function opac(el){ var o=1; for(var g=el; g&&g.nodeType===1; g=g.parentElement){ o*= +getComputedStyle(g).opacity; } return o; }
  window.__ink = function(el){
    var cs = getComputedStyle(el), ink = P(cs.color), op = opac(el);
    return +Math.min.apply(null, grounds(el).map(function(g){ var i = ink; if (op < 1 || ink.a < 1) i = over({ r:ink.r, g:ink.g, b:ink.b, a:ink.a*op }, g); return ratio(i, g); })).toFixed(2);
  };
  window.__vis = function(e){ if(!e) return false; var b=e.getBoundingClientRect(); var cs=getComputedStyle(e); return b.width>0&&b.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'; };
  /* the EFFECTIVE tap area (gate_1206's method): step out from the centre while elementFromPoint still
     resolves to the element, something inside it, or (for a checkbox) the label that holds it */
  window.__hit = function(el){
    el.scrollIntoView({ block:'center', inline:'nearest' });
    var b=el.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2;
    function owns(x,y){ var h=document.elementFromPoint(Math.round(x),Math.round(y)); if(!h) return false; if(h===el||el.contains(h)) return true; var lb=h.closest&&h.closest('label'); return !!(lb&&lb.contains(el)); }
    if(!owns(cx,cy)){ var h=document.elementFromPoint(cx,cy); return { w:0, h:0, box:[Math.round(b.width),Math.round(b.height)], covered:h?(h.id||h.tagName+'.'+String(h.className).slice(0,30)):'none' }; }
    function reach(dx,dy){ var d=0; while(d<40&&owns(cx+dx*(d+1),cy+dy*(d+1))) d++; return d; }
    return { w:reach(1,0)+reach(-1,0)+1, h:reach(0,1)+reach(0,-1)+1, box:[Math.round(b.width),Math.round(b.height)] };
  };
  window.__name = function(el){ if(!el) return ''; var a = el.getAttribute('aria-label'); if(a && a.trim()) return a.trim();
    var by = el.getAttribute('aria-labelledby'); if(by){ var t = by.split(/\\s+/).map(function(id){ var x=document.getElementById(id); return x?x.textContent.trim():''; }).join(' ').trim(); if(t) return t; }
    if(el.labels && el.labels.length) return [].map.call(el.labels, function(l){ return l.textContent.trim(); }).join(' ');
    return (el.title || '').trim(); };
  window.__inside = function(id){ var a=document.activeElement, m=document.getElementById(id); return !!(m && a && m.contains(a)); };
})();`;

async function boot(as, o = {}) {
  const pre = as === 'curtis' ? "window.__AS__={email:'curtis@cardinalrenovations.net',name:'Curtis'};" : '';
  const seed = [pre, o.theme ? THEME(o.theme) : '', o.seed || ''].join('\n');
  const r = await L.boot(as === 'curtis' ? 'x' : as, { instr: false, desktop: !!o.desktop, seed, dialog: d => d.dismiss() });
  await r.page.evaluate(HELP);
  return r;
}
const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { EVERR: String(e.message).split('\n')[0].slice(0, 200) }; } };
const home = page => ev(page, () => { try { showHome(); } catch (e) {} });
/* ⚠ `nowhere` counts presses that left focus on <body> — nothing focused. Tab out of an iframe goes to the
   browser's own UI for one press (its keystrokes never reach this document), which is not a control in
   the page behind; for a dialog holding an iframe the check is that no OUTSIDE CONTROL is ever focused. */
async function tabWalk(page, id, n, back) {
  let out = 0, first = null, nowhere = 0;
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const r = await page.evaluate(id => { const a = document.activeElement, m = document.getElementById(id); return { in: !!(m && a && m.contains(a)), body: !a || a === document.body, d: a ? (a.id ? '#' + a.id : a.tagName + '.' + String(a.className).split(' ')[0]) : 'none' }; }, id);
    if (!r.in) { if (r.body) nowhere++; else { out++; if (!first) first = r.d; } }
  }
  return { out, first, nowhere };
}

console.log('gate_1443 on ' + FILE);
try {
  /* ───────────── A  P07.05 the editor's Back chip ───────────── */
  console.log('\nA  P07.05 the document editor\'s Back chip');
  for (const desktop of [false, true]) {
    const tag = desktop ? '1280' : '390';
    const { browser, page } = await boot('theo', { desktop, theme: 'dark' });
    await ev(page, () => window.openEditor('ctI1')); await W(1800);
    const m = await ev(page, () => { const e = document.getElementById('edClientChip'); if (!e || !__vis(e)) return null; return { tag: e.tagName, tab: e.tabIndex, h: Math.round(e.getBoundingClientRect().height), hit: __hit(e), txt: e.textContent.trim().slice(0, 30) }; });
    if (!ok(!!m && !m.EVERR, `A ${tag}: the editor opened with its client chip on screen`, m)) { await browser.close(); continue; }
    ok(m.tag === 'BUTTON' && m.tab >= 0, `A ${tag}: the Back chip is a <button> the keyboard can reach`, { tag: m.tag, tabIndex: m.tab });
    ok(m.hit.h >= 44 && m.hit.w >= 44, `A ${tag}: its hit area is >= 44px`, m.hit);
    ok(m.h === (desktop ? 24 : 22) && /Back/.test(m.txt), `A ${tag}: the pill keeps its ${desktop ? 24 : 22}px look and its Back label`, { h: m.h, txt: m.txt });
    await ev(page, () => { const e = document.getElementById('edClientChip'); e.focus(); });
    await page.keyboard.press('Enter'); await W(1600);
    const back = await ev(page, () => ({ open: document.getElementById('editorView').classList.contains('open'), pid: (window.currentProject || {}).id || null, hash: location.hash }));
    ok(back.open === false && back.pid === 'I1', `A ${tag}: Enter on the chip goes back to the client`, back);
    await browser.close();
  }

  /* ───────────── B  P07.06 tap targets ───────────── */
  console.log('\nB  P07.06 tap targets');
  {
    const { browser, page } = await boot('theo', { desktop: false, theme: 'dark' });
    // the claim strip
    await ev(page, () => openProject('I1')); await W(2200);
    const cs = await ev(page, async () => {
      const calls = []; window.CardinalClaims = window.CardinalClaims || {}; const keep = window.CardinalClaims.openOne;
      window.CardinalClaims.openOne = id => calls.push(id);
      const strip = document.querySelector('.cr-claimstrip'); const go = strip && strip.querySelector('.go');
      if (!go) { window.CardinalClaims.openOne = keep; return null; }
      const hit = __hit(go);
      go.click(); const afterGo = calls.slice();
      const r = strip.getBoundingClientRect(); const h = document.elementFromPoint(r.left + 24, r.top + r.height / 2);
      if (h) h.click(); const afterBody = calls.slice(afterGo.length);
      window.CardinalClaims.openOne = keep;
      return { tag: go.tagName, hit, afterGo, afterBody, bodyEl: h ? h.className || h.tagName : null };
    });
    if (ok(!!cs && !cs.EVERR, 'B I1: the claim strip and Open full claim render', cs)) {
      ok(cs.tag === 'BUTTON' && cs.hit.h >= 44 && cs.hit.w >= 44, 'B Open full claim is a button with a >= 44px hit area', { tag: cs.tag, hit: cs.hit });
      ok(cs.afterGo.length === 1 && cs.afterGo[0] === 'clI1', 'B Open full claim opens the claim exactly once', cs.afterGo);
      ok(cs.afterBody.length === 1 && cs.afterBody[0] === 'clI1', 'B a tap on the claim card\'s body opens the claim', { calls: cs.afterBody, at: cs.bodyEl });
    }
    // Community partner buttons and the punch card's + Add
    await ev(page, () => openProject('C1')); await W(2000);
    const pp = await ev(page, () => [...document.querySelectorAll('#cr-cc .cc-pp .ppacts button')].filter(__vis).map(b => ({ t: b.textContent.trim(), hit: __hit(b) })));
    ok(Array.isArray(pp) && pp.length >= 4, 'B C1: the partner & property buttons render (Change, Properties, Clear, Change/Attach property)', Array.isArray(pp) ? pp.map(x => x.t) : pp);
    (Array.isArray(pp) ? pp : []).forEach(x => ok(x.hit.h >= 44 && x.hit.w >= 44, `B partner button "${x.t}" hit area >= 44px`, x.hit));
    const add = await ev(page, () => { const b = [...document.querySelectorAll('.cr-pp-hd .add')].find(__vis); return b ? { t: b.textContent.trim(), hit: __hit(b) } : null; });
    ok(!!add && add.hit && add.hit.h >= 44 && add.hit.w >= 44, 'B the punch card\'s + Add hit area >= 44px', add);
    // the stage ⋮
    await ev(page, () => openProject('R1')); await W(1600);
    const md = await ev(page, () => { const e = document.getElementById('msDots'); if (!e) return null; const f = document.getElementById('dbStgFwd'); return { tag: e.tagName, name: __name(e), hit: __hit(e), fwd: f ? __hit(f) : null, band: Math.round(e.closest('.dbstage').getBoundingClientRect().height) }; });
    if (ok(!!md && !md.EVERR, 'B R1: the stage band\'s ⋮ renders', md)) {
      ok(md.tag === 'BUTTON' && /stage/i.test(md.name), 'B the ⋮ is a <button> with a name', { tag: md.tag, name: md.name });
      ok(md.hit.h >= 44 && md.hit.w >= 44, 'B the ⋮ hit area is >= 44x44', md.hit);
      ok(md.fwd && md.fwd.w >= 44 && md.fwd.h >= 44, 'B the forward arrow beside it keeps its 44px', md.fwd);
      ok(md.band === 68, 'B the stage band stays 68px tall', md.band);
    }
    const drop = await ev(page, async () => { const e = document.getElementById('msDots'); e.click(); await new Promise(r => setTimeout(r, 200)); const d = document.getElementById('msDrop'); const r = { shown: getComputedStyle(d).display, top: Math.round(d.getBoundingClientRect().top - e.getBoundingClientRect().bottom) }; document.body.click(); return r; });
    ok(drop && drop.shown === 'block' && drop.top >= 0 && drop.top <= 2, 'B the ⋮ still opens its menu, hung from its bottom edge', drop);
    // punch search
    await ev(page, async () => { await window.openPunchView(); }); await W(1400);
    const ps = await ev(page, () => { const e = document.getElementById('puSearch'); return e && __vis(e) ? __hit(e) : null; });
    ok(!!ps && ps.h >= 44 && ps.w >= 44, 'B punch search #puSearch hit area >= 44px', ps);
    // the document title
    await home(page); await W(400);
    await ev(page, () => window.openEditor('ctI1')); await W(1800);
    const rt = await ev(page, () => { const e = document.getElementById('reportTitle'); return e && __vis(e) ? __hit(e) : null; });
    ok(!!rt && rt.h >= 44, 'B the document title #reportTitle is >= 44px tall', rt);
    await browser.close();
  }
  {
    const { browser, page } = await boot('theo', { desktop: false, theme: 'dark', seed: 'window.__NO_SESSION__=1;' });
    const si = await ev(page, () => ['rememberMe', 'forgotLink', 'loginBtn'].map(id => { const e = document.getElementById(id); return e && __vis(e) ? { id, hit: __hit(e) } : { id, hidden: true }; }));
    (Array.isArray(si) ? si : [{ id: 'signin', hidden: true }]).forEach(x => ok(!x.hidden && x.hit.h >= 44 && x.hit.w >= 44, `B sign-in #${x.id} hit area >= 44px`, x));
    await browser.close();
  }

  /* ───────────── C  P07.10 solid muted inks ───────────── */
  console.log('\nC  P07.10 dimmed numbers, in Dark, Light and Sun');
  for (const theme of ['dark', 'light', 'sun']) {
    const { browser, page } = await boot('theo', { desktop: false, theme });
    const th = await ev(page, () => ({ t: document.documentElement.getAttribute('data-theme'), sun: document.documentElement.getAttribute('data-cr-sun') }));
    ok(theme === 'dark' ? th.t !== 'rb-light' : theme === 'light' ? th.t === 'rb-light' && th.sun !== '1' : th.sun === '1', `C ${theme}: the theme is actually ${theme}`, th);
    await ev(page, () => window.CardinalProduction.open()); await W(1600);
    const pb = await ev(page, () => [...document.querySelectorAll('#cr-pb .pbday.out .dn')].filter(__vis).map(e => ({ t: e.firstChild ? e.firstChild.textContent.trim() : '', ink: __ink(e), op: +getComputedStyle(e.closest('.pbday')).opacity })));
    ok(Array.isArray(pb) && pb.length >= 1, `C ${theme}: Production shows out-of-month days`, Array.isArray(pb) ? pb.length : pb);
    if (Array.isArray(pb) && pb.length) ok(pb.every(x => x.ink >= 4.5 && x.op === 1), `C ${theme}: every out-of-month day number >= 4.5:1, at full opacity`, { min: Math.min(...pb.map(x => x.ink)), ops: [...new Set(pb.map(x => x.op))] });
    await ev(page, () => { const v = document.getElementById('cr-pb'); if (v) v.classList.remove('open'); try { showHome(); } catch (e) {} }); await W(400);
    await ev(page, () => openProject('C1')); await W(2000);
    const z = await ev(page, () => [...document.querySelectorAll('#cr-cc .cc-jmb .n.z')].filter(__vis).map(e => ({ ink: __ink(e), op: +getComputedStyle(e).opacity })));
    ok(Array.isArray(z) && z.length >= 1, `C ${theme}: Community shows zero counts`, Array.isArray(z) ? z.length : z);
    if (Array.isArray(z) && z.length) ok(z.every(x => x.ink >= 4.5 && x.op === 1), `C ${theme}: every Community zero count >= 4.5:1, at full opacity`, { min: Math.min(...z.map(x => x.ink)) });
    await ev(page, () => openClientsDirectory()); await W(1200);
    const cb = await ev(page, () => [...document.querySelectorAll('#cdCrmBar .cd-crmchip b')].filter(__vis).map(e => ({ t: e.parentElement.textContent.trim().replace(/\s+/g, ' '), ink: __ink(e), op: +getComputedStyle(e).opacity })));
    ok(Array.isArray(cb) && cb.length >= 3, `C ${theme}: the Clients bar shows its counts`, Array.isArray(cb) ? cb.length : cb);
    if (Array.isArray(cb) && cb.length) ok(cb.every(x => x.ink >= 4.5 && x.op === 1), `C ${theme}: every Clients bar count >= 4.5:1, at full opacity (All included)`, cb.map(x => x.t + ' ' + x.ink));
    await browser.close();
  }

  /* ───────────── D/E  P07.11 keyboard + P07.12 names (desktop) ───────────── */
  console.log('\nD  P07.11 keyboard, and E  P07.12 names');
  {
    const { browser, page } = await boot('theo', { desktop: true, theme: 'dark' });
    await home(page); await W(1000);
    const bar = await ev(page, () => [...document.querySelectorAll('#crBanner .cbn')].filter(__vis).map(e => { const s = e.classList.contains('cbdd') ? e.querySelector('.cbl') : e; return { t: e.textContent.trim().split('\n')[0].trim(), role: s ? s.getAttribute('role') : null, tab: s ? s.tabIndex : -1 }; }));
    ok(Array.isArray(bar) && bar.length >= 5, 'D the top bar shows its items', Array.isArray(bar) ? bar.map(x => x.t) : bar);
    ok(Array.isArray(bar) && bar.length && bar.every(x => x.role === 'button' && x.tab === 0), 'D every top-bar item is role=button and a tab stop', bar);
    /* a role=button is held to 44px; at desktop the bar sits flush between 44px controls, so the items
       grow rather than pad — and the neighbours they sit between must keep their own 44px */
    const dh = await ev(page, () => [...document.querySelectorAll('#crBanner [role="button"]')].filter(__vis).map(e => ({ t: e.textContent.trim().split('\n')[0].trim(), hit: __hit(e) })));
    (Array.isArray(dh) ? dh : []).forEach(x => ok(x.hit.h >= 44 && x.hit.w >= 44, `D 1280: top-bar "${x.t}" hit area >= 44px`, x.hit));
    await ev(page, () => openProject('R1')); await W(1400);
    const nb = await ev(page, () => ['#jobMenuSel', '#woQuick', '.lnav-mini'].map(s => { const e = [...document.querySelectorAll(s)].find(__vis); return { s, hit: e ? __hit(e) : null }; }));
    (Array.isArray(nb) ? nb : []).forEach(x => ok(!!x.hit && x.hit.h >= 44, `D 1280: the bar's neighbour ${x.s} keeps its 44px`, x.hit));
    await home(page); await W(800);
    // Tab from the start of the document reaches Contacts, and Enter opens the client directory
    await ev(page, () => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => { const a = document.activeElement; return !!(a && a.closest && a.closest('#crBanner') && a.getAttribute('data-go') === 'contacts'); }); }
    ok(reached, 'D Tab reaches Contacts on the top bar');
    if (reached) { await page.keyboard.press('Enter'); await W(1200); }
    ok(reached && await page.evaluate(() => __vis(document.getElementById('clientsView'))), 'D Enter on Contacts opens the client directory');
    // the Tools dropdown by keyboard
    await home(page); await W(600);
    await ev(page, () => { const l = document.querySelector('#crBanner .cbdd[data-dd="tools"] .cbl'); if (l) l.focus(); });
    await page.keyboard.press('Enter'); await W(300);
    const dd1 = await ev(page, () => { const d = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); const l = d && d.querySelector('.cbl'); return { open: !!(d && d.classList.contains('open')), exp: l ? l.getAttribute('aria-expanded') : null }; });
    ok(dd1.open && dd1.exp === 'true', 'D Enter on Tools opens its menu and says so (aria-expanded)', dd1);
    await page.keyboard.press('Tab'); await W(150);
    const dd2 = await ev(page, () => { const a = document.activeElement; return { cbi: !!(a && a.classList && a.classList.contains('cbi')), go: a && a.getAttribute ? a.getAttribute('data-go') : null }; });
    ok(dd2.cbi, 'D Tab moves into the open menu\'s items', dd2);
    await ev(page, () => document.body.click()); await W(200);
    const dd3 = await ev(page, () => { const d = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); return { open: d.classList.contains('open'), exp: d.querySelector('.cbl').getAttribute('aria-expanded') }; });
    ok(!dd3.open && dd3.exp === 'false', 'D closing the menu sets aria-expanded back to false', dd3);
    // the home list cards
    await home(page); await W(800);
    const kp = await ev(page, () => { const r = [...document.querySelectorAll('.kplrow')].find(__vis); if (!r) return null; r.focus(); return { role: r.getAttribute('role'), focused: document.activeElement === r, id: r.getAttribute('data-proj') }; });
    ok(!!kp && kp.role === 'button' && kp.focused, 'D a Recent leads row (.kplrow) takes focus as a button', kp);
    if (kp && kp.focused) { await page.keyboard.press('Enter'); await W(1400); }
    ok(!!kp && await page.evaluate(id => (window.currentProject || {}).id === id, kp && kp.id), 'D Enter on it opens that client', kp && kp.id);
    // the A/R card (theo is an admin)
    await home(page); await W(800);
    const ar = await ev(page, () => { const c = document.getElementById('arCard'); if (!c || !__vis(c)) return null; c.focus(); return { role: c.getAttribute('role'), focused: document.activeElement === c }; });
    ok(!!ar && ar.role === 'button' && ar.focused, 'D the A/R card takes focus for an admin', ar);
    if (ar && ar.focused) { await page.keyboard.press(' '); await W(1400); }
    ok(!!ar && await page.evaluate(() => { const x = document.getElementById('crarClose'); return !!(x && __vis(x)); }), 'D Space on it opens Invoices & A/R');
    await ev(page, () => { const x = document.getElementById('crarClose'); if (x) x.click(); }); await W(400);
    // the Clients cards
    await ev(page, () => openClientsDirectory()); await W(1200);
    const cd = await ev(page, () => { const c = [...document.querySelectorAll('.cd-card')].find(__vis); if (!c) return null; const b = c.querySelector('.bd'); b.focus(); return { role: b.getAttribute('role'), focused: document.activeElement === b, id: c.getAttribute('data-proj'), nested: b.querySelectorAll('a[href],button,input,select,[tabindex]').length }; });
    ok(!!cd && cd.role === 'button' && cd.focused && cd.nested === 0, 'D a Clients card takes focus (its body, which holds no other control)', cd);
    if (cd && cd.focused) { await page.keyboard.press('Enter'); await W(1400); }
    ok(!!cd && await page.evaluate(id => (window.currentProject || {}).id === id, cd && cd.id), 'D Enter on it opens that client', cd && cd.id);
    // E: the named controls that live in static markup
    const nm = await ev(page, () => ['ljSearch', 'ljSortSel', 'cdSortSel', 'jobMenuSel', 'qiAddrInp'].map(id => { const e = document.getElementById(id); return { id, name: e ? __name(e) : 'MISSING' }; }));
    (Array.isArray(nm) ? nm : []).forEach(x => ok(x.name && x.name !== 'MISSING', `E #${x.id} has an accessible name`, x.name));
    await home(page); await W(800);
    const cal = await ev(page, () => [...document.querySelectorAll('.calnav')].map(b => ({ txt: b.textContent.trim(), name: __name(b), vis: __vis(b) })));
    ok(Array.isArray(cal) && cal.filter(x => x.vis).length >= 2, 'E the home calendar arrows render', cal);
    ok(Array.isArray(cal) && cal.length >= 2 && cal.every(x => x.name === (x.txt === '‹' ? 'Previous month' : 'Next month')), 'E every calendar arrow says Previous month / Next month', cal);
    // the Estimates list's sort select (axe's select-name at 1280)
    await ev(page, () => window.CardinalEstimates.open()); await W(1500);
    const cre = await ev(page, () => { const e = [...document.querySelectorAll('[data-cre-sortsel]')].find(__vis); return e ? __name(e) : 'MISSING'; });
    ok(!!cre && cre !== 'MISSING', 'E the Estimates list\'s sort select has an accessible name', cre);
    await ev(page, () => { try { window.CardinalEstimates.close(); } catch (e) {} }); await home(page); await W(600);
    // New Lead
    await ev(page, () => window.openLeadForm()); await W(900);
    const lf = await ev(page, () => { const m = document.getElementById('leadFormModal'); return { role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), name: __name(m),
      unnamed: [...m.querySelectorAll('#ldPhones input, #ldPhones select, #ldEmails input, #ldEmails select')].filter(i => !__name(i)).length,
      rows: m.querySelectorAll('#ldPhones input, #ldPhones select, #ldEmails input, #ldEmails select').length }; });
    ok(lf.role === 'dialog' && lf.modal === 'true' && !!lf.name, 'D New Lead is role=dialog aria-modal=true with a name', lf);
    ok(lf.rows >= 4 && lf.unnamed === 0, 'E New Lead\'s phone and email inputs and their type selects all have names', lf);
    const t1 = await tabWalk(page, 'leadFormModal', 45, false);
    ok(t1.out === 0 && t1.nowhere === 0, 'D 45 Tabs never leave New Lead', t1);
    const t1b = await tabWalk(page, 'leadFormModal', 15, true);
    ok(t1b.out === 0 && t1b.nowhere === 0, 'D 15 Shift+Tabs never leave New Lead', t1b);
    await page.keyboard.press('Escape'); await W(500);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('leadFormModal')).display === 'none'), 'D Escape still closes New Lead (1430)');
    // Add project
    await ev(page, () => { try { openProjModal(); } catch (e) {} }); await W(900);
    const pm = await ev(page, () => { const m = document.getElementById('projModal'); return { shown: getComputedStyle(m).display, role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), name: __name(m) }; });
    ok(pm.shown !== 'none' && pm.role === 'dialog' && pm.modal === 'true' && !!pm.name, 'D Add project is role=dialog aria-modal=true with a name', pm);
    const t2 = await tabWalk(page, 'projModal', 45, false);
    ok(t2.out === 0 && t2.nowhere === 0, 'D 45 Tabs never leave Add project', t2);
    await page.keyboard.press('Escape'); await W(500);
    await ev(page, () => { const m = document.getElementById('projModal'); if (getComputedStyle(m).display !== 'none') { const c = document.getElementById('pfCancel'); if (c) c.click(); } }); await W(300);
    // the estimate builder
    await ev(page, () => { const p = (window.projects || window.cacheProjects || []).find(x => x.id === 'R1'); window.CardinalEstimates.openEditor(p); }); await W(2000);
    const eb = await ev(page, () => { const v = document.getElementById('cr-est-view'); const t = v && v.querySelector('[data-f="title"]'); return { open: !!(v && v.classList.contains('open')), modal: v ? v.getAttribute('aria-modal') : null, title: t ? __name(t) : 'MISSING' }; });
    ok(eb.open, 'D the estimate builder opened', eb);
    ok(eb.title === 'Estimate title', 'E the estimate builder\'s title input has a name', eb.title);
    const t3 = await tabWalk(page, 'cr-est-view', 40, false);
    ok(eb.open && t3.out === 0 && t3.nowhere === 0, 'D 40 Tabs never leave the estimate builder', t3);
    const t3b = await tabWalk(page, 'cr-est-view', 10, true);
    ok(eb.open && t3b.out === 0 && t3b.nowhere === 0, 'D 10 Shift+Tabs never leave the estimate builder', t3b);
    // its Preview opens over it; Tab must stay in the preview, not fall back into the builder behind
    const pvBtn = await ev(page, () => { const b = document.getElementById('cr-epub-preview-btn'); if (!b || !__vis(b)) return false; b.click(); return true; });
    await W(1500);
    const pv = await ev(page, () => { const p = document.getElementById('cr-epub-preview'); return { shown: !!(p && __vis(p)), modal: p ? p.getAttribute('aria-modal') : null }; });
    ok(pvBtn === true && pv.shown && pv.modal === 'true', 'D the builder\'s Preview opens over it as an aria-modal dialog', { pvBtn, pv });
    const t4 = await tabWalk(page, 'cr-epub-preview', 12, false);
    ok(pv.shown && t4.out === 0, 'D 12 Tabs never focus a control outside the Preview (the builder behind it)', t4);
    await ev(page, () => { const c = document.querySelector('#cr-epub-preview [data-act="pv-close"]'); if (c) c.click(); }); await W(500);
    await browser.close();
  }
  {
    /* at 390 the top bar is on screen too, and its items are now role=buttons the 44px floor measures */
    const { browser, page } = await boot('theo', { desktop: false, theme: 'dark' });
    await home(page); await W(800);
    const hb = await ev(page, () => [...document.querySelectorAll('#crBanner [role="button"]')].filter(__vis).map(e => ({ t: e.textContent.trim().split('\n')[0].trim(), hit: __hit(e) })));
    ok(Array.isArray(hb) && hb.length >= 5, 'D 390: the top bar\'s role=buttons render', Array.isArray(hb) ? hb.length : hb);
    (Array.isArray(hb) ? hb : []).forEach(x => ok(x.hit.h >= 44 && x.hit.w >= 44, `D 390: top-bar "${x.t}" hit area >= 44px`, x.hit));
    await browser.close();
  }

  /* ───────────── F  P10.03 sheets ───────────── */
  console.log('\nF  P10.03 the Ask sheet and Self Check');
  for (const desktop of [false, true]) {
    const tag = desktop ? '1280' : '390';
    const { browser, page } = await boot('theo', { desktop, theme: 'dark' });
    await ev(page, () => openProject('R1')); await W(1500);
    const sheetOpen = () => page.evaluate(() => { const s = document.getElementById('cr-ai-sheet'); return !!(s && s.classList.contains('open')); });
    const fab = await ev(page, () => { const f = document.getElementById('cr-ai-fab'); return !!(f && __vis(f)); });
    /* a real tap on the button; on a tree where the sheet did not close it covers the button, so the
       tap is bounded and the reopen falls back to the module's own open() (BUG_CLASSES 37: report, never crash) */
    const tapFab = async () => { const okc = await page.click('#cr-ai-fab', { timeout: 4000 }).then(() => true, () => false); if (!okc) await ev(page, () => window.CardinalAssistant && window.CardinalAssistant.open()); await W(700); };
    if (ok(fab === true, `F ${tag}: the Ask button is on screen for theo`, fab)) {
      await tapFab();
      const o1 = await sheetOpen();
      await page.keyboard.press('Escape'); await W(500);
      const o2 = await sheetOpen();
      ok(o1 && !o2, `F ${tag}: Escape closes the Ask sheet`, { opened: o1, afterEsc: o2 });
      if (o2) await ev(page, () => window.CardinalAssistant.close());
      await tapFab();
      const h0 = await page.evaluate(() => location.hash);
      await page.evaluate(() => history.back()); await W(1200);
      const o3 = await sheetOpen(), h1 = await page.evaluate(() => location.hash);
      ok(!o3 && h1 === h0, `F ${tag}: Back closes the Ask sheet and the page underneath stays put`, { open: o3, before: h0, after: h1 });
    }
    if (desktop) {
      await home(page); await W(400);
      await ev(page, () => { window.CardinalSelfCheck.open(); });
      /* the run opens screens with the panel hidden, and Escape is deliberately ignored until it finishes */
      await page.waitForFunction(() => { const p = document.getElementById('cr-sc-panel'); return !!(p && p.classList.contains('open') && p.style.visibility !== 'hidden' && __vis(p)); }, null, { timeout: 45000, polling: 250 }).catch(() => {});
      await W(300);
      const sc0 = await ev(page, () => { const p = document.getElementById('cr-sc-panel'); return !!(p && p.classList.contains('open') && __vis(p)); });
      await page.keyboard.press('Escape'); await W(500);
      const sc1 = await ev(page, () => { const p = document.getElementById('cr-sc-panel'); return { open: !!(p && p.classList.contains('open')), lock: document.body.style.overflow || '' }; });
      ok(sc0 === true && sc1.open === false && sc1.lock !== 'hidden', 'F Escape closes Self Check and releases the page', { opened: sc0, after: sc1 });
    }
    await browser.close();
  }
} catch (e) { ok(false, 'gate threw: ' + String(e && e.message || e).split('\n')[0].slice(0, 220)); }
const errs = L.log.filter(l => /PAGEERROR/.test(l));
ok(errs.length === 0, 'no page errors during the run', errs.slice(0, 3));
const total = passes + fails.length;
if (total < 70) { fails.push(`only ${total} checks ran (floor 70)`); console.log(`  ✗ FAIL only ${total} checks ran (floor 70)`); }
console.log(`\n${fails.length ? 'GATE 1443 RED' : 'GATE 1443 GREEN'} — ${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
