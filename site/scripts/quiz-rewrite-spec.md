# Quiz rewrite spec: test the CONCEPT, not the page

Context: Game Hacking Academy (a beginner-first book for ~15-year-olds, repo /home/user/src, read-only for you).
Every lesson has a quiz pool. The questions below were written to match the lesson's own code, names and lab
details, and the book's owner says they are TOO FOCUSED ON THE PAGE. The owner liked the older style: questions
that check whether the reader understood the underlying CONCEPT (the idea, mechanism, trade-off or reason), the kind
of question that someone who learned the idea anywhere could answer.

## Your input
Your group file lists lesson numbers (create the files with scripts/quiz-rewrite-prep.py). For each lesson N read
<WORK>/rw-in/N.json:
{ lesson, title, file (lesson source path under /home/user/src/site), flagged: [ {id, prompt, options, answer, explanation} ... ],
  otherPrompts: [ prompts of the lesson's other questions, which you must not repeat ] }.
Each flagged question must be REPLACED by a new question that keeps the same "id" and tests the same underlying concept
(use the old question's explanation to see which concept it was after), but in general terms.

## Output
Write <WORK>/rw-out/N.json: a JSON array with one
replacement object per flagged id:
{"id":"<same id>","prompt":"...","options":["right","w1","w2","w3"],"answer":"0","explanation":"1-3 sentences","type":"multiple-choice"}

## How to make it concept-focused
- Ask about the idea itself: what it is, why it works, what goes wrong without it, how two ideas differ, which situation calls
  for it, what a result means. Use a fresh, self-contained scenario with NEW names and numbers (a made-up game, a generic
  "a program", "a player record"), or a tiny generic snippet you invent (<= 4 lines), instead of the lesson's own code, names,
  constants, function names or lab steps. Do NOT mention "the lesson", "the lab", "the example", "this page", "the program" or
  the book. Do NOT use snake_case / UPPER_SNAKE / camelCase identifiers from the lesson. Plain words and generic terms
  (hexadecimal, pointer, stride, hook, breakpoint, UTF-8, normalize, state machine, ...) are fine, as are standard names of real
  public things (Windows API names such as ReadProcessMemory are fine only when the concept IS that API; keep them rare).
- A good question is answerable by someone who understands the concept even if they never saw this lesson's example. A bad one
  needs the lesson's specific constant, variable name, file, or test name.
- Still vary stems and difficulty (recall, apply-to-new-scenario, spot the mistake, predict the result, choose the cause).
  Worked arithmetic is welcome when it is a NEW calculation using the lesson's method with different numbers (check the math).
- Facts must be correct. If unsure, ask about the more general, certain version. Never invent facts about real products.
- Safety: defensive/educational framing; no evasion how-tos, no real offsets/signatures.
- Do not make the right answer longer than the wrong ones: all four options similar length and specificity; wrong options are
  plausible beginner misconceptions; no "all/none of the above"; no giveaway words ("always/never/only") in wrong options alone.
- Put the correct option at index 0 (the page shuffles at display time).
- You may skim the lesson (the "file" path) to confirm the concept, but you do not need to read it in full; the old explanation
  usually states the concept. Be efficient.

## Check before finishing (must print "ok" for every lesson)
From /home/user/src/site:  node scripts/quiz-concept-check.mjs <scratchpad>/rw-in/N.json <scratchpad>/rw-out/N.json
It rejects: ids not in the flagged list, missing replacements, duplicate prompts, unbalanced answer lengths, and any prompt/option
that mentions the lesson/lab/example or contains snake_case/UPPER_SNAKE/camelCase identifiers. Fix every line and rerun.
Do not write anywhere else except your own scratch files in a folder named rw-tmp-<your group number> inside the scratchpad.
Final reply: one line total (lessons done, questions replaced, anything you could not fix). Do not paste questions.
