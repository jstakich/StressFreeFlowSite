#!/usr/bin/env python3
"""Batch App Store previews: white device mockups, smart screenshots, video + audio."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMPORT_BASE = ROOT / "2.1.14 preview for Apple"
EXPORT_BASE = ROOT / "2.1.14 preview for Apple complete"
ASSETS = ROOT / "assets"

IPHONE_MOCKUP = ASSETS / "iphone-mockup-frame.png"
IPAD_MOCKUP = ASSETS / "ipad-mockup.png"
IPHONE_SCREEN = (14, 10, 335, 680)
IPAD_SCREEN = (23, 48, 506, 719)
OUTPUT_SCALE = 1.15
EXPORT_BG = (255, 255, 255)

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def create_ipad_mockup() -> Image.Image:
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
    return Image.open(IPAD_MOCKUP).convert("RGBA"), IPAD_SCREEN


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


def classify_screenshot(path: Path) -> str:
    name = path.stem.lower().replace(" ", "")
    stressbutton_markers = (
        "stressbutton",
        "stressrelief",
        "raindrops",
        "heartbeat",
        "deepwave",
        "slowbreath",
    )
    if any(m in name for m in stressbutton_markers):
        return "stressbutton"
    return "stressball"


def score_text_frame(frame: np.ndarray) -> float:
    h, w = frame.shape[:2]
    crop = frame[int(h * 0.05) : int(h * 0.82), int(w * 0.05) : int(w * 0.95)]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    bright = (gray > 180).astype(np.uint8)
    edges = cv2.Canny(gray, 70, 150)
    return float(bright.sum() + edges.sum() * 2.5)


def score_debris_frame(frame: np.ndarray, prev: np.ndarray | None) -> float:
    if prev is None:
        return 0.0
    diff = cv2.absdiff(frame, prev)
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, debris_mask = cv2.threshold(gray_diff, 22, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3, 3), np.uint8)
    debris_mask = cv2.morphologyEx(debris_mask, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(debris_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    debris_area = sum(cv2.contourArea(c) for c in contours if 4 < cv2.contourArea(c) < 1200)

    hsv = cv2.cvtColor(diff, cv2.COLOR_BGR2HSV)
    spark = (
        (hsv[:, :, 2] > 150)
        & (hsv[:, :, 1] > 60)
        & (gray_diff > 20)
    ).sum()

    h, w = frame.shape[:2]
    cy, cx = h // 2, w // 2
    r = int(min(h, w) * 0.45)
    roi = frame[cy - r : cy + r, cx - r : cx + r]
    roi_prev = prev[cy - r : cy + r, cx - r : cx + r]
    roi_diff = cv2.absdiff(roi, roi_prev).mean()
    return float(debris_area * 3 + spark * 4 + roi_diff * 80)


def pick_best_frame(path: Path, kind: str) -> tuple[np.ndarray, int]:
    cap = cv2.VideoCapture(str(path))
    best_i, best_s = 0, -1.0
    prev = None
    i = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if kind == "stressbutton":
            score = score_text_frame(frame)
        else:
            score = score_debris_frame(frame, prev)
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
    return frame, best_i


def composite_into_mockup(screen_bgr: np.ndarray, device: str) -> Image.Image:
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

    flat = Image.new("RGB", out.size, EXPORT_BG)
    if out.mode == "RGBA":
        flat.paste(out, mask=out.split()[3])
    else:
        flat.paste(out)
    w, h = flat.size
    return flat.resize((int(w * OUTPUT_SCALE), int(h * OUTPUT_SCALE)), Image.Resampling.LANCZOS)


def frame_to_bgr(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)


def mux_audio(video_path: Path, audio_source: Path, out_path: Path) -> None:
    probe = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(audio_source)],
        capture_output=True,
        text=True,
    )
    has_audio = "Audio:" in probe.stderr

    if has_audio:
        cmd = [
            FFMPEG,
            "-y",
            "-i",
            str(video_path),
            "-i",
            str(audio_source),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out_path),
        ]
    else:
        cmd = [
            FFMPEG,
            "-y",
            "-i",
            str(video_path),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(out_path),
        ]

    subprocess.run(cmd, check=True, capture_output=True)


def process_video(src: Path, device: str, out_path: Path) -> None:
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    if fps <= 0:
        fps = 30

    first_frame = True
    writer = None
    tmp_dir = Path(tempfile.mkdtemp(prefix="sff-preview-"))
    silent_path = tmp_dir / "silent.mp4"

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            mockup = composite_into_mockup(tight_screen_crop(frame), device)
            bgr = frame_to_bgr(mockup)
            if first_frame:
                h, w = bgr.shape[:2]
                writer = cv2.VideoWriter(
                    str(silent_path),
                    cv2.VideoWriter_fourcc(*"mp4v"),
                    fps,
                    (w, h),
                )
                first_frame = False
            writer.write(bgr)
        cap.release()
        if writer:
            writer.release()

        if first_frame:
            raise RuntimeError(f"No frames in {src}")

        out_path.parent.mkdir(parents=True, exist_ok=True)
        mux_audio(silent_path, src, out_path)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def process_screenshot(src: Path, device: str, out_path: Path) -> None:
    kind = classify_screenshot(src)
    frame, best_i = pick_best_frame(src, kind)
    mockup = composite_into_mockup(tight_screen_crop(frame), device)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    mockup.save(out_path, "JPEG", quality=92, optimize=True)
    print(f"  screenshot {src.name} -> {out_path.name} ({kind}, frame {best_i})")


def mirror_path(src: Path, device: str, category: str, ext: str) -> Path:
    rel = src.relative_to(IMPORT_BASE / device / category)
    return EXPORT_BASE / device / category / rel.with_suffix(ext)


def main() -> None:
    ensure_ipad_mockup()

    for device in ("iphone", "ipad"):
        video_dir = IMPORT_BASE / device / "for video previews"
        shot_dir = IMPORT_BASE / device / "for screenshots"

        for src in sorted(video_dir.glob("*.mov")):
            out = mirror_path(src, device, "for video previews", ".mp4")
            print(f"video [{device}] {src.name} -> {out.relative_to(EXPORT_BASE)}")
            process_video(src, device, out)

        for src in sorted(shot_dir.glob("*.mov")):
            out = mirror_path(src, device, "for screenshots", ".jpg")
            process_screenshot(src, device, out)

    print("\nDone:", EXPORT_BASE)


if __name__ == "__main__":
    main()
