create table edges (
  id uuid primary key default gen_random_uuid(),

  -- RETHINK `on delete` case
  from_id uuid references public.entities(id) on delete set null on update cascade,
  to_id uuid references public.entities(id) on delete set null on update cascade,

  -- Memory this relation was taken from
  memory_id uuid references public.memories(id) on delete set null on update cascade,

  -- New edge that defines current (newest) state of relationship 
  superseeded_by uuid references public.edges(id) on delete set null on update cascade,

  -- Actual relationship.
  -- !! FROM_ID -> TO_ID form !!
  type text not null,

  -- Metadata
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint edges_check_entities with check (
    from_id <> to_id
  ),

);