import * as z from 'zod'
import { getEnv } from '..';
// Generics in here are kinda crazyyyyyy xD
interface OpenRouterCompletion {
  id: string;
  choices: {
    message: ChatAssistantMessage;
    finish_reason: string;
  }[];
  // ...
}
interface OpenRouterEmbedding {
  data: {
    embedding: number[],
    index: number,
    object: 'embedding'
  }[]
}

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

export interface GeneralModelParams {
  messages: ChatMessages[], 
  sys_prompt: string, 
  validation_schema?: z.ZodObject
}
interface GeneralModelResponse<T> {
  message: T, 
  reasoning: string | undefined
}

interface EmbeddingModelResponse {
  embeddings: {
    embedding: number[],
    index: number,
    object: 'embedding'
  }[]
}
export interface EmbeddingModelParams {
  input: string | string[],
  embedding_format: 'float' // only this supported
  dimensions: number
}
const MAX_RETRIES = 3
export async function callModel<I extends GeneralModelParams | EmbeddingModelParams, R=unknown>(
  model: string,
  model_query_params: I,
  errorName: string,
  _retryNum?: number
) : 
Promise<
  I extends GeneralModelParams ? GeneralModelResponse<R>: EmbeddingModelResponse
>
{
  try{
    
    if ('embedding_format' in model_query_params){
      // embedding model
      return await callEmbeddingModel(model, model_query_params.input, model_query_params.dimensions, model_query_params.embedding_format)
    }
    else if ('sys_prompt' in model_query_params){
      // general model
      return await callGeneralModel(model, model_query_params.sys_prompt, model_query_params.messages, model_query_params.validation_schema)
    }
    else {
      throw new Error('Update conditionals for types in callModel function, as somebody probably changed types')
    }
  } catch(error){
    if (!(error instanceof z.ZodError)){
      console.log(`[CALL_MODEL_F]: UNKNOWN ERROR: ${error}`)
    }
    // retry if possible
    if ((_retryNum ?? 0) >= MAX_RETRIES){
      throw new Error(`Maximum retries hit(${MAX_RETRIES}) for model: ${model} in action: ${errorName}`)
    }
    console.log(`[CALL_MODEL_F]: Performing ${_retryNum} retry on: ${errorName}`)
    return await callModel<I, R>(model, model_query_params, errorName, (_retryNum ?? 0) + 1)
  }
  
}

async function callOpenRouterModel(body: {}, destination: string = '/chat/completions'){
  const response =  await fetch(`https://openrouter.ai/api/v1${destination}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getEnv().OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data
}

async function callGeneralModel(model: string, sys_prompt: string, messages: ChatMessages[],   validation_schema?: z.ZodObject){
  const completion = await callOpenRouterModel({
    stream: false,
    messages: [
      { role: "system", content: sys_prompt },
      ...messages
    ],
    model: model,
    reasoning: { effort: "high" },
    ...( validation_schema ?
    {
      response_format: {
        type: "json_schema",
      
        json_schema: {
          name: "schema",
          strict: true,
          schema: validation_schema?.toJSONSchema(),
        }
      },
    } : null)
  }) as OpenRouterCompletion

  const raw = completion.choices[0].message.content as string;
 
  const message = validation_schema ? validation_schema.parse(JSON.parse(raw)) : raw
  const reasoning = completion.choices[0].message.reasoning;

  return { 
    message: message as z.infer<typeof validation_schema>, 
    reasoning: reasoning ?? undefined 
  } as any;
}

async function callEmbeddingModel(model: string, input: string | string[],  dimensions: number, embedding_format: 'float'){
  
  const data = await callOpenRouterModel({
    model: model,
    input: input,
    dimensions: dimensions,
    encoding_format: embedding_format
  }, '/embeddings') as OpenRouterEmbedding
  
  return {embeddings: data.data} as any
}
