#[cfg(all(windows, target_arch = "x86"))]
mod app {
    use anyhow::{Context as _, Result};
    use gha_windows_labs::{OwnedHandle, Process};
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

    const INCOME_INSTRUCTION: usize = 0x009B_4D00;
    const TRAP_FLAG: u32 = 1 << 8;

    #[derive(Clone, Copy, Debug)]
    enum BreakpointPhase {
        Armed,
        SteppingOriginal { thread_id: u32 },
    }

    struct AttachGuard {
        process_id: u32,
        active: bool,
    }

    impl AttachGuard {
        fn detach(&mut self) -> Result<()> {
            if self.active {
                // SAFETY: this debugger attached to this PID and has no event
                // waiting for continuation when this method is called.
                unsafe { DebugActiveProcessStop(self.process_id) }?;
                self.active = false;
            }
            Ok(())
        }
    }

    impl Drop for AttachGuard {
        fn drop(&mut self) {
            if self.active {
                // SAFETY: best-effort cleanup for the matching attach call.
                let _ = unsafe { DebugActiveProcessStop(self.process_id) };
            }
        }
    }

    fn close_event_handle(handle: HANDLE) {
        if !handle.is_invalid() {
            // SAFETY: debug events transfer these handles to the debugger. This
            // tool does not retain them because it opens its own process/thread
            // handles when needed.
            let _ = unsafe { CloseHandle(handle) };
        }
    }

    fn open_event_thread(thread_id: u32) -> Result<OwnedHandle> {
        let access = THREAD_GET_CONTEXT | THREAD_SET_CONTEXT | THREAD_QUERY_INFORMATION;
        // SAFETY: the thread id comes from a live debug event; inheritance is off.
        let handle = unsafe { OpenThread(access, false, thread_id) }?;
        Ok(OwnedHandle::from_raw(handle)?)
    }

    fn get_context(thread: &OwnedHandle) -> Result<CONTEXT> {
        let mut context = CONTEXT {
            ContextFlags: CONTEXT_FULL_X86,
            ..Default::default()
        };
        // SAFETY: Windows suspended the event thread and `context` is writable.
        unsafe { GetThreadContext(thread.raw(), &mut context) }?;
        Ok(context)
    }

    fn set_context(thread: &OwnedHandle, context: &CONTEXT) -> Result<()> {
        // SAFETY: the context belongs to this suspended event thread.
        unsafe { SetThreadContext(thread.raw(), context) }?;
        Ok(())
    }

    fn end_pressed() -> bool {
        // SAFETY: VK_END is a valid virtual-key value.
        unsafe { GetAsyncKeyState(VK_END.0.into()) & 1 != 0 }
    }

