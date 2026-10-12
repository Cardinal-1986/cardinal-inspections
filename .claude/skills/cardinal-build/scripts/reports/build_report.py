#!/usr/bin/env python3
"""Cardinal photo inspection / completion report — the "Caroline / Darlene" style.

Landscape Letter, warm off-white page, CARDINAL header with a burgundy bar,
DejaVu Serif titles, small spaced labels, two or three photos per page with a
burgundy label and a short caption, a summary-and-recommendations page last.
Matches the Cardinal_2408_Lakeview_Completion_Report.pdf the team already sent
Rebuilding Together (ReportLab, 6 Oct 2026), rebuilt in HTML so Chromium prints it.

Usage:
    python3 build_report.py spec.json out_dir/
    # then print it:
    chrome --headless --no-sandbox --no-pdf-header-footer \
        --print-to-pdf=out_dir/Report.pdf file://$PWD/out_dir/report.html
    # photos over ~10 MB total? shrink first (the CRM Files upload caps at 10 MB):
    node shrink_photos.mjs photos/ photos_small/   # 1600px, JPEG q0.80

Image paths in the spec are relative to out_dir. See example_spec.json.
The script never invents a finding: every caption comes from the spec.
"""
import html, json, sys, os

CSS = '''
@page{size:11in 8.5in;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#FAF9F6;--ink:#242827;--mut:#69716E;--acc:#922F3D;--rule:#D9DDD6;}
body{font-family:"DejaVu Sans",sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.pg{width:792pt;height:612pt;position:relative;background:var(--bg);overflow:hidden;break-after:page;}
.pg:last-child{break-after:auto;}
.a{position:absolute;}
.bar{left:42pt;top:33pt;width:4pt;height:18pt;background:var(--acc);}
.brand{left:55pt;top:26pt;font-weight:700;font-size:17pt;letter-spacing:.02em;}
.brand small{display:block;font-size:8pt;color:var(--mut);letter-spacing:.02em;margin-top:2pt;}
.ct{left:471pt;top:30pt;font-size:8pt;line-height:15pt;color:var(--mut);}
.foot{left:42pt;right:42pt;bottom:51pt;border-top:.6pt solid var(--rule);}
.fl{left:42pt;bottom:24pt;font-size:7pt;color:var(--mut);letter-spacing:.03em;}
.fr{left:524pt;bottom:24pt;font-size:6.5pt;color:var(--mut);letter-spacing:.03em;}
.pn{left:733pt;bottom:24pt;font-size:8pt;font-weight:700;color:var(--acc);}
.eb{font-size:7.5pt;font-weight:700;color:var(--mut);letter-spacing:.06em;}
.ser{font-family:"DejaVu Serif",serif;font-weight:400;}
.h{left:42pt;top:84pt;font-size:24pt;}
.sub{left:42pt;top:120pt;font-size:9.5pt;color:var(--mut);}
.ph{object-fit:cover;display:block;}
.lbl{font-size:10pt;font-weight:700;color:var(--acc);letter-spacing:.03em;}
.cap{font-size:9.2pt;line-height:14pt;color:var(--mut);margin-top:7pt;}
.strip{left:42pt;bottom:76pt;font-size:8pt;color:var(--mut);}
.strip b{color:var(--acc);font-size:7pt;letter-spacing:.04em;margin-right:22pt;}
'''

E = lambda s: html.escape(str(s or ''), quote=True)


