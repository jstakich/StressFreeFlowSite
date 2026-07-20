#!/usr/bin/env python3
"""Fetch Google Place reviews into google-reviews.json (max 5 from Places API).

Usage:
  GOOGLE_MAPS_API_KEY=your_key python3 scripts/fetch-google-reviews.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "google-reviews.json"
PLACE_ID = "ChIJAwQcAob5OGcRMRKVJqySsvg"
REVIEW_URL = "https://g.page/r/CTESlSaskrL4EBM/review"
MAPS_URL = (
    "https://www.google.com/maps/search/?api=1&query=Google&query_place_id=" + PLACE_ID
)


def main() -> int:
    key = (os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("GOOGLE_PLACES_API_KEY") or "").strip()
    if not key:
        print("Set GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY) and re-run.", file=sys.stderr)
        return 1

    params = urllib.parse.urlencode(
        {
            "place_id": PLACE_ID,
            "fields": "name,rating,user_ratings_total,reviews,url",
            "key": key,
        }
    )
    url = "https://maps.googleapis.com/maps/api/place/details/json?" + params
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    status = payload.get("status")
    if status != "OK":
        print(f"Places API error: {status} {payload.get('error_message', '')}", file=sys.stderr)
        return 1

    result = payload.get("result") or {}
    reviews = []
    for item in result.get("reviews") or []:
        text = (item.get("text") or "").strip()
        if not text:
            continue
        reviews.append(
            {
                "author": item.get("author_name") or "Google reviewer",
                "rating": int(item.get("rating") or 0),
                "text": text,
                "relativeTime": item.get("relative_time_description") or "",
                "authorUrl": item.get("author_url") or "",
            }
        )

    data = {
        "placeId": PLACE_ID,
        "name": result.get("name") or "Stress Free Flow",
        "rating": result.get("rating"),
        "userRatingsTotal": int(result.get("user_ratings_total") or 0),
        "updatedAt": date.today().isoformat(),
        "reviewUrl": REVIEW_URL,
        "mapsUrl": result.get("url") or MAPS_URL,
        "reviews": reviews,
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT.name}: rating={data['rating']} total={data['userRatingsTotal']} "
        f"written={len(reviews)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
