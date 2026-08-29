/* gate_1144.mjs — light chrome: the header AND the drawer follow the theme.
 *
 * Theo asked "why dark mode?" of the drawer. Measured: the page went white and
 * BOTH the header and the drawer stayed dark, because they run on their own
 * per-CRM --h* token system rather than on --rbe-*. He picked "light chrome
 * throughout" over leaving it or lightening the drawer alone — the latter would
 * have put a light drawer against a dark header.
 *
 * ⚠ The hard part is the CRM ACCENT. Each --hac is chosen for a dark ground and
 * collapses on a light one: measured 2.02 / 1.20 / 1.89 / 3.37:1 for retail /
 * community / production / sales, community being effectively invisible. Each
 * light twin is the SAME HUE deepened until it clears 4.5 on both the header
 * ground and the drawer panel it itself tints — the 557/1127 rule.
 *
 * ⚠ Reads the COMPOSITED ground with alpha blended and stops at the first opaque
 * paint (BUG_CLASSES 78 + 80). The header paints a GRADIENT, so backgroundColor
 * alone reads rgba(0,0,0,0) — which is how an earlier probe of mine reported the
 * header as "#000000 in both themes" when it is really dark navy #243342.
 *
 * Negative control: pre-1144 -> RED (the dark chrome does not change with the
 * theme, and the accents fail on light), reporting rather than crashing.
 *   node gate_1144.mjs [file.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);
const FLOOR = 4.5, CRMS = ['retail','community','production','sales'];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
const p = await b.newPage({ viewport:{ width:390, height:844 } });
for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto(URL_, { waitUntil:'domcontentloaded' });
await p.waitForTimeout(2600);
await p.evaluate(() => { const x = document.getElementById('menuBtn')
  || document.querySelector('.burger,#navToggle'); if (x) x.click(); }).catch(() => {});
await p.waitForTimeout(800);

const sweeps = await p.evaluate(async (CRMS) => {
  const L = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
  const RAT = (a,b) => { let x=L(a), y=L(b); if(x<y){const t=x;x=y;y=t;} return (x+0.05)/(y+0.05); };
  const px = s => { s = String(s);
    const m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (m) return [0,1,2].map(i => Math.round(+m[i+1]*255));
    const r = s.match(/(\d+(\.\d+)?)[,\s]+(\d+(\.\d+)?)[,\s]+(\d+(\.\d+)?)/);
    return r ? [+r[1],+r[3],+r[5]] : null; };
  const al = s => { const m = String(s).match(/rgba\([^)]*,\s*([\d.]+)\s*\)/); return m ? +m[1] : 1; };
  const ground = el => { let n = el; const ls = [];
    while (n && n !== document.documentElement) { const cs = getComputedStyle(n); let op = false;
      const bi = cs.backgroundImage || '';
      if (bi && bi !== 'none') for (const st of (bi.match(/rgba?\([^)]+\)/g) || [])) {
        const c = px(st); if (c) { ls.push({c, a: al(st)}); if (al(st) >= 1) op = true; } }
      const so = px(cs.backgroundColor);
      if (so && !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor)) {
        const a = al(cs.backgroundColor); ls.push({c: so, a}); if (a >= 1) op = true; }
      if (op) break; n = n.parentElement; }
    const th = document.documentElement.getAttribute('data-theme');
    ls.push({ c: th === 'rb-light' ? [247,247,247] : [9,9,12], a: 1 });
    let acc = null;
    for (let i = ls.length - 1; i >= 0; i--)
      acc = acc ? [0,1,2].map(k => Math.round(ls[i].a*ls[i].c[k] + (1-ls[i].a)*acc[k])) : ls[i].c;
    return acc; };
  const hexs = c => '#' + c.map(v => v.toString(16).padStart(2,'0')).join('');
  const scan = () => { const hdr = document.querySelector('header.site'); const out = [];
    if (!hdr) return out;
    for (const el of hdr.querySelectorAll('*')) {
      const bx = el.getBoundingClientRect(); if (bx.width < 1 || bx.height < 1) continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el); const fg = px(cs.color); if (!fg) continue;
      out.push({ sel: el.tagName.toLowerCase() + '.' + String(el.className||'').split(' ')[0],
                 r: +RAT(fg, ground(el)).toFixed(2), txt: (el.textContent||'').trim().slice(0,18),
                 size: parseFloat(cs.fontSize) });
    } return out; };
  const res = [];
  for (const crm of CRMS) for (const th of [null, 'rb-light']) {
    document.body.setAttribute('data-crm-head', crm);
    if (th) document.documentElement.setAttribute('data-theme', th);
    else document.documentElement.removeAttribute('data-theme');
    await new Promise(r => setTimeout(r, 280));
    const hdr = document.querySelector('header.site');
    const cs = hdr ? getComputedStyle(hdr) : null;
    res.push({ crm, th: th || 'dark', rows: scan(),
               headerPaint: cs ? (cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor).slice(0,60) : '',
               drawerBg: (() => { const m = document.getElementById('navMenu');
                 return m ? hexs(ground(m.firstElementChild || m)) : '—'; })(),
               hac: cs ? cs.getPropertyValue('--hac').trim() : '' });
  }
  return res;
}, CRMS);

/* 1. the chrome actually CHANGES with the theme — the whole point */
for (const crm of CRMS) {
  const d = sweeps.find(s => s.crm === crm && s.th === 'dark');
  const l = sweeps.find(s => s.crm === crm && s.th === 'rb-light');
  ok(d && l && d.headerPaint !== l.headerPaint,
     crm + ': the header follows the theme (dark ≠ light)');
  ok(d && l && d.hac.toLowerCase() !== l.hac.toLowerCase(),
     '  · and its accent has a light twin (' + (d&&d.hac) + ' → ' + (l&&l.hac) + ')');
}

/* 2. every text in header + drawer clears the floor, BOTH themes, every CRM */
for (const s of sweeps) {
  const bad = s.rows.filter(x => x.r < FLOOR).sort((a,b) => a.r - b.r);
  ok(s.rows.length > 0, s.crm + '/' + s.th + ': header text renders (' + s.rows.length + ')');
  ok(s.rows.length > 0 && bad.length === 0,
     '  · all ' + s.rows.length + ' clear ' + FLOOR + (bad.length
        ? ' — ✗ ' + bad.length + ' under, worst ' + bad[0].r + ':1 ' + bad[0].sel + ' "' + bad[0].txt + '"'
        : ', worst ' + Math.min(...s.rows.map(x => x.r)).toFixed(2) + ':1'));
}

/* 3. the 11px floor still holds on this surface */
const tiny = sweeps.flatMap(s => s.rows).filter(x => x.size && x.size < 11);
ok(tiny.length === 0, 'nothing in the chrome is under the 11px floor' +
   (tiny.length ? ' — ' + tiny[0].sel + ' at ' + tiny[0].size + 'px' : ''));

/* 4. the DARK rules must be untouched — a light fix that moves dark is a regression */
{
  const src = readFileSync(FILE, 'utf8');
  ok(/body\[data-crm-head="retail"\] \.site\{--htint:#243342;--hbg:linear-gradient\(180deg,#243342,#16202b\)/.test(src),
     'the dark retail chrome is byte-identical (a light twin must not move dark)');
  ok(/body\[data-crm-head="community"\] \.site\{--htint:#047857/.test(src),
     'and the dark community chrome too');
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
