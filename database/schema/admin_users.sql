create table admin_users (
  user_id uuid primary key not null references auth.users(id) on update cascade on delete cascade default auth.uid(),
  created_at timestamp with time zone not null default now()
);
grant all on public.admin_users to service_role;

grant select on public.admin_users to authenticated;

create policy "admin_users - user can view himself"
on public.admin_users
as permissive
for select
to authenticated
using (
  user_id=auth.uid()
);