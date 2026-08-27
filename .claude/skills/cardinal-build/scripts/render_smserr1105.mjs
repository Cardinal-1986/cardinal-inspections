/* Build 1105 gate — a failed-text message must be READABLE on a phone.
 * Puts the exact string Theo saw into the real status element and measures it
 * in Chromium: it must wrap (no horizontal overflow) and clear the floating
 * dark-mode button on the right.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_smserr1105.mjs [index.html]
 *
 * Negative control: the pre-1105 tree overflows, so the wrap assert goes RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else console.log('  ok   ' + m); };

/* the literal line from the screenshot — an unbroken URL is what overflowed */
const REAL = '⚠️ Text failed — HTTP 401 {"code":20003,"message":"Authenticate","more_info":"https://www.twilio.com/docs/errors/20003"}';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.setContent(fs.readFileSync(FILE, 'utf8'), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);

  const m = await p.evaluate(txt => {
    /* The element lives inside profileView, which ships display:none — measuring
       it while hidden returned scrollWidth 0 / clientWidth 0, so the wrap assert
       passed VACUOUSLY (0 <= 0) on both trees. Lay the screen out for real
       first, then measure. */
    const view = document.getElementById('profileView');
    if (view) view.style.display = 'block';
    const el = document.getElementById('testAlertStatus');
    if (!el) return { missing: true };
    const card = el.parentElement;
    el.style.display = 'block';
    if (card) card.style.display = 'block';
    el.textContent = txt;
    const cs = getComputedStyle(el);
    return {
      missing: false,
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      right: Math.round(el.getBoundingClientRect().right),
      vw: window.innerWidth,
      bodyOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      wrap: cs.overflowWrap || cs.wordWrap,
      padRight: parseFloat(cs.paddingRight) || 0,
      lines: Math.round(el.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || 18))
    };
  }, REAL);

  if (m.missing) { ok(false, 'testAlertStatus element is missing'); }
  else {
    ok(m.clientW > 100, 'the status element is actually laid out — width ' + m.clientW + 'px (a 0-width element makes every check below vacuous)');
    ok(m.clientW > 100 && m.scrollW <= m.clientW + 1, 'the error text WRAPS — no horizontal overflow (scroll ' + m.scrollW + ' <= client ' + m.clientW + ')');
    ok(m.bodyOverflow === false, 'the page itself does not scroll sideways because of it');
    ok(/anywhere|break-word/.test(m.wrap), 'an explicit wrap rule is in force (' + m.wrap + ')');
    ok(m.padRight >= 40, 'the text keeps clear of the floating dark-mode button (padding-right ' + m.padRight + 'px)');
    ok(m.lines >= 2, 'the long error really did break onto multiple lines (' + m.lines + ')');
  }

  await b.close();
  console.log(fails ? ('\nGATE RED — ' + fails + ' failure(s)') : '\nGATE GREEN — the failure message is readable on a phone');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e.stack || e.message); process.exit(1); });
