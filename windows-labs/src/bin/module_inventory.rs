#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::mem::size_of;

    use gha_windows_labs::{OwnedHandle, Process};
    use windows::Win32::{
        Foundation::ERROR_NO_MORE_FILES,
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, MODULEENTRY32W, Module32FirstW, Module32NextW,
            TH32CS_SNAPMODULE, TH32CS_SNAPMODULE32,
        },
    };

    fn wide_text(buffer: &[u16]) -> String {
        let end = buffer
            .iter()
            .position(|unit| *unit == 0)
            .unwrap_or(buffer.len());
        String::from_utf16_lossy(&buffer[..end])
    }

    fn no_more_files(error: &windows::core::Error) -> bool {
        error.code() == ERROR_NO_MORE_FILES.to_hresult()
    }

    let process_name = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "wesnoth.exe".to_owned());
    let process = Process::find(&process_name)?;
    let flags = TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32;
    // SAFETY: the PID is a value and OwnedHandle owns the returned snapshot.
    let snapshot = unsafe { CreateToolhelp32Snapshot(flags, process.id) }?;
    let snapshot = OwnedHandle::from_raw(snapshot)?;
    let mut entry = MODULEENTRY32W {
        dwSize: size_of::<MODULEENTRY32W>() as u32,
        ..Default::default()
    };

    // SAFETY: entry has the required size and remains writable during the call.
    unsafe { Module32FirstW(snapshot.raw(), &mut entry) }?;
    let mut modules = Vec::new();
    loop {
        modules.push((
            entry.modBaseAddr as usize,
            entry.modBaseSize as usize,
            wide_text(&entry.szModule),
            wide_text(&entry.szExePath),
        ));
        // SAFETY: entry remains a correctly sized writable output structure.
        match unsafe { Module32NextW(snapshot.raw(), &mut entry) } {
            Ok(()) => {}
            Err(error) if no_more_files(&error) => break,
            Err(error) => return Err(error.into()),
        }
    }

    modules.sort_unstable_by_key(|(base, _, _, _)| *base);
    println!(
        "{} (PID {}) loaded {} module(s)",
        process.name,
        process.id,
        modules.len()
    );
    for (base, size, name, file) in modules {
        println!("  {base:#010x}  {size:#010x}  {name}");
        println!("              {file}");
    }
    println!("The snapshot was read-only; no loader state was changed.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This read-only module inventory must run on Windows.");
}
