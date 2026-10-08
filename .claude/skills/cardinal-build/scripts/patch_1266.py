"""patch_1266.py — New inspection report, guided, step 2: photos + the Claude assistant.
usage: python3 patch_1266.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. after the checklist saves (or is skipped), the photo + assistant screen
src = pl.sub(src, '''      return;
    }
    igStart();
  }
  function igStart(){''', '''      return;
    }
    igStep3();
  }
  function igStart(){''')
src = pl.sub(src, '''    if(a === 'skip') return igStart();''', '''    if(a === 'skip') return igStep3();
    if(a === 'plain') return igStart();
    if(a === 'write') return igWrite();
    if(a === 'send') return igSend();''')
src = pl.sub(src, '''  function igClick(e){
    var b = e.target.closest('[data-ig]'); if(!b) return;''', open(os.path.join(HERE, 'insg_1266_add.js')).read() + '''  function igClick(e){
    var ph = e.target.closest('[data-ph]');
    if(ph){
      var pid = ph.getAttribute('data-ph'), on = !P.picked[pid];
      if(on && igPickedList().length >= PIC_MAX){ var er = igEl('insgErr'); if(er) er.textContent = 'Up to ' + PIC_MAX + ' photos per report.'; return; }
      if(on) P.picked[pid] = true; else delete P.picked[pid];
      igGridPaint(); return;
    }
    var b = e.target.closest('[data-ig]'); if(!b) return;''')
src = pl.sub(src, '''    S.general = !!(S.all.insp && S.all.insp.general);
    igBuild(); igStep1();''', '''    S.general = !!(S.all.insp && S.all.insp.general);
    P.list = []; P.picked = {}; P.chat = []; P.busy = false; P.loaded = false;
    igBuild(); igStep1();''')

# 2. styles for the grid and the chat
src = pl.sub(src, '''#insgSheet .ig-alt{border:1px solid #c9ccd4;background:#ffffff;color:#161616;}
</style>''', '''#insgSheet .ig-alt{border:1px solid #c9ccd4;background:#ffffff;color:#161616;}
/* 1266: the photo grid and the assistant */
#insgSheet .ig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;}
#insgSheet .ig-ph{position:relative;aspect-ratio:1;padding:0;border:3px solid transparent;border-radius:10px;overflow:hidden;background:#e7e8ec;cursor:pointer;}
#insgSheet .ig-ph img{width:100%;height:100%;object-fit:cover;display:block;}
#insgSheet .ig-ph i{position:absolute;top:6px;left:6px;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,.45);border:2px solid #ffffff;}
#insgSheet .ig-ph.on{border-color:#c8202e;}
#insgSheet .ig-ph.on i{background:#c8202e;}
#insgSheet .ig-ph.on i::after{content:"";position:absolute;left:6px;top:2px;width:6px;height:11px;border:solid #ffffff;border-width:0 2px 2px 0;transform:rotate(45deg);}
#insgSheet .ig-chat{display:grid;gap:8px;max-height:46vh;overflow:auto;}
#insgSheet .ig-m{max-width:88%;padding:10px 12px;border-radius:14px;font:400 15px/1.4 'Segoe UI',Arial,sans-serif;white-space:pre-wrap;}
#insgSheet .ig-m.ai{background:#f0f1f4;border:1px solid #d9dbe1;color:#161616;justify-self:start;}
#insgSheet .ig-m.me{background:#c8202e;color:#ffffff;justify-self:end;}
#insgSheet .ig-m.ig-wait{color:#5c6070;}
#insgSheet .ig-say{display:flex;gap:8px;align-items:stretch;}
#insgSheet .ig-say textarea{flex:1;min-width:0;min-height:48px;padding:10px 12px;border:1px solid #c9ccd4;border-radius:10px;background:#ffffff;color:#161616;font:400 16px 'Segoe UI',Arial,sans-serif;resize:vertical;}
#insgSheet .ig-send{min-width:76px;min-height:48px;border-radius:10px;font:700 15px 'Segoe UI',Arial,sans-serif;cursor:pointer;}
</style>''')

# 3. the one creator learns to take a title and a fill step (callers that pass
#    three arguments are unchanged)
src = pl.sub(src, '''async function createReportFrom(tpl, kindLabel, roofy){''', '''async function createReportFrom(tpl, kindLabel, roofy, opts){''')
src = pl.sub(src, '''  var title = prompt(kindLabel + ' title:', currentProject.name + (currentProject.address ? ' \\u2014 ' + currentProject.address : ''));
  if(title === null) return;''', '''  /* 1266: the guided assistant names the report itself and fills it before it opens */
  var title = (opts && opts.title) ? opts.title
            : prompt(kindLabel + ' title:', currentProject.name + (currentProject.address ? ' \\u2014 ' + currentProject.address : ''));
  if(title === null) return;''')
src = pl.sub(src, '''    var id = await db.create(title.trim() || ('Untitled ' + kindLabel.toLowerCase()), tpl0,
                             currentProject.name, currentProject.id);
    await reload();''', '''    var id = await db.create(title.trim() || ('Untitled ' + kindLabel.toLowerCase()), tpl0,
                             currentProject.name, currentProject.id);
    if(opts && opts.fill){
      try{ await opts.fill(id); }
      catch(eF){ showError('The report was created, but the assistant\\u2019s draft could not be added: ' + ((eF && eF.message) || eF)); }
    }
    await reload();''')

# 4. stamp + changelog
src = pl.sub(src, '>v2026-10-08 build 1265<', '>v2026-10-08 build 1266<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1266, d: '2026-10-08', t: 'New inspection report: photos and the assistant',
    s: 'After the checklist, <b>+ New inspection report</b> now shows the job\\u2019s photos with check boxes (up to 16; the inspection photos are pre-checked) and an assistant to talk to. Tell it what the photos don\\u2019t show \\u2014 a reported leak, how long, what the homeowner wants \\u2014 and it asks back. <b>Write report</b> writes it into your normal template: the photos placed in the right sections with captions and HIGH / MODERATE / MONITOR tags, a short write-up for each section, the overall condition, and numbered recommendations. When the rep picked <b>Let the AI estimate it</b>, the life expectancy comes from the assistant and is marked as an AI estimate. Everything stays editable. <b>Start without AI</b> makes the plain report, as before.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
