"""End-to-end smoke test: start the MCP server as a subprocess over stdio and talk to it like a client.

Usage (from mcp-server/):  .venv/bin/python scripts/smoke_stdio.py --api-base http://127.0.0.1:3011/api
Only read-only tools are called. Point it at the isolated test stack (:3011) unless you want real data.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SRC = str(Path(__file__).resolve().parents[1] / "src")


async def run(api_base: str, secret: str) -> int:
    env = {**os.environ, "BRSE_API_BASE": api_base, "PYTHONPATH": SRC}
    if secret:
        env["BRSE_API_SECRET"] = secret
    params = StdioServerParameters(command=sys.executable, args=["-m", "brse_mcp.server"], env=env)
    failures = 0

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            print(f"connected: {init.serverInfo.name} (protocol {init.protocolVersion})")
            tools = (await session.list_tools()).tools
            read_only = all(tool.annotations and tool.annotations.readOnlyHint for tool in tools)
            print(f"tools: {len(tools)}, all read-only: {read_only}")
            failures += 0 if read_only else 1

            checks = [
                ("app_status", {}),
                ("list_projects", {}),
                ("list_operations", {"limit": 5}),
                ("list_todo_projects", {}),
                ("search_glossary", {"search": "requirement", "size": 3}),
                ("list_reports", {"limit": 3}),
                ("search_minutes", {"limit": 3}),
                ("list_calendar_schedules", {"limit": 3}),
                ("get_minutes", {"minutes_id": "../settings/backup"}),  # must be refused locally
            ]
            for name, args in checks:
                result = await session.call_tool(name, args)
                text = result.content[0].text if result.content else ""
                expected_error = name == "get_minutes"
                ok = bool(result.isError) == expected_error
                failures += 0 if ok else 1
                summary = text[:110].replace("\n", " ")
                if not result.isError:
                    try:
                        data = json.loads(text)
                        summary = f"total={data.get('total')} returned={data.get('returned')}" if "total" in data else summary
                    except ValueError:
                        pass
                print(f"{'OK ' if ok else 'FAIL'} {name:<24} isError={result.isError} {summary}")
    print("RESULT:", "PASS" if failures == 0 else f"FAIL ({failures})")
    return failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-base", default="http://127.0.0.1:3011/api")
    parser.add_argument("--secret", default=os.environ.get("BRSE_API_SECRET", ""))
    args = parser.parse_args()
    sys.exit(1 if asyncio.run(run(args.api_base, args.secret)) else 0)
