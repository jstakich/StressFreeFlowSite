#!/usr/bin/env python3
"""Build 6.9" App Store screenshots from captures in `new previews/redo`.

Default style matches the approved set: purple gradient backdrop, white iPhone
mockup, bold caption under the phone. Pass --plain for a white canvas with no
caption. Output is 1320x2868 RGB (App Store Connect 6.9").
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "new previews" / "redo"
OUT_DIR = ROOT / "new previews" / "output"
STYLE_REF = OUT_DIR / "done" / "iphone_6.9_screenshot_08.png"

CANVAS_W, CANVAS_H = 1320, 2868

# Geometry measured off the approved screenshots so the set stays consistent.
PHONE_X, PHONE_Y = 146, 174
PHONE_W, PHONE_H = 1028, 2234
SCREEN_PAD = 26
PHONE_RADIUS = 141
SCREEN_RADIUS = 115
CAPTION_TOP = 2604
CAPTION_MAX_W = 1180

# Fallback backdrop stops (y fraction -> RGB) if the style reference is missing.
GRADIENT_STOPS = [
    (0.00, (100, 15, 150)),
    (0.25, (137, 21, 171)),
    (0.44, (157, 29, 181)),
    (0.63, (147, 30, 171)),
    (0.82, (128, 35, 152)),
    (1.00, (100, 39, 130)),
]

BOLD_FONTS = [
    ("/System/Library/Fonts/Helvetica.ttc", 1),
    ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 0),
]

# Caption per source file, matched on a lowercase substring of the file stem.
CAPTIONS = {
    "img_1030": "Draw in the Sand to Unwind",
}
DEFAULT_CAPTION = "Draw in the Sand to Unwind"


def load_bold_font(size: int) -> ImageFont.FreeTypeFont:
    for path, index in BOLD_FONTS:
        try:
            return ImageFont.truetype(path, size, index=index)
        except OSError:
            continue
    return ImageFont.load_default()


def build_backdrop(plain: bool) -> Image.Image:
    if plain:
        return Image.new("RGB", (CANVAS_W, CANVAS_H), (255, 255, 255))

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H))
    draw = ImageDraw.Draw(canvas)

    if STYLE_REF.exists():
        px = Image.open(STYLE_REF).convert("RGB").load()
        # Columns clear of both the phone body and its drop shadow.
        for y in range(CANVAS_H):
            left = tuple(sum(px[x, y][c] for x in range(0, 90)) // 90 for c in range(3))
            right = tuple(sum(px[x, y][c] for x in range(1255, 1320)) // 65 for c in range(3))
            for x in range(CANVAS_W):
                t = x / (CANVAS_W - 1)
                draw.point(
                    (x, y),
                    tuple(int(round(left[c] + (right[c] - left[c]) * t)) for c in range(3)),
                )
        return canvas

    for y in range(CANVAS_H):
        t = y / (CANVAS_H - 1)
        lo, hi = GRADIENT_STOPS[0], GRADIENT_STOPS[-1]
        for i in range(len(GRADIENT_STOPS) - 1):
            if GRADIENT_STOPS[i][0] <= t <= GRADIENT_STOPS[i + 1][0]:
                lo, hi = GRADIENT_STOPS[i], GRADIENT_STOPS[i + 1]
                break
        f = (t - lo[0]) / max(1e-6, hi[0] - lo[0])
        color = tuple(int(round(lo[1][c] + (hi[1][c] - lo[1][c]) * f)) for c in range(3))
        draw.line([(0, y), (CANVAS_W, y)], fill=color)
    return canvas


def cover_fit(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(box_w / src_w, box_h / src_h)
    resized = img.resize(
        (max(1, round(src_w * scale)), max(1, round(src_h * scale))),
        Image.Resampling.LANCZOS,
    )
    new_w, new_h = resized.size
    left = (new_w - box_w) // 2
    top = (new_h - box_h) // 2
    return resized.crop((left, top, left + box_w, top + box_h))


def draw_white_iphone(canvas: Image.Image, screen: Image.Image, plain: bool) -> Image.Image:
    shadow_alpha = 70 if plain else 110
    offset_x, offset_y = (14, 22) if plain else (18, 28)
    blur = 28 if plain else 36

    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (
            PHONE_X + offset_x,
            PHONE_Y + offset_y,
            PHONE_X + PHONE_W + offset_x,
            PHONE_Y + PHONE_H + offset_y,
        ),
        radius=PHONE_RADIUS,
        fill=(0, 0, 0, shadow_alpha),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (PHONE_X, PHONE_Y, PHONE_X + PHONE_W - 1, PHONE_Y + PHONE_H - 1),
        radius=PHONE_RADIUS,
        fill=(248, 248, 250),
        outline=(220, 220, 224),
        width=2,
    )
    inset = max(3, SCREEN_PAD // 3)
    draw.rounded_rectangle(
        (
            PHONE_X + inset,
            PHONE_Y + inset,
            PHONE_X + PHONE_W - 1 - inset,
            PHONE_Y + PHONE_H - 1 - inset,
        ),
        radius=max(8, PHONE_RADIUS - inset),
        fill=(232, 232, 236),
    )

    btn_w = max(4, round(PHONE_W * 0.01))
    left_x0 = PHONE_X - btn_w + 1
    for start, length in ((0.145, 0.024), (0.195, 0.055), (0.265, 0.055)):
        y0 = PHONE_Y + int(PHONE_H * start)
        draw.rounded_rectangle(
            (left_x0, y0, PHONE_X + 1, y0 + int(PHONE_H * length)),
            radius=2,
            fill=(210, 210, 214),
        )
    power_y = PHONE_Y + int(PHONE_H * 0.22)
    draw.rounded_rectangle(
        (
            PHONE_X + PHONE_W - 2,
            power_y,
            PHONE_X + PHONE_W + btn_w - 2,
            power_y + int(PHONE_H * 0.09),
        ),
        radius=2,
        fill=(210, 210, 214),
    )

    sx0 = PHONE_X + SCREEN_PAD
    sy0 = PHONE_Y + SCREEN_PAD
    screen_w = PHONE_W - SCREEN_PAD * 2
    screen_h = PHONE_H - SCREEN_PAD * 2

    fitted = cover_fit(screen, screen_w, screen_h)
    mask = Image.new("L", (screen_w, screen_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, screen_w - 1, screen_h - 1), radius=SCREEN_RADIUS, fill=255
    )
    layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    layer.paste(fitted.convert("RGBA"), (sx0, sy0), mask)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), layer).convert("RGB")

    draw = ImageDraw.Draw(canvas)
    island_w = round(screen_w * 0.32)
    island_h = max(18, round(screen_h * 0.028))
    island_x = sx0 + (screen_w - island_w) // 2
    island_y = sy0 + max(14, round(screen_h * 0.018))
    draw.rounded_rectangle(
        (island_x, island_y, island_x + island_w, island_y + island_h),
        radius=island_h // 2,
        fill=(8, 8, 10),
    )
    return canvas


def draw_caption(canvas: Image.Image, text: str) -> None:
    draw = ImageDraw.Draw(canvas)
    size = 65
    font = load_bold_font(size)
    while size > 34:
        box = draw.textbbox((0, 0), text, font=font)
        if box[2] - box[0] <= CAPTION_MAX_W:
            break
        size -= 2
        font = load_bold_font(size)

    box = draw.textbbox((0, 0), text, font=font)
    x = (CANVAS_W - (box[2] - box[0])) // 2 - box[0]
    y = CAPTION_TOP - box[1]
    draw.text((x + 4, y + 4), text, font=font, fill=(40, 8, 60))
    draw.text((x, y), text, font=font, fill=(255, 255, 255))


def caption_for(stem: str) -> str:
    key = re.sub(r"[^a-z0-9]", "", stem.lower())
    for marker, caption in CAPTIONS.items():
        if re.sub(r"[^a-z0-9]", "", marker) in key:
            return caption
    return DEFAULT_CAPTION


def next_index() -> int:
    used = []
    for folder in (OUT_DIR, OUT_DIR / "done"):
        for path in folder.glob("iphone_6.9_screenshot_*.png"):
            m = re.search(r"_(\d+)\.png$", path.name)
            if m:
                used.append(int(m.group(1)))
    return max(used, default=0) + 1


def build(src: Path, index: int, plain: bool) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas = build_backdrop(plain)
    canvas = draw_white_iphone(canvas, Image.open(src).convert("RGB"), plain)
    if not plain:
        draw_caption(canvas, caption_for(src.stem))

    stem = f"iphone_6.9_screenshot_{index:02d}"
    png_path = OUT_DIR / f"{stem}.png"
    jpg_path = OUT_DIR / f"{stem}.jpg"
    canvas.save(png_path, "PNG", optimize=True)
    canvas.save(jpg_path, "JPEG", quality=95, optimize=True)
    print(f"{src.name} -> {png_path.name} + {jpg_path.name} ({CANVAS_W}x{CANVAS_H})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plain", action="store_true", help="white canvas, no caption")
    parser.add_argument("--start", type=int, help="first output index (default: next free)")
    args = parser.parse_args()

    sources = sorted(
        p
        for p in SRC_DIR.iterdir()
        if p.suffix.lower() in {".png", ".jpg", ".jpeg"} and not p.name.startswith(".")
    )
    if not sources:
        raise SystemExit(f"No images found in {SRC_DIR}")

    index = args.start if args.start is not None else next_index()
    for offset, src in enumerate(sources):
        build(src, index + offset, args.plain)
    print(f"Done — {len(sources)} screenshot(s) in {OUT_DIR}")


if __name__ == "__main__":
    main()
