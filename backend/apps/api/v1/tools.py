from fastapi import APIRouter

from apps.api.v1.tools_query import router as query_router
from apps.api.v1.tools_images import router as images_router
from apps.api.v1.tools_news import router as news_router
from apps.api.v1.tools_docs import router as docs_router

router = APIRouter(prefix="/tools", tags=["tools"])

router.include_router(query_router)
router.include_router(images_router)
router.include_router(news_router)
router.include_router(docs_router)
