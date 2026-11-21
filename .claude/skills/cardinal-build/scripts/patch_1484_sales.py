"""Build 1484 surgery: one sales rep gets the Assistant, fenced to their own jobs.
Theo, 21 Nov 2026: "Give [a sales rep] access to the ai assistant but make sure he can only see his clients".
Touches api/assistant.js (the fence) and index.html (the Ask button). Run before patch_1484.py."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
ROOT = '/home/user/cardinal-inspections/'
API = sys.argv[1] if len(sys.argv) > 1 else ROOT + 'api/assistant.js'
APP = sys.argv[2] if len(sys.argv) > 2 else ROOT + 'index.html'

def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

a = pl.load(API)
a = one(a, "// WHO: Theo (two logins) and Joan only, checked here, server-side. Everyone else gets a 403.",
"""// WHO: Theo (two logins), Joan, and since build 1484 one sales rep, checked here, server-side.
// Everyone else gets a 403. A sales rep is fenced twice: only the tables in SALES_TABLES, each of
// which RLS already limits to the jobs that rep created or is assigned; and changes may be proposed
// only to SALES_WRITE (money and the reference lists stay read-only for a rep).""")

a = one(a, """  'joan@cardinalrenovations.net':  { name: 'Joan', owner: false },
};""", """  'joan@cardinalrenovations.net':  { name: 'Joan', owner: false },
  /* 1484 (Theo, 21 Nov 2026): a sales rep, who sees only their own clients */
  'jerry@jerrywamsley.com':        { name: 'Jerry', owner: false, sales: true },
};""")

a = one(a, """const OWNER_ONLY = /^owner_/;""", """const OWNER_ONLY = /^owner_/;
/* 1484: what a sales rep's assistant may read. Each job table is limited by RLS to the jobs that rep
   created or is assigned (measured 21 Nov 2026 signed in as the rep: 6 jobs of 331, and 0 rows on
   any table that belong to a job outside those 6). The last four are the shared lists every rep
   already sees by hand. Left out on purpose: crews and everything crew (rates, pay, work orders;
   Theo: "Crew rates is not needed by productions, I write the checks"), community partners and
   properties (every staff login can read the raw partner table, confidential ones included; the app
   masks them and this route would not), community contacts, carrier adjusters, payment reminders,
   and the audit history. */
export const SALES_TABLES = ['projects', 'appointments', 'estimates', 'inspection_reports', 'document_versions', 'contracts',
  'collections', 'commissions', 'draws', 'insurance_claims', 'insurance_payments', 'insurance_supplements', 'claim_notes',
  'claim_upgrades', 'punch_items', 'project_photos', 'pricing_items', 'materials', 'oc_colors', 'team_profiles'];
/* 1484: what a sales rep may PROPOSE changes to (still only on Approve, with their own session). No deletes. */
export const SALES_WRITE = new Set(['projects', 'appointments', 'punch_items', 'claim_notes']);""")

a = one(a, """export function tablesFor(person) {
  return Object.keys(SCHEMA).filter(t => person.owner || !OWNER_ONLY.test(t));
}""", """export function tablesFor(person) {
  if (person && person.sales) return SALES_TABLES.filter(t => SCHEMA[t] && !OWNER_ONLY.test(t));
  return Object.keys(SCHEMA).filter(t => person.owner || !OWNER_ONLY.test(t));
}""")

a = one(a, """  'You are the assistant inside the Cardinal Roofing & Renovations app (Dayton, Ohio). You work for the owner, Theo, or the office manager, Joan.',""",
"""  'You are the assistant inside the Cardinal Roofing & Renovations app (Dayton, Ohio). You work for the person you are talking to: the owner, Theo, the office manager, Joan, or a sales rep.',""")

a = one(a, """    const why = !tables.includes(t) ? 'table not available' : NO_WRITE_TABLES.has(t) ? 'that table is not changed from here'""",
"""    const why = !tables.includes(t) ? 'table not available' : NO_WRITE_TABLES.has(t) ? 'that table is not changed from here'
      : (person && person.sales && !SALES_WRITE.has(t)) ? 'a sales rep cannot change that from here'
      : (person && person.sales && a === 'delete') ? 'a sales rep cannot delete from here'""")

a = one(a, """    if (!person) return { status: 403, error: 'The assistant is for Theo and Joan only' };""",
"""    if (!person) return { status: 403, error: 'The assistant is not turned on for this login' };""")

a = one(a, """      (person.owner ? '' : ' Owner-only records (Owner Review, the Owner Console) are not available in this conversation.') },""",
"""      (person.owner ? '' : ' Owner-only records (Owner Review, the Owner Console) are not available in this conversation.') +
      (person.sales ? ' ' + person.name + ' is a sales rep. You can see only the jobs ' + person.name + ' created or is assigned to, and their own commissions and draws; nothing about crews, crew pay, community partners, other reps\\' jobs or company-wide totals. Every total you give covers their jobs only, so say so. If asked about anything outside that, say it is not available to them here; never guess at it. Changes can be proposed only to their jobs, appointments, punch-outs and claim notes, and nothing can be deleted from here.' : '') },""")
a = one(a, """                table: { type: 'string', enum: tables },
                action: { type: 'string', enum: ['insert', 'update', 'delete'] },""",
"""                table: { type: 'string', enum: person && person.sales ? tables.filter(t => SALES_WRITE.has(t)) : tables },   /* 1484 */
                action: { type: 'string', enum: person && person.sales ? ['insert', 'update'] : ['insert', 'update', 'delete'] },""")
pl.write_atomic(API, a)

s = pl.load(APP)
s = one(s, """  var AI_PEOPLE = { 'theo@cardinalrenovations.net':1, 'theodorion1986@gmail.com':1, 'joan@cardinalrenovations.net':1 };""",
"""  /* 1484: + one sales rep. The server is the fence (api/assistant.js fences a rep to their own jobs); this only shows the button. */
  var AI_PEOPLE = { 'theo@cardinalrenovations.net':1, 'theodorion1986@gmail.com':1, 'joan@cardinalrenovations.net':1, 'jerry@jerrywamsley.com':1 };""")
pl.write_atomic(APP, s)
print('ok 1484 surgery')
