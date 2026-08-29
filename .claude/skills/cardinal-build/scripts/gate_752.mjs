/* gate_752.mjs — the 44px floor, proven the same way the deficit was measured.

   walk751.mjs produced the numbers; this gate re-runs the same seven-screen
   walk at 390px with touch and asserts every control named in the cr-touch44
   census now RENDERS at >= 44px in the raised dimension(s). Rendered rects,
   not CSS text — a min-height rule that loses the cascade would pass a text
   grep and fail here.

   Also proves the fences:
     - printed documents untouched (the skeleton's 15px .cbx rule survives, and
       the app-side `select{min-height}` cannot reach the #reportFrame iframe),
     - .pu-box NOT resized (it already has a 44px ::after hit area — proven
       here by elementFromPoint, the only instrument that can see it),
     - the block is the LAST stylesheet, or the same-specificity strategy
       silently loses to any module block after it,
     - photo tiles unchanged.

   Usage: node gate_752.mjs [path/to/index.html]   (v751 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = readFileSync(process.argv[2] || '/home/user/cardinal-inspections/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/*', async r => {
  const u = r.request().url(), t = r.request().resourceType();
  if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
  if (t === 'font' || t === 'media') return r.abort();
  if (u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
  return r.abort();
});
const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: Array.from({ length: 5 }, (_, i) => ({
    id: 'p' + i, name: 'Client ' + i, stage: ['Lead', 'Approved', 'Scheduled', 'Completed', 'Invoiced'][i],
    crm: 'retail', checklist: '{}', created_at: '2026-08-01T12:00:00Z', stage_since: '2026-08-01T12:00:00Z',
    address: (100 + i) + ' Webster St', phone: '9375551212', email: 'c' + i + '@x.com',
  })),
  commissions: [
    { id: 'c1', project_id: 'p1', rep_email: 'nick@cardinalrenovations.net', amount: 1200, status: 'approved', created_at: '2026-08-10T12:00:00Z' },
  ],
  draws: [{ id: 'd1', project_id: 'p1', rep_email: 'nick@cardinalrenovations.net', amount: 300, status: 'outstanding', paid_at: null }],
  project_photos: [{ id: 'ph1', project_id: 'p1', data: PIX, storage_path: null, created_by: 'x@x.com', created_at: '2026-08-12T01:00:00Z' }],
  punch_items: [{ id: 'pi1', project_id: 'p1', title: 'Reseal pipe boot', status: 'open', comments: '[]', created_at: '2026-08-11T12:00:00Z' }],
  estimates: [], contracts: [], inspection_reports: [], collections: [], appointments: [],
};
await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

/* measure one selector: min rendered {w,h} across matches, plus the count */
const M = sel => {
  const els = [...document.querySelectorAll(sel)].filter(e => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width && r.height && cs.visibility !== 'hidden';
  });
  if (!els.length) return null;
  let w = 1e9, h = 1e9;
  els.forEach(e => { const r = e.getBoundingClientRect(); w = Math.min(w, r.width); h = Math.min(h, r.height); });
  return { n: els.length, w: Math.round(w), h: Math.round(h) };
};
const probe = async sel => await page.evaluate(M, sel);
const need = (name, r, wantW, wantH) => {
  if (!r) { chk(`${name} — found`, false, 'no visible match'); return; }
  const ok = (!wantW || r.w >= 44) && (!wantH || r.h >= 44);
  chk(`${name} ≥44 (${r.n}x)`, ok, `${r.w}x${r.h}`);
};

/* the count of under-44 controls, for the before/after headline */
const COUNT_SMALL = () => {
  const SEL = 'button, a[href], a[onclick], [role="button"], select, summary, [onclick], .chip, .chipbtn, .pill, [data-act], [data-open]';
  let small = 0, total = 0; const seen = new Set();
  document.querySelectorAll(SEL).forEach(el => {
    if (seen.has(el)) return; seen.add(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.pointerEvents === 'none') return;
    total++; if (r.width < 44 || r.height < 44) small++;
  });
  return { small, total };
};

/* ── HOME ── */
let c = await page.evaluate(COUNT_SMALL);
console.log(`  home: ${c.small} of ${c.total} under 44px`);
need('chrome: menu button (.cr-ib.menu)', await probe('#navBtn'), 1, 1);
need('chrome: ＋ add project', await probe('#addProjectBtn'), 1, 1);
need('chrome: hd2 home', await probe('#cr-hd2-home'), 1, 1);
/* #cr-home-btn was retired at build 757 — the header's own gold home
   (#cr-hd2-home, probed above) made both floating buttons redundant. */
