from run.api import addToMemory, getSession
from run.models import genChatResponse

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
