# Converting a Python Tool to an MCP Server

**Goal:** Take an existing Python tool (`Crawl4AIScraper`) and expose it as an MCP server so any MCP-compatible client (Claude Desktop, LangGraph, your own code) can discover and call it over a standard protocol.

---

## Part 1 — What is MCP and why does it matter?

### The problem MCP solves

Without MCP, every orchestrator that wants to use a tool imports it directly:

```
executor.py
  └── from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper
      result = await scraper.execute(url=url)   ← tight coupling
```

This works fine when:
- You own the tool
- The tool runs in the same process
- You have one orchestrator

It breaks down when:
- Multiple orchestrators need the same tools
- Tools are in different languages or services
- You want the LLM to dynamically discover what tools are available

### What MCP gives you

```
MCP Server process                    Your orchestrator (MCP client)
  ├── tool: scrape_url       ←─────── discovers: ["scrape_url"]
  ├── tool: ddgs_text        ←─────── calls: scrape_url(url="...")
  └── tool: news_api         ←─────── receives: { success, content, ... }
```

The tool implementation doesn't change. You wrap it in a server. Any client that speaks MCP can now use it — without knowing how it's implemented or what language it's in.

### Transport types

MCP has two transport layers. The server code (your tools) is identical in both — only the last line (`mcp.run(...)`) changes.

| Transport | How it works | When to use |
|---|---|---|
| **stdio** | Server runs as a **subprocess**. Client speaks over `stdin/stdout` pipes. No network involved. | Local dev, desktop agents (Claude Desktop), CI tests. |
| **Streamable HTTP** | Server runs as an **HTTP service** on a port. Client sends POST requests. Standard HTTP/HTTPS. | Deployed services, cloud, any multi-client scenario. |
| **SSE (HTTP legacy)** | Older HTTP variant using Server-Sent Events. Still supported but prefer Streamable HTTP for new work. | Only if a specific client library requires SSE. |

```
stdio:
  Client process  ──stdin/stdout──►  Server subprocess
                                      (spawned, killed, managed by client)

Streamable HTTP:
  Client process  ──POST /mcp──────►  Server (standalone HTTP process/container)
  Client process  ──POST /mcp──────►  same server (multiple clients at once)
  Another client  ──POST /mcp──────►  same server
```

Key differences at a glance:

| | stdio | Streamable HTTP |
|---|---|---|
| Server lifecycle | Client spawns + kills it | Server runs independently |
| Multiple clients | One per server process | Many clients → one server |
| Auth | Process-level (OS permissions) | HTTP headers (API key / JWT) |
| Deploy | Not applicable | Docker, Kubernetes, Cloud Run, etc. |
| Local test | `mcp dev server.py` | `mcp dev --transport http server.py` |
| Python `mcp.run()` | `mcp.run()` (default) | `mcp.run(transport="streamable-http")` |

This document covers **both**. Part 4 = stdio. Part 5 = HTTP.

---

## Part 2 — Install the MCP SDK

Add to `pyproject.toml` under `dependencies`:

```toml
"mcp[cli]>=1.0.0",
```

Then install:

```bash
uv pip install "mcp[cli]"
```

The `[cli]` extra gives you the `mcp` command-line tool for development and inspection.

---

## Part 3 — Create the package directory

Create this folder structure manually:

```
backend/core/tools/mcp_servers/
├── __init__.py          ← empty file, makes it a Python package
└── crawl4ai_server.py   ← the MCP server (you'll write this)
```

`__init__.py` is empty — just create the file.

Important: run the server as a module from the backend directory:

```bash
python -m core.tools.mcp_servers.crawl4ai_server
```

When you run module-style, you do not need any `sys.path` manipulation.

---

## Part 4 — Write the MCP server (stdio transport)

Create `backend/core/tools/mcp_servers/crawl4ai_server.py`:

