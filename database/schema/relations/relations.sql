-- Ready
create table relations (
  id uuid primary key default gen_random_uuid(),

  -- From
  subject_id uuid references public.entities(id) on delete set null on update cascade,
  -- To
  object_id uuid references public.entities(id) on delete set null on update cascade,

  -- Memory this relation was taken from
  memory_id uuid references public.memories(id) on delete set null on update cascade,

  -- New edge that defines current (newest) state of relationship 
  superseededes uuid references public.edges(id) on delete set null on update cascade,

  -- Actual relationship.
  -- !! subject_id -> object_id form !!
  relation text not null,

  -- Confidence about relationship
  confidence float not null,

  -- Metadata, But created_at is actually cruicial xD
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint edges_check_entities check (
    subject_id <> object_id
  )

);

GRANT ALL ON public.edges TO service_role;