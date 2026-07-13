create table entities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  entity_type text not null,
  confidence float not null,
  aliases text[] not null default ARRAY[]::text[],
  embedding vector(1024) not null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);