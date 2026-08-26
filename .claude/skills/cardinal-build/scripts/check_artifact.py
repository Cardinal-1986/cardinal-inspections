#!/usr/bin/env python3
"""check_artifact — the mechanical ladder for the artifacts check_build.py does NOT gate.

⚠ THIS EXISTS BECAUSE `check_build.py` SEES ONE ARTIFACT AND THERE ARE SIX.
  It gates index.html. It does not see studio.html, popup.html, supplement.html,
  ai-field-manual.html or visualizer/index.html — and builds 809-836 and 1055
  never touched the file it gates. CLAUDE.md calls parsing those separately "the
  convention, not a courtesy", and until now that convention was a heredoc
  retyped from memory every time. Three times in one session is a tool.

  It deliberately does NOT try to be check_build.py: no app-stamp rule (each of
  these artifacts stamps itself differently — supplement.html has SD_BUILD and a
  header chip, visualizer/index.html has its own), no CHANGELOG, no window.Cardinal*
  dupe check. It is the part that is genuinely common: does every inline script
  parse, do the tags balance, do the CSS braces balance, is a <style id=> unique.

  --stamp NAME  reads `var NAME = <int>` and, with --prev, requires it to INCREASE.
  --marker STR  must appear here and, with --prev, must NOT appear there
                (the negative control — a gate never seen to fail proves nothing).

    python3 check_artifact.py supplement.html --prev old.html \
        --stamp SD_BUILD --marker="resize: 'contain'"
"""
import argparse, os, re, subprocess, sys, tempfile

def load(p):
    with open(p, encoding='utf-8') as f: return f.read()

FAILED = []
def report(ok, msg):
    print(('  ✓ ' if ok else '  ✗ ') + msg)
    if not ok: FAILED.append(msg)

def inline_scripts(s):
    return re.findall(r'<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)</script>', s)

def gate_scripts(s):
    blocks, bad = inline_scripts(s), 0
    for i, body in enumerate(blocks):
        if not body.strip(): continue
        fd, path = tempfile.mkstemp(suffix='.js'); os.close(fd)
        with open(path, 'w', encoding='utf-8') as f: f.write(body)
        r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
        os.unlink(path)
        if r.returncode:
            bad += 1
            print('     block %d: %s' % (i, r.stderr.strip().splitlines()[-1][:160]))
    report(bad == 0, 'node --check on %d inline script block(s)' % len(blocks))

def gate_tags(s):
    for tag in ('script', 'style', 'div'):
        o = len(re.findall(r'<%s[\s>]' % tag, s))
        c = len(re.findall(r'</%s>' % tag, s))
        report(o == c, '<%s> balance (%d open / %d close)' % (tag, o, c))

def gate_css(s):
    blocks = re.findall(r'<style[^>]*>([\s\S]*?)</style>', s)
    o = sum(b.count('{') for b in blocks); c = sum(b.count('}') for b in blocks)
    report(o == c, 'CSS brace balance across %d <style> block(s) (%d / %d)' % (len(blocks), o, c))
    ids = re.findall(r'<style[^>]*\sid="([^"]+)"', s)
    dupes = {i for i in ids if ids.count(i) > 1}
    report(not dupes, 'no duplicate <style id=> (%d id(s))%s'
           % (len(ids), '' if not dupes else '  DUPES: ' + ', '.join(sorted(dupes))))

def stamp_of(s, name):
    m = re.search(r'\b' + re.escape(name) + r'\s*=\s*(\d+)', s)
    return int(m.group(1)) if m else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('artifact'); ap.add_argument('--prev')
    ap.add_argument('--stamp'); ap.add_argument('--marker')
    a = ap.parse_args()

    s = load(a.artifact)
    prev = load(a.prev) if a.prev else None
    print('check_artifact: %s (%d bytes)' % (a.artifact, len(s.encode('utf-8'))))

    gate_scripts(s); gate_tags(s); gate_css(s)

    if a.stamp:
        now = stamp_of(s, a.stamp)
        report(now is not None, '%s present: %s' % (a.stamp, now))
        if prev is not None and now is not None:
            was = stamp_of(prev, a.stamp)
            if was is None:
                report(True, '%s bumped (previous had none)' % a.stamp)
            else:
                report(now > was, '%s bumped: %d -> %d' % (a.stamp, was, now))

    if a.marker:
        report(a.marker in s, 'marker present: %r' % a.marker)
        if prev is not None:
            # THE NEGATIVE CONTROL. A green gate proves nothing until it has
            # been seen to fail; a stale file once staged green on this project.
            report(a.marker not in prev, 'negative control - marker absent from prev')

    print('')
    if FAILED:
        print('RED - %d gate(s) failed. Do NOT stage.' % len(FAILED)); sys.exit(1)
    print('GREEN - mechanical gates passed. A functional gate is still required.')

if __name__ == '__main__':
    main()
