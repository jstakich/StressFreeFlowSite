#!/usr/bin/env python3
"""Apply site-wide blog and asset consistency patches."""

from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG_DIR = ROOT / "blog"
CSS_VER = "34"
FEED_VER = "6"

FAVICON_BLOCK = """    <link rel="icon" href="../assets/appicon-32.png" sizes="32x32" />
    <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png" />"""

STICKY_CTA = """          <span>iPhone &amp; iPad · App Store only</span>"""

OLD_STICKY_PATTERNS = [
    "<span>Free on the App Store</span>",
    "<span>iPhone &amp; iPad · App Store only</span>",
]


def slug_from_path(path: Path) -> str:
    return path.stem


def url_to_slug(url: str) -> str:
    name = url.rsplit("/", 1)[-1]
    return name.replace(".html", "")


def related_posts(post: dict, posts: list[dict], limit: int = 3) -> list[dict]:
    tags = set(post.get("tags") or [])
    slug = url_to_slug(post["url"])
    scored: list[tuple[int, str, dict]] = []
    for candidate in posts:
        if url_to_slug(candidate["url"]) == slug:
            continue
        overlap = len(tags.intersection(set(candidate.get("tags") or [])))
        scored.append((overlap, candidate["title"], candidate))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in scored[:limit]]


def render_related_html(related: list[dict]) -> str:
    if not related:
        return ""
    items = "\n".join(
        f'              <li><a href="{escape(r["url"].replace("./blog/", "../blog/"))}">{escape(r["title"])}</a></li>'
        for r in related
    )
    return f"""
          <div class="blog-related">
            <h2>Related reads</h2>
            <ul class="blog-related-list">
{items}
            </ul>
          </div>
"""


def article_schema(title: str, description: str, canonical: str, date: str) -> str:
    desc_json = json.dumps(description)
    title_json = json.dumps(title)
    return f"""    <script type="application/ld+json">
      {{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": {title_json},
        "description": {desc_json},
        "datePublished": "{date}",
        "dateModified": "{date}",
        "author": {{
          "@type": "Person",
          "name": "Jeremy Stakich"
        }},
        "publisher": {{
          "@type": "Organization",
          "name": "StressFreeFlow",
          "logo": {{
            "@type": "ImageObject",
            "url": "https://stressfreeflow.com/assets/appicon.png"
          }}
        }},
        "mainEntityOfPage": {{
          "@type": "WebPage",
          "@id": "{canonical}"
        }},
        "inLanguage": "en-US"
      }}
    </script>
"""


def patch_blog_file(path: Path, posts: list[dict], by_slug: dict[str, dict]) -> None:
    text = path.read_text(encoding="utf-8")
    slug = slug_from_path(path)
    post = by_slug.get(slug)
    if not post:
        print(f"skip (no blogs.json entry): {path.name}")
        return

    title_match = re.search(r"<h1>(.*?)</h1>", text, re.DOTALL)
    desc_match = re.search(r'name="description"\s+content="([^"]*)"', text, re.DOTALL)
    canon_match = re.search(r'rel="canonical"[^>]*href="([^"]*)"', text, re.DOTALL)
    date_match = re.search(r'<time datetime="(\d{4}-\d{2}-\d{2})"', text)
    if not all([title_match, desc_match, canon_match, date_match]):
        print(f"skip (missing meta): {path.name}")
        return

    title = re.sub(r"\s+", " ", title_match.group(1)).strip()
    description = desc_match.group(1)
    canonical = canon_match.group(1)
    date = date_match.group(1)

    # CSS version
    text = re.sub(r'href="\.\./styles\.css\?v=\d+"', f'href="../styles.css?v={CSS_VER}"', text)

    # Favicon
    text = re.sub(
        r'<link rel="icon" href="\.\./assets/appicon\.png"\s*/>',
        FAVICON_BLOCK,
        text,
    )
    if "appicon-32.png" not in text:
        text = text.replace(
            '<meta name="theme-color" content="#0c1837" />',
            '<meta name="theme-color" content="#0c1837" />\n' + FAVICON_BLOCK,
        )

    # Article schema
    schema = article_schema(title, description, canonical, date)
    if '"@type": "BlogPosting"' not in text:
        text = text.replace("<link rel=\"stylesheet\"", schema + "\n    <link rel=\"stylesheet\"", 1)

    # Sticky CTA
    text = text.replace(
        "<span>Free on the App Store</span>",
        "<span>iPhone &amp; iPad · App Store only</span>",
    )

    # Related reads (replace or insert before blog-cta)
    related_html = render_related_html(related_posts(post, posts))
    if related_html.strip():
        if "blog-related" in text:
            text = re.sub(
                r'\n          <div class="blog-related">.*?</div>\n',
                "\n" + related_html + "\n",
                text,
                count=1,
                flags=re.DOTALL,
            )
        else:
            text = text.replace(
                "\n          <div class=\"blog-cta\">",
                related_html + "\n          <div class=\"blog-cta\">",
            )

    path.write_text(text, encoding="utf-8")
    print(f"Patched {path.name}")


def main() -> None:
    posts = json.loads((ROOT / "blogs.json").read_text(encoding="utf-8"))
    by_slug = {url_to_slug(p["url"]): p for p in posts}
    for path in sorted(BLOG_DIR.glob("*.html")):
        patch_blog_file(path, posts, by_slug)
    print("Done.")


if __name__ == "__main__":
    main()
