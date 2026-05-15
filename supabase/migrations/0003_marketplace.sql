-- ============================================================
-- Circulate - Milestone 2: Marketplace Core
-- Storage for listing photos, full-text search, helpful indexes.
-- Idempotent: safe to run on an existing project.
-- ============================================================

-- ============================================================
-- listing_photos: track the storage object path so photos can be
-- removed from Storage when a listing or photo is deleted.
-- ============================================================
alter table public.listing_photos
  add column if not exists storage_path text;

-- ============================================================
-- listings: full-text search + filter indexes.
-- ============================================================
alter table public.listings
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) stored;

create index if not exists listings_search_idx
  on public.listings using gin (search_vector);

create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_type_idx  on public.listings (type);

-- ============================================================
-- Storage bucket: listing-photos (public read, 5 MB image cap).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Storage RLS ----------
-- Objects live under  listing-photos/{user_id}/{uuid}.{ext}
-- so the first path segment must match the uploader.
drop policy if exists "listing-photos: public read"   on storage.objects;
drop policy if exists "listing-photos: owner insert"  on storage.objects;
drop policy if exists "listing-photos: owner update"  on storage.objects;
drop policy if exists "listing-photos: owner delete"  on storage.objects;

create policy "listing-photos: public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "listing-photos: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing-photos: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing-photos: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
