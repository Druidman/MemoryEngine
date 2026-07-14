

export async function callExtractor(memory: string, last_messages: string[]){
  let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "tencent/hy3:free",
      "messages": [
        {
          "role": "system",
          "content": 
           `You are a memory extraction engine. Your sole job is to take a memory hint written by an AI agent and use the surrounding conversation to resolve and enrich it — not to discover new facts from the conversation.

The memory hint is what should be stored. The conversation context exists only to help you understand the hint more precisely.

Output valid JSON only. No explanation, no markdown, no preamble.

Rules:
- Extract ONLY what the memory hint describes. Do not extract additional facts you notice in the conversation.
- Use the conversation to resolve ambiguous references in the hint (e.g. who "user" is, whether "dogs" means a general preference or a specific animal mentioned by name).
- Use the conversation to enrich the predicate if a more specific one is supported (e.g. if the hint says "user likes dogs" but the conversation reveals they own one, use OWNS not LIKES).
- "user" always resolves to entity type "person", name "user".
- Predicates must be SCREAMING_SNAKE_CASE verbs.
- If the hint describes a change to something previously known (e.g. "user moved to Warsaw"), mark the fact with "supersedes": true — this signals the ingestion layer to run a temporal supersession check.
- If the object in the hint refers to something named or described in the conversation, use that canonical name as the object value.
- If confidence in resolving the hint is genuinely low, mark affected facts with "confidence": "low". Default is "high".
- Never invent facts not grounded in the hint.
- Normalize entity names to singular canonical form (e.g. "dogs" → "dog", "cats" → "cat").
            `
        },
        {
          'role': "user",
          "content": 
           `Memory hint: ${memory}

Conversation context (last ${last_messages.length} messages):
${last_messages}

Return JSON in this exact format:
{
  "entities": [
    {
      "name": "string",
      "type": "person | place | project | organization | concept | preference | trait | animal | other",
      "aliases": ["optional alternate names found in conversation"]
    }
  ],
  "facts": [
    {
      "subject": "entity name",
      "predicate": "SCREAMING_SNAKE_CASE",
      "object": "entity name or string literal",
      "confidence": "high | low",
    }
  ]
}`
        }
      ],
      "reasoning": {"enabled": true},
      
    })
  });
  
  // Extract the assistant message with reasoning_details and save it to the response variable
  const result = await response.json();
  const message = result.choices[0].message?.content;

  return message
}
