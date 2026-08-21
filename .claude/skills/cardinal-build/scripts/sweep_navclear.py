#!/usr/bin/env python3
"""Which full-screen overlays are trapped under the INSTALLED app's bottom nav?

`#pwaNav` is authored at z-index 160 and then raised to 9990 !important under
`body.standalone`. Every `position:fixed; inset:0` overlay with a lower z-index
therefore has its bottom ~63px covered in the installed PWA — invisible in a
browser tab, invisible to jsdom, invisible to anyone not testing on a phone
with the app installed.

Build 961 is the third time this has been met (see the in-file comments at the
`#pwaNav (z-index 9990) cannot trap it` and `Sit ABOVE the installed app's
bottom nav` sites, each of which solved it for one element). It only becomes
FATAL when the overlay's own content cannot scroll — then the covered rows are
not merely awkward, they are unreachable.

    python3 sweep_navclear.py index.html [--fail-under N]

Prints every offender. --fail-under exits non-zero if the count exceeds N,
so a build can hold the line without being blocked by the existing debt.
"""
import re, sys

def sweep(path):
    s = open(path, encoding='utf-8').read()
    nav = 0
    for m in re.finditer(r'#pwaNav\s*\{[^}]{0,200}?z-index:\s*(\d+)\s*!important', s):
        nav = max(nav, int(m.group(1)))
    if not nav:
        m = re.search(r'#pwaNav\s*\{[^}]{0,200}?z-index:\s*(\d+)', s)
        nav = int(m.group(1)) if m else 0

    seen = {}
    for m in re.finditer(r'([#.][A-Za-z0-9_-]+)\s*\{([^}]{0,320}?)\}', s):
        body = m.group(2).replace(' ', '')
        if 'position:fixed' not in body or 'inset:0' not in body:
            continue
        z = re.search(r'z-index:(\d+)', body)
        if not z:
            continue
        sel = m.group(1)
        if sel == '#pwaNav':
            continue
        seen.setdefault(sel, int(z.group(1)))
    under = sorted((z, sel) for sel, z in seen.items() if z < nav)
    return nav, under, seen

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    limit = None
    if '--fail-under' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--fail-under') + 1])
    nav, under, seen = sweep(path)
    print('installed #pwaNav z-index: %d' % nav)
    print('%d full-screen fixed overlay(s) below it — their bottom edge is covered '
          'in the installed app:' % len(under))
    for z, sel in under:
        print('   %-30s z=%d' % (sel, z))
    print()
    print('%d overlay(s) already clear.' % (len(seen) - len(under)))
    if limit is not None and len(under) > limit:
        print('FAIL — %d offender(s), limit %d' % (len(under), limit))
        sys.exit(1)
    print('OK')

if __name__ == '__main__':
    main()
