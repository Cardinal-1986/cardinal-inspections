#!/usr/bin/env python3
"""
Load the AccuLynx export (from fetch_acculynx.py) into Cardinal's Supabase.

WHAT ONE IMPORTED CLIENT IS
    A projects row in the EXACT shape the app's own AccuLynx importer
    (cr-ci-script, index.html:47018-47049) has written since build 252 — the
    blessed keys, nothing invented: lead.source='AccuLynx import',
    lead.job_number, lead.worktype, lead.assigned, lead.imported_at,
    lead.former_rep, lead.phone_alt, lead.insurance{...}. Plus, per Theo's
    11 Aug decision, claim_type is ALWAYS 'retail' at import — sorting to
    insurance/community happens afterwards, from the preserved data.

    Photos become project_photos rows (bytes in the photos bucket under
    projects/<id>/acx-*, `data` = the public URL — byte-for-byte the app
    uploader's own shape). PDFs become inspection_reports 'File:' rows —
    base64 in the html column, exactly like the Job Documents uploader —
    capped at 8 MB because a 6.4 MB payload has already failed in production
    once (index.html:15364). One audit_events row per client.

THE FOUR RULES THIS CODE IS SHAPED AROUND
    1. projects.checklist is a TEXT column holding a JSON STRING, and
       project_assigned_rep() does `ck::jsonb` WITH NO EXCEPTION GUARD —
       one malformed string makes RLS throw for EVERYONE and the whole
       client list dies. Every checklist is round-tripped through
       json.loads() before it is allowed anywhere near an insert.
    2. PO numbers live at checklist.po as NUMBERS. The app's nextPo() scans
       an in-memory cache and cannot be called in a loop; this script reads
       the live max once (1043 on 11 Aug) and increments locally. Do not run
       while someone is creating leads in the app.
    3. updated_at is the client list's sort key and the app loads EVERY row
       on boot — so created_at/updated_at are written from the job's real
       AccuLynx dates, and imported history does not bury live clients.
    4. Duplicates (11 Aug decision): a name+address match against an
       existing Cardinal client SKIPS the row and ATTACHES the AccuLynx
       files to the existing record. Every match is visible in --dry-run's
       collisions.csv before anything writes.

AUTH
    Same pattern as push_studio_tags.py, same reasons, several blocks copied
    from it verbatim: sign in as a real admin via the password grant with the
    public anon key; NEVER a service-role key (that never leaves Vercel's env
    vars). The token lives ~an hour and a full run can be longer, so: refresh
    proactively at 80% of the token's own exp claim, re-auth once per job on
    a rejection, and stop after 25 back-to-back failures rather than grind.

        export CARDINAL_EMAIL='theo@cardinalrenovations.net'
        export CARDINAL_PASSWORD='...'

USAGE — the gates, in order (details: ACCULYNX_MIGRATION.md)
    python3 push_acculynx.py --src /data/cardinal/acculynx --dry-run
        writes acculynx_review.csv + collisions.csv + a summary. NO writes.
    python3 push_acculynx.py --src /data/cardinal/acculynx --limit 5
        the pilot. Look at all five in the app before going further.
    python3 push_acculynx.py --src /data/cardinal/acculynx
        the real run. Resumable: re-run the same command after any
        interruption — pushed jobs are skipped, and a job whose projects row
        landed but whose files did not is completed, not duplicated.
    python3 push_acculynx.py --src /data/cardinal/acculynx --rollback <STAMP>
        deletes everything a batch wrote (the batch stamp is printed at the
        start of every push and lives in each row's lead.imported_at).
        Reads the run's own ledger for exact ids; asks you to type DELETE.

WHAT IS AND IS NOT VERIFIED
    PROVEN offline, by test_acculynx_push.py in this folder: the mapping
    (stage/rep/PO/insurance/collision), the checklist JSON gate, resume,
    attach-on-collision, the token-expiry recovery, and the stall-out — with
    a negative control that must lose jobs when the token stays dead.
    NOT PROVEN from the build sandbox: a real insert against production
    (egress is blocked there). That is what --limit 5 is for — run it, then
    look at the five clients in the app and let the session verify the rows
    over the database connection before the full run.

Standard library only. Nothing to install.
"""

import argparse, base64, csv, json, os, re, sys, time
import urllib.error, urllib.parse, urllib.request

SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co'
# The SAME publishable anon key api/*.js falls back to when the env var is
# unset — designed to be public (CLAUDE.md is explicit about it).
SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ'
UA = 'cardinal-migration-push/1.0'

DOC_CAP_BYTES = 8 * 1024 * 1024     # base64-in-a-column; 6.4 MB has failed before
PO_FLOOR = 1001                     # nextPo()'s own floor: first assigned is 1002

# AccuLynx milestone (Title Case, as milestone-history returns it) → STAGES
# value. normStage() collapses anything unrecognised to 'Lead', silently —
# so an unmapped milestone would quietly demote a Closed job to a fresh lead.
STAGE_MAP = {'lead': 'Lead', 'prospect': 'Prospect', 'approved': 'Approved',
             'completed': 'Completed', 'invoiced': 'Invoiced', 'closed': 'Closed',
             'cancelled': 'Lost', 'dead': 'Lost'}

# ── token machinery — copied from push_studio_tags.py, same hard-won reasons ──

TOKEN_TTL_S = 45 * 60
TOKEN_REFRESH_AT = 0.80
STALL_AFTER = 25

