
from mcp.server import MCPServer
from pydantic import BaseModel, Field
import httpx

import requests

mcp = MCPServer("Demo")

class MemorySchema(BaseModel):
	memories: list[str] = Field(min_length=1, description='Memories list created by ai from chat recent message')

	last_messages: list[str] = Field(min_length=1, max_length=10, description='Messages (0-10) from conversation history that might be relevant during entity extraction, resolution')

@mcp.tool()
def add_memories(param: MemorySchema) -> str:
	"""Save memories which you got from chat history"""

	res = requests.post("http://localhost:3000/add_memories", json=param.model_dump())

	resBody = res.json()

	print(resBody)
		

	return f"Memory added!"

@mcp.resource("prompts://usage-policy")
def usage_policy() -> str:
    return """
    You have access to a graph memory. Use it when you want to save knowledge you just gained.
		For example:
		- User tells some fact you didn't know
		- You tell user something that in future he might ask you about
    """

if __name__ == "__main__":
	mcp.run(transport='streamable-http', port=3050, streamable_http_path='/streamable')