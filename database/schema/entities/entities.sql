-- Ready
create table entities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  type text not null,
  confidence float not null,
  aliases text[] not null default ARRAY[]::text[],
  properties jsonb,

  embedding extensions.vector(1024),

  container_id uuid not null references public.containers(id) on update cascade on delete cascade,
  

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint entities_confidence check (
    confidence > 0 AND confidence <= 1
  )
);

GRANT ALL ON public.entities TO service_role;