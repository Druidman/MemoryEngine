
import { callModel } from "./callModel";
import * as z from 'zod'
import { EntityRepresentationType } from "../database/entities";


const SYS_PROMPT = `
You are an entity extraction model operating inside a graph-native memory engine. Your only job is to extract named entities from a single memory string and return them as structured JSON.

## What you extract

Extract entities that belong to one of these types:

- PERSON       — named individuals ("Marek", "Dr. Kim"). Never extract unnamed references ("my brother", "a colleague") as PERSON entities.
- PROJECT      — named initiatives, products, companies, or codebases ("Druidoo", "Versuno", "iPhone").
- ORGANIZATION — institutions, teams, universities, firms ("Anthropic", "MIT", "the backend team").
- LOCATION     — specific places, cities, regions ("Warsaw", "the Wola district").
- CONCEPT      — named technical or domain-specific ideas ("graph memory", "vector embeddings"). Only extract when the concept is a named thing, not a generic description.
- EVENT        — named or clearly bounded events ("Q3 demo", "summer sprint").
- TECHNOLOGY   — named tools, languages, frameworks, protocols ("pgvector", "BullMQ", "MCP").

## Confidence scoring

Assign confidence (0.0–1.0) based on how clearly the entity is named in the memory string:

- 0.9–1.0  The entity has an explicit, unambiguous name in the text.
- 0.7–0.89 The entity name can be inferred clearly from context but is not directly stated.
- 0.5–0.69 The entity is referred to by role or description; a name is partially guessable.
- below 0.5 Do not extract. Skip the entity entirely.

## Alias extraction

Aliases are alternate names or references to the same entity found within the memory string only. Do not invent aliases not present in the text. Examples: if the text says "Marek (my co-founder)", aliases might be ["my co-founder"]. If no alias is present, return an empty array.

## Hard rules

1. Never extract an entity you cannot assign a canonical_name to. If a PERSON is only referred to as "my brother" or "a friend", skip it entirely — do not create an entity with canonical_name "my brother".
2. If an entity name is vague and matches a known entity in the provided roster, resolve it to the known entity's canonical name rather than creating a new one.
3. Do not extract the user themselves as an entity.
4. Prefer fewer, high-confidence entities over many speculative ones.
5. canonical_name must be a proper noun or named concept — never a sentence fragment or description.
6. Return only valid JSON. No markdown fences, no explanation, no preamble.

## Output format

Return a JSON array. Each element:

{
  "canonical_name": string,   // the clearest, most complete name for this entity
  "type": string,             // one of the types listed above
  "confidence": float,        // 0.0–1.0
  "aliases": string[]         // alternate names found in this memory string, may be empty
}

If no entities qualify, return an empty array: []
`


const EXTRACTION_MODEL = process.env.ENTITY_EXTRACTION_MODEL ?? ""

export const ExtractedEntitySchema = z.object({
  canonical_name: z.string(),
  type: z.literal([
    "PERSON",
    "PROJECT",
    "ORGANIZATION",
    "LOCATION",
    "CONCEPT",
    "EVENT",
    "TECHNOLOGY"
  ]),
  confidence: z.float32().min(0).max(1),
  aliases: z.array(z.string()).default([])
})
export type ExtractedEntityType = z.infer<typeof ExtractedEntitySchema>

export const ExtractedEntitiesSchema = z.object({
  memories: ExtractedEntitySchema.array()
})
export type ExtractedEntitiesType = z.infer<typeof ExtractedEntitiesSchema>


export async function callEntityExtractor(extractionMemory: string, known_entities: EntityRepresentationType[])
: Promise<ExtractedEntitiesType>{

  // Now call the model
  const result = await callModel<ExtractedEntitiesType>(
    EXTRACTION_MODEL, 
    [
      {
        role: "user",
        content: `
          ## Memory string

          ${extractionMemory}

          ## Known entity roster

          The following entities already exist in the graph for this user. If a mention in the memory string clearly refers to one of these, resolve to its canonical_name rather than creating a new entity.

          ${known_entities?.length ? JSON.stringify(known_entities) : "No entities yet."}

          ---

          Extract all qualifying entities from the memory string above. Apply all confidence and naming rules from your instructions. Return only a JSON array.
        `
      }
    ],
    SYS_PROMPT,
    ExtractedEntitiesSchema,
    "callEntityExtractor"
  )

  return result.message



}
