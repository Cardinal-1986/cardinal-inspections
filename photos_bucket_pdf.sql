-- Cardinal — allow PDF scopes into the `photos` bucket, and lift the cap to 25 MB.
-- APPLIED 9 Aug 2026 against production, on Theo's say-so. Idempotent; safe to re-run.
--
-- WHY. Theo: "when trying to upload Adam Gunn's scope there was an error."
-- The scope uploader in index.html (toStorageUrl) writes to `photos` under
-- `scopes/…` and DEFAULTS the content type to application/pdf — it knows a
-- carrier scope is a PDF:
--
--     .upload(path, file, { contentType: file.type || 'application/pdf', ... })
--
-- but the bucket's allowed_mime_types was images only:
--
--     image/jpeg, image/png, image/webp, image/heic, image/heif
--
-- so Storage refused it before it landed. It failed on EVERY PDF regardless of
-- size, on every build — nothing in the app could have fixed it.
--
-- The same bucket also takes `work_orders/…` and `nachi/…` uploads, both of
-- which pass a real filename through. One change covers all three.
--
-- 10 MB -> 25 MB because a carrier scope with photographs in it routinely runs
-- past 10 MB. Photographs are still shrunk client-side before upload (shrink()
-- in cr-show-script, and compressImage() in the scope uploader), so this does
-- not change what a normal photo costs — it only stops big scopes bouncing.
--
-- This only WIDENS what is accepted. It cannot break anything already working,
-- and it is reversible: set the array back and file_size_limit to 10485760.

update storage.buckets
   set allowed_mime_types = allowed_mime_types || '{application/pdf}',
       file_size_limit    = 26214400          -- 25 MiB
 where id = 'photos'
   and not ('application/pdf' = any(allowed_mime_types));

-- Verify:
--   select id, file_size_limit, array_to_string(allowed_mime_types, ', ')
--   from storage.buckets where id = 'photos';
