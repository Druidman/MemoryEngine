-- Ready

create table sessions (
  id uuid not null primary key default gen_random_uuid(),
  container_id uuid not null references public.containers(id) on delete cascade on update cascade,

  created_at timestamp with time zone not null default now()
);
GRANT ALL ON public.sessions TO service_role;