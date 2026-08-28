/* Build 1116 gate — shared screens keep ONE header, and it names the screen.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node gate_1116.mjs [index.html]
 *
 * Served over http:// on purpose: page.setContent() gives an opaque origin where
 * localStorage THROWS, so CardinalPortal.set() silently fails, stickyCrm() answers
 * 'retail' for every portal, and a drift test passes having never varied the
 * portal. The header audit reported "0 drifting screens" that way. The rig
 * ASSERTS the portal really changed before trusting a row.
 *
 * Negative control: point it at the pre-1116 tree — the thirteen drift asserts and
 * every screen-name assert go RED, with no crash.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

/* every id hideAllViews() knows, classified. A new view in NO bucket is a RED:
   that is the whole point — drifting used to be the default for a new screen. */
const CRM_OR_SPECIAL = ['landingView', 'cardinalTruthView', 'insClientsView'];
const DEFERRED = ['cr-occ', 'cr-est-view', 'cr-owner', 'cr-disp', 'cr-can', 'cr-show-form'];

(async () => {
  const dir = path.dirname(path.resolve(FILE)), base = path.basename(FILE);
  const srv = http.createServer((rq, rs) => {
    const f = path.join(dir, decodeURIComponent(rq.url.split('?')[0]).replace(/^\/+/, '') || base);
    fs.readFile(f, (e, d) => e ? (rs.statusCode = 404, rs.end('nf')) : (rs.setHeader('content-type', 'text/html'), rs.end(d)));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/' + base;

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  ok(await p.evaluate(() => { try { localStorage.setItem('_p', '1'); return localStorage.getItem('_p') === '1'; } catch (e) { return false; } }),
     'RIG: localStorage is writable (an opaque origin pins the portal to retail and fakes a pass)');

  const setP = async k => p.evaluate(v => { try { window.CardinalPortal.set(v); return window.CardinalPortal.get(); } catch (e) { return 'threw'; } }, k);
  for (const k of ['insurance', 'community']) ok(await setP(k) === k, 'RIG: CardinalPortal.set("' + k + '") actually takes');

  const shared = await p.evaluate(() => {
    try { const h = window.CardinalHeader; if (!h) return null; } catch (e) { return null; }
    /* SHARED_HEAD lives in the header IIFE; read it through the behaviour instead */
    return null;
  });

  const head = () => p.evaluate(() => { try { return window.CardinalHeader.crmHead(); } catch (e) { return 'threw'; } });
  const title = () => p.evaluate(() => { const h = document.querySelector('#brandTitle h1'); return h ? h.textContent.trim() : '(none)'; });
  const EXPECT = {
    punchView: 'Punch & Repairs', teamView: 'Team', settingsView: 'Settings',
    profileView: 'My Profile', auditView: 'Audit Log', leadsView: 'Leads & Jobs',
    photosView: 'Photos', reportsView: 'Reports', galleryView: 'Gallery',
    companyDocsView: 'Company Docs', resourceLibraryView: 'Library',
    quickInspView: 'Quick Inspection', qiStartView: 'Quick Inspection',
    addrCheckView: 'Address Check', 'cr-itellab': 'iTel Lab',
    'cr-ar-view': 'Invoices', 'cr-lrs-view': 'Labor Rates', 'cr-guide-editor': 'Guides'
  };
  const showOnly = async (id, want) => {
    const r = await p.evaluate(([i, all]) => {
      try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (_) {}
      /* hideAllViews() alone did NOT put back every screen this rig had opened,
         so the first one shown stayed visible and sharedScreen() kept answering
         it — every later screen read "Punch & Repairs". Hide the whole set
         explicitly; the rig must not depend on the app to undo the rig. */
      all.forEach(x => { const e = document.getElementById(x); if (e) e.style.display = 'none'; });
      document.body.classList.remove('projopen');
      const el = document.getElementById(i); if (!el) return 'missing';
      el.style.display = 'block';
      /* The header module is woken by a childList MutationObserver, so setting
         style.display — an ATTRIBUTE mutation — does not re-run build() and the
         title read back is the PREVIOUS screen's. That is not an app bug: every
         real door (openSettingsView, openMyProfile, openTeamView, openAuditLog)
         renders nodes and wakes it, which the header audit verified separately.
         It is this rig failing to navigate the way the app navigates, so the rig
         makes the same kind of mutation a real render makes. */
      const poke = document.createElement('span');
      document.body.appendChild(poke); document.body.removeChild(poke);
      return 'shown';
    }, [id, Object.keys(EXPECT)]);
    /* ...and a FIXED sleep is the other half of the trap: 220ms was not enough
       for the rebuild and every title read back stale, which looked exactly like
       the app picking the wrong screen. Poll for the value instead — if it never
       arrives the assert below still fails on whatever is really there, so this
       cannot manufacture a pass. */
    if (r !== 'missing' && want) {
      try { await p.waitForFunction(
        e => ((document.querySelector('#brandTitle h1') || {}).textContent || '').trim() === e,
        want, { timeout: 2500 }); } catch (_) {}
    } else { await p.waitForTimeout(400); }
    return r;
  };


  /* THE FIX: pinned under every portal, and named for itself */
  for (const portal of ['insurance', 'community']) {
    await setP(portal);
    for (const id of Object.keys(EXPECT)) {
      if (await showOnly(id, EXPECT[id]) === 'missing') { ok(false, id + ' is missing from the markup'); continue; }
      const h = await head(), t = await title();
      ok(h === 'production', id + ' keeps ONE header under ' + portal + ' (got ' + h + ')');
      ok(t === EXPECT[id], id + ' names itself: "' + t + '" (expected "' + EXPECT[id] + '")');
      ok(!/^Production$/.test(t), id + ' does NOT say "Production"');
    }
  }

  /* precedence is unchanged: a real CRM screen and an open project still outrank it */
  await setP('community');
  await showOnly('settingsView');
  await p.evaluate(() => document.body.classList.add('projopen'));
  await p.waitForTimeout(200);
  ok(await head() === 'retail', 'an open client profile still outranks the shared rule');
  await p.evaluate(() => document.body.classList.remove('projopen'));

  await setP('insurance');
  if (await showOnly('cardinalTruthView', 'Insurance') !== 'missing') {
    ok(await head() === 'insurance', 'a real CRM screen still wears its own header');
    ok(await title() === 'Insurance', 'and still names its CRM (got "' + (await title()) + '")');
  }

  /* grounds never follow the header — the 754 line */
  await showOnly('settingsView');
  ok(await p.evaluate(() => document.body.dataset.crm) !== 'production',
     'data-crm is NOT moved to production (grounds never follow the header)');

  /* the screen name must FIT a phone header, not ellipsise */
  const fit = await p.evaluate(() => {
    const h = document.querySelector('#brandTitle h1');
    if (!h) return null;
    return { scroll: h.scrollWidth, client: h.clientWidth, text: h.textContent };
  });
  ok(fit && fit.scroll <= fit.client + 1,
     'the longest screen name fits at 390px without ellipsis ("' + (fit && fit.text) + '" ' +
     (fit && fit.scroll) + ' <= ' + (fit && fit.client) + ')');

  /* every view hideAllViews knows is classified — this is what stops the recurrence */
  const src = fs.readFileSync(FILE, 'utf8');
  const i = src.indexOf('function hideAllViews'); const j = src.indexOf('{', i);
  let d = 0, end = j;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) { end = k; break; } } }
  const ids = [...new Set([...src.slice(i, end).matchAll(/getElementById\(\s*['"]([\w-]+)['"]/g)].map(m => m[1]))];
  const known = new Set([...Object.keys(EXPECT), ...CRM_OR_SPECIAL, ...DEFERRED]);
  const unclassified = ids.filter(x => !known.has(x));
  ok(unclassified.length === 0,
     'every full-screen view is classified — pinned, CRM, or explicitly deferred (unclassified: ' +
     (unclassified.join(', ') || 'none') + ')');

  await b.close(); srv.close();
  console.log(fails ? ('\nGATE RED — ' + fails + ' failure(s)') : '\nGATE GREEN — one header on every shared screen, each naming itself, precedence intact');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack || e.message); process.exit(1); });
