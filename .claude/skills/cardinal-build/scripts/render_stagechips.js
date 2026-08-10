/* render_stagechips.js — build 690 gate.
   Exercises the SHIPPED renderLeadsView()/ljMatches()/ljGroupCounts() against
   real project shapes: seeds window.cacheProjects, renders, then CLICKS the
   chips and checks the card list actually changes. Structure alone would not
   prove a filter works.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_stagechips.js [index.html]
   Point it at 689 as the negative control — the strip does not exist there.   */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

// real shape: normStage(p.stage), parseCkAll(p) reads p.checklist, rptRepName(p.created_by)
const mk = (id, stage, name) => ({
  id: 'p' + id, name: name, address: id + ' Main St, Dayton OH', stage: stage,
  created_by: 'joey@cardinalrenovations.net', updated_at: '2026-08-01T12:00:00Z',
  created_at: '2026-07-01T12:00:00Z', checklist: JSON.stringify({ po: 1000 + id, priority: 'Normal' })
});
const SEED = [];
const DIST = { Lead: 5, Prospect: 3, OnHold: 2, Approved: 2, Scheduled: 1, Completed: 1, Invoiced: 1, Closed: 1, Lost: 1 };
let n = 0;
for (const st of Object.keys(DIST)) for (let i = 0; i < DIST[st]; i++) SEED.push(mk(++n, st, st + ' client ' + i));
const TOTAL = SEED.length;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');

  for (const [tname, theme] of [['dark', null], ['light', 'rb-light']]) {
    const p = await br.newPage({ viewport: { width: 430, height: 900 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    p.on('pageerror', () => {});
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(700);

    const R = await p.evaluate(({ seed, theme, total }) => {
      if (theme) document.documentElement.setAttribute('data-theme', theme);
      const out = { fatal: null };
      try {
        if (typeof renderLeadsView !== 'function') { out.fatal = 'renderLeadsView is not a function'; return out; }
        window.cacheProjects = seed;
        if (window.ljState) { ljState.sets = {}; }
        const lv = document.getElementById('leadsView');
        if (lv) lv.style.setProperty('display', 'block', 'important');
        renderLeadsView();

        const strip = document.getElementById('ljStageChips');
        out.exists = !!strip;
        if (!strip) return out;
        const chips = () => Array.from(strip.querySelectorAll('.ljchip'));
        const cards = () => document.querySelectorAll('#ljList .ljcard').length;

        out.chipCount = chips().length;
        out.labels = chips().map(c => c.textContent.trim());
        out.allOnAtRest = chips()[0].classList.contains('on');
        out.dots = chips().slice(1).every(c => {
          const i = c.querySelector('i');
          return i && getComputedStyle(i).backgroundColor !== 'rgba(0, 0, 0, 0)';
        });
        out.cardsAtRest = cards();

        // click "Lead"
        const lead = chips().find(c => c.getAttribute('data-v') === 'Lead');
        lead.click();
        out.afterLead = cards();
        out.leadChipOn = Array.from(document.querySelectorAll('#ljStageChips .ljchip'))
          .find(c => c.getAttribute('data-v') === 'Lead').classList.contains('on');
        out.allOffNow = !document.querySelector('#ljStageChips .ljchip[data-all]').classList.contains('on');
        out.stateAfterLead = (window.ljState.sets.stage || []).slice();

        // click "Prospect" too — multi-select
        document.querySelector('#ljStageChips .ljchip[data-v="Prospect"]').click();
        out.afterBoth = cards();
        out.stateAfterBoth = (window.ljState.sets.stage || []).slice();

        // the DESKTOP RAIL must show the same thing (one source of truth)
        const railLead = document.querySelector('#ljRailMount input[data-g="stage"][value="Lead"]');
        out.railInSync = !!(railLead && railLead.checked);

        // untoggle Lead
        document.querySelector('#ljStageChips .ljchip[data-v="Lead"]').click();
        out.afterUntoggle = cards();

        // "All" clears
        document.querySelector('#ljStageChips .ljchip[data-all]').click();
        out.afterAll = cards();
        out.stateAfterAll = window.ljState.sets.stage === undefined;

        // contrast of a resting chip and a selected one
        const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
                           return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
        const px = s => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s); return m ? [+m[1],+m[2],+m[3]] : null; };
        const rat = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((q, w) => w - q); return +((x+0.05)/(y+0.05)).toFixed(2); };
        const c0 = document.querySelector('#ljStageChips .ljchip[data-v="Lead"]');
        out.restRatio = rat(px(getComputedStyle(c0).color), px(getComputedStyle(c0).backgroundColor));
        c0.click();
        const c1 = document.querySelector('#ljStageChips .ljchip[data-v="Lead"]');
        out.onRatio = rat(px(getComputedStyle(c1).color), px(getComputedStyle(c1).backgroundColor));
        // leave it clean
        document.querySelector('#ljStageChips .ljchip[data-all]').click();
      } catch (e) { out.fatal = String(e).slice(0, 200); }
      return out;
    }, { seed: SEED, theme, total: TOTAL });

    console.log(`\n── ${tname} ──`);
    if (R.fatal) { fail++; console.log('  FAIL fatal: ' + R.fatal); await p.close(); continue; }
    ok(R.exists, 'the stage strip is mounted');
    ok(R.chipCount === 10, `one chip per stage present + All (got ${R.chipCount}, want 10)`);
    ok(R.allOnAtRest, 'All is the resting selection');
    ok(R.dots, 'every stage chip carries a colour dot');
    ok(R.cardsAtRest === TOTAL, `all ${TOTAL} jobs show at rest (got ${R.cardsAtRest})`);
    ok(R.afterLead === 5, `tapping Lead narrows to its 5 (got ${R.afterLead})`);
    ok(R.leadChipOn, 'the tapped chip shows as selected');
    ok(R.allOffNow, 'All stops being the selection once a stage is picked');
    ok(JSON.stringify(R.stateAfterLead) === '["Lead"]', `it writes ljState.sets.stage (got ${JSON.stringify(R.stateAfterLead)})`);
    ok(R.afterBoth === 8, `a second tap ADDS rather than replaces — Lead+Prospect = 8 (got ${R.afterBoth})`);
    ok(R.railInSync, 'the desktop rail checkbox reflects the same set — one source of truth');
    ok(R.afterUntoggle === 3, `tapping a selected chip removes it (got ${R.afterUntoggle}, want Prospect's 3)`);
    ok(R.afterAll === TOTAL, `All clears back to ${TOTAL} (got ${R.afterAll})`);
    ok(R.stateAfterAll, 'All deletes the key so the filter badge stops counting it');
    ok(R.restRatio >= 4.5, `resting chip text reads (${R.restRatio}:1)`);
    ok(R.onRatio >= 4.5, `selected chip text reads (${R.onRatio}:1)`);
    await p.close();
  }

  await br.close();
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