AUTH_MARKERS = ('claim timestamp check failed', 'jwt expired', 'jwt is expired',
                'token is expired', 'invalidjwt', 'invalid jwt')
AUTH_FATAL = (400, 401, 422)


def token_expiry(token):
    """Seconds this token has left, read from its own exp claim."""
    try:
        payload = token.split('.')[1]
        payload += '=' * (-len(payload) % 4)
        exp = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))['exp']
        return max(0, float(exp) - time.time())
    except Exception:
        return TOKEN_TTL_S


class ApiError(RuntimeError):
    """An HTTP failure that still knows its status code."""

    def __init__(self, msg, code):
        super().__init__(msg)
        self.code = code


def is_auth_failure(e):
    """True when an ApiError means 'your token is no longer good'.
    Storage wraps an expired token in HTTP 400 + a 403 body; PostgREST sends
    a clean 401. Match the message, never a bare 'exp' or '403'."""
    if getattr(e, 'code', None) in (401, 403):
        return True
    if getattr(e, 'code', None) == 400:
        s = str(e).lower()
        return any(m in s for m in AUTH_MARKERS)
    return False


def die(msg, code=1):
    print('ERROR: ' + msg, file=sys.stderr)
    sys.exit(code)


def get_token(email, password, tries=4):
    req = urllib.request.Request(
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
        data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY},
        method='POST')
    body = None
    for attempt in range(1, tries + 1):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                body = json.loads(r.read().decode('utf-8'))
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', 'replace')[:300]
            if e.code in AUTH_FATAL:
                die('Sign-in failed (%d): %s' % (e.code, detail))
            if attempt == tries:
                die('Sign-in failed (%d) after %d tries: %s' % (e.code, tries, detail))
            wait = 2 ** attempt
            print('  sign-in got %d, retrying in %ds (%d/%d)' % (e.code, wait, attempt, tries))
            time.sleep(wait)
        except Exception as e:
            if attempt == tries:
                die('Sign-in failed after %d tries: %s' % (tries, e))
            wait = 2 ** attempt
            print('  sign-in error (%s), retrying in %ds (%d/%d)' % (e, wait, attempt, tries))
            time.sleep(wait)
    tok = body.get('access_token')
    if not tok:
        die('Sign-in returned no access_token — check CARDINAL_EMAIL/CARDINAL_PASSWORD.')
    return tok


# ── REST / Storage plumbing ──────────────────────────────────────────────────

def _request(url, token, data=None, headers=None, method='GET', timeout=60):
    h = {'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY,
         'User-Agent': UA}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, raw
    except urllib.error.HTTPError as e:
        raise ApiError('%s %s failed (%d): %s' % (
            method, url.replace(SUPABASE_URL, ''), e.code,
            e.read().decode('utf-8', 'replace')[:300]), e.code)


def rest_get_all(token, table, select, extra=''):
    """Every row, paged with Range headers — PostgREST caps a single answer."""
    out, start, page = [], 0, 1000
    while True:
        url = '%s/rest/v1/%s?select=%s%s' % (SUPABASE_URL, table, select, extra)
        st, raw = _request(url, token, headers={
            'Range-Unit': 'items', 'Range': '%d-%d' % (start, start + page - 1)})
        got = json.loads(raw.decode('utf-8')) if raw.strip() else []
        out.extend(got)
        if len(got) < page:
            return out
        start += page


def rest_post(token, table, payload, params=''):
    url = '%s/rest/v1/%s%s' % (SUPABASE_URL, table, params)
    st, raw = _request(url, token,
                       data=json.dumps(payload).encode('utf-8'),
                       headers={'Content-Type': 'application/json',
                                'Prefer': 'return=representation'},
                       method='POST')
    got = json.loads(raw.decode('utf-8')) if raw.strip() else []
    # An RLS refusal is a silent empty array, not an error — check the rows,
    # not just the absence of an exception. (Same guard as push_studio_tags.)
    if not got:
        raise RuntimeError('%s insert saved nothing — RLS refused the write '
                           '(signed in as an admin?)' % table)
    return got


def rest_delete(token, table, filters):
    url = '%s/rest/v1/%s?%s' % (SUPABASE_URL, table, filters)
    st, raw = _request(url, token, headers={'Prefer': 'return=representation'},
                       method='DELETE')
    return json.loads(raw.decode('utf-8')) if raw.strip() else []


def storage_upload(token, path, data, content_type):
    st, raw = _request(
        SUPABASE_URL + '/storage/v1/object/photos/' + urllib.parse.quote(path),
        token, data=data,
        headers={'Content-Type': content_type, 'x-upsert': 'true'},
        method='POST', timeout=180)


def storage_delete(token, path):
    try:
        _request(SUPABASE_URL + '/storage/v1/object/photos/' + urllib.parse.quote(path),
                 token, method='DELETE')
        return True
    except ApiError:
        return False


def public_url(path):
    """The same URL shape the app's own uploader stores in project_photos.data
    (getPublicUrl). photoPathOf() can re-derive the storage path from it."""
    return SUPABASE_URL + '/storage/v1/object/public/photos/' + urllib.parse.quote(path)


# ── digging through the AccuLynx record (shapes are defensive on purpose) ────

def pick(d, *names, **kw):
    default = kw.get('default')
    if not isinstance(d, dict):
        return default
    for n in names:
        v = d.get(n)
        if v not in (None, ''):
            return v
    return default


