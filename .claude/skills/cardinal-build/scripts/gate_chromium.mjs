#!/usr/bin/env node
/* gate_chromium.mjs — the Chromium gates, in CI, each with a negative control.
 *
 * WHY THE ORIGINAL FOUR WERE OUTSIDE CI. They drive a real browser, and until now the
 * repo had no CI job that installed one. Three of them also hard-coded a browser
 * path inside the sandbox they were written in, and one had self-disabled for
 * months over fixtures that were never committed. So "not covered" understated
 * it: two of the four could not have run anywhere but one machine.
 *
 * ⚠ ALL GATES ARE GREEN ON THE SHIPPED FILE, SO THERE IS NO BASELINE HERE, AND
 * THAT IS DELIBERATE. gate_harnesses carries a debt register because four of its
 * six are legitimately red; these four are not. The honest ratchet is zero, and
 * a baseline file would only be somewhere for a future failure to hide.
 *
 * ⚠ WHICH MAKES THE NEGATIVE CONTROLS THE WHOLE VALUE. Four gates that have only
 * ever been seen to pass prove nothing — this project has shipped a gate
 * incapable of failing more than once. Each gate here is run a second time
 * against a DELIBERATELY BROKEN copy of the artifact, targeting the specific
 * thing that gate exists to protect, and is required to go red.
 *
 * Usage: node gate_chromium.mjs [index.html]
 *        node gate_chromium.mjs --selftest
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require_ = createRequire(import.meta.url);
const P = require_('./script_paths.cjs');
/* fileURLToPath, not URL.pathname: on Windows .pathname is /C:/..., and every gate died in 0s */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Each break targets what its gate is FOR — not a random corruption. A control
   that breaks something the gate never asserts on passes by doing nothing, and
   that already happened twice while building the relocation gate. */
