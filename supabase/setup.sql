-- ============================================================
-- Circulate — full setup (schema + RLS + seed) in one file.
-- Paste into the Supabase SQL Editor and run.  Idempotent-ish:
-- run on a FRESH project (the enums/tables use CREATE, not
-- CREATE IF NOT EXISTS). To re-run, reset the database first.
-- ============================================================

-- ============================================================
-- Circulate — Initial Schema
-- Marketplace where users trade goods/services in platform credits.
-- ============================================================
-- Run order: 0001 (this) -> 0002 (RLS) -> ../seed.sql
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role     as enum ('user', 'admin');
create type user_status   as enum ('active', 'suspended', 'frozen');
create type listing_type  as enum ('goods', 'service');
create type listing_status as enum ('draft', 'active', 'sold', 'removed');
create type txn_status     as enum ('pending', 'completed', 'cancelled', 'disputed');
create type report_target  as enum ('listing', 'user', 'message');
create type report_status  as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ---------- Shared: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles  (1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null,
  avatar_url        text,
  bio               text,
  phone             text,
  email_verified    boolean not null default false,
  phone_verified    boolean not null default false,
  role              user_role not null default 'user',
  status            user_status not null default 'active',
  completed_trades  integer not null default 0,
  accepted_terms_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- App-level duplicate-account guard: one profile per phone number.
-- (auth.users already enforces unique email + phone at the auth layer.)
create unique index profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Admin check helper ----------
-- SECURITY DEFINER so RLS policies can call it without recursing into
-- the profiles policies themselves.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

-- ============================================================
-- wallets  (one per user + a single platform reserve wallet)
-- ============================================================
create table public.wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references public.profiles (id) on delete cascade,
  balance     numeric(14,2) not null default 0,
  is_reserve  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A user wallet has a user_id; the reserve wallet does not. Exactly one
-- of those conditions must hold.
alter table public.wallets
  add constraint wallets_user_xor_reserve
  check ((user_id is not null and is_reserve = false)
      or (user_id is null     and is_reserve = true));

-- Only one reserve wallet may ever exist.
create unique index wallets_single_reserve
  on public.wallets ((true))
  where is_reserve;

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- ============================================================
-- Dropdown taxonomies: categories / locations / conditions
-- ============================================================
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.conditions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- listings
-- ============================================================
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  type         listing_type not null,
  category_id  uuid references public.categories (id) on delete set null,
  location_id  uuid references public.locations (id) on delete set null,
  condition_id uuid references public.conditions (id) on delete set null,
  price        numeric(14,2) not null check (price >= 0),
  status       listing_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index listings_seller_idx   on public.listings (seller_id);
create index listings_status_idx   on public.listings (status);
create index listings_category_idx on public.listings (category_id);
create index listings_location_idx on public.listings (location_id);
create index listings_created_idx  on public.listings (created_at desc);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------- listing photos ----------
create table public.listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url        text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index listing_photos_listing_idx on public.listing_photos (listing_id);

-- ---------- favorites ----------
create table public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index favorites_user_idx on public.favorites (user_id);

-- ============================================================
-- transactions  (credit transfer ledger; wallet engine lands in M3)
-- ============================================================
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid references public.listings (id) on delete set null,
  buyer_id     uuid not null references public.profiles (id) on delete restrict,
  seller_id    uuid not null references public.profiles (id) on delete restrict,
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  fee_amount   numeric(14,2) not null default 0 check (fee_amount >= 0),
  net_amount   numeric(14,2) not null check (net_amount >= 0),
  status       txn_status not null default 'pending',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index transactions_buyer_idx  on public.transactions (buyer_id);
create index transactions_seller_idx on public.transactions (seller_id);
create index transactions_status_idx on public.transactions (status);

-- ============================================================
-- messaging  (Stream Chat owns message content in M4; these tables
-- link a conversation to a listing and the two participants)
-- ============================================================
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete set null,
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create index conversations_buyer_idx  on public.conversations (buyer_id);
create index conversations_seller_idx on public.conversations (seller_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------- user blocks ----------
create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ============================================================
-- ratings & reviews
-- ============================================================
create table public.ratings (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  rater_id       uuid not null references public.profiles (id) on delete cascade,
  ratee_id       uuid not null references public.profiles (id) on delete cascade,
  stars          smallint not null check (stars between 1 and 5),
  review         text,
  created_at     timestamptz not null default now(),
  unique (transaction_id, rater_id),
  check (rater_id <> ratee_id)
);

create index ratings_ratee_idx on public.ratings (ratee_id);

-- ============================================================
-- reports  (listings / users / messages flagged for moderation)
-- ============================================================
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target not null,
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_status_idx on public.reports (status);

-- ============================================================
-- ads  (2 slots per page; managed in the admin dashboard, M5)
-- ============================================================
create table public.ads (
  id         uuid primary key default gen_random_uuid(),
  slot       text not null,
  image_url  text not null,
  link_url   text not null,
  start_date date,
  end_date   date,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- admin_audit_log  (wallet adjustments, suspensions, moderation)
-- ============================================================
create table public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

-- ============================================================
-- New-user bootstrap: create a profile + wallet whenever a user
-- signs up through Supabase Auth.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1),
    'New User'
  );

  insert into public.profiles (id, display_name, phone, email_verified, phone_verified, accepted_terms_at)
  values (
    new.id,
    v_display_name,
    new.phone,
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null,
    case
      when (new.raw_user_meta_data ->> 'accepted_terms') = 'true' then now()
      else null
    end
  );

  -- Every user starts with a 0-credit wallet.
  insert into public.wallets (user_id, balance)
  values (new.id, 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile verification flags in sync when Supabase Auth confirms
-- an email or phone.
create or replace function public.handle_user_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email_verified = new.email_confirmed_at is not null,
      phone_verified = new.phone_confirmed_at is not null,
      phone          = coalesce(new.phone, phone)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_verified
  after update of email_confirmed_at, phone_confirmed_at on auth.users
  for each row execute function public.handle_user_verification();

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

-- ============================================================
-- Circulate — Seed Data
-- Safe to run repeatedly (idempotent via ON CONFLICT).
-- Run after 0001 + 0002.
-- ============================================================

-- ---------- platform reserve wallet ----------
-- Single, platform-owned wallet that collects the 6% transaction fee.
insert into public.wallets (id, user_id, balance, is_reserve)
values ('00000000-0000-0000-0000-000000000001', null, 0, true)
on conflict (id) do nothing;

-- ---------- categories ----------
insert into public.categories (name, slug, sort_order) values
  ('Electronics',        'electronics',        10),
  ('Furniture',          'furniture',          20),
  ('Clothing',           'clothing',           30),
  ('Home & Garden',      'home-garden',        40),
  ('Books & Media',      'books-media',        50),
  ('Toys & Games',       'toys-games',         60),
  ('Sports & Outdoors',  'sports-outdoors',    70),
  ('Tools',              'tools',              80),
  ('Tutoring',           'tutoring',           90),
  ('Home Services',      'home-services',      100),
  ('Creative & Design',  'creative-design',    110),
  ('Other',              'other',              999)
on conflict (slug) do nothing;

-- ---------- locations ----------
insert into public.locations (name, slug, sort_order) values
  ('Downtown',     'downtown',      10),
  ('North Side',   'north-side',    20),
  ('South Side',   'south-side',    30),
  ('East Side',    'east-side',     40),
  ('West Side',    'west-side',     50),
  ('Suburbs',      'suburbs',       60),
  ('Other',        'other',         999)
on conflict (slug) do nothing;

-- ---------- conditions ----------
insert into public.conditions (name, slug, sort_order) values
  ('New',             'new',             10),
  ('Like New',        'like-new',        20),
  ('Good',            'good',            30),
  ('Fair',            'fair',            40),
  ('For Parts',       'for-parts',       50),
  ('Not Applicable',  'not-applicable',  999)
on conflict (slug) do nothing;


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


-- ============================================================
-- Circulate, Milestone 3: Wallet Engine + Stripe
--
-- Adds the credit_purchases table (Stripe-funded credit top-ups) plus
-- two SECURITY DEFINER functions that perform the only ways credits ever
-- move:
--   transfer_credits()       buyer -> seller (with 6% fee to reserve)
--   apply_credit_purchase()  mints credits to a user after Stripe payment
--
-- Idempotent: safe to re-run on an existing project.
-- ============================================================

-- ---------- enum: credit purchase status ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'purchase_status') then
    create type purchase_status as enum ('pending', 'completed', 'failed', 'refunded');
  end if;
end $$;

-- ============================================================
-- credit_purchases: one row per Stripe checkout that minted credits.
-- ============================================================
create table if not exists public.credit_purchases (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references public.profiles (id) on delete restrict,
  stripe_session_id          text,
  stripe_payment_intent_id   text unique,
  credits                    numeric(14, 2) not null check (credits > 0),
  amount_usd_cents           integer not null check (amount_usd_cents >= 0),
  status                     purchase_status not null default 'pending',
  created_at                 timestamptz not null default now(),
  completed_at               timestamptz
);

create index if not exists credit_purchases_user_idx
  on public.credit_purchases (user_id, created_at desc);
create index if not exists credit_purchases_session_idx
  on public.credit_purchases (stripe_session_id);

alter table public.credit_purchases enable row level security;

drop policy if exists "credit_purchases: read own" on public.credit_purchases;
create policy "credit_purchases: read own"
  on public.credit_purchases for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Writes happen only via apply_credit_purchase() (SECURITY DEFINER, called
-- from the Stripe webhook with the service role). No client INSERT/UPDATE/
-- DELETE policies are granted.

-- ============================================================
-- transfer_credits(): the only way peer-to-peer credits ever move.
--
-- Validates auth, listing availability, self-trade, and balance floor;
-- then atomically:
--   1. debits the buyer the listing price
--   2. credits the seller (price - 6% fee)
--   3. credits the reserve wallet (6% fee)
--   4. marks the listing sold
--   5. bumps completed_trades on both profiles
--   6. inserts a completed transaction row
--
-- A SELECT ... FOR UPDATE on the listing serialises concurrent attempts,
-- so the second buyer to arrive will see status = 'sold' and fail cleanly.
-- ============================================================
create or replace function public.transfer_credits(p_listing_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id     uuid := auth.uid();
  v_listing      public.listings%rowtype;
  v_buyer_bal    numeric;
  v_fee_rate     numeric := 0.06;
  v_min_balance  numeric := -100;
  v_fee          numeric;
  v_net          numeric;
  v_txn          public.transactions;
begin
  if v_buyer_id is null then
    raise exception 'You must be signed in to pay.' using errcode = '42501';
  end if;

  -- Lock the listing row for the rest of the transaction.
  select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

  if not found then
    raise exception 'Listing not found.' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'This listing is no longer available.' using errcode = 'P0002';
  end if;

  if v_listing.seller_id = v_buyer_id then
    raise exception 'You cannot buy your own listing.' using errcode = '22023';
  end if;

  -- Lock both wallets to avoid races against concurrent transfers.
  select balance into v_buyer_bal
    from public.wallets
    where user_id = v_buyer_id
    for update;

  if v_buyer_bal is null then
    raise exception 'Your wallet is missing.' using errcode = 'P0002';
  end if;

  if v_buyer_bal - v_listing.price < v_min_balance then
    raise exception
      'Not enough credits. You can spend down to % credits.', v_min_balance
      using errcode = '22023';
  end if;

  v_fee := round(v_listing.price * v_fee_rate, 2);
  v_net := v_listing.price - v_fee;

  -- 1. Debit the buyer.
  update public.wallets
    set balance = balance - v_listing.price
    where user_id = v_buyer_id;

  -- 2. Credit the seller their net.
  update public.wallets
    set balance = balance + v_net
    where user_id = v_listing.seller_id;

  -- 3. Credit the platform reserve the fee.
  update public.wallets
    set balance = balance + v_fee
    where is_reserve = true;

  -- 4. Mark the listing sold.
  update public.listings
    set status = 'sold'
    where id = p_listing_id;

  -- 5. Bump completed_trades on both sides.
  update public.profiles
    set completed_trades = completed_trades + 1
    where id in (v_buyer_id, v_listing.seller_id);

  -- 6. Record the ledger row.
  insert into public.transactions (
    listing_id, buyer_id, seller_id,
    gross_amount, fee_amount, net_amount,
    status, completed_at
  )
  values (
    p_listing_id, v_buyer_id, v_listing.seller_id,
    v_listing.price, v_fee, v_net,
    'completed', now()
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

revoke all on function public.transfer_credits(uuid) from public;
grant execute on function public.transfer_credits(uuid) to authenticated;

-- ============================================================
-- apply_credit_purchase(): called from the Stripe webhook (or the
-- buy-credits success page as a backup) after a payment intent settles.
-- Idempotent on stripe_payment_intent_id, so retries are safe.
-- ============================================================
create or replace function public.apply_credit_purchase(
  p_user_id                  uuid,
  p_stripe_payment_intent_id text,
  p_stripe_session_id        text,
  p_credits                  numeric,
  p_amount_usd_cents         integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.credit_purchases%rowtype;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive' using errcode = '22023';
  end if;

  -- Lock any existing row for this payment intent so concurrent webhook
  -- replays cannot double-credit.
  select * into v_existing
    from public.credit_purchases
    where stripe_payment_intent_id = p_stripe_payment_intent_id
    for update;

  if v_existing.id is not null and v_existing.status = 'completed' then
    return;
  end if;

  insert into public.credit_purchases (
    user_id, stripe_session_id, stripe_payment_intent_id,
    credits, amount_usd_cents, status, completed_at
  )
  values (
    p_user_id, p_stripe_session_id, p_stripe_payment_intent_id,
    p_credits, p_amount_usd_cents, 'completed', now()
  )
  on conflict (stripe_payment_intent_id) do update
    set status            = 'completed',
        completed_at      = now(),
        stripe_session_id = coalesce(
                              public.credit_purchases.stripe_session_id,
                              excluded.stripe_session_id);

  update public.wallets
    set balance = balance + p_credits
    where user_id = p_user_id;
end;
$$;

-- Webhook + admin server code use the service role, which bypasses
-- function-level grants. Lock everyone else out so RLS-bearing clients
-- cannot mint credits.
revoke all on function public.apply_credit_purchase(uuid, text, text, numeric, integer) from public;
revoke all on function public.apply_credit_purchase(uuid, text, text, numeric, integer) from authenticated, anon;


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


-- ============================================================
-- Circulate, simpler credit model: signup grant, no negatives.
--
-- Switches from the original "start at 0, may go down to -100" model
-- to an admin-configurable signup grant with a hard floor at 0.
--
-- 1. Adds a singleton platform_settings table holding signup_credit_grant
--    (default 50). Admins (M5 UI) can update it; readable by everyone.
-- 2. Rewrites handle_new_user() to credit each new wallet with the grant.
-- 3. Rewrites transfer_credits() to require sufficient balance (no floor
--    arithmetic). Wallets can never go negative.
--
-- Existing users with balance = 0 are NOT retroactively credited. If you
-- want them grandfathered, run the one-off update at the bottom of this
-- file (commented out).
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- platform_settings (singleton) ----------
create table if not exists public.platform_settings (
  id                   integer primary key default 1 check (id = 1),
  signup_credit_grant  numeric(14, 2) not null default 50 check (signup_credit_grant >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings: read all"   on public.platform_settings;
drop policy if exists "platform_settings: admin write" on public.platform_settings;

create policy "platform_settings: read all"
  on public.platform_settings for select
  using (true);

create policy "platform_settings: admin write"
  on public.platform_settings for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ============================================================
-- handle_new_user: credit each new wallet with the configured grant.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_grant        numeric;
begin
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1),
    'New User'
  );

  select signup_credit_grant into v_grant
    from public.platform_settings
    where id = 1;
  v_grant := coalesce(v_grant, 0);

  insert into public.profiles (
    id, display_name, phone, email_verified, phone_verified, accepted_terms_at
  )
  values (
    new.id,
    v_display_name,
    new.phone,
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null,
    case
      when (new.raw_user_meta_data ->> 'accepted_terms') = 'true' then now()
      else null
    end
  );

  insert into public.wallets (user_id, balance)
  values (new.id, v_grant);

  return new;
end;
$$;

-- ============================================================
-- transfer_credits: floor at 0. Buyers must have enough credits.
-- (Body otherwise identical to the 0004 version.)
-- ============================================================
create or replace function public.transfer_credits(p_listing_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id   uuid := auth.uid();
  v_listing    public.listings%rowtype;
  v_buyer_bal  numeric;
  v_fee_rate   numeric := 0.06;
  v_fee        numeric;
  v_net        numeric;
  v_txn        public.transactions;
begin
  if v_buyer_id is null then
    raise exception 'You must be signed in to pay.' using errcode = '42501';
  end if;

  select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

  if not found then
    raise exception 'Listing not found.' using errcode = 'P0002';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'This listing is no longer available.' using errcode = 'P0002';
  end if;

  if v_listing.seller_id = v_buyer_id then
    raise exception 'You cannot buy your own listing.' using errcode = '22023';
  end if;

  select balance into v_buyer_bal
    from public.wallets
    where user_id = v_buyer_id
    for update;

  if v_buyer_bal is null then
    raise exception 'Your wallet is missing.' using errcode = 'P0002';
  end if;

  if v_buyer_bal < v_listing.price then
    raise exception 'Not enough credits. Sell something or buy more credits first.'
      using errcode = '22023';
  end if;

  v_fee := round(v_listing.price * v_fee_rate, 2);
  v_net := v_listing.price - v_fee;

  update public.wallets
    set balance = balance - v_listing.price
    where user_id = v_buyer_id;

  update public.wallets
    set balance = balance + v_net
    where user_id = v_listing.seller_id;

  update public.wallets
    set balance = balance + v_fee
    where is_reserve = true;

  update public.listings
    set status = 'sold'
    where id = p_listing_id;

  update public.profiles
    set completed_trades = completed_trades + 1
    where id in (v_buyer_id, v_listing.seller_id);

  insert into public.transactions (
    listing_id, buyer_id, seller_id,
    gross_amount, fee_amount, net_amount,
    status, completed_at
  )
  values (
    p_listing_id, v_buyer_id, v_listing.seller_id,
    v_listing.price, v_fee, v_net,
    'completed', now()
  )
  returning * into v_txn;

  return v_txn;
end;
$$;

-- Grants survive create-or-replace, but re-issue for clean installs.
revoke all on function public.transfer_credits(uuid) from public;
grant execute on function public.transfer_credits(uuid) to authenticated;

-- ============================================================
-- One-off backfill (optional). Uncomment to give the signup grant to
-- every existing wallet that is still at zero balance and has no
-- recorded trades.
-- ============================================================
-- update public.wallets w
--   set balance = (select signup_credit_grant from public.platform_settings where id = 1)
--   where w.is_reserve = false
--     and w.balance = 0
--     and not exists (
--       select 1 from public.transactions t
--         where t.buyer_id = w.user_id or t.seller_id = w.user_id
--     );


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
