// api/_staff.js — build 1016. Shared "is this a Cardinal staff member?" check for
// the AI/spend routes and senddoc.
//
// The audit (build 1014) found every AI route trusting ANY confirmed Supabase
// session while public signup is enabled: 1013 closed anonymous access, but a
// self-registered outsider with a valid session still burned Cardinal's paid
// keys (and, via senddoc, sent mail as Cardinal). This adds the identity check
// the money routes already imply: the caller must be Cardinal staff.
//
// ⚠ Two remediations are needed and this is only the code half. The other half
//   is Theo disabling public signup in Supabase Auth — without it, an outsider
//   can still CREATE an account (they just can't reach these routes). Recorded
//   in OPEN_ITEMS for him.
//
// Staff = the @cardinalrenovations.net domain (9 of 10 accounts today) OR an
// explicit allowlist for the accounts that legitimately aren't on the domain.
// Verified against the live roster 23 Aug 2026: the only non-domain accounts are
// clarkie022@gmail.com (sales, in team_profiles) and theodorion1986@gmail.com
// (Theo's owner login). A static check keeps these 13 routes free of a per-call
// DB lookup; ⚠ ADD any future non-domain staff member's email to EXTRA_STAFF
// here, or they will be refused these features (a 403, not a silent failure).
const STAFF_DOMAIN = '@cardinalrenovations.net';
const EXTRA_STAFF = new Set([
  'clarkie022@gmail.com',
  'theodorion1986@gmail.com',
]);

export function isStaff(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return e.endsWith(STAFF_DOMAIN) || EXTRA_STAFF.has(e);
}
