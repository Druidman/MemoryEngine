-- Ready
create table containers (
  id uuid primary key default gen_random_uuid(),

  tag varchar(500) not null,
  owner_id uuid not null references auth.users(id) on update cascade on delete cascade default auth.uid(),
  
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()

);

GRANT ALL ON public.containers TO service_role;

GRANT select ON public.containers TO authenticated;
GRANT insert(tag) ON public.containers TO authenticated;
GRANT update(tag, updated_at) ON public.containers TO authenticated;
GRANT delete ON public.sessions TO authenticated;

create policy "containers - user can view his assets"
on public.containers
as permissive
for select
to authenticated
using (
  owner_id=auth.uid()
);

create policy "containers - user can update his assets"
on public.containers
as permissive
for update
to authenticated
using (
  owner_id=auth.uid()
) with check (
  owner_id=auth.uid()
);

create policy "containers - user can insert his assets"
on public.containers
as permissive
for insert
to authenticated
with check (
  owner_id=auth.uid()
);

create policy "containers - user can delete his assets"
on public.containers
as permissive
for delete
to authenticated
using (
  owner_id=auth.uid()
);



create or replace function auto_insert_user_entity() returns trigger
language plpgsql
security definer -- to bypass rls
set search_path='public'
as $$
begin
  INSERT INTO public.entities (
    canonical_name,
    type,
    confidence,
    container_id
  ) VALUES (
    'user',
    'USER',
    1,
    NEW.id
  );
  return NEW;
end;
$$;

create trigger auto_insert_user_entity_trg after insert on public.containers 
for each row execute function auto_insert_user_entity();