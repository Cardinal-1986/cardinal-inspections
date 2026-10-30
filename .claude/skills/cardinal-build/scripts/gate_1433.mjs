/* gate_1433 — the appointment sheet reads, and Ask stops covering form buttons.
 *   A  the appointment row's small line and its delete x read >= 4.5:1 on the sheet, dark and light; the x is >= 44px
 *   B  at 390 (installed app) the point at the centre of the sheet's Add button is the Add button, not Ask
 *   C  Ask is tucked while New Lead or Add project is open, and back when they close
 * Arg: [index.html] -> negative control (1432 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + String(d).slice(0, 260) : '')); c ? pass++ : fail++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const RATIO = `window.__r1433 = function(el){
  function rgb(s){ var m = /rgba?\\(([^)]+)\\)/.exec(s); if(!m) return null; var p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 }; }
  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }).reduce(function(s,v,i){ return s + v*[0.2126,0.7152,0.0722][i]; }, 0); }
  var fg = rgb(getComputedStyle(el).color), n = el, bg = null;
  while(n && n.nodeType === 1){ var c = rgb(getComputedStyle(n).backgroundColor); if(c && c.a > 0.5){ bg = c; break; } n = n.parentElement; }
  bg = bg || { r:255, g:255, b:255 };
  var a = lum(fg), b = lum(bg); return Math.round(((Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05)) * 100) / 100;
};`;
const SEED = `(function(){ var S = window.__SEED__; S.appointments = S.appointments || [];
  var d = new Date(); var ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  S.appointments.push({ id:'A1433', title:'Gate 1433 inspection', appt_date: ds, appt_time:'10:00', kind:'inspection', notes:'Bring the ladder', created_by:'theo@cardinalrenovations.net', project_id: null }); })();`;
async function run(theme) {
  /* light is set the real way, before the app boots (a reload lands on sign-in in this rig: sw.js) */
  const LIGHT = theme === 'light' ? "try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}" : "try{ localStorage.removeItem('cardinal.theme.rb'); }catch(e){}";
  const { browser, page } = await boot('theo', { instr: false, seed: LIGHT + SEED });
  try {
    await page.addScriptTag({ content: RATIO });
    await page.evaluate(() => { document.body.classList.add('standalone'); });
    for (let i = 0; i < 6; i++) {   /* after a reload the appointments load async: retry until the row is drawn */
      await page.evaluate(() => { const d = new Date(); const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); openApptDay(ds); });
      await sleep(1200);
      if (await page.evaluate(() => !!document.querySelector('#apptModal .apptrow'))) break;
    }
    const a = await page.evaluate(() => { const row = document.querySelector('#apptModal .apptrow'); if (!row) return null;
      const sm = row.querySelector('.bd small'), del = row.querySelector('.del'); const r = del ? del.getBoundingClientRect() : null;
      return { small: sm ? window.__r1433(sm) : null, del: del ? window.__r1433(del) : null, delW: r ? Math.round(r.width) : 0, delH: r ? Math.round(r.height) : 0,
        theme: document.documentElement.getAttribute('data-theme') || 'dark' }; });
    ok(a && a.small >= 4.5 && a.del >= 4.5, `A  ${theme}: the row's small line and its ✕ read >= 4.5:1`, JSON.stringify(a));
    ok(a && a.delW >= 44 && a.delH >= 44, `A  ${theme}: the ✕ is at least 44px`, JSON.stringify(a && { w: a.delW, h: a.delH }));
    if (theme === 'dark') {
      await sleep(600);
      const b = await page.evaluate(() => { const s = document.getElementById('apptSave'); if (!s) return 'no Add';
        s.scrollIntoView({ block: 'end' }); const r = s.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { hit: e === s || (e && s.contains(e)), at: e ? (e.id || e.className) : null, fab: (function(){ const f = document.getElementById('cr-ai-fab'); return f ? getComputedStyle(f).display : 'none'; })() }; });
      ok(b && b.hit && b.fab === 'none', 'B  390: Ask is tucked while the appointment sheet is open, and Add is what sits under its centre', JSON.stringify(b));
      await page.evaluate(() => { const m = document.getElementById('apptModal'); if (m) m.style.display = 'none'; });
      await page.evaluate(() => openLeadForm()); await sleep(900);
      const c1 = await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); return f ? getComputedStyle(f).display : 'none'; });
      await page.evaluate(() => { const m = document.getElementById('leadFormModal'); if (m) m.style.display = 'none'; document.body.click(); }); await sleep(800);
      await page.evaluate(() => { try { openProjModal(); } catch (e) {} }); await sleep(900);
      const c2 = await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); return f ? getComputedStyle(f).display : 'none'; });
      await page.evaluate(() => { const m = document.getElementById('projModal'); if (m) m.style.display = 'none'; document.body.click(); }); await sleep(800);
      const c3 = await page.evaluate(() => { const f = document.getElementById('cr-ai-fab'); return f ? getComputedStyle(f).display : 'none'; });
      ok(c1 === 'none' && c2 === 'none', 'C  Ask is tucked while New Lead or Add project is open', JSON.stringify({ lead: c1, proj: c2 }));
      ok(c3 !== 'none', 'C  ...and comes back when they close', c3);
    }
    const errs = log.filter(l => /PAGEERROR/.test(l));
    ok(errs.length === 0, `${theme}: no page errors`, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
}
try { await run('dark'); await run('light'); }
catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 200)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
