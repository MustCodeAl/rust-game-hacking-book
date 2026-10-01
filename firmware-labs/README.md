# Firmware and Bare-Metal Rust

This is the complete project for Lesson 14.3. It builds a real Cortex-M3 ELF
firmware image for QEMU's `lm3s6965evb` model. The emulated firmware runs without
a guest operating system. Its inputs are a fixed trace of logical button states;
it does not drive a physical LED or read a GPIO pin.

## Build and run

Install stable Rust with rustup and QEMU's ARM system emulator. On Windows,
QEMU's installation directory must be on PATH. The lesson links to QEMU's
installation instructions for Windows, macOS, and Linux.

From this directory (Cargo reads `.cargo/config.toml` here):

```sh
rustup target add thumbv7m-none-eabi
cargo build --locked --bin lamp-firmware
cargo run --locked --bin lamp-firmware
```

The configuration makes Cortex-M3 the default target and sets QEMU as Cargo's
runner. The lockfile pins the full dependency set.

Expected firmware output:

```text
sample 1: pressed=false, lamp=false
sample 2: pressed=true, lamp=true
sample 3: pressed=true, lamp=true
sample 4: pressed=false, lamp=true
sample 5: pressed=true, lamp=false
sample 6: pressed=false, lamp=false
```

QEMU then exits with status 0. Some versions also print
`Timer with period zero, disabling`; that board-model message is not part of the
trace. The source uses semihosting for output and termination: these operations
need QEMU/debugger support and are not ordinary UART output or an OS exit.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `Cargo.toml` / `Cargo.lock` | Runtime dependencies and reproducible versions |
| `.cargo/config.toml` | ARM target, linker argument, and QEMU runner |
| `memory.x` | This board model's 256 KiB flash and 64 KiB RAM |
| `build.rs` | Host-side helper that puts the memory map on the linker's search path |
| `src/lib.rs` | Hardware-independent button/lamp state transitions |
| `src/main.rs` | Reset-runtime entry point, trace output, and panic policy |

The downloaded source folder must include the hidden `.cargo` directory. The
project is built from inside `firmware-labs/`; running Cargo from the parent
repository with `--manifest-path` alone does not load this configuration.

## Test the control logic on your computer

Run `rustc -vV` and find its `host:` line. Override the default ARM target with
that triple; for example, on an Apple Silicon Mac:

```sh
cargo test --locked --lib --target aarch64-apple-darwin
```

Use your own host triple on other machines. These tests check the state
transitions and reset behaviour, not physical switch debouncing or pin wiring.

## Adapt to a physical board

Start with the exact board's Rust board-support/HAL example and its documented
debug probe or bootloader. Match its CPU target and memory layout, configure its
clock and pins, and replace the trace with real input/output. Remove the QEMU
runner and the semihosting exit calls. A real controller keeps sampling hardware
in a loop, or responds to timer/interrupt events. This project's entry point and
panic handler both currently ask QEMU to exit.

Use the board's documented flashing tool to erase/program, verify, reset, and
observe the output. This QEMU image is not a universal firmware updater and
must not be flashed onto a different board unchanged.
