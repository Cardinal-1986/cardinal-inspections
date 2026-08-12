/* gate_741.mjs — required fields are marked, and a refused save points at the box.

   The assertions that earn this build:
     1. THE DEAD MESSAGE IS ALIVE. #cpForm carried <input required> and submitted
        natively, so the browser blocked first and the app's own "Name is required."
        had never rendered once. This gate asserts the SUBMIT HANDLER RUNS, which is
        the thing that was broken — a shake wired into a handler that never fires is
        a control that renders and is never reached.
     2. IT STILL REFUSES. novalidate removes the browser's guard, so the gate proves
        the JS guard really does block the write. If this passes and (2) fails, the
        build has opened a hole.
     3. EXACTLY ONE asterisk per field — no doubling where a mark already existed.

   Usage: node gate_741.mjs [path/to/index.html]     (v740 is the negative control) */
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
  community_partners: [{ id: 'PA1', name: 'Habitat', partner_type: 'nonprofit', contact_name: 'G',
    contact_email: 'g@habitatdayton.org', contact_phone: '', address: '', notes: '', archived: false,
    confidential: false, prospective: false, created_at: now, updated_at: now }],
  community_properties: []
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
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {} }) }); } catch (e) {}
  window.__ALERTS__ = []; window.alert = m => window.__ALERTS__.push(String(m));
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);

/* ── 1. the helper ────────────────────────────────────────────────────────── */
const helper = await page.evaluate(async () => {
  if (!window.crValid || !window.crValid.require) return { missing: true };
  const i = document.createElement('input');
  i.type = 'text'; document.body.appendChild(i);
  const ret = window.crValid.require(i, 'Client name is required.');
  const out = { ret, bad: i.classList.contains('cr-bad'), shake: i.classList.contains('cr-shake'),
                aria: i.getAttribute('aria-invalid'), title: i.title, focused: document.activeElement === i,
                anim: getComputedStyle(i).animationName };
  i.remove();
  /* it must survive a missing element — several guards run where the field may not be rendered */
  let threw = false;
  try { window.crValid.require(null, 'x'); } catch (e) { threw = true; }
  out.nullSafe = !threw;
  return out;
});
chk('window.crValid.require exists', !helper.missing);
chk('it returns false so a guard can be one line', helper.ret === false, String(helper.ret));
chk('it flags the field', helper.bad === true && helper.aria === 'true', JSON.stringify(helper));
chk('it SHAKES with a real animation', helper.shake === true && helper.anim === 'crShake', helper.anim);
chk('it takes the cursor', helper.focused === true, String(helper.focused));
chk('it carries the message', /required/i.test(helper.title || ''), helper.title);
chk('a null element does not throw', helper.nullSafe === true, String(helper.nullSafe));

/* ── 2. THE DEAD MESSAGE — Add Partner ────────────────────────────────────── */
const partner = await page.evaluate(async () => {
  const P = window.CardinalCommunityPartners;
  await P.load(true);
  P.openEditor(null);                       /* a NEW partner, so name is empty */
  await new Promise(r => setTimeout(r, 400));
  const form = document.querySelector('#cpForm');
  if (!form) return { noForm: true };
  const name = form.querySelector('[name="name"]');
  let submitFired = false;
  form.addEventListener('submit', () => { submitFired = true; }, true);
  window.__WRITES__ = [];
  form.querySelector('button[type="submit"]').click();
  await new Promise(r => setTimeout(r, 400));
  const err = document.querySelector('#cpErr');
  return {
    stillRequired: name.hasAttribute('required'),
    novalidate: form.hasAttribute('novalidate'),
    submitFired,
    errShown: err ? getComputedStyle(err).display !== 'none' : false,
    errText: err ? err.textContent : '',
    flagged: name.classList.contains('cr-bad'),
    focused: document.activeElement === name,
    writes: (window.__WRITES__ || []).filter(w => w.table === 'community_partners').length,
    asterisks: (form.querySelectorAll('.cr-req') || []).length
  };
});
chk('the Add Partner form is reachable', !partner.noForm, JSON.stringify(partner));
chk('THE HANDLER NOW RUNS (it never did before)', partner.submitFired === true, String(partner.submitFired));
chk("and Cardinal's own message is what appears", /Name is required/.test(partner.errText || ''), partner.errText);
chk('the name box is flagged', partner.flagged === true, String(partner.flagged));
chk('and takes the cursor', partner.focused === true, String(partner.focused));
chk('IT STILL REFUSES — nothing was written', partner.writes === 0, 'writes = ' + partner.writes);
chk('the required attribute is still on the field', partner.stillRequired === true, String(partner.stillRequired));
chk('exactly ONE asterisk on the form (name)', partner.asterisks === 1, 'found ' + partner.asterisks);

/* a good name must still save — the guard is not a wall */
const partnerOk = await page.evaluate(async () => {
  const form = document.querySelector('#cpForm');
  form.querySelector('[name="name"]').value = 'Habitat for Humanity';
  window.__WRITES__ = [];
  form.querySelector('button[type="submit"]').click();
  await new Promise(r => setTimeout(r, 600));
  return { writes: (window.__WRITES__ || []).filter(w => w.table === 'community_partners').length };
});
chk('a filled-in name still saves (not a dead form)', partnerOk.writes >= 1, 'writes = ' + partnerOk.writes);

