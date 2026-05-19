-- ============================================================
-- Circulate: raise the avatar upload limit to 50 MB.
--
-- The bucket was created in 0005 with a 2 MB cap. This migration
-- just bumps that single setting; idempotent.
--
-- Note: Supabase projects also have a global per-file limit (Project
-- Settings > Storage > File size limit) that caps every bucket. On the
-- free tier that limit is 50 MB. If you set the bucket here higher
-- than the project-wide cap, the project cap wins. Adjust the project
-- cap first on paid plans if you want to go above 50 MB.
-- ============================================================

update storage.buckets
  set file_size_limit = 52428800   -- 50 * 1024 * 1024
  where id = 'avatars';
