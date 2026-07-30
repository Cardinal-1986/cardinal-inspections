-- Resource Library — replace the "not yet confirmed" counties placeholder.
--
-- ALREADY RUN against project yipslubcptjoarblzbpl on 30 Jul 2026.
-- Kept in the repo so the content is reviewable and reproducible; it is
-- idempotent (a straight UPDATE of one row by id) and safe to re-run.
--
-- Context: library_items row adfe5c23 was seeded as an explicit placeholder —
-- "Miami, Warren, Butler, Clark, Preble and Darke - not yet confirmed ...
-- their departments have not been verified yet." Each county was then checked
-- against its own official site. Five confirmed directly; Darke could not be
-- (the county site refused the request), and the entry says so in its own text
-- and in its last source chip.
--
-- The body uses the pipe-table syntax that lbRich() promotes (build 446), and
-- populates `sources` (added in the same build) so the entry renders citation
-- chips instead of the "No source recorded" warning. Verified by running the
-- SHIPPED lbRich/lbSources against this exact stored row: 12/12 checks,
-- including a negative control proving a table cell still cannot smuggle markup.

update library_items set
  title = 'Miami, Warren, Butler, Clark, Preble and Darke - who actually issues the permit',
  summary = 'All six run their own building department. Butler covers unincorporated areas only, and Preble sends plan review to the same private firm Xenia uses.',
  body = $body$All six have their own building department. None of them hand residential work back to the State.

| County | Department | Where | Phone |
| --- | --- | --- | --- |
| Miami | Building Regulations | 1506 One Stop Ct, Troy | 937-440-8121 |
| Warren | Building & Zoning | 406 Justice Dr Rm 167, Lebanon | 513-695-1290 |
| Butler | Building & Zoning | 130 High St, Hamilton | 513-887-3205 |
| Clark | Community Development | 3130 E Main St, Springfield | 937-521-2160 |
| Preble | Building Regulations | 101 E Main St, Eaton | 937-456-8171 |
| Darke | Building Regulations | Greenville | 937-547-7379 |

**Butler is unincorporated only.** The county enforces building and electrical code for unincorporated Butler. Hamilton, Fairfield, Middletown, West Chester and Oxford issue their own. Same trap as Greene County and its six exceptions - pull from the wrong office and the permit is void.

**Preble runs through a private firm.** Plan review and inspection go to National Inspection Corporation - Plans@Natinspect.com, 937-433-4642. That is the same outfit Xenia contracts with. Two jurisdictions, one phone number.

**Clark.** If the property sits in Springfield Township, call the township at 937-322-3459, not the county.

**Warren.** No paper since 1 January 2023 - applications and drawings are online only. Residential plan review runs about two weeks, so do not promise a start date off a same-week permit.

**Miami.** Submittals must arrive as one multipage PDF. Anything else draws a $100 processing fee plus the state assessment.

**Darke is not fully verified.** The number and the coverage list came from a county services directory, not the building department's own page - that site refused the request. Confirm by phone before anyone quotes this.$body$,
  sources = ARRAY[
    'Miami County Building Regulations - co.miami.oh.us/137/Building-Regulations',
    'Warren County Building & Zoning - warrencountyohio.gov/bldginsp/',
    'Butler County Building & Zoning, Dept of Development - bcohio.gov',
    'Clark County Community Development - clarkcountyohio.gov/280/Building',
    'Preble County Building Regulations - prebco.org/166/Building-Regulations',
    'Preble County building handout naming National Inspection Corporation - prebco.org/DocumentCenter/View/538',
    'Darke County services directory - mydarkecounty.com/countyservices (UNVERIFIED, county site returned 403)'
  ],
  source_note = 'Which counties around Dayton have their own building department, and who issues the permit? Researched 30 Jul 2026 against each county''s official site.'
where id = 'adfe5c23-c3ec-49ba-adc6-c0b17c5de6c0';
