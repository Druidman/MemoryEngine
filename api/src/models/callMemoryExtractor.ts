import { ChatMessages } from "@openrouter/sdk/models";
import { Memory } from "../database/memories";
import { callModel } from "./callModel";
import * as z from 'zod'


const SYS_PROMPT =`You are a memory extraction engine. Your job is to extract meaningful, durable facts from a conversation and return them as structured JSON.

You will receive:
1. EXISTING SESSION MEMORIES — facts already extracted from this conversation. Use these to avoid duplicates and resolve references.
2. NEW MESSAGES — the new portion of the conversation to extract from.

## Extraction Rules

- Extract ONLY from NEW MESSAGES. Do not re-extract what is already in EXISTING SESSION MEMORIES.
- Extract facts that are durable and meaningful — things worth remembering across future conversations.
- Do NOT extract conversational filler, greetings, acknowledgements, or transient statements.
- If a new message references an entity mentioned only in existing memories, use the memory to resolve it — do not leave it ambiguous.
- If a new fact clearly updates or contradicts an existing session memory, set 'supersedes_hint' to the ID of that memory.
- If you are not confident a fact is real and specific (e.g. vague references like "working on a project" with no name), set confidence below 0.6 or skip entirely.
- Never invent or infer facts not grounded in the new messages.

## Memory Types

- 'fact' — something true about the user (name, job, location, skills, relationships)
- 'preference' — something the user likes, dislikes, or prefers (tools, habits, styles)
- 'event' — something that happened or is planned (completed a task, scheduled a meeting, shipped something)
- 'assistant' — something the assistant did, recommended, or produced that is worth remembering (gave advice, wrote code, made a decision together)

## Output Format

Return ONLY valid JSON. No preamble, no explanation, no markdown fences.

{
  "memories": [
    {
      "content": "string — the fact, stated plainly in third person",
      "type": "fact | preference | event | assistant",
      "confidence": 0.0–1.0,
      "supersedes_hint": "existing memory ID or null"
    }
  ]
}`

const EXTRACTION_MODEL = process.env.MEMORY_EXTRACTION_MODEL ?? ""

export const ExtractedMemorySchema = z.object({
  type: z.string(),
  content: z.literal(["fact", "preference", "event", "assistant"]),
  confidence: z.float32().min(0).max(1),
  supersedes_hint: z.uuid().optional().nullable(),
})
export type ExtractedMemoryType = z.infer<typeof ExtractedMemorySchema>

export const ExtractedMemoriesSchema = z.object({
  memories: ExtractedMemorySchema.array()
})
export type ExtractedMemoriesType = z.infer<typeof ExtractedMemoriesSchema>

export async function callMemoryExtractor(newMessages: ChatMessages[], previousSessionMemories: Memory[])
: Promise<ExtractedMemoriesType>{
  const formatedMemories = previousSessionMemories.map((memory)=>({
    id: memory.id,
    content: memory.content,
    created_at: memory.created_at
  }))

  // Now call the model

  const result = await callModel<ExtractedMemoriesType>(
    EXTRACTION_MODEL, 
    [
      {
        role: "user",
        content: `
          ## Existing Session Memories
${formatedMemories.length ? JSON.stringify(formatedMemories) : "None yet.\n"}

          ## New Messages
          ${newMessages}

          Extract memories now.
        `
      }
    ],
    SYS_PROMPT,
    ExtractedMemoriesSchema,
    "callMemoryExtractor"
  )

  console.log(result.message)

  return result.message



}