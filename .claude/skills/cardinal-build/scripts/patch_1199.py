#!/usr/bin/env python3
"""patch_1199.py — build 1199: the four money/authorization defects from the
9 Sep 2026 external assessment that need no decision from Theo, plus Maps on
first focus and the sign-in placeholder domain.

    python3 patch_1199.py                # patch the working tree in place
    python3 patch_1199.py --src A --dst B  # apply the same edits from tree A into tree B

Every edit is exact-match with an asserted occurrence count; a failed assert
aborts before any write. Re-applying to a fresh copy of the 1198 tree must
reproduce the 1199 files byte-for-byte (the scope proof).

Files: index.html · api/pay.js · api/share.js · api/pay-webhook.js ·
       api/estimate-to-contract.js · scripts/gate_chromium.mjs (registry)
"""
import argparse, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import patch_lib as pl

ap = argparse.ArgumentParser()
ap.add_argument('--src', default=os.path.abspath(os.path.join(HERE, '../../../..')))
ap.add_argument('--dst', default=None)
a = ap.parse_args()
SRC = a.src; DST = a.dst or SRC

def rd(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f: return f.read()
def wr(rel, s):
    p = os.path.join(DST, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    pl.write_atomic(p, s); print('  wrote', rel, len(s))
def sub1(s, old, new, what):
    n = s.count(old)
    assert n == 1, f'{what}: expected 1 occurrence, found {n}'
    return s.replace(old, new)
def slice_fn(s, start_needle, end_needle):
    """Return (i, j): the span from start_needle through the first end_needle after it."""
    i = s.find(start_needle); assert i >= 0 and s.find(start_needle, i + 1) < 0, start_needle
    j = s.find(end_needle, i); assert j >= 0, end_needle
    return i, j + len(end_needle)

# ─────────────────────────────────────────────────────────────────────────────
# 1. THE RESOLVER, identical in api/pay.js and api/share.js
# ─────────────────────────────────────────────────────────────────────────────
RESOLVER = r'''/* 1199: FAIL CLOSED. Every lookup below used to be optional — `collected`
   started at 0 and only grew when the collections request happened to succeed,
   so one 503 on that request turned an $8,000 balance into a $10,000 checkout:
   a failed read of the payment history was indistinguishable from an empty
   payment history. Now any failed lookup throws LookupFailed, the caller says
   the balance could not be verified, and nobody is offered a number the ledger
   did not confirm. A failed read is never an empty ledger.
   KEEP IN SYNC: this class, readRows and owedOn are byte-identical in
   api/pay.js and api/share.js, and gate_1199 asserts it. */
class LookupFailed extends Error {
  constructor(what) { super('lookup failed: ' + what); this.code = 'LOOKUP_FAILED'; }
}
async function readRows(sbHeaders, what, url) {
  let r;
  try { r = await fetch(url, { headers: sbHeaders }); }
  catch (e) { throw new LookupFailed(what + ' unreachable'); }
  if (!r.ok) throw new LookupFailed(what + ' ' + r.status);
  return r.json();
}
async function owedOn(sbHeaders, rep) {
  const isInvoice = /^invoice/i.test(String(rep.title || '').trim());

  // money already collected on this job — a failed read throws, never reads as $0
  let collected = 0;
  for (const r of await readRows(sbHeaders, 'collections',
      `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount`)) {
    collected += Number(r.amount) || 0;
  }

  if (isInvoice) {
    // balance due = signed-contract total for the job − collected (jobFinance's
    // contracted-job case). Falls back to the invoice's own stored total.
    let contractTotal = 0;
    for (const r of await readRows(sbHeaders, 'inspection_reports',
        `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,total,signed_at`)) {
      if (/^contract/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0) {
        contractTotal += Number(r.total);
      }
    }
    const jobTotal = contractTotal > 0 ? contractTotal : (Number(rep.total) || 0);
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };
  }

  // estimate / contract → the deposit (reachable via either the estimate doc or
  // the contract doc — estimates carries both doc_id and contract_doc_id)
  const est = (await readRows(sbHeaders, 'estimates',
      `${SUPABASE_URL}/rest/v1/estimates?or=(doc_id.eq.${rep.id},contract_doc_id.eq.${rep.id})&select=deposit_amount&limit=1`))[0];
  const deposit = Number(est && est.deposit_amount) || 0;
  return { cents: Math.round((deposit - collected) * 100), label: 'Deposit' };
}
'''

def swap_resolver(s, fname):
    i, j = slice_fn(s, 'async function owedOn(sbHeaders, rep) {', "label: 'Deposit' };\n}\n")
    old = s[i:j]
    assert 'if (cr.ok)' in old, fname + ': the 1198 resolver shape is not there'
    return s[:i] + RESOLVER + s[j:]

# api/pay.js
pay = rd('api/pay.js')
pay = swap_resolver(pay, 'api/pay.js')
pay = sub1(pay,
    "    const { cents, label } = await owedOn(sbHeaders, rep);\n",
    "    let owed;\n"
    "    try { owed = await owedOn(sbHeaders, rep); }\n"
    "    catch (e) {\n"
    "      if (e && e.code === 'LOOKUP_FAILED') {\n"
    "        /* 1199: the balance could not be verified. Say so and stop — never\n"
    "           start a checkout for a number the ledger did not confirm. */\n"
    "        res.setHeader('Retry-After', '120');\n"
    "        res.status(503).send('We could not verify the balance on this document just now. '\n"
    "          + 'Please open the link again in a few minutes.');\n"
    "        return;\n"
    "      }\n"
    "      throw e;\n"
    "    }\n"
    "    const { cents, label } = owed;\n",
    'pay.js: handler call site')
wr('api/pay.js', pay)

# api/share.js
sh = rd('api/share.js')
sh = swap_resolver(sh, 'api/share.js')
sh = sub1(sh,
    "      try {\n"
    "        const { cents, label } = await owedOn(sbHeaders, rows[0]);\n"
    "        if (cents >= 50 && cents <= 10000000) {\n"
    "          const ui = payUi(t, cents, label, rows[0].project || rows[0].title);\n"
    "          html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;\n"
    "        }\n"
    "      } catch (e) { /* leave the document unblocked */ }\n",
    "      try {\n"
    "        const { cents, label } = await owedOn(sbHeaders, rows[0]);\n"
    "        if (cents >= 50 && cents <= 10000000) {\n"
    "          const ui = payUi(t, cents, label, rows[0].project || rows[0].title);\n"
    "          html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;\n"
    "        }\n"
    "      } catch (e) {\n"
    "        /* leave the document unblocked. 1199: but when the ledger could not be\n"
    "           READ, say so — a missing pay bar otherwise reads as \"nothing due\",\n"
    "           and a correct state with no explanation is its own defect. */\n"
    "        if (e && e.code === 'LOOKUP_FAILED') {\n"
    "          const ui = unavailableUi();\n"
    "          html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;\n"
    "        }\n"
    "      }\n",
    'share.js: pay bar call site')
sh = sub1(sh,
    "\nexport default async function handler(req, res) {\n  const t = (req.query && req.query.t) || '';\n",
    "\n// 1199: the honest state when the balance cannot be verified — no amount, no\n"
    "// button, and the reason. Same shell as payUi so it reads as the same bar.\n"
    "function unavailableUi() {\n"
    "  return `\n"
    "<div id=\"crPayBar\" data-cr-unavailable=\"1\" style=\"position:fixed;left:0;right:0;bottom:0;z-index:9999;\n"
    "  padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none;\n"
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;\">\n"
    "  <div style=\"pointer-events:auto;max-width:520px;margin:0 auto;background:#ffffff;\n"
    "    border:1px solid #ece7e3;border-radius:18px 18px 14px 14px;\n"
    "    box-shadow:0 -1px 8px rgba(20,10,8,.05),0 16px 44px rgba(20,10,8,.20);padding:15px 18px 13px;\">\n"
    "    <div style=\"font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:#6b5d52;\">Balance check unavailable</div>\n"
    "    <div style=\"font-size:14px;color:#231b18;margin-top:6px;line-height:1.4;\">The amount due on this document could not be verified just now. Please open this link again in a few minutes to pay online.</div>\n"
    "  </div>\n"
    "</div>`;\n"
    "}\n"
    "\nexport default async function handler(req, res) {\n  const t = (req.query && req.query.t) || '';\n",
    'share.js: unavailableUi insertion')
wr('api/share.js', sh)

# byte-identity of the shared resolver, asserted at patch time too
def resolver_text(s):
    i = s.find('class LookupFailed'); j = s.find("label: 'Deposit' };\n}\n", i) + len("label: 'Deposit' };\n}\n")
    return s[i:j]
assert resolver_text(pay) == resolver_text(sh), 'resolver drifted between pay.js and share.js'
print('  resolver byte-identical in pay.js and share.js:', len(resolver_text(pay)), 'chars')

# ─────────────────────────────────────────────────────────────────────────────
# 2. api/pay-webhook.js — the method is the EVENT's
# ─────────────────────────────────────────────────────────────────────────────
wh = rd('api/pay-webhook.js')
wh = sub1(wh,
    "export default async function handler(req, res) {\n  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }\n",
    "/* 1199: the method is the EVENT's, not a constant. A card settles inside\n"
    "   checkout.session.completed; a bank debit only ever arrives as\n"
    "   checkout.session.async_payment_succeeded, days later (see 1151 below). The\n"
    "   row used to say 'card' with a card note for BOTH, so every cleared ACH\n"
    "   deposit was booked as a card payment. collections.method is free text with\n"
    "   'card' | 'ach' documented (collections_payment_provider.sql). */\n"
    "function paymentMethodFor(eventType) {\n"
    "  return eventType === 'checkout.session.async_payment_succeeded' ? 'ach' : 'card';\n"
    "}\n"
    "function paymentNoteFor(method) {\n"
    "  return method === 'ach' ? 'Online bank (ACH) payment via secure link'\n"
    "                         : 'Online card payment via secure link';\n"
    "}\n"
    "\n"
    "export default async function handler(req, res) {\n  if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }\n",
    'webhook: helper insertion')
wh = sub1(wh,
    "      const collType = meta.kind === 'balance' ? 'final' : 'deposit';\n",
    "      const collType = meta.kind === 'balance' ? 'final' : 'deposit';\n"
    "      const method = paymentMethodFor(event.type);\n",
    'webhook: method derivation')
wh = sub1(wh, "            method: 'card',\n", "            method,\n", 'webhook: method literal')
wh = sub1(wh, "            notes: 'Online card payment via secure link',\n",
              "            notes: paymentNoteFor(method),\n", 'webhook: note literal')
wr('api/pay-webhook.js', wh)

# ─────────────────────────────────────────────────────────────────────────────
# 3. api/estimate-to-contract.js — authorize before any read; parse the checklist
# ─────────────────────────────────────────────────────────────────────────────
e2c = rd('api/estimate-to-contract.js')
e2c = sub1(e2c,
    "    if (error || !proj)      return res.status(404).json({ error: 'Project not found' });\n"
    "    if (!proj.estimate)      return res.status(400).json({ error: 'Project has no estimate to convert' });\n"
    "\n"
    "    // Idempotency\n"
    "    if (proj.contract_id) {\n"
    "      const { data: existing } = await supa\n"
    "        .from('contracts')\n"
    "        .select('id, contract, contract_number')\n"
    "        .eq('id', proj.contract_id)\n"
    "        .single();\n"
    "      return res.status(200).json({ id: existing?.id, contract: existing?.contract, existed: true });\n"
    "    }\n"
    "    const canConvert = proj.created_by === userEmail || await canUserAccessProject(supa, userEmail, proj.id);\n"
    "    if (!canConvert) return res.status(403).json({ error: 'Not authorized on this project' });\n",
    "    if (error || !proj)      return res.status(404).json({ error: 'Project not found' });\n"
    "    /* 1199: AUTHORIZE BEFORE ANY READ OF THE PROJECT'S DOCUMENTS. The access\n"
    "       check used to sit below the idempotency return, so a roster account\n"
    "       that neither created nor was assigned this job received its existing\n"
    "       contract with a 200 — the check was simply never reached on that path.\n"
    "       Now: is this person allowed on this project, then everything else.\n"
    "       (External assessment 9 Sep 2026, finding 3.) */\n"
    "    const canConvert = proj.created_by === userEmail || await canUserAccessProject(supa, userEmail, proj.id);\n"
    "    if (!canConvert) return res.status(403).json({ error: 'Not authorized on this project' });\n"
    "    if (!proj.estimate)      return res.status(400).json({ error: 'Project has no estimate to convert' });\n"
    "\n"
    "    // Idempotency\n"
    "    if (proj.contract_id) {\n"
    "      const { data: existing } = await supa\n"
    "        .from('contracts')\n"
    "        .select('id, contract, contract_number')\n"
    "        .eq('id', proj.contract_id)\n"
    "        .single();\n"
    "      return res.status(200).json({ id: existing?.id, contract: existing?.contract, existed: true });\n"
    "    }\n",
    'e2c: authorization order')
e2c = sub1(e2c,
    "// ── Helper: full-access OR project owner OR assigned rep ────\n",
    "/* 1199: projects.checklist is SERIALIZED JSON (every migration reads it as\n"
    "   checklist::jsonb and the app parses it), so the old\n"
    "   `proj.checklist?.lead?.assigned?.[0]` read a property off a string and was\n"
    "   undefined for every project: an assigned rep who did not create the job\n"
    "   was always refused. Parse when it is a string; tolerate an object, null or\n"
    "   junk; compare case-insensitively, as RLS compares emails. */\n"
    "function assignedRepFromChecklist(checklist) {\n"
    "  let ck = checklist;\n"
    "  if (typeof ck === 'string') { try { ck = JSON.parse(ck); } catch (_) { return null; } }\n"
    "  const a = ck && ck.lead && Array.isArray(ck.lead.assigned) ? ck.lead.assigned[0] : null;\n"
    "  return typeof a === 'string' && a.trim() ? a.trim().toLowerCase() : null;\n"
    "}\n"
    "\n"
    "// ── Helper: full-access OR project owner OR assigned rep ────\n",
    'e2c: parse helper insertion')
e2c = sub1(e2c,
    "  const assigned = proj.checklist?.lead?.assigned?.[0];\n  if (assigned === userEmail) return true;\n",
    "  const assigned = assignedRepFromChecklist(proj.checklist);\n"
    "  if (assigned && assigned === String(userEmail || '').trim().toLowerCase()) return true;\n",
    'e2c: assignment read')
wr('api/estimate-to-contract.js', e2c)

# ─────────────────────────────────────────────────────────────────────────────
# 4. index.html — Maps on first focus · placeholder · stamp · CHANGELOG
# ─────────────────────────────────────────────────────────────────────────────
ix = rd('index.html')
ix = sub1(ix,
    "document.querySelectorAll('input').forEach(function(input){\n"
    "if(input.dataset.crAutocomplete === '1') return;\n"
    "if(isAddressInput(input)) attachAutocomplete(input);\n"
    "});\n",
    "document.querySelectorAll('input').forEach(function(input){\n"
    "if(input.dataset.crAutocomplete === '1' || input.dataset.crGmapArmed === '1') return;\n"
    "if(isAddressInput(input)) armAutocomplete(input);\n"
    "});\n",
    'index: scan() arms instead of attaching')
ix = sub1(ix,
    "async function attachAutocomplete(input){\nif(!input || input.dataset.crAutocomplete === '1') return;\n",
    "/* 1199: Maps loads on the first FOCUS of an address field, not at boot. scan()\n"
    "   used to attach autocomplete to every address-shaped input the moment it\n"
    "   existed — six of them sit hidden behind the sign-in screen — so the Google\n"
    "   Maps JS API and its Places library were fetched on every launch, before\n"
    "   anyone had signed in, let alone typed an address. Arming instead of\n"
    "   attaching keeps the scan cheap and defers the download to the first field\n"
    "   a person actually touches. A field that is already focused when it is\n"
    "   armed (an autofocused form) attaches at once, so nothing is stranded.\n"
    "   attachAutocomplete itself is unchanged and still exported. */\n"
    "function armAutocomplete(input){\n"
    "if(!input || input.dataset.crGmapArmed === '1' || input.dataset.crAutocomplete === '1') return;\n"
    "input.dataset.crGmapArmed = '1';\n"
    "if(document.activeElement === input){ attachAutocomplete(input); return; }\n"
    "input.addEventListener('focus', function(){ attachAutocomplete(input); }, { once: true });\n"
    "}\n"
    "async function attachAutocomplete(input){\nif(!input || input.dataset.crAutocomplete === '1') return;\n",
    'index: armAutocomplete insertion')
ix = sub1(ix,
    "attachAutocomplete: attachAutocomplete,\nscan             : scan,\n",
    "attachAutocomplete: attachAutocomplete,\narmAutocomplete  : armAutocomplete,\nscan             : scan,\n",
    'index: CardinalMaps export')
ix = sub1(ix, 'placeholder="you@cardinalroofing.com"', 'placeholder="you@cardinalrenovations.net"',
          'index: sign-in placeholder')
ix = sub1(ix, 'v2026-09-03 build 1198<button', 'v2026-09-09 build 1199<button', 'index: app stamp')
ix = sub1(ix,
    "var CHANGELOG = [\n  { b: 1198,",
    "var CHANGELOG = [\n"
    "  { b: 1199, d: '2026-09-09', t: 'Online payments fail safe, bank payments are labelled right, and Maps waits until it is needed', "
    "s: 'A pay link now refuses to open a checkout when the payment history cannot be read, instead of quietly treating a failed read as "
    "\\u201cnothing paid yet\\u201d and asking for the full amount \\u2014 the shared document says the balance could not be verified and to try again shortly. "
    "A bank (ACH) payment that clears is recorded as ACH rather than as a card payment. "
    "Google Maps no longer downloads on every launch before anyone has signed in; it loads the first time an address field is touched. "
    "The sign-in screen\\u2019s example email uses the company domain. "
    "The old estimate-to-contract route checks that you are on the job before it hands back a contract.' },\n"
    "  { b: 1198,",
    'index: CHANGELOG entry')
wr('index.html', ix)

# ─────────────────────────────────────────────────────────────────────────────
# 5. scripts/gate_chromium.mjs — register the gate with its negative control
# ─────────────────────────────────────────────────────────────────────────────
gc = rd('.claude/skills/cardinal-build/scripts/gate_chromium.mjs')
gc = sub1(gc,
    "      repl: '  color:var(--hin,#2B3D4F);'\n    } },\n];\n",
    "      repl: '  color:var(--hin,#2B3D4F);'\n    } },\n"
    "  /* 1199: Maps must not download at boot. The break puts scan() back to\n"
    "     attaching autocomplete on sight, which fetches the Maps API behind the\n"
    "     sign-in screen — the assessment's warm-boot finding. */\n"
    "  { name: 'gate_1199.mjs',\n"
    "    protects: 'Google Maps loads on the first focus of an address field, never at boot; the money routes fail closed',\n"
    "    break: { find: 'if(isAddressInput(input)) armAutocomplete(input);',\n"
    "             repl: 'if(isAddressInput(input)) attachAutocomplete(input);' } },\n"
    "];\n",
    'gate_chromium: registry')
wr('.claude/skills/cardinal-build/scripts/gate_chromium.mjs', gc)
print('patch_1199: all edits applied')
