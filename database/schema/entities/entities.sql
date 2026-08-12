-- Ready
create table entities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  type text not null,
  confidence float not null,
  aliases text[] not null default ARRAY[]::text[],
  properties jsonb,

  embedding extensions.vector(1024),
  embedding_model varchar(500),

  -- Assignment
  container_id uuid not null references public.containers(id) on update cascade on delete cascade,

  -- Merger ran on this entity
  attempted_merge_at timestamp with time zone default null,
  status text not null default 'awaiting_merge',
  

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint entities_confidence check (
    confidence > 0 AND confidence <= 1
  ),

  constraint status_constraint check (
    (status = 'awaiting_merge') OR
    (status = 'queued_for_merge') OR
    (status = 'ingested')
  )
);

GRANT ALL ON public.entities TO service_role;
GRANT SELECT on public.entities to authenticated;
GRANT DELETE on public.entities to authenticated;
GRANT UPDATE(canonical_name, type, confidence, aliases, properties, embedding, embedding_model, updated_at) on public.entities to authenticated;
GRANT INSERT(canonical_name, type, confidence, aliases, properties, embedding, embedding_model, container_id) on public.entities to authenticated;

create policy "entities - user can select his entities"
on public.entities
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);
create policy "entities - user can insert his entities"
on public.entities
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "entities - user can delete his entities"
on public.entities
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "entities - user can update his entities"
on public.entities
as permissive
for update
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
)
with check (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