def as_name(v):
    """A person-ish field can be a string or an object with name parts."""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        whole = pick(v, 'displayName', 'name', 'fullName')
        if whole:
            return str(whole).strip()
        bits = [pick(v, 'firstName', 'first'), pick(v, 'lastName', 'last')]
        return ' '.join(str(b).strip() for b in bits if b)
    return ''


def dig_contact(rec):
    """Primary contact: name, company, phones [{v,t}], emails [{v,t}]."""
    detail = rec.get('detail') or {}
    candidates = []
    for c in rec.get('contacts') or []:
        link = c.get('link') or {}
        merged = {}
        for src in (link.get('contact') if isinstance(link.get('contact'), dict) else link,
                    c.get('detail')):
            if isinstance(src, dict):
                merged.update(src)
        merged['_primary'] = bool(link.get('isPrimary'))
        candidates.append(merged)
    if isinstance(detail.get('contact'), dict):
        candidates.append(dict(detail['contact'], _primary=not candidates))
    candidates.sort(key=lambda c: not c.get('_primary'))
    primary = candidates[0] if candidates else {}

    phones, emails = [], []
    for c in candidates:
        for p in (c.get('phoneNumbers') or c.get('phones') or []):
            v = pick(p, 'phoneNumber', 'number', 'value') if isinstance(p, dict) else p
            t = (pick(p, 'type', 'phoneNumberType', default='') or '') if isinstance(p, dict) else ''
            if v and not any(x['v'] == v for x in phones):
                phones.append({'v': str(v), 't': str(t)})
        for e in (c.get('emailAddresses') or c.get('emails') or []):
            v = pick(e, 'emailAddress', 'email', 'address', 'value') if isinstance(e, dict) else e
            t = (pick(e, 'type', 'emailAddressType', default='') or '') if isinstance(e, dict) else ''
            if v and '@' in str(v) and not any(x['v'] == v for x in emails):
                emails.append({'v': str(v), 't': str(t)})
        for k in ('phoneNumber', 'phone', 'mobilePhone', 'homePhone', 'workPhone'):
            v = c.get(k)
            if v and not any(x['v'] == str(v) for x in phones):
                phones.append({'v': str(v), 't': k.replace('Phone', '') or 'phone'})
        v = c.get('emailAddress') or c.get('email')
        if v and '@' in str(v) and not any(x['v'] == str(v) for x in emails):
            emails.append({'v': str(v), 't': ''})

    name = as_name(primary) or as_name(detail.get('contact')) \
        or str(pick(detail, 'name', 'jobName', 'title', default='') or '').strip() \
        or str(pick(rec.get('job') or {}, 'name', 'jobName', default='') or '').strip()
    company = pick(primary, 'companyName', 'company', default='') or ''
    return {'name': name, 'company': str(company), 'phones': phones, 'emails': emails}


def dig_address(rec):
    """street/suite/city/state/zip plus the single display line."""
    # ⚠ locationAddress FIRST, and it is the one that actually fires: the live
    # API puts the job-site address there, nested inside the job — not as bare
    # street1/city keys on the job itself. Without it every one of the 166
    # imported clients lands with a completely blank address, which the old
    # fixtures could not show because they carried a flat `address` key that no
    # real record has. The contact's mailingAddress is the last resort, since a
    # roofer needs the roof's address, not where the bill goes.
    contact0 = ((rec.get('contacts') or [{}])[0] or {}) if rec.get('contacts') else {}
    for holder in ((rec.get('job') or {}).get('locationAddress') or {},
                   (rec.get('detail') or {}).get('locationAddress') or {},
                   rec.get('detail') or {}, rec.get('job') or {},
                   (rec.get('detail') or {}).get('jobSiteAddress') or {},
                   (rec.get('detail') or {}).get('address') or {},
                   (rec.get('job') or {}).get('address') or {},
                   (contact0.get('detail') or {}).get('mailingAddress') or {}):
        if not isinstance(holder, dict):
            continue
        a = holder.get('address') if isinstance(holder.get('address'), dict) else holder
        street = pick(a, 'streetAddress1', 'street1', 'addressLine1', 'street',
                      'address1', default='')
        suite = pick(a, 'streetAddress2', 'street2', 'addressLine2', 'address2',
                     default='') or ''
        city = pick(a, 'city', default='') or ''
        state = pick(a, 'state', 'stateAbbreviation', 'stateProvince', default='') or ''
        zipc = pick(a, 'zipCode', 'zip', 'postalCode', default='') or ''
        if isinstance(state, dict):
            state = pick(state, 'abbreviation', 'name', default='') or ''
        if street or city:
            line = ', '.join(x for x in [
                ' '.join(x for x in [str(street), str(suite)] if x),
                str(city), ' '.join(x for x in [str(state), str(zipc)] if x)] if x)
            return {'street': str(street), 'suite': str(suite), 'city': str(city),
                    'state': str(state), 'zip': str(zipc), 'country': 'USA',
                    'line': line}
    return {'street': '', 'suite': '', 'city': '', 'state': '', 'zip': '',
            'country': 'USA', 'line': ''}


def dig_milestone(rec):
    for holder in (rec.get('job') or {}, rec.get('detail') or {}):
        v = pick(holder, 'currentMilestone', 'milestone', 'milestoneName',
                 'currentMilestoneName')
        if isinstance(v, dict):
            v = pick(v, 'name', 'milestoneName')
        if v:
            return str(v)
    hist = rec.get('milestone_history') or []
    if hist:
        latest = max(hist, key=lambda h: str(h.get('date') or ''))
        return str(latest.get('name') or 'Lead')
    return 'Lead'


