# Game Hacking Academy · portable Rust labs

These exercises contain the safe, platform-independent algorithms from the
book. They do not open another process, change memory, or send network traffic.

Run the full set:

```text
cargo test
```

The crate covers:

- eleven bypass patterns reproduced against weak toy controls and repaired;
- the cursor, key-edge, and buffer rules behind an in-game text menu;
- the install/forward/restore lifecycle of a function-pointer-table hook;
- exact and wildcard byte-pattern matching;
- bounds-checked binary parsing;
- angle wrapping and target-facing math;
- 3D world-to-screen projection;
- a Turing machine simulator with text rule tables and a step budget;
- a toy NPC guard that senses, decides, and acts once per tick: view cone,
  line of sight, a Patrol/Chase/Attack/Search/Flee state machine, and utility
  scoring;
- reading, validating, and patching a small binary save, including
  recomputing its byte-sum checksum;
- a simulated toy keypad and the driver that owns its registers, with request
  dispatch, an interrupt handler, and a deferred procedure call;
- a simulated JTAG scan chain: TAP controller, IDCODE, and BYPASS;
- a toy 8-bit console emulator with cycle counting, save states, and cheat
  codes.

The Windows-specific chapters keep their operating-system calls in focused
snippets so the safety assumptions remain visible beside each call.
