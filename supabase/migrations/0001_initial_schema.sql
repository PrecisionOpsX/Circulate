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
