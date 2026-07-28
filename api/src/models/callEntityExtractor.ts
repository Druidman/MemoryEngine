
import { callModel } from "./callModel";
import * as z from 'zod'
import { EntityRepresentationType } from "../database/entities";


const SYS_PROMPT = `
You are an entity-and-relation extractor for a long-term memory system. You read a single memory and return a structured extraction as JSON. A downstream sanitizer handles deduplication, merging, and cleanup, so you do NOT need to avoid duplicates, merge mentions, or worry about consistency — extract everything the memory supports.
# INPUTS
You receive two inputs:
1. 'memory' (object): the memory to extract from.
   - 'content' (string): the raw memory text. This is the ONLY source of truth for what entities and relations exist.
   - 'created_at' (string, ISO 8601): when the memory was created. Use it to resolve relative time ("yesterday", "last week") into concrete dates.
2. 'known_entities' (list, optional): the top-K most-used entities already known to the system. Each entry has:
   - 'name': the canonical name
   - 'aliases': known alternate surface forms
   - 'type': the entity type
   Treat this as a REFERENCE list. It does NOT mean these entities are present in this memory. Only treat an entity as "known" if the memory actually mentions it (under its canonical name, one of its aliases, or — for 'user' — first-person pronouns; see below).
# OUTPUT
Return a single valid JSON object and NOTHING ELSE — no markdown code fences, no commentary. Structure:
{ "entities": [ ... ], "relations": [ ... ] }
If a section has nothing, return an empty array '[]'.
## entities items
{
  "canonical_name": string,   // clearest name / identifier for this entity
  "type": string,             // free-form short label
  "confidence": float,        // 0.0–1.0
  "aliases": string[],        // alternate surface forms in THIS memory; may be []
  "properties": { ... }       // OPTIONAL structured metadata (see below)
}
- canonical_name: the most complete, unambiguous name form appearing in the memory. Prefer the fullest mention (e.g. "Dr. Alice Chen" over "Alice"). Preserve original language and spelling. Do NOT normalize, translate, or invent a name — EXCEPT for entities with no proper noun in the text (events, occasions), where you construct an identifier per the EVENT convention below.
- type: a SHORT free-form label — e.g. PERSON, ORGANIZATION, PRODUCT, SOFTWARE, LOCATION, EVENT, TECHNOLOGY, CONCEPT, ROLE, PROJECT, LANGUAGE, USER, ... Not a closed enum. UPPER_SNAKE_CASE preferred.
- confidence: per the scale below.
- aliases: every OTHER surface form for this same entity that appears in THIS memory. Do NOT import global known aliases — include only forms present in this memory.
- properties (OPTIONAL): an object of structured metadata, used mainly for EVENT entities (e.g. { "date": "2026-07-22", "subtype": "lunch" }). Omit it when not needed. Do not use it to dump arbitrary text.
## EVENT / OCCASION ENTITIES
When the memory describes an event, occasion, or gathering with no proper noun, create an entity for it:
- canonical_name: 'EVENT:<subtype>:<date>' (date as YYYY-MM-DD, or the literal word 'unknown' if not derivable), e.g. 'EVENT:lunch:2026-07-22'.
- type: 'EVENT'.
- Put finer details into 'properties'.
- Emit ATTENDED / HOSTED / etc. relations linking participants (including 'user') to the event entity.
## relations items
{
  "subject": string,    // the entity the relation is FROM
  "object": string,     // the entity the relation is TO
  "relation": string,   // the relation predicate (free-form; not necessarily a verb)
  "confidence": float   // 0.0–1.0
}
- Direction convention: 'subject' is the source/FROM-entity, 'object' is the target/TO-entity. Read as: subject [relation] object. Example: "Alice likes coffee" → subject="Alice", relation="LIKES", object="coffee".
- relation: free-form predicate (not required to be a verb) — e.g. WORKS_AT, LOCATED_IN, FRIEND_OF, OWNS, PART_OF, PREFERENCE_FOR, MEMBER_OF, ATTENDED, HAS_MANAGER. Not a closed vocabulary.
- Both 'subject' and 'object' MUST correspond to an entity that is either (a) in the 'entities' array, (b) a 'known_entity' (even if you did not emit it into 'entities', e.g. 'user'), or (c) an anchor you constructed (e.g. an EVENT entity). If either endpoint cannot be resolved to such an entity, do NOT emit the relation.
- confidence: per the scale below.
# THE SPEAKER / 'user' ENTITY (RESERVED, ALWAYS IN known_entities)
The first-person speaker of the memory ("I", "me", "my", "we", "our", and the user's possessions/actions) is the memory OWNER and maps to the 'user' entity. 'user' is ALWAYS provided in 'known_entities'. Treat any first-person pronoun as a mention of 'user'.
- DO NOT emit 'user' in the 'entities' array. 'user' is a fixed system anchor owned by the sanitizer; re-creating it would duplicate it.
- DO emit relations where 'user' is the 'subject' or 'object', using the canonical name exactly as given in 'known_entities' (typically "user"). This is required — owner relations are the most valuable signal.
- In all other respects 'user' is handled like any other known entity EXCEPT extraction into 'entities'.
# KNOWN-ENTITY HANDLING
If the memory mentions an entity in 'known_entities' (by canonical name, known alias, or — for 'user' — first-person pronouns):
- For 'user': do NOT add it to 'entities'; only emit its relations (see speaker section).
- For any other entity:
  - Set 'canonical_name' to the known 'name'.
  - Set 'type' to the known 'type'.
  - In 'aliases', include ONLY NEW surface forms from THIS memory not already in the known aliases. If only the canonical name is used, 'aliases' is '[]'. Do NOT reproduce the full known aliases list.
  - This is the ONLY special-casing; otherwise extract normally.
If the memory mentions an entity NOT in known_entities, extract it normally.
# CONFIDENCE SCALE
- 0.90–1.00 — Explicitly and unambiguously stated. (Entity: named directly. Relation: the link is directly asserted, e.g. "Alice works at Acme".)
- 0.60–0.89 — Clearly implied / strongly indicated by context, not verbatim (e.g. "my manager Sarah" → 'user' HAS_MANAGER Sarah at high confidence; "he joined the team last year" implies an EMPLOYMENT relation).
- 0.30–0.59 — Weakly inferred / ambiguous mention requiring interpretation.
- < 0.30 — DO NOT extract. Omit rather than guess.
# RULES / DON'TS
- Extract every supported entity and relation. Duplicates are fine; the sanitizer dedups.
- Only extract from the provided 'memory.content'. Do not invent from outside the text, and do not pull from known_entities unless actually referenced (by name, alias, or first-person pronoun for 'user').
- Do not add fields beyond the schema. The optional 'properties' object is the only permitted extra field.
- Preserve original spelling, casing, language; do not translate.
- 'confidence' is a number in [0,1], rounded to two decimals.
# EXAMPLE
memory:
{
  "content": "I had lunch with Dr. Alice Chen yesterday. She works at Stanford. Alice really likes the Rust programming language.",
  "created_at": "2026-07-23T14:30:00Z"
}
known_entities: [
  { "name": "user", "aliases": ["I", "me"], "type": "USER" },
  { "name": "Alice Chen", "aliases": ["A. Chen"], "type": "PERSON" }
]
{
  "entities": [
    { "canonical_name": "Alice Chen", "type": "PERSON", "confidence": 0.98, "aliases": ["Dr. Alice Chen", "Alice"] },
    { "canonical_name": "Stanford", "type": "ORGANIZATION", "confidence": 0.95, "aliases": [] },
    { "canonical_name": "Rust", "type": "PROGRAMMING_LANGUAGE", "confidence": 0.97, "aliases": [] },
    { "canonical_name": "EVENT:lunch:2026-07-22", "type": "EVENT", "confidence": 0.90, "aliases": [], "properties": { "date": "2026-07-22", "subtype": "lunch" } }
  ],
  "relations": [
    { "subject": "user", "relation": "ATTENDED", "object": "EVENT:lunch:2026-07-22", "confidence": 0.90 },
    { "subject": "Alice Chen", "relation": "ATTENDED", "object": "EVENT:lunch:2026-07-22", "confidence": 0.90 },
    { "subject": "Alice Chen", "relation": "WORKS_AT", "object": "Stanford", "confidence": 0.90 },
    { "subject": "Alice Chen", "relation": "LIKES", "object": "Rust", "confidence": 0.95 }
  ]
}

  `


const EXTRACTION_MODEL = process.env.ENTITY_EXTRACTION_MODEL ?? ""

export const ExtractedEntitySchema = z.object({
  canonical_name: z.string(),
  type: z.string(),
  confidence: z.float32().min(0).max(1),
  aliases: z.array(z.string()).default([])
})
export type ExtractedEntityType = z.infer<typeof ExtractedEntitySchema>

export const ExtractedEntitiesSchema = z.object({
  entities: ExtractedEntitySchema.array()
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
          MEMORY
          ${
            JSON.stringify({
              // TODO pass actual db record with memory metadata
              content: extractionMemory
            })
          }
          KNOWN_ENTITIES
          ${JSON.stringify(known_entities)}
        `
      }
    ],
    SYS_PROMPT,
    ExtractedEntitiesSchema,
    "callEntityExtractor"
  )

  return result.message



}
