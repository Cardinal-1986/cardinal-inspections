/* CONTRAST AUDIT — every text node, measured in a real engine.
 *
 * Written at 623, when OC Colors went from Blackout to Owens Corning's white
 * panels and 25 text nodes fell below their WCAG floor. Eyes caught two of the
 * 25. This caught all of them, including #231F20 ink on a #171415 card at
 * 1.12:1 that no screenshot made obvious.
 *
 * WHAT IT CANNOT SEE, stated so nobody trusts it too far: it resolves
 * backgroundCOLOR up the ancestor chain, so text over a background-IMAGE is
 * measured against whatever colour sits beneath the photo. A "failure" on a
 * photo card may be the audit's blind spot — but it is still worth reading,
 * because it tells you what the text would land on if the image never loaded.
 *
 * Usage: node audit_contrast.js        (reads the live index.html)
 *
 * Originally build 618's harness. Two jobs jsdom cannot do:
   1. prove the three styles actually lay out differently above 820px, and
   2. prove the PHONE IS UNTOUCHED — pixel-identical across all three styles
      and against the build-617 baseline. */
const { chromium } = require('/tmp/claude-0/-home-user-cardinal-inspections/f4548c15-472d-5932-800a-11c798b9e589/scratchpad/node_modules/playwright-core');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const SP   = '/tmp/claude-0/-home-user-cardinal-inspections/f4548c15-472d-5932-800a-11c798b9e589/scratchpad';
const html = fs.readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');
const slice = (tag, id) => {
  const i = html.indexOf(`<${tag} id="${id}">`);
  return html.slice(html.indexOf('>', i) + 1, html.indexOf(`</${tag}>`, i));
};
const CSS  = slice('style', 'cr-occ-styles');
const JS   = slice('script', 'cr-occ-script');
const ROWS = JSON.parse(fs.readFileSync(SP + '/rows616.json', 'utf8'));
const IMG = {};
for(const f of fs.readdirSync(SP + '/final')){
  if(f.endsWith('.jpg')) IMG['oc-colors/covers/' + f] =
    'data:image/jpeg;base64,' + fs.readFileSync(path.join(SP,'final',f)).toString('base64');
}

let pass = 0, fail = 0;
const ok = (l, c, note) => { if(c){ pass++; console.log('  PASS ' + l); }
                             else { fail++; console.log('  FAIL ' + l + (note ? '  [' + note + ']' : '')); } };

async function boot(browser, w, h, style){
  const page = await browser.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#08090B} ${CSS} #cr-occ{display:block !important}
  </style></head><body></body></html>`);
  await page.evaluate(({rows,imgs,style}) => {
    try{ localStorage.setItem('cr-occ-style', style); }catch(_){}
    window.__IMG = imgs;
    window.currentUser = { email:'theo@cardinalrenovations.net' };
    window.is_admin = () => true; window.hideAllViews = () => {}; window.showHome = () => {};
    const q = { select(){return this;}, eq(){return this;}, order(){return this;},
      then(r){ return Promise.resolve(this._t==='oc_colors'?{data:rows,error:null}:{data:[],error:null}).then(r); } };
    window.supa = { from(t){ const o=Object.create(q); o._t=t; return o; },
      storage:{ from(){ return { createSignedUrls: async (p)=>({data:p.map(x=>({signedUrl:window.__IMG[x]||''})),error:null}) }; } } };
  }, { rows: ROWS, imgs: IMG, style });
  await page.addScriptTag({ content: JS });
  await page.evaluate(() => window.CardinalColors.open());
  await page.waitForTimeout(700);
  /* Do NOT rely on localStorage here: setContent runs on about:blank, where
     Chromium throws SecurityError on localStorage. The module catches that and
     keeps the default, so seeding storage silently did nothing and all three
     "styles" rendered identically. Click the control, like a person would.
     A programmatic .click() works even while the switcher is display:none. */
  await page.evaluate((s) => {
    var b = document.querySelector('.occ-sty[data-sty="' + s + '"]');
    if(b) b.click();
  }, style);
  await page.waitForTimeout(450);
  return page;
}
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0,16);
/* Contrast audit in a real engine: walk every text node, resolve its computed
   colour against the nearest non-transparent ancestor background, and report
   anything under the WCAG floor (4.5 body / 3.0 for >=18.66px or bold >=14px).
   jsdom cannot do this — it returns rgba(0,0,0,0) for var() in a shorthand. */
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const out = [];
  for (const [style, w, h, label] of [['roofs',1194,900,'iPad roofs'],
                                      ['compare',1194,900,'iPad compare'],
                                      ['roofs',430,932,'phone']]) {
    const page = await boot(browser, w, h, style);
    const findings = await page.evaluate(() => {
      const lum = c => { const [r,g,b] = c.map(v => { v/=255;
        return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
        return 0.2126*r + 0.7152*g + 0.0722*b; };
      const parse = s => (s.match(/[\d.]+/g)||[]).slice(0,4).map(Number);
      const bgOf = el => { let n = el;
        while (n && n !== document.documentElement) {
          const b = parse(getComputedStyle(n).backgroundColor);
          if (b.length >= 3 && (b[3] === undefined || b[3] > 0.5)) return b.slice(0,3);
          n = n.parentElement; }
        return [35,31,32]; };
      const res = [];
      for (const el of document.querySelectorAll('#cr-occ *')) {
        const txt = [...el.childNodes].filter(n => n.nodeType === 3)
                      .map(n => n.textContent.trim()).join(' ').trim();
        if (!txt) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const fg = parse(cs.color).slice(0,3), bg = bgOf(el);
        const l1 = lum(fg), l2 = lum(bg);
        const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
        const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const floor = (px >= 18.66 || (bold && px >= 14)) ? 3.0 : 4.5;
        if (ratio < floor) res.push({ txt: txt.slice(0,42), cls: el.className || el.tagName,
          ratio: +ratio.toFixed(2), floor, px: +px.toFixed(1),
          fg: cs.color, bg: 'rgb('+bg.join(',')+')' });
      }
      return res;
    });
    findings.forEach(f => out.push({ where: label, ...f }));
    await page.close();
  }
  await browser.close();
  if (!out.length) { console.log('CLEAN — every text node meets its contrast floor'); }
  else { console.log('BELOW FLOOR (' + out.length + '):');
    out.forEach(f => console.log(`  [${f.where}] ${f.ratio}:1 (needs ${f.floor}) ${f.px}px  ${f.cls}\n        "${f.txt}"  ${f.fg} on ${f.bg}`)); }
})().catch(e => { console.error(e); process.exit(1); });
