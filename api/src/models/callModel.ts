import { OpenRouter } from '@openrouter/sdk';
import { ChatMessages } from '@openrouter/sdk/models';
import * as z from 'zod'
import { zodToJsonSchema } from "zod-to-json-schema";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})
const MAX_RETRIES = 3
export async function callModel<T>(
  model: string, messages: ChatMessages[], sys_prompt: string, validation_schema: z.ZodObject, errorName: string, _retryNum?: number
) : Promise<{message: T, reasoning: string | undefined}>
{
  try{
    const completion = await client.chat.send(
      {
        chatRequest: {
          stream: false,
          messages: [
            {
              role: "system",
              content: sys_prompt
            },
            ...messages
          ],
          model: model,
          
          reasoning: {effort: "high"},
          response_format: {
            type: "json_schema",
            json_schema: {
              
              strict: true,
              schema: zodToJsonSchema(validation_schema, { target: "openApi3" }),
            },
          },
        }
      }
    );
    
    // Extract the assistant message with reasoning_details and save it to the response variable
    const raw = completion.choices[0].message.content as string;
    const message = validation_schema.parse(JSON.parse(raw));
    const reasoning = completion.choices[0].message.reasoning;

    return {message: message as T, reasoning: reasoning ?? undefined}
  } catch(error){
    if (error instanceof z.ZodError){
      // retry if possible
      if ((_retryNum ?? 0) >= MAX_RETRIES){
        throw new Error(`Maximum retries hit(${MAX_RETRIES}) for model: ${model} in action: ${errorName}`)
      }
      return await callModel<T>(model, messages, sys_prompt, validation_schema, errorName, (_retryNum ?? 0) + 1)
    }
    throw error
  }
  
}
