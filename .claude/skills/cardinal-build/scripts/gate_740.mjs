/* gate_740.mjs — email addresses are checked, and the one a bid is sent to is fenced.

   The assertions that earn this build:
     1. THE FENCE. community_partners.contact_email is the DEFAULT recipient of a
        community bid, so save() must REFUSE a malformed one — and must still
        write a good one (a fence that refuses everything is a dead button), and
        must still write when the key is ABSENT (build 712's rule: a rep saving a
        notes change never touches the stored contacts).
     2. Build 739 STILL WORKS. The tel path was rewritten from an early-return
        into a branch; a gate that only tests email would not notice it broke.
     3. Bad input is FLAGGED, NEVER REWRITTEN — the same rule as 739.

   Usage: node gate_740.mjs [path/to/index.html]     (v739 is the negative control) */
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
  projects: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: [],
  community_partners: [
    { id: 'PA1', name: 'Habitat for Humanity of Greater Dayton', partner_type: 'nonprofit',
      contact_name: 'Galen', contact_email: 'galen@habitatdayton.org', contact_phone: '937-555-0101',
      address: '', notes: '', archived: false, confidential: false, prospective: false,
      created_at: now, updated_at: now }
  ]
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

/* ── 1. the pure function ─────────────────────────────────────────────────── */
const pure = await page.evaluate(() => {
  if (!window.crValid || !window.crValid.email) return { missing: true };
  const t = v => { const r = window.crValid.email(v); return { ok: r.ok, c: r.clean }; };
  return {
    plain:    t('galen@habitatdayton.org'),
    plus:     t('nick+bids@cardinalrenovations.net'),
    sub:      t('a@mail.example.co.uk'),
    padded:   t('   galen@habitatdayton.org  '),
    blank:    t(''),
    spaces:   t('   '),
    noDot:    t('galen@habitat'),
    noDomain: t('nick@'),
    noLocal:  t('@habitat.org'),
    noAt:     t('galenhabitatdayton.org'),
    inner:    t('gal en@habitat.org'),
    twoAt:    t('a@b@c.org')
  };
});
chk('window.crValid.email exists', !pure.missing);
const G = k => (pure && pure[k]) || { ok: null, c: null };
for (const k of ['plain', 'plus', 'sub']) chk(`"${k}" is accepted`, G(k).ok === true, JSON.stringify(G(k)));
chk('a padded address is accepted and TRIMMED', G('padded').ok === true && G('padded').c === 'galen@habitatdayton.org', JSON.stringify(G('padded')));
chk('blank is OK (these fields are optional)', G('blank').ok === true && G('blank').c === '', JSON.stringify(G('blank')));
chk('whitespace-only is OK too', G('spaces').ok === true, JSON.stringify(G('spaces')));
/* the four the old /@/ check would have waved straight through */
chk('"galen@habitat" (no dot) is REJECTED', G('noDot').ok === false, JSON.stringify(G('noDot')));
chk('"nick@" is REJECTED', G('noDomain').ok === false, JSON.stringify(G('noDomain')));
chk('"@habitat.org" is REJECTED', G('noLocal').ok === false, JSON.stringify(G('noLocal')));
chk('a string with no @ is REJECTED', G('noAt').ok === false, JSON.stringify(G('noAt')));
chk('an inner space is REJECTED', G('inner').ok === false, JSON.stringify(G('inner')));
chk('two @ signs are REJECTED', G('twoAt').ok === false, JSON.stringify(G('twoAt')));

/* ── 2. which inputs count as address fields ──────────────────────────────── */
const which = await page.evaluate(() => {
  if (!window.crValid || !window.crValid.isEmailField) return { missing: true, r: {} };
  const mk = (attrs) => { const i = document.createElement('input'); for (const k in attrs) i.setAttribute(k, attrs[k]); return i; };
  const f = window.crValid.isEmailField;
  return { r: {
    typeEmail:   f(mk({ type: 'email' })),
    nameContact: f(mk({ type: 'text', name: 'contact_email' })),     /* cr-crew, cr-cpartners */
    dataF:       f(mk({ type: 'text', 'data-f': 'email' })),          /* cr-cadj, cr-sol, cr-ci */
    dataFAdj:    f(mk({ 'data-f': 'adjuster_email' })),               /* cr-claims: no type at all */
    dataField:   f(mk({ type: 'email', 'data-field': 'homeowner_email' })),
    idLogin:     f(mk({ type: 'email', id: 'loginEmail' })),
    idCamel:     f(mk({ type: 'text', id: 'ldInsAdjEmail' })),
    /* must NOT be treated as addresses */
    checkbox:    f(mk({ type: 'checkbox', name: 'no_email' })),
    tel:         f(mk({ type: 'tel', name: 'contact_phone' })),
    password:    f(mk({ type: 'password', name: 'email' })),
    notes:       f(mk({ type: 'text', name: 'notes' })),
    bare:        f(mk({ type: 'text' }))
  } };
});
chk('crValid.isEmailField exists', !which.missing);
const W = which.r || {};
for (const k of ['typeEmail', 'nameContact', 'dataF', 'dataFAdj', 'dataField', 'idLogin', 'idCamel'])
  chk(`"${k}" is recognised as an address field`, W[k] === true, String(W[k]));
