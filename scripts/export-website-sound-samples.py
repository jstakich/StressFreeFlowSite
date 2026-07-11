#!/usr/bin/env python3
"""Export 7-second MP3 previews for the website sound catalog."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_SOUNDS = Path("/Users/jeremystakich/Developer/SensoryFlow/New Sounds")
OUT = ROOT / "assets" / "sound-samples"
DURATION = 7
SR = 44100

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG = "ffmpeg"


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def export_mp3(dst: Path, af: str, extra_inputs: list[str] | None = None) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [FFMPEG, "-y"]
    for item in extra_inputs or []:
        cmd.extend(item.split(" ", 1) if " " in item else [item])
    cmd.extend(
        [
            "-f",
            "lavfi",
            "-i",
            af,
            "-t",
            str(DURATION),
            "-ar",
            str(SR),
            "-ac",
            "2",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "96k",
            str(dst),
        ]
    )
    run(cmd)


def export_trim(src: Path, dst: Path, start: float = 12.0) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            FFMPEG,
            "-y",
            "-ss",
            str(start),
            "-t",
            str(DURATION),
            "-i",
            str(src),
            "-ar",
            str(SR),
            "-ac",
            "2",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "96k",
            str(dst),
        ]
    )


def export_amix(dst: Path, filters: list[str]) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    inputs = []
    fcs = []
    for i, fc in enumerate(filters):
        inputs.extend(["-f", "lavfi", "-i", fc])
        fcs.append(f"[{i}:a]")
    fc_str = "".join(fcs) + f"amix=inputs={len(filters)}:duration=first:dropout_transition=0,volume={min(1.0, 1.6 / len(filters)):.2f}"
    run(
        [
            FFMPEG,
            "-y",
            *inputs,
            "-filter_complex",
            fc_str,
            "-t",
            str(DURATION),
            "-ar",
            str(SR),
            "-ac",
            "2",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "96k",
            str(dst),
        ]
    )


def pick_source(base: str) -> Path | None:
    for ext in (".m4a", ".mp3"):
        p = APP_SOUNDS / f"{base}{ext}"
        if p.exists():
            return p
    return None


def main() -> int:
    if not APP_SOUNDS.is_dir():
        print(f"Missing app sounds folder: {APP_SOUNDS}", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)

    recorded = {
        "heavy-rain": "Pro_Heavy_Rain",
        "loud-thunderstorm": "Pro_Thunder_Storm",
        "morning-rain-nature": "Pro_Morning_Rain_Nature",
        "relaxing-river": "Pro_Relaxing_River",
        "fire-crackling": "Pro_Fire_Crackling",
        "soothing-ocean-waves": "Pro_Soothing_Ocean_Waves",
        "ocean-shore": "Pro_Ocean_Shore",
        "crickets": "MyCricket",
        "birds-singing": "Pro_Birds_Singing",
        "winter-snowfall": "NewSnow",
    }

    for slug, base in recorded.items():
        src = pick_source(base)
        if not src:
            print(f"skip missing {base}", file=sys.stderr)
            continue
        export_trim(src, OUT / f"{slug}.mp3")

    # Free + synth beds (ffmpeg approximations; recorded Pro clips reused where they fit best).
    export_trim(pick_source("Pro_Soothing_Ocean_Waves"), OUT / "ocean.mp3")
    export_trim(pick_source("Pro_Heavy_Rain"), OUT / "rain.mp3")
    export_trim(pick_source("Pro_Relaxing_River"), OUT / "creek.mp3")

    export_mp3(OUT / "white-noise.mp3", f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION}")
    export_mp3(
        OUT / "green-noise.mp3",
        f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION},highpass=f=180,lowpass=f=2200",
    )
    export_mp3(
        OUT / "grey-noise.mp3",
        f"anoisesrc=color=pink:sample_rate={SR}:duration={DURATION},highpass=f=120,lowpass=f=4500",
    )
    export_mp3(
        OUT / "violet-noise.mp3",
        f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION},highpass=f=3200",
    )
    export_amix(
        OUT / "violet-brown-noise-mix.mp3",
        [
            f"anoisesrc=color=brown:sample_rate={SR}:duration={DURATION}",
            f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION},highpass=f=3200,volume=0.55",
        ],
    )

    export_mp3(OUT / "brown-noise.mp3", f"anoisesrc=color=brown:sample_rate={SR}:duration={DURATION}")
    export_mp3(OUT / "pink-noise.mp3", f"anoisesrc=color=pink:sample_rate={SR}:duration={DURATION}")
    export_mp3(
        OUT / "fan.mp3",
        f"anoisesrc=color=pink:sample_rate={SR}:duration={DURATION},lowpass=f=900,volume=0.85",
    )
    export_trim(pick_source("Pro_Thunder_Storm"), OUT / "thunder-showers.mp3", start=18.0)
    export_mp3(
        OUT / "deep-low-hum.mp3",
        f"sine=frequency=58:sample_rate={SR}:duration={DURATION},volume=0.35",
    )
    export_mp3(
        OUT / "drone.mp3",
        f"sine=frequency=94:sample_rate={SR}:duration={DURATION},volume=0.22",
    )
    export_mp3(
        OUT / "blue-noise.mp3",
        f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION},highpass=f=1800,lowpass=f=9000",
    )

    export_amix(
        OUT / "rain-white-brown-pink-mix.mp3",
        [
            f"anoisesrc=color=pink:sample_rate={SR}:duration={DURATION},volume=0.12",
            f"anoisesrc=color=brown:sample_rate={SR}:duration={DURATION},volume=0.45",
            f"anoisesrc=color=white:sample_rate={SR}:duration={DURATION},volume=0.08",
        ],
    )
    export_amix(
        OUT / "pink-brown-noise-mix.mp3",
        [
            f"anoisesrc=color=pink:sample_rate={SR}:duration={DURATION},volume=0.45",
            f"anoisesrc=color=brown:sample_rate={SR}:duration={DURATION},volume=0.55",
        ],
    )

    count = len(list(OUT.glob("*.mp3")))
    print(f"Exported {count} samples to {OUT}")
    return 0 if count >= 27 else 2


if __name__ == "__main__":
    raise SystemExit(main())
