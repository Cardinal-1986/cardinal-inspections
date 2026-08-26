/* gate_stack.mjs — THE ACCUMULATION GATE
   ═══════════════════════════════════════════════════════════════════════════
   CLAUDE.md has said "deletion at source beats out-specificity" since build
   ~330 and nothing has ever enforced it. A thousand builds of direct surgery
   later, index.html carries 148 style blocks that only ever grow, and the only
   way to learn which rule wins is to render the thing in Chromium.

   This gate does not clean up that sediment. It stops the pile GROWING.

   WHAT IT FLAGS — one specific event, called a STACK:
     a rule this build ADDED wins a property on a real element, and a
     PRE-EXISTING rule that also declares that property is STILL IN THE FILE.

   That is the moment a build chose to out-specify instead of edit or delete.
   The loser is now dead weight, and every future build must out-specify one
   more thing to touch that element.

   WHAT IT DOES NOT FLAG, deliberately:
     · a new rule on an element nothing styled before  → not stacking, growth
     · a new rule that loses                            → the cascade working
     · a new rule replacing one this build DELETED      → exactly right, silent

   ⚠ WHY IT RENDERS BOTH ARTIFACTS RATHER THAN DIFFING THE TEXT
   The browser normalises cssText (`#fff` → `rgb(255,255,255)`, shorthand
   expansion, selector whitespace). Raw file text and CSSOM text never match,
   so a text diff reports every rule as added. Rendering prev the same way is
   the only apples-to-apples comparison. It costs one extra page load.

   ⚠ THE ESCAPE HATCH IS DELIBERATE AND MUST STAY EXPLICIT
   Some overrides are correct and the loser must stay: a theme twin, a media
   query, a CRM gate, a print stylesheet. Mark the winning rule with a
   `--cr-stack` custom property naming the reason:

       #thing { color:#fff; --cr-stack:"rb-light twin, base must stay"; }

   A custom property survives into the CSSOM, which a CSS COMMENT DOES NOT —
   comments are stripped before the browser ever sees them, so a comment-based
   marker cannot work here at all. Silence is not an option; the build either
   deletes the loser or says why it kept it.

   USAGE
     node gate_stack.mjs <new.html> --prev <old.html> [--setup a.js,b.js]
                         [--viewport 390x844] [--states home,client,nav]
     node gate_stack.mjs --selftest

   Exit 0 clean · 1 stacks found · 2 could not run.
   ═══════════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync } from 'fs';
let chromium; try { ({ chromium } = await import('playwright')); } catch (e) {}
if (!chromium) { console.error('gate_stack: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : (argv[i+1] || d); };
const SELFTEST = argv.includes('--selftest');
const FILE  = argv.find(a => !a.startsWith('--'));
const PREV  = flag('prev', null);
const SETUP = flag('setup', null);
const STATES= flag('states', null);
const [VW, VH] = flag('viewport', '390x844').split('x').map(Number);

/* ── the in-page probe. Runs identically on prev and new. ────────────────── */
const COLLECT = `(() => {
  const out = [];
  for (const sh of document.styleSheets) {
    let rr = null; try { rr = sh.cssRules; } catch (e) {}
    if (!rr) continue;
    const walk = (list, media) => { for (const r of list) {
      if (r.selectorText) out.push({ sel: r.selectorText, text: r.cssText, media: media || '' });
      /* ⚠ In modern Chromium EVERY CSSStyleRule exposes an empty .cssRules for
         CSS nesting, so descending on truthiness alone SKIPS every style rule.
         Examine the rule first, then descend only into real groupers. */
      else if (r.cssRules) walk(r.cssRules, (media ? media + ' ' : '') + (r.conditionText || ''));
    }};
    walk(rr, '');
  }
  return out;
})()`;

