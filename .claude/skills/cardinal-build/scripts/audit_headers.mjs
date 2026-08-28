/* Header audit — which header renders on WHICH screen, and is it readable.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node audit_headers.mjs [index.html]
 *
 * A. PINNED or DRIFTING?  crmHead() is asked once per sticky portal, for every
 *    screen. An answer that CHANGES with the portal is a screen wearing
 *    "whichever CRM you were last in" — Theo's "randomly change" report.
 * B. READABLE?  Every ON-SCREEN text element in the header is scored against
 *    the ground its ancestors actually paint, for every head the app can reach.
 *
 * FOUR traps, every one of which made an earlier version of THIS script report
 * a confident wrong answer:
 *
 *  1. page.setContent() gives an opaque origin where localStorage THROWS. The
 *     sticky portal lives there, so CardinalPortal.set() silently failed,
 *     stickyCrm() fell through to 'retail' for all three portals, and the audit
 *     reported "0 drifting screens" having never once varied the portal. The
 *     file is served over http:// for exactly this reason. The run ASSERTS the
 *     portal actually changed before trusting a single row.
 *  2. #navMenu is a CLOSED DRAWER at translateX(-320px) — display:block and
 *     visibility:visible, so a naive filter scored 195 elements nobody can see
 *     and every "finding" was drawer content. Boxes must intersect the viewport.
 *  3. Forcing body[data-crm-head] paints a palette but does NOT rewrite the
 *     title: build() writes TITLES_HTML[kh]/TITLES[kh]. Forcing the attribute
 *     left the RETAIL SLOGAN on a green ground and produced a 1.01:1 "failure"
 *     that the app can never render. Every state here is reached the way the
 *     app reaches it, then the header module is allowed to rebuild.
 *  4. Insurance has TWO sub-themes (body[data-rltheme] = docket | siren) and the
 *     dark --ct-crmhead-* palette is declared ONLY under siren. Both are run.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const STICKY = ['retail', 'insurance', 'community'];

const SCREENS = [
  ['Landing (portal picker)', 'landingView'], ['Settings', 'settingsView'],
  ['My Profile', 'profileView'], ['Audit Log', 'auditView'],
  ['Team Directory', 'teamView'], ['Punch & Repairs', 'punchView'],
  ['Cardinal Truth', 'cardinalTruthView'], ['Insurance Clients', 'insClientsView'],
  ['Leads & Jobs', 'leadsView'], ['Photos', 'photosView'], ['Reports', 'reportsView'],
  ['Gallery', 'galleryView'], ['Company Documents', 'companyDocsView'],
  ['Resource Library', 'resourceLibraryView'], ['Quick Inspection', 'quickInspView'],
  ['Quick Insp start', 'qiStartView'], ['Address check', 'addrCheckView'],
  ['iTel lab', 'cr-itellab'],
  /* arrived with builds 1107-1112, after the first run of this audit — a screen
     list frozen at one build silently stops covering the app. */
  ['Invoices & AR', 'cr-ar-view'], ['Labor Rate Schedule', 'cr-lrs-view'],
  ['Pre-Install Guide editor', 'cr-guide-editor'],
];

const relLum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  ASSERT FAIL — ' + m); fails++; } };

