"""Build 1445: punch-out photos go up several at a time, and they arrive.
The surgery is patch_1445_photos.py (run it first). This file stamps the build and adds the What's New entry."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
s = one(s, ">v2026-11-02 build 1444<", ">v2026-11-12 build 1445<")
s = one(s, """  { b: 1444, d:'2026-11-02',""",
"""  { b: 1445, d:'2026-11-12', t:'Punch-out photos: take several at once, and they stick', s:'On a phone, a punch-out photo went one at a time, and often never showed up on the punch-out at all. Tapping a photo box, or Take photos, now opens the app\\u2019s own camera, the same one the job photo album uses: take as many as you need, then tap Upload once. Add photos from phone picks several from your library at once. The card says Uploading while it works, and a photo with no signal is still held on the phone until you are back in range. The five-photo rule to finish a punch-out is unchanged.' },
  { b: 1444, d:'2026-11-02',""")
pl.write_atomic(P, s)
print('ok 1445')
