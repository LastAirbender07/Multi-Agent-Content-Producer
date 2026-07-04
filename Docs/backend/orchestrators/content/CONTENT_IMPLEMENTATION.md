# Content Orchestrator — Complete Implementation Code

**Purpose:** Every file change and new file needed to build Stage 3 (content generation, image
retrieval, carousel rendering). Copy-paste ready.

**Image strategy:** Pexels + DDGS run concurrently via `asyncio.gather`. Results pooled. Best
images selected by score (Pexels prioritised, narrow images filtered). No Unsplash.

**Rendering:** Jinja2 templates → local HTTP server → Playwright (2×) → Pillow LANCZOS → 1080×1080 PNG.

---

## 0. Prerequisites

### 0a. Install additional packages

```bash
cd backend
source .venv/bin/activate
pip install httpx aiohttp Pillow jinja2 playwright
playwright install chromium
```

### 0b. Download self-hosted fonts

```bash
mkdir -p backend/assets/fonts
# Download Plus Jakarta Sans
curl -L "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg8tA-8BXURg.woff2" -o backend/assets/fonts/PlusJakartaSans-Regular.woff2
curl -L "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko50yygg8tA-8BXURg.woff2" -o backend/assets/fonts/PlusJakartaSans-SemiBold.woff2
curl -L "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko70yygg8tA-8BXURg.woff2" -o backend/assets/fonts/PlusJakartaSans-Bold.woff2
# Download Syne Bold
curl -L "https://fonts.gstatic.com/s/syne/v23/8vIS7w4qzmVxsWxjEKc.woff2" -o backend/assets/fonts/Syne-Bold.woff2

mkdir -p backend/assets/brand
touch backend/assets/brand/.gitkeep
```

> **Note:** The above woff2 URLs are Google Fonts CDN paths — verify they resolve. If not, download
> manually from fonts.google.com (Plus Jakarta Sans + Syne) and place the Bold/SemiBold/Regular
> .woff2 files in `backend/assets/fonts/`.

### 0c. Add to `.env`

```env
PEXELS_API_KEY=j6cOpkKTFLKVUMa8zOl6kUK05AL187CvHDQLOEc6x3dnmcmte3CVsgHg
```

---

## 1. Fixes to Existing Files

### 1a. `backend/core/orchestration/contracts.py`

Three fixes in the content section. Apply all three in one edit.

**Fix 1 — rename `start_label` to `stat_label` in `Slide`:**

```python
# OLD (line ~151):
    start_label: Optional[str] = Field(default=None, description="The label for the start of a stat range, if applicable")

# NEW:
    stat_label: Optional[str] = Field(default=None, description="The descriptive label below a stat value, e.g. 'workers affected'")
```

**Fix 2 — change `max_slides` default in `ContentRequest`:**

```python
# OLD:
    max_slides: int = Field(default=12, ...)

# NEW:
    max_slides: int = Field(default=9, description="Maximum number of slides to generate (ideal 6-8, hard cap 20)")
```

**Fix 3 — change `carousel_paths` type in `ContentResponse`:**

```python
# OLD:
    carousel_paths: list[str] = Field(default_factory=list, description="List of paths to the generated carousel JSON files")

# NEW:
    carousel_paths: list[list[str]] = Field(default_factory=list, description="Per-angle list of PNG paths: carousel_paths[i] = slide PNGs for angle i")
```

**Fix 4 — add `SlideGenerationOutput` after the `Slide` class:**

```python
class SlideGenerationOutput(BaseModel):
    slides: list[Slide] = Field(..., description="Generated slides for the carousel")
```

**Fix 5 — update `ImageAsset.source` description (remove unsplash):**

```python
# OLD:
    source: str = Field(..., description="pexels, unsplash, ddgs, brand, colour")

# NEW:
    source: str = Field(..., description="pexels, ddgs, brand, colour")
```

### 1b. `backend/core/schemas/workflow_state.py`

Replace the broken `ContentGraphState` at the bottom of the file:

```python
# OLD (lines 57-65):
class ContentGraphState(TypedDict, total=False):
    request: str
    run_id: str
    current_angle_index: str
    content_contents: list[dict]
    image_assets: list[dict]
    carousel_paths: list[list[str]]
    messages: list[str]
    errors: list[str]

# NEW:
class ContentGraphState(TypedDict, total=False):
    request: dict          # ContentRequest.model_dump()
    run_id: str
    angle: dict            # current Angle.model_dump() being processed
    angle_index: int
    slides: list[dict]     # list of Slide.model_dump()
    caption: str
    hashtags: list[str]
    image_assets: list[dict]   # list of ImageAsset.model_dump()
    slide_html_paths: list[str]
    slide_png_paths: list[str]
    messages: list[str]
    errors: list[str]
    output_path: str
```

### 1c. `backend/configs/settings.py`

Add these fields to the `Settings` class (after the angle settings block):

```python
    # === Pexels Image API ===
    pexels_api_key: Optional[str] = None

    # Content Orchestrator Settings
    content_max_slides: int = 9
    content_min_slides: int = 4
    content_image_per_slide: int = 1
    content_output_dirs: str = "outputs"
```

---

## 2. New MCP Server — Pexels

### `backend/core/tools/mcp_servers/pexels_server.py`

