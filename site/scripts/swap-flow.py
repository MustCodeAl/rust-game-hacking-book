#!/usr/bin/env python3
"""Replace an old <AnimatedFlow ... /> block in a lesson with a <Scene name="..." />.

usage (from site/):  python3 scripts/swap-flow.py 5/01:vertex-to-screen 7/02:rva-to-file-offset
Each argument is  <pages path without .mdx>:<scene name>  (the scene file is src/scenes/<name>.mjs).
It replaces the first AnimatedFlow in that lesson, drops the AnimatedFlow import when none are
left, and adds `import Scene from '../../../../components/Scene.astro';` after the other imports.
Then rebuild and look at the lesson. A scene name may appear once per page.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'docs' / 'pages'

for pair in sys.argv[1:]:
    page, name = pair.split(':')
    path = ROOT / f'{page}.mdx'
    s = path.read_text(encoding='utf-8')
    m = re.search(r'<AnimatedFlow\b', s)
    if not m:
        sys.exit(f'{path}: no AnimatedFlow left')
    end = re.search(r'\n/>|</AnimatedFlow>', s[m.start():])
    if not end:
        sys.exit(f'{path}: could not find the end of the AnimatedFlow block')
    block_end = m.start() + end.end()
    s = s[:m.start()] + f'<Scene name="{name}" />' + s[block_end:]
    if '<AnimatedFlow' not in s:
        s = re.sub(r"^import AnimatedFlow from '[^']+';\n", '', s, flags=re.M)
    if 'import Scene from' not in s:
        imports = list(re.finditer(r"^import .*?;\n", s, flags=re.M))
        if imports:
            last = imports[-1]
            s = s[:last.end()] + "import Scene from '../../../../components/Scene.astro';\n" + s[last.end():]
        else:
            front = re.match(r'^---\n.*?\n---\n', s, re.S)
            s = s[:front.end()] + "import Scene from '../../../../components/Scene.astro';\n\n" + s[front.end():]
    path.write_text(s, encoding='utf-8')
    print(f'{path.relative_to(ROOT)}: replaced {block_end - m.start()} characters with <Scene name="{name}" />')
