#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use gha_windows_labs::OwnedHandle;
    use windows::Win32::System::Threading::{
        CreateEventW, GetCurrentProcess, GetProcessHandleCount,
    };

    fn handle_count() -> windows::core::Result<u32> {
        let mut count = 0_u32;
        // SAFETY: GetCurrentProcess returns this process's pseudo-handle and
        // `count` remains a valid output pointer for the duration of the call.
        unsafe { GetProcessHandleCount(GetCurrentProcess(), &mut count)? };
        Ok(count)
    }

    let before = handle_count()?;
    let events: Vec<OwnedHandle> = (0..128)
        .map(|_| {
            // SAFETY: no security structure or name pointer is supplied. Windows
            // creates a new unnamed, auto-reset, initially nonsignaled event.
            let raw = unsafe { CreateEventW(None, false, false, None) }?;
            OwnedHandle::from_raw(raw)
        })
        .collect::<windows::core::Result<_>>()?;
    let while_owned = handle_count()?;

    drop(events);
    let after_drop = handle_count()?;

    println!("Before:      {before} handles");
    println!("While owned: {while_owned} handles");
    println!("After drop:  {after_drop} handles");
    anyhow::ensure!(
        while_owned >= before.saturating_add(128),
        "the event handles were not visible in the process count"
    );
    anyhow::ensure!(
        after_drop < while_owned,
        "dropping OwnedHandle did not reduce the handle count"
    );
    println!("Rust dropped the vector, and each OwnedHandle called CloseHandle once.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This RAII handle lab must run on Windows.");
}
