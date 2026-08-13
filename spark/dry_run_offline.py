#!/usr/bin/env python3
"""
Run the migration's gate 3 (the dry run) WITHOUT the Cardinal admin password.

WHY THIS EXISTS
    push_acculynx.py --dry-run writes nothing to Cardinal, but it still signs
    in as an admin, because it needs two plain READS: every projects row (for
    collision detection and the live max PO) and team_profiles (the roster).

    ACCULYNX_MIGRATION.md's credentials fence says the admin password should
    live only in a terminal Theo controls. This script honours that fence for
    the review step: it takes those two reads as a JSON file — produced by
    whoever DOES have database access, e.g. a session on the Supabase
    connector — and runs the SHIPPED dry_run() against them.

    Everything that decides what would be written is untouched shipped code:
    load_existing(), map_job(), find_collision(), the PO ladder and the
    checklist poison guard. This file swaps the transport for two reads and
    nothing else. It cannot write to Cardinal: it never obtains a token, and
    the only Supabase entry points are stubbed out.

PRODUCING THE INPUT
    Run these two queries and drop the results into one JSON file shaped
    {"projects": [...], "team_profiles": [...]}:

      select id, name, address,
             (checklist::jsonb->>'po')::int              as po,
             checklist::jsonb->'lead'->>'acculynx_id'    as acculynx_id,
             checklist::jsonb->'lead'->>'source'         as source,
             checklist::jsonb->'lead'->>'job_number'     as job_number
      from projects
      where pg_input_is_valid(coalesce(checklist,'null'),'jsonb');

      select email, role from team_profiles;

    ⚠ That file contains real client names and addresses. Keep it out of the
    repo and delete it when the review is done.

USAGE
    python3 dry_run_offline.py --src ./acculynx_export \\
                              --existing ./existing.json \\
                              --expect-projects 34 --expect-max-po 1043

    The --expect-* flags are optional but recommended: they assert the input
    against numbers read straight from the database. A silently SHORT existing
    list would under-report collisions, and under-reported collisions are the
    one failure this gate exists to prevent — so it refuses to guess.

Standard library only. Nothing to install.
"""

import argparse, importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_push_module():
    path = os.path.join(HERE, 'push_acculynx.py')
    if not os.path.exists(path):
        sys.exit('ERROR: push_acculynx.py must sit beside this script')
    spec = importlib.util.spec_from_file_location('push', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True,
                    help='the fetch_acculynx.py export folder (holds jobs.jsonl)')
    ap.add_argument('--existing', required=True,
                    help='JSON with {"projects":[...], "team_profiles":[...]}')
    ap.add_argument('--admin-email', default='theo@cardinalrenovations.net',
                    help='who unrostered reps fall back to, as in a real run')
    ap.add_argument('--expect-projects', type=int,
                    help='assert the projects count read from the database')
    ap.add_argument('--expect-max-po', type=int,
                    help='assert the live max PO read from the database')
    args = ap.parse_args()

    push = load_push_module()

    with open(args.existing, encoding='utf-8') as f:
        data = json.load(f)
    projects = data.get('projects') or []
    roster_rows = data.get('team_profiles') or []
    if not projects or not roster_rows:
        sys.exit('ERROR: --existing needs non-empty "projects" and "team_profiles"')

    # Fail loudly on a short read rather than quietly missing collisions.
    if args.expect_projects is not None and len(projects) != args.expect_projects:
        sys.exit('ERROR: %d projects in the file, %d expected from the database'
                 % (len(projects), args.expect_projects))
    pos = [p['po'] for p in projects if isinstance(p.get('po'), int)]
    if args.expect_max_po is not None and (not pos or max(pos) != args.expect_max_po):
        sys.exit('ERROR: max PO is %s in the file, %d expected from the database'
                 % (max(pos) if pos else None, args.expect_max_po))

    # Rebuild exactly what rest_get_all(token,'projects','id,name,address,checklist')
    # returns — checklist as a JSON *string*, which is how the column stores it.
    project_rows = [{
        'id': p.get('id'),
        'name': p.get('name'),
        'address': p.get('address'),
        'checklist': json.dumps({
            'po': p.get('po'),
            'lead': {'acculynx_id': p.get('acculynx_id'),
                     'source': p.get('source'),
                     'job_number': p.get('job_number')},
        }),
    } for p in projects]

    def fake_rest_get_all(token, table, select, extra=''):
        if table == 'projects':
            return project_rows
        if table == 'team_profiles':
            return roster_rows
        raise AssertionError('dry_run read an unexpected table: %r' % table)

    def refuse(*a, **k):
        raise AssertionError('offline dry run attempted a WRITE — this must '
                             'never happen; the shipped dry_run() only reads')

    push.rest_get_all = fake_rest_get_all
    # Belt and braces: if a future dry_run() ever grew a write, fail loudly
    # instead of reaching production.
    push.rest_post = refuse
    push.rest_delete = refuse
    push.storage_upload = refuse
    push.storage_delete = refuse
    push.get_token = refuse

    push.dry_run(argparse.Namespace(src=args.src), token=None,
                 email=args.admin_email)


if __name__ == '__main__':
    main()
