"""Build 1295 — the rain flag (Theo's pick 7B, 10 Oct).

  · A punch-out whose day has a wet forecast shows a blue "Rain 80%" (or Storm /
    Snow) chip on its Punch List row and on its card's dispatch line.
  · Curtis's existing 3pm "Plan <day>" buzz gets one more sentence naming the
    wet stops for that day. No new buzz, no new cron.

The forecast is the one the app already has (cr-wx-script, Open-Meteo, free, no
key, 14 days). "Wet" is CardinalWx.wet(): >=50% or a rain/storm/snow code. The
server needs the same rule, so api/punch-buzz.js carries a copy (wetDay) and
gate_1295 runs both against the same days — the 1255 two-copies rule.
A failed forecast fetch flags nothing anywhere and never blocks a buzz.

Usage: python3 patch_1295.py [index.html] [api/punch-buzz.js]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
API = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '../../../../api/punch-buzz.js')
src = pl.load(PATH)

# ── the shared label, next to wet() in cr-wx-script
A = "  window.CardinalWx = Object.assign(window.CardinalWx || {}, {\n    load: load, day: day, kind: kind, icon: icon, wet: wet, cell: cell\n  });"
B = """  /* 1295: the rain flag's words — "Rain 80%", "Storm 60%", "Snow" — or '' when
     the day is dry or past the 14-day horizon. Punch List rows and the card use it. */
  function flag(s){
    if(!wet(s)) return '';
    var d = day(s), k = kind(d.c), p = +d.p || 0;
    var w = k === 'storm' ? 'Storm' : k === 'snow' ? 'Snow' : 'Rain';
    return w + (p ? ' ' + p + '%' : '');
  }
  window.CardinalWx = Object.assign(window.CardinalWx || {}, {
    load: load, day: day, kind: kind, icon: icon, wet: wet, cell: cell, flag: flag
  });"""
src = pl.sub(src, A, B)

# ── Punch List: the row chip, and fetch the forecast on render
C = "function plRow(it){\n  var pr = projOf(it.project_id), K = plKind(it), w = plWhen(it), g = plBase(it), ping = plPing(it);"
D = """/* 1295: the rain flag for an open, dated, not-held job — '' otherwise. */
function plRain(it){
  var g = plBase(it); if(g === 'closed' || g === 'hold') return '';
  var d = plDay(it); if(!d || !window.CardinalWx || !window.CardinalWx.flag) return '';
  return window.CardinalWx.flag(d);
}
function plRow(it){
  var pr = projOf(it.project_id), K = plKind(it), w = plWhen(it), g = plBase(it), ping = plPing(it), rain = plRain(it);"""
src = pl.sub(src, C, D)
E = "      (plBackFromHold(it) ? '<span class=\"pl-flag\">Back from hold</span>' : '') + '</span>' +"
F = "      (plBackFromHold(it) ? '<span class=\"pl-flag\">Back from hold</span>' : '') +\n      (rain ? '<span class=\"pl-flag rain\" data-cr-1295>' + esc(rain) + '</span>' : '') + '</span>' +"
src = pl.sub(src, E, F)
G = "function render(){\n  var all = rows();\n  /* 1248: every open item"
H = "function render(){\n  if(window.CardinalWx) window.CardinalWx.load(function(){ render(); });   /* 1295: the rain flag */\n  var all = rows();\n  /* 1248: every open item"
src = pl.sub(src, G, H)
I = ".pl-flag{font:700 11px 'Segoe UI',Arial,sans-serif;color:var(--pl-late,#f08a90);white-space:nowrap;}\n"
J = I + """/* 1295: the rain flag — blue, its own word, computed on both grounds */
.pl-flag.rain{color:#6db3f2;}
:root[data-theme="rb-light"] .pl-flag.rain{color:#1f5e99;}
"""
src = pl.sub(src, I, J)

# ── the card's dispatch line
K = """  return '<button class="pkfold" data-act="dispatch" type="button">' + svg('user') +
    '<span class="tx">' + esc(whoTxt) + ' \\u00b7 ' + esc(whenTxt) +
    (it.priority === 'high' ? ' \\u00b7 Urgent' : '') + '</span><span class="ch">\\u203A</span></button>';"""
L = """  /* 1295: the rain flag, on the day the job is booked (never once it is done) */
  var rain = (it.status !== 'done' && it.scheduled_at && window.CardinalWx && window.CardinalWx.flag)
    ? window.CardinalWx.flag(String(it.scheduled_at).slice(0, 10)) : '';
  return '<button class="pkfold" data-act="dispatch" type="button">' + svg('user') +
    '<span class="tx">' + esc(whoTxt) + ' \\u00b7 ' + esc(whenTxt) +
    (it.priority === 'high' ? ' \\u00b7 Urgent' : '') +
    (rain ? ' <b class="pkrain" data-cr-1295>' + esc(rain) + '</b>' : '') + '</span><span class="ch">\\u203A</span></button>';"""
src = pl.sub(src, K, L)
M = "function render(){\n  if(!el || !it) return;\n  var html = cardHtml()"
N = "function render(){\n  if(!el || !it) return;\n  if(window.CardinalWx) window.CardinalWx.load(function(){ render(); });   /* 1295 */\n  var html = cardHtml()"
src = pl.sub(src, M, N)
O = "#cr-pk .pkvnone{ color:var(--pk-dim,#9aa2ae); }\n"
P = O + """/* 1295: the rain flag on the dispatch line */
#cr-pk .pkrain{ font-weight:700; color:#6db3f2; white-space:nowrap; }
:root[data-theme="rb-light"] #cr-pk .pkrain{ color:#1f5e99; }
"""
src = pl.sub(src, O, P)

src = pl.sub(src, '">v2026-10-10 build 1294<button', '">v2026-10-10 build 1295<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1294,",
  "var CHANGELOG = [\n"
  "  { b: 1295, d: '2026-10-10', t: 'Rain flag on punch-outs',\n"
  "    s: 'If rain, a storm or snow is forecast for the day a punch-out is booked, its Punch List row and its card show a blue Rain chip with the chance, like Rain 80%. Curtis\\u2019s 3pm Plan buzz now ends with the jobs that look wet the next day, so he can move them. It uses the same free 14-day forecast as Dispatch, so a job more than two weeks out shows no chip until the forecast reaches it.' },\n"
  "  { b: 1294,")
pl.write_atomic(PATH, src)

# ── api/punch-buzz.js
api = pl.load(API)
Q = "/* ── what is due at this moment — PURE, so the gate can run it ── */\nexport function planBuzzes(items, projects, now, force) {"
R = """/* 1295: the rain rule — a COPY of CardinalWx.wet/kind/flag in index.html
   (cr-wx-script). gate_1295 feeds both the same days and fails if they differ.
   wx is { 'YYYY-MM-DD': { c: weather_code, p: precip % } } from Open-Meteo. */
function wxKind(c) {
  c = +c;
  if (c >= 95) return 'storm';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if (c === 0 || c === 1) return 'sun';
  return 'cloud';
}
export function wxFlag(wx, s) {
  const d = wx && wx[s]; if (!d) return '';
  const k = wxKind(d.c), p = +d.p || 0;
  if (!(p >= 50 || k === 'rain' || k === 'storm' || k === 'snow')) return '';
  return (k === 'storm' ? 'Storm' : k === 'snow' ? 'Snow' : 'Rain') + (p ? ' ' + p + '%' : '');
}
async function fetchWx() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.7589&longitude=-84.1916' +
      '&daily=weather_code,precipitation_probability_max&forecast_days=14&timezone=America%2FNew_York');
    const j = await r.json(), d = j && j.daily, out = {};
    if (!d || !d.time) return null;
    d.time.forEach((t, i) => { out[t] = { c: (d.weather_code || [])[i], p: (d.precipitation_probability_max || [])[i] }; });
    return out;
  } catch (_) { return null; }                      /* no forecast = no rain line, never a failed buzz */
}