const ANALYSE = (priorSet) => `((PRIOR) => {
  const prior = new Set(PRIOR);
  const spec = (sel) => {
    const s = sel.split(',')[0];
    const i = (s.match(/#[\\w-]+/g) || []).length;
    const c = (s.match(/[.\\[][\\w-]+|:(?!:)[\\w-]+/g) || []).length;
    const e = (s.match(/(^|[\\s>+~])[a-z][\\w-]*/gi) || []).length;
    return i * 10000 + c * 100 + e;
  };
  /* ⚠⚠ ONLY DESCEND INTO A GROUPER THAT CURRENTLY APPLIES.
     BUG_CLASSES records the sentinel's DEAD check making exactly this mistake:
     it walked non-matching @media blocks and reported a FIX as the defect.
     This gate reproduced it. The negative control looked CLEAN because
     \`body{color:#000 !important}\` sits in @media print — dead on screen, but
     counted as a live candidate, so a real stack read as "the new rule lost".
     Consequence, stated so nobody widens it by accident: this gate judges only
     what applies at the viewport it runs at. Print rules and non-matching media
     are OUT OF SCOPE by design — run other viewports to cover their media. */
  const applies = (r) => {
    const c = r.conditionText;
    if (c == null) return true;                    /* @layer, @scope, ... */
    if (r.constructor && /Supports/.test(r.constructor.name)) {
      try { return CSS.supports(c); } catch (e) { return false; }
    }
    try { return matchMedia(c).matches; } catch (e) { return false; }
  };
  const rules = [];
  for (const sh of document.styleSheets) {
    let rr = null; try { rr = sh.cssRules; } catch (e) {}
    if (!rr) continue;
    const walk = (list) => { for (const r of list) {
      if (r.selectorText) rules.push(r);
      else if (r.cssRules && applies(r)) walk(r.cssRules);
    }};
    walk(rr);
  }
  const isNew = (r) => !prior.has(r.cssText);
  const findings = [];
  const seen = new Set();
  /* ⚠ counters, not decoration: a gate that reports zero is indistinguishable
     from a gate that never looked. --debug prints where the funnel drained. */
  const stat = { total: rules.length, isNew: 0, hasEls: 0, props: 0, cands2: 0, won: 0, displaced: 0 };
  for (const R of rules) {
    if (!isNew(R)) continue;
    stat.isNew++;
    /* ⚠ TWO dashes. A single-dash '-cr-stack' is a vendor-prefix-shaped name,
       not a custom property: browsers DROP it at parse time, so the marker
       silently does nothing and the exemption never applies. Caught by testing
       the hatch instead of assuming it. */
    if (R.style.getPropertyValue('--cr-stack')) continue;   /* declared exemption */
    let els = [];
    try { els = [...document.querySelectorAll(R.selectorText)]; } catch (e) { continue; }
    if (!els.length) continue;
    stat.hasEls++;
    for (let pi = 0; pi < R.style.length; pi++) {
      stat.props++;
      const P = R.style[pi];
      if (P === '--cr-stack') continue;
      for (const el of els.slice(0, 8)) {
        const cands = rules.filter(x => {
          if (!x.style.getPropertyValue(P)) return false;
          let m = false; try { m = el.matches(x.selectorText); } catch (e) {}
          return m;
        });
        if (cands.length < 2) continue;
        stat.cands2++;
        let win = cands[0];
        for (const c of cands) {
          const ci = c.style.getPropertyPriority(P) === 'important';
          const wi = win.style.getPropertyPriority(P) === 'important';
          if (ci && !wi) { win = c; continue; }
          if (!ci && wi) continue;
          if (spec(c.selectorText) >= spec(win.selectorText)) win = c;
        }
        if (win !== R) continue;                       /* the new rule lost — fine */
        stat.won++;
        const displaced = cands.filter(c => c !== R && !isNew(c));
        if (!displaced.length) continue;               /* nothing pre-existing — growth, fine */
        stat.displaced++;
        const key = R.selectorText + '|' + P;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          added: R.selectorText.slice(0, 70), prop: P,
          value: R.style.getPropertyValue(P).slice(0, 40),
          displaced: displaced.slice(0, 3).map(d => ({
            sel: d.selectorText.slice(0, 70),
            val: d.style.getPropertyValue(P).slice(0, 40) })),
          more: Math.max(0, displaced.length - 3)
        });
      }
    }
  }
  return { findings, stat };
})(${JSON.stringify(priorSet)})`;

async function sweep(page, file, setupSrc, states, evalStr) {
  await page.addInitScript(setupSrc || '');
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  let acc = await page.evaluate(evalStr);
  if (acc && acc.stat) { globalThis.__stat = acc.stat; acc = acc.findings; }
  if (states) {
    const names = await page.evaluate('(window.__sentinelStates||[]).map(s=>s.name)').catch(() => []);
    for (const want of states) {
      const i = names.indexOf(want);
      if (i < 0) { console.log('  NOTE      no such state: ' + want); continue; }
      try {
        await page.evaluate('Promise.resolve(window.__sentinelStates[' + i + '].run())');
        await page.waitForTimeout(900);
        const more = await page.evaluate(evalStr);
        acc = acc.concat(more.findings ? more.findings : more);
      } catch (e) { console.log('  NOTE      state "' + want + '" threw: ' + String(e.message).split('\n')[0]); }
    }
  }
  return acc;
}

