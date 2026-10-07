#!/usr/bin/env python3
"""Build 1253 — Trades on the New Lead form (Joan).

Theo, 7 Oct: "Joan says she can't put trade type when she inputs a leads. She
can only edit after."

1. The New Lead intake (#leadFormModal, ld*) had Job Category, Work Type and
   Lead Source but NO trades — the six trade boxes existed only on the Edit
   form (#pfTrades). They are added to the intake's Job Details box, visible
   without "More detail", and saved to checklist.trades: the same key the Edit
   form writes and ljTrades() / Job Details read.
2. Found on the way, same cause: the intake saved Category and Work Type only
   NESTED (checklist.lead.category / .worktype), but Job Details, the Leads
   list and the reports read the FLAT keys (checklist.job_category /
   .work_type) that the Edit form writes. So whatever Joan picked there never
   showed — she had to set it again. The intake now writes the flat keys too
   (the nested copy stays; nothing that reads it changes).

usage: python3 patch_1253.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

src = pl.sub(src, '''              <option>Retail</option><option>Service</option><option>Warranty</option></select></label>
        </div>
        <label class="ldmore">Lead Source <span class="ldreq">*</span>''',
'''              <option>Retail</option><option>Service</option><option>Warranty</option></select></label>
        </div>
        <!-- 1253: trades at intake — the same six, saved to checklist.trades like the Edit form -->
        <div class="ldtradehead">Trades</div>
        <div class="tradegrid ldtrades" id="ldTrades">
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Roofing"> Roofing</label>
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Siding"> Siding</label>
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Gutters"> Gutters</label>
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Windows"> Windows</label>
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Repairs"> Repairs</label>
          <label class="tradeopt"><input type="checkbox" class="cbx" value="Misc"> Misc</label>
        </div>
        <label class="ldmore">Lead Source <span class="ldreq">*</span>''')

# the trade labels take the form's own label ink (the base .tradeopt is a
# light-era #2b2b2b and would vanish on the dark form)
src = pl.sub(src, '''.tradeopt{display:flex;align-items:center;gap:7px;font:600 13px 'Segoe UI',Arial,sans-serif;color:#2b2b2b;cursor:pointer;}''',
'''.tradeopt{display:flex;align-items:center;gap:7px;font:600 13px 'Segoe UI',Arial,sans-serif;color:#2b2b2b;cursor:pointer;}
/* 1253: the intake's trades read in the lead form's own ink, both themes */
#leadFormModal .ldtradehead{margin:12px 0 2px;font-weight:700;}
#leadFormModal .ldtrades .tradeopt{color:inherit;min-height:44px;--cr-stack:"the intake's trade labels inherit the form's ink; the base .tradeopt is a light-era #2b2b2b";}''')

# reset between leads
src = pl.sub(src, '''  ['ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });''', '''  ['ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = '';
  });
  document.querySelectorAll('#ldTrades input').forEach(function(cb){ (/** @type {HTMLInputElement} */ (cb)).checked = false; });   /* 1253 */''')

# save: trades + the flat keys the readers use
src = pl.sub(src, '''      checklist: JSON.stringify({ lead: lead, po: nextPo(), stage_since: new Date().toISOString(), lead_source: document.getElementById('ldSource').value || null })''',
'''      /* 1253: trades from the intake, and Category / Work Type under the FLAT keys
         Job Details, the Leads list and the reports read (job_category /
         work_type — what the Edit form writes). They were only ever nested in
         lead.category / lead.worktype, so the intake's picks never showed. */
      checklist: JSON.stringify({ lead: lead, po: nextPo(), stage_since: new Date().toISOString(), lead_source: document.getElementById('ldSource').value || null,
        job_category: ((/** @type {HTMLSelectElement} */ (document.getElementById('ldCategory'))) || {}).value || null,
        work_type: ((/** @type {HTMLSelectElement} */ (document.getElementById('ldWorkType'))) || {}).value || null,
        trades: (function(){ var t = []; document.querySelectorAll('#ldTrades input:checked').forEach(function(cb){ t.push((/** @type {HTMLInputElement} */ (cb)).value); }); return t.length ? t : null; })() })''')

src = pl.sub(src, '>v2026-10-07 build 1252<', '>v2026-10-07 build 1253<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1253, d: '2026-10-07', t: 'Pick the trades when you enter a lead',
    s: 'The New Lead form now has the six trade boxes \\u2014 Roofing, Siding, Gutters, Windows, Repairs, Misc \\u2014 so the trade goes in with the lead instead of being added afterwards. And the Job Category and Work Type you pick on that form now show on the client\\u2019s Job Details; before, they were saved somewhere Job Details never looked.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
