#!/usr/bin/env python3
"""The roofing Construction Agreement, in the app's own document idiom.

Faithful to docs/Cardinal_Roofing_Contract.pdf page 1 — every numbered section
and every lettered sub-option. Theo picked option 3: full fidelity, except the
three lines the inspection already answered arrive filled.

TWO THINGS DELIBERATELY NOT REPRODUCED, and this is a legal call, not a
shortcut:

  * THE TERMS AND CONDITIONS (master page 3)
  * THE TWO 3-DAY NOTICE OF CANCELLATION COPIES (master pages 4-5)

Those are statutory (ORC 1345.23) and pre-existing legal text. Retyping them
into an HTML template invites a silent divergence between what the app prints
and what the reviewed master says, and nobody in this loop is a lawyer. The
agreement instead REFERENCES them the way the paper form does, and they stay
the printed master in Company Documents. This is the project's standing
contract doctrine, not a decision made here.

MARKUP CONVENTIONS, copied from the existing templates rather than invented:
  <span class="ph">[LABEL]</span>   a highlighted blank; prefillClientInfo()
                                    swaps it for <span class="fill">value</span>
  id="estTotal"                     the one total the iframe editor recomputes
  <span class="opts" data-opts="k"> a lettered option row that COLLAPSES to a
                                    filled value when the inspection knows it
"""

# ── the option rows that collapse when the inspection already answered ──────
OPTS = {
    'decking': 'A. OSB &nbsp; B. Plywood &nbsp; C. T&amp;G &nbsp; '
               'D. Plank Board &nbsp; E. Spaced Decking &nbsp; F. Cedar Shake',
    'layers': 'Number / type of existing layers',
    'pitch': 'Roof pitch',
}


def opts(key, text=None):
    """A lettered option row, tagged so prefill can collapse it."""
    return ('<span class="opts" data-opts="' + key + '">'
            + (text if text is not None else OPTS[key]) + '</span>')


def ph(label):
    return '<span class="ph">[' + label + ']</span>'


def row(k, v):
    return '<tr><td class="k">' + k + '</td><td>' + v + '</td></tr>'


