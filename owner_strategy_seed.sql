-- Build 1113 — seed the owner Strategy docs into company_templates (table exists,
-- build 1111). Non-clobbering: seed a slug only if absent, so a re-run never
-- overwrites edits Theo has made in the Owner Console. Admin-editable in-app.
insert into public.company_templates (slug, subject, html)
select 'owner_biz_plan', 'Business Plan — the recurring-revenue play',
'<p><b>The play.</b> Roofing revenue is lumpy — storm-driven, seasonal, one-and-done. Build income that <b>recurs</b>. Research says that lane is nearly empty in Dayton, so it is both the growth move and a differentiator.</p>
<p><b>Engine A — Cardinal Care membership.</b> For an annual or monthly fee: a yearly roof + gutter + exterior inspection with a photographed condition report (a byproduct of work you already do), gutter cleaning, priority scheduling, a members'' repair rate, and first inspection after any storm (which positions you to file the claim). <b>Hook:</b> free for 2 years with every new roof, then convert to paid (~$150–300/yr). Needs a membership record + renewal reminders + billing (Stripe already exists).</p>
<p><b>Engine B — Retail financing.</b> Monthly-payment on retail roofs / siding / windows and on deductibles + upgrades. Partner with a contractor lender (GreenSky, Hearth, Service Finance). Add a monthly-payment line to the estimate and train reps to lead with it. Mostly a partnership — a fast win.</p>
<p><b>Flywheel.</b> Membership &rarr; annual visits &rarr; catch damage early &rarr; claims &amp; repairs &rarr; re-roof &rarr; a new member. Financing &rarr; more retail closes &rarr; a bigger base to sell Care into.</p>
<p><b>First 90 days.</b> Pick a lender + add monthly-payment to the retail estimate; design Cardinal Care v1 (one tier + the free-2-years hook); build the membership record + renewals; offer at every closeout; track members, MRR, renewal rate and claims per member.</p>'
where not exists (select 1 from public.company_templates where slug = 'owner_biz_plan');

insert into public.company_templates (slug, subject, html)
select 'owner_competitors', 'Market & Competitors — Miami Valley',
'<p><b>Two facts that matter most.</b> (1) You are Owens Corning <b>&ldquo;Preferred&rdquo;</b>, but DryTech, Bone Dry, Mr. Roof and Mighty Dog hold OC <b>&ldquo;Platinum&rdquo; Preferred</b> — the tier above. (2) Only DryTech markets a customer app, and <b>nobody</b> markets transparent insurance-claim tracking — the exact thing you have already built.</p>
<p><b>Top threats.</b> Bone Dry (triple-certified, thousands of reviews, whole-envelope divisions) · DryTech (same turf, same brand one tier up, already tech-forward) · Mr. Roof (proprietary transferable lifetime warranty) · Thrush &amp; Son (66-year local trust) · the insurance specialists Bearded / RAFTRx / Dayton Roofing Solutions (Haag inspectors + on-staff adjusters).</p>
<p><b>White space to own.</b> Customer-facing tech + claim transparency · &ldquo;see it before you buy&rdquo; (OC color + AI visualizer at the table) · community / Habitat as a brand pillar · a maintenance membership · a headline transferable workmanship warranty.</p>
<p><b>Top moves.</b> Climb to OC Platinum · turn the CRM into a homeowner claim portal · automate the Google-review ask at job close · make the Habitat story a visible brand pillar · publish a lifetime workmanship warranty.</p>
<p class="ow-strat-note">Competitor review counts and certifications were gathered from aggregators (BBB, Angi, directories) and drift over time — re-verify before quoting any number externally. The full sourced brief is the Strategy Brief document.</p>'
where not exists (select 1 from public.company_templates where slug = 'owner_competitors');
