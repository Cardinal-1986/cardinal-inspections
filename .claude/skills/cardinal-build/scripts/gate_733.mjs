/* gate_733.mjs — the app's error channel must be visible on every screen.
   The defect: showError() wrote into #bannerMount, which lives inside #mainView.
   #projectView is a SIBLING and hideAllViews() sets mainView.display='none', so
   82 error call sites were visible on the HOME SCREEN ONLY.

   This gate hit-tests a REAL CHROMIUM RENDER — elementFromPoint at the toast's own
   centre — because a stylesheet can parse, balance and never apply. (While writing
   this build I orphaned a comment and left prose sitting as raw CSS; node --check
   and the brace-balance gate were both green on it.)

   Usage: node gate_733.mjs [path/to/index.html]     (v732 is the negative control) */
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
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Approved', sales_rep: 'theo@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
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

/* the one helper the whole gate leans on: is the error the user's thumb would
   land on, on THIS screen, right now? Hit-tested, not read off the DOM. */
async function errorVisibleHere() {
  return page.evaluate(() => {
    document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
    const bm = document.getElementById('bannerMount'); if (bm) bm.innerHTML = '';
    showError('TEST could not save');
    const cands = [...document.querySelectorAll('#crToasts .crt'), ...document.querySelectorAll('#bannerMount .banner')];
    for (const el of cands) {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight)) continue;
      const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      if (hit && (el === hit || el.contains(hit))) {
        const cs = getComputedStyle(el);
        return { visible: true, text: el.innerText.trim().slice(0, 40), bg: cs.backgroundColor, color: cs.color,
                 pos: cs.position, z: cs.zIndex, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) } };
      }
    }
    return { visible: false, candidates: cands.length };
  });
}

const SCREENS = [
  /* 724's harness trap, again: headless showHome() leaves #landingView painted
     over #mainView, and the hit-test then reports the banner as covered by the
     landing hero. That is the RIG, not the app — on v732 the banner really did
     work on this one screen, and the control must say so or the whole negative
     control is flattering me. Hide the landing explicitly. */
  ['home / landing',      () => { try { showHome(); } catch (e) {} const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none'; window.scrollTo(0, 0); }],
  ['a client profile',    () => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} }],
  ['the document editor', () => { try { hideAllViews(); } catch (e) {} const v = document.getElementById('editorView'); if (v) { v.classList.add('open'); v.style.display = 'block'; } }],
  ['crews',               () => { try { hideAllViews(); } catch (e) {} const v = document.getElementById('crewsView'); if (v) v.style.display = 'block'; }],
  ['punch & repairs',     () => { try { hideAllViews(); } catch (e) {} const v = document.getElementById('punchView'); if (v) v.style.display = 'block'; }],
];
for (const [name, fn] of SCREENS) {
  await page.evaluate(fn);
  await page.waitForTimeout(400);
  const r = await errorVisibleHere();
  chk(`an error is VISIBLE on: ${name}`, r.visible === true, JSON.stringify(r).slice(0, 150));
}

/* scrolled to the bottom of a long profile — the original symptom */
await page.evaluate(() => { try { hideAllViews(); } catch (e) {} try { openProject('P1'); } catch (e) {} });
await page.waitForTimeout(700);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
const scrolled = await errorVisibleHere();
chk('an error is visible when SCROLLED TO THE BOTTOM of a client profile', scrolled.visible === true, JSON.stringify(scrolled).slice(0, 140));

/* ── the behaviour the spec turns on ──────────────────────────────────────── */
const persist = await page.evaluate(async () => {
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  if (!window.crToastErr || !window.crToastOk) return { missing: true, left: 0, kinds: [] };
  window.crToastErr('a failure you must be able to read');
  window.crToastOk('a success');
  await new Promise(r => setTimeout(r, 5200));          /* past the 4s success window */
  const q = [...document.querySelectorAll('#crToasts .crt')];
  return { left: q.length, kinds: q.map(e => e.className.replace('crt ', '')) };
});
chk('a SUCCESS clears itself after 4s', persist.kinds.indexOf('ok') === -1, JSON.stringify(persist));
chk('an ERROR does NOT auto-dismiss (it waits to be read)', persist.kinds.indexOf('err') !== -1, JSON.stringify(persist));

