import z from "zod";
import { ExtractedEntityRelationSchema, ExtractedEntitySchema } from "../../../openrouter/callEntityExtractor";

export const ExtractedEntityWithMemoryIdSchema = ExtractedEntitySchema.extend({
  memory_id: z.uuid(),
});
export const ExtractedEntityRelationWithMemoryIdSchema =
  ExtractedEntityRelationSchema.extend({
    memory_id: z.uuid(),
  });
export const MappedExtractedEntitySchema =
  ExtractedEntityWithMemoryIdSchema.extend({
    local_id: z.uuid(),
  });

export const MappedExtractedEntityRelationSchema =
  ExtractedEntityRelationWithMemoryIdSchema.extend({
    local_id: z.uuid(),
  })
    .omit({
      object: true,
      subject: true,
    })
    .extend({
      local_subject_id: z.uuid(),
      local_object_id: z.uuid(),
    });
export const MappedMemoryEntitiesWithRelationsSchema = z.object({
  entities: MappedExtractedEntitySchema.array(),
  relations: MappedExtractedEntityRelationSchema.array(),
});
export const MappedExtractedEntityMentionSchema = MappedExtractedEntitySchema.omit({
  type: true,
  canonical_name: true,
})
export const MappedExtractedEntityWithMentionsSchema =
  MappedExtractedEntitySchema.extend({
    mentions: MappedExtractedEntityMentionSchema.array(),
  });
export const MappedExtractedEntityWithMentionsAndRefSchema =
  MappedExtractedEntityWithMentionsSchema.extend({
    ref_id: z.uuid().optional(), // id of reference entity from database
    is_new: z.boolean().default(false)
  });
export const MappedExtractedEntityRelationWithMentionsSchema =
  MappedExtractedEntityRelationSchema.extend({
    mentions: MappedExtractedEntityRelationSchema.omit({
      local_subject_id: true,
      local_object_id: true,
      relation: true
    }).array(),
  });
export const MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema = 
  MappedExtractedEntityRelationWithMentionsSchema.extend({
    subject_ref_id: z.uuid().optional(),
    object_ref_id: z.uuid().optional()
  })
export const MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefSchema =
  MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema.extend({
    ref_id: z.uuid().optional(), // id of reference relation from database
  });

export const MappedExtractedEntityWithMentionsAndEnsuredRefSchema = MappedExtractedEntityWithMentionsAndRefSchema
  .omit({
    ref_id: true
  }).extend({
    is_new: z.boolean(),
    ref_id: z.uuid() // non optional
  })
// TYPES
export type ExtractedEntityWithMemoryIdType = z.infer<
  typeof ExtractedEntityWithMemoryIdSchema
>;
export type ExtractedEntityRelationWithMemoryIdType = z.infer<
  typeof ExtractedEntityRelationWithMemoryIdSchema
>;
export type MappedExtractedEntityType = z.infer<
  typeof MappedExtractedEntitySchema
>;
export type MappedExtractedEntityRelationType = z.infer<
  typeof MappedExtractedEntityRelationSchema
>;
export type MappedMemoryEntitiesWithRelationsType = z.infer<
  typeof MappedMemoryEntitiesWithRelationsSchema
>;
export type MappedExtractedEntityMentionType = z.infer<typeof MappedExtractedEntityMentionSchema>

export type MappedExtractedEntityWithMentionsType = z.infer<
  typeof MappedExtractedEntityWithMentionsSchema
>;

export type MappedExtractedEntityWithMentionsAndRefType = z.infer<
  typeof MappedExtractedEntityWithMentionsAndRefSchema
>;

export type MappedExtractedEntityRelationWithMentionsType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsSchema
>;

export type MappedExtractedEntityRelationWithMentionsAndExternalIdsType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsAndExternalIdsSchema
>;

export type MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefType = z.infer<
  typeof MappedExtractedEntityRelationWithMentionsAndExternalIdsAndRefSchema
>;

export type MappedExtractedEntityWithMentionsAndEnsuredRefType = z.infer<
  typeof MappedExtractedEntityWithMentionsAndEnsuredRefSchema
>;