"""Regenerate only the finish-early SVGs and optional six-phase ETW GIF.

Run with: rtk proxy python3 site/scripts/make-finish-early-art.py
Requires RTK, librsvg's rsvg-convert and ImageMagick's magick on PATH.
Lesson text and shared files are never edited. QA frames and the provenance
manifest stay in the durable recovery folder; each SVG keeps the original tokens/rem units.
"""
# SPDX-License-Identifier: CC0-1.0

from pathlib import Path
from html import escape
import json
import math
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'site/public/assets/images/original'
QA = Path('/Users/notlaggy/Documents/GitFolder/gamehackingacademy.github.io/.claude/gha-early-recovery/qa')
QA.mkdir(parents=True, exist_ok=True)

class Drawing:
    def __init__(self, title, desc, height):
        self.title, self.desc, self.height, self.parts = title, desc, height, []
    def text(self, x, y, text, size='.875rem', anchor='start', bold=False, mono=False):
        css = f'font-size:{size}' + (';font-weight:700' if bold else '')
        self.parts.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" class="{"mono" if mono else "label"}" style="{css}">{escape(str(text))}</text>')
    def rect(self, x, y, w, h, strong=False, dash=False, hatch=False):
        attrs = (' style="stroke-width:.15rem"' if strong else '') + (' stroke-dasharray="4 3"' if dash else '')
        klass = 'hatch' if hatch else 'shape'
        self.parts.append(f'<rect class="{klass}" x="{x}" y="{y}" width="{w}" height="{h}"{attrs}/>')
    def line(self, x1, y1, x2, y2, dash=False, strong=False):
        attrs = (' stroke-dasharray="4 3"' if dash else '') + (' style="stroke-width:.15rem"' if strong else '')
        self.parts.append(f'<path class="line" d="M{x1} {y1}L{x2} {y2}"{attrs}/>')
    def arrow(self, x1, y1, x2, y2, dash=False):
        self.line(x1, y1, x2, y2, dash)
        angle = math.atan2(y2-y1, x2-x1)
        a = (x2 - 7*math.cos(angle) + 3*math.sin(angle), y2 - 7*math.sin(angle) - 3*math.cos(angle))
        b = (x2 - 7*math.cos(angle) - 3*math.sin(angle), y2 - 7*math.sin(angle) + 3*math.cos(angle))
        self.parts.append(f'<polygon fill="currentColor" points="{x2},{y2} {a[0]:.2f},{a[1]:.2f} {b[0]:.2f},{b[1]:.2f}"/>')
    def circle(self, x, y, r, solid=False):
        self.parts.append(f'<circle class="{"point" if solid else "shape"}" cx="{x}" cy="{y}" r="{r}"/>')
    def cross(self, x, y, size=6):
        self.line(x-size, y-size, x+size, y+size, strong=True)
        self.line(x-size, y+size, x+size, y-size, strong=True)
    def title_line(self):
        self.text(16, 25, self.title, '1rem', bold=True)
    def svg(self):
        return '\n'.join([
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<!-- SPDX-License-Identifier: CC0-1.0 -->',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="{self.height}" viewBox="0 0 480 {self.height}" role="img" aria-labelledby="title desc">',
            f'<title id="title">{escape(self.title)}</title><desc id="desc">{escape(self.desc)}</desc>',
            '<metadata>Original Game Hacking Academy geometric teaching artwork. Dedicated to the public domain under CC0 1.0 Universal. No third-party imagery or fonts embedded. Reproduce with site/scripts/make-finish-early-art.py.</metadata>',
            '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="currentColor" stroke-width=".04rem"/></pattern></defs>',
            '<style>svg{color:var(--ink,CanvasText);background:var(--paper,Canvas)}text{fill:currentColor;font-family:Arial,Helvetica,sans-serif}.mono{font-family:"Courier New",monospace}.shape{fill:var(--paper,Canvas);stroke:currentColor;stroke-width:.08rem}.hatch{fill:url(#hatch);stroke:currentColor;stroke-width:.08rem}.line{fill:none;stroke:currentColor;stroke-width:.08rem}.point{fill:currentColor}</style>',
            *self.parts, '</svg>', ''
        ])

records = []
def add(lesson, slug, drawing, anchor, section, reason, values, caption, alt, motion=False):
    filename = 'finish-early-' + slug + '.svg'
    path = OUT / filename
    path.write_text(drawing.svg())
    ET.parse(path)
    file = ROOT / 'site/src/content/docs/pages' / (lesson+'.mdx')
    source = file.read_text()
    record = {
        'lesson': lesson, 'file': str(file), 'title': re.search(r'^title: (.+)$', source, re.M).group(1),
        'chapter': re.search(r'^chapter: (.+)$', source, re.M).group(1),
        'section': section, 'placement_anchor': anchor.strip(), 'placement_reason': reason,
        'asset': str(path), 'asset_relative': 'assets/images/original/'+filename,
        'width': 480, 'height': drawing.height, 'exact_values': values,
        'caption': caption, 'alt': alt,
        'provenance': {'creator': 'Original Game Hacking Academy artwork authored in this revision', 'license': 'CC0-1.0', 'source': 'Authored SVG geometry; no external imagery', 'generator': 'site/scripts/make-finish-early-art.py'},
        'verification': {'svg_xml': 'passed', 'one_exact_anchor': 'passed' if source.count(anchor) == 1 else 'updated lesson needs placement review', 'local_asset_reference': 'passed' if filename in source else 'not placed in lesson', 'visual_review': 'pending', 'full_site_build_browser': 'delegated to root'}
    }
    if motion:
        record['motion_asset'] = str(OUT/'finish-early-etw-buffer.gif')
        record['motion_verification'] = {'default': 'existing MotionPicture still-first behavior', 'reduced_motion': 'existing MotionPicture behavior; root browser verification pending', 'gif': 'pending'}
    records.append(record)

