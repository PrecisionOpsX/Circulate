-- ============================================================
-- Circulate, Milestone 5: basic admin.
--
-- 1. profiles.admin_view: per-admin UI preference. When true an admin
--    sees the admin entry points; when false they browse as a regular
--    customer. Toggled from the avatar dropdown. Default true.
--
-- 2. A guard trigger so a non-admin can never change their own (or
--    anyone's) `role`. The "profiles: update own" RLS policy lets users
--    update their own row, which on its own would let someone set
--    role = 'admin' on themselves. The trigger closes that hole:
--    role changes are allowed only for admins (or system / service
--    role contexts where auth.uid() is null).
--
-- Idempotent.
-- ============================================================

alter table public.profiles
  add column if not exists admin_view boolean not null default true;

-- ---------- role-change guard ----------
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is null for service-role / SQL-editor contexts, which
    -- are trusted. Authenticated callers must be admins.
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Only admins can change a user role.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
