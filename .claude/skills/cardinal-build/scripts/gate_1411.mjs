/* gate_1411 — Team Feedback.
 *   A  phone, a sales rep: Menu -> Account has Team Feedback and it opens the box
 *   B  the rep sends an Idea: one team_feedback insert under their own address, status new,
 *      the open job attached; admins (not the sender) get a push linking #feedback; it lists as theirs
 *   C  the rep has no Inbox; nobody else's report is drawn for them
 *   D  desktop, Theo: Tools -> Team Feedback opens; Inbox lists the seeded report; Done writes the
 *      status and pushes the sender back
 *   E  the #feedback link (an alert tapped while the app is open) opens the inbox
 *   F  ink: every text colour in the box clears 4.5:1 against the sheet, dark AND light
 *   G  it never touches the global scroll lock
 * Arg: [index.html] -> negative control (1409 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEED = `window.__SEED__.team_feedback = [
  { id:'fb-1', created_at:new Date(Date.now()-3600e3).toISOString(), created_by:'curtis@cardinalrenovations.net', kind:'broken',
    body:'The punch photo would not upload', screen:'Punch & Repairs', project_id:null, build:'build 1409', status:'new', reply:null } ];`;
const open = p => p.evaluate(() => { const e = document.getElementById('cr-fb'); return !!e && e.classList.contains('open'); });
const tryClick = async (p, sel, why) => { try { await p.click(sel, { timeout: 4000 }); return true; } catch (e) { ok(false, why + ' — could not click ' + sel); return false; } };

/* ---- A, B, C, G: the rep on a phone ---- */
{
  const { browser, page } = await boot('rep', { instr: false, seed: SEED });
  try {
    const ov0 = await page.evaluate(() => document.body.style.overflow);
    const pid = await page.evaluate(() => (window.cacheProjects || [])[0] && window.cacheProjects[0].id);
    if (pid) { await page.evaluate(id => openProject(id), pid); await page.waitForTimeout(1200); }
    /* the real door: Menu, then the folded Account section (a phone drawer opens with every section shut) */
    await page.evaluate(() => document.getElementById('navBtn').click()); await page.waitForTimeout(500);
    await page.evaluate(() => { const h = document.querySelector('#navMenu [data-crsec="account"]'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); });
    await page.waitForTimeout(400);
    const row = await page.$('#navMenu .navopt[data-nav="feedback"]');
    ok(!!row && await row.isVisible(), 'A  Menu -> Account has a Team Feedback row');
    if (row) await row.click();
    await page.waitForTimeout(600);
    ok(await open(page), 'A  tapping it opens the box');
    ok(!(await page.$('#cr-fb .fb-tab')), 'C  a rep has no Inbox tab');
    ok(await page.evaluate(() => !/punch photo/.test(document.getElementById('cr-fb').textContent)), 'C  nobody else\'s report is drawn for a rep');
    if (await tryClick(page, '#cr-fb .fb-kind[data-v="idea"]', 'B')) {
      await page.fill('#fbBody', 'A button to text the crew the address');
      await tryClick(page, '#cr-fb [data-fb="send"]', 'B');
      await page.waitForTimeout(1200);
      const w = await page.evaluate(() => (window.__WRITES__ || []).filter(x => x.table === 'team_feedback'));
      const r = w[0] && w[0].payload || {};
      ok(w.length === 1 && w[0].op === 'insert', 'B  exactly one team_feedback insert', String(w.length));
      ok(r.kind === 'idea' && r.created_by === 'rep@cardinalrenovations.net' && r.status === 'new' && r.body === 'A button to text the crew the address',
         'B  the row is the rep\'s own, kind idea, status new', JSON.stringify(r).slice(0, 220));
      ok(!!pid && r.project_id === pid, 'B  the open job rides along', String(r.project_id));
      const api = log.filter(l => /\/api\/notify/.test(l) && /Team feedback/.test(l));
      ok(api.length === 1 && /theo@/.test(api[0]) && /joan@/.test(api[0]) && !/rep@/.test(api[0].split('"emails"')[1].split(']')[0]) && /#feedback/.test(api[0]),
         'B  admins get one push linking #feedback, the sender is not on it', (api[0] || 'none').slice(0, 200));
      ok(await page.evaluate(() => /A button to text the crew/.test(document.querySelector('#cr-fb .fb-main').textContent)), 'B  it lists under Your reports');
    }
    await tryClick(page, '#cr-fb [data-fb="close"]', 'G');
    ok(!(await open(page)), 'G  Close closes it');
    ok(await page.evaluate(o => document.body.style.overflow === o, ov0), 'G  the global scroll lock is untouched');
  } catch (e) { ok(false, 'rep run crashed', e.message.split('\n')[0].slice(0, 160)); }
  finally { await browser.close(); }
}

