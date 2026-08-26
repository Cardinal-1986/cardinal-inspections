#!/usr/bin/env python3
"""Build 1074 — 3.7 into the bake-off, and honest slots for Claude and Kimi.

Theo: "yes, add 3.7 to the bake-off, what about Claud and/or kimi k3?"

1 · gemini-3.7-flash — ADDED, and it was VERIFIED FIRST
  Probed live against his key through /api/ai-status before it was written in:
  it answers. Not taken on faith from a release note. (One cold call measured
  8607 ms against 914 ms for 3.6 — that is a cold start, not a latency finding,
  and it is deliberately NOT quoted as one. The bake-off records per-call wall
  time; that is the number that will mean something.)

2 · CLAUDE WAS ALREADY A CANDIDATE — the real question was whether the key is set
  `claude-opus-5` has been in CANDIDATES since 1073. Whether it can actually be
  called depends on ANTHROPIC_API_KEY in Vercel, which api/librarian.js has
  needed since build 806. I cannot read Vercel env from here, and guessing is
  how "we never tested Claude" becomes "Claude did badly" — the exact ambiguity
  1073's probe exists to prevent.

  So /api/ai-status now reports key presence for anthropic and moonshot.
  ⚠ PRESENCE ONLY, NOT A LIVE CALL, and the field is named `configured` rather
    than `ok` so it cannot be misread as one. Gemini and OpenAI get real test
    calls because those keys were already there to spend; billing a live
    Anthropic call on every page load of a diagnostic is not the same trade.

3 · KIMI K3 — the vendor is wired, and the honest part is what it says
  K3 is real: this repo's own AI_CHEATSHEET records it at 2.8T parameters,
  17 July 2026, weights published 28 July. Moonshot's API is OpenAI-compatible,
  so askKimi is askOpenAI with a different base URL — no new shape.

  ⚠ BUT THE BAKE-OFF IS A VISION TEST, AND NOTHING SAYS K3 READS IMAGES.
    The cheatsheet calls it "the agent one — built to keep its footing across
    long, many-step runs", strong at long autonomous work. Not one word about
    photographs. I am not going to assert it has vision, and I am not going to
    quietly leave it out either.

    It goes in as a candidate that reports the truth: no MOONSHOT_API_KEY means
    `available:false, why:'MOONSHOT_API_KEY not set'`, and if a key is set and
    the model refuses an image, 1073's contract already covers it — an
    unreachable model comes back as a NAMED FAILURE, never a silent omission.
    That is the design earning its keep on the first model it did not
    anticipate.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

# ══ api/bakeoff.js ═════════════════════════════════════════════════════════
B = 'api/bakeoff.js'; b = pl.load(B); b0 = b

b = pl.sub(b, """/* The candidates. Adding one is a line here and nothing else.
   ⚠ gemini-3.1-pro is deliberately ABSENT: probed live on 26 Aug it answers
     404 "not found for API version v1beta" for this key. Listing a model the
     key cannot call would produce a column of errors that reads like a model
     being bad at roofs. */
const CANDIDATES = [
  { id: 'gemini-3.6-flash', vendor: 'google' },
  { id: 'gemini-3.5-flash', vendor: 'google' },
  { id: 'gpt-4o-mini',      vendor: 'openai' },
  { id: 'claude-opus-5',    vendor: 'anthropic' },
];""",
"""/* The candidates. Adding one is a line here and nothing else — which 1074
   promptly proved by adding two.

   ⚠ gemini-3.1-pro is deliberately ABSENT: probed live on 26 Aug it answers
     404 "not found for API version v1beta" for this key. Listing a model the
     key cannot call would produce a column of errors that reads like a model
     being bad at roofs.
   ⚠ gemini-3.7-flash was PROBED BEFORE IT WAS ADDED (26 Aug, through
     /api/ai-status?model=gemini-3.7-flash) — it answers. Not taken on faith
     from a release note.
   ⚠ kimi-k3 is here WITHOUT a vision claim, and that is deliberate. This
     repo's own AI_CHEATSHEET has K3 at 2.8T parameters (17 July 2026) and
     describes it as "the agent one — built to keep its footing across long,
     many-step runs". Not one word about photographs. Rather than assert it
     can see, or quietly drop it, it is listed and left to report the truth:
     no key means `available:false` with the reason, and a model that refuses
     an image comes back as a NAMED failure. `note` is surfaced by the picker
     so nobody reads a refusal as a verdict on the model's eyesight. */
