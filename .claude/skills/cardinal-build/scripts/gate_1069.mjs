/* gate_1069 — the report editor's drawer, the checklist re-sync, and the short
 * labels. A real Chromium render, because every claim here is about layout,
 * the cascade, or a live DOM pass.
 *
 * ⚠ THE CHECKS THAT MATTER MOST ARE THE ONES ABOUT WHAT MUST *NOT* HAPPEN:
 *   - the drawer must not become the 14th writer of the global scroll lock
 *   - re-sync must never overwrite a value a person typed
 *   - the short labels must keep their brackets, or fillBlanks() stops
 *     counting and compactForPrint() stops stripping
 *   - DESKTOP must be untouched: all eleven buttons, no More
 *
 *   node gate_1069.mjs [index.html]
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_1069: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js','e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE,f),'utf8')).join('\n;\n');

let pass = 0; const fails = [];
const ok  = (n,d) => { pass++; console.log(`  PASS  ${n}${d?'  — '+d:''}`); };
const bad = (n,d) => { fails.push(n+': '+d); console.log(`  FAIL  ${n}  — ${d}`); };

const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());

const OPEN = `(() => {
  const ev = document.getElementById('editorView');
  ev.classList.add('open'); ev.setAttribute('aria-hidden','false');
  for (const id of ['sigBtn','rccBtn','sortBtn','fillChipBtn']) {
    const b = document.getElementById(id); if (b) b.style.display = 'inline-block';
  }
  const f = document.getElementById('reportFrame');
  const d = f.contentDocument;
  d.open(); d.write(window.REPORT_TEMPLATE || ''); d.close();
  return true;
})()`;

async function at(width) {
  const ctx = await browser.newContext({ viewport:{width,height:900} });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u=r.request().url();
    if(u.startsWith('https://g69.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:HTML});
    return r.fulfill({status:200,body:''});
  });
  await page.addInitScript(SETUP);
  await page.goto('https://g69.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1000);
  await page.evaluate(OPEN);
  await page.waitForTimeout(300);
  return { ctx, page };
}

/* ── 1 · phone: three primaries + More, secondaries hidden ─────────────── */
{
  const { ctx, page } = await at(390);
  /* ⚠ BUG_CLASSES 37: on the control tree #edSecondary and #edMoreBtn do not
     exist, and getComputedStyle(null) THROWS. A control that dies before
     printing a line reads as "not green" when it actually proved nothing.
     Every lookup below tolerates absence and reports it. */
  const r = await page.evaluate(`(() => {
    const vis = el => { if(!el) return false;
      const c=getComputedStyle(el), b=el.getBoundingClientRect();
      return c.display!=='none' && c.visibility!=='hidden' && b.width>1 && b.height>1; };
    const bar = document.querySelector('#editorView .edbtns');
    const shown = bar ? [...bar.querySelectorAll('button')].filter(vis).map(b=>b.id||'(?)') : [];
    const sec = document.getElementById('edSecondary');
    return { shown,
             secondaryDisplay: sec ? getComputedStyle(sec).display : '(absent)',
             moreShown: vis(document.getElementById('edMoreBtn')) };
  })()`);
  const want = ['saveBtn','printBtn','fillChipBtn','edMoreBtn'];
  JSON.stringify(r.shown.slice().sort()) === JSON.stringify(want.slice().sort())
    ? ok('390px — exactly the three primaries + More', r.shown.join(', '))
    : bad('390px — exactly the three primaries + More', 'saw ' + r.shown.join(', '));
  r.secondaryDisplay === 'none'
    ? ok('390px — #edSecondary is hidden')
    : bad('390px — #edSecondary is hidden', 'display is ' + r.secondaryDisplay);

  /* the drawer: opens, has rows, 44px targets, readable ink, NO scroll lock */
  const before = await page.evaluate(`document.body.style.overflow`);
  const hasMore = await page.evaluate(`!!document.getElementById('edMoreBtn')`);
  if (hasMore) { await page.click('#edMoreBtn'); await page.waitForTimeout(200); }
  const d = await page.evaluate(`(() => {
    const dr = document.getElementById('edDrawer');
    if(!dr) return { absent:true, open:false, n:0, labels:[], minH:0, ratio:0, bg:'' };
    const rows = [...dr.querySelectorAll('.edrow')];
    const cs = rows.length ? getComputedStyle(rows[0]) : null;
    const num = c => (c.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
    const rel = ([r,g,b]) => { const f=c=>(c/=255)<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
      return .2126*f(r)+.7152*f(g)+.0722*f(b); };
    const ratio=(a,b)=>{const la=rel(a),lb=rel(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);};
    return { open: dr.classList.contains('open'), n: rows.length,
             labels: rows.map(r=>r.textContent.trim()),
             minH: rows.length ? Math.min(...rows.map(r=>r.getBoundingClientRect().height)) : 0,
             ratio: cs ? Math.round(ratio(num(cs.color), num(getComputedStyle(dr).backgroundColor))*100)/100 : 0,
             bg: dr ? getComputedStyle(dr).backgroundColor : '' };
  })()`);
  const after = await page.evaluate(`document.body.style.overflow`);
  d.open && d.n >= 5 ? ok('the drawer opens', `${d.n} rows: ${d.labels.join(' · ')}`)
                     : bad('the drawer opens', `open=${d.open} rows=${d.n}`);
  d.minH >= 44 ? ok('drawer rows clear the 44px tap floor', `min ${d.minH}px`)
               : bad('drawer rows clear the 44px tap floor', `min ${d.minH}px`);
  d.ratio >= 4.5 ? ok('drawer ink clears 4.5:1', `${d.ratio}:1 on ${d.bg}`)
                 : bad('drawer ink clears 4.5:1', `${d.ratio}:1 on ${d.bg}`);
  before === after ? ok('the drawer writes NO global scroll lock', `body.style.overflow stayed "${after||'(empty)'}"`)
                   : bad('the drawer writes NO global scroll lock', `"${before}" -> "${after}" — that would be a 14th writer`);

  /* a drawer row delegates to the real button */
  const deleg = await page.evaluate(`(() => {
    let fired = 0;
    const real = document.getElementById('shareBtn');
    if(!real) return { found:false, fired:0, why:'no shareBtn' };
    real.addEventListener('click', () => fired++, { once:true });
    const row = [...document.querySelectorAll('#edDrawer .edrow')]
      .find(r => /Share link/i.test(r.textContent));
    if (!row) return { found:false };
    row.click();
    return { found:true, fired };
  })()`);
  deleg.found && deleg.fired === 1
    ? ok('a drawer row clicks the REAL button', 'shareBtn fired once')
    : bad('a drawer row clicks the REAL button', JSON.stringify(deleg));
  await ctx.close();
}

