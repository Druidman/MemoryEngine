-- Ready
create table entity_mentions (
  id uuid primary key default gen_random_uuid(),
  -- What memory it came from
  memory_id uuid references public.memories(id) on delete set null on update cascade,

  -- What is it mentioning
  entity_id uuid not null references public.entities(id) on delete cascade on update cascade,

  -- Properties of a mention
  confidence float not null ,
  aliases text[] not null ,
  properties jsonb,

  constraint entity_mentions_confidence check (
    confidence > 0 AND confidence <= 1
  )
);

GRANT ALL ON public.entity_mentions TO service_role;
GRANT SELECT on public.entity_mentions to authenticated;
GRANT DELETE on public.entity_mentions to authenticated;
-- Imo this should be insert/delete only but idk. Lets leave it on i/d
-- GRANT UPDATE(memory_id, confidence, aliases, properties) on public.entity_mentions to authenticated;
GRANT INSERT(memory_id, entity_id, confidence, aliases, properties) on public.entity_mentions to authenticated;

create policy "entity_mentions - user can view his mentions"
on public.entity_mentions
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT e.container_id from public.entities e where e.id=entity_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "entity_mentions - user can delete his mentions"
on public.entity_mentions
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT e.container_id from public.entities e where e.id=entity_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "entity_mentions - user can insert his mentions"
on public.entity_mentions
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT e.container_id from public.entities e where e.id=entity_id
    ) and c.owner_id=auth.uid()
  )
);

-- Leave rls though because this will be still prohibited via cls and I will
-- Probably forget to later add this xD
create policy "entity_mentions - user can update his mentions"
on public.entity_mentions
as permissive
for update
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT e.container_id from public.entities e where e.id=entity_id
    ) and c.owner_id=auth.uid()
  )
)
with check (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT e.container_id from public.entities e where e.id=entity_id
    ) and c.owner_id=auth.uid()
  )
);