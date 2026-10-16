-- Build 1357 — line items on an invoice, editable, and EXTRA lines that add to the job.
-- Theo, 16 Oct: "can you make it to where we can add line items to invoices? Make it editable as well."
-- Picked option 1: the invoice starts as a breakdown of the estimate / contract (and signed change orders);
-- lines can be changed, added and removed; a line marked EXTRA raises the job value and the balance
-- everywhere (app, pay link, reminders), the way a signed change order does.
-- Apply BEFORE the build's code: the app's document list selects these two columns. Idempotent, additive.
--
--   inv_lines   — the invoice's lines as the office wrote them:
--                 [{ "d": description, "q": qty, "p": unit price, "x": true when EXTRA }]
--   extra_total — the sum of the EXTRA lines (q × p), kept as a number so the server-side money rules
--                 (owedOn() in api/pay.js and api/share.js, api/remind.js) can add it without parsing JSON.
-- Only invoice documents carry these; every other document keeps the defaults.

alter table public.inspection_reports add column if not exists inv_lines jsonb;
alter table public.inspection_reports add column if not exists extra_total numeric(12,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inspection_reports_extra_total_ck') then
    alter table public.inspection_reports
      add constraint inspection_reports_extra_total_ck check (extra_total >= 0);
  end if;
end $$;

comment on column public.inspection_reports.inv_lines is
  'Build 1357: invoice line items [{d,q,p,x}]; x = EXTRA (adds to the job value).';
comment on column public.inspection_reports.extra_total is
  'Build 1357: sum of an invoice''s EXTRA lines. Added to the job value by jobFinance(), owedOn() and remind.js.';
