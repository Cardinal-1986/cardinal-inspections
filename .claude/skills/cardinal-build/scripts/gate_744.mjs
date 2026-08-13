/* gate_744.mjs — a date-only column stops displaying one day early.

   TWO assertions earn this build, and the second matters more than the first:

     1. A bare "2026-08-15" renders as Aug 15, not Aug 14, in a US timezone.
     2. crDate IS A DROP-IN. For every input that is NOT a bare YYYY-MM-DD it must
        return exactly what `new Date(v)` returns — same time value, or both NaN.
        This is fuzzed over timestamps, junk, Date objects, null and numbers. If
        that equivalence fails, twelve formatters have silently changed behaviour
        on every timestamp in the app, which is far worse than the bug being fixed.

   Run in THREE timezones. A date-shift bug is invisible in UTC — testing there
   would go green on the broken code. New York and Los Angeles are behind UTC (the
   bug bites); Tokyo is ahead (it does not), which proves the fix is not just
   "add a day".

   Usage: node gate_744.mjs [path/to/index.html]     (v743 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', address: '1 A St', stage: 'Approved',
    phone: '', email: '', created_at: now, updated_at: now,
    sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
    checklist: JSON.stringify({ lead: { claim_type: 'insurance',
      insurance: { date_of_loss: '2026-08-15', carrier: 'State Farm' } } }) }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], appointments: [],
  punch_items: [{ id: 'PI1', project_id: 'P1', title: 'Ridge cap', status: 'open',
                  scheduled_at: '2026-08-15', created_at: now }]
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

async function run(tz) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ timezoneId: tz, locale: 'en-US', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (u === 'https://app.cardinalroster.com/') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
    if (u.includes('@supabase/supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
    if (u.includes('chart.js') || u.includes('papaparse')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
    if (u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (t === 'image' || t === 'font' || t === 'media' || t === 'stylesheet') return r.abort();
    if (u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({ status: 200, body: '' });
    return r.abort();
  });
  await page.addInitScript(s => { window.__SEED__ = s; }, SEED);
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {} });
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  const out = await page.evaluate((NOW) => {
    const has = typeof window.crDate === 'function';
    const CD = v => (has ? window.crDate(v) : new Date(v));
    const r = { has, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };

    /* 1. the day-shift itself, through the app's own fmtDay */
    r.fmtDay = (typeof window.fmtDay === 'function') ? window.fmtDay('2026-08-15') : '(no fmtDay)';
    r.raw    = new Date('2026-08-15').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    r.viaCD  = CD('2026-08-15').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

    /* 2. THE DROP-IN PROPERTY — crDate must equal new Date for everything else */
    const NOT_DATE_ONLY = [
      '2026-08-15T14:30:00Z', '2026-08-15T14:30:00+00:00', '2026-08-15T00:00:00',
      '2026-08-15T23:59:59.999Z', '2026-12-31T23:00:00-05:00',
      'not a date', '', '   ', 'Aug 15, 2026', '2026/08/15', '15-08-2026',
      '2026-8-5', '2026-08-15 14:30:00', '20260815', '2026-08', '2026', NOW,
      0, 1755302400000, null, undefined, NaN, true, [], {}
    ];
    r.mismatches = [];
    for (const v of NOT_DATE_ONLY) {
      const a = CD(v), b = new Date(v);
      const av = a instanceof Date ? a.getTime() : NaN;
      const bv = b instanceof Date ? b.getTime() : NaN;
      const same = (Number.isNaN(av) && Number.isNaN(bv)) || av === bv;
      if (!same) r.mismatches.push({ v: String(v), crDate: String(av), native: String(bv) });
    }
    /* a Date object in must come back usable */
    const dObj = new Date('2026-08-15T12:00:00Z');
    r.dateObjOk = CD(dObj).getTime() === dObj.getTime();
    /* it must never return null — every caller guards with isNaN, not with a null check */
    r.neverNull = [null, undefined, '', 'junk', {}].every(v => CD(v) instanceof Date);

    /* 3. date-only across the boundary, both directions */
    r.dateOnly = {};
    for (const d of ['2026-01-01', '2026-12-31', '2026-03-08', '2026-11-01', '2025-07-23']) {
      r.dateOnly[d] = CD(d).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'numeric' });
    }

    /* 4. every one of the app's rewired formatters, on a date-only value */
    r.formatters = {};
    for (const fn of ['fmtDay', 'timeAgo']) {
      if (typeof window[fn] === 'function') { try { r.formatters[fn] = window[fn]('2026-08-15'); } catch (e) { r.formatters[fn] = 'THREW'; } }
    }
    /* commDate was already correct and must be unchanged */
    if (typeof window.commDate === 'function') r.commDate = window.commDate('2026-08-15');
    return r;
  }, now);
  await browser.close();
  return out;
}

