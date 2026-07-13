-- MEMORIES TABLE IS APPEND ONLY:
-- - no data loss
-- - backtracking (how data changed over time)

create table memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamp with time zone not null default now()
);

GRANT INSERT ON public.memories TO service_role;