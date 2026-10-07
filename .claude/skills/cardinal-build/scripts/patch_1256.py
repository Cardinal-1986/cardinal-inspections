#!/usr/bin/env python3
"""Build 1256 — "Uncontacted" on the Leads cards (Jacob, via Theo — pick A3).

Theo, 7 Oct: "once you attempt to make contact whether they answer or not, it
should still go into prospect. Jacob is asking if within the client cards we can
have something saying uncontacted?"

The rule already existed: stage Lead = not yet contacted, and the client
profile's Contacted button (#contactedBtn) moves it to Prospect. The Leads
cards just never said so, and calling from a card never asked.

1. Every card in stage Lead shows an amber "Uncontacted · 3 days" chip (age
   since the lead was created).
2. Tapping Call, Text or Email on a Lead — on the card, or Call/Text in the
   desktop side pane — still dials / texts / mails as before, AND raises a
   small sheet: "Did you reach out to <name>? Answered or not, it counts."
   [Mark contacted] moves it to Prospect through setStage() — the one stage
   writer, so stage_since / t_Prospect are stamped exactly like the profile's
   button. [Not yet] closes it. A mis-tap costs one tap, never a wrong stage.

usage: python3 patch_1256.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# 1. the chip on the card
src = pl.sub(src, """      (cat ? '<div class="ljct">' + esc(cat) + '</div>' : '') +
      /* 931:""", """      (cat ? '<div class="ljct">' + esc(cat) + '</div>' : '') +
      /* 1256: a Lead is, by the app's own rule, not yet contacted — say so */
      (stg === 'Lead' ? '<div><span class="ljunc">Uncontacted · ' + esc(ljAge(p.created_at)) + '</span></div>' : '') +
      /* 931:""")
src = pl.sub(src, """.ljct{font-size:11px;color:var(--rbe-mute);margin-top:3px;}
""", """.ljct{font-size:11px;color:var(--rbe-mute);margin-top:3px;}
/* 1256: the Uncontacted chip — a fixed amber ground, so a fixed ink (both themes) */
.ljunc{display:inline-block;margin-top:5px;padding:2px 8px;border-radius:999px;background:#f5a623;color:#1a1306;
  font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.04em;}
#ljAsk{position:fixed;left:0;right:0;bottom:0;z-index:9600;display:none;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));
  background:var(--rbe-panel,#16161B);color:var(--rbe-ink,#eceef0);border-top:1px solid var(--rbe-panelbd,#24242c);
  box-shadow:0 -8px 30px rgba(0,0,0,.35);}
#ljAsk.open{display:block;}
#ljAsk .q{max-width:560px;margin:0 auto;}
#ljAsk b{display:block;font:700 18px 'Segoe UI',Arial,sans-serif;color:var(--rbe-ink,#eceef0);}
#ljAsk p{margin:4px 0 12px;font:400 15px 'Segoe UI',Arial,sans-serif;color:var(--rbe-mute,#b8bec6);}
#ljAsk .row{display:flex;gap:10px;}
#ljAsk button{flex:1;min-height:48px;border-radius:10px;cursor:pointer;font:700 15px 'Segoe UI',Arial,sans-serif;}
#ljAsk .yes{background:#c8202e;border:1px solid #c8202e;color:#ffffff;}
#ljAsk .no{background:transparent;border:1px solid var(--rbe-panelbd,#24242c);color:var(--rbe-ink,#eceef0);}
""")

# 2. the ask, on the card and in the side pane
src = pl.sub(src, """document.getElementById('ljList').addEventListener('click', function(e){
  if(e.target.closest('.ljcta')){ e.stopPropagation(); return; }""",
"""/* 1256: after a Call / Text / Email on a Lead, ask whether to mark it contacted.
   The link is NOT stopped — the phone dials first; the sheet waits underneath. */
function ljAskContacted(id){
  var p = cacheProjects.find(function(x){ return String(x.id) === String(id); });
  if(!p || normStage(p.stage) !== 'Lead') return;
  var el = document.getElementById('ljAsk');
  if(!el){
    el = document.createElement('div');
    el.id = 'ljAsk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Mark as contacted');
    document.body.appendChild(el);
    el.addEventListener('click', async function(ev){
      var b = /** @type {HTMLElement} */ (ev.target).closest('button');
      if(!b) return;
      el.classList.remove('open');
      if(b.getAttribute('data-ask') !== 'yes') return;
      try{
        await setStage(el.getAttribute('data-id'), 'Prospect');
        if(typeof renderLeadsView === 'function') renderLeadsView();
      }catch(err){ showError('Could not update stage: ' + ((err && err.message) || err)); }
    });
  }
  el.setAttribute('data-id', String(p.id));
  el.innerHTML = '<div class="q"><b>Did you reach out to ' + esc(p.name || 'this lead') + '?</b>' +
    '<p>Answered or not, it counts — it moves to Prospect.</p>' +
    '<div class="row"><button type="button" class="yes" data-ask="yes">Mark contacted</button>' +
    '<button type="button" class="no" data-ask="no">Not yet</button></div></div>';
  el.classList.add('open');
}
document.getElementById('ljList').addEventListener('click', function(e){
  if(e.target.closest('.ljcta')){
    e.stopPropagation();
    var tg = /** @type {HTMLElement} */ (e.target), cc = tg.closest('.ljcard');
    if(tg.closest('a.ljbtn') && cc) ljAskContacted(cc.getAttribute('data-lj'));   /* 1256 */
    return;
  }""")
src = pl.sub(src, """document.getElementById('ljPane').addEventListener('click', function(e){
  var t = e.target.closest('[data-lt]');""", """document.getElementById('ljPane').addEventListener('click', function(e){
  if((/** @type {HTMLElement} */ (e.target)).closest('a.ljab') && ljState.sel) ljAskContacted(ljState.sel);   /* 1256: Call / Text in the side pane */
  var t = e.target.closest('[data-lt]');""")

src = pl.sub(src, '>v2026-10-07 build 1255<', '>v2026-10-07 build 1256<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1256, d: '2026-10-07', t: 'Uncontacted leads say so',
    s: 'On the Leads screen, every lead nobody has reached out to yet wears an amber <b>Uncontacted</b> tag with how long it has been waiting. Tap Call, Text or Email on one and your phone does that as usual \\u2014 then the app asks <b>Did you reach out?</b> Tap <b>Mark contacted</b> and it moves to Prospect, whether they answered or not. Tap <b>Not yet</b> and nothing changes.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
