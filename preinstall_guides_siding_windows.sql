-- Build 1112 — seed the Siding and Windows Pre-Install Guides into company_templates.
-- Tables already exist (preinstall_guide.sql, build 1111). Non-clobbering: seed a
-- slug only if absent, so a re-run never overwrites a rate Theo has since edited.

insert into public.company_templates (slug, subject, html)
select 'preinstall_siding', 'Your Siding Installation — What to Expect (Cardinal Roofing)', '<div class="chips">
      <div class="chip"><div class="k">Installation Date</div><div class="v"><span class="cr-gtok" data-tok="install_date">your scheduled date</span></div></div>
      <div class="chip"><div class="k">Crew Arrival Window</div><div class="v">7:00 &ndash; 7:30 AM</div></div>
    </div>
    <div class="bd">
      <p class="lead">Great news &mdash; your siding installation is officially scheduled for <span class="cr-gtok" data-tok="install_date">your scheduled date</span>, and our crew is ready to transform the exterior of your home. We plan to arrive between 7:00&ndash;7:30 AM.</p>
      <p>Everything is in place on our end. Your siding panels, trim coil, weather barrier, and custom accessories will be delivered either the afternoon before or the morning of installation. Siding projects often take multiple days &mdash; and our crew cleans up your job site every single day before leaving, ensuring all tools are organized, grounds are swept, and pathways are safe. All we ask is that you sit back, relax, and let us take care of the rest.</p>

      <h2>Yard Sign &amp; Property Identification</h2>
      <p>A few days prior to your install date, you will notice a Cardinal yard sign placed on your front lawn. In addition to letting your neighbors know quality work is underway, this sign serves a vital operational purpose: it acts as our crew&rsquo;s visual beacon so material delivery drivers and tear-off crews verify the exact address and never begin tearing siding off the wrong home. <b>Please leave the sign in place until your siding project is fully completed.</b></p>

      <h2>Weather Policy</h2>
      <p>Siding installation requires dry conditions and safe wind levels so weather-resistive housewrap and siding panels are hung with precision. If high winds or steady rain threaten our crew&rsquo;s safety or the integrity of exposed walls, we will reach out promptly to discuss scheduling. We will never leave wall sections unprotected or exposed to open weather. Your home and everyone&rsquo;s safety always come first.</p>

      <h2>What to Expect on Installation Day &amp; Daily Cleanup</h2>
      <p>A debris trailer or container will be positioned in your driveway or designated work zone. Siding installation involves setting up scaffolding, aluminum pump jacks, ladders, and metal cutting brake tables directly along the exterior walls, so you will see steady crew movement around the entire perimeter of your home.</p>
      <p><b>Daily job-site cleanup:</b> because siding projects take multiple days, our crew performs a comprehensive cleanup at the end of every workday &mdash; we sweep all walkways, run magnetic rollers around the foundation and driveway to capture stray nails, organize equipment, and make sure your doors and gates are safe and accessible each evening.</p>

      <h2>Six Things to Do Before Installation Day</h2>
      <ol class="steps">
        <li><span class="t">Clear a 5-to-10 foot perimeter around your home.</span><p>Our crews need direct access to all exterior walls for ladders and scaffolding. Please move patio furniture, grills, planters, garden hoses, solar lights, and lawn decor away from the foundation walls before our arrival.</p></li>
        <li><span class="t">Park vehicles on the street the evening before.</span><p>Moving cars into the street gives our trucks full access to stage siding boxes, trim coil, and brake tables, while keeping your vehicles well clear of moving ladders, scaffolding, and falling debris.</p></li>
        <li><span class="t">Exiting the home or letting pets out? Call us first.</span><p>Our crew works directly against every wall, doorframe, and window opening. If you need to leave the house, or a pet needs to go out, please call or text one of the contacts below before opening exterior doors &mdash; we will immediately pause work and clear a safe, unobstructed path for you and your pets.</p>
          <div class="contacts">
            <div class="ctitle">Call or text to clear your safe path</div>
            <div class="crow"><span class="who">On-site crew leader</span><span class="num">introduced on the day</span></div>
            <div class="crow"><span class="who">Project Manager &mdash; Curtis Hoskins</span><span class="num">(937) 576-6753</span></div>
            <div class="crow"><span class="who">Your Sales Rep &mdash; <span class="cr-gtok" data-tok="rep_name">your sales rep</span></span><span class="num"><span class="cr-gtok" data-tok="rep_phone">(937) 576-6753</span></span></div>
          </div>
        </li>
        <li><span class="t">Secure wall hangings, mirrors, and interior decor.</span><p>Tearing off old siding and fastening new siding creates rhythmic vibrations directly through your exterior wall studs. Please take down mirrors, framed pictures, clocks, and delicate shelving on exterior-facing walls the night before to prevent anything from vibrating loose.</p></li>
        <li><span class="t">Trim back foundation shrubs &amp; flag underground utilities.</span><p>If you have bushes or branches growing tight against exterior walls, a quick trim beforehand helps our installers achieve seamless siding alignment. Also, please point out any underground sprinkler heads, invisible fence lines, or buried utilities so we can protect them throughout the project.</p></li>
        <li><span class="t">Ensure exterior power is live (or request a generator).</span><p>Our installers use power shears, miter saws, and compressors. Please make sure outdoor outlets and their indoor switches/breakers are live. If you prefer we bring a portable generator instead, just let us know in advance &mdash; no problem at all.</p></li>
      </ol>

      <h2>Questions or Special Requests</h2>
      <p>We want this to be as smooth and stress-free as possible for you and your family. If anything comes up before your installation date &mdash; a scheduling conflict, a concern about access, prize landscaping or gardens you want protected, or a special request specific to your property &mdash; please don&rsquo;t hesitate to reach out. It&rsquo;s much easier to plan for something in advance than to work around it on install day.</p>
      <p class="sign">Thank you for trusting us with your home. We look forward to serving you and delivering a finished product you&rsquo;re proud of.<br><br><b>Cardinal Roofing &amp; Renovations</b></p>
    </div>'
