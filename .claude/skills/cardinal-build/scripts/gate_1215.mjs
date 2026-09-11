/* gate_1215.mjs — the sign-in card opens on its heading, and nothing else moved.
 *
 *   node gate_1215.mjs [path/to/index.html]   the build must be GREEN
 *   node gate_1215.mjs <the 1214 artifact>    the control: RED
 *
 * Theo, on the 1213 change: "on pick 1 please remove logo." 1213 cleared the
 * LEFT of the sign-in screen; the card itself still opened with a wordmark.
 *
 * ⚠ SECTION B IS THE ONE THAT MATTERS, NOT A. "The element is gone" is easy and
 * almost worthless on its own — the failure worth catching is a mark that is
 * still drawn by some other path, or a card that lost more than the mark. So B
 * walks the card's own children in a real render and asserts NO image is painted
 * inside it at any width, and C asserts the heading is now the first thing in
 * the box rather than merely present somewhere in it.
 *
 * ⚠ AND SECTION D IS THE 1182 TRAP, KEPT DELIBERATELY. The daily quote lives in
 * the same boot block as the header and editor marks. An earlier build on this
 * file removed an embedded image and took the quote with it, because the only
 * reader found its target by regex and abandoned the whole function when the
 * match failed. Removing a different mark is exactly when to re-prove the quote.
 *
 * ⚠ The rig has to force the view open — the e2e mock signs you straight in, so
 * a probe that just boots measures the app and not the sign-in screen.
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
setTimeout(() => { console.log('\nGATE 1215 TIMEOUT'); process.exit(3); }, 300000).unref();

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
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const card = document.querySelector('.logincard');
  const q = document.getElementById('loginQuote');
  const ctl = id => seen(document.getElementById(id));
  const h2 = card && card.querySelector('h2');
  /* ⚠ BACKGROUND-IMAGE IS A LAYER LIST, AND TESTING THE WHOLE STRING IS A CHECK
     THAT CANNOT FAIL. The first version of this asked `!/gradient/.test(bi)` —
     and the card's own background is `linear-gradient(...), url(...)` in ONE
     string, so the gradient made the test skip the layer list whole, watermark
     included. A mark reinstated beside a gradient would have sailed through.
     Split the layers at top level (commas inside url() and gradient() are not
     separators) and judge each one. */
  const layers = (bi) => {
    const out = []; let depth = 0, cur = '';
    for (const ch of (bi || '')) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  const pictures = (el) => layers(getComputedStyle(el).backgroundImage)
    .filter(l => l !== 'none' && !/^(linear|radial|conic|repeating)-gradient/i.test(l));

  /* DESCENDANTS only — the card's own watermark is deliberate and is asserted
     separately, so it is not lumped in with a mark that should not be there. */
  const painted = [];
  if (card) {
    card.querySelectorAll('*').forEach(el => {
      if (el.tagName === 'IMG' && seen(el)) painted.push('img:' + (el.id || el.className || 'anon'));
      if (seen(el)) pictures(el).forEach(l => painted.push('bg:' + (el.id || el.className || el.tagName) + ':' + l.slice(0, 40)));
    });
  }
  const cardPictures = card ? pictures(card) : [];
  /* The first element child of the card that actually occupies space. */
  let firstVisible = null;
  if (card) for (const el of card.children) { if (seen(el)) { firstVisible = el; break; } }
  return {
    idInDom:    !!document.getElementById('loginLogo'),
    classInDom: !!card && !!card.querySelector('.loginlogo'),
    cardSeen: seen(card), cardBox: rect(card),
    painted: painted, cardPictures: cardPictures,
    firstTag: firstVisible ? firstVisible.tagName : null,
    firstText: firstVisible ? (firstVisible.textContent || '').trim().slice(0, 24) : null,
    h2Seen: seen(h2), h2Text: (h2 && h2.textContent || '').trim(),
    email: ctl('loginEmail'), pass: ctl('loginPassword'), btn: ctl('loginBtn'),
    remember: ctl('rememberMe'), forgot: ctl('forgotLink'), clock: ctl('loginClock'),
    quoteSeen: seen(q), quoteText: (q && q.textContent || '').trim(),
    sepSeen: seen(document.querySelector('.loginsep')),
    viewport: innerWidth
  };
};

