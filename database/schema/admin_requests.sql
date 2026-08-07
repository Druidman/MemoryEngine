create table admin_requests (
  id uuid primary key not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on update cascade on delete cascade default auth.uid(),
  message text,
  requested_at timestamp with time zone not null default now()
);
grant all on public.admin_requests to service_role;

grant select on public.admin_requests to authenticated;
grant delete on public.admin_requests to authenticated;
grant insert(message) on public.admin_requests to authenticated;

create policy "admin_requests - user can view his requests"
on public.admin_requests
as permissive
for select
to authenticated
using (
  user_id=auth.uid()
);

create policy "admin_requests - user can delete his requests"
on public.admin_requests
as permissive
for delete
to authenticated
using (
  user_id=auth.uid()
);


create policy "admin_requests - user can insert his requests"
on public.admin_requests
as permissive
for insert
to authenticated
with check (
  user_id=auth.uid()
);