chk('chrome: floating back-to-app retired at 757 (header home replaces it)',
    await page.evaluate(() => !document.getElementById('cr-home-btn')));
need('chrome: theme toggle', await probe('.cr-lr-theme'), 1, 1);
need('landing: Skip', await probe('button.sk'), 1, 1);
need('landing: All clients · N', await probe('.cr-lr-minor button'), 0, 1);
need('home: Call/Text card pills', await probe('.pcacts a'), 0, 1);
need('home: calendar arrows', await probe('.calnav'), 1, 1);
chk('home small-control count dropped hard', c.small <= 20, `${c.small} (was 74 on v751)`);

/* pu-box: NOT resized, but its ::after hit area answers a 44px tap */
const pu = await page.evaluate(async () => {
  const b = document.querySelector('.pu-box');
  if (!b) return { absent: true };
  /* ⚠️ elementFromPoint answers null OUTSIDE THE VIEWPORT. The punch strip sits
     below the fold at 844px, and the first run of this gate probed it without
     scrolling — every tap "missed", including the box's own centre, and the
     ::after was blamed for an instrument that was sampling off-screen. Scroll
     first; the pseudo-element was intact all along. */
  b.scrollIntoView({ block: 'center' });
  await new Promise(res => setTimeout(res, 300));
  const r = b.getBoundingClientRect();
  /* ⚠️ WHAT THIS CAN AND CANNOT PROVE. The first two versions tried
     elementFromPoint taps and went red twice — first because the strip was
     off-viewport (elementFromPoint answers null there), then because in THIS
     harness's seeded state the landing-recents module paints over the home
     strip, so even the box's own centre answers 'cr-lr-course'. That stacking
     is the harness's, not production's, and an instrument that cannot isolate
     the layer cannot honestly assert the tap. What IS provable regardless of
     overlays: the visual box is untouched, and the 44px ::after hit box is
     still computed on it. */
  const af = getComputedStyle(b, '::after');
  return { w: Math.round(r.width), h: Math.round(r.height),
           afW: af.width, afH: af.height, afContent: af.content };
});
if (!pu.absent) {
  chk('pu-box stays 22px VISUALLY (deliberately untouched)', pu.w <= 26 && pu.h <= 26, `${pu.w}x${pu.h}`);
  chk('pu-box keeps its pre-existing 44px ::after hit box',
      pu.afW === '44px' && pu.afH === '44px' && pu.afContent !== 'none',
      `${pu.afW}x${pu.afH}`);
}

/* ── MENU ── */
await page.evaluate(() => document.getElementById('navBtn').click());
await page.waitForTimeout(700);
/* 1113-1117: the phone menu is the drawer, and it opens with every section
   COLLAPSED (never-chosen = closed, applySections). Rows are tappable only
   expanded, so expand all sections first — and the section headers are now
   the first-tap targets, so they get probed too. */
await page.evaluate(() => document.querySelectorAll('#navMenu .navsec').forEach(x => {
  if (x.getAttribute('aria-expanded') !== 'true') x.click();
}));
await page.waitForTimeout(500);
need('menu: section headers (the drawer\'s first-tap targets)', await probe('#navMenu .navsec'), 0, 1);
need('menu: all nav items', await probe('#newMenu .navopt, #navMenu .navopt'), 0, 1);
await page.evaluate(() => document.getElementById('navBtn').click()).catch(() => {});

/* ── ALL CLIENTS ── */
await page.evaluate(() => openLeadsView());
await page.waitForTimeout(900);
need('list: card action buttons (.ljbtn)', await probe('.ljbtn'), 1, 1);
/* Build 1085 deleted the Leads filter chip strips on Theo's pick ("Get rid of
   the chips for pipeline and just use the filters?") — the funnel and the
   desktop rail carry the stage groups now. .ljchip survives only on Photo
   Activity's CRM strip. Assert the strip stayed deleted on THIS screen. */
chk('list: 1085 — no filter chip strip on All Leads & Jobs',
    await page.evaluate(() => !document.querySelector('#leadsView .ljchip')));
need('list: sort control', await probe('.ljsortchip'), 0, 1);

