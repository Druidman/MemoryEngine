import { Entity } from "./database/entities";
import { createSupabaseServiceClient } from "./database/supabaseServiceClient";

export async function handleEntitiesMerge(entities: Entity[]){
    const {error, count} = await createSupabaseServiceClient()
        .from('entities')
        .select(undefined,{count: 'exact'})
        .eq('status', 'queued_for_merge')
        .in('id', entities.map((entity)=>entity.id))

    if (error) throw error

    if (count != entities.length)
        throw new Error('entities from db and entities provided array lengths don`t match. This means that either some entities don`t exist or don`t have `queued_for_merge` status')



    // now after verifying the data we can move onto actual merging schematics


}