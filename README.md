# Game Hacking Academy

A beginner-friendly book about how games work underneath: memory, assembly,
debuggers, graphics, networking, file formats, and the tools used to study them.
The examples and labs are written in Rust.

Read it online at <https://mustcodeal.github.io/rust-game-hacking-book/>.

## Repository layout

| Path | What it holds |
| --- | --- |
| `site/` | The book, built with [Astro Starlight](https://starlight.astro.build) |
| `site/src/content/docs/pages/<chapter>/<lesson>.mdx` | Lesson text |
| `site/src/content/docs/glossary.mdx` | Glossary |
| `site/src/data/lesson-quizzes.json` | End-of-lesson knowledge checks |
| `site/src/components/` | Memory figures, quizzes, labs, and layout overrides |
| `rust-labs/` | Portable exercises: byte parsing, scanning, math, toy machines |
| `windows-labs/` | Windows implementations for the memory, debugger, PE, and IPC lessons |
| `lua-labs/` | The simulated scripting host used in Chapter 10 |
| `advanced-memory-labs/` | Toy obfuscation, authenticated encryption, offline page-table translation |
| `firmware-labs/` | A bare-metal Cortex-M3 controller image, tested in QEMU |

## Preview the book locally

```bash
cd site
bun install
bun run dev
```

The dev server prints its address, normally
<http://localhost:4321/rust-game-hacking-book/>. `bun run build` writes the
static site to `site/dist/`.

## Publishing

The authored book is maintained on `codex/book-revision`. Its complete build
from `site/dist/` is published through a branch based on `gh-pages` and a pull
request into `gh-pages`. GitHub Pages serves that branch's root as static files;
`.nojekyll` preserves Astro's generated assets. Current source, validation, and
publication receipts are recorded in `BOOK_REVISION_PROGRESS.md`.

## Labs

```bash
cd rust-labs
cargo test
```

```bash
cargo run --manifest-path lua-labs/Cargo.toml -- lua-labs/scripts/observer.lua
cargo test --manifest-path advanced-memory-labs/Cargo.toml
```

The advanced crate contains no DMA hardware driver, live memory writer,
anti-cheat bypass, or stealth firmware. Its captures are offline files.

The firmware project has its own CPU target and emulator configuration. Run it
from its directory so Cargo reads that configuration:

```bash
cd firmware-labs
rustup target add thumbv7m-none-eabi
cargo run --locked --bin lamp-firmware
```

See `firmware-labs/README.md` for the expected output, host-side logic tests,
and how the board-specific setup differs from the emulator lab.

## Earlier versions

The Jekyll edition of the book is kept on the `jekyll-backup` branch.
