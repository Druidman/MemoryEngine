import * as z from 'zod'

export type ChatAssistantMessage = {

    content?: string | null | undefined;
    model?: string | undefined;

    name?: string | undefined;

    reasoning?: string | null | undefined;

    refusal?: string | null | undefined;
    role: "assistant";
}
export type ChatUserMessage = {
  role: "user";
  name?: string | undefined;
  content?: string | null | undefined;
}
export type ChatMessages = ChatAssistantMessage | ChatUserMessage


const MAX_RETRIES = 3
export async function callModel<T>(
  model: string, messages: ChatMessages[], sys_prompt: string, 
  validation_schema: z.ZodObject, 
  errorName: string,
   _retryNum?: number
) : Promise<{message: T, reasoning: string | undefined}>
{
  try{

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stream: false,
        messages: [
          { role: "system", content: sys_prompt },
          ...messages
        ],
        model: model,
        reasoning: { effort: "high" },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "schema",
            strict: true,
            schema: validation_schema.toJSONSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
    }

    const completion = await response.json();
    const raw = completion.choices[0].message.content as string;
    
 
    const message = validation_schema.parse(JSON.parse(raw));
    const reasoning = completion.choices[0].message.reasoning;


    return { message: message as T, reasoning: reasoning ?? undefined };
  } catch(error){
    if (!(error instanceof z.ZodError)){
      console.log(`[CALL_MODEL_F]: UNKNOWN ERROR: ${error}`)
    }
    // retry if possible
    if ((_retryNum ?? 0) >= MAX_RETRIES){
      throw new Error(`Maximum retries hit(${MAX_RETRIES}) for model: ${model} in action: ${errorName}`)
    }
    console.log(`[CALL_MODEL_F]: Performing ${_retryNum} retry on: ${errorName}`)
    return await callModel<T>(model, messages, sys_prompt, validation_schema, errorName, (_retryNum ?? 0) + 1)
  }
  
}
