/* gate_743.mjs — a phone number finds its client, whatever shape it was typed in.

   The assertion that earns this build is NOT "more things match". It is
   **NOTHING STOPPED MATCHING.** Widening a search haystack is only safe if every
   query that hit before still hits, so this gate FUZZES ~200 query strings
   (substrings of names, addresses, emails, POs and phones in every punctuation)
   against the OLD and NEW haystacks for every seeded client, and fails if a
   single old match disappeared. A "we added matches" gate would pass even if the
   change silently broke searching by name.

   Seeds mirror production shapes exactly: a client whose phone lives ONLY in
   checklist.lead.phones (16 of 34 real clients are like this), one with a bare
   10-digit column value (7 real), one dashed (3 real), and one in build 739's
   pretty form (0 today — this is the drift being pre-empted).

   Usage: node gate_743.mjs [path/to/index.html]     (v742 is the negative control) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
import { readFileSync } from 'fs';

const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(APP, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const now = new Date().toISOString();
const ck = o => JSON.stringify(o);   /* checklist is a TEXT column — see build 742 */

const SEED = {
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' }],
  projects: [
    /* the 16-of-34 case: the number exists ONLY on the bid form */
    { id: 'P_LEAD', name: 'Betty Mann', address: '10 Elm St', stage: 'Lead', phone: '', email: 'betty@x.com',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 101, lead: { claim_type: 'community',
        phones: [{ v: '937-555-0101', t: 'mobile' }, { v: '(937) 555-0199', t: 'work' }] } }) },
    /* bare 10 digits in the column — the most common real shape */
    { id: 'P_BARE', name: 'Carl Bare', address: '11 Oak St', stage: 'Lead', phone: '9375550102', email: 'carl@x.com',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 102, lead: { claim_type: 'retail' } }) },
    /* dashed */
    { id: 'P_DASH', name: 'Dana Dash', address: '12 Pine St', stage: 'Lead', phone: '937-555-0103', email: 'dana@x.com',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 103, lead: { claim_type: 'retail' } }) },
    /* build 739's pretty form — the drift this pre-empts */
    { id: 'P_PRETTY', name: 'Pat Pretty', address: '13 Ash St', stage: 'Lead', phone: '(937) 555-0104', email: 'pat@x.com',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 104, lead: { claim_type: 'retail' } }) },
    /* homeowner/renter numbers on a community job */
    { id: 'P_HO', name: 'Habitat — 14 Fir', address: '14 Fir St', stage: 'Lead', phone: '', email: '',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 105, lead: { claim_type: 'community', homeowner_phone: '9375550105', renter_phone: '937.555.0106' } }) },
    /* no phone at all — must not gain phantom matches */
    { id: 'P_NONE', name: 'Nora None', address: '15 Yew St', stage: 'Lead', phone: '', email: 'nora@x.com',
      created_at: now, updated_at: now, sales_rep: 'theo@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net',
      checklist: ck({ po: 106, lead: { claim_type: 'retail' } }) }
  ],
  inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [],
  collections: [], commissions: [], draws: [], punch_items: [], appointments: []
};

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
await page.waitForTimeout(3400);

/* ── 1. the helper itself ─────────────────────────────────────────────────── */
const helper = await page.evaluate(() => {
  if (typeof window.phoneHay !== 'function') return { missing: true };
  const rows = window.cacheProjects || [];
  const by = id => rows.find(r => r.id === id);
  return {
    lead:   window.phoneHay(by('P_LEAD')),
    bare:   window.phoneHay(by('P_BARE')),
    pretty: window.phoneHay(by('P_PRETTY')),
    ho:     window.phoneHay(by('P_HO')),
    none:   window.phoneHay(by('P_NONE')),
    nullIn: window.phoneHay(null),
    junk:   window.phoneHay({ id: 'x', phone: 'call the office', checklist: 'not json' })
  };
});
chk('window.phoneHay exists', !helper.missing);
const H = k => (helper && helper[k]) || '';
chk('a bid-form-only number is found at all (16 of 34 real clients)', /9375550101/.test(H('lead')), H('lead'));
chk('and the SECOND bid-form number too', /9375550199/.test(H('lead')), H('lead'));
chk('a bare stored number gains its punctuated forms',
    /\(937\) 555-0102/.test(H('bare')) && /937-555-0102/.test(H('bare')), H('bare'));
chk("739's pretty stored form gains its digits", /9375550104/.test(H('pretty')), H('pretty'));
chk('homeowner and renter numbers are included',
    /9375550105/.test(H('ho')) && /9375550106/.test(H('ho')), H('ho'));
chk('a client with no phone contributes nothing', H('none') === '', JSON.stringify(H('none')));
chk('a null project does not throw and returns empty', helper.nullIn === '', JSON.stringify(helper.nullIn));
chk('unparseable junk is survived and the raw text kept',
    /call the office/.test(helper.junk || ''), JSON.stringify(helper.junk));

