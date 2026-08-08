import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from src.jobs import poll_loop, process_job, reap_stale_processing, realtime_listener

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

_background_tasks: list[asyncio.Task] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    await reap_stale_processing()
    _background_tasks.append(asyncio.create_task(realtime_listener()))
    _background_tasks.append(asyncio.create_task(poll_loop()))
    logger.info("ai-service started — realtime listener + poll loop running")
    yield
    for task in _background_tasks:
        task.cancel()


app = FastAPI(title="Matobev AI Analysis Service", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process/{job_id}")
async def process(job_id: str):
    """Manual trigger for local testing — bypasses waiting on realtime/poll."""
    try:
        await process_job(job_id)
        return {"status": "processed", "job_id": job_id}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
