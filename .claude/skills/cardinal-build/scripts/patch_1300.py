"""Build 1300 — the route page says when a tick is waiting for signal (Theo's 4, 11 Oct).

Ticking the load-the-truck list (and Curtis's "Add to <day>") on the route page
already worked with no signal: both go through CardinalPunch.update, which since
1049 keeps the change and queues it in the outbox. Measured: offline, the tick
stays, the outbox holds the patch, no error shows. What was missing is the
receipt -- the punch-out card says "No signal — saved on this phone" (1049), the
route page said nothing, and its full screen covers the sync badge. Same words,
same toast family as the card.

Usage: python3 patch_1300.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

A = """  var r = await P.update(id, { truck: tk });
  if(!(r && r.ok)){ try{ window.crTell('Could not save that tick: ' + ((r && r.error) || 'write refused')); }catch(_){} }
  rtDraw();
}"""
B = """  var r = await P.update(id, { truck: tk });
  if(!(r && r.ok)){ try{ window.crTell('Could not save that tick: ' + ((r && r.error) || 'write refused')); }catch(_){} }
  else if(r.queued) rtQueuedNote();
  rtDraw();
}
/* 1300: the card's 1049 receipt, on the route page. This full screen covers the
   global sync badge, so a held write would otherwise look saved. */
function rtQueuedNote(){ try{ window.crTell('No signal \\u2014 saved on this phone. It will sync by itself.', 'ok'); }catch(_){} }"""
src = pl.sub(src, A, B)

A = """  var r = await P.update(id, { scheduled_at: day, scheduled_time: null });
  if(!(r && r.ok)){ try{ window.crTell('Could not move it: ' + ((r && r.error) || 'write refused')); }catch(_){} }"""
B = """  var r = await P.update(id, { scheduled_at: day, scheduled_time: null });
  if(!(r && r.ok)){ try{ window.crTell('Could not move it: ' + ((r && r.error) || 'write refused')); }catch(_){} }
  else if(r.queued) rtQueuedNote();"""
src = pl.sub(src, A, B)

A = ">v2026-10-11 build 1299<button"
B = ">v2026-10-11 build 1300<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1300, d: '2026-10-11', t: 'The route page says when a tick is waiting for signal',
    s: 'Ticking the load-the-truck list on the route page, or Curtis moving a job to the day, already worked with no signal \\u2014 the tick stays and is sent when the phone is back online. Now it also says so, with the same line the punch-out card uses: \\u201cNo signal \\u2014 saved on this phone. It will sync by itself.\\u201d' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
