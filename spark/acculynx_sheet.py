#!/usr/bin/env python3
"""Build the AccuLynx client spreadsheet from a fetched jobs.jsonl.

Uses push_acculynx.py's OWN extractors rather than re-reading the raw JSON, so
the sheet shows exactly what an import would produce — including the three
field fixes from 13 Aug (locationAddress, resolved rep refs, pageStartIndex).
A second extractor here would be free to disagree with the importer, and that
divergence is the trap this project keeps paying for.

usage: build_sheet.py <jobs.jsonl> <out.xlsx>
"""
import importlib.util, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import minixlsx as X
from minixlsx import Cell, Sheet, S_HEAD, S_BODY, S_BODY_GREY, S_TITLE, \
    S_NOTE, S_BOLD, S_PCT, S_DEFAULT

SRC, OUT = sys.argv[1], sys.argv[2]

# Resolve push_acculynx.py beside THIS file, not at an absolute path — the
# script has to run from a desktop clone, the Spark and a cloud container alike.
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    'pa', os.path.join(HERE, 'push_acculynx.py'))
pa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pa)

ADMIN = 'theo@cardinalrenovations.net'
ROSTER = {e: 'x' for e in [
    'theo@cardinalrenovations.net', 'joan@cardinalrenovations.net',
    'curtis@cardinalrenovations.net', 'scottie@cardinalrenovations.net',
    'nick@cardinalrenovations.net', 'joey@cardinalrenovations.net',
    'jacob@cardinalrenovations.net', 'jerry@cardinalrenovations.net']}
IN_SCOPE = {'Lead', 'Prospect', 'Approved', 'Completed', 'Invoiced', 'Closed'}

recs = [json.loads(l) for l in open(SRC)]
print('records read: %d' % len(recs))


def txt(v):
    """AccuLynx returns {id,name,abbreviation,_link} objects all over."""
    if isinstance(v, dict):
        return v.get('name') or v.get('abbreviation') or ''
    if isinstance(v, list):
        return ', '.join(x for x in (txt(i) for i in v) if x)
    return v or ''


def raw_milestone(r):
    """The AccuLynx milestone, before normStage() folds anything unknown
    into 'Lead'. Cancelled and Dead are NOT in the app's whitelist, so the
    mapped stage cannot represent them and the sheet must show the source."""
    for h in (r.get('job') or {}, r.get('detail') or {}):
        v = txt(h.get('currentMilestone'))
        if v:
            return v
    return ''


rows = []
for r in recs:
    job, det = r.get('job') or {}, r.get('detail') or {}
    m = pa.map_job(r, ROSTER, ADMIN, 0, '')
    row = m['row']
    lead = json.loads(row['checklist'])['lead']
    addr = pa.dig_address(r)
    ins, has_ins = pa.dig_insurance(r)
    rep_email, rep_name = pa.dig_rep(r)
    ms = raw_milestone(r) or row.get('stage') or ''
    rows.append([
        job.get('jobNumber') or det.get('jobNumber') or '',
        row.get('name') or '',
        addr.get('street', ''), addr.get('city', ''),
        addr.get('state', ''), addr.get('zip', ''),
        row.get('phone') or '', lead.get('phone_alt') or '',
        row.get('email') or '',
        ms,
        txt(job.get('leadDeadReason') or det.get('leadDeadReason')),
        'Yes' if ms in IN_SCOPE else 'No',
        rep_name or '', rep_email or '',
        txt(job.get('leadSource') or det.get('leadSource')),
        txt(job.get('tradeTypes') or det.get('tradeTypes')),
        (row.get('created_at') or '')[:10],
        (row.get('updated_at') or '')[:10],
        ins.get('carrier') or '', ins.get('claim_number') or '',
        (ins.get('date_of_loss') or '')[:10],
        r.get('id') or '',
    ])

HEAD = ['Job #', 'Client', 'Street', 'City', 'State', 'Zip', 'Phone',
        'Phone (alt)', 'Email', 'Stage', 'Cancel reason',
        'In migration scope', 'Rep', 'Rep email', 'Lead source', 'Trade',
        'Created', 'Last activity', 'Insurance carrier', 'Claim #',
        'Date of loss', 'AccuLynx job ID']
WIDTH = [10, 26, 28, 14, 7, 12, 16, 16, 30, 11, 26, 11, 18, 32, 20, 22,
         11, 13, 20, 15, 12, 38]
ORDER = {s: i for i, s in enumerate(
    ['Lead', 'Prospect', 'Approved', 'Completed', 'Invoiced', 'Closed'])}
rows.sort(key=lambda x: (x[11] != 'Yes', ORDER.get(x[9], 99), (x[1] or '').lower()))

# Print what the extractor captured before anything is asserted on it.
from collections import Counter
print('stages   : %s' % dict(Counter(r[9] for r in rows)))
print('in scope : %d of %d' % (sum(1 for r in rows if r[11] == 'Yes'), len(rows)))
print('reps     : %s' % dict(Counter(r[12] or '(none)' for r in rows)))
print('blank    : name=%d street=%d phone=%d email=%d' % (
    sum(1 for r in rows if not r[1]), sum(1 for r in rows if not r[2]),
    sum(1 for r in rows if not r[6]), sum(1 for r in rows if not r[8])))