/* ── 2 · desktop is untouched ──────────────────────────────────────────── */
{
  const { ctx, page } = await at(1194);
  const r = await page.evaluate(`(() => {
    const vis = el => { if(!el) return false;
      const c=getComputedStyle(el), b=el.getBoundingClientRect();
      return c.display!=='none' && b.width>1 && b.height>1; };
    const bar = document.querySelector('#editorView .edbtns');
    const sec = document.getElementById('edSecondary');
    return { n: bar ? [...bar.querySelectorAll('button')].filter(vis).length : 0,
             sec: sec ? getComputedStyle(sec).display : '(absent)',
             more: vis(document.getElementById('edMoreBtn')) };
  })()`);
  r.n >= 10 && !r.more && r.sec === 'contents'
    ? ok('1194px — all buttons, no More', `${r.n} visible, #edSecondary display:${r.sec}`)
    : bad('1194px — all buttons, no More', `${r.n} visible, more=${r.more}, sec=${r.sec}`);
  await ctx.close();
}

/* ── 3 · short labels keep their brackets ──────────────────────────────── */
{
  const { ctx, page } = await at(390);
  const r = await page.evaluate(`(() => {
    const d = document.getElementById('reportFrame').contentDocument;
    const txt = [...d.querySelectorAll('.ph')].map(e=>e.textContent.trim());
    const want = ['[Structure]','[Roof covering]','[Decking]','[Age]','[Layers]','[Pitch]','[Condition]'];
    const missing = want.filter(w => !txt.includes(w));
    const longLeft = txt.filter(t => /^\\[e\\.g\\./.test(t) || /from checklist\\]$/.test(t));
    const bad = txt.filter(t => !/^\\[[^\\]]*\\]$/.test(t) && /^\\[/.test(t));
    const hinted = [...d.querySelectorAll('.ph[title]')].length;
    return { missing, longLeft, bad, hinted };
  })()`);
  r.missing.length === 0 ? ok('short labels present', '7 checked')
                         : bad('short labels present', 'missing ' + r.missing.join(', '));
  r.longLeft.length === 0 ? ok('no long [e.g. …] or [… from checklist] left')
                          : bad('no long placeholders left', r.longLeft.join(' | '));
  r.bad.length === 0 ? ok('every placeholder still matches /^\\[…\\]$/', 'fillBlanks + compactForPrint still work')
                     : bad('bracket shape preserved', r.bad.join(' | '));
  r.hinted >= 7 ? ok('the long example survives as a tooltip', `${r.hinted} .ph carry title=`)
                : bad('the long example survives as a tooltip', `only ${r.hinted}`);
  await ctx.close();
}

