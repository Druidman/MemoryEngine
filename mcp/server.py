
from mcp.server import MCPServer
from pydantic import BaseModel, Field

mcp = MCPServer("Demo")

class MemorySchema(BaseModel):
	memories: list[str] = Field(gt=1, description='Memories list created by ai from chat recent message')

	last_messages: list[str] = Field(gt=0, lt=11, description='Last top 10 messages from chat. Used for graph creation')

@mcp.tool()
def add_memories(param: MemorySchema) -> str:
	"""Test tool."""
	return f"Test tool worked! {param}"


if __name__ == "__main__":
	mcp.run(transport='streamable-http', streamable_http_path='/streamable')