/* ── 3. Add Property — the same shape ─────────────────────────────────────── */
const prop = await page.evaluate(async () => {
  /* openEditor() is defined in this module but NOT exported (openDirectory is),
     so the form is reached the way a person reaches it: open the directory for a
     partner and click "+ Add Property". A name is not a contract. */
  const M = window.CardinalCommunityProperties;
  if (!M || !M.openDirectory) return { noModule: true };
  try { await M.load(true); M.openDirectory('PA1'); } catch (e) { return { threw: String(e) }; }
  await new Promise(r => setTimeout(r, 500));
  const add = document.querySelector('[data-act="add"]');
  if (!add) return { noAddBtn: true };
  add.click();
  await new Promise(r => setTimeout(r, 400));
  const form = document.querySelector('#cpropForm');
  if (!form) return { noForm: true };
  const addr = form.querySelector('[name="address"]');
  let submitFired = false;
  form.addEventListener('submit', () => { submitFired = true; }, true);
  window.__WRITES__ = [];
  form.querySelector('button[type="submit"]').click();
  await new Promise(r => setTimeout(r, 400));
  const err = document.querySelector('#cpropErr');
  return { novalidate: form.hasAttribute('novalidate'), submitFired,
           errText: err ? err.textContent : '', flagged: addr.classList.contains('cr-bad'),
           writes: (window.__WRITES__ || []).filter(w => w.table === 'community_properties').length,
           asterisks: (form.querySelectorAll('.cr-req') || []).length };
});
if (prop.noModule || prop.noForm || prop.threw || prop.noAddBtn) {
  chk('Add Property form is reachable in the harness', false, JSON.stringify(prop));
} else {
  chk('Add Property: the handler runs', prop.submitFired === true, String(prop.submitFired));
  chk('Add Property: Cardinal\'s own message appears', /Address is required/.test(prop.errText || ''), prop.errText);
  chk('Add Property: the box is flagged', prop.flagged === true, String(prop.flagged));
  chk('Add Property: nothing was written', prop.writes === 0, 'writes = ' + prop.writes);
  chk('Add Property: exactly one asterisk', prop.asterisks === 1, 'found ' + prop.asterisks);
}

/* ── 4. the marks, counted in the SOURCE — one per field, no doubles ─────── */
/* the SOURCE FILE, not document.outerHTML. A form that is open renders its own
   markup, so the live DOM contains both the script's string literal AND the
   element built from it — this counted 7 asterisks for 6 literals. */
const src = APP_HTML;
chk('six new asterisks were placed', (src.match(/class="cr-req"/g) || []).length === 6,
    'found ' + (src.match(/class="cr-req"/g) || []).length);
chk('the .cr-req style is defined once', (src.match(/\.cr-req\{/g) || []).length === 1);
/* no field may end up with two marks: the modules that already had one must not
   have gained a second */
chk('cr-nbid keeps its own single asterisk, ungained', /Partner <span class="req">\*<\/span>/.test(src) && !/Partner <span class="req">\*<\/span><span class="cr-req">/.test(src));
chk('cr-nachi keeps "Title *" and gained nothing', /<label>Title \*<\/label>/.test(src) && !/Title \*<span class="cr-req">/.test(src));
chk('pfName keeps its single in-label asterisk', /Client name \*<input type="text" id="pfName"/.test(src));
chk('cr-sol / cr-ci amber+pink asterisks are untouched', /#cr-sol \.req\{color:#fcd34d\}/.test(src) && /#cr-ci \.req\{color:#f08a90\}/.test(src));
chk('six guards call require()', (src.match(/window\.crValid\.require\(/g) || []).length === 6,
    'found ' + (src.match(/window\.crValid\.require\(/g) || []).length);

/* ── 5. 739 and 740 must still work ───────────────────────────────────────── */
const prev = await page.evaluate(async () => {
  const mk = (attrs, v) => { const i = document.createElement('input'); for (const k in attrs) i.setAttribute(k, attrs[k]); i.value = v; document.body.appendChild(i); return i; };
  const blur = async (i) => { i.focus(); i.blur(); await new Promise(r => setTimeout(r, 120)); };
  const tel = mk({ type: 'tel' }, '937-555-0101');
  const eml = mk({ type: 'email' }, 'galen@habitat');
  await blur(tel); await blur(eml);
  const out = { tel: tel.value, emlBad: eml.classList.contains('cr-bad'), emlV: eml.value };
  tel.remove(); eml.remove();
  return out;
});
chk('BUILD 739 STILL WORKS — phone normalises', prev.tel === '(937) 555-0101', prev.tel);
chk('BUILD 740 STILL WORKS — a bad email is flagged and kept', prev.emlBad === true && prev.emlV === 'galen@habitat', JSON.stringify(prev));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
