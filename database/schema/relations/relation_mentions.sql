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