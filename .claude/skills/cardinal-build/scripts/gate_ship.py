#!/usr/bin/env python3
"""gate_ship.py — the pre-merge gate. Run it BEFORE merging any PR.

    python3 gate_ship.py <pr-number>
    python3 gate_ship.py --selftest        # prove the checks can fail

Four checks, each one written because it already cost a real round on this
project. Every one is a MEASUREMENT of the PR you are about to merge, not of
something adjacent to it.

  BASE    the branch carries no commit whose patch is already on main.
          Build 840 was branched with `git checkout -B <branch>` and NO
          `origin/main`, so it kept build 839's PRE-SQUASH commit. main already
          had 839 via the squash merge, so the PR re-applied it: 2 commits,
          7 files, 8 conflict markers. `git cherry` marks such commits '-'.

  CI      a successful run of the workflow EXISTS FOR THE PR'S OWN HEAD SHA.
          GitHub happily shows a PR a green tick inherited from an earlier run
          on the same BRANCH. On 840 the PR page looked green while the newest
          run had head_sha = the previous build's commit. This is the check
          that matters most and the easiest one to eyeball wrongly.

  MERGE   mergeable_state == 'clean'. Also the reason a missing CI run is worth
          diagnosing rather than working around: GitHub builds `pull_request`
          runs against the MERGE ref, which cannot exist while the PR
          conflicts — so "no CI run at all" is usually a CONFLICT symptom, not
          an Actions outage. Do not go looking at the billing page first.

  STAMP   the branch's app stamp is strictly above main's. next_build.py
          answers "what number is free"; this answers "did I actually use it".
"""
import json, re, subprocess, sys, os, urllib.request

REPO = os.environ.get('CARDINAL_REPO', 'Cardinal-1986/cardinal-inspections')
WORKFLOW_JOB = 'check'          # the job name in .github/workflows/check.yml


# ── pure helpers, so --selftest can drive them without a network ───────────
def already_upstream(cherry_output):
    """git cherry marks '-' for a commit whose patch is ALREADY upstream.
    Returns the list of such commit shas — a non-empty list is the 840 bug."""
    dupes = []
    for line in (cherry_output or '').splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[0] == '-':
            dupes.append(parts[1])
    return dupes


def ci_run_for_sha(check_runs, sha, job_name=WORKFLOW_JOB):
    """The run must name the job AND belong to THIS sha. Returns
    (found, conclusion). A run for another sha is not evidence about this one."""
    for r in check_runs or []:
        if r.get('name') != job_name:
            continue
        if r.get('head_sha') and r.get('head_sha') != sha:
            continue                      # inherited from another commit
        return True, r.get('conclusion')
    return False, None


STAMP_RE = re.compile(r'build\s+(\d+)\s*&#8212;')


def stamp_of(html):
    """The APP stamp — the em-dash summary form, which only the rendered
    nav footer uses. Module banners carry `build NNN` with no summary, so a
    bare number match would find them too."""
    m = STAMP_RE.search(html or '')
    return int(m.group(1)) if m else None


