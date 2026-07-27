#!/usr/bin/env python3
"""Composite screen recordings into white iPhone mockup App Preview videos (6.9\")."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "new previews"
OUT_DIR = SRC_DIR / "output"

# Apple App Store Connect — iPhone 6.9" App Preview
CANVAS_W, CANVAS_H = 886, 1920

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def phone_geometry() -> dict:
    margin_x = 48
    phone_w = CANVAS_W - margin_x * 2
    phone_h = int(round(phone_w * (852 / 393)))
    max_h = CANVAS_H - 80
    if phone_h > max_h:
        phone_h = max_h
        phone_w = int(round(phone_h * (393 / 852)))
        margin_x = (CANVAS_W - phone_w) // 2
    phone_x = margin_x
    phone_y = (CANVAS_H - phone_h) // 2
    pad = max(8, int(round(phone_w * 0.027)))
    radius = max(28, int(round(phone_w * 0.137)))
    screen_radius = max(22, int(round(phone_w * 0.112)))
    sx0 = phone_x + pad
    sy0 = phone_y + pad
    sx1 = phone_x + phone_w - pad
    sy1 = phone_y + phone_h - pad
    return {
        "phone_x": phone_x,
        "phone_y": phone_y,
        "phone_w": phone_w,
        "phone_h": phone_h,
        "pad": pad,
        "radius": radius,
        "screen_radius": screen_radius,
        "sx0": sx0,
        "sy0": sy0,
        "sx1": sx1,
        "sy1": sy1,
        "screen_w": sx1 - sx0,
        "screen_h": sy1 - sy0,
    }


def build_background() -> Image.Image:
    img = Image.new("RGB", (CANVAS_W, CANVAS_H))
    draw = ImageDraw.Draw(img)
    for y in range(CANVAS_H):
        t = y / max(1, CANVAS_H - 1)
        r = int(10 + 8 * t)
        g = int(18 + 12 * t)
        b = int(40 + 18 * t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))
    return img


def build_phone_overlay(g: dict) -> Image.Image:
    """White phone chrome with a transparent screen hole + Dynamic Island."""
    overlay = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    px, py = g["phone_x"], g["phone_y"]
    pw, ph = g["phone_w"], g["phone_h"]
    radius = g["radius"]
    pad = g["pad"]

    # Soft shadow baked into overlay
    shadow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        (px + 12, py + 20, px + pw + 12, py + ph + 20),
        radius=radius,
        fill=(0, 0, 0, 100),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    overlay = Image.alpha_composite(overlay, shadow)
    draw = ImageDraw.Draw(overlay)

    draw.rounded_rectangle(
        (px, py, px + pw - 1, py + ph - 1),
        radius=radius,
        fill=(248, 248, 250, 255),
        outline=(220, 220, 224, 255),
        width=2,
    )
    inset = max(2, pad // 3)
    draw.rounded_rectangle(
        (px + inset, py + inset, px + pw - 1 - inset, py + ph - 1 - inset),
        radius=max(8, radius - inset),
        fill=(232, 232, 236, 255),
    )

    # Punch transparent screen hole
    screen_mask = Image.new("L", (CANVAS_W, CANVAS_H), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle(
        (g["sx0"], g["sy0"], g["sx1"] - 1, g["sy1"] - 1),
        radius=g["screen_radius"],
        fill=255,
    )
    clear = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    overlay = Image.composite(clear, overlay, screen_mask)

    draw = ImageDraw.Draw(overlay)
    btn_w = max(3, int(round(pw * 0.01)))
    left_x0 = px - btn_w + 1
    for y0, y1 in (
        (int(ph * 0.145), int(ph * 0.145) + int(ph * 0.024)),
        (int(ph * 0.195), int(ph * 0.195) + int(ph * 0.055)),
        (int(ph * 0.265), int(ph * 0.265) + int(ph * 0.055)),
    ):
        draw.rounded_rectangle(
            (left_x0, py + y0, px + 1, py + y1),
            radius=2,
            fill=(210, 210, 214, 255),
        )
    draw.rounded_rectangle(
        (
            px + pw - 2,
            py + int(ph * 0.22),
            px + pw + btn_w - 2,
            py + int(ph * 0.22) + int(ph * 0.09),
        ),
        radius=2,
        fill=(210, 210, 214, 255),
    )

    # Dynamic Island on top of screen content
    island_w = int(round(g["screen_w"] * 0.32))
    island_h = max(14, int(round(g["screen_h"] * 0.028)))
    island_x = g["sx0"] + (g["screen_w"] - island_w) // 2
    island_y = g["sy0"] + max(10, int(round(g["screen_h"] * 0.018)))
    draw.rounded_rectangle(
        (island_x, island_y, island_x + island_w, island_y + island_h),
        radius=island_h // 2,
        fill=(8, 8, 10, 255),
    )
    return overlay


def probe(path: Path) -> tuple[float, bool]:
    r = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    duration = 10.0
    has_audio = "Audio:" in r.stderr
    for line in r.stderr.splitlines():
        if "Duration" in line:
            try:
                part = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = part.split(":")
                duration = float(h) * 3600 + float(m) * 60 + float(s)
            except Exception:
                pass
            break
    return duration, has_audio


def compose_video(src: Path, index: int, bg_path: Path, overlay_path: Path, g: dict) -> Path:
    duration, has_audio = probe(src)
    # App Previews max 30s
    clip_dur = min(duration, 30.0)
    out_path = OUT_DIR / f"iphone_6.9_preview_{index:02d}.mp4"
    sw, sh = g["screen_w"], g["screen_h"]
    sx, sy = g["sx0"], g["sy0"]

    # Even dimensions required for yuv420p
    sw -= sw % 2
    sh -= sh % 2

    filter_complex = (
        f"color=c=0x00000000:s={CANVAS_W}x{CANVAS_H}:d={clip_dur:.3f}[base];"
        f"[1:v]scale={CANVAS_W}:{CANVAS_H},format=rgba[bg];"
        f"[0:v]scale={sw}:{sh}:force_original_aspect_ratio=increase,"
        f"crop={sw}:{sh},setsar=1,format=rgba[scr];"
        f"[base][bg]overlay=0:0:shortest=1[withbg];"
        f"[withbg][scr]overlay={sx}:{sy}:shortest=1[withscr];"
        f"[2:v]format=rgba[ov];"
        f"[withscr][ov]overlay=0:0:shortest=1,format=yuv420p[vout]"
    )

    cmd = [
        FFMPEG,
        "-y",
        "-ss",
        "0",
        "-t",
        f"{clip_dur:.3f}",
        "-i",
        str(src),
        "-loop",
        "1",
        "-i",
        str(bg_path),
        "-loop",
        "1",
        "-i",
        str(overlay_path),
        "-filter_complex",
        filter_complex,
        "-map",
        "[vout]",
    ]
    if has_audio:
        cmd += ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    else:
        cmd += ["-an"]

    cmd += [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "30",
        "-movflags",
        "+faststart",
        str(out_path),
    ]

    print(f"Encoding {src.name} -> {out_path.name} ({CANVAS_W}x{CANVAS_H}, {clip_dur:.1f}s)...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-2000:] or r.stdout[-1000:])
    return out_path


def main() -> None:
    videos = sorted(SRC_DIR.glob("*.mp4"))
    if not videos:
        raise SystemExit(f"No mp4 files in {SRC_DIR}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Clear prior screenshot exports from this folder
    for old in OUT_DIR.glob("iphone_6.9_screenshot_*"):
        old.unlink()

    g = phone_geometry()
    tmp = Path(tempfile.mkdtemp(prefix="sff-preview-vid-"))
    try:
        bg_path = tmp / "bg.png"
        ov_path = tmp / "overlay.png"
        build_background().save(bg_path)
        build_phone_overlay(g).save(ov_path)

        for i, video in enumerate(videos, 1):
            out = compose_video(video, i, bg_path, ov_path, g)
            size_mb = out.stat().st_size / (1024 * 1024)
            print(f"  OK {out.name} ({size_mb:.1f} MB)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"Done — {len(videos)} preview videos in {OUT_DIR}")


if __name__ == "__main__":
    main()