```python
"""
MCP Server: Crawl4AI Web Scraper
=================================
Exposes the Crawl4AIScraper tool as a single MCP tool: scrape_url.

Run this server:
    python -m core.tools.mcp_servers.crawl4ai_server

Inspect with the MCP browser UI:
    mcp dev core/tools/mcp_servers/crawl4ai_server.py

Transport: stdio (default)
"""

from mcp.server.fastmcp import FastMCP
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper

mcp = FastMCP(
    name="crawl4ai",
    instructions=(
        "Scrape any public URL and return its content as clean markdown. "
        "Use this when you need to read the full text of a web page."
    ),
)

_scraper = Crawl4AIScraper()


@mcp.tool()
async def scrape_url(
    url: str,
    timeout: int = 30,
    extract_links: bool = False,
    extract_images: bool = False,
    include_html: bool = False,
) -> dict:
    """
    Scrape a web page and return its content as markdown.

    Args:
        url: The URL to scrape.
        timeout: Maximum seconds to wait (5-120). Default 30.
        extract_links: Include internal/external links. Default False.
        extract_images: Include image metadata. Default False.
        include_html: Include raw HTML. Default False.

    Returns:
        success (bool)       - whether scraping succeeded
        content.markdown     - clean markdown text of the page
        content.title        - page title
        content.url          - final URL after redirects
        content.status_code  - HTTP status code
        error                - error message if success=False
    """
    result = await _scraper.execute(
        url=url,
        timeout=timeout,
        extract_links=extract_links,
        extract_images=extract_images,
        include_html=include_html,
    )
    return result.model_dump()


if __name__ == "__main__":
    mcp.run()  # stdio transport — client must spawn this as a subprocess
```

### What changed vs the original tool?

| | Original `Crawl4AIScraper` | MCP Server |
|---|---|---|
| `crawl4ai_scraper.py` | Unchanged — not touched | Unchanged |
| Called by | `from ... import Crawl4AIScraper` | MCP client via protocol |
| Runs in | Caller's process | Its own subprocess |
| Discovered by | Import | `client.list_tools()` |
| New code | None | 20 lines wrapping the existing class |

The `@mcp.tool()` decorator is the entire conversion. It:
1. Registers `scrape_url` as a tool the server advertises
2. Uses the function signature to auto-generate the JSON schema clients use to call it
3. Uses the docstring as the tool description the LLM reads

---

## Part 4b — Write the MCP server (Streamable HTTP transport)

The tools are 100% identical to the stdio version. Only the server startup changes.

```python
"""
MCP Server: Crawl4AI Web Scraper — HTTP Transport
===================================================
Same tools as crawl4ai_server.py but served over Streamable HTTP.

Run this server:
    python -m core.tools.mcp_servers.crawl4ai_server_http

The server listens on:
    http://0.0.0.0:8000/mcp    ← MCP endpoint (POST)
    http://0.0.0.0:8000/health ← health check (GET)

Test with the MCP inspector:
    mcp dev --transport http core/tools/mcp_servers/crawl4ai_server_http.py
"""
import os

from mcp.server.fastmcp import FastMCP
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper

# ── Server configuration ──────────────────────────────────────────────────────
HOST = os.getenv("MCP_HOST", "0.0.0.0")
PORT = int(os.getenv("MCP_PORT", "8000"))

mcp = FastMCP(
    name="crawl4ai",
    instructions=(
        "Scrape any public URL and return its content as clean markdown. "
        "Use this when you need to read the full text of a web page."
    ),
)

_scraper = Crawl4AIScraper()


# ── Tools (identical to the stdio version) ────────────────────────────────────

@mcp.tool()
async def scrape_url(
    url: str,
    timeout: int = 30,
    extract_links: bool = False,
    extract_images: bool = False,
    include_html: bool = False,
) -> dict:
    """
    Scrape a web page and return its content as markdown.

    Args:
        url: The URL to scrape.
        timeout: Maximum seconds to wait (5-120). Default 30.
        extract_links: Include internal/external links. Default False.
        extract_images: Include image metadata. Default False.
        include_html: Include raw HTML. Default False.

    Returns:
        success (bool)       - whether scraping succeeded
        content.markdown     - clean markdown text of the page
        content.title        - page title
        content.url          - final URL after redirects
        content.status_code  - HTTP status code
        error                - error message if success=False
    """
    result = await _scraper.execute(
        url=url,
        timeout=timeout,
        extract_links=extract_links,
        extract_images=extract_images,
        include_html=include_html,
    )
    return result.model_dump()


# ── Startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Starting Crawl4AI MCP server on http://{HOST}:{PORT}/mcp")
    mcp.run(
        transport="streamable-http",
        host=HOST,
        port=PORT,
        path="/mcp",          # MCP endpoint — clients POST here
    )
```

### What is different from the stdio version?

