/* gate_980.mjs — Community looks the way it was drawn (build 980).

   Thirty rules in cr-cc-styles and cr-ch2-styles were written
   `font:<weight> <size> inherit`. That is invalid CSS — `inherit` is legal only
   as a whole value, never as one component of a shorthand — so the browser
   discards the ENTIRE declaration, weight and size with it, and the element
   renders at whatever it inherits. Nothing in the gate ladder can see this: the
   braces balance, `node --check` passes, the duplicate-id check passes, and the
   screen just quietly looks wrong.

   ⚠ THE REPAIR IS LONGHANDS, NOT A FAMILY. `font:700 13px inherit` was trying to
   say "inherit the family, set weight and size". `font-weight:700;font-size:13px`
   says exactly that, and a family cannot be invented without changing what the
   element inherits. It also avoids the shorthand's RESET of line-height,
   font-style and font-variant — which today never happens, because the
   declaration is thrown away, so switching to longhands is the minimal change.

     1  no invalid shorthand survives in the two Community stylesheets
     2  ...and the file-wide count fell by exactly 30, so nothing else moved
     3  every converted rule SURVIVES Chromium's parse — the real test
     4  ...and the negative control proves that test can fail
     5  no font-family was invented: the repair is weight/size(/line-height) only
     6  a `/line-height` in the old shorthand became a real line-height
     7  the plain, VALID `font:inherit` was left alone
     8  the sweep was not greedy — untargeted Community font rules survive

   ⚠ 2 and 8 were REWRITTEN AT BUILD 983. Both pinned a file-wide SNAPSHOT
   total ("64 invalid must remain"), and 983 swept those 64 deliberately — so a
   correct app turned a correct gate red. Each now asserts the contract it was
   actually guarding rather than the number it was measured at. See them inline.

   Usage: node gate_980.mjs [path] — previous build = negative control; must go
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
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

function blockOf(id){
  const i = APP.indexOf('<style id="'+id+'"');
  if(i === -1) return null;
  return APP.slice(APP.indexOf('>', i)+1, APP.indexOf('</style>', i));
}
/* blank comments before counting — this project's own trap is a comment that
   quotes the token it documents */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* every `font:` value in a chunk, split into the three kinds that matter */
function fontDecls(chunk){
  const invalid=[], wholeInherit=[], other=[];
  const re=/font\s*:\s*([^;}]*?)\s*[;}]/g; let m;
  while((m = re.exec(chunk))){
    const v = m[1].trim();
    if(v === 'inherit') wholeInherit.push(v);
    else if(/\binherit\b/.test(v)) invalid.push(v);
    else other.push(v);
  }
  return { invalid, wholeInherit, other };
}

const CC = blockOf('cr-cc-styles'), CH2 = blockOf('cr-ch2-styles');
need('0 both Community stylesheets found', !!(CC && CH2), 'cr-cc-styles/cr-ch2-styles missing');

const ccF  = CC  ? fontDecls(strip(CC))  : {invalid:[],wholeInherit:[],other:[]};
const ch2F = CH2 ? fontDecls(strip(CH2)) : {invalid:[],wholeInherit:[],other:[]};

need('1 no invalid `font:<w> <s> inherit` survives in Community',
     ccF.invalid.length === 0 && ch2F.invalid.length === 0,
     'cr-cc-styles still has ' + ccF.invalid.length + ', cr-ch2-styles ' + ch2F.invalid.length +
     (ccF.invalid[0] ? '  e.g. font:' + ccF.invalid[0] : ''));

const all = fontDecls(strip(APP));
/* ⚠ THIS ASSERTION WAS REWRITTEN AT BUILD 983, AND THE REASON MATTERS.
   It used to read `all.invalid.length === 64` — "979 had 94, 980 removed
   Community's 30". That is a SNAPSHOT TOTAL, and build 983 swept the remaining
   64 deliberately, so a correct app made a correct gate go red. Measured across
   all three trees: 979 invalid=94, 982 invalid=64, 983 invalid=0 — while
   wholeInherit stayed 27 and other stayed 1291 in EVERY one of them.
   So the contract this assertion was really guarding is "no VALID font
   declaration was consumed", and that is what it now says. It is still
   falsifiable and still RED on 979 (94 > 64). */
