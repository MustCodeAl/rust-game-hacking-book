use std::{ffi::c_void, mem::size_of};

use anyhow::{Context, Result};
use windows::Win32::{
    Foundation::ERROR_NO_MORE_FILES,
    System::{
        Diagnostics::{
            Debug::{FlushInstructionCache, ReadProcessMemory, WriteProcessMemory},
            ToolHelp::{
                CreateToolhelp32Snapshot, MODULEENTRY32W, Module32FirstW, Module32NextW,
                PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPMODULE,
                TH32CS_SNAPMODULE32, TH32CS_SNAPPROCESS,
            },
        },
        Memory::{
            MEM_COMMIT, MEMORY_BASIC_INFORMATION, PAGE_EXECUTE, PAGE_EXECUTE_READ,
            PAGE_EXECUTE_READWRITE, PAGE_EXECUTE_WRITECOPY, PAGE_GUARD, PAGE_NOACCESS,
            PAGE_PROTECTION_FLAGS, PAGE_READONLY, PAGE_READWRITE, PAGE_WRITECOPY, VirtualProtectEx,
            VirtualQueryEx,
        },
        SystemInformation::{
            IMAGE_FILE_MACHINE, IMAGE_FILE_MACHINE_I386, IMAGE_FILE_MACHINE_UNKNOWN,
        },
        Threading::{
            IsWow64Process2, OpenProcess, PROCESS_ACCESS_RIGHTS, PROCESS_QUERY_INFORMATION,
            PROCESS_VM_OPERATION, PROCESS_VM_READ, PROCESS_VM_WRITE,
        },
    },
};

use super::OwnedHandle;

#[derive(Clone, Debug)]
pub struct ProcessEntry {
    pub id: u32,
    pub name: String,
}

#[derive(Clone, Copy, Debug)]
pub struct MemoryRegion {
    pub base: usize,
    pub size: usize,
    pub readable: bool,
    pub writable: bool,
    pub executable: bool,
}

#[derive(Debug)]
pub struct Process {
    handle: OwnedHandle,
    id: u32,
    name: String,
}

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

