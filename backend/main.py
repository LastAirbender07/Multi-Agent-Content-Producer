import uvicorn
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from apps.api.v1.angle import router as angle_router
from apps.api.v1.pipeline import router as pipeline_router
from apps.api.v1.research import router as research_router
from apps.api.v1.content import router as content_router
from apps.api.v1.tools import router as tools_router
from apps.api.v1.chat import router as chat_router
from apps.api.v1.analytics import router as analytics_router
from apps.api.v1.settings import router as settings_router
from configs.settings import get_settings
from infra.logging import get_logger
from fastapi.responses import RedirectResponse

logger = get_logger(__name__)
_settings = get_settings()

app = FastAPI(title="Multi-Agent Content Producer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins — static files (images/fonts) need this for canvas
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(research_router, prefix="/api/v1")
app.include_router(angle_router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")

# Serve generated output files (slides PNGs etc.) at /outputs/<run_id>/...
_outputs_dir = Path(__file__).parent / "outputs"
_outputs_dir.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(_outputs_dir)), name="outputs")

# Serve fonts, brand logo, Chart.js used by slide HTML templates
_assets_dir = Path(__file__).parent / "assets"
if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")


# Patch CORS onto all static file responses — StaticFiles bypasses CORSMiddleware
@app.middleware("http")
async def add_cors_to_static(request: Request, call_next) -> Response:
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/outputs/") or path.startswith("/assets/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/health", status_code=307)


if __name__ == "__main__":
    logger.info("backend_started", environment=_settings.environment)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
