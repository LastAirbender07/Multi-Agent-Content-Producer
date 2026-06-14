from fastapi import APIRouter
from core.orchestrators.research.query_preprocessor import QueryPreprocessor, ProcessedQuery
from apps.api.v1.schemas import QueryRefineRequest

router = APIRouter()


@router.post("/query-refine", response_model=ProcessedQuery)
async def refine_query(request: QueryRefineRequest) -> ProcessedQuery:
    return await QueryPreprocessor().process(request.topic)
