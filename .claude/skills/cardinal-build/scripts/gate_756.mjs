/* gate_756.mjs — the header follows you onto the tool screens, and Home means
   YOUR CRM's home.

   Theo, from the Insurance Claims screen: "Can you make the header follow the
   claims page. Also the home icon on the top right takes you to retail home.
   Can you also have it follow the same crm language."

   What this proves, for ALL FIVE module mounts, at 390px AND 1194px:
     1. The header is visible AND its home button is HIT-TESTABLE while the tool
        screen is open — elementFromPoint at the button's centre must resolve to
        the button, not to whatever is painted over it. (A rect-only test passes
        on the broken build: the header is in the layout, just covered.)
     2. The mount starts BELOW the header, not at y=0.
     3. The header still carries the CRM: data-crm-head stays 'insurance'.
     4. Tapping the header home from the tool screen goes to Cardinal Truth AND
        CLOSES the tool screen. On v755 it went to Truth and left the panel open
        on top — at both widths.
     5. The mounts' own floating Home button (#cr-pme-exit-btn, the one Theo
        tapped) goes to Cardinal Truth, not the retail dashboard.
     6. #cr-home-btn likewise.
     7. Community: the same two home controls land on the Community hub.
     8. Retail regression: both still land on the retail dashboard.
     9. The floating button no longer overlaps the header.

   Structured bail-outs, not crashes (BUG_CLASSES 37): every page.evaluate is
   wrapped so the v755 control REPORTS red instead of throwing.

   Usage: node gate_756.mjs [path/to/index.html]     (v755 = negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const ck = t => JSON.stringify({ lead: { claim_type: t } });
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    { id: 'i1', name: 'Adam Gunn', stage: 'Prospect', crm: 'insurance', checklist: ck('insurance'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'c1', name: 'Habitat Job', stage: 'Approved', crm: 'community', checklist: ck('community'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
    { id: 'r1', name: 'Retail One', stage: 'Lead', crm: 'retail', checklist: ck('retail'), created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z' },
  ],
  insurance_claims: [{ id: 'cl1', project_id: 'i1', carrier: 'Allstate', claim_number: '0802889162', status: 'filed', rcv: 22397.63, acv: 0, created_by: 'theo@cardinalrenovations.net', created_at: '2026-08-01T12:00:00Z' }],
  pricing_items: [], adjusters: [], community_partners: [],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
  project_photos: [], punch_items: [], commissions: [], draws: [],
};

const MOUNTS = {
  'cr-claims-mount':    `window.crOpenClaims()`,
  'cr-pricing-mount':   `window.crOpenPricing()`,
  'cr-estimates-mount': `window.crOpenEstimates()`,
  'cr-coach-mount':     `window.CardinalCoach && window.CardinalCoach.open()`,
  'cr-adjusters-mount': `window.CardinalAdjusters && window.CardinalAdjusters.open()`,
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function session(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: width < 500, hasTouch: width < 500 });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
    if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (t === 'font' || t === 'media') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  const go = async (code, ms) => { try { await page.evaluate(code); } catch (e) {} await page.waitForTimeout(ms || 850); };
  const probe = async code => { try { return await page.evaluate(code); } catch (e) { return { __err: String(e).split('\n')[0].slice(0, 90) }; } };
  await go(`(() => { const c = document.querySelector('.cr-lr-course'); if (c) c.click(); else if (window.showHome) showHome(); })()`);
  return { page, ctx, go, probe };
}

const STATE = id => `(() => {
  const vis = e => { if (!e) return false; const cs = getComputedStyle(e);
    return e.getClientRects().length > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const m = document.getElementById('${id}');
  const hd = document.querySelector('header.site');
  const home = document.getElementById('cr-hd2-home');
  const hb = home ? home.getBoundingClientRect() : null;
  /* ⚠️ HIT TEST, not a rect: on the broken build the header is laid out exactly
     where it is now, just painted under the mount. */
  const at = hb ? document.elementFromPoint(Math.round(hb.left + hb.width / 2), Math.round(hb.top + hb.height / 2)) : null;
  const exit = document.getElementById('cr-pme-exit-btn');
  const er = exit ? exit.getBoundingClientRect() : null;
  const hr = hd ? hd.getBoundingClientRect() : null;
  return {
    mountShown: vis(m), mountTop: m ? Math.round(m.getBoundingClientRect().top) : null,
    mountZ: m ? getComputedStyle(m).zIndex : null,
    headerShown: vis(hd), headerBottom: hr ? Math.round(hr.bottom) : null,
    homeHitTestable: !!(at && at.closest && at.closest('#cr-hd2-home')),
    topmostAtHome: at ? (at.tagName.toLowerCase() + (at.id ? '#' + at.id : '')) : null,
    head: document.body.dataset.crmHead || '(unset)',
    exitShown: vis(exit), exitTop: er ? Math.round(er.top) : null,
    truth: vis(document.getElementById('cardinalTruthView')),
    hub: vis(document.getElementById('communityHubView')),
    main: vis(document.getElementById('mainView')),
  };
})()`;

for (const width of [390, 1194]) {
  const { page, ctx, go, probe } = await session(width);
  const tag = `${width}px`;

  for (const [id, opener] of Object.entries(MOUNTS)) {
    await go(`window.showCardinalTruth()`, 700);
    await go(opener, 1200);
    const s = await probe(STATE(id));
    if (s.__err) { chk(`${tag} ${id}: harness ran`, false, s.__err); continue; }
    chk(`${tag} ${id}: opens`, s.mountShown);
    chk(`${tag} ${id}: THE HEADER'S HOME IS HIT-TESTABLE`, s.homeHitTestable, `topmost=${s.topmostAtHome}`);
    chk(`${tag} ${id}: the mount starts below the header`, s.mountTop !== null && s.headerBottom !== null && s.mountTop >= s.headerBottom - 1, `mountTop=${s.mountTop} headerBottom=${s.headerBottom}`);
    chk(`${tag} ${id}: the header still reads insurance`, s.head === 'insurance', s.head);
    if (s.exitShown) chk(`${tag} ${id}: the floating Home clears the header`, s.exitTop >= s.headerBottom - 1, `exitTop=${s.exitTop} headerBottom=${s.headerBottom}`);
    /* the header home must go to Truth AND close the tool screen */
    await go(`document.getElementById('cr-hd2-home').click()`, 1000);
    const a = await probe(STATE(id));
    chk(`${tag} ${id}: header home -> Cardinal Truth`, a.truth && !a.main, JSON.stringify({ truth: a.truth, main: a.main }));
    chk(`${tag} ${id}: AND CLOSES THE TOOL SCREEN`, !a.mountShown, `stillOpen=${a.mountShown}`);
  }

  /* Build 757 ("one Home button, not three") RETIRED the two floating home
     controls this section used to click — #cr-pme-exit-btn and #cr-home-btn.
     The surviving control is the header's gold house, and what 756 proved
     (Home means YOUR CRM, and it closes the panel) is asserted through it. */
  chk(`${tag} 757: the floating exit button is gone`,
      await page.evaluate(`!document.getElementById('cr-pme-exit-btn')`));
  chk(`${tag} 757: the floating #cr-home-btn is gone`,
      await page.evaluate(`!document.getElementById('cr-home-btn')`));

  await go(`window.showCardinalTruth()`, 700);
  await go(`window.crOpenClaims()`, 1200);
  await go(`document.getElementById('cr-hd2-home').click()`, 1200);
  const ex = await probe(STATE('cr-claims-mount'));
  chk(`${tag} Home from the claims mount -> Cardinal Truth (the reported bug)`, ex.truth && !ex.main, JSON.stringify({ truth: ex.truth, main: ex.main, head: ex.head }));
  chk(`${tag} …and the panel is closed`, !ex.mountShown);

  /* community */
  await go(`window.CardinalCommunityHub.show()`, 1000);
  await go(`window.crOpenClaims()`, 1200);
  await go(`document.getElementById('cr-hd2-home').click()`, 1200);
  const cm = await probe(STATE('cr-claims-mount'));
  chk(`${tag} COMMUNITY: Home from the mount -> the Community hub`, cm.hub && !cm.main, JSON.stringify({ hub: cm.hub, main: cm.main }));

  /* retail regression */
  await go(`window.showHome()`, 900);
  await go(`window.crOpenClaims()`, 1200);
  await go(`document.getElementById('cr-hd2-home').click()`, 1200);
  const rt = await probe(STATE('cr-claims-mount'));
  chk(`${tag} RETAIL: Home from the mount still -> the retail dashboard`, rt.main && !rt.truth, JSON.stringify({ main: rt.main, truth: rt.truth }));
  chk(`${tag} RETAIL: and the panel closes`, !rt.mountShown);

  await page.close();
  await ctx.close();
}

/* ── source guards ── */
const src = APP;
chk('one home ladder in the file: goHome()', (src.match(/function goHome\(\)\{/g) || []).length === 1);
chk('goHome is exported on CardinalHeader', src.includes('goHome  : goHome,'));
/* 3 at build 756; build 757 retired one caller with its floating button. */
chk('two home controls route through it (757 retired the third)', (src.match(/window\.CardinalHeader\.goHome\(\)/g) || []).length === 2, (src.match(/window\.CardinalHeader\.goHome\(\)/g) || []).length);
chk('cr-mounthead-styles present', src.includes('<style id="cr-mounthead-styles">'));
/* the LAST-stylesheet positional pin is retired: later builds legitimately
   appended module stylesheets (791 namebar, 1080–83 ask sheet, …); the
   cascade-win proof lives in gate_752 now. What must still hold here is
   that the block exists exactly once. */
chk('cr-touch44 block still present exactly once', (src.match(/<style id="cr-touch44-styles">/g) || []).length === 1);
chk('the desktop lnav rule is untouched', src.includes('body.cr-lnav-on #cr-estimates-mount,\nbody.cr-lnav-on #cr-pricing-mount,\nbody.cr-lnav-on #cr-claims-mount{'));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