```python
import json
import httpx
from mcp.server.fastmcp import FastMCP
from configs.settings import get_settings

mcp = FastMCP(
    name="Pexels",
    instructions="Search for high-quality licensed photos from Pexels. Returns photo URLs, photographer credits, and metadata."
)

_settings = get_settings()
_PEXELS_BASE = "https://api.pexels.com/v1"


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
        return json.dumps({"success": False, "error": "PEXELS_API_KEY not configured", "photos": []})

    params = {
        "query": query,
        "per_page": min(per_page, 80),
        "orientation": orientation,
        "size": size,
        "page": page,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{_PEXELS_BASE}/search",
                params=params,
                headers={"Authorization": api_key},
            )
            response.raise_for_status()
            data = response.json()

        photos = [
            {
                "id": p["id"],
                "url": p["url"],
                "photographer": p["photographer"],
                "photographer_url": p["photographer_url"],
                "avg_color": p.get("avg_color", "#333333"),
                "width": p["width"],
                "height": p["height"],
                "src": p.get("src", {}),
            }
            for p in data.get("photos", [])
        ]

        return json.dumps({
            "success": True,
            "total_results": data.get("total_results", 0),
            "photos": photos,
        })

    except Exception as e:
        return json.dumps({"success": False, "error": str(e), "photos": []})


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

## 3. New Prompt Templates

### `backend/core/prompts/templates/slide_generation.txt`

```
You are a social media content strategist creating a LinkedIn/Instagram carousel.

ANGLE:
Statement: {angle_statement}
Emotional hook: {emotional_hook}
Supporting evidence: {supporting_evidence}

TOPIC: {topic}

RESEARCH SUMMARY:
{research_summary}

KEY POINTS:
{key_points}

---

Create {target_slides} slides for this carousel. Use these slide types:
- hook     : First slide only. 7-word max headline that stops the scroll.
- stat     : ONE big number/percentage with a short label. Most shocking stat second.
- content  : Main insight slide. Title (max 8 words) + body (10-25 words MAX).
- quote    : A direct quote from a source or a punchy pull-quote.
- cta      : Last slide only. "Follow for more" style call-to-action.

RULES:
1. First slide MUST be type=hook
2. Last slide MUST be type=cta
3. Body text MAXIMUM 25 words per slide. ONE idea per slide.
4. If you need more words, make another slide.
5. stat slides need stat_value (e.g. "73%") and stat_label (e.g. "of employees quit within 1 year")
6. Every non-cta slide should have an image_query (3-5 words for photo search)
7. Do not repeat ideas across slides
8. The emotional arc must flow: hook → shock/stat → insights → proof/quote → action

Return a JSON object with a "slides" array. Each slide:
{{
  "slide_number": 1,
  "type": "hook|content|stat|quote|cta",
  "title": "...",
  "body": "...",
  "stat_value": null,
  "stat_label": null,
  "image_query": "..."
}}
```

### `backend/core/prompts/templates/caption_generation.txt`

```
You are a LinkedIn content writer crafting a post caption for a carousel.

ANGLE: {angle_statement}
EMOTIONAL HOOK: {emotional_hook}
TOPIC: {topic}

CAROUSEL HOOK SLIDE TEXT:
{hook_slide_title}

SLIDE TITLES (in order):
{slide_titles}

---

Write:
1. A caption (150-250 words) that:
   - Opens with the hook slide text verbatim or a punchy restatement
   - Teases 2-3 key insights without revealing all
   - Ends with a question or call to action
   - Sounds like a human expert, not corporate speak
   - Matches the emotional tone: {emotional_hook}

2. 8-12 relevant hashtags (mix of niche + broad)

Return JSON:
{{
  "caption": "...",
  "hashtags": ["hashtag1", "hashtag2", ...]
}}
```

### `backend/core/prompts/templates/image_query_generation.txt`

```
You are helping select background images for a social media carousel slide.

SLIDE TYPE: {slide_type}
SLIDE TITLE: {slide_title}
SLIDE BODY: {slide_body}
TOPIC: {topic}
CURRENT QUERY: {current_query}

Rewrite the image_query to be more effective for stock photo search.
Rules:
- 3-5 words only
- Describe a SCENE or ATMOSPHERE, not an abstract concept
- Avoid: "technology", "business", "abstract", "concept"
- Prefer: "person working laptop coffee", "empty office desk", "city skyline night"
- For stat slides: prefer dramatic/moody backgrounds — "dark storm clouds", "empty warehouse"
- For hope/inspiration emotional hook: bright, natural, warm — "sunlight forest path"

Return just the query string, nothing else.
```

---

## 4. New Orchestrator Files

### `backend/core/orchestrators/content/__init__.py`

```python
```
(empty file)

### `backend/core/orchestrators/content/slide_generator.py`

```python
from core.orchestration.contracts import ContentRequest, SlideGenerationOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def generate_slides_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    target_slides = min(request.max_slides, 8)

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        user_prompt = load_prompt(
            "slide_generation",
            topic=request.topic,
            angle_statement=angle["statement"],
            emotional_hook=angle["emotional_hook"],
            supporting_evidence=angle["supporting_evidence"],
            research_summary=request.research_summary,
            key_points="\n".join(f"- {p}" for p in request.key_points),
            target_slides=target_slides,
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=SlideGenerationOutput,
            system_prompt=system_prompt,
        )

        slides = result.slides
        if len(slides) > request.max_slides:
            slides = slides[:request.max_slides]

        logger.info(
            "generate_slides_node_complete",
            run_id=state.get("run_id"),
            angle_index=state.get("angle_index"),
            slide_count=len(slides),
        )
        return {
            "slides": [s.model_dump() for s in slides],
            "messages": state.get("messages", []) + [f"Generated {len(slides)} slides"],
        }

    except Exception as e:
        logger.error("generate_slides_node_error", error=str(e))
        return {
            "slides": [],
            "errors": state.get("errors", []) + [f"Slide generation failed: {str(e)}"],
        }
```

### `backend/core/orchestrators/content/reorder.py`

```python
from core.orchestration.contracts import Slide, SlideType
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)


