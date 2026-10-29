/* gate_C — judge 13 (chat boxes + team comms), Builder C. A real Chromium drive against the e2e mock.
 *   A  a second device's post appears in the OPEN thread within one poll window (25 s), no reload;
 *      a reader scrolled up keeps their place; the poll is one narrow select per window
 *   B  backgrounded: no poll at all; back in front: catches up at once and follows the bottom;
 *      closed: the pending tick stops without a query
 *   C  mentions: "@J"/"@Jo" reach nobody (were 4 / 2); exact, email-prefix and unique 3+ prefixes
 *      still reach their person; an address is not a tag; "Will notify: …" is under the box BEFORE Send;
 *      sending "@J …" calls /api/notify not at all; a real tag's alert links #p/<id>/comms
 *   D  a 100-character link wraps inside its bubble, is an <a href> to exactly that URL, opens a new tab;
 *      escape-then-promote holds (an injected tag stays text, javascript: is never a link)
 *   E  #p/<id>/comms opens the thread — cold (a fresh load) and warm (an alert tapped with the app open)
 *   F  claim_notes (the carrier-chase record) show read-only, labelled, in an insurance job's thread;
 *      a retail job never queries them
 *   G  one Communication tile (no Notifications twin), carrying a "tag for you" badge from the ONE rule
 *   H  Community card at 390: a >=16 px gutter on the thread tab; Delete Client only on the Overview
 *   I  Activity Feed: a comment row opens the thread; a punch-out message is in the feed and opens its card
 *   J  Team Feedback says "Tell the office"; the punch PAGE's tag alert title has no emoji
 *   K  ink: the thread's time stamp, the Will-notify line and the chase label clear 4.5:1, dark AND light
 *      (the thread's status line, .chatempty, is Builder A's J16 ink and is not asserted here)
 *   L  no new document.body observer, the global scroll lock untouched
 * Arg: [artifact] (default: index.html). Negative control: b1415.html must go RED, not crash. */
