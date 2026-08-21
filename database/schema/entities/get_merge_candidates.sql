create or replace function get_merge_candidates(p_container_id uuid) returns jsonb
language sql
security invoker
set search_path='public'
as $$
declare
    
begin
with awaiting_candidates as
(
    select 
        (
            select array_agg(e2.*) from public.entities e2 where 
            e2.container_id=e.container_id
            and e2.status='awaiting_merge' limit 10
        ) as entities,
        ac.container_id as container_id
    from public.entities e group by e.container_id;
), candidates as (
    select 
        (
            -- we need to perform entire container scan for given entity
            select 
                case
                    when 
                    (
                        select similarity from (
                            select 
                                (1 - (e2.embedding <=> e.embedding)) as similarity
                            from entities e2 order by similarity desc limit 1
                        )
                    ) >= 0.85 then e
                else NULL
                end 
            from unnest(ac.entities) as e 
        )
    from awaiting_candidates ac
);
end;
$$;