def reorder_slides_node(state: ContentGraphState) -> dict:
    """Enforce the canonical carousel arc: hook → stat → content → quote → cta."""
    raw = state.get("slides", [])
    slides = [Slide.model_validate(s) for s in raw]

    hooks = [s for s in slides if s.type == SlideType.hook]
    stats = [s for s in slides if s.type == SlideType.stat]
    quotes = [s for s in slides if s.type == SlideType.quote]
    ctas = [s for s in slides if s.type == SlideType.cta]
    content = [s for s in slides if s.type == SlideType.content]

    ordered = hooks + stats + content + quotes + ctas

    for i, s in enumerate(ordered, 1):
        s.slide_number = i

    logger.info("reorder_slides_node_complete", total=len(ordered))
    return {"slides": [s.model_dump() for s in ordered]}
```

### `backend/core/orchestrators/content/caption_generator.py`

```python
from pydantic import BaseModel, Field
from core.orchestration.contracts import ContentRequest
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ContentGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


class CaptionOutput(BaseModel):
    caption: str = Field(..., description="LinkedIn/Instagram post caption")
    hashtags: list[str] = Field(default_factory=list, description="List of hashtags without #")


async def generate_caption_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    slides = state.get("slides", [])

    hook_title = next(
        (s["title"] for s in slides if s.get("type") == "hook"),
        slides[0]["title"] if slides else ""
    )
    slide_titles = "\n".join(
        f"{i+1}. {s['title']}" for i, s in enumerate(slides)
    )

    try:
        llm = await LLMFactory.get_client()
        system_prompt = get_system_prompt("content")
        user_prompt = load_prompt(
            "caption_generation",
            topic=request.topic,
            angle_statement=angle["statement"],
            emotional_hook=angle["emotional_hook"],
            hook_slide_title=hook_title,
            slide_titles=slide_titles,
        )

        result = await llm.generate_structured(
            prompt=user_prompt,
            output_schema=CaptionOutput,
            system_prompt=system_prompt,
        )

        logger.info("generate_caption_node_complete", run_id=state.get("run_id"))
        return {
            "caption": result.caption,
            "hashtags": result.hashtags,
            "messages": state.get("messages", []) + ["Caption generated"],
        }

    except Exception as e:
        logger.error("generate_caption_node_error", error=str(e))
        return {
            "caption": "",
            "hashtags": [],
            "errors": state.get("errors", []) + [f"Caption generation failed: {str(e)}"],
        }
```

### `backend/core/orchestrators/content/image_fetcher.py`

```python
import asyncio
import json
import httpx
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.orchestration.contracts import ContentRequest, ImageAsset
from core.schemas.workflow_state import ContentGraphState
from core.tools.Search.ddgs_search import DDGSSearch
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_ddgs = DDGSSearch(timeout=15)


async def _search_pexels(query: str, per_page: int = 15) -> list[dict]:
    """Call Pexels MCP server, return list of photo dicts."""
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "core.tools.mcp_servers.pexels_server"],
    )
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                mcp_result = await session.call_tool(
                    "search_photos",
                    arguments={"query": query, "per_page": per_page, "orientation": "square"},
                )
                data = json.loads(mcp_result.content[0].text)
                if data.get("success"):
                    return [{"source": "pexels", **p} for p in data.get("photos", [])]
    except Exception as e:
        logger.warning("pexels_mcp_error", query=query, error=str(e))
    return []


async def _search_ddgs(query: str, max_results: int = 15) -> list[dict]:
    """Call DDGS image search, return normalised list."""
    try:
        output = await _ddgs.search_images(query=query, max_results=max_results)
        if output.success:
            return [
                {
                    "source": "ddgs",
                    "url": r.image,
                    "width": r.width or 0,
                    "height": r.height or 0,
                    "title": r.title,
                }
                for r in output.results
            ]
    except Exception as e:
        logger.warning("ddgs_image_error", query=query, error=str(e))
    return []


def _score_image(img: dict) -> float:
    """Higher = better. Pexels beats DDGS; wide images penalised."""
    score = 10.0 if img["source"] == "pexels" else 5.0
    w = img.get("width", 0)
    h = img.get("height", 0)
    if w < 800 or h < 800:
        score -= 8.0
    if w > 0 and h > 0:
        ratio = w / h
        if 0.8 <= ratio <= 1.25:
            score += 3.0
    return score


async def _download_image(url: str, dest: Path, source: str, api_key: str = None) -> bool:
    headers = {}
    if source == "pexels" and api_key:
        headers["Authorization"] = api_key
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
            return True
    except Exception as e:
        logger.warning("image_download_failed", url=url[:80], error=str(e))
        return False


async def fetch_images_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    slides = state.get("slides", [])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)

    images_dir = (
        Path(_settings.content_output_dirs)
        / run_id
        / "content"
        / f"angle_{angle_index}"
        / "images"
    )
    images_dir.mkdir(parents=True, exist_ok=True)

    image_assets: list[dict] = []

    for slide in slides:
        slide_num = slide["slide_number"]
        query = slide.get("image_query") or f"{request.topic} professional"

        if slide.get("type") == "stat":
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source="colour",
            ).model_dump())
            continue

        pexels_results, ddgs_results = await asyncio.gather(
            _search_pexels(query, per_page=15),
            _search_ddgs(query, max_results=15),
        )

        all_results = pexels_results + ddgs_results
        if not all_results:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        ranked = sorted(all_results, key=_score_image, reverse=True)
        best = ranked[0]

        download_url = best.get("src", {}).get("large2x") or best.get("url", "")
        if not download_url:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())
            continue

        dest = images_dir / f"slide_{slide_num:02d}.jpg"
        ok = await _download_image(
            download_url,
            dest,
            source=best["source"],
            api_key=_settings.pexels_api_key,
        )

        if ok:
            image_assets.append(ImageAsset(
                slide_number=slide_num,
                source=best["source"],
                original_url=download_url,
                local_raw_path=str(dest),
                processed_path=str(dest),
            ).model_dump())
        else:
            image_assets.append(ImageAsset(slide_number=slide_num, source="colour").model_dump())

        logger.info(
            "image_fetched",
            slide=slide_num,
            source=best["source"],
            query=query,
        )

    return {
        "image_assets": image_assets,
        "messages": state.get("messages", []) + [f"Images fetched for {len(image_assets)} slides"],
    }
