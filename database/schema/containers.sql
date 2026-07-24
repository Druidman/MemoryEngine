create table containers (
  id uuid primary key default gen_random_uuid(),

  tag varchar(500) not null,
  owner_id uuid not null references auth.users(id) on update cascade on delete cascade default auth.uid(),
  
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()

);

GRANT ALL ON public.containers TO service_role;
