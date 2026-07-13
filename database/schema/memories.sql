-- MEMORIES TABLE IS APPEND ONLY:
-- - no data loss
-- - backtracking (how data changed over time)

create table memories (
  id uuid primary key default gen_random_uuid(),
  container_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone not null default now()
);