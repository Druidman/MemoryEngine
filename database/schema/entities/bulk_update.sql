create or replace function update_entities_embeddings(p_entities jsonb[]) returns void
language sql
security invoker
set search_path='public'
as $$

        UPDATE public.entities set 
            embedding=(
                SELECT ARRAY(
                    SELECT jsonb_array_elements_text(e->'embedding')::float
                )
            ), 
            embedding_model=(e->>'embedding_model')::text 
        FROM unnest(p_entities) as e
        where id=(e->>'id')::uuid

$$;