create or replace view session_data with (security_invoker=true) as 
SELECT
  s.*,
  coalesce((
    SELECT json_agg(sm)::jsonb from session_messages sm where sm.session_id = s.id
  ), '[]'::jsonb) as messages
from  
  public.sessions s;

GRANT SELECT on public.session_data to service_role, authenticated;