/* ── what is due at this moment — PURE, so the gate can run it ── */
export function planBuzzes(items, projects, now, force, wx) {"""
api = pl.sub(api, Q, R)
S = """    out.push({ key: 'plan:' + nx, to: [CURTIS], title: 'Plan ' + dayName(nx),
      body: label(nx) + ': ' + perPerson(items, crew, nx, today) + '. Unassigned: ' + unasg + ' · No date: ' + nodate +
        ' · Past due: ' + late.length + '.',
      url: '#punch' });"""
T = """    /* 1295: the wet stops for that day, named, so Curtis can move them */
    const rf = wxFlag(wx, nx);
    const wetJobs = rf ? items.filter(it => isOpen(it) && !onHold(it, today) && dayOfIt(it) === nx) : [];
    out.push({ key: 'plan:' + nx, to: [CURTIS], title: 'Plan ' + dayName(nx),
      body: label(nx) + ': ' + perPerson(items, crew, nx, today) + '. Unassigned: ' + unasg + ' · No date: ' + nodate +
        ' · Past due: ' + late.length + '.' +
        (wetJobs.length ? ' ' + rf + ' forecast: ' + wetJobs.map(who).join(', ') + '.' : ''),
      url: '#punch' });"""
api = pl.sub(api, S, T)
U = "    let buzzes = planBuzzes(items, projects, new Date(), force);"
V = "    /* 1295: the forecast is only read by the 3pm plan slot */\n    const wx = (force === 'plan' || (!force && localNow(new Date()).hour === SLOT_HOURS.plan)) ? await fetchWx() : null;\n    let buzzes = planBuzzes(items, projects, new Date(), force, wx);"
api = pl.sub(api, U, V)
pl.write_atomic(API, api)
print('patched 1295')
