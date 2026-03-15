import asyncio
import json
import time
from dataclasses import dataclass, field
from enum import Enum

from app.database import get_db
from app.services.ollama import ollama_service


class PullStatus(str, Enum):
    QUEUED = "queued"
    PULLING = "pulling"
    DONE = "done"
    ERROR = "error"


@dataclass
class PullJob:
    name: str
    status: PullStatus = PullStatus.QUEUED
    progress: dict = field(default_factory=dict)
    error: str = ""
    created_at: float = field(default_factory=time.time)


class PullQueue:
    def __init__(self):
        self._queue: asyncio.Queue[PullJob] = asyncio.Queue()
        self._jobs: dict[str, PullJob] = {}
        self._worker_task: asyncio.Task | None = None
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def start(self):
        if self._worker_task is None:
            self._worker_task = asyncio.create_task(self._worker())

    def stop(self):
        if self._worker_task is not None:
            self._worker_task.cancel()
            self._worker_task = None

    async def enqueue(self, name: str) -> PullJob:
        """Add a model to the pull queue. Rejects duplicates."""
        if name in self._jobs and self._jobs[name].status in (
            PullStatus.QUEUED,
            PullStatus.PULLING,
        ):
            return self._jobs[name]

        job = PullJob(name=name)
        self._jobs[name] = job
        await self._queue.put(job)
        return job

    def get_job(self, name: str) -> PullJob | None:
        return self._jobs.get(name)

    def get_all_jobs(self) -> list[PullJob]:
        return list(self._jobs.values())

    def subscribe(self, name: str) -> asyncio.Queue:
        """Subscribe to progress events for a specific pull."""
        q: asyncio.Queue = asyncio.Queue()
        if name not in self._subscribers:
            self._subscribers[name] = []
        self._subscribers[name].append(q)
        return q

    def unsubscribe(self, name: str, q: asyncio.Queue):
        if name in self._subscribers:
            self._subscribers[name] = [
                s for s in self._subscribers[name] if s is not q
            ]

    async def _notify(self, name: str, data: dict):
        for q in self._subscribers.get(name, []):
            await q.put(data)

    async def _worker(self):
        while True:
            job = await self._queue.get()
            job.status = PullStatus.PULLING
            await self._notify(job.name, {"status": "pulling", "name": job.name})

            try:
                async for progress in ollama_service.pull_model(job.name):
                    job.progress = progress
                    await self._notify(job.name, progress)

                job.status = PullStatus.DONE
                await self._notify(
                    job.name, {"status": "success", "name": job.name}
                )
                await self._record_history(job.name, "success")
            except Exception as e:
                job.status = PullStatus.ERROR
                job.error = str(e)
                await self._notify(
                    job.name,
                    {"status": "error", "name": job.name, "error": str(e)},
                )
                await self._record_history(job.name, "error")
            finally:
                self._queue.task_done()

    async def _record_history(self, name: str, status: str):
        parts = name.split(":")
        model_name = parts[0]
        tag = parts[1] if len(parts) > 1 else "latest"

        db = await get_db()
        await db.execute(
            """INSERT INTO pull_history (model_name, tag, status, pulled_at)
               VALUES (?, ?, ?, ?)""",
            (model_name, tag, status, time.time()),
        )
        await db.commit()


pull_queue = PullQueue()
