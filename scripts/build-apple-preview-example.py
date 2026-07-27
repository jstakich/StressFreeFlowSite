#!/usr/bin/env python3
"""Build App Store preview examples: banner above white device mockup, tight crop, smart frames."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMPORT_BASE = ROOT / "2.1.14 preview for Apple"
EXPORT_BASE = ROOT / "2.1.14 preview for Apple complete"
EXAMPLE_DIR = EXPORT_BASE / "example"
ASSETS = ROOT / "assets"

IPHONE_MOCKUP = ASSETS / "iphone-mockup-frame.png"
IPAD_MOCKUP = ASSETS / "ipad-mockup.png"

IPHONE_SCREEN = (14, 10, 335, 680)  # tight inset for iphone-mockup-frame.png
IPAD_SCREEN = (23, 48, 506, 719)  # tight inset for generated ipad-mockup.png

OUTPUT_SCALE = 1.15  # slight upscale from tight mockup base


def load_banner_module():
    path = ROOT / "scripts" / "generate-apple-preview-overlay.py"
    spec = importlib.util.spec_from_file_location("banner_mod", path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["banner_mod"] = mod
    spec.loader.exec_module(mod)
    return mod


def create_ipad_mockup() -> Image.Image:
    """White iPad frame matching the tight iPhone mockup style."""
    outer_w, outer_h = 530, 758
    left, top, right, bottom = IPAD_SCREEN

    img = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.rounded_rectangle((0, 0, outer_w - 1, outer_h - 1), radius=28, fill=(240, 240, 244, 255))
    draw.rounded_rectangle((6, 6, outer_w - 7, outer_h - 7), radius=24, fill=(210, 210, 214, 255))
    draw.rounded_rectangle((left - 2, top - 2, right + 2, bottom + 2), radius=14, fill=(30, 30, 32, 255))
    draw.rounded_rectangle((left, top, right, bottom), radius=12, fill=(0, 0, 0, 255))

    camera_y = top - 8
    draw.ellipse((outer_w // 2 - 4, camera_y, outer_w // 2 + 4, camera_y + 8), fill=(80, 80, 84, 255))

    img.save(IPAD_MOCKUP)
    return img


def ensure_ipad_mockup() -> tuple[Image.Image, tuple[int, int, int, int]]:
    if not IPAD_MOCKUP.exists():
        create_ipad_mockup()
    mockup = Image.open(IPAD_MOCKUP).convert("RGBA")
    return mockup, IPAD_SCREEN


def detect_device_crop(frame: np.ndarray, pad: int = 2) -> tuple[int, int, int, int]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mask = gray > 12
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel) > 0
    cols = mask.any(axis=0)
    rows = mask.any(axis=1)
    if not cols.any() or not rows.any():
        h, w = frame.shape[:2]
        return 0, 0, w - 1, h - 1
    l, r = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    t, b = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    return max(0, l - pad), max(0, t - pad), min(frame.shape[1] - 1, r + pad), min(frame.shape[0] - 1, b + pad)


def tight_screen_crop(frame: np.ndarray) -> np.ndarray:
    """Strip simulator chrome and bezels — keep only the device screen pixels."""
    l, t, r, b = detect_device_crop(frame)
    crop = frame[t : b + 1, l : r + 1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    top_y = 0
    for y in range(h - 1):
        if gray[y].mean() < 10 and gray[y + 1].mean() < 10:
            yy = y
            while yy < h and gray[yy].mean() < 12:
                yy += 1
            if yy - y >= 2:
                top_y = yy
                break

    def row_span(y: int) -> tuple[int, int, int] | None:
        active = gray[y] > 15
        if not active.any():
            return None
        xs = np.where(active)[0]
        width = int(xs[-1] - xs[0] + 1)
        if width < max(220, int(w * 0.55)):
            return None
        return int(xs[0]), int(xs[-1]), width

    if top_y == 0:
        for y in range(h):
            span = row_span(y)
            if span and span[0] >= 4:
                top_y = y
                break

    bottom_y = h - 1
    for y in range(h - 1, top_y, -1):
        if row_span(y):
            bottom_y = y
            break

    mid_y = (top_y + bottom_y) // 2
    span = row_span(mid_y)
    if not span:
        return crop
    left_x, right_x, _ = span
    return crop[top_y : bottom_y + 1, left_x : right_x + 1]


def classify_video(path: Path) -> str:
    name = path.stem.lower()
    stress_markers = ("stress", "raindrops", "heartbeat", "deepwave", "slowbreath", "slow breath")
    if any(m in name for m in stress_markers):
        return "stressbutton"
    return "interactive"


def score_text_frame(frame: np.ndarray) -> float:
    h, w = frame.shape[:2]
    crop = frame[int(h * 0.05) : int(h * 0.78), int(w * 0.05) : int(w * 0.95)]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    bright = (gray > 180).astype(np.uint8)
    edges = cv2.Canny(gray, 70, 150)
    return float(bright.sum() + edges.sum() * 2.5)


def score_pop_frame(frame: np.ndarray, prev: np.ndarray | None) -> float:
    if prev is None:
        return 0.0
    h, w = frame.shape[:2]
    cy, cx = h // 2, w // 2
    r = int(min(h, w) * 0.42)
    y1, y2, x1, x2 = cy - r, cy + r, cx - r, cx + r
    cur = frame[y1:y2, x1:x2].astype(np.float32)
    prv = prev[y1:y2, x1:x2].astype(np.float32)
    diff = np.abs(cur - prv).mean()
    hsv = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1].mean()
    val = hsv[:, :, 2].mean()
    flash = (val > 200).mean()
    hue = hsv[:, :, 0]
    particles = (
        (((hue > 130) | (hue < 20)) & (hsv[:, :, 1] > 80) & (hsv[:, :, 2] > 120))
    ).sum()
    return float(diff * 6 + sat * 1.2 + val * 0.8 + flash * 120 + particles * 0.04)


def pick_best_frame(path: Path) -> tuple[np.ndarray, int, int, str]:
    kind = classify_video(path)
    cap = cv2.VideoCapture(str(path))
    best_i, best_s = 0, -1.0
    prev = None
    i = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        score = score_text_frame(frame) if kind == "stressbutton" else score_pop_frame(frame, prev)
        if score > best_s:
            best_s, best_i = score, i
        prev = frame.copy()
        i += 1
    cap.release()

    cap = cv2.VideoCapture(str(path))
    cap.set(cv2.CAP_PROP_POS_FRAMES, best_i)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError(f"Could not read frame from {path}")
    return frame, best_i, i, kind


def composite_into_mockup(screen_bgr: np.ndarray, device: str, banner_mod) -> Image.Image:
    screen_rgb = cv2.cvtColor(screen_bgr, cv2.COLOR_BGR2RGB)
    screen_img = Image.fromarray(screen_rgb)

    if device == "iphone":
        mockup = Image.open(IPHONE_MOCKUP).convert("RGBA")
        l, t, r, b = IPHONE_SCREEN
    else:
        mockup, screen_rect = ensure_ipad_mockup()
        l, t, r, b = screen_rect

    sw, sh = r - l + 1, b - t + 1
    fitted = screen_img.resize((sw, sh), Image.Resampling.LANCZOS)
    out = mockup.copy()
    out.paste(fitted, (l, t))

    flat = Image.new("RGB", out.size, banner_mod.BG_DARK)
    flat.paste(out, mask=out.split()[3] if out.mode == "RGBA" else None)
    return flat


def scale_image(img: Image.Image, scale: float) -> Image.Image:
    w, h = img.size
    return img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def build_stacked_export(
    mockup_img: Image.Image,
    device: str,
    banner_mod,
) -> Image.Image:
    mockup = scale_image(mockup_img, OUTPUT_SCALE)
    mw, mh = mockup.size

    banner = banner_mod.build_banner(device)
    banner_h = int(banner_mod.BANNER_HEIGHT * mw / banner_mod.WIDTH)
    banner = banner.resize((mw, banner_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (mw, banner.height + mh), banner_mod.BG_DARK)
    canvas.paste(banner, (0, 0))
    canvas.paste(mockup, (0, banner.height))
    return canvas


def process_video_example(src: Path, device: str, out_path: Path, banner_mod, max_frames: int | None = None) -> None:
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frames: list[Image.Image] = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if max_frames and len(frames) >= max_frames:
            break
        cropped = tight_screen_crop(frame)
        mockup = composite_into_mockup(cropped, device, banner_mod)
        stacked = build_stacked_export(mockup, device, banner_mod)
        frames.append(stacked)
    cap.release()

    if not frames:
        raise RuntimeError(f"No frames read from {src}")

    w, h = frames[0].size
    out_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(
        str(out_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (w, h),
    )
    for img in frames:
        bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        writer.write(bgr)
    writer.release()


def save_screenshot_example(src: Path, device: str, out_path: Path, banner_mod) -> dict:
    frame, best_i, total, kind = pick_best_frame(src)
    cropped = tight_screen_crop(frame)
    mockup = composite_into_mockup(cropped, device, banner_mod)
    stacked = build_stacked_export(mockup, device, banner_mod)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    stacked.save(out_path, "JPEG", quality=92, optimize=True)
    return {
        "source": src.name,
        "kind": kind,
        "frame": best_i,
        "total_frames": total,
        "output": out_path.name,
    }


def main() -> None:
    banner_mod = load_banner_module()
    EXAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    ensure_ipad_mockup()

    iphone_video = IMPORT_BASE / "iphone/for video previews/BreathReset.mov"
    ipad_video = IMPORT_BASE / "ipad/for video previews/BreathReset.mov"
    iphone_shot = IMPORT_BASE / "iphone/for screenshots/HeartbeatStresbutton.mov"
    ipad_shot = IMPORT_BASE / "ipad/for screenshots/Beach.mov"

    video_meta = {}
    for device, src in [("iphone", iphone_video), ("ipad", ipad_video)]:
        out = EXAMPLE_DIR / f"{device}-video-example.mp4"
        process_video_example(src, device, out, banner_mod)
        video_meta[device] = {"source": src.name, "output": out.name}

    shot_meta = {}
    for device, src in [("iphone", iphone_shot), ("ipad", ipad_shot)]:
        out = EXAMPLE_DIR / f"{device}-screenshot-example.jpg"
        shot_meta[device] = save_screenshot_example(src, device, out, banner_mod)

    readme = EXAMPLE_DIR / "README.txt"
    readme.write_text(
        "Stress Free Flow — App Store preview examples\n"
        "Input folder: 2.1.14 preview for Apple\n\n"
        "VIDEO examples (from for video previews/):\n"
        f"  iPhone: {iphone_video.name} -> {video_meta['iphone']['output']}\n"
        f"  iPad:   {ipad_video.name} -> {video_meta['ipad']['output']}\n\n"
        "SCREENSHOT examples (from for screenshots/):\n"
        f"  iPhone: {shot_meta['iphone']['source']} ({shot_meta['iphone']['kind']}, "
        f"frame {shot_meta['iphone']['frame']}/{shot_meta['iphone']['total_frames']}) "
        f"-> {shot_meta['iphone']['output']}\n"
        f"  iPad:   {shot_meta['ipad']['source']} ({shot_meta['ipad']['kind']}, "
        f"frame {shot_meta['ipad']['frame']}/{shot_meta['ipad']['total_frames']}) "
        f"-> {shot_meta['ipad']['output']}\n\n"
        "Layout: advertising banner above white device mockup, no side letterboxing.\n"
        "Mockups: assets/iphone-mockup-frame.png, assets/ipad-mockup.png\n",
        encoding="utf-8",
    )

    print("Examples written to:", EXAMPLE_DIR)
    for p in sorted(EXAMPLE_DIR.iterdir()):
        if p.name != ".DS_Store":
            print(" ", p.name)


if __name__ == "__main__":
    main()
