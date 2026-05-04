import uvicorn
from fastapi import FastAPI
from apps.api.v1.angle import router as angle_router
from apps.api.v1.pipeline import router as pipeline_router
from apps.api.v1.research import router as research_router
from infra.logging import get_logger
from fastapi.responses import RedirectResponse

logger = get_logger(__name__)

app = FastAPI(title="Multi-Agent Content Producer API", version="1.0.0")
app.include_router(research_router, prefix="/api/v1")
app.include_router(angle_router, prefix="/api/v1")
app.include_router(pipeline_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/health", status_code=307)


if __name__ == "__main__":
    logger.info("backend_started")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
