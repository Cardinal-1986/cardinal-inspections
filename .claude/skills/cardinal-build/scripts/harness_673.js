/* Build 673 — a stored PDF opens as a PDF, not as page one.

   Theo uploaded Hover's 31-page report for the Gunn job on his phone and got
   the cover page back. The upload was fine — proved in the database first:
   3,054,656 bytes decoded, 31 `/Type /Page` objects, `/Count 31`, ends %%EOF.
   The viewer was embedding a data: PDF in an <iframe>, which iOS renders as a
   single non-scrolling page.

   This runs in CHROMIUM, not jsdom, because the thing under test is
   URL.createObjectURL + Blob + atob — jsdom does not implement
   createObjectURL, so a jsdom "pass" here would be meaningless.

   Usage: node harness_673.js [index.html]
   Point it at build 672 as the negative control — must go red.              */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const IDX = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/index.html');
const SRC = fs.readFileSync(IDX, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(src, name) {
  let i = src.indexOf('async function ' + name + '(');
  if (i < 0) i = src.indexOf('function ' + name + '(');
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') { d++; started = true; }
    else if (src[j] === '}') { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  return null;
}

(async function () {

const helper = fnText(SRC, 'openStoredFile');
if (!helper) {
  console.log('  ✗ openStoredFile() is not in ' + IDX + ' — this artifact predates 673.');
  console.log('\nRESULT: FAIL  (0 passed, 1 failed)');
  process.exit(1);
}

console.log('\n── the iframe is gone, everywhere ──');
{
  ok('no data: PDF is embedded in an iframe anywhere in the file',
    !/iframe src="' \+ d\.data/.test(SRC) && !/<iframe src="' \+ [a-z]+\.data/.test(SRC));
  ok('the measurement viewer routes through the shared opener',
    /measDb\.get\(row\.getAttribute\('data-msopen'\)\)\.then\(function\(d\)\{\s*\n\s*openStoredFile\(d\.data/.test(SRC));
  ok('openJobFile routes through it too — one decoder, not two',
    /openStoredFile\(meta\.data, meta\.mime/.test(SRC));
  ok('…and the old inline decoder is gone from openJobFile',
    (SRC.match(/for\(var i = 0; i < bin\.length; i\+\+\) arr\[i\] = bin\.charCodeAt\(i\);/g) || []).length === 1,
    (SRC.match(/for\(var i = 0; i < bin\.length; i\+\+\) arr\[i\] = bin\.charCodeAt\(i\);/g) || []).length);
}

console.log('\n── the tab opens INSIDE the tap (iOS blocks a popup after an await) ──');
{
  /* both call sites must open the tab BEFORE their await, then navigate it */
  const ms = SRC.slice(SRC.indexOf("var row = e.target.closest('[data-msopen]')"),
                       SRC.indexOf("var row = e.target.closest('[data-msopen]')") + 700);
  ok('the measurement viewer opens its tab before measDb.get()',
    ms.indexOf("window.open('', '_blank')") > -1 &&
    ms.indexOf("window.open('', '_blank')") < ms.indexOf('measDb.get('), ms.slice(0, 160));
  const jf = fnText(SRC, 'openJobFile');
  ok('openJobFile opens its tab before db.get()',
    jf && jf.indexOf("window.open('', '_blank')") > -1 &&
    jf.indexOf("window.open('', '_blank')") < jf.indexOf('await db.get('));
  ok('both close the tab when the fetch fails, rather than leaving it blank',
    (SRC.match(/if\(tab && !tab\.closed\) tab\.close\(\);/g) || []).length >= 2,
    (SRC.match(/if\(tab && !tab\.closed\) tab\.close\(\);/g) || []).length);
}

console.log('\n── EXECUTED in Chromium: the whole file goes over, as a PDF ──');
{
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await br.newPage();
  await p.setContent('<!doctype html><body></body>');

  const r = await p.evaluate(({ helperSrc }) => {
    const errors = [];
    const shown = [];
    // eslint-disable-next-line no-new-func
    const openStoredFile = new Function('showError', 'window',
      helperSrc + '\nreturn openStoredFile;')(
        m => errors.push(m), window);

    /* a REAL, minimal, 3-page PDF — the property under test is that every byte
       of a multi-page document reaches the blob, not just the first page */
    function makePdf(pages) {
      let objs = [], kids = [];
      for (let i = 0; i < pages; i++) {
        const id = 4 + i * 2;
        kids.push(id + ' 0 R');
        objs.push(id + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
          '/Contents ' + (id + 1) + ' 0 R >>\nendobj\n');
        const stream = 'BT /F1 24 Tf 72 700 Td (Page ' + (i + 1) + ') Tj ET';
        objs.push((id + 1) + ' 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n');
      }
      return '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
        '2 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages + ' >>\nendobj\n' +
        objs.join('') + 'trailer\n<< /Root 1 0 R >>\n%%EOF\n';
    }
    const pdf = makePdf(31);
    const b64 = btoa(pdf);
    const dataUrl = 'data:application/pdf;base64,' + b64;

    /* capture what the tab is pointed at */
    const tab = { closed: false, location: null, close() { this.closed = true; } };
    const madeUrls = [];
    const realCreate = URL.createObjectURL.bind(URL);
    const blobs = [];
    URL.createObjectURL = (b) => { blobs.push(b); const u = realCreate(b); madeUrls.push(u); return u; };

    const returned = openStoredFile(dataUrl, null, tab, 'report');

    return {
      returned,
      errors,
      tabLocation: String(tab.location || ''),
      tabClosed: tab.closed,
      usedBlobUrl: /^blob:/.test(String(tab.location || '')),
      blobType: blobs.length ? blobs[0].type : null,
      blobSize: blobs.length ? blobs[0].size : null,
      pdfSize: pdf.length,
      declaredPages: (pdf.match(/\/Count 31/) || []).length,
      pageObjects: (pdf.match(/\/Type \/Page[^s]/g) || []).length
    };
  }, { helperSrc: helper });

  ok('the helper reports success', r.returned === true, JSON.stringify(r.errors));
  ok('the tab is pointed at a BLOB url, never a data: url, never an iframe',
    r.usedBlobUrl === true && !/^data:/.test(r.tabLocation), r.tabLocation.slice(0, 40));
  ok('the tab is NOT closed on success', r.tabClosed === false);
  ok('the blob is typed application/pdf, taken from the data: prefix when the caller names none',
    r.blobType === 'application/pdf', r.blobType);
  ok('EVERY byte of the 31-page document reaches the blob — not the first page',
    r.blobSize === r.pdfSize, r.blobSize + ' of ' + r.pdfSize);
  ok('…and the fixture really was 31 pages, so that assertion means something',
    r.pageObjects === 31 && r.declaredPages === 1, r.pageObjects);

  /* an explicit mime from the caller still wins, and a broken payload is
     reported rather than leaving an empty tab open */
  const r2 = await p.evaluate(({ helperSrc }) => {
    const errors = [];
    const openStoredFile = new Function('showError', 'window',
      helperSrc + '\nreturn openStoredFile;')(m => errors.push(m), window);
    const t1 = { closed: false, location: null, close() { this.closed = true; } };
    const blobs = [];
    const realCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { blobs.push(b); return realCreate(b); };
    openStoredFile('data:application/pdf;base64,' + btoa('%PDF-1.4\nx'), 'image/png', t1, 'x');
    const t2 = { closed: false, location: null, close() { this.closed = true; } };
    const returned2 = openStoredFile('data:application/pdf;base64,!!!not base64!!!', null, t2, 'that report');
    return { explicitMime: blobs[0] && blobs[0].type, t2Closed: t2.closed,
             returned2, errors };
  }, { helperSrc: helper });

  ok('an explicit mime from the caller overrides the data: prefix',
    r2.explicitMime === 'image/png', r2.explicitMime);
  ok('an undecodable payload returns false and CLOSES the tab, not leaving a blank one',
    r2.returned2 === false && r2.t2Closed === true);
  ok('…and says which thing failed, in the caller\'s words',
    r2.errors.some(m => /that report/.test(m)), JSON.stringify(r2.errors));

  await br.close();
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 673 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 673; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:673,/.test(SRC));
  ok('…and says plainly that the upload was never the problem',
    /The upload was never the problem/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