# 10.7: one fixed interpreter acts on an encoded program and a work tape.
d = Drawing('A program becomes another program’s input', 'The increment rules are encoded as input data to one fixed interpreter. It reads and applies the rules to a work tape, changing the same worked input 1011 to 1100 after three transitions. The head starts on the rightmost 1 in state carry.', 302)
d.title_line()
d.rect(16, 60, 154, 66)
d.text(93, 84, 'increment rules', anchor='middle', bold=True)
d.text(93, 108, 'encoded as symbols', '.8125rem', 'middle')
d.arrow(174, 93, 202, 93)
d.rect(210, 60, 254, 66, strong=True)
d.text(337, 84, 'one fixed interpreter', anchor='middle', bold=True)
d.text(337, 108, 'read rule → write → move', '.8125rem', 'middle')
d.arrow(337, 130, 337, 163)
d.text(30, 162, 'work tape', '.875rem', bold=True)
for i, value in enumerate(['_', '1', '0', '1', '1', '_']):
    x = 42+i*62
    d.rect(x, 177, 62, 51, strong=i==4)
    d.text(x+31, 210, value, '1.25rem', 'middle', mono=True)
d.arrow(321, 168, 321, 177)
d.text(240, 253, 'head starts in carry on the rightmost 1', '.875rem', 'middle')
d.text(240, 282, 'three steps: 1011 → 1100; state done', '.875rem', 'middle', True, True)
add('1/12', 'program-as-input', d, 'it does, you change what is on the tape, not the machine.\n', 'The universal machine: programs are data', 'Shows the encoded program entering a fixed interpreter and acting on a separate work tape; complements the earlier tape-step MemoryStrips.', ['Input 1011 (eleven)', 'Head starts at rightmost digit; carry state', 'Three authored transitions yield 1100 (twelve), done'], 'The same increment rules are now input to a fixed interpreter. They drive the work-tape head through the three steps already shown: 1011 becomes 1100. This schematic separates the encoded program from the tape it changes.', 'Encoded increment rules enter one fixed interpreter, which reads and applies them to a work tape starting at 1011. The head begins on the rightmost one in carry; three steps produce 1100 and done.')

# 2.11: a geometric address calculation branches to distinct instruction effects.
d = Drawing('One location; two instruction effects', 'Starting at 0x1000, index 2 times scale 4 advances eight bytes, and displacement 8 advances eight more, reaching 0x1010. LEA keeps that address; MOV with the memory source reads the bytes at that location. No stored byte value is assumed.', 300)
d.title_line()
d.text(48, 63, '0x1000', mono=True)
d.text(234, 63, '+8', anchor='middle', mono=True)
d.text(420, 63, '0x1010', anchor='end', mono=True)
d.arrow(48, 83, 232, 83)
d.arrow(236, 83, 420, 83)
d.text(140, 110, '2 × 4 bytes', anchor='middle')
d.text(328, 110, '+8 bytes', anchor='middle')
d.rect(166, 135, 148, 46, strong=True)
d.text(240, 164, '0x1010', '1rem', 'middle', True, True)
d.line(420, 87, 420, 123, dash=True)
d.line(420, 123, 240, 123, dash=True)
d.arrow(240, 123, 240, 135, dash=True)
d.arrow(224, 185, 119, 219)
d.arrow(256, 185, 362, 219)
d.rect(16, 223, 206, 58)
d.text(119, 245, 'lea', '1rem', 'middle', True, True)
d.text(119, 269, 'keep the address', anchor='middle')
d.rect(256, 223, 208, 58)
d.text(360, 245, 'mov from memory', '1rem', 'middle', True, True)
d.text(360, 269, 'read the bytes there', anchor='middle')
add('2/10', 'address-versus-read', d, 'With base `0x1000`, index `2`, and a scale of `4`, the address is `0x1000 + 2×4 + 8 = 0x1010`. A `mov` with this memory source reads bytes there. A `lea` with the same expression only calculates the address.\n', 'Addressing: base + index × scale + displacement', 'Makes the two equal eight-byte advances visible and separates calculating a location from reading its content; it does not illustrate the instruction catalogue.', ['base 0x1000', 'index 2 × scale 4 = 8 bytes', 'displacement 8 bytes', 'effective address 0x1010', 'memory contents unspecified'], 'The address expression reaches 0x1010 through two eight-byte advances. lea returns that location; mov with a memory source reads its contents. The drawing does not assume any particular bytes are stored there.', 'Starting from 0x1000, index two times scale four adds eight bytes, and displacement eight adds another eight, reaching 0x1010. The path then splits: lea keeps the address, while mov reads the memory at that address.')

# 2.12: the return address is an actual stack item, not the result value.
d = Drawing('A call saves a route back', 'The caller reads gold, calls grant_coin, and will resume at the store. CALL saves that continuation on the ordinary 32-bit stack and lowers ESP by four. The helper adds one to EAX. RET pops the saved continuation, advances ESP by four, and resumes the store; RET does not calculate the result.', 326)
d.title_line()
d.rect(16, 60, 181, 132)
d.text(106, 85, 'caller', anchor='middle', bold=True)
d.text(32, 113, 'read gold')
d.text(32, 143, 'call grant_coin', '.8125rem', mono=True)
d.text(32, 177, 'resume: store gold', '.8125rem', bold=True)
d.rect(306, 60, 158, 132)
d.text(385, 85, 'grant_coin', anchor='middle', bold=True, mono=True)
d.text(385, 113, 'adds one in eax', '.8125rem', 'middle')
d.text(385, 163, 'ret', '1rem', 'middle', True, True)
d.arrow(201, 133, 298, 133)
d.text(250, 118, 'call', '.8125rem', 'middle')
d.arrow(299, 166, 205, 166)
d.text(250, 189, 'resume', '.8125rem', 'middle')
d.text(16, 230, '32-bit stack', bold=True)
d.rect(148, 222, 316, 39, strong=True)
d.text(306, 247, 'address of “store gold”', '.875rem', 'middle')
d.rect(148, 261, 316, 34, dash=True)
d.text(306, 283, 'older stack data', '.8125rem', 'middle')
d.arrow(109, 177, 158, 216, dash=True)
d.text(16, 254, 'call: esp −4', '.75rem', mono=True)
d.text(16, 278, 'ret: esp +4', '.75rem', mono=True)
d.text(16, 316, 'The saved address selects the next instruction.', '.875rem')
add('2/11', 'call-return-route', d, 'ret                     ; eax was changed by add, not ret\n```\n', 'Calls, returns, and saved values / ret', 'Shows the caller continuation saved as stack data and the return route distinct from the helper’s EAX result, directly after both call and ret are explained.', ['ordinary near 32-bit call/ret', 'call lowers esp by four bytes', 'return address is immediately after call: store gold', 'helper adds one in eax', 'ret advances esp by four bytes'], 'In this exact grant_coin example, call saves the address of the gold store and lowers esp by four. The helper changes eax; ret removes the saved address, raises esp by four, and resumes the store. Stack spacing is schematic.', 'The caller reads gold and calls grant_coin. Call places the address of the following gold store on the stack and lowers esp by four. The helper adds one in eax; ret removes the saved address, raises esp by four, and resumes that store.')

