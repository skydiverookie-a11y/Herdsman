from pydantic import BaseModel


class SearchResult(BaseModel):
    name: str
    description: str = ""
    pulls: str = ""
    tags: int = 0
    updated: str = ""


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str
    page: int = 1
    has_more: bool = False
    from_cache: bool = False


class ModelTag(BaseModel):
    name: str
    size: str = ""
    hash: str = ""


class ModelInfo(BaseModel):
    name: str
    description: str = ""
    tags: list[ModelTag] = []
    categories: list[str] = []
    from_cache: bool = False
