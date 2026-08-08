from src.supabase_client import get_client

_attribute_id_cache: dict[str, int] | None = None  # key -> attribute_definitions.id, outfield only


async def _get_attribute_ids() -> dict[str, int]:
    global _attribute_id_cache
    if _attribute_id_cache is None:
        client = await get_client()
        res = (
            await client.table("attribute_definitions")
            .select("id,key")
            .eq("category", "outfield")
            .in_("key", ["pace", "physical"])
            .execute()
        )
        _attribute_id_cache = {row["key"]: row["id"] for row in res.data}
        if "pace" not in _attribute_id_cache or "physical" not in _attribute_id_cache:
            raise RuntimeError(
                f"attribute_definitions missing expected outfield pace/physical rows: {_attribute_id_cache}"
            )
    return _attribute_id_cache


async def write_scores(
    player_id: str,
    video_id: str,
    job_id: str,
    scores: dict[str, tuple[int, str]],  # {'pace': (value, confidence), 'physical': (value, confidence)}
) -> None:
    """Upserts player_attribute_scores rows. The append-only history table
    and players.overall_rating are both kept in sync by existing DB
    triggers — this function only ever touches player_attribute_scores
    itself."""
    attribute_ids = await _get_attribute_ids()
    client = await get_client()

    rows = [
        {
            "player_id": player_id,
            "attribute_id": attribute_ids[key],
            "value": value,
            "confidence": confidence,
            "source_video_id": video_id,
            "job_id": job_id,
        }
        for key, (value, confidence) in scores.items()
    ]
    await client.table("player_attribute_scores").upsert(rows, on_conflict="player_id,attribute_id").execute()
