"""Build 1431 — the lead-source list without duplicates (30 Oct 2026).

Theo: "Trim duplicate lead sources." 1429 joined the New Lead form's list and the client page's list into one
(CR_LEAD_SOURCES, 22 items), which left near-duplicates. Measured in production first (counts only):
Internet 7, Google 5, Internet: Google 3, Google / website 2, Website 1 -- five spellings of one source;
Canvasser 1 beside Door knock 1 and Door Knocking 1; and 9 jobs stored with the typo "Non Proffit".

The picker drops Canvasser, Internet, Internet: Google and Internet: Website (22 -> 18). Storm canvass stays: it
is one of the eight Add-project chips (999) and says the knock followed a storm. Nothing stored is rewritten;
crLeadSource() maps the old spellings for display and for the Reports counts, as 1429 already did for two.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

s = one(s, """var CR_LEAD_SOURCES = ['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social',
  'Canvasser','Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Internet','Internet: Google','Internet: Website',
  'Non Profit','Real-estate','Real-estate: Kitty Hawk','Roofle','Telemarketing','Truck','Other'];
/* the New Lead form's old spellings of three of the same sources (case is matched separately) */
var CR_LEAD_SOURCE_ALIAS = { 'door knocking':'Door knock', 'previous customer':'Repeat customer' };""",
"""var CR_LEAD_SOURCES = ['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social',
  'Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Non Profit','Real-estate','Real-estate: Kitty Hawk',
  'Roofle','Telemarketing','Truck','Other'];
/* other spellings of the same sources (case is matched separately). 1431 (Theo: "Trim duplicate lead
   sources"): Canvasser and the four Internet/Google spellings left the picker; jobs stored under them,
   and under the "Non Proffit" typo, show and count as the source they are. Nothing stored is rewritten. */
var CR_LEAD_SOURCE_ALIAS = { 'door knocking':'Door knock', 'canvasser':'Door knock', 'previous customer':'Repeat customer',
  'google':'Google / website', 'website':'Google / website', 'internet':'Google / website',
  'internet: google':'Google / website', 'internet: website':'Google / website',
  'non proffit':'Non Profit', 'kitty hawk':'Real-estate: Kitty Hawk' };""")

s = one(s, ">v2026-10-29 build 1430<", ">v2026-10-30 build 1431<")
s = one(s, """  { b: 1430, d:'2026-10-29',""",
"""  { b: 1431, d:'2026-10-30', t:'The lead-source list without duplicates', s:'The lead-source list lost its duplicates: Canvasser is now Door knock, and Google, Website, Internet and its two variants are all Google / website. The list went from 22 choices to 18. Jobs saved under an old name are not changed; they show, and count in Reports, under the source they belong to. The misspelled Non Proffit counts as Non Profit.' },
  { b: 1430, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1431')
