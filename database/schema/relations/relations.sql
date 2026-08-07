-- Ready
create table relations (
  id uuid primary key default gen_random_uuid(),

  -- From
  subject_id uuid references public.entities(id) on delete set null on update cascade,
  -- To
  object_id uuid references public.entities(id) on delete set null on update cascade,

  -- Assignment
  container_id uuid references public.containers(id) on delete cascade on update cascade,

  -- Memory this relation was taken from
  memory_id uuid references public.memories(id) on delete set null on update cascade,
  

  

  -- New edge that defines current (newest) state of relationship 
  superseedes uuid references public.relations(id) on delete set null on update cascade,

  -- Actual relationship.
  -- !! subject_id -> object_id form !!
  relation text not null,

  -- Confidence about relationship
  confidence float not null,

  -- Metadata, But created_at is actually cruicial xD
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint relations_check_entities check (
    subject_id <> object_id
  ),
  constraint relations_confidence check (
    confidence <= 1 AND confidence > 0
  )

);

GRANT ALL ON public.relations TO service_role;

GRANT SELECT on public.relations to authenticated;
GRANT DELETE on public.relations to authenticated;
GRANT UPDATE(superseedes, confidence, updated_at) on public.relations to authenticated;
GRANT INSERT(subject_id, object_id, container_id, relation, memory_id, superseedes, confidence) on public.relations to authenticated;

create policy "relations - user can select his relations"
on public.relations
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "relations - user can delete his relations"
on public.relations
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "relations - user can insert his relations"
on public.relations
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=container_id and c.owner_id=auth.uid()
  )
);

create policy "relations - user can update his relations"
on public.relations
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