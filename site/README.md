# Game Hacking Academy · Starlight site

```bash
bun install
bun run dev      # http://localhost:4321/rust-game-hacking-book/
bun run build    # static site in dist/
```

- Lessons: `src/content/docs/pages/<chapter>/<lesson>.mdx`
- Chapter titles and summaries: `src/data/chapters.mjs`
- End-of-lesson quizzes: `src/data/lesson-quizzes.json`, keyed by lesson number
- Chapter review questions: `public/scripts/learning-widgets.js`
- Figures, quizzes, labs, and layout overrides: `src/components/`
- Palettes and component styles: `src/styles/`
- Context7 navigation: `bun run docs-json` regenerates `../docs.json`

## Writing lessons in MDX

- Escape `{` and `}` in prose as `\{` and `\}`. Inside code spans and fenced
  code they need no escaping.
- Self-close void tags: `<br />`, `<hr />`.
- MDX has no HTML comments.
- Draw memory with `<MemoryStrip cells="..." caption="..." />` and flows with a
  fenced `mermaid` block.
- Asides use `:::note[Title]`, `:::tip`, `:::caution`, and `:::danger`.
