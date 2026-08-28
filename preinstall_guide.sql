-- Build 1111 — Roof Pre-Install Guide: editable master + auto-email on scheduling.
-- Two tables:
--   company_templates    the editable master body for a company document, keyed by
--                        slug. Admin-editable in-app; the letterhead/style shell and
--                        the autofill live in index.html (cr-guide-script).
--   client_guide_sends   the once-per-job guard + audit trail for a guide that was
--                        emailed to a client (PK project_id,kind), so a reschedule or
--                        a re-book never re-sends the same guide automatically.
-- Applied by hand before the index.html change. Idempotent.

-- ── company_templates ───────────────────────────────────────────────────────
create table if not exists public.company_templates (
  slug        text primary key,
  subject     text,
  html        text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.company_templates enable row level security;

drop policy if exists company_templates_select on public.company_templates;
create policy company_templates_select on public.company_templates
  for select to authenticated using (true);

-- writes are admin-only (mirrors the in-app is_admin() gate)
drop policy if exists company_templates_write on public.company_templates;
create policy company_templates_write on public.company_templates
  for all to authenticated using (public.is_cardinal_admin()) with check (public.is_cardinal_admin());

-- ── client_guide_sends ──────────────────────────────────────────────────────
create table if not exists public.client_guide_sends (
  project_id  uuid not null,
  kind        text not null,
  sent_at     timestamptz not null default now(),
  to_email    text,
  sent_by     text,
  primary key (project_id, kind)
);
alter table public.client_guide_sends enable row level security;

-- any signed-in staff can read the log and record a send (the actual email send is
-- gated server-side by api/senddoc's _staff.js check). No update/delete needed.
drop policy if exists client_guide_sends_select on public.client_guide_sends;
create policy client_guide_sends_select on public.client_guide_sends
  for select to authenticated using (true);
drop policy if exists client_guide_sends_insert on public.client_guide_sends;
create policy client_guide_sends_insert on public.client_guide_sends
  for insert to authenticated with check (true);

-- ── seed the roofing pre-install guide (non-clobbering: only if absent) ──────
insert into public.company_templates (slug, subject, html)
select 'preinstall_roof', 'Your Roof Installation — What to Expect (Cardinal Roofing)', '<div class="chips">
      <div class="chip"><div class="k">Installation Date</div><div class="v"><span class="cr-gtok" data-tok="install_date">your scheduled date</span></div></div>
      <div class="chip"><div class="k">Crew Arrival Window</div><div class="v">6:30 &ndash; 7:00 AM</div></div>
    </div>
    <div class="bd">
      <p class="lead">Great news &mdash; your roof installation is officially scheduled for <span class="cr-gtok" data-tok="install_date">your scheduled date</span>, with our crew planning to arrive between 6:30&ndash;7:00 AM.</p>
      <p>Everything is in place on our end. Your materials will be delivered either the afternoon before or the morning of installation, and our crew will handle the project from start to finish &mdash; including removal of the existing roofing, installation of your new roof system, and a thorough cleanup of your property before we leave. All we ask is that you sit back, relax, and let us take care of the rest.</p>

      <h2>Weather Policy</h2>
      <p>If inclement weather threatens the safety of your project or our crew, we will reach out promptly to discuss rescheduling. We will never open up a roof we cannot safely and properly close the same day. Your home and everyone&rsquo;s safety always come first.</p>

      <h2>What to Expect on Installation Day</h2>
      <p>A dump trailer or debris container will be positioned near your driveway or in the area we discussed, and material may be staged on the ground or loaded directly onto the roof. Our crew works around the full perimeter of your home, so expect ladders, equipment, and steady activity throughout the day. Before we leave, we sweep the property, run magnetic rollers across the driveway, walkways, and lawn areas, and remove all debris from the job site.</p>

      <h2>Six Things to Do Before Installation Day</h2>
      <ol class="steps">
        <li><span class="t">Park vehicles on the street the evening before.</span><p>This keeps your cars well clear of falling debris and gives our crew full access to the driveway and work area for equipment, material, and debris removal.</p></li>
        <li><span class="t">Make sure an exterior outlet is available and powered.</span><p>Our crews run a combination of pneumatic and electric tools and may need to plug into an exterior outlet. If your outdoor outlets are controlled by an indoor switch, tied to a GFCI, or shut off at the breaker, please make sure they are live the morning of installation. Prefer we not use your power? Just let us know and we&rsquo;ll bring a generator instead &mdash; no issue either way.</p></li>
        <li><span class="t">Use your doors carefully throughout the day (call before exiting).</span><p>Our crew works directly above and around the perimeter of your home. Please use a door away from active work when possible, and if you or a pet needs to go outside, call or text one of the contacts below first so we can pause overhead work and clear a safe path.</p>
          <div class="contacts">
            <div class="ctitle">Call or text to clear your safe path</div>
            <div class="crow"><span class="who">On-site crew leader</span><span class="num">introduced on the day</span></div>
            <div class="crow"><span class="who">Project Manager &mdash; Curtis Hoskins</span><span class="num">(937) 576-6753</span></div>
            <div class="crow"><span class="who">Your Sales Rep &mdash; <span class="cr-gtok" data-tok="rep_name">your sales rep</span></span><span class="num"><span class="cr-gtok" data-tok="rep_phone">(937) 576-6753</span></span></div>
          </div>
        </li>
        <li><span class="t">Keep children and pets indoors.</span><p>A construction zone moves quickly and materials can shift without warning. Keeping little ones and pets inside for the day keeps everyone safe and keeps our crew focused on your roof.</p></li>
        <li><span class="t">Remove fragile items from interior walls and cover belongings in the attic or garage.</span><p>Pictures, mirrors, and shelving can vibrate loose during installation, and fine dust can filter down through the decking. A quick walk-through the night before, plus a tarp over anything stored below the roof deck, will save you the cleanup later.</p></li>
        <li><span class="t">Plan for a full day of activity.</span><p>A quality roof installation is not a quiet process &mdash; expect hammering, compressors, and crew movement from morning until the job is complete. If you work from home or have someone on a sleep schedule, you may want to make other arrangements for the day.</p></li>
      </ol>

      <h2>Questions or Special Requests</h2>
      <p>We want this to be as smooth and stress-free as possible for you and your family. If anything comes up before your installation date &mdash; a scheduling conflict, a concern about access, landscaping you want protected, or a special request specific to your property &mdash; please don&rsquo;t hesitate to reach out. It&rsquo;s much easier to plan for something in advance than to work around it on install day.</p>
      <p class="sign">Thank you for trusting us with your home. We look forward to serving you and delivering a finished product you&rsquo;re proud of.<br><br><b>Cardinal Roofing &amp; Renovations</b></p>
    </div>'
where not exists (select 1 from public.company_templates where slug = 'preinstall_roof');