const DEF = '/home/user/cardinal-inspections/index.html';
process.env.APPFILE = process.argv[2] || DEF;
const { boot, log } = await import('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 330000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 260) : '')); c ? pass++ : fail++; };
const step = async (name, f) => { try { await f(); } catch (e) { ok(false, name + ' crashed', e.message.split('\n')[0].slice(0, 200)); } };
console.log('gate_C on ' + process.env.APPFILE);

const SEED = `(function(){
  var S = window.__SEED__, now = Date.now();
  function iso(ms){ return new Date(now + ms).toISOString(); }
  /* R1: a thread long enough to scroll, one message tagging Theo */
  var r1 = S.projects.find(function(p){ return p.id === 'R1'; });
  var ck = JSON.parse(r1.checklist); ck.comments = [];
  for (var i = 0; i < 14; i++) ck.comments.push({ by:'joan@cardinalrenovations.net', name:'Joan', at: iso(-86400e3 + i * 60e3), text:'SEED-' + i + ' homeowner prefers mornings, gate code is on file, dog in the yard' });
  ck.comments.push({ by:'curtis@cardinalrenovations.net', name:'Curtis', at: iso(-3600e3), text:'@theo can you look at the north gutter before Friday' });
  r1.checklist = JSON.stringify(ck);
  S.claim_notes = [{ id:'cn1', claim_id:'clI1', body:'Chased Sample Mutual \\u2014 called, adjuster out till Monday', internal:true, mentions:[], created_at: iso(-7200e3), created_by:'joan@cardinalrenovations.net' }];
  S.punch_items = [{ id:'PK1', project_id:'R1', title:'Gutter reseal', kind:'repair', status:'open', assigned_to:'curtis@cardinalrenovations.net',
    created_at: iso(-86400e3), created_by:'theo@cardinalrenovations.net', photos:[], steps:[],
    comments:[{ by:'curtis@cardinalrenovations.net', name:'Curtis', at: iso(-1800e3), text:'PUNCH-MSG found rotted decking, 3 sheets' }] }];
  /* L: count body observers */
  window.__BODYOBS__ = 0;
  var _ob = MutationObserver.prototype.observe;
  MutationObserver.prototype.observe = function(t, o){ if (t === document.body) window.__BODYOBS__++; return _ob.call(this, t, o); };
})();`;

const { browser, page } = await boot('theo', { instr: false, seed: SEED });
page.setDefaultTimeout(6000);
const tryClick = async (sel, why) => { try { await page.click(sel, { timeout: 4000 }); return true; } catch (e) { ok(false, why + ' — could not click ' + sel); return false; } };
/* every select, with the function that issued it (the poll is commsRefresh) */
await page.evaluate(() => {
  window.__SEL__ = [];
  const c = window.supa; const from = c.from.bind(c);
  c.from = function (t) { const q = from(t); const sel = q.select; q.select = function (cols, o) { window.__SEL__.push({ t, cols: String(cols || ''), poll: /commsRefresh|commsLoadClaimNotes/.test(new Error().stack || ''), at: Date.now() }); return sel.call(this, cols, o); }; return q; };
});
await page.evaluate(() => {
  window.__NOTIFY__ = [];
  const f = window.fetch.bind(window);
  window.fetch = function (u, o) { try { if (/\/api\/notify/.test(String(u))) window.__NOTIFY__.push(JSON.parse((o && o.body) || '{}')); } catch (e) {} return f(u, o); };
});
const notes = (re) => page.evaluate(src => window.__NOTIFY__.filter(n => new RegExp(src).test(JSON.stringify(n))), re);
const polls = () => page.evaluate(() => window.__SEL__.filter(x => x.poll).length);
const selsOf = (table) => page.evaluate(t => window.__SEL__.filter(x => x.t === t).length, table);
const detach = () => page.evaluate(() => { const c = JSON.parse(JSON.stringify(window.currentProject)); window.currentProject = c; currentProject = c; const i = cacheProjects.findIndex(p => p.id === c.id); cacheProjects[i] = c; });
const other = (pid, text) => page.evaluate(async ({ pid, text }) => {
  const r = await window.supa.from('projects').select('checklist').eq('id', pid).single();
  const ck = JSON.parse(JSON.stringify(JSON.parse(r.data.checklist || '{}')));
  ck.comments = (ck.comments || []).concat([{ by: 'curtis@cardinalrenovations.net', name: 'Curtis', at: new Date().toISOString(), text }]);
  await window.supa.from('projects').update({ checklist: JSON.stringify(ck) }).eq('id', pid);
}, { pid, text });
const threadText = () => page.evaluate(() => (document.getElementById('chatThread') || {}).innerText || '');
const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return Date.now() - t0; await page.waitForTimeout(500); } return -1; };
const setHidden = (h) => page.evaluate(h => { Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
const ov0 = await page.evaluate(() => document.body.style.overflow);

/* ---------------- G · the job menu ---------------- */
await step('G', async () => {
  await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1500);
  const g = await page.evaluate(() => {
    const vis = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent);
    const c = vis('#acxMount .jabox[data-jm="comms"]');
    return { comms: c.length, notifs: vis('#acxMount .jabox[data-jm="notifs"]').length, badge: c[0] && (c[0].querySelector('.jatag') || {}).textContent || '',
             w: c[0] ? Math.round(c[0].getBoundingClientRect().width) : 0 };
  });
  ok(g.comms === 1 && g.notifs === 0, 'G  one Communication tile, no Notifications twin', JSON.stringify(g));
  ok(/^1 tag for you$/.test(g.badge), 'G  the tile carries the "tag for you" badge (Curtis tagged @theo)', JSON.stringify(g));
});

/* ---------------- A · a second device's post arrives on its own ---------------- */
await step('A', async () => {
  await detach();
  const obs0 = await page.evaluate(() => window.__BODYOBS__);
  await page.evaluate(() => openCommunications()); await page.waitForTimeout(1500);
  await page.evaluate(() => { const t = document.getElementById('chatThread'); t.scrollTop = 0; });
  const s0 = await page.evaluate(() => window.__SEL__.length);
  await other('R1', 'OTHER-DEVICE-1 shingles arrive Tuesday');
  const t = await waitFor(async () => /OTHER-DEVICE-1/.test(await threadText()), 30000);
  ok(t >= 0, 'A  the other device\'s post appears in the open thread within the poll window, no reload', t >= 0 ? (t / 1000).toFixed(1) + ' s' : 'not after 30 s');
  const a = await page.evaluate(n => { const th = document.getElementById('chatThread'); return { top: th.scrollTop, sh: th.scrollHeight, ch: th.clientHeight, sel: window.__SEL__.slice(n).filter(x => x.poll).map(x => x.t + ':' + x.cols) }; }, s0);
  ok(a.sh > a.ch + 100 && a.top < 5, 'A  a reader scrolled up to the top keeps their place when it lands', JSON.stringify({ top: a.top, sh: a.sh, ch: a.ch }));
  ok(a.sel.length >= 1 && a.sel.length <= 2 && a.sel.every(x => x === 'projects:checklist'), 'A  the poll is one narrow select (projects.checklist) per window', JSON.stringify(a.sel));
  ok(await page.evaluate(n => window.__BODYOBS__ === n, obs0), 'L  opening the thread adds no document.body observer');
});

