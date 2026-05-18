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
