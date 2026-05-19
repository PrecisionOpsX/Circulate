-- ============================================================
-- Circulate: remove the per-file size cap on the listing-photos bucket.
--
-- The bucket-level cap is cleared. The project-wide global limit
-- (Project Settings > Storage > File size limit) still applies as
-- the hard ceiling; on the Supabase free tier that is 50 MB.
--
-- Idempotent.
-- ============================================================

update storage.buckets
  set file_size_limit = null
  where id = 'listing-photos';
