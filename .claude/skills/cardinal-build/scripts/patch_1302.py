"""Build 1302 — "Tarp Only" is a Work Type (Theo, 11 Oct: "Tarp only is not a stage just standalone").

A job that is only ever a tarp is a kind of job, not a step in the pipeline, so it
joins the Work Type list beside New, Repair and Warranty in every place that list is
offered: the Retail project form, the lead form, the job card's AccuLynx-style
dropdown, the Community job page and the Community New Estimate form. No stage
changes and normStage() is untouched, so no job can be misread as a Lead. 1303's
Community home counts these jobs on their own tile.

Usage: python3 patch_1302.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# the job card's dropdown
A = "acxOpts(['Inspection','Insurance','New','Repair','Retail','Service','Warranty'], ck.work_type)"
B = "acxOpts(['Inspection','Insurance','New','Repair','Retail','Service','Tarp Only','Warranty'], ck.work_type)"
src = pl.sub(src, A, B)
# Community job page
A = "var CC2_WT = ['Inspection','Insurance','New','Repair','Retail','Service','Warranty'];"
B = "var CC2_WT = ['Inspection','Insurance','New','Repair','Retail','Service','Tarp Only','Warranty'];   /* 1302: Tarp Only */"
src = pl.sub(src, A, B)
# Retail project form
A = """      <option>Repair</option><option>Retail</option><option>Service</option><option>Warranty</option>
    </select></label>"""
B = """      <option>Repair</option><option>Retail</option><option>Service</option><option>Tarp Only</option><option>Warranty</option>
    </select></label>"""
src = pl.sub(src, A, B)
# lead form
A = """              <option>Retail</option><option>Service</option><option>Warranty</option></select></label>"""
B = """              <option>Retail</option><option>Service</option><option>Tarp Only</option><option>Warranty</option></select></label>"""
src = pl.sub(src, A, B)
# Community New Estimate form
A = """'<option value="Multi-trade">Multi-trade</option>' +
'<option value="Other">Other</option>' +"""
B = """'<option value="Multi-trade">Multi-trade</option>' +
'<option value="Tarp Only">Tarp Only</option>' +   /* 1302 */
'<option value="Other">Other</option>' +"""
src = pl.sub(src, A, B)

A = ">v2026-10-11 build 1301<button"
B = ">v2026-10-11 build 1302<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1302, d: '2026-10-11', t: 'Tarp Only is a work type',
    s: 'A job that is only a tarp can now be marked that way: Tarp Only is in the Work Type list on the job, the lead and project forms, and the Community New Estimate form. It is not a pipeline stage, so the job keeps its stage as usual. The Community home will count these on their own tile next.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
