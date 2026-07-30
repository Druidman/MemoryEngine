create table entities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  type text not null,
  confidence float not null,
  
  aliases text[] not null default ARRAY[]::text[],
  embedding extensions.vector(1024),

  container_id uuid not null references public.containers(id) on update cascade on delete cascade,
  session_id uuid references public.sessions(id) on update cascade on delete set null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT ALL ON public.entities TO service_role;