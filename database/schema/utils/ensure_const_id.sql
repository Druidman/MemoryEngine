create or replace function ensure_const_id() returns trigger
language plpgsql
security definer 
set search_path='public'
as $$
begin
IF NEW.id <> OLD.id then
    raise exception 'Id change is prohibited';
END IF;
return NEW;
end;
$$;
GRANT EXECUTE ON function public.ensure_const_id to service_role, authenticated;