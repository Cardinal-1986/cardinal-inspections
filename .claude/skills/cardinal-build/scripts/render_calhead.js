/* render_calhead.js — build 689 gate.
   Every text element inside the two big calendars: computed ink, the composited
   ground, the contrast, and WHICH rule set the colour. The rule name is the
   useful part — 689's bug was a rule with no theme gate, and a bare contrast
   number would not have told you which one to delete.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_calhead.js [index.html]
   Point it at 688 as the negative control: the two titles report 1.06:1 there. */
const path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const c = await b.newContext({ javaScriptEnabled: false, viewport: { width: 430, height: 900 } });
  const p = await c.newPage();
  await p.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded', timeout: 120000 });

  let bad = 0;
  for (const theme of ['dark', 'light']) {
    const R = await p.evaluate((t) => {
      if (t === 'light') document.documentElement.setAttribute('data-theme', 'rb-light');
      else document.documentElement.removeAttribute('data-theme');

      const parse = s => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s || ''); return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
      const over = (f, bg) => ({ r: f.r*f.a+bg.r*(1-f.a), g: f.g*f.a+bg.g*(1-f.a), b: f.b*f.a+bg.b*(1-f.a), a: 1 });
      const lum = c => { const f = v => { v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
      const rat = (a, bg) => { const [x,y]=[lum(a),lum(bg)].sort((q,w)=>w-q); return +((x+0.05)/(y+0.05)).toFixed(2); };
      const stops = bi => { const o=[]; const re=/rgba?\([^)]*\)/g; let m; while((m=re.exec(bi||''))){const q=parse(m[0]); if(q&&q.a>0)o.push(q);} return o; };
      const ground = el => {
        const chain=[]; for(let n=el;n&&n.nodeType===1;n=n.parentElement) chain.push(n); chain.reverse();
        let L={r:255,g:255,b:255,a:1}, D={...L};
        for(const n of chain){ const cs=getComputedStyle(n); const bc=parse(cs.backgroundColor);
          let bl=L, bd=D; if(bc&&bc.a>0){ bl=over(bc,L); bd=over(bc,D); }
          const st=stops(cs.backgroundImage);
          if(!st.length){ L=bl; D=bd; continue; }
          const covers=st.some(x=>x.a>=1);
          const cl=st.map(x=>over(x,bl)).concat(covers?[]:[bl]);
          const cd=st.map(x=>over(x,bd)).concat(covers?[]:[bd]);
          L=cl.reduce((a,q)=>lum(q)>lum(a)?q:a); D=cd.reduce((a,q)=>lum(q)<lum(a)?q:a); }
        return [L,D];
      };
      const winner = el => {
        let best = null;
        const walk = (list, ctx) => { for (const r of Array.from(list||[])) {
          if (r.style && r.selectorText) {
            try { if (el.matches(r.selectorText) && r.style.getPropertyValue('color'))
              best = (ctx?ctx+' ':'') + r.selectorText + ' → ' + r.style.getPropertyValue('color'); } catch(e){}
          }
          if (r.cssRules && r.cssRules.length) walk(r.cssRules, r.conditionText ? '@'+r.conditionText : ctx);
        }};
        for (const sh of Array.from(document.styleSheets)) { let rs; try { rs = sh.cssRules; } catch(e){ continue; } walk(rs, ''); }
        return best;
      };

      const out = [];
      document.querySelectorAll('.pipecard.teamcal').forEach(card => {
        const label = (card.querySelector('.pipetitle') || {}).textContent || '?';
        const seen = new Set();
        card.querySelectorAll('.pipetitle span, .calhead b, .calgrid .dow, .calgrid .day, .callegend, .calnav, .minical b').forEach(el => {
          const key = el.className + '|' + (el.textContent||'').trim().slice(0,8);
          if (seen.has(key)) return; seen.add(key);
          const cs = getComputedStyle(el); const ink = parse(cs.color); if (!ink) return;
          const g = ground(el);
          out.push({ card: label.trim().slice(0,22), what: (el.className || el.tagName).toString().slice(0,26),
                     txt: (el.textContent||'').trim().slice(0,10), ink: cs.color,
                     worst: Math.min(rat(ink,g[0]), rat(ink,g[1])), rule: winner(el) });
        });
      });
      return out;
    }, theme);

    console.log(`\n================ ${theme.toUpperCase()} ================`);
    for (const r of R) {
      const flag = r.worst < 4.5 ? (bad++, r.worst < 3 ? ' ✗✗' : ' ✗ ') : ' ok';
      console.log(`${flag} ${String(r.worst).padStart(6)}:1  ${r.card.padEnd(23)} ${r.what.padEnd(27)} ${r.ink.padEnd(20)} ${(r.rule||'(inherited)').slice(0,90)}`);
    }
  }
  await b.close();
  if (bad) { console.log(`\nRED — ${bad} element(s) under floor`); process.exit(1); }
  console.log('\nGREEN — every calendar heading and legend clears 4.5:1 in both themes');
})();
