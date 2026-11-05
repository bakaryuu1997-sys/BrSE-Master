import json
from collections.abc import Callable

import httpx
import pytest
from mcp.server.fastmcp import FastMCP

from brse_mcp.client import BrseClient
from brse_mcp.config import Settings
from brse_mcp.server import build_server


class Harness:
    """A server wired to an in-memory fake of the BrSE OS API; records every request it receives."""

    def __init__(self, routes: Callable[[httpx.Request], httpx.Response], settings: Settings | None = None) -> None:
        self.requests: list[httpx.Request] = []
        self.settings = settings or Settings()

        def handler(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            return routes(request)

        self.client = BrseClient(self.settings, transport=httpx.MockTransport(handler))
        self.mcp: FastMCP = build_server(self.settings, self.client)

    async def call(self, name: str, **arguments):
        result = await self.mcp.call_tool(name, arguments)
        return json.loads(result[0].text)


@pytest.fixture()
def harness_factory():
    return Harness


def json_route(payload) -> Callable[[httpx.Request], httpx.Response]:
    return lambda request: httpx.Response(200, json=payload)
