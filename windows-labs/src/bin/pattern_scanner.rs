#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use gha_windows_labs::Process;

    const PATTERN: [u8; 3] = [0x29, 0x42, 0x04];
    let process = Process::open_by_name("wesnoth.exe", false)?;
    let (base, size) = process.module("wesnoth.exe")?;
    let end = base
        .checked_add(size)
        .ok_or_else(|| anyhow::anyhow!("Wesnoth module range overflowed"))?;
    let mut matches = Vec::new();

    for region in process.regions(base, end)? {
        if !region.readable || !region.executable {
            continue;
        }
        let start = region.base.max(base);
        let region_end = region.base.saturating_add(region.size).min(end);
        if start >= region_end {
            continue;
        }
        let bytes = process.read_bytes(start, region_end - start)?;
        matches.extend(
            bytes
                .windows(PATTERN.len())
                .enumerate()
                .filter_map(|(offset, window)| (window == PATTERN).then_some(start + offset)),
        );
    }

    anyhow::ensure!(
        !matches.is_empty(),
        "gold-subtraction pattern was not found"
    );
    for address in &matches {
        println!("{address:#010x}: 29 42 04  ; sub dword ptr [edx+4],eax");
    }
    anyhow::ensure!(
        matches.len() == 1,
        "pattern is ambiguous: {} matches; inspect each before patching",
        matches.len()
    );
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live pattern scanner must run on Windows.");
}
