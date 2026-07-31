/* The instrument jsdom cannot be: a real engine.
 *
 * jsdom does not resolve var() inside background/border shorthands, so it can
 * prove structure and never colour. Build 481 shipped a rule that parsed,
 * balanced, passed every mechanical gate — and lost the cascade (BUG_CLASSES 9).
 * Build 515 is the same class, found today: an undefined token made a whole
 * background declaration invalid.
 *
 * This page is NOT a mock. The stylesheet is cr-cc-styles lifted verbatim out of
 * the shipped file, together with the :root --ccm-* blocks it depends on, and
 * the markup is the exact innerHTML the shipped ocStep2()/contactsHtml() wrote
 * during the jsdom run. Chromium then reports what actually painted.
 *
 * It proves which rule won and that a colour resolved. It does NOT prove the
 * colour is right — that is Theo's eyes.
 */
const fs = require('fs');
const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/app/index_v519.html';
const html = fs.readFileSync(FILE, 'utf8');

function styleBlock(id) {
  const o = html.indexOf('<style id="' + id + '">');
  return html.slice(html.indexOf('>', o) + 1, html.indexOf('</style>', o));
}
/* the :root / rb-light --ccm-* declarations live in the hub's stylesheet */
const HUBCSS = styleBlock('cr-ch2-styles');
const CCCSS = styleBlock('cr-cc-styles');
function rootBlock(sel) {
  const i = HUBCSS.indexOf(sel + '{');
  if (i < 0) throw new Error('no ' + sel + ' in cr-ch2-styles');
  return HUBCSS.slice(i, HUBCSS.indexOf('}', i) + 1);
}
const ROOT_DARK = rootBlock(':root');
const ROOT_LIGHT = rootBlock('[data-theme="rb-light"]');
console.log('css: root dark ' + ROOT_DARK.length + 'B, root light ' + ROOT_LIGHT.length + 'B, cr-cc-styles ' + CCCSS.length + 'B');

/* ---- capture the SHIPPED renderer's own markup -------------------------- */
function block(id) {
  const o = html.indexOf('<script id="' + id + '">');
  return html.slice(html.indexOf('>', o) + 1, html.indexOf('</script>', o));
}
const CC = block('cr-cc-script');