const NY = await run('America/New_York');
const LA = await run('America/Los_Angeles');
const TK = await run('Asia/Tokyo');

chk('window.crDate exists', NY.has === true);

/* ── the bug, and the fix, in a timezone BEHIND utc ───────────────────────── */
chk('the trap is real — native new Date shifts the day in New York',
    NY.raw === 'Aug 14, 2026', 'native says ' + NY.raw);
chk('crDate does NOT shift it', NY.viaCD === 'Aug 15, 2026', 'crDate says ' + NY.viaCD);
chk("the app's own fmtDay now shows the right day (New York)",
    /Aug 15, 2026/.test(NY.fmtDay || ''), NY.fmtDay);
chk("...and in Los Angeles", /Aug 15, 2026/.test(LA.fmtDay || ''), LA.fmtDay);
/* ahead of UTC the native parse was never wrong — the fix must not break it */
chk('Tokyo was never affected, and still is not', /Aug 15, 2026/.test(TK.fmtDay || ''), TK.fmtDay);
chk('native and crDate agree in Tokyo (no phantom day added)',
    TK.raw === TK.viaCD, TK.raw + ' vs ' + TK.viaCD);

/* ── THE DROP-IN PROPERTY ─────────────────────────────────────────────────── */
for (const [name, R] of [['New York', NY], ['Los Angeles', LA], ['Tokyo', TK]]) {
  chk(`DROP-IN: crDate === new Date for every non-date-only input (${name})`,
      Array.isArray(R.mismatches) && R.mismatches.length === 0,
      JSON.stringify((R.mismatches || []).slice(0, 4)));
}
chk('a Date object passes through unchanged', NY.dateObjOk === true, String(NY.dateObjOk));
chk('it NEVER returns null (callers guard with isNaN, not null)', NY.neverNull === true, String(NY.neverNull));

/* ── boundaries ───────────────────────────────────────────────────────────── */
chk('New Year renders as itself', NY.dateOnly['2026-01-01'] === '01/01/2026', NY.dateOnly['2026-01-01']);
chk('New Year\'s Eve renders as itself', NY.dateOnly['2026-12-31'] === '12/31/2026', NY.dateOnly['2026-12-31']);
chk('a DST spring-forward date is right', NY.dateOnly['2026-03-08'] === '03/08/2026', NY.dateOnly['2026-03-08']);
chk('a DST fall-back date is right', NY.dateOnly['2026-11-01'] === '11/01/2026', NY.dateOnly['2026-11-01']);
chk('the real date_of_loss on file renders as itself', NY.dateOnly['2025-07-23'] === '07/23/2025', NY.dateOnly['2025-07-23']);
chk('commDate, which was already correct, is unchanged', /Aug 15, 2026/.test(NY.commDate || ''), NY.commDate);

/* ── source-level: the wiring, the fence, and what must NOT have moved ────── */
const src = APP_HTML;
chk('crDate is defined exactly once', (src.match(/function crDate\(v\)\{/g) || []).length === 1);
chk('twelve or more formatters call it', (src.match(/(?<!function )crDate\(/g) || []).length >= 12,
    'found ' + (src.match(/(?<!function )crDate\(/g) || []).length);
chk('THE FENCE: 35 date pickers still bind YYYY-MM-DD',
    (src.match(/type="date"/g) || []).length === 35, 'found ' + (src.match(/type="date"/g) || []).length);
chk('commDate was not "fixed" (it was already right)', /String\(s\)\.slice\(0, 10\) \+ 'T00:00:00'/.test(src));
chk('cr-crew daysLeft was not "fixed" either', /new Date\(iso \+ 'T00:00:00'\)/.test(src));

/* the three raw renders Theo actually saw */
chk('Crews no longer prints a raw expiry', !/'expires ' \+ row\.expires_on/.test(src));
chk('Crews no longer prints a raw paid_on', !/esc\(p\.paid_on \|\| '\\u2014'\)/.test(src));
chk('the printed work order no longer carries a raw scheduled_on',
    !/woRow\('Scheduled', woVal\(opts\.scheduled_on\)\)/.test(src));
chk('and Crews gained exactly one date formatter', (src.match(/function dstr\(v\)\{/g) || []).length === 1);

let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
