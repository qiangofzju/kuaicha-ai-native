#!/usr/bin/env python3
"""Validate required skill asset files for batch skill."""

from __future__ import annotations

import argparse
from pathlib import Path


REQUIRED_FILES = [
    "SKILL.md",
    "references/skill-contract.md",
    "references/ui-trace-guideline.md",
]

REQUIRED_TERMS = {
    "SKILL.md": ["Goal", "Inputs", "Outputs", "Execution Stages", "Sanitization Rules"],
    "references/skill-contract.md": ["/api/skills/batch/execute", "/ws/skills/{task_id}", "skill_trace"],
    "references/ui-trace-guideline.md": ["Must Show", "Must Not Show", "<= 180 chars"],
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate batch skill asset contract files")
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Skill asset root directory",
    )
    args = parser.parse_args()
    root = Path(args.root).resolve()

    errors: list[str] = []
    for rel in REQUIRED_FILES:
        target = root / rel
        if not target.exists():
            errors.append(f"Missing required file: {rel}")
            continue
        content = target.read_text(encoding="utf-8")
        for term in REQUIRED_TERMS.get(rel, []):
            if term not in content:
                errors.append(f"`{rel}` missing required term: {term}")

    if errors:
        for item in errors:
            print(f"[ERROR] {item}")
        return 1

    print("[OK] Batch skill contract files validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