    fn dispose_event_handles(event: &DEBUG_EVENT) {
        // SAFETY: the active union field is selected by dwDebugEventCode.
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

    fn handle_exception(
        process: &Process,
        event: &DEBUG_EVENT,
        original_byte: u8,
        phase: &mut BreakpointPhase,
        saw_initial_breakpoint: &mut bool,
    ) -> Result<NTSTATUS> {
        // SAFETY: the event code was checked before this function was called.
        let exception = unsafe { event.u.Exception };
        let record = exception.ExceptionRecord;
        let code = record.ExceptionCode;
        let address = record.ExceptionAddress as usize;

        if code == EXCEPTION_BREAKPOINT && address == INCOME_INSTRUCTION {
            anyhow::ensure!(
                matches!(phase, BreakpointPhase::Armed),
                "income breakpoint fired while it was not armed"
            );
            process.write_code(INCOME_INSTRUCTION, &[original_byte])?;

            let thread = open_event_thread(event.dwThreadId)?;
            let mut context = get_context(&thread)?;
            // INT3 is one byte, and EIP points immediately after it. Put EIP
            // back on the original ADD instruction and ask the CPU to trap once.
            context.Eip = u32::try_from(INCOME_INSTRUCTION)?;
            context.EFlags |= TRAP_FLAG;

            let gold_address = (context.Eax as usize)
                .checked_add(4)
                .context("EAX + gold offset overflowed")?;
            let gold_before = process.read_u32(gold_address)?;
            println!(
                "income: EAX={:#010x}, EDX={} ({:#010x}), gold @ {gold_address:#010x} = {gold_before}",
                context.Eax, context.Edx as i32, context.Edx,
            );
            set_context(&thread, &context)?;
            *phase = BreakpointPhase::SteppingOriginal {
                thread_id: event.dwThreadId,
            };
            return Ok(DBG_CONTINUE);
        }

        if code == EXCEPTION_SINGLE_STEP {
            let BreakpointPhase::SteppingOriginal { thread_id } = *phase else {
                return Ok(DBG_EXCEPTION_NOT_HANDLED);
            };
            if thread_id != event.dwThreadId {
                return Ok(DBG_EXCEPTION_NOT_HANDLED);
            }

            let thread = open_event_thread(event.dwThreadId)?;
            let mut context = get_context(&thread)?;
            context.EFlags &= !TRAP_FLAG;
            set_context(&thread, &context)?;
            process.write_code(INCOME_INSTRUCTION, &[0xCC])?;
            *phase = BreakpointPhase::Armed;
            return Ok(DBG_CONTINUE);
        }

        // Windows generates one breakpoint to finish an attach. It is not the
        // game's income breakpoint, but the debugger must consume it once.
        if code == EXCEPTION_BREAKPOINT && !*saw_initial_breakpoint {
            *saw_initial_breakpoint = true;
            return Ok(DBG_CONTINUE);
        }

        Ok(DBG_EXCEPTION_NOT_HANDLED)
    }

    pub fn run() -> Result<()> {
        let entry = Process::find("wesnoth.exe")?;
        let process = Process::open(entry.clone(), true)?;
        anyhow::ensure!(
            process.is_32_bit()?,
            "this debugger profile needs 32-bit Wesnoth"
        );

        let original_byte = process.read_bytes(INCOME_INSTRUCTION, 1)?[0];
        anyhow::ensure!(
            original_byte == 0x01,
            "expected ADD opcode 0x01 at {INCOME_INSTRUCTION:#010x}, found {original_byte:#04x}"
        );

        // SAFETY: the PID came from ToolHelp and identifies the exact target.
        unsafe { DebugActiveProcess(entry.id) }?;
        let mut attach = AttachGuard {
            process_id: entry.id,
            active: true,
        };
        process.write_code(INCOME_INSTRUCTION, &[0xCC])?;

        let mut phase = BreakpointPhase::Armed;
        let mut saw_initial_breakpoint = false;
        println!(
            "Attached to Wesnoth PID {}. End a turn to hit {INCOME_INSTRUCTION:#010x}; press End to detach.",
            entry.id
        );

        loop {
            if matches!(phase, BreakpointPhase::Armed) && end_pressed() {
                process.write_code(INCOME_INSTRUCTION, &[original_byte])?;
                attach.detach()?;
                println!("Restored the breakpoint byte and detached.");
                break;
            }

            let mut event = DEBUG_EVENT::default();
            // A short timeout makes the End key usable without another thread.
            // SAFETY: `event` is a correctly initialized writable structure.
            match unsafe { WaitForDebugEvent(&mut event, 100) } {
                Ok(()) => {}
                Err(error) if error.code() == ERROR_SEM_TIMEOUT.to_hresult() => continue,
                Err(error) => return Err(error.into()),
            }

            let event_result = if event.dwDebugEventCode == EXCEPTION_DEBUG_EVENT {
                handle_exception(
                    &process,
                    &event,
                    original_byte,
                    &mut phase,
                    &mut saw_initial_breakpoint,
                )
            } else {
                Ok(DBG_CONTINUE)
            };

            dispose_event_handles(&event);
            let continue_status = match event_result {
                Ok(status) => status,
                Err(error) => {
                    // Never leave Wesnoth frozen because a log/read failed.
                    // SAFETY: this exactly matches the event returned above.
                    let _ = unsafe {
                        ContinueDebugEvent(
                            event.dwProcessId,
                            event.dwThreadId,
                            DBG_EXCEPTION_NOT_HANDLED,
                        )
                    };
                    return Err(error);
                }
            };

            // SAFETY: every event is continued exactly once.
            unsafe {
                ContinueDebugEvent(event.dwProcessId, event.dwThreadId, continue_status)?;
            }

            if event.dwDebugEventCode == EXIT_PROCESS_DEBUG_EVENT {
                attach.active = false; // the process no longer exists to detach from
                println!("Wesnoth exited; debugger finished.");
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
    eprintln!("Build this debugger for i686-pc-windows-msvc.");
}
