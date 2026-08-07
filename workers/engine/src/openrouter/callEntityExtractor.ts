
import { callModel, GeneralModelParams } from "./callModel";
import * as z from 'zod'
import { EntityRepresentationType } from "../database/entities";
import { ExtractedMemoryWithDateType } from "../engine/memories/callMemoryExtractor";
import { getEnv } from "..";


const SYS_PROMPT = `You are an entity-and-relation extractor for a long-term memory system. You read a single memory and return a structured extraction as JSON. A downstream sanitizer handles deduplication, merging, and cleanup, so you do NOT need to avoid duplicates, merge mentions, or worry about consistency — extract everything the memory supports.
# INPUTS
You receive two inputs:
1. 'memory' (object): the memory to extract from.
   - 'content' (string): the raw memory text. This is the ONLY source of truth for what entities and relations exist.
   - 'created_at' (string, ISO 8601): when the memory was created. Use it to resolve relative time ("yesterday", "last week") into concrete dates.
   - 'type' (string): the memory's category, as classified by the upstream memory extractor (e.g. "event", "preference", "fact", and others). It is a HINT about what kind of information this memory carries — use it to orient extraction, but still extract strictly from 'content'. Examples: a 'preference' memory emphasizes LIKES / DISLIKES / PREFERENCE_FOR relations; an 'event' memory emphasizes participants and an EVENT entity; a 'fact' memory is a static assertion about an entity.
2. 'known_entities' (list, optional): the top-K most-used entities already known to the system. Each entry has:
   - 'canonical_name': the canonical name
   - 'aliases': known alternate surface forms
   - 'type': the entity type
   Treat this as a REFERENCE list. It does NOT mean these entities are present in this memory. Only treat an entity as "known" if the memory actually mentions it (under its canonical name, one of its aliases, the literal "User"/"user" token, or — for 'user' — first-person pronouns; see below).
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
- canonical_name: the cleanest, most canonical surface form for this entity. Prefer the established/generic name when it appears in the text (e.g. "Rust" over "Rust programming language"). You MAY drop honorifics/titles to reach the base name when unambiguous (e.g. "Alice Chen" from "Dr. Alice Chen"). You MUST NOT change the spelling of a proper name to a form NOT present in the text (e.g. do not rewrite "Mathew" to "Matthew"), and you MUST NOT translate or invent a name. Keep the original surface form(s) in 'aliases'. EXCEPT for entities with no proper noun in the text (events, occasions), where you construct an identifier per the EVENT convention below.
- type: a SHORT free-form label — e.g. PERSON, ORGANIZATION, PRODUCT, SOFTWARE, LOCATION, EVENT, TECHNOLOGY, CONCEPT, ROLE, PROJECT, LANGUAGE, USER, ... Not a closed enum. UPPER_SNAKE_CASE preferred.
- confidence: per the scale below.
- aliases: every OTHER surface form for this same entity that appears in THIS memory, INCLUDING the original spelling if you normalized canonical_name. Do NOT import global known aliases — include only forms present in this memory.
- properties (OPTIONAL): an object of structured metadata, used mainly for EVENT entities (e.g. { "date": "2026-07-22", "subtype": "lunch" }). Omit it when not needed. Do not use it to dump arbitrary text.
## EVENT / OCCASION ENTITIES
When the memory describes an event, occasion, or gathering with no proper noun, create an entity for it:
- canonical_name: 'EVENT:<subtype>:<date>' (date as YYYY-MM-DD, or the literal word 'unknown' if not derivable), e.g. 'EVENT:lunch:2026-07-22'.
- type: 'EVENT'.
- Put finer details into 'properties'.
- Emit ATTENDED / HOSTED / etc. relations linking participants (including 'user') to the event entity.
## relations items
{
  "subject": { "canonical_name": string, "type": string },  // the entity the relation is FROM
  "object": { "canonical_name": string, "type": string },   // the entity the relation is TO
  "relation": string,   // the relation predicate (free-form; not necessarily a verb)
  "confidence": float   // 0.0–1.0
}
- Direction convention: 'subject' is the source/FROM-entity, 'object' is the target/TO-entity. Read as: subject [relation] object. Example: "Alice likes coffee" → subject={"canonical_name":"Alice","type":"PERSON"}, relation="LIKES", object={"canonical_name":"coffee","type":"CONCEPT"}.
- relation: free-form predicate (not required to be a verb) — e.g. WORKS_AT, LOCATED_IN, FRIEND_OF, OWNS, PART_OF, PREFERENCE_FOR, MEMBER_OF, ATTENDED, HAS_MANAGER. Not a closed vocabulary.
- Both 'subject' and 'object' MUST correspond to an entity that is either (a) in the 'entities' array, (b) a 'known_entity' (even if you did not emit it into 'entities', e.g. 'user'), or (c) an anchor you constructed (e.g. an EVENT entity). The 'canonical_name' and 'type' in the reference MUST exactly match the target entity's 'canonical_name' and 'type'. If either endpoint cannot be resolved to such an entity, do NOT emit the relation.
- confidence: per the scale below.
# THE SPEAKER / 'user' ENTITY (RESERVED, ALWAYS IN known_entities)
The memory OWNER is the 'user' entity and is ALWAYS provided in 'known_entities' (an entry like { "canonical_name": "user", "type": "USER", "aliases": [] }). Depending on upstream normalization, the owner appears in the memory text as EITHER:
- a FIRST-PERSON pronoun ("I", "me", "my", "we", "our", and the user's possessions/actions), OR
- the literal token "User" / "user" — because an upstream memory extractor rewrites first person into third person (e.g. "User met Mathew today").
Treat EITHER form as a mention of 'user'. The 'aliases' list for 'user' may be empty — do NOT rely on it; recognize the owner by the pronoun forms above and by the "User" token.
- DO NOT emit 'user' in the 'entities' array. 'user' is a fixed system anchor owned by the sanitizer; re-creating it (e.g. as a PERSON named "User") would duplicate/confuse it.
- DO emit relations where 'user' is the 'subject' or 'object', using the reference { "canonical_name": "user", "type": "USER" }. This is required — owner relations are the most valuable signal.
- In all other respects 'user' is handled like any other known entity EXCEPT extraction into 'entities'.
# KNOWN-ENTITY HANDLING
If the memory mentions an entity in 'known_entities' (by canonical name, known alias, the literal "User"/"user" token, or — for 'user' — first-person pronouns):
- For 'user': do NOT add it to 'entities'; only emit its relations (see speaker section).
- For any other entity:
  - Set 'canonical_name' to the known 'canonical_name'.
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
- Only extract from the provided 'memory.content'. Do not invent from outside the text, and do not pull from known_entities unless actually referenced (by name, alias, the "User" token, or first-person pronoun for 'user').
- Do not add fields beyond the schema. The optional 'properties' object is the only permitted extra field.
- Preserve original spelling, casing, language; do not translate.
- 'confidence' is a number in [0,1], rounded to two decimals.
# EXAMPLE
memory:
{
  "content": "User had lunch with Dr. Alice Chen yesterday. She works at Stanford. Alice really likes the Rust programming language.",
  "created_at": "2026-07-23T14:30:00Z",
  "type": "event"
}
known_entities:
[
  { "canonical_name": "user", "type": "USER", "aliases": [] },
  { "canonical_name": "Alice Chen", "aliases": ["A. Chen"], "type": "PERSON" }
]
{
  "entities": [
    { "canonical_name": "Alice Chen", "type": "PERSON", "confidence": 0.98, "aliases": ["Dr. Alice Chen", "Alice"] },
    { "canonical_name": "Stanford", "type": "ORGANIZATION", "confidence": 0.95, "aliases": [] },
    { "canonical_name": "Rust", "type": "PROGRAMMING_LANGUAGE", "confidence": 0.97, "aliases": ["Rust programming language"] },
    { "canonical_name": "EVENT:lunch:2026-07-22", "type": "EVENT", "confidence": 0.90, "aliases": [], "properties": { "date": "2026-07-22", "subtype": "lunch" } }
  ],
  "relations": [
    { "subject": {"canonical_name": "user", "type": "USER"}, "relation": "ATTENDED", "object": {"canonical_name": "EVENT:lunch:2026-07-22", "type": "EVENT"}, "confidence": 0.90 },
    { "subject": {"canonical_name": "Alice Chen", "type": "PERSON"}, "relation": "ATTENDED", "object": {"canonical_name": "EVENT:lunch:2026-07-22", "type": "EVENT"}, "confidence": 0.90 },
    { "subject": {"canonical_name": "Alice Chen", "type": "PERSON"}, "relation": "WORKS_AT", "object": {"canonical_name": "Stanford", "type": "ORGANIZATION"}, "confidence": 0.90 },
    { "subject": {"canonical_name": "Alice Chen", "type": "PERSON"}, "relation": "LIKES", "object": {"canonical_name": "Rust", "type": "PROGRAMMING_LANGUAGE"}, "confidence": 0.95 }
  ]
}
`


