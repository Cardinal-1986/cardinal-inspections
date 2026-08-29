/* gate_737.mjs — paying a rep asks first, and every money question says the amount.
   The hole: data-paynet / data-payfull called payRep() with NO confirm. One tap
   marked every owed commission for a rep PAID, and Pay net also marked their
   outstanding draws repaid.

   The gate STUBS window.confirm so it can (a) read the exact question and
   (b) answer NO and assert the write never happened. Asserting the string alone
   would not prove the answer is honoured.

   Usage: node gate_737.mjs [path/to/index.html]     (v736 is the negative control) */
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
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin' },
                  { email: 'nick@cardinalrenovations.net', name: 'Nick Hey', role: 'sales' }],
  projects: [{ id: 'P1', name: 'Bob DeBuilder', stage: 'Invoiced', sales_rep: 'nick@cardinalrenovations.net',
               checklist: JSON.stringify({ lead: { claim_type: 'retail' } }),
               created_by: 'theo@cardinalrenovations.net', updated_at: now }],
  commissions: [
    { id: 'CM1', project_id: 'P1', rep_email: 'nick@cardinalrenovations.net', amount: 3405, status: 'pending', created_at: now },
    { id: 'CM2', project_id: 'P1', rep_email: 'nick@cardinalrenovations.net', amount: 0, status: 'paid', created_at: now }
  ],
  draws: [{ id: 'DR1', project_id: 'P1', rep_email: 'nick@cardinalrenovations.net', amount: 500, status: 'outstanding', paid_at: now }],
  collections: [], inspection_reports: [], estimates: [], contracts: [], crew_work_orders: [], punch_items: [], appointments: []
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
  window.__ASKED__ = [];
  window.__ANSWER__ = false;                       /* default NO — nothing may slip through */
  window.confirm = function (m) { window.__ASKED__.push(String(m)); return !!window.__ANSWER__; };
  window.alert = function () {};
  window.prompt = function () { return null; };
});
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
/* RIG REPAIR (build 1121 triage): builds 1080–1083 replaced every window.confirm()
   with the in-app ask sheet — window.crAsk(msg) -> Promise<boolean>. crAsk is a
   window-assigned global, so reassigning it AFTER boot intercepts every bare call.
   Same contract as the confirm stub above: record the question, answer __ANSWER__. */
await page.evaluate(() => {
  window.crAsk = function (m) { window.__ASKED__.push(String(m || '')); return Promise.resolve(!!window.__ANSWER__); };
  window.crTell = function (m) { window.__ASKED__.push('TELL:' + String(m || '')); };
});

/* the payout screen lives behind CardinalPayouts / a nav destination; drive its
   delegated handler directly through the DOM the module renders */
/* the module exports window.CardinalPay and renders into #payView; the burger
   destination is data-nav="pay". Open it the way the app does. */
await page.evaluate(() => { try { window.CardinalPay.open(); } catch (e) {} });
await page.waitForFunction(() => !!document.querySelector('[data-pay]'), null, { timeout: 8000 }).catch(() => {});
/* "Mark Paid" is a TWO-STEP control: [data-pay] expands the rep's choice row and
   only THEN are [data-paynet]/[data-payfull] rendered. Clicking once and looking
   for the net/full buttons finds nothing and silently skips the whole
   behavioural half — which is how this gate first went green on air. */
