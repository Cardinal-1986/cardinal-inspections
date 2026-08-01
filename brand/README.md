# Company letterhead

`Cardinal_Letterhead.docx` — the editable letterhead. Open it in Word, Google Docs
or Pages, type the letter into the bracketed placeholders, delete any you don't
need. The closing block is already set to **Sincerely, / Theodore W. Dorion /
Owner**.

`Cardinal_Letterhead.pdf` — the same file rendered, for viewing on a phone or
printing blank sheets.

## What's on it

| | |
|---|---|
| Logo | the same artwork the app embeds in estimates, contracts and invoices |
| Address | 5735 Webster Street, Dayton, OH 45414 |
| Phone | 937.576.6753 |
| Admin@cardinalrenovations.net · www.cardinalrenovations.net |
| Footer | contact strip, matching the one `api/share.js` prints on shared documents |

Page 1 carries the full letterhead. A letter that runs onto page 2 gets a slim
continuation header — company name and page number — instead of the logo.

**None of these values were typed from memory.** They were read out of shipped
code: the logo from the `cover-logo` data URI in `index.html`, the address and
email from `api/estimate-to-contract.js` and the print footer in `api/share.js`.
If any of them change, they need changing in those places too — this folder is
not the source of truth for them.

## Not deployed

`brand/` is listed in `.vercelignore`, so it is not served at
app.cardinalroster.com. A blank letterhead is the raw material for forged
correspondence; there's no reason for it to be a public download.

## Rebuilding it

Only needed if the address, phone or email changes.

```bash
npm install docx
node letterhead.js Cardinal_Letterhead.docx
python3 fix_field.py Cardinal_Letterhead.docx      # required — see below
soffice --headless --convert-to pdf Cardinal_Letterhead.docx
```

`fix_field.py` is not optional. docx-js writes the page-number field as
begin/instrText/separate/end inside a *single* `<w:r>` with no result run, so
Word and LibreOffice both regenerate the number with default formatting — the
8.5pt grey "Page 2" renders large and black. The script rewrites it as five
properly-structured runs that each carry the original formatting.

`cardinal_doc_logo.png` (1100×647) is the logo extracted from `index.html`, kept
here so the rebuild doesn't have to re-parse a 3 MB file.

Verified by rendering the actual `.docx` through LibreOffice and looking at it,
including a forced two-page run to check the continuation header. Schema
validation passes.