/* ---- D, E, F: Theo on a desktop ---- */
{
  log.length = 0;
  const { browser, page } = await boot('theo', { instr: false, desktop: true, seed: SEED });
  try {
    await page.hover('#crBanner .cbdd[data-dd="tools"]').catch(() => {});
    await page.evaluate(() => { const d = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); if (d) d.classList.add('open'); });
    const item = await page.$('#crBanner .cbi[data-go="feedback"]');
    ok(!!item && await item.isVisible(), 'D  Tools lists Team Feedback');
    if (item) await item.click();
    await page.waitForTimeout(800);
    ok(await open(page), 'D  it opens the box');
    if (await tryClick(page, '#cr-fb .fb-tab[data-v="inbox"]', 'D')) {
      await page.waitForTimeout(300);
      ok(await page.evaluate(() => /punch photo would not upload/.test(document.querySelector('#cr-fb .fb-main').textContent)), 'D  the inbox lists Curtis\'s report');
      await tryClick(page, '#cr-fb .fb-item[data-id="fb-1"] [data-fb="status"][data-v="done"]', 'D');
      await page.waitForTimeout(900);
      const w = await page.evaluate(() => (window.__WRITES__ || []).filter(x => x.table === 'team_feedback' && x.op === 'update'));
      ok(w.length === 1 && w[0].payload.status === 'done', 'D  Done writes status done', JSON.stringify(w.map(x => x.payload)).slice(0, 160));
      const back = log.filter(l => /\/api\/notify/.test(l) && /Your feedback/.test(l));
      ok(back.length === 1 && /curtis@/.test(back[0]) && /#feedback/.test(back[0]), 'D  the sender is pushed back', (back[0] || 'none').slice(0, 160));
    }
    /* F: ink, both themes — on the All filter so the Done card (pill, body, status buttons, reply box) is drawn */
    await page.click('#cr-fb .fb-filt [data-v="all"]').catch(() => {}); await page.waitForTimeout(300);
    for (const theme of ['dark', 'light']) {
      const worst = await page.evaluate(th => {
        if (th === 'light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme');
        const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
        const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
        const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const ground = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .9)) return c; } return [0, 0, 0]; };
        let min = 99, at = '', n = 0;
        document.querySelectorAll('#cr-fb .fb-sheet *').forEach(e => {
          if (!e.offsetParent || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          n++; const r = ratio(rgb(getComputedStyle(e).color), ground(e));
          if (r < min) { min = r; at = (e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 24) + '"'; }
        });
        return { min: Math.round(min * 100) / 100, at, n };
      }, theme);
      ok(worst.n >= 10 && worst.min >= 4.5, 'F  ' + theme + ': every label in the box clears 4.5:1', JSON.stringify(worst));
    }
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.evaluate(() => window.CardinalFeedback && window.CardinalFeedback.close());
    await page.evaluate(() => { history.replaceState(null, '', '#h'); location.hash = '#feedback'; });
    await page.waitForTimeout(1200);
    ok(await open(page) && await page.evaluate(() => { const t = document.querySelector('#cr-fb .fb-tab[data-v="inbox"]'); return !!t && t.getAttribute('aria-pressed') === 'true'; }),
       'E  the #feedback link opens the inbox');
    const errs = log.filter(l => /PAGEERROR/.test(l) && /fb|feedback/i.test(l));
    ok(!errs.length, 'no page errors from the module', errs.join(' | ').slice(0, 200));
  } catch (e) { ok(false, 'theo run crashed', e.message.split('\n')[0].slice(0, 160)); }
  finally { await browser.close(); }
}
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