/* ⚠ REWRITTEN AGAIN, 29 Aug (triage at build 1121), same cause a THIRD time.
   `other === 1291` and `wholeInherit === 27` were still snapshot totals; later
   builds legitimately ADD valid font declarations (the 1081 11px-floor sweep
   alone rewrote hundreds of shorthands), so a growing app failed a correct
   gate at 1332. The guarded contract — "the sweep never CONSUMED a valid
   declaration" — is a floor, not an equality. */
need('2 the sweep only ever removed invalid shorthands, never valid ones',
     all.invalid.length <= 64 && all.wholeInherit.length >= 27 && all.other.length >= 1291,
     'file-wide invalid ' + all.invalid.length + ' (must be <=64), plain font:inherit ' +
     all.wholeInherit.length + ' (must be >=27), valid font: ' + all.other.length + ' (must be >=1291)');

need('7 the plain, VALID `font:inherit` was left alone',
     all.wholeInherit.length >= 20,
     'only ' + all.wholeInherit.length + ' plain font:inherit left — the sweep was too greedy');

/* ⚠ ALSO REWRITTEN AT 983, same cause. This asked `all.invalid.length >= 50`
   — "980 is Community-scoped, so ~64 must survive elsewhere". After 983 swept
   those 64 on purpose there is no tree on which that can be true, and a check
   whose premise a later build retired is not a check. What it was really
   guarding is a GREEDY sweep eating declarations it was not aimed at; a greedy
   sweep shows up as the Community blocks losing font rules they should still
   have. That is measurable forever, and it is what it now says. */
const ccKept = ccF.other.length + ccF.wholeInherit.length + ch2F.other.length + ch2F.wholeInherit.length;
need('8 the sweep was not greedy — Community keeps its untargeted font rules',
     ccKept >= 25,
     'only ' + ccKept + ' valid font: declarations left in the two Community blocks');

/* 5,6 — shape of the repair, scoped to the two blocks */
const both = strip(CC || '') + strip(CH2 || '');
/* ⚠ trailing `;` is OPTIONAL. A declaration that CLOSED its block ends in `}`,
   not `;` — requiring the semicolon found 29 of 30 and failed correct code. */
const longhands = both.match(/font-weight:\d{3};font-size:[\d.]+px;?(line-height:[\d.]+;?)?/g) || [];
need('5 the repair is longhands, not an invented family',
     longhands.length >= 30,
     'found only ' + longhands.length + ' converted declarations');
/* ⚠ Do NOT count these. Two rules in these blocks already carried an adjacent
   weight/size/line-height trio before 980, so a bare count says 5 and a
   hardcoded 3 fails correct code — a number read off my own patch rather than
   off the app. Assert the three SPECIFIC values the old shorthands carried. */
const LH_WANTED = ['font-size:11.5px;line-height:1.45',
                   'font-size:11.5px;line-height:1.55',
                   'font-size:12px;line-height:1.5'];
const lhMissing = LH_WANTED.filter(w => both.indexOf(w) === -1);
need('6 a `/line-height` in the old shorthand became a real line-height',
     lhMissing.length === 0,
     'not converted: ' + JSON.stringify(lhMissing));

/* ── 3,4: the only test that matters — does Chromium KEEP them? ───────────── */
function targets(){
  const out=[];
  for (const [sid, body] of [['cr-cc-styles', CC], ['cr-ch2-styles', CH2]]){
    if(!body) continue;
    const clean = strip(body);
    const re=/([^{}]+)\{([^{}]*)\}/g; let m;
    while((m = re.exec(clean))){
      const sel=m[1].trim().replace(/\s+/g,' '), decls=m[2];
      if(sel.startsWith('@') || !sel) continue;
      if(/font-weight:\d{3};font-size:[\d.]+px/.test(decls)) out.push({sheet:sid, sel});
    }
  }
  return out;
}
const T = targets();
need('3a the converted rules were located for the render test', T.length >= 30, 'found ' + T.length);

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);

