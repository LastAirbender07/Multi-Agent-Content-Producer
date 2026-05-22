from typing import Literal, Optional
from pydantic import BaseModel, Field


class PexelsPhoto(BaseModel):
    id: int
    url: str
    photographer: str
    photographer_url: str
    avg_color: str
    width: int
    height: int
    src: dict[str, str]


class ImageSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source: Literal["pexels", "ddgs"] = Field(default="pexels")
    max_results: int = Field(default=15, ge=1, le=50)
    queries: Optional[list[str]] = Field(default=None, description="Multiple query variants for DDGS multi-search")


class ImageSearchResponse(BaseModel):
    success: bool
    query: str
    source: str
    total_results: int
    pexels_photos: list[PexelsPhoto] = []
    ddgs_images: list[dict] = []
    error: Optional[str] = None


class ImageDownloadRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1)
    save_dir: str = Field(default="")


class ImageDownloadResponse(BaseModel):
    saved_paths: list[str]
    errors: list[dict]
    save_dir: str
