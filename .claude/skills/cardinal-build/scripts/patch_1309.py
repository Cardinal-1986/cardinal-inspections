"""Build 1309 — Community clean-up, part 1 (Theo: "All" from the A–E retire list).

A  dead code: shortOrg() (one line in the file, its own definition), the old job-page
   tab handler (`[data-t]`, emitted nowhere in cr-cc-script since 1264), the
   `#cr-cc .tabbar` rules (no .tabbar under #cr-cc), and dupedHere()'s Community
   branch, which looked for a hub tab strip retired at 1179 and so always said no.
B  More tools -> Properties and Work Orders: dead ends. Properties opened with no
   partner id and only said "open a partner first"; Work Orders only said "open a
   client" — work orders live on the job page (cr-wo). Buttons and their dispatch
   branches go; CardinalCommunityProperties itself stays (partners use it).
C  More tools -> Calendar and All Partners: repeats of the Next 30 Days card (1304)
   and the Partners door. Buttons go; the 'calendar' and 'partners' dispatch stays,
   because the card and the partner rows still use it.
More tools keeps Activity, the Community home's only door to the team feed.

Usage: python3 patch_1309.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# A1 shortOrg
A = """/* Partner name trimmed to fit the 4-up facts strip. Full name goes in title. */
function shortOrg(n){
n = String(n || '').trim();
if(!n) return '\\u2014';
if(n.length <= 13) return n;
var w = n.split(/\\s+/);
var two = w[1] ? (w[0] + ' ' + w[1]) : w[0];
return (w[0].length <= 6 && two.length <= 14) ? two : w[0];
}
"""
assert src.count(A) == 1, 'shortOrg block'
src = src.replace(A, "")
# A2 the old tab handler
A = """function wire(mount, pr){
mount.querySelectorAll('[data-t]').forEach(function(b){
b.onclick = function(){ tab = b.dataset.t; render(); };
});
/* 1264 */"""
B = """function wire(mount, pr){
/* 1309: the old page's [data-t] tab handler went here; nothing has emitted data-t since 1264. */
/* 1264 */"""
src = pl.sub(src, A, B)
# A3 .tabbar rules under #cr-cc
A = "#cr-cc .tabbar{display:flex;border-bottom:1px solid var(--line);margin-bottom:14px}#cr-cc .tabbar button{flex:1;position:relative;background:transparent;border:0;cursor:pointer;padding:11px 8px 12px;font-family:inherit;color:var(--dim);font-weight:700;font-size:13px}#cr-cc .tabbar button.on{color:var(--ink)}#cr-cc .tabbar button.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,var(--a1),var(--a2))}"
src = pl.sub(src, A, "")
A = "  #cr-cc .cts{grid-template-columns:1fr 1fr;gap:12px}\n  #cr-cc .tabbar button{font-size:15px}\n}"
B = "  #cr-cc .cts{grid-template-columns:1fr 1fr;gap:12px}\n}"
src = pl.sub(src, A, B)
# A4 dupedHere's always-false Community branch
A = """function dupedHere(go){
  if(go === 'partners' || go === 'bids'){
    var tb = document.querySelector('#cr-ch2 .tabbar');
    return !!(tb && tb.getClientRects().length &&
              tb.querySelector('[data-pane="' + go + '"]'));
  }
"""
B = """function dupedHere(go){
  /* 1309: the Community branch is gone. It hid Partners/Estimates while the hub's
     own tab strip repeated them; that strip was retired at 1179, so it always
     answered no and the pills always show — which is still what happens. */
"""
src = pl.sub(src, A, B)
# B + C  More tools
A = """'<div class="tools">' +
'<button data-go="props" type="button"><span class="i">' + ICO('home') + '</span>' +
'<span class="x"><b>Properties</b><small>Units and addresses</small></span></button>' +
'<button data-go="wo" type="button"><span class="i">' + ICO('clipboard') + '</span>' +
'<span class="x"><b>Work Orders</b><small>Open and scheduled</small></span></button>' +
'<button data-go="partners" type="button"><span class="i">' + ICO('people') + '</span>' +
'<span class="x"><b>All Partners</b><small>Contacts and terms</small></span></button>' +
'<button data-go="activity" type="button"><span class="i">' + ICO('bolt') + '</span>' +
'<span class="x"><b>Activity</b><small>Team feed, newest first</small></span></button>' +
'<button data-go="calendar" type="button"><span class="i">' + ICO('calendar') + '</span>' +
'<span class="x"><b>Calendar</b><small>Jobs on the board</small></span></button>' +
'</div></details>' + chSheets();"""
B = """'<div class="tools">' +
/* 1309 (Theo, "All"): Properties and Work Orders were dead ends; Calendar and All
   Partners repeat the Next 30 Days card and the Partners door. Activity is the
   home's only way to the team feed, so it stays. */
'<button data-go="activity" type="button"><span class="i">' + ICO('bolt') + '</span>' +
'<span class="x"><b>Activity</b><small>Team feed, newest first</small></span></button>' +
'</div></details>' + chSheets();"""
src = pl.sub(src, A, B)
A = """/* Properties hang off a partner: openDirectory(partnerId) is the only entry
   point, and with no id it says so itself. Previously this checked
   window.CardinalCommunityProps, which does not exist - the module is
   CardinalCommunityProperties - so the tile fell through to a generic
   "Not available yet." */
if(k === 'props'){
if(window.CardinalCommunityProperties && window.CardinalCommunityProperties.openDirectory){
window.CardinalCommunityProperties.openDirectory();
}else{
crTell('Properties live under each partner \\u2014 open All Partners, then a partner.');
}
return;
}
/* Work orders render as a section on a community job, not as a standalone
   view: CardinalWorkOrders exports only { render, canSee }, and
   renderSection() removes itself unless window.currentProject is an open
   community job. Calling render() from here would silently do nothing. */
if(k === 'wo'){
crTell('Open a community client \\u2014 Work Orders is on the client card (Admin + Production).');
return;
}
"""
assert src.count(A) == 1, 'props/wo branches'
src = src.replace(A, "/* 1309: the 'props' and 'wo' branches went with their two dead-end buttons. */\n")

A = ">v2026-10-11 build 1308<button"; B = ">v2026-10-11 build 1309<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1309, d: '2026-10-11', t: 'Community More tools is down to what is not elsewhere',
    s: 'Properties and Work Orders under More tools only ever told you to go somewhere else, so they are gone \\u2014 work orders are on the job page. Calendar and All Partners are gone too, because the Next 30 Days card and the Partners door already open them. Activity stays. Old code the rebuilt Community screens no longer used has been cleared out; nothing else you see changes.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
