#!/usr/bin/env python3
"""Generate App Store preview header banners — advertising ABOVE the device preview."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
APP_ICON = ROOT / "assets" / "appicon.png"
EXPORT = ROOT / "2.1.14 preview for Apple complete"
OVERLAYS = EXPORT / "overlays"
MOCKUPS = EXPORT / "mockups"
IMPORT_BASE = ROOT / "2.1.14 preview for Apple"

WIDTH = 1280
BANNER_HEIGHT = 224
PREVIEW_HEIGHT = 720
TOTAL_HEIGHT = BANNER_HEIGHT + PREVIEW_HEIGHT

# Brand palette (from styles.css)
BG_DARK = (7, 18, 37)
BG_GRADIENT_TOP = (10, 22, 48)
BG_GRADIENT_BOTTOM = (13, 29, 61)
TEXT = (244, 248, 255)
MUTED = (191, 208, 238)
ACCENT = (140, 224, 255)
GOLD = (255, 214, 120)


def load_fonts() -> dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    candidates = [
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Avenir Next.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]

    def font(size: int, index: int = 0) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        for path in candidates:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size=size, index=index)
                except Exception:
                    try:
                        return ImageFont.truetype(path, size=size)
                    except Exception:
                        continue
        return ImageFont.load_default()

    return {
        "title": font(52, 0),
        "subtitle": font(26, 0),
        "price": font(24, 0),
        "chip": font(21, 0),
        "tagline": font(22, 0),
    }


def rounded_icon(icon: Image.Image, size: int, radius: int) -> Image.Image:
    icon = icon.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    icon.putalpha(mask)
    return icon


def draw_banner_background() -> Image.Image:
    banner = Image.new("RGB", (WIDTH, BANNER_HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(banner)
    for y in range(BANNER_HEIGHT):
        t = y / max(BANNER_HEIGHT - 1, 1)
        r = int(BG_GRADIENT_TOP[0] + (BG_GRADIENT_BOTTOM[0] - BG_GRADIENT_TOP[0]) * t)
        g = int(BG_GRADIENT_TOP[1] + (BG_GRADIENT_BOTTOM[1] - BG_GRADIENT_TOP[1]) * t)
        b = int(BG_GRADIENT_TOP[2] + (BG_GRADIENT_BOTTOM[2] - BG_GRADIENT_TOP[2]) * t)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
  # subtle accent glow top-left
    glow = Image.new("RGBA", (WIDTH, BANNER_HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-80, -80, 360, 280), fill=(84, 198, 255, 28))
    glow_draw.ellipse((WIDTH - 300, -60, WIDTH + 60, 200), fill=(126, 100, 255, 20))
    banner = Image.alpha_composite(banner.convert("RGBA"), glow).convert("RGB")
    return banner


def draw_chip(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    label: str,
    font: ImageFont.ImageFont,
) -> tuple[int, int, int, int]:
    x, y = xy
    bbox = draw.textbbox((0, 0), label, font=font)
    w = bbox[2] - bbox[0] + 26
    h = bbox[3] - bbox[1] + 12
    rect = (x, y, x + w, y + h)
    draw.rounded_rectangle(rect, radius=16, fill=(20, 40, 78), outline=(140, 224, 255, 80), width=1)
    draw.text((x + 13, y + 4), label, font=font, fill=TEXT)
    return rect


def build_banner(device: str) -> Image.Image:
    fonts = load_fonts()
    banner = draw_banner_background()
    draw = ImageDraw.Draw(banner)

    icon_size = 88
    icon = rounded_icon(Image.open(APP_ICON), icon_size, radius=int(icon_size * 0.22))
    icon_x = 48
    icon_y = (BANNER_HEIGHT - icon_size) // 2 - 28
    banner.paste(icon, (icon_x, icon_y), icon)

    text_x = icon_x + icon_size + 24
    text_y = 36
    draw.text((text_x, text_y), "Stress Free Flow", font=fonts["title"], fill=TEXT)

    draw.text(
        (text_x, text_y + 58),
        "Free App  ·  No Ads  ·  No Subscriptions",
        font=fonts["subtitle"],
        fill=MUTED,
    )

    draw.text(
        (text_x, text_y + 92),
        "$4.99 one-time fee for all features",
        font=fonts["price"],
        fill=GOLD,
    )

    chips = ["ADHD", "Sensory", "Focus", "Sleep"]
    chip_x = text_x
    chip_y = text_y + 132
    last_chip_right = text_x
    for chip in chips:
        rect = draw_chip(draw, (chip_x, chip_y), chip, fonts["chip"])
        chip_x = rect[2] + 12
        last_chip_right = rect[2]

    return banner


def build_overlay(pad_x: int = 40, pad_y: int = 20) -> Image.Image:
    """Tight-crop overlay PNG — only the blue area around the content."""
    fonts = load_fonts()
    icon_size = 88
    icon_x = pad_x
    text_x = icon_x + icon_size + 24
    text_y = pad_y + 8

    title = "Stress Free Flow"
    subtitle = "Free App  ·  No Ads  ·  No Subscriptions"
    price = "$4.99 one-time fee for all features"
    chips = ["ADHD", "Sensory", "Focus", "Sleep"]

    draw_probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    title_bbox = draw_probe.textbbox((0, 0), title, font=fonts["title"])
    subtitle_bbox = draw_probe.textbbox((0, 0), subtitle, font=fonts["subtitle"])
    price_bbox = draw_probe.textbbox((0, 0), price, font=fonts["price"])

    chip_y = text_y + 132
    chip_x = text_x
    last_chip_right = text_x
    for chip in chips:
        bbox = draw_probe.textbbox((0, 0), chip, font=fonts["chip"])
        w = bbox[2] - bbox[0] + 26
        last_chip_right = chip_x + w
        chip_x += w + 12

    content_right = max(
        icon_x + icon_size,
        text_x + title_bbox[2] - title_bbox[0],
        text_x + subtitle_bbox[2] - subtitle_bbox[0],
        text_x + price_bbox[2] - price_bbox[0],
        last_chip_right,
    )
    content_bottom = chip_y + 34

    width = content_right + pad_x
    height = content_bottom + pad_y

    banner = Image.new("RGB", (width, height), BG_DARK)
    draw = ImageDraw.Draw(banner)
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(BG_GRADIENT_TOP[0] + (BG_GRADIENT_BOTTOM[0] - BG_GRADIENT_TOP[0]) * t)
        g = int(BG_GRADIENT_TOP[1] + (BG_GRADIENT_BOTTOM[1] - BG_GRADIENT_TOP[1]) * t)
        b = int(BG_GRADIENT_TOP[2] + (BG_GRADIENT_BOTTOM[2] - BG_GRADIENT_TOP[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-80, -80, 360, 280), fill=(84, 198, 255, 28))
    banner = Image.alpha_composite(banner.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(banner)

    icon = rounded_icon(Image.open(APP_ICON), icon_size, radius=int(icon_size * 0.22))
    icon_y = pad_y + 8
    banner.paste(icon, (icon_x, icon_y), icon)

    draw.text((text_x, text_y), title, font=fonts["title"], fill=TEXT)
    draw.text((text_x, text_y + 58), subtitle, font=fonts["subtitle"], fill=MUTED)
    draw.text((text_x, text_y + 92), price, font=fonts["price"], fill=GOLD)

    chip_x = text_x
    for chip in chips:
        rect = draw_chip(draw, (chip_x, chip_y), chip, fonts["chip"])
        chip_x = rect[2] + 12

    return banner


def stack_mockup(banner: Image.Image, frame_path: Path, out_path: Path) -> None:
    preview = Image.open(frame_path).convert("RGB")
    if preview.size != (WIDTH, PREVIEW_HEIGHT):
        preview = preview.resize((WIDTH, PREVIEW_HEIGHT), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (WIDTH, TOTAL_HEIGHT), BG_DARK)
    canvas.paste(banner, (0, 0))
    canvas.paste(preview, (0, BANNER_HEIGHT))
    canvas.save(out_path, "JPEG", quality=92, optimize=True)


def save_banner_assets(device: str, banner: Image.Image) -> None:
    prefix = f"banner-{device}"
    banner.save(OVERLAYS / f"{prefix}.jpg", "JPEG", quality=92, optimize=True)
    banner.save(OVERLAYS / f"{prefix}.png")


def main() -> None:
    OVERLAYS.mkdir(parents=True, exist_ok=True)
    MOCKUPS.mkdir(parents=True, exist_ok=True)

    frames = {
        "iphone": IMPORT_BASE / "iphone/for video previews/BreathReset.mov",
        "ipad": IMPORT_BASE / "ipad/for video previews/BreathReset.mov",
    }

    for device in ("iphone", "ipad"):
        banner = build_banner(device)
        save_banner_assets(device, banner)

        frame_png = Path(f"/tmp/{device}-frame.png")
        if not frame_png.exists():
            mov = frames[device]
            os.system(f'qlmanage -t -s {WIDTH} -o /tmp "{mov}" >/dev/null 2>&1')
            generated = Path("/tmp") / f"{mov.stem}.mov.png"
            if generated.exists():
                generated.rename(frame_png)

        if frame_png.exists():
            stack_mockup(banner, frame_png, MOCKUPS / f"mockup-{device}-breathreset.jpg")

    print(f"Banner: {WIDTH}x{BANNER_HEIGHT}  |  Stacked mockup: {WIDTH}x{TOTAL_HEIGHT}")
    print("Created in:", EXPORT)


if __name__ == "__main__":
    main()
