#!/usr/bin/env python3
"""Generate the book's original CC0 audio. No recordings or sampled music.

Run from site/: python3 scripts/make-reading-audio.py
Requires ffmpeg with libmp3lame. This is an asset authoring tool, not a build step.
"""
from array import array
from pathlib import Path
import math
import random
import subprocess
import tempfile
import wave

RATE = 22050
LENGTH = 32
ROOT = Path(__file__).resolve().parent.parent / "public/assets/audio"


def render(name, samples):
    peak = max(abs(value) for value in samples)
    pcm = array("h", (round(value / peak * 0.22 * 32767) for value in samples))
    with tempfile.TemporaryDirectory(prefix="gha-audio-") as folder:
        source = Path(folder) / f"{name}.wav"
        with wave.open(str(source), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            output.writeframes(pcm.tobytes())
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-codec:a", "libmp3lame", "-b:a", "24k", "-map_metadata", "-1",
            str(ROOT / f"{name}.mp3"),
        ], check=True)
    print(f"{name}: {LENGTH} s, {len(pcm)} samples, {(ROOT / f'{name}.mp3').stat().st_size} bytes")


def music():
    # Four original sustained voicings. Each chord rises and falls over eight
    # seconds; neighbouring tones overlap. No melody from an existing song.
    chords = [(48, 55, 59, 62), (45, 52, 55, 59), (41, 48, 52, 57), (43, 50, 57, 59)]
    samples = [0.0] * (RATE * LENGTH)
    for chord, notes in enumerate(chords):
        start = chord * 8
        for sample in range(RATE * 10):
            time = sample / RATE
            envelope = math.sin(math.pi * time / 10) ** 2
            value = 0.0
            for note in notes:
                frequency = 440 * 2 ** ((note - 69) / 12)
                value += math.sin(2 * math.pi * frequency * time)
                value += 0.12 * math.sin(4 * math.pi * frequency * time)
            index = (start * RATE + sample) % len(samples)
            samples[index] += value * envelope / len(notes)
    return samples


def rain():
    # Deterministic filtered noise, with a slow change in intensity. The first
    # and last half second fade to zero so the repeated file has no sharp edge.
    rng = random.Random(20261004)
    samples = []
    low = 0.0
    for index in range(RATE * LENGTH):
        time = index / RATE
        low = 0.93 * low + 0.07 * rng.uniform(-1, 1)
        envelope = min(1, time / 0.5, (LENGTH - time) / 0.5)
        swell = 0.85 + 0.15 * math.sin(2 * math.pi * time / 16)
        samples.append(low * envelope * swell)
    return samples


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    render("soft-music", music())
    render("quiet-rain", rain())