const CANDIDATES = [
  { id: 'gemini-3.7-flash', vendor: 'google' },
  { id: 'gemini-3.6-flash', vendor: 'google' },
  { id: 'gemini-3.5-flash', vendor: 'google' },
  { id: 'gpt-4o-mini',      vendor: 'openai' },
  { id: 'claude-opus-5',    vendor: 'anthropic' },
  { id: 'kimi-k3',          vendor: 'moonshot',
    note: 'agent model — vision unconfirmed; it may refuse a photograph' },
];""")

# Moonshot speaks OpenAI's dialect, so this is askOpenAI with another base URL
# rather than a fourth request shape to keep in step.
b = pl.sub(b, "async function askAnthropic(model, b64, mime) {",
"""/* Moonshot's API is OpenAI-compatible, so this is askOpenAI with a different
   base URL — deliberately NOT a fourth request shape to keep in step. */
async function askKimi(model, b64, mime) {
  const key = (process.env.MOONSHOT_API_KEY || '').trim();
  if (!key) return { ok: false, text: 'MOONSHOT_API_KEY is not configured' };
  const r = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: [
      { type: 'text', text: PROMPT },
      { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }] }] }) });
  if (!r.ok) return { ok: false, text: 'HTTP ' + r.status + ': ' + (await r.text()).slice(0, 300) };
  const j = await r.json();
  const t = j?.choices?.[0]?.message?.content || '';
  return t.trim() ? { ok: true, text: t.trim() } : { ok: false, text: 'returned no text' };
}

