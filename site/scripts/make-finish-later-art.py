"""Reproduce the T52 original mechanism SVGs from their authored definitions.

Run from any directory with Python 3. Optionally export the figure descriptions
and provenance using --manifest /path/to/output.json.
"""

from pathlib import Path
from html import escape
import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'site/public/assets/images/original'
FIGURES = []
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--manifest',type=Path,help='Export artwork definitions and provenance to this JSON file.')
args = parser.parse_args()

def tx(x, y, *lines, cls='', anchor='start'):
    return ''.join(f'<text x="{x}" y="{y + 20*i}" class="{cls}" text-anchor="{anchor}">{escape(str(line))}</text>' for i, line in enumerate(lines))

def box(x, y, w, h, cls='box', rx=5):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" class="{cls}"/>'

def path(d, cls='line', end=False):
    return f'<path d="{d}" class="{cls}"' + (' marker-end="url(#arrow)"' if end else '') + '/>'

def arrow(x1, y1, x2, y2, cls='line'):
    return path(f'M{x1} {y1}L{x2} {y2}', cls, True)

def circle(x, y, r=5, cls='dot'):
    return f'<circle cx="{x}" cy="{y}" r="{r}" class="{cls}"/>'

def cross(x, y, r=7):
    return path(f'M{x-r} {y-r}L{x+r} {y+r}M{x-r} {y+r}L{x+r} {y-r}', 'line')

def doc(x, y, name, w=104, h=68):
    return box(x,y,w,h) + path(f'M{x+10} {y+20}H{x+w-10}M{x+10} {y+31}H{x+w-10}M{x+10} {y+42}H{x+w-22}') + tx(x+w/2,y+h+19,name,cls='sub',anchor='middle')

def cells(x,y,values,w=42,h=32,classes=None):
    return ''.join(box(x+i*w,y,w,h,(classes or {}).get(i,'box'),0)+tx(x+(i+.5)*w,y+h*.67,str(v),cls='mono halo' if (classes or {}).get(i)=='hatch' else 'mono',anchor='middle') for i,v in enumerate(values))

