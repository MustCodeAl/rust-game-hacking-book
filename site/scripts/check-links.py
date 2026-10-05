#!/usr/bin/env python3
"""Check every internal link and #anchor in a built site.

usage (from site/):  python3 scripts/check-links.py dist
Prints "checked N pages, M broken" and the first 25 problems. Run it after every build.
"""
import re, sys, os
from pathlib import Path
from urllib.parse import urlsplit, unquote

DIST = Path(sys.argv[1]); BASE = '/rust-game-hacking-book'
pages = {}


def page_ids(p):
    if p not in pages:
        t = p.read_text(encoding='utf-8', errors='replace')
        pages[p] = set(re.findall(r'\b(?:id|name)="([^"]+)"', t))
    return pages[p]


bad = []; n = 0
for f in DIST.rglob('*.html'):
    t = f.read_text(encoding='utf-8', errors='replace'); n += 1
    for m in re.finditer(r'\b(?:href|src)="([^"#][^"]*|#[^"]*)"', t):
        u = m.group(1)
        if re.match(r'(?:[a-z][a-z0-9+.-]*:|//)', u, re.I): continue
        s = urlsplit(u)
        if u.startswith('#'): target, frag = f, s.fragment
        else:
            path = unquote(s.path)
            if path.startswith(BASE + '/') or path == BASE: path = path[len(BASE):]
            elif path.startswith('/'): bad.append((str(f.relative_to(DIST)), u, 'outside base')); continue
            else: path = os.path.normpath(os.path.join('/' + str(f.parent.relative_to(DIST)), path))
            cand = DIST / path.lstrip('/')
            target = cand / 'index.html' if cand.is_dir() else cand
            frag = s.fragment
            if not target.exists(): bad.append((str(f.relative_to(DIST)), u, 'missing file')); continue
        if frag and target.suffix == '.html' and unquote(frag) not in page_ids(target) and frag not in ('top', '_top'):
            bad.append((str(f.relative_to(DIST)), u, 'missing anchor'))
print(f'checked {n} pages, {len(bad)} broken')
for b in bad[:25]: print(' ', b)
