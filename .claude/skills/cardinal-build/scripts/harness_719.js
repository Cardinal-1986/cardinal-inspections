/* Gate for build 719 — address autocomplete must work off the NEW Places API,
 * without disturbing the <input> the rest of the app reads.
 *
 * Runs the SHIPPED cr-gmap-script in real Chromium against a mock of
 * google.maps.places shaped like the new API (AutocompleteSuggestion +
 * AutocompleteSessionToken + placePrediction.toPlace().fetchFields()), drives a
 * real <input>, and checks the outward contract the seven .value readers depend
 * on. Then re-runs with ONLY the legacy class present to prove the fallback.
 *
 * Negative control — MUST go red on build 718:
 *   node harness719.js index.html          -> PASS
 *   node harness719.js index_prev718.html  -> FAIL
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ART = process.argv[2] || 'index.html';
const WATCHDOG = setTimeout(() => { console.error('GATE TIMEOUT'); process.exit(2); }, 90000);

function block(src, id) {
  const open = src.indexOf(`<script id="${id}">`);
  if (open === -1) throw new Error(`no <script id="${id}">`);
  const s = src.indexOf('>', open) + 1;
  return src.slice(s, src.indexOf('</script>', s));
}
function styleBlock(src, id) {
  const open = src.indexOf(`<style id="${id}">`);
  if (open === -1) return '';
  const s = src.indexOf('>', open) + 1;
  return src.slice(s, src.indexOf('</style>', s));
}

/* Mock of the NEW Places API, installed as window.google.maps.places. */
const NEW_API = `
window.__fetchCalls = [];
const mkPlace = (addr) => ({
  formattedAddress: addr, displayName: addr.split(',')[0],
  location: { lat: () => 39.7589, lng: () => -84.1916 },
  fetchFields: async function(req){ window.__fetchCalls.push(req); return { place: this }; },
});
window.google = { maps: { places: {
  AutocompleteSessionToken: function(){ this.t = 'tok'; },
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: async (req) => {
      window.__lastReq = req;
      const mk = (main, sub) => ({ placePrediction: {
        mainText: { text: main }, secondaryText: { text: sub }, text: { text: main + ', ' + sub },
        toPlace: () => mkPlace(main + ', ' + sub),
      }});
      return { suggestions: [
        mk('100 Test Avenue', 'Dayton, OH, USA'),
        mk('100 Testament Rd', 'Kettering, OH, USA'),
        mk('1000 Test Blvd', 'Huber Heights, OH, USA'),
      ]};
    },
  },
}}};
`;

/* Legacy-only shape: the new classes absent, so the fallback must be taken. */
const LEGACY_API = `
window.__legacyUsed = 0;
window.google = { maps: { places: {
  Autocomplete: function(input, opts){
    window.__legacyUsed++; this.input = input;
    this.addListener = function(ev, fn){ window.__legacyListener = fn; };
    this.getPlace = function(){ return { formatted_address: '9 Legacy Way, Dayton, OH', geometry: { location: { lat: () => 1, lng: () => 2 } } }; };
  },
}}};
`;

async function boot(browser, code, css, apiStub) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.route('http://cardinal.harness/**', (r) => {
    if (r.request().url().indexOf('/api/config') !== -1) {
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ googleMapsKey: 'test-key' }) });
    }
    return r.fulfill({ status: 200, contentType: 'text/html',
      body: `<!doctype html><html><head><style>${css}</style></head><body>
        <div id="leadFormModal" style="position:fixed;inset:0;z-index:225;overflow:auto;">
          <div style="margin:80px auto;max-width:600px;">
            <label>Street *<input type="text" id="ldStreet" placeholder="Start typing — address auto-completes"></label>
          </div>
        </div></body></html>` });
  });
  await page.goto('http://cardinal.harness/');
  await page.addScriptTag({ content: apiStub });
  await page.addScriptTag({ content: code });
  return { page, errs };
}

