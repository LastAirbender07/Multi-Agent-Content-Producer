import socket
from contextlib import asynccontextmanager
from pathlib import Path
from aiohttp import web


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


@asynccontextmanager
async def serve_directory(root: Path, port: int = None):
    """
    Async context manager that serves `root` as a static HTTP server.
    Yields the base URL string (e.g. "http://localhost:54321").
    """
    if port is None:
        port = _find_free_port()

    app = web.Application()
    app.router.add_static("/", path=str(root), show_index=False, follow_symlinks=True)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "localhost", port)
    await site.start()
    try:
        yield f"http://localhost:{port}"
    finally:
        await runner.cleanup()
