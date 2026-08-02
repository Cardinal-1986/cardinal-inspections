/* Build 581 gate — What's New reads both changelog entry shapes.
 *
 * THE BUG, as it shipped on main. Builds 574-580 were added in a NEW entry
 * shape — { b, d, t, s } — beside 268 legacy { build, note } entries. The
 * renderer only ever read .build and .note, so:
 *
 *   e.build > lastSeen   -> undefined > n is false, so the seven newest builds
 *                           were filtered out and never appeared at all
 *   'Build ' + e.build   -> "Build undefined"
 *   esc(e.note)          -> '' (esc maps null/undefined to empty)
 *
 * and the empty filter fell through to CHANGELOG.slice(0, 5), which rendered
 * five blank "Build undefined" cards. Anyone who had already seen build 576 —
 * everyone, it deployed — got exactly that.
 *
 * This runs the SHIPPED cr-cl-script against the SHIPPED CHANGELOG array. Not a
 * re-implementation: the module is sliced out of index.html and served, because
 * it reads localStorage and a data: document has no origin to read it from.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const APP = '/home/user/cardinal-inspections/index.html';
const src = fs.readFileSync(APP, 'utf8');
const a = src.indexOf('<script id="cr-cl-script">');
if (a < 0) throw new Error('cr-cl-script not found');
const mod = src.slice(src.indexOf('>', a) + 1, src.indexOf('</script>', a));
const KEY = (/var KEY\s*=\s*'([^']+)'/.exec(mod) || [])[1];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

/* the array holds both shapes — that is the premise, so assert it rather than
   assume it. If a later build normalises all 275 entries this gate can go. */
const arr = src.slice(src.indexOf('CHANGELOG = ['), src.indexOf('\n];', src.indexOf('CHANGELOG = [')));
const legacy = (arr.match(/\{\s*build:\d+/g) || []).length;
const modern = (arr.match(/\{\s*b:\d+/g) || []).length;

(async () => {
  ok('the storage key is readable from the module', !!KEY, String(KEY));
  ok('both entry shapes are present', legacy > 0 && modern > 0, `${legacy} legacy / ${modern} new`);

  const dir = fs.mkdtempSync('/tmp/h581-');
  fs.writeFileSync(path.join(dir, 'm.js'), mod);
  fs.writeFileSync(path.join(dir, 'i.html'),
    '<!doctype html><meta charset="utf-8"><body>' +
    '<div data-cr-footer>v2026-08-02 build 581</div><script src="m.js"></script>');
  const srv = http.createServer((rq, rs) => {
    const f = path.join(dir, rq.url === '/' ? 'i.html' : rq.url.slice(1));
    try {
      rs.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' });
      rs.end(fs.readFileSync(f));
    } catch (e) { rs.writeHead(404); rs.end(); }
  }).listen(0);
  const port = srv.address().port;

  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });

  const render = async ls => p.evaluate(({ ls, KEY }) => {
    localStorage.setItem(KEY, String(ls));
    document.querySelectorAll('.cr-cl-bg').forEach(n => n.remove());
    window.CardinalChangelog.show();
    return [...document.querySelectorAll('.cr-cl-entry')].map(e => ({
      head: e.querySelector('.cr-cl-build').textContent,
      body: e.querySelector('.cr-cl-desc').textContent,
    }));
  }, { ls, KEY });

  /* 1. no card is ever blank or undefined, at any lastSeen */
  for (const ls of [0, 400, 573, 576, 579, 580, 581, 9999]) {
    const r = await render(ls);
    const undef = r.filter(x => /undefined/.test(x.head));
    const blank = r.filter(x => !x.body.trim());
    ok(`lastSeen=${ls}: no "Build undefined" card`, undef.length === 0, undef.length + ' of ' + r.length);
    ok(`lastSeen=${ls}: every card has text`, blank.length === 0, blank.length + ' of ' + r.length);
  }

  /* 2. the seven new-shape builds actually reach the box */
  const from573 = await render(573);
  const nums = from573.map(x => parseInt(x.head.replace(/\D/g, ''), 10));
  ok('new-shape builds appear at all', nums.includes(580) && nums.includes(579),
     nums.slice(0, 8).join(','));
  ok('and legacy-shape builds still do', nums.includes(578) && nums.includes(577),
     nums.slice(0, 8).join(','));
  ok('newest first', nums.every((n, i) => i === 0 || nums[i - 1] >= n), nums.slice(0, 6).join(','));

  /* 3. the filter is a filter — a high lastSeen must narrow it */
  const wide = (await render(0)).length, narrow = (await render(580)).length;
  ok('a higher lastSeen shows fewer builds', narrow < wide, `${narrow} vs ${wide}`);
  ok('and never falls through to the blank-card path', narrow > 0, String(narrow));

  /* 4. the new shape renders BOTH its title and its summary — dropping either
        loses half the entry, which no count-based assertion would catch */
  const walk = (await render(578)).find(x => /580/.test(x.head));
  ok('a new-shape card carries its title', walk && /asks before it forgets/.test(walk.body),
     walk && walk.body.slice(0, 50));
  ok('and its summary', walk && /Rejecting a mark/.test(walk.body), walk && walk.body.slice(-40));

  await b.close();
  srv.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
