import { callExtractor } from "./callExtractorModel"

export async function runExtractionPipeline(
  data: {
    id: string,
    content: string
  }[], 
  last_messages: string[]
){
  console.log('EEP started...')

  if (data.length == 0) return

  // Entity extraction pipeline

  
  const promises: Promise<any>[] = []
  data.forEach((memory)=>{
    promises.push(callExtractor(memory.content, last_messages))
  })

  const results = await Promise.all(promises)

  results.forEach((result)=>{
    console.log(JSON.parse(result))
  })

}