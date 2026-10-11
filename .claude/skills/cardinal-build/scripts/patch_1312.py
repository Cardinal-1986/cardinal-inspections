"""Build 1312 — Community says "estimate", never "bid" (Theo: "I believe that's why I've been
confused since the first day I set up community page. Let's keep it estimate and no bid").

The Community stages already read Estimate Requested / Estimate Submitted (CC_STAGE_LABEL,
1301) and the list is "All estimates" — but the pipeline's P column said "Bid Submitted",
and the job page, the New Estimate form, the partner editor, the morning chip and the
front door all said "bid". One thing, two names. Visible text only: internal keys
(data-pane="bids", data-act="newbid", checklist.bid, bidAmt, source 'community-bid') stay,
because rows and other modules read them. Retail's Sales Floor copy about a competitor's
bid is a different thing and is untouched.

Usage: python3 patch_1312.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

EDITS = [
  # cr-ch2 \u2014 the home, Estimates pane and pipeline
  (r"your bids only</div>", r"your estimates only</div>", 1),
  (r">No bids match these filters.<", r">No estimates match these filters.<", 1),
  (r">No bids yet.<", r">No estimates yet.<", 1),
  (r"Prospect: { label:'BID SUBMITTED', short:'Bid Submitted', letter:'P', tip:'Bid is in \u2014 waiting on the partner' }",
   r"Prospect: { label:'ESTIMATE SUBMITTED', short:'Estimate Submitted', letter:'P', tip:'Estimate is in \u2014 waiting on the partner' }", 1),
  # cr-cc \u2014 the job page
  (r"awarded  : 'Bid awarded',", r"awarded  : 'Estimate awarded',", 1),
  (r"lost     : 'Bid not awarded',", r"lost     : 'Estimate not awarded',", 1),
  (r"(amt ? ' · bid ' + usd(amt) : '')", r"(amt ? ' · estimate ' + usd(amt) : '')", 1),
  (r"'The bid deadline was '", r"'The estimate deadline was '", 1),
  (r"""'<div class="gap">Every bid document,""", r"""'<div class="gap">Every estimate document,""", 1),
  (r"'Mark this bid SUBMITTED to '", r"'Mark this estimate SUBMITTED to '", 1),
  (r"'Mark this bid AWARDED by '", r"'Mark this estimate AWARDED by '", 1),
  (r"'No bid yet' +", r"'No estimate yet' +", 1),
  (r"label:'Start the bid'", r"label:'Start the estimate'", 1),
  (r"' on the bid form \u2014 not in the estimate builder.'", r"' on the New Estimate form \u2014 not in the estimate builder.'", 1),
  (r"label:'Open the bid'", r"label:'Open the estimate'", 1),
  (r"txt:'Invited to bid.'", r"txt:'Asked for an estimate.'", 1),
  (r"txt:'This bid did not come our way.'", r"txt:'This estimate did not come our way.'", 1),
  (r"'This came off the bid form, not the estimate builder, so there are no '", r"'This came off the New Estimate form, not the estimate builder, so there are no '", 1),
  (r'type="button">Build the bid</button>', r'type="button">Build the estimate</button>', 1),
  (r'type="button">Open bid</button>', r'type="button">Open estimate</button>', 2),
  (r"\u2039 Back to bid view", r"\u2039 Back to estimate view", 1),
  # cr-nbid \u2014 the New Estimate form
  (r"Create a community bid opportunity. ", r"Create a community estimate request. ", 1),
  (r": partner.name + ' bid');", r": partner.name + ' estimate');", 1),
  (r"crTell('Could not create bid: '", r"crTell('Could not create estimate: '", 1),
  # cr-cpartners \u2014 the partner editor
  (r"confirm it before you send a bid.</div>", r"confirm it before you send an estimate.</div>", 1),
  (r"\u2014 bids default to it, so it has to be right.", r"\u2014 estimates default to it, so it has to be right.", 1),
  # morning chip, front door, left-rail subline, CRM picker
  (r"c.bids === 1 ? 'bid past due' : 'bids past due'", r"c.bids === 1 ? 'estimate past due' : 'estimates past due'", 1),
  (r"(c.bids === 1 ? ' bid past due' : ' bids past due')", r"(c.bids === 1 ? ' estimate past due' : ' estimates past due')", 1),
  (r"HOAs \u2014 bids and awards.</span>", r"HOAs \u2014 estimates and awards.</span>", 1),
  (r"desc:'Non-profits (bidding) and property-manager portfolios.'", r"desc:'Non-profits and property-manager portfolios.'", 1),
]
for old, new, n in EDITS:
    assert src.count(old) == n, (old, src.count(old))
    src = src.replace(old, new)

OLD_STAMP = ">v2026-10-11 build 1311<button"
assert src.count(OLD_STAMP) == 1
src = src.replace(OLD_STAMP, ">v2026-10-11 build 1312<button")
CL = "var CHANGELOG = ["
assert src.count(CL) == 1
src = src.replace(CL, CL + """
  { b: 1312, d:'2026-10-11', t:'Community says estimate, not bid',
    s:'The Community screens called one thing two names: the stages and the list said Estimate, while the pipeline, the job page and the New Estimate form said bid. Now it is estimate everywhere \\u2014 the pipeline\\u2019s P reads Estimate Submitted, the job page says Open estimate, Build the estimate and Mark this estimate submitted, and the morning chip counts estimates past due. Nothing about the jobs themselves changed.' },""", 1)
pl.write_atomic(PATH, src)
print('1312 applied:', len(EDITS), 'edits')
