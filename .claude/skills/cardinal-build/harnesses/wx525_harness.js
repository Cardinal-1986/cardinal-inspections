/* Gate for 525 — the landing weather, and the two fixes beside it.
 *
 * The weather panel is the first thing on this landing that depends on a
 * THIRD-PARTY response, and the build container cannot reach Open-Meteo (the
 * egress proxy answers 403 to CONNECT), so the live schema is unverified.
 * That makes the failure paths the important assertions, not the happy one:
 * every way the call can go wrong must leave the landing exactly as it was.
 *
 * Runs the shipped cr-lr-script against a stubbed fetch. Structure only —
 * whether the panel LOOKS right is Theo's eyes, and the screenshots go with it.
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2];
const html = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); }
};
const block = (id) => {
  const o = html.indexOf('<script id="' + id + '">');
  return html.slice(html.indexOf('>', o) + 1, html.indexOf('</script>', o));
};
const styles = (id) => {
  const o = html.indexOf('<style id="' + id + '">');
  return html.slice(html.indexOf('>', o) + 1, html.indexOf('</style>', o));
};
const OPEN = [];
const settle = (ms) => new Promise(r => setTimeout(r, ms || 40));
const until = async (f, n = 50) => { for (let i = 0; i < n; i++) { if (f()) return true; await settle(); } return false; };

const GOOD = {
  current: { temperature_2m: 71.4, weather_code: 61, wind_speed_10m: 14.2 },
  daily: { temperature_2m_max: [78.1], temperature_2m_min: [59.3], precipitation_probability_max: [65] },
};

async function boot(fetchImpl, store) {
  const dom = new JSDOM('<!doctype html><html><body><div id="landingView"></div></body></html>',
    { pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  const mem = store || {};
  Object.defineProperty(w, 'localStorage', {
    value: {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    }, writable: false, configurable: true,
  });
  const calls = [];
  w.fetch = (u) => { calls.push(u); return fetchImpl(u); };
  w.currentUser = { email: 'theo@cardinalrenovations.net' };
  w.PROJECTS = [];
  w.eval('(function(){' + block('cr-lr-script') + '})()');
  const lv = w.document.getElementById('landingView');
  await until(() => lv.querySelector('.cr-lr'));
  /* every JSDOM here is pretendToBeVisual, so each keeps a rAF loop alive and
     node never exits - which made the first run look like a hang when it was
     really `tail` waiting on an EOF that never came. Track them and close. */
  OPEN.push(dom);
  return { w, lv, calls, mem };
}
const jsonOk = (body) => () => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

