#!/usr/bin/env python3
"""Build 1201 — the publish sheet offers the three real sends, and nothing is
called Sent until a document really goes out.

B3: publishing asked "Estimate published. Mark it as Sent?" BEFORE anything had
been sent. Answering yes wrote estimates.status='sent', moved the pipeline, and
then dropped the rep on a document whose own toolbar read UNSENT — two "sent"
states disagreeing on one screen, with nothing emailed, texted or shared.

The sheet now offers what the app actually does to deliver a document, reusing
the SHIPPED buttons in #editorView (which the publish flow has already loaded
with this very document — there is no second copy of the send logic). The
estimate is marked Sent only when THAT document is really marked sent, which
the editor now announces once from the two places that write it.

Usage: patch_1201.py --src in.html --dst out.html
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ─────────────────────────────────────────────────────── 1. crAsk: choices
OLD_ASK_SET = """      go.textContent = verb;
      go.className = 'askgo' + (danger ? '' : ' plain');
      no.textContent = o.cancel || 'Cancel';
"""
NEW_ASK_SET = """      go.textContent = verb;
      go.className = 'askgo' + (danger ? '' : ' plain');
      no.textContent = o.cancel || 'Cancel';

      /* 1201: OPTIONAL choices, and STRICTLY ADDITIVE. With no `choices` this
         sheet is the same two-button question it has always been and still
         resolves a boolean — gate_1201 asserts exactly that against every
         existing caller shape. With choices, each one is a real button in the
         column .askbtns already lays out (44px minimum, both themes), the
         single go verb is not shown at all because the choices ARE the
         actions, and the promise resolves the chosen id instead.
         Built HERE rather than as an eleventh module-local sheet: this is the
         app's one shared question sheet, and a second one would drift from it
         the first time either is restyled. */
      var picks = Array.isArray(o.choices) ? o.choices.slice() : null;
      var btns = n.querySelector('.askbtns');
      Array.prototype.slice.call(btns.querySelectorAll('.askpick'))
           .forEach(function(b){ b.parentNode.removeChild(b); });
      go.style.display = picks ? 'none' : '';
      if(picks){
        picks.forEach(function(c){
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'askpick';
          b.setAttribute('data-pick', String(c.id));
          b.appendChild(document.createTextNode(String(c.label || c.id)));
          if(c.hint){
            var sm = document.createElement('small');
            sm.textContent = String(c.hint);
            b.appendChild(sm);
          }
          btns.insertBefore(b, no);
        });
      }
"""

OLD_ASK_RESOLVE = """          document.removeEventListener('keydown', onKey, true);
          resolve(!!v);
        }"""
NEW_ASK_RESOLVE = """          document.removeEventListener('keydown', onKey, true);
          /* 1201: a string id resolves as itself. Every caller that has ever
             existed passes true/false and still receives a boolean. */
          resolve(typeof v === 'string' ? v : !!v);
        }"""

OLD_ASK_WIRE = """        go.onclick = function(){ finish(true); };
        no.onclick = function(){ finish(false); };"""
NEW_ASK_WIRE = """        go.onclick = function(){ finish(true); };
        no.onclick = function(){ finish(false); };
        if(picks){
          Array.prototype.slice.call(btns.querySelectorAll('.askpick'))
               .forEach(function(b){
                 b.onclick = function(){ finish(b.getAttribute('data-pick')); };
               });
        }"""

OLD_ASK_CATCH = """      busy = false;
      /* the sheet could not be shown — ask the old way rather than not at all */
      var ok = false;"""
NEW_ASK_CATCH = """      busy = false;
      /* the sheet could not be shown — ask the old way rather than not at all.
         1201: with choices there is no honest one-question equivalent, so
         nothing is chosen and the caller takes its own "not now" path. */
      if(o && Array.isArray(o.choices)) return Promise.resolve(false);
      var ok = false;"""

# ─────────────────────────────────────────────────────── 2. the sheet's CSS
OLD_CSS = """#crAsk .askno{background:#22262b;color:#cfd6df;border:1px solid #343a41;}"""
NEW_CSS = """#crAsk .askno{background:#22262b;color:#cfd6df;border:1px solid #343a41;}
/* 1201: a choice. Left-aligned with its own hint line, because these are three
   different journeys and not three shades of yes. Computed, not eyeballed:
   #f2f4f7 on #22262b is 13.81:1 and the hint #9aa1ac is 5.85:1; the light twin
   is 16.90:1 and 5.42:1. Floor is 4.5:1 for both — the hint is 11.5px body. */
#crAsk .askpick{background:#22262b;color:#f2f4f7;border:1px solid #3a4049;text-align:left;}
#crAsk .askpick small{display:block;margin-top:3px;font:600 11.5px 'Segoe UI',Arial,sans-serif;color:#9aa1ac;}
:root[data-theme="rb-light"] #crAsk .askpick{background:#f7f7f8;color:#161616;border-color:#d8d8d8;}
:root[data-theme="rb-light"] #crAsk .askpick small{color:#5f6670;}"""

