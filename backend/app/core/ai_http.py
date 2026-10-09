import httpx

_async_client: httpx.AsyncClient | None = None
_sync_client: httpx.Client | None = None


def get_ai_sync_client() -> httpx.Client:
    global _sync_client
    if _sync_client is None or _sync_client.is_closed:
        _sync_client = httpx.Client(timeout=90)
    return _sync_client


def get_ai_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(timeout=90)
    return _async_client


def close_ai_sync_client() -> None:
    global _sync_client
    if _sync_client is not None and not _sync_client.is_closed:
        _sync_client.close()
    _sync_client = None


async def close_ai_async_client() -> None:
    global _async_client
    if _async_client is not None and not _async_client.is_closed:
        await _async_client.aclose()
    _async_client = None


async def close_ai_http_clients() -> None:
    close_ai_sync_client()
    await close_ai_async_client()
