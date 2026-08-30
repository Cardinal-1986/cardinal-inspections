/* Build 1165 — the Landing retired on ordinary hosts, KEPT for vision hosts.
   Executes the shipped functions in a real engine. Optional path arg → the
   negative control (v1164 shows the pane and must go RED). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const src = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, m) => c ? pass++ : (fail++, bad.push(m));
const to = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 90000);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => { fail++; bad.push('pageerror: ' + String(e).slice(0, 130)); });
await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

const shown = () => p.evaluate(() => {
  const lv = document.getElementById('landingView');
  return { landing: !!lv && getComputedStyle(lv).display !== 'none',
           fd: !!(window.CardinalFrontDoor && window.CardinalFrontDoor.isOpen && window.CardinalFrontDoor.isOpen()),
           main: (() => { const m = document.getElementById('mainView'); return !!m && getComputedStyle(m).display !== 'none'; })() };
});
const reset = () => p.evaluate(() => {
  try { window.CardinalFrontDoor.close(); } catch (_) {}
  const lv = document.getElementById('landingView'); if (lv) lv.style.display = 'none';
});

ok(await p.evaluate(() => typeof window.goToLanding === 'function'), 'goToLanding still exported');

/* ── ORDINARY HOST: the picker is the panel, not a screen ── */
await p.evaluate(() => {
  window.CardinalLanding = window.CardinalLanding || {};
  window.CardinalLanding.isVisionHost = () => false;
  window.isProductionUser = () => false;
});
await reset();
await p.evaluate(() => window.goToLanding());
let st = await shown();
ok(!st.landing, 'ordinary host: goToLanding does NOT paint the Landing');
ok(st.fd, 'ordinary host: goToLanding opens the Front Door');
ok(st.main, 'ordinary host: it lands on the CRM home underneath');

await reset();
await p.evaluate(() => window.showLanding());
st = await shown();
ok(!st.landing && st.fd, 'showLanding delegates on an ordinary host (logo / portal-sync)');

/* ── PRODUCTION: 1038's doctrine — never dropped on the retail home ── */
await reset();
const prod = await p.evaluate(() => {
  window.isProductionUser = () => true;
  let hub = false;
  window.CardinalProduction = { open: () => { hub = true; } };
  window.goToLanding();
  return { hub, fd: window.CardinalFrontDoor.isOpen() };
});
ok(prod.hub, 'production account exits to its own hub, not retail');
ok(prod.fd, 'production account still gets the picker');
await p.evaluate(() => { window.isProductionUser = () => false; });

/* ── VISION HOST: the pane MUST survive — it is the Vision hub's container ── */
await reset();
await p.evaluate(() => { window.CardinalLanding.isVisionHost = () => true; });
await p.evaluate(() => window.goToLanding());
st = await shown();
ok(st.landing, 'VISION HOST: the Landing pane still paints (Vision hub container)');
ok(!st.fd, 'vision host: the Front Door is not forced over it');
await p.evaluate(() => { window.CardinalLanding.isVisionHost = () => false; });
await reset();

/* ── structural: the source says what the behaviour claims ── */
const showMain = (() => { const i = src.indexOf('function showMain('); return i < 0 ? '' : src.slice(i, i + 9000); })();
ok(/_lvR[\s\S]{0,200}display = 'none'[\s\S]{0,300}showHome\(\)/.test(showMain),
   'showMain sign-in branch hides the pane and calls showHome');
ok(showMain.indexOf('if(_vision){') < showMain.indexOf('_lvR'),
   'the vision branch still returns BEFORE the new sign-in path');
ok(src.includes('data-nav="landing" data-cri="home lg">Switch portal<'), 'drawer row renamed "Switch portal"');
ok(src.includes("['#cr-fd [data-fd=\"retail\"]',     'Retail portal']"), 'Self Check probes the panel, not the retired pane');
ok(!src.includes("['#landingView [data-go=\"retail\"]',     'Retail portal']"), 'the old Self Check controls are gone');
ok(src.includes('id="landingView"'), '#landingView markup is NOT deleted');

/* the Self Check controls it now names must actually exist when the panel is open */
await p.evaluate(() => window.CardinalFrontDoor.open());
const sel = await p.evaluate(() => ['retail','insurance','community','production','sales']
  .filter(k => !document.querySelector('#cr-fd [data-fd="' + k + '"]')));
ok(sel.length === 0, 'all 5 Self Check selectors resolve in the live panel (missing: ' + sel.join(',') + ')');

clearTimeout(to);
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail));
bad.forEach(m => console.log('  ✗ ' + m));
await b.close();
process.exit(fail ? 1 : 0);
