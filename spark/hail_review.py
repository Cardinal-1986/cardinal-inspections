#!/usr/bin/env python3
"""hail_review.py — find candidate photos, draw AI boxes, let Theo pick,
export a YOLO dataset. Standard library only, nothing to install.

THE PIPELINE, and why it has three steps instead of one:

  1. find     — grep manifest.jsonl for job names matching a keyword. Free,
                seconds, and it tells you the candidate COUNT before step 2
                spends a single API call.
  2. detect   — run each candidate through the exact same model as the app's
                /api/detect, over the network. Resumable, like
                fetch_companycam.py: Ctrl-C costs nothing, re-run the same
                command and it skips what already has a result.
  3. review   — build ONE self-contained HTML file: every candidate photo
                with its boxes drawn as a resolution-independent overlay
                (position:absolute divs on fractions, exactly the contract
                walk_shots.findings uses in the app — nothing is ever burned
                into the pixels). Check what's real, uncheck what isn't,
                click Export — a YOLO dataset (images/ + labels/ + data.yaml)
                lands next to the HTML file. Checks persist in the browser's
                localStorage, so closing the tab mid-review loses nothing.

WHY STEP 2 CALLS THE LIVE APP INSTEAD OF RE-PROMPTING GEMINI DIRECTLY:
one prompt, one vocabulary, one place that can drift. Re-implementing the
prompt in Python would be a second copy of a thing this project has already
paid once for keeping in sync (see CLAUDE.md on api/detect.js's vocab echo).
The one unavoidable duplication is DEFECT_KEYS/SEVERITIES below, because
Python cannot import a <script> block — so this script checks its own copy
against what the live API echoes back on the FIRST successful call and warns
loudly, once, on a mismatch. Same defensive pattern cr-show-script uses.

AUTH: a bearer token, never a service-role key. /api/detect requires a real
signed-in session (requireSession in the route), so this script signs in as
YOU via Supabase's password grant, using the SAME public anon key already
safely hardcoded in api/*.js — that key is designed to be public. Your own
password is not: set it in an environment variable, never on the command
line (it would land in shell history) and never in a file that gets
committed.

    export CARDINAL_EMAIL='theo@cardinalrenovations.net'
    export CARDINAL_PASSWORD='...'                       # never in a script or a commit

USAGE

    python3 hail_review.py find   --dest /data/cardinal/companycam
    python3 hail_review.py detect --dest /data/cardinal/companycam
    python3 hail_review.py review --dest /data/cardinal/companycam
    # then open hail_review/review.html in a browser, check the real ones,
    # click Export — hail_review/yolo/ is the training set.

Every step reads --dest, the SAME folder fetch_companycam.py wrote to.
"""
import argparse, json, os, re, sys, time, base64, urllib.request, urllib.error

APP_URL = 'https://app.cardinalroster.com'          # where /api/detect lives
SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co'
# The SAME publishable anon key api/*.js falls back to when the env var is
# unset. CLAUDE.md is explicit that this one is designed to be public.
SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ'

# Copied from api/detect.js verbatim. If these two ever disagree, the mismatch
# check in run_detect() below will say so on the first response rather than
# silently mislabeling everything.
SEVERITIES = ['crit', 'warn', 'ok']
DEFECT_KEYS = [
    'hail_impact', 'wind_lifted', 'missing_shingle', 'granule_loss',
    'cracked_split', 'nail_pop', 'exposed_fastener', 'flashing_failed',
    'flashing_missing', 'pipe_boot', 'chimney', 'valley', 'ridge_cap',
    'ponding_debris', 'decking_sag', 'ice_dam', 'other'
]

def log(msg):
    print(msg, flush=True)

def out_dir(dest):
    d = os.path.join(dest, 'hail_review')
    os.makedirs(d, exist_ok=True)
    return d