# ────────────────────────────────── 3. the editor announces a real send, once
OLD_SES = """function setEditorStatus(status, sentAt, signedAt){"""
NEW_SES = """/* 1201: the one announcement that a document really went out. Two callers —
   the email send and the Mark sent button — and both are a WRITE, so this is a
   transition by construction. setEditorStatus() below was the tempting hook and
   is the wrong one: it also runs on every open, so opening an already-sent
   document would read as a fresh send. cr-ess listens for this and only then
   marks the estimate that published the document Sent, so the document's own
   chip and the estimate's status can no longer disagree on one screen. */
function crDocSent(docId){
  try{
    document.dispatchEvent(new CustomEvent('cr-doc-sent', { detail: { docId: docId } }));
  }catch(_e){}
}

function setEditorStatus(status, sentAt, signedAt){"""

OLD_EMAIL = """    await db.update(current.id, { status: 'sent', sent_at: new Date().toISOString() });
"""
NEW_EMAIL = """    await db.update(current.id, { status: 'sent', sent_at: new Date().toISOString() });
    crDocSent(current.id);
"""

OLD_TOGGLE = """    current.sent_at = sentAt;
    if(toSent){
"""
NEW_TOGGLE = """    current.sent_at = sentAt;
    if(toSent){
      crDocSent(current.id);
"""

# ───────────────────────────────────────────── 4. the publish sheet itself
OLD_MSAP = """if(!await crAsk('Estimate published.\\n\\nMark it as Sent?' +
    (_willMove ? '\\n\\n' + (project.name || 'This client') + ' moves to ' +
                 displayStage(STATUS_STAGE.sent) + '.'
               : '\\n\\nThe pipeline stays at ' + displayStage(_cur) + '.'))) return;
"""
NEW_MSAP = """/* 1201: this used to ask "Mark it as Sent?" BEFORE anything had been sent.
   Answering yes marked the estimate Sent, moved the pipeline, and left the rep
   on a document whose own toolbar read UNSENT — with nothing emailed, texted or
   shared. It now offers the three ways the app actually delivers a document,
   and they are the SHIPPED buttons in #editorView, which the publish flow has
   already loaded with THIS document. Nothing is called Sent until that document
   really is: crAwaitDocSent() waits for the editor's own cr-doc-sent. Record
   the send, never the tap. */
var _who = (project.name || 'the client');
var _picks = crSendChoices();
if(!_picks.length) return;
/* ONE line, no blank-line split: crAsk treats the text after a blank line as
   the explanation, and an `opts.why` then replaces it - so a two-paragraph
   message here silently lost the actual question. gate_1201 asserts the
   headline still ASKS. */
var _pick = await crAsk('Estimate published \\u2014 send it to ' + _who + '?', {
  choices: _picks,
  cancel: 'Not now',
  why: 'Sending marks the estimate Sent' +
       (_willMove ? ' and moves ' + _who + ' to ' + displayStage(STATUS_STAGE.sent) + '.'
                  : ' \\u2014 the pipeline stays at ' + displayStage(_cur) + '.') +
       ' Not now leaves it a draft, and you can send it from the document at any time.'
});
if(typeof _pick !== 'string') return;
/* armed BEFORE the click, so a fast send cannot land between the two */
var _went = crAwaitDocSent(d.docId);
if(!crSendDoc(_pick)) return;
if(!await _went) return;
"""

OLD_HELPERS = """async function markSentAfterPublish(d){"""
NEW_HELPERS = """/* 1201: only the delivery buttons that exist are offered, so the sheet can
   never show a dead choice. They are looked up rather than duplicated — the
   document editor owns the send logic and there is exactly one copy of it. */
function crSendChoices(){
  var out = [];
  if(document.getElementById('emailDocBtn'))
    out.push({ id:'email', label:'Email to client', hint:'Opens the send-for-signature email' });
  if(document.getElementById('textSignBtn'))
    out.push({ id:'text',  label:'Text to sign',    hint:'Opens Messages with the signing link' });
  if(document.getElementById('shareBtn'))
    out.push({ id:'share', label:'Copy share link', hint:'A link the client can review and sign' });
  return out;
}
function crSendDoc(pick){
  var map = { email:'emailDocBtn', text:'textSignBtn', share:'shareBtn' };
  var b = document.getElementById(map[pick]);
  if(!b) return false;
  try{ b.click(); }catch(_e){ return false; }
  return true;
}
/* Resolves TRUE only when the document this estimate published is really
   marked sent. A rep who backs out of the email prompt, or whose send fails,
   resolves false on the timeout and the estimate stays the draft it is. */
function crAwaitDocSent(docId, ms){
  return new Promise(function(resolve){
    var done = false, t = null;
    function off(v){
      if(done) return;
      done = true;
      document.removeEventListener('cr-doc-sent', onSent);
      if(t) clearTimeout(t);
      resolve(v);
    }
    function onSent(ev){
      var id = ev && ev.detail && ev.detail.docId;
      if(id != null && String(id) === String(docId)) off(true);
    }
    document.addEventListener('cr-doc-sent', onSent);
    t = setTimeout(function(){ off(false); }, ms || 600000);
  });
}
async function markSentAfterPublish(d){"""

