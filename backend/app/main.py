import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, close_db
from app.routers import auth, ollama, registry, settings
from app.services.ollama import ollama_service
from app.services.pull_queue import pull_queue
from app.services.settings import settings_service
from app.services.auth import set_hashed_password
from app.config import settings as app_settings


async def _periodic_health_check():
    while True:
        await ollama_service.health_check()
        await asyncio.sleep(30)


async def _load_persisted_settings():
    """Load settings from DB and apply them to the running config."""
    stored = await settings_service.get_all()

    if "total_vram_gb" in stored:
        app_settings.TOTAL_VRAM_GB = float(stored["total_vram_gb"])
    if "ollama_host" in stored:
        ollama_service.base_url = stored["ollama_host"]
    if "cache_ttl_search" in stored:
        app_settings.CACHE_TTL_SEARCH = int(stored["cache_ttl_search"])
    if "cache_ttl_details" in stored:
        app_settings.CACHE_TTL_DETAILS = int(stored["cache_ttl_details"])
    if "admin_password_hash" in stored:
        set_hashed_password(stored["admin_password_hash"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _load_persisted_settings()
    await ollama_service.health_check()
    pull_queue.start()
    health_task = asyncio.create_task(_periodic_health_check())
    yield
    health_task.cancel()
    pull_queue.stop()
    await close_db()


app = FastAPI(title="Herdsman", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ollama.router)
app.include_router(registry.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