BODY = """
<h2 class="sec">Customer Information</h2>
<table class="meta">
""" + '\n'.join([
    row('Date', ph('Date')),
    row('Buyer', ph('BUYER')),
    row('Co-buyer', ph('CO-BUYER')),
    row('Email', ph('EMAIL')),
    row('Phone', ph('PHONE NUMBER')),
    row('Street', ph('STREET')),
    row('City / State / ZIP', ph('CITY') + ' &nbsp; ' + ph('STATE') + ' &nbsp; ' + ph('ZIP')),
    row('Primary residence', '<b>Yes</b> &nbsp;/&nbsp; <b>No</b> &nbsp; ' + ph('circle one')),
]) + """
</table>

<p style="font-size:10pt;">Buyer(s) hereby jointly and severally agrees to purchase the products
and/or services of Cardinal Roofing &amp; Renovations, LLC (&#8220;Contractor&#8221;) as listed herein,
in accordance with the terms and conditions described in this Agreement, the accompanying
<b>Terms and Conditions</b> form, and any accompanying specification sheet(s).</p>

<h2 class="sec">Project Specifications</h2>
<table class="meta">
""" + '\n'.join([
    row('1. Decking',
        'A. Remove existing roofing layers to roof deck<br>'
        'B. Inspect roof deck &amp; replace wood as needed &#8212; $' + ph('rate') + ' per sheet'),
    row('&nbsp;&nbsp;&nbsp;Decking type', opts('decking')),
    row('2. Roof deck protection',
        'A. Felt underlayment 15&nbsp;lb &nbsp; B. Felt underlayment 30&nbsp;lb &nbsp; '
        'C. Synthetic underlayment &nbsp; ' + ph('circle one')),
    row('3. Drip edge / gutter apron',
        'A. Drip edge colour ' + ph('colour') + ' (rakes)<br>'
        'B. Gutter apron colour ' + ph('colour') + ' (eaves)'),
    row('4. Ice &amp; water barrier',
        'Install along eaves, valleys &amp; flashings &#8212; A. Standard &nbsp; B. OC &nbsp; '
        + ph('circle one')),
    row('5. Valley metal', 'A. Colour ' + ph('colour')),
    row('6. Starter shingles',
        'Install along all rakes &amp; eaves &#8212; A. Standard &nbsp; B. OC Starter Plus &nbsp; '
        + ph('circle one')),
    row('7. Shingles <span style="font-weight:400;font-size:9pt;">(per manufacturer specs)</span>',
        'A. Style ' + ph('style') + '<br>B. Colour ' + ph('colour') + '<br>C. Brand '
        + ph('brand')),
    row('8. Flashing',
        'A. Chimney &nbsp; B. Wall &nbsp; C. Step &nbsp; ' + ph('circle all that apply') +
        '<br>Extra structure: A. Garage &nbsp; B. Shed &nbsp; C. Barn &nbsp; ' + ph('if any')),
    row('9. Extrusions', 'A. Pipe boots ' + ph('qty') + ' &nbsp; B. Skylights ' + ph('qty')),
    row('10. Ventilation',
        'A. Shingle-over ridge vent &#8212; 1. Standard &nbsp; 2. OC<br>'
        'B. Box / turtle vents ' + ph('qty') + ' &nbsp; C. Power vent ' + ph('qty') +
        ' &nbsp; D. Turbine ' + ph('qty') +
        '<br><span style="font-size:9pt;color:#666;">Not responsible for re-attachment of '
        'satellite or HVAC.</span>'),
    row('11. Ridge cap / hip cap',
        'A. Standard &nbsp; B. OC &#8212; 1. Pro Edge &nbsp; 2. Decoridge &nbsp; '
        + ph('circle one')),
    row('12. Existing layers', opts('layers')),
    row('13. Roof pitch', opts('pitch')),
]) + """
</table>

<h2 class="sec">Warranty System</h2>
<table class="meta">
""" + '\n'.join([
    row('Standard', '25-yr manufacturer &nbsp;&#183;&nbsp; 5-yr workmanship'),
    row('Systems Protection',
        '25-yr mfr. &nbsp;&#183;&nbsp; 10-yr workmanship &nbsp;&#183;&nbsp; Owens Corning '
        '&nbsp;&#183;&nbsp; transferable'),
    row('Preferred Protection',
        '50-yr mfr. &nbsp;&#183;&nbsp; 10-yr workmanship &nbsp;&#183;&nbsp; Owens Corning '
        '&nbsp;&#183;&nbsp; transferable'),
    row('Selected', ph('circle one')),
]) + """
</table>

<h2 class="sec">HOA / Authorization</h2>
<p style="font-size:10.5pt;">HOA approval required: <b>Yes</b> &nbsp;/&nbsp; <b>No</b> &nbsp; """ + ph('circle one') + """<br>
Buyer to obtain required authorization from the HOA and authorities. &nbsp;&nbsp;
Initials """ + ph('__') + """</p>

<h2 class="sec">Project Timeline</h2>
<p style="font-size:10.5pt;">The anticipated start date is """ + ph('n') + """ weeks from the date on
which all HOA permissions, permits and other contingencies necessary to complete the project are
obtained, and the anticipated completion date is """ + ph('n') + """ weeks from the actual start date.</p>

<h2 class="sec">Notes &amp; Insurance Claim</h2>
<table class="meta">
""" + '\n'.join([
    row('Notes', '<div class="descbox">' + ph('notes') + '</div>'),
    row('Insurance co.', ph('INSURANCE CO.')),
    row('Claim #', ph('CLAIM #')),
]) + """
</table>
<p style="font-size:10pt;">Buyer(s) acknowledges that Contractor is due any and all monies received
from any insurance company pursuant to an insurance claim, including overhead and profit, approved
cost increases, and approved claim supplements. &nbsp;&nbsp; Initials """ + ph('__') + """</p>

<h2 class="sec">Payment Structure</h2>
<table class="items">
  <thead><tr><th>Payment</th><th>Due</th><th class="price">Amount</th></tr></thead>
  <tbody>
    <tr><td>Down payment</td><td>Upon signing this Agreement</td>
        <td class="price"><span class="ph">[0.00]</span></td></tr>
    <tr><td>Balance due on completion</td><td>Upon substantial completion</td>
        <td class="price"><span class="ph">[0.00]</span></td></tr>
  </tbody>
  <tfoot><tr><td colspan="2" style="text-align:right;font-weight:800;">CONTRACT PRICE</td>
    <td class="price" style="font-weight:800;" id="estTotal">
      <span class="ph" data-cprice="1">[0.00]</span></td></tr></tfoot>
</table>
<p style="font-size:10.5pt;">Cash on completion &nbsp;or&nbsp; financed: $""" + ph('0.00') + """
per month for """ + ph('n') + """ months.</p>

<h2 class="sec">Acknowledgement &amp; Right to Cancel</h2>
<p style="font-size:10pt;">Buyer(s) hereby acknowledges that Buyer(s) has read this Agreement and
the accompanying Terms and Conditions, understands the terms of this Agreement, has received a
completed, signed and dated copy of this Agreement on the date first written above, and was orally
advised of his/her right to cancel this transaction.</p>
<p style="font-size:10pt;"><b>You, the buyer, may cancel this transaction at any time prior to
midnight of the third business day after the date of this transaction.</b> See the two attached
<i>Notice of Cancellation</i> copies for an explanation of that right.</p>
<p style="font-size:9.5pt;color:#666;">The Terms and Conditions and both Notice of Cancellation
copies are the printed master &#8212; <b>&#9776; Menu &#8594; Company Documents &#8594; Roofing
&#8594; Construction Agreement (Master)</b>. They are reproduced there verbatim and are not
retyped here.</p>

<table class="meta" style="margin-top:14px;">
""" + '\n'.join([
    row('Buyer signature', ph('sign') + ' &nbsp;&nbsp; Date ' + ph('date')),
    row('Co-buyer signature', ph('sign') + ' &nbsp;&nbsp; Date ' + ph('date')),
    row('Contractor representative', ph('Rep name &amp; title')),
    row('Contractor signature', ph('sign') + ' &nbsp;&nbsp; Date ' + ph('date')),
]) + """
</table>
"""

if __name__ == '__main__':
    print(BODY)
