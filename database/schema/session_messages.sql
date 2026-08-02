-- Ready
create table session_messages (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on update cascade on delete cascade,
  payload jsonb not null, -- OpenApi compatible message json payload
  created_at timestamp with time zone not null default now()
);
GRANT ALL ON public.session_messages TO service_role;

create index order_by_created_by_idx on public.session_messages(created_at DESC);