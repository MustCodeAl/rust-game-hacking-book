#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;

    const PLAYER_ROOT: usize = 0x017E_ED18;
    const GAME_OFFSET: usize = 0x0A90;
    const GOLD_OFFSET: usize = 0x0004;
    const MAX_GOLD: u32 = 1_000_000;

    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    struct Snapshot {
        player: usize,
        side: usize,
        gold_address: usize,
        gold: u32,
    }

    fn pointer32(process: &Process, address: usize, label: &str) -> anyhow::Result<usize> {
        // 📏 Pointer width belongs to the 32-bit game, not to the Rust tool.
        let value = process
            .read_u32(address)
            .with_context(|| format!("could not read {label} at {address:#010x}"))?
            as usize;
        anyhow::ensure!(value != 0, "{label} was null; start a local match first");
        Ok(value)
    }

    fn capture(process: &Process) -> anyhow::Result<Snapshot> {
        // 🧭 Resolve every address with checked arithmetic before reading it.
        let player = pointer32(process, PLAYER_ROOT, "player root")?;
        let side_pointer = player
            .checked_add(GAME_OFFSET)
            .context("player + game offset overflowed")?;
        let side = pointer32(process, side_pointer, "current side")?;
        let gold_address = side
            .checked_add(GOLD_OFFSET)
            .context("side + gold offset overflowed")?;
        let gold = process.read_u32(gold_address)?;

        Ok(Snapshot {
            player,
            side,
            gold_address,
            gold,
        })
    }

    fn stable_snapshot(process: &Process) -> anyhow::Result<Snapshot> {
        for attempt in 1..=5 {
            let first = capture(process)?;
            let second = capture(process)?;
            if first == second {
                return Ok(first);
            }
            eprintln!("snapshot attempt {attempt} changed while it was being read; retrying");
        }
        anyhow::bail!("Wesnoth state did not stay stable for two consecutive captures")
    }

    let mut arguments = std::env::args().skip(1);
    let replacement = match arguments.next().as_deref() {
        None => None,
        Some("--set") => Some(
            arguments
                .next()
                .context("--set requires a gold value")?
                .parse::<u32>()
                .context("gold must be an unsigned decimal number")?,
        ),
        Some(other) => anyhow::bail!("unknown argument {other:?}; use no argument or --set GOLD"),
    };
    anyhow::ensure!(arguments.next().is_none(), "too many arguments");
    if let Some(value) = replacement {
        anyhow::ensure!(
            value <= MAX_GOLD,
            "gold exceeds the lab limit of {MAX_GOLD}"
        );
    }

    // 🔒 Read-only mode never requests VM_WRITE or VM_OPERATION rights.
    let process = Process::open_by_name("wesnoth.exe", replacement.is_some())?;
    anyhow::ensure!(
        process.is_32_bit()?,
        "this profile requires 32-bit Wesnoth 1.14.9"
    );
    let observed = stable_snapshot(&process)?;

    println!("Stable Wesnoth snapshot:");
    println!("  player:      {:#010x}", observed.player);
    println!("  side:        {:#010x}", observed.side);
    println!("  gold address:{:#010x}", observed.gold_address);
    println!("  gold:        {}", observed.gold);

    if let Some(value) = replacement {
        // ⚠️ The game kept running after observation. Rebuild the whole pointer
        // path and require the exact same evidence immediately before writing.
        let current = stable_snapshot(&process)?;
        anyhow::ensure!(
            current == observed,
            "state changed after confirmation; nothing was written"
        );
        process.write_u32(observed.gold_address, value)?;

        // ✅ Read back the postcondition instead of assuming the write succeeded.
        let written = process.read_u32(observed.gold_address)?;
        anyhow::ensure!(
            written == value,
            "read-back value was {written}, expected {value}"
        );
        println!("Changed gold from {} to {written}.", observed.gold);
    } else {
        println!("Observation only. Run with `--set GOLD` for the guarded local-lab write.");
    }
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live snapshot pipeline must run on Windows.");
}