```

### `backend/core/orchestrators/content/render_server.py`

```python
import asyncio
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
```

### `backend/core/orchestrators/content/carousel_generator.py`

```python
import asyncio
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from PIL import Image
from playwright.async_api import async_playwright

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, ImageAsset, Slide
from core.orchestrators.content.render_server import serve_directory
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()

_BACKEND_ROOT = Path(__file__).parents[3]
_TEMPLATES_ROOT = _BACKEND_ROOT / "core" / "templates" / "carousel"

_TEMPLATE_MAP = {
    "Anger": "aurora", "Fear": "aurora", "Urgency": "aurora",
    "Controversy": "aurora", "Surprise": "aurora",
    "Hope": "lumina", "Inspiration": "lumina", "Curiosity": "lumina",
}


def _get_template_name(emotional_hook: str) -> str:
    return _TEMPLATE_MAP.get(emotional_hook, "aurora")


async def render_slides_node(state: ContentGraphState) -> dict:
    """Render HTML for each slide using Jinja2 templates."""
    request = ContentRequest.model_validate(state["request"])
    angle = state["angle"]
    slides = [Slide.model_validate(s) for s in state.get("slides", [])]
    image_assets = {a["slide_number"]: a for a in state.get("image_assets", [])}
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)

    template_name = _get_template_name(angle.get("emotional_hook", ""))
    env = Environment(loader=FileSystemLoader(str(_TEMPLATES_ROOT / template_name)))

    slides_dir = (
        Path(_settings.content_output_dirs)
        / run_id / "content" / f"angle_{angle_index}" / "slides"
    )
    slides_dir.mkdir(parents=True, exist_ok=True)

    total = len(slides)
    html_paths: list[str] = []

    for slide in slides:
        asset = image_assets.get(slide.slide_number, {})
        image_path = asset.get("processed_path") or ""

        if image_path:
            image_path = "/" + str(
                Path(image_path).relative_to(_BACKEND_ROOT)
            ).replace("\\", "/")

        template = env.get_template(f"{slide.type.value}.html.j2")
        html = template.render(
            slide=slide,
            image_path=image_path,
            slide_number=slide.slide_number,
            total_slides=total,
            template=template_name,
            brand_name="",
            logo_path="",
            assets_root="/assets",
        )

        out_path = slides_dir / f"slide_{slide.slide_number:02d}.html"
        out_path.write_text(html, encoding="utf-8")
        html_paths.append(str(out_path))

    logger.info("render_slides_node_complete", count=len(html_paths))
    return {
        "slide_html_paths": html_paths,
        "messages": state.get("messages", []) + [f"Rendered {len(html_paths)} HTML slides"],
    }


async def screenshot_slides_node(state: ContentGraphState) -> dict:
    """Screenshot each HTML slide via Playwright; downscale 2160→1080."""
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    html_paths = state.get("slide_html_paths", [])

    output_dir = (
        Path(_settings.content_output_dirs)
        / run_id / "content" / f"angle_{angle_index}" / "png"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    serve_root = _BACKEND_ROOT

    png_paths: list[str] = []

    async with serve_directory(serve_root) as base_url:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1080, "height": 1080},
                device_scale_factor=2,
            )
            page = await context.new_page()

            for html_path in html_paths:
                rel = Path(html_path).relative_to(_BACKEND_ROOT)
                url = f"{base_url}/{str(rel).replace(chr(92), '/')}"

                await page.goto(url, wait_until="networkidle")
                await page.evaluate("document.fonts.ready")

                raw_path = output_dir / (Path(html_path).stem + "_raw.png")
                await page.screenshot(path=str(raw_path), full_page=False)

                final_path = output_dir / (Path(html_path).stem.replace("_raw", "") + ".png")
                img = Image.open(raw_path)
                img = img.resize((1080, 1080), Image.LANCZOS)
                img.save(str(final_path), "PNG", optimize=True)
                raw_path.unlink(missing_ok=True)

                png_paths.append(str(final_path))
                logger.info("slide_screenshotted", path=str(final_path))

            await browser.close()

    return {
        "slide_png_paths": png_paths,
        "messages": state.get("messages", []) + [f"Screenshotted {len(png_paths)} slides"],
    }
```

### `backend/core/orchestrators/content/finalizer.py`

```python
from pathlib import Path

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_OUTPUTS_ROOT = Path(_settings.content_output_dirs)


async def finalize_content_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    angle = state.get("angle", {})

    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
    stage = f"content/angle_{angle_index}"

    manager.save_json(stage, "slides.json", {
        "run_id": run_id,
        "angle_index": angle_index,
        "angle": angle,
        "slides": state.get("slides", []),
        "caption": state.get("caption", ""),
        "hashtags": state.get("hashtags", []),
    })

    manager.save_json(stage, "image_assets.json", {
        "image_assets": state.get("image_assets", []),
    })

    manager.save_json(stage, "carousel.json", {
        "run_id": run_id,
        "angle_index": angle_index,
        "angle_statement": angle.get("statement", ""),
        "emotional_hook": angle.get("emotional_hook", ""),
        "caption": state.get("caption", ""),
        "hashtags": state.get("hashtags", []),
        "slide_png_paths": state.get("slide_png_paths", []),
        "topic": request.topic,
    })

    output_path = str(manager.stage_dir(stage))
    logger.info("finalize_content_node_complete", run_id=run_id, angle_index=angle_index)
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Content saved to {output_path}"],
    }
```

### `backend/core/orchestrators/content/orchestrator.py`

```python
import uuid
from pathlib import Path

from configs.settings import get_settings
from core.graphs.content_graph import build_content_graph
from core.orchestration.contracts import ContentRequest, ContentResponse, RunStatus
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()