def dig_dates(rec):
    detail = rec.get('job') or {}
    detail2 = rec.get('detail') or {}
    created = pick(detail2, 'createdDate', 'createdAt', 'dateCreated', 'created') \
        or pick(detail, 'createdDate', 'createdAt', 'dateCreated', 'created')
    modified = pick(detail2, 'modifiedDate', 'modifiedAt', 'lastModified', 'updatedAt') \
        or pick(detail, 'modifiedDate', 'modifiedAt', 'lastModified', 'updatedAt')
    hist = rec.get('milestone_history') or []
    if not modified and hist:
        modified = max(str(h.get('date') or '') for h in hist) or None
    return created, (modified or created)


def dig_rep(rec):
    """(email, display_name) of the AccuLynx sales owner, best effort."""
    so = rec.get('sales_owner')
    if isinstance(so, dict):
        u = so.get('user') if isinstance(so.get('user'), dict) else so
        email = pick(u, 'email', 'emailAddress')
        if email or as_name(u):
            return (str(email).lower() if email else None, as_name(u))
    best = (None, '')
    for item in rec.get('representatives') or []:
        u = item.get('user') if isinstance(item.get('user'), dict) else item
        email = pick(u, 'email', 'emailAddress')
        nm = as_name(u)
        if str(item.get('type') or '') == 'SalesOwner':
            return (str(email).lower() if email else None, nm)
        if best == (None, '') and (email or nm):
            best = (str(email).lower() if email else None, nm)
    return best


def dig_insurance(rec):
    ins = rec.get('insurance') if isinstance(rec.get('insurance'), dict) else {}
    adj = rec.get('adjuster') if isinstance(rec.get('adjuster'), dict) else {}
    carrier = pick(ins, 'insuranceCompanyName', 'insuranceCompany', 'carrier',
                   'companyName', 'name')
    if isinstance(carrier, dict):
        carrier = pick(carrier, 'name', 'companyName')
    out = {
        'carrier': str(carrier) if carrier else None,
        'claim_number': pick(ins, 'claimNumber', 'claimNo'),
        'policy_number': pick(ins, 'policyNumber', 'policyNo'),
        'date_of_loss': pick(ins, 'dateOfLoss', 'lossDate'),
        'deductible': pick(ins, 'deductible', 'deductibleAmount'),
        'adjuster': {'name': as_name(adj) or pick(adj, 'adjusterName'),
                     'phone': pick(adj, 'phoneNumber', 'phone', 'mobilePhone'),
                     'email': pick(adj, 'emailAddress', 'email')},
        'source': 'AccuLynx import',
    }
    has = bool(out['carrier'] or out['claim_number'] or out['policy_number'])
    return out, has


def dig_worktype(rec):
    for holder in (rec.get('detail') or {}, rec.get('job') or {}):
        v = pick(holder, 'workType', 'tradeType', 'workTypes', 'tradeTypes', 'trades')
        if isinstance(v, list):
            names = [as_name(x) or str(pick(x, 'name', default='') or x) for x in v]
            names = [n for n in names if n]
            if names:
                return ', '.join(names)
        elif isinstance(v, dict):
            n = pick(v, 'name')
            if n:
                return str(n)
        elif v:
            return str(v)
    return None


# ── matching against what Cardinal already holds ─────────────────────────────

NORM_RE = re.compile(r'[^a-z0-9]+')


def norm_key(s):
    return NORM_RE.sub('', (s or '').lower())


def addr_num(s):
    m = re.search(r'\d+', s or '')
    return m.group(0) if m else ''


def parse_ck(raw):
    try:
        v = json.loads(raw or '{}')
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


def load_existing(token):
    """One read of every projects row → the three indexes the run needs.
    34 rows today; paged anyway so a post-import re-run still works."""
    rows = rest_get_all(token, 'projects', 'id,name,address,checklist')
    by_acx, by_jobnum, by_name, max_po = {}, {}, {}, PO_FLOOR
    for r in rows:
        ck = parse_ck(r.get('checklist'))
        lead = ck.get('lead') if isinstance(ck.get('lead'), dict) else {}
        po = ck.get('po')
        if isinstance(po, (int, float)) and po > max_po:
            max_po = int(po)
        if lead.get('acculynx_id'):
            by_acx[str(lead['acculynx_id'])] = r['id']
        if lead.get('source') == 'AccuLynx import' and lead.get('job_number'):
            by_jobnum[str(lead['job_number'])] = r['id']
        by_name.setdefault(norm_key(r.get('name')), []).append(
            (r['id'], r.get('address') or ''))
    return rows, by_acx, by_jobnum, by_name, max_po


def find_collision(name, address, by_name):
    """Same idea as the app's own findDuplicate(name, address), made explicit:
    the normalised names must match AND the street numbers must agree (or the
    whole normalised address must). Name-only matches are reported but NOT
    treated as the same client — two different Smiths exist."""
    for pid, addr in by_name.get(norm_key(name), []):
        n1, n2 = addr_num(address), addr_num(addr)
        if (n1 and n1 == n2) or (norm_key(address) and norm_key(address) == norm_key(addr)):
            return pid, addr
    return None, None


# ── the mapping: one AccuLynx record → what gets written ─────────────────────

