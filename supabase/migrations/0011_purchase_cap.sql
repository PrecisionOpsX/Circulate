-- ============================================================
-- Circulate: monthly credit-purchase cap + realtime safety net.
--
-- Adds `monthly_credit_purchase_cap` to platform_settings (default 500
-- credits / rolling 30 days). The cap is enforced in the buy-credits
-- server action before checkout starts.
--
-- Also re-asserts the realtime publication on `public.messages` in case
-- migration 0010 hasn't been applied. Idempotent either way.
-- ============================================================

alter table public.platform_settings
  add column if not exists monthly_credit_purchase_cap numeric(14, 2)
    not null default 500 check (monthly_credit_purchase_cap >= 0);

-- Realtime publication for messages. Safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