/* ---------------- B · backgrounded, back in front, closed ---------------- */
await step('B', async () => {
  await setHidden(true);
  await page.evaluate(() => { const t = document.getElementById('chatThread'); t.scrollTop = t.scrollHeight; });
  const p0 = await polls();
  await other('R1', 'OTHER-DEVICE-2 adjuster moved to Thursday');
  await page.waitForTimeout(27000);
  const p1 = await polls();
  ok(p1 === p0 && !/OTHER-DEVICE-2/.test(await threadText()), 'B  backgrounded (app hidden): no poll for 27 s', 'polls ' + (p1 - p0));
  await setHidden(false);
  const t = await waitFor(async () => /OTHER-DEVICE-2/.test(await threadText()), 4000);
  ok(t >= 0, 'B  back in front: it catches up at once', t >= 0 ? t + ' ms' : 'not within 4 s');
  const atEnd = await page.evaluate(() => { const th = document.getElementById('chatThread'); return th.scrollHeight - th.scrollTop - th.clientHeight < 4; });
  ok(atEnd, 'B  a reader at the bottom follows the new message');
});

/* ---------------- C · mentions ---------------- */
await step('C', async () => {
  const m = await page.evaluate(() => { const M = window.CardinalMentions; const me = 'theo@cardinalrenovations.net'; const t = s => M.emails(M.names(s), me);
    return { j: t('@J call me'), jo: t('meet @Jo at 3'), joey: t('@joey'), joseph: t('@Joseph'), curt: t('@Curt'), scott: t('@scott'), dot: t('thanks @curtis.'), addr: t('send it to bob@curtis'), self: t('@theo') }; });
  ok(m.j.length === 0 && m.jo.length === 0, 'C  "@J" and "@Jo" reach nobody (were Joan+Joey+Jacob+Jerry, and Joan+Joey)', JSON.stringify({ j: m.j, jo: m.jo }));
  ok(m.joey.join() === 'joey@cardinalrenovations.net' && m.joseph.join() === 'joey@cardinalrenovations.net' && m.curt.join() === 'curtis@cardinalrenovations.net' && m.scott.join() === 'scottie@cardinalrenovations.net',
     'C  exact email prefix, exact first name and a unique 3+ prefix each reach exactly their person', JSON.stringify(m));
  ok(m.dot.join() === 'curtis@cardinalrenovations.net' && m.addr.length === 0 && m.self.length === 0, 'C  a full stop is not part of the name; an address is not a tag; you never notify yourself', JSON.stringify({ dot: m.dot, addr: m.addr, self: m.self }));
  await page.fill('#chatText', '@J call me about the gutters');
  const w1 = await page.evaluate(() => { const e = document.getElementById('chatWill'); return e ? { t: e.textContent, vis: !!e.offsetParent } : null; });
  ok(!!w1 && w1.vis && /fits 4 people/.test(w1.t) && /Joan/.test(w1.t) && /Jerry/.test(w1.t), 'C  before Send, the box says "@j fits 4 people — type more: …"', JSON.stringify(w1));
  await page.fill('#chatText', '@curt check the north slope flashing');
  const w2 = await page.evaluate(() => (document.getElementById('chatWill') || {}).textContent || '');
  ok(/^Will notify: /.test(w2) && /Curtis/.test(w2), 'C  before Send, "Will notify: Curtis"', w2);
  const nb0 = await page.evaluate(() => window.__NOTIFY__.length);
  await page.fill('#chatText', '@J C-NOBODY call me');
  if (await tryClick('#chatSend', 'C')) {
    await page.waitForTimeout(1200);
    const n = await page.evaluate(k => window.__NOTIFY__.slice(k), nb0);
    ok(n.length === 0 && /C-NOBODY/.test(await threadText()), 'C  sending "@J ..." saves the note and notifies nobody', JSON.stringify(n.map(x => x.emails)));
  }
  await page.fill('#chatText', '@curtis C-TAGGED is the ladder still in the garage?');
  if (await tryClick('#chatSend', 'C')) {
    await page.waitForTimeout(1500);
    const n = await notes('C-TAGGED');
    ok(n.length === 1 && JSON.stringify(n[0].emails) === '["curtis@cardinalrenovations.net"]', 'C  a real tag notifies exactly that person', JSON.stringify(n.map(x => x.emails)));
    ok(n.length === 1 && n[0].url === '#p/R1/comms' && /thread/.test(n[0].body || ''), 'C  the tag alert links #p/<id>/comms (was #p/<id>, the profile) and says it opens the thread', JSON.stringify(n.map(x => [x.url, String(x.body).slice(-60)])));
    ok(await page.evaluate(() => (document.getElementById('chatWill') || {}).textContent === ''), 'C  the Will-notify line clears after Send');
  }
});