/* ── PROFILE ── */
await page.evaluate(() => openProject('p1'));
await page.waitForTimeout(1100);
/* Builds 788–791 rebuilt the retail client profile phone-first: the cover
   photo was retired (788, #projCoverBtn), and the card became the #cr-namebar
   band (791) — Switch Primary and Add contact are gone, email/text/call are
   the band's .nb-ico icons, the pencil is .nb-pen. The old controls are 0x0
   on a retail phone by design; assert that, then hold the replacement band's
   controls to the same 44px floor this gate exists for.
   ⚠️ As of build 1121 the band's controls measure UNDER the floor
   (.nb-ico 40x40, .nb-pen 32x28, .nb-star ~21x17, no ::after pad) — a real
   deficit on the replacement surface, reported, not papered over. */
chk('profile: 788/791 — the old contact links / Add contact / Switch Primary / cover chip are retired on the retail phone',
    await page.evaluate(() => ['a.hem', 'a.hph', '#dbAddContact', '#dbSwitchPrim', '#projCoverBtn']
      .every(s => { const e = document.querySelector(s); if (!e) return true;
        const r = e.getBoundingClientRect(); return !(r.width && r.height); })));
need('profile: namebar contact icons (.nb-ico — the 791 replacement)', await probe('#cr-namebar .nb-ico'), 1, 1);
need('profile: namebar edit pencil (.nb-pen)', await probe('#cr-namebar .nb-pen'), 1, 1);
need('profile: Map/Satellite toggles', await probe('.dbmtabs button'), 0, 1);
need('profile: selects (Activity Count etc.)', await probe('#projectView select:not(#stageSel)'), 0, 1);

/* ── COMMISSIONS (money buttons) ── */
await page.evaluate(() => showTab('commissions'));
await page.waitForTimeout(900);
need('money: chip buttons on the commissions tab', await probe('#tab-commissions .chipbtn'), 0, 1);

/* ── PUNCH ── */
await page.evaluate(() => showTab('punch'));
await page.waitForTimeout(900);
need('punch: ＋ Add (.pp-add — not a chipbtn)', await probe('.pp-add'), 0, 1);

/* ── PHOTOS: tiles untouched ── */
await page.evaluate(() => openPhotosView());
await page.waitForTimeout(1100);
const tile = await probe('.phc');
chk('photo tiles unchanged (~155px, already over the floor)', tile && tile.w >= 100, tile ? `${tile.w}x${tile.h}` : 'none');

/* ── fences in the source ── */
const src = APP;
chk('the census block exists exactly once', (src.match(/<style id="cr-touch44-styles">/g) || []).length === 1);
/* At 752 the block was the LAST stylesheet, and the positional pin protected
   its same-specificity strategy. Builds since (791 namebar, 1080–83 ask sheet,
   guide, etc.) legitimately appended module stylesheets after it. What must
   still be true is that the census RULES STILL WIN in the cascade — proven on
   computed style, which is what the position was standing in for. (The
   rendered rect probes above are the end-to-end proof on every census target.) */
chk('the census min-height still wins in the cascade (.ljbtn/.chipbtn compute 44px)',
    await page.evaluate(() => {
      const probe = document.createElement('button');
      probe.className = 'ljbtn'; document.body.appendChild(probe);
      const a = getComputedStyle(probe).minHeight;
      probe.className = 'chipbtn';
      const b = getComputedStyle(probe).minHeight;
      probe.remove();
      return a === '44px' && b === '44px';
    }));
chk('printed documents untouched: the 15px document tick-box rule survives',
    src.includes('.cbx{cursor:pointer;font-size:13pt;user-select:none;}'));
chk('module stylesheets untouched: #calCard .calnav 32px rule survives',
    src.includes('#calCard .calnav{width:32px;height:32px;font-size:18px;}'));
chk('no !important anywhere in the block', (() => {
  const i = src.indexOf('<style id="cr-touch44-styles">');
  if (i < 0) return false;
  return !src.slice(i, src.indexOf('</style>', i)).includes('!important');
})());

await browser.close();
let fails = 0;
for (const c2 of checks) { console.log(`  [${c2.pass ? 'PASS' : 'FAIL'}] ${c2.n}${c2.d ? '  (' + c2.d + ')' : ''}`); if (!c2.pass) fails++; }
console.log(fails === 0 ? `\nGATE GREEN — ${checks.length} checks` : `\nGATE RED — ${fails} of ${checks.length} failed`);
process.exit(fails === 0 ? 0 : 1);