const GATES = [
  { name: 'gate_983.mjs',
    protects: 'no invalid `font:<weight> <size> inherit` shorthand survives anywhere',
    break: { find: '#cr-occ .occ-title{', repl: '#cr-occ .occ-title{font:700 13px inherit;' } },
  { name: 'gate_1076.mjs',
    protects: "The Walk's job door: openForProject is exported and prefills from the job",
    break: { find: 'openForProject', repl: 'openForNOPE', all: true } },
  { name: 'harness_occhead.js',
    protects: 'the OC line title never breaks inside a word, at five widths x three styles',
    break: { find: 'word-break:keep-all', repl: 'word-break:break-all', all: true } },
  { name: 'audit_contrast.js',
    protects: 'every text node in OC Colors meets its WCAG floor, measured in a real engine',
    selftestFlag: true },
  /* 1197: the Appointment's rail must follow every exit the conductor did not
     choose. The break removes the one call hideAllViews() makes into the
     module, which is exactly the 1196 leak. */
  { name: 'gate_1197.mjs',
    protects: "The Appointment's rail comes down on Back, a notification, a Front Door door — every exit but its own",
    break: { find: 'window.CardinalAppointment.abandon();', repl: 'void 0;' } },
  /* 1198: Retail's portal-specific dark button gradient outranked the generic
     rb-light surface. The negative control removes the winning surface again,
     recreating the navy-currentColor-on-navy control seen on the phone. */
  { name: 'gate_1198.mjs',
    protects: 'Retail light mode gives the menu and search icons a light button surface in the winning rule',
    break: {
      find: '  color:var(--hin,#2B3D4F);\n  background:color-mix(in srgb,var(--hac,#376CA0) 10%,#ffffff);',
      repl: '  color:var(--hin,#2B3D4F);'
    } },
  /* 1199: Maps must not download at boot. The break puts scan() back to
     attaching autocomplete on sight, which fetches the Maps API behind the
     sign-in screen — the assessment's warm-boot finding. */
  { name: 'gate_1199.mjs',
    protects: 'Google Maps loads on the first focus of an address field, never at boot; the money routes fail closed',
    break: { find: 'if(isAddressInput(input)) armAutocomplete(input);',
             repl: 'if(isAddressInput(input)) attachAutocomplete(input);' } },
  /* 1200: an open client profile must stop redrawing its punch count from
     inside a body-observer wake. The break removes the guard, restoring the
     unconditional textContent write that measured 360 records in six seconds
     on one element — an identical-string write still emits a childList
     record, which is the 567/569 class. */
  { name: 'gate_1200.mjs',
    protects: 'an open client profile settles; the Approved/Completed team emails fire only on a forward move',
    break: { find: 'var txt = String(open);\nif(el.textContent !== txt) el.textContent = txt;',
             repl: 'var txt = String(open);\nel.textContent = txt;' } },
  /* 1201: nothing may be called Sent until the document really goes out. The
     break drops the wait, restoring the 1200 behaviour the gate measures
     directly — "marked Sent on the tap" with nothing emailed. Anchor counted
     in 1200 first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1201.mjs',
    protects: 'publishing offers the three real sends, and the estimate is marked Sent only once that document is',
    break: { find: 'if(!await _went) return;', repl: 'if(false) return;' } },
  /* 1202: a review request is recorded only when the rep says it went out. The
     break drops that answer on the floor, restoring the 1201 behaviour the gate
     measures — "answering Not yet records NOTHING" fails, with writes 0 -> 1.
     Anchor counted in 1201 first: 0 there, 1 here. */
  { name: 'gate_1202.mjs',
    protects: 'a review request is recorded on the send, not the tap, and the card waits for a Completed job',
    break: { find: 'if(!_went) return;', repl: 'if(false) return;' } },
  /* 1203: the Leads grid must be able to give way on an iPad. The break puts
     the un-shrinkable minimums back, which is exactly the measured 1202 state:
     the Job Summary at right=1225 on a 1194 screen. Anchor counted in 1202
     first: 0 there, 1 here. */
  { name: 'gate_1203.mjs',
    protects: 'the iPad Leads panel stays on screen, no job-menu label is truncated, Job cost is admin-only',
    break: { find: 'minmax(0,1.05fr) minmax(0,1fr)', repl: 'minmax(300px,1.05fr) minmax(320px,1fr)' } },
  /* 1204: after Publish, the three real sends must be one tap on the phone,
     not two taps deep under "More". The break puts them back behind a hidden
     wrapper, which IS the measured 1203 state: emailDocBtn, textSignBtn and
     shareBtn each rendering 0x0 inside a display:none parent, so the only way
     to send was the drawer. Anchor counted in 1203 first: 0 there, 1 here
     (BUG_CLASSES 86).
     1439 re-anchored: Client signature now sits between Share link and More
     (P03.08), so the anchor ends at the comment that follows Share link. Same break. */
  { name: 'gate_1204.mjs',
    protects: 'the published document offers Email / Text / Share on the bar itself, above "Mark sent", and the way out says Back',
    break: { find: '      <button class="btn dark" id="emailDocBtn" data-cri="mail"><span class="bl">Email to client</span></button>\n      <button class="btn dark" id="textSignBtn" data-cri="chat" title="Text the client a link to review and sign"><span class="bl">Text to sign</span></button>\n      <button class="btn dark" id="shareBtn" data-cri="paperclip"><span class="bl">Share link</span></button>\n      <!-- P03.08:',
             repl: '      <span id="edSendsBroken" style="display:none;"><button class="btn dark" id="emailDocBtn" data-cri="mail"><span class="bl">Email to client</span></button><button class="btn dark" id="textSignBtn" data-cri="chat" title="Text the client a link to review and sign"><span class="bl">Text to sign</span></button><button class="btn dark" id="shareBtn" data-cri="paperclip"><span class="bl">Share link</span></button></span>\n      <!-- P03.08:' } },
  /* 1205: the estimate builder's toolbar must clear the 44px floor. The break
     puts the 26px padding back, which IS the measured 1204 state - Close 72x26,
     Preview 88x26, and "-> Contract" 117x26 sitting at right=463 on a 390px
     screen, with the row scrolling 695 wide inside 390.
     Anchor counted in 1204 first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1205.mjs',
    protects: 'every button on the estimate builder toolbar is at least 44px tall and none sits off the right edge at 390px',
    /* 1234 re-anchored: the toolbar rule was rewritten for the Production header
       (sentence case, neutral ink, 11px radius). Same break, same meaning: drop
       the 44px floor from the one rule every toolbar button takes.
       1387 re-anchored: that rule's radius is 10px now (the consistency pass). */
    break: { find: 'color:#eceef0;padding:0 12px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;',
             repl: 'color:#eceef0;padding:6px 12px;border-radius:10px;' } },
  /* 1207: the header search must answer while you type. The break removes the
     one listener that makes it live, restoring the measured 1206 behaviour —
     type "Diamond" and NOTHING happens until Return. Anchor counted in 1206
     first: 0 there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1207.mjs',
    protects: 'the header search shows the top five matching clients as you type, from the same matcher the directory uses',
    break: { find: "i.addEventListener('input', crHsRender);",
             repl: 'void 0;' } },
  /* 1208: the Lead form must take a phone-in. The break pins the address
     guard back on, restoring the measured 1207 behaviour the gate reports in
     the audit's own words — "Required: Street, City, State, Zip", and then
     "Required: State" on the second try. Anchor counted in 1207 first: 0
     there, 1 here (BUG_CLASSES 86). */
  { name: 'gate_1208.mjs',
    protects: 'a lead taken over the phone saves from a name and a number, and an address is required only when a Job Category says there is a job',
    break: { find: 'var _needAddr = !!(_cat instanceof HTMLSelectElement && _cat.value);',
             repl: 'var _needAddr = true;' } },
  /* 1209: on a phone the client name band must come BEFORE the money card.
     797 shipped it the other way round, from a confirmed preview; Theo
     reversed that call on 10 Sep. The break restores 797's insertion point,
     which both puts the money back on top AND — because the guard is now
     previousElementSibling — makes the reparent unsatisfiable, so the card
     is moved on every resize tick. One break, both failures. */
  /* 1351 replaced 1209 here: retail has no money card on the phone any more (the strip and its wrapper
     were removed on Theo's instruction), so 1209's break could no longer turn anything red. The break
     puts the retail strip back — exactly the "Balance due three times" Theo screenshotted. */
  { name: 'gate_1351.mjs',
    protects: 'a retail job shows its money once: no strip, no Payment Information row, invoice + Payments cards as one stack',
    break: { find: "if(!_rt1351) html += '<div class=\"dbmoney\">' +",
             repl: "html += '<div class=\"dbmoney\">' +" } },
  /* 1211: the estimate header stops duplicating the thumb bar on a phone.
     The break moves the hide rule from the phone bar's own 700px block up to
     1205's 760px wrap block — the breakpoint OPEN_ITEMS actually proposed. It
     is ONE character of difference and it strands 701–760px with no Save and
     no Publish anywhere on the screen, which is invisible at 390px and at
     1194px, the two widths anyone would check. That is precisely why the gate
     sweeps six widths and asserts the INVARIANT (both controls reachable
     somewhere) rather than the rule. Verified: the break reds 6 of 31. */
  { name: 'gate_1211.mjs',
    protects: 'Save and Publish are reachable at every width, and the phone bar shows publish progress',
    break: { find: '#cr-est-view .cr-est-head #cr-epub-btn{display:none}}',
             repl: '}@media (max-width:760px){#cr-est-view .cr-est-head [data-act="save"],#cr-est-view .cr-est-head #cr-epub-btn{display:none}}' } },
  /* 1213: the sign-in screen is the sign-in box. The break does NOT restore the
     hero panel — it restores the DESKTOP RULE that hid the card's own quote
     because the panel used to carry it. That is the failure worth guarding: the
     panel going is obvious, the quote silently disappearing from the desktop
     sign-in is not. Verified: the break reds section D at 1440 and leaves 390
     alone, which is exactly the shape of the bug. */
  { name: 'gate_1213.mjs',
    protects: 'the sign-in box stands alone and keeps its daily quote at every width',
    break: { find: '#loginView.open .logincard{width:400px;flex:0 0 auto;}',
             repl: '#loginView.open .logincard{width:400px;flex:0 0 auto;}#loginView.open .loginsep,#loginView.open #loginQuote{display:none;}' } },
  /* 1214: Chart.js and Papa Parse load on first use. The break puts one eager
     tag back beside supabase-js, which is precisely how they shipped before —
     so the control is the real previous behaviour, not an invented one. */
  { name: 'gate_1214.mjs',
    protects: 'neither charting nor CSV downloads before sign-in, and both still load on demand',
    break: { find: '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
             repl: '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>' } },
  /* 1215: the sign-in card lost its own mark too. The break PUTS A MARK BACK in
     the card, at the spot the removed one occupied — so the control is the real
     previous behaviour rather than a contrived one, and it reds the three claims
     that matter together: the element is absent, nothing paints an image inside
     the box, and the heading is the first thing in it. A 1x1 data URI is used
     rather than the original 16 KB blob because what is being proved is that an
     image in that position is SEEN, not which image it was. */
  { name: 'gate_1215.mjs',
    protects: 'the sign-in card paints no image at all and opens on its heading',
    break: { find: '<div class="logincard">',
             repl: '<div class="logincard"><img class="loginlogo" id="loginLogo" alt="" style="display:block;width:120px;height:40px;background:#333" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' } },
  /* 1216: the Invoices card went dark. The break RESTORES THE WHITE, by putting
     the shipped light value back as the dark default — which is exactly the
     mistake a future edit would make, and it reds both halves at once: the card
     ground stops being dark AND the light theme stops being byte-identical. */
  { name: 'gate_1216.mjs',
    protects: 'the Invoices card is dark and readable in dark, and unchanged in light',
    break: { find: '--crji-card:#141619;', repl: '--crji-card:#FFFFFF;' } },
  /* 1217: the estimate builder got dark chrome around a paper document. The
     break restores the LIGHT ground as the dark default — which is precisely
     the no-op this build spent three rounds finding, and it reds the whole
     chain at once: the view ground, the jump list, and every ink in the top
     bar, which then scores against a near-white page. */
  { name: 'gate_1217.mjs',
    protects: 'the estimate builder frame is dark, the estimate is still paper, and light is unchanged',
    break: { find: '--estc-viewbg:#0c0d0f;', repl: '--estc-viewbg:#F4F4F5;' } },

  /* 1218: the AR dashboard and the payment sheet. The break restores the
     porcelain page ground as the dark default, which reds the view ground,
     the invoice card and the KPI tile together. It is deliberately the
     --est-bg line INSIDE the dark #cr-ar-view rule and not the token name,
     because the same declaration text appears in the light restoration rule
     directly below it — the anchor carries the dark card value with it so it
     can only match once. (`--est-bg:#F4F4F5` on its own matches the light
     rule and would break nothing while reading as a valid break.) */
  { name: 'gate_1218.mjs',
    protects: 'the AR dashboard and the offline payment sheet are dark, and light is byte-for-byte what shipped',
    break: { find: '--est-bg:#0c0d0f; --est-panel:#141619;',
             repl: '--est-bg:#F4F4F5; --est-panel:#FFFFFF;' } },

  /* 1446: Production's sky. The break is the loop's stop condition, which is the
     part a later edit is most likely to loosen: with only "is the canvas still
     there" left, the sky keeps scheduling frames on a closed board and a list
     pane, and the E checks go red. (The visual half — clock, contrast, grid —
     is asserted on every run; this control proves the cost half can fail.) */
  { name: 'gate_1446.mjs',
    protects: "Production's sky follows the clock, keeps its text >= 4.5:1, and draws nothing once it cannot be seen",
    break: { find: 'if(!skyLive()){ SKY.run = false; return; }',
             repl: 'if(!(SKY.cv && SKY.cv.isConnected)){ SKY.run = false; return; }' } },

  /* 1447: the sticky bar is shown by the sky's observer and by nothing else. The break
     removes that one line, so the bar stays hidden past the sky and A goes red. */
  { name: 'gate_1447.mjs',
    protects: "Production's sticky bar appears once the sky scrolls away, and the sky's chip names the next wet hour and the temperature",
    break: { find: "if(st) st.classList.toggle('on', !es[0].isIntersecting);",
             repl: 'void st;' } },

  /* 1448: Dispatch's wet-day flag. The break empties the one line that asks CardinalWx for
     the day's flag, so a rain day's job goes bare and A/B go red. */
  { name: 'gate_1448.mjs',
    protects: "a Crew Dispatch job booked on a wet day wears the day's rain flag (CardinalWx.flag), and a dry day's does not",
    break: { find: "var wf = (s && statusPip(w) !== 'done' && window.CardinalWx && window.CardinalWx.flag) ? window.CardinalWx.flag(s) : '';",
             repl: "var wf = '';" } },

  /* 1449: the Color Studio door. The break swaps the owner test for "everyone", which puts the
     tile in front of Joan, Nick and Curtis — accounts the Showroom refuses — and C goes red. */
  { name: 'gate_1449.mjs',
    protects: "the Job Menu's Color Studio tile is the Showroom owner's alone, and opens the Experience in a new tab",
    break: { find: "(crIsShowroomOwner() ? jt(dbIc('swatch'), 'Color Studio ↗', '', 'colorstudio') : '')",
             repl: "(true ? jt(dbIc('swatch'), 'Color Studio ↗', '', 'colorstudio') : '')" } },

  /* 1450: obsidian instead of navy. The break strips the obsidian face back to a flat panel,
     so a home card paints no sheen and F goes red. ⚠ all:true — 1456 and 1458 reuse the same face
     line, and 1458's sits EARLIER in the file, so breaking only the first copy (the default) broke
     the home health line instead of the home cards and the control stayed green (PR 773's CI). */
  { name: 'gate_1450.mjs',
    protects: "dark retail is obsidian, not navy: #09090C page, 545's obsidian face on the boxes, no navy left on the home, drawer or client page; light untouched",
    break: { find: '  background:#15161C radial-gradient(120% 90% at 22% -10%,#2c2d36 0%,#15161c 45%,#08080b 100%);',
             repl: '  background:#15161C;', all: true } },

  /* 1451: Punch — finishing a job. The break stops the list grouping the crew's "finished"
     jobs, so nothing sits under Ready to close and A goes red. */
  { name: 'gate_1451.mjs',
    protects: "a job the crew said is finished shows under Ready to close; the phone card pins Close to the bottom; a told-Curtis receipt replaces the button",
    break: { find: "function plGroup(it){ return plPing(it) ? 'ping' : plReady(it) ? 'ready' : plBase(it); }",
             repl: "function plGroup(it){ return plPing(it) ? 'ping' : plBase(it); }" } },

  /* 1452: Punch — saves that tell the truth. The break puts back the early return that dropped a
     second save, so the message never reaches the database and A goes red. */
  { name: 'gate_1452.mjs',
    protects: "a second save waits instead of being dropped; a refused save keeps the message and buzzes nobody; a failed load says so; photos keep their slots",
    break: { find: "while(busy && _w < 150)",
             repl: "if(busy) return true; while(false && _w < 150)" } },

  /* 1453: Punch — one vocabulary and lateness. The break names a repair a Ticket again, so A goes red. */
  { name: 'gate_1453.mjs',
    protects: "Punch & Repairs everywhere, Repair not Ticket, lateness on the card / client page / Production tile, days to close, Closed opens Closed",
    break: { find: "it.kind === 'ticket' ? 'Repair' :",
             repl: "it.kind === 'ticket' ? 'Ticket' :" } },

  /* 1454: Punch — the Assign sheet. The break goes back to four days, so A goes red. */
  { name: 'gate_1454.mjs',
    protects: "six days, a time, per-day stops, a readable Assign button in dark, a 44px Close",
    break: { find: "for(var i = 0; out.length < 6 && i < 9; i++){",
             repl: "for(var i = 0; out.length < 4 && i < 7; i++){" } },

  /* 1455: Punch — desktop. The break stops the card becoming a side panel, so A goes red. */
  { name: 'gate_1455.mjs',
    protects: "the card is a right-hand panel on a desk, Escape closes it and the Assign sheet, the table sorts, the ultrawide list is the table",
    break: { find: "el.classList.toggle('side', ",
             repl: "el.classList.toggle('side-off', " } },

  /* 1456: Punch in obsidian with the hammer art. The break drops the art's URL, so A goes red. */
  { name: 'gate_1456.mjs',
    protects: "Punch & Repairs list, card and client rows in obsidian, no tab caps, sentence case, the hammer art behind the list; light untouched",
    break: { find: "url('/punch-art-hammer.jpg') right bottom",
             repl: "none right bottom" } },

  /* 1457: the 5-photo lock off for bosses, for now. The break turns the lock back on, so A goes red.
     ⚠ When Theo asks for the lock back, flip PHOTO_LOCK and retire this gate in the same build. */
  { name: 'gate_1457.mjs',
    protects: "with PHOTO_LOCK off, Theo, Joan and Curtis close without photos; the crew still needs five",
    break: { find: "var PHOTO_LOCK = false;",
             repl: "var PHOTO_LOCK = true;" } },

  /* 1458: punch health on Home. The break empties the mount id, so the line has nowhere to paint. */
  { name: 'gate_1458.mjs',
    protects: "one Punch & Repairs health line under the pipeline on Home; a tap opens Past due",
    break: { find: '<div id="kpPunchHealth"></div>',
             repl: '<div id="kpPunchHealthOff"></div>' } },

  /* 1459: Tomorrow on a late row. The break stops the button being drawn. */
  { name: 'gate_1459.mjs',
    protects: "a Tomorrow button on past-due rows for the schedulers, and a buzz to the assignee when a day moves",
    break: { find: "  if(plBase(it) !== 'late') return '';",
             repl: "  return '';" } },

  /* 1460: two editors. The break skips the conflict check, so the second save overwrites again. */
  { name: 'gate_1460.mjs',
    protects: "a save of the checklist or Bring list does not overwrite a change made since the card loaded",
    break: { find: "  if(_ck.length && _snap[it.id] && !_noSignal(null)){",
             repl: "  if(false){" } },

  /* 1461: the queue cap. The break shows every queued item again. */
  { name: 'gate_1461.mjs',
    protects: "the needs-assigned box shows the oldest three and a Show all button",
    break: { find: "var qShow = PU.qAll ? queue : queue.slice(0, 3);",
             repl: "var qShow = queue;" } },

  /* 1462: the readable card. The break turns the whole block off, so A–C go red. */
  { name: 'gate_1462.mjs',
    protects: "the punch card's buttons and slot names at 13px, headings at 12px, and a light On site bar in light",
    break: { find: '<style id="cr-pk-read-styles">',
             repl: '<style id="cr-pk-read-styles" media="print">' } },

  /* 1463: + New says so. The break makes flash() do nothing, so B goes red. */
  { name: 'gate_1463.mjs',
    protects: "+ New says Added and rings the new item; every form control named; readable placeholders",
    break: { find: "  flash  : function(id, msg){",
             repl: "  flash  : function(id, msg){ return;" } },

  /* 1464: the desk dialog. The break leaves the sheet hanging from the top, so C goes red. */
  { name: 'gate_1464.mjs',
    protects: "the punch search finds kind, phone, filer, names, steps and messages; desk sheets open centred",
    break: { find: '.pu-sheet.open{ --cr-stack:"1464 desk: the punch sheets open as a centred dialog"; align-items:center; }',
             repl: '.pu-sheet.open{ --cr-stack:"1464 desk: the punch sheets open as a centred dialog"; align-items:flex-start; }' } },
  /* ⚠ 15 Nov 2026 — THE SEVEN BELOW RAN NOWHERE BUT ONE CONTAINER FOR WEEKS, AND FIVE WERE RED.
     1116, 1317, 1400, 1416, 1420, 1430 and 1441 hard-coded /home/user/cardinal-inspections, /opt/node22
     and /opt/pw-browsers, so neither this runner nor a desk could start them, and nothing registered
     them here. Read one at a time, the five reds were: three tests a later build had made untrue
     (1466's field job sheet replaced the toast 1317 C and 1430 #17 wait for; 1322 added a view 1116
     never classified), one rig fault (the mock hands out its own live rows, so 1460's conflict check
     refused the card's own save - 1416 A11), and ONE real defect, fixed as build 1480 (1441 H: the
     Punch search hint cut off at Large / Larger / Sun). They read their paths from gate_env.mjs now.
     A gate that only one machine can run is not a gate; it is a file. */
  { name: 'gate_1441.mjs', timeout: 600000,
    protects: "round-1 leftovers at four text sizes - among them: the Punch & Repairs search hint fits its box at Normal, Large, Larger, Sun and Sun + Larger (1480)",
    break: { find: "var want = (have > 0 && cv.measureText(LONG).width > have) ? SHORT : LONG;",
             repl: "var want = LONG;" } },
  { name: 'gate_1479.mjs',
    protects: "on a desk Crew Dispatch stays open under the work-order picker: Cancel leaves you on the board and a new work order shows on it; on a phone Dispatch still closes first",
    break: { find: "if(!canPick || !document.body.classList.contains('cr-lnav-on')){",
             repl: "if(true){" } },
  { name: 'gate_1430.mjs', timeout: 600000,
    protects: "audit items 7/11/16/17/22/23/24 - among them: a field login tapping a Dispatch job gets that job's punch card or field job sheet on top, never the client profile",
    break: { find: "  if((typeof isFieldUser === 'function' && isFieldUser())){ crFieldJob(id); return; }   /* 1430 */",
             repl: "" } },
  { name: 'gate_1420.mjs',
    protects: "for a production account Home (the bottom bar and the header house) opens the Production board, not the retail home; Theo and a rep still get the retail home",
    break: { find: "   window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){ window.CardinalProduction.open(); return; }",
             repl: "   false){ window.CardinalProduction.open(); return; }" } },
  { name: 'gate_1416.mjs', timeout: 600000,
    protects: "the production judge's fixes at five widths - among them: a punch step that requires a note opens a field in the card and ticks nothing until the note is saved",
    break: { find: "  if(!s.d && s.req && !String(s.note || '').trim()){",
             repl: "  if(false){" } },
  { name: 'gate_1400.mjs',
    protects: "a production day - among them: only the admin's work order reads crew_rates (production's says the office handles rates)",
    break: { find: "    if(typeof isAdminUser === 'function' && isAdminUser()) try{",
             repl: "    if(true) try{" } },
  { name: 'gate_1317.mjs',
    protects: "Scottie stays in Production: his app opens there, and openProject never opens the client profile (Balance Due, the money tabs) for a field login",
    break: { find: "  if((typeof isFieldUser === 'function' && isFieldUser())){ crFieldJob(id); return; }   /* 1430 */",
             repl: "" } },
  { name: 'gate_1116.mjs',
    protects: "every shared screen keeps ONE header under every portal and names itself, and every view hideAllViews() knows is classified",
    break: { find: "'cr-ar-view':'Invoices'",
             repl: "'cr-ar-view':'Production'" } },
  { name: 'gate_1478.mjs',
    protects: "the menu has one Production row in every portal: Daily's outside Production, the section's inside it; the desk rail opens that section on the way in",
    break: { find: "var hd1478 = (p === 'production');",
             repl: "var hd1478 = false;" } },
  { name: 'gate_1477.mjs',
    protects: "the sky's title, date and subtitle hold their floor over a pale cloud in rain and night snow; the punch tick is a 44px target; Dispatch's chips are 44; Dispatch's bands, cards and job names work from the keyboard",
    break: { find: '#cr-pb .pbsky[data-wx="rain"] .pbskyin,',
             repl: '#cr-pb .pbsky[data-wx="none1477"] .pbskyin,' } },
  { name: 'gate_1476.mjs',
    protects: "Crew Dispatch in Production's sans and sentence case, inside the app shell on a desk, using an ultrawide; the full calendar as wide as home; the home month names a day's work on a desk",
    break: { find: "      '<span class=\"pbpips\">' + pips + '</span>' + nm76 + '</button>';",
             repl: "      '<span class=\"pbpips\">' + pips + '</span></button>';" } },
  { name: 'gate_1475.mjs',
    protects: "Open job and Crews from Production keep the Production header and Home goes back to Production; Crews says ‹ Production; one name; + Punch item; the empty Scheduled list points at Crew Dispatch",
    break: { find: "if(prodCtx1475()) return 'production';   /* 1475 */",
             repl: "if(false) return 'production';   /* 1475 */" } },
  { name: 'gate_1474.mjs',
    protects: "Production on a phone leads with the boxes and today's list; a field login gets My day (Directions, Open) and no office tiles; the desk grid is unchanged",
    break: { find: "  #cr-pb .pbhome > .pbmonth{ order:6; margin-top:14px; }",
             repl: "  #cr-pb .pbhome > .pbmonth{ order:-1; margin-top:14px; }" } },
  { name: 'gate_1473.mjs',
    protects: "Production lists: soonest build first, the build day on its own line, Needs a date lists every undated job, past due / Punch closed wording, a finished job leaves Scheduled",
    break: { find: "      if(ga !== gb) return ga - gb;",
             repl: "      if(false) return ga - gb;" } },
  { name: 'gate_1472.mjs',
    protects: "Production reads Crew Dispatch's bookings: the Scheduled box, day sheet and job cards see a crew-booked build day; Book crew arms Dispatch; Back returns; Needs a crew includes sold jobs",
    break: { find: "    if(!w.error) wos1472 = w.data || [];",
             repl: "    if(false) wos1472 = w.data || [];" } },
  { name: 'gate_1471.mjs',
    protects: "on a 2200px+ screen a Job Menu section opens beside the client page; Back closes it; 1440 and Community unchanged; shrinking drops back to one",
    break: { find: "  pv.classList.toggle('cr-split', on);",
             repl: "  pv.classList.toggle('cr-split', false);" } },
  { name: 'gate_1470.mjs',
    protects: "client page desktop + small things: a Text link on desk, a wider page on ultrawide, History's real count and last touch, readable punch flags, 44px folds and appointment X, Color Studio marked",
    break: { find: ".mathead.collhead{min-height:44px;}",
             repl: ".mathead.collhead{min-height:0;}" } },
  { name: 'gate_1469.mjs',
    protects: "the screens behind the Job Menu: the message box, Appointments form and Checklists cards are dark in dark (unchanged in light), one Back to client profile everywhere, no emoji",
    break: { find: ":root:not([data-theme=\"rb-light\"]) .ckcard{--cr-stack:\"1469 the Checklists cards' dark twin\";background:#141418;",
             repl: ":root:not([data-theme=\"rb-light\"]) .ckcard{--cr-stack:\"1469 the Checklists cards' dark twin\";background:#ffffff;" } },
  { name: 'gate_1468.mjs',
    protects: "the Job Menu runs Sell / Build / Close in job order, every tile has its own icon, no tile lost, readable headings",
    break: { find: "'<div class=\"jasect\" role=\"heading\" aria-level=\"4\">Sell</div>' +",
             repl: "" } },
  { name: 'gate_1467.mjs',
    protects: "the client page's status line sits under the stage band on phone, desk and wide; it flags a sold job with no contract, shows the next appointment, and hides the balance from production",
    break: { find: "body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .dbstatus{ order:1; grid-column:1 / -1; }",
             repl: "body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > .dbstatus{ grid-column:1 / -1; }" } },
  { name: 'gate_1466.mjs',
    protects: "a field login reaches Install photos: a job being installed (or with no punch-out) opens the field job sheet with directions, call, install photos and its punch items",
    break: { find: "  if(pr){ fjOpen(pr, open, installing); return; }",
             repl: "  if(false){ fjOpen(pr, open, installing); return; }" } },
  { name: 'gate_1465.mjs',
    protects: "the stage menu is styled with 44px rows and Mark Lost last; Mark Lost asks first and Advance waits out the Undo window; measurement numbers, Orders and a $0 balance are readable",
    break: { find: "crStageDefer(pr, 'Lost', { lostReason: String(ans) });",
             repl: "await setStage(pr.id, 'Lost', { lostReason: String(ans) }); renderOverview(); renderPipeline();" } },
  /* 15 Nov 2026: 34 gates from 1401-1445 that only ever ran in the container they were written in.
     Each break undoes one piece of that build's own change (or, for 1407 / 1424 / 1425 / 1432, the
     thing its header names), and each was seen to turn its gate red ON A NAMED CHECK, not by a crash.
     Left out on purpose: 1438 / 1443 (CI's fonts put a label 2px over its box and ten tap areas at
     43px where a desk measures 44 - font metrics, not the app; OPEN_ITEMS), 1423 (needs pdfinfo),
     1439 (PDF text read by poppler), 1434 / 1442 (they
     compare against a frozen 1433 / 1438 tree, so every later build that moves those screens turns
     them red), 1436 (Sun contrast - open item). */
  { name: "gate_1401.mjs",
    protects: "an office day on insurance, Community and money. Seed: gate_1401_seed.js (sample names only).",
    break: { find: "amt:_cl.dep + _cl.sup });",
             repl: "amt:(Number(c.approved_depreciation) || 0) +\n(Number(c.supplement_approved) || 0) });" } },
  { name: "gate_1402.mjs",
    protects: "what the client sees: documents made by the app, served by the real api/share.js, rendered at 390px.",
    break: { find: "  var num = (poOf(pr) || 'INV') + '-' + (invCount + 1);   /* 1402: the label already says \"Invoice #\" */",
             repl: "  var num = '#' + (poOf(pr) || 'INV') + '-' + (invCount + 1);" } },
  { name: "gate_1403.mjs",
    protects: "scheduling, notifications, offline.",
    break: { find: "  await pdb.update(pr.id, { checklist: s }, patch);   /* 1403: offline, only these keys are replayed */",
             repl: "  await pdb.update(pr.id, { checklist: s });" } },
  { name: "gate_1404.mjs",
    protects: "photos, quick inspection, estimate builder (390px, America/New_York, the 1401 seed).",
    break: { find: "        sp = row.data && row.data.storage_path || null;",
             repl: "        if(row.data && row.data.storage_path){\n          /* 1221: the twin goes with it; removing a twin that was never made is a no-op */\n          await sb.storage.from('photos').remove([row.data.storage_path, photoThumbPathOf(row.data.storage_path)].filter(Boolean));\n        }" } },
  { name: "gate_1405.mjs",
    protects: "inspection reports on paper, the Supplement Desk, api/supplement.js.",
    break: { find: "  /* 1405: the same compaction Print applies — the PDF a client is sent carried every placeholder and empty section */\n  var _dd = null; try{ _dd = /** @type {any} */ (frame).contentDocument; if(_dd) compactForPrint(_dd); }catch(_cp){}\n  try{ if(window.CardinalDownload) window.CardinalDownload.frame(frame, t); }\n  finally{ try{ if(_dd) restorePrintMarks(_dd); }catch(_rp){} }",
             repl: "  if(window.CardinalDownload) window.CardinalDownload.frame(frame, t);" } },
  { name: "gate_1406.mjs",
    protects: "roles, search, the Community bid path (seed gate_1406_seed.js, sample names only).",
    break: { find: "((p.location && p.location.street) || ''));\ns = _fold(s);   /* 1406 */",
             repl: "((p.location && p.location.street) || '')).toLowerCase();" } },
  { name: "gate_1407.mjs", args: [],
    protects: "staff only (public signup is on, so a session is not staff).",
    break: { file: "api/companycam-job.js", find: "    if (!isStaff(email)) { res.status(403).json({ error: 'Cardinal staff only' }); return; }   // 1407",
             repl: "" } },
  { name: "gate_1409.mjs",
    protects: "a lead card opens the client at every width; hover previews on a mouse.",
    break: { find: "  /* 1409: a click opens the client at every width (it only selected on desktop, which did nothing\n     visible whenever the side pane was off screen). The pane is now the hover preview, below. */\n  openProject(card.getAttribute('data-lj'));\n});\n/* 1409: pointing at a card with a mouse previews it in the side pane (the old click-to-select) */\ndocument.getElementById('ljList').addEventListener('mouseover', function(e){\n  if(window.innerWidth <= 900 || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;\n  var tg = /** @type {any} */ (e.target), card = tg && tg.closest && tg.closest('.ljcard');\n  if(!card) return;",
             repl: "" } },
  { name: "gate_1411.mjs",
    protects: "Team Feedback.",
    break: { find: "  feedback:  'CardinalFeedback.open',",
             repl: "" } },
  { name: "gate_1412.mjs",
    protects: "the three bottom sheets sit above the installed app's nav.",
    break: { find: "/* 1412: 9995 — Jacob could not reach Save under the installed app's nav */\n#ctUpSheet{position:fixed;left:0;right:0;bottom:0;z-index:9995;display:none;max-height:92vh;overflow:auto;",
             repl: "#ctUpSheet{position:fixed;left:0;right:0;bottom:0;z-index:9600;display:none;max-height:92vh;overflow:auto;" } },
  { name: "gate_1413.mjs",
    protects: "posting a message never erases a teammate's.",
    break: { find: "  Object.keys(patch).forEach(function(k){\n    /* 1413: a message list is merged, never replaced — a teammate's note posted since this copy was read survives */\n    if(k === 'comments' && Array.isArray(patch[k]) && Array.isArray(all[k])) all[k] = crMergeComments(all[k], patch[k]);\n    else all[k] = patch[k];\n  });",
             repl: "  Object.keys(patch).forEach(function(k){ all[k] = patch[k]; });" } },
  { name: "gate_1414.mjs",
    protects: "the common screens carry drawn icons, not emoji.",
    break: { find: "      Delete Client</button>",
             repl: "      &#128465; Delete Client</button>" } },
  { name: "gate_1415.mjs",
    protects: "calmer cards, spelled stages, one typeface.",
    break: { find: "  font:13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}",
             repl: "  font:13px 'Segoe UI',Arial,sans-serif;}" } },
  { name: "gate_1417.mjs", timeout: 600000,
    protects: "team messages: a second device's post reaches an open thread, mentions reach only the person meant, the tag badge",
    break: { find: "  function jt(ic, label, n, act, idn, extra){",
             repl: "  function jt(ic, label, n, act, idn){" } },
  { name: "gate_1418.mjs", timeout: 600000,
    protects: "Insurance follows the app theme; the siren surfaces (claim card, money ring, Balance Due) are dark and readable in both",
    break: { find: "    background: var(--xl-card, #fff);\n    border: 1px solid var(--xl-bd, #e5e5e5);",
             repl: "    background: #fff;\n    border: 1px solid #e5e5e5;" } },
  { name: "gate_1419.mjs",
    protects: "a draft stays on its own job.",
    break: { find: "          '<p>Tap to open the job\\u2019s thread and reply.</p>', commsLink(pr.id));   /* 1417 #7; 1419 the job it was sent on */",
             repl: "          '<p>Tap to open the job\\u2019s thread and reply.</p>', commsLink(currentProject.id));   /* 1417 #7 */" } },
  { name: "gate_1421.mjs",
    protects: "the shared task sheet (#tskModal: New work order, Measurements) reads on its white card.",
    break: { find: "    '<label style=\"display:block;font:700 11px \\'Segoe UI\\',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6b5d56;margin-bottom:3px;\">Crew</label>' +",
             repl: "    '<label style=\"display:block;font:700 11px \\'Segoe UI\\',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#8a7a72;margin-bottom:3px;\">Crew</label>' +" } },
  { name: "gate_1422.mjs",
    protects: "the Ask button wears the portal colour and is a round star on a phone.",
    break: { find: "  height:48px; padding:0 18px; border-radius:99px; border:0; background:var(--crm-id,var(--ai-red,#C8202E)); color:var(--crm-id-ink,#fff);",
             repl: "  height:48px; padding:0 18px; border-radius:99px; border:0; background:var(--ai-red,#C8202E); color:#fff;" } },
  { name: "gate_1424.mjs", timeout: 600000,
    protects: "estimates and invoicing after judges #2 (Estimates) and #5 (Invoicing & payments).",
    break: { find: "if(paid > 0.005) return { k:'part', label:'Partly paid' };",
             repl: "if(paid > 0.005) return { k:'part', label:'Deposit Paid' };" } },
  { name: "gate_1425.mjs",
    protects: "insurance and community job pages sit still while nobody touches them.",
    break: { find: "      if(a && INS_LABEL[a[1]]){ if(t !== 'Advance to ' + INS_LABEL[a[1]]) b.textContent = 'Advance to ' + INS_LABEL[a[1]]; return; }",
             repl: "      if(a && INS_LABEL[a[1]]){ b.textContent = 'Advance to ' + INS_LABEL[a[1]]; return; }" } },
  { name: "gate_1426.mjs",
    protects: "client names show in full.",
    break: { find: "    line-height:1.15; overflow-wrap:anywhere;   /* 1426: wraps instead of cutting — 119 of 161px showed */",
             repl: "    line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" } },
  { name: "gate_1427.mjs",
    protects: "contracts sent by link: notices, the signed copy, initials, co-buyer, the phone page",
    break: { find: "(_tr ? ' Its Terms and Conditions and both Notice of Cancellation copies are the trade\\u2019s printed master: '\n     + 'the share link and the client\\u2019s signed-copy email carry them. Signing in person, hand the client the printed master.'",
             repl: "(_tr ? ' The Right to Cancel and the printed Notice of Cancellation go with this agreement.'" } },
  { name: "gate_1428.mjs",
    protects: "uploading a signed contract asks to move the job to Approved (Theo, 29 Oct: \"yes\").",
    break: { find: "           (_upMoved ? ' The job is Approved and Curtis has the schedule + order materials alert.'\n            : (_upTold ? ' Curtis and the office were told; the job stays ' + _upStage + ' until someone moves it to Approved.' : ''))));",
             repl: "           (_upTold ? ' Curtis and the office were told; the job stays ' + _upStage + ' until someone moves it to Approved.' : '')));" } },
  { name: "gate_1429.mjs",
    protects: "contract viewer readable, lead source, checklist required fields, drawn pins (Builder H's items)",
    break: { find: "        <button class=\"chipbtn\" id=\"qiLocBtn\" data-cri=\"pin crico\">My location</button>",
             repl: "        <button class=\"chipbtn\" id=\"qiLocBtn\">&#128205; My location</button>" } },
  { name: "gate_1431.mjs",
    protects: "the lead-source list without duplicates (Theo: \"Trim duplicate lead sources\").",
    break: { find: "  'Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Non Profit','Real-estate','Real-estate: Kitty Hawk',\n  'Roofle','Telemarketing','Truck','Other'];\n/* other spellings of the same sources (case is matched separately). 1431 (Theo: \"Trim duplicate lead\n   sources\"): Canvasser and the four Internet/Google spellings left the picker; jobs stored under them,\n   and under the \"Non Proffit\" typo, show and count as the source they are. Nothing stored is rewritten. */\nvar CR_LEAD_SOURCE_ALIAS = { 'door knocking':'Door knock', 'canvasser':'Door knock', 'previous customer':'Repeat customer',\n  'google':'Google / website', 'website':'Google / website', 'internet':'Google / website',\n  'internet: google':'Google / website', 'internet: website':'Google / website',\n  'non proffit':'Non Profit', 'kitty hawk':'Real-estate: Kitty Hawk' };",
             repl: "  'Canvasser','Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Internet','Internet: Google','Internet: Website',\n  'Non Profit','Real-estate','Real-estate: Kitty Hawk','Roofle','Telemarketing','Truck','Other'];\n/* the New Lead form's old spellings of three of the same sources (case is matched separately) */\nvar CR_LEAD_SOURCE_ALIAS = { 'door knocking':'Door knock', 'previous customer':'Repeat customer' };" } },
  { name: "gate_1432.mjs",
    protects: "the Supplement card is retired (Theo, 30 Oct: \"Retire card\").",
    break: { find: "module's other job: putting the Scope of Loss card on an insurance client page. */\nfunction isInsurance(pr){",
             repl: "module's other job: putting the Scope of Loss card on an insurance client page. */\nwindow.CardinalSupplement = { open: function(){} };\nfunction isInsurance(pr){" } },
  { name: "gate_1433.mjs",
    protects: "the appointment sheet reads, and Ask stops covering form buttons.",
    break: { find: "    return open('cr-est-view') || open('editorView') || open('cr-scan') || open('cr-ce-view') || shown('commsView') || shown('qiStartView') || shown('resourceLibraryView') ||   /* H (#13): + the contract viewer */\n      shown('apptModal') || shown('leadFormModal') || shown('projModal');   /* 1433: the form sheets' own Add / Create / Save sat under it */",
             repl: "    return open('cr-est-view') || open('editorView') || open('cr-scan') || open('cr-ce-view') || shown('commsView') || shown('qiStartView') || shown('resourceLibraryView');   /* H (#13): + the contract viewer */" } },
  { name: "gate_1435.mjs", timeout: 600000,
    protects: "Reports follow light mode, and the eight form sheets go dark in dark mode, measured at 1440 and 390",
    break: { find: "    st.style.color = (j.ok ? 'var(--sheet-good,#2e7d32)' : 'var(--sheet-amber,#8a5a00)');",
             repl: "    st.style.color = (j.ok ? '#2e7d32' : '#8a5a00');" } },
  { name: "gate_1437.mjs",
    protects: "the Clients bar's portal chips never run off the screen.",
    break: { find: ".cd-wrap{padding-bottom:160px;--cr-stack:\"the Clients list's own clearance over its fixed CRM bar; .wrap is the shared page container\"}/* 1437: was 120 — room for the CRM bar's second row (62 tab bar + ~81 two rows) */",
             repl: ".cd-wrap{padding-bottom:120px;}" } },
  { name: "gate_1440.mjs", timeout: 600000,
    protects: "thirteen round-1 phone leftovers: Crew Dispatch chips, Production home, the inspection checklist asked once",
    break: { find: "    if(a === 'skip'){ S.skipCl = true; return igStep3(); }   /* A4 (P12.13) */",
             repl: "    if(a === 'skip') return igStep3();" } },
  { name: "gate_1444.mjs",
    protects: "the insurance side is called Insurance (Theo's pick for question C, 2 Nov 2026).",
    break: { find: "{ name:'Insurance', open:function(){",
             repl: "{ name:'Cardinal Claims', open:function(){" } },
  { name: "gate_1445.mjs",
    protects: "punch-out photos go up several at a time, are held on the phone while offline, and arrive",
    break: { find: "        await queuePhoto(id, f); held++; continue;",
             repl: "        await queuePhoto(it.id, f); flushPhotos(); return;" } },
];

