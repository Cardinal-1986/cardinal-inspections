/* Build 636 — one location card on a client profile, and it is the Google one.

   THE TWO THINGS THIS EXISTS TO STOP COMING BACK:

   1. A SECOND MAP. There were two, on different stacks: a Google static block
      injected into #projectView by maybeInsertProfileMap() on every scan(), and
      the Location card's Leaflet map geocoded through Nominatim — the one that
      said "Could not pin this address."

   2. DELETING THE WRONG HALF. The Location card carries the only rendered
      address text and the only #acxEdit2 pencil, and COMMUNITY HAS NO GOOGLE
      CARD — adoptLocation() MOVES this card's .acxsec into #cr-cc-loc. Removing
      the card would have taken the address editor with it and left Community
      printing "No location on file yet."

   ⚠️ The static assertions are the weaker half. The section at the bottom
   EXECUTES the shipped dbPaintMap against a stubbed CardinalMaps and asks the
   DOM what was drawn, then switches the tab and asks again.

   Usage: node harness_location.js [path-to-index.html] */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const H = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* Brace-match, never slice to the next landmark (BUG_CLASSES class 15). */
const body = (src, sig) => {
  const i = src.indexOf(sig); if (i === -1) return '';
  let d = 0; const j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return '';
};

console.log('\n── only one map is left on this screen ──');
const init = body(H, 'async function dbInitMiniMap(pr){');
ok('dbInitMiniMap was found and brace-matched', init.length > 200, init.length + ' chars');
/* Assert on SYNTAX. The definition carries `function `, the call a semicolon;
   neither appears in the replacement comments, which do name the function. */
