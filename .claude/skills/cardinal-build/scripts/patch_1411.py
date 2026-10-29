"""Build 1411 — Team Feedback (29 Oct 2026, Theo: "a team suggestions or feedback box somewhere in the app
for when things break down or aren't working or features from team members"). A new module (cr-fb-*) over a new
table (team_feedback.sql, run FIRST). Doors: Menu -> Account (and so the desktop rail, which mirrors the
drawer), Tools -> App in the top bar, and the #feedback link the alerts carry."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
MOD = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), 'module_1411_feedback.html')
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)
# 1. the drawer row (every desk; deliberately not in hideAdminItemsForNonAdmin's list)
s = one(s, """          <button class="navopt" data-nav="notify" data-cri="bell lg">Enable Notifications</button>
""", """          <button class="navopt" data-nav="notify" data-cri="bell lg">Enable Notifications</button>
          <!-- 1411: the team's way to say "this broke" or "here's an idea" -->
          <button class="navopt" data-nav="feedback" data-cri="chat lg">Team Feedback</button>
""")
s = one(s, "  else if(nav === 'notify'){ enableNotifications(); }\n",
"  else if(nav === 'notify'){ enableNotifications(); }\n"
"  else if(nav === 'feedback'){ if(window.CardinalFeedback) window.CardinalFeedback.open(); }\n")
# 2. the top bar's Tools -> App
s = one(s, """      <span class="cbi" data-go="whatsnew" data-cri="sparkle lg">What's New</span>
""", """      <span class="cbi" data-go="whatsnew" data-cri="sparkle lg">What's New</span>
      <span class="cbi" data-go="feedback" data-cri="chat lg">Team Feedback</span>
""")
s = one(s, "  whatsnew:  'CardinalChangelog.show',\n",
"  whatsnew:  'CardinalChangelog.show',\n  feedback:  'CardinalFeedback.open',\n")
# 3. a field account (Production only) keeps this door too
s = one(s, """body.cr-field #navMenu .navopt:not([data-nav="prodboard"]):not([data-nav="dispatch"]):not([data-nav="punch"]):not([data-nav="notify"]){""",
"""body.cr-field #navMenu .navopt:not([data-nav="prodboard"]):not([data-nav="dispatch"]):not([data-nav="punch"]):not([data-nav="notify"]):not([data-nav="feedback"]){""")
# 4. the alert link survives boot (the next line rewrites any unknown fragment to #h)
s = one(s, "  try{ if(/^#(punch$|route\\/)/.test(location.hash)) window.__crBootLink = location.hash; }catch(e){}\n",
"  try{ if(/^#(punch$|route\\/)/.test(location.hash)) window.__crBootLink = location.hash; }catch(e){}\n"
"  try{ if(location.hash === '#feedback') window.__crFbLink = '#feedback'; }catch(e){}   /* 1411: cr-fb-script opens it */\n")
# 5. the desktop rail's icons (keyed on the slugged label)
s = one(s, "supplementdesk:'<rect x=\"5\" y=\"2.5\" width=\"14\" height=\"19\" rx=\"2\"/>",
"teamfeedback:'<path d=\"M4 3.5h16a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-8.6L6.5 21v-4H4a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z\"/>',\n"
"supplementdesk:'<rect x=\"5\" y=\"2.5\" width=\"14\" height=\"19\" rx=\"2\"/>")
s = one(s, "supplementdesk:'<rect x=\"5.5\" y=\"3\" width=\"13\" height=\"18\" rx=\"2\" class=\"m\"/>",
"teamfeedback:'<path d=\"M4 4.5h16v11H11l-4.5 4v-4H4z\" class=\"m\"/><path d=\"M8 9h8M8 12h5\"/>',\n"
"supplementdesk:'<rect x=\"5.5\" y=\"3\" width=\"13\" height=\"18\" rx=\"2\" class=\"m\"/>")
# 6. the module, before the real </body>
mod = open(MOD, encoding='utf-8').read()
assert 'id="cr-fb-script"' not in s and 'id="cr-fb-styles"' not in s
i = s.rfind('</body>')
s = s[:i] + mod + '\n' + s[i:]
# 7. stamp + changelog
s = one(s, ">v2026-10-27 build 1409<", ">v2026-10-29 build 1411<")
s = one(s, """  { b: 1409, d:'2026-10-27',""",
"""  { b: 1411, d:'2026-10-29', t:'Team Feedback', s:'There is now a Team Feedback box in the menu (under Account) and in Tools. Use it when something breaks, isn\\u2019t working right, or you have an idea. It notes which screen and job you were on, Theo gets an alert, and you see the status and his reply on the same page.' },
  { b: 1409, d:'2026-10-27',""")
pl.write_atomic(P, s)
print('ok 1411')
