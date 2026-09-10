#!/usr/bin/env python3
"""Build 1212 - retire api/estimate-to-contract.js.

Audit item 8, and it is a DELETION, so it waited for Theo's word (10 Sep).

WHY IT IS SAFE, MEASURED RATHER THAN ASSUMED. Three separate facts, each
checked against the shipped tree rather than against the doc that proposed it:

  1. NOTHING CALLS IT. `estimate-to-contract` appears in index.html exactly
     three times and not one is a call: a bullet in the build-148 install
     instructions, a CHANGELOG entry from 1199 (history - never edited), and
     `auditLog('estimate_to_contract', ...)`, which is an EVENT TYPE string
     that happens to share the words. No api/*.js imports it; vercel.json's
     functions block does not name it; sw.js does not mention it.

  2. THE "-> Contract" BUTTON DOES NOT USE IT. cr-e2c's handleClick() calls a
     module-local generate() and writes the contract from the browser. That
     button is live and 1205 measured it in the header; it keeps working. This
     was the one fact worth getting wrong, so it was read in full rather than
     inferred from the route's name.

  3. IT COULD NOT HAVE RUN ANYWAY. Its select names `client_name` and
     `estimate` - columns `projects` has never had - so every call 404s before
     any of its logic. That is the 9 Sep assessment's finding, and it is why
     1197's audit-row repair and 1199's authorization fix both landed on a
     route nothing could reach.

WHAT THIS BUILD DOES NOT DO. It does not touch the `contracts` table, which
the browser reads and writes directly at nine sites, and it does not touch
contracts_setup.sql. Retiring a dead HTTP route is not retiring the feature.

harness_653's P1 section is repaired in the same change, not deleted: it
covers five other live things (P2-P6), and its four route checks had ALREADY
gone stale - it asserts `api('/api/estimate-to-contract'` is in index.html and
that string has not been there for some time. P1 now asserts the route is gone
and that nothing calls it, so the same section keeps watching the same subject
from the other side.

Usage: patch_1212.py --src in.html --dst out.html [--harness harness_653.js]
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

BULLET_OLD = "      \u2022 Add api/estimate-to-contract.js to your repo\n"
BULLET_NEW = (
"      \u2022 (api/estimate-to-contract.js was RETIRED at build 1212 -- nothing\n"
"        called it, and its select named columns `projects` has never had, so\n"
"        every call 404'd. The \u2192 Contract button builds the contract in the\n"
"        browser via cr-e2c and is unaffected. Do not re-add this route.)\n"
)

STAMP_OLD = ">v2026-09-10 build 1211<button"
STAMP_NEW = ">v2026-09-10 build 1212<button"

CL_OLD = "var CHANGELOG = [\n"
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: 1212, d: '2026-09-10', t: 'A dead server route is gone \\u2014 nothing you use changes', "
"s: 'Housekeeping, and nothing on any screen moves. An old server route called <b>estimate-to-contract</b> "
"has been removed. It has not worked in a long time: it asked the database for two columns that do not exist, "
"so every call to it failed before it did anything \\u2014 and nothing in the app had called it for a long time "
"either. The <b>\\u2192 Contract</b> button on an estimate does not use it and never did; it builds the contract "
"in the app itself, and it is untouched. Your contracts, the contracts list and the signing flow are all "
"unaffected. Removing it means the next person reading this code does not spend an afternoon fixing something "
"that nothing calls \\u2014 which has already happened twice.' },\n"
)

# ---------------------------------------------------------------- harness_653
H_OLD = """console.log('\\n\u2500\u2500 P1: Convert-to-Contract endpoint name \u2500\u2500');
ok('the functional fetch call uses the hyphenated path', SRC.includes("api('/api/estimate-to-contract'"));
ok('the underscore path is gone from functional code', !SRC.includes("api('/api/estimate_to_contract'"));
ok('the setup-instructions comment matches the real filename', SRC.includes('Add api/estimate-to-contract.js to your repo'));
{
  const apiFile = fs.readFileSync('/home/user/cardinal-inspections/api/estimate-to-contract.js', 'utf8');
  ok('the api file itself exists and its header names itself correctly',
    apiFile.startsWith('// api/estimate-to-contract.js'));
}"""

H_NEW = """console.log('\\n\u2500\u2500 P1: Convert-to-Contract \u2014 the ROUTE IS RETIRED (1212) \u2500\u2500');
/* 653 checked that the client called the hyphenated path and that the file
   existed. Build 1212 deleted the route: nothing called it, and its select
   named `client_name` and `estimate`, columns `projects` has never had, so
   every call 404'd before reaching any of its logic.

   \u26a0 THESE FOUR CHECKS HAD ALREADY GONE STALE BEFORE 1212 TOUCHED THEM. The
   first asserted `api('/api/estimate-to-contract'` was in index.html and that
   string had not been there for some time, so this section was red on a
   healthy app - the same failure mode as test_leadnotify901. Inverting it
   keeps the section watching the same subject from the other side, instead of
   deleting coverage because its answer changed. The rest of this file (P2-P6)
   covers five other live things and is untouched. */