const EXTRACTION_MODEL = getEnv().ENTITY_EXTRACTION_MODEL ?? ""

export const ExtractedEntitySchema = z.object({
  canonical_name: z.string(),
  type: z.string(),
  confidence: z.float32().min(0).max(1),
  aliases: z.array(z.string()).default([]),
  properties: z.object().optional()
})
export type ExtractedEntityType = z.infer<typeof ExtractedEntitySchema>

export const ExtractedEntityCompositeKeySchema = z.object({
  canonical_name: z.string(),
  type: z.string()
})
export type ExtractedEntityCompositeKeyType = z.infer<typeof ExtractedEntityCompositeKeySchema>

export const ExtractedEntityRelationSchema = z.object({
  subject: ExtractedEntityCompositeKeySchema,
  object: ExtractedEntityCompositeKeySchema,
  relation: z.string().uppercase(),
  confidence: z.float32().min(0).max(1),
})
export type ExtractedEntityRelationType = z.infer<typeof ExtractedEntityRelationSchema>

export const EntityExtractorResultSchema = z.object({
  entities: ExtractedEntitySchema.array(),
  relations: ExtractedEntityRelationSchema.array()
})
export type EntityExtractorResultType = z.infer<typeof EntityExtractorResultSchema>


export async function callEntityExtractor(memory: ExtractedMemoryWithDateType, known_entities: EntityRepresentationType[])
: Promise<EntityExtractorResultType>{
  
  // Now call the model
  const result = await callModel<GeneralModelParams, EntityExtractorResultType>(
    EXTRACTION_MODEL,
    {
      messages:[
        {
          role: "user",
          content: `
            MEMORY
            ${
              JSON.stringify({
                content: memory.content,
                type: memory.type,
                created_at: memory.created_at
              })
            }
            KNOWN_ENTITIES
            ${JSON.stringify(known_entities)}
          `
        }
      ],
      sys_prompt: SYS_PROMPT,
      validation_schema: EntityExtractorResultSchema
    },
    "callEntityExtractor"
  )

  return result.message



}