OLD_STAMP = 'v2026-09-10 build 1200'
NEW_STAMP = 'v2026-09-10 build 1201'
OLD_CL = "var CHANGELOG = [\n  { b: 1200,"
NEW_CL = ("var CHANGELOG = [\n"
  "  { b: 1201, d: '2026-09-10', t: 'Publishing an estimate now offers to send it, instead of asking you to call it sent', "
  "s: 'Publishing used to pop the question <b>\\u201cMark it as Sent?\\u201d before anything had been sent</b> \\u2014 and saying yes "
  "moved the job forward and then dropped you on a document whose own toolbar still read <b>UNSENT</b>. Two "
  "different answers to \\u201cdid the client get this?\\u201d on one screen. Publishing now asks <b>\\u201cSend it to "
  "&lt;client&gt;?\\u201d</b> and gives you the three ways the app actually delivers a document: <b>Email to client</b>, "
  "<b>Text to sign</b>, or <b>Copy share link</b> \\u2014 the same buttons the document itself has, so nothing behaves "
  "differently from what you already know. <b>Not now</b> leaves it a draft and says so. And the estimate is marked "
  "Sent, with the pipeline moving, <b>only once the document has really gone out</b> \\u2014 back out of the email and "
  "nothing is claimed on your behalf. Marking a document sent by hand from the document itself now moves the "
  "estimate too, which it never did.' },\n"
  "  { b: 1200,")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()
    src = pl.load(a.src); orig = src

    edits = [
        ('ask-set', OLD_ASK_SET, NEW_ASK_SET),
        ('ask-resolve', OLD_ASK_RESOLVE, NEW_ASK_RESOLVE),
        ('ask-wire', OLD_ASK_WIRE, NEW_ASK_WIRE),
        ('ask-catch', OLD_ASK_CATCH, NEW_ASK_CATCH),
        ('ask-css', OLD_CSS, NEW_CSS),
        ('doc-sent-fn', OLD_SES, NEW_SES),
        ('email-dispatch', OLD_EMAIL, NEW_EMAIL),
        ('toggle-dispatch', OLD_TOGGLE, NEW_TOGGLE),
        ('publish-sheet', OLD_MSAP, NEW_MSAP),
        ('send-helpers', OLD_HELPERS, NEW_HELPERS),
        ('stamp', OLD_STAMP, NEW_STAMP),
        ('changelog', OLD_CL, NEW_CL),
    ]
    for name, old, _ in edits:
        n = src.count(old)
        assert n == 1, '%s: expected 1 occurrence, found %d' % (name, n)
    assert 'crDocSent' not in src and 'askpick' not in src, 'markers already present'

    for name, old, new in edits:
        src = pl.sub(src, old, new)

    assert src.count("crDocSent(") == 3          # 1 def + 2 dispatch sites
    # NOT a bare count: a comment in the publish sheet names the event too, and
    # this file's own doctrine says a bare regex finds its own prose. Assert the
    # three CODE forms instead.
    assert src.count("new CustomEvent('cr-doc-sent'") == 1
    assert src.count("document.addEventListener('cr-doc-sent', onSent)") == 1
    assert src.count("document.removeEventListener('cr-doc-sent', onSent)") == 1
    assert src.count("crSendChoices()") == 2                      # def + call
    assert src.count("function crAwaitDocSent(docId, ms){") == 1   # def
    assert src.count("crAwaitDocSent(d.docId)") == 1               # the one call
    assert src.count("crSendDoc(") == 2                            # def + call
    assert src.count('askpick') >= 6
    # CODE form, not the phrase: my own comment above quotes the old question,
    # and this doc set's rule is that a bare count finds its own prose. Three of
    # this patch's assertions tripped on exactly that before it was written down.
    assert src.count("crAsk('Estimate published.\\n\\nMark it as Sent?") == 0, \
        'the false question is still ASKED'
    assert src.count('build 1201') == 1 and src.count('build 1200') == 0
    assert src.count('{ b: 1201,') == 1 and src.count('{ b: 1200,') == 1
    assert src.count("resolve(typeof v === 'string' ? v : !!v);") == 1
    assert src.count('resolve(!!v);') == 0

    pl.write_atomic(a.dst, src)
    for m in ['function crDocSent(docId){', 'class="askpick"' if False else "b.className = 'askpick';",
              'function crAwaitDocSent(docId, ms){', "cancel: 'Not now',"]:
        pl.assert_in(a.dst, m)
    print('build 1201 written: %s  (%d -> %d chars)' % (a.dst, len(orig), len(src)))


if __name__ == '__main__':
    main()
