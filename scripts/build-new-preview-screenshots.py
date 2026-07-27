#!/usr/bin/env python3
"""Build 6.9\" iPhone App Store screenshots with a white iPhone mockup."""

from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "new previews"
OUT_DIR = SRC_DIR / "output"

# Apple App Store — iPhone 6.9" display
CANVAS_W, CANVAS_H = 1320, 2868

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def extract_frame(video: Path, dest: Path, time_s: float = 2.0) -> Image.Image:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        FFMPEG,
        "-y",
        "-ss",
        str(time_s),
        "-i",
        str(video),
        "-frames:v",
        "1",
        "-update",
        "1",
        str(dest),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not dest.exists():
        raise RuntimeError(f"Could not extract frame from {video.name}: {r.stderr[-500:]}")
    return Image.open(dest).convert("RGB")


def cover_fit(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(box_w / src_w, box_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - box_w) // 2
    top = (new_h - box_h) // 2
    return resized.crop((left, top, left + box_w, top + box_h))


def draw_white_iphone(canvas: Image.Image, screen: Image.Image) -> None:
    """Draw website-style white iPhone 16 mockup filling most of the 6.9\" canvas."""
    draw = ImageDraw.Draw(canvas)

    # Soft brand-tinted background behind the phone
    for y in range(CANVAS_H):
        t = y / max(1, CANVAS_H - 1)
        r = int(10 + 8 * t)
        g = int(18 + 12 * t)
        b = int(40 + 18 * t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))

    # Phone geometry (matches ~393/852 aspect used on the site)
    margin_x = 70
    phone_w = CANVAS_W - margin_x * 2
    phone_h = int(round(phone_w * (852 / 393)))
    # Keep phone on-canvas with vertical centering / slight top bias
    max_h = CANVAS_H - 120
    if phone_h > max_h:
        phone_h = max_h
        phone_w = int(round(phone_h * (393 / 852)))
        margin_x = (CANVAS_W - phone_w) // 2

    phone_x = margin_x
    phone_y = (CANVAS_H - phone_h) // 2

    pad = max(10, int(round(phone_w * 0.027)))  # ~8px at 300 → scaled
    radius = max(40, int(round(phone_w * 0.137)))  # ~54/300
    screen_radius = max(32, int(round(phone_w * 0.112)))  # ~44/300

    # Soft drop shadow
    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        (phone_x + 18, phone_y + 28, phone_x + phone_w + 18, phone_y + phone_h + 28),
        radius=radius,
        fill=(0, 0, 0, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(36))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB"))

    draw = ImageDraw.Draw(canvas)

    # Outer white titanium-style body
    draw.rounded_rectangle(
        (phone_x, phone_y, phone_x + phone_w - 1, phone_y + phone_h - 1),
        radius=radius,
        fill=(248, 248, 250),
        outline=(220, 220, 224),
        width=2,
    )
    # Inner bevel
    inset = max(3, pad // 3)
    draw.rounded_rectangle(
        (
            phone_x + inset,
            phone_y + inset,
            phone_x + phone_w - 1 - inset,
            phone_y + phone_h - 1 - inset,
        ),
        radius=max(8, radius - inset),
        fill=(232, 232, 236),
    )

    # Side buttons (left: silent + volume, right: power)
    btn_w = max(4, int(round(phone_w * 0.01)))
    left_x0 = phone_x - btn_w + 1
    draw.rounded_rectangle(
        (left_x0, phone_y + int(phone_h * 0.145), phone_x + 1, phone_y + int(phone_h * 0.145) + int(phone_h * 0.024)),
        radius=2,
        fill=(210, 210, 214),
    )
    draw.rounded_rectangle(
        (left_x0, phone_y + int(phone_h * 0.195), phone_x + 1, phone_y + int(phone_h * 0.195) + int(phone_h * 0.055)),
        radius=2,
        fill=(210, 210, 214),
    )
    draw.rounded_rectangle(
        (left_x0, phone_y + int(phone_h * 0.265), phone_x + 1, phone_y + int(phone_h * 0.265) + int(phone_h * 0.055)),
        radius=2,
        fill=(210, 210, 214),
    )
    draw.rounded_rectangle(
        (
            phone_x + phone_w - 2,
            phone_y + int(phone_h * 0.22),
            phone_x + phone_w + btn_w - 2,
            phone_y + int(phone_h * 0.22) + int(phone_h * 0.09),
        ),
        radius=2,
        fill=(210, 210, 214),
    )

    # Screen rect
    sx0 = phone_x + pad
    sy0 = phone_y + pad
    sx1 = phone_x + phone_w - pad
    sy1 = phone_y + phone_h - pad
    screen_w = sx1 - sx0
    screen_h = sy1 - sy0

    fitted = cover_fit(screen, screen_w, screen_h)

    # Rounded screen mask
    screen_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    mask = Image.new("L", (screen_w, screen_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, screen_w - 1, screen_h - 1), radius=screen_radius, fill=255)
    screen_layer.paste(fitted.convert("RGBA"), (sx0, sy0), mask)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), screen_layer).convert("RGB"))

    draw = ImageDraw.Draw(canvas)

    # Dynamic Island
    island_w = int(round(screen_w * 0.32))
    island_h = max(18, int(round(screen_h * 0.028)))
    island_x = sx0 + (screen_w - island_w) // 2
    island_y = sy0 + max(14, int(round(screen_h * 0.018)))
    draw.rounded_rectangle(
        (island_x, island_y, island_x + island_w, island_y + island_h),
        radius=island_h // 2,
        fill=(8, 8, 10),
    )


def build_one(video: Path, index: int) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Pick a frame a bit into the clip so UI has settled
    duration_guess = 8.0
    probe = subprocess.run([FFMPEG, "-hide_banner", "-i", str(video)], capture_output=True, text=True)
    for line in probe.stderr.splitlines():
        if "Duration" in line:
            # Duration: 00:00:16.25
            try:
                part = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = part.split(":")
                duration_guess = float(h) * 3600 + float(m) * 60 + float(s)
            except Exception:
                pass
            break
    t = max(1.0, min(duration_guess * 0.4, duration_guess - 0.5))

    tmp = Path(f"/tmp/np-frame-{index}.jpg")
    frame = extract_frame(video, tmp, time_s=t)

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (12, 20, 42))
    draw_white_iphone(canvas, frame)

    stem = f"iphone_6.9_screenshot_{index:02d}"
    png_path = OUT_DIR / f"{stem}.png"
    jpg_path = OUT_DIR / f"{stem}.jpg"
    canvas.save(png_path, "PNG", optimize=True)
    canvas.save(jpg_path, "JPEG", quality=92, optimize=True)
    print(f"Wrote {png_path.name} and {jpg_path.name} from {video.name} @ {t:.1f}s ({CANVAS_W}x{CANVAS_H})")


def main() -> None:
    videos = sorted(SRC_DIR.glob("*.mp4"))
    if not videos:
        raise SystemExit(f"No mp4 files in {SRC_DIR}")
    for i, video in enumerate(videos, 1):
        build_one(video, i)
    print(f"Done — {len(videos)} screenshots in {OUT_DIR}")


if __name__ == "__main__":
    main()