# 2.13: the one-to-three bit-width ratio is drawn, along with the two MOVSS effects.
d = Drawing('One scalar lives in a wider register', 'Each drawn XMM register is 128 bits: the upper 96 bits take three quarters of its width, and the low binary32 float takes one quarter. Legacy MOVSS loading from memory clears the upper 96 bits, while a register-to-register copy preserves them.', 292)
d.title_line()
d.text(16, 56, 'XMM = 128 bits; only the low float is copied', '.875rem')
for y, label, upper in [(85, 'memory → XMM', 'upper 96 bits become zero'), (190, 'XMM → XMM', 'upper 96 bits stay unchanged')]:
    d.text(16, y, label, '.875rem', bold=True)
    d.rect(16, y+14, 336, 52)
    d.rect(352, y+14, 112, 52, strong=True)
    d.text(184, y+46, upper, '.875rem', 'middle')
    d.text(408, y+36, 'low 32', '.875rem', 'middle', True)
    d.text(408, y+55, 'one float', '.8125rem', 'middle')
d.text(16, 280, 'Same scalar width; different upper-bit effects.', '.875rem')
add('2/12', 'scalar-register-width', d, '**Legacy forms:** `movss xmm, xmm/m32`, `movss m32, xmm`. **Effects:** register-to-register copies replace the low 32 bits and preserve the destination\'s upper 96 bits. A memory load into XMM clears those upper 96 bits. A memory store writes only four bytes. Integer arithmetic flags are unchanged.\n', 'Copies and arithmetic / movss', 'Uses proportional register geometry to explain why a scalar copy can have different upper-register effects depending on its source.', ['XMM 128 bits', 'low binary32 32 bits', 'upper register 96 bits', 'legacy memory load clears upper 96', 'legacy register copy preserves upper 96'], 'The bars keep the real 96:32 width ratio. Both legacy movss forms copy one low float, but a memory load clears the upper 96 bits and a register copy preserves them. These are alternative operations, not consecutive steps.', 'Two 128-bit XMM register bars each reserve one quarter for the low 32-bit float. A memory load clears the other 96 bits; a copy from another XMM preserves those upper bits.')

# 3.3: a deliberately captioned four-byte example crosses the OS boundary.
d = Drawing('The copy crosses the process boundary', 'In a separate four-byte example, the game stores 64 00 00 00 at address 0x5000, which represents little-endian u32 100. Windows checks the target handle and copies those bytes into the tool-owned buffer. The tool decodes its own copy; its local pointer 0x5000 would use a different address map.', 300)
d.title_line()
for x, name in [(16, 'game process'), (314, 'tool process')]:
    d.rect(x, 62, 150, 178)
    d.text(x+75, 89, name, '.875rem', 'middle', True)
d.text(91, 114, '0x5000', '.875rem', 'middle', mono=True)
d.text(389, 114, 'owned buffer', '.875rem', 'middle')
for base in [23, 321]:
    for i, value in enumerate(['64', '00', '00', '00']):
        d.rect(base+i*34, 163, 34, 39)
        d.text(base+i*34+17, 189, value, '.875rem', 'middle', mono=True)
d.text(91, 222, 'game bytes', '.8125rem', 'middle')
d.text(389, 222, 'decode u32 = 100', '.8125rem', 'middle')
d.rect(183, 111, 114, 74, strong=True)
d.text(240, 138, 'Windows', '.875rem', 'middle', True)
d.text(240, 160, 'checks rights', '.8125rem', 'middle')
d.arrow(169, 179, 183, 179)
d.arrow(300, 179, 313, 179)
d.text(240, 209, 'copy 4 bytes', '.8125rem', 'middle')
d.text(16, 270, 'A local pointer uses the tool’s own address map.', '.875rem')
d.text(16, 289, 'The handle selects the game’s map for the copy.', '.875rem')
add('3/02', 'process-memory-copy', d, 'Lesson 11.6 later examines handles in more depth.\n', 'External means “a separate process”', 'Shows actual copied byte cells on both sides of the OS-mediated boundary, clarifying why the tool decodes its own buffer instead of dereferencing a target address.', ['Explicit separate four-byte example', 'target address 0x5000 (same address number already taught)', '64 00 00 00 encodes little-endian u32 100', 'requested and copied count four bytes', 'tool buffer has no invented address'], 'A separate four-byte example: the game has 64 00 00 00 at address 0x5000, encoding u32 100. Windows checks the target handle and copies those four bytes into the tool’s buffer. The tool then decodes its own copy; a local pointer numbered 0x5000 would use the tool’s address map.', 'In a separate read example, game address 0x5000 contains four bytes 64 00 00 00. Windows checks the target handle and copies them into a tool-owned buffer, where they decode as u32 100. A local pointer with the same number uses the tool’s own map.')

# 3.4: the field distance remains the same in separate object allocations.
d = Drawing('The offset travels with the layout', 'The first object begins at 0x12340000 and its yaw field at offset 0x40 has address 0x12340040. Another player begins elsewhere but uses the same yaw offset. Only the first base is numbered; spacing is schematic and no whole-object size is claimed.', 288)
d.title_line()
d.text(16, 56, 'one player: base 0x12340000', '.875rem', mono=True)
for y in [76, 193]:
    d.rect(32, y, 416, 45)
    d.rect(299, y, 112, 45, strong=True)
    d.text(355, y+29, 'yaw', '.875rem', 'middle', True)
    d.line(32, y+53, 299, y+53)
    d.line(32, y+47, 32, y+59)
    d.line(299, y+47, 299, y+59)
    d.text(166, y+73, 'same distance: +0x40', '.875rem', 'middle', mono=True)