| | stdio server | HTTP server |
|---|---|---|
| `mcp.run()` | `mcp.run()` — no args | `mcp.run(transport="streamable-http", host=..., port=..., path=...)` |
| How it starts | Client subprocess-spawns it | You start it yourself (`python server.py`) |
| Who connects | One client at a time | Many clients concurrently |
| URL | None — stdin/stdout | `http://host:port/mcp` |
| Tool code | Same `@mcp.tool()` functions | **Identical** — no change |

The `@mcp.tool()` decorated functions are copy-pasted exactly. The only difference is the last block.

### Health check endpoint (optional but recommended for deployments)

FastMCP doesn't add a health route automatically. Add one for liveness probes:

```python
# Add this before `if __name__ == "__main__":` in the HTTP server

from starlette.applications import Starlette
from starlette.routing import Route
from starlette.responses import JSONResponse

async def health(request):
    return JSONResponse({"status": "ok", "server": "crawl4ai-mcp"})

# Attach to FastMCP's underlying Starlette app
mcp.app.routes.append(Route("/health", health))
```

Then test it:
```bash
curl http://localhost:8000/health
# {"status": "ok", "server": "crawl4ai-mcp"}
```

---

## Part 4c — One file, both transports (env-based switcher)

Rather than maintaining two files, you can have one file that selects the transport at startup based on an environment variable. This is the recommended pattern for real deployments.

```python
"""
MCP Server: Crawl4AI — transport selected by environment variable.

Set MCP_TRANSPORT=stdio    → stdio mode (default, for local/dev)
Set MCP_TRANSPORT=http     → HTTP mode (for deployed services)

Run locally (stdio):
    python -m core.tools.mcp_servers.crawl4ai_server

Deploy (HTTP):
    MCP_TRANSPORT=http MCP_PORT=8000 python -m core.tools.mcp_servers.crawl4ai_server
"""
import os

from mcp.server.fastmcp import FastMCP
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper

# ── Read transport config from environment ────────────────────────────────────
TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")   # "stdio" | "http"
HOST      = os.getenv("MCP_HOST", "0.0.0.0")
PORT      = int(os.getenv("MCP_PORT", "8000"))

mcp = FastMCP(
    name="crawl4ai",
    instructions=(
        "Scrape any public URL and return its content as clean markdown. "
        "Use this when you need to read the full text of a web page."
    ),
)

_scraper = Crawl4AIScraper()


@mcp.tool()
async def scrape_url(
    url: str,
    timeout: int = 30,
    extract_links: bool = False,
    extract_images: bool = False,
    include_html: bool = False,
) -> dict:
    """
    Scrape a web page and return its content as markdown.

    Args:
        url: The URL to scrape.
        timeout: Maximum seconds to wait (5-120). Default 30.
        extract_links: Include internal/external links. Default False.
        extract_images: Include image metadata. Default False.
        include_html: Include raw HTML. Default False.

    Returns:
        success (bool)       - whether scraping succeeded
        content.markdown     - clean markdown text of the page
        content.title        - page title
        content.url          - final URL after redirects
        content.status_code  - HTTP status code
        error                - error message if success=False
    """
    result = await _scraper.execute(
        url=url,
        timeout=timeout,
        extract_links=extract_links,
        extract_images=extract_images,
        include_html=include_html,
    )
    return result.model_dump()


if __name__ == "__main__":
    if TRANSPORT == "http":
        print(f"[crawl4ai-mcp] HTTP transport → http://{HOST}:{PORT}/mcp")
        mcp.run(
            transport="streamable-http",
            host=HOST,
            port=PORT,
            path="/mcp",
        )
    else:
        # stdio — no host/port needed; client manages the subprocess
        mcp.run()
```

Usage:

```bash
# Local dev (stdio — default)
python -m core.tools.mcp_servers.crawl4ai_server

# Production / deployed (HTTP)
MCP_TRANSPORT=http MCP_PORT=8080 python -m core.tools.mcp_servers.crawl4ai_server
```

`.env` for deployment:
```
MCP_TRANSPORT=http
MCP_HOST=0.0.0.0
MCP_PORT=8000
```

---

The MCP CLI ships with a browser-based inspector. Run this from `backend/`.

### Important behavior in stdio mode

If you run only this:

```bash
python -m core.tools.mcp_servers.crawl4ai_server
```

it will appear to do **nothing**. That is expected.

