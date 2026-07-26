
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

def addToMemory(messages: list[dict], session_id: str):
  response = requests.post(
    url='http://localhost:3000/add', 
    headers={
      "Authorization": f"Bearer {token}",
      "Content-Type": "application/json",
    },
    data=json.dumps({
      "sessionId": session_id,
      "newMessages": messages
    })
  )
  responseBody = response.json()
  if (response.status_code == 200): return

  print('ERROR IN RESPONSE FROM /add ENDPOINT')
  print(responseBody)
  exit()

def getSession():
  response = requests.get('http://localhost:3000/new_session')

  responseBody = response.json()
  # print(responseBody)
  if (response.status_code == 200): return responseBody['session_id']

  print('ERROR IN RESPONSE FROM /new_session ENDPOINT')
  print(responseBody)
  exit()




session_id = getSession()
  

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

  # Send to memory engine
  addToMemory([
    {
      'role': "user",
      'content': message
    },
    {
      'role': 'assistant',
      'content': response
    }
  ],
  session_id)

  print(f"\nChat: {response}")

  


print("\n\nCHAT ENDED\n\n")
