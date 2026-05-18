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
