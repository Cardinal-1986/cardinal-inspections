#!/usr/bin/env python3
"""patch_H_gates.py <scripts-dir> <out-dir> -- the minimal gate updates patch_H.py needs.

gate_1005.mjs  S3 "both answered" picked the New Lead source by its old spelling,
               'Door Knocking'. #18 gives the New Lead form the client page's
               vocabulary, where that source is spelled 'Door knock', so setting
               .value = 'Door Knocking' now selects nothing and S3 reads as "no
               source picked". The gate is about Lead Source being REQUIRED (1005),
               not about the spelling; the value it uses is now the option the
               form actually offers. S1/S2 are untouched.
"""
import os, sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
if len(sys.argv) != 3:
    print(__doc__); sys.exit(2)
SD, OD = sys.argv[1], sys.argv[2]
os.makedirs(OD, exist_ok=True)
g = pl.load(os.path.join(SD, 'gate_1005.mjs'))
g = pl.sub(g, "const s3 = await attempt('insurance', 'Door Knocking');",
              "const s3 = await attempt('insurance', 'Door knock');   /* H (#18): the one vocabulary's spelling */")
pl.write_atomic(os.path.join(OD, 'gate_1005.mjs'), g)
print('patch_H_gates: wrote', os.path.join(OD, 'gate_1005.mjs'))
