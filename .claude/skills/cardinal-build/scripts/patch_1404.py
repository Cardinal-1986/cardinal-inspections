"""Build 1404 — inspections, photos and the estimate builder (23 Oct 2026 audit, round 8).
1. A failed project_photos insert deleted the uploaded file, then retried WITHOUT storage_path — and the retry's
   `data` still pointed at the file it had just deleted: a dead tile, reported as "Added 1 photo". The file is
   kept for the retry and removed (with its thumbnail) only when the retry fails too.
2. Deleting a photo removed the file before the row; a refused row delete left a row pointing at nothing. The
   row goes first (and must come back deleted), then the file and its thumbnail.
3. Photo Album: one unreadable file stopped the whole batch. Each file is tried; the status says how many were
   added and which failed.
4. Quick inspection: the shot label ("Ground shots — all elevations") never reached the photo; it is the
   caption now. Photos that had not uploaded were lost silently on reload — the resume line says how many.
5. Estimate: line amounts are cents (each line rounded before it is summed), so the printed lines add up to the
   printed subtotal. The discount is clamped to 0…subtotal.
6. Estimate: editing or duplicating copied the photo LIST but shared the photo objects, so a caption typed and
   discarded, or a copy's caption / cover, rewrote the original's. Each photo is copied.
7. Estimate "Valid through" was the UTC date (a day late after 8pm Eastern): local date."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1
one("""      if(r.error){
        if(spath){ try{ await sb.storage.from('photos').remove([spath]); }catch(e3){} }
        /* storage_path column may not exist yet: retry without it */
        var r2 = await sb.from('project_photos').insert(Object.assign({
          project_id: projectId, data: store,
          created_by: user ? user.email : null
        }, extra || {}));
        if(r2.error) throw r2.error;
      }""",
"""      if(r.error){
        /* storage_path column may not exist yet: retry without it. 1404: the retry's `data` IS the uploaded file,
           so the file stays until the retry has failed too — removing it first left a row pointing at nothing. */
        var r2 = await sb.from('project_photos').insert(Object.assign({
          project_id: projectId, data: store,
          created_by: user ? user.email : null
        }, extra || {}));
        if(r2.error){
          if(spath){ try{ await sb.storage.from('photos').remove([spath, photoThumbPathOf(spath)]); }catch(e3){} }
          throw r2.error;
        }
      }""")
# 2
one("""      try{
        var row = await sb.from('project_photos').select('storage_path').eq('id', id).single();
        if(row.data && row.data.storage_path){
          /* 1221: the twin goes with it; removing a twin that was never made is a no-op */
          await sb.storage.from('photos').remove([row.data.storage_path, photoThumbPathOf(row.data.storage_path)].filter(Boolean));
        }
      }catch(e4){}
      var r = await sb.from('project_photos').delete().eq('id', id);
      if(r.error) throw r.error;
      return;""",
"""      /* 1404: the ROW goes first. Removing the file first left a row pointing at nothing whenever the delete
         was refused. */
      var sp = null;
      try{
        var row = await sb.from('project_photos').select('storage_path').eq('id', id).single();
        sp = row.data && row.data.storage_path || null;
      }catch(e4){}
      var r = await sb.from('project_photos').delete().eq('id', id).select('id');
      if(r.error) throw r.error;
      if(Array.isArray(r.data) && !r.data.length) throw new Error('This photo could not be deleted \\u2014 you may not have permission.');
      if(sp){
        /* 1221: the twin goes with it; removing a twin that was never made is a no-op */
        try{ await sb.storage.from('photos').remove([sp, photoThumbPathOf(sp)].filter(Boolean)); }catch(e5){}
      }
      return;""")
# 3
one("""  for(var i = 0; i < take.length; i++){
    status.textContent = 'Adding photo ' + (i+1) + ' of ' + take.length + '\\u2026';
    try{
      var dataUrl = await resizeImageFile(take[i], 1600, 0.82);
      await photoDb.add(currentProject.id, dataUrl, metas && metas[i]);
    }catch(err){
      status.textContent = 'Upload failed: ' + (err.message || err);
      await loadGallery();
      return;
    }
  }
  status.textContent = skipped > 0
    ? ('Added ' + take.length + ' \\u2014 ' + skipped + ' skipped (' + GAL_MAX + '-photo limit).')
    : ('Added ' + take.length + ' photo' + (take.length === 1 ? '' : 's') + '.');
  setTimeout(function(){ status.textContent = ''; }, 4000);""",
"""  /* 1404: one unreadable file no longer stops the batch — each is tried, and the status says what happened */
  var added = 0, failed = [];
  for(var i = 0; i < take.length; i++){
    status.textContent = 'Adding photo ' + (i+1) + ' of ' + take.length + '\\u2026';
    try{
      var dataUrl = await resizeImageFile(take[i], 1600, 0.82);
      await photoDb.add(currentProject.id, dataUrl, metas && metas[i]);
      added++;
    }catch(err){
      failed.push((take[i] && take[i].name ? take[i].name + ': ' : '') + (err.message || err));
    }
  }
  if(failed.length){
    status.textContent = 'Added ' + added + ' of ' + take.length + '. ' + failed.length + ' could not be added \\u2014 ' + failed.join(' \\u00b7 ');
    await loadGallery();
    return;
  }
  status.textContent = skipped > 0
    ? ('Added ' + take.length + ' \\u2014 ' + skipped + ' skipped (' + GAL_MAX + '-photo limit).')
    : ('Added ' + take.length + ' photo' + (take.length === 1 ? '' : 's') + '.');
  setTimeout(function(){ status.textContent = ''; }, 4000);""")
# 4
one("""      startedAt: qi.startedAt, up: qi.photos.filter(function(p){ return p.data && p.uploaded; }).length,""",
"""      startedAt: qi.startedAt, up: qi.photos.filter(function(p){ return p.data && p.uploaded; }).length,
      lost: qi.photos.filter(function(p){ return p.data && !p.uploaded; }).length,   /* 1404: shots not yet saved */""")
one("""    qi._restoredUp = s.up || 0;""", """    qi._restoredUp = s.up || 0;
    qi._restoredLost = s.lost || 0;""")
one("""      (qi._restoredUp ? ' \\u2014 ' + qi._restoredUp + ' photo(s) already uploaded and safe in the gallery.' : '.') +""",
"""      (qi._restoredUp ? ' \\u2014 ' + qi._restoredUp + ' photo(s) already uploaded and safe in the gallery.' : '.') +
      (qi._restoredLost ? ' <b>' + qi._restoredLost + ' photo(s) had not uploaded when the app closed and were not kept \\u2014 retake them.</b>' : '') +   /* 1404 */""")
one("""    await photoDb.add(qi.projectId, p.data);
    p.uploaded = true;""",
"""    await photoDb.add(qi.projectId, p.data, p.label ? { caption: p.label } : undefined);   /* 1404: the shot label */
    p.uploaded = true;""")
one("""      await photoDb.add(pid, qi.photos[pending[i]].data);""",
"""      await photoDb.add(pid, qi.photos[pending[i]].data, qi.photos[pending[i]].label ? { caption: qi.photos[pending[i]].label } : undefined);   /* 1404 */""")
# 5
one("""var amt = l.flat === true
? (Number(l.amount) || 0)
: (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
l.amount = amt;
subtotal += amt;
});
var discount = Number(s.discount) || 0;""",
"""var amt = l.flat === true
? (Number(l.amount) || 0)
: (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
amt = Math.round(amt * 100) / 100;   /* 1404: each line is cents, so the printed lines add up to the printed subtotal */
l.amount = amt;
subtotal += amt;
});
subtotal = Math.round(subtotal * 100) / 100;
var discount = Math.max(0, Math.min(subtotal, Number(s.discount) || 0));   /* 1404: never negative, never past the subtotal */""")
# 6
one("""photos         : (existing.photos || []).slice(),""",
"""photos         : (existing.photos || []).map(function(p){ return Object.assign({}, p); }),   /* 1404: copies, so an edit never reaches the saved row's objects */""")
one("""    photos         : (s.photos || []).slice(),
    itemized       : s.itemized !== false,
    discount       : s.discount,""",
"""    photos         : (s.photos || []).map(function(p){ return Object.assign({}, p); }),   /* 1404: the duplicate's own photos */
    itemized       : s.itemized !== false,
    discount       : s.discount,""")
# 7
one("""function todayISO(offsetDays){
var d = new Date();
if(offsetDays) d.setDate(d.getDate() + offsetDays);
return d.toISOString().slice(0, 10);
}""",
"""function todayISO(offsetDays){
var d = new Date();
if(offsetDays) d.setDate(d.getDate() + offsetDays);
return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);   /* 1404: the local day */
}""")

one(">v2026-10-23 build 1403<", ">v2026-10-23 build 1404<")
one("""  { b: 1403, d:'2026-10-23',""",
"""  { b: 1404, d:'2026-10-23', t:'Photos, quick inspections and estimates', s:'A photo whose save hiccuped no longer turns into a broken tile while saying it was added, and deleting a photo can no longer leave an empty tile behind. Adding several photos to the album keeps going past one bad file and says which failed. Quick-inspection photos carry their shot label, and if the app closes before some photos upload, it tells you to retake them. On estimates, the line amounts add up exactly to the subtotal, a discount can\\u2019t be negative or larger than the subtotal, editing a copy no longer changes the original\\u2019s photo captions, and Valid through no longer runs a day late in the evening.' },
  { b: 1403, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1404')
