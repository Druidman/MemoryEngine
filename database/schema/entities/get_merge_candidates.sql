-- p1 which means pass-1 because our full merger has 2 passes

create or replace function get_merge_candidates_p1(p_container_id uuid) returns public.entities
language sql
security invoker
set search_path='public, extensions'
as $$
with awaiting_candidates as
(
    select 
        (
            select array_agg(e2.*) from public.entities e2 where 
            e2.container_id=e.container_id
            and e2.status='awaiting_merge' limit 10
        ) as entities,
        e.container_id as container_id
    from public.entities e group by e.container_id
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
                                (1 - (e2.embedding OPERATOR(extensions.<=>) e.embedding)) as similarity
                            from public.entities e2 order by similarity desc limit 1
                        )
                    -- HARDCODED (TWEAKABLE)
                    ) >= 0.85 then e
                else NULL
                end 
            from unnest(ac.entities) as e 
        )
    from awaiting_candidates ac
) select * from candidates
$$;