const dismiss = await page.evaluate(() => {
  const e = document.querySelector('#crToasts .crt.err');
  if (!e) return { none: true };
  e.click();
  return { after: document.querySelectorAll('#crToasts .crt.err').length };
});
chk('tapping an error dismisses it', dismiss.after === 0, JSON.stringify(dismiss));

const stack = await page.evaluate(() => {
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  if (!window.crToastErr) return { missing: true, n: -1, texts: [] };
  for (let i = 1; i <= 5; i++) window.crToastErr('message ' + i);
  const q = [...document.querySelectorAll('#crToasts .crt')];
  return { n: q.length, texts: q.map(e => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 12)) };
});
chk('the stack caps at 3, newest kept', stack.n === 3 && /5/.test(stack.texts.join(' ')) && !/message 1/.test(stack.texts.join(' ')), JSON.stringify(stack));

/* a Postgres error string is not markup */
const xss = await page.evaluate(() => {
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  if (!window.crToastErr) return { missing: true, imgs: -1, pwn: false };
  window.crToastErr('<img src=x onerror="window.__PWN__=1">boom');
  const e = document.querySelector('#crToasts .crt');
  return { imgs: e ? e.querySelectorAll('img').length : -1, pwn: !!window.__PWN__, txt: e ? e.innerText.slice(0, 24) : null };
});
chk('a message is TEXT, never markup', xss.imgs === 0 && xss.pwn === false, JSON.stringify(xss));

/* ── it must clear the installed app's bottom nav ─────────────────────────── */
const nav = await page.evaluate(() => {
  document.body.classList.add('standalone');
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  if (!window.crToastErr) { document.body.classList.remove('standalone'); return { missing: true, navShown: false, overlap: null, stillHit: false }; }
  window.crToastErr('over the nav?');
  const t = document.querySelector('#crToasts .crt');
  const n = document.getElementById('pwaNav');
  const tr = t ? t.getBoundingClientRect() : null;
  const nr = n ? n.getBoundingClientRect() : null;
  const overlap = (tr && nr) ? !(tr.bottom <= nr.top || tr.top >= nr.bottom) : null;
  const hit = tr ? document.elementFromPoint(Math.round(tr.left + tr.width / 2), Math.round(tr.top + tr.height / 2)) : null;
  const res = { navShown: nr ? nr.height > 0 : false, overlap,
                stillHit: !!(hit && t && (hit === t || t.contains(hit))),
                toastBottom: tr ? Math.round(tr.bottom) : null, navTop: nr ? Math.round(nr.top) : null };
  document.body.classList.remove('standalone');
  return res;
});
chk('in the installed app the toast clears #pwaNav', nav.navShown ? nav.overlap === false : true,
    `toast bottom ${nav.toastBottom} vs nav top ${nav.navTop} (navShown=${nav.navShown})`);
chk('and is still the topmost thing at its own centre', nav.stillHit === true, JSON.stringify(nav));

/* ── the five module toasts are untouched ─────────────────────────────────── */
const src = await page.evaluate(() => {
  const s = document.documentElement.outerHTML;
  return { modules: (s.match(/function\s+toast\s*\(/g) || []).length,
           oldBanner: (s.match(/<div class="banner err">/g) || []).length };
});
chk('the five module toasts still exist (none were rewritten)', src.modules === 5, 'found ' + src.modules);
chk('the invisible .banner.err write is gone', src.oldBanner === 0, 'sites=' + src.oldBanner);

/* ── contrast, computed not eyeballed ─────────────────────────────────────── */
const inks = await page.evaluate(() => {
  const out = {};
  ['ok', 'err', 'info'].forEach(k => {
    document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
    if (!window.crToast) { out[k] = null; return; }
    window.crToast('x', k);
    const e = document.querySelector('#crToasts .crt');
    if (e) { const c = getComputedStyle(e); out[k] = { bg: c.backgroundColor, fg: c.color }; }
  });
  document.querySelectorAll('#crToasts .crt').forEach(t => t.remove());
  return out;
});
const lum = c => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const k of ['ok', 'err', 'info']) {
  const v = inks[k];
  const r = v ? ratio(v.fg, v.bg) : 0;
  chk(`the ${k} toast's ink clears 4.5:1 on its own ground`, r >= 4.5, v ? `${r.toFixed(2)}:1  ${v.fg} on ${v.bg}` : 'not rendered');
}

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
