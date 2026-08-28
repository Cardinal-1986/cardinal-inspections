/* harness_drawer1115.js — functional gate for Build 1115 (the drawer's bottom
   bar + always-collapsed sections).

   The SHIPPED cr-drawer-script is extracted and run in jsdom against a #navMenu
   built from the shipped markup's own shape, then driven the way a phone drives
   it: open → expand a section → close → open again. Proves the collapse is an
   invariant now and not a first-run default, and that the drawer no longer
   reads or writes the desktop rail's fold store.

   Also checks the footer bar on the artifact: the What's New paragraph is gone,
   the version stamp survives in the form all four readers parse, and sign-out
   is an icon inside it with its id and wiring intact.

   Negative control: build 1114 persists the fold state and still carries the
   summary paragraph → RED.
   Usage: node harness_drawer1115.js [path-to-index.html]  (NODE_PATH -> jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = process.argv[2] || path.resolve(__dirname, '../../../../index.html');
const html = fs.readFileSync(APP, 'utf8');
let fails = 0, checks = 0;
function ok(c, m){ checks++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); if(!c) fails++; }
const wd = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 30000);
const raf = () => new Promise(r => setTimeout(r, 24));

const ST = '<script id="cr-drawer-script">';
const s0 = html.indexOf(ST);
const mod = s0 < 0 ? '' : html.slice(s0 + ST.length, html.indexOf('</script>', s0));
if(!mod || !/var secOpen = \{\}/.test(mod)){
  console.log('  ✗ FAIL the drawer keeps no in-memory section state (negative control)');
  console.log('\nRED — Build 1115 drawer code absent from ' + path.basename(APP));
  process.exit(1);
}

/* ── 1. the footer bar, read off the artifact ───────────────────────────── */
const footM = /<div data-cr-footer[^>]*>([\s\S]*?)<\/div>/.exec(html);
ok(!!footM, 'the drawer footer element is present');
const foot = footM ? footM[0] : '';
const footInner = footM ? footM[1] : '';

ok(!/&#8212;|&mdash;|—/.test(footInner),
   'the What’s New paragraph is gone — no em-dash summary in the footer');
ok(footInner.replace(/<[^>]*>/g, '').trim().length <= 40,
   'what is left is one short line, not prose (' +
   footInner.replace(/<[^>]*>/g, '').trim().length + ' chars)');

/* the four readers of this element, each with its own pattern */
ok(/data-cr-footer[^>]*>\s*v2026-\d\d-\d\d\s+build\s+\d+/.test(html),
   'check_build.py app_stamp() still matches (version is a DIRECT text node)');
ok(/build\s+(\d+)/i.test(footInner), 'currentBuild() / buildTag() still find "build N"');
ok(/v[\d-]+\s*build\s*\d+/i.test(footInner.replace(/<[^>]*>/g, ' ')),
   'railVersion() still finds the v-date + build form');
ok(/^v2026-/.test(footInner.replace(/<[^>]*>/g, '').trim()),
   'addPaletteHint() still anchors on it (textContent starts "v2026-")');

/* sign-out: same element, now an icon, inside the bar */
ok(/id="signOutBtn"/.test(foot), 'sign-out moved INTO the footer bar');
ok((html.match(/id="signOutBtn"/g) || []).length === 1, 'there is still exactly one #signOutBtn');
ok(/data-cri="lock"/.test(foot), 'it carries the drawn `lock` glyph, the one the rail already uses');
ok(!/&#128682;/.test(foot) && !/Sign out<\/button>/.test(foot),
   'the door emoji and the full-width text row are gone');
ok(/aria-label="Sign out"/.test(foot), 'it still announces itself as Sign out');
ok(/style="display:none;"/.test(foot),
   'it still starts hidden — showMain()/showLogin() toggle this same element');