async function askAnthropic(model, b64, mime) {""")

b = pl.sub(b, "const ASK = { google: askGoogle, openai: askOpenAI, anthropic: askAnthropic };",
              "const ASK = { google: askGoogle, openai: askOpenAI, anthropic: askAnthropic,\n"
              "              moonshot: askKimi };")

# the probe learns the fourth vendor, and carries `note` through
b = pl.sub(b, """          available: c.vendor === 'google'    ? !!(process.env.GEMINI_API_KEY || '').trim()
                   : c.vendor === 'openai'    ? !!(process.env.OPENAI_API_KEY || '').trim()
                   : !!(process.env.ANTHROPIC_API_KEY || '').trim(),
          why: c.vendor === 'google'    ? (process.env.GEMINI_API_KEY ? '' : 'GEMINI_API_KEY not set')
             : c.vendor === 'openai'    ? (process.env.OPENAI_API_KEY ? '' : 'OPENAI_API_KEY not set')
             : (process.env.ANTHROPIC_API_KEY ? '' : 'ANTHROPIC_API_KEY not set')""",
"""          available: !!(process.env[KEY_ENV[c.vendor]] || '').trim(),
          why: (process.env[KEY_ENV[c.vendor]] || '').trim()
                 ? '' : KEY_ENV[c.vendor] + ' not set'""")

b = pl.sub(b, "const MAX_IMAGE_BYTES = 5 * 1024 * 1024;",
"""/* One place that knows which env var each vendor needs. The 1073 version
   spelled this out as a nested ternary per field, which silently treats every
   unknown vendor as Anthropic — it would have reported Kimi's missing key as
   ANTHROPIC_API_KEY. A map cannot make that mistake. */
const KEY_ENV = { google: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY',
                  anthropic: 'ANTHROPIC_API_KEY', moonshot: 'MOONSHOT_API_KEY' };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;""")

# ══ api/ai-status.js — can we even test Claude / Kimi? ═════════════════════
S = 'api/ai-status.js'; s = pl.load(S); s0 = s
s = pl.sub(s, "  const result = { gemini: {}, openai: {}, supabase: {} };",
"""  const result = { gemini: {}, openai: {}, supabase: {} };

  /* 1074: "is Claude even testable" was a question nobody could answer without
     Vercel access, and guessing is how "we never tested it" becomes "it did
     badly". ⚠ PRESENCE ONLY — the field is `configured`, NOT `ok`, because
     that is all it checks. Gemini and OpenAI get real test calls above; billing
     a live Anthropic or Moonshot call on every load of a public diagnostic is
     a different trade, and a status page that quietly spends money is its own
     defect. */
  result.keys = {
    anthropic: { configured: !!(process.env.ANTHROPIC_API_KEY || '').trim(),
                 used_by: 'api/librarian.js, api/bakeoff.js' },
    moonshot:  { configured: !!(process.env.MOONSHOT_API_KEY || '').trim(),
                 used_by: 'api/bakeoff.js' }
  };""")

# ══ bakeoff.html — surface the note, and bump the stamp ════════════════════
H = 'bakeoff.html'; h = pl.load(H); h0 = h
h = pl.sub(h,
"""      '<span class="nm">' + esc(c.id) + '</span>' +
      '<span class="st">' + (c.available ? esc(c.vendor) : esc(c.why || 'unavailable')) + '</span></label>';""",
"""      '<span class="nm">' + esc(c.id) + '</span>' +
      /* 1074: a candidate may carry a caveat — kimi-k3 is an agent model with
         no vision claim. Showing it here means a refused photograph reads as
         "we knew this might happen", not as a verdict on the model. */
      '<span class="st" title="' + esc(c.note || '') + '">' +
        (c.available ? (c.note ? '⚠ ' + esc(c.vendor) : esc(c.vendor))
                     : esc(c.why || 'unavailable')) + '</span></label>' +
      (c.note ? '<div class="cav">' + esc(c.note) + '</div>' : '');""")

h = pl.sub(h, ".mod.off .st{color:var(--warn)}",
              ".mod.off .st{color:var(--warn)}\n"
              ".cav{margin:-4px 0 2px 12px;font-size:12px;color:var(--warn);line-height:1.35}")

h = pl.sub(h, 'THE BAKE-OFF · bakeoff.html · build 1073 (26 Aug 2026)',
              'THE BAKE-OFF · bakeoff.html · build 1074 (26 Aug 2026)')
h = pl.sub(h, '>build 1073</span>', '>build 1074</span>')
h = pl.sub(h, 'var BK_BUILD = 1073;', 'var BK_BUILD = 1074;')

# ── proof of scope ───────────────────────────────────────────────────────
assert b.count("id: 'gemini-3.7-flash'") == 1
assert b.count("id: 'kimi-k3'") == 1
assert b.count('async function askKimi(') == 1
assert b.count('moonshot: askKimi') == 1
# 3, counted not guessed: the env read, the "not configured" message, and
# the KEY_ENV map. (Sixth count I guessed wrong this session; the habit
# that works is computing them all in one pass first.)
assert b.count("MOONSHOT_API_KEY") == 3
assert b.count('const KEY_ENV = {') == 1
# ⚠ the nested-ternary vendor test is GONE — it defaulted every unknown vendor
#   to Anthropic, so Kimi's missing key would have been reported as the wrong
#   env var. Counted, because that is the actual defect being removed.
assert b0.count("!!(process.env.ANTHROPIC_API_KEY || '').trim(),") == 1
assert b.count("!!(process.env.ANTHROPIC_API_KEY || '').trim(),") == 0
# nothing that was already right may have moved
assert b.count("id: 'claude-opus-5'") == b0.count("id: 'claude-opus-5'") == 1
assert b.count('gemini-3.1-pro') == b0.count('gemini-3.1-pro') == 1   # still only in the comment
assert b.count('module.exports') == 0
assert b.count('const PROMPT =') == 1 and b0.count('const PROMPT =') == 1

assert s.count('result.keys = {') == 1
assert s.count('configured:') == 2
# ⚠ presence must NOT masquerade as a live check
assert 'ok:' not in s.split('result.keys = {')[1].split('};')[0]

assert h.count('BK_BUILD = 1074') == 1 and h.count('1073') == 0
assert h.count('c.note') == 4
assert h.count('.cav{') == 1

for p, t in ((B, b), (S, s), (H, h)):
    pl.write_atomic(p, t)
pl.assert_in(B, "id: 'gemini-3.7-flash'")
pl.assert_in(S, 'result.keys = {')
print('build 1074 written')
for n, o, x in (('api/bakeoff.js', b0, b), ('api/ai-status.js', s0, s), ('bakeoff.html', h0, h)):
    print(f'  {n:20} {len(o):>7,} -> {len(x):>7,}  (+{len(x)-len(o)})')