await page.evaluate(() => { const b = document.querySelector('[data-pay]'); if (b) b.click(); });
await page.waitForFunction(() => !!document.querySelector('[data-paynet],[data-payfull]'), null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(300);

const behaviour = await page.evaluate(async () => {
  /* reach the module's own scope through the click path if we can; otherwise
     assert on the shipped source, which is what the click path runs */
  const src = document.documentElement.outerHTML;
  return {
    /* 1080+: confirmPay awaits crAsk, so the guard reads `if(await confirmPay(...))`.
       Accept both spellings — the contract (payRep only behind confirmPay) is unchanged. */
    guardedNet: /if\(em\)\{ if\((?:await )?confirmPay\(em, true\)\) payRep\(em, true\); return; \}/.test(src),
    guardedFull: /if\(em\)\{ if\((?:await )?confirmPay\(em, false\)\) payRep\(em, false\); return; \}/.test(src),
    unguarded: /if\(em\)\{\s*payRep\(/.test(src),
    helper: (src.match(/function confirmPay\(em, deductDraws\)\{/g) || []).length,
    namesMoney: /'Mark ' \+ payMoney\(g\.owed\) \+ ' in commissions paid to ' \+ who/.test(src),
    namesDrawLine: /in outstanding draws will be marked repaid at the same time/.test(src),
    payAllTotal: /'Mark ' \+ payMoney\(_tot\) \+ ' in commissions paid across '/.test(src),
    drawNamed: /' draw to ' \+ repName\(_d\.rep_email\) \+ ' repaid\?'/.test(src),
    collNamed: /'Remove the ' \+ \(_c \? fmtMoney/.test(src)
  };
});
chk('Pay net is guarded by confirmPay', behaviour.guardedNet === true);
chk('Pay full is guarded by confirmPay', behaviour.guardedFull === true);
chk('NO unguarded payRep call survives', behaviour.unguarded === false);
chk('confirmPay is defined exactly once', behaviour.helper === 1, 'count ' + behaviour.helper);
chk('the question names the AMOUNT and the REP', behaviour.namesMoney === true);
chk('Pay net explains the draw deduction', behaviour.namesDrawLine === true);
chk('Pay all names the TOTAL, not just the rep count', behaviour.payAllTotal === true);
chk('repaying a draw names its amount and rep', behaviour.drawNamed === true);
chk('removing a collection names its amount', behaviour.collNamed === true);

/* ── the behavioural half: run confirmPay for real against seeded money ────── */
const asked = await page.evaluate(async () => {
  /* rebuild the module's inputs in page scope by calling through the same public
     surface the buttons use — groupOwed/payMoney/repName live in cr-pay-script's
     IIFE, so drive the delegated click if the screen rendered, else report null */
  const btn = document.querySelector('[data-paynet]') || document.querySelector('[data-payfull]');
  if (!btn) return { unreachable: true };
  window.__ASKED__ = []; window.__ANSWER__ = false; window.__WRITES__ = [];
  btn.click();
  await new Promise(r => setTimeout(r, 900));
  return {
    unreachable: false,
    q: window.__ASKED__.slice(),
    writes: (window.__WRITES__ || []).filter(w => w.table === 'commissions' && w.op === 'update').length
  };
});
if (asked.unreachable) {
  /* a silently-skipped assertion is a green that proves nothing — fail instead */
  chk('the payout screen is reachable so the behaviour CAN be tested', false, 'no [data-paynet]/[data-payfull] rendered');
} else {
  chk('clicking Pay asks a question', (asked.q || []).length === 1, JSON.stringify(asked.q));
  chk('the question contains a dollar amount', /\$[\d,]/.test((asked.q || [])[0] || ''), (asked.q || [])[0]);
  chk('answering NO writes NOTHING', asked.writes === 0, 'commission updates = ' + asked.writes);

  /* "nothing was written" is ALSO true of a button that does nothing at all —
     bug class 16 on this project. Prove the YES path still pays. */
  const yes = await page.evaluate(async () => {
    const btn = document.querySelector('[data-paynet]') || document.querySelector('[data-payfull]');
    if (!btn) return { none: true };
    window.__ASKED__ = []; window.__ANSWER__ = true; window.__WRITES__ = [];
    btn.click();
    await new Promise(r => setTimeout(r, 1200));
    return {
      writes: (window.__WRITES__ || []).filter(w => w.table === 'commissions' && w.op === 'update').length,
      paid: ((window.__SEED__ && window.__SEED__.commissions) || []).filter(c => c.status === 'paid').length
    };
  });
  chk('answering YES still pays (the button is not merely dead)',
      !yes.none && yes.writes >= 1 && yes.paid >= 1, JSON.stringify(yes));
}

/* ── nothing may have LOST a confirmation ─────────────────────────────────── */
/* RIG REPAIR (build 1121 triage): builds 1080–1083 converted confirm() guards to
   crAsk() (the in-app ask sheet). The invariant is the same — the app still asks
   before acting — so count BOTH forms against the same floor. (92 crAsk + 8
   confirm = 100 at build 1121.) */
const n = (APP_HTML.match(/\bconfirm\s*\(/g) || []).length +
          (APP_HTML.match(/\bcrAsk\s*\(/g) || []).length;
chk('the app still has at least 80 confirm()/crAsk() guards', n >= 80, 'found ' + n);
chk('deleting a client still demands the typed name',
    /Type the client\\u2019s name exactly to confirm deletion|Type the client’s name exactly to confirm deletion/.test(APP_HTML));
chk('bulk delete still demands the typed word DELETE', /Type DELETE to confirm removing/.test(APP_HTML));

await browser.close();
let fails = 0;
for (const c of checks) { console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.n}${c.d ? '  (' + c.d + ')' : ''}`); if (!c.pass) fails++; }
console.log(fails === 0 ? '\nGATE GREEN' : `\nGATE RED — ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
