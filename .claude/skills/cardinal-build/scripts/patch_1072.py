#!/usr/bin/env python3
"""Build 1072 — every AI answer says which model wrote it.

THE PROBLEM, MEASURED ACROSS THE ROUTES
  Twelve routes send photographs to a model. Every one ladders
  gemini → gpt-4o-mini, and the historical measurement (builds 500-501) is that
  Gemini 503'd about ONE CALL IN FOUR. So a quarter of the time the answer on
  Theo's screen was written by the SMALLEST model in the stack — and nothing,
  anywhere, said so.

  What each route reported before this build:

    detect.js      via = the model NAME          ✅ already right — the shape
    sortphotos.js  viaGemini / viaOpenAI counts  ✅ per placement, left alone
    supplement.js  via = 'gemini' | 'openai'     ⚠ loses WHICH gemini
    caption.js     via only when OpenAI answered ⚠ silence is ambiguous
    analyze.js     via only when OpenAI answered ⚠ same
    summarize.js   nothing at all                ❌ and 1070 just wired the
                                                    checklist into it

  ⚠ AND NONE OF IT REACHED A SCREEN. Measured: `via` is returned by four routes
    and read by ZERO call sites in index.html or supplement.html. The single
    grep hit is a CSS class. It has been computed, serialised and discarded.

  This is the Visualizer's lesson (829, `achieved._worker`) applied to the AI
  routes: "which code produced this?" cost three rounds in one night until it
  became a field. Provenance is a query, never an argument.

TWO FIELDS, AND THE SECOND IS THE ONE THAT MAKES IT USABLE
  via          the model that actually answered
  via_primary  the model the route ASKED FIRST

  A client can then tell "intended path" from "fell back" WITHOUT hardcoding
  any ladder — which matters because the ladders are NOT uniform (detect,
  sortphotos and supplement lead with 3.6; caption, analyze and summarize are
  pinned to 3.5) and this build deliberately changes none of them. Which model
  should lead is exactly what the accuracy bake-off is for; reporting is not
  the place to pre-empt it.

⚠ THE SCREEN SAYS NOTHING WHEN NOTHING IS WRONG
  Build 808 exists because a perfectly accurate grey chip told nobody anything,
  and CLAUDE.md's rule from it is explicit: say WHY, and say nothing at all when
  there is nothing wrong yet — crying wolf trains people to ignore the banner.
  So the note appears ONLY when via !== via_primary. On the intended path the
  screen is byte-identical to 1071.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

BANNER = ("/* 1072: which model actually answered, and which one was asked first.\n"
          "   The pair is the point — a client can tell the intended path from a\n"
          "   fallback without knowing this route's ladder, and the ladders are not\n"
          "   uniform. Copied from api/detect.js, which has reported the model NAME\n"
          "   since it shipped and is the shape the others should have had. */\n")

# ══ api/summarize.js — reported nothing at all ═════════════════════════════
S = 'api/summarize.js'; s = pl.load(S); s0 = s
s = pl.sub(s, "    let geminiRes = await fetch(",
              "    let via = 'gemini-3.5-flash';\n    let geminiRes = await fetch(")
s = pl.sub(s, "    /* 502: Google refusing is no longer the end of the road. */\n"
              "    if (!geminiRes.ok) geminiRes = await aiFallback([{ text: prompt }], geminiRes);",
              "    /* 502: Google refusing is no longer the end of the road. */\n"
              "    if (!geminiRes.ok) {\n"
              "      geminiRes = await aiFallback([{ text: prompt }], geminiRes);\n"
              "      if (geminiRes && geminiRes._via === 'openai') via = 'gpt-4o-mini';\n"
              "    }")
s = pl.sub(s, "    res.status(200).json({ summary });",
              "    " + BANNER.replace('\n', '\n    ').rstrip() + "\n"
              "    res.status(200).json({ summary, via, via_primary: 'gemini-3.5-flash' });")

# ══ api/caption.js — reported only when OpenAI answered ════════════════════
C = 'api/caption.js'; c = pl.load(C); c0 = c
c = pl.sub(c, "        if (cap) { res.status(200).json({ caption: cap, via: 'openai' }); return; }",
              "        if (cap) { res.status(200).json({ caption: cap, via: 'gpt-4o-mini',\n"
              "                                          via_primary: 'gemini-3.5-flash' }); return; }")
c = pl.sub(c, "    res.status(200).json({ caption });",
              "    /* 1072: name the model on the SUCCESS path too. Reporting only the\n"
              "       fallback made silence ambiguous — Gemini answered, or an older\n"
              "       deploy is running? A field that appears only on failure cannot\n"
              "       distinguish those, which is most of what it was needed for. */\n"
              "    res.status(200).json({ caption, via: 'gemini-3.5-flash',\n"
              "                           via_primary: 'gemini-3.5-flash' });")

# ══ api/analyze.js — same shape ════════════════════════════════════════════
A = 'api/analyze.js'; a = pl.load(A); a0 = a
a = pl.sub(a, "      res.status(200).json({ text: text.trim() || 'No analysis returned.', via: 'openai' });",
              "      res.status(200).json({ text: text.trim() || 'No analysis returned.',\n"
              "                             via: 'gpt-4o-mini', via_primary: MODEL });")
a = pl.sub(a, "          res.status(200).json({ text: text.trim() || 'No analysis returned.', via: 'openai-fallback' });",
              "          res.status(200).json({ text: text.trim() || 'No analysis returned.',\n"
              "                                 via: 'gpt-4o-mini', via_primary: MODEL });")
a = pl.sub(a, "    res.status(200).json({ text: text.trim() || 'No analysis returned.' });",
              "    /* 1072: the success path names the model too — see caption.js. */\n"
              "    res.status(200).json({ text: text.trim() || 'No analysis returned.',\n"
              "                           via: MODEL, via_primary: MODEL });")

# ══ api/supplement.js — had via, but lost WHICH gemini ═════════════════════
P = 'api/supplement.js'; p = pl.load(P); p0 = p
p = pl.sub(p, "    let ans = null, via = 'gemini', lastBody = null, lastText = '';",
              "    /* 1072: the model NAME, not the vendor. 'gemini' cannot tell 3.6 from\n"
              "       3.5, and those are different model tiers — exactly the distinction\n"
              "       somebody asking \"why did it miss that\" needs. */\n"
              "    let ans = null, via = GEMINI_MODELS[0], lastBody = null, lastText = '';")
p = pl.sub(p, "        via = r._via === 'openai' ? 'openai' : 'gemini';",
              "        via = r._via === 'openai' ? 'gpt-4o-mini' : model;")
p = pl.sub(p, "        diag: { via, docBytes, photoBytes, ms: elapsed() }",
              "        diag: { via, via_primary: GEMINI_MODELS[0], docBytes, photoBytes, ms: elapsed() }")
p = pl.sub(p, "        diag: { via, ms: elapsed() }",
              "        diag: { via, via_primary: GEMINI_MODELS[0], ms: elapsed() }")

# ══ api/detect.js — already right; it only lacked the pair ═════════════════
D = 'api/detect.js'; d = pl.load(D); d0 = d
d = pl.sub(d, "      via: via,",
              "      via: via,\n"
              "      via_primary: GEMINI_MODELS[0],   /* 1072: so a fallback is visible */")

# ══ supplement.html — say it, and ONLY when it is not the intended path ════
H = 'supplement.html'; h = pl.load(H); h0 = h
h = pl.sub(h,
"""    var why = j.photos_capped_by === 'bytes'
      ? ' (the rest were too large to send together)'
      : (j.photos_capped_by === 'count' ? ' (only the newest 20 are sent)' : '');""",
"""    var why = j.photos_capped_by === 'bytes'
      ? ' (the rest were too large to send together)'
      : (j.photos_capped_by === 'count' ? ' (only the newest 20 are sent)' : '');
    /* ⚠ 1072: name the model ONLY when it was not the one we asked for. Build
       808 is the reason: a correct chip that is always there tells nobody
       anything and trains people to stop reading it. On the intended path this
       adds nothing at all. */
    var vNote = viaNote(j.diag);""")

h = pl.sub(h,
"""         (nSmall < aiUrls.length
            ? ' — ' + (aiUrls.length - nSmall) + ' sent full size'
            : '') +""",
"""         (nSmall < aiUrls.length
            ? ' — ' + (aiUrls.length - nSmall) + ' sent full size'
            : '') + vNote +""")

h = pl.sub(h,
"""/* 1071: what the MODEL gets — 1600px, quality 85, the same rendition The Walk""",
"""/* 1072: which model wrote this answer, said ONLY when it is not the model the
   route asked for first. `via` and `via_primary` come back on every AI route
   now; comparing them here means this file hardcodes no ladder of its own, so
   a route that changes which model leads needs no change here. */
