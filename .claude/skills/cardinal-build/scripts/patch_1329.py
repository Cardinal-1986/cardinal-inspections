"""Build 1329 — "+ From Library" said the Library was empty on a phone (Theo, 12 Oct).

The Line Item Library (`estimate_line_items`, read policy TO authenticated) is loaded ONCE,
800ms after the script parses. On a phone the session is usually not restored by then, so that
read runs signed-out and RLS answers an empty list — no error. openPicker() then rendered "The
library is empty", called CardinalLineItems.load() to fix it, and never re-rendered the picker
when the load came back. The picker stayed empty until it was closed and opened again. A
desktop restores its session faster, so it worked there.

Fix: an empty Library on open shows "Loading the Library…", waits for the load, and re-renders
the picker if it is still open on the Library. A Library that is really empty still says so.
Usage: python3 patch_1329.py [index.html]
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

one("""if(window.CardinalLineItems && !window.CardinalLineItems.all().length){
window.CardinalLineItems.load();
}
}""",
"""if(window.CardinalLineItems && !window.CardinalLineItems.all().length){
/* 1329: the boot-time load runs 800ms after parse and, on a phone, before the session is back,
   so RLS answers an empty list. Wait for this reload and redraw the picker with what it finds;
   before, the picker kept saying "empty" until it was closed and opened again. */
if(pickerMode === 'library'){
var _lst = picker.querySelector('.box-list');
if(_lst) _lst.innerHTML = '<div class="empty">Loading the Library\\u2026</div>';
}
Promise.resolve(window.CardinalLineItems.load()).then(function(){
if(picker && picker.classList.contains('open') && pickerMode === 'library') renderPicker();
}, function(){
if(picker && picker.classList.contains('open') && pickerMode === 'library') renderPicker();
});
}
}""")

one(""">v2026-10-12 build 1328<button""", """>v2026-10-12 build 1329<button""")
CL = "{ b: 1328, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1329, d:'2026-10-12', t:'The Library shows up on a phone', s:'In the estimate builder, + From Library could say the Library was empty on a phone the first time you opened it, because it had tried to load before you were fully signed in. It now shows Loading the Library, then lists every item as soon as they arrive.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1329 applied')
