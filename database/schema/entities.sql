create table entities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  entity_type text not null,
  confidence float not null,
  aliases text[] not null default ARRAY[]::text[],
  embedding vector(1024) not null,
  container_id uuid not null references public.containers(id) on update cascade on delete cascade,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT INSERT ON public.entities TO service_role;