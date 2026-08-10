/* render_gradtext.js — build 685 gate.
   Proves, in real Chromium against the real document, that no gradient-clipped
   TEXT rule survives, that every formerly-clipped element paints an opaque ink,
   and that each clears its contrast floor on its measured ground.

   Usage: node render_gradtext.js [path/to/index.html]
   Point it at the 684 artifact as the NEGATIVE CONTROL — it must go red there.  */
const path = require('path');
const SP = __dirname;
const { chromium } = require(path.join(SP, 'node_modules', 'playwright-core'));
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// selectors that were gradient-clipped at 684, and their floor
const WATCH = [
  ['#loginQuote', 4.5], ['#calCard .calhead b', 4.5], ['.rvtext', 4.5], ['.ljtitle', 4.5],
  ['.dashcard b', 4.5], ['.logincard > p', 4.5], ['.heroname', 3.0], ['#heroQuote', 4.5],
  ['.ct-dashtitle', 4.5], ['#listView #listTitle', 4.5], ['#projectView .projsec', 4.5],
  ['.hero-hi', 4.5], ['.acthead', 4.5], ['section.history > .viewhead', 4.5],
  ['.pu-title', 4.5], ['body[data-crm="community"] #commsView .viewhead', 4.5],
];

let pass = 0, fail = 0;
const ok  = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const R = await page.evaluate((WATCH) => {
    /* ---- 1. walk CHROMIUM'S OWN parsed rules, not a regex over the text ---- */
    const clipped = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      /* NOTE: in modern Chromium every CSSStyleRule exposes an (empty)
         .cssRules for CSS nesting. An `if (r.cssRules) { walk(); continue; }`
         therefore skips EVERY style rule without ever examining it and reports
         a clean zero — a false green this harness shipped once. Examine the
         rule first, and only then descend. The negative control is what caught
         it: this check must report 37 against the 684 artifact. */
      const walk = (list) => {
        for (const r of Array.from(list || [])) {
          if (r.style) {
            const fill = r.style.getPropertyValue('-webkit-text-fill-color').trim();
            const clip = (r.style.getPropertyValue('-webkit-background-clip') ||
                          r.style.getPropertyValue('background-clip') || '').trim();
            if (fill === 'transparent' && clip === 'text') clipped.push(r.selectorText || '(nested)');
          }
          if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        }
      };
      walk(rules);
    }
    /* inline style="" attributes carrying the same mechanism */
    const inlineClipped = Array.from(document.querySelectorAll('[style]')).filter(el => {
      const s = el.getAttribute('style') || '';
      return /-webkit-text-fill-color\s*:\s*transparent/.test(s) && /background-clip\s*:\s*text/.test(s);
    }).length;

    /* ---- 2. per-element: opaque ink + measured ground ---- */
    const parse = (str) => {
      const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/i.exec(str || '');
      return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const over = (f,b) => ({ r:f.r*f.a+b.r*(1-f.a), g:f.g*f.a+b.g*(1-f.a), b:f.b*f.a+b.b*(1-f.a), a:1 });
    const lum = c => { const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
                       return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
    const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
    const stops = bi => { const o=[]; const re=/rgba?\([^)]*\)/g; let m;
                          while((m=re.exec(bi||''))) { const c=parse(m[0]); if(c&&c.a>0) o.push(c);} return o; };
    /* Within ONE element the paint order is background-color first, then the
       background-image on top of it. Treating the image's semi-transparent
       stops as alternatives over the ANCESTOR's ground (rather than over this
       element's own colour) reports a card's dark wash as near-white. That is
       CLAUDE.md trap 3 applied at the wrong level, and it cost a red here. */
    const ground = (el) => {
      const chain=[]; for(let n=el;n&&n.nodeType===1;n=n.parentElement) chain.push(n); chain.reverse();
      let L={r:255,g:255,b:255,a:1}, D={...L};
      for(const n of chain){ const cs=getComputedStyle(n);
        const bc=parse(cs.backgroundColor);
        let baseL=L, baseD=D;
        if(bc&&bc.a>0){ baseL=over(bc,L); baseD=over(bc,D); }        // colour layer first
        const st=stops(cs.backgroundImage);                          // then the image over it
        if(!st.length){ L=baseL; D=baseD; continue; }
        // A gradient with a fully opaque stop covers the box, so what is behind
        // it is NOT a candidate ground. Keeping it made an opaque dark card
        // score against the light page underneath (#e35c63 -> 3.13 not 5.00).
        const covers = st.some(x => x.a >= 1);
        const cl=st.map(x=>over(x,baseL)).concat(covers?[]:[baseL]);
        const cd=st.map(x=>over(x,baseD)).concat(covers?[]:[baseD]);
        L=cl.reduce((a,b)=>lum(b)>lum(a)?b:a); D=cd.reduce((a,b)=>lum(b)<lum(a)?b:a); }
      return [L,D];
    };

    const measure = () => {
      const out=[];
      for (const [sel,floor] of WATCH) {
        let els=[]; try{ els=Array.from(document.querySelectorAll(sel)); }catch(e){}
        if(!els.length){ out.push({sel,found:0}); continue; }
        const el=els[0], cs=getComputedStyle(el);
        // NOTE: do NOT skip display:none elements — with scripts off every view
        // is hidden, and backgrounds compute regardless of display. What IS
        // worth recording is a permanent `display:none !important` (dead
        // markup), which is a different claim from "this view isn't open".
        // Verified by reading the source, not inferred: .ct-dashtitle sits in
        // .ct-dashbanner{display:none !important}, and .dashcard has been dead
        // markup since build 352 (CLAUDE.md standing false alarm). Everything
        // else is scored, including views that are merely closed right now.
        const DEAD = ['.ct-dashtitle', '.dashcard b'];
        const dead = DEAD.includes(sel) ? sel : null;
        const fill=cs.webkitTextFillColor||cs.getPropertyValue('-webkit-text-fill-color');
        const ink=parse(fill&&fill!=='rgba(0, 0, 0, 0)'?fill:cs.color);
        const transparent = /rgba\(0, 0, 0, 0\)/.test(fill||'') ||
                            (parse(fill)||{a:1}).a === 0;
        const gs=ground(el);
        const worst = ink ? Math.min(ratio(ink,gs[0]), ratio(ink,gs[1])) : 0;
        out.push({ sel, found:els.length, floor, transparent, dead,
                   bgImage: cs.backgroundImage !== 'none',
                   ink: cs.color, worst:+worst.toFixed(2),
                   gL: `rgb(${gs[0].r|0},${gs[0].g|0},${gs[0].b|0})`,
                   gD: `rgb(${gs[1].r|0},${gs[1].g|0},${gs[1].b|0})` });
      }
      return out;
    };

    /* The app sets data-rltheme on <body> at runtime (index.html:22114, :53113),
       which is what makes every --ct-* token resolve. With scripts off it is
       absent, --ct-bg is invalid, #cardinalTruthView paints nothing and a white
       ink scores 1:1 against the page behind it. Seed the production condition
       rather than measure a state the app never ships in — the build-569 lesson. */
    document.body.dataset.crm='community';
    document.documentElement.removeAttribute('data-theme');
    document.body.setAttribute('data-rltheme','siren');      // Cardinal Truth dark
    const dark = measure();
    document.documentElement.setAttribute('data-theme','rb-light');
    document.body.setAttribute('data-rltheme','docket');     // Cardinal Truth light
    const light = measure();
    return { clipped, inlineClipped, dark, light };
  }, WATCH);

  await browser.close();

  console.log(`\nrender_gradtext — ${FILE}\n`);
  console.log('1. Chromium-parsed rules still using gradient-clipped text');
  ok(R.clipped.length === 0, `stylesheet rules with clip:text + transparent fill = ${R.clipped.length} (want 0)`);
  if (R.clipped.length) R.clipped.slice(0,8).forEach(s => console.log('       still clipped: ' + s));
  ok(R.inlineClipped === 0, `inline style="" attributes with the same = ${R.inlineClipped} (want 0)`);

  for (const [label, rows] of [['dark', R.dark], ['light', R.light]]) {
    console.log(`\n2. ${label} theme — formerly-clipped elements paint an opaque, readable ink`);
    for (const r of rows) {
      if (!r.found) { console.log(`  skip ${r.sel} (not in static DOM)`); continue; }
      ok(!r.transparent, `${r.sel} — ink is not transparent (${r.ink})`);
      ok(!r.bgImage,     `${r.sel} — no background image left on the text`);
      if (r.dead) { console.log(`  note ${r.sel} — dead markup, hidden by display:none !important on .${r.dead}; contrast not scored`); continue; }
      ok(r.worst >= r.floor, `${r.sel} — ${r.worst}:1 >= ${r.floor} floor   [ink ${r.ink} on ${r.gD}..${r.gL}]`);
    }
  }

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
