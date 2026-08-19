create or replace function update_entities_status(p_entities jsonb[]) returns void
language sql
security invoker
set search_path='public'
as $$

        UPDATE public.entities set 
            status=e->>'status'
        FROM unnest(p_entities) as e
        where id=(e->>'id')::uuid

$$;