#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::io;

    use anyhow::Context;
    use gha_windows_labs::Process;

    const CHUNK_SIZE: usize = 1024 * 1024;
    const MAX_REGION_SIZE: usize = 64 * 1024 * 1024;
    const MAX_CANDIDATES: usize = 250_000;

    let mut arguments = std::env::args().skip(1);
    let process_name = arguments
        .next()
        .context("usage: memory_scanner <process.exe> <initial_u32>")?;
    let initial = arguments
        .next()
        .context("missing initial value")?
        .parse::<u32>()
        .context("initial value must be an unsigned number")?;

    let process = Process::open_by_name(&process_name, true)?;
    println!(
        "Scanning {} (PID {}) for {initial}...",
        process.name(),
        process.id()
    );

    let mut candidates = Vec::new();
    for region in process.regions(0x1_0000, usize::MAX)? {
        if !region.readable || region.size == 0 || region.size > MAX_REGION_SIZE {
            continue;
        }

        let mut offset = 0_usize;
        while offset < region.size {
            let count = CHUNK_SIZE.min(region.size - offset);
            // Read three extra bytes when possible. A four-byte number can begin in
            // the last three bytes of a chunk, so this small overlap prevents a
            // match from falling through the crack between two reads.
            let read_count = count.saturating_add(3).min(region.size - offset);
            let address = region.base + offset;
            let Ok(bytes) = process.read_bytes(address, read_count) else {
                break; // the game changed this region while we were scanning
            };

            for (inside_chunk, window) in bytes.windows(4).enumerate() {
                if inside_chunk >= count {
                    break; // the next chunk owns starts beyond this boundary
                }
                if window == initial.to_le_bytes() {
                    candidates.push(address + inside_chunk);
                    anyhow::ensure!(
                        candidates.len() <= MAX_CANDIDATES,
                        "too many matches; choose a less common value"
                    );
                }
            }
            offset += count;
        }
    }

    println!("First scan: {} candidates", candidates.len());
    println!("Change the value in the game, then press Enter.");
    let mut line = String::new();
    io::stdin().read_line(&mut line)?;
    line.clear();
    println!("What is the new value?");
    io::stdin().read_line(&mut line)?;
    let new_value = line.trim().parse::<u32>().context("not a u32 value")?;

    candidates.retain(|address| {
        process
            .read_u32(*address)
            .is_ok_and(|value| value == new_value)
    });
    println!("Next scan: {} candidates", candidates.len());
    for address in candidates.iter().take(25) {
        println!("  {address:#010x}");
    }

    if candidates.len() == 1 {
        line.clear();
        println!("Type a replacement number, or press Enter without typing to stop:");
        io::stdin().read_line(&mut line)?;
        if !line.trim().is_empty() {
            let replacement = line.trim().parse::<u32>().context("not a u32 value")?;
            let address = candidates[0];
            anyhow::ensure!(
                process.read_u32(address)? == new_value,
                "the value changed before the guarded write"
            );
            process.write_u32(address, replacement)?;
            println!("Changed {new_value} -> {replacement} at {address:#010x}");
        }
    } else {
        println!("Repeat the experiment with another changed value to narrow the list.");
    }
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This memory scanner uses Windows APIs and must run on Windows.");
}