# ── the live checks ────────────────────────────────────────────────────────
def gh(path):
    req = urllib.request.Request(
        'https://api.github.com/repos/' + REPO + path,
        headers={'Authorization': 'Bearer ' + (os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or ''),
                 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'cardinal-gate-ship'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def sh(*args):
    return subprocess.run(args, capture_output=True, text=True).stdout.strip()


def main(pr_number):
    ok = True

    def say(name, good, detail=''):
        nonlocal ok
        if not good:
            ok = False
        print(('  PASS  ' if good else '  FAIL  ') + name + (('  — ' + detail) if detail else ''))

    pr = gh('/pulls/%s' % pr_number)
    head = pr['head']['sha']
    base = pr['base']['ref']
    branch = pr['head']['ref']
    print('PR #%s  %s' % (pr_number, pr.get('title', '')))
    print('head %s  base %s  state %s  draft %s\n' % (head[:8], base, pr.get('state'), pr.get('draft')))

    say('PR is open', pr.get('state') == 'open', str(pr.get('state')))
    say('PR is not already merged', not pr.get('merged'))

    # ── BASE ───────────────────────────────────────────────────────────────
    subprocess.run(['git', 'fetch', 'origin', base, branch, '-q'], capture_output=True)
    cherry = sh('git', 'cherry', 'origin/' + base, head)
    dupes = already_upstream(cherry)
    say('branch carries no commit already on %s' % base, not dupes,
        ('%d duplicate commit(s): %s — rebase with '
         '`git rebase --onto origin/%s <dup> <head>`' % (len(dupes), ', '.join(s[:8] for s in dupes), base))
        if dupes else '')
    n_new = len([l for l in cherry.splitlines() if l.startswith('+')])
    print('        (%d new commit(s) on the branch)' % n_new)

    # ── CI, FOR THIS SHA ───────────────────────────────────────────────────
    runs = gh('/commits/%s/check-runs' % head).get('check_runs', [])
    found, concl = ci_run_for_sha(runs, head)
    say("a '%s' run exists for THIS head sha" % WORKFLOW_JOB, found,
        'only these ran on %s: %s' % (head[:8], ', '.join(sorted({r.get('name', '?') for r in runs})) or 'nothing'))
    if found:
        # conclusion is null while the run is still going — that is 'wait', not 'no'
        say("that run's conclusion is success", concl == 'success',
            'still running — wait for it' if concl is None else str(concl))

    # ── MERGEABLE ──────────────────────────────────────────────────────────
    # The states mean different things and want different responses. Lumping
    # them together is how 'a check is still running' reads as 'conflict'.
    st = pr.get('mergeable_state')
    MEANING = {
        'dirty':    'CONFLICT — rebase. Note a conflicted PR also cannot produce a '
                    'pull_request CI run at all, so this is usually why CI looks missing',
        'unstable': 'a check is pending or failing — not a conflict; look at the run itself',
        'blocked':  'a required review or check is outstanding',
        'behind':   'the base moved; merge origin/%s in' % base,
        'unknown':  'GitHub is still computing it — re-run in a moment',
    }
    say('mergeable_state is clean', st == 'clean',
        '%s — %s' % (st, MEANING.get(st, 'see GitHub')) if st != 'clean' else '')

    # ── STAMP ──────────────────────────────────────────────────────────────
    # ⚠ ONLY when index.html actually changed. A docs- or scripts-only PR does
    # not take a build number, and failing it here would be crying wolf — the
    # thing build 808 exists to warn against. Found by running this gate on its
    # own first PR, which is docs-only.
    main_html = sh('git', 'show', 'origin/%s:index.html' % base)
    head_html = sh('git', 'show', '%s:index.html' % head)
    if main_html == head_html:
        print('  n/a   app stamp — index.html is untouched, so this PR takes no build number')
    else:
        ms, hs = stamp_of(main_html), stamp_of(head_html)
        say('app stamp is above %s' % base, ms is not None and hs is not None and hs > ms,
            '%s says %s, branch says %s' % (base, ms, hs))

    print('\n' + '=' * 56)
    print(('GREEN — safe to merge' if ok else 'RED — do NOT merge'))
    return 0 if ok else 1


def selftest():
    p = f = 0

    def check(name, cond):
        nonlocal p, f
        if cond:
            p += 1; print('  PASS  ' + name)
        else:
            f += 1; print('  FAIL  ' + name)

    # BASE — must SEE the duplicate, and must not invent one
    check('already_upstream finds a pre-squash duplicate',
          already_upstream('+ aaa1111 new work\n- bbb2222 build 839') == ['bbb2222'])
    check('already_upstream is silent on a clean branch',
          already_upstream('+ aaa1111 new work') == [])

    # CI — the whole point: a run for ANOTHER sha is not evidence
    runs_other = [{'name': 'check', 'head_sha': 'OLD', 'conclusion': 'success'}]
    check('a green run belonging to another sha does NOT count',
          ci_run_for_sha(runs_other, 'NEW') == (False, None))
    runs_this = [{'name': 'check', 'head_sha': 'NEW', 'conclusion': 'success'}]
    check('a green run on this sha does count',
          ci_run_for_sha(runs_this, 'NEW') == (True, 'success'))
    check('a failing run on this sha is reported as failing',
          ci_run_for_sha([{'name': 'check', 'head_sha': 'NEW', 'conclusion': 'failure'}], 'NEW')
          == (True, 'failure'))
    check('only-Vercel (no check job) is not a pass',
          ci_run_for_sha([{'name': 'Vercel Preview Comments', 'head_sha': 'NEW',
                           'conclusion': 'success'}], 'NEW') == (False, None))

    # STAMP — the app stamp, not a module banner
    check('stamp_of reads the app stamp',
          stamp_of('<div data-cr-footer>v2026-08-16 build 840 &#8212; thing</div>') == 840)
    check('stamp_of ignores a module banner with no summary',
          stamp_of('/* v2026-08-16 build 148 */') is None)

    print('\n' + '=' * 56)
    print(('GREEN' if f == 0 else 'RED') + '  —  %d passed, %d failed' % (p, f))
    return 0 if f == 0 else 1


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(selftest() if sys.argv[1] == '--selftest' else main(sys.argv[1]))
