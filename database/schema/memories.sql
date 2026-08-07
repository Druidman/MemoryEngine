-- Ready

-- MEMORIES TABLE IS APPEND ONLY:
-- - no data loss
-- - backtracking (how data changed over time)

create table memories (
  id uuid primary key default gen_random_uuid(),

  session_id uuid references public.sessions(id) on update cascade on delete set null,
  -- normalization
  container_id uuid not null references public.containers(id) on update cascade on delete cascade,

  content text not null,
  type text not null,
  confidence float not null,
  metadata_hints jsonb,
  
  embedding extensions.vector(1024),
  embedding_model varchar(500),
  
  created_at timestamp with time zone not null default now()
);

GRANT ALL ON public.memories TO service_role;

GRANT SELECT on public.memories to authenticated;
GRANT INSERT(session_id, container_id, content, type, confidence, metadata_hints, embedding, embedding_model) on public.memories to authenticated;
-- No update since append only
GRANT delete on public.memories to authenticated;

create policy "memories - user can view his memories"
on public.memories
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "memories - user can delete his memories"
on public.memories
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "memories - user can insert his memories"
on public.memories
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);