where not exists (select 1 from public.company_templates where slug = 'preinstall_siding');

insert into public.company_templates (slug, subject, html)
select 'preinstall_windows', 'Your Window Replacement — What to Expect (Cardinal Roofing)', '<div class="chips">
      <div class="chip"><div class="k">Installation Date</div><div class="v"><span class="cr-gtok" data-tok="install_date">your scheduled date</span></div></div>
      <div class="chip"><div class="k">Crew Arrival Window</div><div class="v">7:30 &ndash; 8:00 AM</div></div>
    </div>
    <div class="bd">
      <p class="lead">Great news &mdash; your custom window replacement is officially scheduled for <span class="cr-gtok" data-tok="install_date">your scheduled date</span>, and our installation crew is ready to upgrade your home&rsquo;s comfort, efficiency, and beauty. We plan to arrive between 7:30&ndash;8:00 AM.</p>
      <p>Everything is in place on our end. Your new window units, insulated trim, and custom aluminum capping materials will be delivered either the afternoon before or the morning of installation. Our certified crew handles everything from start to finish &mdash; including drop-cloth protection, careful removal of existing units, structural insulation, precision level installation, and continuous cleanup. All we ask is that you sit back, relax, and let us take care of the rest.</p>

      <h2>Yard Sign &amp; Property Identification</h2>
      <p>A few days prior to your install date, you will notice a Cardinal yard sign placed on your front lawn. In addition to letting neighbors know quality work is underway, this sign serves an important operational purpose: it acts as our crew&rsquo;s visual beacon so delivery drivers and window installers verify the exact address and stage materials at the correct property. <b>Please leave the sign in place until your installation is completed.</b></p>

      <h2>Our &ldquo;One Window at a Time&rdquo; &amp; Weather Policy</h2>
      <p>We know maintaining home security and indoor temperature matters. Our crew removes and replaces one window opening at a time (or by single room zones). We never leave multiple empty window openings exposed to the elements &mdash; each opening is insulated, weather-sealed, and secured before moving to the next.</p>
      <p><b>Weather watch:</b> window replacements can safely proceed during mild cold or light rain. However, if severe storms, high wind gusts, or extreme freezing conditions threaten safety or proper sealant curing, we will reach out promptly to reschedule. Your home&rsquo;s interior comfort always comes first.</p>

      <h2>What to Expect on Installation Day &amp; Daily Cleanup</h2>
      <p>Installers will be working both inside your home and outside on exterior ladders and staging. We lay down protective drop cloths along indoor walkways and below active work areas. Outside, we set up an aluminum trim brake to custom-bend exterior capping.</p>
      <p><b>Meticulous cleanup every day:</b> at the end of every work session, our crew vacuums indoor sills and floors, sweeps exterior walkways, runs rolling magnets across driveways and lawns to catch screws, and removes all old sash debris from your property.</p>

      <h2>Six Things to Do Before Installation Day</h2>
      <ol class="steps">
        <li><span class="t">Take down all blinds, shades, curtains &amp; hardware.</span><p>Please remove all window treatments (curtains, drapes, blinds, plantation shutters, and mounting brackets) from every window being replaced. This gives our installers clear access to the window jambs and prevents delicate fabrics from gathering dust or sustaining damage.</p></li>
        <li><span class="t">Move beds, furniture &amp; decor 4 to 6 feet back from windows.</span><p>Our installers need room to maneuver large glass units and set up indoor ladders. Please slide beds, desks, dressers, couches, and electronics away from window openings, and clear window sills and nearby wall decor for a completely unobstructed workspace.</p></li>
        <li><span class="t">Secure pets &amp; communicate before stepping outside.</span><p>With interior doors frequently opening and window openings temporarily accessible, please keep pets secured in a closed, comfortable room away from active work zones. If you or your pets need to step outside, give our crew leader a quick heads-up so we ensure all ladders and pathways are completely clear.</p>
          <div class="contacts">
            <div class="ctitle">Call or text to coordinate site access</div>
            <div class="crow"><span class="who">On-site crew leader</span><span class="num">introduced on the day</span></div>
            <div class="crow"><span class="who">Project Manager &mdash; Curtis Hoskins</span><span class="num">(937) 576-6753</span></div>
            <div class="crow"><span class="who">Your Sales Rep &mdash; <span class="cr-gtok" data-tok="rep_name">your sales rep</span></span><span class="num"><span class="cr-gtok" data-tok="rep_phone">(937) 576-6753</span></span></div>
          </div>
        </li>
        <li><span class="t">Disable window security sensors &amp; alarms.</span><p>If your home has a security system with hardwired or wireless window sensors, please contact your alarm monitoring provider to bypass window zones on install day, and remove any stick-on sensor contacts so they aren&rsquo;t discarded with the old frames.</p></li>
        <li><span class="t">Trim exterior bushes &amp; clear outdoor pathways.</span><p>Installers must access the exterior of each window to install insulation, flashing tape, and custom aluminum coil capping. Please trim back close branches and move outdoor furniture, planters, or garden hoses away from exterior windows.</p></li>
        <li><span class="t">Ensure exterior &amp; interior power access (or request a generator).</span><p>Installers use saws, vacuum extractors, and trim tools. Please ensure an exterior or nearby interior outlet is live. If you prefer we bring a portable generator instead, just let us know in advance.</p></li>
      </ol>

      <h2>Questions or Special Requests</h2>
      <p>We want this to be as smooth and stress-free as possible for you and your family. If anything comes up before your installation date &mdash; a scheduling conflict, a concern about access, prize landscaping you want protected, or a special request specific to your property &mdash; please don&rsquo;t hesitate to reach out. It&rsquo;s much easier to plan for something in advance than to work around it on install day.</p>
      <p class="sign">Thank you for trusting us with your home. We look forward to serving you and delivering a finished product you&rsquo;re proud of.<br><br><b>Cardinal Roofing &amp; Renovations</b></p>
    </div>'
where not exists (select 1 from public.company_templates where slug = 'preinstall_windows');