class ContentOrchestrator:
    def __init__(self):
        self._graph = build_content_graph().compile()

    async def run(self, request: ContentRequest) -> ContentResponse:
        run_id = request.run_id or str(uuid.uuid4())
        logger.info(
            "content_orchestrator_started",
            run_id=run_id,
            topic=request.topic,
            angles=len(request.selected_angles),
        )

        all_png_paths: list[list[str]] = []
        output_paths: list[str] = []
        angles_processed: list[int] = []
        all_errors: list[str] = []

        for idx, angle in enumerate(request.selected_angles):
            logger.info("content_processing_angle", run_id=run_id, angle_index=idx)
            initial: ContentGraphState = {
                "request": request.model_dump(),
                "run_id": run_id,
                "angle": angle,
                "angle_index": idx,
                "slides": [],
                "caption": "",
                "hashtags": [],
                "image_assets": [],
                "slide_html_paths": [],
                "slide_png_paths": [],
                "messages": [],
                "errors": [],
            }

            try:
                result = await self._graph.ainvoke(initial)
                png_paths = result.get("slide_png_paths", [])
                all_png_paths.append(png_paths)
                if result.get("output_path"):
                    output_paths.append(result["output_path"])
                angles_processed.append(idx)
                all_errors.extend(result.get("errors", []))
                logger.info(
                    "content_angle_complete",
                    run_id=run_id,
                    angle_index=idx,
                    slides=len(png_paths),
                )
            except Exception as e:
                logger.error("content_angle_failed", run_id=run_id, angle_index=idx, error=str(e))
                all_errors.append(f"Angle {idx} failed: {str(e)}")
                all_png_paths.append([])

        status = RunStatus.SUCCESS if not all_errors else (
            RunStatus.PARTIAL_SUCCESS if angles_processed else RunStatus.FAILED
        )

        return ContentResponse(
            run_id=run_id,
            status=status,
            angles_processed=angles_processed,
            output_paths=output_paths,
            carousel_paths=all_png_paths,
            errors=all_errors,
        )
```

---

## 5. New Graph

### `backend/core/graphs/content_graph.py`

```python
from langgraph.graph import START, END, StateGraph

from core.orchestrators.content.caption_generator import generate_caption_node
from core.orchestrators.content.carousel_generator import render_slides_node, screenshot_slides_node
from core.orchestrators.content.finalizer import finalize_content_node
from core.orchestrators.content.image_fetcher import fetch_images_node
from core.orchestrators.content.reorder import reorder_slides_node
from core.orchestrators.content.slide_generator import generate_slides_node
from core.schemas.workflow_state import ContentGraphState


def _route_after_generate(state: ContentGraphState) -> str:
    if state.get("errors") or not state.get("slides"):
        return "finalize"
    return "reorder"


def build_content_graph() -> StateGraph:
    graph = StateGraph(ContentGraphState)

    graph.add_node("generate_slides", generate_slides_node)
    graph.add_node("reorder", reorder_slides_node)
    graph.add_node("generate_caption", generate_caption_node)
    graph.add_node("fetch_images", fetch_images_node)
    graph.add_node("render_slides", render_slides_node)
    graph.add_node("screenshot_slides", screenshot_slides_node)
    graph.add_node("finalize", finalize_content_node)

    graph.add_edge(START, "generate_slides")
    graph.add_conditional_edges(
        "generate_slides",
        _route_after_generate,
        {"reorder": "reorder", "finalize": "finalize"},
    )
    graph.add_edge("reorder", "generate_caption")
    graph.add_edge("generate_caption", "fetch_images")
    graph.add_edge("fetch_images", "render_slides")
    graph.add_edge("render_slides", "screenshot_slides")
    graph.add_edge("screenshot_slides", "finalize")
    graph.add_edge("finalize", END)

    return graph
```

---

## 6. Replace `backend/core/nodes/content.py`

The current file references non-existent classes. Replace entirely:

```python
from pathlib import Path

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_orchestrator = ContentOrchestrator()


async def content_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    run_id = state.get("run_id")
    selected_angles = state.get("selected_angles", [])
    research_data = state.get("research_data", {})

    logger.info("content_node_start", topic=topic, run_id=run_id, angles=len(selected_angles))

    if not selected_angles:
        return {
            "errors": state.get("errors", []) + ["content_node: no selected_angles in state"],
            "messages": state.get("messages", []) + ["Content skipped — no angles selected"],
        }

    try:
        request = ContentRequest(
            run_id=run_id,
            topic=topic,
            selected_angles=selected_angles,
            research_summary=research_data.get("summary", ""),
            key_points=research_data.get("key_points", []),
            max_slides=_settings.content_max_slides,
            min_slides=_settings.content_min_slides,
        )

        result = await _orchestrator.run(request)

        logger.info(
            "content_node_complete",
            run_id=run_id,
            angles_processed=len(result.angles_processed),
            status=result.status,
        )

        return {
            "messages": state.get("messages", []) + [
                f"Content generated for {len(result.angles_processed)} angles"
            ],
            "errors": state.get("errors", []) + result.errors,
        }

    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))
        return {
            "errors": state.get("errors", []) + [f"Content generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Content generation failed: {str(e)}"],
        }
```

---

## 7. New API Router

### `backend/apps/api/v1/content.py`

```python
from fastapi import APIRouter, HTTPException
from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.orchestrator import ContentOrchestrator

router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()


@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    """
    Generate carousel slides, caption, images, and PNG exports for selected angles.

    Provide run_id from a prior angle/research run to group outputs together.
    selected_angles must be a list of angle dicts (statement, emotional_hook, supporting_evidence).
    """
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)
```

---

## 8. Update Pipeline Files

### `backend/apps/cli/run_workflow.py`

Add the import at the top (with existing imports):

```python
from core.nodes.content import content_node
```

Then uncomment / replace Stage 3 in the `run()` method:

```python
        # Stage 3: Content generation
        state = await self._run_stage("content", content_node, state)
        if state.get("errors"):
            logger.error("pipeline_aborted_after_content", errors=state["errors"])
            return state
