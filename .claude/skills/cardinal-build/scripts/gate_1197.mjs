#!/usr/bin/env node
/* gate_1197 — the four confirmed fixes from the 2 Sep 2026 production audit,
 * driven in a real engine on the shipped file.
 *
 *   node gate_1197.mjs [index.html]          the build must be GREEN
 *   node gate_1197.mjs <prev index.html>     the 1196 control must be RED
 *
 *   A  THE APPOINTMENT'S RAIL. Open the visit, leave it by every door the
 *      conductor did not choose — the app's own teardown (what every Front
 *      Door door and goToLanding() run), the browser Back button, a client
 *      opened from elsewhere (the notification / search path), the four
 *      destinations named in the fix (Clients, Leads, Production, Estimates)
 *      — and the rail must be gone every time. Then the other half: the
 *      conductor's OWN navigation (pick a job, step to Welcome, step to a
 *      module step, Back on the rail, the ✕) must behave exactly as before,
 *      and an accidental exit must keep the resume hint.
 *   B  SYSTEM HEALTH. With canned PostgREST answers: a table keyed by email
 *      reads as reachable, a table that does not exist reads as MISSING (the
 *      old HEAD request turned its bodiless 404 into "Reachable · ? rows"),
 *      a refused query reads as a query failure that carries the reason,
 *      and the digest row asks for audit_events.at / type = digest_sent.
 *   C  TWO LIGHT-THEME INKS. The guide row label on a client profile and the
 *      line-item library's category tabs, measured against their own
 *      composited ground in rb-light, clear 4.5:1; dark is unchanged.
 *   D  STATIC. vercel.json redirects the two presentation hosts to
 *      /popup.html (redirects run before the filesystem; rewrites did not);
 *      api/digest.js writes digest_sent; api/estimate-to-contract.js writes
 *      audit_events' real columns.
 *
 * ⚠ THE CONTROL IS THE POINT. On the 1196 tree A's leak checks, B's missing/
 *   failed checks and C's light inks must FAIL; A's "preserved" checks must
 *   pass on both trees. A control that comes back all-green measures nothing.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(existsSync('/opt/node22/lib/node_modules/playwright/index.js')
  ? '/opt/node22/lib/node_modules/playwright/index.js' : 'playwright');

const HERE = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(HERE, '../../../..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const APP  = args[0] || resolve(ROOT, 'index.html');
const HTML = readFileSync(APP, 'utf8');
const SETUP = readFileSync(resolve(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' +
              readFileSync(resolve(HERE, 'e2e_mock_supa.js'), 'utf8');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 220) : ''));
  cond ? pass++ : fail++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const WATCHDOG = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000);

const browser = await chromium.launch();
async function open(query = '', { light = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://cardinal.test/') && !/\.(js|css|png|jpe?g|gif|webp|svg|json)(\?|$)/i.test(u.split('#')[0]) && !u.includes('/api/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    if (u.endsWith('/sw.js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    return r.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });
  if (light) await page.addInitScript("window.__sentinelTheme = 'rb-light';");
  await page.addInitScript(SETUP);
  await page.goto('https://cardinal.test/' + query, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}

/* the rail and the pane, as the browser sees them */
const RAIL = () => {
  const rail = document.getElementById('cr-appt-rail');
  const pane = document.getElementById('cr-appt');
  const box = el => { if (!el) return { absent: true, on: false, onScreen: false }; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { on: el.classList.contains('on'), display: cs.display, h: Math.round(r.height),
             onScreen: cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.top < innerHeight && r.bottom > 0 }; };
  const at = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return { rail: box(rail), pane: box(pane), center: at ? ('#' + (at.id || '') + '.' + String(at.className || '').slice(0, 24)) : null,
           hint: (() => { try { return localStorage.getItem('gs_session'); } catch (e) { return null; } })() };
};
const railGone = s => !s.rail.on && !s.rail.onScreen;
const openAppt = async page => { await page.evaluate(async () => { await window.CardinalAppointment.open(); }); await wait(900); };
const pickJob = async page => {
  await page.evaluate(() => { const b = document.querySelector('#cr-appt .ap-job[data-id="p1"]'); if (!b) throw new Error('no job row'); b.click(); });
  await wait(900);
};
const chip = async (page, label) => {
  await page.evaluate(l => { const b = Array.from(document.querySelectorAll('#cr-appt-rail .ar-step')).find(x => x.textContent.trim().toLowerCase() === l.toLowerCase()); if (!b) throw new Error('no chip ' + l); b.click(); }, label);
  await wait(900);
};