d.text(354, 147, '0x12340040', '.875rem', 'middle', mono=True)
d.text(16, 177, 'another player: a different base', '.875rem')
d.text(16, 281, 'A new base changes the address, not the field distance.', '.8125rem')
add('3/03', 'object-field-distance', d, 'An **offset is a distance**, not an address by itself. Many player objects can use the same yaw offset while living at different base addresses.\n', 'Separate five object-layout terms', 'Draws the same base-to-field span in two object allocations; complements the later byte-landmark strips without turning them into an art catalogue.', ['first base 0x12340000', 'yaw offset +0x40', 'first yaw address 0x12340040', 'second base intentionally unspecified', 'schematic spacing; no total object size claimed'], 'The first player’s yaw is 0x40 bytes from 0x12340000, giving 0x12340040. Another player can start elsewhere and still use the same 0x40 field distance. The two allocations and their spacing are schematic, not a claim about the object’s total size.', 'Two separate player allocations show their yaw field the same 0x40-byte distance from each base. The first starts at 0x12340000, so its yaw is at 0x12340040. The second has an unspecified different base.')

# 6.1: pointer lifetime can extend beyond the execution interval of a call.
d = Drawing('A pointer can outlive the call', 'In this timing illustration the caller releases its buffer after return. A callee that reads only during the call completes before release. A callee that keeps the pointer for a later read needs the buffer to live longer; that later read would otherwise be past the lifetime of the data. Horizontal distances are not times.', 304)
d.title_line()
for x, label in [(44, 'call'), (230, 'return'), (375, 'release'), (446, 'later')]:
    d.text(x, 66, label, '.8125rem', 'middle', True)
    d.line(x, 74, x, 260, dash=True)
d.rect(44, 99, 331, 37, strong=True)
d.text(209, 124, 'caller’s buffer exists', '.875rem', 'middle')
d.rect(44, 162, 186, 37)
d.text(137, 187, 'read inside call', '.875rem', 'middle')
d.text(249, 186, 'borrow ends', '.8125rem')
d.arrow(44, 238, 446, 238)
d.cross(400, 238)
d.text(150, 225, 'saved pointer', '.875rem', 'middle')
d.text(446, 261, 'read?', '.8125rem', 'middle')
d.text(16, 292, 'Keeping the pointer requires a longer data lifetime.', '.875rem')
add('3/08', 'pointer-outlives-call', d, 'Each part of the contract follows from something the machine code does. A callee that reads four bytes through the pointer and never stores it needs only a short read-only borrow. A callee that saves the pointer in a global needs the data to outlive the call.\n', 'Reconstruct four parts of every boundary', 'Makes the difference between call duration and pointed-to data lifetime visible using a shared time direction, rather than repeating the contract list.', ['illustrative caller releases buffer after return', 'short read ends before return', 'saved pointer used after release would be invalid', 'no duration scale assumed'], 'In this timing illustration, the caller releases its buffer after return. A read confined to the call finishes in time. A saved pointer used later needs a longer buffer lifetime; correct argument registers alone cannot make that later read valid. Spacing does not represent measured time.', 'A buffer lives from call until release after return. Reading only inside the call fits within that lifetime. A saved pointer reaches a later read beyond release, showing why retaining a pointer requires the data to outlive the call.')

# 4.4: a changed field rejects the action before the requested replacement writes.
d = Drawing('A changed value closes the write gate', 'A separate snapshot example starts with observed gold 100. Income adds ten, so the fresh snapshot has gold 110. Because one field differs, the full snapshot equality check fails and the requested replacement 888 is not written. This gate reduces stale observations but is not an atomic transaction.', 310)
d.title_line()
for x, title, value in [(16, 'observe', 'gold 100'), (184, 'income +10', 'gold 110'), (350, 'fresh capture', 'gold 110')]:
    d.rect(x, 64, 114, 65)
    d.text(x+57, 88, title, '.8125rem', 'middle', True)
    d.text(x+57, 115, value, '.875rem', 'middle', mono=True)
d.arrow(135, 96, 177, 96)
d.arrow(303, 96, 342, 96)
d.rect(16, 184, 188, 62)
d.text(110, 210, 'requested replacement', '.8125rem', 'middle')
d.text(110, 234, '888', '1rem', 'middle', True, True)
d.rect(285, 177, 179, 72, strong=True)
d.text(374, 203, 'same snapshot?', '.875rem', 'middle', True)
d.text(374, 231, '100 ≠ 110', '1rem', 'middle', True, True)
d.arrow(208, 214, 279, 214)
d.arrow(407, 133, 407, 170)
d.arrow(374, 254, 374, 278)
d.text(374, 301, 'stop; write nothing', '.875rem', 'middle', True)
d.text(16, 276, 'One changed field', '.8125rem')
d.text(16, 296, 'breaks whole-snapshot equality.', '.8125rem')
add('4/02', 'stale-snapshot-gate', d, 'The important idea is not extra code. It is that **data crosses a gate before the tool acts on it**. A raw address read once may already be out of date. A `Snapshot` captured twice with equal results was consistent at that moment. A write happens only if a fresh capture, taken immediately before it, still equals the snapshot.\n', 'One long function hides where it can fail', 'Turns the introductory stale-income risk into a concrete rejected-action picture; the whole-snapshot comparison remains clear instead of implying address-only validation.', ['Explicit separate example: observed gold 100', 'income +10 changes gold to 110', 'requested replacement 888 from lesson command mode', 'one changed field fails full Snapshot equality', 'no atomicity promise'], 'A separate gold example: observe 100, then income adds 10 before the fresh capture. That snapshot now contains 110, so it differs and the requested 888 is not written. Gold is only one field in the whole-snapshot comparison; this check still cannot make the game’s later changes atomic.', 'A tool observes gold 100, then income adds ten and a fresh capture sees 110. The whole-snapshot equality gate fails because that field changed, so the requested replacement 888 is stopped before writing.')

