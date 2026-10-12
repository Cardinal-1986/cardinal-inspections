"""Build 1326 — two screenshots from Theo, 12 Oct 2026.

1. NEW LEAD, STREET: "1632 e 5th" offered only "1632 East 5th Street, Fayetteville, Arkansas".
   The field used Photon (OpenStreetMap), which measured has NO record of the Dayton address at
   all — with or without a Dayton location hint it returns the Arkansas one only. A hint cannot fix
   missing data. The app already runs Google Places for every other address box, and since 1154
   crAddrApply() splits a pick into the form's own City / State / Zip when it can see them. 1154
   took ldStreet OFF Google because the scope was the <label> — no City box in sight, so the whole
   formatted address landed in Street. The fix is the scope, not the field:
     - ldStreet joins Google (data-cr-gmap="address"), its box carries data-addr-scope
     - Google suggestions now lean toward Dayton (locationBias, 50 km circle — a lean, not a fence)
     - Photon stays as the FALLBACK: it steps aside once Google is live on the field
2. NEW LEAD, LOCATION HEADING: the red rule ran through "Needed once you set a Job Category" — the
   float wrapped to a second line on a phone and the heading's border did not contain it.
   .ldhead is now a block formatting context (display:flow-root).
3. COMMUNICATIONS: the @name chips were light ink on the cream chat box, 1.14:1. The chat box is
   cream (white on insurance) in every CRM and both themes, so the chips inside it take the box's
   dark ink: #5c4a42 (7.83:1), border #8a7c76 (3.77:1).
Usage: python3 patch_1326.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

# 1 — the street box joins Google, inside a scope that can see City / State / Zip
one("""      <div class="ldbox">
        <div class="ldhead">Location Information <span class="ldreq">Needed once you set a Job Category</span></div>""",
"""      <div class="ldbox" data-addr-scope="1">
        <div class="ldhead">Location Information <span class="ldreq">Needed once you set a Job Category</span></div>""")
one("""<input type="text" id="ldStreet" autocomplete="off" data-cr-gmap="skip" placeholder""",
    """<input type="text" id="ldStreet" autocomplete="off" data-cr-gmap="address" placeholder""")
one("""if(/^(qiAddrInp|qiNpAddr)$/.test(el.id || '')) return true;""",
"""/* 1326: ldStreet is BACK. 1154's failure was the scope (the <label>, with no City box in it),
   not the field: its .ldbox now carries data-addr-scope, so a pick splits into ldCity / ldState /
   ldZip. Photon (OpenStreetMap) had no record of plain Dayton addresses at all. */
if(/^(qiAddrInp|qiNpAddr)$/.test(el.id || '')) return true;""")
# mark a field Google is live on, so the Photon fallback steps aside
one("""function attachSuggestions(input, P){
input.setAttribute('autocomplete', 'off');""", """function attachSuggestions(input, P){
input.dataset.crGmapLive = '1';   /* 1326: the lead form's Photon fallback reads this */
input.setAttribute('autocomplete', 'off');""")
one("""function attachLegacyAutocomplete(input){
var ac = new google.maps.places.Autocomplete(input, {""", """function attachLegacyAutocomplete(input){
input.dataset.crGmapLive = '1';   /* 1326 */
var ac = new google.maps.places.Autocomplete(input, {""")
# lean toward the Dayton market — a bias, never a restriction
one("""input: q, includedRegionCodes: ['us'], sessionToken: acToken""",
    """input: q, includedRegionCodes: ['us'], sessionToken: acToken,
/* 1326: lean toward the Dayton market (50 km is the API's largest bias circle). A lean, not a
   fence — an out-of-area address still comes back. */
locationBias: { center: { lat: 39.7589, lng: -84.1916 }, radius: 50000 }""")
# Photon is the fallback only
one("""document.getElementById('ldStreet').addEventListener('input', function(){
  var q = this.value.trim();
  var box = document.getElementById('ldSugg');
  clearTimeout(ldSuggTimer);
  if(q.length < 5){ box.style.display = 'none'; return; }
  ldSuggTimer = setTimeout(async function(){
    try{""", """document.getElementById('ldStreet').addEventListener('input', function(){
  var q = this.value.trim(), inp = this;
  var box = document.getElementById('ldSugg');
  clearTimeout(ldSuggTimer);
  /* 1326: Photon is the FALLBACK now. Once Google is live on this field it owns the list. */
  if(inp.dataset.crGmapLive === '1'){ box.style.display = 'none'; return; }
  if(q.length < 5){ box.style.display = 'none'; return; }
  ldSuggTimer = setTimeout(async function(){
    if(inp.dataset.crGmapLive === '1'){ box.style.display = 'none'; return; }
    try{""")

# 2 — the heading contains its own wrapped hint
one(""".ldhead{font:800 15px 'Segoe UI',Arial,sans-serif;color:var(--red-dk);border-bottom:2px solid var(--red);
  padding-bottom:4px;margin-bottom:8px;}""", """.ldhead{font:800 15px 'Segoe UI',Arial,sans-serif;color:var(--red-dk);border-bottom:2px solid var(--red);
  padding-bottom:4px;margin-bottom:8px;display:flow-root;}   /* 1326: the floated hint wraps on a phone; the rule now runs under it, not through it */""")

# 3 — the chips take the chat box's dark ink
one(""".chatbox{border:1px solid var(--line);border-radius:12px;background:#faf7f5;padding:12px;max-width:680px;}""",
""".chatbox{border:1px solid var(--line);border-radius:12px;background:#faf7f5;padding:12px;max-width:680px;}
/* 1326: the @name chips sit on the chat box's cream (white on insurance) in every CRM and both
   themes, so they take its dark ink. The dark theme's .chipbtn ink (cr-darkleak-fix) is for dark
   grounds and measured 1.14:1 here. #5c4a42 7.83:1, border #8a7c76 3.77:1. */
#commsView #chatTagRow .chipbtn{--cr-stack:"1326 chips on the cream chat box need its dark ink in both themes";
  color:#5c4a42;border-color:#8a7c76;background:transparent;}
#commsView #chatTagRow .chipbtn:hover{color:#9c1822;border-color:#C8202E;}""")

# stamp + changelog
one(""">v2026-10-12 build 1325<button""", """>v2026-10-12 build 1326<button""")
CL = "{ b: 1325, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1326, d:'2026-10-12', t:'Addresses find Dayton, and the tag buttons are readable', s:'On a new lead, the Street box now searches with Google, leaning toward the Dayton area, and fills City, State and Zip for you. The old search had no record of many local addresses and offered one in Arkansas instead. The line under Location Information no longer runs through its note on a phone. On the Communications page, the @name buttons are dark on the light chat box instead of nearly invisible.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1326 applied')
