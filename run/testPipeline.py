import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from api import addToMemory, getSession
from models import genChatResponse





# Test cases across different prompts.

testPrompts = [
  # Test1
  # Tests memory extractor ability to extract memories which include:
  
  # - Meeting Matthew
  # - The fact that I like Rust
  # - The fact that Matthew hates rust
  # - Cinema go-out scheduled for tomorrow
  
  # Expected entities:
  # Matthew(Person), Rust(Programming language), Cinema(Location), EVENT:cinema_visit:<date of tomorrow>

  ## Current results:
  # Matthew(Person), Rust(Programming language), EVENT:cinema:<date of tomorrow>
  # Could be wrong but is it really?
  # EVENT:meeting:<date of today>
  # ! Missing !
  # Cinema(Location)
  {
    "content": "Today I met Matthew. I also like Rust. Me and Matthew (who hates rust) are planning to go to the cinema tomorrow",
    "response": False
  }
]




# Run tests

for index, prompt in enumerate(testPrompts):
  print(f"Test case #{index + 1}. Starting")
  # Get session
  print(f"Test case #{index + 1}. Getting session")
  session = getSession()
  messages = [
    {
      "role": "user",
      "content": prompt['content']
    }
  ]

  if prompt['response']:
    print(f"Test case #{index + 1}. Generating chat response")
    messages = genChatResponse(messages)

  print(f"Test case #{index + 1}. Adding to memory")
  addToMemory(messages, session)

  print(f"Test case #{index + 1} ran. Check results and click enter to proceed with next test case.")
  _x = input()

print("\n\nAll tests done.\n\n")