function viaNote(diag){
  if(!diag || !diag.via || !diag.via_primary) return '';
  if(diag.via === diag.via_primary) return '';
  return ' — read by ' + diag.via + ', not ' + diag.via_primary;
}

/* 1071: what the MODEL gets — 1600px, quality 85, the same rendition The Walk""")

h = pl.sub(h, 'THE SUPPLEMENT DESK · supplement.html · build 1071 (26 Aug 2026)',
              'THE SUPPLEMENT DESK · supplement.html · build 1072 (26 Aug 2026)')
h = pl.sub(h, '>build 1071</span>', '>build 1072</span>')
h = pl.sub(h, 'var SD_BUILD = 1071;', 'var SD_BUILD = 1072;')

# ══ index.html — the report drafter says it too ════════════════════════════
I = 'index.html'; i = pl.load(I); i0 = i

# The in-document drafter is the screen Theo started from. Same rule as the
# Desk: silent on the intended path, explicit when it fell back.
i = pl.sub(i,
"""          tgt.classList.remove('ph');
          tgt.classList.add('fill');
          tgt.setAttribute('data-ai-summary','1');""",
"""          tgt.classList.remove('ph');
          tgt.classList.add('fill');
          tgt.setAttribute('data-ai-summary','1');
          /* 1072: which model wrote it, said ONLY when it was not the one the
             route asked for first. On the intended path this writes nothing —
             build 808's rule, that a correct banner nobody needs is its own
             defect. The field is in the response either way, so the answer
             exists even when the screen stays quiet. */
          if(savedFlash && data.via && data.via_primary && data.via !== data.via_primary)
            savedFlash.textContent = 'drafted by ' + data.via + ', not ' + data.via_primary;""")

i = pl.sub(i, 'v2026-08-26 build 1071', 'v2026-08-26 build 1072') \
    if i.count('v2026-08-26 build 1071') == 1 else i
i = pl.sub(i,
    'v2026-08-26 build 1070 &#8212; The AI that drafts an inspection narrative can now '
    'see the site checklist &#8212; the roof&#8217;s age, pitch, layers, decking and '
    'attic access &#8212; so it writes about the actual roof instead of only the photo '
    'captions, and it can draft before a single photo has been captioned. Only the '
    'property facts go; no name, address or location. And &#8220;Draft narrative&#8221; '
    'is now a button in the editor&#8217;s toolbar, and a row in the More menu on a '
    'phone, instead of a small button buried in section 7 of the document.',
    'v2026-08-26 build 1072 &#8212; Every AI answer now records which model wrote it. '
    'When Google&#8217;s model is busy the app quietly falls back to a smaller one, '
    'which it has always done and never mentioned &#8212; so &#8220;the AI missed '
    'that&#8221; was impossible to answer. The Supplement Desk and the report drafter '
    'now say so, and only when it happens: on the normal path nothing changes on '
    'screen. The Desk also sends the right photographs now &#8212; nearly half of all '
    'jobs were quietly over the size limit, and every finding after a dropped '
    'photograph was pointing at the wrong one.')

i = pl.sub(i, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1072, d:'2026-08-26', t:'Every AI answer records which model wrote it',
  s:'When Google\\u2019s model is busy the app falls back to a smaller one. It has always done that and never once mentioned it \\u2014 measured historically at about one call in four \\u2014 so \\u201cwhy did the AI miss that\\u201d could not be answered. Every AI route now returns the model that actually answered and the one it asked for first, and the Supplement Desk and the inspection-report drafter say so \\u2014 but only when they differ. On the normal path nothing changes on screen.' },
  { b:1071, d:'2026-08-26', t:'The Supplement Desk sends every photograph, and the right one',
  s:'Two problems, both measured on the real database. The Desk was sending full-size originals to the AI against a fixed size budget, and 46% of jobs were over it \\u2014 so nearly half of every analysis was quietly running on only some of the job\\u2019s photographs. It now sends the same resized copy the roof walk has always used, which fits far more in. Second, and worse: when a photograph was dropped, every finding after it pointed at the wrong photograph. On a typical job that was 2 findings in 6. Both fixed, and the Desk now says which limit it actually hit instead of always blaming the count.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
# every route now carries BOTH fields on its success path
for name, txt, orig in (('summarize', s, s0), ('caption', c, c0), ('analyze', a, a0),
                        ('supplement', p, p0), ('detect', d, d0)):
    assert 'via_primary' in txt, name + ' has no via_primary'
    assert 'via_primary' not in orig, name + ' already had one — re-check'
    assert txt.count('module.exports') == 0, name

# ⚠ counted, not guessed — four assertion faults in 1071 came from guessing
assert s.count('via_primary') == 1 and s.count("via = 'gemini-3.5-flash'") == 1
assert c.count('via_primary') == 2          # the gemini path + the openai path
assert a.count('via_primary') == 3          # one success + two openai paths
assert p.count('via_primary') == 2          # the two diag blocks
assert d.count('via_primary') == 1
# supplement.js must no longer report a bare vendor name
assert p.count("via = r._via === 'openai' ? 'openai' : 'gemini';") == 0
assert p.count("? 'gpt-4o-mini' : model") == 1
# NOTHING may change which model runs — that is the bake-off's call, not this build's
assert p.count("GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash']") == \
       p0.count("GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash']") == 1
assert d.count("GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash']") == 1
assert a.count("const MODEL = 'gemini-3.5-flash'") == 1
assert c.count("askGemini('gemini-3.5-flash')") == c0.count("askGemini('gemini-3.5-flash')")
assert s.count('models/gemini-3.5-flash') == s0.count('models/gemini-3.5-flash')

assert h.count('function viaNote(') == 1
assert h.count('viaNote(j.diag)') == 1
assert h.count('build 1071') == 0 and h.count('SD_BUILD = 1072') == 1
# the note must be CONDITIONAL — an always-on chip is the 808 defect
assert h.count("if(diag.via === diag.via_primary) return '';") == 1

# index.html: the stamp AND its sentence (BUG_CLASSES 66 — bumping the number
# is not bumping the stamp), plus the two changelog entries
assert i.count('v2026-08-26 build 1072') == 1
assert i.count('v2026-08-26 build 1070') == 0
assert i.count('b:1072') == 1 and i.count('b:1071') == 1
assert i.count('can now see the site checklist') == 0, 'the stamp SENTENCE must move too'
assert i.count("savedFlash.textContent = 'drafted by '") == 1
assert i.count('data.via !== data.via_primary') == 1

for path, txt in ((S, s), (C, c), (A, a), (P, p), (D, d), (H, h), (I, i)):
    pl.write_atomic(path, txt)
pl.assert_in(H, 'function viaNote(')
pl.assert_in(S, "via_primary: 'gemini-3.5-flash'")
print('build 1072 written')
for name, path, o, n in (('summarize.js', S, s0, s), ('caption.js', C, c0, c),
                         ('analyze.js', A, a0, a), ('supplement.js', P, p0, p),
                         ('detect.js', D, d0, d), ('supplement.html', H, h0, h),
                         ('index.html', I, i0, i)):
    print(f'  {name:18} {len(o):>7,} -> {len(n):>7,}  (+{len(n)-len(o)})')
