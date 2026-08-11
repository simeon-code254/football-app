import asyncio
import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from src.config import AI_SERVICE_INTERNAL_TOKEN
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


async def require_internal_token(authorization: str | None = Header(default=None)) -> None:
    """POST /process is otherwise unauthenticated — without this, anyone who
    finds the URL could trigger the CV pipeline (compute-cost risk). Uses a
    constant-time comparison so response timing can't leak the token.
    """
    provided = (authorization or "").removeprefix("Bearer ").strip()
    if not secrets.compare_digest(provided, AI_SERVICE_INTERNAL_TOKEN):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization bearer token")


@app.post("/process/{job_id}", dependencies=[Depends(require_internal_token)])
async def process(job_id: str):
    """Manual trigger for local testing — bypasses waiting on realtime/poll."""
    try:
        await process_job(job_id)
        return {"status": "processed", "job_id": job_id}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
