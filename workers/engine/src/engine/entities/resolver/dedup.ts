import { MappedExtractedEntityRelationType, MappedExtractedEntityRelationWithMentionsType, MappedExtractedEntityType, MappedExtractedEntityWithMentionsType } from "../../pipeline";

export function deduplicateEntitiesInExtractionScope(
  mappedExtractedEntities: MappedExtractedEntityType[],
): MappedExtractedEntityWithMentionsType[] {
  // key is canon_name + type
  const entities: { [x in string]: MappedExtractedEntityWithMentionsType } = {};

  mappedExtractedEntities.forEach((entity) => {
    const idName = entity.canonical_name + entity.type;

    if (idName in entities) {
      // key exists
      // we need to merge it
      entities[idName] = mergeEntityWithMention(entities[idName], entity);
    } else {
      // add new entry
      const {canonical_name, type, ...mention} = entity
      entities[idName] = {
        ...entity,
        mentions: [mention],
      };
    }
  });

  return Object.values(entities);
}

export function deduplicateRelationsInExtractionScope(
  extractedRelations: MappedExtractedEntityRelationType[],
) : MappedExtractedEntityRelationWithMentionsType[] {
  // Since these functions are handling direct duplicates we will skip this implementation as it is VERY uncommon to happen
  // What is common to happen is indirect duplicate however we will not be handling that here
  return extractedRelations.flatMap((relation) => ({
    ...relation,
    memory_id: relation.memory_id,
    mentions: []
  }));
}


// TWEAKABLE MERGER FORMULA. USED ONLY FOR LOCAL MERGES (CURRENTLY NOT EVEN USED)
// [REDUNDANT]
function mergeEntityWithMention(
  baseEntity: MappedExtractedEntityWithMentionsType,
  candidate: MappedExtractedEntityType,
) {
  const mergedEntity = baseEntity;
  // merge two results
  // - append new aliases
  // - append new properties
  // - calculate new confidence

  // Append new aliases
  candidate.aliases.forEach((alias) => {
    if (mergedEntity.aliases.find((val) => val === alias)) {
      return; // skip
    }
    mergedEntity.aliases.push(alias);
  });

  // Append new properties
  if (mergedEntity?.properties) {
    Object.keys(candidate?.properties ?? {}).forEach((key) => {
      if (key in mergedEntity.properties!) {
        // Confidence check
        if (mergedEntity.confidence < candidate.confidence) {
          mergedEntity.properties![key] = candidate.properties![key];
        }
      } else {
        mergedEntity.properties![key] = candidate.properties![key];
      }
    });
  } else {
    mergedEntity.properties = candidate.properties;
  }

  // Calculate new confidence
  // Formula: 1 - SOP[ 1 - i_c ]
  // Sum of product
  // Xd
  const confidence =
    1 -
    [...baseEntity.mentions, candidate].reduce((total, curr) => {
      return total * (1 - curr.confidence);
    }, 1);

  mergedEntity.confidence = confidence;

  return mergedEntity;
}