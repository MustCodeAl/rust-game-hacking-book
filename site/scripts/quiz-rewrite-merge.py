#!/usr/bin/env python3
"""Merge rewritten quiz questions into src/data. Run from site/:
  python3 scripts/quiz-rewrite-merge.py <work-dir>
Each <work-dir>/rw-out/<lesson>.json (an array of replacements with the same ids)
replaces the question with that id in lesson-quiz-banks.json. Then run
  node scripts/check-lesson-quizzes.mjs   (needs a fresh build: dist/ must exist)
"""
import json, sys
from pathlib import Path
work = Path(sys.argv[1])
p = Path('src/data/lesson-quiz-banks.json'); raw = p.read_text(); banks = json.loads(raw)
n = 0
for f in sorted((work / 'rw-out').glob('*.json')):
    lesson = f.stem; replace = {q['id']: q for q in json.load(open(f))}
    for i, q in enumerate(banks[lesson]['questions']):
        if q['id'] in replace:
            banks[lesson]['questions'][i] = replace.pop(q['id']); n += 1
    assert not replace, (lesson, 'unknown ids', list(replace))
p.write_text(json.dumps(banks, indent=2, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
print('replaced', n, 'questions')
