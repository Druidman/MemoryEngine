import { logExtractionPipeline } from '../../logger/log';
import {
	MappedExtractedEntityRelationType,
	MappedExtractedEntityRelationWithMentionsType,
	MappedExtractedEntityType,
	MappedExtractedEntityWithMentionsType,
} from './types';

export function deduplicateEntitiesInExtractionScope(
	mappedExtractedEntities: MappedExtractedEntityType[],
	mappedRelations: MappedExtractedEntityRelationType[],
): { deduplicatedEntities: MappedExtractedEntityWithMentionsType[]; mappedRelationsWithUpdatedIds: MappedExtractedEntityRelationType[] } {
	// key is canon_name + type
	const entities: { [x in string]: MappedExtractedEntityWithMentionsType } = {};
	// id is key here though
	const entitiesById: { [x in string]: MappedExtractedEntityType } = {};

	mappedExtractedEntities.forEach((entity) => {
		entitiesById[entity.local_id] = entity;

		const mergeIdName = entity.canonical_name + entity.type;

		if (mergeIdName in entities) {
			// key exists
			// we need to merge it
			entities[mergeIdName] = mergeEntityWithMention(entities[mergeIdName], entity);

			// ! id change appeared !
			// Now that it is merged we need to replace old id with new base one
			const foundIndexes = mappedRelations.flatMap(
				(relation, i) => {
					if (relation.local_subject_id == entity.local_id || relation.local_object_id == entity.local_id){
						return [i]
					}
					return []
				}
			);
			foundIndexes.forEach((i)=>{
				if (mappedRelations[i].local_subject_id == entity.local_id) {
					mappedRelations[i].local_subject_id = entities[mergeIdName].local_id;
				} else if (mappedRelations[i].local_object_id == entity.local_id) {
					mappedRelations[i].local_object_id = entities[mergeIdName].local_id;
				} else {
          const message = 'Index finding by local id reference is implemented incorrectly!'
          logExtractionPipeline('[deduplicateEntitiesInExtractionScope]', message)
          throw new Error(message)
        }
			})

		} else {
			// add new entry
			const { canonical_name, type, ...mention } = entity;

			entities[mergeIdName] = {
				...entity,
				mentions: [mention],
			};

			// here no id change appears so we chill
		}
	});
	// check
	mappedRelations.forEach((relation) => {
    const foundSubject = relation?.local_subject_id in entitiesById
    const foundObject = relation?.local_object_id in entitiesById
		if (!foundSubject || !foundObject) {
      const message = !foundObject ? 'object not found for relation' : 'subject not found for relation'
			logExtractionPipeline('[deduplicateEntitiesInExtractionScope]', message, relation, entities);
      throw new Error(message)
    }
		
	});
	return { deduplicatedEntities: Object.values(entities), mappedRelationsWithUpdatedIds: mappedRelations };
}

export function deduplicateRelationsInExtractionScope(
	extractedRelations: MappedExtractedEntityRelationType[],
): MappedExtractedEntityRelationWithMentionsType[] {
	// Since these functions are handling direct duplicates we will skip this implementation as it is VERY uncommon to happen
	// What is common to happen is indirect duplicate however we will not be handling that here
	return extractedRelations.flatMap((relation) => ({
		...relation,
		mentions: [],
	}));
}

// TWEAKABLE MERGER FORMULA. USED ONLY FOR LOCAL MERGES (CURRENTLY NOT EVEN USED)
// [REDUNDANT]
function mergeEntityWithMention(baseEntity: MappedExtractedEntityWithMentionsType, candidate: MappedExtractedEntityType) {
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
	const { canonical_name, type, ...mention } = candidate;
	mergedEntity.mentions.push(mention)
	return mergedEntity
}