ok('no functional call to the route survives, in either spelling',
  !SRC.includes("api('/api/estimate-to-contract'") && !SRC.includes("api('/api/estimate_to_contract'"));
ok('the install instructions no longer tell anyone to add it',
  !SRC.includes('\u2022 Add api/estimate-to-contract.js to your repo'));
ok('...and say plainly that it was retired, so it is not re-added',
  SRC.includes('was RETIRED at build 1212'));
ok('the api file is gone from the repo',
  !fs.existsSync('/home/user/cardinal-inspections/api/estimate-to-contract.js'));
ok('the \u2192 Contract button still builds the contract in the browser (cr-e2c is untouched)',
  SRC.includes("btn.id = 'cr-e2c-btn';") && SRC.includes('var docId = await generate(est, project);'));
ok('the contracts TABLE is still read and written by the client - the feature stays',
  (SRC.match(/from\\('contracts'\\)/g) || []).length >= 8);"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    ap.add_argument('--harness', default=None)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    # the three occurrences, named, before anything is removed
    hits = orig.count('estimate-to-contract')
    assert hits == 2, 'expected 2 hyphenated hits (install bullet + 1199 changelog), found %d' % hits
    assert orig.count("auditLog('estimate_to_contract'") == 1, 'the audit EVENT TYPE moved'

    src = pl.sub(src, BULLET_OLD, BULLET_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_OLD, CL_NEW)

    # the 1199 changelog entry is HISTORY and must survive byte-for-byte
    assert src.count('The old estimate-to-contract route checks that you are on the job') == 1, \
        'the 1199 changelog entry was disturbed - history is never edited'
    # the audit event type is a different thing that merely shares the words
    assert src.count("auditLog('estimate_to_contract'") == 1

    # cr-e2c is the live path and must not move
    for frag in ("btn.id = 'cr-e2c-btn';",
                 'var docId = await generate(est, project);',
                 "from('contracts')"):
        assert orig.count(frag) == src.count(frag), 'the live contract path moved: ' + frag

    assert orig.count('build 1211') - src.count('build 1211') == 1
    assert src.count('{ b: 1212,') == 1
    assert src.count('{ b: 1211,') == orig.count('{ b: 1211,') == 1

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '>v2026-09-10 build 1212<button')
    pl.assert_in(a.dst, 'was RETIRED at build 1212')

    if a.harness:
        h = pl.load(a.harness)
        h0 = h
        h = pl.sub(h, H_OLD, H_NEW)
        # P2-P6 are untouched: their section banners must all survive
        for banner in ('P2: AI-estimate Send', 'P3: team invite',
                       'P4: photo payload', 'P5: the invisible claim',
                       'P6: buried tools exposed'):
            assert h0.count(banner) == h.count(banner) == 1, 'a live section moved: ' + banner
        assert 'readFileSync(\'/home/user/cardinal-inspections/api/estimate-to-contract.js\'' not in h
        pl.write_atomic(a.harness, h)
        print('harness_653.js P1 inverted (%+d chars); P2-P6 untouched' % (len(h) - len(h0)))

    print('index.html %+d chars (install note, stamp, changelog). '
          'Now: git rm api/estimate-to-contract.js' % (len(src) - len(orig)))


if __name__ == '__main__':
    main()