# 4.9: parent traversal collects a backward list; reversing makes the route.
d = Drawing('Parents point back; a route runs forward', 'For the unchanged three-by-two worked grid with start (0,0), goal (2,0), and wall (1,0), follow parents backward as (2,0), (2,1), (1,1), (0,1), (0,0). The start has no parent. Reversing that list yields (0,0), (0,1), (1,1), (2,1), (2,0), a route of four moves through row one. This drawing does not track the optional scene wall controls.', 340)
d.title_line()
d.text(16, 59, 'follow saved parents from the goal', '.875rem', bold=True)
backward = ['(2,0)', '(2,1)', '(1,1)', '(0,1)', '(0,0)']
for y, labels in [(82, backward), (224, list(reversed(backward)))]:
    for i, value in enumerate(labels):
        x = 16 + i*93
        d.rect(x, y, 76, 52, strong=i in [0,4])
        d.text(x+38, y+34, value, '1rem', 'middle', mono=True)
        if i < 4:
            d.arrow(x+80, y+26, x+89, y+26)
d.text(54, 154, 'goal', '.8125rem', 'middle')
d.text(426, 154, 'no parent', '.8125rem', 'middle')
d.arrow(240, 142, 240, 203)
d.text(261, 181, 'reverse once', '.875rem', bold=True)
d.text(16, 207, 'forward route', '.875rem', bold=True)
d.text(54, 297, 'start', '.8125rem', 'middle')
d.text(426, 297, 'goal', '.8125rem', 'middle')
d.text(16, 330, 'Four legal moves; wall (1,0) never enters the list.', '.875rem')
add('4/06', 'bfs-parent-chain', d, 'never includes the wall. The intermediate route follows the open second row.\n', 'Tests that catch real mistakes', 'Shows backward parent-pointer traversal and reversal of the collected list using the exact taught path, complementing the live queue/wall scene rather than duplicating its controls.', ['fixed worked grid width 3, height 2', 'start (0,0)', 'wall (1,0)', 'goal (2,0)', 'backward parents: (2,0),(2,1),(1,1),(0,1),(0,0)', 'start parent None', 'forward route: (0,0),(0,1),(1,1),(2,1),(2,0)', 'four moves'], 'For this unchanged 3-by-2 worked grid, follow saved parents from goal (2,0) through (2,1), (1,1), (0,1), and start (0,0), which has no parent. Reverse that collected list to get the forward route. The route has four moves and never includes wall (1,0).', 'A top row follows parent pointers backward: goal (2,0), (2,1), (1,1), (0,1), start (0,0), which has no parent. Reversing the list produces the bottom forward route (0,0), (0,1), (1,1), (2,1), (2,0), four moves around wall (1,0).')

# 7.1: use equal scales within each view so the triangles teach actual geometry.
d = Drawing('Yaw and pitch measure different planes', 'A top-down triangle from camera origin to ground point (3,4) has legs 3 and 4, ground distance 5, and yaw about 53.13 degrees from positive x. The side view uses the same five-unit ground distance and a height of five, giving pitch 45 degrees for target (3,4,5). Scales match within each view.', 311)
d.title_line()
d.text(127, 53, 'top-down: yaw', '.875rem', 'middle', True)
d.text(373, 53, 'side view: pitch', '.875rem', 'middle', True)
d.arrow(48, 239, 227, 239)
d.arrow(48, 239, 48, 67)
d.line(48, 239, 168, 79, strong=True)
d.line(168, 79, 168, 239, dash=True)
d.circle(48, 239, 4, True)
d.circle(168, 79, 4, True)
d.text(168, 70, '(3, 4)', '.875rem', 'middle', mono=True)
d.text(229, 259, '+x', '.8125rem', 'end')
d.text(34, 70, '+y', '.8125rem', 'middle')
d.text(107, 261, '3', '.875rem', 'middle', mono=True)
d.text(180, 165, '4', '.875rem', mono=True)
d.text(89, 149, '5', '.875rem', mono=True)
d.parts.append('<path class="line" d="M97 239 A49 49 0 0 0 77.4 199.8"/>')
d.text(100, 224, '53.13°', '.8125rem')
d.line(287, 239, 429, 239)
d.line(429, 239, 429, 97, dash=True)
d.line(287, 239, 429, 97, strong=True)
d.circle(287, 239, 4, True)
d.circle(429, 97, 4, True)
d.text(408, 82, '(3, 4, 5)', '.875rem', 'middle', mono=True)
d.text(357, 261, 'ground 5', '.875rem', 'middle')
d.text(465, 173, 'up 5', '.875rem', 'end')
d.parts.append('<path class="line" d="M337 239 A50 50 0 0 0 322.36 203.64"/>')
d.text(340, 220, '45°', '.875rem')
d.text(16, 291, 'Camera at (0, 0, 0); the two views use different planes.', '.8125rem')
add('5/01', 'yaw-pitch-planes', d, 'climb.\n', 'Yaw and pitch', 'Adds a real spatial ground triangle and an elevation triangle at the worked atan2 example; correct equal scales within each view make the geometry meaningful.', ['camera (0,0,0)', 'ground point (3,4,0)', 'hypot(3,4)=5', 'yaw atan2(4,3)≈53.13 degrees', 'raised target (3,4,5)', 'pitch atan2(5,5)=45 degrees', 'top view scale 40 per unit; side view 28.4 per unit'], 'Left: the target’s ground displacement is 3 along x and 4 along y, giving distance 5 and yaw about 53.13°. Right: raising that target by 5 makes a 5-by-5 elevation triangle, so pitch is 45°. Distances use equal scales within each view; the side view compresses the ground direction into one axis.', 'A top-down three-by-four triangle has distance five and yaw about 53.13 degrees from positive x. A side view of the raised target has ground distance five and height five, giving pitch 45 degrees. The camera is at the origin.')

