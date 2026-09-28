#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{
        sync::atomic::{AtomicBool, AtomicUsize, Ordering},
        thread,
    };

    use anyhow::Context;
    use gha_windows_labs::Process;

    const PATTERN: [u8; 3] = [0x29, 0x42, 0x04];
    const MAX_SNAPSHOT_BYTES: usize = 128 * 1024 * 1024;
    const MAX_MATCHES: usize = 4_096;

    struct RegionSnapshot {
        base: usize,
        bytes: Vec<u8>,
    }

    fn reserve_match(counter: &AtomicUsize) -> bool {
        counter
            .fetch_update(Ordering::AcqRel, Ordering::Acquire, |current| {
                (current < MAX_MATCHES).then_some(current + 1)
            })
            .is_ok()
    }

    let process = Process::open_by_name("wesnoth.exe", false)?;
    anyhow::ensure!(
        process.is_32_bit()?,
        "this profile requires 32-bit Wesnoth 1.14.9"
    );
    let (module_base, module_size) = process.module("wesnoth.exe")?;
    let module_end = module_base
        .checked_add(module_size)
        .context("module range overflowed")?;

    let mut total_bytes = 0_usize;
    let mut snapshots = Vec::new();
    for region in process.regions(module_base, module_end)? {
        if !region.readable || !region.executable {
            continue;
        }
        // 📏 VirtualQueryEx can return a run wider than the module; clip it.
        let start = region.base.max(module_base);
        let end = region.base.saturating_add(region.size).min(module_end);
        if start >= end {
            continue;
        }
        let length = end - start;
        total_bytes = total_bytes
            .checked_add(length)
            .context("snapshot byte count overflowed")?;
        anyhow::ensure!(
            total_bytes <= MAX_SNAPSHOT_BYTES,
            "executable snapshot exceeds {MAX_SNAPSHOT_BYTES} bytes"
        );

        match process.read_bytes(start, length) {
            Ok(bytes) => snapshots.push(RegionSnapshot { base: start, bytes }),
            // ⚠️ The process can change a page between query and copy. Skip that
            // observation rather than feeding a partial buffer to worker threads.
            Err(error) => eprintln!("skipped region {start:#010x}+{length:#x}: {error:#}"),
        }
    }
    anyhow::ensure!(
        !snapshots.is_empty(),
        "no readable executable regions were copied"
    );

    let worker_count = thread::available_parallelism()
        .map(|count| count.get())
        .unwrap_or(1)
        .min(snapshots.len());
    let next_region = AtomicUsize::new(0);
    let match_count = AtomicUsize::new(0);
    let cancelled = AtomicBool::new(false);

    // 🔀 Remote memory is copied before parallel work begins. Workers receive
    // immutable local slices, so no process handle or changing page is shared.
    let mut matches = thread::scope(|scope| -> anyhow::Result<Vec<usize>> {
        let mut workers = Vec::new();
        for _ in 0..worker_count {
            let snapshots = &snapshots;
            let next_region = &next_region;
            let match_count = &match_count;
            let cancelled = &cancelled;
            workers.push(scope.spawn(move || -> anyhow::Result<Vec<usize>> {
                let mut local = Vec::new();
                loop {
                    if cancelled.load(Ordering::Acquire) {
                        break;
                    }
                    let index = next_region.fetch_add(1, Ordering::AcqRel);
                    let Some(region) = snapshots.get(index) else {
                        break;
                    };

                    for (offset, window) in region.bytes.windows(PATTERN.len()).enumerate() {
                        if window != PATTERN {
                            continue;
                        }
                        if !reserve_match(match_count) {
                            cancelled.store(true, Ordering::Release);
                            break;
                        }
                        local.push(
                            region
                                .base
                                .checked_add(offset)
                                .context("match address overflowed")?,
                        );
                    }
                }
                Ok(local)
            }));
        }

        let mut combined = Vec::new();
        for worker in workers {
            let local = worker
                .join()
                .map_err(|_| anyhow::anyhow!("a scanner worker panicked"))??;
            combined.extend(local);
        }
        Ok(combined)
    })?;

    anyhow::ensure!(
        !cancelled.load(Ordering::Acquire),
        "match cap reached; pattern is too broad"
    );
    // ✅ Parallel completion order is nondeterministic; sorting makes output and
    // later uniqueness checks repeatable.
    matches.sort_unstable();
    matches.dedup();

    println!(
        "Scanned {total_bytes} copied bytes with {worker_count} worker(s); {} match(es):",
        matches.len()
    );
    for address in &matches {
        println!("  {address:#010x}: sub dword ptr [edx+4], eax");
    }
    anyhow::ensure!(
        matches.len() == 1,
        "expected exactly one verified course-build match"
    );
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live parallel scanner must run on Windows.");
}
