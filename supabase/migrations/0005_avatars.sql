-- ============================================================
-- Circulate, Milestone 3+: profile avatar uploads
--
-- Adds the `avatars` storage bucket plus owner-scoped RLS, and a
-- `profiles.avatar_path` column so the app can clean up old avatar
-- objects from Storage when one is replaced or removed.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.profiles
  add column if not exists avatar_path text;

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- storage RLS ----------
-- Objects live under  avatars/{user_id}/{uuid}.{ext}
-- so the first path segment must match the uploader.
drop policy if exists "avatars: public read"   on storage.objects;
drop policy if exists "avatars: owner insert"  on storage.objects;
drop policy if exists "avatars: owner update"  on storage.objects;
drop policy if exists "avatars: owner delete"  on storage.objects;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
