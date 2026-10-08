#!/usr/bin/env python3
"""Original, source-specific teaching artwork for Game Hacking Academy.

The geometric drawings and byte animation created by this file are dedicated
to the public domain under CC0 1.0. No outside images or sprites are used.
Pillow previews are layout aids; the SVGs are the publication sources.
Run: python3 scripts/make-foundation-art.py
"""
from pathlib import Path
import html
import math
import re
import struct
import json
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent if HERE.name == 'scripts' else HERE
DEST = REPO / 'site/public/assets/images/original'
PREVIEW = REPO / 'foundation-art-previews'
DEST.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)
WIDTH = 480
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial.ttf'
MONO_PATH = '/System/Library/Fonts/Supplemental/Courier New.ttf'


def font_for(size, mono=False):
    path = MONO_PATH if mono else FONT_PATH
    return ImageFont.truetype(path, size) if Path(path).is_file() else ImageFont.load_default(size=size)


class Drawing:
    def __init__(self, key, title, desc, height=260):
        self.key, self.height = key, height
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="{height}" viewBox="0 0 480 {height}" role="img" aria-labelledby="title desc">',
                    f'<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(desc)}</desc>',
                    '<metadata>Original Game Hacking Academy geometric teaching artwork. CC0 1.0 Universal. Reproduce with site/scripts/make-foundation-art.py.</metadata>',
                    '<style>svg{color:var(--ink,CanvasText);background:var(--paper,Canvas)}text{fill:currentColor;font-family:Arial,Helvetica,sans-serif}.mono{font-family:"Courier New",monospace}.shape{fill:var(--paper,Canvas);stroke:currentColor;stroke-width:.08rem}.line{fill:none;stroke:currentColor;stroke-width:.08rem}</style>']
        self.image = Image.new('RGB', (WIDTH, height), 'white')
        self.pil = ImageDraw.Draw(self.image)
        self.text(16, 22, title, 16, bold=True)

    def rect(self, x, y, width, height, dashed=False, thick=False, radius=0):
        dash = ' stroke-dasharray="4 3"' if dashed else ''
        stroke = ' style="stroke-width:.15rem"' if thick else ''
        self.svg.append(f'<rect class="shape" x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}"{dash}{stroke}/>')
        self.pil.rounded_rectangle((x, y, x+width, y+height), radius=radius, outline='black', width=2 if thick else 1)

    def line(self, x1, y1, x2, y2, dashed=False):
        dash = ' stroke-dasharray="4 3"' if dashed else ''
        self.svg.append(f'<path class="line" d="M{x1} {y1}L{x2} {y2}"{dash}/>')
        self.pil.line((x1, y1, x2, y2), fill='black', width=1)

    def arrow(self, x1, y1, x2, y2):
        self.line(x1, y1, x2, y2)
        angle = math.atan2(y2-y1, x2-x1)
        points = [(x2, y2)] + [(x2-7*math.cos(angle+s), y2-7*math.sin(angle+s)) for s in (-.45, .45)]
        self.svg.append('<polygon fill="currentColor" points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in points)+'"/>')
        self.pil.polygon(points, fill='black')

    def text(self, x, y, value, size=12, mono=False, bold=False, center=False):
        value = str(value)
        font = font_for(size, mono)
        measured = self.pil.textlength(value, font=font)
        assert measured <= WIDTH-24 or center, (self.key, 'long text', value, measured)
        left = x-measured/2 if center else x
        assert left >= 0 and left+measured <= WIDTH, (self.key, 'clipped text', value, left, measured)
        cls = ' class="mono"' if mono else ''
        anchor = ' text-anchor="middle"' if center else ''
        weight = ';font-weight:700' if bold else ''
        self.svg.append(f'<text x="{x}" y="{y}"{cls}{anchor} style="font-size:{size/16:.4f}rem{weight}">{html.escape(value)}</text>')
        self.pil.text((x, y), value, font=font, fill='black', anchor='ms' if center else 'ls')

    def save(self):
        self.svg.append('</svg>')
        (DEST/(self.key+'.svg')).write_text('<?xml version="1.0" encoding="UTF-8"?>\n<!-- SPDX-License-Identifier: CC0-1.0 -->\n'+'\n'.join(self.svg)+'\n')
        self.image.save(PREVIEW/(self.key+'.png'))


def module_runs():
    d = Drawing('module-offset-two-runs', 'One image, two loaded addresses',
        'The same instruction is 0x1350 bytes from the module start. Loading at 0x00400000 puts it at 0x00401350; loading at 0x00600000 puts it at 0x00601350. Diagram spacing is schematic.', 278)
    d.rect(16, 58, 108, 118)
    d.text(70, 79, 'EXE on disk', center=True, bold=True)
    d.line(28, 91, 110, 91)
    d.line(28, 105, 110, 105)
    d.line(28, 119, 110, 119)
    d.text(70, 143, 'instruction', center=True)
    d.text(70, 161, '+0x1350', mono=True, center=True)
    for y, label, base in [(54, 'Run 1', 0x00400000), (149, 'Run 2', 0x00600000)]:
        d.text(178, y, label, bold=True)
        d.rect(176, y+9, 282, 49)
        d.line(342, y+9, 342, y+58)
        d.text(187, y+30, f'base {base:08X}', 12, mono=True)
        d.text(351, y+30, 'code', 12)
        d.text(187, y+48, 'same module layout', 11)
        d.text(351, y+48, '1350', 12, mono=True)
        d.text(178, y+77, f'address = 0x{base+0x1350:08X}', 12, mono=True)
    d.arrow(124, 109, 168, 88)
    d.arrow(124, 130, 168, 181)
    d.text(16, 255, 'Keep the offset; rediscover the loaded base for this run.', 12)
    d.save()


def option_chain():
    d = Drawing('option-chain-values', 'A missing value skips the closures',
        'With slot 1 and budget 20, Some(8) maps to Some(16), checked subtraction gives Some(4), and ok_or gives Ok(4). Slot 4 is missing: None passes through map and and_then, then becomes Err(not affordable). These are conceptual variants, not memory layout.', 263)
    columns=[70,184,298,412]
    for x, label in zip(columns, ['get + copied', 'map: double', 'and_then: subtract', 'ok_or']): d.text(x, 52, label, 11, center=True)
    d.text(16, 78, 'slot 1, budget 20', 12, bold=True)
    for x,value in zip(columns,['Some(8)','Some(16)','Some(4)','Ok(4)']):
        d.rect(x-49, 90, 98, 38, radius=15)
        d.text(x, 114, value, 13, mono=True, center=True)
    for x in columns[:-1]:d.arrow(x+49, 109, x+58, 109)
    d.text(16, 163, 'slot 4: no item', 12, bold=True)
    for x in columns[:3]:
        d.rect(x-49, 175, 98, 38, dashed=True, radius=15)
        d.text(x, 199, 'None', 13, mono=True, center=True)
    d.rect(363, 175, 98, 38, radius=15, thick=True)
    d.text(412, 192, 'Err', 13, mono=True, center=True)
    d.text(412, 207, 'not affordable', 10, center=True)
    for x in columns[:-1]:d.arrow(x+49, 194, x+58, 194)
    d.text(16, 246, 'None carries no number; Err carries this chosen reason.', 12)
    d.save()


def borrowed_view():
    d = Drawing('borrowed-prefix-view', 'A borrowed view points into one buffer',
        'The caller owns buffer [10, 20, 30, 40]. prefix(&buffer, 2) returns a view of the first two bytes. No second byte array is created; the view cannot remain valid after its owner is gone.', 270)
    d.text(16, 52, 'buffer: [u8; 4] owned by the caller', 12)
    for i,value in enumerate([10,20,30,40]):
        x=46+i*97
        d.rect(x, 75, 97, 44, thick=i<2)
        d.text(x+48.5, 103, value, 17, mono=True, center=True)
        d.text(x+48.5, 136, f'index {i}', 11, center=True)
    d.line(46, 155, 240, 155);d.line(46, 145, 46, 155);d.line(240, 145, 240, 155)
    d.text(143, 178, 'view: &[u8], length 2', 12, mono=True, center=True)
    d.text(16, 207, 'prefix(&buffer, 2) returns Some(view)', 12, mono=True)
    d.text(16, 232, 'The bracket selects bytes that already belong to buffer.', 12)
    d.text(16, 251, 'The lifetime ties the view to that existing owner.', 12)
    d.save()


def guard_cleanup():
    d = Drawing('byte-guard-return-paths', 'Both ordinary returns restore the byte',
        'The local ByteGuard saves 75 and writes temporary value 90. Both an early Err(stopped early) and a normal Ok return leave scope, drop the guard and restore 75. This describes ordinary returns from the example, not abrupt process termination.', 292)
    d.rect(16, 51, 91, 49);d.text(61.5, 72, 'before', 12, center=True);d.text(61.5, 91, '75', 18, mono=True, center=True)
    d.arrow(110, 76, 156, 76)
    d.rect(161, 51, 137, 49, thick=True);d.text(229.5, 72, 'temporary byte', 12, center=True);d.text(229.5, 91, '90', 18, mono=True, center=True)
    d.rect(331, 51, 131, 49, dashed=True);d.text(396.5, 72, 'guard.saved', 12, mono=True, center=True);d.text(396.5, 91, '75', 18, mono=True, center=True)
    d.arrow(229, 104, 104, 144);d.arrow(229, 104, 356, 144)
    d.text(104, 162, 'Err("stopped early")', 12, mono=True, center=True)
    d.text(356, 162, 'Ok(())', 12, mono=True, center=True)
    d.arrow(104, 173, 183, 205);d.arrow(356, 173, 297, 205)
    d.rect(160, 208, 160, 49, thick=True);d.text(240, 228, 'scope ends → Drop', 12, center=True);d.text(240, 248, 'byte = saved = 75', 12, mono=True, center=True)
    d.text(16, 278, 'One owner holds the saved value and the cleanup duty.', 12)
    d.save()


def breakpoint_cycle():
    d = Drawing('breakpoint-byte-cycle', 'Keep the original byte while setting int3',
        'At illustrative address 0x007CCD91 the original subtraction bytes are 29 42 04. A debugger saves 29, writes CC at the first byte, and restores 29 before stepping the original subtraction. The other two bytes are unchanged.', 274)
    d.text(16, 50, 'Instruction starts at 0x007CCD91', 12, mono=True)
    phases=[('original',[0x29,0x42,0x04]),('breakpoint set',[0xCC,0x42,0x04]),('restored for step',[0x29,0x42,0x04])]
    for index,(name,values) in enumerate(phases):
        y=67+index*57;d.text(16, y+25, name, 12)
        for i,value in enumerate(values):
            x=149+58*i;d.rect(x,y,58,40,thick=i==0);d.text(x+29,y+26,f'{value:02X}',17,mono=True,center=True)
    d.rect(348, 73, 112, 60, dashed=True);d.text(404, 94, 'saved byte',12,center=True);d.text(404,119,'29',18,mono=True,center=True)
    d.text(16, 246, 'CC executes int3 and causes the breakpoint exception.', 12)
    d.text(16, 264, 'The debugger retains 29 so the original code can resume.', 12)
    d.save()
    # Static overview remains useful when animation is stopped or not enabled.
    d.image.save(DEST/'breakpoint-byte-cycle-still.png')
    frames=[]
    states=[('ORIGINAL', [0x29,0x42,0x04], 'Save 29 before replacing it.'),
            ('BREAKPOINT SET', [0xCC,0x42,0x04], 'CC executes int3: Windows reports the exception.'),
            ('RESTORED FOR STEP', [0x29,0x42,0x04], 'Restore 29 before stepping the subtraction.')]
    for step,(label,values,explanation) in enumerate(states):
        image=Image.new('RGB',(480,274),'white');draw=ImageDraw.Draw(image)
        font=font_for(13);title=font_for(16);mono=font_for(24,True)
        draw.text((16,17),label,font=title,fill='black')
        draw.text((16,47),'Illustrative instruction address: 0x007CCD91',font=font,fill='black')
        for i,value in enumerate(values):
            x=32+100*i;draw.rectangle((x,78,x+86,127),outline='black',width=3 if i==0 else 1);draw.text((x+43,102),f'{value:02X}',font=mono,fill='black',anchor='mm')
        draw.rectangle((348,78,464,127),outline='black');draw.text((406,90),'saved byte',font=font,fill='black',anchor='mt');draw.text((406,110),'29',font=font,fill='black',anchor='mt')
        draw.text((16,155),explanation,font=font,fill='black')
        draw.text((16,185),'Slow replay; only the first instruction byte changes.',font=font,fill='black')
        draw.text((16,237),f'Phase {step+1} of 3: set, trap, restore; then replay.',font=font,fill='black')
        frames.append(image)
    frames[0].save(DEST/'breakpoint-byte-cycle.gif',save_all=True,append_images=frames[1:],duration=[1700,2300,2300],loop=0,optimize=True)
    for i,frame in enumerate(frames):frame.save(PREVIEW/f'breakpoint-byte-cycle-phase-{i}.png')


def float_bits():
    value=struct.unpack('<I',struct.pack('<f',10.0))[0]
    bits=f'{value:032b}'
    assert bits=='01000001001000000000000000000000'
    d=Drawing('float-ten-bit-fields','The same 32 bits, grouped two ways',
        '10.0 as f32 is stored little endian as 00 00 20 41. Read most significant bit first it is sign 0, exponent 10000010 or 130, and fraction 010 followed by twenty zeros. The exponent is 130 minus 127, or 3. The significand is 1.25, giving 1.25 times 2 cubed, or 10.',310)
    d.text(16,52,'Memory: low byte first',12,bold=True)
    for i,value in enumerate([0x00,0x00,0x20,0x41]):
        x=16+i*112;d.rect(x,63,112,39);d.text(x+56,89,f'{value:02X}',17,mono=True,center=True);d.text(x+56,118,f'+{i}',11,mono=True,center=True)
    d.text(16,150,'Significant order: 41 20 00 00',12,mono=True)
    d.text(16,178,'sign: 1 bit',11);d.text(132,178,'exponent: 8 bits',11);d.text(277,178,'fraction: 23 bits',11)
    for x,width,value in [(16,33,'0'),(49,126,bits[1:9]),(175,289,bits[9:])]:
        d.rect(x,188,width,36);d.text(x+width/2,212,value,11,mono=True,center=True)
    d.text(16,250,'positive; exponent 130 - 127 = 3; fraction = 1/4',12)
    d.text(16,278,'(1 + 1/4) × 2³ = 1.25 × 8 = 10.0',17,bold=True)
    d.text(16,299,'The field boundaries do not match the byte boundaries.',11)
    d.save()


module_runs(); option_chain(); borrowed_view(); guard_cleanup(); breakpoint_cycle(); float_bits()
assert 0x00400000+0x1350==0x00401350 and 0x00600000+0x1350==0x00601350
assert 20-(8*2)==4 and 125^90==39
print('6 source-specific SVGs; 1 original still/GIF byte cycle. Exact-value and text-bound checks pass.')