# 7.10: the object and table are different memory allocations and each read matters.
d = Drawing('Follow two pointers to Present', 'The swap-chain object at 0x000001F48A200000 supplies vtable pointer 0x00007FFA1C305000. In this 64-bit example, slot 8 is eight times eight bytes, offset 0x40, giving slot address 0x00007FFA1C305040. Reading that slot yields function address 0x00007FFA1C289A10. Slot spacing is schematic.', 337)
d.title_line()
d.rect(16, 61, 194, 104)
d.text(113, 84, 'swap-chain object', '.875rem', 'middle', True)
d.text(113, 109, '0x000001F48A200000', '.8125rem', 'middle', mono=True)
d.text(113, 145, 'first field: vtable pointer', '.75rem', 'middle')
d.rect(250, 61, 214, 130)
d.text(357, 84, 'vtable', '.875rem', 'middle', True)
d.text(357, 109, '0x00007FFA1C305000', '.8125rem', 'middle', mono=True)
d.line(265, 124, 449, 124, dash=True)
d.rect(264, 143, 186, 37, strong=True)
d.text(357, 168, 'slot 8: function pointer', '.8125rem', 'middle')
d.arrow(213, 130, 244, 130)
d.text(16, 205, 'slot address: 0x00007FFA1C305040', '.8125rem', mono=True)
d.text(16, 226, '8 slots × 8 bytes = 0x40', '.8125rem', mono=True)
d.arrow(421, 194, 421, 245)
d.rect(144, 251, 320, 59, strong=True)
d.text(304, 275, 'Present implementation', '.875rem', 'middle', True)
d.text(304, 299, '0x00007FFA1C289A10', '.875rem', 'middle', mono=True)
d.text(16, 329, 'The index is fixed; this implementation supplies the address.', '.8125rem')
add('5/10', 'com-two-reads', d, '32-bit one. Get that wrong and every index lands halfway between two entries.\n', 'A COM interface stores a table of methods', 'Shows the actual two pointer reads across separate object/table/code locations and the 64-bit slot-width arithmetic; it does not repeat the method index catalogue.', ['swap_chain object 0x000001F48A200000', 'vtable 0x00007FFA1C305000', '64-bit slot width 8 bytes', 'slot 8 offset 8×8=64=0x40', 'slot address 0x00007FFA1C305040', 'function address 0x00007FFA1C289A10'], 'Follow the exact 64-bit addresses above: first read the object’s vtable pointer, then read slot 8. Eight eight-byte slots put that entry at vtable + 0x40. The entry supplies this implementation’s Present address; drawing distances are schematic.', 'The swap-chain object at 0x000001F48A200000 leads through its first field to vtable 0x00007FFA1C305000. Slot eight is at offset 0x40, address 0x00007FFA1C305040. Reading it gives the Present implementation at 0x00007FFA1C289A10.')

# 8.4: equal valid bytes have different consequences under different states.
d = Drawing('Parsing passes; the state can still refuse', 'The same already-parsed Chat message is refused in Connected, which remains Connected, but accepted in InLobby, which remains InLobby. The state gate is distinct from the parser; no malformed bytes are involved.', 290)
d.title_line()
d.rect(16, 114, 114, 67)
d.line(16, 114, 73, 150)
d.line(130, 114, 73, 150)
d.text(73, 172, 'valid Chat', '.875rem', 'middle', True)
for y, state in [(64, 'Connected'), (208, 'InLobby')]:
    d.rect(180, y, 135, 49)
    d.text(248, y+20, 'current state', '.75rem', 'middle')
    d.text(248, y+40, state, '.875rem', 'middle', True)
    d.rect(349, y, 115, 49)
    d.text(407, y+20, 'keep state', '.75rem', 'middle')
    d.text(407, y+40, state, '.875rem', 'middle', True)
    d.arrow(319, y+25, 343, y+25)
d.arrow(134, 134, 175, 88)
d.arrow(134, 160, 175, 232)
d.cross(331, 89, 5)
d.text(406, 139, 'refused', '.875rem', 'middle', True)
d.text(406, 195, 'accepted', '.875rem', 'middle', True)
d.text(16, 279, 'The same bytes are legal only in the right session state.', '.8125rem')
add('6/04', 'chat-state-gate', d, 'The parser creates `Message` values. The session machine decides whether each value makes sense now.\n', 'Model states and messages separately', 'Makes the same parsed message branch by current state, distinguishing byte validity from transition legality before the transition match is introduced.', ['same parsed Chat message', 'Connected refuses Chat and retains Connected', 'InLobby accepts Chat and retains InLobby', 'no unsupported version or malformed frame assumed'], 'The same parsed Chat has two outcomes. Connected refuses it without changing state; InLobby accepts it and stays InLobby. Parsing established what the message is. The session gate decides whether it is allowed now.', 'One valid parsed Chat message reaches two state gates. Connected refuses it and stays Connected. InLobby accepts it and stays InLobby. The difference comes from current state, not different bytes.')

# 8.9: selected properties cross the network, not the whole door allocation.
d = Drawing('The client receives selected door state', 'The server door object contains position, opening state and scheduling data. SendTable selects position and door state for network encoding; RecvTable receives those properties for the client view. Scheduling stays on the server. The drawing is schematic, not a raw Source packet format.', 319)
d.title_line()
d.rect(16, 58, 159, 225)
d.text(95, 82, 'server door', '.875rem', 'middle', True)
d.rect(38, 95, 45, 52)
d.circle(73, 121, 2, True)
for y, label in [(161, 'position'), (200, 'opening state'), (239, 'scheduling')]:
    d.rect(30, y, 131, 30, dash=label=='scheduling')
    d.text(95, y+20, label, '.8125rem', 'middle')
d.text(268, 105, 'SendTable', '.875rem', 'middle', True)
d.rect(210, 123, 116, 72, strong=True)
d.text(268, 151, 'position', '.875rem', 'middle')
d.text(268, 177, 'door state', '.875rem', 'middle')
d.arrow(164, 176, 204, 147)
d.arrow(164, 215, 204, 176)
d.line(164, 254, 194, 254)
d.cross(194, 254, 5)
d.rect(356, 58, 108, 225)
d.text(410, 82, 'client view', '.875rem', 'middle', True)
d.rect(385, 117, 45, 95)
d.circle(421, 165, 2, True)
d.arrow(330, 159, 350, 159)
d.text(410, 245, 'RecvTable', '.8125rem', 'middle', True)
d.text(16, 306, 'Scheduling stays on the server; the client draws the door.', '.8125rem')
add('6/09', 'door-network-properties', d, 'make that selection explicit. The engine can also limit which entities and\nupdates are relevant to a particular client.\n', 'Entity state becomes selected network properties', 'Uses a concrete door picture and selected field paths to show network-property filtering without duplicating the later prediction Scene or implying a raw object copy.', ['door position and opening state are selected example properties', 'server scheduling does not cross this illustrated selection', 'SendTable/RecvTable are field descriptions', 'schematic, not Source wire format'], 'The door example sends selected position and opening properties for the client’s view. Internal scheduling stays in the server object. SendTable and RecvTable describe that selection and reception; this picture is not a dump of the object or its packet format.', 'A server door object holds position, opening state and scheduling. Position and opening state pass through SendTable into selected network properties and RecvTable on the client, which draws the door. Scheduling remains on the server.')