def map_job(rec, roster, admin_email, po, batch):
    """Pure. Returns everything the writer needs, or raises ValueError when a
    record cannot make a safe row (no name)."""
    contact = dig_contact(rec)
    addr = dig_address(rec)
    name = contact['name'] or contact['company']
    if not name:
        raise ValueError('no usable client name on job %s' % rec.get('id'))

    milestone = dig_milestone(rec)
    stage = STAGE_MAP.get(milestone.strip().lower())
    warnings = []
    if stage is None:
        # normStage() would silently demote an unknown stage to 'Lead'; doing
        # it here instead makes the demotion VISIBLE in the review file.
        warnings.append('unmapped milestone %r -> Lead' % milestone)
        stage = 'Lead'

    hist = rec.get('milestone_history') or []
    stamps, stage_since = {}, None
    for h in hist:
        s = STAGE_MAP.get(str(h.get('name') or '').strip().lower())
        d = str(h.get('date') or '')
        if s and d:
            if d > str(stamps.get('t_' + s) or ''):
                stamps['t_' + s] = d
            if s == stage and d > str(stage_since or ''):
                stage_since = d
    created, modified = dig_dates(rec)
    stage_since = stage_since or created or time.strftime(
        '%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    stamps.setdefault('t_Lead', created or stage_since)

    rep_email, rep_name = dig_rep(rec)
    if rep_email and rep_email in roster:
        assigned, former = [rep_email], None
    else:
        assigned = [admin_email]
        former = rep_name or rep_email
        if former:
            warnings.append('rep %r not on the Cardinal roster -> assigned to %s'
                            % (former, admin_email))

    ins, has_ins = dig_insurance(rec)
    worktype = dig_worktype(rec)
    job_number = pick(rec.get('job') or {}, 'jobNumber', 'number', 'jobNo') \
        or pick(rec.get('detail') or {}, 'jobNumber', 'number', 'jobNo')
    notes = pick(rec.get('detail') or {}, 'description', 'notes')

    phones = contact['phones']
    emails = contact['emails']
    lead = {
        # 'retail' ALWAYS — Theo, 11 Aug: "All the clients will probably have
        # to be dumped into retail then sorted to insurance or community from
        # there". The insurance block below is the data that sorting reads.
        'claim_type': 'retail',
        'phone': phones[0]['v'] if phones else None,
        'email': emails[0]['v'] if emails else None,
        'notes': str(notes) if notes else None,
        'source': 'AccuLynx import',
        'job_number': str(job_number) if job_number else None,
        'worktype': worktype,
        'assigned': assigned,
        'imported_at': batch,
        'acculynx_id': str(rec.get('id')),
        'phones': phones,
        'emails': emails,
        'location': {k: addr[k] for k in
                     ('street', 'suite', 'city', 'state', 'zip', 'country')},
        'created_at': created or stage_since,
    }
    if contact['company']:
        lead['company'] = contact['company']
    if former:
        lead['former_rep'] = former
    if len(phones) > 1:
        lead['phone_alt'] = phones[1]['v']
    if has_ins:
        lead['insurance'] = ins

    ck = {'po': po, 'stage_since': stage_since, 'lead': lead}
    ck.update(stamps)
    # Compact separators match JS JSON.stringify byte-for-byte; ensure_ascii
    # off so a name like Muñoz stays readable in the profile.
    ck_str = json.dumps(ck, separators=(',', ':'), ensure_ascii=False)
    # THE POISON GUARD (rule 1 in the header). Refuse, never "fix up".
    parsed = json.loads(ck_str)
    if not isinstance(parsed, dict) or not isinstance(parsed.get('lead'), dict):
        raise ValueError('checklist failed the round-trip on job %s' % rec.get('id'))

    row = {
        'name': name,
        'address': addr['line'] or None,
        'phone': lead['phone'],
        'email': lead['email'],
        'notes': lead['notes'],
        'stage': stage,
        'created_by': admin_email,
        'checklist': ck_str,
    }
    if created:
        row['created_at'] = created
    if modified:
        row['updated_at'] = modified

    photos = [f for f in rec.get('files') or [] if f.get('kind') == 'photo']
    docs = [f for f in rec.get('files') or [] if f.get('kind') == 'doc']
    return {'row': row, 'photos': photos, 'docs': docs, 'name': name,
            'address': addr['line'], 'stage': stage, 'po': po,
            'rep': assigned[0], 'has_insurance': has_ins,
            'job_number': lead['job_number'], 'warnings': warnings}


# ── writers ──────────────────────────────────────────────────────────────────

CT_BY_EXT = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
             '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif',
             '.pdf': 'application/pdf'}


def existing_children(token, pid):
    """What this project already carries — so attaching and resuming never
    write the same photo row or doc row twice."""
    photos = rest_get_all(token, 'project_photos', 'storage_path',
                          '&project_id=eq.' + pid)
    docs = rest_get_all(token, 'inspection_reports', 'title',
                        '&project_id=eq.' + pid)
    return ({p.get('storage_path') for p in photos if p.get('storage_path')},
            {d.get('title') for d in docs if d.get('title')})


def find_by_acx(token, acx_id):
    """Is this AccuLynx job already a Cardinal row? Makes the projects insert
    effectively idempotent: an ambiguous network failure re-checks instead of
    re-inserting. checklist is TEXT, so a LIKE on the compact JSON works."""
    rows = rest_get_all(
        token, 'projects', 'id',
        '&checklist=like.' + urllib.parse.quote('*"acculynx_id":"%s"*' % acx_id))
    return rows[0]['id'] if rows else None


