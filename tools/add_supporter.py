#!/usr/bin/env python3
"""Add an approved supporter name to data/likes.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIKES_PATH = ROOT / "data" / "likes.json"


def main() -> int:
    if len(sys.argv) < 2:
        print('Usage: python3 tools/add_supporter.py "First Name"')
        return 1

    name = " ".join(sys.argv[1:]).strip()
    if not name:
        print("Name cannot be empty.")
        return 1

    data = {"supporters": []}
    if LIKES_PATH.exists():
        data = json.loads(LIKES_PATH.read_text(encoding="utf-8"))

    supporters = data.get("supporters", [])
    if any(entry.get("name", "").lower() == name.lower() for entry in supporters):
        print(f'"{name}" is already listed.')
        return 0

    supporters.append({"name": name})
    data["supporters"] = supporters
    LIKES_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f'Added supporter: {name}')
    print(f"Total supporters: {len(supporters)}")
    print("Commit and push data/likes.json to publish on the site.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
