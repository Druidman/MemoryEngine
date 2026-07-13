create table entities (
  id uuid primary key default gen_random_uuid(),
  container_id uuid references auth.users(id) on delete cascade not null,

  canonical_name text not null,
  aliases text[] not null default ARRAY[]::text[],
  embedding vector(1024) not null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);