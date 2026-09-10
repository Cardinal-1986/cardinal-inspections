#!/usr/bin/env node
/* gate_1208 — the Lead form takes a phone-in, and still guards a job.
 *
 *   node gate_1208.mjs [index.html]        the build must be GREEN
 *   node gate_1208.mjs <1207 index.html>   the control: RED
 *
 *   A  STATIC: stamp, changelog, the guard, and the labels that stopped lying.
 *   B  Phone 390: open the Lead form — State reads OH before anything is typed.
 *   C  A phone-in (first + last, no address) SAVES. 1207 refuses it with
 *      "Required: Street, City, State, Zip".
 *   D  Setting a Job Category makes the address required again, and the message
 *      says why. First and Last are still refused when blank — this build must
 *      not have loosened them.
 *
 * ⚠ It drives the SHIPPED #ldSave click handler and reads #ldError, rather than
 * re-implementing the rule: a harness seeded from my own assumption validates
 * fiction, which this project has paid for three times.
 *
 * ⚠ A skipped browser section is a FAILURE here, not a pass (BUG_CLASSES 87).
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, '../../../..');
const artifact = resolve(process.argv[2] || resolve(root, 'index.html'));
const html = readFileSync(artifact, 'utf8');
/* ⚠ THE WATCHDOG MUST TAKE THE BROWSER WITH IT. A bare process.exit(3) here
   leaves Playwright's Chromium running as an orphan holding the stdout pipe it
   inherited, and gate_chromium's execFileSync then blocks reading that pipe
   FOREVER — 85 minutes of CI on 10 Sep, cancelled by hand, on a suite that
   takes 5m31s. The runner now writes child output to a file so it can never
   happen again from that side; this is the same fix from this side. */
let BROWSER = null;
setTimeout(async () => {
  console.log('GATE TIMEOUT');
  try { if (BROWSER) await BROWSER.close(); } catch (_) {}
  process.exit(3);
}, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; return !!c; };

