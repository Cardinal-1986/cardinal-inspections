"""Build 1433 — the appointment sheet reads, and the Ask button stops covering form buttons (30 Oct 2026).

Found while rendering the taste-call previews, and fixed whatever Theo picks for T3 (no choice in it):
  - the appointment row's "who / notes" line (.apptrow .bd small) was #8a8a8a on the white Forms 1 sheet:
    3.45:1, under the 4.5:1 floor. Its delete x (.apptrow .del) was #b3a49d: 2.41:1, and a 15px glyph with no
    tap area. Both take #5f6670, the app's own grey for text on white (5.80:1); the x gets a 44px hit area.
  - on a 390px phone the floating Ask button sat on the appointment sheet's Add button and over the New Lead
    and Add project forms. aiBusyScreen() (1397's "screens with their own bottom actions") now includes the
    three form sheets, so Ask tucks away while one is open, exactly as it does for the editor.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ".apptrow .bd small{display:block;color:#8a8a8a;}",
           ".apptrow .bd small{display:block;color:#5f6670;}   /* 1433: #8a8a8a was 3.45:1 on the white sheet; 5.80:1 */")
s = one(s, ".apptrow .del{border:0;background:none;color:#b3a49d;font-size:15px;cursor:pointer;}",
           ".apptrow .del{border:0;background:none;color:#5f6670;font-size:15px;cursor:pointer;min-width:44px;min-height:44px;}   /* 1433: #b3a49d was 2.41:1; a 44px tap area */")
s = one(s, "shown('commsView') || shown('qiStartView') || shown('resourceLibraryView');   /* H (#13): + the contract viewer */",
           "shown('commsView') || shown('qiStartView') || shown('resourceLibraryView') ||   /* H (#13): + the contract viewer */\n"
           "      shown('apptModal') || shown('leadFormModal') || shown('projModal');   /* 1433: the form sheets' own Add / Create / Save sat under it */")
s = one(s, ">v2026-10-30 build 1432<", ">v2026-10-30 build 1433<")
s = one(s, """  { b: 1432, d:'2026-10-30',""",
"""  { b: 1433, d:'2026-10-30', t:'The appointment sheet reads, and Ask stops covering form buttons', s:'On the appointment sheet, the grey line under each appointment (who booked it, the notes) and its delete \\u2715 are dark enough to read, and the \\u2715 is easier to tap. On a phone, the floating Ask button no longer sits on the appointment sheet\\u2019s Add button or over the New Lead and Add project forms; it steps aside while one of them is open.' },
  { b: 1432, d:'2026-10-30',""")
pl.write_atomic(P, s)
print('ok 1433')
