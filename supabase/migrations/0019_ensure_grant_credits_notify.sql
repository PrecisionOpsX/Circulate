-- ============================================================
-- Ensure admin_grant_credits exists and force PostgREST to
-- reload its schema cache immediately.
--
-- Migration 0014 was never applied to production, which meant
-- the function was absent from the schema cache even after
-- 0017 (bulk-grant + mint) was applied. Calling NOTIFY inside
-- a migration is safe: PostgreSQL delivers the notification
-- after the transaction commits, exactly when PostgREST needs
-- to see the new function.
--
-- Idempotent: safe to re-run.
-- ============================================================

create or replace function public.admin_grant_credits(
  p_recipient_id uuid,
  p_amount       numeric,
  p_admin_id     uuid,
  p_note         text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserve_balance numeric;
  v_rows_updated    integer;
begin
  if not public.is_admin(p_admin_id) then
    raise exception 'Only admins can grant credits.' using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive.' using errcode = '22023';
  end if;

  select balance into v_reserve_balance
    from public.wallets
    where is_reserve = true
    for update;

  if v_reserve_balance is null then
    raise exception 'Reserve wallet not found.' using errcode = 'P0002';
  end if;

  if v_reserve_balance < p_amount then
    raise exception
      'Reserve balance (%) is insufficient for a grant of %.',
      v_reserve_balance, p_amount
      using errcode = '22023';
  end if;

  update public.wallets
    set balance = balance - p_amount
    where is_reserve = true;

  update public.wallets
    set balance = balance + p_amount
    where user_id = p_recipient_id;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'Recipient wallet not found.' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (
    admin_id, action, target_type, target_id, detail
  ) values (
    p_admin_id,
    'grant_credits',
    'user',
    p_recipient_id::text,
    jsonb_build_object(
      'amount', p_amount,
      'note',   coalesce(p_note, '')
    )
  );
end;
$$;

revoke all  on function public.admin_grant_credits(uuid, numeric, uuid, text) from public;
grant execute on function public.admin_grant_credits(uuid, numeric, uuid, text) to authenticated;

-- Force PostgREST to reload its in-memory schema cache so the
-- function is immediately callable via the REST API.
notify pgrst, 'reload schema';