def build(spec):
    c = spec['company']
    head = ('<div class="a bar"></div><div class="a brand">CARDINAL<small>ROOFING &amp; RENOVATIONS</small></div>'
            '<div class="a ct">%s<br>Contact: %s</div><div class="a foot"></div>'
            '<div class="a fl">%s</div><div class="a fr">%s</div>') % (
        E(c['address']), E(c['contact']), E(spec['footer_left']).upper(), E(spec['footer_right']).upper())
    strip_addr = E(spec['strip'])

    def page(n, body):
        return '<section class="pg">' + head + '<div class="a pn">%02d</div>' % n + body + '</section>'

    def strip(label):
        return '<div class="a strip"><b>%s</b>%s</div>' % (E(label).upper(), strip_addr)

    def photo_block(x, w, h, labelTop, p, small=False):
        b = ''
        if p.get('img'):
            b += '<img class="a ph" src="%s" style="left:%dpt;top:144pt;width:%dpt;height:%dpt;object-position:%s">' % (
                E(p['img']), x, w, h, E(p.get('crop', '50% 50%')))
        top = labelTop if p.get('img') else 144
        lf = 'font-size:9pt' if small else ''
        cf = 'font-size:8.6pt;line-height:12.6pt;margin-top:5pt' if small else ''
        b += '<div class="a" style="left:%dpt;top:%dpt;width:%dpt"><div class="lbl" style="%s">%s</div><div class="cap" style="%s">%s</div></div>' % (
            x, top, w, lf, E(p['label']).upper(), cf, E(p['caption']))
        return b

    pages = []
    cv = spec['cover']
    rows = ''
    y = 248
    for blk in cv['blocks']:   # [{"eyebrow":..,"lines":[big, small, small]}]
        rows += '<div class="a eb" style="left:42pt;top:%dpt">%s</div>' % (y, E(blk['eyebrow']).upper())
        sizes = [(14, 700), (11, 400), (10, 400)]
        yy = y + 14
        for i, line in enumerate(blk['lines']):
            fs, fw = sizes[min(i, 2)] if len(blk['lines']) > 1 else (11, 400)
            rows += '<div class="a" style="left:42pt;top:%dpt;font-size:%dpt;font-weight:%d">%s</div>' % (yy, fs, fw, E(line))
            yy += 20 if i == 0 else 18
        y = yy + 18
    title = '<br>'.join(E(w) for w in cv['title_lines'])
    pages.append(page(1,
        '<div class="a eb" style="left:42pt;top:92pt;color:var(--acc);font-size:8pt">%s</div>' % E(cv['eyebrow']).upper() +
        '<div class="a ser" style="left:42pt;top:108pt;font-size:30pt;line-height:39pt">%s</div>' % title + rows +
        '<img class="a ph" src="%s" style="left:308pt;top:92pt;width:442pt;height:331pt;object-position:%s">' % (
            E(cv['photo']), E(cv.get('crop', '50% 50%'))) +
        '<div class="a eb" style="left:308pt;top:432pt;font-size:7.2pt">%s</div>' % E(cv['photo_label']).upper() +
        '<div class="a" style="left:42pt;top:474pt;width:708pt;font-size:9pt;line-height:14pt;color:var(--mut)">%s</div>' % E(cv['intro'])))

    n = 2
    for pg in spec['pages']:
        b = '<div class="a h ser">%s</div><div class="a sub">%s</div>' % (E(pg['title']), E(pg['subtitle']))
        ph = pg['photos']
        if len(ph) == 3:
            for k, p in enumerate(ph):
                b += photo_block(42 + k * 243, 222, 262, 418, p, small=True)
        else:   # 1 or 2; a photo with no "img" becomes a text panel in its slot
            for k, p in enumerate(ph):
                b += photo_block(42 + k * 364, 344, 258, 416, p)
        pages.append(page(n, b + strip(pg['strip_label'])))
        n += 1

    sm = spec['summary']
    left = ''.join('<div class="lbl" style="margin-top:%s">%s</div><div class="cap" style="font-size:9.6pt;line-height:15pt">%s</div>' % (
        '0' if i == 0 else '18pt', E(f['label']).upper(), E(f['text'])) for i, f in enumerate(sm['findings']))
    recs = ''.join('<li style="margin-bottom:8pt"><b style="color:var(--ink)">%s.</b> %s</li>' % (E(r['title']), E(r['text']))
                   for r in sm['recommendations'])
    pages.append(page(n,
        '<div class="a h ser">Summary &amp; recommendations</div><div class="a sub">What we found, and what we recommend.</div>'
        '<div class="a" style="left:42pt;top:156pt;width:330pt">%s</div>' % left +
        '<div class="a" style="left:420pt;top:156pt;width:330pt;border-left:2pt solid var(--acc);padding-left:18pt">'
        '<div class="lbl">RECOMMENDATIONS</div><ol class="cap" style="font-size:9.6pt;line-height:15pt;padding-left:14pt">%s</ol></div>' % recs +
        strip('Summary')))
    return ('<!DOCTYPE html><html><head><meta charset="utf-8"><title>%s</title><style>%s</style></head><body>%s</body></html>'
            % (E(spec['title']), CSS, ''.join(pages)))


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'report.html'), 'w').write(build(spec))
    print('wrote', os.path.join(out, 'report.html'), '-', len(spec['pages']) + 2, 'pages')
