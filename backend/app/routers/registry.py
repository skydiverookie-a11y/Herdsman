from fastapi import APIRouter, Depends, Query

from app.dependencies import verify_token
from app.services.registry import registry_service
from app.services.vram import estimate_vram_from_size

router = APIRouter(prefix="/api/registry", tags=["registry"])


@router.get("/search")
async def search_registry(
    q: str = Query("", description="Search query"),
    c: str = Query("", description="Category filter"),
    o: str = Query("", description="Sort order"),
    p: int = Query(1, ge=1, description="Page number"),
    _: str = Depends(verify_token),
):
    data = await registry_service.search(query=q, category=c, sort=o, page=p)
    return {
        "results": data["results"],
        "query": q,
        "page": p,
        "has_more": data["has_more"],
        "from_cache": data["from_cache"],
    }


@router.get("/models/{name:path}/details")
async def model_details(name: str, _: str = Depends(verify_token)):
    return await registry_service.get_model_details(name)


@router.get("/models/{name:path}/tags")
async def model_tags(name: str, _: str = Depends(verify_token)):
    tags = await registry_service.get_model_tags(name)
    for tag in tags:
        tag["estimated_vram"] = estimate_vram_from_size(tag.get("size", ""))
    return {"tags": tags}
