/* render_sflight.js — build 693 gate.

   Sales Floor had no light theme at all: rendered in both themes the screen
   came out byte-identical, so the app-wide switch did nothing to it. Two
   things therefore have to be proved, and the first is the one a contrast
   harness alone would miss:

     1. the two themes actually DIFFER — a module that ignores the switch
        passes every contrast check, because it is only ever measured against
        the ground it was designed for;
     2. every ink clears its floor in BOTH themes, against the composited
        ground (colour AND every gradient stop, alpha resolved).

   It also pins the semantics the module's own banner declares: red is the
   objection, navy is your answer. The navy fills and the cardinal rail must
   be the SAME bytes in both themes, and the ink on the navy .you card must
   stay light in light mode — tokenising that one would paint #17181a on
   #16233b, which is the trap this build had to step around.

   Usage: NODE_PATH=<scratchpad>/node_modules node render_sflight.js [index.html]
   Point it at 692 as the negative control: there the themes are identical,
   so assertion 1 must fail.                                                  */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const FILE = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

const PROBE = `
  (function(){
    if (window.__t) document.documentElement.setAttribute('data-theme', window.__t);
    else document.documentElement.removeAttribute('data-theme');
    try { showMain('theo@cardinalrenovations.net'); } catch(_) {}
    var lv = document.getElementById('landingView');
    if (lv) lv.style.setProperty('display','none','important');
    window.CardinalSalesFloor.open();
    var root = document.getElementById('cr-sf');
    if (!root) return { err: 'no #cr-sf' };

    function px(s){ var m=/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/.exec(s||'');
      return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null; }
    function over(f,b){ return f[3]>=1?f:[0,1,2].map(function(i){
      return Math.round(f[i]*f[3]+b[i]*(1-f[3])); }).concat([1]); }
    function lum(c){ var f=function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
      return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
    function rat(a,b){ var x=lum(a),y=lum(b); if(y>x){var t=x;x=y;y=t;}
      return Math.round(((x+0.05)/(y+0.05))*100)/100; }

    /* Every ground an ancestor actually paints — colour AND every gradient
       stop — scored against the WORST. backgroundColor alone sails past a
       card that paints a linear-gradient and reports the page behind it. */
    function grounds(el){
      var g=[], base=[255,255,255,1];
      for(var n=el; n && n.nodeType===1; n=n.parentElement){
        var s=getComputedStyle(n), any=false;
        var bi=s.backgroundImage||'';
        var stops=bi.match(/rgba?\\([^)]+\\)/g)||[];
        for(var i=0;i<stops.length;i++){ var c=px(stops[i]); if(c){ g.push(c); any=true; } }
        var bc=px(s.backgroundColor);
        if(bc && bc[3]>0){ g.push(bc); any=true; }
        if(any) break;
      }
      if(!g.length) g.push(base);
      return g.map(function(c){ return over(c, base); });
    }

    var rows=[], bad=[];
    var hosts=[];
    (function walk(n){ for(var i=0;i<n.childNodes.length;i++){ var c=n.childNodes[i];
      if(c.nodeType===3 && (c.textContent||'').trim()) { if(hosts.indexOf(n)<0) hosts.push(n); }
      else if(c.nodeType===1) walk(c); } })(root);

    hosts.forEach(function(el){
      var t=''; for(var i=0;i<el.childNodes.length;i++)
        if(el.childNodes[i].nodeType===3) t+=el.childNodes[i].textContent;
      t=t.trim(); if(!t) return;
      var cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none') return;
      if(!el.getClientRects().length) return;
      var ink=px(cs.color); if(!ink) return;
      var size=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight,10)||400;
      var large = size>=24 || (size>=18.66 && w>=700);
      var floor = large?3.0:4.5, worst=null, wg=null;
      grounds(el).forEach(function(g){
        var v=rat(over(ink,g), g);
        if(worst===null||v<worst){ worst=v; wg=g; }
      });
      rows.push(1);
      if(worst<floor) bad.push({ sel:(typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:el.tagName.toLowerCase()),
        txt:t.slice(0,30), v:worst, floor:floor, ink:cs.color, gnd:'rgb('+wg.slice(0,3).join(',')+')' });
    });

    var cs=getComputedStyle(root);
    var you=root.querySelector('.you');
    return {
      measured: rows.length,
      bad: bad,
      pageBg: cs.backgroundColor,
      pageInk: cs.color,
      youBg: you?getComputedStyle(you).backgroundColor:null,
      youInk: you?getComputedStyle(you).color:null,
      heroBg: (function(){ var h=root.querySelector('.hero'); return h?getComputedStyle(h).backgroundColor:null; })(),
      railBg: (function(){ var e=root.querySelector('.them');
        return e?getComputedStyle(e,'::before').backgroundColor:null; })(),
      redTx: (function(){ var e=root.querySelector('.cr-sf-ttl h1 span'); return e?getComputedStyle(e).color:null; })(),
      html: root.innerHTML.length
    };
  })()`;

(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const SRC = fs.readFileSync(FILE, 'utf8');
  const res = {};

  for (const [tname, theme] of [['dark', null], ['light', 'rb-light']]) {
    const p = await br.newPage({ viewport: { width: 430, height: 1400 } });
    await p.route('**', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    p.on('pageerror', () => {});
    await p.setContent(SRC, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.evaluate(t => { window.__t = t; }, theme);
    res[tname] = await p.evaluate(PROBE);
    await p.close();
  }

  await br.close();

  const d = res.dark, l = res.light;
  console.log('\n── dark ──');
  console.log(`  page ${d.pageBg} ink ${d.pageInk}  ·  ${d.measured} text nodes measured`);
  console.log('── light ──');
  console.log(`  page ${l.pageBg} ink ${l.pageInk}  ·  ${l.measured} text nodes measured`);
  console.log('');

  if (d.err || l.err) { console.log('FATAL', d.err || l.err); process.exit(1); }

  // 1 — the switch does something at all
  ok(d.pageBg !== l.pageBg, `the page ground changes with the theme (${d.pageBg} -> ${l.pageBg})`);
  ok(d.pageInk !== l.pageInk, `the page ink changes with the theme (${d.pageInk} -> ${l.pageInk})`);

  // 2 — every ink clears its floor, both themes
  for (const [n, r] of [['dark', d], ['light', l]]) {
    ok(r.measured > 20, `${n}: enough text to be a real measurement (${r.measured} nodes)`);
    ok(r.bad.length === 0, `${n}: every ink clears its floor`);
    r.bad.slice(0, 8).forEach(b => console.log(
      `        ${b.v}:1 (floor ${b.floor})  ${b.sel} "${b.txt}"  ${b.ink} on ${b.gnd}`));
  }

  // 3 — the semantics the banner declares are identical in both themes
  ok(d.youBg === l.youBg, `navy .you card is the same in both themes (${d.youBg})`);
  ok(d.heroBg === l.heroBg, `navy hero fill is the same in both themes (${d.heroBg})`);
  ok(d.railBg === l.railBg, `the cardinal rail is the same in both themes (${d.railBg})`);
  ok(d.youInk === l.youInk,
    `the ink ON the navy card stays light in light mode (${d.youInk}) — tokenising it would have gone dark-on-dark`);

  // 4 — and the one thing that IS meant to invert
  ok(d.redTx !== l.redTx,
    `red-as-text swaps with the ground (${d.redTx} -> ${l.redTx}) — #e8505c cannot carry type on a pale page`);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
