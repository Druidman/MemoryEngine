import requests
import json

def addToMemory(messages: list[dict], session_id: str):
  response = requests.post(
    url='http://localhost:3000/add', 
    headers={
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
