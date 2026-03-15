import json
import time

from app.database import get_db


class CacheService:
    async def get_cached(self, table: str, key: str, ttl: int) -> dict | None:
        """Get cached data if not expired. Returns None if miss or expired."""
        db = await get_db()
        cursor = await db.execute(
            f"SELECT data, created_at FROM {table} WHERE cache_key = ?",
            (key,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None

        age = time.time() - row["created_at"]
        if age > ttl:
            await db.execute(f"DELETE FROM {table} WHERE cache_key = ?", (key,))
            await db.commit()
            return None

        return json.loads(row["data"])

    async def set_cached(self, table: str, key: str, data: dict | list):
        """Store data in cache."""
        db = await get_db()
        await db.execute(
            f"""INSERT OR REPLACE INTO {table} (cache_key, data, created_at)
                VALUES (?, ?, ?)""",
            (key, json.dumps(data), time.time()),
        )
        await db.commit()


    async def clear_all(self):
        """Clear all cache tables."""
        db = await get_db()
        await db.execute("DELETE FROM search_cache")
        await db.execute("DELETE FROM model_cache")
        await db.commit()


cache_service = CacheService()
