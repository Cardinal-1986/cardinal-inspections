import re, sys
from pypdf import PdfReader

def tokens(data):
    # crude but sufficient PDF content-stream tokenizer
    i, n = 0, len(data)
    while i < n:
        c = data[i:i+1]
        if c in b' \t\r\n': i += 1; continue
        if c == b'(':                      # literal string
            j, depth, out = i+1, 1, bytearray()
            while j < n and depth:
                ch = data[j:j+1]
                if ch == b'\\':
                    m = re.match(rb'[0-7]{1,3}', data[j+1:j+4])
                    if m:                      # OCTAL escape: \225 is one byte,
                        out.append(int(m.group(), 8) & 0xFF)   # not the text "225"
                        j += 1 + m.end(); continue
                    esc = {b'n': b'\n', b'r': b'\r', b't': b'\t',
                           b'b': b'\b', b'f': b'\f'}.get(data[j+1:j+2])
                    out += esc if esc else data[j+1:j+2]
                    j += 2; continue
                if ch == b'(': depth += 1
                elif ch == b')':
                    depth -= 1
                    if not depth: break
                out += ch; j += 1
            yield ('str', bytes(out)); i = j+1; continue
        if c == b'<' and data[i:i+2] != b'<<':
            j = data.index(b'>', i)
            yield ('str', bytes.fromhex(data[i+1:j].decode('ascii','ignore').replace('\n','').replace(' ','')))
            i = j+1; continue
        if data[i:i+2] == b'<<': yield ('op','<<'); i += 2; continue
        if data[i:i+2] == b'>>': yield ('op','>>'); i += 2; continue
        if c in b'[]': yield ('op', c.decode()); i += 1; continue
        m = re.match(rb'[-+]?[0-9]*\.?[0-9]+', data[i:])
        if m: yield ('num', float(m.group())); i += m.end(); continue
        m = re.match(rb'[^\s\[\]<>()/]+|/[^\s\[\]<>()/]*', data[i:])
        if m: yield ('op', m.group().decode('latin-1')); i += m.end(); continue
        i += 1

def page_items(page):
    data = page.get_contents().get_data()
    tm = [1,0,0,1,0,0]; tlm = tm[:]
    stack, out, leading = [], [], 0
    def mul(a,b):
        return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
                a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
                a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]
    for kind, val in tokens(data):
        if kind in ('num','str'): stack.append(val); continue
        op = val
        if op == 'BT': tm = [1,0,0,1,0,0]; tlm = tm[:]
        elif op == 'Tm' and len(stack) >= 6:
            tm = [float(x) for x in stack[-6:]]; tlm = tm[:]
        elif op == 'TL' and stack: leading = float(stack[-1])
        elif op in ('Td','TD') and len(stack) >= 2:
            if op == 'TD': leading = -float(stack[-1])
            tlm = mul([1,0,0,1,float(stack[-2]),float(stack[-1])], tlm); tm = tlm[:]
        elif op == 'T*':
            tlm = mul([1,0,0,1,0,-leading], tlm); tm = tlm[:]
        elif op in ('Tj','TJ',"'",'"'):
            if op == "'":
                tlm = mul([1,0,0,1,0,-leading], tlm); tm = tlm[:]
            parts = [s for s in stack if isinstance(s, bytes)]
            s = b''.join(parts)
            if s: out.append((round(tm[4],1), round(tm[5],1), s))
        if op not in ('<<','>>','[',']'): stack = []
    return out

if __name__ == '__main__':
    r = PdfReader(sys.argv[1])
    it = page_items(r.pages[int(sys.argv[2])-1])
    print("text ops:", len(it))
    for x,y,s in it[:15]:
        print(f"  x={x:8.1f} y={y:7.1f}  {s[:40]!r}")
