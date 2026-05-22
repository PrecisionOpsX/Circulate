-- ============================================================
-- Circulate, Milestone 5: per-message read tracking.
--
-- Adds a `viewed` boolean to `messages`. A message starts as
-- unread (viewed = false) and is flipped to true when the
-- recipient opens the conversation thread.
--
-- Unread counts are now derived directly from this column,
-- removing all dependency on the conversations timestamp columns
-- (last_message_at, last_read_buyer_at, last_read_seller_at)
-- which were unreliable due to an RLS gap.
--
-- RLS policy: only the recipient (the participant who is NOT the
-- sender) may flip viewed from false to true. The WITH CHECK
-- prevents setting it back to false.
--
-- Idempotent: safe to re-run.
-- ============================================================

alter table public.messages
  add column if not exists viewed boolean not null default false;

-- Partial index: makes "find unread messages" fast.
create index if not exists messages_unread_idx
  on public.messages (conversation_id)
  where viewed = false;

-- RLS: recipients can mark messages as viewed.
drop policy if exists "messages: mark viewed" on public.messages;
create policy "messages: mark viewed"
  on public.messages for update
  using (
    -- only the non-sender may update
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  )
  with check (
    -- can only set viewed = true, never revert to false
    viewed = true
  );