const dom = new JSDOM('<!doctype html><html><body><div id="projectView"><div id="clientBanner"></div></div></body></html>',
  { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
const ckOf = (pr) => { try { return JSON.parse(pr.checklist || '{}'); } catch (e) { return {}; } };
Object.assign(w, {
  parseCkAll: ckOf,
  projClaimType: (pr) => ckOf(pr).claim_type || 'retail',
  projHomeowner: (pr) => String((ckOf(pr).lead || {}).homeowner_name || ''),
  normStage: (s) => s,
  CardinalEstimates: { loadForProject: async () => [{ id: 'e', total: 14200, line_items: [] }] },
  CardinalCommunityPartners: { load: async () => true, list: () => ([{ id: 'p-hab', name: 'Habitat for Humanity' }, { id: 'p-dhrn', name: 'Dayton Home Repair Network' }]) },
  supa: { from: () => ({ select: () => { const q = { eq: () => q, order: () => q, limit: async () => ({ data: [] }), then: (r) => r({ data: [] }) }; return q; } }) },
});
w.currentProject = {
  id: 'j1', name: 'Minnie marsh kent', address: '3710 west third', stage: 'Prospect',
  created_at: '2026-06-01T12:00:00Z',
  checklist: JSON.stringify({
    claim_type: 'community',
    lead: { homeowner_name: 'Minnie marsh kent', partner_name: 'Habitat for Humanity', partner_id: 'p-hab', bid_due_at: '' },
    bid: { submitted_amount: 14200 },
  }),
};
w.eval('(function(){' + CC + '})()');

const settle = () => new Promise((r) => setTimeout(r, 60));

(async () => {
  for (let i = 0; i < 20 && !w.document.getElementById('cr-cc'); i++) await settle();
  const m = () => w.document.getElementById('cr-cc');
  for (let i = 0; i < 20 && !m().querySelector('[data-act="outcome"]'); i++) await settle();

  /* the Bill to card, as contactsHtml() wrote it */
  const billHtml = m().innerHTML;
  m().querySelector('[data-act="outcome"]').click(); await settle();
  const step1 = m().innerHTML;
  m().querySelector('[data-oc="pick"][data-k="waiting"]').click(); await settle();
  const step2 = m().innerHTML;
  if (!/cc-oc/.test(step1) || !/data-oc="months"/.test(step2) || !/ct bill/.test(billHtml)) {
    throw new Error('capture failed — refusing to assert on markup I did not get');
  }
  console.log('captured shipped markup: step1 ' + step1.length + 'B, step2 ' + step2.length + 'B, client page ' + billHtml.length + 'B');

  const page = (theme) => `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>
${ROOT_DARK}
${ROOT_LIGHT.replace('[data-theme="rb-light"]', ':root[data-theme="rb-light"]')}
body{margin:0;background:var(--ccm-ground);font-family:-apple-system,'Segoe UI',Arial,sans-serif;padding:12px}
${CCCSS}
</style></head><body>
<div id="cr-cc" data-which="step1">${step1}</div>
<div id="cr-cc" data-which="step2">${step2}</div>
<div id="cr-cc" data-which="client">${billHtml}</div>
</body></html>`;

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  let pass = 0, fail = 0; const fails = [];
  const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); } };
  const opaque = (v) => !!v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent';

  for (const theme of ['dark', 'rb-light']) {
    console.log('\n== Chromium computed style — theme=' + theme + ' ==');
    const p = await browser.newPage({ viewport: { width: 420, height: 900 } });
    await p.setContent(page(theme === 'dark' ? '' : 'rb-light'), { waitUntil: 'load' });

    const got = await p.evaluate(() => {
      const g = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
      const pick = (sel, props) => { const c = g(sel); if (!c) return null; const o = {}; props.forEach((k) => { o[k] = c[k]; }); return o; };
      return {
        card: pick('[data-which="step1"] .cc-oc', ['backgroundColor', 'borderTopColor']),
        go: pick('[data-which="step1"] .big button.go', ['backgroundColor', 'borderTopColor', 'color']),
        plain: pick('[data-which="step1"] .big button:not(.go):not(.wait)', ['backgroundColor']),
        wait: pick('[data-which="step1"] .big button.wait', ['borderTopColor']),
        small: pick('[data-which="step1"] .big button small', ['color']),
        segOn: pick('[data-which="step2"] .seg button.on', ['backgroundColor', 'color']),
        segOff: pick('[data-which="step2"] .seg button:not(.on)', ['backgroundColor', 'color']),
        save: pick('[data-which="step2"] .ft .save', ['backgroundColor', 'color']),
        label: pick('[data-which="step2"] .f label', ['color']),
        input: pick('[data-which="step2"] .f input', ['backgroundColor', 'color']),
        bill: pick('[data-which="client"] .ct.bill', ['backgroundImage', 'borderTopColor', 'gridColumnStart']),
        billLbl: pick('[data-which="client"] .ct.bill .k', ['color']),
      };
    });

    ok('outcome card has a real background  [' + got.card.backgroundColor + ']', opaque(got.card.backgroundColor), got.card);
    ok('Awarded button is washed green, not the plain card  [' + got.go.backgroundColor + ']',
      opaque(got.go.backgroundColor) && got.go.backgroundColor !== got.plain.backgroundColor, got);
    ok('...and its border is the accent  [' + got.go.borderTopColor + ']', opaque(got.go.borderTopColor));
    ok('Still-waiting button border is the warn amber  [' + got.wait.borderTopColor + ']',
      opaque(got.wait.borderTopColor) && got.wait.borderTopColor !== got.go.borderTopColor, got.wait);
    ok('sub-labels resolved  [' + got.small.color + ']', opaque(got.small.color));
    ok('selected horizon is visibly different from the others  [' + got.segOn.backgroundColor + ' vs ' + got.segOff.backgroundColor + ']',
      got.segOn.backgroundColor !== got.segOff.backgroundColor && got.segOn.color !== got.segOff.color, got);
    ok('Save button is solid accent with contrasting ink  [' + got.save.backgroundColor + ' / ' + got.save.color + ']',
      opaque(got.save.backgroundColor) && got.save.backgroundColor !== got.card.backgroundColor, got.save);
    ok('field labels resolved  [' + got.label.color + ']', opaque(got.label.color));
    ok('inputs have a ground and ink  [' + got.input.backgroundColor + ' / ' + got.input.color + ']',
      opaque(got.input.backgroundColor) && opaque(got.input.color), got.input);

    /* 515 — the whole point: this used to compute to "none" */
    ok('515: Bill to card PAINTS its fill  [' + String(got.bill.backgroundImage).slice(0, 70) + ']',
      got.bill.backgroundImage !== 'none' && /gradient/.test(got.bill.backgroundImage), got.bill);
    ok('515: ...and keeps its gradient border  [' + got.bill.borderTopColor + ']',
      /gradient/.test(String(got.bill.backgroundImage)) && String(got.bill.backgroundImage).split('gradient').length >= 3, got.bill);
    ok('515: ...and still spans the row  [' + got.bill.gridColumnStart + ']', got.bill.gridColumnStart === '1');
    ok('Bill to label resolved  [' + got.billLbl.color + ']', opaque(got.billLbl.color));

    await p.screenshot({ path: '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/oc_' + theme + '.png', fullPage: true });
    await p.close();
  }
  await browser.close();
  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