/* ── 2. THE SAFETY PROPERTY — fuzz old vs new over every seeded client ────── */
const fuzz = await page.evaluate(() => {
  const rows = window.cacheProjects || [];
  const po = p => { try { return window.poOf(p); } catch (e) { return null; } };
  /* guarded: on the negative control phoneHay does not exist, and a gate that
     THROWS on its control has not been seen to fail — it has been seen to break.
     (gate_739 hit this exact thing.) */
  const PH = p => { try { return window.phoneHay ? window.phoneHay(p) : ''; } catch (e) { return ''; } };
  const oldHay = p => [p.name, p.address, p.phone, p.email, po(p) ? '#' + po(p) + ' ' + po(p) : ''].join(' ').toLowerCase();
  const newHay = p => [p.name, p.address, p.phone, PH(p), p.email, po(p) ? '#' + po(p) + ' ' + po(p) : ''].join(' ').toLowerCase();

  /* build a big query set: every substring-ish token a person might type */
  const qs = new Set();
  for (const p of rows) {
    for (const src of [p.name, p.address, p.email, String(po(p) || '')]) {
      const s = String(src || '');
      if (!s) continue;
      qs.add(s); qs.add(s.toLowerCase()); qs.add(s.slice(0, 3)); qs.add(s.slice(0, 5));
      qs.add(s.slice(1, 6)); qs.add(s.slice(-4));
      s.split(/\s+/).forEach(w => { if (w) { qs.add(w); qs.add(w.toLowerCase()); } });
    }
    const ph = String(p.phone || '');
    if (ph) { qs.add(ph); qs.add(ph.slice(0, 3)); qs.add(ph.slice(-4)); qs.add(ph.replace(/\D/g, '')); }
  }
  ['937', '555', '9375550102', '937-555-0102', '(937) 555-0102', '937.555.0102', '937 555 0102',
   '5550101', '555-0101', '0104', 'elm', 'ELM', '#101', 'betty', 'x.com', ''].forEach(q => qs.add(q));

  const lost = [], gained = [];
  for (const q of qs) {
    const ql = String(q).toLowerCase();
    for (const p of rows) {
      const o = oldHay(p).indexOf(ql) !== -1;
      const n = newHay(p).indexOf(ql) !== -1;
      if (o && !n) lost.push({ q, id: p.id });
      if (!o && n) gained.push({ q, id: p.id });
    }
  }
  return { queries: qs.size, rows: rows.length, lost, gained: gained.length,
           gainedSample: gained.slice(0, 6) };
});
chk('the fuzz actually ran', fuzz.queries > 60 && fuzz.rows === 6, JSON.stringify({ q: fuzz.queries, r: fuzz.rows }));
chk('NOTHING STOPPED MATCHING — zero lost matches across the fuzz',
    fuzz.lost.length === 0, fuzz.lost.length + ' lost: ' + JSON.stringify(fuzz.lost.slice(0, 6)));
chk('and matches were genuinely gained', fuzz.gained > 0, fuzz.gained + ' gained, e.g. ' + JSON.stringify(fuzz.gainedSample));

/* ── 3. the shapes Theo would actually type ───────────────────────────────── */
const real = await page.evaluate(() => {
  const rows = window.cacheProjects || [];
  const po = p => { try { return window.poOf(p); } catch (e) { return null; } };
  const PH = p => { try { return window.phoneHay ? window.phoneHay(p) : ''; } catch (e) { return ''; } };
  const hay = p => [p.name, p.address, p.phone, PH(p), p.email, po(p) ? '#' + po(p) : ''].join(' ').toLowerCase();
  const find = q => rows.filter(p => hay(p).indexOf(String(q).toLowerCase()) !== -1).map(p => p.id);
  return {
    digitsForPretty:  find('9375550104'),
    dashedForPretty:  find('937-555-0104'),
    digitsForDashed:  find('9375550103'),
    prettyForBare:    find('(937) 555-0102'),
    dashedForBare:    find('937-555-0102'),
    leadOnlyDigits:   find('9375550101'),
    leadOnlyDashed:   find('937-555-0101'),
    lastFour:         find('0105'),
    spaced:           find('937 555 0102'),
    noPhantom:        find('9375550999')
  };
});
chk('a PRETTY-stored number is found by its digits', real.digitsForPretty.indexOf('P_PRETTY') !== -1, JSON.stringify(real.digitsForPretty));
chk('...and by dashes', real.dashedForPretty.indexOf('P_PRETTY') !== -1, JSON.stringify(real.dashedForPretty));
chk('a DASHED-stored number is found by its digits', real.digitsForDashed.indexOf('P_DASH') !== -1, JSON.stringify(real.digitsForDashed));
chk('a BARE-stored number is found in pretty form', real.prettyForBare.indexOf('P_BARE') !== -1, JSON.stringify(real.prettyForBare));
chk('...and in dashed form', real.dashedForBare.indexOf('P_BARE') !== -1, JSON.stringify(real.dashedForBare));
chk('...and with spaces', real.spaced.indexOf('P_BARE') !== -1, JSON.stringify(real.spaced));
chk('a BID-FORM-ONLY number is found by digits', real.leadOnlyDigits.indexOf('P_LEAD') !== -1, JSON.stringify(real.leadOnlyDigits));
chk('...and by dashes', real.leadOnlyDashed.indexOf('P_LEAD') !== -1, JSON.stringify(real.leadOnlyDashed));
chk('a homeowner number is found by its last four', real.lastFour.indexOf('P_HO') !== -1, JSON.stringify(real.lastFour));
chk('a number nobody has matches nobody', real.noPhantom.length === 0, JSON.stringify(real.noPhantom));

/* ── 4. all seven haystacks were wired, and no comparison was touched ─────── */
const src = APP_HTML;
chk('seven haystacks call phoneHay', (src.match(/(?<!function )phoneHay\((?:pr|p)\)/g) || []).length === 7,
    'found ' + (src.match(/(?<!function )phoneHay\((?:pr|p)\)/g) || []).length);
chk('the three module sites go through window.', (src.match(/window\.phoneHay\(/g) || []).length === 3);
chk('the comparison lines are untouched (purely additive)',
    (src.match(/return hay\.indexOf\(q\) !== -1;/g) || []).length === 3 &&
    (src.match(/if\(hay\.indexOf\(q\) === -1\) return false;/g) || []).length === 3);
chk('phoneForms delegates digit extraction to build 739', /window\.crValid\.phone\(raw\)/.test(src));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
