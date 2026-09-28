# Advanced memory labs

These small Rust programs support the advanced lessons placed in Chapters 3, 9, and 11 of the book.

- `obfuscation_lab` demonstrates a reversible XOR-and-rotate transform and a toy integrity tag.
- `crypto_demo` protects a fake save payload with XChaCha20-Poly1305 authenticated encryption.
- `dma_capture` translates virtual addresses inside an ordinary **offline** x86-64 RAM-capture file.

Run the checks:

```powershell
cargo test --manifest-path advanced-memory-labs/Cargo.toml
cargo clippy --manifest-path advanced-memory-labs/Cargo.toml --all-targets -- -D warnings
```

Run a demonstration:

```powershell
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin obfuscation_lab
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin crypto_demo
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin dma_capture -- capture.bin 0x1000 0x7FF612341000 64
```

The DMA reader never opens a hardware device, loads a kernel driver, writes memory, disables an IOMMU, or bypasses anti-cheat. Use captures with known provenance or a synthetic test fixture.