def push_children(token, pid, m, src_root, email, ledger, have_photos, have_docs):
    """Photos + docs + audit for one project. Idempotent via the have_* sets
    and the deterministic acx- storage paths."""
    wrote_p = wrote_d = skipped_big = 0
    for f in m['photos']:
        ext = os.path.splitext(f['path'])[1].lower()
        spath = 'projects/%s/acx-%s%s' % (pid, f['file_id'], ext)
        if spath in have_photos:
            continue
        with open(os.path.join(src_root, f['path']), 'rb') as fh:
            data = fh.read()
        storage_upload(token, spath, data, CT_BY_EXT.get(ext, 'image/jpeg'))
        row = {'project_id': pid, 'data': public_url(spath),
               'storage_path': spath, 'section': 'General',
               'caption': f.get('description') or '',
               'created_by': email}
        if f.get('captured_at'):
            row['created_at'] = f['captured_at']
        got = rest_post(token, 'project_photos', row)
        ledger({'kind': 'photo', 'id': got[0].get('id'), 'storage_path': spath,
                'project_id': pid})
        have_photos.add(spath)
        wrote_p += 1

    for f in m['docs']:
        title = 'File: ' + (f.get('name') or os.path.basename(f['path']))
        if title in have_docs:
            continue
        full = os.path.join(src_root, f['path'])
        size = os.path.getsize(full)
        if size > DOC_CAP_BYTES:
            skipped_big += 1
            continue
        with open(full, 'rb') as fh:
            b64 = base64.b64encode(fh.read()).decode('ascii')
        payload = json.dumps({'file': 1, 'name': f.get('name') or title[6:],
                              'mime': f.get('mime') or 'application/pdf',
                              'size': size,
                              'data': 'data:%s;base64,%s'
                                      % (f.get('mime') or 'application/pdf', b64)})
        got = rest_post(token, 'inspection_reports', {
            'title': title, 'project': m['name'], 'project_id': pid,
            'status': 'unsent', 'html': payload, 'created_by': email})
        ledger({'kind': 'doc', 'id': got[0].get('id'), 'project_id': pid})
        have_docs.add(title)
        wrote_d += 1

    return wrote_p, wrote_d, skipped_big


# ── the three modes ──────────────────────────────────────────────────────────

def load_manifest(src):
    path = os.path.join(src, 'jobs.jsonl')
    if not os.path.exists(path):
        die('no jobs.jsonl in %s — run fetch_acculynx.py first' % src)
    out = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def dry_run(args, token, email):
    recs = load_manifest(args.src)
    existing, by_acx, by_jobnum, by_name, max_po = load_existing(token)
    roster = {(r.get('email') or '').lower(): r.get('role')
              for r in rest_get_all(token, 'team_profiles', 'email,role')}
    print('existing Cardinal clients: %d · live max PO: %d · roster: %d emails'
          % (len(existing), max_po, len(roster)))

    batch = '(dry-run)'
    po = max_po
    # utf-8-sig so the files open cleanly in Excel on Theo's desktop.
    review_f = open(os.path.join(args.src, 'acculynx_review.csv'), 'w',
                    newline='', encoding='utf-8-sig')
    review = csv.writer(review_f)
    review.writerow(['status', 'name', 'address', 'stage', 'po', 'rep',
                     'insurance data', 'photos', 'docs', 'file MB',
                     'job number', 'warnings'])
    coll_f = open(os.path.join(args.src, 'collisions.csv'), 'w',
                  newline='', encoding='utf-8-sig')
    coll = csv.writer(coll_f)
    coll.writerow(['acculynx name', 'acculynx address', 'matches Cardinal client',
                   'their address', 'what will happen'])

    stages, n_new, n_coll, n_already, n_bad = {}, 0, 0, 0, 0
    tot_p = tot_d = tot_mb = 0.0
    unmatched = set()
    for rec in recs:
        acx = str(rec.get('id'))
        try:
            po += 1
            m = map_job(rec, roster, email, po, batch)
        except ValueError as e:
            n_bad += 1
            po -= 1
            review.writerow(['UNMAPPABLE', '', '', '', '', '', '', '', '', '',
                             '', str(e)])
            continue
        mb = sum((f.get('size') or 0) for f in m['photos'] + m['docs']) / 1e6
        for w in m['warnings']:
            if 'roster' in w:
                unmatched.add(w.split("'")[1] if "'" in w else w)
        if acx in by_acx or (m['job_number'] and m['job_number'] in by_jobnum):
            status = 'already imported'
            n_already += 1
            po -= 1
        else:
            pid, their_addr = find_collision(m['name'], m['address'], by_name)
            if pid:
                status = 'collision -> attach files'
                n_coll += 1
                po -= 1
                coll.writerow([m['name'], m['address'], pid, their_addr,
                               'no new client; %d photos + %d docs attach to the '
                               'existing record' % (len(m['photos']), len(m['docs']))])
            else:
                status = 'new'
                n_new += 1
                stages[m['stage']] = stages.get(m['stage'], 0) + 1
        tot_p += len(m['photos']); tot_d += len(m['docs']); tot_mb += mb
        review.writerow([status, m['name'], m['address'], m['stage'],
                         m['po'] if status == 'new' else '',
                         m['rep'], 'yes' if m['has_insurance'] else '',
                         len(m['photos']), len(m['docs']), '%.1f' % mb,
                         m['job_number'] or '', '; '.join(m['warnings'])])

    review_f.close()
    coll_f.close()
    print('\nDRY RUN — nothing was written.')
    print('  new clients        : %d' % n_new)
    for s in ('Lead', 'Prospect', 'Approved', 'Scheduled', 'Completed',
              'Invoiced', 'Closed', 'Lost'):
        if stages.get(s):
            print('      %-10s %d' % (s, stages[s]))
    print('  collisions (attach): %d   ← read collisions.csv before pushing' % n_coll)
    print('  already imported   : %d' % n_already)
    print('  unmappable         : %d' % n_bad)
    print('  files              : %d photos, %d docs, %.0f MB total'
          % (tot_p, tot_d, tot_mb))
    if unmatched:
        print('  reps not on roster : %s (their clients land on %s, name kept in former_rep)'
              % (', '.join(sorted(unmatched)), email))
    print('\nreview : %s' % os.path.join(args.src, 'acculynx_review.csv'))
    print('matches: %s' % os.path.join(args.src, 'collisions.csv'))