for (const k of ['checkbox', 'tel', 'password', 'notes', 'bare'])
  chk(`"${k}" is NOT treated as an address field`, W[k] === false, String(W[k]));

/* ── 3. the delegated listener, on fields the app has never rendered ──────── */
const live = await page.evaluate(async () => {
  if (!window.crValid) return { missing: true, good: {}, bad: {}, named: {}, empty: {}, tel: {} };
  const mk = (attrs, v) => { const i = document.createElement('input'); for (const k in attrs) i.setAttribute(k, attrs[k]); i.value = v; document.body.appendChild(i); return i; };
  const blur = async (i) => { i.focus(); i.blur(); await new Promise(r => setTimeout(r, 120)); };
  const good  = mk({ type: 'email' }, '  galen@habitatdayton.org ');
  const bad   = mk({ type: 'email' }, 'galen@habitat');
  const named = mk({ type: 'text', name: 'contact_email' }, 'nick@');
  const empty = mk({ type: 'email' }, '');
  const tel   = mk({ type: 'tel' }, '9375550101');   /* 739 must still work */
  for (const e of [good, bad, named, empty, tel]) await blur(e);
  const out = {
    good:  { v: good.value,  bad: good.classList.contains('cr-bad') },
    bad:   { v: bad.value,   bad: bad.classList.contains('cr-bad'), aria: bad.getAttribute('aria-invalid'), title: bad.title },
    named: { v: named.value, bad: named.classList.contains('cr-bad') },
    empty: { v: empty.value, bad: empty.classList.contains('cr-bad') },
    tel:   { v: tel.value,   bad: tel.classList.contains('cr-bad') }
  };
  [good, bad, named, empty, tel].forEach(e => e.remove());
  return out;
});
chk('a good address is trimmed on blur and not flagged', live.good.v === 'galen@habitatdayton.org' && live.good.bad === false, JSON.stringify(live.good));
chk('"galen@habitat" gets the red flag', live.bad.bad === true && live.bad.aria === 'true', JSON.stringify(live.bad));
chk('and it KEEPS its text (nothing was destroyed)', live.bad.v === 'galen@habitat', live.bad.v);
chk('the flag carries a message', /email address/i.test(live.bad.title || ''), live.bad.title);
chk('a type="text" field NAMED contact_email is covered too', live.named.bad === true && live.named.v === 'nick@', JSON.stringify(live.named));
chk('an empty address field is not flagged', live.empty.bad === false, JSON.stringify(live.empty));
chk('BUILD 739 STILL WORKS — a tel field still normalises', live.tel.v === '(937) 555-0101' && live.tel.bad === false, JSON.stringify(live.tel));

