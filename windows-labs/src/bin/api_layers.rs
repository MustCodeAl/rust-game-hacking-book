#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use windows::{
        Win32::{
            Foundation::HMODULE,
            System::LibraryLoader::{GetModuleHandleW, GetProcAddress},
        },
        core::{PCSTR, s, w},
    };

    fn exported_address(module: HMODULE, name: PCSTR) -> anyhow::Result<usize> {
        // SAFETY: module is loaded in this process and name is a terminated,
        // static ASCII string. We only print the returned address.
        let function = unsafe { GetProcAddress(module, name) }
            .context("the requested export was not present")?;
        Ok(function as usize)
    }

    // SAFETY: these DLL names are terminated, static UTF-16 strings. Windows
    // loads both modules before a normal console program reaches main.
    let kernel32 = unsafe { GetModuleHandleW(w!("kernel32.dll")) }?;
    // SAFETY: ntdll.dll is likewise a terminated, static UTF-16 name for a
    // module that is already loaded in every normal Windows process.
    let ntdll = unsafe { GetModuleHandleW(w!("ntdll.dll")) }?;

    let rows = [
        (
            "Win32",
            "kernel32!VirtualQueryEx",
            exported_address(kernel32, s!("VirtualQueryEx"))?,
        ),
        (
            "Win32",
            "kernel32!ReadFile",
            exported_address(kernel32, s!("ReadFile"))?,
        ),
        (
            "Native",
            "ntdll!NtQueryVirtualMemory",
            exported_address(ntdll, s!("NtQueryVirtualMemory"))?,
        ),
    ];

    println!("Layer    Export                              Address in this run");
    for (layer, name, address) in rows {
        println!("{layer:<8} {name:<35} {address:#018x}");
    }
    println!();
    println!("These addresses belong only to this process and this run.");
    println!("The lab resolved names; it did not call a native API or direct syscall.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This Windows API-layer lab must run on Windows.");
}
