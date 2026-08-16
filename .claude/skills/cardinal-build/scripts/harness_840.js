/* harness_840.js — Quick Inspection geocodes through Google (build 840)
 *
 * Extracts the SHIPPED qiGoogleGeo / qiReverseGeocode / qiSearchAddr and runs
 * them against mocked Google and Nominatim responses. Nothing re-implemented.
 *
 * Negative control:
 *     node harness_840.js /path/to/index_839.html    # must go RED, not crash
 *
 * The point of this build is the FALLBACK, so most of these cases are failure
 * cases: no key, Google refusing, Google returning ZERO_RESULTS. If any of them
 * leaves the pin worse than build 839 left it, the build is not shippable.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || path.join(__dirname, '..', '..', '..', '..', 'index.html');
const WATCHDOG = setTimeout(() => {
  console.error('GATE TIMEOUT — harness hung after 30s');
  process.exit(2);
}, 30000);

let pass = 0, fail = 0;
const FLOOR = 15;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}
function step(name, fn) {
  return () => Promise.resolve().then(fn).catch(e => {
    fail++; console.log('  FAIL  ' + name + '  — threw: ' + (e && e.message || e));
  });
}

const src = fs.readFileSync(FILE, 'utf8');

/* the three shipped functions, from qiGoogleGeo to the end of qiSearchAddr */
function cutCode() {
  const i = src.indexOf('async function qiGoogleGeo(');
  if (i < 0) return null;
  const anchor = src.indexOf("document.getElementById('qiAddrGo')", i);
  return anchor < 0 ? null : src.slice(i, anchor);
}
const CODE = cutCode();

function fnBody(text, name) {
  const i = text.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let k = i; k < text.length; k++) {
    if (text[k] === '{') { d++; started = true; }
    else if (text[k] === '}') { d--; if (started && d === 0) return text.slice(i, k + 1); }
  }
  return null;
}

console.log('artifact: ' + FILE);
console.log('qi geocoder code: ' + (CODE ? CODE.length + ' chars' : 'NOT FOUND') + '\n');

/* ── 1. structure ──────────────────────────────────────────────────────── */
ok('qiGoogleGeo exists in the artifact', !!CODE && CODE.includes('async function qiGoogleGeo('));
ok('reverse geocode routes through Google first',
   !!CODE && CODE.includes("qiGoogleGeo('latlng="));
ok('address search routes through Google first',
   !!CODE && CODE.includes("qiGoogleGeo('address="));
ok('the US hard filter is on the CODE path, not just in prose',
   !!CODE && CODE.includes("&components=country:US'"));
ok('the Nominatim reverse fallback SURVIVES',
   !!CODE && CODE.includes('nominatim.openstreetmap.org/reverse'));
ok('the Nominatim search fallback SURVIVES',
   !!CODE && CODE.includes('nominatim.openstreetmap.org/search'));

/* Nearby is a different feature with a different problem (a permanent
   localStorage cache Google's terms would not allow) and must be untouched. */
ok('the Nearby geocoder still uses Nominatim with countrycodes=us',
   (fnBody(src, 'upgradeNearbyRow') || '').includes('countrycodes=us'));

/* ── 2. run them ───────────────────────────────────────────────────────── */
const GOOGLE_HIT = {
  status: 'OK',
  results: [{
    formatted_address: '5241 Rucks Rd, Dayton, OH 45417, USA',
    geometry: { location: { lat: 39.7411, lng: -84.2599 } }
  }]
};
const NOMI_REV = { address: { house_number: '5241', road: 'Rucks Rd', city: 'Dayton', state: 'Ohio', postcode: '45417' } };
const NOMI_FWD = [{ lat: '39.7411', lon: '-84.2599' }];

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><html><body><input id="qiAddrInp"><div id="qiAddrGo"></div></body></html>',
    { runScripts: 'outside-only' });
  const w = dom.window;
  w.__calls = [];
  w.CardinalMaps = opts.noMaps ? undefined : {
    loadConfig: async () => (opts.key === undefined ? 'TESTKEY' : opts.key)
  };
  w.fetch = async (url) => {
    w.__calls.push(url);
    if (url.indexOf('maps.googleapis.com') > -1) {
      if (opts.googleHttpFail) return { ok: false, status: 403, json: async () => ({}) };
      if (opts.googleZero) return { ok: true, status: 200, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) };
      return { ok: true, status: 200, json: async () => GOOGLE_HIT };
    }
    if (url.indexOf('/reverse') > -1) return { ok: true, status: 200, json: async () => NOMI_REV };
    return { ok: true, status: 200, json: async () => NOMI_FWD };
  };
  w.qiAddr = '';
  w.__view = null; w.__pin = null;
  w.qiMap = { setView: (ll) => { w.__view = ll; } };
  w.qiPin = { setLatLng: (ll) => { w.__pin = ll; } };
  w.L = {};
  if (CODE) {
    w.eval('var qiAddr = "", qiMap = window.qiMap, qiPin = window.qiPin;\n' + CODE +
           '\nwindow.qiReverseGeocode = qiReverseGeocode; window.qiSearchAddr = qiSearchAddr;' +
           '\nwindow.__getAddr = function(){ return qiAddr; };');
  }
  return w;
}
const inp = (w) => { const e = w.document.getElementById('qiAddrInp'); return e ? e.value : null; };
const called = (w, frag) => w.__calls.some(u => u.indexOf(frag) > -1);

