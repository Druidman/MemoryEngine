import { ExtractedEntityType } from "../../../openrouter/callEntityExtractor";
import { EntityExtractorResultWithMemoryIdType } from "../../pipeline";
import { logExtractionPipeline } from "../../logger/log";

export function checkForDuplicatesInMemoryScope(
  extractionResult: EntityExtractorResultWithMemoryIdType[],
) {
  extractionResult.forEach((singleResult) => {
    const entityMap: Record<string, ExtractedEntityType> = {};

    singleResult.entities.forEach((entity) => {
      const found = Object.keys(entityMap).find(
        (val) => val == entity.canonical_name + entity.type,
      );
      if (found) {
        logExtractionPipeline(
          `[UNEXPECTED_ERROR]: Found the same entities in a single memory. `,
          entityMap[found],
          " and ",
          entity,
        );
      } else {
        entityMap[entity.canonical_name + entity.type] = entity;
      }
    });
  });
}