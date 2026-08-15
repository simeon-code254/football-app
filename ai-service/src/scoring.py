from src.supabase_client import get_client

_attribute_id_cache: dict[tuple[str, str], int] | None = None  # (category, key) -> attribute_definitions.id


async def _get_attribute_ids() -> dict[tuple[str, str], int]:
    """Keyed by (category, key), not key alone -- 'positioning' is a real
    row in BOTH the outfield and goalkeeper taxonomies (unique(key,
    category) in the schema), so a key-only cache would silently collide
    once goalkeeper scoring existed."""
    global _attribute_id_cache
    if _attribute_id_cache is None:
        client = await get_client()
        res = await client.table("attribute_definitions").select("id,key,category").execute()
        _attribute_id_cache = {(row["category"], row["key"]): row["id"] for row in res.data}
        if not _attribute_id_cache:
            raise RuntimeError("attribute_definitions table returned no rows")
    return _attribute_id_cache


async def write_scores(
    player_id: str,
    video_id: str,
    job_id: str,
    category: str,  # 'outfield' | 'goalkeeper'
    scores: dict[str, tuple[int, str]],  # {'pace': (value, confidence), ...}
) -> None:
    """Upserts player_attribute_scores rows. The append-only history table
    and players.overall_rating are both kept in sync by existing DB
    triggers — this function only ever touches player_attribute_scores
    itself."""
    attribute_ids = await _get_attribute_ids()
    client = await get_client()

    rows = []
    for key, (value, confidence) in scores.items():
        attr_id = attribute_ids.get((category, key))
        if attr_id is None:
            raise RuntimeError(f"attribute_definitions missing ({category}, {key}) — check the taxonomy migration")
        rows.append(
            {
                "player_id": player_id,
                "attribute_id": attr_id,
                "value": value,
                "confidence": confidence,
                "source_video_id": video_id,
                "job_id": job_id,
            }
        )

    await client.table("player_attribute_scores").upsert(rows, on_conflict="player_id,attribute_id").execute()
