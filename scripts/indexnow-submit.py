#!/usr/bin/env python3
"""Notify Bing (and other IndexNow engines) about new or updated pages.

Usage:
  python3 scripts/indexnow-submit.py blog/new-post.html [more paths or URLs...]
  python3 scripts/indexnow-submit.py --all      # every URL in sitemap.xml

Run after the change is pushed and live; engines fetch the key file to verify.
"""
import json
import pathlib
import re
import sys
import urllib.request

HOST = "stressfreeflow.com"
KEY = "e0a3a7baa14dbc0cad914cbae8ff7381"
ROOT = pathlib.Path(__file__).resolve().parent.parent


def to_url(arg: str) -> str:
    if arg.startswith("http"):
        return arg
    path = arg.lstrip("./")
    return f"https://{HOST}/" if path in ("", "index.html") else f"https://{HOST}/{path}"


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args == ["--all"]:
        urls = re.findall(r"<loc>(.*?)</loc>", (ROOT / "sitemap.xml").read_text())
    else:
        urls = [to_url(a) for a in args]
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"IndexNow: HTTP {resp.status} for {len(urls)} URL(s)")


if __name__ == "__main__":
    main()
