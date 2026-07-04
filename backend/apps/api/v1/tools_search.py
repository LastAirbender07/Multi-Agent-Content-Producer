from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

from core.tools.Search.ddgs_search import DDGSSearch

router = APIRouter(prefix="/web-search", tags=["tools"])

_searcher = DDGSSearch(timeout=15)


class WebSearchRequest(BaseModel):
    query:       str
    max_results: int           = 8
    timelimit:   Optional[str] = None   # "d"=day, "w"=week, "m"=month


@router.post("", summary="DuckDuckGo web search")
async def web_search(req: WebSearchRequest):
    result = await _searcher.execute(
        query=req.query,
        max_results=req.max_results,
        timelimit=req.timelimit,
    )
    return result
