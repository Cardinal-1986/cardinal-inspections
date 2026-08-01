/* Gate for 522 — "raised just like home", proved in a real engine.
 *
 * jsdom cannot answer any of this: it does not resolve var() inside box-shadow
 * or border shorthands, which is the entire question. Build 481 shipped a rule
 * that parsed, balanced and passed every mechanical gate while losing the
 * cascade (BUG_CLASSES 9), and 522 walks straight through four more of those.
 *
 * It loads the WHOLE real index.html — 521 and 522 — in Chromium, injects the
 * same probe markup into the same real containers, and compares. So it proves:
 *
 *   1. every raised selector actually WON its cascade, in both themes
 *   2. GEOMETRY ONLY — background and ink are byte-identical 521 vs 522, for
 *      every target. This is the claim Theo corrected me on and it is the one
 *      assertion I care most about.
 *   3. the four traps: cr-keeper's .projinfo (and its :hover), .acxsec.rvsec's
 *      own red inset, #teamView .tmcard staying flat, .rptkpi's red top cap
 *   4. Claims and Community do not get the raise on anything they skin
 *
 * It does NOT prove the result looks good. That is Theo's eyes; screenshots go
 * out with it.
 */
const { chromium } = require('playwright');

const V521 = process.argv[2], V522 = process.argv[3];
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); }
};

/* every selector 522 claims to raise, with where it has to live to be reachable */
const IN_PV = ['projinfo', 'jobvalrow', 'jabox', 'dbmoney', 'dbrow', 'acxsec',
               'contactrow', 'locrow', 'ldbox', 'jatile'];
const IN_BODY = ['matcard', 'ckcard', 'afrow', 'apprrow', 'wsrow', 'audrow', 'bday',
                 'chatbox', 'cdoccat', 'cdocrow', 'setrow', 'tmbody', 'rptkpi',
                 'cr-est-clientcard', 'cr-est-totals', 'cr-est-saved-row', 'cr-est-lineitem',
                 'cre-card', 'pu-card', 'cr-sf-today', 'cr-sf-block', 'cr-pb-job'];
const ALL = IN_PV.concat(IN_BODY);

const PROBE = (pv, body) => `
  (function(){
    var pvEl = document.getElementById('projectView');
    var mk = function(host, list, id){
      var d = document.createElement('div'); d.id = id;
      d.innerHTML = list.map(function(k){ return '<div class="'+k+'" data-k="'+k+'">x</div>'; }).join('')
        + '<div class="acxsec rvsec" data-k="acxsec.rvsec">rv</div>'
        + '<div class="pipecard" data-k="pipecard">home</div>';
      host.appendChild(d); return d;
    };
    pvEl.style.display='block';
    mk(pvEl, ${JSON.stringify(pv)}, 'probePV');
    mk(document.body, ${JSON.stringify(body)}, 'probeBody');
    var tv = document.getElementById('teamView');
    if (tv){ var t=document.createElement('div'); t.id='probeTeam';
      t.innerHTML='<div class="tmcard" data-k="tmcard">t</div><div class="tmbody" data-k="tmbody">b</div>';
      tv.appendChild(t); }
  })();`;

const READ = `(function(){
  var out = {};
  document.querySelectorAll('[data-k]').forEach(function(e){
    var host = e.closest('#probePV') ? 'pv' : e.closest('#probeTeam') ? 'team' : 'body';
    var c = getComputedStyle(e);
    out[host + ':' + e.getAttribute('data-k')] = {
      sh: c.boxShadow, bt: c.borderTopWidth + ' ' + c.borderTopColor,
      bb: c.borderBottomWidth + ' ' + c.borderBottomColor,
      bl: c.borderLeftWidth + ' ' + c.borderLeftColor,
      bgc: c.backgroundColor, bgi: c.backgroundImage, col: c.color, r: c.borderTopLeftRadius,
    };
  });
  return out;
})();`;

