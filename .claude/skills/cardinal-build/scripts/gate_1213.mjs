/* gate_1213.mjs — the sign-in screen is the sign-in box, and it kept its quote.
 *
 *   node gate_1213.mjs [path/to/index.html]   the build must be GREEN
 *   node gate_1213.mjs <the 1212 artifact>    the control: RED
 *
 * Theo: "no logo at all on the left of the sign in. Just the sign in box."
 *
 * ⚠ THE CHECK THAT MATTERS IS D, NOT A. Removing the left panel is easy to
 * prove. The thing that would have shipped broken is the desktop rule that hid
 * the card's own quote BECAUSE the panel carried it — leave that in and the
 * daily quote vanishes from the desktop sign-in, silently, by hiding an element
 * whose replacement no longer exists.
 *
 * ⚠ The rig has to force the view open. The e2e mock signs you straight in, so a
 * probe that just boots reports the login "not shown" and measures the app
 * instead — which is what the first version of this did, and it proved nothing.
 * A no-session client plus the view's own `.open` class is the only way to see
 * the real screen.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };
setTimeout(() => { console.log('\nGATE 1213 TIMEOUT'); process.exit(3); }, 300000).unref();

const NOSESSION = `
export function createClient(){
  const noop = async () => ({ data:{ session:null, user:null }, error:null });
  return { auth:{ getSession:noop, getUser:noop,
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      signInWithPassword:noop, signOut:noop, resetPasswordForEmail:noop, updateUser:noop },
    from(){ const o={}; ['select','eq','neq','in','order','limit','like','ilike','or','not','gte','lte','insert','update','upsert','delete','range','single','maybeSingle'].forEach(m=>o[m]=()=>o);
      o.then=(r)=>Promise.resolve({data:[],error:null}).then(r); return o; },
    storage:{ from(){ return { createSignedUrl:async()=>({data:null,error:null}), createSignedUrls:async()=>({data:[],error:null}), upload:async()=>({data:null,error:null}), list:async()=>({data:[],error:null}) }; } },
    channel(){ return { on(){return this;}, subscribe(){return this;} }; },
    removeChannel(){}, rpc: async () => ({ data:null, error:null }) };
}
export default { createClient };`;

const READ = function () {
  const seen = (el) => { if (!el) return false; const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width) }; };
  const card = document.querySelector('.logincard');
  const q = document.getElementById('loginQuote');
  const ctl = id => seen(document.getElementById(id));
  return {
    heroInDom: !!document.querySelector('.loginhero'),
    artInDom:  !!document.querySelector('.heroart'),
    heroSeen:  seen(document.querySelector('.loginhero')),
    cardSeen:  seen(card), cardBox: rect(card),
    logoSeen:  seen(document.getElementById('loginLogo')),
    quoteSeen: seen(q), quoteText: (q && q.textContent || '').trim(),
    sepSeen:   seen(document.querySelector('.loginsep')),
    email: ctl('loginEmail'), pass: ctl('loginPassword'), btn: ctl('loginBtn'),
    remember: ctl('rememberMe'), forgot: ctl('forgotLink'), clock: ctl('loginClock'),
    viewport: innerWidth
  };
};

console.log('gate_1213 on ' + FILE + '\n');
let browser = null;
const fetchedImages = {};
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const seenAt = {};
  for (const w of [1440, 390]) {
    const imgs = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.route('**/*', async (route) => {
      const u = route.request().url(), rt = route.request().resourceType();
      if (u === 'https://app.cardinalroster.com/')
        return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: APP });
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status:200, contentType:'application/javascript', body: NOSESSION });
      if (u.includes('chart') || u.includes('papaparse'))
        return route.fulfill({ status:200, contentType:'application/javascript', body:'window.Chart=function(){};window.Papa={};' });
      if (u.startsWith('https://app.cardinalroster.com/') && rt === 'image') {
        imgs.push(u.replace('https://app.cardinalroster.com',''));
        return route.fulfill({ status:200, contentType:'image/jpeg', body: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==','base64') });
      }
      if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status:200, body:'' });
      return route.abort();
    });
    await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3200);
    await page.evaluate(() => {
      const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none';
      const m = document.getElementById('mainView'); if (m) m.style.display = 'none';
      const l = document.getElementById('landingView'); if (l) l.style.display = 'none';
      const lv = document.getElementById('loginView');
      if (lv) { lv.classList.add('open'); if (getComputedStyle(lv).display === 'none') lv.style.display = 'block'; }
      ['header.site','footer.site','#pwaNav','#cr-lnav','#cr-hd2-bar','#cr-hd2-ribbon','#cr-dark-toggle']
        .forEach(sel => document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; }));
    });
    await page.waitForTimeout(600);
    seenAt[w] = await page.evaluate(READ);
    fetchedImages[w] = imgs;
    await ctx.close();
  }

  console.log('A  the left panel is gone at every width');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.heroInDom === false, w + 'px: the hero panel is not in the document at all');
    ok(r.artInDom === false, w + 'px:   · nor its photograph');
  }

  console.log('\nB  the sign-in box is still there, and centred');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.cardSeen, w + 'px: the sign-in box is on screen', JSON.stringify(r.cardBox));
    if (r.cardBox) {
      const mid = r.cardBox.x + r.cardBox.w / 2;
      ok(Math.abs(mid - w / 2) <= 6, w + 'px:   · and centred', 'centre ' + Math.round(mid) + ' vs ' + (w / 2));
    }
  }

  console.log('\nC  every control on the box survived');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.logoSeen && r.email && r.pass && r.btn && r.remember && r.forgot && r.clock,
       w + 'px: logo, email, password, Sign in, Remember me, Forgot, clock',
       JSON.stringify({ logo:r.logoSeen, email:r.email, pass:r.pass, btn:r.btn,
                        remember:r.remember, forgot:r.forgot, clock:r.clock }));
  }

  console.log('\nD  THE DAILY QUOTE SURVIVED — the trap this build had to avoid');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.quoteSeen, w + 'px: the quote is visible under the box');
    ok(r.quoteText.length > 20, w + 'px:   · and it has real text in it',
       JSON.stringify(r.quoteText.slice(0, 48)));
    ok(r.sepSeen, w + 'px:   · and the rule above it');
  }

  console.log('\nE  the hero photograph is no longer downloaded — on phones either');
  for (const w of [1440, 390]) {
    const hero = (fetchedImages[w] || []).filter(u => u.includes('wm-home'));
    ok(hero.length === 0, w + 'px: it is never requested', (fetchedImages[w] || []).join(' ') || 'no images');
  }
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

console.log('');
ok(checks >= 18, 'coverage floor: ' + checks + ' checks ran (>= 18)');
console.log('\n' + (fails === 0 ? `GATE 1213 GREEN — ${checks} checks passed`
                                : `GATE 1213 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