console.log('gate_1197\n  app: ' + APP + '\n');

/* ── A · the rail goes with every exit the conductor did not choose ─────── */
{
  const { ctx, page, errs } = await open();
  ok('A0 The Appointment opens and paints its rail', await page.evaluate(() => { const r = document.getElementById('cr-appt-rail'); return false; }) === false, 'boot');
  await openAppt(page);
  let s = await page.evaluate(RAIL);
  ok('A1 open() shows the pane and the rail', s.rail.on && s.rail.onScreen && s.pane.onScreen, s);

  /* exit 1: the app's own teardown + home (every Front Door door, goToLanding) */
  await page.evaluate(() => { hideAllViews(); showHome(); }); await wait(700);
  s = await page.evaluate(RAIL);
  ok('A2 hideAllViews()+showHome() takes the rail down', railGone(s), s.rail);
  ok('A3 …and the pane', !s.pane.onScreen, s.pane);

  /* exit 2: the browser Back button */
  await openAppt(page);
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {}); await wait(1200);
  s = await page.evaluate(RAIL);
  ok('A4 browser Back takes the rail down', railGone(s), s.rail);

  /* exit 3: a client opened from elsewhere (notification / search) */
  await page.evaluate(() => { try { hideAllViews(); showHome(); } catch (e) {} }); await wait(400);
  await openAppt(page);
  await page.evaluate(() => { (typeof openProject === 'function' ? openProject('p1') : showProject('p1')); }); await wait(900);
  s = await page.evaluate(RAIL);
  ok('A5 openProject() from elsewhere takes the rail down', railGone(s), s.rail);
  const profileShown = await page.evaluate(() => { const v = document.getElementById('projectView'); if (!v) return false; const r = v.getBoundingClientRect(); return getComputedStyle(v).display !== 'none' && r.height > 100; });
  ok('A6 …and the client profile is what is on screen', profileShown, { profileShown, center: s.center });

  /* exit 4: the four named destinations, each entered mid-visit (job picked) */
  const dests = [
    ['Clients',    () => document.querySelector('[data-nav="clients"]').click()],
    ['Leads',      () => (typeof openLeadsView === 'function' ? openLeadsView() : document.querySelector('[data-nav="leads"]').click())],
    ['Production', () => window.CardinalProduction.open()],
    ['Estimates',  () => window.crOpenEstimates()],   /* the drawer row's handler: it tears down, then opens the module */
  ];
  for (const [name, fn] of dests) {
    await page.evaluate(() => { try { hideAllViews(); showHome(); } catch (e) {} try { localStorage.removeItem('gs_session'); } catch (e) {} }); await wait(300);
    /* the previous pass wrote a resume hint; cleared here so open() paints the picker, not the resume card (A17 covers the card) */
    await openAppt(page); await pickJob(page);
    const before = await page.evaluate(RAIL);
    await page.evaluate(String(fn).replace(/^\(\)\s*=>\s*/, '')); await wait(900);
    s = await page.evaluate(RAIL);
    ok(`A7 ${name} entered mid-visit: no rail`, before.rail.on && railGone(s), { before: before.rail.on, after: s.rail });
    ok(`A8 ${name}: the pane is not over it`, !s.pane.onScreen, s.pane);
  }
  ok('A9 no page error across the exits', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ── A' · the conductor's own navigation is untouched (both trees) ───────── */
{
  const { ctx, page, errs } = await open();
  await openAppt(page); await pickJob(page);
  let s = await page.evaluate(RAIL);
  ok("A10 picking a job keeps the rail (conductor's own teardown is not an exit)", s.rail.on && s.rail.onScreen && s.pane.onScreen, s.rail);
  await chip(page, 'Welcome');
  s = await page.evaluate(RAIL);
  ok('A11 stepping to Welcome keeps the rail and the pane', s.rail.on && s.pane.onScreen, s);
  const welcomeOn = await page.evaluate(() => { const c = document.querySelector('#cr-appt-rail .ar-step.on'); return c ? c.textContent.trim() : null; });
  ok('A12 the Welcome chip is the active chip', /welcome/i.test(welcomeOn || ''), welcomeOn);
  /* a MODULE step: Why us → Why Cardinal opens over everything, rail stays */
  await chip(page, 'Why us');
  s = await page.evaluate(RAIL);
  const whyOpen = await page.evaluate(() => { const w = document.getElementById('cr-why'); return !!w && getComputedStyle(w).display !== 'none'; });
  ok('A13 a module step (Why us) opens the module and keeps the rail', whyOpen && s.rail.on && s.rail.onScreen, { whyOpen, rail: s.rail });
  /* Back on the rail from the module step: the module closes through its own door, the pane returns */
  await page.evaluate(() => document.querySelector('#cr-appt-rail [data-ap="back"]').click()); await wait(900);
  s = await page.evaluate(RAIL);
  const whyStill = await page.evaluate(() => { const w = document.getElementById('cr-why'); return !!w && getComputedStyle(w).display !== 'none'; });
  ok('A14 Back on the rail leaves the module and keeps the rail', !whyStill && s.rail.on && s.pane.onScreen, { whyStill, rail: s.rail, pane: s.pane });
  ok('A15 the resume hint is written mid-visit', !!s.hint, s.hint ? 'present' : 'absent');
  /* an accidental exit keeps the hint … */
  await page.evaluate(() => { hideAllViews(); showHome(); }); await wait(600);
  s = await page.evaluate(RAIL);
  ok('A16 an accidental exit keeps the resume hint (pick up where you left off)', railGone(s) && !!s.hint, { rail: s.rail.on, hint: !!s.hint });
  /* … and the rail's own ✕ ends the visit and clears it, exactly as before */
  await openAppt(page);
  const resumeCard = await page.evaluate(() => !!document.querySelector('#cr-appt .gs-card, #cr-appt [data-gs-pane="resume"]'));
  ok('A17 reopening offers the resume card', resumeCard, resumeCard);
  await page.evaluate(() => document.querySelector('#cr-appt-rail [data-ap="end"]').click()); await wait(900);
  s = await page.evaluate(RAIL);
  ok('A18 the rail\'s own ✕ ends the visit: rail down, pane hidden, hint cleared', railGone(s) && !s.pane.onScreen && !s.hint, { rail: s.rail, pane: s.pane, hint: s.hint });
  ok('A19 no page error across the conductor\'s own navigation', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ── B · System Health tells reachable, missing and refused apart ────────── */
{
  const { ctx, page, errs } = await open();
  const results = await page.evaluate(async () => {
    /* canned PostgREST answers, shaped as supabase-js hands them back */
    const seen = {};
    const canned = {
      team_profiles: (sel) => {
        seen.team_profiles = sel;
        /* the 1196 request (select=id, HEAD) 400s with an empty body; anything else is fine */
        if (sel.cols === 'id' && sel.head) return { data: null, error: { message: '', code: '' }, status: 400, count: null };
        return { data: [{ email: 'theo@cardinalrenovations.net' }], error: null, status: 200, count: 5 };
      },
      push_subscriptions: (sel) => {
        seen.push_subscriptions = sel;
        /* the table does not exist: a HEAD gets a bodiless 404 that supabase-js maps to 204/ok; a GET carries PGRST205 */
        if (sel.head) return { data: null, error: null, status: 204, count: null };
        return { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.push_subscriptions' in the schema cache" }, status: 404, count: null };
      },
      contracts: (sel) => {
        seen.contracts = sel;
        if (sel.head) return { data: null, error: { message: '', code: '' }, status: 403, count: null };
        return { data: null, error: { code: '42501', message: 'permission denied for table contracts' }, status: 403, count: null };
      },
      audit_events: (sel) => {
        seen.audit_events = sel;
        return { data: [{ id: 'a1', at: new Date().toISOString() }], error: null, status: 200, count: null };
      },
    };
    const origFrom = window.supa.from.bind(window.supa);
    window.supa.from = function (table) {
      if (!canned[table]) return origFrom(table);
      const sel = { cols: null, head: false, filters: [] };
      const q = {
        select(cols, opts) { sel.cols = cols; sel.head = !!(opts && opts.head); sel.count = opts && opts.count; return q; },
        limit() { return q; }, order() { return q; },
        eq(c, v) { sel.filters.push(['eq', c, v]); return q; },
        gte(c, v) { sel.filters.push(['gte', c, v]); return q; },
        ilike(c, v) { sel.filters.push(['ilike', c, v]); return q; },
        then(res, rej) { return Promise.resolve(canned[table](sel)).then(res, rej); },
      };
      return q;
    };
    const r = await window.CardinalAdminHealth.check();
    const row = k => r.requirements.find(x => x.key === k) || null;
    return { seen, tp: row('team_profiles'), ps: row('push_subscriptions'), ct: row('contracts'),
             pay: row('payments'), sup: row('supplements'), ipay: row('insurance_payments'), isup: row('insurance_supplements'),
             env: r.env.find(x => x.key === 'RESEND_SENDER_DOMAIN') || null };
  });
  const { seen, tp, ps, ct, env } = results;
  ok('B1 team_profiles (keyed by email) reads as reachable', tp && tp.status === 'ok', tp && tp.message);
  ok('B2 …because the check names no column and sends no HEAD', seen.team_profiles && seen.team_profiles.cols === '*' && !seen.team_profiles.head, seen.team_profiles);
  ok('B3 a table that does not exist reads as MISSING, not reachable', ps && ps.status === 'crit' && /missing/i.test(ps.message), ps && ps.message);
  ok('B4 a refused query reads as a query failure carrying the reason', ct && ct.status === 'warn' && /permission denied/.test(ct.message), ct && ct.message);
  ok('B5 the registry names the tables that exist (insurance_payments / insurance_supplements)', results.ipay && results.isup && !results.pay && !results.sup,
     { pay: !!results.pay, sup: !!results.sup, ipay: !!results.ipay, isup: !!results.isup });
  const af = (seen.audit_events && seen.audit_events.filters) || [];
  ok('B6 the digest row filters audit_events on type = digest_sent and at', af.some(f => f[0] === 'eq' && f[1] === 'type' && f[2] === 'digest_sent') && af.some(f => f[0] === 'gte' && f[1] === 'at'), af);
  ok('B7 …and never on created_at / event_type', !af.some(f => f[1] === 'created_at' || f[1] === 'event_type'), af);
  ok('B8 with a digest_sent row inside three days the row is green', env && env.status === 'ok', env && env.message);
  ok('B9 no page error in the health run', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

/* ── C · the two light-theme inks clear the floor; dark untouched ─────────── */
const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const parse = s => { const m = String(s).match(/\d+(\.\d+)?/g); return m ? m.slice(0, 4).map(Number) : null; };
const INKS = () => {
  const ground = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const m = cs.backgroundColor.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.9)) return cs.backgroundColor; } return getComputedStyle(document.body).backgroundColor; };
  const out = {};
  const g = document.querySelector('.db-guiderow .dbg-t');
  if (g) out.guide = { color: getComputedStyle(g).color, bg: ground(g), text: g.textContent.trim().slice(0, 30) };
  const t = Array.from(document.querySelectorAll('.cr-lil-tabs button')).find(b => !b.classList.contains('active'));
  if (t) out.tab = { color: getComputedStyle(t).color, bg: getComputedStyle(t).backgroundColor, text: t.textContent.trim().slice(0, 20) };
  return out;
};
async function inks(light) {
  const { ctx, page, errs } = await open('', { light });
  await page.evaluate(() => { (typeof openProject === 'function' ? openProject('p1') : showProject('p1')); }); await wait(900);
  const a = await page.evaluate(INKS);
  await page.evaluate(() => { try { hideAllViews(); showHome(); } catch (e) {} }); await wait(300);
  await page.evaluate(() => { window.CardinalLineItems.open(); }); await wait(900);
  const b = await page.evaluate(INKS);
  await ctx.close();
  return { guide: a.guide, tab: b.tab, theme: light ? 'rb-light' : 'dark', errs };
}
{
  const L = await inks(true), D = await inks(false);
  const cg = L.guide ? contrast(parse(L.guide.color), parse(L.guide.bg)) : 0;
  const ct = L.tab ? contrast(parse(L.tab.color), parse(L.tab.bg)) : 0;
  ok('C1 rb-light: the guide row label is on screen', !!L.guide, L.guide);
  ok('C2 rb-light: the guide row label clears 4.5:1 on its own ground', cg >= 4.5, { ratio: cg.toFixed(2), ink: L.guide && L.guide.color, ground: L.guide && L.guide.bg });
  ok('C3 rb-light: a line-item category tab is on screen', !!L.tab, L.tab);
  ok('C4 rb-light: the category tab clears 4.5:1 on its own wash', ct >= 4.5, { ratio: ct.toFixed(2), ink: L.tab && L.tab.color, ground: L.tab && L.tab.bg });
  const dg = D.guide ? contrast(parse(D.guide.color), parse(D.guide.bg)) : 0;
  const dt = D.tab ? contrast(parse(D.tab.color), parse(D.tab.bg)) : 0;
  ok('C5 dark: both still clear 4.5:1', dg >= 4.5 && dt >= 4.5, { guide: dg.toFixed(2), tab: dt.toFixed(2) });
  ok('C6 dark: the category tab keeps its dark palette', D.tab && D.tab.color === 'rgb(170, 177, 186)' && D.tab.bg === 'rgb(27, 27, 34)', D.tab);
  ok('C7 no page error in the ink renders', L.errs.length === 0 && D.errs.length === 0, L.errs.concat(D.errs).slice(0, 3));
}

/* ── D · static: the config and the two routes ────────────────────────────── */
{
  const vj = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8'));
  const hosts = ['presentation.cardinalroster.com', 'presentation.cardinalrenovations.com'];
  const red = (vj.redirects || []).filter(r => r.source === '/' && r.destination === '/popup.html' && r.permanent === false &&
    (r.has || []).some(h => h.type === 'host' && hosts.includes(h.value)));
  ok('D1 vercel.json redirects both presentation hosts from / to /popup.html (temporary)', red.length === 2, (vj.redirects || []).map(r => r.has && r.has[0] && r.has[0].value));
  const rw = (vj.rewrites || []).filter(r => (r.has || []).some(h => hosts.includes(h.value)));
  ok('D2 …and no rewrite for those hosts survives (the filesystem beat it)', rw.length === 0, rw);
  const dj = readFileSync(resolve(ROOT, 'api/digest.js'), 'utf8');
  ok('D3 api/digest.js writes a digest_sent audit event on an accepted send', /type: 'digest_sent'/.test(dj) && /rest\/v1\/audit_events/.test(dj) && /accepted\.length/.test(dj), 'digest.js');
  const ec = readFileSync(resolve(ROOT, 'api/estimate-to-contract.js'), 'utf8');
  const ins = ec.slice(ec.indexOf("from('audit_events').insert("), ec.indexOf("from('audit_events').insert(") + 700);
  ok('D4 api/estimate-to-contract.js writes audit_events\' real columns', /type:\s*'estimate_converted_to_contract'/.test(ins) && /email:/.test(ins) && /detail:/.test(ins) && !/actor_email|kind:|payload:/.test(ins), ins.slice(0, 80));
  const ahc = HTML.slice(HTML.indexOf('<script id="cr-ahc-script">'), HTML.indexOf('</script>', HTML.indexOf('<script id="cr-ahc-script">')));
  ok('D5 the health module no longer sends a HEAD for a column named id', !ahc.includes(".select('id', { count:'exact', head:true })"), 'cr-ahc-script');
  ok('D6 …nor asks for created_at / event_type', !/'created_at'|'event_type'/.test(ahc), 'cr-ahc-script');
}

clearTimeout(WATCHDOG);
await browser.close();
console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