/* ---------------- D · a link ---------------- */
await step('D', async () => {
  const URL = 'https://companycam.example.com/projects/1234567890/photos/abcdefghijklmnopqrstuvwxyz0123456789?a=1&b=2';
  await page.fill('#chatText', 'Photo link ' + URL + '. D-LINK');
  await tryClick('#chatSend', 'D'); await page.waitForTimeout(1000);
  await page.fill('#chatText', 'D-XSS https://x.example.com/"><img src=x onerror=window.__XSS=1> and javascript:window.__XSS=2 and https://x.example.com/@curtis/p');
  await tryClick('#chatSend', 'D'); await page.waitForTimeout(1000);
  const d = await page.evaluate((U) => {
    const msgs = [...document.querySelectorAll('#chatThread .chatmsg')];
    const lm = msgs.find(m => /D-LINK/.test(m.textContent)), xm = msgs.find(m => /D-XSS/.test(m.textContent));
    const b = lm && lm.querySelector('.bub'), a = lm && lm.querySelector('a');
    const xa = xm ? [...xm.querySelectorAll('a')].map(x => x.getAttribute('href')) : null;
    return { has: !!lm, sw: b && b.scrollWidth, cw: b && b.clientWidth, href: a && a.getAttribute('href'), exact: a && a.href === U, tgt: a && a.target, rel: a && a.rel,
             img: xm ? xm.querySelectorAll('img').length : -1, xss: window.__XSS || null, xa, mentionInLink: xm ? !!xm.querySelector('a .mention') : null,
             docW: document.documentElement.scrollWidth };
  }, URL);
  ok(d.has && d.sw <= d.cw + 1 && d.docW <= 391, 'D  a 100-character link wraps inside its bubble (no overflow, no page scroll)', JSON.stringify({ sw: d.sw, cw: d.cw, docW: d.docW }));
  ok(d.exact && d.tgt === '_blank' && /noopener/.test(d.rel || ''), 'D  the link is tappable: <a href> to exactly that URL, trailing full stop left out, new tab, noopener', JSON.stringify({ href: d.href, tgt: d.tgt, rel: d.rel }));
  const lj = await page.evaluate(() => {
    if (typeof fmtChatText !== 'function') return null;
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:260px;';
    box.innerHTML = '<div class="ljcmsg">' + fmtChatText('see https://companycam.example.com/projects/1234567890/photos/abcdefghijklmnopqrstuvwxyz0123456789') + '</div>';
    document.body.appendChild(box);
    const m = box.firstChild, a = m.querySelector('a');
    const r = { a: !!a, sw: m.scrollWidth, cw: m.clientWidth, same: !!a && getComputedStyle(a).color === getComputedStyle(m).color };
    box.remove(); return r;
  });
  ok(!!lj && lj.a && lj.same && lj.sw <= lj.cw + 1, 'D  the Leads panel\'s copy of the thread draws the same link: the note\'s ink, wrapped', JSON.stringify(lj));
  ok(d.img === 0 && !d.xss && Array.isArray(d.xa) && d.xa.every(h => /^https:\/\//.test(h) && !/[<>"]/.test(h)) && d.mentionInLink === false,
     'D  escape-then-promote: no tag injected, javascript: never linked, an @ inside a link stays in the link', JSON.stringify({ img: d.img, xss: d.xss, xa: d.xa, m: d.mentionInLink }));
});

/* ---------------- K · ink, both themes, retail + community ---------------- */
await step('K', async () => {
  for (const pid of ['R1', 'C1']) {
    await page.evaluate(id => { openProject(id); }, pid); await page.waitForTimeout(1200);
    await page.evaluate(() => openCommunications()); await page.waitForTimeout(700);
    if (!(await page.evaluate(() => document.querySelectorAll('#chatThread .chatmsg').length))) { await page.fill('#chatText', 'K-INK a note so the thread has a time stamp'); await tryClick('#chatSend', 'K'); await page.waitForTimeout(900); }
    await page.fill('#chatText', '@J k'); await page.waitForTimeout(150);
    for (const theme of ['dark', 'light']) {
      const r = await page.evaluate(th => {
        if (th === 'light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme');
        const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
        const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
        const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        const ground = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .9)) return c; } return [0, 0, 0]; };
        const out = {};
        for (const [k, s] of Object.entries({ when: '#chatThread .when', status: '#chatThread .chatempty', will: '#chatWill', tag: '#chatThread .chattag' })) {
          const e = document.querySelector(s); if (!e || !e.offsetParent) { out[k] = null; continue; }
          out[k] = Math.round(ratio(rgb(getComputedStyle(e).color), ground(e)) * 100) / 100;
        }
        return out;
      }, theme);
      ok(r.when >= 4.5, 'K  ' + pid + ' ' + theme + ': the time stamp clears 4.5:1 (was 3.25)', JSON.stringify(r));
      ok(r.will >= 4.5, 'K  ' + pid + ' ' + theme + ': the Will-notify line clears 4.5:1 (its warning red too)', JSON.stringify(r));
    }
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.fill('#chatText', '');
  }
});

