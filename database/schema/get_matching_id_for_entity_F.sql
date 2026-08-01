create or replace function get_matching_id_for_entity(
  p_entity_type text,
  p_entity_aliases text[],
  p_entity_canonical_name text
) returns uuid
language sql
security invoker
set search_path='public'
as $$
SELECT 
  e.id
from public.entities e where
e.type = p_entity_type
and
(
  e.canonical_name = p_entity_canonical_name
  or
  p_entity_aliases && e.aliases
  or 
  p_entity_canonical_name = any(e.aliases)
  or 
  e.canonical_name = any(p_entity_aliases)
)
limit 1
$$;
grant execute on function public.get_matching_id_for_entity to service_role;