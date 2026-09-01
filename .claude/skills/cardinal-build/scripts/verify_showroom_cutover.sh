#!/usr/bin/env bash
# verify_showroom_cutover.sh — run this the moment showroom.cardinalroster.com
# is moved to the Showroom project in Vercel. Exit 0 = every check passed.
#
#   bash verify_showroom_cutover.sh [/path/to/cardinal-showroom]
#
# ⚠ WHY curl AND NOT A BROWSER. Chromium has no outbound network path in the
# build container — measured 31 Aug 2026: agent proxy, proxy + certificate
# override, and direct all return ERR_CONNECTION_RESET, while curl reaches the
# internet fine. So the live hostname is checked over the real network with
# curl, and the BEHAVIOUR of what it serves is proved by running the gates
# against the bytes it returned. The seam between them is closed by a hash
# comparison against the repo, not by assumption.
set -u
SHOWDIR="${1:-/home/user/cardinal-showroom}"
D="$(mktemp -d)"; pass=0; fail=0
ok(){ if [ "$2" = "1" ]; then echo "  PASS  $1${3:+  → $3}"; pass=$((pass+1));
      else echo "  FAIL  $1${3:+  → $3}"; fail=$((fail+1)); fi; }
# ⚠ RETRIES, AND FAILS LOUDLY. The first live run hit a transient
# SSL_ERROR_SYSCALL through the agent proxy: no output file was written, the
# title read empty, and the check reported STUDIO as broken when Studio was
# fine (three immediate re-fetches: 200, "Cardinal Studio", 86,222 bytes).
# A transport failure reading as a product failure is BUG_CLASSES 37. Now:
# three attempts, and a hard marker in the body if all three fail, so the
# check says "the rig could not fetch this" instead of "this is broken".
get(){ local i
  for i in 1 2 3; do
    rm -f "$2" "$2.hdr"
    if curl -sS -m 90 -H 'Cache-Control: no-cache' "$1" -o "$2" -D "$2.hdr" 2>"$2.err" \
       && [ -s "$2" ]; then return 0; fi
    sleep 2
  done
  echo "RIG_FETCH_FAILED $1 :: $(tail -1 "$2.err" 2>/dev/null)" > "$2"
  : > "$2.hdr"; return 1; }
title(){ grep -o '<title>[^<]*</title>' "$1" | head -1 | sed 's/<[^>]*>//g'; }
code(){ awk 'toupper($1) ~ /^HTTP\// {c=$2} END{print c}' "$1.hdr"; }

echo "verify_showroom_cutover  $(date -u +%FT%TZ)"

# ── 1 · the Showroom hostname serves the SHOWROOM ────────────────────────
get "https://showroom.cardinalroster.com/?cb=$RANDOM$RANDOM" "$D/sr"
SR_T="$(title "$D/sr")"; SR_B="$(wc -c < "$D/sr")"; SR_H="$(git hash-object "$D/sr")"
REPO_H="$(git -C "$SHOWDIR" hash-object index.html 2>/dev/null || echo none)"
ok "showroom hostname answers 200"        "$([ "$(code "$D/sr")" = 200 ] && echo 1)" "$(code "$D/sr")"
ok "it serves the Showroom, by title"     "$([ "$SR_T" = "Cardinal Showroom" ] && echo 1)" "$SR_T"
ok "the bytes ARE the Showroom repo"      "$([ "$SR_H" = "$REPO_H" ] && echo 1)" "live $SR_H / repo $REPO_H"
# The decisive negative: the old Cardinal deployment must be GONE from this host.
# ⚠ DO NOT GREP FOR "Cardinal Client Resources". The first live run FAILED on
# that, and the failure was this project's most-repeated defect biting the
# check written to catch it: the Showroom's own source carries that phrase once,
# in the build-1189 COMMENT explaining that the bare presentation host serves
# the CRM. My explanatory prose forged the marker my own check searched for.
# Assert on forms prose cannot fake instead: the CRM's app-stamp ANCHOR
# (a real attribute in rendered markup), its size class (5.4 MB vs 32 KB), and
# a Cardinal-only script id.
ok "the Cardinal CRM is no longer served here (no app-stamp anchor)" \
   "$(grep -q 'data-cr-footer' "$D/sr" || echo 1)" "$SR_B bytes"
ok "and it is not a 5 MB artifact" \
   "$([ "$SR_B" -lt 1000000 ] && echo 1)" "$SR_B bytes"
ok "and carries no Cardinal-only module id" \
   "$(grep -q 'id="cr-lr-script"' "$D/sr" || echo 1)"
