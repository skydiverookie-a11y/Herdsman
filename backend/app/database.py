import aiosqlite
import os
from app.config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(settings.DB_PATH) or ".", exist_ok=True)
        _db = await aiosqlite.connect(settings.DB_PATH)
        _db.row_factory = aiosqlite.Row
    return _db


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def init_db():
    db = await get_db()

    await db.execute("""
        CREATE TABLE IF NOT EXISTS search_cache (
            cache_key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS model_cache (
            cache_key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS pull_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            tag TEXT NOT NULL DEFAULT 'latest',
            status TEXT NOT NULL DEFAULT 'success',
            pulled_at REAL NOT NULL
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    await db.commit()
