#!/usr/bin/env python3
"""Build 1251 — two things the sentinel caught on 1249/1250 (mine).

1. INK, light theme: the follow-up compose box's note (3.83:1) and its Cancel
   button (4.25:1) sat under the 4.5 floor on the 14% red wash. Light gets a
   7% wash (#f1e6e8) and the box's grey inks go to #555c66 — 5.54:1, computed.
   Dark is untouched (5.28:1 / 7.03:1 there already).
2. CONTAIN: the hold sheet's shade (.pkhs) declared overscroll-behavior with
   no scrollport — on iOS that can swallow the swipe. The panel, which does
   scroll, keeps it.

usage: python3 patch_1251.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

src = pl.sub(src, '''#cr-pk .pkhs{ position:fixed; inset:0; z-index:9560; display:flex; align-items:flex-end; justify-content:center;
  background:rgba(0,0,0,.6); overscroll-behavior:contain; }''',
'''#cr-pk .pkhs{ position:fixed; inset:0; z-index:9560; display:flex; align-items:flex-end; justify-content:center;
  background:rgba(0,0,0,.6); }''')

src = pl.sub(src, '''#cr-pk .pkping-go.ok{ background:#1b7d49; }''', '''#cr-pk .pkping-go.ok{ background:#1b7d49; }
/* 1251: light twin — the 14% wash left the box's grey inks at 3.83 / 4.25:1 */
:root[data-theme="rb-light"] #cr-pk .pkping{ background:#f1e6e8; }
:root[data-theme="rb-light"] #cr-pk .pkping .pknote,
:root[data-theme="rb-light"] #cr-pk .pkping .pkbtn,
:root[data-theme="rb-light"] #cr-pk .pkping-h .rt{ color:#555c66; }''')

src = pl.sub(src, '>v2026-10-07 build 1250<', '>v2026-10-07 build 1251<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1251, d: '2026-10-07', t: 'Follow-up box easier to read in light mode',
    s: 'In light mode the small print and the Cancel button in the follow-up box were too faint on the pink. They are darker now. The On hold sheet also no longer risks swallowing a swipe on iPhone.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
