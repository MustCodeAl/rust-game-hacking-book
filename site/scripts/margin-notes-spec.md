# Margin comments spec (Game Hacking Academy)

Context: the book (beginner-first, readers about 15) shows short "margin comments" beside the text. The owner asked
for them to be authored explanations of the lesson, not personal notes: TL;DRs, alternative explanations or
approaches, and grounded narrative asides. Today only 14 of 147 lessons have any. Add them to your lessons.

Component (already exists): `<MarginNote kind="brief|alternative|narration">text</MarginNote>`
(`brief` shows "TL;DR:", `alternative` shows "Alternative:", `narration` shows "Narration:"; no kind = brief).
Import it once per lesson after the other imports:
`import MarginNote from '../../../../components/kit/MarginNote.astro';` (skip if the file already imports it).
See existing examples: site/src/content/docs/pages/6/09.mdx, 13/04.mdx, 11/07.mdx.

For EACH lesson in your list (path under site/src/content/docs/), read the lesson and add 3 notes (2 for a very short
lesson, up to 4 for a very long one), spread through the lesson, placed right AFTER the paragraph they comment on:
- one `brief`: a one-sentence TL;DR of the section just above (the single idea to keep);
- one `alternative`: a different way to picture or approach the same idea (an analogy, a simpler framing, or another
  technique and when it fits), not a restatement;
- one `narration` (grounded aside): a short, true, concrete consequence or real-world flavour that makes the idea
  matter (what goes wrong in practice, why a designer chose this). It must follow from the lesson or from well-established
  general knowledge; NEVER invent facts, quotes, incidents, or claims about real products or people. If unsure, make it a
  second `alternative` or a `brief` instead.
Each note is at most 30 words, plain words, no jargon the lesson has not already taught, no markdown headings, no lists.
Do not repeat the sentence above it. Do not change any existing lesson text. Defensive/educational framing only
(no evasion advice, no real offsets/signatures).

Placement rules (MDX is strict): insert only at top level between paragraphs, with a blank line before and after the
tag. Never inside a list, table, blockquote, code fence, or another component (<Frame>, <Tabs>, <Example>, <Steps>...).
Keep the tag on one line: `<MarginNote kind="alternative">...</MarginNote>`. Avoid `{`, `}` and `<` characters inside
the note text (MDX would parse them); write words instead.

Work only in your own git worktree (named in your prompt); do not push, do not publish. Verify with
`bun run build` (exit 0) and `python3 scripts/check-links.py dist` (0 broken) in your worktree's site/ folder, then check
the notes render: `grep -c 'data-margin-note' dist/pages/<n>/<nn>/index.html` for a few of your lessons. Commit in the
worktree (git -c user.name=Claude -c user.email=noreply@anthropic.com commit, trailer
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). The owner has limited credits: skim, do not re-read lessons
twice, do not dump big outputs. Final reply: 3 lines max (commit hash, lessons done, anything skipped).
