import asyncio
import json
from typing import AsyncGenerator

import httpx

from app.config import settings


class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self._connected = False
        self._lock = asyncio.Lock()

    @property
    def connected(self) -> bool:
        return self._connected

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                self._connected = resp.status_code == 200
        except Exception:
            self._connected = False
        return self._connected

    async def list_local_models(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            return resp.json().get("models", [])

    async def list_running_models(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/api/ps")
            resp.raise_for_status()
            return resp.json().get("models", [])

    async def show_model(self, name: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/show",
                json={"name": name},
            )
            resp.raise_for_status()
            return resp.json()

    async def pull_model(self, name: str) -> AsyncGenerator[dict, None]:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json={"name": name, "stream": True},
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.strip():
                        yield json.loads(line)

    async def delete_model(self, name: str) -> bool:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                "DELETE",
                f"{self.base_url}/api/delete",
                json={"name": name},
            )
            resp.raise_for_status()
            return True

    async def unload_model(self, name: str) -> bool:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": name, "keep_alive": 0},
            )
            resp.raise_for_status()
            return True

    async def generate(self, model: str, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")

    async def update_base_url(self, url: str):
        self.base_url = url
        await self.health_check()


ollama_service = OllamaService()
