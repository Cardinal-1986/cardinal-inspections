#!/usr/bin/env python3
"""Build 1208 — the Lead form stops refusing a phone-in (audit option 7b, A1).

Walk 3: the + button opens two doors with two rulebooks. **Contact** saves a lead
from a name alone. **Lead** is a 1,603px form on the phone that refuses with
"Required: First Name, Last Name, Street, City, State, Zip" — and then, once you
fill the minimum, refuses AGAIN with "Required: State", because the State select
has no Ohio default in a company that works Dayton, Ohio.

A rep at a door learns to use Contact and never enters an address; a rep at a
desk fights the Lead form. This is the half that only ever PERMITS more:

  * State defaults to OH on open. Cardinal is a Dayton company; every other
    state stays one tap away.
  * The address block is required only when a **Job Category** is set. No
    category means a phone-in — a name and a way to reach them is a lead, and
    the address arrives when the job does. Category lives inside "+ More detail",
    so a rep who never opens it is never asked for an address.
  * The labels stop lying: Street/City/State/Zip lose their "*" and the block
    says what actually makes them required.

⚠ WHAT THIS DELIBERATELY DOES NOT DO. Option 7a — making the Contact door
REQUIRE a phone or an email — takes away a save that works today, and 7c rebuilds
both doors into one. Both are Theo's to say yes to; neither is in this build.

Usage: patch_1208.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ------------------------------------------------------ 1. Ohio by default
RESET_OLD = (
"  ['ldState','ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage'].forEach(function(id){\n"
"    var el = document.getElementById(id); if(el) el.value = '';\n"
"  });\n"
)
RESET_NEW = (
"  ['ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage'].forEach(function(id){\n"
"    var el = document.getElementById(id); if(el) el.value = '';\n"
"  });\n"
"  /* 1208 (audit 7b): Ohio by default. Cardinal works Dayton; the walk filled\n"
"     every field it was asked for and was still refused with \"Required: State\",\n"
"     because this select opened empty. Every other state is one tap away, and\n"
"     the address autocomplete still overwrites it (ldState is set from the\n"
"     Google place when one is picked). */\n"
"  var _ldSt = document.getElementById('ldState');\n"
"  if(_ldSt instanceof HTMLSelectElement) _ldSt.value = 'OH';\n"
)

# --------------------------------- 2. the address is the JOB's, not the lead's
REQ_OLD = (
"  var missing = [];\n"
"  if(!first) missing.push('First Name');\n"
"  if(!last) missing.push('Last Name');\n"
"  if(!street) missing.push('Street');\n"
"  if(!city) missing.push('City');\n"
"  if(!state) missing.push('State');\n"
"  if(!zip) missing.push('Zip');\n"
"  if(missing.length){ err.textContent = 'Required: ' + missing.join(', '); return; }\n"
)
REQ_NEW = (
"  var missing = [];\n"
"  if(!first) missing.push('First Name');\n"
"  if(!last) missing.push('Last Name');\n"
"  /* 1208 (audit 7b): the address belongs to a JOB, not to a lead. A phone-in is\n"
"     a name and a way to reach them; the address arrives when the job does. So it\n"
"     is required exactly when a Job Category says there is a job — and Job\n"
"     Category lives inside \"+ More detail\", so a rep taking a call at a door is\n"
"     never asked for it. Nothing here refuses a save that used to work. */\n"
"  var _cat = document.getElementById('ldCategory');\n"
"  /* the instanceof is a real narrowing, not decoration: gate_types runs tsc\n"
"     --checkJs over these blocks and .value on an HTMLElement is TS2339. */\n"
"  var _needAddr = !!(_cat instanceof HTMLSelectElement && _cat.value);\n"
"  if(_needAddr){\n"
"    if(!street) missing.push('Street');\n"
"    if(!city) missing.push('City');\n"
"    if(!state) missing.push('State');\n"
"    if(!zip) missing.push('Zip');\n"
"  }\n"
"  if(missing.length){\n"
"    err.textContent = 'Required: ' + missing.join(', ') +\n"
"      (_needAddr ? ' \\u2014 a Job Category needs the address of the job' : '');\n"
"    return;\n"
"  }\n"
)

# ------------------------------------------------- 3. the labels stop lying
HEAD_OLD = '<div class="ldhead">Location Information <span class="ldreq">* Required</span></div>'
HEAD_NEW = ('<div class="ldhead">Location Information '
            '<span class="ldreq">Needed once you set a Job Category</span></div>')

ST_OLD = '<label style="position:relative;">Street *\n'
ST_NEW = '<label style="position:relative;">Street\n'
CITY_OLD = '<label>City *'
CITY_NEW = '<label>City'
STATE_OLD = '<label>State *'
STATE_NEW = '<label>State'
ZIP_OLD = '<label>Zip *'
ZIP_NEW = '<label>Zip'

STAMP_OLD = ">v2026-09-10 build 1207<"
STAMP_NEW = ">v2026-09-10 build 1208<"

CL_ANCHOR = "var CHANGELOG = [\n"
CL_ENTRY = (
    "  { b: 1208, d: '2026-09-10', "
    "t: 'The Lead form stops refusing a phone call', "
    "s: 'Taking a lead over the phone meant fighting the long Lead form: it refused "
    "to save without a <b>street, city, state and zip</b>, and then refused a second "
    "time with \\u201cRequired: State\\u201d even after you had filled everything, "
    "because the state box opened blank. <b>It opens on OH now</b> \\u2014 every other "
    "state is still one tap away \\u2014 and <b>the address is only required once you "
    "set a Job Category</b>. A name and a way to reach someone is a lead; the address "
    "arrives when the job does. Nothing you could save before has stopped being "
    "savable, and the address boxes no longer carry a star that was not telling you "
    "the truth.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--dst', default=None)
    a = ap.parse_args()
    dst = a.dst or a.src

    src = pl.load(a.src)
    orig = src

    src = pl.sub(src, RESET_OLD, RESET_NEW)
    src = pl.sub(src, REQ_OLD, REQ_NEW)
    src = pl.sub(src, HEAD_OLD, HEAD_NEW)
    src = pl.sub(src, ST_OLD, ST_NEW)
    src = pl.sub(src, CITY_OLD, CITY_NEW)
    src = pl.sub(src, STATE_OLD, STATE_NEW)
    src = pl.sub(src, ZIP_OLD, ZIP_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_ANCHOR, CL_ANCHOR + CL_ENTRY)

    # First/Last are still unconditional — this build must not have loosened them
    assert src.count("if(!first) missing.push('First Name');") == 1
    assert src.count("if(!last) missing.push('Last Name');") == 1
    # the four address pushes moved inside the guard, and did not multiply
    for f in ('Street', 'City', 'State', 'Zip'):
        assert src.count("missing.push('%s');" % f) == 1, f
    assert src.count("var _needAddr = !!(_cat instanceof HTMLSelectElement && _cat.value);") == 1
    # ldState is no longer blanked with the other selects, and is set to OH
    assert "'ldState','ldCategory'" not in src
    assert src.count("if(_ldSt instanceof HTMLSelectElement) _ldSt.value = 'OH';") == 1
    # the Google-place path that also writes ldState is untouched
    assert src.count("if(code) document.getElementById('ldState').value = code;") == 1

    pl.write_atomic(dst, src)
    print('patched  ->', dst)
    print('  delta bytes:', len(src) - len(orig))


if __name__ == '__main__':
    main()