/* ⚠ THE PER-GATE SECONDS ARE HERE BECAUSE I ONCE CANCELLED TWO HEALTHY CI RUNS
   FOR WANT OF THEM. 10 Sep 2026: GitHub's jobs API reported this step
   `in_progress` for the better part of an hour after it had finished, and its
   log endpoint 404s while a job reads as running — so "still going" and
   "finished ages ago" are the same two signals. I read that as an 85-minute
   hang, invented a cause, and cancelled runs 2158 and 2159 by hand. THE
   TIMESTAMPS SAID OTHERWISE and I did not look at them until afterwards: 2158's
   gates step ran 08:37:00 → 08:41:06, four minutes, killed about one minute
   short of finishing. There was no hang. Measured on the very next run, with 14
   gates: 5m18s, worst gate 46s. **Read `started_at`/`completed_at`, never the
   status field.** BUG_CLASSES 90.

   The file-instead-of-pipe below is real hardening and is KEPT, but it is
   precautionary, not a fix for anything observed: with `stdio: 'pipe'`,
   execFileSync blocks reading stdout until every writer closes it, and a gate
   whose watchdog calls `process.exit(3)` without closing Playwright leaves an
   orphaned Chromium holding that inherited pipe — `timeout` kills the child it
   spawned, not the browser behind it. Writing to a temp file removes the pipe,
   so the timeout is real. The gates also close their browser in the watchdog
   now, which is the same hazard closed from the other side. */