console.log('\nA  static');
const st = html.match(/data-cr-footer[^>]*>v\d{4}-\d\d-\d\d build (\d+)/);
ok(!!st && Number(st[1]) >= 1208, 'app stamp is 1208 or above', st ? 'build ' + st[1] : 'none');
ok(/\{\s*b:\s*1208\s*,/.test(html), 'CHANGELOG carries a build-1208 entry');
ok(html.includes('var _needAddr = !!(_cat instanceof HTMLSelectElement && _cat.value);'), 'the address guard is keyed on Job Category');
ok(html.includes("if(_ldSt instanceof HTMLSelectElement) _ldSt.value = 'OH';"), 'the form opens on Ohio');
ok(!html.includes("'ldState','ldCategory'"), 'and ldState is no longer blanked with the other selects');
ok(html.includes('<label>City') && !html.includes('<label>City *'), 'City lost the star it could not keep');
ok(html.includes('<label>Zip') && !html.includes('<label>Zip *'), 'so did Zip');
ok(html.includes('Needed once you set a Job Category'), 'and the block says what actually makes it required');
ok(html.split("if(!first) missing.push('First Name');").length - 1 === 1 &&
   html.split("if(!last) missing.push('Last Name');").length - 1 === 1,
   'First and Last are still unconditional');

const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
const setupPath = resolve(here, 'sentinel_setup_cardinal.js');
const mockPath = resolve(here, 'e2e_mock_supa.js');

if (!(existsSync(setupPath) && existsSync(mockPath))) {
  ok(false, 'sections B-D RAN — a skipped browser section is not a pass',
     `setup:${existsSync(setupPath)} mock:${existsSync(mockPath)}`);
} else {
  const { chromium } = require_(PW);
  const SETUP = readFileSync(setupPath, 'utf8'); const MOCK = readFileSync(mockPath, 'utf8');
  let browser = null;
  try {
    browser = await launchChromium(chromium);
    BROWSER = browser;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.addInitScript(SETUP);
    await page.route('**/*', async (route) => {
      const u = route.request().url(); const url = new URL(u);
      if (url.hostname === 'app.cardinalroster.com') {
        if (url.pathname === '/' || url.pathname === '/index.html')
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        if (url.pathname.startsWith('/api/'))
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[],"items":[]}' });
        const f = resolve(root, '.' + url.pathname);
        if (existsSync(f) && !url.pathname.endsWith('.html')) return route.fulfill({ status: 200, body: readFileSync(f) });
        return route.fulfill({ status: 404, body: '' });
      }
      if (u.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
      if (u.includes('chart.js') || u.includes('papaparse'))
        return route.fulfill({ status: 200, contentType: 'application/javascript',
          body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};' });
      return route.abort();
    });
    await page.goto('https://app.cardinalroster.com/?as=nick', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    /* Drive the SHIPPED form: openLeadForm(), fill, click #ldSave, read #ldError
       and window.__WRITES__ — never a re-implementation of the rule. */
    const attempt = (fields) => page.evaluate(async (fields) => {
      try { window.openLeadForm(); } catch (e) { return { err: 'openLeadForm threw: ' + e.message }; }
      await new Promise(r => setTimeout(r, 400));
      const before = (window.__WRITES__ || []).length;
      const stateAtOpen = (document.getElementById('ldState') || {}).value;
      Object.keys(fields).forEach((id) => {
        if (id === '__phone') {
          /* ⚠ THE LEAD DOOR ALREADY REQUIRES A WAY TO REACH THE CLIENT — build
             782, with a message that names what breaks without one and offers a
             tick box for the genuine exception. That is audit option 7a, already
             shipped on THIS door, which is why a phone-in here supplies a phone:
             it is not what 1208 changed, and a test that omitted it was testing
             782's rule, not this build's. */
          const pi = document.querySelector('#ldPhones .ldrow input');
          if (pi) pi.value = fields[id];
          return;
        }
        if (id === '__claim') {
          const r = document.querySelector('input[name="ldClaimType"][value="' + fields[id] + '"]');
          if (r) r.checked = true;
          return;
        }
        const el = document.getElementById(id);
        if (el) el.value = fields[id];
      });
      const save = document.getElementById('ldSave');
      if (!save) return { err: 'no #ldSave' };
      save.click();
      await new Promise(r => setTimeout(r, 1100));
      const err = (document.getElementById('ldError') || {}).textContent || '';
      const modal = document.getElementById('leadFormModal');
      return { stateAtOpen, err: err.trim(),
               wrote: (window.__WRITES__ || []).length - before,
               closed: !!modal && getComputedStyle(modal).display === 'none' };
    }, fields);

    console.log('\nB  the form opens on Ohio');
    const first = await attempt({ ldFirst: 'Phone', ldLast: 'Inn', __phone: '937-555-0134', __claim: 'retail', ldSource: 'Referral' });
    ok(!/threw|no #/.test(first.err || ''), 'the Lead form opens', first.err || 'open');
    ok(html.includes('Add a phone number or an email address'),
       'and 782 already requires a way to reach the client — audit 7a, on this door');
    ok(html.includes('Pick where this lead came from'),
       'and a Lead Source, which the form opens the expander for rather than hiding');
    ok(first.stateAtOpen === 'OH', 'State reads OH before anything is typed',
       JSON.stringify(first.stateAtOpen));

    console.log('\nC  a phone-in saves — a name and a phone number, no address');
    ok(first.err === '', 'no complaint about an address', JSON.stringify(first.err) || 'silent');
    ok(first.wrote > 0, 'and the lead was actually written', first.wrote + ' write(s)');
    ok(first.closed === true, 'the form closed behind it');

    console.log('\nD  a Job Category still needs the job’s address');
    const cat = await attempt({ ldFirst: 'Desk', ldLast: 'Lead', __phone: '937-555-0135', __claim: 'retail', ldSource: 'Referral', ldCategory: 'Residential' });
    ok(/Street/.test(cat.err) && /City/.test(cat.err) && /Zip/.test(cat.err),
       'setting a category asks for the address again', JSON.stringify(cat.err));
    ok(/Job Category needs the address/.test(cat.err), 'and the message says why', JSON.stringify(cat.err));
    ok(cat.wrote === 0, 'nothing was written on that refusal', cat.wrote + ' write(s)');
    const full = await attempt({ ldFirst: 'Desk', ldLast: 'Lead', __phone: '937-555-0136',
                                 __claim: 'retail', ldSource: 'Referral', ldCategory: 'Residential',
                                 ldStreet: '9 Test Rd', ldCity: 'Dayton', ldZip: '45402' });
    ok(full.err === '', 'filling it saves — and State did not have to be touched',
       JSON.stringify(full.err) || 'silent');
    ok(full.wrote > 0, 'that one was written too', full.wrote + ' write(s)');
    const noName = await attempt({ ldFirst: '', ldLast: '', __phone: '937-555-0137', __claim: 'retail', ldSource: 'Referral' });
    ok(/First Name/.test(noName.err) && /Last Name/.test(noName.err),
       'a nameless lead is still refused — this build loosened nothing else',
       JSON.stringify(noName.err));
    ok(noName.wrote === 0, 'and nothing was written for it', noName.wrote + ' write(s)');
  } catch (e) {
    ok(false, 'the browser sections ran without throwing', String(e && e.message || e));
  } finally {
    if (browser) await browser.close();
  }
}

console.log(`\n${fail ? 'GATE 1208 RED' : 'GATE 1208 GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
