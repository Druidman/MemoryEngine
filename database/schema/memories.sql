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