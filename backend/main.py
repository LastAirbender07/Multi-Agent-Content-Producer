import uvicorn
from fastapi import FastAPI
from apps.api.v1.research import router as research_router
from infra.logging import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Multi-Agent Content Producer API", version="1.0.0")
app.include_router(research_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    logger.info("backend_started")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
