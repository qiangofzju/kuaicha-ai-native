#!/usr/bin/env python3
"""Smoke test script for batch skill API workflow."""

from __future__ import annotations

import argparse
import time

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test batch skill execution")
    parser.add_argument("--base", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--timeout", type=float, default=30.0, help="Polling timeout seconds")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    client = httpx.Client(timeout=20.0)

    try:
        list_resp = client.get(f"{base}/api/skills/list")
        list_resp.raise_for_status()
        skill_ids = [item.get("id") for item in list_resp.json()]
        if "batch" not in skill_ids:
            print("[ERROR] batch skill not found in /api/skills/list")
            return 1
        print("[OK] batch skill listed")

        execute_resp = client.post(
            f"{base}/api/skills/batch/execute",
            json={
                "target": "",
                "params": {
                    "query": "杭州市今年的人工智能企业有哪些？",
                    "scenario": "filter",
                },
            },
        )
        execute_resp.raise_for_status()
        task_id = execute_resp.json()["task_id"]
        print(f"[OK] execution started, task_id={task_id}")

        start = time.time()
        while True:
            status_resp = client.get(f"{base}/api/skills/tasks/{task_id}")
            status_resp.raise_for_status()
            status = status_resp.json()
            if status.get("status") == "completed":
                break
            if status.get("status") == "failed":
                print("[ERROR] skill task failed")
                return 1
            if time.time() - start > args.timeout:
                print("[ERROR] timeout waiting for task completion")
                return 1
            time.sleep(0.8)

        result_resp = client.get(f"{base}/api/skills/tasks/{task_id}/result")
        result_resp.raise_for_status()
        result = result_resp.json()
        if not result.get("summary"):
            print("[ERROR] result missing summary")
            return 1
        print("[OK] result received")

        export_resp = client.get(f"{base}/api/skills/tasks/{task_id}/export/excel")
        if export_resp.status_code not in (200, 503):
            print(f"[ERROR] export check failed: {export_resp.status_code}")
            return 1
        print("[OK] export endpoint reachable")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