async function survives(appText, list){
  const page=await browser.newPage({viewport:{width:1194,height:900}});
  /* ⚠ Serve by RESOURCE TYPE. An image answered with an empty body never
     completes, the document never reaches readyState "complete", and anything
     waiting on the load state hangs. That cost this project every screenshot it
     ever tried to take. */
  await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
    if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
      return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:appText});
    if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
    return r.fulfill({status:200,contentType:'text/plain',body:''});});
  await page.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1400);
  const res = await page.evaluate((list)=>{
    const norm = s => s.replace(/\s+/g,' ').trim();
    const idx = new Map();
    /* ⚠ examine the rule THEN descend — in modern Chromium every CSSStyleRule
       exposes an empty .cssRules for nesting, and `if(r.cssRules) continue`
       skips every style rule and reports a confident zero. */
    function walk(rules, id){
      for(const r of rules){
        if(r.style && r.selectorText !== undefined){
          const k = id + '||' + norm(r.selectorText);
          if(!idx.has(k)) idx.set(k, '');
          idx.set(k, idx.get(k) + ' ' + r.style.cssText);
        }
        if(r.cssRules && r.cssRules.length) walk(r.cssRules, id);
      }
    }
    for(const sh of document.styleSheets){
      let rs; try{ rs = sh.cssRules; }catch(e){ continue; }
      if(rs) walk(rs, (sh.ownerNode && sh.ownerNode.id) || '(no id)');
    }
    let kept=0, dropped=[], missing=0;
    for(const t of list){
      const txt = idx.get(t.sheet + '||' + norm(t.sel));
      if(txt === undefined){ missing++; continue; }
      const hasSize = /(^|[;\s])font-size\s*:/.test(txt);
      const hasWeight = /(^|[;\s])font-weight\s*:/.test(txt);
      if(hasSize && hasWeight) kept++; else dropped.push(t.sel);
    }
    return { kept, dropped, missing, total:list.length };
  }, list);
  await page.close();
  return res;
}

const now = await survives(APP, T);
need('3 every converted rule survives Chromium\'s parse',
     now.dropped.length === 0 && now.kept >= 30,
     'kept ' + now.kept + '/' + now.total + ', dropped ' + now.dropped.length +
     (now.dropped[0] ? ' (e.g. ' + now.dropped[0] + ')' : '') + ', ' + now.missing + ' selector(s) not found');

/* The negative control for assertion 3: put the invalid form BACK into a copy
   of this same artifact and require the test to go red on it. A check that
   cannot fail is worse than no check. */
/* ⚠ the trailing `;` is optional here too — a declaration that closed its block
   ends in `}`. Requiring it left ONE of the thirty un-reverted, so the control
   cost 29 instead of 30 and the gate called correct code a failure. Re-emit
   whatever terminator was there. */
const reverted = APP.replace(/font-weight:(\d{3});font-size:([\d.]+px);?(?:line-height:([\d.]+);?)?/g,
  (m,w,s,lh) => 'font:' + w + ' ' + s + (lh ? '/'+lh : '') + ' inherit' + (m.endsWith(';') ? ';' : ''));
if (reverted !== APP){
  const back = await survives(reverted, T);
  /* ⚠ NOT `back.kept === 0`. Five of these rules already carried longhands
     before 980, written with other declarations BETWEEN font-weight and
     font-size, so the revert regex cannot reach them and they correctly keep
     their size — 5/35 surviving is right, and asserting zero failed correct
     code. Assert the DELTA instead: the 30 this build converted must all drop. */
  need('4 ...and that test CAN fail — put the invalid form back and it goes red',
       (now.kept - back.kept) >= 30,
       'restoring the shorthand only cost ' + (now.kept - back.kept) + ' rules (' +
       now.kept + ' -> ' + back.kept + '); expected at least 30, so assertion 3 proves nothing');
} else {
  need('4 ...and that test CAN fail', false, 'could not build the reverted control');
}

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_980 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