ok "no Cardinal build stamp on this host" \
   "$(grep -qo 'v2026-[0-9-]* build [0-9]*' "$D/sr" || echo 1)"

# ── 2 · the Showroom's own surfaces are present in what is served ────────
for m in "cr-show" "cr-occ" "srLauncher" "data-sr-tile" "showcase.js" "colors.js"; do
  ok "the served page carries $m" "$(grep -q "$m" "$D/sr" && echo 1)"
done
# its sibling files must resolve on THIS host, or every module is dead
for f in showcase.js showcase.css colors.js colors.css showroom-images.js; do
  get "https://showroom.cardinalroster.com/$f" "$D/f"
  ok "sibling $f resolves on the new host" \
     "$([ "$(code "$D/f")" = 200 ] && [ "$(wc -c < "$D/f")" -gt 500 ] && echo 1)" \
     "$(code "$D/f") · $(wc -c < "$D/f") bytes"
done

# ── 3 · every launcher destination, fetched, title-checked ───────────────
check_dest(){ local t
  if ! get "$1" "$D/d"; then
    ok "$3" "" "RIG could not fetch after 3 tries -- NOT a verdict on the target"
    return; fi
  t="$(title "$D/d")"
  ok "$3" "$([ "$(code "$D/d")" = 200 ] && [ "$t" = "$2" ] && echo 1)" "$(code "$D/d") · $t"; }
check_dest "https://app.cardinalroster.com/studio.html"          "Cardinal Studio"              "Studio canonical URL"
check_dest "https://app.cardinalroster.com/visualizer/?present=1" "Cardinal Exterior Visualizer" "Visualizer with ?present=1"
check_dest "https://presentation.cardinalroster.com/popup.html"   "The Pop-Up Roof"              "Pop-Up Roof canonical URL"
check_dest "https://app.cardinalroster.com/?open=appt"            "Cardinal Client Resources"    "?open=appt serves Cardinal"
check_dest "https://app.cardinalroster.com/?open=why"             "Cardinal Client Resources"    "?open=why serves Cardinal"
# the launcher must actually POINT at those URLs
for u in "https://app.cardinalroster.com/studio.html" \
         "https://app.cardinalroster.com/visualizer/?present=1" \
         "https://app.cardinalroster.com/?open=appt" \
         "https://app.cardinalroster.com/?open=why" \
         "https://presentation.cardinalroster.com/popup.html"; do
  ok "the served launcher links $u" "$(grep -qF "$u" "$D/sr" && echo 1)"
done

# ── 4 · Cardinal is untouched ────────────────────────────────────────────
get "https://app.cardinalroster.com/?cb=$RANDOM$RANDOM" "$D/app"
ok "app.cardinalroster.com still serves Cardinal" \
   "$(grep -q 'Cardinal Client Resources' "$D/app" && echo 1)" "$(title "$D/app")"
# ⚠ ANCHOR ON data-cr-footer, NOT ON THE FIRST "build NNNN" IN THE FILE.
# The first version-shaped string in index.html is a COMMENT citing some old
# build, so a plain first-match read answered 1101 and failed a correct tree --
# caught by this script's own pre-cutover control run. check_build.py's
# app_stamp() anchors on the same attribute for exactly this reason.
APPB="$(grep -o 'data-cr-footer[^>]*>v2026-[0-9-]* build [0-9]*' "$D/app" \
        | grep -o 'build [0-9]*$' | grep -o '[0-9]*$' | head -1)"
ok "app.cardinalroster.com still on build 1189 or above" \
   "$([ -n "$APPB" ] && [ "$APPB" -ge 1189 ] && echo 1)" "app stamp: ${APPB:-not found}"

# ── 5 · TLS and routing ──────────────────────────────────────────────────
SUBJ="$(curl -sS -m 60 -o /dev/null -v https://showroom.cardinalroster.com/ 2>&1 \
        | grep -i '^\*  subject:' | head -1)"
ok "TLS certificate covers the hostname" \
   "$(echo "$SUBJ" | grep -qi 'cardinalroster.com' && echo 1)" "$SUBJ"
ok "served by Vercel"  "$(grep -qi '^server: *Vercel' "$D/sr.hdr" && echo 1)"

echo
if [ "$fail" -eq 0 ]; then echo "GREEN  $pass passed, 0 failed"; else
  echo "RED  $pass passed, $fail failed"
  echo "ROLLBACK: re-add showroom.cardinalroster.com to the cardinal-inspections"
  echo "          Vercel project (prj_H6uDE65cj42ZqHuBdi7dPYKeZbno). Do NOT edit DNS."
fi
rm -rf "$D"; [ "$fail" -eq 0 ]
