#!/usr/bin/env python3
"""Prepare concept-focused quiz rewrites.

Run from site/:  python3 scripts/quiz-rewrite-prep.py <work-dir> [baseline-commit]

Finds multiple-choice questions that lean on the lesson's own code, names, or
lab details (backticks, "lab"/"lesson", snake_case identifiers, example names)
and writes <work-dir>/rw-in/<lesson>.json for each lesson: the flagged
questions plus the lesson's other prompts (which a replacement must not repeat).
Questions that already existed at the baseline commit (the older, concept-style
batch; default 0676cc21) are never flagged.

Then follow scripts/quiz-rewrite-spec.md: write replacements to
<work-dir>/rw-out/<lesson>.json, check each with
  node scripts/quiz-concept-check.mjs <work-dir>/rw-in/N.json <work-dir>/rw-out/N.json
and merge them with scripts/quiz-rewrite-merge.py.
"""
import json, re, subprocess, sys
from pathlib import Path

work = Path(sys.argv[1]); base = sys.argv[2] if len(sys.argv) > 2 else '0676cc21'
(work / 'rw-in').mkdir(parents=True, exist_ok=True); (work / 'rw-out').mkdir(exist_ok=True)
banks = json.load(open('src/data/lesson-quiz-banks.json')); seeds = json.load(open('src/data/lesson-quizzes.json'))
old = json.loads(subprocess.run(['git', 'show', f'{base}:site/src/data/lesson-quiz-banks.json'], capture_output=True, text=True).stdout)
keep = {q['id'] for v in old.values() for q in v['questions']} | {v['id'] for v in seeds.values()}
strict = re.compile(r"`|\b(lab|lesson|this page|the book)\b|\b(Mira|Ada|Bo|Sol)\b|Wesnoth|AssaultCube|Urban Terror|\b[A-Z][A-Z0-9]+_[A-Z0-9_]+\b|\b[a-z]+_[a-z_0-9]+\b", re.I)
total = 0
for lesson, bank in banks.items():
    flagged = [q for q in bank['questions'] if q['id'] not in keep and q.get('type', 'multiple-choice') == 'multiple-choice'
               and (strict.search(q['prompt']) or sum('`' in o for o in q['options']) >= 2)]
    if not flagged: continue
    flagged_ids = {q['id'] for q in flagged}
    others = [q['prompt'] for q in bank['questions'] if q['id'] not in flagged_ids] + [seeds[lesson]['prompt']]
    src = next(Path('src/content/docs/pages').glob('*/*.mdx'), None)
    file = next((str(f) for f in Path('src/content/docs/pages').glob('*/*.mdx') if re.search(rf'^chapter:\s*["\']?{re.escape(lesson)}["\']?\s*$', f.read_text(), re.M)), '')
    json.dump({'lesson': lesson, 'file': file, 'flagged': flagged, 'otherPrompts': others}, open(work / 'rw-in' / f'{lesson}.json', 'w'), ensure_ascii=False, indent=1)
    total += len(flagged)
print(total, 'flagged questions written to', work / 'rw-in')