const reverseGoogle = step('reverse via Google', () => {
  const w = boot();
  if (!w.qiReverseGeocode) { fail++; console.log('  FAIL  qiReverseGeocode not defined'); return; }
  return w.qiReverseGeocode({ lat: 39.7411, lng: -84.2599 }).then(() => {
    ok('reverse calls Google', called(w, 'maps.googleapis.com'));
    ok('reverse fills the address box', inp(w) === '5241 Rucks Rd, Dayton, OH 45417',
       JSON.stringify(inp(w)));
    ok('the trailing ", USA" is stripped', (inp(w) || '').indexOf('USA') === -1);
    ok('Nominatim is NOT called when Google answers', !called(w, 'nominatim'));
  });
});

const reverseFallback = step('reverse falls back', () => {
  const w = boot({ googleHttpFail: true });
  if (!w.qiReverseGeocode) { fail++; console.log('  FAIL  qiReverseGeocode not defined'); return; }
  return w.qiReverseGeocode({ lat: 39.7411, lng: -84.2599 }).then(() => {
    ok('a refused Google call falls back to Nominatim', called(w, 'nominatim'));
    /* the ORIGINAL 679-era parts format, byte for byte — build 839's behaviour */
    ok('the fallback still produces the old address shape',
       inp(w) === '5241 Rucks Rd, Dayton, Ohio, 45417', JSON.stringify(inp(w)));
  });
});

const noKey = step('no key configured', () => {
  const w = boot({ key: '' });
  if (!w.qiReverseGeocode) { fail++; console.log('  FAIL  qiReverseGeocode not defined'); return; }
  return w.qiReverseGeocode({ lat: 39.7411, lng: -84.2599 }).then(() => {
    ok('with no key, Google is never called', !called(w, 'maps.googleapis.com'));
    ok('with no key, the pin still resolves via Nominatim', !!inp(w), JSON.stringify(inp(w)));
  });
});

const searchGoogle = step('search via Google', () => {
  const w = boot();
  if (!w.qiSearchAddr) { fail++; console.log('  FAIL  qiSearchAddr not defined'); return; }
  w.document.getElementById('qiAddrInp').value = '5241 rucks rd Dayton Ohio 46417';
  return w.qiSearchAddr().then(() => {
    ok('search calls Google', called(w, 'maps.googleapis.com'));
    ok('search sends the US hard filter', called(w, 'components=country:US'));
    ok('search moves the pin to Google\'s answer',
       !!w.__pin && Math.abs(w.__pin[0] - 39.7411) < 1e-6, JSON.stringify(w.__pin));
    ok('Nominatim is NOT called when Google answers', !called(w, 'nominatim'));
  });
});

const searchFallback = step('search falls back', () => {
  const w = boot({ googleZero: true });
  if (!w.qiSearchAddr) { fail++; console.log('  FAIL  qiSearchAddr not defined'); return; }
  w.document.getElementById('qiAddrInp').value = '948 Huron';
  return w.qiSearchAddr().then(() => {
    /* ZERO_RESULTS is Google's HONEST answer for "948 Huron" — the real one.
       The app must not be left with nothing, so Nominatim still gets a turn. */
    ok('ZERO_RESULTS falls back to Nominatim', called(w, 'nominatim'));
    ok('the pin still moves after a Google ZERO_RESULTS', !!w.__pin, JSON.stringify(w.__pin));
  });
});

Promise.resolve()
  .then(reverseGoogle).then(reverseFallback).then(noKey)
  .then(searchGoogle).then(searchFallback)
  .then(() => {
    clearTimeout(WATCHDOG);
    console.log('\n' + '='.repeat(56));
    const short = (pass + fail) < FLOOR;
    if (short) console.log('CHECK COUNT ' + (pass + fail) + ' IS BELOW THE FLOOR OF ' + FLOOR + ' — coverage was lost');
    console.log((fail === 0 && !short ? 'GREEN' : 'RED') + '  —  ' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail === 0 && !short ? 0 : 1);
  });