# 5.1: the section mapping moves payloads between differently aligned layouts.
d = Drawing('The same payload has two positions', 'A schematic PE file and mapped image place the same code and initialized data at different positions. Section rows relate the raw file positions to image RVAs. The loader supplies zero-initialized memory that is not stored as equal payload bytes in the file. No actual header offsets or section sizes are claimed.', 320)
d.title_line()
d.text(101, 55, 'disk: file offsets', '.875rem', 'middle', True)
d.text(382, 55, 'image: RVAs', '.875rem', 'middle', True)
d.rect(16, 68, 177, 233)
d.rect(299, 68, 165, 233)
d.text(101, 92, 'headers', '.875rem', 'middle')
d.text(382, 92, 'headers', '.875rem', 'middle')
d.rect(39, 119, 130, 45, strong=True)
d.text(104, 147, '.text bytes', '.875rem', 'middle', True)
d.rect(317, 157, 130, 45, strong=True)
d.text(382, 185, '.text bytes', '.875rem', 'middle', True)
d.text(101, 201, 'file alignment', '.8125rem', 'middle')
d.rect(39, 220, 130, 43)
d.text(104, 247, '.data bytes', '.875rem', 'middle')
d.rect(317, 220, 130, 32)
d.text(382, 241, '.data bytes', '.8125rem', 'middle')
d.rect(317, 252, 130, 20, hatch=True)
d.text(382, 290, 'zero-filled tail', '.8125rem', 'middle')
d.rect(209, 99, 74, 75)
d.text(246, 124, 'section', '.8125rem', 'middle', True)
d.text(246, 144, 'row maps', '.8125rem', 'middle')
d.text(246, 164, 'the bytes', '.8125rem', 'middle')
d.arrow(174, 141, 203, 136)
d.arrow(287, 139, 311, 177)
d.arrow(174, 240, 311, 235)
d.text(16, 314, 'Schematic layouts: equal payloads do not imply equal offsets.', '.8125rem')
add('7/01', 'file-image-layout', d, 'the numbers are related but not interchangeable.\n', 'Why an EXE needs a map', 'Makes the two physically distinct layouts visible, with mapped payloads and a memory-only zero tail; complements the later header-walk Scene instead of cataloguing headers.', ['no actual offsets, alignments or section sizes assigned', 'same code and initialized data map through section rows', 'zero-initialized tail exists in memory', 'schematic shape/spacing explicitly identified'], 'These are schematic layouts, not this lab’s section sizes. Section rows relate file positions to image positions even when alignment differs. Code and initialized data are mapped; the loader also supplies zero-filled memory, so the file and image need not have equal payload lengths.', 'A schematic PE file and loaded image show the same text and data payloads at different positions. A section row maps the file bytes to image RVAs. A hatched zero-filled tail exists in the image without an equal file payload.')

# 5.2: draw the authored raw/virtual lengths and point offsets proportionally.
d = Drawing('The mapped tail has no file byte', 'The raw section spans file offsets 0x0600 through 0x0E00, length 0x800. Its virtual span is RVA 0x2000 through 0x2900, length 0x900. Offset 0x340 maps RVA 0x2340 to file offset 0x0940. RVA 0x2880 has offset 0x880 in the virtual tail, past raw size 0x800, and has no file byte. Bar lengths and point distances share one scale.', 311)
d.title_line()
d.text(16, 54, 'file bytes: length 0x800', '.875rem', bold=True)
d.rect(48, 82, 320, 44)
d.line(178, 82, 178, 126, strong=True)
d.text(178, 75, '0x0940', '.875rem', 'middle', mono=True)
d.text(48, 149, '0x0600', '.8125rem', mono=True)
d.text(368, 149, '0x0E00', '.8125rem', 'end', mono=True)
d.text(16, 183, 'mapped bytes: length 0x900', '.875rem', bold=True)
d.rect(48, 207, 320, 44)
d.rect(368, 207, 40, 44, hatch=True)
d.line(178, 207, 178, 251, strong=True)
d.line(388, 207, 388, 251, strong=True)
d.line(178, 130, 178, 203, dash=True)
d.text(191, 164, 'same +0x340', '.8125rem', mono=True)
d.text(48, 275, '0x2000', '.8125rem', mono=True)
d.text(178, 275, '0x2340', '.8125rem', 'middle', mono=True)
d.text(388, 275, '0x2880', '.8125rem', 'middle', mono=True)
d.text(408, 200, 'end 0x2900', '.8125rem', 'end', mono=True)
d.text(16, 303, 'The hatched 0x100 tail is supplied as zeros.', '.875rem')
add('7/02', 'rva-zero-tail', d, 'byte stored in the file.\n', 'Map an RVA back to bytes on disk', 'Adds proportional raw/virtual bars and exact point distances to make the zero-tail boundary visible, beyond the non-proportional Mermaid flowchart.', ['raw start 0x0600, raw size 0x800, raw end 0x0E00', 'virtual start 0x2000, virtual size 0x900, virtual end 0x2900', 'offset 0x340 maps RVA 0x2340 to file offset 0x0940', 'RVA 0x2880 has offset 0x880 beyond raw size 0x800', 'virtual tail size 0x100', 'shared scale: 0x900 bytes = 360 units; 0x340 = 130 units; 0x880 = 340 units'], 'Both bars use one scale: 0x800 file bytes become part of a 0x900 mapped range. RVA 0x2340 and file offset 0x0940 share offset 0x340. RVA 0x2880 sits in the hatched 0x100 zero-filled tail; no corresponding byte is stored on disk.', 'Proportional bars show a 0x800-byte file section starting at 0x0600 and a 0x900-byte mapped range starting at RVA 0x2000. Offset 0x340 links file offset 0x0940 to RVA 0x2340. RVA 0x2880 lies in the final zero-filled 0x100 bytes with no file byte.')

