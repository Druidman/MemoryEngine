create or replace function get_matching_id_for_relation(
  p_relation_relation text,
  p_relation_subject_id uuid,
  p_relation_object_id uuid
) returns uuid
language sql
security invoker
set search_path='public'
as $$
SELECT 
  e.id
from public.edges e where
e.relation = p_relation_relation
and
e.subject_id = p_relation_subject_id
and
e.object_id = p_relation_object_id
limit 1
$$;
grant execute on function public.get_matching_id_for_relation to service_role;