-- Build 1342 — the database refuses to save an empty page over a real document.
-- Apply BEFORE the build's code. Idempotent.
--
-- Why: on 13 Oct at 23:17 a phone wrote "<!DOCTYPE html><html><head></head><body></body></html>"
-- over an estimate page (EST-2026-0910) that had 11,059 characters in it. Build 1328 already stops
-- the editor doing this, but a phone that has kept an older copy of the app open never got 1328,
-- and any other path that writes `html` is not covered by an editor-side check. The server is the
-- one place every writer passes through.
--
-- Rule: an UPDATE that changes `html` to a page with no visible content (no text, no image, no
-- table cell) is refused when the page it replaces had content. Large pages skip the check
-- (an empty page is ~55 characters; nothing under 1,500 characters is a real Cardinal document,
-- and nothing over it can be empty), so a 6 MB save costs one length() call.
-- A brand-new row (INSERT) is not touched, so an empty draft can still be created.

create or replace function public.inspection_reports_blank_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_body text;
begin
  if new.html is not distinct from old.html then return new; end if;
  if new.html is not null and length(new.html) > 1500 then return new; end if;
  -- what the old page showed; an already-empty page may be replaced by anything
  if old.html is null or length(old.html) < 200 then return new; end if;
  v_body := coalesce(new.html, '');
  v_body := regexp_replace(v_body, '<(head|style|script)[^>]*>.*?</\1>', '', 'gis');
  if v_body ~* '<(img|td|svg)\b' then return new; end if;
  v_body := regexp_replace(v_body, '<[^>]*>', '', 'g');
  v_body := regexp_replace(v_body, '&nbsp;|\s', '', 'g');
  if length(v_body) > 0 then return new; end if;
  raise exception 'Refused to save an empty page over this document. Close it and open it again.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists inspection_reports_blank_guard on public.inspection_reports;
create trigger inspection_reports_blank_guard
  before update of html on public.inspection_reports
  for each row execute function public.inspection_reports_blank_guard();

-- Revert:
--   drop trigger if exists inspection_reports_blank_guard on public.inspection_reports;
--   drop function if exists public.inspection_reports_blank_guard();