```

The commented-out Stage 3 block (lines 59-60) becomes the above.

### `backend/main.py`

Add the content router import and registration:

```python
# ADD to imports (line 4):
from apps.api.v1.content import router as content_router

# ADD after existing include_router calls (line 14):
app.include_router(content_router, prefix="/api/v1")
```

---

## 9. Add System Prompt for Content

In `backend/core/prompts/system_prompts.py`, add to the `SystemPrompts` enum:

```python
    CONTENT = """You are a viral social media content creator specialising in LinkedIn and Instagram carousels.

Your mandate:
- Every slide must earn its place — delete the weak ones
- One idea per slide, no exceptions
- Headlines that stop the thumb mid-scroll
- Body text that delivers on the headline's promise
- Build tension across the carousel, release it in the CTA

Voice:
- Confident and direct — no hedging
- Data-driven but human — numbers with context
- Provocative but credible — outrage must be justified

Format rules:
- Title: max 8 words
- Body: 10-25 words, single idea only
- Stat slides: one number, one label — nothing else
- CTA slide: action + identity reinforcement ("Follow for weekly breakdowns")"""
```

Then in the `get_system_prompt()` function (same file), add the mapping for `"content"`:

```python
# Find the existing mapping dict or if/elif chain and add:
"content": SystemPrompts.CONTENT.value
```

---

## 10. HTML/CSS Templates

### Directory structure to create:

```
backend/core/templates/carousel/
  aurora/
    _base.html.j2
    hook.html.j2
    content.html.j2
    stat.html.j2
    quote.html.j2
    cta.html.j2
    style.css
  lumina/
    _base.html.j2
    hook.html.j2
    content.html.j2
    stat.html.j2
    quote.html.j2
    cta.html.j2
    style.css
```

---

### `backend/core/templates/carousel/aurora/_base.html.j2`

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<title>Slide {{ slide_number }}</title>
<style>
@font-face {
    font-family: 'Syne';
    src: url('{{ assets_root }}/fonts/Syne-Bold.woff2') format('woff2');
    font-weight: 700; font-style: normal;
}
@font-face {
    font-family: 'PlusJakarta';
    src: url('{{ assets_root }}/fonts/PlusJakartaSans-Bold.woff2') format('woff2');
    font-weight: 700; font-style: normal;
}
@font-face {
    font-family: 'PlusJakarta';
    src: url('{{ assets_root }}/fonts/PlusJakartaSans-SemiBold.woff2') format('woff2');
    font-weight: 600; font-style: normal;
}
@font-face {
    font-family: 'PlusJakarta';
    src: url('{{ assets_root }}/fonts/PlusJakartaSans-Regular.woff2') format('woff2');
    font-weight: 400; font-style: normal;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
    --bg:       #090909;
    --surface:  #131313;
    --primary:  #7C6EFA;
    --secondary:#2DD4BF;
    --accent:   #F59E0B;
    --text:     #FAFAFA;
    --muted:    #71717A;
    --primary-rgb: 124,110,250;
}

html, body {
    width: 1080px; height: 1080px;
    overflow: hidden; background: var(--bg);
}

.canvas {
    position: relative;
    width: 1080px; height: 1080px;
    overflow: hidden;
    font-family: 'PlusJakarta', sans-serif;
    color: var(--text);
}

.brand-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 72px;
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 0 48px;
    background: rgba(9,9,9,0.85);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255,255,255,0.06);
    z-index: 10;
}

.brand-name {
    font-size: 18px; font-weight: 600;
    color: var(--muted); letter-spacing: 0.08em;
    text-transform: uppercase;
}

.progress {
    font-size: 18px; font-weight: 600;
    color: var(--muted); font-variant-numeric: tabular-nums;
}

.progress-bar {
    position: absolute; bottom: 72px; left: 0; right: 0;
    height: 2px; background: rgba(255,255,255,0.08);
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    width: {{ (slide_number / total_slides * 100)|int }}%;
    transition: width 0.3s ease;
}
{% block extra_styles %}{% endblock %}
</style>
</head>
<body>
<div class="canvas">
{% block content %}{% endblock %}
<div class="progress-bar"><div class="progress-fill"></div></div>
<div class="brand-bar">
    <span class="brand-name">{{ brand_name or '&nbsp;' }}</span>
    <span class="progress">{{ slide_number }} / {{ total_slides }}</span>
</div>
</div>
</body>
</html>
```

---

### `backend/core/templates/carousel/aurora/hook.html.j2`

```html
{% extends "_base.html.j2" %}

{% block extra_styles %}
.bg-image {
    position: absolute; inset: 0;
    {% if image_path %}
    background-image: url('{{ image_path }}');
    {% else %}
    background: radial-gradient(ellipse at 30% 40%, rgba(124,110,250,0.4) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 60%, rgba(45,212,191,0.3) 0%, transparent 60%);
    {% endif %}
    background-size: cover; background-position: center;
}
.bg-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(
        135deg,
        rgba(9,9,9,0.88) 0%,
        rgba(9,9,9,0.65) 50%,
        rgba(var(--primary-rgb),0.25) 100%
    );
}
.hook-card {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -55%);
    width: 880px;
    padding: 56px 64px;
    background: rgba(19,19,19,0.72);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
}
.hook-label {
    font-size: 14px; font-weight: 600;
    color: var(--primary); letter-spacing: 0.2em;
    text-transform: uppercase; margin-bottom: 24px;
}
.hook-headline {
    font-family: 'Syne', sans-serif;
    font-size: 72px; font-weight: 700;
    line-height: 1.05;
    background: linear-gradient(135deg, var(--text) 0%, rgba(250,250,250,0.75) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 32px;
}
.hook-sub {
    font-size: 24px; font-weight: 400;
    color: var(--muted); line-height: 1.5;
}
.swipe-hint {
    position: absolute; bottom: 88px; right: 56px;
    font-size: 14px; color: var(--muted);
    letter-spacing: 0.12em; text-transform: uppercase;
    display: flex; align-items: center; gap: 8px;
}
.swipe-hint::after {
    content: '→';
    color: var(--primary); font-size: 18px;
}
{% endblock %}

{% block content %}
<div class="bg-image"></div>
<div class="bg-overlay"></div>
<div class="hook-card">
    <div class="hook-label">Thread</div>
    <div class="hook-headline">{{ slide.title }}</div>
    {% if slide.body %}
    <div class="hook-sub">{{ slide.body }}</div>
    {% endif %}
</div>
<div class="swipe-hint">Swipe</div>
{% endblock %}
```

