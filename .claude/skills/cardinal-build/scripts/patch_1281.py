"""Build 1281 — the home Approvals card reads on the dark home screen.

Theo's photo, 10 Oct: "Approvals — signed estimates awaiting contract" was dark ink on the
dark card (#1c1416 on navy, ~1.1:1) and each approval was a white slab with a blue
#1d4f91 name and #666 detail. Same shape as 527's Schedule Board: themed at the card,
scoped to dark retail, so light mode and Claims/Community keep what they have.

Usage: python3 patch_1281.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
A = "/* ── Build 527 · the Schedule Board ───────────────────────────────────────"
CSS = """/* ── Build 1281 · the home Approvals card ─────────────────────────────────
   Theo's photo: the heading was #1c1416 (.projsec's light-era ink) on the navy
   home card, ~1.1:1, and every approval was a white slab with a #1d4f91 name.
   Themed at the card, dark retail only — 527's shape — so light and the other
   CRMs keep what they have. --cr-stack: these out-rank the light-era base on
   purpose; the base still serves light mode and Claims/Community. */
:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #approvalsCard h3.projsec{
--cr-stack:"1281 dark twin of the light-era .projsec ink";
color:var(--rbe-head,#ffffff);border-bottom-color:var(--rbe-line3,#3a3a44);}
:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #approvalsCard .apprrow{
--cr-stack:"1281 dark twin of the white .apprrow slab";
--rbe-ridge-t:#454552;--rbe-ridge-b:#050507;--rbe-ridge-hl:rgba(255,255,255,.09);
background:linear-gradient(180deg,var(--rbe-bg1,#2e333b),var(--rbe-bg2,#262a31));
border:1px solid var(--rbe-line2,#2b2b33);}
:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #approvalsCard .apprcli{
--cr-stack:"1281 dark twin of #1d4f91";color:var(--rbe-head,#ffffff);}
:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) #approvalsCard .apprdet{
--cr-stack:"1281 dark twin of #666";color:var(--rbe-mute,#b8bec6);}

"""
src = pl.sub(src, A, CSS + A)
src = pl.sub(src, '">v2026-10-10 build 1280<button', '">v2026-10-10 build 1281<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1280,",
  "var CHANGELOG = [\n"
  "  { b: 1281, d: '2026-10-10', t: 'Approvals you can read on the home screen',\n"
  "    s: 'The Approvals box on the home screen \\u2014 signed estimates waiting for a contract \\u2014 had a heading in dark letters on the dark card, so it could not be read, and each estimate sat on a bright white strip. The heading is white now and each estimate sits on the same dark card as the rest of the home screen. Light mode is unchanged.' },\n"
  "  { b: 1280,")
pl.write_atomic(PATH, src)
print('patched 1281')