(async () => {
  console.log('\n== 1. the panel exists, starts hidden, and sits beside the wordmark ==');
  {
    const { lv } = await boot(() => new Promise(() => {}));   /* never resolves */
    const head = lv.querySelector('.cr-lr-head');
    const wx = lv.querySelector('[data-slot="wx"]');
    ok('a .cr-lr-head row was created', !!head);
    ok('the wordmark is inside it', !!head && !!head.querySelector('.cr-lr-mark'));
    ok('the weather panel is its LAST child — i.e. to the right of Cardinal',
      !!wx && head.lastElementChild === wx, head && head.lastElementChild && head.lastElementChild.className);
    ok('it starts hidden', !!wx && wx.hidden === true);
    await settle(120);
    ok('...and a call that never answers leaves it hidden', wx.hidden === true);
    ok('the rest of the landing built anyway  [' + lv.querySelectorAll('.cr-lr-course').length + ' cards]',
      lv.querySelectorAll('.cr-lr-course').length === 4);
  }

  console.log('\n== 2. a good reading paints and caches ==');
  {
    const { lv, calls, mem } = await boot(jsonOk(GOOD));
    const wx = lv.querySelector('[data-slot="wx"]');
    await until(() => wx.hidden === false);
    ok('it un-hid', wx.hidden === false);
    ok('one call, to open-meteo, keyless  [' + String(calls[0] || '').slice(8, 34) + '…]',
      calls.length === 1 && /^https:\/\/api\.open-meteo\.com\//.test(calls[0]), calls);
    ok('...carrying no key, token or secret of any kind',
      !/key|token|secret|appid|apikey/i.test(calls[0] || ''), calls[0]);
    ok('...asking for Dayton', /latitude=39\.7589.*longitude=-84\.1916/.test(calls[0] || ''));
    ok('...in Fahrenheit and mph', /temperature_unit=fahrenheit/.test(calls[0]) && /wind_speed_unit=mph/.test(calls[0]));
    const txt = wx.textContent;
    ok('the temperature is rounded, not raw  ["' + txt.slice(0, 24) + '…"]', /71°/.test(txt) && !/71\.4/.test(txt), txt);
    ok('the condition is named  [Light rain]', /Light rain/.test(txt), txt);
    ok('high, low and wind are there', /78°/.test(txt) && /59°/.test(txt) && /14 mph/.test(txt), txt);
    ok('the rain chance is flagged at 65%', /65% rain/i.test(txt), txt);
    ok('it cached the reading', !!mem['cr-wx-dayton'] && JSON.parse(mem['cr-wx-dayton']).d.now === 71.4, mem);
  }

  console.log('\n== 3. a fresh cache paints without calling out again ==');
  {
    const store = { 'cr-wx-dayton': JSON.stringify({ t: Date.now(), d: { now: 40, code: 3, hi: 44, lo: 31, wind: 8, rain: 5 } }) };
    const { lv, calls } = await boot(jsonOk(GOOD), store);
    const wx = lv.querySelector('[data-slot="wx"]');
    await until(() => wx.hidden === false);
    ok('painted from cache', wx.hidden === false && /40°/.test(wx.textContent), wx.textContent);
    ok('...with NO network call  [' + calls.length + ']', calls.length === 0, calls);
    ok('a 5% rain chance is not worth a badge', !/rain/i.test(wx.textContent), wx.textContent);
  }
  {
    const store = { 'cr-wx-dayton': JSON.stringify({ t: Date.now() - 60 * 60 * 1000, d: { now: 40, code: 3 } }) };
    const { lv, calls } = await boot(jsonOk(GOOD), store);
    await until(() => calls.length > 0);
    ok('an hour-old cache is refetched  [' + calls.length + ']', calls.length === 1, calls);
    await until(() => /71°/.test(lv.querySelector('[data-slot="wx"]').textContent));
    ok('...and the fresh reading wins', /71°/.test(lv.querySelector('[data-slot="wx"]').textContent));
  }

  console.log('\n== 4. THE ONES THAT MATTER — every failure leaves the landing alone ==');
  const BAD = [
    ['network refused', () => Promise.reject(new Error('offline'))],
    ['HTTP 500', () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })],
    ['not JSON', () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad json')) })],
    ['empty object', jsonOk({})],
    ['schema changed — no current', jsonOk({ daily: { temperature_2m_max: [80] } })],
    ['temperature is a string', jsonOk({ current: { temperature_2m: '71.4', weather_code: 61 } })],
    ['temperature is null', jsonOk({ current: { temperature_2m: null, weather_code: 61 } })],
    ['daily arrays empty', jsonOk({ current: { temperature_2m: 70, weather_code: 0 }, daily: { temperature_2m_max: [] } })],
  ];
  for (const [name, impl] of BAD) {
    const { lv, mem } = await boot(impl);
    await settle(160);
    const wx = lv.querySelector('[data-slot="wx"]');
    const cards = lv.querySelectorAll('.cr-lr-course').length;
    const quote = lv.querySelector('.cr-lr-quote p');
    const lastTwo = name === 'daily arrays empty';
    if (lastTwo) {
      ok(name + ' → still paints the temperature it DID get', wx.hidden === false && /70°/.test(wx.textContent), wx.textContent);
      ok(name + ' → and omits the parts it did not', !/H |L |mph/.test(wx.textContent), wx.textContent);
    } else {
      ok(name + ' → panel stays hidden', wx.hidden === true, wx.textContent);
      ok(name + ' → nothing cached', !mem['cr-wx-dayton'], mem);
    }
    ok(name + ' → the four cards and the quote are untouched',
      cards === 4 && !!quote && quote.textContent.length > 10, { cards });
  }

  console.log('\n== 5. the raise, and the light-mode text that was invisible ==');
  {
    const css = styles('cr-lr-styles');
    for (const sel of ['.cr-lr-roof,.cr-lr-pair button', '.cr-lr-roof{border-top']) {
      ok('raise rule present  [' + sel.slice(0, 32) + ']', css.indexOf(sel) >= 0);
    }
    ok('the raise reaches both card families',
      /\.cr-lr-roof,\.cr-lr-pair button\{[^}]*box-shadow/.test(css.replace(/\n/g, '')));
    ok('.cr-lr-minor was left flat on purpose',
      !/\.cr-lr-minor button\{[^}]*box-shadow/.test(css.replace(/\n/g, '')));
    ok('light mode gets its own bevel, not the dark one',
      /html\[data-mode="light"\] \.cr-lr-roof,\s*html\[data-mode="light"\] \.cr-lr-pair button\{/.test(css));
    ok('the Production/Sales accent edge is restored in light mode',
      /html\[data-mode="light"\] \.cr-lr-pair button\{border-top:2px solid var\(--racc/.test(css));
    /* the four parent-vs-child overrides */
    for (const sel of ['.cr-lr-quote p', '.cr-lr-quote cite', '.cr-lr-minor button', '.cr-lr-foot .pp']) {
      ok('light-mode colour now reaches ' + sel,
        css.indexOf('html[data-mode="light"] ' + sel) >= 0, sel);
    }
    ok('the quote body is no longer cream-on-cream',
      /html\[data-mode="light"\] \.cr-lr-quote p\{color:#2a241f\}/.test(css));
  }

  OPEN.forEach(d => { try { d.window.close(); } catch (_) {} });
  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
