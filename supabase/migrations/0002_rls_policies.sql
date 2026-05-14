-- ============================================================
-- Circulate — Row Level Security
-- Every table has RLS enabled. Defaults are deny-all; the policies
-- below grant the minimum each role needs.
-- ============================================================

-- ---------- enable RLS everywhere ----------
alter table public.profiles        enable row level security;
alter table public.wallets         enable row level security;
alter table public.categories      enable row level security;
alter table public.locations       enable row level security;
alter table public.conditions      enable row level security;
alter table public.listings        enable row level security;
alter table public.listing_photos  enable row level security;
alter table public.favorites       enable row level security;
alter table public.transactions    enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.blocks          enable row level security;
alter table public.ratings         enable row level security;
alter table public.reports         enable row level security;
alter table public.ads             enable row level security;
alter table public.admin_audit_log enable row level security;

-- ============================================================
-- profiles
-- ============================================================
-- Profiles are public (needed to render seller info on listings).
create policy "profiles: read all"
  on public.profiles for select
  using (true);

-- A user may update their own profile. Admins may update anyone.
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- Inserts happen via the handle_new_user() trigger (SECURITY DEFINER),
-- so no INSERT policy is granted to regular clients.

-- ============================================================
-- wallets  — read own only; never written directly by clients.
-- All balance changes go through SECURITY DEFINER functions (M3).
-- ============================================================
create policy "wallets: read own"
  on public.wallets for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ============================================================
-- taxonomies — readable by everyone, writable by admins only.
-- ============================================================
create policy "categories: read active or admin"
  on public.categories for select
  using (is_active or public.is_admin(auth.uid()));
create policy "categories: admin write"
  on public.categories for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "locations: read active or admin"
  on public.locations for select
  using (is_active or public.is_admin(auth.uid()));
create policy "locations: admin write"
  on public.locations for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "conditions: read active or admin"
  on public.conditions for select
  using (is_active or public.is_admin(auth.uid()));
create policy "conditions: admin write"
  on public.conditions for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- listings
-- ============================================================
-- Anyone can see active/sold listings; owners + admins see all states.
create policy "listings: read public or own"
  on public.listings for select
  using (
    status in ('active', 'sold')
    or auth.uid() = seller_id
    or public.is_admin(auth.uid())
  );

create policy "listings: insert own"
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "listings: update own or admin"
  on public.listings for update
  using (auth.uid() = seller_id or public.is_admin(auth.uid()))
  with check (auth.uid() = seller_id or public.is_admin(auth.uid()));

create policy "listings: delete own or admin"
  on public.listings for delete
  using (auth.uid() = seller_id or public.is_admin(auth.uid()));

-- ---------- listing_photos ----------
create policy "listing_photos: read with listing"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status in ('active', 'sold')
             or l.seller_id = auth.uid()
             or public.is_admin(auth.uid()))
    )
  );

create policy "listing_photos: write own listing"
  on public.listing_photos for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

-- ============================================================
-- favorites — fully private to the owning user.
-- ============================================================
create policy "favorites: manage own"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- transactions — visible to buyer, seller, admins. Created/updated
-- by SECURITY DEFINER wallet functions in M3, not by clients.
-- ============================================================
create policy "transactions: read own"
  on public.transactions for select
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
    or public.is_admin(auth.uid())
  );

-- ============================================================
-- conversations & messages — participants only.
-- ============================================================
create policy "conversations: read own"
  on public.conversations for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_admin(auth.uid()));

create policy "conversations: insert as participant"
  on public.conversations for insert
  with check (auth.uid() in (buyer_id, seller_id));

create policy "messages: read in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() in (c.buyer_id, c.seller_id)
             or public.is_admin(auth.uid()))
    )
  );

create policy "messages: send in own conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- ============================================================
-- blocks — owner-managed.
-- ============================================================
create policy "blocks: manage own"
  on public.blocks for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- ============================================================
-- ratings — world-readable (shown on profiles), authored by rater.
-- ============================================================
create policy "ratings: read all"
  on public.ratings for select
  using (true);

create policy "ratings: insert as rater"
  on public.ratings for insert
  with check (auth.uid() = rater_id);

create policy "ratings: update own"
  on public.ratings for update
  using (auth.uid() = rater_id)
  with check (auth.uid() = rater_id);

-- ============================================================
-- reports — reporter sees their own; admins see all.
-- ============================================================
create policy "reports: read own or admin"
  on public.reports for select
  using (auth.uid() = reporter_id or public.is_admin(auth.uid()));

create policy "reports: insert as reporter"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "reports: admin update"
  on public.reports for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- ads — public reads the currently-live ads; admins manage them.
-- ============================================================
create policy "ads: read live or admin"
  on public.ads for select
  using (
    (is_enabled
      and (start_date is null or start_date <= current_date)
      and (end_date   is null or end_date   >= current_date))
    or public.is_admin(auth.uid())
  );

create policy "ads: admin write"
  on public.ads for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- admin_audit_log — admins only.
-- ============================================================
create policy "admin_audit_log: admin read"
  on public.admin_audit_log for select
  using (public.is_admin(auth.uid()));
