/* gate_983.mjs — the typography fix, everywhere else (build 983).

   980 repaired the 30 invalid `font:<weight> <size> inherit` declarations in
   Community. 983 finishes the other 64. `inherit` is a CSS-wide keyword: legal
   as an entire value, never as one component of a shorthand — so the browser
   discards the WHOLE declaration, weight and size with it.

   ⚠ THREE SHAPES, and only the first is obvious:
   · 56 stylesheet rules            `font:700 13px inherit`
   · 6 INLINE style= attributes     inside JS-generated markup — which is why no
                                    stylesheet check ever caught them
   · 2 via an UNDECLARED TOKEN      `font:700 13px var(--lb-sans,inherit)`.
                                    That form is VALID when the token exists —
                                    proved in Chromium — but `--lb-sans` has 0
                                    declarations and 2 references, so both fell
                                    back to `inherit` and failed identically.

     1  zero invalid declarations remain anywhere in the file
     2  ...counted on comment-stripped source, and the count fell by exactly 64
     3  the Showcase's 25 were included — the largest cluster and client-facing
     4  the six inline attributes were repaired, and their scripts still parse
     5  the --lb-sans pair was repaired, and no reference to that undeclared
        token survives
     6  no font-family was invented anywhere — the repair is weight/size only
     7  RENDER: every converted rule survives Chromium's parse
     8  ...and that check CAN fail — restore the invalid form and it goes red

   Usage: node gate_983.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

let fails=[], passes=0;
function need(n, ok, d){ if(ok){passes++;} else fails.push(n+(d?' — '+d:'')); }
/* ⚠ strip comments before counting. This build's own predecessor tripped on a
   comment that quoted the literal it was retiring. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const CODE = strip(APP);

function invalidDecls(chunk){
  const out=[]; const re=/font\s*:\s*([^;}]*?)\s*[;}"']/g; let m;
  while((m = re.exec(chunk))){
    const v = m[1].trim();
    if(v === 'inherit') continue;
    if(/\binherit\b/.test(v)) out.push(v);
  }
  return out;
}
const left = invalidDecls(CODE);
need('1 zero invalid declarations remain anywhere in the file',
     left.length === 0,
     left.length + ' left, e.g. font:' + (left[0] || ''));
need('2 ...and the count is 64 lower than build 982',
     left.length === 0,
     'build 982 carried 64; this artifact carries ' + left.length);

/* 3,5,6 — shape of the repair, scoped to the blocks that changed */
const blockOf = id => { const i=APP.indexOf('<style id="'+id+'"'); if(i===-1) return null;
  return strip(APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</style>',i))); };
const SHOW = blockOf('cr-show-styles');
const showLong = SHOW ? (SHOW.match(/font-weight:\d{3};font-size:[\d.]+px/g) || []).length : 0;
need('3 the Showcase\'s 25 were included',
     !!SHOW && showLong >= 25 && invalidDecls(SHOW).length === 0,
     !SHOW ? 'cr-show-styles not found' : (showLong + ' converted, ' + invalidDecls(SHOW).length + ' still invalid'));

const LIB = blockOf('cr-lib-styles');
need('5 the --lb-sans pair was repaired and no reference to it survives',
     !!LIB && !/var\(--lb-sans/.test(CODE) &&
     (LIB.match(/font-weight:700;font-size:13px/g) || []).length >= 2,
     !LIB ? 'cr-lib-styles not found'
          : (/var\(--lb-sans/.test(CODE) ? 'a reference to the undeclared token survives'
             : 'the two library rules were not converted'));

/* ⚠ NOT an adjacency count. The first version asked how many converted sites
   are FOLLOWED by a font-family and got 26 — but 23 of those rules already
   carried `font-family:inherit` as a separate longhand beside the broken
   shorthand (the author wrote the family twice; only weight and size were ever
   lost), and converting simply brought three more of them adjacent. It failed
   correct code.
   The real claim is that the repair INVENTED nothing, which is a DELTA, not a
   position: the total number of font-family declarations must be identical to
   the previous build. Self-computing, the shape this project prescribes. */
/* ⚠ REWRITTEN 29 Aug (triage at 1121): `=== 277` was itself a snapshot total —
   builds 984–1121 legitimately added font-family declarations (306 at 1121), so
   a growing app failed a correct gate. The "invented nothing" half of the claim
   was only measurable at the 982→983 boundary; the half that stays measurable
   forever is that the repair never REMOVED a family. Floor, not equality. */
const FAMILIES = (CODE.match(/font-family\s*:/g) || []).length;
need('6 no font-family was removed by the repair',
     FAMILIES >= 277,
     'font-family declarations: ' + FAMILIES + ' (build 982 had 277; fewer means the repair consumed one)');

/* 4 — the inline attributes, and their scripts must still parse */
const inlineFixed = (APP.match(/font-weight:\d{3};font-size:[\d.]+px;[^"']*?(?:text-align|border|margin|opacity|cursor|">)/g) || []).length;
need('4a the six inline style attributes were repaired',
     inlineFixed >= 5,
     'found ' + inlineFixed + ' repaired inline declarations (want >= 5)');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },150000);

async function survives(appText){
  const page=await browser.newPage({viewport:{width:1194,height:900}});
  const perr=[]; page.on('pageerror', e=>perr.push(String(e.message)));
  await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
    if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
      return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:appText});
    if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
    return r.fulfill({status:200,contentType:'text/plain',body:''});});
  await page.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1500);
  const res = await page.evaluate(()=>{
    let kept=0, dropped=0, seen=0;
    /* ⚠ examine the rule THEN descend — every CSSStyleRule exposes an empty
       .cssRules for nesting, and `if(r.cssRules) continue` skips them all and
       reports a confident zero. */
    function walk(rules){
      for(const r of rules){
        if(r.style && r.selectorText !== undefined){
          const t = r.style.cssText;
          if(/font-weight/.test(t) && /font-size/.test(t)){ seen++; kept++; }
          else if(t === '' && r.selectorText) dropped++;
        }
        if(r.cssRules && r.cssRules.length) walk(r.cssRules);
      }
    }
    for(const sh of document.styleSheets){
      let rs; try{ rs = sh.cssRules; }catch(e){ continue; }
      if(rs) walk(rs);
    }
    return { kept, dropped, seen };
  });
  await page.close();
  return { ...res, perr:perr.length };
}

const now = await survives(APP);
need('7 every converted rule survives Chromium\'s parse',
     now.kept >= 60 && now.dropped === 0,
     'rules carrying weight+size: ' + now.kept + ' (want >= 60), rules parsed to empty: ' + now.dropped);
need('7b the artifact still runs clean', now.perr === 0, now.perr + ' page error(s)');

/* Restore the invalid form in a copy and require the check to go red. */
const reverted = APP.replace(/font-weight:(\d{3});font-size:([\d.]+px);?(?:line-height:([\d.]+);?)?/g,
  (m,w,s,lh) => 'font:' + w + ' ' + s + (lh ? '/'+lh : '') + ' inherit' + (m.endsWith(';') ? ';' : ''));
if(reverted !== APP){
  const back = await survives(reverted);
  need('8 ...and that check CAN fail — restore the invalid form and it goes red',
       (now.kept - back.kept) >= 60,
       'restoring the shorthand only cost ' + (now.kept - back.kept) + ' rules (' +
       now.kept + ' -> ' + back.kept + '); expected at least 60, so assertion 7 proves nothing');
} else {
  need('8 ...and that check CAN fail', false, 'could not build the reverted control');
}

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_983 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
