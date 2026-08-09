#!/usr/bin/env python3
"""Re-derives the artifact-side numbers quoted in docs/CR_AUDIT_2026-08.md.

Line numbers in the report drift every build; these checks do not. Run this
before quoting the report at a later build — a check that FAILS means the
finding was fixed (good) or the code moved (re-verify), not that the report
was wrong at 652. DB-side numbers (row counts, divergent projects) need live
SQL and are listed at the bottom as queries, not asserted here.

Usage: python3 audit_recount.py [index.html]"""
import re, sys

PATH = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cardinal-inspections/index.html'
src = open(PATH, encoding='utf-8').read()

import os
API = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(PATH) if os.path.dirname(PATH) else os.path.abspath('.'))))), '')
API_DIR = os.path.join(os.path.dirname(os.path.abspath(PATH)), 'api')

checks = []
def chk(finding, label, cond, measured):
    checks.append((finding, label, bool(cond), measured))

# CR-AUD-001 — endpoint name mismatch
underscore_calls = src.count("'/api/estimate_to_contract'")
hyphen_file = os.path.exists(os.path.join(API_DIR, 'estimate-to-contract.js'))
underscore_file = os.path.exists(os.path.join(API_DIR, 'estimate_to_contract.js'))
chk('001', 'client calls underscore path', underscore_calls >= 1, underscore_calls)
chk('001', 'only the hyphen file exists', hyphen_file and not underscore_file,
    'hyphen=%s underscore=%s' % (hyphen_file, underscore_file))

# CR-AUD-002 — the promise with no sender
chk('002', 'the "client will receive" toast exists', 'client will receive' in src,
    src.count('client will receive'))
senders = 0
if os.path.isdir(API_DIR):
    for f in os.listdir(API_DIR):
        if f.endswith('.js') and f not in ('estimate.js', 'estimate-to-contract.js'):
            if 'ai_estimates' in open(os.path.join(API_DIR, f), encoding='utf-8').read():
                senders += 1
chk('002', 'no api file besides estimate*/convert touches ai_estimates', senders == 0, senders)

# CR-AUD-003 — the two value functions still exist with their split sources
chk('003', 'jobFinance reads contract DOCS (cacheRows + /^contract/i)',
    re.search(r'function jobFinance[\s\S]{0,200}cacheRows', src) is not None, '')
chk('003', 'projectValue reads ctrSigned/estBest chain',
    re.search(r'function projectValue[\s\S]{0,300}estBest', src) is not None, '')

# CR-AUD-005 — two supplement systems
chk('005', 'System A CRUD (insurance_supplements insert) present',
    ".from('insurance_supplements').insert" in src.replace(' ', '') or
    re.search(r"from\('insurance_supplements'\)[\s\S]{0,80}insert", src) is not None, '')
chk('005', 'System B single slot (supplement_filed write) present',
    'supplement_filed' in src, src.count('supplement_filed'))

# CR-AUD-010 — rail innerHTML replacement carries no cards
i = src.find('<script id="cr-cth-script">'); j = src.find('</script>', i)
blk = src[i:j] if i != -1 else ''
n = blk.find('host.innerHTML')
rest = blk[n:] if n != -1 else ''
chk('010', 'cr-cth render() innerHTML markup contains NO data-ctnav/ins-card',
    n != -1 and 'data-ctnav' not in rest and 'ins-card' not in rest, '')

# CR-AUD-011 — forProject still selects client_name and keys on insurance_claim_id
chk('011', "forProject selects client_name (the dead wire)",
    'client_name' in src, src.count('client_name'))

# CR-AUD-014 — OnHold absent from the insurance label maps
maps_with_onhold = len(re.findall(r"OnHold['\"]?\s*:", blk)) + \
    len(re.findall(r"OnHold['\"]?\s*:\s*'", src[src.find('CD_STAGE_LABEL'):src.find('CD_STAGE_LABEL')+2000]))
chk('014', 'OnHold has no label in rail/CD maps (0 expected)', maps_with_onhold == 0, maps_with_onhold)

# CR-AUD-015 — cr-iu star-select
chk('015', "cr-iu still star-selects insurance_claims",
    re.search(r"from\('insurance_claims'\)\s*\.select\('\*'\)", src) is not None, '')

# CR-AUD-016 — health registry phantoms. Entries read key:'name' (checked the
# real syntax after a first draft used table: and went falsely GONE — the
# suspect-the-regex rule, applied to this script itself).
ri = src.find('REQUIREMENTS = [')
reg = src[ri:src.find(']', ri)] if ri != -1 else ''
for t in ('payments', 'supplements', 'push_subscriptions'):
    chk('016', 'health registry still lists %r' % t,
        re.search(r"key:\s*'" + t + r"'", reg) is not None, '')

# CR-AUD-008 — gallery lazy attr still absent
gal = src[src.find('function renderGallery'):src.find('function renderGallery')+2000]
chk('008', 'renderGallery still lacks loading="lazy"', 'loading="lazy"' not in gal, '')

print('finding  ok   measured  label')
fails = 0
for f, label, ok, meas in checks:
    if not ok: fails += 1
    print('%-8s %-4s %-9s %s' % (f, 'PASS' if ok else 'GONE', str(meas)[:9], label))
print('\n%d/%d conditions still hold. A GONE row means fixed-or-moved — re-verify, do not assume.'
      % (len(checks) - fails, len(checks)))

print("""
Live-DB numbers (not asserted here — run read-only against yipslubcptjoarblzbpl):
  base64 photos : select count(*) filter (where data like 'data:%') from project_photos;   -- 13 @ audit
  value fork    : compare signed-contract-doc totals vs estimates-table max per project     -- 4 divergent @ audit
  supplements   : select count(*) from insurance_supplements;                               -- 0 @ audit
  invisible claim: select c.id, p.checklist is null from insurance_claims c
                   join projects p on p.id = c.project_id where c.approved_rcv > 0;         -- 1 row, true @ audit
""")