(async () => {
  const dir = path.dirname(path.resolve(FILE)), base = path.basename(FILE);
  const srv = http.createServer((rq, rs) => {
    const f = path.join(dir, decodeURIComponent(rq.url.split('?')[0]).replace(/^\/+/, '') || base);
    fs.readFile(f, (e, d) => e ? (rs.statusCode = 404, rs.end('nf'))
      : (rs.setHeader('content-type', f.endsWith('.html') ? 'text/html' : 'application/octet-stream'), rs.end(d)));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/' + base;

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  /* THE CONTROL. Without this the whole of section A is decoration. */
  ok(await p.evaluate(() => { try { localStorage.setItem('__probe', '1'); return localStorage.getItem('__probe') === '1'; } catch (e) { return false; } }),
     'localStorage is writable (an opaque origin silently pins the portal to retail)');

  const setSticky = async k => {
    const got = await p.evaluate(v => {
      try { window.CardinalPortal.set(v); } catch (_) {}
      try { return window.CardinalPortal.get(); } catch (e) { return 'threw'; }
    }, k);
    return got;
  };
  for (const k of STICKY) ok(await setSticky(k) === k, 'CardinalPortal.set("' + k + '") actually takes');
  if (fails) { console.log('\nRIG IS NOT SOUND — refusing to report numbers it cannot measure.'); await b.close(); srv.close(); process.exit(1); }

  const call = fn => p.evaluate(async f => { try { if (typeof window[f] !== 'function') return 'no-fn'; await window[f](); return 'ok'; } catch (e) { return 'threw'; } }, fn);
  const head = () => p.evaluate(() => { try { return window.CardinalHeader.crmHead(); } catch (e) { return 'threw:' + e.message; } });
  /* show a view the way the app does, then let the header module rebuild */
  const showOnly = async id => {
    const r = await p.evaluate(i => {
      try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (_) {}
      document.body.classList.remove('projopen');
      const el = document.getElementById(i); if (!el) return 'missing';
      el.style.display = 'block'; return 'shown';
    }, id);
    if (r !== 'missing') await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    return r;
  };
  const clearAll = async () => { await p.evaluate(() => { try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (_) {} document.body.classList.remove('projopen'); });
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };

  /* ── A ─────────────────────────────────────────────────────────────── */
  console.log('== A. WHICH HEADER RENDERS, PER SCREEN ==');
  console.log('   crmHead() asked once per sticky portal (retail / insurance / community)\n');
  const rows = [];
  for (const [label, id] of SCREENS) {
    const answers = []; let missing = false;
    for (const s of STICKY) {
      await setSticky(s);
      if (await showOnly(id) === 'missing') { missing = true; break; }
      answers.push(await head());
    }
    if (missing) { rows.push({ label, id, missing: true }); continue; }
    rows.push({ label, id, answers, uniq: [...new Set(answers)], pinned: new Set(answers).size === 1 });
  }
  await setSticky('community'); await clearAll();
  await p.evaluate(() => document.body.classList.add('projopen'));
  const projHead = await head();
  await p.evaluate(() => document.body.classList.remove('projopen'));
  const bare = {}; for (const s of STICKY) { await setSticky(s); await clearAll(); bare[s] = await head(); }

  const pinned = rows.filter(r => !r.missing && r.pinned), drift = rows.filter(r => !r.missing && !r.pinned);
  const byHead = {}; pinned.forEach(r => (byHead[r.uniq[0]] = byHead[r.uniq[0]] || []).push(r.label));
  console.log('  PINNED — same header whatever portal you came from:');
  for (const h of Object.keys(byHead)) console.log('    ' + h.toUpperCase().padEnd(11) + byHead[h].join(', '));
  console.log('\n  FOLLOWS THE LAST PORTAL — header changes with where you have been:');
  if (!drift.length) console.log('    (none)');
  for (const r of drift) console.log('    ' + r.label.padEnd(26) + STICKY.map((s, i) => s[0] + '→' + r.answers[i]).join('  '));
  console.log('\n  Open client profile (projopen): ' + projHead);
  console.log('  No view open at all:            ' + STICKY.map(s => s[0] + '→' + bare[s]).join('  ') +
              (new Set(Object.values(bare)).size > 1 ? '   <- FOLLOWS THE PORTAL' : ''));
  const gone = rows.filter(r => r.missing);
  if (gone.length) console.log('\n  not in the markup: ' + gone.map(r => r.id).join(', '));

  /* ── B. reached the way the app reaches it ─────────────────────────── */
  console.log('\n\n== B. HEADER GROUND + ON-SCREEN CONTRAST (states reached the real way) ==\n');
  /* Each state RELOADS first. Reusing one page bled state between rows: the
     header module is woken by a childList MutationObserver, so a view shown by
     raw style.display (no DOM churn) does not re-skin, and the previous row's
     palette was still on the body. Through the app's own doors
     (openSettingsView, openMyProfile, openTeamView, openAuditLog) the header
     updates every time — verified separately — so that staleness is this rig's,
     not the app's. Reloading removes it from the measurement either way. */
  const STATES = [
    ['retail',            async () => { await setSticky('retail'); await showOnly('leadsView'); }],
    ['production',        async () => { await setSticky('retail'); await call('openSettingsView'); }],
    ['insurance/docket',  async () => { await p.evaluate(() => document.body.setAttribute('data-rltheme', 'docket')); await setSticky('insurance'); await showOnly('cardinalTruthView'); }],
    ['insurance/siren',   async () => { await p.evaluate(() => document.body.setAttribute('data-rltheme', 'siren')); await setSticky('insurance'); await showOnly('cardinalTruthView'); }],
    ['community',         async () => { await setSticky('community'); await clearAll(); }],
    ['client profile',    async () => { await setSticky('retail'); await clearAll(); await p.evaluate(() => document.body.classList.add('projopen')); }],
  ];
  const findings = [];
  for (const theme of ['dark', 'rb-light']) {
    for (const [name, go] of STATES) {
      await p.goto(url, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(850);
      await p.evaluate(t => { if (t === 'rb-light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme'); }, theme);
      await go();
      /* skin() is rAF-debounced behind a MutationObserver, so body[data-crm-head]
         trails crmHead() by ONE frame and self-corrects. Measured: stale at 0ms,
         correct at 50ms and stable thereafter. Reading too early made an earlier
         run report the retail palette under a production head — my artifact, not
         the app's. 250ms is well clear of it. */
      await p.waitForTimeout(250);
      const res = await p.evaluate(() => {
        const hdr = document.querySelector('header.site'); if (!hdr) return { missing: true };
        const stops = s => { const o = []; const re = /rgba?\(([^)]+)\)/g; let m;
          while ((m = re.exec(s))) { const n = m[1].split(',').map(parseFloat);
            if (n.length >= 3 && !(n.length > 3 && n[3] < 0.5)) o.push([n[0], n[1], n[2]]); } return o; };
        const grounds = el => { const a = [];
          for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n);
            a.push(...stops(cs.backgroundColor));
            if (cs.backgroundImage && cs.backgroundImage !== 'none') a.push(...stops(cs.backgroundImage));
            if (a.length) break; } return a.length ? a : [[255, 255, 255]]; };
        const vw = innerWidth, vh = innerHeight;
        const where = el => { for (let n = el; n && n !== hdr; n = n.parentElement) if (n.id) return '#' + n.id; return 'header'; };
        const out = [];
        for (const el of hdr.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue;
          const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
          if (!txt) continue;
          const fg = stops(cs.color)[0]; if (!fg) continue;
          const size = parseFloat(cs.fontSize) || 16, w = parseInt(cs.fontWeight, 10) || 400;
          out.push({ where: where(el), text: txt.slice(0, 30), fg, grounds: grounds(el), size,
                     large: size >= 24 || (size >= 18.66 && w >= 700) });
        }
        const h = getComputedStyle(hdr);
        return { missing: false, items: out, crm: document.body.dataset.crm || '-', kh: document.body.dataset.crmHead || '(unset)',
                 title: (document.querySelector('#brandTitle h1') || {}).textContent || '',
                 hbg: h.getPropertyValue('--hbg').trim(), hin: h.getPropertyValue('--hin').trim(), hac: h.getPropertyValue('--hac').trim() };
      });
      if (res.missing) { console.log('  header.site missing'); continue; }
      let worst = null;
      for (const it of res.items) {
        let low = Infinity, lowBg = null;
        for (const g of it.grounds) { const r = ratio(it.fg, g); if (r < low) { low = r; lowBg = g; } }
        const floor = it.large ? 3.0 : 4.5;
        if (low < floor) findings.push({ theme, name, ...it, r: low, bg: lowBg, floor });
        if (!worst || low < worst.r) worst = { ...it, r: low };
      }
      console.log('  ' + theme.padEnd(9) + name.padEnd(18) + 'head=' + res.kh.padEnd(11) + 'title="' + res.title.slice(0, 22) + '"');
      console.log('  ' + ' '.repeat(9) + ' '.repeat(18) + 'ground ' + res.hbg.padEnd(42) + ' ink ' + res.hin.padEnd(8) + ' accent ' + res.hac.padEnd(9) +
                  res.items.length + ' on-screen · worst ' + (worst ? worst.r.toFixed(2) + ' "' + worst.text.slice(0, 18) + '"' : 'n/a'));
    }
  }
  console.log('\n  --- ON-SCREEN INK BELOW FLOOR ---');
  const seen = new Set();
  for (const f of findings) {
    const k = f.name + f.where + f.text + f.r.toFixed(2) + f.theme;
    if (seen.has(k)) continue; seen.add(k);
    console.log('    ' + f.r.toFixed(2) + ':1 (floor ' + f.floor + ')  ' + f.theme.padEnd(9) + f.name.padEnd(18) +
                f.where.padEnd(15) + '"' + f.text + '"  rgb(' + f.fg.join(',') + ') on rgb(' + f.bg.join(',') + ') ' + f.size.toFixed(1) + 'px');
  }
  if (!seen.size) console.log('    none');

  await b.close(); srv.close();
  console.log('\nAUDIT COMPLETE — ' + drift.length + ' drifting screen(s), ' + seen.size + ' on-screen ink failure(s)');
})().catch(e => { console.error('ERR', e.stack || e.message); process.exit(1); });
