#!/usr/bin/env python3
"""Build 1070 — the AI inspection drafter reads the checklist, and is reachable.

TWO HALVES OF ONE COMPLAINT. Theo, on the report editor: what would actually
make me want to use these AI inspections? The drafter that exists answers that
badly for two independent reasons, and fixing either one alone leaves the
feature exactly as unused.

  1. IT IS BLIND TO EVERYTHING EXCEPT PHOTO CAPTIONS.
     /api/summarize takes `{captions, section}` and nothing else. It has never
     known the roof's age, its pitch, how many layers are on it, what the
     decking is, or whether there was attic access -- the nine facts the rep
     already typed into the checklist before ever opening the editor. So it
     drafts "the shingles show granule loss" when it could draft "a 22-year-old
     three-tab field over a single layer of 1x8 plank decking shows granule
     loss consistent with its age." The facts were sitting one function away.

     Worse: with no captions yet it returned a flat 400. A rep who has done the
     checklist and not yet captioned photos got a refusal, not a draft.

  2. IT IS ONLY REACHABLE FROM INSIDE THE DOCUMENT.
     The one entry point is a small button that wireSummaryDraftButton() injects
     after the summary heading -- section 7 of a long report, well off the bottom
     of a phone screen. Theo's screenshot showed the toolbar; it never showed
     this. 1069 built the More drawer precisely so a control could be one tap
     away and always there. This is what it was built for.

WHAT SHIPS
  - api/summarize.js accepts `checklist` beside `captions`, refuses only when
    BOTH are empty, and names its grounding honestly in the prompt: "the
    property facts below" when that is all it has, "the photo observations and
    the property facts below" when it has both.
  - index.html sends it, from BOTH call sites (the summary drafter and the
    per-section Re-analyze), through ONE builder.
  - A "Draft narrative" button in #edSecondary, so it lands in the More drawer
    on the phone and in the toolbar on desktop -- gated exactly like #sortBtn.

⚠ THE FACT LIST IS BUILT FROM CK_REPORT_MAP, AND THAT IS THE FENCE.
  Not a fourth hand-written copy of the nine field names -- CLAUDE.md's "one
  pipeline per concept", and 1069's own note says there must never be a third
  consumer that reinvents the list. It is also the privacy fence, and the
  cheaper of the two: CK_REPORT_MAP holds exactly nine PROPERTY facts and no
  identity at all -- no client name, no address, no phone, no coordinates. A
  future checklist field cannot start being sent to a third-party model by
  accident, because a field with no entry in that map has no `get`. The server
  whitelists and caps independently, because a browser is not a trust boundary.

⚠ THE BUTTON DELEGATES; IT DOES NOT RE-IMPLEMENT.
  #draftBtn calls the in-document button's own click handler. That handler owns
  the "never clobber a paragraph a person typed" rule, the data-ai-summary
  marker, the disabled/label choreography and the error alert. A second copy of
  that logic in the toolbar is the duplicate-pipeline bug this project has paid
  for repeatedly -- and it is the pattern the 1069 drawer already uses for
  every other row.

⚠ draftGate() GATES ON THE DOCUMENT, NOT ON THE BUTTON, ON PURPOSE.
  wireSummaryDraftButton(doc) runs LATER in frame.onload than the gate call
  site, so a gate that asked "does the button exist yet" would answer no on
  every open and the control would never appear. rccIsReport() keys on
  [data-cardinal-summary-heading] -- which is the exact element
  wireSummaryDraftButton needs to exist -- so gating on the document is not a
  weaker test, it is the same test asked earlier. The button is looked up at
  CLICK time, when it certainly exists.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

# ══ api/summarize.js ═══════════════════════════════════════════════════════
API = 'api/summarize.js'
api = pl.load(API)
api_orig = api

api = pl.sub(api, """  try {
    const { captions, section } = req.body || {};
    const list = Array.isArray(captions) ? captions.filter(Boolean) : [];

    if (list.length === 0) {
      res.status(400).json({
        error: 'No photo captions yet \\u2014 add at least one photo with a caption first, then draft the summary.'
      });
      return;
    }
""".replace('\\u2014', '—'), """  try {
    const { captions, section, checklist } = req.body || {};
    const list = Array.isArray(captions) ? captions.filter(Boolean) : [];

    /* 1070: the nine property facts the rep already recorded on the checklist.
       The browser builds this from CK_REPORT_MAP, which holds property facts
       only — no client name, no address, no coordinates. This function
       re-imposes that independently, because a request body is not a trust
       boundary: at most 12 entries, and both halves length-capped. A caller
       that sends something else gets it truncated, not forwarded. */
    const facts = [];
    if (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) {
      for (const k of Object.keys(checklist).slice(0, 12)) {
        const v = checklist[k];
        if (v == null || v === '') continue;
        facts.push(String(k).slice(0, 40).trim() + ': ' + String(v).slice(0, 200).trim());
      }
    }

    /* Either source alone is enough to draft from. Before 1070 this refused
       whenever captions were empty, which meant a rep who had finished the
       checklist and not yet captioned a photo got a 400 instead of a draft. */
    if (list.length === 0 && facts.length === 0) {
      res.status(400).json({
        error: 'Nothing to draft from yet — fill in the site checklist, or add at least one photo with a caption.'
      });
      return;
    }
""")

api = pl.sub(api, """    const secName = section ? String(section).slice(0, 100) : '';
    const prompt = secName
      ? ('You are a professional roof inspector writing the body narrative for the "' + secName + '" ' +
         'section of an inspection report, based only on the photo observations below. ' +
         'Write 2-4 factual, specific sentences in precise roofing terms describing what was ' +
         'observed in this section. Do not invent details not supported by the observations, ' +
         'do not repeat the section title, and do not make repair-vs-replacement calls here. ' +
         'No preamble, just the sentences.\\n\\n' +
         'Photo observations:\\n' +
         list.map((c, i) => `${i + 1}. ${c}`).join('\\n'))
      : ('You are a professional roof inspector drafting the "Overall Condition Assessment" ' +
         'paragraph of an inspection report, based only on the photo observations below. ' +
         'Write one factual, specific paragraph (4-6 sentences) covering: general wear, ' +
         'granule loss (if relevant), fastener condition, brittleness, remaining serviceable ' +
         'life, and whether repair or full replacement is recommended. Do not invent details ' +
         'not supported by the observations. No preamble, just the paragraph.\\n\\n' +
         'Photo observations:\\n' +
         list.map((c, i) => `${i + 1}. ${c}`).join('\\n'));
""", """    const secName = section ? String(section).slice(0, 100) : '';

    /* 1070: name the grounding honestly. A prompt that says "based only on the
       photo observations below" when there are none, and then supplies a fact
       table instead, is inviting the model to fill the gap by invention —
       which is the one thing a report narrative must never do. */
    const sources = list.length && facts.length
      ? 'the photo observations and the property facts below'
      : (list.length ? 'the photo observations below' : 'the property facts below');
    const evidence =
      (facts.length ? 'Property facts recorded on site:\\n' + facts.map(f => '- ' + f).join('\\n') + '\\n\\n' : '') +
      (list.length ? 'Photo observations:\\n' + list.map((c, i) => `${i + 1}. ${c}`).join('\\n') : '');

    const prompt = secName
      ? ('You are a professional roof inspector writing the body narrative for the "' + secName + '" ' +
         'section of an inspection report, based only on ' + sources + '. ' +
         'Write 2-4 factual, specific sentences in precise roofing terms describing what was ' +
         'observed in this section. Use the property facts for context where they are relevant to ' +
         'this section and leave them out where they are not. ' +
         'Do not invent details not supported by what you were given, ' +
         'do not repeat the section title, and do not make repair-vs-replacement calls here. ' +
         'No preamble, just the sentences.\\n\\n' + evidence)
      : ('You are a professional roof inspector drafting the "Overall Condition Assessment" ' +
         'paragraph of an inspection report, based only on ' + sources + '. ' +
         'Write one factual, specific paragraph (4-6 sentences) covering: general wear, ' +
         'granule loss (if relevant), fastener condition, brittleness, remaining serviceable ' +
         'life, and whether repair or full replacement is recommended. Ground the wear and the ' +
         'remaining-life estimate in the recorded age, layer count, pitch and decking where those ' +
         'are given. Do not invent details not supported by what you were given. ' +
         'No preamble, just the paragraph.\\n\\n' + evidence);
""")

# ══ index.html ═════════════════════════════════════════════════════════════
SRC = 'index.html'
src = pl.load(SRC)
orig = src

# 1 — the fact builder, immediately after resyncChecklist, beside its own map.
src = pl.sub(src, """/* checklist values -> inspection report Property Facts */
function prefillChecklist(tpl, cl){""", """/* 1070: the same nine facts, as a plain label -> value object for
   /api/summarize. Built from CK_REPORT_MAP so there is never a fourth copy of
   the field list \\u2014 the label IS the placeholder with its brackets stripped,
   which is what the report prints beside the value in Property Facts, so the
   model is handed the report's own vocabulary.

   ⚠ THIS IS ALSO THE PRIVACY FENCE, and it is the cheap one. CK_REPORT_MAP
   holds nine PROPERTY facts and no identity: no client name, no address, no
   phone number, no coordinates. A checklist field with no entry in that map has
   no get() and therefore cannot reach a third-party model by accident. Do not
   "complete" this by spreading the checklist object. */
function ckFactsFor(cl){
  var out = {};
  if(!cl) return out;
  Object.keys(CK_REPORT_MAP).forEach(function(k){
    var f = CK_REPORT_MAP[k], v = '';
    try{ v = f.get(cl) || ''; }catch(_e){ v = ''; }
    if(!v) return;
    out[f.ph.replace(/^\\[|\\]$/g, '')] = String(v);
  });
  return out;
}
/* The open project's facts, or {} \\u2014 never throws, so a call site can pass
   it inline without a guard of its own. */
function ckFactsNow(){
  try{
    if(typeof getChecklist !== 'function' || !window.currentProject) return {};
    return ckFactsFor(getChecklist(window.currentProject));
  }catch(_e){ return {}; }
}

/* checklist values -> inspection report Property Facts */
function prefillChecklist(tpl, cl){""")

# 2 — both call sites send the facts. Same builder, so they cannot drift.
src = pl.sub(src,
    "            body: JSON.stringify({ captions: caps, section: hc2.textContent.trim() })",
    "            body: JSON.stringify({ captions: caps, section: hc2.textContent.trim(),\n"
    "                                   checklist: ckFactsNow() })")

src = pl.sub(src,
    "        body: JSON.stringify({ captions: captions })",
    "        body: JSON.stringify({ captions: captions, checklist: ckFactsNow() })")

# 3 — the in-document button gets an id, so the toolbar can delegate to it.
#     Safe against serializeFrame(): it removes this element WHOLESALE by
#     position (summaryHeading.nextElementSibling), so no attribute of it ever
#     reaches the database, the client email or the share link.
src = pl.sub(src, """  var btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'no-print';
  btn.textContent = '\\u2728 Draft with AI';""", """  var btn = doc.createElement('button');
  btn.type = 'button';
  btn.id = 'aiDraftBtn';          /* 1070: the toolbar's Draft narrative delegates here */
  btn.className = 'no-print';
  btn.textContent = '\\u2728 Draft with AI';""")

# 4 — the toolbar button. Inside #edSecondary, so it folds into the 1069
#     drawer on a phone and stays in the toolbar on desktop. display:none by
#     default and shown by its gate, exactly like #sigBtn / #rccBtn / #sortBtn
#     — which is also what keeps it out of the drawer when it does not apply.
src = pl.sub(src,
    '<button class="btn dark" id="sortBtn" style="display:none;" data-cri="funnel"><span class="bl">Sort photos</span></button></span>',
    '<button class="btn dark" id="sortBtn" style="display:none;" data-cri="funnel"><span class="bl">Sort photos</span></button>'
    '<button class="btn dark" id="draftBtn" style="display:none;" data-cri="sparkle"><span class="bl">Draft narrative</span></button></span>')

# 5 — the gate and the delegation, beside the function they belong to.
src = pl.sub(src, """function wireCoverPhoto(doc){""", """/* 1070: put the drafter in the toolbar, where 1069's More drawer will pick it
   up on a phone. Shown only for an inspection report \\u2014 the same editor opens
   estimates, contracts and invoices, whose sections mean something else and
   which carry no summary heading at all. Same predicate as sortGate().

   ⚠ GATES ON THE DOCUMENT, NOT ON THE BUTTON. wireSummaryDraftButton(doc) runs
   later in frame.onload than this gate's call site, so "has the button been
   created yet" would answer no on every open. rccIsReport() asks about
   [data-cardinal-summary-heading], which is the very element that button needs
   \\u2014 the same question, asked earlier. */
window.draftGate = function(){
  var b = document.getElementById('draftBtn');
  if(!b) return;
  b.style.display = (typeof rccIsReport === 'function' && rccIsReport(rccDoc())) ? '' : 'none';
};
(function(){
  var b = document.getElementById('draftBtn');
  if(!b) return;
  b.addEventListener('click', function(){
    /* DELEGATE, never re-implement. The in-document button owns the rule that
       a paragraph a person typed is never clobbered, the data-ai-summary
       marker, the label choreography and the error alert. A second copy here
       is the duplicate-pipeline bug this project keeps paying for. */
    var doc = rccDoc();
    var inDoc = doc && doc.getElementById('aiDraftBtn');
    if(!inDoc){ alert('Open an inspection report first \\u2014 the drafter writes the Overall Condition Assessment.'); return; }
    inDoc.scrollIntoView({ block: 'center' });
    inDoc.click();
  });
})();

function wireCoverPhoto(doc){""")

# 6 — call it where sortGate is called, from the same post-load wiring.
src = pl.sub(src,
    "      if(typeof window.sortGate === 'function') window.sortGate();",
    "      if(typeof window.sortGate === 'function') window.sortGate();\n"
    "      if(typeof window.draftGate === 'function') window.draftGate();")

# 7 — the app stamp, AND the sentence after it.
#
# ⚠ THE SUMMARY HAD GONE STALE, AND I SHIPPED IT TWICE. The app stamp is the
#   only version string in rendered markup, and CLAUDE.md is explicit that it
#   is "the only one followed by &#8212; plus a plain-English summary of the
#   build". That summary still described a photo-editor ink fix — 1068 (an ink
#   pass) and 1069 (the drawer and the re-sync) each bumped the NUMBER and left
#   the SENTENCE, so the one build description a person actually reads has been
#   wrong for three builds. Bumping the number is not bumping the stamp.
STAMP_OLD = ('v2026-08-26 build 1069 &#8212; The photo editor&#8217;s tool bar was painting its '
             'labels in a grey too dark to read against the black bar behind them &#8212; the '
             'rotate buttons, the size hint and the loading line. Same colour, lifted until it '
             'reads in daylight.')
STAMP_NEW = ('v2026-08-26 build 1070 &#8212; The AI that drafts an inspection narrative can now '
             'see the site checklist &#8212; the roof&#8217;s age, pitch, layers, decking and '
             'attic access &#8212; so it writes about the actual roof instead of only the photo '
             'captions, and it can draft before a single photo has been captioned. Only the '
             'property facts go; no name, address or location. And &#8220;Draft narrative&#8221; '
             'is now a button in the editor&#8217;s toolbar, and a row in the More menu on a '
             'phone, instead of a small button buried in section 7 of the document.')
src = pl.sub(src, STAMP_OLD, STAMP_NEW)

# 8 — the CHANGELOG
src = pl.sub(src, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1070, d:'2026-08-26', t:'The AI inspection drafter reads the checklist \\u2014 and is one tap away',
  s:'The AI that drafts an inspection narrative could only ever see the photo captions. It never knew the roof\\u2019s age, its pitch, how many layers were on it, what the decking was, or whether there was attic access \\u2014 the nine things already typed into the site checklist. It now gets all nine, so it writes \\u201ca 22-year-old three-tab field over a single layer of plank decking\\u201d instead of just \\u201cthe shingles\\u201d, and it can draft from the checklist alone before a single photo has been captioned (it used to refuse outright). Only the property facts go \\u2014 no name, no address, no location. And the drafter is now reachable: a Draft narrative button sits in the toolbar, which means it is in the More menu on a phone, instead of only as a small button buried in section 7 of the document.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-26 build 1070') == 1
assert src.count('v2026-08-26 build 1069') == 0
# the SENTENCE moved too, not only the number
assert src.count('The photo editor&#8217;s tool bar was painting') == 0
assert src.count('can now see the site checklist') == 1
assert src.count('b:1070') == 1

# ONE builder, TWO call sites, and nothing else may post to summarize.
assert src.count('function ckFactsFor(') == 1
assert src.count('function ckFactsNow(') == 1
assert src.count('ckFactsNow()') == 3, src.count('ckFactsNow()')   # 1 def + 2 call sites
assert src.count("fetch('/api/summarize'") == 2
assert src.count('checklist: ckFactsNow()') == 2

# the fact list is CK_REPORT_MAP's, not a new one
assert src.count('var CK_REPORT_MAP') == 1
assert src.count('CK_FIELDS') == orig.count('CK_FIELDS'), 'the checklist\'s own field list must be untouched'

# the toolbar control, and the delegation
assert src.count('id="draftBtn"') == 1
assert src.count("id = 'aiDraftBtn'") == 1
assert src.count("getElementById('aiDraftBtn')") == 1
# wired EXACTLY like its neighbour: one definition + the typeof-guarded call,
# which names it twice. Parallel to sortGate rather than a magic number --
# I wrote 2 here first, having forgotten the guard mentions it too.
assert src.count('window.sortGate') == orig.count('window.sortGate'), 'sortGate untouched'
assert src.count('window.draftGate') == src.count('window.sortGate'), \
    f"draftGate {src.count('window.draftGate')} vs sortGate {src.count('window.sortGate')}"

# it must NOT re-implement the drafter: no second summarize handler, no second
# marker write, no scroll-lock writer (the no-14th-writer rule)
# ⚠ NOT a bare count of "data-ai-summary" — this patch's own comment quotes
#   the marker's name, so the bare count goes 3 -> 4 and FAILS correct code.
#   That is this project's comment-pollution trap, in the direction that
#   flatters nobody. Anchor on the WRITE, which is the actual invariant:
#   exactly one place in the file sets the marker, before and after.
assert src.count("setAttribute('data-ai-summary'") == 1
assert orig.count("setAttribute('data-ai-summary'") == 1
assert src.count('body.style.overflow') == orig.count('body.style.overflow')

# api/summarize.js
assert api.count('const { captions, section, checklist }') == 1
assert api.count('facts.length') >= 3
assert api.count('.slice(0, 12)') == 1
assert api.count('String(v).slice(0, 200)') == 1
assert api.count('module.exports') == 0            # api/package.json is "type":"module"
assert 'Property facts recorded on site' in api
assert api.count("res.status(400)") == 1

pl.write_atomic(API, api)
pl.write_atomic(SRC, src)
pl.assert_in(API, 'const { captions, section, checklist }')
pl.assert_in(SRC, 'checklist: ckFactsNow()')
print('build 1070 written')
print(f'  index.html       {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
print(f'  api/summarize.js {len(api_orig):,} -> {len(api):,} chars (+{len(api)-len(api_orig)})')
