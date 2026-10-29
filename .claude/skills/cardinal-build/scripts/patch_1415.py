"""Build 1415 — calmer and one typeface (29 Oct 2026). Design judge #15 of Theo's audit panel; Theo: "Do your
suggestions on all as long as the rating comes to a 9/10 minimum" — an explicit go-ahead that supersedes three of
his own earlier picks, named here so nobody restores them on the old note's strength:
  1. RED AS DECORATION GOES (supersedes 1283/1285/1290's thin red edge on every Home card and Activity panel, and
     the 5px red cap on every Reports tile). Red stays for actions, today, overdue and money owed; the cards get
     the same hairline as their other three sides.
  2. THE PIPELINE SPELLS ITS STAGES (supersedes 1114's "just put letters. L P A C I"). On a phone the row was
     already a scroller (1114) — cells are widened so a full word never ellipsizes; with the rail open the seven
     cards wrap 4 + 3 instead of 6 + 1 orphan (a container query on the card).
  3. ONE TYPEFACE ON EVERY DEVICE. 1,100+ stacks read 'Segoe UI',Arial: Windows has Segoe, iPhone/iPad/Mac do not,
     so Theo's Apple devices drew Arial (and mixed it with San Francisco where a module named -apple-system).
     Every such stack now goes Segoe UI -> -apple-system -> BlinkMacSystemFont -> Roboto -> Arial. Windows renders
     exactly as before; Apple gets San Francisco; Android gets Roboto. Print templates in Georgia are untouched."""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)

# 3. the type stack — every Segoe-then-Arial stack gains the Apple/Android system faces after Segoe
SYS = "-apple-system,BlinkMacSystemFont,Roboto,"
before = len(re.findall(r"Segoe UI\\?['\"]?, ?Arial", s))
pairs = [
    (r"(?<!BlinkMacSystemFont,)'Segoe UI',Arial", "'Segoe UI'," + SYS + "Arial"),
    (r"(?<!BlinkMacSystemFont,)\\'Segoe UI\\',Arial", "\\'Segoe UI\\'," + SYS + "Arial"),
    (r'(?<!BlinkMacSystemFont,)"Segoe UI",Arial', '"Segoe UI",' + SYS + 'Arial'),
    (r"'Segoe UI', Arial, sans-serif", "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif"),
    (r"(?<![\w'\"-])Segoe UI,Arial,sans-serif", "Segoe UI," + SYS + "Arial,sans-serif"),
]
n_total = 0
for pat, rep in pairs:
    s, n = re.subn(pat, lambda m, rep=rep: rep, s); n_total += n
# bare 'Segoe UI'; (no fallback at all) — give it the same chain
s, n = re.subn(r"'Segoe UI';", "'Segoe UI'," + SYS + "sans-serif;", s); n_total += n
s, n = re.subn(r"\\'Segoe UI\\';", lambda m: "\\'Segoe UI\\'," + SYS + "sans-serif;", s); n_total += n
left = len([m for m in re.finditer(r"['\"]Segoe UI\\?['\"],\s?Arial", s) if 'BlinkMacSystemFont' not in s[max(0, m.start() - 30):m.start()]])
assert left == 0, ('unconverted Segoe->Arial stacks', left)
assert n_total > 1000, n_total
print('type stacks converted:', n_total, '(Segoe->Arial seen before:', before, ')')

# 1. red edges -> the card's own hairline
s = one(s, """--cr-stack:"1283 flat drawer panel (was gloss gradient + drop shadow)";
background:#0F1521;border:1px solid #223047;border-left:3px solid #c8202e;""",
"""--cr-stack:"1283 flat drawer panel (was gloss gradient + drop shadow); 1415 no red edge";
background:#0F1521;border:1px solid #223047;""")
s = one(s, """--cr-stack:"1285 flat Activity panel (was slab + drop shadow + ridge)";
background:#0F1521;border:1px solid #223047;border-left:3px solid #c8202e;box-shadow:none;border-radius:12px;}""",
"""--cr-stack:"1285 flat Activity panel (was slab + drop shadow + ridge); 1415 no red edge";
background:#0F1521;border:1px solid #223047;box-shadow:none;border-radius:12px;}""")
s = one(s, """--cr-stack:"1290 flat white card with the red edge (light twin of 1283/1285)";
background:#ffffff;border:1px solid #dcdee2;box-shadow:none;border-left:3px solid #c8202e;border-radius:12px;}""",
"""--cr-stack:"1290 flat white card (light twin of 1283/1285); 1415 no red edge";
background:#ffffff;border:1px solid #dcdee2;box-shadow:none;border-radius:12px;}""")
s = one(s, """#reportsView .rptkpi{
  background:var(--obs-face);
  border:1px solid var(--obs-bd,#24242c);
  border-top:5px solid #c8202e;""", """#reportsView .rptkpi{
  background:var(--obs-face);
  border:1px solid var(--obs-bd,#24242c);
  border-top:1px solid var(--obs-hair,#2f3038);   /* 1415: was a 5px red cap on every tile */""")
