create or replace function merge_entities() returns void
language plpgsql
security definer
set search_path='public'
as $$
begin
end;
$$;

-- just in case
revoke execute on function merge_entities from authenticated;