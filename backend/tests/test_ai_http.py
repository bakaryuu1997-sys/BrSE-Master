import asyncio

from app.core.ai_http import (
    close_ai_async_client,
    close_ai_sync_client,
    get_ai_async_client,
    get_ai_sync_client,
)


def test_ai_sync_client_is_reused_until_closed() -> None:
    close_ai_sync_client()
    first = get_ai_sync_client()
    second = get_ai_sync_client()

    assert first is second

    close_ai_sync_client()
    assert first.is_closed


def test_ai_async_client_is_reused_until_closed() -> None:
    async def run() -> None:
        await close_ai_async_client()
        first = get_ai_async_client()
        second = get_ai_async_client()

        assert first is second

        await close_ai_async_client()
        assert first.is_closed

    asyncio.run(run())
