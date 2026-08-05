
create table admin_users (
  user_id uuid primary key not null references auth.users(id) on update cascade on delete cascade default auth.uid(),
  created_at timestamp with time zone not null default now(),
);