Why:
1. `stdio` servers do not start an HTTP UI by themselves.
2. They sit silently and wait for a client to connect over stdin/stdout.
3. So this command is useful only when another MCP client is spawning or connecting to it.

If you want a browser UI to test the tool manually, use the MCP Inspector.

### Stdio: test with the MCP Inspector UI

For this repo, the reliable local command is:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=$PWD mcp dev core/tools/mcp_servers/crawl4ai_server.py
```

Why `PYTHONPATH=$PWD` is needed here:
1. `mcp dev` imports the server file directly by path.
2. Your server file imports `from core.tools...`.
3. Setting `PYTHONPATH=$PWD` makes the `backend/` directory importable as the package root.

What happens when it works:
1. `mcp dev` starts the inspector proxy.
2. It prints a local browser URL.
3. In your environment it opened on `http://localhost:6274/...`, not `5173`.

So use the URL printed in the terminal, for example:

```text
http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...
```

Do not hardcode `5173` in this project. The port can vary by MCP Inspector version.

### How to test in the Inspector UI

Once the browser opens:
1. Open the **Tools** tab.
2. Confirm you can see `scrape_url`.
3. Click `scrape_url`.
4. Enter a URL such as `https://example.com`.
5. Optionally set `timeout`, `extract_links`, `extract_images`, or `include_html`.
6. Click **Run**.
7. Inspect the returned JSON payload.

You already verified the happy path correctly if:
1. the tool appears in the Tools list,
2. you can submit a URL,
3. and the server returns a JSON response with `success: true`.

**HTTP** (start the server first in a separate terminal):
```bash
# Terminal 1 — start the HTTP server
MCP_TRANSPORT=http python -m core.tools.mcp_servers.crawl4ai_server

# Terminal 2 — open inspector against it
mcp dev --transport http --url http://localhost:8000/mcp
```

In both cases, the browser opens on the URL printed by the CLI. The exact localhost port may vary by MCP version. In both cases:
- Click **Tools** tab → you should see `scrape_url`
- Click it → fill in `url: "https://example.com"` → hit **Run**
- You should see the markdown content returned

The inspector UI is identical regardless of transport — only the startup command differs.

---

## Part 6 — Test stdio with a Python client script

Create `backend/core/tools/mcp_servers/test_crawl4ai_mcp.py` to test the stdio server programmatically:

```python
"""
Test: Call the crawl4ai MCP server (stdio) from Python.

Run from backend/:
    python core/tools/mcp_servers/test_crawl4ai_mcp.py
"""
import asyncio
import json
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_SCRIPT = str(Path(__file__).parent / "crawl4ai_server.py")


async def main():
    server_params = StdioServerParameters(
        command="python",
        args=[SERVER_SCRIPT],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:

            # Step 1: Initialize the session
            await session.initialize()
            print("Session initialized")

            # Step 2: Discover available tools
            tools = await session.list_tools()
            print(f"\nAvailable tools: {[t.name for t in tools.tools]}")

            # Step 3: Read the tool schema
            for tool in tools.tools:
                print(f"\nTool: {tool.name}")
                print(f"  Description: {tool.description}")
                print(f"  Input schema: {json.dumps(tool.inputSchema, indent=4)}")

            # Step 4: Call the tool
            print("\nCalling scrape_url on https://example.com ...")
            result = await session.call_tool(
                "scrape_url",
                arguments={"url": "https://example.com", "timeout": 15},
            )

            # Step 5: Read the result
            if result.content:
                raw = result.content[0].text
                data = json.loads(raw)
                print(f"\nSuccess: {data['success']}")
                if data["success"] and data.get("content"):
                    print(f"Title: {data['content']['title']}")
                    print(f"Markdown preview:\n{data['content']['markdown'][:300]}...")
                else:
                    print(f"Error: {data.get('error')}")


if __name__ == "__main__":
    asyncio.run(main())
```

Run it from `backend/`:

```bash
python core/tools/mcp_servers/test_crawl4ai_mcp.py
```

Expected output:
```
Session initialized

Available tools: ['scrape_url']

Tool: scrape_url
  Description: Scrape a web page and return its content as markdown.
  Input schema: {
      "type": "object",
      "properties": {
          "url": { "type": "string", ... },
          "timeout": { "type": "integer", ... },
          ...
      }
  }

Calling scrape_url on https://example.com ...

Success: True
Title: Example Domain
Markdown preview:
# Example Domain
This domain is for use in illustrative examples...
```