ok(/lock\s*:\s*'/.test(html), '`lock` is a real key in the icon registry');
ok(/var real = document\.getElementById\('signOutBtn'\);/.test(html),
   "the desktop rail's own sign-out still clicks this element");

/* the dead rule the 1114 sentinel found */
ok(!/body\.projopen #brandTitle\{display:none;\}/.test(html),
   'the dead `body.projopen #brandTitle{display:none}` rule is deleted at source');
ok(/#cr-hd2-bar #cr-hd2-mid #brandTitle\{position:static/.test(html),
   "but 416's forced-visible rule stays — it is what keeps the title up");

/* ── 2. drive the real module ───────────────────────────────────────────── */
const dom = new JSDOM(
  '<!doctype html><html><body>' +
  '<div id="navMenu" style="display:none;">' +
    '<div class="cr-drawer-head"><div class="cr-dh-name" id="crDrawerUser">Cardinal</div></div>' +
    '<div class="navsec">Daily</div>' +
      '<button class="navopt" data-nav="landing">Landing</button>' +
      '<button class="navopt" data-nav="clients">Clients</button>' +
    '<div class="navsec">Office</div>' +
      '<button class="navopt" data-nav="reports">Graphs</button>' +
    '<div class="navsec">Insurance</div>' +
      '<button class="navopt" data-nav="sol">Scope of Loss</button>' +
    '<div data-cr-footer>v2026-08-28 build 1115' +
      '<button type="button" id="signOutBtn" class="cr-df-out" style="display:none;"></button></div>' +
  '</div></body></html>',
  { runScripts:'outside-only', pretendToBeVisual:true, url:'https://app.cardinalroster.com/' });
const w = dom.window, doc = w.document;

/* seed the rail's store with Office ALREADY OPEN. On 1114 the drawer read this
   and opened Office; on 1115 it must ignore it entirely. */
const RAIL_KEY = 'cardinal.lnav.sections';
w.localStorage.setItem(RAIL_KEY, JSON.stringify({ office:1, daily:1 }));

let threw = '';
try{ w.eval(mod); }catch(err){ threw = err.message; }
ok(!threw, 'the drawer module evaluates clean' + (threw ? ' — ' + threw : ''));

const menu = doc.getElementById('navMenu');
const secs = () => Array.from(doc.querySelectorAll('#navMenu .navsec'));
const hidden = () => Array.from(doc.querySelectorAll('#navMenu .navopt[data-crhide="1"]')).length;
const rows = () => Array.from(doc.querySelectorAll('#navMenu .navopt')).length;
const expandedCount = () => secs().filter(s => s.getAttribute('aria-expanded') === 'true').length;

(async function(){
  /* first opening */
  menu.style.display = 'block';
  await raf(); await raf();

  ok(secs().length === 3 && secs().every(s => s.hasAttribute('aria-expanded')),
     'every section became a real control (aria-expanded set)');
  ok(expandedCount() === 0,
     'FIRST opening: every section is collapsed (' + expandedCount() + ' expanded)');
  ok(hidden() === rows() && rows() === 4,
     'every row under a heading is hidden (' + hidden() + '/' + rows() + ')');
  ok(secs().every(s => s.getAttribute('data-crcount')),
     'each heading carries its row count');

  /* a persisted "open" must NOT reach the drawer any more */
  const office = secs().find(s => s.textContent.trim() === 'Office');
  ok(office && office.getAttribute('aria-expanded') === 'false',
     'a section the RAIL has stored as open is still collapsed in the drawer');

  /* expand one */
  office.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await raf();
  ok(office.getAttribute('aria-expanded') === 'true', 'tapping a heading expands it');
  ok(hidden() === 3, 'its row is revealed and the others stay hidden (' + hidden() + ' hidden)');
  ok(expandedCount() === 1, 'only the tapped section opened');

  /* the rail's store must be untouched by that */
  ok(w.localStorage.getItem(RAIL_KEY) === JSON.stringify({ office:1, daily:1 }),
     'expanding in the drawer writes NOTHING to the rail’s fold store');

  /* close and reopen — the whole point of the build */
  menu.style.display = 'none';
  await raf(); await raf();
  menu.style.display = 'block';
  await raf(); await raf();

  ok(expandedCount() === 0,
     'SECOND opening: everything is collapsed again (' + expandedCount() + ' expanded)');
  ok(hidden() === rows(), 'and every row is hidden again (' + hidden() + '/' + rows() + ')');

  /* a mutation while OPEN must not slam a section shut under the finger */
  const office2 = secs().find(s => s.textContent.trim() === 'Office');
  office2.dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await raf();
  ok(office2.getAttribute('aria-expanded') === 'true', 'expanded again while open');
  const late = doc.createElement('button');
  late.className = 'navopt'; late.setAttribute('data-nav', 'late'); late.textContent = 'Late row';
  menu.insertBefore(late, doc.querySelector('#navMenu [data-cr-footer]'));
  await raf(); await raf();
  ok(office2.getAttribute('aria-expanded') === 'true',
     'a row injected later does NOT collapse the section you just opened');

  /* the footer and sign-out are chrome — never swallowed by a section */
  ok(!doc.querySelector('#navMenu [data-cr-footer]').hasAttribute('data-crhide'),
     'the footer bar is never hidden by a collapsed section');
  ok(!doc.getElementById('signOutBtn').hasAttribute('data-crhide'),
     'sign-out is never hidden by a collapsed section');

  /* the store is STILL untouched after all of that */
  ok(w.localStorage.getItem(RAIL_KEY) === JSON.stringify({ office:1, daily:1 }),
     'after a full session the rail’s fold store is byte-identical');
  ok(!/writeSecs|readSecs/.test(mod),
     'readSecs/writeSecs are deleted at source, not left unused');

  const FLOOR = 26;
  ok(checks >= FLOOR, 'coverage floor: ' + checks + ' checks ran (>= ' + FLOOR + ')');

  clearTimeout(wd);
  console.log(fails ? ('\nRED — ' + fails + ' of ' + checks + ' failed')
                    : ('\nGREEN — all ' + checks + ' Build 1115 assertions passed'));
  process.exit(fails ? 1 : 0);
})();
