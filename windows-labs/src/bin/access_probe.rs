#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;
    use windows::{
        Win32::System::Threading::{
            PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW,
        },
        core::PWSTR,
    };

    let process_name = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "wesnoth.exe".to_owned());
    let entry = Process::find(&process_name)?;
    let process = Process::open_with_access(entry, PROCESS_QUERY_LIMITED_INFORMATION)
        .context("Windows denied even limited process information")?;

    let mut path = vec![0_u16; 32_768];
    let mut length = u32::try_from(path.len()).context("path buffer is too large")?;
    // SAFETY: `path` owns `length` writable UTF-16 units, and `length` remains
    // valid while Windows updates it with the number of units actually used.
    unsafe {
        QueryFullProcessImageNameW(
            process.raw_handle(),
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut length,
        )?;
    }
    path.truncate(usize::try_from(length)?);

    println!("Process: {} (PID {})", process.name(), process.id());
    println!("Image:   {}", String::from_utf16_lossy(&path));
    println!("Rights:  PROCESS_QUERY_LIMITED_INFORMATION");
    println!("No memory-read, memory-write, thread, or debug right was requested.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This access-rights lab must run on Windows.");
}
