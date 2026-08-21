#!/usr/bin/env python3
"""Which full-screen overlays are trapped under the INSTALLED app's bottom nav?

`#pwaNav` is authored at z-index 160 and then raised to 9990 !important under
`body.standalone`. Every `position:fixed; inset:0` overlay with a lower z-index
therefore has its bottom ~63px covered in the installed PWA — invisible in a
browser tab, invisible to jsdom, invisible to anyone not testing on a phone
with the app installed.

⚠ Read the second list too. Being under the bar in z-order is NOT by itself the
defect — the defect is CONTENT in the bar's band with no way to move it out.
The app's preferred fix is a fixed 88px `body.standalone` clearance (595, 935,
962), not a z-index, so a sheet can be under the bar and completely fine.

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
    # Every element the app already clears the bar for, by the PREFERRED
    # mechanism: a body.standalone bottom clearance. Collected by name so the
    # reader can subtract them from the z-order list rather than being told a
    # cleared surface is broken.
    cleared = sorted(set(
        m.group(1).strip()
        for m in re.finditer(r'body\.standalone\s+([^{,]{1,60}?)\s*\{([^}]{0,220}?)\}', s)
        if re.search(r'(padding-bottom|margin-bottom|bottom)\s*:\s*calc\(', m.group(2))
    ))
    return nav, under, seen, cleared

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    limit = None
    if '--fail-under' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--fail-under') + 1])
    nav, under, seen, cleared = sweep(path)
    print('installed #pwaNav z-index: %d' % nav)
    print()
    print('⚠ z-order is only ONE of the two mechanisms, and it is NOT the preferred one.')
    print('  Build 935 wrote the rule down: "Clearance, NOT a bigger z-index … one')
    print('  mechanism per concept". A sheet listed below may be perfectly fine because')
    print('  its CONTENT stops short of the bar. Read this list with the second one.')
    print()
    print('%d full-screen fixed overlay(s) sit below the bar in z-order:' % len(under))
    for z, sel in under:
        print('   %-30s z=%d' % (sel, z))
    print()
    print('%d element(s) carry an explicit body.standalone clearance:' % len(cleared))
    for c in cleared:
        print('   %s' % c)
    print()
    print('%d overlay(s) are above the bar in z-order.' % (len(seen) - len(under)))
    if limit is not None and len(under) > limit:
        print('FAIL — %d offender(s), limit %d' % (len(under), limit))
        sys.exit(1)
    print('OK')

if __name__ == '__main__':
    main()
