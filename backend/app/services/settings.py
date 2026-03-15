from app.database import get_db


class SettingsService:
    async def get_all(self) -> dict[str, str]:
        db = await get_db()
        cursor = await db.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}

    async def get(self, key: str, default: str = "") -> str:
        db = await get_db()
        cursor = await db.execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        )
        row = await cursor.fetchone()
        return row["value"] if row else default

    async def set(self, key: str, value: str):
        db = await get_db()
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
        await db.commit()

    async def set_many(self, data: dict[str, str]):
        db = await get_db()
        for key, value in data.items():
            await db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, str(value)),
            )
        await db.commit()


settings_service = SettingsService()
