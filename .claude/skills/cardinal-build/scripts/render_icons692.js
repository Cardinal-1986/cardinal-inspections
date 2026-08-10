/* render_icons692.js — build 692 gate.

   Drives the four surfaces that swapped emoji for drawn glyphs and proves the
   glyphs actually PAINT.  Structure is not enough here: ICO() swallows its own
   error and returns '', so a broken icon call renders an empty row that no
   markup assertion would notice.  Every icon is therefore checked for a
   non-zero bounding box and a resolved stroke colour, in both themes.

   It also checks the opposite direction — that no emoji survived — because a
   sweep that adds icons beside the emoji it was meant to replace looks correct
   in a screenshot of a single row.

   Usage:  NODE_PATH=<scratchpad>/node_modules node render_icons692.js [index.html]
   Point it at 691 as the negative control: the icons do not exist there and
   the emoji do, so it must go RED in both directions.                        */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

// the 15 drawn for 692 + the 9 existing ones these surfaces reuse
const NEW15 = ['page', 'books', 'pencil', 'scales', 'bulb', 'factory', 'trophy', 'cards',
  'camera', 'image', 'paperclip', 'compass', 'calculator', 'houses', 'funnel'];
const REUSED = ['target', 'home', 'shield', 'calendar', 'person', 'clipboard', 'people', 'chart', 'bolt'];

