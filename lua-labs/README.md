# Lua automation labs

This crate is the safe, simulated host for Chapter 12. It embeds Lua 5.4 with
`mlua`, exposes copied entity snapshots, accepts only two bounded action types,
and demonstrates memory and instruction limits.

Run the useful examples from this directory:

```powershell
cargo run -- scripts/observer.lua
cargo run -- scripts/nearest_entity.lua
cargo run -- scripts/state_machine.lua
```

Run the intentional infinite-loop failure to verify the instruction budget:

```powershell
cargo run -- scripts/budget_failure.lua
```

The fixture contains invented local data. It does not attach to a process or
connect to a server.
