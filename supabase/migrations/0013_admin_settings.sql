-- ============================================================
-- Circulate, Milestone 5: admin settings + customer-view default.
--
-- 1. profiles.admin_view now defaults to FALSE. An admin starts in the
--    regular customer experience and explicitly opts into the admin
--    panel from the avatar menu. Existing rows are reset to false so
--    every account lands in customer view.
--
-- 2. platform_settings.transaction_fee_rate: the platform fee taken from
--    each completed sale, now admin-editable. transfer_credits() reads
--    the rate from platform_settings instead of a hardcoded 0.06.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- 1. customer view is the default ----------
alter table public.profiles
  alter column admin_view set default false;

update public.profiles
  set admin_view = false
  where admin_view;

-- ---------- 2. admin-editable transaction fee ----------
alter table public.platform_settings
  add column if not exists transaction_fee_rate numeric(5, 4) not null
    default 0.06
    check (transaction_fee_rate >= 0 and transaction_fee_rate <= 1);

-- ---------- transfer_credits(): read the fee rate from settings ----------
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
  v_fee_rate   numeric;
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

  -- Platform fee rate is admin-configurable in platform_settings.
  select transaction_fee_rate into v_fee_rate
    from public.platform_settings
    where id = 1;
  v_fee_rate := coalesce(v_fee_rate, 0.06);

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

revoke all on function public.transfer_credits(uuid) from public;
grant execute on function public.transfer_credits(uuid) to authenticated;