# ── Clients ──────────────────────────────────────────────────────────────
cl = Sheet('Clients')
cl.add([Cell(h, S_HEAD) for h in HEAD])
cl.row_heights[1] = 30
for r in rows:
    st = S_BODY if r[11] == 'Yes' else S_BODY_GREY
    cl.add([Cell(v, st) for v in r])
cl.widths = {i: w for i, w in enumerate(WIDTH, 1)}
cl.freeze = (2, 1)                      # keep Job # + Client visible
cl.autofilter = 'A1:%s%d' % (X.colname(len(HEAD)), len(rows) + 1)

last = len(rows) + 1
J = 'Clients!$J$2:$J$%d' % last         # Stage
K = 'Clients!$L$2:$L$%d' % last         # In scope
L = 'Clients!$M$2:$M$%d' % last         # Rep

# ── Summary ──────────────────────────────────────────────────────────────
# Each cell carries BOTH the formula and its Python-computed result, so the
# numbers are correct in any reader and still refresh if you edit the data.
stage_n = Counter(r[9] for r in rows)
rep_n = Counter(r[12] for r in rows if r[12])
n_total = len(rows)
n_scope = sum(1 for r in rows if r[11] == 'Yes')

sm = Sheet('Summary')
sm.add([Cell('AccuLynx export — summary', S_TITLE)])
sm.add([Cell('Every number here is a live COUNTIF over the Clients tab, so it '
             'follows whatever you edit, add or filter there.', S_NOTE)])
sm.add([])
sm.add([Cell('Stage', S_BOLD), Cell('Jobs', S_BOLD)])
n = 5
for s in ['Lead', 'Prospect', 'Approved', 'Completed', 'Invoiced', 'Closed',
          'Cancelled']:
    sm.add([Cell(s), Cell(f='COUNTIF(%s,A%d)' % (J, n), cached=stage_n.get(s, 0))])
    n += 1
sm.add([Cell('Total', S_BOLD),
        Cell(s=S_BOLD, f='COUNTA(Clients!$B$2:$B$%d)' % last, cached=n_total)])
total_row = n
n += 1
sm.add([Cell('In migration scope', S_BOLD),
        Cell(s=S_BOLD, f='COUNTIF(%s,"Yes")' % K, cached=n_scope)])
n += 2
sm.add([])
sm.add([Cell('There is no separate "Dead" count because AccuLynx has no such '
             'stage here: its "dead" and "cancelled" filters return the '
             'identical 45 jobs, all of them Cancelled. Counting the two '
             'separately double-counts one pile.', S_NOTE)])
n += 1
sm.add([])
n += 1

sm.add([Cell('Rep', S_BOLD), Cell('Jobs', S_BOLD)])
n += 1
for nm in sorted(rep_n):
    sm.add([Cell(nm), Cell(f='COUNTIF(%s,A%d)' % (L, n), cached=rep_n[nm])])
    n += 1
unassigned = sum(1 for r in rows if not r[12])
if unassigned:
    sm.add([Cell('(no rep on the AccuLynx job)'),
            Cell(f='COUNTBLANK(%s)' % L, cached=unassigned)])
    n += 1
sm.add([])
n += 1

sm.add([Cell('Contact details on file', S_BOLD), Cell('Count', S_BOLD),
        Cell('Share', S_BOLD)])
n += 1
COMP = [('Has a phone number', 'G', 6), ('Has an email address', 'I', 8),
        ('Has a street address', 'C', 2), ('Carries insurance data', 'S', 18)]
for label, col, idx in COMP:
    have = sum(1 for r in rows if str(r[idx]).strip())
    sm.add([Cell(label),
            Cell(f='COUNTIF(Clients!$%s$2:$%s$%d,"?*")' % (col, col, last),
                 cached=have),
            Cell(s=S_PCT, f='IF($B$%d=0,0,B%d/$B$%d)' % (total_row, n, total_row),
                 cached=round(have / n_total, 6) if n_total else 0)])
    n += 1
sm.add([])
n += 1
sm.add([Cell('Notes, documents and photos are NOT in this export.', S_BOLD)])
n += 1
sm.add([Cell('AccuLynx exposes no read route for any of them — every candidate '
             'endpoint answers 404, re-confirmed on this pull. The 806 job '
             'messages stay in AccuLynx.', S_NOTE)])
sm.widths = {1: 32, 2: 12, 3: 10}

X.write(OUT, [cl, sm])
print('wrote %s (%d data rows)' % (OUT, len(rows)))

# A CSV companion: guaranteed to open anywhere, and the thing to pivot from.
import csv
csv_path = OUT.rsplit('.', 1)[0] + '.csv'
with open(csv_path, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh)
    w.writerow(HEAD)
    w.writerows(rows)
print('wrote %s' % csv_path)