ok('the duplicate injector is gone, definition and call',
  !/function maybeInsertProfileMap\(/.test(H) && !/maybeInsertProfileMap\(\);/.test(H));
ok('this screen no longer geocodes through Nominatim',
  !/nominatim[\s\S]{0,80}encodeURIComponent\(pr\.address\)/.test(H));
ok('...and no longer draws OSM tiles or an Esri satellite layer here',
  !/server\.arcgisonline\.com/.test(H) && !/addTo\(dbMiniMap\)/.test(H));
/* ⚠️ There is a SECOND Leaflet map elsewhere with its own Nominatim lookups.
   A file-wide "zero" assertion would demand deleting a feature nobody looked
   at — so require it to SURVIVE, explicitly. */
ok('the OTHER Leaflet map is untouched — it still loads and still geocodes',
  /function qiLoadLeaflet\(\)\{/.test(H) &&
  (H.match(/await qiLoadLeaflet\(\);/g) || []).length >= 1 &&
  /nominatim[\s\S]{0,60}reverse/.test(H));
ok('insertMap() is untouched and still exported for other callers',
  /async function insertMap\(container, address, opts\)\{/.test(H) &&
  /insertMap        : insertMap,/.test(H));

console.log('\n── what the card must NOT lose ──');
ok('the address line survives', /class="dbaddr"/.test(H));
ok('the pencil survives, and still opens the project editor',
  /id="acxEdit2"/.test(H) && /hit\('#acxEdit1'\) \|\| hit\('#acxEdit2'\)/.test(H));
ok('both tabs survive', /data-dbm="map"/.test(H) && /data-dbm="sat"/.test(H));
ok('Directions survives', /class="dbmdir"/.test(H));
/* Community MOVES this exact node. If #dbMap or its .acxsec stops existing,
   adoptLocation prints "No location on file yet." and Community loses its map. */
ok('Community can still adopt the card — #dbMap and its .acxsec both remain',
  /id="dbMap"/.test(H) && /var map = document\.getElementById\('dbMap'\);/.test(H) &&
  /map \? map\.closest\('\.acxsec'\) : null/.test(H));

console.log('\n── the tab handler drives maptype, not a tile layer ──');
const tabs = H.slice(H.indexOf('<script id="cr-keeper2-script">'));
const tabBlock = tabs.slice(0, tabs.indexOf('</script>'));
ok('it calls the shared setter rather than touching a map object',
  /window\.dbSetMapType\(/.test(tabBlock) && !/L\.tileLayer/.test(tabBlock));
/* The pressed state must not depend on the map drawing, or a missing key makes
   the tabs look dead — a control that renders but does nothing (class 16). */
ok('the pressed state is toggled BEFORE anything that can fail',
  tabBlock.indexOf("classList.toggle('on'") < tabBlock.indexOf('dbSetMapType'));
ok('the setter is exported once, and the painter defined once',
  (H.match(/window\.dbSetMapType = function\(/g) || []).length === 1 &&
  (H.match(/function dbPaintMap\(/g) || []).length === 1);

const STATIC_DONE = pass + fail;
console.log('\n── EXECUTED: what actually gets drawn, and what the tab does ──');
/* This is the section that matters. A regex cannot tell a correct maptype from
   a hardcoded one, and cannot see that the tab repaints at all. */
function run(hasKey) {
  const dom = new JSDOM('<!doctype html><body><div id="dbMap"></div></body>');
  const d = dom.window.document;
  const opened = [];
  /* ⚠️ Extract the setter BY LINE. A `[^;]+;` pattern truncates it at the first
     semicolon inside its own body — the same "a pattern using [^;] cannot see a
     whole expression" trap CLAUDE.md names, hit while writing this file. */
  const setterLine = (H.split('\n').find(l => l.includes('window.dbSetMapType = function(')) || '').trim();
  const code = `
    function esc(s){ return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function mapsUrl(a){ return 'https://maps.google.com/?q=' + encodeURIComponent(a); }
    window.CardinalMaps = {
      loadConfig: function(){ return Promise.resolve(${hasKey ? "'KEY'" : 'null'}); },
      /* The SHIPPED signature: staticMapUrl(address, opts) returns '' with no key. */
      staticMapUrl: function(address, opts){
        if(!${hasKey}) return '';
        return 'https://maps.googleapis.com/maps/api/staticmap?center=' +
          encodeURIComponent(address) + '&maptype=' + (opts && opts.maptype) +
          '&zoom=' + (opts && opts.zoom) + '&size=' + (opts && opts.size);
      }
    };
    ${body(H, 'function dbPaintMap(el, address){')}
    ${(H.match(/var dbMapType = '[a-z]+';/) || [''])[0]}
    ${setterLine}
    return { paint: dbPaintMap, setType: window.dbSetMapType,
             type: function(){ return dbMapType; } };
  `;
  const win = { open: u => opened.push(u) };
  const api = new Function('document', 'window', code)(d, win);
  return { d, api, opened, el: d.getElementById('dbMap') };
}

/* Wrapped so a build WITHOUT dbPaintMap reports clean FAILs instead of throwing.
   A negative control that crashes proves the file differs; one that goes RED
   proves WHICH behaviours are missing. */
const EXEC_LABELS = [
  'a Google static image is drawn',
  '...for the address it was given',
  'it opens on the ROAD map, matching the tab that renders pressed',
  'the tile is asked for at a size that fits the 172px card, not the default',
  'the image fills the box rather than letterboxing',
  'the map is tappable',
  'Satellite repaints the image, it does not just change a variable',
  'and Map switches back',
  'with no Google key it SAYS so instead of leaving an empty box',
  '...and does not leave a dead tap target behind',
];
try {
/* --- with a key --- */
{
  const { api, el } = run(true);
  api.paint(el, '9222 Arlington Rd, Brookville, OH 45309');
  const img = el.querySelector('img');
  ok('a Google static image is drawn', !!img && /maps\.googleapis\.com\/maps\/api\/staticmap/.test(img.src));
  ok('...for the address it was given', !!img && /9222%20Arlington|9222\+Arlington/.test(img.src));
  /* The Map tab must render pressed on open, so the image must match it. */
  ok('it opens on the ROAD map, matching the tab that renders pressed',
    api.type() === 'roadmap' && /maptype=roadmap/.test(img.src));
  ok('the tile is asked for at a size that fits the 172px card, not the default',
    /size=640x344/.test(img.src) && /zoom=18/.test(img.src));
  ok('the image fills the box rather than letterboxing',
    /object-fit:cover/.test(el.innerHTML) && /width:100%/.test(el.innerHTML));
  ok('the map is tappable', el.style.cursor === 'pointer' && typeof el.onclick === 'function');

  /* THE TAB. A regex cannot see that this repaints. */
  api.setType('satellite', el, '9222 Arlington Rd, Brookville, OH 45309');
  const img2 = el.querySelector('img');
  ok('Satellite repaints the image, it does not just change a variable',
    api.type() === 'satellite' && /maptype=satellite/.test(img2.src));
  api.setType('roadmap', el, '9222 Arlington Rd, Brookville, OH 45309');
  ok('and Map switches back', /maptype=roadmap/.test(el.querySelector('img').src));
}

/* --- with NO key configured --- */
{
  const { el, api } = run(false);
  api.paint(el, '1630 E 5th St, Dayton, OH 45403');
  /* staticMapUrl returns '' with no key. An empty grey box would read exactly
     like the "Could not pin this address" failure this build removed. */
  ok('with no Google key it SAYS so instead of leaving an empty box',
    !el.querySelector('img') && /no Google key configured/.test(el.textContent));
  ok('...and does not leave a dead tap target behind', !el.onclick || el.style.cursor !== 'pointer');
}

} catch (e) {
  EXEC_LABELS.slice(-(EXEC_LABELS.length - (pass + fail - STATIC_DONE)))
    .forEach(l => ok(l, false, 'not present in this build: ' + (e && e.message)));
}

console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
