#!/usr/bin/env python3
"""Run the batch skill through the existing batch agent."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.environ["DEBUG"] = "false"

from app.agents.base import AgentInput
from app.agents.workflows.batch_processing import BatchProcessingAgent


async def _run(payload: dict) -> dict:
    query = str(payload.get("query") or payload.get("target") or "").strip()
    params = dict(payload)
    params.pop("target", None)
    agent = BatchProcessingAgent()
    result = await agent.execute(AgentInput(target=query, params=params))
    report = result.report or {}
    return {
        "summary": result.summary,
        "columns": report.get("columns", []),
        "preview_rows": report.get("preview_rows", []),
        "total_count": report.get("total_count", 0),
        "stats": report.get("stats", {}),
        "schema_routing": report.get("schema_routing", {}),
        "generated_sql": report.get("generated_sql"),
        "sql_description": report.get("sql_description"),
        "metadata": result.metadata,
    }


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print("invalid-json", file=sys.stderr)
        return 1

    result = asyncio.run(_run(payload))
    output_dir = Path("outputs")
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "latest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