/* `timeout`: a gate entry may name its own (1416, 1430 and 1441 are 80-110s on a desk and walk
   five widths or five text sizes; the 300s default is one slow runner away from killing them). */
function run(script, args, timeout) {
  const t0 = Date.now();
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gate-out-')), 'out.txt');
  const fd = fs.openSync(log, 'w');
  let code;
  try {
    execFileSync(process.execPath, [path.join(HERE, script), ...args],
                 { stdio: ['ignore', fd, fd], timeout: timeout || 300000, killSignal: 'SIGKILL' });
    code = 0;
  } catch (e) {
    code = e.status == null ? 'CRASH' : e.status;
  } finally {
    try { fs.closeSync(fd); } catch (_) {}
  }
  let out = '';
  try { out = fs.readFileSync(log, 'utf8'); } catch (_) {}
  try { fs.rmSync(path.dirname(log), { recursive: true, force: true }); } catch (_) {}
  return { code, out, secs: Math.round((Date.now() - t0) / 1000) };
}
const lastLine = o => (o.trim().split('\n').filter(Boolean).pop() || '').slice(0, 88);
/* 1215: a gate that goes red ONLY in CI used to print one summary line and
   nothing else, so the run said "2 of 20 failed" and never which 2. That is a
   diagnosis you cannot get without pushing another commit to look at. Print the
   gate's own failing lines — bounded, so a gate having a very bad day cannot
   bury the log. GATE ERROR / TIMEOUT lines come too, because those are the
   shapes a control that crashes instead of reporting red takes. */