def push(args, email, password):
    recs = load_manifest(args.src)
    state_path = os.path.join(args.src, 'jobs.jsonl.pushed.json')
    pushed = set(json.load(open(state_path))) if os.path.exists(state_path) else set()

    token = get_token(email, password)
    refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT
    print('token good for %d min' % round(token_expiry(token) / 60))

    existing, by_acx, by_jobnum, by_name, max_po = load_existing(token)
    roster = {(r.get('email') or '').lower(): r.get('role')
              for r in rest_get_all(token, 'team_profiles', 'email,role')}
    batch = args.batch or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    ledger_path = os.path.join(args.src,
                               'push_ledger_%s.jsonl' % re.sub(r'[^\w]', '', batch))
    ledger_f = open(ledger_path, 'a', encoding='utf-8')

    def ledger(entry):
        entry['batch'] = batch
        ledger_f.write(json.dumps(entry) + '\n')
        ledger_f.flush()

    todo = [r for r in recs if str(r.get('id')) not in pushed]
    if args.limit:
        todo = todo[:args.limit]
    print('%d in the manifest, %d already pushed, %d to do%s'
          % (len(recs), len(pushed), len(todo), ' (limited)' if args.limit else ''))
    print('batch stamp: %s   (rollback needs this — it is also in every row)' % batch)
    print('existing clients: %d · starting PO: %d' % (len(existing), max_po + 1))
    if not todo:
        return

    po = max_po
    ok = failed = consecutive = 0
    n_new = n_attach = n_photos = n_docs = n_big = 0
    stalled = False

    for i, rec in enumerate(todo, 1):
        acx = str(rec.get('id'))

        if time.time() >= refresh_at:
            print('  refreshing the access token (%d min left on it)'
                  % round(token_expiry(token) / 60))
            token = get_token(email, password)
            refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT

        try:
            po += 1
            m = map_job(rec, roster, email, po, batch)
        except ValueError as e:
            po -= 1
            failed += 1
            consecutive += 1
            print('  [%d/%d] UNMAPPABLE %s — %s' % (i, len(todo), acx, e))
            if consecutive >= STALL_AFTER:
                stalled = True
                break
            continue

        attempt, err, reauthed, spent = 0, None, False, False
        while attempt < 3:
            attempt += 1
            try:
                pid = by_acx.get(acx) or (m['job_number'] and
                                          by_jobnum.get(m['job_number']))
                mode = 'resume' if pid else None
                if not pid:
                    cpid, _ = find_collision(m['name'], m['address'], by_name)
                    if cpid:
                        pid, mode = cpid, 'attach'
                if not pid:
                    # Ambiguity guard: a timed-out insert may have landed.
                    pid = find_by_acx(token, acx)
                    mode = 'resume' if pid else None
                if not pid:
                    got = rest_post(token, 'projects', m['row'])
                    pid = got[0]['id']
                    mode = 'new'
                    # The PO in this row is now in the database — from here on
                    # a failure must NOT hand the same number to the next job.
                    spent = True
                    ledger({'kind': 'project', 'id': pid})
                    by_acx[acx] = pid
                    by_name.setdefault(norm_key(m['name']), []).append(
                        (pid, m['address'] or ''))

                if mode == 'new':
                    have_p, have_d = set(), set()
                else:
                    have_p, have_d = existing_children(token, pid)

                wp, wd, big = push_children(token, pid, m, args.src, email,
                                            ledger, have_p, have_d)
                if mode == 'new' or wp or wd:
                    detail = ('Imported from AccuLynx: %s (%d photos, %d docs)'
                              % (m['name'], wp, wd)) if mode == 'new' else \
                             ('AccuLynx files attached to existing client: %s '
                              '(%d photos, %d docs)' % (m['name'], wp, wd))
                    got = rest_post(token, 'audit_events', {
                        'email': email, 'type': 'import',
                        'detail': detail[:300], 'project_id': pid})
                    ledger({'kind': 'audit', 'id': got[0].get('id'),
                            'project_id': pid})
                err = None
                n_photos += wp; n_docs += wd; n_big += big
                if mode == 'new':
                    n_new += 1
                else:
                    n_attach += 1
                    po -= 1        # no row was created; the number is not spent
                break
            except (ApiError, RuntimeError) as e:
                err = e
                # Same recovery as push_studio_tags.py: an expired token is the
                # one failure a long run is guaranteed to meet. Sign in again,
                # once per job, then retry; everything written so far is safe
                # because every writer above is idempotent (deterministic
                # storage paths, have_* sets, find_by_acx re-check).
                if is_auth_failure(e) and not reauthed:
                    reauthed = True
                    print('  token rejected (%s) — signing in again'
                          % getattr(e, 'code', '?'))
                    token = get_token(email, password)
                    refresh_at = time.time() + token_expiry(token) * TOKEN_REFRESH_AT
                    continue
                if getattr(e, 'code', None) in (429, 502, 503):
                    time.sleep(1.5 * attempt)
                    continue
                break
            except Exception as e:
                err = e
                time.sleep(1.5 * attempt)

        if err is not None:
            if not spent:
                po -= 1
            failed += 1
            consecutive += 1
            print('  [%d/%d] FAILED %s (%s) — %s' % (i, len(todo), acx, m['name'], err))
            if consecutive >= STALL_AFTER:
                stalled = True
                print('  STOPPING: %d in a row failed, last error above. Nothing is '
                      'landing; fix that before re-running.' % consecutive)
                break
            continue

        pushed.add(acx)
        ok += 1
        consecutive = 0
        json.dump(sorted(pushed), open(state_path, 'w'))
        if i % 10 == 0 or i == len(todo):
            print('  [%d/%d] %d new, %d attached, %d photos, %d docs (%d failed)'
                  % (i, len(todo), n_new, n_attach, n_photos, n_docs, failed))

    json.dump(sorted(pushed), open(state_path, 'w'))
    ledger_f.close()
    print('\ndone: %d ok (%d new clients, %d attach-only), %d photos, %d docs, '
          '%d failed' % (ok, n_new, n_attach, n_photos, n_docs, failed))
    if n_big:
        print('%d document(s) over the 8 MB cap were left out — they are still '
              'in the export folder; see ACCULYNX_MIGRATION.md for options.' % n_big)
    print('ledger: %s  (rollback reads this)' % ledger_path)
    print('batch : %s' % batch)
    if stalled:
        sys.exit(2)