/* ── 4. THE FENCE — save() and community_partners ─────────────────────────── */
const fence = await page.evaluate(async () => {
  const P = window.CardinalCommunityPartners;
  if (!P || !P.save) return { missing: true };
  const wrote = () => (window.__WRITES__ || []).filter(w => w.table === 'community_partners').length;
  const out = {};
  /* a) a malformed address must NOT reach the database */
  window.__WRITES__ = [];
  out.badRet = await P.save({ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit', contact_email: 'galen@habitat' });
  out.badWrites = wrote();
  /* b) a good one must still go through — the fence is not a dead button */
  window.__WRITES__ = [];
  out.goodRet = !!(await P.save({ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit', contact_email: 'galen@habitatdayton.org' }));
  out.goodWrites = wrote();
  out.goodPayload = (window.__WRITES__ || []).filter(w => w.table === 'community_partners')
                      .map(w => w.payload && w.payload.contact_email)[0];
  /* c) BUILD 712's RULE: the key absent = a rep saving a note. Must still save. */
  window.__WRITES__ = [];
  out.absentRet = !!(await P.save({ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit', notes: 'called them' }));
  out.absentWrites = wrote();
  out.absentTouchedEmail = (window.__WRITES__ || []).filter(w => w.table === 'community_partners')
      .some(w => w.payload && Object.prototype.hasOwnProperty.call(w.payload, 'contact_email'));
  /* d) an explicitly BLANK address is legal — five live partners have none */
  window.__WRITES__ = [];
  out.blankRet = !!(await P.save({ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit', contact_email: '' }));
  out.blankWrites = wrote();
  return out;
});
chk('CardinalCommunityPartners.save is reachable', !fence.missing);
chk('THE FENCE: a malformed contact_email NEVER reaches the database', fence.badWrites === 0, 'writes = ' + fence.badWrites);
chk('and save() reports the refusal to its caller', fence.badRet === null, 'returned ' + JSON.stringify(fence.badRet));
chk('a GOOD address still saves (the fence is not a dead button)', fence.goodWrites >= 1 && fence.goodRet === true, JSON.stringify({ w: fence.goodWrites, r: fence.goodRet }));
chk('and the good address is what was written', fence.goodPayload === 'galen@habitatdayton.org', String(fence.goodPayload));
chk('712 HOLDS: a notes-only save still writes', fence.absentWrites >= 1 && fence.absentRet === true, JSON.stringify({ w: fence.absentWrites, r: fence.absentRet }));
chk('712 HOLDS: and it does not touch contact_email at all', fence.absentTouchedEmail === false, String(fence.absentTouchedEmail));
chk('an explicitly blank contact_email is still legal', fence.blankWrites >= 1 && fence.blankRet === true, JSON.stringify({ w: fence.blankWrites, r: fence.blankRet }));

/* ── 5. the UI half — the owner is told WHY, not "check your connection" ──── */
const ui = await page.evaluate(async () => {
  const P = window.CardinalCommunityPartners;
  if (!P || !P.openEditor) return { missing: true };
  await (P.load ? P.load(true) : Promise.resolve());
  P.openEditor({ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit',
                 contact_name: 'Galen', contact_email: 'galen@habitatdayton.org',
                 contact_phone: '', address: '', notes: '' });
  await new Promise(r => setTimeout(r, 400));
  const form = document.querySelector('#cpForm');
  if (!form) return { noForm: true };
  const inp = form.querySelector('[name="contact_email"]');
  if (!inp) return { noInput: true };
  /* "galen@habitat" passes the BROWSER's own type=email check (it does not
     require a dot), so it really does reach our handler — which is the whole
     point of having one. */
  inp.value = 'galen@habitat';
  const nativeOk = inp.checkValidity();
  window.__WRITES__ = [];
  form.querySelector('button[type="submit"]').click();
  await new Promise(r => setTimeout(r, 500));
  const err = document.querySelector('#cpErr');
  return {
    nativeOk,
    errShown: err ? getComputedStyle(err).display !== 'none' : false,
    errText: err ? err.textContent : '',
    flagged: inp.classList.contains('cr-bad'),
    writes: (window.__WRITES__ || []).filter(w => w.table === 'community_partners').length,
    stillThere: inp.value
  };
});
chk('the partner editor is reachable and renders the contact input', !ui.missing && !ui.noForm && !ui.noInput, JSON.stringify(ui));
chk('"galen@habitat" passes the BROWSER check, so our handler is what catches it', ui.nativeOk === true, String(ui.nativeOk));
chk('submitting a bad contact email shows a message', ui.errShown === true, ui.errText);
chk('and the message says WHY, not "check your connection"', /bids default to it/i.test(ui.errText || ''), ui.errText);
chk('the field itself is flagged', ui.flagged === true, String(ui.flagged));
chk('nothing was written', ui.writes === 0, 'writes = ' + ui.writes);
chk('and what the owner typed is still in the box', ui.stillThere === 'galen@habitat', ui.stillThere);

/* ── 6. the weak check is gone, and the strong ones are untouched ─────────── */
const src = await page.evaluate(() => document.documentElement.outerHTML);
chk('cr-bulk no longer accepts anything with an @ in it', !/if\(!\/@\/\.test\(email\)\)/.test(src));
chk('the four money-path regexes are still there',
    (src.match(/\/\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$\//g) || []).length === 5,
    'literal count = ' + (src.match(/\/\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$\//g) || []).length);

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
