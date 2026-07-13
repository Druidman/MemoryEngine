create table containers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  label text,
  created_at timestamp with time zone not null default now(),

  unique(owner_id, label)
);