async function snap(browser, file, theme, extra) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await c.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  const p = await c.newPage();
  p.on('pageerror', () => {});
  await p.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3200);
  await p.evaluate(t => {
    if (t === 'rb-light') document.documentElement.setAttribute('data-theme', 'rb-light');
    document.body.classList.remove('claim-insurance', 'claim-community');
  }, theme);
  await p.evaluate(PROBE(IN_PV, IN_BODY));
  const base = await p.evaluate(READ);
  const more = extra ? await extra(p) : null;
  await c.close();
  return { base, more };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const theme of ['dark', 'rb-light']) {
    console.log('\n════ theme = ' + theme + ' ════');

    const old = (await snap(b, V521, theme)).base;
    const cur = (await snap(b, V522, theme, async (p) => {
      /* hover on .projinfo — trap 2 — and the two CRM gates */
      const hov = await p.evaluate(() => {
        const e = document.querySelector('#probePV .projinfo');
        /* :hover cannot be forced from JS; read the rule the engine matched instead */
        const want = [];
        for (const ss of document.styleSheets) {
          let rules; try { rules = ss.cssRules; } catch (_) { continue; }
          for (const r of rules || []) {
            if (r.selectorText && /\.projinfo:hover/.test(r.selectorText) && r.style.boxShadow) {
              want.push({ sel: r.selectorText.slice(0, 90), sh: r.style.boxShadow });
            }
          }
        }
        return want;
      });
      /* Flip the CRM class and read in SEPARATE tasks, with a wait between.
         Read in the same task as the class change and Chromium hands back a
         stale computed style for some elements — .projinfo reported the raise
         it no longer had, while .dbmoney next to it had already recalculated.
         That cost four red assertions against correct CSS. */
      const KEYS = ['projinfo', 'dbmoney', 'dbrow', 'acxsec', 'contactrow', 'ldbox'];
      const pick = () => p.evaluate((keys) => {
        const o = {};
        keys.forEach(k => { o[k] = getComputedStyle(document.querySelector('#probePV .' + k)).boxShadow; });
        return o;
      }, KEYS);
      const setCrm = async (cls) => {
        await p.evaluate((c) => {
          document.body.classList.remove('claim-insurance', 'claim-community');
          if (c) document.body.classList.add(c);
        }, cls);
        await p.waitForTimeout(250);
      };
      await setCrm(null); const retail = await pick();
      await setCrm('claim-insurance'); const ins = await pick();
      await setCrm('claim-community'); const com = await pick();
      await setCrm(null);
      const crm = { retail, ins, com };
      return { hov, crm };
    }));

    const g = cur.base, o = old;
    const home = g['pv:pipecard'];
    ok('the home card resolved its own raise  [' + String(home.sh).slice(0, 44) + '…]',
      home.sh !== 'none' && /rgba/.test(home.sh), home);

    /* ---- 1. every target actually got raised --------------------------- */
    let raised = 0;
    for (const k of ALL) {
      const host = IN_PV.includes(k) ? 'pv' : 'body';
      const c2 = g[host + ':' + k], c1 = o[host + ':' + k];
      if (!c2) { ok('.' + k + ' probe exists', false, k); continue; }
      const gained = c2.sh !== 'none' && c2.sh !== c1.sh;
      if (gained) raised++;
      ok('.' + k + ' gained a raise it did not have at 521  [' + String(c2.sh).slice(0, 38) + '…]',
        gained, { was: c1.sh, now: c2.sh });
    }
    console.log('  — ' + raised + '/' + ALL.length + ' raised');

    /* ---- 2. GEOMETRY ONLY. the claim Theo corrected me on -------------- */
    const moved = [];
    for (const key of Object.keys(g)) {
      if (!o[key]) continue;
      if (g[key].bgc !== o[key].bgc || g[key].bgi !== o[key].bgi || g[key].col !== o[key].col) {
        moved.push({ key, was: [o[key].bgc, o[key].col], now: [g[key].bgc, g[key].col] });
      }
    }
    ok('GEOMETRY ONLY — no background or ink moved on any of the ' + Object.keys(g).length +
       ' probed elements', moved.length === 0, moved);

    /* ---- 3. the four traps -------------------------------------------- */
    ok('trap 1 — .projinfo beat cr-keeper\'s --rbe-cardshadow  [' + String(g['pv:projinfo'].sh).slice(0, 40) + '…]',
      g['pv:projinfo'].sh === home.sh, { projinfo: g['pv:projinfo'].sh, home: home.sh });
    const hovLast = cur.more.hov[cur.more.hov.length - 1];
    ok('trap 2 — the LAST .projinfo:hover shadow rule is the ridge, not --rbe-cardshadow  [' +
       String(hovLast && hovLast.sh).slice(0, 46) + ']',
      !!hovLast && /--rbe-ridge-sh/.test(hovLast.sh), cur.more.hov);
    ok('trap 3 — .acxsec.rvsec kept its own red inset  [' + String(g['pv:acxsec.rvsec'].sh).slice(0, 52) + '…]',
      /200, 32, 46|rgba\(200/.test(g['pv:acxsec.rvsec'].sh), g['pv:acxsec.rvsec']);
    ok('trap 4 — #teamView .tmcard stayed flat', g['team:tmcard'].sh === 'none', g['team:tmcard']);
    ok('trap 4 — ...and .tmbody, the real Team card, was raised instead',
      g['team:tmbody'].sh !== 'none', g['team:tmbody']);

    /* ---- semantic accents survive ------------------------------------- */
    ok('.rptkpi kept its 5px red top cap  [' + g['body:rptkpi'].bt + ']',
      /^5px/.test(g['body:rptkpi'].bt) && g['body:rptkpi'].bt === o['body:rptkpi'].bt,
      { now: g['body:rptkpi'].bt, was: o['body:rptkpi'].bt });
    ok('.setrow kept its 5px red left edge  [' + g['body:setrow'].bl + ']',
      g['body:setrow'].bl === o['body:setrow'].bl, { now: g['body:setrow'].bl, was: o['body:setrow'].bl });

    /* ---- bevel family is right for the ground -------------------------- */
    const white = g['pv:dbrow'], tok = g['pv:projinfo'], dark = g['body:cr-sf-block'];
    ok('white-ground card took the LIGHT bevel  [' + white.bt + ' / ' + white.bb + ']',
      /rgb\(255, 255, 255\)/.test(white.bt) && /rgb\(217, 217, 217\)/.test(white.bb), white);
    ok('token-ground card took the theme bevel, same as home  [' + tok.bt + ']',
      tok.bt === home.bt && tok.bb === home.bb, { card: [tok.bt, tok.bb], home: [home.bt, home.bb] });
    ok('dark-ground card took the DARK bevel  [' + dark.bt + ' / ' + dark.bb + ']',
      /rgb\(69, 69, 82\)/.test(dark.bt) && /rgb\(5, 5, 7\)/.test(dark.bb), dark);

    /* ---- 4. the other two CRMs are untouched --------------------------- */
    const { retail, ins, com } = cur.more.crm;
    for (const k of Object.keys(retail)) {
      ok('Claims does not get .' + k + '\'s raise', ins[k] !== retail[k], { retail: retail[k], ins: ins[k] });
      ok('Community does not get .' + k + '\'s raise', com[k] !== retail[k], { retail: retail[k], com: com[k] });
    }
  }

  await b.close();
  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
