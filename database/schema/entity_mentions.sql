create table entity_mentions (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade on update cascade,
  -- TODO
)
