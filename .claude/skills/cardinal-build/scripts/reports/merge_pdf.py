import re,sys
def load(path):
    d=open(path,'rb').read()
    sx=int(re.findall(rb'startxref\s+(\d+)',d)[-1])
    objs={}; pos=sx
    # follow classic xref sections (incl. /Prev)
    trailer=None
    while pos is not None:
        m=re.compile(rb'xref\s*').match(d,pos); assert m,'not classic xref'
        p=m.end()
        while True:
            h=re.compile(rb'(\d+)\s+(\d+)\s*\r?\n').match(d,p)
            if not h: break
            start,cnt=int(h.group(1)),int(h.group(2)); p=h.end()
            for k in range(cnt):
                ent=d[p:p+20]; p+=20
                off,gen,typ=int(ent[:10]),int(ent[11:16]),ent[17:18]
                if typ==b'n' and (start+k) not in objs: objs[start+k]=off
        t=re.compile(rb'\s*trailer\s*<<(.*?)>>\s*startxref',re.S).match(d,p)
        tr=t.group(1)
        if trailer is None: trailer=tr
        pv=re.search(rb'/Prev\s+(\d+)',tr); pos=int(pv.group(1)) if pv else None
    bodies={}
    for n,off in objs.items():
        m=re.compile(rb'\s*(\d+)\s+(\d+)\s+obj').match(d,off); assert m and int(m.group(1))==n,(path,n)
        e=d.find(b'endobj',m.end()); bodies[n]=d[m.end():e]
    root=int(re.search(rb'/Root\s+(\d+)\s+\d+\s+R',trailer).group(1))
    return bodies,root
def split(b):
    i=b.find(b'stream')
    if i<0: return b,b''
    return b[:i],b[i:]
def refs(b): return [int(x) for x in re.findall(rb'(\d+)\s+0\s+R',split(b)[0])]
def pages(bodies,n):
    b=split(bodies[n])[0]
    if re.search(rb'/Type\s*/Pages',b):
        kids=re.search(rb'/Kids\s*\[(.*?)\]',b,re.S).group(1)
        out=[]
        for k in re.findall(rb'(\d+)\s+0\s+R',kids): out+=pages(bodies,int(k))
        return out
    return [n]
def renum(b,off):
    h,s=split(b)
    h=re.sub(rb'(\d+)(\s+)0(\s+)R',lambda m:b'%d%s0%sR'%(int(m.group(1))+off,m.group(2),m.group(3)),h)
    return h+s
files=sys.argv[2:]; out={}; allpages=[]; off=0
for f in files:
    bodies,root=load(f)
    pr=int(re.search(rb'/Pages\s+(\d+)\s+0\s+R',split(bodies[root])[0]).group(1))
    pg=pages(bodies,pr)
    for p in pg:
        h=split(bodies[p])[0]
        assert re.search(rb'/MediaBox',h) or re.search(rb'/MediaBox',split(bodies[pr])[0]),'mediabox'
    # inherit MediaBox/Resources from root Pages node if page lacks it
    prh=split(bodies[pr])[0]
    for key in (rb'/MediaBox',rb'/Resources'):
        mm=re.search(key+rb'\s*(\[[^\]]*\]|\d+\s+0\s+R)',prh)
        if mm:
            for p in pg:
                h,s=split(bodies[p])
                if key not in h:
                    i=h.rfind(b'>>'); bodies[p]=h[:i]+key+b' '+mm.group(1)+b'\n'+h[i:]+s
    for n,b in bodies.items(): out[n+off]=renum(b,off)
    allpages+=[p+off for p in pg]
    off+=max(bodies)+1
P=off; C=off+1
for p in allpages:
    h,s=split(out[p]); h=re.sub(rb'/Parent\s+\d+\s+0\s+R',b'/Parent %d 0 R'%P,h); out[p]=h+s
out[P]=b'\n<< /Type /Pages /Count %d /Kids [ %s ] >>\n'%(len(allpages),b' '.join(b'%d 0 R'%p for p in allpages))
out[C]=b'\n<< /Type /Catalog /Pages %d 0 R >>\n'%P
buf=bytearray(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n'); xr={}
for n in sorted(out):
    xr[n]=len(buf); buf+=b'%d 0 obj'%n+out[n]+b'endobj\n'
sx=len(buf); N=max(out)+1
buf+=b'xref\n0 %d\n0000000000 65535 f \n'%N
for n in range(1,N): buf+=(b'%010d 00000 n \n'%xr[n]) if n in xr else b'0000000000 65535 f \n'
buf+=b'trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n'%(N,C,sx)
open(sys.argv[1],'wb').write(buf); print('pages',len(allpages))
