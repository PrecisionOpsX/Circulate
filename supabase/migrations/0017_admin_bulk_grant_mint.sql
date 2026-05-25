-- ============================================================
-- Circulate: admin bulk-grant and mint-credits functions.
--
-- admin_grant_credits_all(): grant the same amount to every
--   user wallet in one atomic transaction. Used for platform-wide
--   promotions ("stimulate spending"). Logs a single audit row
--   with target_type = 'all_users'.
--
-- admin_mint_credits(): create new credits and add them directly
--   to the reserve wallet without debiting any source. Used when
--   the admin needs to increase the reserve beyond the automatic
--   fee accumulation. Logs with action = 'mint_credits'.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ---- admin_grant_credits_all --------------------------------

create or replace function public.admin_grant_credits_all(
  p_amount_each  numeric,
  p_admin_id     uuid,
  p_note         text default null
) returns integer   -- number of user wallets credited
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserve_balance numeric;
  v_user_count      integer;
  v_total           numeric;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'Only admins can grant credits.' using errcode = '42501';
  end if;

  if p_amount_each <= 0 then
    raise exception 'Amount must be positive.' using errcode = '22023';
  end if;

  -- Count active user wallets (excludes the reserve).
  select count(*) into v_user_count
    from public.wallets
    where is_reserve = false
      and user_id is not null;

  if v_user_count = 0 then
    raise exception 'No user wallets found.' using errcode = 'P0002';
  end if;

  v_total := p_amount_each * v_user_count;

  -- Lock the reserve row to serialise concurrent operations.
  select balance into v_reserve_balance
    from public.wallets
    where is_reserve = true
    for update;

  if v_reserve_balance is null then
    raise exception 'Reserve wallet not found.' using errcode = 'P0002';
  end if;

  if v_reserve_balance < v_total then
    raise exception
      'Reserve balance (%) is insufficient for a total broadcast of % (% users x %).',
      v_reserve_balance, v_total, v_user_count, p_amount_each
      using errcode = '22023';
  end if;

  -- Deduct the aggregate amount from the reserve.
  update public.wallets
    set balance = balance - v_total
    where is_reserve = true;

  -- Credit every user wallet.
  update public.wallets
    set balance = balance + p_amount_each
    where is_reserve = false
      and user_id is not null;

  -- Single audit-log entry for the whole broadcast.
  insert into public.admin_audit_log (
    admin_id, action, target_type, target_id, detail
  ) values (
    p_admin_id,
    'grant_credits',
    'all_users',
    null,
    jsonb_build_object(
      'amount_each', p_amount_each,
      'total',       v_total,
      'user_count',  v_user_count,
      'note',        coalesce(p_note, '')
    )
  );

  return v_user_count;
end;
$$;

revoke all  on function public.admin_grant_credits_all(numeric, uuid, text) from public;
grant execute on function public.admin_grant_credits_all(numeric, uuid, text) to authenticated;


-- ---- admin_mint_credits ------------------------------------

create or replace function public.admin_mint_credits(
  p_amount    numeric,
  p_admin_id  uuid,
  p_note      text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'Only admins can mint credits.' using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive.' using errcode = '22023';
  end if;

  -- Add new credits directly to the reserve wallet.
  update public.wallets
    set balance = balance + p_amount
    where is_reserve = true;

  -- Audit log.
  insert into public.admin_audit_log (
    admin_id, action, target_type, target_id, detail
  ) values (
    p_admin_id,
    'mint_credits',
    null,
    null,
    jsonb_build_object(
      'amount', p_amount,
      'note',   coalesce(p_note, '')
    )
  );
end;
$$;

revoke all  on function public.admin_mint_credits(numeric, uuid, text) from public;
grant execute on function public.admin_mint_credits(numeric, uuid, text) to authenticated;