---

## Part 6b — Test HTTP with a Python client script

Create `backend/core/tools/mcp_servers/test_crawl4ai_mcp_http.py`:

```python
"""
Test: Call the crawl4ai MCP server (HTTP) from Python.

First start the server:
    MCP_TRANSPORT=http python -m core.tools.mcp_servers.crawl4ai_server

Then run this script from backend/:
    python core/tools/mcp_servers/test_crawl4ai_mcp_http.py
"""
import asyncio
import json
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

SERVER_URL = "http://localhost:8000/mcp"


async def main():
    async with streamablehttp_client(SERVER_URL) as (read, write, _):
        async with ClientSession(read, write) as session:

            # Step 1: Initialize the session
            await session.initialize()
            print("Session initialized")

            # Step 2: Discover available tools
            tools = await session.list_tools()
            print(f"\nAvailable tools: {[t.name for t in tools.tools]}")

            # Step 3: Read the tool schema
            for tool in tools.tools:
                print(f"\nTool: {tool.name}")
                print(f"  Description: {tool.description}")
                print(f"  Input schema: {json.dumps(tool.inputSchema, indent=4)}")

            # Step 4: Call the tool
            print("\nCalling scrape_url on https://example.com ...")
            result = await session.call_tool(
                "scrape_url",
                arguments={"url": "https://example.com", "timeout": 15},
            )

            # Step 5: Read the result
            if result.content:
                raw = result.content[0].text
                data = json.loads(raw)
                print(f"\nSuccess: {data['success']}")
                if data["success"] and data.get("content"):
                    print(f"Title: {data['content']['title']}")
                    print(f"Markdown preview:\n{data['content']['markdown'][:300]}...")
                else:
                    print(f"Error: {data.get('error')}")


if __name__ == "__main__":
    asyncio.run(main())
```

Key difference from the stdio client:

| | stdio client | HTTP client |
|---|---|---|
| Import | `from mcp.client.stdio import stdio_client` | `from mcp.client.streamable_http import streamablehttp_client` |
| Connection target | `StdioServerParameters(command="python", args=[...])` | `"http://localhost:8000/mcp"` |
| Server lifecycle | Client spawns server, kills it on exit | Server runs independently |
| Context manager | `stdio_client(params) as (read, write)` | `streamablehttp_client(url) as (read, write, _)` |
| Session setup | Same `ClientSession(read, write)` | **Identical** |
| Tool calls | Same `session.call_tool(...)` | **Identical** |

Once you have a `ClientSession`, the API is 100% identical — you can't tell which transport you're using.

---

## Part 7 — What the tests confirm

When both tests pass, you have verified:

**stdio:**
1. **Server starts** — FastMCP boots, loads the tool, listens on stdin/stdout
2. **Tool discovery works** — `list_tools()` returns `scrape_url` with correct schema
3. **Tool call round-trip works** — client sends JSON args, server executes `Crawl4AIScraper.execute()`, returns JSON result
4. **Process boundary works** — server runs in its own subprocess; if it crashes it doesn't take down the caller

**HTTP:**
1. **Server starts independently** — FastMCP boots and binds a port; no subprocess spawning by the client
2. **Tool discovery works** — same `list_tools()` call, same result
3. **Multiple clients can connect** — the server keeps running between calls
4. **Network boundary works** — server can run on a remote host, in a container, or behind a load balancer

---

## Part 8 — The anatomy of what you built

### stdio architecture

```
┌──────────────────────────────────────────────────────────────┐
│  MCP Client (test_crawl4ai_mcp.py)                           │
│                                                              │
│  StdioServerParameters(command="python", args=[server.py])  │
│  stdio_client(params) → spawns subprocess automatically      │
│                                                              │
│  session.list_tools()   ─────────────────────────────┐      │
│  session.call_tool("scrape_url", {url: "..."})        │      │
└─────────────────────────────────────────────────────┬┼──────┘
                                                      │ │
                         stdin/stdout pipe (OS level) │ │
                                                      │ │
┌─────────────────────────────────────────────────────┼┼──────┐
│  MCP Server subprocess (crawl4ai_server.py)         │ │     │
│                                                     ▼ │     │
│  FastMCP                                              │     │
│  └── @mcp.tool() scrape_url(url, timeout, ...)       │     │
│        └── Crawl4AIScraper().execute(url, ...)       │     │
│              └── AsyncWebCrawler                     │     │
│                    └── Crawl4AIScraperOutput         │     │
│  serialize to JSON ──────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### HTTP (Streamable HTTP) architecture

```
┌────────────────────────────────────┐
│  MCP Client A                      │  Any number of clients
│  streamablehttp_client(url)        │  can connect simultaneously.
│  session.call_tool("scrape_url"...) ├──POST /mcp──────────┐
└────────────────────────────────────┘                      │
                                                            │
