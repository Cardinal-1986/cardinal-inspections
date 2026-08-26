#!/usr/bin/env python3
"""Build 1075 — the inspection routes get a real model ladder.

Theo: "Now do the inspection routes — caption.js and summarize.js."

⚠ WHAT I FOUND FIRST, AND IT IS WORSE THAN "PINNED TO AN OLD MODEL"

  caption.js's ladder is DEAD CODE that calls ONE model three times:

      let geminiRes = await askGemini('gemini-3.5-flash');   // try 1
      if (503 || 429) { sleep(1200);
        geminiRes = await askGemini('gemini-3.5-flash'); }   // try 2, SAME
      if (!geminiRes.ok) {
        const alt = await askGemini('gemini-3.5-flash');     // "alt", SAME
        diag.gemini25 = alt.status;                          // named for 2.5

  The comment above it says "primary model, retry once on overload, THEN OLDER
  MODEL, then OpenAI backup", and the third call's diag key is `gemini25`. So
  this WAS a real 3.5 -> 2.5 ladder, and when the models were renumbered all
  three call sites were replaced with the same literal. What is left is a
  comment that lies, a diag field named after a model it never calls, and a
  third request that is a byte-identical repeat of the second.

  The cost is not style. On a Gemini outage — measured at ~1 call in 4 (builds
  500-501) — an inspection caption makes THREE doomed calls to the same model
  and then drops straight to gpt-4o-mini, the smallest model in the stack.
  Meanwhile detect.js, sortphotos.js and supplement.js have all had a real
  ladder since 503. Inspections never touch 3.6 at all.

  summarize.js has no ladder whatsoever — one call, then OpenAI.

⚠ THE LADDER IS 3.6 -> 3.5, NOT 3.7, AND THAT IS DELIBERATE
  I told Theo twice that which model LEADS is the bake-off's call, and shipping
  3.7 here on my own judgement would contradict that while wearing the language
  of evidence. What this build does is bring inspections level with the three
  routes that already ladder — the SAME array, byte-identical:

      const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

  That is CLAUDE.md's "grep for the convention before inventing a mechanism".
  Inspections go from never-touching-3.6 to leading with it, and the reliability
  fix lands now rather than waiting on a measurement it does not depend on.
  Putting 3.7 at the front is one line in each file when the bake-off says so.

⚠ NO ARTIFACT STAMP MOVES, AND THAT IS CORRECT
  This build is api/ only. index.html stays at 1072, supplement.html at 1072,
  bakeoff.html at 1074 — check_build.py and check_artifact.py have nothing to
  say about it. The record is the build log plus each route's own header stamp,
  which is the ai-status.js / bakeoff.js convention.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

LADDER_NOTE = """/* 1075: the SAME array detect.js, sortphotos.js and supplement.js have used
   since build 503 — copied, not invented, so the four routes cannot drift.

   ⚠ It replaces THREE IDENTICAL CALLS to gemini-3.5-flash. The comment above
     them claimed "then older model" and the third call's diag key was named
     `gemini25`: this was a real 3.5 -> 2.5 ladder that got flattened when the
     models were renumbered, leaving a retry wearing a ladder's clothes. On the
     ~1-in-4 Gemini outage measured at 500-501 an inspection caption made three
     doomed calls to one model and then fell to the smallest model in the stack.

   ⚠ 3.7 is NOT at the front on purpose. Which model should LEAD is what
     /bakeoff.html exists to answer; putting it there on my own judgement would
     pre-empt the measurement while sounding like it. One line, once measured. */
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
"""

# ══ api/caption.js ═════════════════════════════════════════════════════════
C = 'api/caption.js'; c = pl.load(C); c0 = c

c = pl.sub(c, "// /api/caption.js", "// /api/caption.js  [1075]")
c = pl.sub(c, "const SUPABASE_URL = ", LADDER_NOTE + "\nconst SUPABASE_URL = ", count=1)

# --- handler 1: the single caption -----------------------------------------
c = pl.sub(c,
    "    // primary model, retry once on overload, then older model, then OpenAI backup",
    "    // the ladder: each model in turn, one pause on an overload, then OpenAI")
c = pl.sub(c,
"""    let geminiRes = await askGemini('gemini-3.5-flash');
    diag.gemini35_try1 = geminiRes.status;
    if (geminiRes.status === 503 || geminiRes.status === 429) {
      await new Promise(r => setTimeout(r, 1200));
      geminiRes = await askGemini('gemini-3.5-flash');
      diag.gemini35_try2 = geminiRes.status;
    }
    if (!geminiRes.ok) {
      const alt = await askGemini('gemini-3.5-flash');
      diag.gemini25 = alt.status;
      if (alt.ok) geminiRes = alt;
    }""",
"""    let geminiRes = null, viaModel = '';
    for (const model of GEMINI_MODELS) {
      geminiRes = await askGemini(model);
      diag[model] = geminiRes.status;
      /* 503/429 is overload: pause and give the SAME model one more go, which
         is what the free tier actually needs. Any other failure means this
         model will not work — move on rather than retry something that cannot
         succeed (detect.js's rule since 503). */
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        await new Promise(r => setTimeout(r, 1200));
        geminiRes = await askGemini(model);
        diag[model + '_retry'] = geminiRes.status;
      }
      if (geminiRes.ok) { viaModel = model; break; }
    }""")

c = pl.sub(c,
    "        if (cap) { res.status(200).json({ caption: cap, via: 'gpt-4o-mini',\n"
    "                                          via_primary: 'gemini-3.5-flash' }); return; }",
    "        if (cap) { res.status(200).json({ caption: cap, via: 'gpt-4o-mini',\n"
    "                                          via_primary: GEMINI_MODELS[0] }); return; }")

c = pl.sub(c,
"""    res.status(200).json({ caption, via: 'gemini-3.5-flash',
                           via_primary: 'gemini-3.5-flash' });""",
"""    res.status(200).json({ caption, via: viaModel || GEMINI_MODELS[0],
                           via_primary: GEMINI_MODELS[0] });""")

# --- handler 2: the overview ------------------------------------------------
c = pl.sub(c,
"""    let r = await askGemini('gemini-3.5-flash');
    diag.gemini_try1 = r.status;
    if (r.status === 503 || r.status === 429) {
      await new Promise(x => setTimeout(x, 1200));
      r = await askGemini('gemini-3.5-flash');
      diag.gemini_try2 = r.status;
    }""",
"""    let r = null, viaModel = '';
    for (const model of GEMINI_MODELS) {
      r = await askGemini(model);
      diag[model] = r.status;
      if (r.status === 503 || r.status === 429) {
        await new Promise(x => setTimeout(x, 1200));
        r = await askGemini(model);
        diag[model + '_retry'] = r.status;
      }
      if (r.ok) { viaModel = model; break; }
    }""")

# ══ api/summarize.js ═══════════════════════════════════════════════════════
S = 'api/summarize.js'; s = pl.load(S); s0 = s

s = pl.sub(s, "// /api/summarize.js", "// /api/summarize.js  [1075]")
s = pl.sub(s, "const SUPABASE_URL = ", LADDER_NOTE + "\nconst SUPABASE_URL = ", count=1)

s = pl.sub(s,
"""    let via = 'gemini-3.5-flash';
    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );""",
"""    /* 1075: a ladder where there was a single call. This route drafts the
       narrative a rep sends to a homeowner; one busy model should not drop it
       straight to the smallest model in the stack. */
    async function askGemini(model) {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
    }

    let via = GEMINI_MODELS[0];
    let geminiRes = null;
    for (const model of GEMINI_MODELS) {
      geminiRes = await askGemini(model);
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        await new Promise(r => setTimeout(r, 1200));
        geminiRes = await askGemini(model);
      }
      if (geminiRes.ok) { via = model; break; }
    }""")

s = pl.sub(s, "    res.status(200).json({ summary, via, via_primary: 'gemini-3.5-flash' });",
              "    res.status(200).json({ summary, via, via_primary: GEMINI_MODELS[0] });")

# ── proof of scope ───────────────────────────────────────────────────────
# ⚠ counts COMPUTED in one pass first, not guessed — that habit cost six
#   failed assertions earlier in this session.
assert c.count("const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];") == 1
assert s.count("const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];") == 1

# THE DEFECT IS GONE: no route may still name a model literal at a call site
assert c.count("askGemini('gemini-3.5-flash')") == 0, 'a hardcoded call survived'
assert c0.count("askGemini('gemini-3.5-flash')") == 5, 'the control had five'
assert s.count('models/gemini-3.5-flash') == 0
# ⚠ ANCHORED ON CODE, NOT THE WORD. This patch's own banner quotes both
#   `gemini25` and "then older model" while explaining what it removed, so a
#   bare count says 1 and fails correct code. Seventh time this session; the
#   habit that works is computing every count in one pass BEFORE asserting.
assert c.count('diag.gemini25 =') == 0 and c0.count('diag.gemini25 =') == 1
assert c.count('// primary model, retry once on overload, then older model') == 0
assert c0.count('// primary model, retry once on overload, then older model') == 1

# both handlers ladder, and each still has exactly one OpenAI fallback
assert c.count('for (const model of GEMINI_MODELS)') == 2
assert s.count('for (const model of GEMINI_MODELS)') == 1
assert c.count('api.openai.com') == c0.count('api.openai.com')
assert s.count('api.openai.com') == s0.count('api.openai.com')

# 1072's contract must survive: via + via_primary on every success path
assert c.count('via_primary') == c0.count('via_primary') == 2
assert s.count('via_primary') == s0.count('via_primary') == 1
assert c.count("via_primary: GEMINI_MODELS[0]") == 2
assert s.count("via_primary: GEMINI_MODELS[0]") == 1

# nothing else may have moved
assert c.count('module.exports') == 0 and s.count('module.exports') == 0
assert c.count('const PROMPT') == c0.count('const PROMPT')
assert s.count('const sources =') == s0.count('const sources =') == 1
assert s.count('checklist') == s0.count('checklist'), '1070 must be untouched'
# ⚠ 3.7 must NOT be a MODEL STRING here — that is the bake-off's call, not
#   this build's. Both banners discuss it in prose, which is the point of them,
#   so the assertion is on the callable form.
assert c.count("'gemini-3.7") == 0 and s.count("'gemini-3.7") == 0
assert 'bakeoff' in c and 'bakeoff' in s, 'the banner must say where the decision lives'

pl.write_atomic(C, c); pl.write_atomic(S, s)
pl.assert_in(C, 'for (const model of GEMINI_MODELS)')
print('build 1075 written')
for n, o, x in (('caption.js', c0, c), ('summarize.js', s0, s)):
    print(f'  api/{n:16} {len(o):>7,} -> {len(x):>7,}  (+{len(x)-len(o)})')
