#!/usr/bin/env python3
"""Build 1202 — a review request is recorded when it goes out, and the card
waits until there is a finished job to review.

B4, both halves:

  * sendReviewRequest() wrote review_requested_at and an audit line the moment
    the button was tapped, whether or not the rep sent anything. Back out of
    Messages and the profile read "Review requested today via text", the audit
    trail said so, and the next tap sent the FOLLOW-UP wording to somebody who
    never got the first one.
  * The card rendered on every stage. With a phone on file the red Text request
    button was the most saturated control on a LEAD's profile — one thumb from
    asking a stranger for a review.

Usage: patch_1202.py --src in.html --dst out.html
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

OLD_SEND = """async function sendReviewRequest(pr, via){
  var alreadyAsked = !!parseCkAll(pr).review_requested_at;
  var msg = reviewMsg(pr, alreadyAsked);
  if(via === 'sms' && pr.phone){
    location.href = 'sms:' + pr.phone.replace(/[^+\\d]/g,'') + '?&body=' + encodeURIComponent(msg);
  }else if(via === 'email' && pr.email){
    location.href = 'mailto:' + encodeURIComponent(pr.email) +
      '?subject=' + encodeURIComponent('How did we do? \\u2014 Cardinal Roofing & Renovations') +
      '&body=' + encodeURIComponent(msg);
  }else{
    try{ await navigator.clipboard.writeText(msg); crTell('Review message copied \\u2014 paste it anywhere.', 'ok'); }
    catch(e){ prompt('Copy this message:', msg); }
  }
  try{ await patchProjectCk(pr, { review_requested_at: new Date().toISOString(), review_via: via }); auditLog('review', 'Review requested via ' + via + ' \\u2014 ' + (pr.name || ''), pr.id); }catch(e){}
  setTimeout(renderOverview, 400);
}"""

NEW_SEND = """/* 1202: the stages at which there is a finished job to review. Reviews are
   asked for after the work, and this list is the one place that says so —
   sendReviewRequest() and the card both read it, so the button and the write
   can never disagree about when a request is allowed. */
