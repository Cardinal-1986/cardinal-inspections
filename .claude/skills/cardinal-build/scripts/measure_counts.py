"""Re-derive every number in CLAUDE.md's measurement table. First run: build 627.

VALIDATED BEFORE IT WAS TRUSTED, and that is the point of committing it: run
against the build-573 tree it reproduces CLAUDE.md's recorded 573 column exactly
(104 inline scripts / 114 style blocks / 87 exports / 641 --rbe-* refs / 81%
bare var()). So when a number moves, the app moved -- not the regex.

    python3 measure_counts.py                       # current index.html
    git show aeac5e5:index.html > /tmp/573.html     # the last build-573 tree
    python3 measure_counts.py /tmp/573.html         # ...and the validation run


CLAUDE.md's own rule: do not quote a measurement without re-measuring, and when
a count could be polluted by prose, count over CODE. So:

  · structural counts (script/style tags, </body>) are markup — a regex is fine
  · the scroll lock goes through jslex_count.py, never a bare regex
  · declaration-site counts are split into SITES vs DISTINCT NAMES, because the
    two differ by ~2x (one declaration per theme) and CLAUDE.md has been
    "corrected" in the wrong direction over exactly that before

Usage: python3 measure_counts.py [index.html]
"""
import re, subprocess, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cardinal-inspections/index.html'
s = open(SRC, encoding='utf8').read()
b = open(SRC, 'rb').read()
R = {}

def row(k, v):
    R[k] = v
    print(f'{k:<44} {v}')

print('── size ' + '─' * 50)
row('bytes on disk (wc -c)', len(b))
row('characters (check_build.py calls these bytes)', len(s))
row('MiB / MB', f'{len(b)/1048576:.2f} MiB / {len(b)/1e6:.2f} MB')

print('\n── structure (markup: a regex is honest here) ' + '─' * 13)
row('inline <script> (no src=)', len(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>', s)))
row('<script> total', len(re.findall(r'<script\b', s)))
row('external CDN <script src=>', len(re.findall(r'<script[^>]*\bsrc="https?://', s)))
row('<style> blocks', len(re.findall(r'<style\b', s)))
row('<style id=>', len(re.findall(r'<style id=', s)))
row('</body>', s.count('</body>'))
row('window.Cardinal* distinct', len(set(re.findall(r'window\.(Cardinal\w+)', s))))

print('\n── the counting traps ' + '─' * 36)
# .observe(document.body ...) — a real count of 50 against which naive comment-
# stripping says 40, because `/*` inside a string is not a comment and stripping
# on that basis deletes ten real calls. Print BOTH, so the doc can keep saying so
# with a current number instead of a remembered one.
obs_all = len(re.findall(r'\.observe\(\s*document\.body', s))
stripped = re.sub(r'/\*[\s\S]*?\*/', '', s)
row('.observe(document.body ...) — real', obs_all)
row('  ... after naive comment-stripping (WRONG)', len(re.findall(r'\.observe\(\s*document\.body', stripped)))

JL = os.path.join(os.path.dirname(os.path.abspath(SRC)),
                  '.claude/skills/cardinal-build/scripts/jslex_count.py')
out = subprocess.run([sys.executable, JL, SRC, 'document.body.style.overflow'],
                     capture_output=True, text=True).stdout
print('  jslex on document.body.style.overflow:')
for ln in out.strip().splitlines():
    print('    ' + ln)
row('  bare regex would say (CODE+prose)', len(re.findall(r'document\.body\.style\.overflow', s)))

print('\n── supabase cardinality ' + '─' * 34)
row('.single()', s.count('.single()'))
row('.maybeSingle()', s.count('.maybeSingle()'))
row('.throwOnError(  [must stay 0]', s.count('.throwOnError('))

print('\n── palettes: SITES vs DISTINCT vs REFS ' + '─' * 19)
for fam in ('ccm', 'rbe', 'lb', 'crw', 'sh', 'cr', 'occ'):
    decls = re.findall(r'--%s-[\w-]+\s*:' % fam, s)
    refs = re.findall(r'var\(\s*--%s-[\w-]+' % fam, s)
    distinct = len(set(d.rstrip(': ').strip() for d in decls))
    row(f'--{fam}-*  sites / distinct / refs', f'{len(decls)} / {distinct} / {len(refs)}')

print('\n── the fallback invariant (448-449) ' + '─' * 22)
tot = len(re.findall(r'var\(\s*--', s))
fb = len(re.findall(r'var\(\s*--[\w-]+\s*,', s))
hexfb = len(re.findall(r'var\(\s*--[\w-]+\s*,\s*#', s))
row('var() refs total', tot)
row('  with a fallback', fb)
row('  ... of which a hex literal', hexfb)
row('  BARE (the exposure)', f'{tot-fb}  = {100*(tot-fb)/tot:.0f}%')

print('\n── colours ' + '─' * 47)
row('#c8202e (cardinal red)', len(re.findall(r'#c8202e', s, re.I)))
row('#c9a227 (retail badge gold)', len(re.findall(r'#c9a227', s, re.I)))
row('#b8860b (gradient-clip fallback)', len(re.findall(r'#b8860b', s, re.I)))
row('  legacy gold total', len(re.findall(r'#c9a227|#b8860b', s, re.I)))
for dead in ('#d4a017', '#f5d061', '#8a5a00'):
    row(f'  {dead}  [must stay 0]', len(re.findall(dead, s, re.I)))

print('\n── build labels ' + '─' * 42)
labels = re.findall(r'v(2026-\d\d-\d\d)\s*(?:·|)\s*build\s+(\d+)', s)
row('label strings', len(labels))
row('distinct builds', sorted(set(int(n) for _, n in labels)))
for d, n in sorted(set(labels), key=lambda x: int(x[1])):
    print(f'    v{d} build {n}  x{labels.count((d,n))}')

print('\n── CHANGELOG ' + '─' * 45)
i = s.find('var CHANGELOG = [')
seg = s[i:i+60000]
bs = sorted(set(int(x) for x in re.findall(r'\{ b:(\d+),', seg)))
row('entries', len(re.findall(r'\{ b:\d+,', seg)))
row('span', f'{bs[0]}-{bs[-1]}')
row('gaps in span', [n for n in range(bs[0], bs[-1]+1) if n not in bs])

print('\n── repo ' + '─' * 50)
root = os.path.dirname(os.path.abspath(SRC))
row('api/*.js', len([f for f in os.listdir(os.path.join(root, 'api')) if f.endswith('.js')]))
row('*.sql at root', len([f for f in os.listdir(root) if f.endswith('.sql')]))
row('*.html at root', len([f for f in os.listdir(root) if f.endswith('.html')]))