/* ── 4 · re-sync fills blanks ONLY ─────────────────────────────────────── */
{
  const { ctx, page } = await at(390);
  const r = await page.evaluate(`(() => {
    const d = document.getElementById('reportFrame').contentDocument;
    const cl = { structure:'Single-family, detached garage', rooftype:'Asphalt shingles',
                 decking:'1x6 plank', attic:'Yes', method:'Visual, non-invasive',
                 age:'19', condition:'Deteriorated', layers:'2', pitch:'6/12' };
    /* a human has already answered Pitch — re-sync must leave it alone */
    if (typeof window.resyncChecklist !== 'function')
      return { absent:true, first:0, second:0, pitch:'', age:'' };
    const pitchEl = [...d.querySelectorAll('.ph')].find(e=>e.textContent.trim()==='[Pitch]')
                 || [...d.querySelectorAll('.ph')].find(e=>/^\\[Pitch/.test(e.textContent.trim()));
    if (!pitchEl) return { absent:true, first:0, second:0, pitch:'(no pitch field)', age:'' };
    pitchEl.textContent = 'STEEP — measured by hand';
    const first  = window.resyncChecklist(d, cl);
    const second = window.resyncChecklist(d, cl);
    return { first, second, pitch: pitchEl.textContent,
             age: ([...d.querySelectorAll('.fill')].map(e=>e.textContent)
                   .find(t=>/19 years/.test(t)) || '') };
  })()`);
  r.first >= 7 ? ok('re-sync fills the checklist fields', `${r.first} filled on first open`)
               : bad('re-sync fills the checklist fields', `only ${r.first}`);
  r.second === 0 ? ok('re-sync is idempotent', 'second pass filled 0')
                 : bad('re-sync is idempotent', `second pass filled ${r.second}`);
  r.pitch === 'STEEP — measured by hand'
    ? ok('re-sync NEVER overwrites a typed value', 'the hand-entered pitch survived')
    : bad('re-sync NEVER overwrites a typed value', `pitch became "${r.pitch}"`);
  /^19 years/.test(r.age) ? ok('the age is derived, not raw', r.age) : bad('the age is derived', r.age);
  await ctx.close();
}

await browser.close();
console.log('');
if (fails.length) { console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`); fails.forEach(f=>console.log('   '+f)); process.exit(1); }
console.log(`✅ PASS — ${pass}/${pass}`);
process.exit(0);