/* ---------------- F · claim notes on an insurance job ---------------- */
await step('F', async () => {
  const n0 = await selsOf('claim_notes');
  await page.evaluate(() => openProject('I1')); await page.waitForTimeout(1200);
  await page.evaluate(() => openCommunications()); await page.waitForTimeout(1800);
  const f = await page.evaluate(() => { const m = document.querySelector('#chatThread .chatmsg[data-src="claim_notes"]');
    return m ? { txt: m.innerText.replace(/\s+/g, ' '), btns: m.querySelectorAll('button,input,textarea,[contenteditable]').length, dashed: getComputedStyle(m.querySelector('.bub')).borderTopStyle } : null; });
  ok(!!f && /Carrier chase/i.test(f.txt) && /Chased Sample Mutual/.test(f.txt), 'F  the carrier chase shows in the insurance job\'s thread, labelled', JSON.stringify(f));
  ok(!!f && f.btns === 0 && f.dashed === 'dashed', 'F  read-only: nothing to edit or reply on it, drawn dashed', JSON.stringify(f));
  for (const theme of ['dark', 'light']) {
    const r = await page.evaluate(th => {
      if (th === 'light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme');
      const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
      const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const ground = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .9)) return c; } return [0, 0, 0]; };
      const e = document.querySelector('#chatThread .chattag');
      return e ? Math.round(ratio(rgb(getComputedStyle(e).color), ground(e)) * 100) / 100 : null;
    }, theme);
    ok(r >= 4.5, 'K  I1 ' + theme + ': the "Carrier chase" label clears 4.5:1', String(r));
  }
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  const ck = await page.evaluate(() => JSON.stringify(JSON.parse(currentProject.checklist || '{}').comments || []));
  ok(!/Chased Sample Mutual/.test(ck), 'F  it is never written into the job\'s own message list');
  const nI = await selsOf('claim_notes');
  await page.evaluate(() => openProject('R1')); await page.waitForTimeout(900);
  await page.evaluate(() => openCommunications()); await page.waitForTimeout(1200);
  const nR = await selsOf('claim_notes');
  ok(nI > n0 && nR === nI, 'F  an insurance job reads claim_notes; a retail job never queries them', JSON.stringify({ before: n0, insurance: nI, retail: nR }));
});

