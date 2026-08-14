# Game Hacking Academy · Rust edition

The book is a beginner-friendly, Rust-first guide to game internals, memory,
debugging, graphics, networking, tooling, and supported modding.

## Local preview

```text
bundle exec jekyll serve
```

## Portable Rust exercises

```text
cd rust-labs
cargo test
```

## Windows, Lua, and advanced memory labs

The `windows-labs` crate contains the complete Windows implementations used by
the memory, debugger, PE, IPC, and authorized game lessons. Chapter 11's
simulated scripting host is separate so it can run on any development machine:

```text
cargo run --manifest-path lua-labs/Cargo.toml -- lua-labs/scripts/observer.lua
cargo test --manifest-path advanced-memory-labs/Cargo.toml
```

The advanced crate contains the original Chapter 12 labs for toy value
obfuscation, XChaCha20-Poly1305 authenticated encryption, and read-only x86-64
page-table translation over offline capture files. It contains no DMA hardware
driver, live memory writer, anti-cheat bypass, or stealth firmware.

The site is based on
[jekyll-gitbook](https://github.com/sighingnow/jekyll-gitbook).