# ── step 1 · find ────────────────────────────────────────────────────────
def cmd_find(args):
    manifest_path = os.path.join(args.dest, 'manifest.jsonl')
    if not os.path.exists(manifest_path):
        sys.exit('No manifest.jsonl at %s — run fetch_companycam.py first.' % manifest_path)

    kw = args.keyword.lower()
    candidates, jobs_seen = [], set()
    total = 0
    with open(manifest_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total += 1
            rec = json.loads(line)
            name = str(rec.get('project_name') or '')
            if kw not in name.lower():
                continue
            candidates.append(rec)
            jobs_seen.add(name)

    out = os.path.join(out_dir(args.dest), 'candidates.jsonl')
    with open(out, 'w', encoding='utf-8') as f:
        for rec in candidates:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')

    log('%d photos scanned' % total)
    log('%d match "%s" in the job name, across %d jobs:' % (len(candidates), args.keyword, len(jobs_seen)))
    for j in sorted(jobs_seen)[:15]:
        log('   ' + j)
    if len(jobs_seen) > 15:
        log('   ... and %d more' % (len(jobs_seen) - 15))
    log('')
    if not candidates:
        log('Nothing matched. This only finds jobs literally NAMED with that word —')
        log('it will miss hail damage in a job called something else. Try a different')
        log('--keyword, or run `detect` with --all to scan the whole archive instead')
        log('(real API cost at that volume — see the module docstring).')
    else:
        log('Written: ' + out)
        log('Next: python3 hail_review.py detect --dest ' + args.dest)


# ── step 2 · detect ──────────────────────────────────────────────────────
def get_token(email, password):
    req = urllib.request.Request(
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
        data=json.dumps({'email': email, 'password': password}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        sys.exit('Sign-in failed (%d): %s' % (e.code, e.read().decode('utf-8', 'replace')[:300]))
    tok = body.get('access_token')
    if not tok:
        sys.exit('Sign-in returned no access_token — check CARDINAL_EMAIL/CARDINAL_PASSWORD.')
    return tok

def call_detect(token, image_b64, mime, label, collect=False):
    # collect=True asks /api/detect for COLLECTION MODE (build 596 / PR #114):
    # up to 40 findings instead of 12, the prompt's "most significant" cap
    # lifted, and raw_defect kept when the model names something the 33-key
    # vocabulary lacks. The reviewer path never sets it.
    payload = {'image': image_b64, 'mime': mime, 'label': label}
    if collect:
        payload['collect'] = True
    req = urllib.request.Request(
        APP_URL + '/api/detect',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
        method='POST')
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))

def cmd_detect(args):
    cand_path = getattr(args, 'candidates', None) or os.path.join(out_dir(args.dest), 'candidates.jsonl')
    if not os.path.exists(cand_path):
        sys.exit('No candidates file at %s — run `find` first (or pass --candidates).' % cand_path)

    candidates = [json.loads(l) for l in open(cand_path, encoding='utf-8') if l.strip()]
    if args.all:
        manifest_path = os.path.join(args.dest, 'manifest.jsonl')
        candidates = [json.loads(l) for l in open(manifest_path, encoding='utf-8') if l.strip()]
        log('--all: scanning the WHOLE archive, %d photos. This is real API' % len(candidates))
        log('volume — Ctrl-C any time, re-running resumes where this left off.')

    email = os.environ.get('CARDINAL_EMAIL')
    password = os.environ.get('CARDINAL_PASSWORD')
    if not email or not password:
        sys.exit('Set CARDINAL_EMAIL and CARDINAL_PASSWORD as environment variables first.')
    token = get_token(email, password)
    log('Signed in as ' + email)

    findings_path = os.path.join(out_dir(args.dest), 'findings.jsonl')
    done_paths = set()
    if os.path.exists(findings_path):
        for l in open(findings_path, encoding='utf-8'):
            l = l.strip()
            if l:
                done_paths.add(json.loads(l)['path'])
    log('%d already done, resuming' % len(done_paths) if done_paths else 'starting fresh')

    vocab_checked = False
    ok_n = fail_n = 0
    with open(findings_path, 'a', encoding='utf-8') as out:
        for i, rec in enumerate(candidates):
            path = rec['path']
            if path in done_paths:
                continue
            full = os.path.join(args.dest, path)
            if not os.path.exists(full):
                log('  [%d/%d] MISSING on disk, skipped: %s' % (i + 1, len(candidates), path))
                continue

            with open(full, 'rb') as fh:
                b64 = base64.b64encode(fh.read()).decode('ascii')

            attempt, body, err = 0, None, None
            while attempt < 3:
                attempt += 1
                try:
                    body = call_detect(token, b64, 'image/jpeg', rec.get('project_name') or '',
                                       collect=getattr(args, 'collect', False))
                    err = None
                    break
                except urllib.error.HTTPError as e:
                    err = e
                    if e.code in (502, 503, 429):
                        time.sleep(1.5 * attempt)
                        continue
                    break
                except Exception as e:
                    err = e
                    time.sleep(1.5 * attempt)

            if err is not None or body is None:
                fail_n += 1
                log('  [%d/%d] FAILED: %s — %s' % (i + 1, len(candidates), path, err))
                out.write(json.dumps({'path': path, 'error': str(err)}) + '\n')
                out.flush()
                continue

            if not vocab_checked and body.get('vocab', {}).get('defects'):
                vocab_checked = True
                theirs = sorted(body['vocab']['defects'])
                mine = sorted(DEFECT_KEYS)
                if theirs != mine:
                    log('  *** WARNING: the live API vocabulary differs from this script\'s copy.')
                    log('      api: ' + ','.join(theirs))
                    log('      script: ' + ','.join(mine))
                    log('      Update DEFECT_KEYS at the top of this file before trusting labels.')

            n = len(body.get('findings', []))
            ok_n += 1
            log('  [%d/%d] %s — %d finding%s' % (i + 1, len(candidates), path, n, '' if n == 1 else 's'))
            rec_out = {'path': path, 'project_name': rec.get('project_name'),
                       'project_address': rec.get('project_address'),
                       'findings': body.get('findings', []),
                       'quality': body.get('quality'), 'quality_note': body.get('quality_note'),
                       'dropped': body.get('dropped', 0),
                       # dropped_by says WHICH path took them. `via` is the
                       # teacher model that produced these labels — the first
                       # 2038 records were collected without it and are
                       # therefore not stratifiable by teacher, which cannot be
                       # fixed retroactively. Never drop this field again.
                       'dropped_by': body.get('dropped_by'),
                       'via': body.get('via')}
            out.write(json.dumps(rec_out, ensure_ascii=False) + '\n')
            out.flush()

    log('')
    log('%d succeeded, %d failed. Written: %s' % (ok_n, fail_n, findings_path))
    log('Next: python3 hail_review.py review --dest ' + args.dest)


# ── step 3 · review ───────────────────────────────────────────────────────
def esc(s):
    return (str(s or '')
            .replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;').replace("'", '&#39;'))

REVIEW_TEMPLATE = """<!doctype html><html><head><meta charset="utf-8">
<title>Hail review</title>
<style>
body{font-family:-apple-system,Arial,sans-serif;background:#0B0D0C;color:#F2F4F2;margin:0;padding:20px}
h1{font-size:20px}
.bar{position:sticky;top:0;background:#0B0D0C;padding:10px 0;border-bottom:1px solid #333;
     display:flex;gap:12px;align-items:center;z-index:5}
.bar button{background:#C8202E;color:#fff;border:0;border-radius:6px;padding:8px 14px;
            font:700 12px inherit;cursor:pointer}
.bar span{color:#98A29C;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-top:16px}
.card{background:#151817;border:1px solid #2a2e2c;border-radius:8px;overflow:hidden}
.stage{position:relative}
.stage img{display:block;width:100%;height:auto}
.box{position:absolute;border:2px solid #98A29C;border-radius:4px;cursor:pointer;box-sizing:border-box}
.box.crit{border-color:#E5484D}.box.warn{border-color:#E8A33D}.box.ok{border-color:#46A758}
.box.off{opacity:.25}
.box .lb{position:absolute;left:-2px;bottom:100%;white-space:nowrap;font:700 9px monospace;
         padding:2px 5px;background:rgba(6,8,7,.85);border-radius:3px}
.meta{padding:10px 12px;font-size:12px;color:#98A29C}
.meta b{display:block;color:#F2F4F2;font-size:13px;margin-bottom:4px}
.finding{display:flex;align-items:center;gap:7px;padding:6px 12px;font-size:12px;border-top:1px solid #222}
.finding input{flex:0 0 auto}
.finding .sq{width:9px;height:9px;border-radius:2px;flex:0 0 auto}
.finding.crit .sq{background:#E5484D}.finding.warn .sq{background:#E8A33D}.finding.ok .sq{background:#46A758}
.finding label{flex:1;cursor:pointer}
.empty{color:#666;font-size:11px;padding:10px 12px}
</style></head><body>
<div class="bar">
  <h1 style="margin:0;font-size:16px">Hail review</h1>
  <span id="count"></span>
  <button id="exportBtn">Export checked as YOLO</button>
  <button id="checkAllBtn" style="background:#333">Check all</button>
  <span>Checks are saved in this browser automatically.</span>
</div>
<div class="grid" id="grid"></div>
<script>
const DATA = __DATA__;
const CLASSES = __CLASSES__;
const KEY = 'hail_review_checks_v1';
let checks = {};
try { checks = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) {}
function ckey(pi, fi){ return pi + ':' + fi; }
function isOn(pi, fi){ return checks[ckey(pi,fi)] !== false; }   // default ON
function save(){ localStorage.setItem(KEY, JSON.stringify(checks)); updateCount(); }
function updateCount(){
  let on = 0, total = 0;
  DATA.forEach((p, pi) => (p.findings||[]).forEach((f, fi) => { total++; if (isOn(pi, fi)) on++; }));
  document.getElementById('count').textContent = on + ' of ' + total + ' findings checked';
}
function pct(v){ return (Math.max(0, Math.min(1, +v||0)) * 100).toFixed(2) + '%'; }

const grid = document.getElementById('grid');
DATA.forEach((p, pi) => {
  const card = document.createElement('div');
  card.className = 'card';
  const findings = p.findings || [];
  card.innerHTML =
    '<div class="stage">' +
      '<img src="' + p.path + '" loading="lazy">' +
      findings.map((f, fi) => {
        const b = f.box || {x:0,y:0,w:0,h:0};
        return '<div class="box ' + f.severity + '" data-pi="' + pi + '" data-fi="' + fi + '"' +
          ' style="left:' + pct(b.x) + ';top:' + pct(b.y) + ';width:' + pct(b.w) + ';height:' + pct(b.h) + '">' +
          '<span class="lb">' + (f.label || f.defect) + '</span></div>';
      }).join('') +
    '</div>' +
    '<div class="meta"><b>' + (p.project_name || 'Untitled') + '</b>' + (p.project_address || '') + '</div>' +
    (findings.length
      ? findings.map((f, fi) =>
          '<div class="finding ' + f.severity + '"><span class="sq"></span>' +
          '<input type="checkbox" data-pi="' + pi + '" data-fi="' + fi + '"' +
          (isOn(pi, fi) ? ' checked' : '') + '>' +
          '<label>' + (f.label || f.defect) + ' (' + f.defect + ')</label></div>').join('')
      : '<div class="empty">No findings on this one.</div>');
  grid.appendChild(card);
});

grid.addEventListener('change', e => {
  if (e.target.type !== 'checkbox') return;
  const pi = e.target.dataset.pi, fi = e.target.dataset.fi;
  checks[ckey(pi, fi)] = e.target.checked;
  document.querySelector('.box[data-pi="'+pi+'"][data-fi="'+fi+'"]')
    .classList.toggle('off', !e.target.checked);
  save();
});
document.getElementById('checkAllBtn').onclick = () => {
  DATA.forEach((p, pi) => (p.findings||[]).forEach((f, fi) => { checks[ckey(pi,fi)] = true; }));
  save();
  document.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true);
  document.querySelectorAll('.box').forEach(b => b.classList.remove('off'));
};
updateCount();

// ── Export: one .txt per image, YOLO format (class cx cy w h, all 0-1) ──
document.getElementById('exportBtn').onclick = () => {
  const lines = ['# Save each block below as labels/<same-name-as-image>.txt'];
  let n = 0;
  DATA.forEach((p, pi) => {
    const kept = (p.findings || []).map((f, fi) => isOn(pi, fi) ? f : null).filter(Boolean);
    if (!kept.length) return;
    n++;
    const base = p.path.split('/').pop().replace(/\\.[^.]+$/, '');
    lines.push('# ' + base + '.txt  (image: ' + p.path + ')');
    kept.forEach(f => {
      const b = f.box, cls = CLASSES.indexOf(f.defect) === -1 ? CLASSES.length - 1 : CLASSES.indexOf(f.defect);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      lines.push(cls + ' ' + cx.toFixed(6) + ' ' + cy.toFixed(6) + ' ' + b.w.toFixed(6) + ' ' + b.h.toFixed(6));
    });
    lines.push('');
  });
  lines.unshift('# classes.txt order:\\n# ' + CLASSES.join(', ') + '\\n# ' + n + ' images with at least one kept finding\\n');
  const blob = new Blob([lines.join('\\n')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yolo_labels.txt';
  a.click();
};
</script></body></html>
"""

def cmd_review(args):
    findings_path = os.path.join(out_dir(args.dest), 'findings.jsonl')
    if not os.path.exists(findings_path):
        sys.exit('No findings.jsonl — run `detect` first.')

    rows = []
    for l in open(findings_path, encoding='utf-8'):
        l = l.strip()
        if not l:
            continue
        rec = json.loads(l)
        if 'error' in rec:
            continue
        rows.append(rec)

    html = (REVIEW_TEMPLATE
            .replace('__DATA__', json.dumps(rows, ensure_ascii=False))
            .replace('__CLASSES__', json.dumps(DEFECT_KEYS)))
    # img src is a relative path from the review file to the archive root —
    # write the HTML one level below --dest so "../<path>" always resolves,
    # rather than copying 61,000 photographs a second time.
    html = html.replace('src="' , 'src="../')
    review_path = os.path.join(out_dir(args.dest), 'review.html')
    with open(review_path, 'w', encoding='utf-8') as f:
        f.write(html)

    with_findings = sum(1 for r in rows if r.get('findings'))
    log('%d photos, %d with at least one finding' % (len(rows), with_findings))
    log('Written: ' + review_path)
    log('Open it in a browser. The Export button downloads yolo_labels.txt once you are done.')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)

    f = sub.add_parser('find', help='keyword-match job names, free, no API calls')
    f.add_argument('--dest', required=True)
    f.add_argument('--keyword', default='hail')
    f.set_defaults(func=cmd_find)

    d = sub.add_parser('detect', help='run candidates through /api/detect, resumable')
    d.add_argument('--dest', required=True)
    d.add_argument('--all', action='store_true', help='scan the whole archive instead of candidates.jsonl')
    d.add_argument('--collect', action='store_true',
                   help='send collect:true — collection mode: up to 40 findings, raw_defect kept')
    d.add_argument('--candidates', default=None,
                   help='path to a candidates file (default: <dest>/candidates.jsonl)')
    d.set_defaults(func=cmd_detect)

    r = sub.add_parser('review', help='build the HTML review + export page')
    r.add_argument('--dest', required=True)
    r.set_defaults(func=cmd_review)

    args = ap.parse_args()
    args.func(args)

if __name__ == '__main__':
    main()
