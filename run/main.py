
import requests
import json
import os

token = os.environ.get("OPEN_ROUTER_API_KEY")
def genChatResponse(messages: list[dict]):
  response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
      "Authorization": f"Bearer {token}",
      "Content-Type": "application/json",
    },
    data=json.dumps({
      "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
      "messages": messages,
      "reasoning": {"enabled": True}
    })
  )
  response = response.json()
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


messages = []

message = " "
while message != "":
  message = input("\nYou: ")

  messages.append({
    'role': "user",
    'content': message
  })

  # Generate response
  messages, response = genChatResponse(messages)

  print(f"\nChat: {response[1]}")


print("\n\nCHAT ENDED\n\n")
