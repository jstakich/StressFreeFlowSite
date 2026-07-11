"""Render procedural ambient beds from AudioManager+Sources.swift for website previews."""

from __future__ import annotations

import math
import struct
import subprocess
import tempfile
from pathlib import Path

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG = "ffmpeg"

SR = 44100
DURATION = 7.0


class StartupRamp:
    def __init__(self, sample_rate: float, duration_seconds: float = 0.9) -> None:
        self.total = max(1, int(sample_rate * duration_seconds))
        self.remaining = self.total

    def next_gain(self) -> float:
        if self.remaining <= 0:
            return 1.0
        progress = 1.0 - (self.remaining / self.total)
        self.remaining -= 1
        return max(0.0, min(1.0, progress))


def render_deep_low_hum(sample_rate: float = SR, duration: float = DURATION) -> tuple[list[float], list[float]]:
    """Port of makeDeepLowHumNode in AudioManager+Sources.swift."""
    count = int(sample_rate * duration)
    left: list[float] = []
    right: list[float] = []
    two_pi = 2.0 * math.pi

    rotor_phase = 0.0
    rotor_carrier = 0.0
    tail_phase = 0.0
    cabin_rumble = 0.0
    thump = 0.0
    ramp = StartupRamp(sample_rate)

    for _ in range(count):
        rotor_phase += (two_pi * 4.8) / sample_rate
        rotor_carrier += (two_pi * 31.0) / sample_rate
        tail_phase += (two_pi * 8.6) / sample_rate
        cabin_rumble += (two_pi * 17.0) / sample_rate
        if rotor_phase > two_pi:
            rotor_phase -= two_pi
        if rotor_carrier > two_pi:
            rotor_carrier -= two_pi
        if tail_phase > two_pi:
            tail_phase -= two_pi
        if cabin_rumble > two_pi:
            cabin_rumble -= two_pi

        blade = max(0.0, math.sin(rotor_phase))
        blade_env = blade**3.4
        thump += 0.09 * (blade_env - thump)
        rotor = math.sin(rotor_carrier) * (0.22 + thump * 1.05)
        tail = math.sin(tail_phase) * 0.26
        cabin = math.sin(cabin_rumble) * 0.16
        gain = ramp.next_gain()

        left_raw = rotor + tail + cabin
        right_raw = rotor + (tail * 0.85) + (cabin * 1.05)
        left.append(max(-1.0, min(1.0, math.tanh(left_raw * 7.80) * 1.75)) * gain)
        right.append(max(-1.0, min(1.0, math.tanh(right_raw * 7.80) * 1.75)) * gain)

    return left, right


def render_drone(sample_rate: float = SR, duration: float = DURATION) -> tuple[list[float], list[float]]:
    """Port of makeDroneNode in AudioManager+Sources.swift."""
    count = int(sample_rate * duration)
    left: list[float] = []
    right: list[float] = []
    two_pi = 2.0 * math.pi

    phase1 = 0.0
    phase2 = 0.0
    phase3 = 0.0
    drift = 0.0
    ramp = StartupRamp(sample_rate)

    for _ in range(count):
        drift += (two_pi * 0.05) / sample_rate
        if drift > two_pi:
            drift -= two_pi

        phase1 += (two_pi * (94.0 + 1.6 * math.sin(drift))) / sample_rate
        phase2 += (two_pi * (141.0 + 1.1 * math.cos(drift * 0.9))) / sample_rate
        phase3 += (two_pi * 188.0) / sample_rate
        if phase1 > two_pi:
            phase1 -= two_pi
        if phase2 > two_pi:
            phase2 -= two_pi
        if phase3 > two_pi:
            phase3 -= two_pi

        left_base = math.sin(phase1) * 0.64
        left_overtone = math.sin(phase2) * 0.34
        left_air = math.sin(phase3) * 0.16
        right_base = math.sin(phase1 + 0.18) * 0.64
        right_overtone = math.sin(phase2 + 0.11) * 0.34
        right_air = math.sin(phase3 + 0.07) * 0.16
        gain = ramp.next_gain()

        left.append(
            max(-1.0, min(1.0, math.tanh((left_base + left_overtone + left_air) * 7.10) * 1.85)) * gain
        )
        right.append(
            max(-1.0, min(1.0, math.tanh((right_base + right_overtone + right_air) * 7.10) * 1.85)) * gain
        )

    return left, right


def write_wav(path: Path, left: list[float], right: list[float], sample_rate: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = len(left)
    with path.open("wb") as fh:
        fh.write(b"RIFF")
        fh.write(struct.pack("<I", 36 + frames * 4))
        fh.write(b"WAVEfmt ")
        fh.write(struct.pack("<IHHIIHH", 16, 1, 2, sample_rate, sample_rate * 4, 4, 16))
        fh.write(b"data")
        fh.write(struct.pack("<I", frames * 4))
        for i in range(frames):
            lh = int(max(-1.0, min(1.0, left[i])) * 32767)
            rh = int(max(-1.0, min(1.0, right[i])) * 32767)
            fh.write(struct.pack("<hh", lh, rh))


def export_mp3_from_stereo(dst: Path, left: list[float], right: list[float]) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = Path(tmp.name)
    try:
        write_wav(wav_path, left, right)
        subprocess.run(
            [
                FFMPEG,
                "-y",
                "-i",
                str(wav_path),
                "-af",
                "loudnorm=I=-18:TP=-1.5:LRA=11",
                "-ar",
                str(SR),
                "-ac",
                "2",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "96k",
                str(dst),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
    finally:
        wav_path.unlink(missing_ok=True)


def export_deep_low_hum(dst: Path) -> None:
    export_mp3_from_stereo(dst, *render_deep_low_hum())


def export_drone(dst: Path) -> None:
    export_mp3_from_stereo(dst, *render_drone())
