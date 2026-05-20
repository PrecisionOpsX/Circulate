-- ============================================================
-- Circulate, Milestone 4: Messaging + Ratings.
--
-- Adds the moving parts on top of the M1 schema (which already has the
-- conversations, messages, blocks and ratings tables):
--
--   * Realtime publication on public.messages so the chat thread can
--     subscribe to INSERTs filtered by conversation_id.
--   * conversations.last_message_at + last_read_buyer_at +
--     last_read_seller_at, kept in sync by a trigger on messages.
--   * profiles.rating_avg + rating_count, denormalised from ratings via
--     a trigger so profile cards never need a join + aggregate.
--
-- Idempotent.
-- ============================================================

-- ---------- conversations metadata ----------
alter table public.conversations
  add column if not exists last_message_at      timestamptz,
  add column if not exists last_read_buyer_at   timestamptz,
  add column if not exists last_read_seller_at  timestamptz;

create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc nulls last);

-- ---------- profiles rating denorm ----------
alter table public.profiles
  add column if not exists rating_avg   numeric(3, 2) not null default 0,
  add column if not exists rating_count integer       not null default 0;

-- ============================================================
-- Trigger: bump conversations.last_message_at on every new message,
-- so the inbox list can order by recent activity in one query.
-- ============================================================
create or replace function public.bump_conversation_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message_at();

-- ============================================================
-- Trigger: keep profiles.rating_avg + rating_count in sync with the
-- ratings table. Runs on insert/update/delete so any change to the
-- rater's score immediately reflects on the ratee's profile.
-- ============================================================
create or replace function public.refresh_profile_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_avg    numeric;
  v_count  integer;
begin
  v_target := coalesce(new.ratee_id, old.ratee_id);
  if v_target is null then return null; end if;

  select avg(stars)::numeric(3, 2), count(*)
    into v_avg, v_count
    from public.ratings
    where ratee_id = v_target;

  update public.profiles
    set rating_avg   = coalesce(v_avg, 0),
        rating_count = coalesce(v_count, 0)
    where id = v_target;

  return null;
end;
$$;

drop trigger if exists ratings_refresh_profile_stats on public.ratings;
create trigger ratings_refresh_profile_stats
  after insert or update or delete on public.ratings
  for each row execute function public.refresh_profile_rating_stats();

-- ============================================================
-- Realtime publication: the messages table needs to be in the
-- `supabase_realtime` publication so the client can subscribe to new
-- messages via supabase.channel().on('postgres_changes', ...). RLS on
-- messages still applies, so subscribers only get rows they could
-- SELECT.
-- ============================================================
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
