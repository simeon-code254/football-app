from supabase import AsyncClient, create_async_client

from src.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

_client: AsyncClient | None = None


async def get_client() -> AsyncClient:
    """Single shared service_role client — bypasses RLS entirely, which is
    the only way this service can write video_analysis_jobs/
    player_attribute_scores (no authenticated/anon write policy exists for
    either, by design)."""
    global _client
    if _client is None:
        _client = await create_async_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client
