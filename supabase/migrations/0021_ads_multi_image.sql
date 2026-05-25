-- ============================================================
-- ads: multi-image carousel support
--
-- 1. Remove the 5 MB cap from the ad-images bucket so admins can
--    upload banners of any size.
-- 2. Add image_urls text[] for storing multiple banner images per ad.
--    image_url is kept as the primary/first image for backwards compat.
-- Idempotent: safe to re-run.
-- ============================================================

update storage.buckets
  set file_size_limit = null
  where id = 'ad-images';

alter table public.ads
  add column if not exists image_urls text[] not null default '{}';