(async () => {
  const src = fs.readFileSync(ART, 'utf8');
  const code = block(src, 'cr-gmap-script');
  const css = styleBlock(src, 'cr-ac-styles');
  console.log(`artifact : ${path.basename(ART)}`);
  console.log(`cr-gmap-script: ${code.length} chars · cr-ac-styles: ${css.length} chars`);
  if (code.length < 3000) throw new Error('extract too small — refusing to assert');

  const browser = await chromium.launch({ headless: true });

  // ---------- NEW API path ----------
  const { page, errs } = await boot(browser, code, css, NEW_API);
  const res = await page.evaluate(async () => {
    const out = {};
    const input = document.getElementById('ldStreet');
    const tagBefore = input.tagName;
    await window.CardinalMaps.attachAutocomplete(input);
    await new Promise(r => setTimeout(r, 150));

    const live = document.getElementById('ldStreet');
    out.stillAnInput = !!live && live.tagName === tagBefore && live === input;

    // type
    live.focus();
    live.value = '100 Test';
    live.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));

    const box = document.querySelector('.cr-acbox');
    out.boxExists = !!box;
    out.boxVisible = !!(box && getComputedStyle(box).display !== 'none');
    out.rows = box ? box.querySelectorAll('[data-aci]').length : 0;
    out.firstRowText = box && box.querySelector('[data-aci] .m') ? box.querySelector('[data-aci] .m').textContent : '';
    out.reqRegion = window.__lastReq ? JSON.stringify(window.__lastReq.includedRegionCodes) : null;
    out.sentToken = !!(window.__lastReq && window.__lastReq.sessionToken);
    if (box) {
      const cs = getComputedStyle(box);
      out.fixed = cs.position === 'fixed';
      out.z = parseInt(cs.zIndex, 10);
      const r0 = box.querySelector('[data-aci]');
      out.rowH = r0 ? Math.round(r0.getBoundingClientRect().height) : 0;
      out.notClipped = box.getBoundingClientRect().width > 50;
    }

    // keyboard: down then Enter selects the first row
    const fired = { input: 0, change: 0, place: 0 };
    live.addEventListener('input', () => fired.input++);
    live.addEventListener('change', () => fired.change++);
    live.addEventListener('cr-place-selected', (e) => { fired.place++; out.eventDetail = { address: e.detail.address, lat: e.detail.lat, lng: e.detail.lng }; });

    live.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    out.highlighted = !!document.querySelector('.cr-acrow.on');
    live.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 400));

    out.valueAfter = live.value;
    out.fired = fired;
    out.closedAfterPick = !!(box && getComputedStyle(box).display === 'none');
    out.fetchFieldsAsked = (window.__fetchCalls[0] || {}).fields || null;
    out.stillAnInputAfter = document.getElementById('ldStreet').tagName === 'INPUT';
    return out;
  });
  await page.close();

  // ---------- LEGACY fallback path ----------
  const { page: p2, errs: errs2 } = await boot(browser, code, css, LEGACY_API);
  const legacy = await p2.evaluate(async () => {
    const input = document.getElementById('ldStreet');
    await window.CardinalMaps.attachAutocomplete(input);
    await new Promise(r => setTimeout(r, 200));
    return { legacyUsed: window.__legacyUsed, hasListener: typeof window.__legacyListener === 'function' };
  });
  await p2.close();
  await browser.close();

  let fails = 0;
  const check = (name, ok, detail) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail !== undefined ? ' — ' + detail : ''}`);
    if (!ok) fails++;
  };

  console.log('assertions — new API path:');
  check('the field is still the same <input>', res.stillAnInput === true);
  check('suggestions box rendered', res.boxExists && res.boxVisible);
  check('it lists the suggestions', res.rows === 3, `${res.rows} rows`);
  check('rows show the address text', /100 Test Avenue/.test(res.firstRowText || ''), res.firstRowText);
  check('request is region-restricted to us', res.reqRegion === '["us"]', String(res.reqRegion));
  check('a session token is sent (billing)', res.sentToken === true);
  check('box is position:fixed', res.fixed === true);
  check('box clears #pwaNav (z-index > 9990)', res.z > 9990, String(res.z));
  check('rows meet the 44px touch floor', res.rowH >= 44, `${res.rowH}px`);
  check('arrow key highlights a row', res.highlighted === true);
  check('Enter writes the address into the input', /100 Test Avenue/.test(res.valueAfter || ''), res.valueAfter);
  check('input event fired', res.fired && res.fired.input >= 1, JSON.stringify(res.fired));
  check('change event fired', res.fired && res.fired.change >= 1);
  check('cr-place-selected fired with coords', res.fired && res.fired.place === 1 &&
        res.eventDetail && res.eventDetail.lat === 39.7589, JSON.stringify(res.eventDetail));
  check('only the fields we need are fetched', Array.isArray(res.fetchFieldsAsked) &&
        res.fetchFieldsAsked.indexOf('formattedAddress') !== -1, JSON.stringify(res.fetchFieldsAsked));
  check('box closes after selection', res.closedAfterPick === true);
  check('still an <input> after selection', res.stillAnInputAfter === true);
  check('no page errors', errs.length === 0, errs.join(' | ') || 'none');

  console.log('assertions — legacy fallback:');
  check('legacy widget used when the new API is absent', legacy.legacyUsed === 1, `used ${legacy.legacyUsed}x`);
  check('legacy place_changed still wired', legacy.hasListener === true);
  check('no page errors (fallback)', errs2.length === 0, errs2.join(' | ') || 'none');

  clearTimeout(WATCHDOG);
  console.log(fails === 0 ? '\nPASS' : `\nFAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { clearTimeout(WATCHDOG); console.error('HARNESS ERROR:', e.message); process.exit(2); });
