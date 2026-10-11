"""Build 1306 — the seven pipeline cards wrap on the iPad (Theo: "You choose" -> 2W).

With the left rail open at 1194px the home's main column is ~449px and the seven
cards need ~616px, so the row scrolled sideways and On Hold, Closed and Invoiced
were off the edge (gate_1114 has been red on it since 1114). Option W, from the
preview: the row wraps onto two rows and the Activity column stays on the right.
Scoped to the rail being open, exactly as previewed; phones keep their own row.

Usage: python3 patch_1306.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
A = ".piperow{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;padding-bottom:4px;justify-content:space-evenly;}\n"
B = A + """/* 1306: with the left rail open the main column is too narrow for seven cards, so
   they wrap onto two rows instead of hiding three off the edge (Theo's 2W). */
body.cr-lnav-on .piperow{--cr-stack:"1306: rail open, the seven cards wrap rather than scroll (Theo 2W)";
  flex-wrap:wrap;row-gap:8px;overflow-x:visible;}
"""
src = pl.sub(src, A, B)
A = ">v2026-10-11 build 1305<button"; B = ">v2026-10-11 build 1306<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1306, d: '2026-10-11', t: 'On the iPad, all seven pipeline cards show',
    s: 'With the side menu open on the iPad, the home pipeline used to scroll sideways and hide Invoiced, Closed and On Hold off the edge. The cards now wrap onto two rows so all seven are on screen, and the Activity column stays where it is.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
