from mcp.server import MCPServer

mcp = MCPServer("Demo")


@mcp.tool()
def test(param: str) -> str:
    """Test tool."""
    return f"Test tool worked! {param}"


if __name__ == "__main__":
    mcp.run(transport='streamable-http', streamable_http_path='/streamable')