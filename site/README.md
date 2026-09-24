# Game Hacking Academy · Starlight site

The book is moving from Jekyll to [Astro Starlight](https://starlight.astro.build).
This folder is the new site; the Jekyll book at the repository root stays live
until the migration is complete.

```bash
bun install
bun run dev      # http://localhost:4321/rust-game-hacking-book/
bun run build    # static site in dist/
```

- Lessons: `src/content/docs/pages/<chapter>/<lesson>.mdx`
- End-of-lesson quizzes: `src/data/lesson-quizzes.json`
- Figures, quizzes, labs, and layout overrides: `src/components/`
- Palettes and component styles: `src/styles/`
- Context7 navigation: `bun run docs-json` regenerates `../docs.json`

Until the cutover, `_pages/` at the repository root is still the source of
truth; `python3 scripts/import-jekyll.py ..` regenerates the lessons here.
