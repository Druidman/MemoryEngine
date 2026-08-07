create table relation_mentions (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid references public.relations(id) on delete cascade on update cascade,
  memory_id uuid references public.memories(id) on delete set null on update cascade,

  confidence float not null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint relation_mentions_confidence check (
    confidence <= 1 AND confidence > 0
  )
);

GRANT ALL ON public.relation_mentions TO service_role;
GRANT SELECT on public.relation_mentions to authenticated;
GRANT DELETE on public.relation_mentions to authenticated;
-- Sma ehere as with entity_mentiosn:
-- ~~ Imo this should be insert/delete only but idk. Lets leave it on i/d ~~
-- GRANT UPDATE(memory_id, confidence, aliases, properties) on public.entity_mentions to authenticated;
GRANT INSERT(memory_id, relation_id, confidence) on public.relation_mentions to authenticated;

create policy "relation_mentions - user can view his mentions"
on public.relation_mentions
as permissive
for select
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT r.container_id from public.relations r where r.id=relation_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "relation_mentions - user can delete his mentions"
on public.relation_mentions
as permissive
for delete
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT r.container_id from public.relations r where r.id=relation_id
    ) and c.owner_id=auth.uid()
  )
);

create policy "relation_mentions - user can insert his mentions"
on public.relation_mentions
as permissive
for insert
to authenticated
with check (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT r.container_id from public.relations r where r.id=relation_id
    ) and c.owner_id=auth.uid()
  )
);


create policy "relation_mentions - user can update his mentions"
on public.relation_mentions
as permissive
for update
to authenticated
using (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT r.container_id from public.relations r where r.id=relation_id
    ) and c.owner_id=auth.uid()
  )
)
with check (
  exists (
    SELECT 1 from public.containers c where c.id=(
      SELECT r.container_id from public.relations r where r.id=relation_id
    ) and c.owner_id=auth.uid()
  )
);