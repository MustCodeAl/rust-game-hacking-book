# Game Hacking Academy · portable Rust labs

These exercises contain the safe, platform-independent algorithms from the
book. They do not open another process, change memory, or send network traffic.

Run the full set:

```text
cargo test
```

The crate covers:

- eleven bypass patterns reproduced against weak toy controls and repaired;
- exact and wildcard byte-pattern matching;
- bounds-checked binary parsing;
- angle wrapping and target-facing math;
- 3D world-to-screen projection.

The Windows-specific chapters keep their operating-system calls in focused
snippets so the safety assumptions remain visible beside each call.
