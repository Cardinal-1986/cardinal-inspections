/* render_leads.mjs — the All Leads & Jobs screen, seeded with THEO'S OWN
   distribution, rendered as a picture.

   ⚠ THE MOCK UNDERSTATES THIS SCREEN AND THAT IS THE WHOLE POINT.
   e2e_mock_supa.js seeds a handful of projects, so the chip strips come out at
   7 chips / 2 rows and the screen reads as merely tight. Theo's book is 57
   projects across 7 stages and 6 reps, which is 8 + 8 = 16 chips and SIX rows.
   Measuring the mock would have said "2 rows, fine" and closed the report.

   Read from production (project yipslubcptjoarblzbpl) on 26 Aug 2026:
     stage  Lead 37 · Prospect 10 · Approved 5 · Completed 2 · Closed 1 ·
            Invoiced 1 · OnHold 1                       -> All + 7 = 8 chips
     rep    unassigned 18 · theo 14 · joey 13 · clarkie 8 · nick 2 ·
            curtis 1 · jerry 1                          -> All + 7 = 8 chips
   That is exactly the 8 + 8 in his screenshot.

   usage:
     node render_leads.mjs <file.html> <out.png> [390x844] [variantFile.js]
*/
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const OUT  = process.argv[3] || '/tmp/leads.png';
const [VW, VH] = (process.argv[4] || '390x844').split('x').map(Number);
const VARIANT = process.argv[5];

/* the real distribution, as counts */
const STAGES = [['Lead',37],['Prospect',10],['Approved',5],['Completed',2],['Closed',1],['Invoiced',1],['OnHold',1]];
const REPS   = [[null,18],['theo@cardinalrenovations.net',14],['joey@cardinalrenovations.net',13],
                ['clarkie022@gmail.com',8],['nick@cardinalrenovations.net',2],
                ['curtis@cardinalrenovations.net',1],['jerry@cardinalrenovations.net',1]];

const SEED = ([stages, reps]) => {
  /* Build 57 rows whose stage and rep marginals match production. The pairing
     between the two is arbitrary — only the DISTINCT VALUE COUNT drives the
     chip strips, which is what is being measured. */
  const stageList = [], repList = [];
  stages.forEach(([s, n]) => { for (let i = 0; i < n; i++) stageList.push(s); });
  reps.forEach(([r, n]) => { for (let i = 0; i < n; i++) repList.push(r); });
  const NAMES = ['Kimberly Guy','Robert Hines','Maria Alvarez','Dwight Carter','Angela Boyd',
    'Terrence Fields','Nadia Okafor','Samuel Reyes','Priya Raman','Lloyd Stubbs','Erica Mendez',
    'Curtis Vandermeer','Bethany Cole','Omar Haddad','Rosalind Pike','Vincent Trapp'];
  const rows = stageList.map((stg, i) => {
    const rep = repList[i % repList.length];
    const ck = { lead: rep ? { assigned: [rep] } : {}, job_category: 'Roofing', priority: 'Normal' };
    return {
      id: 'p' + i, name: NAMES[i % NAMES.length] + (i > 15 ? ' ' + (i - 15) : ''),
      address: (100 + i) + ' Wayne Ave, Dayton OH', phone: '9375550' + String(100 + i).slice(-3),
      email: '', stage: stg, sales_rep: rep || '',
      stage_since: new Date(Date.now() - (i * 3 + 2) * 86400000).toISOString(),
      created_at: new Date(Date.now() - (i * 5 + 9) * 86400000).toISOString(),
      checklist: JSON.stringify(ck),
    };
  });
  window.cacheProjects = rows;
  window.renderLeadsView();
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto('file://' + process.cwd() + '/' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const names = await p.evaluate('(window.__sentinelStates||[]).map(s=>s.name)');
await p.evaluate('Promise.resolve(window.__sentinelStates[' + names.indexOf('leads') + '].run())');
await p.waitForTimeout(900);
await p.evaluate(SEED, [STAGES, REPS]);
await p.waitForTimeout(500);
if (VARIANT && existsSync(VARIANT)) { await p.evaluate(readFileSync(VARIANT, 'utf8')); await p.waitForTimeout(500); }

const m = await p.evaluate(() => {
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; };
  const strip = id => { const el = document.getElementById(id); if (!vis(el)) return null;
    const kids = [...el.children].filter(vis);
    return { chips: kids.length, rows: new Set(kids.map(k => Math.round(k.getBoundingClientRect().top))).size,
             h: Math.round(el.getBoundingClientRect().height) }; };
  const L = document.getElementById('ljList');
  const row = L ? [...L.children].find(vis) : null;
  return { stage: strip('ljStageChips'), rep: strip('ljRepChips'),
    firstRowY: row ? Math.round(row.getBoundingClientRect().top + scrollY) : null,
    cards: L ? L.children.length : 0,
    sideScroll: document.documentElement.scrollWidth > innerWidth + 1 };
});
console.log(JSON.stringify(m));
/* ⚠ p.screenshot() HANGS on this screen and it is not a slow render — the app
   runs standing rAF clocks, so Playwright's stability wait never settles. CDP
   captures the frame as-is and does not wait for anything. */
const cdp = await p.context().newCDPSession(p);
const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
await b.close();
