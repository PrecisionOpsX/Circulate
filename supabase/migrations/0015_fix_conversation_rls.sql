-- ============================================================
-- Circulate, Milestone 5: fix conversations RLS + trigger.
--
-- Root cause: bump_conversation_last_message_at() lacked
-- SECURITY DEFINER, so RLS silently blocked its UPDATE on the
-- conversations table (no UPDATE policy existed). The same gap
-- also blocked sendMessageAction and markConversationReadAction
-- from writing last_read_buyer_at / last_read_seller_at.
-- Result: last_message_at was always null, getMyUnreadCount()
-- always returned 0, and the unread badge reset on every refresh.
--
-- Fixes:
--  1. Rebuild the trigger function with SECURITY DEFINER so it
--     can always write last_message_at regardless of RLS.
--  2. Add an UPDATE policy so authenticated participants can
--     write last_read_*_at from server actions.
--  3. One-time backfill: set last_message_at from the newest
--     existing message for every conversation that still has
--     a null last_message_at.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- 1. fix trigger function ----------
create or replace function public.bump_conversation_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

-- Recreate the trigger (function replacement is not enough on its own).
drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message_at();

-- ---------- 2. UPDATE policy for participants ----------
drop policy if exists "conversations: update as participant" on public.conversations;
create policy "conversations: update as participant"
  on public.conversations for update
  using  (auth.uid() in (buyer_id, seller_id))
  with check (auth.uid() in (buyer_id, seller_id));

-- ---------- 3. backfill existing rows ----------
update public.conversations c
set last_message_at = m.latest_at
from (
  select conversation_id, max(created_at) as latest_at
    from public.messages
   group by conversation_id
) m
where c.id = m.conversation_id
  and c.last_message_at is null;