impl Process {
    /// Lists every running process with ToolHelp.
    pub fn list() -> Result<Vec<ProcessEntry>> {
        // SAFETY: no borrowed pointers are passed; the returned snapshot is owned below.
        let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) }?;
        let snapshot = OwnedHandle::from_raw(snapshot)?;

        let mut raw = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };

        // SAFETY: `raw` is correctly sized and writable for the duration of the call.
        unsafe { Process32FirstW(snapshot.raw(), &mut raw) }?;

        let mut processes = Vec::new();
        loop {
            processes.push(ProcessEntry {
                id: raw.th32ProcessID,
                name: wide_text(&raw.szExeFile),
            });

            // SAFETY: `raw` remains a valid PROCESSENTRY32W output buffer.
            match unsafe { Process32NextW(snapshot.raw(), &mut raw) } {
                Ok(()) => {}
                Err(error) if no_more_files(&error) => break,
                Err(error) => return Err(error.into()),
            }
        }
        Ok(processes)
    }

    pub fn find(name: &str) -> Result<ProcessEntry> {
        Self::list()?
            .into_iter()
            .find(|entry| entry.name.eq_ignore_ascii_case(name))
            .with_context(|| format!("process {name:?} is not running"))
    }

    pub fn open_by_name(name: &str, allow_write: bool) -> Result<Self> {
        let entry = Self::find(name)?;
        Self::open(entry, allow_write)
    }

    pub fn open(entry: ProcessEntry, allow_write: bool) -> Result<Self> {
        let mut access: PROCESS_ACCESS_RIGHTS = PROCESS_QUERY_INFORMATION | PROCESS_VM_READ;
        if allow_write {
            access |= PROCESS_VM_OPERATION | PROCESS_VM_WRITE;
        }

        Self::open_with_access(entry, access)
    }

    pub fn open_with_access(entry: ProcessEntry, access: PROCESS_ACCESS_RIGHTS) -> Result<Self> {
        // SAFETY: the PID is a value; inheritance is disabled; `OwnedHandle` owns the result.
        let handle = unsafe { OpenProcess(access, false, entry.id) }?;
        Ok(Self {
            handle: OwnedHandle::from_raw(handle)?,
            id: entry.id,
            name: entry.name,
        })
    }

    pub fn is_32_bit(&self) -> Result<bool> {
        let mut process_machine = IMAGE_FILE_MACHINE::default();
        let mut native_machine = IMAGE_FILE_MACHINE::default();
        // SAFETY: both output pointers remain valid for the call.
        unsafe {
            IsWow64Process2(
                self.handle.raw(),
                &mut process_machine,
                Some(&mut native_machine),
            )?;
        }
        Ok(process_machine == IMAGE_FILE_MACHINE_I386
            || (process_machine == IMAGE_FILE_MACHINE_UNKNOWN
                && native_machine == IMAGE_FILE_MACHINE_I386))
    }

    pub fn id(&self) -> u32 {
        self.id
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn raw_handle(&self) -> windows::Win32::Foundation::HANDLE {
        self.handle.raw()
    }

    pub fn read_exact(&self, address: usize, output: &mut [u8]) -> Result<()> {
        let mut bytes_read = 0_usize;
        // SAFETY: `output` is writable for its length. Windows validates the remote range.
        unsafe {
            ReadProcessMemory(
                self.handle.raw(),
                address as *const c_void,
                output.as_mut_ptr().cast(),
                output.len(),
                Some(&mut bytes_read),
            )?;
        }
        anyhow::ensure!(bytes_read == output.len(), "short read at {address:#x}");
        Ok(())
    }

    pub fn read_bytes(&self, address: usize, count: usize) -> Result<Vec<u8>> {
        let mut bytes = vec![0_u8; count];
        self.read_exact(address, &mut bytes)?;
        Ok(bytes)
    }

    pub fn read_u32(&self, address: usize) -> Result<u32> {
        let bytes: [u8; 4] = self
            .read_bytes(address, 4)?
            .try_into()
            .expect("the read length is exactly four");
        Ok(u32::from_le_bytes(bytes))
    }

    pub fn read_f32(&self, address: usize) -> Result<f32> {
        Ok(f32::from_bits(self.read_u32(address)?))
    }

    pub fn write_exact(&self, address: usize, bytes: &[u8]) -> Result<()> {
        let mut bytes_written = 0_usize;
        // SAFETY: `bytes` is readable for its length. Windows validates the remote range.
        unsafe {
            WriteProcessMemory(
                self.handle.raw(),
                address as *const c_void,
                bytes.as_ptr().cast(),
                bytes.len(),
                Some(&mut bytes_written),
            )?;
        }
        anyhow::ensure!(bytes_written == bytes.len(), "short write at {address:#x}");
        Ok(())
    }

    pub fn write_u32(&self, address: usize, value: u32) -> Result<()> {
        self.write_exact(address, &value.to_le_bytes())
    }

    /// Writes machine code, flushes the CPU instruction cache, and restores protection.
    pub fn write_code(&self, address: usize, bytes: &[u8]) -> Result<()> {
        let mut old = PAGE_PROTECTION_FLAGS::default();
        // SAFETY: Windows validates the target range and writes `old` before returning.
        unsafe {
            VirtualProtectEx(
                self.handle.raw(),
                address as *const c_void,
                bytes.len(),
                PAGE_EXECUTE_READWRITE,
                &mut old,
            )?;
        }

        let write_result = self.write_exact(address, bytes);
        if write_result.is_ok() {
            // SAFETY: the process handle is live and the written range is the one above.
            unsafe {
                FlushInstructionCache(
                    self.handle.raw(),
                    Some(address as *const c_void),
                    bytes.len(),
                )?;
            }
        }

        let mut ignored = PAGE_PROTECTION_FLAGS::default();
        // SAFETY: this restores the protection returned by the first call.
        let restore_result = unsafe {
            VirtualProtectEx(
                self.handle.raw(),
                address as *const c_void,
                bytes.len(),
                old,
                &mut ignored,
            )
        };

        write_result?;
        restore_result?;
        Ok(())
    }

    pub fn module(&self, wanted_name: &str) -> Result<(usize, usize)> {
        // Include SNAPMODULE32 so a 64-bit tool can list a 32-bit game module.
        // SAFETY: the PID is valid and the returned snapshot is owned below.
        let snapshot =
            unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, self.id) }?;
        let snapshot = OwnedHandle::from_raw(snapshot)?;
        let mut raw = MODULEENTRY32W {
            dwSize: size_of::<MODULEENTRY32W>() as u32,
            ..Default::default()
        };

        // SAFETY: `raw` is correctly sized and writable.
        unsafe { Module32FirstW(snapshot.raw(), &mut raw) }?;
        loop {
            if wide_text(&raw.szModule).eq_ignore_ascii_case(wanted_name) {
                return Ok((raw.modBaseAddr as usize, raw.modBaseSize as usize));
            }
            // SAFETY: `raw` remains a valid output buffer.
            match unsafe { Module32NextW(snapshot.raw(), &mut raw) } {
                Ok(()) => {}
                Err(error) if no_more_files(&error) => break,
                Err(error) => return Err(error.into()),
            }
        }
        anyhow::bail!("module {wanted_name:?} was not found in {}", self.name)
    }

    pub fn regions(&self, start: usize, end: usize) -> Result<Vec<MemoryRegion>> {
        let mut current = start;
        let mut regions = Vec::new();

        while current < end {
            let mut raw = MEMORY_BASIC_INFORMATION::default();
            // SAFETY: `raw` is a valid output structure; Windows validates the address.
            let returned = unsafe {
                VirtualQueryEx(
                    self.handle.raw(),
                    Some(current as *const c_void),
                    &mut raw,
                    size_of::<MEMORY_BASIC_INFORMATION>(),
                )
            };
            if returned == 0 {
                break;
            }

            let protection = raw.Protect;
            let blocked = protection.contains(PAGE_GUARD) || protection.contains(PAGE_NOACCESS);
            let readable = !blocked
                && raw.State == MEM_COMMIT
                && [
                    PAGE_READONLY,
                    PAGE_READWRITE,
                    PAGE_WRITECOPY,
                    PAGE_EXECUTE_READ,
                    PAGE_EXECUTE_READWRITE,
                    PAGE_EXECUTE_WRITECOPY,
                ]
                .iter()
                .any(|flag| protection.contains(*flag));
            let writable = readable
                && [
                    PAGE_READWRITE,
                    PAGE_WRITECOPY,
                    PAGE_EXECUTE_READWRITE,
                    PAGE_EXECUTE_WRITECOPY,
                ]
                .iter()
                .any(|flag| protection.contains(*flag));
            let executable = !blocked
                && [
                    PAGE_EXECUTE,
                    PAGE_EXECUTE_READ,
                    PAGE_EXECUTE_READWRITE,
                    PAGE_EXECUTE_WRITECOPY,
                ]
                .iter()
                .any(|flag| protection.contains(*flag));

            let base = raw.BaseAddress as usize;
            let size = raw.RegionSize;
            regions.push(MemoryRegion {
                base,
                size,
                readable,
                writable,
                executable,
            });

            let next = base.checked_add(size).context("memory map overflowed")?;
            anyhow::ensure!(next > current, "memory map did not advance");
            current = next;
        }
        Ok(regions)
    }
}
