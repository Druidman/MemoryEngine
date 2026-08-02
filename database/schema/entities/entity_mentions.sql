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