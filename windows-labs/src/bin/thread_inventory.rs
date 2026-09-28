#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::mem::size_of;

    use gha_windows_labs::{OwnedHandle, Process};
    use windows::Win32::{
        Foundation::ERROR_NO_MORE_FILES,
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next,
        },
    };

    fn no_more_files(error: &windows::core::Error) -> bool {
        error.code() == ERROR_NO_MORE_FILES.to_hresult()
    }

    let process_name = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "wesnoth.exe".to_owned());
    let process = Process::find(&process_name)?;

    // TH32CS_SNAPTHREAD is system-wide; the PID is used only for filtering below.
    // SAFETY: no pointers are supplied and OwnedHandle owns the returned snapshot.
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) }?;
    let snapshot = OwnedHandle::from_raw(snapshot)?;
    let mut entry = THREADENTRY32 {
        dwSize: size_of::<THREADENTRY32>() as u32,
        ..Default::default()
    };

    // SAFETY: entry has the required size and remains writable during the call.
    unsafe { Thread32First(snapshot.raw(), &mut entry) }?;
    let mut threads = Vec::new();
    loop {
        if entry.th32OwnerProcessID == process.id {
            threads.push((entry.th32ThreadID, entry.tpBasePri));
        }
        // SAFETY: entry remains a correctly sized writable output structure.
        match unsafe { Thread32Next(snapshot.raw(), &mut entry) } {
            Ok(()) => {}
            Err(error) if no_more_files(&error) => break,
            Err(error) => return Err(error.into()),
        }
    }

    threads.sort_unstable_by_key(|(thread_id, _)| *thread_id);
    println!(
        "{} (PID {}) has {} thread(s)",
        process.name,
        process.id,
        threads.len()
    );
    for (thread_id, base_priority) in threads {
        println!("  TID {thread_id:<8} base priority {base_priority}");
    }
    println!("No thread was opened, suspended, queued, or given a new context.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This read-only thread inventory must run on Windows.");
}