s = one(s, """#reportsView .rptkpi::after{
  background:""", """#reportsView .rptkpi::after{
  display:none;   /* 1415: the glint sat under the red cap, which is gone */
  background:""")

# 2. full stage names
for k, short, full in [('Lead', "'L'", "'Leads'"), ('Prospect', "'P'", "'Prospects'"), ('Approved', "'A'", "'Approved'"),
                       ('Completed', "'C'", "'Completed'"), ('Invoiced', "'I'", "'Invoiced'")]:
    s = re.sub(r"(\{ key:'%s',\s+label:'[A-Z ]+',\s+short:)%s(,\s*)" % (k, re.escape(short)), lambda m: m.group(1) + full + m.group(2), s, count=1)
assert s.count("short:'Leads'") == 1 and s.count("short:'Invoiced'") == 1
s = one(s, """  .pipebtn{flex:1 1 auto;min-width:64px;max-width:none;padding:2px 0;}""",
"""  .pipebtn{flex:1 1 auto;min-width:84px;max-width:none;padding:2px 0;}   /* 1415: wide enough for a spelled stage name — the row scrolls */""")
s = one(s, """body.cr-lnav-on .piperow{--cr-stack:"1306: rail open, the seven cards wrap rather than scroll (Theo 2W)";
  flex-wrap:wrap;row-gap:8px;overflow-x:visible;}""",
"""body.cr-lnav-on .piperow{--cr-stack:"1306: rail open, the seven cards wrap rather than scroll (Theo 2W)";
  flex-wrap:wrap;row-gap:8px;overflow-x:visible;}
/* 1415: when seven do not fit, wrap 4 + 3, never 6 + 1 with On Hold stranded on a row of its own */
#mainView .pipecard:has(> #pipeRow), #mainView .pipecard:has(#pipeRow){container-type:inline-size;container-name:pipecard;}
@container pipecard (max-width:700px){
  body.cr-lnav-on #pipeRow{--cr-stack:"1415 a balanced 4 + 3 wrap";display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 6px;}
  body.cr-lnav-on #pipeRow .pipebtn{min-width:0;max-width:none;}
}""")

# 1414 follow-up, seen in the 1415 render: the Activity heading's glyph sat apart from its word (the head is a
# flex row that spread them), and the mail/calendar glyph in a 30px avatar slot drew at text size
s = one(s, 'id="actToggle" data-cri="bolt lg">Activity <span', 'id="actToggle"><span data-cri="bolt lg">Activity</span> <span')
s = one(s, ".cri.crico{width:1.05em;height:1.05em;vertical-align:-.16em;margin-right:.35em;display:inline-block}",
".cri.crico{width:1.05em;height:1.05em;vertical-align:-.16em;margin-right:.35em;display:inline-block}\n"
".actitem .ic.icav > .cri.crico,.afav .circ.circav > .cri.crico{width:22px;height:22px;margin:0;vertical-align:middle;color:var(--rbe-mute,#9aa0a8)}")
s = one(s, ">v2026-10-29 build 1414<", ">v2026-10-29 build 1415<")
s = one(s, """  { b: 1414, d:'2026-10-29',""",
"""  { b: 1415, d:'2026-10-29', t:'Calmer cards, full stage names, one typeface', s:'Home and Reports cards lose the red stripe \\u2014 red is kept for buttons, today and money owed. The pipeline spells its stages (Leads, Prospects, Approved\\u2026) instead of single letters. iPhones, iPads and Macs now show their own system font instead of Arial; Windows looks the same.' },
  { b: 1414, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1415')