┌────────────────────────────────────┐                      ▼
│  MCP Client B                      │  ┌──────────────────────────────────────┐
│  streamablehttp_client(url)        ├──POST /mcp──►  MCP Server               │
│  session.call_tool("scrape_url"...) │  │            (crawl4ai_server.py)      │
└────────────────────────────────────┘  │                                      │
                                        │  FastMCP  (host=0.0.0.0, port=8000)  │
                                        │  └── @mcp.tool() scrape_url(...)      │
                                        │        └── Crawl4AIScraper().execute()│
                                        │              └── AsyncWebCrawler      │
                                        │  ◄── JSON response ───────────────── │
                                        └──────────────────────────────────────┘
```

The original `Crawl4AIScraper` class is unchanged in both architectures. The server is a thin wrapper. The client API (`session.list_tools()`, `session.call_tool()`) is identical — only the connection setup differs.

---

## Part 9 — What comes next (after this works)

Once you confirm this works, the pattern is identical for any other tool:

1. Create a new `@mcp.tool()` function in the same server file, OR
2. Create a new server file (e.g., `ddgs_server.py`) for a different tool group
3. Add the tool to `langchain-mcp-adapters` so LangGraph nodes can call it

```python
# Future: calling MCP tools from the research executor
from langchain_mcp_adapters.client import MultiServerMCPClient

# stdio — server is a local subprocess
async with MultiServerMCPClient({
    "web_tools": {
        "command": "python",
        "args": ["-m", "core.tools.mcp_servers.crawl4ai_server"],
        "transport": "stdio",
    }
}) as client:
    tools = client.get_tools()
    result = await tools["scrape_url"].ainvoke({"url": "https://example.com"})

# HTTP — server is a deployed service
async with MultiServerMCPClient({
    "web_tools": {
        "url": "http://crawl4ai-mcp-service:8000/mcp",
        "transport": "streamable_http",
    }
}) as client:
    tools = client.get_tools()
    result = await tools["scrape_url"].ainvoke({"url": "https://example.com"})
```

---

## Summary: The conversion checklist

### stdio (local / development)
```
[ ] 1. pip install "mcp[cli]"
[ ] 2. Create core/tools/mcp_servers/__init__.py  (empty)
[ ] 3. Create core/tools/mcp_servers/crawl4ai_server.py
       - import FastMCP
       - import your existing tool class
       - write @mcp.tool() wrapper function
       - mcp.run()  ← no args, defaults to stdio
[ ] 4. Test browser UI:   mcp dev core/tools/mcp_servers/crawl4ai_server.py
[ ] 5. Test Python:       python core/tools/mcp_servers/test_crawl4ai_mcp.py
[ ] 6. Confirm: tool discovery + call + response all work
```

### HTTP (deployed / production)
```
[ ] 1. Same server file — change mcp.run() to:
       mcp.run(transport="streamable-http", host="0.0.0.0", port=8000, path="/mcp")
       OR use env-based switcher (Part 4c) — recommended
[ ] 2. Start server:     MCP_TRANSPORT=http python -m core.tools.mcp_servers.crawl4ai_server
[ ] 3. Test browser UI:  mcp dev --transport http --url http://localhost:8000/mcp
[ ] 4. Test Python:      python core/tools/mcp_servers/test_crawl4ai_mcp_http.py
[ ] 5. Test health:      curl http://localhost:8000/health
[ ] 6. Confirm: multiple clients can connect, results are correct
```

### Decision guide: which transport to use?
```
Is this running locally on one machine, for dev/testing?
  YES → stdio

Do you need to deploy it (cloud, container, k8s)?
  YES → HTTP

Do multiple agents/services need to share one server instance?
  YES → HTTP

Unsure / want both options open?
  → Use the env-based switcher from Part 4c
     MCP_TRANSPORT=stdio   for local
     MCP_TRANSPORT=http    for deployed
```

---

_Last updated: 2026-05-05_
