import asyncio
import logging
from datetime import datetime, timezone

from src.config import POLL_INTERVAL_SECONDS
from src.pipeline.run import run_pipeline
from src.pipeline.subject import SubjectHint
from src.scoring import write_scores
from src.supabase_client import get_client

logger = logging.getLogger("ai-service.jobs")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def claim_job(job_id: str) -> bool:
    """Atomic conditional claim — races between the realtime handler, the
    poll loop, and the manual /process endpoint all funnel through this one
    UPDATE...WHERE, relying on Postgres row locking. Returns True if this
    call won the claim."""
    client = await get_client()
    res = (
        await client.table("video_analysis_jobs")
        .update({"status": "processing", "started_at": _now_iso()})
        .eq("id", job_id)
        .eq("status", "queued")
        .execute()
    )
    return len(res.data) > 0


async def complete_job(job_id: str, result_summary: dict) -> None:
    client = await get_client()
    await client.table("video_analysis_jobs").update(
        {"status": "completed", "completed_at": _now_iso(), "result_summary": result_summary}
    ).eq("id", job_id).execute()


async def fail_job(job_id: str, error: str) -> None:
    client = await get_client()
    await client.table("video_analysis_jobs").update(
        {"status": "failed", "completed_at": _now_iso(), "error": error}
    ).eq("id", job_id).execute()


async def reap_stale_processing() -> None:
    """Single-worker local design only — a job stuck in 'processing' can
    only mean a previous run of THIS service crashed mid-job, never a
    concurrent instance. Resets it back to queued so it gets retried. Must
    be replaced with a real lease/timeout before this is ever run as more
    than one instance."""
    client = await get_client()
    res = (
        await client.table("video_analysis_jobs")
        .update({"status": "queued", "started_at": None})
        .eq("status", "processing")
        .execute()
    )
    if res.data:
        logger.warning("Reset %d stale 'processing' job(s) back to 'queued' on startup", len(res.data))


async def process_job(job_id: str) -> None:
    if not await claim_job(job_id):
        logger.info("Job %s already claimed elsewhere, skipping", job_id)
        return

    logger.info("Processing job %s", job_id)
    client = await get_client()

    try:
        job_res = (
            await client.table("video_analysis_jobs")
            .select(
                "*, videos(storage_path, subject_hint_x, subject_hint_y, subject_hint_time_ms), "
                "players(is_goalkeeper, height_cm, jersey_number)"
            )
            .eq("id", job_id)
            .single()
            .execute()
        )
        job = job_res.data
        video = job["videos"]
        player = job["players"]

        video_bytes = await client.storage.from_("videos").download(video["storage_path"])

        hint_x, hint_y, hint_ms = (
            video.get("subject_hint_x"),
            video.get("subject_hint_y"),
            video.get("subject_hint_time_ms"),
        )
        subject_hint = (
            SubjectHint(x=hint_x, y=hint_y, time_s=hint_ms / 1000)
            if hint_x is not None and hint_y is not None and hint_ms is not None
            else None
        )

        result = await asyncio.to_thread(
            run_pipeline,
            video_bytes,
            player.get("height_cm"),
            bool(player.get("is_goalkeeper")),
            subject_hint,
            player.get("jersey_number"),
        )

        if not result.ok:
            await fail_job(job_id, result.skipped_reason or "pipeline failed with no reason given")
            logger.warning("Job %s failed: %s", job_id, result.skipped_reason)
            return

        if result.scores:
            await write_scores(job["player_id"], job["video_id"], job_id, result.scores)

        await complete_job(job_id, result.result_summary)
        logger.info("Job %s completed (%s)", job_id, "scored" if result.scores else "skipped")

    except Exception as exc:  # noqa: BLE001 — must always resolve the job, never leave it stuck
        logger.exception("Job %s crashed", job_id)
        await fail_job(job_id, str(exc))


async def poll_loop() -> None:
    client = await get_client()
    while True:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        try:
            res = await client.table("video_analysis_jobs").select("id").eq("status", "queued").execute()
            for row in res.data:
                await process_job(row["id"])
        except Exception:
            logger.exception("poll_loop iteration failed, will retry next interval")


async def realtime_listener() -> None:
    client = await get_client()

    async def on_insert(payload):
        record = payload.get("data", {}).get("record") or {}
        job_id = record.get("id")
        if job_id:
            await process_job(job_id)

    channel = client.channel("video_analysis_jobs_listener")
    channel.on_postgres_changes("INSERT", callback=on_insert, table="video_analysis_jobs", schema="public")
    await channel.subscribe()
    logger.info("Realtime listener subscribed to video_analysis_jobs INSERT")
