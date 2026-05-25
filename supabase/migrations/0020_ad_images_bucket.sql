-- ============================================================
-- ad-images storage bucket
-- Admins upload banner images; the bucket is public so the
-- Next.js Image component can load them without auth tokens.
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-images',
  'ad-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- storage RLS ----------
drop policy if exists "ad-images: public read"   on storage.objects;
drop policy if exists "ad-images: admin insert"  on storage.objects;
drop policy if exists "ad-images: admin update"  on storage.objects;
drop policy if exists "ad-images: admin delete"  on storage.objects;

create policy "ad-images: public read"
  on storage.objects for select
  using (bucket_id = 'ad-images');

create policy "ad-images: admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ad-images'
    and public.is_admin(auth.uid())
  );

create policy "ad-images: admin update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ad-images'
    and public.is_admin(auth.uid())
  );

create policy "ad-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ad-images'
    and public.is_admin(auth.uid())
  );
