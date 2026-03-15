from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings as app_settings
from app.dependencies import verify_token
from app.services.auth import verify_password, hash_password, set_hashed_password
from app.services.ollama import ollama_service
from app.services.settings import settings_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    total_vram_gb: float | None = None
    ollama_host: str | None = None
    cache_ttl_search: int | None = None
    cache_ttl_details: int | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("")
async def get_settings(_: str = Depends(verify_token)):
    stored = await settings_service.get_all()
    return {
        "total_vram_gb": float(stored.get("total_vram_gb", app_settings.TOTAL_VRAM_GB)),
        "ollama_host": stored.get("ollama_host", app_settings.OLLAMA_HOST),
        "cache_ttl_search": int(stored.get("cache_ttl_search", app_settings.CACHE_TTL_SEARCH)),
        "cache_ttl_details": int(stored.get("cache_ttl_details", app_settings.CACHE_TTL_DETAILS)),
    }


@router.put("")
async def update_settings(
    data: SettingsUpdate, _: str = Depends(verify_token)
):
    updates = {}
    if data.total_vram_gb is not None:
        updates["total_vram_gb"] = str(data.total_vram_gb)
        app_settings.TOTAL_VRAM_GB = data.total_vram_gb

    if data.ollama_host is not None:
        updates["ollama_host"] = data.ollama_host
        await ollama_service.update_base_url(data.ollama_host)

    if data.cache_ttl_search is not None:
        updates["cache_ttl_search"] = str(data.cache_ttl_search)
        app_settings.CACHE_TTL_SEARCH = data.cache_ttl_search

    if data.cache_ttl_details is not None:
        updates["cache_ttl_details"] = str(data.cache_ttl_details)
        app_settings.CACHE_TTL_DETAILS = data.cache_ttl_details

    if updates:
        await settings_service.set_many(updates)

    return {"status": "updated"}


@router.put("/password")
async def change_password(
    data: PasswordChange, _: str = Depends(verify_token)
):
    if not verify_password(data.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    hashed = hash_password(data.new_password)
    set_hashed_password(hashed)
    await settings_service.set("admin_password_hash", hashed)
    return {"status": "password_changed"}
