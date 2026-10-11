"""Build 1294 — time on job (Theo's pick 2B, 10 Oct).

The crew's check-in / check-out has been recorded on every punch-out since 940
(punch_items.visits, [{in,out,by,name,day}]). Nothing added it up. Now:
  · the punch card lists each visit (day, who, in–out, length) and a total;
  · every Punch List row shows the total on site (or the time so far while on site).

ONE helper, window.CardinalPunchTime, defined in cr-pk-script and read by
cr-punch-script — two modules, one rule (the plBase lesson). An open visit from
an EARLIER day (he forgot to check out) is never counted: it would turn one
forgotten tap into a 20-hour job. No SQL; nothing new is typed.

Usage: python3 patch_1294.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# 1. the shared helper, right after visitDayLabel in cr-pk-script
A = """function checkIn(){
  if(openVisit()) return;                       /* already on site — no double */"""
HELP = r"""/* 1294: time on job. ONE rule for the card and the Punch List
   (window.CardinalPunchTime, read by cr-punch-script). A visit counts out−in;
   an open visit counts only if it opened TODAY (now−in, "so far"); an open
   visit from an earlier day is a forgotten check-out and counts nothing. */
function pkLocalDay(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function pkTimeSum(list, now){
  var v = Array.isArray(list) ? list : [], ms = 0, n = 0, live = 0, stale = false;
  var t = now ? new Date(now) : new Date(), today = pkLocalDay(t);
  for(var i = 0; i < v.length; i++){
    var x = v[i]; if(!x || !x.in) continue;
    var a = Date.parse(x.in); if(isNaN(a)) continue;
    if(x.out){ var b = Date.parse(x.out); if(!isNaN(b) && b > a){ ms += b - a; n++; } continue; }
    if(x.day === today && t.getTime() > a){ live = t.getTime() - a; ms += live; n++; } else stale = true;
  }
  return { ms:ms, visits:n, live:live, stale:stale };
}
function pkDur(ms){
  var m = Math.round((+ms || 0) / 60000); if(m < 1) return '0m';
  var h = Math.floor(m / 60); m = m % 60;
  return h ? h + 'h ' + ('0' + m).slice(-2) + 'm' : m + 'm';
}
window.CardinalPunchTime = Object.assign(window.CardinalPunchTime || {}, { sum: pkTimeSum, fmt: pkDur });

"""
src = pl.sub(src, A, HELP + A)

# 2. the card: a visit log + total under the check-in strip
B = "  return '<div class=\"pkvis\">' + line + right + '</div>';\n}\nfunction stepsDone(){"
B2 = r"""  return '<div class="pkvis">' + line + right + '</div>' + visitLogHtml();
}
/* 1294: each visit and the total. Shown once there is at least one visit. */
function visitLogHtml(){
  var v = visits(); if(!v.length) return '';
  var now = new Date(), today = dayKey(now), rows = '';
  for(var i = 0; i < v.length; i++){
    var x = v[i]; if(!x || !x.in) continue;
    var a = Date.parse(x.in), b = x.out ? Date.parse(x.out) : NaN, len;
    if(x.out) len = (!isNaN(a) && !isNaN(b) && b > a) ? pkDur(b - a) : '';
    else len = (x.day === today) ? pkDur(now.getTime() - a) + ' so far' : 'not checked out';
    rows += '<div class="pkvl"><span>' + esc(visitDayLabel(x.day)) + (x.name ? ' · ' + esc(x.name) : '') + '</span>' +
      '<span>' + esc(visitClock(x.in)) + (x.out ? ' – ' + esc(visitClock(x.out)) : '') + (len ? ' · ' + esc(len) : '') + '</span></div>';
  }
  var s = pkTimeSum(v, now);
  return '<div class="pkvlog" data-cr-1294>' + rows +
    '<div class="pkvtot">Total ' + esc(pkDur(s.ms)) + ' · ' + s.visits + (s.visits === 1 ? ' visit' : ' visits') + '</div></div>';
}
function stepsDone(){"""
src = pl.sub(src, B, B2)

# 3. the card CSS, after the .pkvnone rule (the strip is a dark chip in both themes; this log sits on the card)
C = "#cr-pk .pkvnone{ color:var(--pk-dim,#9aa2ae); }\n"
C2 = C + """/* 1294: the visit log. Inks ride the card's own tokens, which flip with the theme. */
#cr-pk .pkvlog{ margin:6px 0 2px; padding:4px 2px; }
#cr-pk .pkvl{ display:flex; justify-content:space-between; gap:10px; padding:5px 0; font:400 13px 'Segoe UI',Arial,sans-serif;
  color:var(--pk-dim,#9aa2ae); border-bottom:1px solid var(--pk-line,#252a30); font-variant-numeric:tabular-nums; }
#cr-pk .pkvtot{ padding-top:7px; font:700 13px 'Segoe UI',Arial,sans-serif; color:var(--pk-ink,#eceef0); }
"""
src = pl.sub(src, C, C2)

# 4. the Punch List row: append the time to the "when" sub line
D = "function plRow(it){\n"
D2 = r"""/* 1294: time on site, from the card's ONE rule (window.CardinalPunchTime). */
function plOnSite(it){
  var T = window.CardinalPunchTime; if(!T || !T.sum) return '';
  var s = T.sum(it && it.visits);
  if(!s.ms) return '';
  return s.live ? T.fmt(s.live) + ' so far' + (s.ms > s.live ? ' · ' + T.fmt(s.ms) + ' total' : '') : T.fmt(s.ms) + ' on site';
}
function plRow(it){
"""
src = pl.sub(src, D, D2)
E = """    '<span class="pl-wh' + (w.cls ? ' ' + w.cls : '') + '"><b>' + esc(w.main) + '</b><small>' + esc(w.sub || '') + '</small></span>' +"""
E2 = """    '<span class="pl-wh' + (w.cls ? ' ' + w.cls : '') + '"><b>' + esc(w.main) + '</b><small>' + esc([w.sub, plOnSite(it)].filter(Boolean).join(' \\u00b7 ')) + '</small></span>' +"""
src = pl.sub(src, E, E2)

src = pl.sub(src, '">v2026-10-10 build 1293<button', '">v2026-10-10 build 1294<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1293,",
  "var CHANGELOG = [\n"
  "  { b: 1294, d: '2026-10-10', t: 'Time on job',\n"
  "    s: 'A punch-out now adds up the time on site. The card lists every visit, with the day, who, when they checked in and out and how long, and a total underneath. Each row on the Punch List shows the total too, or the time so far while someone is there. It comes from the check-in and check-out the crew already does, so there is nothing new to type. A check-in from an earlier day that was never checked out is not counted.' },\n"
  "  { b: 1293,")
pl.write_atomic(PATH, src)
print('patched 1294')
