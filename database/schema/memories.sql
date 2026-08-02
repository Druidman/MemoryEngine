-- Ready

-- MEMORIES TABLE IS APPEND ONLY:
-- - no data loss
-- - backtracking (how data changed over time)

create table memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  type text,
  confidence float,
  metadata_hints jsonb,
  session_id uuid references public.sessions(id) on update cascade on delete set null,
  container_id uuid not null references public.containers(id) on update cascade on delete cascade,
  created_at timestamp with time zone not null default now()
);

GRANT ALL ON public.memories TO service_role;