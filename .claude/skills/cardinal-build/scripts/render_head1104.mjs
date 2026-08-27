/* Build 1104 gate — shared screens wear the PRODUCTION header.
 * Drives the real app in Chromium: opens each shared screen and reads the
 * header attribute the CSS actually keys on (body[data-crm-head]).
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_head1104.mjs [index.html]
 *
 * Negative control: the pre-1104 tree — Settings/Profile/Audit come up under
 * whatever portal is sticky, so those asserts go RED (no crash).
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.setContent(fs.readFileSync(FILE, 'utf8'), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);

  /* stand in a NON-production portal first, so a pass cannot be luck */
  const setSticky = crm => p.evaluate(k => {
    try { localStorage.setItem('cr-crm', k); } catch (_) {}
    try { document.body.dataset.crm = k; document.body.dataset.crmHead = k; } catch (_) {}
  }, crm);

  /* crmHead lives inside the header module's IIFE — reach it through its
     PUBLIC export (window.CardinalHeader), never as a bare global. Calling the
     global returned "(crmHead missing)" for every screen, which failed correct
     code and let the precedence check pass vacuously. */
  const head = () => p.evaluate(() => {
    try {
      const h = window.CardinalHeader;
      if (!h || typeof h.crmHead !== 'function') return '(CardinalHeader.crmHead missing)';
      return h.crmHead();
    } catch (e) { return 'threw:' + e.message; }
  });
  const show = id => p.evaluate(i => {
    const el = document.getElementById(i);
    if (!el) return 'missing';
    try { if (typeof hideAllViews === 'function') hideAllViews(); } catch (_) {}
    el.style.display = 'block';
    return 'shown';
  }, id);
  const hide = id => p.evaluate(i => { const el = document.getElementById(i); if (el) el.style.display = 'none'; }, i => i, id).catch(() => {});

  for (const portal of ['community', 'insurance']) {
    await setSticky(portal);
    /* Control, stated as what actually matters: with NO shared screen open the
       head must NOT be production. (Asserting the exact portal was wrong — the
       1087 landing guard legitimately answers 'retail' while the picker shows.) */
    const base = await head();
    ok(base !== 'production', 'control: with ' + portal + ' sticky and no shared screen open, the head is not production (got ' + base + ')');

    for (const id of ['settingsView', 'profileView', 'auditView', 'teamView', 'punchView']) {
      const s = await show(id);
      if (s === 'missing') { ok(false, id + ' is missing from the markup'); continue; }
      const h = await head();
      ok(h === 'production', id + ' wears the production head while ' + portal + ' is sticky (got ' + h + ')');
      await p.evaluate(i => { const el = document.getElementById(i); if (el) el.style.display = 'none'; }, id);
    }

    /* the design line 754 drew: shared screens move the HEAD only */
    await show('settingsView');
    const crm = await p.evaluate(() => document.body.dataset.crm);
    ok(crm !== 'production', 'data-crm is NOT moved to production (grounds never follow the header) — got ' + crm);
    await p.evaluate(() => { const el = document.getElementById('settingsView'); if (el) el.style.display = 'none'; });
  }

  /* a real CRM view still outranks the shared list */
  await setSticky('community');
  /* order matters: show() runs hideAllViews(), which clears projopen — set the
     class AFTER the view is up, or the precedence check tests nothing. */
  await show('settingsView');
  await p.evaluate(() => { document.body.classList.add('projopen'); });
  const withProj = await head();
  ok(withProj === 'retail',
     'an open project still outranks the shared-screen rule (projopen -> retail, not production; got ' + withProj + ')');

  await b.close();
  console.log(fails ? ('\nGATE RED — ' + fails + ' failure(s)') : '\nGATE GREEN — every shared screen wears the production head, grounds unmoved, precedence intact');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack || e.message); process.exit(1); });
