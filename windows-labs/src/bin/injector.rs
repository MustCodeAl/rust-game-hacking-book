#[cfg(windows)]
mod app {
    use std::{ffi::c_void, os::windows::ffi::OsStrExt, path::Path, time::Duration};

    use anyhow::{Context, Result};
    use gha_windows_labs::{OwnedHandle, Process};
    use windows::{
        Win32::{
            Foundation::{FreeLibrary, HMODULE, WAIT_FAILED, WAIT_OBJECT_0, WAIT_TIMEOUT},
            System::{
                LibraryLoader::{
                    DONT_RESOLVE_DLL_REFERENCES, GetModuleHandleW, GetProcAddress, LoadLibraryExW,
                },
                Memory::{
                    MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE, VirtualAllocEx,
                    VirtualFreeEx,
                },
                Threading::{
                    CreateRemoteThread, GetExitCodeThread, LPTHREAD_START_ROUTINE,
                    PROCESS_CREATE_THREAD, PROCESS_QUERY_INFORMATION, PROCESS_VM_OPERATION,
                    PROCESS_VM_READ, PROCESS_VM_WRITE, WaitForSingleObject,
                },
            },
        },
        core::{PCWSTR, s, w},
    };

    const ALLOWED_TARGETS: &[&str] = &[
        "wesnoth.exe",
        "ac_client.exe",
        "Quake3-UrT.exe",
        "flare.exe",
        "wyrmsun.exe",
    ];

