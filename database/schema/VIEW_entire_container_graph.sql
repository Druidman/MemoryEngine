create or replace view entire_container_graph with (security_invoker=true) as 
SELECT 
  *,
  (SELECT json_agg(e)::jsonb FROM public.entities e WHERE e.container_id=c.id) as entities,
  (
    SELECT json_agg(r)::jsonb FROM public.relations r 
    -- yeah ikik
    WHERE exists(
      SELECT 1 from public.entities e_r 
      where e_r.id=subject_id and e_r.container_id = c.id
    ) OR exists(
      SELECT 1 from public.entities e_r 
      where e_r.id=object_id and e_r.container_id = c.id
    )
  ) as relations
FROM 
  public.containers c
LIMIT 1; -- Using assumption of single container per user