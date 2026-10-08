"""patch_1265.py — New inspection report, guided (step 1 of 3). Theo, 8 Oct.
usage: python3 patch_1265.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. one button: "+ New inspection report" opens the guide; the exterior button
#    goes, because the guide picks the template from what was inspected.
src = pl.sub(src, '''        <button class="btn" id="pNewReportBtn">+ New inspection report</button>
        <button class="btn" id="pNewExteriorBtn">+ New exterior report</button>
''', '''        <button class="btn" id="pNewReportBtn">+ New inspection report</button>
''')
src = pl.sub(src, '''document.getElementById('pNewReportBtn').addEventListener('click', function(){
  createReportFrom(REPORT_TEMPLATE, 'Report', true);
});
document.getElementById('pNewExteriorBtn').addEventListener('click', function(){
  createReportFrom(EXTERIOR_TEMPLATE, 'Exterior report', false);
});''', '''/* 1265: the guide (cr-insg-script) asks what was inspected, then holds one
   checklist of only those sections, then calls createReportFrom() with the
   roof or the exterior template. One creator, still. */
document.getElementById('pNewReportBtn').addEventListener('click', function(){
  if(window.CardinalInspGuide && window.CardinalInspGuide.open) window.CardinalInspGuide.open();
  else createReportFrom(REPORT_TEMPLATE, 'Report', true);
});''')

# 2. the report prefill learns the two new answers that have a home in it
src = pl.sub(src, '''  structure:{ ph:'[Structure]', was:'[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]',
    get:function(cl){ return cl.structure; } },''', '''  structure:{ ph:'[Structure]', was:'[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]',
    get:function(cl){ /* 1265: stories ride along when the guide recorded them */
      var st = { '1':'1 story', '1.5':'1\\u00BD stories', '2':'2 stories', '2.5':'2\\u00BD stories', '3':'3 or more stories' }[String(cl.stories || '')];
      return cl.structure ? (cl.structure + (st ? ' \\u00B7 ' + st : '')) : ''; } },''')
src = pl.sub(src, '''    get:function(cl){ return cl.age ? (cl.age + ' years (estimated)') : ''; } },''', '''    get:function(cl){ /* 1265: the worked-out life expectancy follows the age */
      return cl.age ? (cl.age + ' years (estimated)' + (cl.life_left ? ' \\u00B7 ' + cl.life_left : '')) : ''; } },''')

# 3. the old checklist knows the guide's third intake answer
src = pl.sub(src, '''          <option>Clear</option><option>Blocked</option></select></label>''',
                  '''          <option>Clear</option><option>Partly blocked</option><option>Blocked</option></select></label>''')

# 4. the module, after the 1262 upload module
MOD = open(os.path.join(HERE, 'insg_1265.js')).read()
i = src.index('<script id="cr-ctup-script">'); j = src.index('</script>', i) + len('</script>')
src = src[:j] + '\n' + MOD.rstrip('\n') + src[j:]

# 5. stamp + changelog
src = pl.sub(src, '>v2026-10-08 build 1264<', '>v2026-10-08 build 1265<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1265, d: '2026-10-08', t: 'New inspection report: pick what you inspected, then one checklist',
    s: '<b>+ New inspection report</b> on Inspections now asks what you inspected: a quick <b>General inspection</b>, and/or Roof, Siding, Gutters, Fascia, Soffit, Windows and Doors. The next screen is one checklist with only those parts, every question a dropdown. The roof asks method, structure, residential (filled from the job category), stories, roof type, layers, decking type and condition, pitch, age, condition, attic access, current ventilation, intake type and whether it is blocked, ventilation condition, and life expectancy, worked out from roof type, age and condition, or left for the AI. It saves into the same Roofing and General checklists as before, then starts the report. <b>Skip checklist</b> goes straight to the report. Photos and the AI assistant come next.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