    struct RemoteAllocation<'a> {
        process: &'a Process,
        address: *mut c_void,
    }

    impl Drop for RemoteAllocation<'_> {
        fn drop(&mut self) {
            // SAFETY: this allocation belongs to this process and is released once.
            let _ =
                unsafe { VirtualFreeEx(self.process.raw_handle(), self.address, 0, MEM_RELEASE) };
        }
    }

    struct LocalModule(HMODULE);

    impl Drop for LocalModule {
        fn drop(&mut self) {
            // SAFETY: this process owns the reference returned by LoadLibraryExW.
            let _ = unsafe { FreeLibrary(self.0) };
        }
    }

    fn wait_for_thread(thread: &OwnedHandle, description: &str) -> Result<u32> {
        let timeout_ms = u32::try_from(Duration::from_secs(10).as_millis())?;
        // SAFETY: the thread handle remains live for the wait.
        let wait = unsafe { WaitForSingleObject(thread.raw(), timeout_ms) };
        if wait == WAIT_TIMEOUT {
            anyhow::bail!("{description} did not finish within 10 seconds");
        }
        if wait == WAIT_FAILED {
            return Err(windows::core::Error::from_thread().into());
        }
        anyhow::ensure!(wait == WAIT_OBJECT_0, "unexpected wait result: {}", wait.0);

        let mut exit_code = 0_u32;
        // SAFETY: the thread has finished and the output pointer is writable.
        unsafe { GetExitCodeThread(thread.raw(), &mut exit_code) }?;
        Ok(exit_code)
    }

    fn wide_absolute_path(path: &Path) -> Result<Vec<u16>> {
        let absolute = path
            .canonicalize()
            .with_context(|| format!("cannot find DLL at {}", path.display()))?;
        let mut wide: Vec<u16> = absolute.as_os_str().encode_wide().collect();
        wide.push(0); // LoadLibraryW expects a zero-terminated UTF-16 string.
        Ok(wide)
    }

    fn as_bytes(wide: &[u16]) -> &[u8] {
        // SAFETY: a u16 slice is contiguous; its byte view is exactly twice as long.
        unsafe { std::slice::from_raw_parts(wide.as_ptr().cast(), wide.len() * 2) }
    }

    pub fn run() -> Result<()> {
        let mut arguments = std::env::args().skip(1);
        let process_name = arguments
            .next()
            .context("usage: injector <allowed-process.exe> <absolute-or-relative-dll-path>")?;
        let dll_path = arguments.next().context("missing DLL path")?;

        anyhow::ensure!(
            ALLOWED_TARGETS
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(&process_name)),
            "{process_name:?} is not one of the course targets"
        );

        let entry = Process::find(&process_name)?;
        let access = PROCESS_CREATE_THREAD
            | PROCESS_QUERY_INFORMATION
            | PROCESS_VM_OPERATION
            | PROCESS_VM_READ
            | PROCESS_VM_WRITE;
        let process = Process::open_with_access(entry, access)?;
        anyhow::ensure!(
            process.is_32_bit()?,
            "the course DLLs require a 32-bit target"
        );

        let wide_path = wide_absolute_path(Path::new(&dll_path))?;
        let path_bytes = as_bytes(&wide_path);

        // Reserve and commit readable/writable memory inside the game.
        // SAFETY: the process handle is live; null asks Windows to choose the address.
        let remote_address = unsafe {
            VirtualAllocEx(
                process.raw_handle(),
                None,
                path_bytes.len(),
                MEM_COMMIT | MEM_RESERVE,
                PAGE_READWRITE,
            )
        };
        anyhow::ensure!(!remote_address.is_null(), "VirtualAllocEx failed");
        let remote_path = RemoteAllocation {
            process: &process,
            address: remote_address,
        };
        process.write_exact(remote_path.address as usize, path_bytes)?;

        // kernel32 is already loaded in this injector. Resolve LoadLibraryW there.
        // For the same architecture, this system DLL export is usable by the target.
        // SAFETY: both names are static zero-terminated strings.
        let kernel32 = unsafe { GetModuleHandleW(w!("kernel32.dll")) }?;
        // SAFETY: `kernel32` is live and the exported name is valid ASCII.
        let load_library = unsafe { GetProcAddress(kernel32, s!("LoadLibraryW")) }
            .context("kernel32 did not export LoadLibraryW")?;

        // CreateRemoteThread expects the same address with the thread-procedure type.
        // On 32-bit Windows both signatures use the system ABI and one pointer argument.
        // SAFETY: this 32-bit course injector and target use the Windows system
        // ABI; LoadLibraryW accepts one pointer and its HMODULE result fits u32.
        let thread_start: LPTHREAD_START_ROUTINE = Some(unsafe {
            std::mem::transmute::<
                unsafe extern "system" fn() -> isize,
                unsafe extern "system" fn(*mut c_void) -> u32,
            >(load_library)
        });

        // SAFETY: the start address is LoadLibraryW and its argument points to the
        // zero-terminated UTF-16 path that remains allocated until the thread exits.
        let thread = unsafe {
            CreateRemoteThread(
                process.raw_handle(),
                None,
                0,
                thread_start,
                Some(remote_path.address.cast_const()),
                0,
                None,
            )
        }?;
        let thread = OwnedHandle::from_raw(thread)?;

        let module_handle = wait_for_thread(&thread, "the LoadLibraryW thread")?;
        anyhow::ensure!(module_handle != 0, "LoadLibraryW returned null");

        // Map the same DLL in this injector without running DllMain. That lets
        // us ask Windows where the exported `gha_start` function sits relative
        // to the DLL base. The relative offset is identical in the game even
        // when ASLR chooses a different base address there.
        // SAFETY: `wide_path` is still a zero-terminated UTF-16 path.
        let local_module = unsafe {
            LoadLibraryExW(
                PCWSTR(wide_path.as_ptr()),
                None,
                DONT_RESOLVE_DLL_REFERENCES,
            )
        }
        .context("could not map the DLL locally to find gha_start")?;
        let local_module = LocalModule(local_module);
        // SAFETY: the module is live and the export name is zero-terminated.
        let local_start = unsafe { GetProcAddress(local_module.0, s!("gha_start")) }
            .context("the DLL does not export gha_start")?;
        let local_start_address = local_start as *const () as usize;
        let local_base = local_module.0.0 as usize;
        let start_offset = local_start_address
            .checked_sub(local_base)
            .context("gha_start was below the local DLL base")?;
        let remote_start_address = (module_handle as usize)
            .checked_add(start_offset)
            .context("remote gha_start address overflowed")?;
        // SAFETY: this is the `gha_start` RVA in the same 32-bit DLL image.
        // SAFETY: this address is the verified gha_start RVA in the same
        // 32-bit DLL image, whose export uses LPTHREAD_START_ROUTINE's ABI.
        let remote_start: LPTHREAD_START_ROUTINE = Some(unsafe {
            std::mem::transmute::<usize, unsafe extern "system" fn(*mut c_void) -> u32>(
                remote_start_address,
            )
        });

        // SAFETY: gha_start has the documented LPTHREAD_START_ROUTINE ABI and
        // accepts a null argument. The DLL stays loaded in the target.
        let start_thread = unsafe {
            CreateRemoteThread(process.raw_handle(), None, 0, remote_start, None, 0, None)
        }?;
        let start_thread = OwnedHandle::from_raw(start_thread)?;
        let start_result = wait_for_thread(&start_thread, "the gha_start thread")?;
        anyhow::ensure!(
            start_result == 0,
            "gha_start returned error code {start_result}"
        );

        println!(
            "Injected and started {} in {} (PID {}). Module handle: {module_handle:#010x}",
            Path::new(&dll_path).display(),
            process.name(),
            process.id()
        );
        Ok(())
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("The injector uses Windows APIs and must be built on Windows.");
}