---

### `backend/core/templates/carousel/aurora/content.html.j2`

```html
{% extends "_base.html.j2" %}

{% block extra_styles %}
.bg-texture {
    position: absolute; inset: -5%;
    {% if image_path %}
    background-image: url('{{ image_path }}');
    {% else %}
    background: var(--bg);
    {% endif %}
    background-size: cover; background-position: center;
    filter: blur(28px) brightness(0.22);
    transform: scale(1.12);
}
.bg-dim {
    position: absolute; inset: 0;
    background: rgba(9,9,9,0.6);
}
.content-wrapper {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 72px;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: 72px 80px;
    gap: 32px;
}
.slide-title {
    font-size: 52px; font-weight: 700;
    line-height: 1.1;
    color: var(--text);
    padding-left: 24px;
    border-left: 5px solid var(--primary);
}
.slide-body {
    font-size: 28px; font-weight: 400;
    line-height: 1.6;
    color: rgba(250,250,250,0.75);
    padding-left: 29px;
    max-width: 820px;
}
.accent-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    margin-bottom: 16px;
    margin-left: 2px;
}
{% endblock %}

{% block content %}
<div class="bg-texture"></div>
<div class="bg-dim"></div>
<div class="content-wrapper">
    <div class="accent-dot"></div>
    <div class="slide-title">{{ slide.title }}</div>
    {% if slide.body %}
    <div class="slide-body">{{ slide.body }}</div>
    {% endif %}
</div>
{% endblock %}
```

---

### `backend/core/templates/carousel/aurora/stat.html.j2`

```html
{% extends "_base.html.j2" %}

{% block extra_styles %}
.stat-wrapper {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 72px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 16px;
    padding: 80px;
}
.stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 160px; font-weight: 700;
    line-height: 0.9;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    text-align: center;
}
.stat-divider {
    width: 120px; height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    border-radius: 2px;
    margin: 8px 0;
}
.stat-label {
    font-size: 32px; font-weight: 400;
    color: var(--muted); text-align: center;
    max-width: 640px; line-height: 1.4;
}
.stat-context {
    font-size: 22px; font-weight: 400;
    color: rgba(113,113,122,0.7);
    text-align: center; margin-top: 8px;
}
{% endblock %}

{% block content %}
<div class="stat-wrapper">
    <div class="stat-value">{{ slide.stat_value or slide.title }}</div>
    <div class="stat-divider"></div>
    <div class="stat-label">{{ slide.stat_label or slide.body }}</div>
    {% if slide.stat_value and slide.title and slide.title != slide.stat_value %}
    <div class="stat-context">{{ slide.title }}</div>
    {% endif %}
</div>
{% endblock %}
```

---

### `backend/core/templates/carousel/aurora/quote.html.j2`

```html
{% extends "_base.html.j2" %}

{% block extra_styles %}
.bg-texture {
    position: absolute; inset: -5%;
    {% if image_path %}
    background-image: url('{{ image_path }}');
    {% else %}
    background: var(--surface);
    {% endif %}
    background-size: cover; background-position: center;
    filter: blur(28px) brightness(0.2);
    transform: scale(1.12);
}
.bg-dim { position: absolute; inset: 0; background: rgba(9,9,9,0.65); }
.quote-card {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -55%);
    width: 880px;
    padding: 64px;
    background: rgba(19,19,19,0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 24px;
}
.quote-mark {
    font-family: 'Syne', sans-serif;
    font-size: 96px; font-weight: 700;
    color: var(--primary); opacity: 0.5;
    line-height: 0.6; margin-bottom: 16px;
}
.quote-text {
    font-size: 34px; font-weight: 600;
    line-height: 1.4; color: var(--text);
    font-style: italic;
}
.quote-attr {
    margin-top: 32px;
    font-size: 20px; font-weight: 400;
    color: var(--muted);
}
{% endblock %}

{% block content %}
<div class="bg-texture"></div>
<div class="bg-dim"></div>
<div class="quote-card">
    <div class="quote-mark">"</div>
    <div class="quote-text">{{ slide.title }}</div>
    {% if slide.body %}
    <div class="quote-attr">— {{ slide.body }}</div>
    {% endif %}
</div>
{% endblock %}
```

---

### `backend/core/templates/carousel/aurora/cta.html.j2`

```html
{% extends "_base.html.j2" %}

{% block extra_styles %}
.cta-bg {
    position: absolute; inset: 0;
    background:
        radial-gradient(ellipse at 20% 80%, rgba(124,110,250,0.35) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 20%, rgba(45,212,191,0.25) 0%, transparent 55%),
        var(--bg);
}
.cta-wrapper {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 72px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 40px; padding: 80px;
    text-align: center;
}
.cta-headline {
    font-family: 'Syne', sans-serif;
    font-size: 64px; font-weight: 700;
    line-height: 1.1; color: var(--text);
    max-width: 800px;
}
.cta-sub {
    font-size: 26px; font-weight: 400;
    color: var(--muted); max-width: 680px;
    line-height: 1.5;
}
.cta-button {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 20px 52px;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 100px;
    font-size: 22px; font-weight: 700;
    color: #fff; letter-spacing: 0.03em;
}
{% endblock %}

{% block content %}
<div class="cta-bg"></div>
<div class="cta-wrapper">
    <div class="cta-headline">{{ slide.title }}</div>
    {% if slide.body %}
    <div class="cta-sub">{{ slide.body }}</div>
    {% endif %}
    <div class="cta-button">Follow for more →</div>
</div>
{% endblock %}
```