# 5.9: both the still and optional frames use the same explicitly schematic queue.
def buffer_drawing(phase=None):
    d = Drawing('A burst can outrun a finite buffer', 'A separate schematic buffer has three illustrative slots. Four events arrive before the consumer drains: records one through three occupy the slots, while the fourth cannot enter and is lost from this capture. Three slots are not an ETW capacity setting. A later drain makes room for future records but cannot reconstruct the lost one.', 310)
    d.title_line()
    d.text(16, 54, 'illustration: three slots, four arriving events', '.875rem')
    d.rect(16, 94, 113, 89)
    d.text(72, 120, 'provider', '.875rem', 'middle', True)
    d.text(72, 146, 'events', '.875rem', 'middle')
    d.rect(159, 81, 216, 122, strong=True)
    d.text(267, 106, 'finite session buffer', '.875rem', 'middle', True)
    filled = 3 if phase is None else min(phase, 3)
    for i in range(3):
        x = 178+i*61
        d.rect(x, 124, 53, 47, strong=i<filled and not (phase == 5 and i == 2), dash=phase == 5 and i == 2)
        if i < filled:
            value = str(i+1)
            if phase == 5:
                value = str(i+2) if i<2 else ''
            d.text(x+26.5, 155, value, '1rem', 'middle', True, True)
    d.arrow(132, 143, 153, 143)
    d.arrow(379, 143, 397, 143)
    d.rect(403, 108, 61, 70)
    d.text(433, 137, 'drain', '.8125rem', 'middle', True)
    d.text(433, 160, '1' if phase == 5 else 'later', '.75rem', 'middle')
    if phase is None or phase >= 4:
        d.rect(16, 222, 104, 47)
        d.text(68, 252, 'record 4', '.875rem', 'middle', mono=True)
        d.line(124, 245, 163, 216)
        d.cross(163, 216)
        d.text(185, 244, 'full: not recorded', '.875rem', bold=True)
    elif phase == 0:
        d.text(16, 249, 'Buffer empty before the burst.', '.875rem')
    else:
        d.text(16, 249, f'Record {phase} enters; consumer has not drained.', '.875rem')
    if phase == 5:
        d.text(16, 286, 'One record drains; the lost record stays lost.', '.8125rem')
    else:
        d.text(16, 297, 'Missing from a capture does not mean never happened.', '.8125rem')
    return d
d = buffer_drawing()
add('7/09', 'etw-buffer', d, '“missing from this capture” does not automatically mean “never happened.”\n', 'Observation without a breakpoint', 'Uses a visibly bounded queue and overflow event to explain loss, with a short optional fill/drop/drain animation rather than a slideshow of ETW roles.', ['Explicit separate schematic three-slot buffer', 'four arrivals before drain', 'records 1–3 retained initially; fourth lost', 'later drain leaves records 2 and 3 and one empty slot', 'three slots are not an ETW capacity value'], 'A separate three-slot illustration: four records arrive before the consumer drains. The fourth cannot enter this full buffer and is absent from the capture. A later drain makes room but cannot recover that lost record. Three slots are schematic, not an ETW capacity setting; playback is optional.', 'A schematic three-slot session buffer holds records one, two and three. A fourth arrival is stopped at the full buffer and is not recorded. The consumer drains later. The missing record does not show that its event never happened.', motion=True)
for phase in range(6):
    (QA / f'etw-phase-{phase}.svg').write_text(buffer_drawing(phase).svg())

# Rasterize the GIF only. SVGs keep their original tokens and relative units.
# librsvg does not resolve these CSS variables/rem values like a browser does;
# the raster copy uses the existing original black-on-white artwork palette.
for command in ['rtk', 'rsvg-convert', 'magick']:
    if not shutil.which(command):
        raise RuntimeError(f'{command} is needed to reproduce the optional GIF')
delays = [80, 60, 60, 90, 120, 150]  # hundredths of a second
gif_args = ['rtk', 'proxy', 'magick']
for phase, delay in enumerate(delays):
    raster = (QA / f'etw-phase-{phase}.svg').read_text()
    raster = raster.replace('var(--ink,CanvasText)', 'black').replace('var(--paper,Canvas)', 'white')
    raster = re.sub(r'(?<=:)([0-9.]+)rem', lambda hit: f'{float(hit[1])*16:g}px', raster)
    png = QA / f'etw-phase-{phase}.png'
    subprocess.run(['rtk', 'proxy', 'rsvg-convert', '-o', str(png)], input=raster.encode(), check=True)
    gif_args.extend(['-delay', str(delay), str(png)])
gif = OUT / 'finish-early-etw-buffer.gif'
# Opaque frames let the optimizer erase old labels between changing phases.
gif_args.extend(['-background', 'white', '-alpha', 'remove', '-alpha', 'off',
                 '-loop', '0', '-colors', '32', '-dither', 'None', '-layers', 'Optimize',
                 '-set', 'comment', 'Original Game Hacking Academy mechanism artwork. CC0-1.0.', str(gif)])
subprocess.run(gif_args, check=True)
records[-1]['motion_verification']['gif'] = {
    'frames': 6, 'logical_width': 480, 'logical_height': 310,
    'frame_delays_centiseconds': delays, 'cycle_seconds': sum(delays)/100,
    'bytes': gif.stat().st_size, 'opaque_frame_backgrounds': True,
    'phase_meaning': ['empty', 'record 1', 'records 1,2', 'records 1,2,3', 'record 4 dropped', 'record 1 drained; 2,3 remain']
}
manifest = {'scope': 'historical folders 1–7', 'source_root': str(ROOT), 'source_branch': 'codex/book-revision', 'lesson_count': len(records), 'generator': 'site/scripts/make-finish-early-art.py', 'lessons': records, 'limits': ['No lab programs or tests executed', 'No shared components, credits, plans, progress, URLs, lesson IDs or saved keys changed', 'Root owns full build/browser/publication checks']}
Path('/Users/notlaggy/Documents/GitFolder/gamehackingacademy.github.io/.claude/gha-early-recovery/early-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n')
print(json.dumps({'lessons':len(records), 'svgs':len(records), 'manifest':'/Users/notlaggy/Documents/GitFolder/gamehackingacademy.github.io/.claude/gha-early-recovery/early-manifest.json', 'motion_frames':6}, indent=2))
