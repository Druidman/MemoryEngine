-- Ready

create table sessions (
  id uuid not null primary key default gen_random_uuid(),
  container_id uuid not null references public.containers(id) on delete cascade on update cascade,

  created_at timestamp with time zone not null default now()
);

GRANT ALL ON public.sessions TO service_role;
GRANT select ON public.sessions TO authenticated;
GRANT insert(container_id) ON public.sessions TO authenticated;
GRANT delete ON public.sessions TO authenticated;

create policy "sessions - user can view his sessions"
on public.sessions
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "sessions - user can insert his sessions"
on public.sessions
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "sessions - user can delete his sessions"
on public.sessions
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);