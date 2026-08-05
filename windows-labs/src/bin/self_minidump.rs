#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{fs::OpenOptions, os::windows::io::AsRawHandle, path::PathBuf};

    use anyhow::{Context, ensure};
    use windows::Win32::{
        Foundation::HANDLE,
        System::{
            Diagnostics::Debug::{
                MiniDumpNormal, MiniDumpWithThreadInfo, MiniDumpWithUnloadedModules,
                MiniDumpWriteDump,
            },
            Threading::{GetCurrentProcess, GetCurrentProcessId},
        },
    };

    let output = std::env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("gha-self.dmp"));
    ensure!(
        !output.exists(),
        "refusing to overwrite {}",
        output.display()
    );
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&output)
        .with_context(|| format!("could not create {}", output.display()))?;
    let file_handle = HANDLE(file.as_raw_handle());

    // SAFETY: these calls take no pointers and return identifiers for this process.
    let (process, process_id) = unsafe { (GetCurrentProcess(), GetCurrentProcessId()) };
    let dump_type = MiniDumpNormal | MiniDumpWithThreadInfo | MiniDumpWithUnloadedModules;
    // SAFETY: both handles belong to this process, the file stays open during
    // the call, and no optional exception/user/callback pointer is supplied.
    unsafe {
        MiniDumpWriteDump(
            process,
            process_id,
            file_handle,
            dump_type,
            None,
            None,
            None,
        )?;
    }
    drop(file);

    println!("Wrote {}", output.display());
    println!("The dump contains this lab process, not another process.");
    println!("Open it with: windbgx -z {}", output.display());
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This self-dump lab must run on Windows.");
}
