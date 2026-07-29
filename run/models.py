import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()
token = os.environ.get("OPENROUTER_API_KEY")
model = os.environ.get("CHAT_MODEL")

if not model or not token:
  print('SPECIFY OPEN_ROUTER_API_KEY and CHAT_MODEL env variables in .env file')
  exit()
  
def genChatResponse(messages: list[dict]):
  response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
      "Authorization": f"Bearer {token}",
      "Content-Type": "application/json",
    },
    data=json.dumps({
      'model': model,
      "messages": messages,
      "reasoning": {"enabled": True}
    })
  )
  response = response.json()
  # print(response)

  response = response['choices'][0]['message']

  newMessages = [
    *messages,
    {
      "role": "assistant",
      "content": response.get('content'),
      "reasoning_details": response.get('reasoning_details')
    },
  ]

  return newMessages, response.get('content')