var REVIEW_STAGES = ['Completed','Invoiced','Closed'];
function reviewStageOk(pr){
  var s = pr && pr.stage;
  try{ if(typeof normStage === 'function') s = normStage(s); }catch(_e){}
  return REVIEW_STAGES.indexOf(s) !== -1;
}
async function sendReviewRequest(pr, via){
  /* The card does not draw these buttons before Completed. This is the same
     refusal at the writer, so a stale screen or a hand-fired event cannot ask a
     Lead for a review. */
  if(!reviewStageOk(pr)){
    crTell('A review request opens once the job is Completed.');
    return;
  }
  var alreadyAsked = !!parseCkAll(pr).review_requested_at;
  var msg = reviewMsg(pr, alreadyAsked);
  var handedOff = false;
  if(via === 'sms' && pr.phone){
    location.href = 'sms:' + pr.phone.replace(/[^+\\d]/g,'') + '?&body=' + encodeURIComponent(msg);
    handedOff = true;
  }else if(via === 'email' && pr.email){
    location.href = 'mailto:' + encodeURIComponent(pr.email) +
      '?subject=' + encodeURIComponent('How did we do? \\u2014 Cardinal Roofing & Renovations') +
      '&body=' + encodeURIComponent(msg);
    handedOff = true;
  }else{
    try{ await navigator.clipboard.writeText(msg); crTell('Review message copied \\u2014 paste it anywhere.', 'ok'); }
    catch(e){ prompt('Copy this message:', msg); }
  }
  /* 1202: THIS is the fix. The three paths above hand the message to Messages,
     to Mail, or to the clipboard — none of them sends anything, and the app
     cannot see what happens next. Recording here on the tap meant backing out
     of Messages still left "Review requested today via text" on the profile and
     in the audit trail, and the NEXT tap then sent the friendly-follow-up
     wording to someone who had never received a first message. Only the rep
     knows, so only the rep can say. Record the send, never the tap — the same
     rule 1201 applied to the estimate. */
  if(handedOff){
    try{ await new Promise(function(r){ setTimeout(r, 700); }); }catch(_e){}
  }
  var _who = (pr.name || 'the client');
  var _went = await crAsk('Did the review request go out to ' + _who + '?', {
    verb: 'Yes, it went',
    cancel: 'Not yet',
    tone: 'plain',
    why: 'Only a yes records it. Nothing is written if you backed out, and you can tap the button again whenever you do send it.'
  });
  if(!_went) return;
  try{ await patchProjectCk(pr, { review_requested_at: new Date().toISOString(), review_via: via }); auditLog('review', 'Review requested via ' + via + ' \\u2014 ' + (pr.name || ''), pr.id); }catch(e){}
  setTimeout(renderOverview, 400);
}"""

OLD_CARD = """      '<div class="rvbtns">' +
        (pr.phone ? '<button class="rvbtn text" data-rv="sms">&#128241; Text request</button>' : '') +
        '<button class="rvbtn copy" data-rv="copy">Copy message</button>' +
      '</div>' +
      (rvAt ? '<div class="rvhint">Tapping again sends a friendly follow-up.</div>' : '') +
      '<div class="rvflip' + (ck.review_left_at ? ' on' : '') + '" id="rvLeftSwitch" role="switch" aria-checked="' + (ck.review_left_at ? 'true' : 'false') + '">' +
        '<span class="rvtog"></span> Flip when their review appears on Google' +
        (ck.review_left_at ? ' \\u00b7 ' + acxDate(ck.review_left_at) : '') +
      '</div>' +"""

NEW_CARD = """      /* 1202: nothing to ask for until the work is done. On a Lead this card
         used to put a saturated red "Text request" button on the profile of
         somebody the rep had not met yet. It follows the Invoices card's own
         convention rather than vanishing — the card stays, and a line says
         when it opens, so nobody hunts for a control that moved. */
      (_rvOpen
        ? '<div class="rvbtns">' +
            (pr.phone ? '<button class="rvbtn text" data-rv="sms">&#128241; Text request</button>' : '') +
            '<button class="rvbtn copy" data-rv="copy">Copy message</button>' +
          '</div>' +
          (rvAt ? '<div class="rvhint">Tapping again sends a friendly follow-up.</div>' : '')
        : '<div class="rvhint">A review request opens once the job is Completed.</div>') +
      (_rvOpen
        ? '<div class="rvflip' + (ck.review_left_at ? ' on' : '') + '" id="rvLeftSwitch" role="switch" aria-checked="' + (ck.review_left_at ? 'true' : 'false') + '">' +
            '<span class="rvtog"></span> Flip when their review appears on Google' +
            (ck.review_left_at ? ' \\u00b7 ' + acxDate(ck.review_left_at) : '') +
          '</div>'
        : '') +"""

OLD_RVAT = """  var rvAt = ck.review_requested_at, rvVia = ck.review_via;"""
NEW_RVAT = """  var rvAt = ck.review_requested_at, rvVia = ck.review_via;
  var _rvOpen = reviewStageOk(pr);"""

OLD_STAMP = 'v2026-09-10 build 1201'
NEW_STAMP = 'v2026-09-10 build 1202'
OLD_CL = "var CHANGELOG = [\n  { b: 1201,"
NEW_CL = ("var CHANGELOG = [\n"
  "  { b: 1202, d: '2026-09-10', t: 'A review request counts when you send it, and the card waits for a finished job', "
  "s: 'Two fixes to the Google Reviews card. <b>Tapping <i>Text request</i> used to record the request straight away</b> "
  "\\u2014 before you had sent anything. Back out of Messages and the profile still said \\u201cReview requested today via "
  "text\\u201d, the job history said the same, and the next tap sent the <i>friendly follow-up</i> wording to somebody "
  "who never got a first message. The app cannot see what happens once the message is handed to Messages, Mail or your "
  "clipboard, so it now simply <b>asks you</b>: <i>Did the review request go out?</i> A yes records it, <b>Not yet</b> "
  "records nothing, and you can tap again whenever you do send it. <b>And the card no longer offers the buttons before "
  "the job is Completed</b> \\u2014 on a brand-new lead the red Text request button was the loudest thing on the screen. "
  "The card stays where it is and tells you when it opens, the same way the Invoices card does.' },\n"
  "  { b: 1201,")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()
    src = pl.load(a.src); orig = src

    edits = [('sender', OLD_SEND, NEW_SEND), ('rvAt', OLD_RVAT, NEW_RVAT),
             ('card', OLD_CARD, NEW_CARD), ('stamp', OLD_STAMP, NEW_STAMP),
             ('changelog', OLD_CL, NEW_CL)]
    for name, old, _ in edits:
        n = src.count(old)
        assert n == 1, '%s: expected 1 occurrence, found %d' % (name, n)
    assert 'REVIEW_STAGES' not in src and 'reviewStageOk' not in src

    for name, old, new in edits:
        src = pl.sub(src, old, new)

    assert src.count('var REVIEW_STAGES =') == 1
    assert src.count('function reviewStageOk(pr){') == 1
    assert src.count('reviewStageOk(pr)') == 3       # def + writer guard + card
    assert src.count('_rvOpen') == 3                 # assignment + two reads
    assert src.count("crAsk('Did the review request go out to ") == 1
    # the unconditional write is gone: the patch call is now AFTER the ask
    assert src.count('review_requested_at: new Date().toISOString()') == 1
    assert src.count('build 1202') == 1 and src.count('build 1201') == 0
    assert src.count('{ b: 1202,') == 1 and src.count('{ b: 1201,') == 1

    pl.write_atomic(a.dst, src)
    for m in ['var REVIEW_STAGES = ', 'function reviewStageOk(pr){',
              "A review request opens once the job is Completed.",
              "cancel: 'Not yet',"]:
        pl.assert_in(a.dst, m)
    print('build 1202 written: %s  (%d -> %d chars)' % (a.dst, len(orig), len(src)))


if __name__ == '__main__':
    main()