const CAP = 24;
function failLines(o) {
  const hits = (o || '').split('\n')
    .filter(l => /^\s*(✗\s*)?FAIL /.test(l) || /^GATE (ERROR|\w+ )?TIMEOUT/.test(l) || /^GATE ERROR/.test(l)
              /* an uncaught throw: the gate died before printing a check — show what killed it */
              || /^\w*Error[:\s]|^\s+at .*\.mjs:\d+/.test(l));
  if (!hits.length) return '';
  const shown = hits.slice(0, CAP).map(l => '         ' + l.trim().slice(0, 200)).join('\n');
  return '\n' + shown + (hits.length > CAP ? `\n         ... and ${hits.length - CAP} more` : '');
}

if (process.argv[2] === '--selftest') {
  /* The runner's own logic: a break that matches nothing must be refused, because
     such a "control" passes by doing nothing at all. */
  const app = fs.readFileSync(path.join(P.ROOT, 'index.html'), 'utf8');
  let fail = 0;
  for (const g of GATES) {
    if (!g.break) continue;
    const hit = (g.break.file ? fs.readFileSync(path.join(P.ROOT, g.break.file), 'utf8') : app).split(g.break.find).length - 1;
    const ok = hit > 0;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${g.name}: break anchor ${JSON.stringify(g.break.find)} occurs ${hit}x in the artifact`);
    if (!ok) fail++;
  }
  console.log(`SELFTEST ${fail ? 'FAIL' : 'PASS'} (${GATES.filter(g => g.break).length - fail}/${GATES.filter(g => g.break).length})`);
  process.exit(fail ? 1 : 0);
}

/* --only a,b,c: just these gates (by name, with or without .mjs) - for proving new entries on a desk.
   Applied before --shard, so the two combine. */
const ON = process.argv.indexOf('--only');
if (ON > 0) {
  const want = String(process.argv[ON + 1] || '').split(',').map(s => s.trim().replace(/\.(mjs|js)$/, '')).filter(Boolean);
  const keep = GATES.filter(g => want.includes(g.name.replace(/\.(mjs|js)$/, '')));
  console.log(`only: ${keep.length} of ${want.length} named`);
  GATES.length = 0; GATES.push(...keep);
  process.argv.splice(ON, 2);
}
/* --shard i/n (15 Nov 2026): CI splits the gates across n parallel jobs. Each job runs every n-th
   gate starting at the i-th, so the slow ones (1416 / 1430 / 1435 / 1440 / 1441) spread out by
   their place in the list rather than landing together. No --shard = all of them, as before. */
const SH = process.argv.indexOf('--shard');
if (SH > 0) {
  const [i, n] = String(process.argv[SH + 1] || '').split('/').map(Number);
  if (!(n >= 1 && i >= 1 && i <= n)) { console.error('usage: --shard i/n'); process.exit(2); }
  const keep = GATES.filter((g, k) => k % n === i - 1);
  console.log(`shard ${i}/${n}: ${keep.length} of ${GATES.length} gates`);
  GATES.length = 0; GATES.push(...keep);
  process.argv.splice(SH, 2);
}
const APP = process.argv[2] || path.join(P.ROOT, 'index.html');
const STUDIO = path.join(P.ROOT, 'studio.html');
console.log(`gate_chromium — node ${process.versions.node} · ${path.relative(P.ROOT, APP)}`);
console.log(`browser: ${require_('./chromium_launch.cjs').chromiumPath() || '(playwright default)'}\n`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chrom-'));
let bad = 0;

for (const g of GATES) {
  /* POSITIVE — the gate must pass on the shipped artifact. */
  /* `args` (15 Nov 2026): a gate whose first argument is not the app (gate_1407 takes the api/
     folder) names its own; [] means "its defaults". */
  const pos = run(g.name, g.args || [APP], g.timeout);
  if (pos.code === 0) console.log(`  ok   ${g.name.padEnd(20)} ${String(pos.secs + 's').padStart(5)}  ${lastLine(pos.out)}`);
  else { console.error(`::error::${g.name} FAILED on the shipped artifact after ${pos.secs}s (exit ${pos.code}): ${lastLine(pos.out)}` + failLines(pos.out)); bad++; }

  /* NEGATIVE — break what it protects; it must notice. */
  let neg;
  if (g.selftestFlag) {
    /* audit_contrast poisons its own stylesheet and reports whether it caught it,
       so its control is its --selftest: exit 0 means "the regression was seen". */
    neg = run(g.name, [APP, '--selftest'], g.timeout);
    const caught = neg.code === 0 && /SELFTEST PASS/.test(neg.out);
    if (caught) console.log(`  ok     negative (${neg.secs}s): ${lastLine(neg.out)}`);
    else { console.error(`::error::${g.name}: its own regression control did not fire — ${lastLine(neg.out)}`); bad++; }
    continue;
  }
  /* `break.file` (15 Nov 2026): the protected thing lives in another file (an api/ route). Its
     whole folder is copied, the one file broken in the copy, and the copy's folder handed over. */
  /* the app itself is never a "file" break: copying its folder copies the whole repo */
  if (g.break.file === 'index.html') { console.error(`::error::${g.name}: break.file "index.html" — leave it out; the app is the default`); bad++; continue; }
  const srcPath = g.break.file ? path.join(P.ROOT, g.break.file) : APP;
  const src = fs.readFileSync(srcPath, 'utf8');
  const hits = src.split(g.break.find).length - 1;
  if (!hits) { console.error(`::error::${g.name}: break anchor ${JSON.stringify(g.break.find)} matched NOTHING — the control would be vacuous`); bad++; continue; }
  /* a function replacer: a string one reads $& and $1 in the replacement as patterns, and the
     breaks taken from real code carry dollar signs */
  const broken = g.break.all ? src.split(g.break.find).join(g.break.repl)
                             : src.replace(g.break.find, () => g.break.repl);
  let poisoned;
  if (g.break.file) {
    poisoned = path.join(tmp, g.name.replace(/\W/g, '_'));
    fs.cpSync(path.dirname(srcPath), poisoned, { recursive: true });
    fs.writeFileSync(path.join(poisoned, path.basename(srcPath)), broken);
  } else {
    poisoned = path.join(tmp, g.name.replace(/\W/g, '_') + '.html');
    fs.writeFileSync(poisoned, broken);
  }
  neg = run(g.name, [poisoned], g.timeout);
  if (neg.code !== 0) console.log(`  ok     negative (${neg.secs}s): broke ${hits} site(s) of ${JSON.stringify(g.break.find).slice(0, 70)} -> exit ${neg.code}`);
  else { console.error(`::error::${g.name} stayed GREEN on an artifact where ${JSON.stringify(g.break.find)} was broken — it does not protect ${g.protects}`); bad++; }
  fs.rmSync(poisoned, { recursive: true, force: true });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
console.log(bad ? `GATE CHROMIUM RED — ${bad} problem(s)`
                : `GATE CHROMIUM GREEN — all ${GATES.length} pass on the shipped file and all ${GATES.length} go red when what they protect is broken`);
process.exit(bad ? 1 : 0);