def rollback(args, email, password):
    stamp = args.rollback
    ledger_path = os.path.join(args.src,
                               'push_ledger_%s.jsonl' % re.sub(r'[^\w]', '', stamp))
    entries = []
    if os.path.exists(ledger_path):
        with open(ledger_path, encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
    elif not args.no_ledger:
        die('no ledger for batch %s at %s.\n  The ledger holds the exact ids of '
            'everything the batch wrote — including files attached to '
            'PRE-EXISTING clients, which cannot be found any other way. Find '
            'the ledger file the push printed, or pass --no-ledger to fall '
            'back to the imported_at stamp (whole imported clients only).'
            % (stamp, ledger_path))

    token = get_token(email, password)
    projects = [e for e in entries if e['kind'] == 'project']
    photos = [e for e in entries if e['kind'] == 'photo']
    docs = [e for e in entries if e['kind'] == 'doc']
    audits = [e for e in entries if e['kind'] == 'audit']

    if not entries:
        rows = rest_get_all(
            token, 'projects', 'id',
            '&checklist=like.' + urllib.parse.quote('*"imported_at":"%s"*' % stamp))
        projects = [{'kind': 'project', 'id': r['id']} for r in rows]
        print('ledger-less: found %d imported clients by stamp; attached files '
              'on pre-existing clients CANNOT be found this way.' % len(projects))

    print('batch %s would remove: %d clients, %d photo rows (+objects), %d docs, '
          '%d audit rows' % (stamp, len(projects), len(photos), len(docs), len(audits)))
    if input('type DELETE to proceed: ').strip() != 'DELETE':
        die('nothing deleted')

    for e in docs:
        rest_delete(token, 'inspection_reports', 'id=eq.%s' % e['id'])
    for e in audits:
        rest_delete(token, 'audit_events', 'id=eq.%s' % e['id'])
    for e in photos:
        rest_delete(token, 'project_photos', 'id=eq.%s' % e['id'])
        if e.get('storage_path'):
            storage_delete(token, e['storage_path'])
    n = 0
    for e in projects:
        # children first even ledger-less: a project row that still has photo
        # rows pointing at it should not leave orphans behind.
        for p in rest_get_all(token, 'project_photos', 'id,storage_path',
                              '&project_id=eq.' + e['id']):
            rest_delete(token, 'project_photos', 'id=eq.%s' % p['id'])
            if p.get('storage_path'):
                storage_delete(token, p['storage_path'])
        rest_delete(token, 'inspection_reports', 'project_id=eq.%s' % e['id'])
        rest_delete(token, 'audit_events', 'project_id=eq.%s' % e['id'])
        got = rest_delete(token, 'projects', 'id=eq.%s' % e['id'])
        n += len(got)
    print('removed %d clients and their children. The app shows it on next reload.' % n)


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', required=True, help='the fetch_acculynx.py --dest folder')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0, help='pilot: push only N jobs')
    ap.add_argument('--batch', default=None,
                    help='reuse a batch stamp when resuming that batch')
    ap.add_argument('--rollback', default=None, metavar='STAMP',
                    help='delete everything the batch with this stamp wrote')
    ap.add_argument('--no-ledger', action='store_true',
                    help='rollback via the imported_at stamp when the ledger is lost')
    args = ap.parse_args()

    email = os.environ.get('CARDINAL_EMAIL', '').strip()
    password = os.environ.get('CARDINAL_PASSWORD', '')
    if not email or not password:
        die('Set CARDINAL_EMAIL and CARDINAL_PASSWORD as environment variables '
            'first — an admin login (the import writes as you).')

    if args.rollback:
        rollback(args, email, password)
    elif args.dry_run:
        token = get_token(email, password)
        dry_run(args, token, email)
    else:
        push(args, email, password)


if __name__ == '__main__':
    main()
