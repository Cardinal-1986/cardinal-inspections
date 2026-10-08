"""patch_1267.py — guided report step 3: Change the report (edit with the assistant) / edit by hand.
usage: python3 patch_1267.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the panel gets its two modes
src = pl.sub(src, '''      <div class="assist-inputrow">''', '''      <div class="assist-mode" role="group" aria-label="What should the assistant do?">
        <button type="button" id="assistModeEdit" aria-pressed="false">Change the report</button>
        <button type="button" id="assistModeNote" aria-pressed="true">Add a note</button>
      </div>
      <div class="assist-inputrow">''')
src = pl.sub(src, '''.assist-inputrow button:disabled{opacity:.5;cursor:default;}''', '''.assist-inputrow button:disabled{opacity:.5;cursor:default;}
/* 1267: Change the report / Add a note */
.assist-mode{display:flex;gap:6px;padding:10px 12px 0;}
.assist-mode button{flex:1;min-height:44px;font:inherit;font-weight:700;font-size:13px;border-radius:6px;cursor:pointer;
  border:1px solid #c9ccd4;background:#fff;color:#161616;}
.assist-mode button[aria-pressed="true"]{background:var(--red,#c8202e);border-color:var(--red,#c8202e);color:#fff;}
.amsg .ae-undo{margin-top:6px;min-height:44px;padding:0 14px;font:inherit;font-weight:700;font-size:13px;border-radius:6px;
  border:1px solid #c9ccd4;background:#fff;color:#161616;cursor:pointer;}''')

# 2. the send routes by mode; the note path is unchanged
src = pl.sub(src, '''  var note = assistText.value.trim();
  if(!note) return;''', '''  var note = assistText.value.trim();
  if(!note) return;
  if(assistMode === 'edit') return sendAssistEdit(note);   /* 1267 */''')
A = '''  assistSend.disabled = false;
}
function escHtml(s){'''
src = pl.sub(src, A, '''  assistSend.disabled = false;
}
''' + open(os.path.join(HERE, 'ae_1267_add.js')).read().strip('\n') + '''
function escHtml(s){''')

# 3. opening the panel on an AI-written report starts in Change the report
src = pl.sub(src, '''  assistantPanel.classList.toggle('open');''', '''  assistantPanel.classList.toggle('open');
  if(assistantPanel.classList.contains('open')){
    try{ var _d = /** @type {any} */ (frame).contentDocument;
      setAssistMode(_d && _d.querySelector('[data-ai-summary],[data-ai-narrative]') ? 'edit' : 'note'); }catch(_){}
  }''')

# 4. the guided assistant hands over to the panel when its draft opens
src = pl.sub(src, '''    createReportFrom(secs.roof ? REPORT_TEMPLATE : EXTERIOR_TEMPLATE, secs.roof ? 'Report' : 'Exterior report', secs.roof,
      { title: title, fill: function(id){ return igFill(id, j, secs.list); } });''', '''    await createReportFrom(secs.roof ? REPORT_TEMPLATE : EXTERIOR_TEMPLATE, secs.roof ? 'Report' : 'Exterior report', secs.roof,
      { title: title, fill: function(id){ return igFill(id, j, secs.list); } });
    /* 1267: the draft opens with the assistant ready to change it */
    try{ if(typeof openAssistEdit === 'function') openAssistEdit(); }catch(_){}''')

# 5. stamp + changelog
src = pl.sub(src, '>v2026-10-08 build 1266<', '>v2026-10-08 build 1267<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1267, d: '2026-10-08', t: 'Change the report by asking',
    s: 'The report\\u2019s <b>Assistant</b> panel has two modes now. <b>Change the report</b>: say what to change in plain words \\u2014 \\u201Cshorter summary\\u201D, \\u201Cthe porch was outside this inspection\\u201D, \\u201Cmake the chimney caption say the crown is cracked\\u201D \\u2014 and it rewrites just those parts, saves, and gives you an <b>Undo</b>. <b>Add a note</b> works as before. A report the assistant wrote opens with the panel ready to change it; close it to edit by hand \\u2014 every line in the report is still tappable.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
