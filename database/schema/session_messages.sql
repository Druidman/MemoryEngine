-- Ready
create table session_messages (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on update cascade on delete cascade,
  payload jsonb not null, -- OpenApi compatible message json payload
  created_at timestamp with time zone not null default now()
);
create index order_by_created_by_idx on public.session_messages(created_at DESC);

GRANT ALL ON public.session_messages TO service_role;
GRANT SELECT on public.session_messages to authenticated;
GRANT INSERT(session_id, payload) on public.session_messages to authenticated;
GRANT delete on public.session_messages to authenticated;

create policy "session_messages - user can view his messages"
on public.session_messages
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT s.container_id from public.sessions s where s.id=session_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "session_messages - user can delete his messages"
on public.session_messages
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT s.container_id from public.sessions s where s.id=session_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "session_messages - user can insert his messages"
on public.session_messages
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT s.container_id from public.sessions s where s.id=session_id
    ) and c.owner_id=auth.uid()
  )
);
