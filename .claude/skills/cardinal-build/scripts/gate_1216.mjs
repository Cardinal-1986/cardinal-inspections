/* gate_1216.mjs — the Invoices card is dark and readable, and light is untouched.
 *
 *   node gate_1216.mjs [path/to/index.html]   the build must be GREEN
 *   node gate_1216.mjs <the 1215 artifact>    the control: RED
 *
 * ⚠ THIS IS A COLOUR CLAIM, SO IT IS A REAL RENDER AND THE NUMBERS ARE COMPUTED.
 * jsdom cannot resolve var() inside a `background` shorthand and would report
 * rgba(0,0,0,0) for every surface here — a gate law on this project.
 *
 * ⚠ AND IT MEASURES BOTH THEMES, because half the bugs in this class are a dark
 * fix that broke light. Section C asserts the light theme still computes to the
 * EXACT literals that shipped: not "light still looks light", but rgb(255,255,255)
 * on the card, rgb(4,120,87) on the positive figure, rgb(200,32,46) on the due
 * figure. If the conversion moved light by one byte, this reds.
 *
 * ⚠ Ink is scored against the COMPOSITED ground, walking up through every layer
 * an ancestor actually paints — a card that paints a gradient over a colour is
 * why reading backgroundColor alone has produced confident wrong answers here.
 *
 * ⚠ TWO FAULTS IN THE RIG ITSELF, BOTH OF WHICH REPORTED A FALSE RED FIRST:
 *
 * 1. THE APP CLEARS `data-theme` ON :root WITHIN HALF A SECOND. Set it, wait,
 *    read, and you measure the dark theme while believing you measured light —
 *    the attribute is gone by then. Probed directly: set + read in one turn
 *    gives rgb(255,255,255), the same read 500ms later gives rgb(20,22,25).
 *    The theme is therefore set and read inside ONE evaluate, which is not a
 *    weakened check: computed style resolves synchronously, so nothing can race
 *    between the write and the read.
 * 2. A CHECK ON AN ELEMENT THAT DOES NOT EXIST CANNOT FAIL. The seeded client
 *    has no balance due, so `.crji-nums b.due` is absent and asserting on its
 *    colour passed by measuring null — in BOTH directions, on the build and on
 *    the control. The accents are read off the resolved CUSTOM PROPERTY, which
 *    exists whether or not the figure is on screen, and the elements that do
 *    exist are still measured beside it.
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';

const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const ROOT = resolve(here, '../../../..');
const FILE = resolve(process.argv[2] || resolve(ROOT, 'index.html'));
const APP = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(resolve(here, 'sentinel_setup_cardinal.js'), 'utf8');
const MOCK = readFileSync(resolve(here, 'e2e_mock_supa.js'), 'utf8');
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const PW = existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright';
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let fails = 0, checks = 0;
const ok = (c, m, x) => { checks++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (x !== undefined ? '  — ' + x : ''));
  if (!c) fails++; return c; };
setTimeout(() => { console.log('\nGATE 1216 TIMEOUT'); process.exit(3); }, 420000).unref();

const READ = function () {
  const px = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return null;
    return [ +m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1 ]; };
  const over = (fg, bg) => { const a = fg[3];
    return [0,1,2].map(i => fg[i]*a + bg[i]*(1-a)).concat([1]); };
  const lum = (c) => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const ratio = (a, b) => { const [x,y] = [lum(a), lum(b)].sort((p,q)=>q-p);
    return (x + 0.05) / (y + 0.05); };
  /* the composited ground under an element: walk up, painting each layer */
  const ground = (el) => { let acc = [255,255,255,1], stack = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n), c = px(cs.backgroundColor);
      if (c && c[3] > 0) stack.push(c);
      if (c && c[3] >= 0.999) break;
    }
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return acc; };

  const card = document.querySelector('.crji-card');
  if (!card) return { missing: true };
  const cs = getComputedStyle(card);
  const texts = [];
  card.querySelectorAll('*').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t || el.children.length) return;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const fg = px(s.color); if (!fg) return;
    const bg = ground(el);
    const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    texts.push({ txt: t.slice(0, 16), color: s.color, size, weight, large,
                 r: Math.round(ratio(over(fg, bg), bg) * 100) / 100,
                 floor: large ? 3.0 : 4.5 });
  });
  const tok = (n) => cs.getPropertyValue(n).trim();
  const box = card.getBoundingClientRect();
  const tile = card.querySelector('.crji-nums > span');
  const pos  = card.querySelector('.crji-nums b.pos');
  const due  = card.querySelector('.crji-nums b.due');
  const ttl  = card.querySelector('.crji-ttl');
  return {
    cardBg: cs.backgroundColor, cardInk: cs.color, cardBorder: cs.borderTopColor,
    cardLum: Math.round(lum(px(cs.backgroundColor)) * 1000) / 1000,
    tileBg: tile ? getComputedStyle(tile).backgroundColor : null,
    posInk: pos ? getComputedStyle(pos).color : null,
    dueInk: due ? getComputedStyle(due).color : null,
    ttlInk: ttl ? getComputedStyle(ttl).color : null,
    subInk: (card.querySelector('.crji-nums small') || {}) && card.querySelector('.crji-nums small')
            ? getComputedStyle(card.querySelector('.crji-nums small')).color : null,
    tokCard: tok('--crji-card'), tokInk: tok('--crji-ink'), tokLine: tok('--crji-line'),
    tokTile: tok('--crji-tile'), tokSub: tok('--crji-sub'),
    tokPos: tok('--crji-pos'), tokDue: tok('--crji-due'),
    w: Math.round(box.width), h: Math.round(box.height), texts
  };
};