/* ---------------- B (closed) · the pending tick stops without a query ---------------- */
await step('B2', async () => {
  await page.evaluate(() => { const b = document.getElementById('commsBackBtn'); if (b) b.click(); }); await page.waitForTimeout(800);
  const closed = await page.evaluate(() => getComputedStyle(document.getElementById('commsView')).display === 'none');
  const p0 = await polls();
  await page.waitForTimeout(27000);
  ok(closed && (await polls()) === p0, 'B  closed: no poll in the next 27 s', 'polls ' + ((await polls()) - p0));
  ok(await page.evaluate(o => document.body.style.overflow === o, ov0), 'L  the global scroll lock is untouched');
});

/* ---------------- H · the Community card ---------------- */
await step('H', async () => {
  await page.evaluate(() => openProject('C1')); await page.waitForTimeout(2500);
  const ov = await page.evaluate(() => { const d = document.getElementById('dangerZone'); return d ? getComputedStyle(d).display : 'missing'; });
  await page.evaluate(() => { const t = [...document.querySelectorAll('#cr-cc [data-jm="comms"]')].filter(e => e.offsetParent)[0]; if (t) t.click(); }); await page.waitForTimeout(1200);
  const h = await page.evaluate(() => {
    const q = s => { const e = [...document.querySelectorAll(s)].filter(x => x.offsetParent)[0]; if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
    const dz = document.getElementById('dangerZone');
    return { back: q('[data-cc2="back"]'), sect: q('#cr-cc .cc-sect'), msgs: q('[data-cc2="msgs"]'), dz: dz ? getComputedStyle(dz).display : 'missing', vw: innerWidth };
  });
  ok(!!h.back && !!h.msgs && h.back[0] >= 16 && h.sect[0] >= 16 && h.msgs[0] >= 16 && h.msgs[1] <= h.vw - 16, 'H  390 px: back chip, heading and "Messages & notes" sit inside a 16 px gutter (were x=0)', JSON.stringify(h));
  ok(h.dz === 'none', 'H  Delete Client is not under the thread', h.dz);
  await page.evaluate(() => { const b = document.querySelector('[data-cc2="back"]'); if (b) b.click(); }); await page.waitForTimeout(900);
  const back = await page.evaluate(() => { const d = document.getElementById('dangerZone'); return d ? getComputedStyle(d).display : 'missing'; });
  ok(ov === 'block' && back === 'block', 'H  it is still on the card\'s Overview for an admin', JSON.stringify({ first: ov, afterBack: back }));
});

/* ---------------- I · Activity Feed ---------------- */
await step('I', async () => {
  await page.evaluate(() => openActivityFeed()); await page.waitForTimeout(1500);
  const i = await page.evaluate(() => { const rows = [...document.querySelectorAll('#actFeedFull .afrow')];
    const pk = rows.find(r => /PUNCH-MSG/.test(r.textContent)); const cm = rows.find(r => /OTHER-DEVICE-2|C-TAGGED/.test(r.textContent));
    return { n: rows.length, pk: !!pk, pkTxt: pk ? pk.innerText.replace(/\s+/g, ' ').slice(0, 120) : '' , cm: !!cm }; });
  ok(i.pk, 'I  a punch-out message is in the feed', JSON.stringify(i));
  ok(i.cm, 'I  job comments are in the feed', JSON.stringify(i));
  await page.evaluate(() => { const r = [...document.querySelectorAll('#actFeedFull .afrow')].find(r => /C-TAGGED/.test(r.textContent)); const d = r && (r.querySelector('.afdetail') || r); if (d) d.click(); });
  await page.waitForTimeout(1200);
  const o = await page.evaluate(() => ({ comms: getComputedStyle(document.getElementById('commsView')).display, cli: (document.getElementById('commsCli') || {}).textContent || '' }));
  ok(o.comms === 'block' && /Sample Retail One/.test(o.cli), 'I  tapping a comment row opens that job\'s thread (was the profile)', JSON.stringify(o));
  await page.evaluate(() => openActivityFeed()); await page.waitForTimeout(800);
  await page.evaluate(() => { const r = [...document.querySelectorAll('#actFeedFull .afrow')].find(r => /PUNCH-MSG/.test(r.textContent)); if (r) (r.querySelector('.afdetail') || r).click(); });
  await page.waitForTimeout(1500);
  const pc = await page.evaluate(() => !!(window.CardinalPunchCard && window.CardinalPunchCard.isOpen && window.CardinalPunchCard.isOpen()));
  ok(pc, 'I  tapping a punch-out message opens its card');
  await page.evaluate(() => { try { window.CardinalPunchCard.close(); } catch (e) {} }); await page.waitForTimeout(500);
});

/* ---------------- J · feedback text + the punch PAGE alert title ---------------- */
await step('J', async () => {
  await page.evaluate(() => window.CardinalFeedback && window.CardinalFeedback.open()); await page.waitForTimeout(800);
  const lead = await page.evaluate(() => (document.querySelector('#cr-fb .fb-lead') || {}).textContent || '');
  ok(/^Tell the office /.test(lead), 'J  Team Feedback: "Tell the office…" (it told Theo to tell Theo)', lead.slice(0, 60));
  await page.evaluate(() => window.CardinalFeedback && window.CardinalFeedback.close());
  /* the punch PAGE's own composer is drawn only when the card module is absent — take it away for one send */
  await page.evaluate(() => { window.__PC__ = window.CardinalPunchCard; window.CardinalPunchCard = undefined; openProject('R1'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => showTab('punch')); await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('#ppPage [data-open="PK1"]'); if (b) b.click(); }); await page.waitForTimeout(800);
  const has = await page.evaluate(() => !!document.querySelector('#ppPage [data-f="msg"]'));
  if (has) {
    await page.fill('#ppPage [data-f="msg"]', '@curtis J-PAGE can you reseal it Friday');
    await page.evaluate(() => document.querySelector('#ppPage [data-act="send"]').click()); await page.waitForTimeout(1500);
  }
  const n = await notes('J-PAGE');
  ok(has && n.length === 1 && /^[A-Za-z]/.test(n[0].title || '') && / tagged you /.test(n[0].title || ''), 'J  the punch page\'s tag alert title starts with the name, no emoji', has ? JSON.stringify(n.map(x => x.title)) : 'no composer');
  await page.evaluate(() => { window.CardinalPunchCard = window.__PC__; });
});

/* ---------------- E · the deep link ---------------- */
await step('E', async () => {
  await page.evaluate(() => showHome()); await page.waitForTimeout(800);
  await page.evaluate(() => { history.replaceState(null, '', '#h'); location.hash = '#p/C1/comms'; }); await page.waitForTimeout(2500);
  const w = await page.evaluate(() => ({ comms: getComputedStyle(document.getElementById('commsView')).display, cli: (document.getElementById('commsCli') || {}).textContent || '' }));
  ok(w.comms === 'block' && /Sample Occupant One/.test(w.cli), 'E  warm: an alert tapped with the app open lands on the thread', JSON.stringify(w));
  const errs = log.filter(l => /PAGEERROR/.test(l));
  ok(!errs.length, 'no page errors', errs.join(' | ').slice(0, 300));
  /* RIG: the first load registered sw.js, and a service worker's fetches bypass context.route - so a second
     full load would fetch the real supabase-js through it, fail, and land signed out. Unregister it first. */
  await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); });
  await page.goto('https://app.cardinalroster.com/?as=theo&cold=1#p/R1/comms', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const c = await page.evaluate(() => ({ comms: getComputedStyle(document.getElementById('commsView')).display, cli: (document.getElementById('commsCli') || {}).textContent || '', hash: location.hash,
    signedIn: !!(window.currentUser && currentUser.email),
    blankProfile: getComputedStyle(document.getElementById('projectView')).display !== 'none' && ![...document.querySelectorAll('#projectView [id^="tab-"]')].some(t => t.style.display === 'block') }));
  ok(c.signedIn, 'E  (rig) the cold load is signed in', JSON.stringify(c));
  ok(c.comms === 'block' && /Sample Retail One/.test(c.cli) && !c.blankProfile, 'E  cold: #p/R1/comms opens that job\'s thread (was a blank profile)', JSON.stringify(c));
});

await browser.close();
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
