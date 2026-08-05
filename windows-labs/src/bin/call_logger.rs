#[cfg(all(windows, target_arch = "x86"))]
mod app {
    use std::collections::{BTreeMap, HashMap};

    use anyhow::{Context as _, Result};
    use gha_windows_labs::{OwnedHandle, Process};
    use iced_x86::{Decoder, DecoderOptions, FlowControl, Instruction, OpKind};
    use windows::Win32::{
        Foundation::{
            CloseHandle, DBG_CONTINUE, DBG_EXCEPTION_NOT_HANDLED, ERROR_SEM_TIMEOUT,
            EXCEPTION_BREAKPOINT, EXCEPTION_SINGLE_STEP, HANDLE, NTSTATUS,
        },
        System::{
            Diagnostics::Debug::{
                CONTEXT, CONTEXT_FULL_X86, CREATE_PROCESS_DEBUG_EVENT, CREATE_THREAD_DEBUG_EVENT,
                ContinueDebugEvent, DEBUG_EVENT, DebugActiveProcess, DebugActiveProcessStop,
                EXCEPTION_DEBUG_EVENT, EXIT_PROCESS_DEBUG_EVENT, GetThreadContext,
                LOAD_DLL_DEBUG_EVENT, SetThreadContext, WaitForDebugEvent,
            },
            Threading::{
                OpenThread, THREAD_GET_CONTEXT, THREAD_QUERY_INFORMATION, THREAD_SET_CONTEXT,
            },
        },
        UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_END},
    };

    const MAX_BREAKPOINTS: usize = 2_000;
    const TRAP_FLAG: u32 = 1 << 8;
    const NOISY_CALLS: [usize; 2] = [0x0040_E3D8, 0x0040_E3EA];

    struct AttachGuard {
        pid: u32,
        active: bool,
    }

    impl Drop for AttachGuard {
        fn drop(&mut self) {
            if self.active {
                // SAFETY: best-effort pair for this tool's successful attach.
                let _ = unsafe { DebugActiveProcessStop(self.pid) };
            }
        }
    }

    fn close_event_handle(handle: HANDLE) {
        if !handle.is_invalid() {
            // SAFETY: debug events transfer these handles to the debugger.
            let _ = unsafe { CloseHandle(handle) };
        }
    }

    fn dispose_event_handles(event: &DEBUG_EVENT) {
        // SAFETY: the event code selects the active union field.
        unsafe {
            match event.dwDebugEventCode {
                CREATE_PROCESS_DEBUG_EVENT => {
                    let info = event.u.CreateProcessInfo;
                    close_event_handle(info.hFile);
                    close_event_handle(info.hProcess);
                    close_event_handle(info.hThread);
                }
                CREATE_THREAD_DEBUG_EVENT => close_event_handle(event.u.CreateThread.hThread),
                LOAD_DLL_DEBUG_EVENT => close_event_handle(event.u.LoadDll.hFile),
                _ => {}
            }
        }
    }

    fn open_thread(thread_id: u32) -> Result<OwnedHandle> {
        let access = THREAD_GET_CONTEXT | THREAD_SET_CONTEXT | THREAD_QUERY_INFORMATION;
        // SAFETY: thread id came from the current debug event.
        let raw = unsafe { OpenThread(access, false, thread_id) }?;
        Ok(OwnedHandle::from_raw(raw)?)
    }

    fn context(thread: &OwnedHandle) -> Result<CONTEXT> {
        let mut value = CONTEXT {
            ContextFlags: CONTEXT_FULL_X86,
            ..Default::default()
        };
        // SAFETY: the event thread is suspended and this output is writable.
        unsafe { GetThreadContext(thread.raw(), &mut value) }?;
        Ok(value)
    }

    fn set_context(thread: &OwnedHandle, value: &CONTEXT) -> Result<()> {
        // SAFETY: this context belongs to the suspended event thread.
        unsafe { SetThreadContext(thread.raw(), value) }?;
        Ok(())
    }

    fn direct_calls(process: &Process, base: usize, size: usize) -> Result<Vec<usize>> {
        let end = base.checked_add(size).context("module range overflowed")?;
        let mut calls = Vec::new();
        for region in process.regions(base, end)? {
            if !region.readable || !region.executable {
                continue;
            }
            let start = region.base.max(base);
            let region_end = region.base.saturating_add(region.size).min(end);
            if start >= region_end {
                continue;
            }
            let Ok(bytes) = process.read_bytes(start, region_end - start) else {
                continue;
            };
            let mut decoder = Decoder::with_ip(32, &bytes, start as u64, DecoderOptions::NONE);
            let mut instruction = Instruction::default();
            while decoder.can_decode() && calls.len() < MAX_BREAKPOINTS {
                decoder.decode_out(&mut instruction);
                if instruction.is_invalid()
                    || instruction.flow_control() != FlowControl::Call
                    || !matches!(
                        instruction.op0_kind(),
                        OpKind::NearBranch16 | OpKind::NearBranch32
                    )
                {
                    continue;
                }
                let source = instruction.ip() as usize;
                let target = instruction.near_branch_target() as usize;
                if (base..end).contains(&target) && !NOISY_CALLS.contains(&source) {
                    calls.push(source);
                }
            }
        }
        calls.sort_unstable();
        calls.dedup();
        calls.truncate(MAX_BREAKPOINTS);
        Ok(calls)
    }

    fn install_breakpoints(process: &Process, addresses: &[usize]) -> Result<BTreeMap<usize, u8>> {
        let mut installed = BTreeMap::new();
        for &address in addresses {
            let original = process.read_bytes(address, 1)?[0];
            if original != 0xE8 {
                continue;
            }
            if let Err(error) = process.write_code(address, &[0xCC]) {
                for (&installed_address, &byte) in &installed {
                    let _ = process.write_code(installed_address, &[byte]);
                }
                return Err(error);
            }
            installed.insert(address, original);
        }
        Ok(installed)
    }

    fn restore_all(process: &Process, breakpoints: &BTreeMap<usize, u8>) {
        for (&address, &original) in breakpoints {
            if process
                .read_bytes(address, 1)
                .is_ok_and(|bytes| bytes == [0xCC])
            {
                let _ = process.write_code(address, &[original]);
            }
        }
    }

    fn end_pressed() -> bool {
        // SAFETY: VK_END is a valid virtual-key code.
        unsafe { GetAsyncKeyState(VK_END.0.into()) & 1 != 0 }
    }

    fn handle_exception(
        process: &Process,
        event: &DEBUG_EVENT,
        breakpoints: &BTreeMap<usize, u8>,
        stepping: &mut HashMap<u32, usize>,
        initial_break_seen: &mut bool,
    ) -> Result<NTSTATUS> {
        // SAFETY: the caller checked EXCEPTION_DEBUG_EVENT.
        let exception = unsafe { event.u.Exception.ExceptionRecord };
        let code = exception.ExceptionCode;
        let address = exception.ExceptionAddress as usize;

        if code == EXCEPTION_BREAKPOINT {
            if let Some(&original) = breakpoints.get(&address) {
                process.write_code(address, &[original])?;
                let thread = open_thread(event.dwThreadId)?;
                let mut registers = context(&thread)?;
                registers.Eip = u32::try_from(address)?;
                registers.EFlags |= TRAP_FLAG;
                set_context(&thread, &registers)?;
                stepping.insert(event.dwThreadId, address);
                return Ok(DBG_CONTINUE);
            }
            if !*initial_break_seen {
                *initial_break_seen = true;
                return Ok(DBG_CONTINUE);
            }
        }

        if code == EXCEPTION_SINGLE_STEP {
            let Some(call_address) = stepping.remove(&event.dwThreadId) else {
                return Ok(DBG_EXCEPTION_NOT_HANDLED);
            };
            let thread = open_thread(event.dwThreadId)?;
            let mut registers = context(&thread)?;
            registers.EFlags &= !TRAP_FLAG;
            let destination = registers.Eip;
            set_context(&thread, &registers)?;
            process.write_code(call_address, &[0xCC])?;
            println!("{call_address:#010x}: call {destination:#010x}");
            return Ok(DBG_CONTINUE);
        }
        Ok(DBG_EXCEPTION_NOT_HANDLED)
    }

    pub fn run() -> Result<()> {
        let entry = Process::find("wesnoth.exe")?;
        let process = Process::open(entry.clone(), true)?;
        anyhow::ensure!(process.is_32_bit()?, "call logger requires 32-bit Wesnoth");
        let (base, size) = process.module("wesnoth.exe")?;
        let calls = direct_calls(&process, base, size)?;
        anyhow::ensure!(
            !calls.is_empty(),
            "no direct calls found in executable regions"
        );

        // SAFETY: the PID is the authorized process found by ToolHelp.
        unsafe { DebugActiveProcess(entry.id) }?;
        let mut attach = AttachGuard {
            pid: entry.id,
            active: true,
        };
        let mut breakpoints = BTreeMap::new();
        let mut stepping = HashMap::new();
        let mut initial_break_seen = false;
        println!("Waiting for Windows' initial attach breakpoint...");

        loop {
            if !breakpoints.is_empty() && stepping.is_empty() && end_pressed() {
                restore_all(&process, &breakpoints);
                // SAFETY: no debug event is pending between loop iterations.
                unsafe { DebugActiveProcessStop(entry.id) }?;
                attach.active = false;
                println!("Restored {} call bytes and detached.", breakpoints.len());
                break;
            }

            let mut event = DEBUG_EVENT::default();
            // SAFETY: event is a valid writable DEBUG_EVENT.
            match unsafe { WaitForDebugEvent(&mut event, 100) } {
                Ok(()) => {}
                Err(error) if error.code() == ERROR_SEM_TIMEOUT.to_hresult() => continue,
                Err(error) => return Err(error.into()),
            }

            let result = if event.dwDebugEventCode == EXCEPTION_DEBUG_EVENT {
                // Install while every target thread is stopped at the attach event.
                if !initial_break_seen && breakpoints.is_empty() {
                    match install_breakpoints(&process, &calls) {
                        Ok(installed) => {
                            breakpoints = installed;
                            println!("Installed {} verified call breakpoints.", breakpoints.len());
                        }
                        Err(error) => {
                            // Continue this pending attach event before returning.
                            // SAFETY: this exactly matches the event above.
                            let _ = unsafe {
                                ContinueDebugEvent(
                                    event.dwProcessId,
                                    event.dwThreadId,
                                    DBG_EXCEPTION_NOT_HANDLED,
                                )
                            };
                            return Err(error);
                        }
                    }
                }
                handle_exception(
                    &process,
                    &event,
                    &breakpoints,
                    &mut stepping,
                    &mut initial_break_seen,
                )
            } else {
                Ok(DBG_CONTINUE)
            };
            dispose_event_handles(&event);
            let status = match result {
                Ok(status) => status,
                Err(error) => {
                    // SAFETY: this exactly matches the pending event.
                    let _ = unsafe {
                        ContinueDebugEvent(
                            event.dwProcessId,
                            event.dwThreadId,
                            DBG_EXCEPTION_NOT_HANDLED,
                        )
                    };
                    restore_all(&process, &breakpoints);
                    return Err(error);
                }
            };
            // SAFETY: every returned event is continued exactly once.
            unsafe { ContinueDebugEvent(event.dwProcessId, event.dwThreadId, status) }?;

            if event.dwDebugEventCode == EXIT_PROCESS_DEBUG_EVENT {
                attach.active = false;
                break;
            }
        }
        Ok(())
    }
}

#[cfg(all(windows, target_arch = "x86"))]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(all(windows, target_arch = "x86")))]
fn main() {
    eprintln!("Build this call logger for i686-pc-windows-msvc.");
}