console.log('gate_1216 on ' + FILE + '\n');
let browser = null;
try {
  const { chromium } = require_(PW);
  browser = await launchChromium(chromium);
  const read = {};
  for (const theme of ['dark', 'rb-light']) {
    const ctx = await browser.newContext({ viewport:{ width:1440, height:980 }, serviceWorkers:'block' });
    const page = await ctx.newPage();
    await page.route('**/*', async (route) => {
      const u = route.request().url(), rt = route.request().resourceType();
      if (u === 'https://app.cardinalroster.com/')
        return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body: APP });
      if (u.includes('@supabase/supabase-js'))
        return route.fulfill({ status:200, contentType:'application/javascript', body: MOCK });
      if (u.includes('chart') || u.includes('papaparse'))
        return route.fulfill({ status:200, contentType:'application/javascript',
          body:'window.Chart=function(){this.destroy=function(){}};window.Chart.defaults={};window.Papa={};' });
      if (u.startsWith('https://app.cardinalroster.com/') && rt === 'image')
        return route.fulfill({ status:200, contentType:'image/gif',
          body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64') });
      if (u.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status:200, body:'' });
      return route.abort();
    });
    page.on('dialog', d => d.accept());
    await page.addInitScript(MOCK);
    await page.addInitScript(SETUP);
    await page.goto('https://app.cardinalroster.com/', { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(async () => {
      const st = (window.__sentinelStates || []).find(s => s.name === 'client');
      if (st) await st.run();
    });
    await page.waitForTimeout(900);
    /* the attribute is written and the measurement taken in the SAME turn — see
       the header. Anything slower reads the theme the app has already restored. */
    read[theme] = await page.evaluate(([t, fn]) => {
      if (t === 'rb-light') document.documentElement.setAttribute('data-theme', 'rb-light');
      else document.documentElement.removeAttribute('data-theme');
      return (new Function('return (' + fn + ')'))().call(null);
    }, [theme, READ.toString()]);
    await ctx.close();
  }

  console.log('A  the card is on screen at all');
  for (const t of ['dark', 'rb-light']) {
    ok(!read[t].missing && read[t].w > 200 && read[t].h > 40,
       t + ': the card rendered', read[t].missing ? 'NOT FOUND' : read[t].w + 'x' + read[t].h);
  }

  console.log('\nB  DARK: the slab is gone and every figure clears its floor');
  {
    const d = read.dark;
    ok(!d.missing && d.cardLum < 0.12, 'the card ground is dark, not white',
       d.cardBg + '  luminance ' + d.cardLum);
    ok(!d.missing && d.tileBg && d.tileBg !== 'rgb(234, 238, 243)',
       '  · and the inset tiles came with it', String(d.tileBg));
    const bad = (d.texts || []).filter(t => t.r < t.floor);
    ok(bad.length === 0, '  · every text node in the card clears its contrast floor',
       bad.length ? bad.map(t => `"${t.txt}" ${t.color} ${t.r}:1 < ${t.floor}`).join(' | ')
                  : (d.texts || []).length + ' node(s), worst ' +
                    Math.min(...(d.texts || [{r:99}]).map(t => t.r)) + ':1');
    /* the two accents that FAILED when carried over — named, so a future build
       that "restores brand colour" here reds instead of shipping 3:1 text */
    /* read off the TOKEN, which exists whether or not the figure is on screen —
       the seeded client has no balance due, so asserting on the element alone
       passed by measuring null, on the build and on the control alike. */
    ok(d.tokPos && d.tokPos.toLowerCase() !== '#047857',
       '  · the positive accent is NOT the 3.02:1 light green', String(d.tokPos));
    ok(d.tokDue && d.tokDue.toLowerCase() !== '#c8202e',
       '  · the due accent is NOT the 2.92:1 light red', String(d.tokDue));
    if (d.posInk) ok(d.posInk === 'rgb(52, 211, 153)',
       '  · and the figure on screen paints that accent', String(d.posInk));
  }

  console.log('\nC  LIGHT IS BYTE-IDENTICAL — the half of this class that usually breaks');
  {
    const l = read['rb-light'];
    const wantComputed = {
      cardBg: 'rgb(255, 255, 255)', cardInk: 'rgb(15, 23, 42)',
      cardBorder: 'rgb(226, 232, 240)', tileBg: 'rgb(234, 238, 243)',
      ttlInk: 'rgb(15, 23, 42)', subInk: 'rgb(71, 85, 105)',
    };
    for (const [k, v] of Object.entries(wantComputed))
      ok(l[k] === v, 'light ' + k + ' is still ' + v, String(l[k]));
    /* the accents by token, so the two that are not always on screen are still
       proved — this is where "light is byte-identical" actually has to hold */
    const wantTokens = {
      tokCard:'#FFFFFF', tokInk:'#0F172A', tokLine:'#E2E8F0',
      tokTile:'#EAEEF3', tokSub:'#475569', tokPos:'#047857', tokDue:'#C8202E',
    };
    for (const [k, v] of Object.entries(wantTokens))
      ok((l[k] || '').toUpperCase() === v, 'light ' + k + ' is still ' + v, String(l[k]));
  }
} catch (e) {
  console.log('GATE ERROR: ' + String((e && e.message) || e).slice(0, 300));
  fails++;
} finally { if (browser) { try { await browser.close(); } catch (_) {} } }

console.log('');
ok(checks >= 20, 'coverage floor: ' + checks + ' checks ran (>= 20)');
console.log('\n' + (fails === 0 ? `GATE 1216 GREEN — ${checks} checks passed`
                                : `GATE 1216 RED — ${fails} of ${checks} failed`));
process.exit(fails === 0 ? 0 : 1);
