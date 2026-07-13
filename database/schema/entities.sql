create table entities (
  id uuid primary key default gen_random_uuid(),
  container_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references public.entities(id) on delete cascade not null,

  canonical_name text
);