import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apps.api.v1.angle import router as angle_router
from apps.api.v1.pipeline import router as pipeline_router
from apps.api.v1.research import router as research_router
from apps.api.v1.content import router as content_router
from apps.api.v1.tools import router as tools_router
from apps.api.v1.chat import router as chat_router
from configs.settings import get_settings
from infra.logging import get_logger
from fastapi.responses import RedirectResponse

logger = get_logger(__name__)
_settings = get_settings()

app = FastAPI(title="Multi-Agent Content Producer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research_router, prefix="/api/v1")
app.include_router(angle_router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")

# Serve generated output files (slides PNGs etc.) at /outputs/<run_id>/...
_outputs_dir = Path(__file__).parent / "outputs"
_outputs_dir.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(_outputs_dir)), name="outputs")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/health", status_code=307)


if __name__ == "__main__":
    logger.info("backend_started", environment=_settings.environment)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