if (SELFTEST) {
  /* A gate never seen to fail proves nothing. Two fixtures: one that MUST
     fire (added rule beats a surviving old one) and one that MUST NOT
     (added rule beats a rule the same build removed → not stacking). */
  const base = `<style>.x{color:rgb(1,1,1)}</style><div class="x" id="d">t</div>`;
  const stacked = `<style>.x{color:rgb(1,1,1)}</style><style>#d.x{color:rgb(2,2,2)}</style><div class="x" id="d">t</div>`;
  const replaced = `<style>#d.x{color:rgb(2,2,2)}</style><div class="x" id="d">t</div>`;
  const b = await chromium.launch(); const pg = await b.newPage();
  const load = async (html) => { await pg.setContent(html); await pg.waitForTimeout(50); };
  await load(base);    const prior = (await pg.evaluate(COLLECT)).map(r => r.text);
  /* ⚠ ANALYSE returns { findings, stat } — reading it as a bare array made
     BOTH selftest cases fail on a gate that was working. */
  await load(stacked); const hit  = (await pg.evaluate(ANALYSE(prior))).findings;
  await load(replaced);const miss = (await pg.evaluate(ANALYSE(prior))).findings;
  await b.close();
  const okHit = hit.length === 1 && hit[0].prop === 'color';
  const okMiss = miss.length === 0;
  console.log((okHit ? '  PASS  ' : '  FAIL  ') + 'fires on a real stack (added rule beats a SURVIVING old one)');
  console.log((okMiss ? '  PASS  ' : '  FAIL  ') + 'stays silent when the old rule was DELETED in the same build');
  console.log('');
  console.log(okHit && okMiss ? 'SELFTEST OK — the gate can both fire and stay quiet'
                              : 'SELFTEST FAILED — do not trust a clean run from this build');
  process.exit(okHit && okMiss ? 0 : 2);
}

if (!FILE || !existsSync(FILE)) { console.error('gate_stack: usage: node gate_stack.mjs <new.html> --prev <old.html>'); process.exit(2); }
if (!PREV || !existsSync(PREV)) { console.error('gate_stack: --prev is required (and must exist) — there is no "added" without a baseline'); process.exit(2); }

const setupSrc = SETUP ? SETUP.split(',').map(p => {
  if (!existsSync(p)) { console.error('gate_stack: --setup file not found: ' + p); process.exit(2); }
  return readFileSync(p, 'utf8');
}).join('\n') : '';
const states = STATES ? STATES.split(',').map(s => s.trim()).filter(Boolean) : null;

/* absolute paths must survive: prepending cwd to /tmp/... yields a path that does not exist */
const abs = (p) => p.startsWith('/') ? p : process.cwd() + '/' + p.replace(/^\.\//, '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

const priorRules = await sweep(page, abs(PREV), setupSrc, states, COLLECT)
  .catch(e => { console.error('gate_stack: could not render --prev: ' + e.message); process.exit(2); });
const prior = [...new Set(priorRules.map(r => r.text))];

const page2 = await browser.newPage({ viewport: { width: VW, height: VH } });
const found = await sweep(page2, abs(FILE), setupSrc, states, ANALYSE(prior));
await browser.close();

if (argv.includes('--debug') && globalThis.__stat) console.log('  funnel: ' + JSON.stringify(globalThis.__stat));
const uniq = []; const seen = new Set();
for (const f of found) { const k = f.added + '|' + f.prop; if (seen.has(k)) continue; seen.add(k); uniq.push(f); }

for (const f of uniq) {
  console.log(`  STACK     ${f.added} { ${f.prop}: ${f.value} }`);
  for (const d of f.displaced) console.log(`            displaces  ${d.sel} { ${f.prop}: ${d.val} }`);
  if (f.more) console.log(`            ...and ${f.more} more`);
}
console.log('');
console.log(uniq.length
  ? `GATE_STACK — ${uniq.length} stack(s): this build out-specified instead of editing.
Delete the displaced rule, or declare why it must stay:
    --cr-stack:"reason";   on the winning rule
(${prior.length} pre-existing rules were the baseline)`
  : `GATE_STACK CLEAN — nothing stacked (${prior.length} pre-existing rules were the baseline)`);
process.exit(uniq.length ? 1 : 0);
