/* gate_739.mjs — phone numbers get one shape, and a bad one is flagged without
   being destroyed.

   The two assertions that earn this build:
     1. ONE delegated listener covers inputs it never knew about — the gate
        injects a brand-new type="tel" input at runtime and proves it works.
     2. Input the formatter does NOT understand is FLAGGED, NEVER REWRITTEN.
        A formatter that eats an extension is worse than no formatter.

   Usage: node gate_739.mjs [path/to/index.html]     (v738 is the negative control) */
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

/* ── the pure function, across the shapes people actually type ────────────── */
const pure = await page.evaluate(() => {
  if (!window.crValid || !window.crValid.phone) return { missing: true };
  const t = v => { const r = window.crValid.phone(v); return { ok: r.ok, d: r.digits, p: r.pretty }; };
  return {
    plain:     t('9375550101'),
    dashed:    t('937-555-0101'),
    spaced:    t('937 555 0101'),
    parens:    t('(937) 555-0101'),
    dotted:    t('937.555.0101'),
    country:   t('1 937 555 0101'),
    plusOne:   t('+1 (937) 555-0101'),
    blank:     t(''),
    spaceOnly: t('   '),
    letters:   t('abc'),
    tooShort:  t('93755501'),
    extension: t('937-555-0101 x123'),
    intl:      t('+44 20 7946 0958')
  };
});
chk('window.crValid.phone exists', !pure.missing);
const P = '(937) 555-0101';
/* on the control crValid does not exist, so every field below is undefined —
   guard so the gate reports RED rather than crashing. A gate that throws on the
   negative control has not been seen to fail; it has been seen to break. */
const G = k => (pure && pure[k]) || { ok: null, d: null, p: null };
for (const k of ['plain', 'dashed', 'spaced', 'parens', 'dotted', 'country', 'plusOne']) {
  chk(`"${k}" normalises to ${P}`, G(k).ok === true && G(k).p === P, JSON.stringify(G(k)));
}
chk('a blank phone is OK (these fields are optional)', G('blank').ok === true && G('blank').d === '', JSON.stringify(G('blank')));
chk('whitespace-only is OK too', G('spaceOnly').ok === true, JSON.stringify(G('spaceOnly')));
chk('"abc" is REJECTED', G('letters').ok === false, JSON.stringify(G('letters')));
chk('a short number is REJECTED', G('tooShort').ok === false, JSON.stringify(G('tooShort')));

/* the rule that matters most: unrecognised input is never rewritten */
chk('an EXTENSION is flagged but its text is PRESERVED',
    G('extension').ok === false && G('extension').p === '937-555-0101 x123', JSON.stringify(G('extension')));
chk('an INTERNATIONAL number is flagged but PRESERVED',
    G('intl').ok === false && G('intl').p === '+44 20 7946 0958', JSON.stringify(G('intl')));

/* ── the delegated listener, on a field the app has never seen ────────────── */
const live = await page.evaluate(async () => {
  if (!window.crValid) return { missing: true, good:{}, bad:{}, ext:{}, empty:{}, painted:{} };
  const mk = (v) => {
    const i = document.createElement('input');
    i.type = 'tel'; i.value = v; i.id = 'probe_' + Math.abs(v.length * 7 + v.charCodeAt(0) || 1) + '_' + v.replace(/\W/g, '');
    document.body.appendChild(i);
    return i;
  };
  const blur = async (i) => { i.focus(); i.blur(); await new Promise(r => setTimeout(r, 120)); };
  const good = mk('9375550101');
  const bad = mk('abc');
  const ext = mk('937-555-0101 x123');
  const empty = mk('');
  await blur(good); await blur(bad); await blur(ext); await blur(empty);
  const out = {
    good: { v: good.value, bad: good.classList.contains('cr-bad'), aria: good.getAttribute('aria-invalid') },
    bad:  { v: bad.value,  bad: bad.classList.contains('cr-bad'),  aria: bad.getAttribute('aria-invalid'), title: bad.title },
    ext:  { v: ext.value,  bad: ext.classList.contains('cr-bad') },
    empty:{ v: empty.value, bad: empty.classList.contains('cr-bad') },
    /* is .cr-bad an actual rendered style, or a class nothing paints? */
    painted: (function () { const c = getComputedStyle(bad); return { border: c.borderTopColor, shadow: c.boxShadow.slice(0, 30) }; })()
  };
  [good, bad, ext, empty].forEach(e => e.remove());
  return out;
});
chk('a NEW tel field the app never rendered is still handled', live.good.v === P, 'value after blur = ' + live.good.v);
chk('a good number is not flagged', live.good.bad === false && !live.good.aria, JSON.stringify(live.good));
chk('"abc" gets the red flag on blur', live.bad.bad === true && live.bad.aria === 'true', JSON.stringify(live.bad));
chk('"abc" keeps its text (nothing was destroyed)', live.bad.v === 'abc', live.bad.v);
chk('the flag carries a message', /10-digit/.test(live.bad.title || ''), live.bad.title);
chk('an extension is flagged and left alone in the field', live.ext.bad === true && live.ext.v === '937-555-0101 x123', JSON.stringify(live.ext));
chk('an empty field is not flagged', live.empty.bad === false && live.empty.v === '', JSON.stringify(live.empty));
chk('.cr-bad actually PAINTS (the class is not inert)',
    /rgb\(200,\s*32,\s*46\)/.test(live.painted.border) && live.painted.shadow !== 'none', JSON.stringify(live.painted));

/* ── it must not reach into the report iframe ─────────────────────────────── */
const iframeSafe = await page.evaluate(() => {
  const f = document.getElementById('reportFrame');
  return { exists: !!f, sameDoc: f ? (f.contentDocument === document) : null };
});
chk('the report iframe is a separate document (listener cannot reach it)',
    iframeSafe.exists ? iframeSafe.sameDoc === false : true, JSON.stringify(iframeSafe));

/* ── shake, for the required-field work that reuses this ──────────────────── */
const sh = await page.evaluate(async () => {
  if (!window.crValid || !window.crValid.shake) return { on:false, anim:'none', off:false };
  const d = document.createElement('input'); d.type = 'text'; document.body.appendChild(d);
  window.crValid.shake(d);
  const on = d.classList.contains('cr-shake');
  const anim = getComputedStyle(d).animationName;
  await new Promise(r => setTimeout(r, 500));
  const off = d.classList.contains('cr-shake');
  d.remove();
  return { on, anim, off };
});
chk('crValid.shake applies a REAL animation', sh.on === true && sh.anim === 'crShake', JSON.stringify(sh));
chk('and it cleans up after itself', sh.off === false, JSON.stringify(sh));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
