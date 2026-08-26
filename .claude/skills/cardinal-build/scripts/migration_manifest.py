#!/usr/bin/env python3
"""Derive the migration manifest from the repo, not from memory.

Writes MIGRATIONS.md at the repo root.  Every column below is MEASURED:

  · shipped at    — the LOWEST build number that names this file in
                    cardinal_build_log.md.  That is the honest ordering signal;
                    see the caveat the generated file carries about git dates.
  · replayable    — does every statement guard itself (if not exists /
                    if exists / or replace / on conflict)?
  · destructive   — does it drop, delete, truncate or alter-drop anything?
  · kind          — schema/policy (safe on a fresh database) vs a ONE-OFF data
                    repair (must never be replayed).

Run:  python3 .claude/skills/cardinal-build/scripts/migration_manifest.py [--check]
      --check exits 1 if MIGRATIONS.md is out of date, so CI can gate it.
"""
import os, re, subprocess, sys, io

# scripts/ -> cardinal-build/ -> skills/ -> .claude/ -> repo root: FOUR levels.
# The first version had three and silently wrote the manifest into .claude/
# with zero rows — an empty result that looked like a legitimate 'no files'.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
assert os.path.exists(os.path.join(ROOT, 'index.html')), \
    'ROOT is not the repo root: ' + ROOT
LOG  = os.path.join(ROOT, '.claude/skills/cardinal-build/docs/cardinal_build_log.md')
OUT  = os.path.join(ROOT, 'MIGRATIONS.md')

def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True).stdout

# ── which build shipped each file, from the build log ────────────────────────
log = io.open(LOG, encoding='utf-8').read() if os.path.exists(LOG) else ''
# Build headings are inconsistent (## Build N / ## build N / ### N — / **N**),
# which CLAUDE.md warns about.  Split on any heading that names a number.
# ⚠ CLAUDE.md's warning, applied: the log's heading levels are inconsistent.
# 543-684 and 827+ use "## Build N"; 685-826 mostly use lowercase "## build N",
# a "### N —" sub-head, or a bold "**N**" bullet inside a span write-up. A regex
# for the WORD finds 422 headings; this one finds ~496.
# The year guard matters — "## 2026 ..." would otherwise read as build 2026.
HEAD = re.compile(r'^(?:#{2,4}\s*(?:[Bb]uilds?\s+)?(\d{3,4})\b|\*\*(\d{3,4})\*\*)', re.M)
sections = []
marks = []
for m in HEAD.finditer(log):
    n = int(m.group(1) or m.group(2))
    if 2000 <= n <= 2099:            # a year, not a build
        continue
    marks.append((m.start(), n))
for i, (pos, n) in enumerate(marks):
    end = marks[i + 1][0] if i + 1 < len(marks) else len(log)
    sections.append((n, log[pos:end]))

def builds_naming(fname):
    return sorted({n for n, body in sections if fname in body})

# ── which docs name the file at all ─────────────────────────────────────────
# 28 files are named by no build-log heading, and that is NOT a regex artifact:
# checked, only one of the 28 appears in the log's text at all. Most are named
# in CLAUDE.md or FEATURES.md instead (showcase_pairs, visualizer_schema,
# oc_colors ...). A file named in NO doc is the real red flag, so record where
# each one IS documented rather than reporting a bare "unknown".
DOCDIR = os.path.join(ROOT, '.claude/skills/cardinal-build/docs')
DOCS = {}
for name in ['CLAUDE.md']:
    fp = os.path.join(ROOT, name)
    if os.path.exists(fp):
        DOCS[name] = io.open(fp, encoding='utf-8', errors='replace').read()
if os.path.isdir(DOCDIR):
    for name in sorted(os.listdir(DOCDIR)):
        if name.endswith('.md'):
            DOCS[name] = io.open(os.path.join(DOCDIR, name),
                                 encoding='utf-8', errors='replace').read()

def docs_naming(fname):
    return [n for n, body in DOCS.items() if fname in body]

GUARDED = re.compile(r'if\s+not\s+exists|if\s+exists|or\s+replace|on\s+conflict', re.I)
DESTRUCT = re.compile(r'\bdrop\s+(table|column|schema)\b|\bdelete\s+from\b|\btruncate\b|'
                      r'\balter\s+table\s+\S+\s+drop\b', re.I)
STMT = re.compile(r'^\s*(create|alter|drop|insert|update|delete|grant|revoke|comment|do|truncate)\b',
                  re.I | re.M)

files = sorted(f for f in os.listdir(ROOT) if f.endswith('.sql'))
rows = []
for f in files:
    src = io.open(os.path.join(ROOT, f), encoding='utf-8', errors='replace').read()
    body = re.sub(r'--[^\n]*', '', src)
    stmts = STMT.findall(body)
    dest = bool(DESTRUCT.search(body))
    guarded = bool(GUARDED.search(body))
    bs = builds_naming(f)
    rows.append(dict(file=f, builds=bs, stmts=len(stmts),
                     destructive=dest, guarded=guarded, docs=docs_naming(f)))

