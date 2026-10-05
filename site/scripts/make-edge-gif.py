#!/usr/bin/env python3
"""Draw original held-input artwork. No outside image or audio is used.

Run from site/: python3 scripts/make-edge-gif.py
Requires Pillow. Geometry, colours, trace data, and timing are defined here.
The generated artwork is dedicated to the public domain under CC0 1.0.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

DEST = Path(__file__).resolve().parent.parent / 'public/assets/images/original'
DEST.mkdir(parents=True, exist_ok=True)
SIZE = (360, 182)
SAMPLES = [False, False, True, True, True, False]
LEVEL, EDGE = [], []
level_lamp = edge_lamp = previous = False
for pressed in SAMPLES:
    if pressed:
        level_lamp = not level_lamp
    if pressed and not previous:
        edge_lamp = not edge_lamp
    LEVEL.append(level_lamp)
    EDGE.append(edge_lamp)
    previous = pressed

BG, INK, MUTED = '#fbfcfd', '#25333f', '#cbd3da'
INPUT, PROCESS, OUTPUT = '#b4501f', '#865070', '#268a78'
CAUTION, OFF = '#a57516', '#e5eaf0'
FONT = ImageFont.load_default(size=11)
SMALL = ImageFont.load_default(size=10)
LEFT, STEP = 86, 34


def route_point(points, u):
    lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
    remaining = sum(lengths) * max(0, min(1, u))
    for i, length in enumerate(lengths):
        if remaining <= length:
            f = remaining / length if length else 0
            a, b = points[i], points[i + 1]
            return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
        remaining -= length
    return points[-1]


def wave(draw, values, high, low, colour, count):
    def points(n):
        out = [(LEFT, low)]
        before = False
        for i, value in enumerate(values[:n]):
            x = LEFT + i * STEP
            out.extend([(x, high if before else low), (x, high if value else low), (x + STEP, high if value else low)])
            before = value
        return out
    draw.line(points(len(values)), fill=MUTED, width=1)
    if count:
        draw.line(points(count), fill=colour, width=2)


def lamp(draw, x, y, on):
    draw.ellipse((x - 11, y - 11, x + 11, y + 11), fill='#dcefe9' if on else OFF, outline=OUTPUT if on else INK, width=1)
    draw.line((x - 5, y + 1, x - 2, y - 3, x + 2, y + 3, x + 5, y - 1), fill=OUTPUT if on else '#71808e', width=1)
    draw.rounded_rectangle((x - 7, y + 12, x + 7, y + 15), radius=1, fill=OFF, outline=INK)
    if on:
        for angle in [-150, -90, -30, 30]:
            a = math.radians(angle)
            draw.line((x + math.cos(a) * 15, y + math.sin(a) * 15, x + math.cos(a) * 19, y + math.sin(a) * 19), fill=OUTPUT, width=1)


def frame(index=5, phase=1, overview=False):
    image = Image.new('RGB', SIZE, BG)
    draw = ImageDraw.Draw(image)
    completed = 6 if overview else index + (phase >= .55)
    pressed = False if overview else SAMPLES[index]
    new_press = pressed and not (SAMPLES[index - 1] if index else False)
    title = 'SIX SAMPLES' if overview else 'NEW PRESS' if new_press else 'HELD' if pressed else 'RELEASED'
    draw.text((10, 9), title, font=SMALL, fill=INPUT)
    draw.text((86, 9), 'BUTTON LEVEL', font=FONT, fill=INK)
    draw.rounded_rectangle((14, 55, 54, 69), radius=3, fill=OFF, outline=INK)
    top = 44 + (8 if pressed else 0)
    draw.rounded_rectangle((14, top, 54, top + 15), radius=3, fill='#f4e6de', outline=INPUT)
    draw.text((25, top + 2), 'KEY', font=SMALL, fill=INK)
    draw.line((56, 62, 69, 62, 69, 166), fill=MUTED, width=1)
    draw.text((9, 87), 'LEVEL', font=FONT, fill=PROCESS)
    draw.text((9, 101), 'toggle', font=SMALL, fill=INK)
    draw.text((9, 133), 'PRESS', font=FONT, fill=OUTPUT)
    draw.text((9, 147), 'EDGE', font=FONT, fill=OUTPUT)
    wave(draw, SAMPLES, 39, 63, INPUT, completed)
    wave(draw, LEVEL, 99, 116, PROCESS, completed)
    wave(draw, EDGE, 140, 157, OUTPUT, completed)
    for i in range(completed):
        x = LEFT + (i + .5) * STEP
        if SAMPLES[i]:
            draw.polygon([(x - 3, 89), (x + 3, 89), (x, 95)], fill=CAUTION)
        if SAMPLES[i] and not (SAMPLES[i - 1] if i else False):
            draw.polygon([(x - 3, 130), (x + 3, 130), (x, 136)], fill=OUTPUT)
    routes = [[(69, 62), (69, 126), (333, 126), (333, 107)], [(69, 62), (69, 168), (333, 168), (333, 149)]]
    for points in routes:
        draw.line(points, fill=MUTED, width=1)
    if not overview:
        cursor = LEFT + (index + .5) * STEP
        for y in range(29, 164, 6):
            draw.line((cursor, y, cursor, y + 2), fill='#9fadb8')
        if .1 <= phase <= .55:
            for points, fires, colour in [(routes[0], pressed, CAUTION), (routes[1], new_press, OUTPUT)]:
                if fires:
                    x, y = route_point(points, (phase - .1) / .45)
                    draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=colour)
    current = completed - 1
    lamp(draw, 333, 107, LEVEL[current] if current >= 0 else False)
    lamp(draw, 333, 149, EDGE[current] if current >= 0 else False)
    level_count = sum(SAMPLES[:completed])
    edge_count = sum(v and not (SAMPLES[i - 1] if i else False) for i, v in enumerate(SAMPLES[:completed]))
    draw.text((306, 83), f'{level_count} toggle{"s" if level_count != 1 else ""}', font=SMALL, fill=PROCESS)
    draw.text((306, 126), f'{edge_count} toggle{"s" if edge_count != 1 else ""}', font=SMALL, fill=OUTPUT)
    return image


still = frame(overview=True)
still.save(DEST / 'input-edge-still.png', optimize=True)
frames = [frame(i, p / 7) for i in range(6) for p in range(8)]
frames.extend([frame(5, 1)] * 8)
# One shared palette keeps static regions identical, making GIF deltas small.
palette = still.quantize(colors=32, method=Image.Quantize.MEDIANCUT)
indexed = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in frames]
indexed[0].save(DEST / 'input-edge.gif', save_all=True, append_images=indexed[1:], duration=140, loop=0, optimize=True, disposal=1)

# Proof sheets are temporary review artifacts, never shipped on the site.
sheet = Image.new('RGB', (SIZE[0] * 2, SIZE[1] * 3), '#eef1f4')
for i in range(6):
    sheet.paste(frame(i, .9), ((i % 2) * SIZE[0], (i // 2) * SIZE[1]))
sheet.save('/tmp/gha-input-edge-frames.png')
print(f'still: {(DEST / "input-edge-still.png").stat().st_size} bytes')
print(f'gif: {(DEST / "input-edge.gif").stat().st_size} bytes; six samples, slowed for visibility')
