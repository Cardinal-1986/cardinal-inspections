/* gate_1482 — the tap sizes and the Production box label stop depending on the font (Theo: "C, both").
 *
 * gate_1443 and gate_1438 went red on CI and green on a Windows desk: the same controls, a narrower or wider
 * font. A gate that only measures in the font it happens to get proves nothing about the next phone. So this
 * one SQUEEZES the text (line-height 0.9 on the measured controls) and requires the 44px floor to hold anyway:
 * a floor made of padding + the font's line height falls under it; a floor made of min-height or a fixed pad
 * does not. The label's room is gate_1438's job on CI's (wider) fonts; here it is the two values, computed.
 *   A  desktop 1280: every top-bar role=button hit area >= 44, text squeezed
 *   B  Community C1: the partner buttons and the punch card's + Add hit area >= 44, text squeezed
 *   C  the leads sheet: Create estimate is >= 44px tall, text squeezed
 *   D  phone 390: the top bar's items are NOT made 44 tall (the phone bar is unchanged; its pads do the work)
 *   E  the Production boxes: side padding 10px, label tracking .03em ("Scheduled" fits at 1366)
 * Signed in through gate_1403_lib (gate_1401_seed.js: C1 community).
 * Arg: [index.html] -> negative control (1481 must go RED on A, B, C and E). */
import { APP } from './gate_env.mjs';
process.env.APPFILE = process.argv[2] || APP;
const L = await import('./gate_1403_lib.mjs');

let pass = 0, fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 260) : '')); c ? pass++ : fail++; };
const W = ms => new Promise(r => setTimeout(r, ms));
const SQUEEZE = `#crBanner .cbn, #crBanner .cbl, #cr-cc .cc-pp .ppacts button, .cr-pp-hd .add, #leadList .btn { line-height:0.9 !important; }`;
/* gate_1206 / gate_1443's method: step out from the centre while elementFromPoint still lands on the element */
const HIT = `window.__hit = function(el){
  el.scrollIntoView({ block:'center', inline:'nearest' });
  var b=el.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2;
  function owns(x,y){ var h=document.elementFromPoint(Math.round(x),Math.round(y)); return !!h && (h===el || el.contains(h)); }
  if(!owns(cx,cy)) return { w:0, h:0, box:[Math.round(b.width),Math.round(b.height)], covered:true };
  function reach(dx,dy){ var d=0; while(d<40&&owns(cx+dx*(d+1),cy+dy*(d+1))) d++; return d; }
  return { w:reach(1,0)+reach(-1,0)+1, h:reach(0,1)+reach(0,-1)+1, box:[Math.round(b.width),Math.round(b.height)] };
};
window.__vis = function(e){ if(!e) return false; var b=e.getBoundingClientRect(); var cs=getComputedStyle(e); return b.width>0&&b.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'; };`;

async function boot(as, desktop) {
  const r = await L.boot(as, { instr: false, desktop, seed: "try{localStorage.setItem('cardinal.theme.rb','0');}catch(e){}", dialog: d => d.dismiss() });
  await r.page.evaluate(HIT);
  return r;
}

/* ── A, C, E: desktop ── */
{
  const { browser, page } = await boot('theo', true);
  try {
    await page.evaluate(() => { try { showHome(); } catch (e) {} }); await W(1000);
    await page.addStyleTag({ content: SQUEEZE }); await W(300);
    const dh = await page.evaluate(() => [...document.querySelectorAll('#crBanner [role="button"]')].filter(__vis).map(e => ({ t: e.textContent.trim().split('\n')[0].trim(), hit: __hit(e) })));
    ok(dh.length >= 5 && dh.every(x => x.hit.h >= 44 && x.hit.w >= 44), 'A 1280: every top-bar item keeps a >= 44px hit area with the text squeezed',
       dh.filter(x => x.hit.h < 44 || x.hit.w < 44).map(x => x.t + ' ' + x.hit.w + 'x' + x.hit.h).join(' | ') || dh.length + ' items');
    const ce = await page.evaluate(() => { openLeadModal([{ kind: 'gutters', reasons: 'Gutters pulling away' }, { kind: 'siding', reasons: 'Hail marks' }]);
      return [...document.querySelectorAll('#leadList .btn')].map(b => Math.round(b.getBoundingClientRect().height * 10) / 10); });
    ok(ce.length >= 1 && ce.every(h => h >= 44), 'C the leads sheet: Create estimate is >= 44px tall with the text squeezed', ce);
    await page.evaluate(() => { const m = document.getElementById('leadModal'); if (m) m.style.display = 'none'; });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.evaluate(() => { ['landingView','loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); window.CardinalProduction.open(); });
    await page.waitForFunction(() => !!document.querySelector('#cr-pb.open .pbtile .l'), null, { timeout: 15000 }).catch(() => {});
    await W(800);
    const e = await page.evaluate(() => { const t = document.querySelector('#cr-pb .pbtile'), l = t && t.querySelector('.l'); if (!t) return null;
      const cs = getComputedStyle(t), ls = getComputedStyle(l);
      return { padL: cs.paddingLeft, padR: cs.paddingRight, track: ls.letterSpacing, size: ls.fontSize,
               cut: [...document.querySelectorAll('#cr-pb .pbtile .l')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim()) }; });
    ok(!!e && e.padL === '10px' && e.padR === '10px' && Math.abs(parseFloat(e.track) - 0.03 * parseFloat(e.size)) < 0.05 && e.cut.length === 0,
       'E 1366: the boxes have 10px sides, the label tracks .03em, and no label is cut here', e);
  } finally { await browser.close(); }
}

/* ── B: Community C1, phone ── */
{
  const { browser, page } = await boot('theo', false);
  try {
    await page.evaluate(() => { try { openProject('C1'); } catch (e) {} }); await W(2200);
    await page.addStyleTag({ content: SQUEEZE }); await W(300);
    const pp = await page.evaluate(() => [...document.querySelectorAll('#cr-cc .cc-pp .ppacts button')].filter(__vis).map(b => ({ t: b.textContent.trim(), hit: __hit(b) })));
    ok(pp.length >= 3 && pp.every(x => x.hit.h >= 44 && x.hit.w >= 44), 'B C1: every partner button keeps a >= 44px hit area with the text squeezed',
       pp.map(x => x.t + ' ' + x.hit.w + 'x' + x.hit.h).join(' | ') || 'none rendered');
    const add = await page.evaluate(() => { const b = [...document.querySelectorAll('.cr-pp-hd .add')].find(__vis); return b ? { t: b.textContent.trim(), hit: __hit(b) } : null; });
    ok(!!add && add.hit.h >= 44 && add.hit.w >= 44, "B the punch card's + Add keeps a >= 44px hit area with the text squeezed", add);
    /* D: the phone bar's items are not 44 tall: the min-height is desktop only */
    await page.evaluate(() => { try { showHome(); } catch (e) {} }); await W(800);
    const ph = await page.evaluate(() => [...document.querySelectorAll('#crBanner .cbn')].filter(__vis).map(e => Math.round(e.getBoundingClientRect().height)));
    ok(ph.length >= 1 && ph.every(h => h < 44), 'D 390: the phone top bar keeps its height (its items are under 44; their pads do the work)', ph);
  } finally { await browser.close(); }
}

console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
