create or replace function get_merge_candidates(p_container_id uuid) returns jsonb
language plpgsql
security invoker
set search_path='public'
as $$
declare
    
begin
with selected_entities as (
    select * from entities e where e.status='awaiting_for_merge' and e.container_id=p_container_id limit 100
), candidates as (
    select *, as similarity
)

end;
$$;