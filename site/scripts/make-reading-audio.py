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


def night_keys():
    # Sparse soft plucks on a pentatonic scale, one every 2 seconds, each with a
    # slow decay that wraps around the loop point. Fixed pattern, no melody from
    # an existing song.
    scale = [57, 60, 62, 64, 67, 69, 72]
    pattern = [0, 2, 4, 2, 5, 3, 1, 4, 2, 0, 3, 5, 4, 2, 6, 3]
    samples = [0.0] * (RATE * LENGTH)
    for step, degree in enumerate(pattern):
        frequency = 440 * 2 ** ((scale[degree] - 69) / 12)
        start = step * 2 * RATE
        for sample in range(int(RATE * 3.6)):
            time = sample / RATE
            envelope = math.exp(-time * 1.7) * min(1, time / 0.01)
            value = math.sin(2 * math.pi * frequency * time) + 0.25 * math.sin(4 * math.pi * frequency * time)
            samples[(start + sample) % len(samples)] += value * envelope
    return samples


def warm_hum():
    # Two slowly beating low drones with a soft overtone. Frequencies are whole
    # cycles per loop so the file repeats without a click.
    samples = []
    for index in range(RATE * LENGTH):
        time = index / RATE
        swell = 0.8 + 0.2 * math.sin(2 * math.pi * time / 16)
        value = math.sin(2 * math.pi * 55 * time) + math.sin(2 * math.pi * 55.5 * time)
        value += 0.4 * math.sin(2 * math.pi * 82.5 * time) + 0.15 * math.sin(2 * math.pi * 110 * time)
        samples.append(value * swell)
    return samples


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    render("soft-music", music())
    render("quiet-rain", rain())
    render("night-keys", night_keys())
    render("warm-hum", warm_hum())