# ⚠ The sort key deliberately does NOT include the git date, and that cost a red
# CI run. actions/checkout does a DEPTH-1 clone: every file then looks like it
# was added by the one commit that exists, so they all share ITS date, and a
# date-keyed sort reorders 26 rows against the committed file. The check failed
# on a tree nobody had touched.
#
# Reproduced before it was fixed — my first guess (that a shallow clone sees no
# adds at all) was WRONG; it sees all 84, with the wrong date. Assuming would
# have produced a wrong fix.
#
# It was also inconsistent with this file's own warning that the git date means
# nothing here. Build number, then filename: both are in the working tree, so
# every clone sorts identically.
rows.sort(key=lambda r: (r['builds'][0] if r['builds'] else 10**9, r['file']))

n_dest = sum(1 for r in rows if r['destructive'])
n_unlogged = sum(1 for r in rows if not r['builds'])

def esc(s):
    return s.replace('|', '\\|')

md = []
md.append('# Migrations — what ran, in what order, and what must never run twice\n')
md.append('**Generated. Do not hand-edit.** Regenerate with:\n')
md.append('```bash\npython3 .claude/skills/cardinal-build/scripts/migration_manifest.py\n```\n')
md.append(f'`{len(rows)}` `.sql` files at the repo root. **All are applied by hand against '
          'Supabase** — nothing in the app or the deploy ever runs one, and `.vercelignore` '
          'blanket-excludes `*.sql` so none is ever served.\n')
md.append('## Read this before trusting the order\n')
md.append('**The `shipped at` column is the ordering signal, not the git date.** It is the '
          'lowest build number in `cardinal_build_log.md` that names the file. Git cannot answer '
          'this: PRs on this repo are **squash-merged**, so a file written across five builds '
          'lands in one commit, and dozens of early migrations share a single commit date that '
          'has nothing to do with when they ran.\n')
md.append(f'⚠️ **{n_unlogged} file(s) are named by no build-log heading**, so their order is '
          'unknown and they are listed last. That is not a grep artifact — checked, only one of '
          'them appears anywhere in the log\'s text. Most are documented in `CLAUDE.md` or '
          '`FEATURES.md` instead; the `documented in` column says where. **A file marked '
          '`NOTHING` is named by no doc at all** — read it before running it.\n')
md.append(f'⚠️ **{n_dest} file(s) drop, delete or truncate something.** They are marked '
          '**DESTRUCTIVE** below. Most are one-off repairs against production data that has since '
          'been fixed — **replaying one on a live database destroys current rows.** A fresh-database '
          'bootstrap must skip every one of them.\n')
md.append('`replayable` means every statement in the file guards itself '
          '(`if not exists` / `if exists` / `or replace` / `on conflict`). A file that is **not** '
          'replayable errors on a second run rather than corrupting anything — that is the safe '
          'failure, and it is not the same as DESTRUCTIVE.\n')
md.append('## The files\n')
md.append('| # | shipped at | file | stmts | replayable | destructive | documented in |')
md.append('|---:|---:|---|---:|:---:|:---:|---|')
for i, r in enumerate(rows, 1):
    b = ', '.join(str(x) for x in r['builds'][:3]) or '—'
    if len(r['builds']) > 3:
        b += ' …'
    docs = [d for d in r['docs'] if d != 'cardinal_build_log.md']
    dcol = ', '.join(docs[:2]) if docs else ('build log only' if r['builds'] else '**NOTHING**')
    if len(docs) > 2:
        dcol += ' …'
    md.append('| %d | %s | `%s` | %d | %s | %s | %s |'
              % (i, b, esc(r['file']), r['stmts'],
                 '✅' if r['guarded'] else '—',
                 '**⚠ YES**' if r['destructive'] else '—', dcol))
md.append('')
md.append('## Rebuilding from empty\n')
md.append('There is no verified fresh-database bootstrap, and this file does not claim one. '
          'What it gives you is the order to work in and the list to skip. To build one: run the '
          'non-destructive files in the order above, skip every **DESTRUCTIVE** row, then diff the '
          'result against production’s schema. Until that has actually been done once and the '
          'result recorded here, treat a rebuild as untested.\n')
# ⚠ THERE IS NO "first commit that added this file" TABLE, and its absence is
# deliberate. An earlier revision had one. It was fiction: this repo is cloned
# SHALLOW in CI (actions/checkout defaults to depth 1) and shallow in the dev
# container too (72 commits), so `git log --diff-filter=A` reports every file as
# added by whichever commit the clone happens to start at. The dates agreed with
# nothing, and because they LOOKED precise they were more misleading than a gap.
# Squash-merging would have made them useless even with full history.
#
# The build-log column above is derived entirely from the working tree, so every
# clone computes it identically and --check is a real gate everywhere.
text = '\n'.join(md)

if '--check' in sys.argv:
    cur = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    if cur != text:
        print('MIGRATIONS.md is out of date — regenerate it')
        sys.exit(1)
    print('MIGRATIONS.md up to date (%d files)' % len(rows))
    sys.exit(0)

io.open(OUT, 'w', encoding='utf-8').write(text)
print('wrote %s — %d files, %d destructive, %d unlogged'
      % (OUT, len(rows), n_dest, n_unlogged))
