"""Build 1383 — What's New no longer pops up on its own after a build (Theo, 21 Oct: "can you cancel the
banner updates for builds"). Since 684 the What's New box opened for everyone three seconds after load
whenever the build number went up — several times a day on a busy day. It now opens only when someone
taps What's New in the menu. autoShow() still records the build as seen, so tapping it later shows the
latest notes and nothing piles up behind a "new" count."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""if(lastSeen === 0){
setLastSeen(cur);
return;
}
if(cur > lastSeen) show();
})();""",
"""/* 1383 (Theo: "cancel the banner updates for builds"): no pop-up after a build. The build is recorded
   as seen and What's New opens only from the menu. */
if(cur > lastSeen) setLastSeen(cur);
})();""")
one(">v2026-10-21 build 1382<button", ">v2026-10-21 build 1383<button")
one("""  { b: 1382, d:'2026-10-21',""",
"""  { b: 1383, d:'2026-10-21', t:'No more update pop-up', s:'The What\\u2019s New box no longer pops up by itself after the app updates. To see what changed, open the menu and tap What\\u2019s New.' },
  { b: 1382, d:'2026-10-21',""")
pl.write_atomic(path, s)
print('ok 1383')
