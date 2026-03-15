import asyncio
import re

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.schemas.registry import SearchResult, ModelTag
from app.services.cache import cache_service

BASE_URL = "https://ollama.com"


class RegistryService:
    def __init__(self):
        self._last_request = 0.0

    async def _rate_limit(self):
        """Enforce minimum 1.5s between requests."""
        now = asyncio.get_event_loop().time()
        diff = now - self._last_request
        if diff < 1.5:
            await asyncio.sleep(1.5 - diff)
        self._last_request = asyncio.get_event_loop().time()

    async def _fetch(self, url: str) -> str:
        await self._rate_limit()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()
            return resp.text

    async def search(
        self,
        query: str = "",
        category: str = "",
        sort: str = "",
        page: int = 1,
    ) -> dict:
        """Search ollama.com registry. Returns dict with results, has_more, from_cache."""
        cache_key = f"search:{query}:{category}:{sort}:{page}"
        cached = await cache_service.get_cached(
            "search_cache", cache_key, settings.CACHE_TTL_SEARCH
        )
        if cached is not None:
            cached["from_cache"] = True
            return cached

        params = {}
        if query:
            params["q"] = query
        if category:
            params["c"] = category
        if sort:
            params["o"] = sort
        if page > 1:
            params["p"] = str(page)

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{BASE_URL}/search?{query_string}" if query_string else f"{BASE_URL}/search"

        try:
            html = await self._fetch(url)
        except Exception:
            # Fallback to cache even if expired
            cached = await cache_service.get_cached(
                "search_cache", cache_key, settings.CACHE_TTL_SEARCH * 10
            )
            if cached:
                cached["from_cache"] = True
                return cached
            return {"results": [], "has_more": False, "from_cache": False}

        results = self._parse_search_results(html)
        has_more = len(results) >= 20

        data = {
            "results": [r.model_dump() for r in results],
            "has_more": has_more,
            "from_cache": False,
        }
        await cache_service.set_cached("search_cache", cache_key, data)
        return data

    def _parse_search_results(self, html: str) -> list[SearchResult]:
        soup = BeautifulSoup(html, "html.parser")
        results = []

        items = soup.select("li[x-test-model]")

        for item in items:
            # Model name from x-test-search-response-title or link
            name_el = item.select_one("[x-test-search-response-title]")
            if name_el:
                name = name_el.get_text(strip=True)
            else:
                link = item.select_one("a[href*='/library/']")
                if link:
                    name = link.get("href", "").replace("/library/", "").strip("/")
                else:
                    continue

            if not name:
                continue

            # Description
            desc_el = item.select_one("p")
            description = desc_el.get_text(strip=True) if desc_el else ""

            # Pull count
            pulls_el = item.select_one("[x-test-pull-count]")
            pulls = pulls_el.get_text(strip=True) if pulls_el else ""

            # Tag count
            tags_el = item.select_one("[x-test-tag-count]")
            tags_count = 0
            if tags_el:
                match = re.search(r"(\d+)", tags_el.get_text(strip=True))
                if match:
                    tags_count = int(match.group(1))

            # Updated
            updated_el = item.select_one("[x-test-updated]")
            updated = updated_el.get_text(strip=True) if updated_el else ""

            results.append(SearchResult(
                name=name,
                description=description,
                pulls=pulls,
                tags=tags_count,
                updated=updated,
            ))

        return results

    async def get_model_details(self, name: str) -> dict:
        """Scrape model details page from ollama.com."""
        cache_key = f"details:{name}"
        cached = await cache_service.get_cached(
            "model_cache", cache_key, settings.CACHE_TTL_DETAILS
        )
        if cached is not None:
            cached["from_cache"] = True
            return cached

        url = f"{BASE_URL}/library/{name}"

        try:
            html = await self._fetch(url)
        except Exception:
            cached = await cache_service.get_cached(
                "model_cache", cache_key, settings.CACHE_TTL_DETAILS * 10
            )
            if cached:
                cached["from_cache"] = True
                return cached
            return {"name": name, "description": "", "tags": [], "from_cache": False}

        soup = BeautifulSoup(html, "html.parser")

        # Extract description
        desc_el = soup.select_one("p.max-w-lg") or soup.select_one("meta[name='description']")
        description = ""
        if desc_el:
            description = desc_el.get("content", "") if desc_el.name == "meta" else desc_el.get_text(strip=True)

        data = {
            "name": name,
            "description": description,
            "tags": [],
            "from_cache": False,
        }
        await cache_service.set_cached("model_cache", cache_key, data)
        return data

    async def get_model_tags(self, name: str) -> list[dict]:
        """Scrape available tags for a model from ollama.com."""
        cache_key = f"tags:{name}"
        cached = await cache_service.get_cached(
            "model_cache", cache_key, settings.CACHE_TTL_DETAILS
        )
        if cached is not None:
            return cached

        url = f"{BASE_URL}/library/{name}/tags"

        try:
            html = await self._fetch(url)
        except Exception:
            cached = await cache_service.get_cached(
                "model_cache", cache_key, settings.CACHE_TTL_DETAILS * 10
            )
            return cached if cached else []

        tags = self._parse_tags(html)
        tag_dicts = [t.model_dump() for t in tags]
        await cache_service.set_cached("model_cache", cache_key, tag_dicts)
        return tag_dicts

    def _parse_tags(self, html: str) -> list[ModelTag]:
        soup = BeautifulSoup(html, "html.parser")
        tags = []
        seen = set()

        # Each tag is in a div.group container with links for mobile/desktop
        containers = soup.select("div.group.px-4.py-3")

        for container in containers:
            link = container.select_one("a[href*='/library/'][href*=':']")
            if not link:
                continue

            href = link.get("href", "")
            tag_name = href.split(":")[-1] if ":" in href else ""
            if not tag_name or tag_name in seen:
                continue
            seen.add(tag_name)

            # Extract size and hash from the link text
            size = ""
            digest = ""
            text = link.get_text(" ", strip=True)
            size_match = re.search(r"([\d.]+\s*[GMKT]B)", text)
            if size_match:
                size = size_match.group(1)

            # Hash is in a font-mono span (12-char hex)
            hash_el = link.select_one("span.font-mono")
            if hash_el:
                digest = hash_el.get_text(strip=True)

            tags.append(ModelTag(name=tag_name, size=size, hash=digest))

        return tags


registry_service = RegistryService()