def add(lesson, slug, title, desc, body, height, anchor, caption, reason, values):
    file = ROOT / f'site/src/content/docs/pages/{lesson}.mdx'
    source = file.read_text()
    if source.count(anchor) != 1:
        raise ValueError(f'{lesson}: placement anchor occurs {source.count(anchor)} times')
    slug = 'finish-later-' + slug
    asset = OUT / f'{slug}.svg'
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- SPDX-License-Identifier: CC0-1.0; original Game Hacking Academy artwork. -->
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="{height}" viewBox="0 0 480 {height}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>
<metadata>Original geometric artwork authored for Game Hacking Academy, 2026-10-08. Public domain dedication: CC0 1.0 Universal. Source: site/scripts/make-finish-later-art.py. Concept and worked values from site/src/content/docs/pages/{lesson}.mdx; any separate illustrative example is identified in the caption. No third-party image assets.</metadata>
<style>svg{{color:var(--ink,CanvasText);background:var(--paper,Canvas)}}text{{font-family:system-ui,sans-serif;fill:currentColor;font-size:.88rem}}.title{{font-size:1rem;font-weight:700}}.strong{{font-weight:700}}.sub{{font-size:.82rem}}.mono{{font-family:ui-monospace,monospace;font-size:.88rem}}.halo{{paint-order:stroke;stroke:var(--paper,Canvas);stroke-width:.22rem;stroke-linejoin:round}}.box{{fill:var(--paper,Canvas);stroke:currentColor;stroke-width:.09rem}}.line{{fill:none;stroke:currentColor;stroke-width:.1rem}}.dashed{{fill:none;stroke:currentColor;stroke-width:.09rem;stroke-dasharray:.3rem .2rem}}.hatch{{fill:url(#hatch);stroke:currentColor;stroke-width:.09rem}}.dot{{fill:currentColor;stroke:currentColor}}.open{{fill:var(--paper,Canvas);stroke:currentColor;stroke-width:.1rem}}</style>
<defs><marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6Z" fill="currentColor"/></marker><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" class="line"/></pattern></defs>
{tx(16,26,title,cls='title')}
{body}
</svg>
'''
    ET.fromstring(svg)
    asset.write_text(svg)
    FIGURES.append({
        'lesson': str(file.relative_to(ROOT)),
        'title': re.search(r'^title: (.*)$',source,re.M).group(1).strip('"'),
        'chapter': re.search(r'^chapter: (.*)$',source,re.M).group(1).strip('"'),
        'asset': str(asset.relative_to(ROOT)),
        'width': 480, 'height': height,
        'placement_anchor': anchor, 'placement_reason': reason,
        'caption': caption, 'alt': desc,
        'exact_values': values,
        'provenance': {'author':'Original Game Hacking Academy artwork, 2026-10-08','license':'CC0-1.0','source':f'site/src/content/docs/pages/{lesson}.mdx','third_party_assets':False},
        'checks': {'xml_parse':True,'unique_placement_anchor':True,'css_tokens_and_relative_font_units':True},
    })

# A shared address space still has separate owners.
b = box(16,58,138,140,'dashed')+tx(28,80,'External tool',cls='strong')+box(28,110,112,42)+tx(84,136,'local copy',anchor='middle')
b += box(186,58,278,140)+tx(198,80,'Owned course process',cls='strong')+box(198,101,115,40)+tx(256,126,'guest DLL',anchor='middle')
b += cells(338,104,['G','A','M','E'],w=27)+tx(392,158,'game-owned bytes',cls='sub',anchor='middle')+arrow(312,120,332,120)+tx(283,178,'direct pointer',cls='sub')
b += path('M339 105V91H84V104','line',True)+tx(167,50,'Windows copies',cls='sub',anchor='middle')+tx(16,230,'Direct access still needs a valid object lifetime.')
add('8/01','dll-address-owners','One address space, different owners','An external tool receives a local copy through Windows. A guest DLL accesses game-owned bytes in the same address space; the game still owns their lifetime.',b,252,
'Sharing an address space removes one copying boundary; it does not create shared ownership. The game still owns its objects, decides when they move or disappear, and may update them from other threads. Your DLL is a guest that can observe an address only while the assumptions that justified it remain true.',
'The guest DLL can reach the bytes directly, while the game keeps ownership of the objects containing them.',
'Illustrates the copying boundary and separate ownership immediately after the paragraph explaining that distinction.',
['external local copy','guest DLL and game bytes share one address space','game retains object lifetime ownership; no fabricated addresses'])

# The copied path has a shorter lifetime than the loaded module.
b = doc(18,70,'injector: wide path',130,68)+arrow(151,104,182,104)+box(190,54,274,172)+tx(202,76,'Exact course target',cls='strong')
b += box(202,92,112,46)+tx(258,115,'path + NUL',cls='mono',anchor='middle')+tx(258,132,'temporary buffer',cls='sub',anchor='middle')+arrow(318,114,342,114)
b += box(350,92,101,46)+tx(400,120,'LoadLibraryW',cls='sub',anchor='middle')+arrow(400,142,400,166)+doc(346,172,'loaded DLL',110,34)
b += tx(20,189,'wait for load',cls='strong')+arrow(145,185,199,185)+cross(213,179)+tx(227,185,'release buffer',cls='sub')
b += tx(16,257,'Loading succeeds first; call gha_start afterward.',cls='sub')
add('8/02','loader-path-lifetime','The path buffer is temporary','The injector copies a NUL-terminated UTF-16 path to the exact course target. LoadLibraryW loads the DLL. After waiting for loading, the injector can release the path buffer and then call gha_start.',b,278,
'Every box can fail and must clean up what earlier boxes created.',
'The copied path is temporary workspace. Waiting for the loader separates its release from the loaded DLL’s lifetime and explicit start.',
'Gives a concrete ownership picture beside the classic sequence’s cleanup explanation.',
['UTF-16 path with zero terminator','LoadLibraryW','wait for loading before cleanup','gha_start after successful loading'])

# The instruction is unchanged; the slot selects the route.
b = tx(16,62,'Before',cls='strong')+box(84,43,108,42)+tx(138,69,'call [IAT]',cls='mono',anchor='middle')+arrow(195,64,225,64)+box(232,43,232,42)+tx(348,69,'slot → MessageBoxW',cls='mono',anchor='middle')
b += tx(16,119,'Hooked',cls='strong')+box(84,101,108,42)+tx(138,127,'call [IAT]',cls='mono',anchor='middle')+arrow(195,122,225,122)+box(232,101,232,42)+tx(348,127,'slot → replacement',cls='mono',anchor='middle')
b += arrow(349,146,349,170)+box(232,178,232,47)+tx(348,199,'hooked_message_box',cls='mono',anchor='middle')+tx(348,216,'calls saved MessageBoxW',cls='sub',anchor='middle')
b += tx(16,257,'Dropping the patch owner restores the saved slot.',cls='sub')
add('8/04','iat-route','One slot changes the destination','The same call through the MessageBoxW IAT slot reaches MessageBoxW before installation and hooked_message_box afterward. The replacement calls the saved original, and removal restores the saved slot.',b,278,
'When the patch owner is dropped, it puts the saved original pointer back into that same IAT slot.',
'The call instruction stays in place. Installation changes its verified IAT destination, and removal restores that destination.',
'Makes the exact MessageBoxW route and restored pointer visible beside the restoration paragraph.',
['MessageBoxW IAT slot','hooked_message_box','saved original MessageBoxW','call instruction unchanged'])

# The atomic index hands different stable regions to different workers.
b = tx(16,59,'Owned, immutable snapshots',cls='strong')+box(16,72,183,52)+tx(28,93,'region 0',cls='mono')+cells(113,82,['·','·','·'],w=24,h=30)
b += box(16,147,183,52)+tx(28,168,'region 1',cls='mono')+cells(113,157,['·','·','·'],w=24,h=30)
b += arrow(203,98,263,98)+arrow(203,174,263,174)+box(270,72,194,52)+tx(282,93,'Worker 1 claims 0',cls='strong')+tx(282,114,'next_region: 0 → 1',cls='mono')
b += box(270,147,194,52)+tx(282,168,'Worker 2 claims 1',cls='strong')+tx(282,189,'next_region: 1 → 2',cls='mono')
b += tx(16,233,'Workers compare copied bytes, not live process pages.',cls='sub')
add('8/05','scan-region-claims','Each region is claimed once','In a separate two-worker example, the atomic region index advances from 0 to 1 for Worker 1 and from 1 to 2 for Worker 2. The workers scan different immutable copied regions.',b,256,
'No region is handed out twice. When the index passes the slice, the worker finishes.',
'A two-worker example: fetch_add returns the old index, then advances it, so region 0 and region 1 have different owners.',
'Shows the atomic claim’s actual effect beside the paragraph about unique region assignment.',
['separate illustrative two-worker example','region indices 0 and 1','fetch_add(1): returns 0 then 1; counter becomes 1 then 2','workers read owned snapshot buffers'])

# A UI change travels as data to the owner of effects.
b = box(16,60,147,145)+tx(29,83,'Menu',cls='strong')+box(29,99,18,18)+path('M32 107L37 112L44 102')+tx(56,113,'show_names',cls='mono')+tx(29,144,'Settings',cls='mono')+tx(29,168,'ordinary data',cls='sub')
b += arrow(165,132,205,132)+doc(216,100,'command copy',92,59)+arrow(309,131,343,131)+box(350,60,114,145)+tx(363,83,'Worker',cls='strong')
b += path('M378 106a10 10 0 1 0 0 20a10 10 0 1 0 0 -20M386 120L404 138H412V147H420')+tx(363,169,'owns effects',cls='sub')+tx(363,190,'and cleanup',cls='sub')
b += tx(16,241,'Painting a checkbox changes settings; the worker acts.',cls='sub')
add('8/07','menu-command-copy','A setting travels as a command','A menu checkbox changes the owned Settings value. A command carries a settings copy through a channel to the worker, which owns process effects and cleanup.',b,264,
'The menu should **not** own a process handle, execute pointer chains while\npainting a checkbox, or patch memory sixty times per second. Its job is to edit\nordinary settings and send deliberate commands to a worker. That separation\nmakes the interface responsive and the low-level code reviewable. 🎛️',
'The checkbox edits ordinary settings. The worker receives a deliberate command and owns the resources that carry it out.',
'Illustrates the concrete menu-to-worker boundary beside the paragraph assigning their responsibilities.',
['show_names setting','owned Settings value','channel command containing settings data','worker owns handles, effects and cleanup'])

# A single field bundle feeds both displays.
b = box(16,58,230,180)+tx(28,83,'FrameSnapshot',cls='mono')+box(28,98,91,94)+tx(74,119,'players',cls='strong',anchor='middle')
b += circle(55,143,5)+path('M55 149V169M44 158H66M55 169L44 184M55 169L66 184')+circle(96,154,4)+box(130,98,103,94)+tx(181,119,'camera',cls='strong',anchor='middle')
b += path('M155 148L204 126V175Z')+circle(155,148,4)+tx(28,218,'one owned capture',cls='sub')+arrow(250,114,287,91)+arrow(250,178,287,196)
b += circle(355,90,48,'open')+path('M309 90H401M355 44V136')+circle(375,73,4)+tx(355,156,'radar',cls='strong',anchor='middle')
b += box(292,174,124,66)+circle(326,204,4)+tx(337,210,'label',cls='sub')+tx(353,230,'overlay',cls='strong',anchor='middle')+tx(16,275,'Validate capture: a shared copy alone is not atomic.',cls='sub')
add('8/08','shared-frame-bundle','Camera and players travel together','One owned FrameSnapshot contains players and the camera. Radar and overlay read that same captured set. Sharing the copy does not prove the live game stayed unchanged while capture was in progress.',b,296,
'Copy once, then let every feature read from the copy.',
'Radar and overlay consume the same player and camera fields; the capture still needs validation for changes made during the copy.',
'Shows the bundle’s physical consumers directly after the copy-once paragraph, without implying atomic live reads.',
['FrameSnapshot: players and matrix/camera from one observation pass','radar and overlay consume the same owned copy','validation still required; capture is not inherently atomic'])

# Installation has two distinct undo routes.
b = tx(16,61,'Create',cls='strong')+box(85,44,78,45,'dashed')+tx(124,72,'no file',cls='sub',anchor='middle')+arrow(169,66,203,66)+doc(210,44,'mod file M',88,45)+arrow(304,66,340,66)+box(350,44,114,45,'dashed')+tx(406,72,'remove M',cls='sub',anchor='middle')
b += tx(16,168,'Replace',cls='strong')+doc(85,138,'original O',78,45)+arrow(169,162,204,162)+doc(211,138,'mod M',88,45)+doc(211,219,'backup O',88,40)
b += arrow(302,163,339,163)+doc(350,138,'restore O',114,45)+path('M302 239H474V162H466','line',True)+tx(16,296,'Compare expected hashes before install and uninstall.',cls='sub')
add('9/06','mod-undo-paths','Undo follows the operation performed','Creating a new file is undone by removing the installed file. Replacing an original file requires restoring its backup. Expected hashes are checked before changing either file.',b,318,
'The distinction between `Create` and `Replace` prevents an uninstaller from deleting a file that existed before the mod.',
'M represents the installed mod file and O the original. Create removes M; Replace restores the saved O after checking the expected hashes.',
'Draws the different filesystem outcomes directly after the explanation of Create versus Replace.',
['Create → remove installed file','Replace → restore original backup','M and O are explicitly symbolic files','expected hashes checked before modification'])

# Runtime resources extend beyond the EXE's stored bytes.
b = doc(16,96,'wesnoth.exe on disk',140,86)+arrow(160,135,190,135)+box(202,54,262,195)+tx(214,79,'Running process',cls='strong')
b += box(214,92,118,38)+tx(273,117,'mapped EXE',anchor='middle')+box(344,92,108,38)+tx(398,117,'DLLs',anchor='middle')
b += box(214,143,118,72)+tx(273,166,'private heap',anchor='middle')+cells(229,178,['·','·','·'],w=29,h=25)+box(344,143,108,72)+tx(398,166,'thread stack',anchor='middle')+path('M355 179H441M355 190H441M355 201H441')
b += tx(214,238,'handles · security · thread context',cls='sub')+tx(16,285,'The disk file helps create this larger running state.',cls='sub')
add('10/01','file-running-process','The process contains more than the file','The disk file wesnoth.exe is mapped into a running process. DLLs, a private heap, a thread stack, handles, security state and thread context are additional runtime resources.',b,307,
'The process is not simply a copy of the file. Windows may place sections at different virtual addresses, fill zero-initialized data, apply relocations, resolve imports, and create private memory that never existed in the EXE.',
'The EXE contributes a mapped image. The running instance also owns dynamic memory, loaded DLLs, threads and Windows-managed resources.',
'Places a disk-to-memory drawing beside the paragraph explaining why the process is larger than its file image.',
['wesnoth.exe disk image','mapped EXE and loaded DLLs','heap, stack, handles, security and context are runtime state','no invented live base addresses'])

# The caption explicitly distinguishes this small hashing example from a game build.
ha = hashlib.sha256(bytes([1,2,3])).hexdigest()
hb = hashlib.sha256(bytes([1,2,4])).hexdigest()
b = tx(16,60,'Same label: “1.14.9”',cls='strong')+tx(16,85,'Illustrative three-byte files',cls='sub')+cells(25,104,['01','02','03'],w=58,h=40)+cells(285,104,['01','02','04'],w=58,h=40,classes={2:'hatch'})
b += arrow(111,150,111,183)+arrow(373,150,373,183)+tx(111,204,ha[:12]+'…',cls='mono',anchor='middle')+tx(373,204,hb[:12]+'…',cls='mono',anchor='middle')
b += path('M20 216H201M282 216H462')+tx(16,255,'Compare the digest with the trusted baseline.',cls='sub')
add('10/02','label-digest-identity','Equal labels can hide different bytes','In a separate three-byte example, 01 02 03 and 01 02 04 carry the same illustrative version label but have different SHA-256 digests. Compare bytes against a trusted baseline rather than relying on the label.',b,279,
'A **cryptographic hash** turns all file bytes into a fixed-size fingerprint. This lab uses SHA-256. Change one byte and the resulting digest should change dramatically.',
'A separate three-byte hashing example: 01 02 03 and 01 02 04 have different SHA-256 digests despite the same illustrative label. These are not game-build fingerprints.',
'Makes the label-versus-bytes problem concrete beside the first hash explanation, with calculated example digests.',
['separate illustrative files: bytes 01 02 03 and 01 02 04','label 1.14.9 is illustrative, not an identity claim',{'sha256_010203':ha,'sha256_010204':hb},'both SHA-256 prefixes calculated from exact bytes'])

# Both threads read the same old value before the second write wins.
b = tx(16,57,'Reward thread',cls='strong')+tx(198,57,'Purchase thread',cls='strong')+tx(428,57,'gold',cls='mono',anchor='middle')
b += path('M76 72V217M261 72V217M428 72V217','dashed')+circle(76,91)+tx(19,113,'read 1,000',cls='sub halo')+circle(261,91)+tx(205,113,'read 1,000',cls='sub halo')
b += tx(19,143,'+500 → 1,500',cls='mono halo')+tx(200,143,'−300 → 700',cls='mono halo')+arrow(80,165,392,165)+box(397,146,67,34)+tx(430,169,'1,500',cls='mono',anchor='middle')
b += arrow(266,202,392,202)+box(397,186,67,50,'dashed')+tx(430,219,'700',cls='mono halo',anchor='middle')+tx(16,264,'Expected: 1,000 + 500 − 300 = 1,200.',cls='strong')+tx(16,286,'The last write overwrites the reward’s result.',cls='sub')
add('10/06','lost-gold-interleaving','An old read can overwrite a new result','Both threads read 1,000 gold. The reward thread writes 1,500, then the purchase thread overwrites it with 700 calculated from the old value. The correct combined result would be 1,200.',b,308,
'The player should have 1,000 + 500 − 300 = 1,200 and has 700. The reward\nvanished, because the purchase thread wrote a result computed from a value that\nwas already out of date. Most runs interleave harmlessly, with one thread\nfinishing before the other starts, which is why a race can pass every test and\nstill fail for a player.',
'Both readers start from 1,000. Writing 1,500 then 700 loses the reward; the intended combined result is 1,200.',
'Visualizes the exact interleaving and lost result beside the worked 1,200-versus-700 explanation.',
['initial gold 1,000','reward +500 → 1,500','purchase −300 from old 1,000 → 700','writes 1,500 then 700','intended result 1,200'])

# The DLL layers are inside the caller's process; the privilege gate is a boundary.
b = box(16,58,448,123)+tx(28,83,'One user-mode process',cls='strong')+box(28,106,113,46)+tx(84,132,'tool caller',anchor='middle')+arrow(144,129,172,129)
b += box(179,106,114,46)+tx(236,124,'Win32 DLL',anchor='middle')+tx(236,144,'contract',cls='sub',anchor='middle')+arrow(297,129,326,129)+box(333,106,116,46)+tx(391,124,'native stub',anchor='middle')+tx(391,144,'ntdll.dll',cls='mono',anchor='middle')
b += arrow(391,158,391,200)+path('M16 207H345M433 207H464')+box(347,192,84,31)+tx(389,213,'syscall',cls='mono',anchor='middle')+tx(16,207,'',cls='sub')
b += box(244,242,205,46)+tx(346,270,'kernel validates request',anchor='middle')+arrow(389,226,389,236)+path('M239 265H84V159','line',True)+tx(17,244,'result returns',cls='sub')
add('10/07','same-process-call-layers','Layers share the caller’s process','The application, its Win32 DLL implementation and an ntdll native stub are software layers in one user-mode process. A controlled system-call gate crosses to the kernel, which validates the request and returns a result.',b,312,
'The boxes are **software layers**, not necessarily four separate processes.\n`kernel32.dll` and `ntdll.dll` are mapped into the same user-mode process as our\nprogram. Microsoft may change the implementation path while preserving the Win32\ncontract, which is why “calling a deeper layer” is usually less stable rather than\nmore capable.',
'DLL layers stay inside the caller’s user-mode process. The system-call gate marks the controlled privilege transition to kernel validation.',
'Clarifies the spatial boundary beside the paragraph saying software layers are not separate processes.',
['caller and Win32/native DLLs in same process','ntdll.dll native stub','syscall controlled gate','kernel validation and result return','schematic route; no system-call number or universal DLL chain asserted'])

# A dump preserves selected state at a single time, not all earlier events.
b = path('M23 66H450','line',True)+circle(64,66)+circle(171,66)+circle(295,66,7,'open')+tx(56,52,'earlier',cls='sub')+tx(255,52,'capture',cls='strong')+path('M295 76V103','line',True)
b += box(180,111,272,146)+tx(193,135,'Saved selected state',cls='strong')+doc(192,157,'modules',75,56)+doc(279,157,'threads',75,56)+doc(366,157,'stacks',75,56)
b += box(18,121,136,97,'dashed')+tx(29,145,'Earlier timeline',cls='sub')+tx(29,170,'needs logs',cls='sub')+tx(29,191,'or an ETW trace',cls='sub')+tx(16,291,'A missing stream may mean “not captured.”',cls='sub')
add('10/08','dump-selected-instant','A dump saves one selected instant','A capture point on a timeline produces saved module, thread and stack records. Earlier history is outside that saved state and needs logs or tracing. Missing streams may simply not have been captured.',b,312,
'The dump type decides which optional streams are saved. That is why a missing\nheap object or exception record may mean “not captured,” not “never existed.”',
'The capture saves selected state at one instant. Earlier history and omitted streams need separate evidence.',
'Shows selection and time scope beside the paragraph about omitted dump streams.',
['selected modules, threads and stacks','one capture instant','earlier history requires logs or ETW','absent stream does not prove absent historical object'])

# Locks are shown as held resources, with waits making a closed cycle.
b = box(22,61,202,80)+tx(35,85,'Thread A',cls='strong')+tx(35,110,'holds game_lock',cls='mono')+box(257,61,202,80)+tx(270,85,'Thread B: DllMain',cls='strong')+tx(270,110,'holds loader_lock',cls='mono')
b += path('M121 146V197H358V147','line',True)+tx(239,190,'A waits for loader_lock',cls='sub',anchor='middle')
b += path('M360 57V43H121V57','line',True)+tx(239,41,'B waits for game_lock',cls='sub',anchor='middle')+tx(16,238,'Each thread needs the lock the other thread holds.',cls='sub')
add('11/02','loader-lock-cycle','Two held locks can form a wait cycle','Thread A holds game_lock and waits for loader_lock. Thread B is in DllMain holding loader_lock and waits for game_lock. The closed wait cycle prevents either thread from continuing.',b,260,
'Neither thread can continue. The dangerous second lock may be hidden inside a function that loads a DLL, initializes COM, sends a blocking cross-thread message, starts complex runtime work, or waits for another thread.',
'The arrows are waits, not work completed. Each needed lock is already held by the opposite thread, closing the deadlock cycle.',
'Gives the two-lock example an explicit closed wait cycle beside the sentence explaining why neither thread continues.',
['Thread A holds game_lock and wants loader_lock','Thread B in DllMain holds loader_lock and wants game_lock','closed two-thread wait cycle'])

# A name denylist misses another spelling of the same effect in the toy.
b = tx(16,61,'Weak read-only policy',cls='strong')+box(16,82,154,46)+tx(93,110,'WriteMemory',cls='mono',anchor='middle')+arrow(175,105,218,105)+cross(244,105,10)+tx(279,111,'blocked by name',cls='sub')
b += box(16,160,154,46)+tx(93,188,'ApplyPatch',cls='mono',anchor='middle')+arrow(175,183,251,183)+cells(267,164,['·','·','·'],w=43,h=39,classes={1:'hatch'})+tx(330,225,'state changed',cls='strong',anchor='middle')
b += tx(16,267,'Both commands have a state-changing effect.',cls='sub')+tx(16,288,'The repaired policy checks that effect.',cls='sub')
add('11/04','toy-policy-effect','A name check misses the shared effect','The toy read-only policy blocks WriteMemory by name but allows ApplyPatch to change state. Both commands have a state-changing effect, so the repaired invariant must classify the effect instead of only a command name.',b,310,
'4. Observe that the second spelling reaches the same kind of state-changing\n   effect the policy claimed to prevent.\n\n</Steps>',
'In this isolated toy, WriteMemory is denied while ApplyPatch reaches the same kind of state-changing effect. A read-only rule must check that effect.',
'Illustrates the two exact toy commands after their four-step reproduction, retaining the isolated-fixture framing.',
['isolated toy only','WriteMemory denied','ApplyPatch allowed by name-based policy','both change state','no Windows APIs or real-defense procedure'])

# Two roots translate an equal number to different physical pages.
b = box(16,61,170,57)+tx(29,82,'Process A · root A',cls='strong')+tx(29,105,'virtual 0x1000',cls='mono')+box(16,170,170,57)+tx(29,191,'Process B · root B',cls='strong')+tx(29,214,'virtual 0x1000',cls='mono')
b += box(301,60,163,182)+tx(313,84,'Physical RAM',cls='strong')+cells(313,102,['A','·','·'],w=45,h=35,classes={0:'hatch'})+cells(313,171,['·','·','B'],w=45,h=35,classes={2:'hatch'})
b += path('M190 89H230V119H304','line',True)+path('M190 198H248V207H436','line',True)+tx(212,161,'different maps',cls='sub')+tx(16,275,'The root is part of an address’s meaning.',cls='sub')
add('11/06','address-space-roots','Equal addresses can name different pages','Process A and Process B both use virtual address 0x1000. Their different page-table roots map that number to different physical places, labelled A and B symbolically.',b,296,
'Two processes may both use virtual address `0x1000` because they supply different\npage-table roots. The access type matters too: a mapping may permit a read but reject\na write or instruction fetch. A virtual address by itself therefore does not name\na location: the address space and the mapping\'s permissions are part of its meaning.',
'Both virtual numbers are 0x1000. The selected page-table root distinguishes the physical destination; A and B are symbolic RAM locations.',
'Makes the equal-address/different-root example visible beside the paragraph explaining address-space meaning.',
['same virtual address 0x1000','page-table roots A and B','physical locations A and B are symbolic; no fabricated physical numbers','permissions remain part of translation'])

# The host runs Lua and supplies the callback receiving its message.
b = box(16,58,163,175)+tx(29,83,'Native host',cls='strong')+box(29,148,136,55)+tx(97,170,'game.log callback',cls='sub',anchor='middle')+tx(97,192,'writes host log',cls='sub',anchor='middle')
b += box(231,58,233,175)+tx(244,83,'Lua runtime',cls='strong')+tx(244,122,'game.log(',cls='mono')+tx(244,143,'  "observer started")',cls='mono')+path('M183 103H226','line',True)+tx(183,93,'run',cls='sub')
b += path('M244 158H170','line',True)+tx(278,192,'message argument',cls='sub')+tx(16,269,'The host owns both execution and the exposed service.',cls='sub')
add('12/01','lua-log-callback','One call crosses back to the host','The native host asks its Lua runtime to run a script. The script calls game.log with the exact message observer started, crossing back to the host-supplied logging callback.',b,291,
'Here `game` is a table of functions supplied by our lab host, `log` is one of\nthose functions, and the quoted text is its argument. The host decides where\nthe message appears. For this first script, we only need to know who runs it\nand who supplies `game.log`.',
'The host runs the script, and the script’s game.log("observer started") call sends its argument back through the host-supplied callback.',
'Draws the two actual crossings beside the first logging call’s explanation.',
['game.log("observer started")','game table and log function supplied by host','host controls runtime and message destination'])

# The same typed bridge accepts strings and refuses a table.
b = tx(16,62,'Separate call examples',cls='sub')+box(16,80,194,48)+tx(113,110,'log("sample")',cls='mono',anchor='middle')+arrow(214,104,258,104)+box(265,80,199,48)+tx(364,110,'String → host log',cls='mono',anchor='middle')
b += box(16,171,194,48)+tx(113,201,'log({})',cls='mono',anchor='middle')+arrow(214,195,258,195)+box(265,171,199,48,'dashed')+tx(364,201,'Lua type error',cls='strong',anchor='middle')
b += tx(16,153,'The registered callback requires a String.',cls='sub')+tx(16,263,'Value conversion happens at the boundary.',cls='sub')
add('12/03','lua-typed-callback','The bridge checks the argument type','For the registered log callback requiring a Rust String, a separate illustrative log("sample") call reaches the host. Passing a table as log({}) produces a Lua type error instead of an unchecked cast.',b,285,
'`create_function` converts Lua arguments into the requested host type. Passing a table where a `String` is required produces a Lua error instead of an unchecked cast.',
'Two separate calls to the registered log callback: a string is converted to String; a table fails the callback’s type conversion.',
'Shows both outcomes beside the paragraph describing create_function argument conversion.',
['registered callback requires Rust String','separate example log("sample") accepted','separate example log({}) rejected with Lua error','no script execution performed'])

# A generation changes when the same slot is reused.
b = tx(16,60,'Lua remembers',cls='strong')+box(16,76,174,52)+tx(103,108,'slot 3 · generation 6',cls='sub',anchor='middle')+arrow(195,102,257,102)
b += box(267,63,197,138)+tx(279,87,'Current host slot 3',cls='strong')+box(280,102,171,30,'dashed')+tx(365,123,'old entity · gen 6',cls='sub',anchor='middle')+cross(433,117,8)
b += box(280,151,171,32)+tx(365,173,'new entity · gen 7',cls='sub',anchor='middle')+path('M363 205V235H218','line',True)
b += tx(16,237,'6 ≠ 7',cls='mono')+tx(128,237,'REJECT',cls='strong')+tx(16,263,'Reject the stale pair; keep the new occupant untouched.',cls='sub')
add('12/04','lua-slot-generation','Reusing a slot changes its generation','Lua remembers slot 3 at generation 6. After the old entity dies, the host reuses slot 3 at generation 7. The stored generation does not match, so the host rejects the stale handle instead of acting on the new entity.',b,285,
'A handle can pair a numbered slot with a **generation** counter. Every time a\nslot is reused for a new entity, its generation changes. Suppose Lua remembers\nslot 3, generation 6. If that entity dies and slot 3 is reused at generation 7,\nthe host rejects the stale pair rather than acting on the new occupant:',
'The slot number remains 3, but generation 6 becomes 7. Checking both parts prevents the old handle from naming the new entity.',
'Illustrates the exact 3/6-to-3/7 handle example immediately beside its introduction.',
['remembered handle (slot 3, generation 6)','current occupant (slot 3, generation 7)','6 does not equal 7','stale pair rejected before acting'])

# The wait phase consumes a budget rather than resending the request.
b = box(16,69,134,51)+tx(83,94,'Request once',cls='strong',anchor='middle')+tx(83,113,'wait_ticks = 20',cls='sub',anchor='middle')+arrow(154,95,191,95)
b += circle(251,111,48,'open')+tx(251,104,'WAIT',cls='strong',anchor='middle')+tx(251,125,'20 → 19 → …',cls='mono',anchor='middle')
b += path('M294 84C332 30 348 163 300 137','line',True)+tx(351,55,'not confirmed:',cls='sub')+tx(351,75,'subtract 1',cls='sub')
b += path('M252 163V209H140','line',True)+tx(159,195,'confirmed',cls='sub')+box(16,189,122,47)+tx(77,218,'Observe again',cls='sub',anchor='middle')
b += path('M301 135H386V208','line',True)+tx(357,186,'0 ticks left',cls='sub')+box(337,216,126,44)+tx(400,244,'STOP',cls='strong',anchor='middle')+tx(16,287,'The wait budget gives the script a bounded ending.',cls='sub')
add('12/05','lua-wait-timeout','One request, then a bounded wait','After sending one selection request, the script waits with 20 ticks. Unconfirmed updates decrement the counter, confirmation returns to Observe, and reaching zero enters Stop rather than sending endlessly.',b,308,
'Do not put every game fact into the state name. `WAITING_FOR_SELECTION` describes the bot\'s control phase; the selected entity ID, request sequence, and remaining timeout are data owned by that phase.',
'The WAIT phase owns a 20-tick budget. Confirmation returns to observation; each unconfirmed update consumes one tick, and zero takes the stop path.',
'Draws the request/wait/confirmation/timeout consequences beside the paragraph separating phase from its data.',
['request sent once','wait_ticks initialized to 20','unconfirmed wait subtracts 1','confirmation → Observe','wait_ticks 0 → Stop'])

# Three bytecode steps visibly change the value stack.
b = tx(25,62,'PC 0: Constant(0)',cls='mono')+tx(180,62,'PC 1: Constant(1)',cls='mono')+tx(338,62,'PC 2: Add',cls='mono')
b += box(28,84,95,131,'dashed')+box(34,170,83,38)+tx(76,195,'5',cls='mono',anchor='middle')
b += box(184,84,95,131,'dashed')+box(190,170,83,38)+tx(232,195,'5',cls='mono',anchor='middle')+box(190,127,83,38)+tx(232,152,'2',cls='mono',anchor='middle')
b += box(340,84,95,131,'dashed')+box(346,170,83,38)+tx(388,195,'7',cls='mono',anchor='middle')+arrow(128,143,177,143)+arrow(283,143,333,143)
b += tx(76,239,'push 5',cls='sub',anchor='middle')+tx(232,239,'push 2',cls='sub',anchor='middle')+tx(388,239,'pop 2; push 7',cls='sub',anchor='middle')+tx(16,276,'Constant pool: index 0 = 5, index 1 = 2.',cls='sub')
add('12/07','vm-stack-add','Bytecodes change the value stack','The teaching VM executes Constant(0) at bytecode index 0 to push 5, Constant(1) at index 1 to push 2, then Add at index 2 to pop both values and push 7. The dashed outlines are the stack with its top above the older value.',b,298,
'The\n`if`/`else` structure you wrote in Lua has become two jumps and a layout — the\ncompiler kept the meaning and threw away the shape.',
'The first three bytecodes of the listed program copy constants 5 and 2 onto the stack, then replace them with their sum, 7.',
'Adds the stack’s actual changing contents beside the worked bytecode listing and representation explanation.',
['bytecode 0 Constant(0) pushes pool[0] = 5','bytecode 1 Constant(1) pushes pool[1] = 2','bytecode 2 Add pops 2 and 5 and pushes 7','older stack value drawn below newer value'])

# Sampling and diagnosis are separate from the guarded game action.
b = tx(16,57,'Sample 1',cls='strong')+circle(46,86,13,'open')+path('M42 76V88M42 94V96')+arrow(64,86,100,86)+box(108,63,210,49)+tx(213,94,'NeedsAnotherSample',cls='mono',anchor='middle')
b += tx(16,148,'Signal repeats',cls='strong')+circle(46,179,13,'open')+path('M42 168V180M42 187V189')+arrow(64,179,101,179)+box(108,155,210,49)+tx(213,187,'NeedsDiagnosis',cls='mono',anchor='middle')
b += arrow(323,180,346,180)+tx(328,143,'explained',cls='sub')+box(354,155,110,49)+tx(409,187,'Baseline',cls='strong',anchor='middle')+tx(16,249,'An explained sample returns to the baseline.',cls='sub')+tx(16,271,'Game-state validity is checked at its own boundary.',cls='sub')
add('13/03','signal-diagnosis','A signal earns a further question','One unusual fixture sample calls for NeedsAnotherSample. A repeated signal calls for NeedsDiagnosis. An explained signal can return to the baseline; environmental assessment does not replace validation at the state-changing game boundary.',b,293,
'A **signal** is measured data. An **assessment** interprets one or more signals.\nA **response** is an action such as recording a diagnostic event or refusing a\nspecific invalid command. Combining all three into one hidden boolean makes it\nhard to discover false positives and impossible to explain the decision.',
'One unusual sample prompts another measurement. A repeated signal prompts diagnosis; the game’s state-changing boundary still enforces its own rules.',
'Depicts the concrete fixture’s repeat/diagnose path beside the paragraph separating signal, assessment and response.',
['one unusual signal → NeedsAnotherSample','repeated signal → NeedsDiagnosis','explained fixture signal → Baseline','environment observations do not authorize a game action'])

# Split the actual 32-bit word into the seven bits that wrap and the other 25.
xor_value = 100 ^ 0x5A3C96E1
rotated = ((xor_value << 7) | (xor_value >> 25)) & 0xFFFFFFFF
bit_word = f'{xor_value:032b}'
upper7, lower25 = bit_word[:7], bit_word[7:]
assert f'{rotated:032b}' == lower25 + upper7
b = tx(16,58,'100 XOR 0x5A3C96E1 = 0x5A3C9685',cls='mono')+tx(16,91,'high 7 bits',cls='sub')+tx(145,91,'remaining 25 bits',cls='sub')
b += box(16,105,98,38,'hatch',0)+tx(65,129,upper7,cls='mono halo',anchor='middle')+box(114,105,350,38,'box',0)+tx(289,129,lower25,cls='mono',anchor='middle')
b += path('M288 147L190 187','line',True)+path('M65 148C65 170 416 166 416 187','line',True)+tx(16,174,'rotate left 7',cls='sub')
b += box(16,195,350,38,'box',0)+tx(191,219,lower25,cls='mono',anchor='middle')+box(366,195,98,38,'hatch',0)+tx(415,219,upper7,cls='mono halo',anchor='middle')
b += tx(16,263,'Stored: 0x1E4B42AD · bytes AD 42 4B 1E',cls='mono')+tx(16,288,'Rotate right 7, then XOR the key, to recover 100.',cls='sub')
add('13/04','rotate-seven-bits','The high seven bits wrap to the low end','For value 100 and key 0x5A3C96E1, XOR produces 0x5A3C9685. Rotating its 32 bits left by seven moves the high seven bits to the low end, giving 0x1E4B42AD stored as little-endian bytes AD 42 4B 1E. The inverse recovers 100.',b,311,
'This “reverse order, invert each step” rule also helps when disassembly shows a\nlonger composition.',
'The lesson’s 100/key example: the high seven XOR-result bits wrap to the low end. Decode reverses the rotation before applying the same XOR key.',
'Shows real bit movement beside the inverse-order explanation, previewing the exact worked example immediately below.',
['value 100 = 0x00000064','key 0x5A3C96E1',{'xor_result':hex(xor_value),'high_7_bits':upper7,'remaining_25_bits':lower25,'rotate_left_7':hex(rotated)},'little-endian stored bytes AD 42 4B 1E','rotate_right(7) then XOR key recovers 100'])

# Removal waits for the illustrated active callbacks to drain to zero.
b = tx(16,59,'Block new callback work',cls='strong')+path('M16 88H101','line',True)+path('M111 72V103')+cross(111,87,8)+tx(144,91,'existing calls may still return',cls='sub')
b += box(16,122,138,74)+circle(52,153,8,'open')+circle(87,153,8,'open')+tx(85,185,'2 active',cls='sub',anchor='middle')+arrow(160,158,194,158)
b += box(202,122,95,74)+circle(249,153,8,'open')+tx(249,185,'1 active',cls='sub',anchor='middle')+arrow(301,158,335,158)+box(342,122,122,74)+tx(403,156,'0 active',cls='strong',anchor='middle')+tx(403,180,'callbacks drained',cls='sub',anchor='middle')
b += tx(16,235,'Restore exact bytes, then release owned resources.',cls='sub')+tx(16,258,'Zero is necessary; the other hook contracts still apply.',cls='sub')
add('13/05','hook-callback-drain','Keep the hook alive while callers drain','In a separate illustrative drain, new callback work is blocked while active calls fall from 2 to 1 to 0. Only after active callbacks reach zero can removal restore the exact site bytes and release the hook resources.',b,280,
'There should be no `HalfPatched` state visible to executing threads.',
'A separate drain example counts 2 → 1 → 0 active callbacks. Resources remain alive until callers drain; removal then restores the exact original bytes.',
'Visualizes the lifetime/removal dependency immediately after the authored installation/removal state machine.',
['separate illustrative callback counts 2, 1, 0','block new callback work','active callbacks reaching zero is necessary, not sufficient; all other hook contracts still apply','restore exact bytes before releasing resources'])

# Four-byte adjacent fields and the access that relates them.
b = tx(16,61,'Candidate object reached through rcx',cls='strong')+tx(16,94,'0x138 … 0x13B',cls='mono')+tx(263,94,'0x13C … 0x13F',cls='mono')
b += cells(16,109,['H','H','H','H'],w=56,h=43)+cells(263,109,['M','M','M','M'],w=50,h=43)
b += tx(128,178,'health · 4 bytes',cls='strong',anchor='middle')+tx(363,178,'max health · 4 bytes',cls='strong',anchor='middle')
b += path('M128 190V224H363V190')+tx(245,218,'clamp ties the two fields',cls='sub',anchor='middle')+tx(245,257,'0 ≤ H ≤ M',cls='mono',anchor='middle')+tx(16,291,'These offsets are candidates for one exact build.',cls='sub')
add('13/06','health-layout-relation','Field evidence includes relationships','The candidate object has four-byte health at 0x138 through 0x13B and max health at 0x13C through 0x13F. A clamp relates their symbolic values H and M by zero less than or equal to H less than or equal to M. These offsets belong to one exact build.',b,312,
'The relationship `0 <= health <= max_health` is stronger than “both numbers\nlook reasonable.” The clamp that stores health at `0x138` reads its upper bound\nfrom `0x13C`, so one instruction sequence ties the two candidates together and\neach supports the other.',
'H and M stand for unknown field values. Their adjacent four-byte ranges and the clamp relation provide evidence for health and max-health in this exact build.',
'Makes the exact offset/width/relationship evidence visible directly after the offset-table explanation.',
['health candidate at 0x138, width 4; range 0x138–0x13B','max-health candidate at 0x13C, width 4; range 0x13C–0x13F','symbolic values H and M, not fabricated memory contents','relationship 0 <= H <= M','one exact build only'])

# IDs connect events across intervening messages.
b = tx(16,58,'seq',cls='mono')+tx(65,58,'corr',cls='mono')+tx(129,58,'event',cls='mono')
rows=[(41,7,'Denied: ValueOutOfRange'),(42,8,'Allowed'),(43,7,'Effect: changed, gen 13'),(44,8,'Effect: changed, gen 14')]
for i,(seq,corr,event) in enumerate(rows):
    y=77+i*47
    b += box(16,y,404,36,'hatch' if corr==7 else 'box',0)+box(16,y,104,36,'box',0)+tx(25,y+24,str(seq),cls='mono')+tx(75,y+24,str(corr),cls='mono')+tx(130,y+24,event,cls='sub halo' if corr==7 else 'sub')
b += path('M425 94H443V188H425','line')+path('M425 141H459V235H425','dashed')+tx(16,295,'corr 7 changed state after denial. Adjacency hid it.',cls='sub')
add('13/07','correlated-log-rows','Pair the effect by correlation ID','Sequence 41 denies correlation 7; sequence 42 allows correlation 8. Sequence 43 records changed state for correlation 7 at generation 13, and sequence 44 records a change for correlation 8 at generation 14. Matching IDs exposes correlation 7 changing after denial.',b,317,
'Now pair by correlation ID instead. The effect at 43 belongs to action 7, and\naction 7 was **denied**. Something changed state after a refusal, which is the\nexact contradiction this lesson exists to catch, and the naive reading walked\nstraight past it.',
'The solid connector pairs corr 7 across the intervening corr 8 decision. That action was denied, yet its effect changed state at generation 13.',
'Connects the exact four log rows by identity beside the paragraph exposing the hidden contradiction.',
['seq 41 corr 7 denied ValueOutOfRange','seq 42 corr 8 allowed','seq 43 corr 7 changed=true generation=13','seq 44 corr 8 changed=true generation=14','same-ID pairing; no causal inference from temporal adjacency'])

# A modular wrap yields a small sum without making the starting range valid.
b = tx(16,61,'offset = 0xFFFF_FFFF_FFFF_FFFC',cls='mono')+path('M20 99H461','line',True)+tx(23,88,'near 2⁶⁴',cls='sub')+tx(426,88,'wrap',cls='sub')
b += path('M443 104C490 154 17 159 30 198','line',True)+tx(179,143,'+16 wraps to 12',cls='strong')+path('M20 215H461')+circle(52,215,6,'open')+tx(52,246,'12',cls='mono',anchor='middle')+tx(17,241,'0',cls='mono')+tx(390,195,'4096',cls='mono')
b += tx(145,242,'12 ≤ 4096: weak check passes',cls='sub')+tx(16,282,'checked_add returns None: reject the range.',cls='strong')
add('13/09','wrapped-range-end','The small sum hides a wrapped address','On the lesson’s 64-bit example, offset 0xFFFFFFFFFFFFFFFC plus length 16 wraps modulo 2 to the power 64 to 12. Although 12 is within 4096, the start is invalid for that region. checked_add reports overflow instead.',b,305,
'Nothing overflowed *visibly*. In a release build there is no panic, no warning,\nand the comparison is perfectly true. The read then starts at an address near\nthe top of the address space.',
'The lesson’s 64-bit sum wraps to 12. That small end passes the weak 4096 comparison while hiding an invalid start; checked_add refuses the overflow.',
'Shows the wrap and misleading comparison beside the explanation of the exact arithmetic failure.',
['64-bit offset = 0xFFFFFFFFFFFFFFFC = usize::MAX - 3','length = 16','sum modulo 2^64 = 12','region_size = 4096','checked_add overflows and returns None','line schematic, not proportional across 2^64'])

# The returned byte count identifies a prefix of the owned eight-byte buffer.
b = tx(16,61,'ReadFile asks for 8 bytes',cls='strong')+cells(16,81,['·']*8,w=56,h=35)+tx(16,144,'No event yet: IRP parked, STATUS_PENDING',cls='sub')
b += path('M29 156V186H140','line',True)+tx(151,191,'key interrupt → fill buffer',cls='sub')+cells(16,214,['K','E','·','·','·','·','·','·'],w=56,h=35,classes={0:'hatch',1:'hatch'})
b += path('M18 255V265H126V255')+tx(16,293,'Complete the IRP: 2 bytes returned; 6 unused.',cls='sub')
add('14/02','pending-read-buffer','A pending read finishes with a byte count','The toy keypad read supplies an eight-byte buffer. With no key event, the driver parks the IRP and reports STATUS_PENDING. A key interrupt later supplies two event bytes; the driver completes the IRP with a returned count of two, leaving six buffer bytes unused.',b,315,
'The driver\'s **dispatch routine** is the function the I/O manager calls with a\nnew IRP. If the dispatch routine can finish at once, it **completes** the IRP,\nhanding it back with a status and a byte count. If it has to wait for the\nhardware, it keeps the IRP, returns `STATUS_PENDING`, and completes the IRP\nlater, from the code that runs when the device interrupts. Meanwhile the\nprogram\'s thread waits inside `ReadFile`.',
'The toy read owns eight bytes of capacity. Only two event bytes are returned after the interrupt; K and E mark the event-byte prefix, not literal hardware values.',
'Shows pending-to-complete behavior and capacity versus returned length beside the dispatch routine explanation.',
['toy keypad only','ReadFile buffer capacity 8 bytes','STATUS_PENDING while no key event','interrupt completes IRP with 2 bytes returned','6 capacity bytes unused','K and E are symbolic event-byte markers, not fabricated device data'])

# Serial data and parallel control use different wiring.
b = tx(16,61,'TDI',cls='mono')+arrow(52,57,88,57)+box(94,76,137,118)+tx(162,100,'chip A',cls='strong',anchor='middle')+cells(109,119,['·','·','·'],w=35,h=32)
b += box(284,76,137,118)+tx(352,100,'chip B',cls='strong',anchor='middle')+cells(299,119,['·','·','·'],w=35,h=32)
b += path('M89 57H127V112','line',True)+path('M214 134H260V57H317V112','line',True)+path('M404 134H446V58','line',True)+tx(437,47,'TDO',cls='mono')
b += path('M17 232H392M163 232V199M352 232V199','line')+tx(16,268,'TCK and TMS reach both chips in parallel.',cls='sub')+tx(16,290,'Captured data moves through the cells in series.',cls='sub')
add('14/04','jtag-series-controls','Data is serial; control reaches every chip','In the schematic scan chain, debugger TDI feeds chip A, chip A output feeds chip B, and chip B sends TDO back. TCK and TMS branch to both chips in parallel while captured data shifts through the cells in series.',b,312,
'Every chip receives the same TCK and TMS, while the data runs in series, from\nthe debugger\'s TDI through each chip in turn and back from the last chip\'s TDO:',
'Schematic cells show the routing: TDI → chip A → chip B → TDO. A shared control bus brings TCK and TMS to both chips.',
'Depicts the actual serial-versus-parallel wiring directly after the four-wire scan-chain explanation.',
['schematic scan chain, not a live device setup','TDI through chip A then chip B to TDO','TCK and TMS reach both chips in parallel','cell count is symbolic; no captured bit pattern asserted'])

# Two separate stores require a copy; one shared store has two readers.
b = tx(16,61,'PC: separate memories',cls='strong')+box(16,81,100,40)+tx(66,107,'CPU',cls='strong',anchor='middle')+box(16,164,100,40)+tx(66,190,'system RAM',cls='sub',anchor='middle')+arrow(66,126,66,158)
b += box(167,81,100,40)+tx(217,107,'GPU',cls='strong',anchor='middle')+box(167,164,100,40)+tx(217,190,'video RAM',cls='sub',anchor='middle')+arrow(217,126,217,158)+arrow(120,182,160,182)+tx(144,148,'copy',cls='sub',anchor='middle')
b += box(304,73,160,82,'dashed')+tx(384,94,'console SoC',cls='sub',anchor='middle')+box(314,108,62,32)+tx(345,130,'CPU',anchor='middle')+box(391,108,62,32)+tx(422,130,'GPU',anchor='middle')
b += arrow(345,159,345,184)+arrow(422,159,422,184)+box(304,190,160,60)+tx(384,215,'shared RAM',cls='strong',anchor='middle')+cells(323,222,['·','·','·','·'],w=31,h=23)
b += tx(16,288,'The console GPU reads the buffer the CPU wrote.',cls='sub')
add('14/05','unified-memory-buffer','One shared buffer has two users','The lesson’s PC model uses CPU system RAM and GPU video RAM with a copy between them. The console model puts CPU and GPU on one SoC and lets both use the same shared-memory buffer.',b,310,
'reads the very same bytes. This design is called **unified memory**.',
'The lesson’s simplified PC route copies into video RAM. In the unified-memory console route, CPU and GPU use one shared buffer.',
'Pictures the memory ownership/copy distinction directly after the unified-memory paragraph.',
['simplified PC system RAM and separate GPU video RAM','copy between separate stores','console SoC contains CPU and GPU','one shared-memory buffer','no additional console hardware specifications'])

# Two byte fetches change PC and A, while the instruction bytes stay put.
b = tx(16,60,'Memory',cls='strong')+tx(172,60,'0x04',cls='mono')+tx(282,60,'0x05',cls='mono')+tx(391,60,'0x06',cls='mono')+cells(158,77,['03','05','next'],w=102,h=40)
b += tx(16,140,'PC 0x04',cls='mono')+path('M126 135H208V122','line',True)+tx(170,150,'fetch opcode',cls='sub')+path('M310 123V172H404','line',True)+tx(16,187,'A = 10',cls='mono')+tx(204,186,'ADD #5',cls='mono')+tx(401,186,'A = 15',cls='mono',anchor='middle')
b += arrow(112,180,184,180)+arrow(276,180,346,180)+tx(16,232,'PC advances twice: 0x04 → 0x05 → 0x06.',cls='sub')+tx(16,259,'Two instruction-byte reads cost 2 toy cycles.',cls='sub')
add('14/06','emulator-add-fetch','Two reads execute ADD #5','The toy emulator fetches opcode 03 at 0x04 and operand 05 at 0x05. ADD #5 changes A from 10 to 15, advances PC from 0x04 to 0x06 and costs two cycles. The instruction bytes remain in memory.',b,282,
'Nothing in memory marks where one instruction ends and the next begins. The CPU\nknows each instruction\'s length from its opcode, and fetching the bytes moves PC\npast them, so PC lands on the next instruction without any extra work.',
'The made-up CPU reads 03 and 05, computes 10 + 5 = 15, and leaves PC at 0x06. Each fetched byte costs one toy cycle.',
'Shows byte fetches, register changes and the next address beside the instruction-length explanation.',
['toy opcode/operand bytes 03 05 at 0x04/0x05','ADD #5','A 10 → 15','PC 0x04 → 0x05 → 0x06','2 fetched bytes = 2 toy cycles','instruction memory unchanged'])

# A single permission bit separates the two teaching leaf bytes.
b = tx(16,60,'Ring 3 access',cls='strong')+tx(214,60,'bits 7 … 0',cls='sub')+tx(16,98,'0x67',cls='mono')+cells(116,73,list('01100111'),w=42,h=38,classes={5:'hatch'})
b += tx(16,170,'0x63',cls='mono')+cells(116,145,list('01100011'),w=42,h=38,classes={5:'hatch'})+tx(358,129,'bit 2',cls='sub',anchor='middle')
b += tx(16,135,'user = 1: permitted by this leaf',cls='sub')+tx(16,208,'user = 0: refused from ring 3',cls='sub')+tx(16,249,'Other levels still contribute to the full access check.',cls='sub')
add('14/07','page-user-bit','One bit changes the leaf’s permission','The teaching page-table leaf byte 0x67 is binary 01100111 with user bit 2 set. The byte 0x63 is 01100011 with bit 2 clear, so it refuses ring 3. Higher page-table levels also contribute to a full access decision.',b,272,
'`0x67` − `0x63` = 4, and 4 = 2², so exactly one bit differs between these two\n*example leaf entries*: bit 2. A kernel page can be present, writable, and\nrecently used, and still refuse access from ring 3. In a real page-table walk,\nthe processor also considers permissions in the entries at higher levels; a\nsingle leaf byte is a teaching example, not a complete access decision.',
'The highlighted position is bit 2: 0x67 permits user access at this leaf, while 0x63 clears that permission. A full walk also checks higher levels.',
'Makes the exact one-bit change visible beside the paragraph limiting this leaf-byte teaching example.',
['0x67 = 01100111','0x63 = 01100011','bit 2 differs: user flag 1 versus 0','0x67 - 0x63 = 4 = 2^2','higher page-table permissions still apply'])

# The field widths are proportional to the actual bit compartments.
b = tx(16,60,'31 … 16',cls='mono')+tx(254,60,'15–14',cls='sub',anchor='middle')+tx(352,60,'13 … 2',cls='mono',anchor='middle')+tx(450,60,'1–0',cls='sub',anchor='middle')
b += box(16,76,224,40)+box(240,76,28,40,'hatch',0)+box(268,76,168,40)+box(436,76,28,40,'hatch',0)+tx(128,102,'device 0x8000',cls='mono',anchor='middle')+tx(352,102,'function 0x801',cls='sub',anchor='middle')
b += tx(16,149,'device << 16',cls='mono')+tx(270,149,'0x8000_0000',cls='mono')+tx(16,176,'read access 1 << 14',cls='mono')+tx(270,176,'0x0000_4000',cls='mono')
b += tx(16,203,'function 0x801 << 2',cls='mono')+tx(270,203,'0x0000_2004',cls='mono')+tx(16,230,'buffered method 0',cls='mono')+tx(270,230,'0x0000_0000',cls='mono')+path('M265 242H464')+tx(270,269,'0x8000_6004',cls='mono')
add('14/08','ioctl-packed-fields','Four fields form the control code','The toy keypad control code packs device type 0x8000 into bits 31 to 16, read access 1 into bits 15 to 14, function 0x801 into bits 13 to 2, and buffered method 0 into bits 1 to 0. The shifted contributions sum to 0x80006004.',b,291,
'`0x8000_0000` + `0x4000` + `0x2004` = `0x8000_6004`. The top half, `0x8000`, is\nthe device type, and the low half, `0x6004`, holds the other three fields. Here\nare its sixteen bits, one byte at a time:',
'The widths represent 16, 2, 12 and 2 bits. Shifting each field into its compartment produces the toy keypad’s 0x8000_6004 get-status code.',
'Shows the exact packed-field widths and shifted contributions beside the sum that introduces the bit strips.',
['device 0x8000 in bits 31–16, 16 bits','access 1/read in bits 15–14, 2 bits','function 0x801 in bits 13–2, 12 bits','method 0/buffered in bits 1–0, 2 bits','(0x8000 << 16) | (1 << 14) | (0x801 << 2) | 0 = 0x80006004','diagram widths proportional to field widths'])

# Cycle segments are proportional to the worked program's costs.
b = tx(16,59,'LDX',cls='sub')+tx(83,59,'first pass',cls='strong')+tx(259,59,'second pass',cls='strong')+tx(413,59,'ending',cls='sub')
segments=[(2,'2'),(12,'12'),(11,'11'),(4,'4')]
xp=16
for i,(n,label) in enumerate(segments):
    b += box(xp,77,n*14,41,'hatch' if i%2 else 'box',0)+tx(xp+n*7,104,label,cls='mono halo' if i%2 else 'mono',anchor='middle')
    for tick in range(1,n): b += path(f'M{xp+tick*14} 110V117')
    xp += n*14
b += tx(16,151,'2 + 12 + 11 + 4 = 29 cycles',cls='mono')+cells(32,178,['10'],w=90,h=38)+cells(165,178,['15'],w=90,h=38)+cells(298,178,['20'],w=90,h=38)+arrow(127,197,158,197)+arrow(260,197,291,197)
b += tx(77,241,'initial gold',cls='sub',anchor='middle')+tx(210,241,'after pass 1',cls='sub',anchor='middle')+tx(343,241,'after pass 2',cls='sub',anchor='middle')+tx(16,278,'The ending writes display 20 and halts.',cls='sub')
add('14/11','emulator-cycle-budget','One complete run costs 29 cycles','A proportional cycle bar shows 2 cycles for LDX, 12 for the first loop pass, 11 for the second and 4 for display plus halt. Gold changes from 10 to 15 to 20; the display ends at 20 after 29 cycles.',b,300,
'2 + 12 + 11 + 4 = 29. When the machine stops, it looks like this:',
'The bar uses one equal-width unit per toy cycle. Two loop passes take gold from 10 to 15 to 20; display and halt finish the 29-cycle run.',
'Visualizes the exact accumulated costs beside the full-run arithmetic and final-state explanation.',
['LDX 2 cycles','first loop 3+2+3+1+3 = 12 cycles','second loop 3+2+3+1+2 = 11 cycles','STA display 3 + HLT 1 = 4 cycles','total 29 cycles','gold 10 → 15 → 20','display 20','bar segment widths proportional to 2:12:11:4'])

# Sightline geometry changes disclosure, not merely drawing.
b = tx(20,61,'Hidden',cls='strong')+tx(260,61,'Visible after moving',cls='strong')+box(16,75,217,173,'dashed')+box(247,75,217,173,'dashed')
for dx in [0,231]:
    b += circle(43+dx,199,7,'open')+tx(26+dx,225,'observer',cls='sub')+box(119+dx,163,11,52,'hatch',0)
b += circle(210,197,7)+tx(178,224,'enemy',cls='sub')+path('M53 197H201','dashed')+cross(125,197,9)
b += circle(441,104,7)+tx(385,93,'enemy',cls='sub')+arrow(452,197,452,116,'dashed')+path('M284 197L432 108','line')
b += tx(16,278,'Client receives no position',cls='sub')+tx(247,278,'Client receives position',cls='sub')
add('15/02','server-visibility-disclosure','Visibility changes what is sent','In the toy wall example, the server knows an enemy position but withholds it when the wall blocks the observer’s sightline. When the enemy moves above the wall and the sightline clears, the position enters this client’s observation.',b,299,
'In the toy picture, a wall blocks the observer\'s sightline. The server\nknows the enemy\'s position but sends none to this client. The enemy moves\nabove the wall. Only after the new sightline clears the wall does its\nposition enter the client\'s observation.',
'Both panels are schematic views of the toy’s same rule: hidden means no position is sent; a clear sightline admits the position to this client’s observation.',
'Adds a static disclosure comparison immediately after the paragraph describing the toy wall and moving enemy.',
['schematic wall geometry, no numeric coordinates asserted','server knows enemy position in both states','blocked sightline → withhold position','clear sightline → include position in observation','not only a hidden screen label'])

# Exactly 122 dots: 11 true flags and 111 false flags, nine players per dot.
b = tx(16,61,'Flagged group: 1,098 players',cls='strong')+circle(23,84,5)+tx(36,89,'99 cheating',cls='sub')+circle(216,84,5,'open')+tx(230,89,'999 honest',cls='sub')
for i in range(122):
    b += circle(23+(i%16)*28,115+(i//16)*18,5,'dot' if i<11 else 'open')
b += tx(16,278,'Each dot = 9 flagged players. 99 ÷ 1,098 ≈ 9%.',cls='sub')
add('15/05','base-rate-flagged-dots','False flags dominate this example','The lesson’s hypothetical flagged group contains 99 cheating players and 999 honest players, 1,098 total. Exactly 11 filled dots represent the 99 true flags and 111 open dots represent the 999 false flags, with nine players per dot.',b,300,
'The flagged group therefore contains `99 + 999 = 1,098` people. Only\n`99 ÷ 1,098 ≈ 0.0902`, or about 9 percent, are cheating.',
'The hypothetical flagged group has 11 filled dots and 111 open dots, with nine people per dot. The picture counts flags, not the whole 100,000-player population.',
'Makes the exact false-flag population visible beside the 9-percent precision arithmetic.',
['hypothetical population 100,000; 100 cheating, 99,900 honest','catch rate 99% → 99 true flags','false-flag rate 1% → 999 false flags','flagged total 1,098','9 players per dot','11 filled + 111 open = 122 dots','99 / 1,098 ≈ 9.0164% precision'])

# Three forwarded reports retain one origin identifier.
b = circle(72,135,32,'open')+tx(72,141,'event A',cls='strong',anchor='middle')
for y,label in [(63,'game log'),(123,'plugin forward'),(183,'player reference')]:
    b += path(f'M108 135L171 {y+22}','line',True)+box(179,y,164,44)+tx(261,y+27,label,cls='sub',anchor='middle')+tx(358,y+27,'A',cls='mono')
b += path('M382 64H393V226H382')+tx(16,271,'3 notifications share origin A → 1 observed event.',cls='sub')+tx(16,294,'A later event B makes 2 distinct events.',cls='sub')
add('15/06','event-origin-copies','Three notifications keep one origin','The game log, plugin forward and player reference all describe toy event A. Three notifications still represent one event. A later distinct event B raises the event count to two, without proving statistical independence.',b,316,
'A later event B adds another observation. Now there are two distinct\nevents. Distinct does not automatically mean statistically independent:\nboth might have been affected by the same game bug or network condition.',
'Every forwarded copy retains origin A. Count one observed event, then two when B occurs; distinct events can still share causes or errors.',
'Depicts report propagation and unique-event counting beside the event-B qualification.',
['toy origin event A','game log + plugin forward + player reference = 3 notifications','all share origin A = 1 event','later B = 2 distinct events','distinct does not prove statistically independent'])

# Duration differs while privilege during the active span can remain equal.
b = tx(130,62,'boot',cls='sub')+tx(245,62,'game starts',cls='sub')+tx(372,62,'game ends',cls='sub')+path('M138 73V233M272 73V233M415 73V233','dashed')
b += tx(16,110,'boot-managed',cls='sub')+box(138,90,313,36,'hatch',0)+arrow(454,108,464,108)+tx(16,183,'session-managed',cls='sub')+box(272,163,143,36,'hatch',0)
b += path('M464 76V218','dashed')+tx(464,238,'observation window ends',cls='sub',anchor='end')
b += tx(16,260,'Illustrative active spans; both can run in kernel mode.',cls='sub')+tx(16,281,'Duration describes when, privilege describes access.',cls='sub')
add('15/08','protection-active-spans','Lifetime and privilege are separate','Illustrative boot-managed protection begins at boot and continues beyond game end, reaching the right boundary of the observation window. Session-managed protection starts with the game and stops when it ends. Both may have kernel privilege while active; these are not measured product timelines.',b,303,
'The bars preserve the period each component was active. Ending a\nsession-managed monitor when the game stops does not mean it had lower\nprivilege while the game was running.',
'Illustrative lifetimes: boot-managed protection continues beyond game end, while session-managed protection stops there. Duration and kernel privilege remain separate; the right boundary ends only the observation window.',
'Adds the static active-span comparison beside the paragraph distinguishing duration from privilege, without restating volatile product claims.',
['illustrative boot-managed versus session-managed spans','boot, game start and game end are schematic events','only session-managed protection stops at game end; boot-managed span continues beyond it','right boundary ends the observation window, not boot-managed protection','both components may have kernel privilege while active','no real product durations, rates or rankings claimed'])

# A committed pickup record turns a retry into a returned result.
b = circle(51,113,20,'open')+tx(51,118,'C',cls='strong',anchor='middle')+arrow(77,113,118,113)+box(126,69,218,111)+tx(139,92,'Server-owned pickup',cls='strong')+tx(139,122,'consume C · score 0 → 1',cls='sub')+tx(139,151,'store committed result',cls='sub')
b += arrow(350,119,392,119)+doc(399,86,'result 1',65,59)+path('M45 139V223H233V185','dashed',True)+tx(51,207,'same C delivered again',cls='sub')
b += path('M348 147H375V250H231','line',True)+tx(16,275,'Return the stored result: score stays 1.',cls='strong')
add('15/09','pickup-retry-result','A retry returns the committed result','The toy server starts at score zero with coin C. The first valid pickup consumes C and commits score one. A repeated delivery of that same pickup returns the stored result and keeps the score at one instead of rewarding it again.',b,297,
'The toy server owns one coin, labelled C, and begins at score zero. The\nfirst permitted pickup consumes C and adds one point: `0 + 1 = 1`. A later\ndelivery repeats that pickup. The server finds its committed result and\nreturns it without adding another point.',
'The first pickup commits consumption and score 1 together. A retry carrying the same identity returns that committed result, so score remains 1.',
'Shows the exact coin/score/retry mechanism immediately beside its toy explanation.',
['coin C','initial score 0','first permitted pickup consumes C and changes score 0 → 1','committed result recorded','duplicate pickup returns same result; score remains 1'])

# The strict image audit found three further lessons hidden by Rust macro syntax.
# A component's fault scope follows the authority it holds.
b = tx(16,58,'User mode · ring 3',cls='strong')+box(16,72,128,83)+box(176,72,128,83)+box(336,72,128,83)
b += tx(80,99,'process A',cls='sub',anchor='middle')+tx(240,99,'process B',cls='sub',anchor='middle')+tx(400,99,'process C',cls='sub',anchor='middle')
b += cells(32,116,['·','·','·'],w=32,h=26)+cells(192,116,['·','·','·'],w=32,h=26)+cells(352,116,['·','·','·'],w=32,h=26)+cross(80,128,9)
b += path('M16 182H464','dashed')+box(16,222,448,48)+tx(240,251,'mappings · devices · processes · security',cls='sub',anchor='middle')+tx(16,284,'Kernel / drivers · ring 0',cls='strong')
b += arrow(80,218,80,162)+arrow(240,218,240,162)+arrow(400,218,400,162)+tx(16,307,'Ordinary user fault: usually one process.',cls='sub')+tx(16,329,'Kernel fault: potentially the whole system.',cls='sub')
add('11/05','kernel-fault-scope','Fault scope follows authority','Three user-mode processes have separately bounded memory. A user-mode fault usually ends one process. Kernel and driver authority spans mappings, devices, processes and security, so a kernel fault can reach the whole system. This is a conceptual boundary drawing, not a driver experiment.',b,347,
'A user-mode crash normally ends one process. A bad kernel pointer can crash the\nentire computer or corrupt data belonging to any process. Moving code into a driver\ntherefore enlarges both its authority and the damage caused by a bug. “More\nprivilege” is not the same as “better engineering.”',
'The process boxes mark user-mode fault containment. Kernel authority spans system-wide resources, so its fault scope can cross those boundaries.',
'Illustrates the paragraph’s concrete one-process versus whole-system fault scope, keeping this lesson’s read-only/conceptual framing.',
['user mode ring 3','kernel and drivers ring 0','processes A/B/C are symbolic examples, not real process identities','ordinary user fault usually ends one process','kernel fault may affect mappings, devices, process state and security system-wide'])

# Translate the second virtual page instead of assuming neighbouring physical RAM.
b = tx(16,61,'32 bytes at virtual …1234_0FF8',cls='mono')+box(16,78,112,38)+tx(72,102,'8 bytes',cls='strong',anchor='middle')+box(128,78,336,38)+tx(296,102,'24 bytes',cls='strong',anchor='middle')
b += tx(132,140,'virtual page boundary',cls='sub')+arrow(72,119,72,155)+arrow(354,119,354,155)
b += box(16,163,194,68)+tx(28,188,'0x0512_3FF8',cls='mono')+tx(28,212,'end of first physical page',cls='sub')+box(250,163,214,68)+tx(262,188,'0x0091_A000',cls='mono')+tx(262,212,'start of next mapped page',cls='sub')
b += path('M110 236V269H249M357 236V269H249','line')+tx(16,304,'Join the copied 8 + 24 bytes in an owned buffer.',cls='sub')
add('11/07','cross-page-read','A page boundary needs another translation','The lesson’s 32-byte read begins at virtual 0x00007FF612340FF8. Eight bytes remain in its first page, beginning physically at 0x05123FF8. The next 24 bytes come from the next virtual page mapped to physical 0x0091A000, then the reader joins both copies in an owned buffer.',b,326,
'This is why the public method returns a new byte vector rather than a borrowed slice of one physical region.',
'The worked read splits into 8 bytes at physical 0x0512_3FF8 and 24 at 0x0091_A000. The next virtual page needs its own translation before copying.',
'Shows the exact 32-byte/8-byte page split and noncontiguous physical destinations after the retranslation algorithm’s owned-buffer explanation.',
['virtual start 0x0000_7FF6_1234_0FF8','32 requested bytes','offset 0xFF8; 0x1000 - 0xFF8 = 8 bytes in first page','first physical page base 0x0512_3000 + 0xFF8 = 0x0512_3FF8','next virtual page at 0x0000_7FF6_1234_1000','next physical page base 0x0091_A000','32 - 8 = 24 bytes in next page','request bar lengths proportional to 8:24'])

# Reset-time copy and zeroing give writable statics their first valid values.
b = box(16,61,191,184)+tx(28,85,'Flash · 256 KiB',cls='strong')+tx(28,109,'0x0000_0000',cls='mono')+tx(28,129,'… 0x0003_FFFF',cls='mono')
b += box(29,160,164,49)+tx(111,188,'.data initial = 7',cls='sub',anchor='middle')+arrow(212,184,267,184)+tx(225,165,'copy',cls='sub')
b += box(278,61,186,234)+tx(290,85,'SRAM · 64 KiB',cls='strong')+tx(290,109,'0x2000_0000',cls='mono')+tx(290,129,'… 0x2000_FFFF',cls='mono')
b += box(291,160,160,49)+tx(371,188,'.data counter = 7',cls='sub',anchor='middle')+box(291,239,160,39)+tx(371,264,'.bss counter = 0',cls='sub',anchor='middle')
b += path('M232 243H286','line',True)+tx(17,257,'startup writes zeros',cls='sub')+tx(16,330,'Prepare the RAM ranges before entering Rust code.',cls='sub')
add('14/12','reset-data-bss','Reset prepares writable memory','In the lesson’s emulated Cortex-M3 board, flash has 256 KiB at 0x00000000 through 0x0003FFFF and SRAM has 64 KiB at 0x20000000 through 0x2000FFFF. Reset startup copies a .data counter initial value 7 from flash to RAM and fills a reserved .bss counter with zero before Rust uses either.',b,352,
'For example, a writable counter that must start at 7 needs both a working\nlocation in RAM and an initial value in the image. Startup copies the 7 before\nthe application uses the counter. A counter starting at zero needs a reserved\nRAM range, but the image need not carry a long run of zero bytes: startup can\nwrite the zeros. The linker and runtime agree on where these ranges begin and\nend. Local variables are separate; a compiler can keep them in registers or on\nthe stack as the program executes.',
'The emulated board’s flash stores the initial 7; startup copies it to the writable .data counter. The reserved .bss counter is filled with zero before the Rust entry point.',
'Draws the exact startup copy-versus-zero work beside the two writable-counter examples, with the lesson’s emulated address ranges.',
['emulated Cortex-M3 / LM3S6965EVB model','flash 256 KiB: 0x00000000–0x0003FFFF','SRAM 64 KiB: 0x20000000–0x2000FFFF','.data counter starts at 7 copied from flash','.bss counter starts at 0 filled by runtime','addresses name the emulated device, not the host process'])

# Independent arithmetic receipts; no lab code is executed.
assert 1000 + 500 - 300 == 1200
assert 1000 - 300 == 700
assert xor_value == 0x5A3C9685 and rotated == 0x1E4B42AD
assert int.from_bytes(bytes.fromhex('AD 42 4B 1E'),'little') == rotated
assert ((rotated >> 7) | ((rotated << 25) & 0xFFFFFFFF)) ^ 0x5A3C96E1 == 100
assert (((1 << 64) - 4) + 16) % (1 << 64) == 12
assert 0x67 - 0x63 == 1 << 2
assert (0x8000 << 16) | (1 << 14) | (0x801 << 2) == 0x80006004
assert 2 + (3+2+3+1+3) + (3+2+3+1+2) + 3 + 1 == 29
assert 99 // 9 == 11 and 999 // 9 == 111 and 11 + 111 == 122
assert 0x1000 - 0xFF8 == 8 and 32 - 8 == 24
assert 0x05123000 + 0xFF8 == 0x05123FF8
assert 0x0003FFFF + 1 == 256 * 1024
assert 0x2000FFFF - 0x20000000 + 1 == 64 * 1024
assert len(FIGURES) == 41
manifest = {
    'source_root': str(ROOT),
    'branch': 'codex/book-revision',
    'scope': 'Historical lesson path folders 8–15, only lessons previously lacking authored image markup',
    'total_placements': len(FIGURES),
    'new_original_cc0_svg_assets': len(FIGURES),
    'reused_assets': 0,
    'obstacles': [],
    'checks': {'all_svg_xml_parse':True,'exact_numeric_arithmetic_checked':True},
    'figures': FIGURES,
}
if args.manifest:
    args.manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Reproduced {len(FIGURES)} original CC0 SVGs; all XML and exact-arithmetic assertions pass.')
