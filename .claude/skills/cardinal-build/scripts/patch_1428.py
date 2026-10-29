"""Build 1428 — uploading a signed contract asks to move the job to Approved (29 Oct 2026).

Theo, answering the round-1 audit list ("3 yes"): uploading a signed contract should ask "Move to Approved?".
1427 deliberately left the stage alone and only told Curtis and the office. Now, when the job is still short of
Approved, the upload ends on the app's own question sheet (crAsk):
  Move to Approved -> setStage(pr.id, 'Approved'), the same path as the stage dropdown, which sends the usual
                      APPROVED schedule + order-materials alert (forward-only, crStageIsForward). No second alert.
  Not yet          -> the 1427 notice ("signed contract uploaded, not yet Approved") goes to Curtis and the office,
                      exactly as before.
An estimate upload, or a job already Approved or beyond, asks nothing.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# 1) work out whether the job is short of Approved, but do not tell anyone yet
s = one(s, """      var _upTold = false, _upStage = '';
      if(!isEst){
        try{
          _upStage = (typeof normStage === 'function') ? normStage(pr.stage) : String(pr.stage || '');
          var _upFwd = (typeof crStageIsForward === 'function') ? crStageIsForward(_upStage, 'Approved')
                     : (['Approved','Scheduled','Completed','Invoiced','Closed'].indexOf(_upStage) === -1);
          if(_upFwd && typeof _notifyOrQueue === 'function'){""",
"""      /* 1428 (Theo, 29 Oct, "yes"): the upload now ASKS to move the job to Approved. Yes goes through
         setStage, which sends the usual APPROVED alert; Not yet sends the 1427 notice below instead. */
      var _upTold = false, _upStage = '', _upFwd = false, _upMoved = false;
      if(!isEst){
        try{
          _upStage = (typeof normStage === 'function') ? normStage(pr.stage) : String(pr.stage || '');
          _upFwd = (typeof crStageIsForward === 'function') ? crStageIsForward(_upStage, 'Approved')
                     : (['Approved','Scheduled','Completed','Invoiced','Closed'].indexOf(_upStage) === -1);
        }catch(_n){ _upFwd = false; }
      }
      try{ await reload(); }catch(_r){}
      try{ if(typeof renderProjectDocs === 'function') renderProjectDocs(); }catch(_d){}
      ctuClose();
      if(_upFwd){
        var _upYes = false;
        try{
          _upYes = (typeof window.crAsk === 'function') && !!(await window.crAsk(
            'Move ' + (pr.name || 'this job') + ' to Approved?\\n\\nThe signed contract is on file. Approved puts the job on the production schedule and sends Curtis the schedule + order materials alert.',
            { verb: 'Move to Approved', cancel: 'Not yet', tone: 'plain' }));
        }catch(_a){ _upYes = false; }
        if(_upYes && typeof setStage === 'function'){
          try{ _upMoved = (await setStage(pr.id, 'Approved')) !== false; }catch(_s){ _upMoved = false; }
        }
      }
      if(_upFwd && !_upMoved){
        try{
          if(typeof _notifyOrQueue === 'function'){""")

# 2) the old trailing reload/close now happen above, before the question
s = one(s, """            _upTold = true;
          }
        }catch(_n){}
      }
      try{ await reload(); }catch(_r){}
      try{ if(typeof renderProjectDocs === 'function') renderProjectDocs(); }catch(_d){}
      ctuClose();
      if(window.crToastOk) window.crToastOk(isEst ? (label + ' estimate saved — ' + money + '. It is under Estimates.')
        : ('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.' +
           (_upTold ? ' Curtis and the office were told; the job stays ' + _upStage + ' until someone moves it to Approved.' : '')));""",
"""            _upTold = true;
          }
        }catch(_n2){}
      }
      if(window.crToastOk) window.crToastOk(isEst ? (label + ' estimate saved — ' + money + '. It is under Estimates.')
        : ('Signed ' + label + ' contract saved — ' + money + '. Invoices & Payments can open now.' +
           (_upMoved ? ' The job is Approved and Curtis has the schedule + order materials alert.'
            : (_upTold ? ' Curtis and the office were told; the job stays ' + _upStage + ' until someone moves it to Approved.' : ''))));""")

s = one(s, ">v2026-10-29 build 1427<", ">v2026-10-29 build 1428<")
s = one(s, """  { b: 1427, d:'2026-10-29',""",
"""  { b: 1428, d:'2026-10-29', t:'Uploading a signed contract asks to move the job to Approved', s:'After you upload a signed contract for a job that is not Approved yet, the app asks: Move to Approved? Tap Move to Approved and the job goes on the production schedule and Curtis gets the usual schedule and order materials alert. Tap Not yet and the job stays where it is, and Curtis and the office are told a signed contract is on file.' },
  { b: 1427, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1428')