---

### `backend/core/templates/carousel/lumina/_base.html.j2`

Same structure as aurora `_base.html.j2` but replace the `:root` CSS variables:

```html
<!-- Identical to aurora/_base.html.j2 EXCEPT replace :root block with: -->
:root {
    --bg:       #FAFAF8;
    --surface:  #FFFFFF;
    --primary:  #1E40AF;
    --secondary:#0D9488;
    --accent:   #D97706;
    --text:     #111827;
    --muted:    #6B7280;
    --primary-rgb: 30,64,175;
}

html, body {
    width: 1080px; height: 1080px;
    overflow: hidden; background: var(--bg);
}

/* Override brand-bar for light theme */
.brand-bar {
    background: rgba(250,250,248,0.90);
    border-top: 1px solid rgba(0,0,0,0.08);
}
.brand-name, .progress { color: var(--muted); }
```

Copy all remaining structure from aurora `_base.html.j2`.

---

### `backend/core/templates/carousel/lumina/hook.html.j2`

Same as aurora `hook.html.j2` with these CSS overrides:

```css
.bg-overlay {
    background: linear-gradient(
        135deg,
        rgba(250,250,248,0.85) 0%,
        rgba(250,250,248,0.60) 50%,
        rgba(var(--primary-rgb),0.15) 100%
    );
}
.hook-card {
    background: rgba(255,255,255,0.82);
    border: 1px solid rgba(0,0,0,0.08);
}
.hook-label { color: var(--primary); }
.hook-headline {
    background: linear-gradient(135deg, var(--text) 0%, rgba(17,24,39,0.8) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hook-sub { color: var(--muted); }
```

### `backend/core/templates/carousel/lumina/content.html.j2`

Same as aurora but override body colours:

```css
.bg-texture { filter: blur(28px) brightness(0.88) saturate(0.4); }
.bg-dim { background: rgba(250,250,248,0.55); }
.slide-title { color: var(--text); border-left-color: var(--primary); }
.slide-body { color: rgba(17,24,39,0.70); }
```

### `backend/core/templates/carousel/lumina/stat.html.j2`, `quote.html.j2`, `cta.html.j2`

Copy from aurora equivalents. The CSS variables (--primary, --text, --muted, --bg) are already
overridden in `_base.html.j2`, so colours automatically invert. No additional changes needed.

> **Tip:** For simplicity you can start by just duplicating the aurora template files into lumina
> and replacing the `:root` block in `_base.html.j2`. The slide templates inherit variables so
> they adapt automatically.

---

## 11. Add `system_prompts.py` CONTENT entry

If `get_system_prompt` uses a dict mapping, find the dict and add:

```python
"content": SystemPrompts.CONTENT.value,
```

If it uses an if/elif chain, add:

```python
elif prompt_type == "content":
    return SystemPrompts.CONTENT.value
```

---

## 12. Test the new endpoint

```bash
cd backend
source .venv/bin/activate

# Start server
python -m uvicorn main:app --reload --port 8000

# In another terminal — replace run_id and angles with real values from an angle run:
curl -s -X POST http://localhost:8000/api/v1/content/run \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-001",
    "topic": "AI replacing white collar jobs",
    "selected_angles": [
      {
        "statement": "AI is not augmenting workers — it is replacing them faster than any previous automation wave",
        "emotional_hook": "Fear",
        "supporting_evidence": "Goldman Sachs: 300M jobs at risk from generative AI by 2030"
      }
    ],
    "research_summary": "Recent studies show AI adoption accelerating across legal, finance, and software roles.",
    "key_points": ["300M jobs at risk", "White-collar harder hit than blue-collar", "Timeline is 5-7 years"],
    "max_slides": 8
  }' | python -m json.tool
```

Expected response shape:
```json
{
  "run_id": "test-001",
  "status": "success",
  "angles_processed": [0],
  "output_paths": ["outputs/test-001/content/angle_0"],
  "carousel_paths": [["outputs/test-001/content/angle_0/png/slide_01.png", "..."]],
  "errors": []
}
```

---

## 13. File Creation Order

To avoid import errors, create files in this order:

1. `configs/settings.py` — add fields
2. `core/orchestration/contracts.py` — fix + add SlideGenerationOutput
3. `core/schemas/workflow_state.py` — fix ContentGraphState
4. `core/prompts/system_prompts.py` — add CONTENT system prompt
5. `core/prompts/templates/*.txt` — three new prompt files
6. `core/tools/mcp_servers/pexels_server.py`
7. `core/orchestrators/content/__init__.py`
8. `core/orchestrators/content/slide_generator.py`
9. `core/orchestrators/content/reorder.py`
10. `core/orchestrators/content/caption_generator.py`
11. `core/orchestrators/content/render_server.py`
12. `core/orchestrators/content/image_fetcher.py`
13. `core/orchestrators/content/carousel_generator.py`
14. `core/orchestrators/content/finalizer.py`
15. `core/orchestrators/content/orchestrator.py`
16. `core/graphs/content_graph.py`
17. `core/nodes/content.py` — full replacement
18. `apps/api/v1/content.py`
19. `apps/cli/run_workflow.py` — add import + uncomment Stage 3
20. `main.py` — add content router
21. Template directories + all `.html.j2` files

---

_Last updated: 2026-05-07_