// every codepoint the patch removed, so the survivor check names what it wants
const GONE = [0x1F3AF, 0x1F4C7, 0x1F3C6, 0x1F4DD, 0x1F3E0, 0x2696, 0x1F4A1, 0x1F4C4,
  0x1F3ED, 0x1F4DA, 0x1F4F7, 0x1F5BC, 0x1F6E1, 0x1F4C5, 0x1F4CE, 0x1F9ED, 0x1F464,
  0x1F4CB, 0x1F9EE, 0x2632, 0x1F465, 0x1F4CA, 0x26A1, 0x1F3D8];

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');

  for (const [tname, theme] of [['dark', null], ['light', 'rb-light']]) {
    const p = await br.newPage({ viewport: { width: 430, height: 900 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    p.on('pageerror', () => {});
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);

    const R = await p.evaluate(({ new15, reused, gone, theme }) => {
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      const out = { fatal: null, opened: {}, icons: {}, emoji: {}, sized: 0, unsized: [], inked: 0, uninked: [] };
      try {
        // 1. every name resolves to real SVG markup
        const names = window.CardinalIcons ? window.CardinalIcons.names() : [];
        out.total = names.length;
        out.missing = new15.concat(reused).filter(n => names.indexOf(n) === -1);
        out.empty = new15.concat(reused).filter(n => {
          const g = window.CardinalIcons.get(n);
          return !g || g.indexOf('<path') === -1 && g.indexOf('<rect') === -1 && g.indexOf('<circle') === -1;
        });

        // 2. drive each surface.
        //    The host must be the container the SWEPT MODULE OWNS, not the
        //    whole view: cardinalTruthView also hosts panels from cr-cct,
        //    cr-ctfx and the static markup, which still carry their own emoji
        //    and are not part of this build.  Scoping to the view reported
        //    four survivors (📝🏠📎📋) that are provably absent from
        //    cr-cth-script — the assertion was wrong, not the sweep.
        const drive = {
          sf:  () => { window.CardinalSalesFloor.open();
                       return document.querySelectorAll('.cr-sf-coach, .cr-sf-links'); },
          ci:  () => { window.CardinalImport.open();
                       return document.querySelectorAll('#cr-ci .box, .cr-ci .box'); },
          cth: () => { const v = document.getElementById('cardinalTruthView');
                       if (v) v.style.setProperty('display', 'block', 'important');
                       window.CardinalTruthHome.refresh();
                       return document.querySelectorAll('.cr-cth-tools'); },
          // communityHubView is built by navigation, not by static markup, so
          // render() returns early without it. show() is the door the app uses.
          ch2: () => { try { window.CardinalCommunityHub.show(); } catch (_) {}
                       if (!document.getElementById('communityHubView')) {
                         const v = document.createElement('div');
                         v.id = 'communityHubView';
                         document.body.appendChild(v);
                       }
                       window.CardinalCommunityHome.render();
                       return document.querySelectorAll('#cr-ch2 .tools, #cr-ch2 .cc-bar'); },
        };
        const owned = [];
        for (const k of Object.keys(drive)) {
          let hosts = null;
          try { hosts = drive[k](); } catch (e) { out.opened[k] = 'threw: ' + String(e).slice(0, 90); continue; }
          if (!hosts || !hosts.length) { out.opened[k] = 'no host'; continue; }
          out.opened[k] = 'ok';
          let n = 0, txt = '';
          hosts.forEach(function (h) {
            n += h.querySelectorAll('svg.cri').length;
            txt += h.textContent || '';
            h.querySelectorAll('svg.cri').forEach(s => owned.push(s));
          });
          out.icons[k] = n;
          const left = [];
          for (const cp of gone) if (txt.indexOf(String.fromCodePoint(cp)) !== -1) left.push(cp.toString(16));
          out.emoji[k] = left;
        }

        // 3. every icon on these surfaces must have a box and an ink — an
        //    ICO() that returned '' leaves nothing, and nothing has no box.
        //    Measure only the icons these four surfaces own and only while
        //    they are on screen: a document-wide sweep also picks up the nav
        //    menu's 686 icons, which are display:none and legitimately 0x0.
        owned.forEach(function (s) {
          if (!s.getClientRects().length) return;   // not on screen right now
          const r = s.getBoundingClientRect();
          if (r.width > 4 && r.height > 4) out.sized++;
          else out.unsized.push(Math.round(r.width) + 'x' + Math.round(r.height));
          const st = getComputedStyle(s).stroke;
          if (st && st !== 'none' && st !== 'rgba(0, 0, 0, 0)') out.inked++;
          else out.uninked.push(st);
        });
        out.rendered = owned.length;
        out.visible = out.sized + out.unsized.length;
      } catch (e) { out.fatal = String(e).slice(0, 200); }
      return out;
    }, { new15: NEW15, reused: REUSED, gone: GONE, theme });

    console.log(`\n── ${tname} ──`);
    if (R.fatal) { fail++; console.log('  FAIL fatal: ' + R.fatal); await p.close(); continue; }

    /* A FLOOR, not an equality. This said `=== 43` and went red the moment 695
       added four more — the app was right and the gate was wrong, which is the
       hardcoded-count class that produced ten false reds in one session at 630.
       What 692 actually cares about is that its own fifteen exist and resolve,
       and the two assertions below check exactly that. */
    ok(R.total >= 43, `CardinalIcons carries at least the 43 present at 692 (got ${R.total})`);
    ok(R.missing.length === 0, `every name these screens ask for exists (missing: ${R.missing.join(',') || 'none'})`);
    ok(R.empty.length === 0, `every one of them returns real path data (empty: ${R.empty.join(',') || 'none'})`);

    for (const k of ['sf', 'ci', 'cth', 'ch2']) {
      ok(R.opened[k] === 'ok', `${k}: the surface opens (${R.opened[k]})`);
      if (R.opened[k] !== 'ok') continue;
      ok((R.icons[k] || 0) > 0, `${k}: drawn icons present (${R.icons[k]})`);
      ok((R.emoji[k] || []).length === 0,
        `${k}: no swept emoji survived in the rendered text (${(R.emoji[k] || []).join(',') || 'none'})`);
    }

    ok(R.rendered >= 30, `at least 30 icons on the four surfaces (got ${R.rendered})`);
    ok(R.visible > 0, `at least some of them are actually on screen to measure (got ${R.visible})`);
    ok(R.unsized.length === 0,
      `every on-screen icon has a real box — an ICO() that returned '' would not (bad: ${R.unsized.slice(0, 4).join(' ') || 'none'})`);
    ok(R.uninked.length === 0,
      `every on-screen icon takes an ink from currentColor (bad: ${R.uninked.slice(0, 3).join(' ') || 'none'})`);

    await p.close();
  }

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
