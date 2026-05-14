import json
import httpx
from mcp.server.fastmcp import FastMCP
from configs.settings import get_settings

mcp = FastMCP(
    name="Pexels",
    instructions="Search for high-quality licensed photos from Pexels. Returns photo URLs, photographer credits, and metadata."
)

_settings = get_settings()
_PEXELS_BASE_URL = "https://api.pexels.com/v1"

@mcp.tool()
async def search_photos(
    query: str,
    per_page: int = 15,
    orientation: str = "square",
    size: str = "large",
    page: int = 1,
) -> str:
    """
    Search Pexels for photos matching a query.

    Args:
        query: Search keywords, e.g. "artificial intelligence", "remote work office"
        per_page: Number of results (1-80). Default 15.
        orientation: "square", "landscape", or "portrait". Default "square".
        size: "large" (24MP), "medium" (12MP), or "small" (4MP). Default "large".
        page: Page number. Default 1.

    Returns:
        JSON string with list of photos. Each photo has:
          id, url, photographer, photographer_url, avg_color,
          src.original, src.large2x, src.large, width, height
    """

    api_key = _settings.pexels_api_key
    if not api_key:
        return json.dumps({"success": False, "error": "Pexels API key not configured", "photos": []})
    
    params = {
        "query": query,
        "per_page": min(per_page, 80),
        "orientation": orientation,
        "size": size,
        "page": page
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{_PEXELS_BASE_URL}/search", params=params, headers={"Authorization": api_key})
            response.raise_for_status()
            data = response.json()
            photos = [
                {
                    "id": photo["id"],
                    "url": photo["url"],
                    "photographer": photo["photographer"],
                    "photographer_url": photo["photographer_url"],
                    "avg_color": photo.get("avg_color", "#333333"),
                    "width": photo["width"],
                    "height": photo["height"],
                    "src": photo.get("src", {})
                }
                for photo in data.get("photos", [])
            ]

            return json.dumps(({
                "success": True,
                "total_results": data.get("total_results", 0),
                "photos": photos
            }))
        
    except Exception as e:
        return json.dumps({"success": False, "error": str(e), "photos": []})
    
if __name__ == "__main__":
    mcp.run(transport="stdio")