console.log('gate_1215 on ' + FILE + '\n');
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const seenAt = {};
  for (const w of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 },
                                           serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.route('**/*', async (route) => {
      const u = route.request().url(), rt = route.request().resourceType();
      if (u === 'https://app.cardinalroster.com/')
        return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: APP });
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status:200, contentType:'application/javascript', body: NOSESSION });
      if (u.includes('chart') || u.includes('papaparse'))
        return route.fulfill({ status:200, contentType:'application/javascript', body:'window.Chart=function(){};window.Papa={};' });
      if (u.startsWith('https://app.cardinalroster.com/') && rt === 'image')
        return route.fulfill({ status:200, contentType:'image/jpeg', body: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==','base64') });
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
    await ctx.close();
  }

  console.log('A  the mark is not in the document');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.idInDom === false, w + 'px: the element is gone entirely, not hidden');
    ok(r.classInDom === false, w + 'px:   · and nothing in the card wears its class');
  }

  console.log('\nB  NOTHING INSIDE THE BOX PAINTS A PICTURE — by any route');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.cardSeen, w + 'px: the box is on screen', JSON.stringify(r.cardBox));
    ok(r.painted.length === 0, w + 'px:   · no child paints an image or a background picture',
       r.painted.join(' | ') || 'nothing painted');
  }

  console.log("\nB2 THE CARD'S OWN ENGRAVED WATERMARK IS UNTOUCHED — it is not the mark that went");
  /* Theo asked for the logo off the box, and the wordmark is what that means.
     The engraving across the foot of the card is a different thing and stays;
     asserting it here means a later build cannot quietly take it out, and it is
     the layer the first version of this gate was blind to. */
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.cardPictures.length === 1, w + 'px: the card still paints exactly one picture of its own',
       r.cardPictures.join(' | ') || 'none');
    ok(r.cardPictures.some(l => /url\(/i.test(l)), w + 'px:   · and it is a real image, not a gradient',
       r.cardPictures.map(l => l.slice(0, 52)).join(' | ') || 'none');
  }

  console.log('\nC  the box now OPENS on its heading');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.firstTag === 'H2', w + 'px: the first thing in the box is the heading',
       r.firstTag + ' ' + JSON.stringify(r.firstText));
    ok(r.h2Seen && /sign in/i.test(r.h2Text), w + 'px:   · and it reads as the sign-in heading',
       JSON.stringify(r.h2Text));
  }

  console.log('\nD  every control, the quote and the rule are untouched');
  for (const w of [1440, 390]) {
    const r = seenAt[w];
    ok(r.email && r.pass && r.btn && r.remember && r.forgot && r.clock,
       w + 'px: email, password, Sign in, Remember me, Forgot, clock',
       JSON.stringify({ email:r.email, pass:r.pass, btn:r.btn, remember:r.remember,
                        forgot:r.forgot, clock:r.clock }));
    ok(r.quoteSeen && r.quoteText.length > 20,
       w + 'px:   · THE DAILY QUOTE still renders with real text',
       JSON.stringify(r.quoteText.slice(0, 44)));
    ok(r.sepSeen, w + 'px:   · and the rule above it');
  }

  console.log('\nE  the box is still centred at desktop width');
  {
    const r = seenAt[1440];
    if (r.cardBox) {
      const mid = r.cardBox.x + r.cardBox.w / 2;
      ok(Math.abs(mid - 720) <= 6, '1440px: centred', 'centre ' + Math.round(mid) + ' vs 720');
    } else { ok(false, '1440px: centred', 'no box measured'); }
  }
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

console.log('');
ok(checks >= 21, 'coverage floor: ' + checks + ' checks ran (>= 21)');
console.log('\n' + (fails === 0 ? `GATE 1215 GREEN — ${checks} checks passed`
                                : `GATE 1215 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
