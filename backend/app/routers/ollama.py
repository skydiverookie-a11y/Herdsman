import json

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse

from app.dependencies import verify_token
from app.services.ollama import ollama_service
from app.services.pull_queue import pull_queue, PullStatus

router = APIRouter(prefix="/api", tags=["ollama"])


@router.get("/ollama/status")
async def ollama_status():
    connected = await ollama_service.health_check()
    return {"connected": connected, "host": ollama_service.base_url}


@router.get("/models")
async def list_models(_: str = Depends(verify_token)):
    try:
        models = await ollama_service.list_local_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {e}")


@router.get("/models/running")
async def running_models(_: str = Depends(verify_token)):
    try:
        models = await ollama_service.list_running_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {e}")


@router.get("/models/{name:path}/details")
async def model_details(name: str, _: str = Depends(verify_token)):
    try:
        details = await ollama_service.show_model(name)
        return details
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {e}")


@router.post("/models/pull")
async def pull_model(request: dict, _: str = Depends(verify_token)):
    name = request.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Model name required")

    if not ollama_service.connected:
        raise HTTPException(status_code=503, detail="Ollama is not connected")

    job = await pull_queue.enqueue(name)

    # If already pulling or queued, subscribe to existing stream
    sub = pull_queue.subscribe(name)

    async def event_stream():
        try:
            # If job was already done/error before we subscribed, report immediately
            if job.status == PullStatus.DONE:
                yield f"data: {json.dumps({'status': 'success', 'name': name})}\n\n"
                return
            if job.status == PullStatus.ERROR:
                yield f"data: {json.dumps({'status': 'error', 'name': name, 'error': job.error})}\n\n"
                return

            while True:
                data = await sub.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("status") in ("success", "error", "cancelled"):
                    break
        finally:
            pull_queue.unsubscribe(name, sub)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/models/pull/cancel")
async def cancel_pull(request: dict, _: str = Depends(verify_token)):
    name = request.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Model name required")
    cancelled = await pull_queue.cancel(name)
    if not cancelled:
        raise HTTPException(status_code=404, detail="No active pull for this model")
    return {"status": "cancelled"}


@router.get("/models/queue")
async def pull_queue_status(_: str = Depends(verify_token)):
    jobs = pull_queue.get_all_jobs()
    return {
        "jobs": [
            {
                "name": j.name,
                "status": j.status.value,
                "progress": j.progress,
                "error": j.error,
            }
            for j in jobs
        ]
    }


@router.post("/models/unload")
async def unload_model(request: dict, _: str = Depends(verify_token)):
    name = request.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Model name required")
    if not ollama_service.connected:
        raise HTTPException(status_code=503, detail="Ollama is not connected")
    try:
        await ollama_service.unload_model(name)
        return {"status": "unloaded", "model": name}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to unload: {e}")


@router.post("/models/generate")
async def generate(request: dict, _: str = Depends(verify_token)):
    model = request.get("model")
    prompt = request.get("prompt")
    if not model or not prompt:
        raise HTTPException(status_code=400, detail="Model and prompt required")
    if not ollama_service.connected:
        raise HTTPException(status_code=503, detail="Ollama is not connected")
    try:
        response = await ollama_service.generate(model, prompt)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")


@router.delete("/models/{name:path}")
async def delete_model(name: str, _: str = Depends(verify_token)):
    if not ollama_service.connected:
        raise HTTPException(status_code=503, detail="Ollama is not connected")
    try:
        await ollama_service.delete_model(name)
        return {"status": "deleted", "model": name}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to delete: {e}")
