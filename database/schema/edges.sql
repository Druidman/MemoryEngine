create table edges (
  id uuid primary key default gen_random_uuid(),

  -- RETHINK `on delete` case
  subject_id uuid references public.entities(id) on delete set null on update cascade,
  object_id uuid references public.entities(id) on delete set null on update cascade,

  -- Memory this relation was taken from
  memory_id uuid references public.memories(id) on delete set null on update cascade,

  -- New edge that defines current (newest) state of relationship 
  superseeded_by uuid references public.edges(id) on delete set null on update cascade,

  -- Actual relationship.
  -- !! subject_id -> object_id form !!
  relation text not null,
  -- Confidence about relationship
  confidence float not null,

  -- Was relationship a fact or constructed with conversation context
  implicit boolean not null,

  -- Metadata
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint edges_check_entities check (
    subject_id <> object_id
  )

);

GRANT INSERT ON public.edges TO service_role;