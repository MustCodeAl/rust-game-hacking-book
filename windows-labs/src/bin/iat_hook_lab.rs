#[cfg(all(windows, target_arch = "x86"))]
mod lab {
    use std::{
        ffi::c_void,
        sync::atomic::{AtomicUsize, Ordering},
    };

    use anyhow::{Context, Result};
    use windows::{
        Win32::{
            Foundation::HWND,
            System::{
                LibraryLoader::GetModuleHandleW,
                Memory::{PAGE_PROTECTION_FLAGS, PAGE_READWRITE, VirtualProtect},
            },
            UI::WindowsAndMessaging::{MB_OK, MESSAGEBOX_RESULT, MESSAGEBOX_STYLE, MessageBoxW},
        },
        core::{PCWSTR, w},
    };

    type RawMessageBoxW =
        unsafe extern "system" fn(HWND, PCWSTR, PCWSTR, MESSAGEBOX_STYLE) -> MESSAGEBOX_RESULT;

    static ORIGINAL_MESSAGE_BOX: AtomicUsize = AtomicUsize::new(0);

    unsafe extern "system" fn hooked_message_box(
        window: HWND,
        _text: PCWSTR,
        caption: PCWSTR,
        style: MESSAGEBOX_STYLE,
    ) -> MESSAGEBOX_RESULT {
        let address = ORIGINAL_MESSAGE_BOX.load(Ordering::Acquire);
        if address == 0 {
            return MESSAGEBOX_RESULT(0);
        }
        // SAFETY: install() stores the original MessageBoxW IAT target before the
        // hook can run, and the signature exactly matches the imported function.
        let original: RawMessageBoxW = unsafe { std::mem::transmute(address) };
        // SAFETY: the saved function pointer and all arguments obey MessageBoxW's ABI.
        unsafe {
            original(
                window,
                w!("Rust reached the replacement IAT entry."),
                caption,
                style,
            )
        }
    }

    fn u16_at(bytes: &[u8], offset: usize) -> Result<u16> {
        let end = offset.checked_add(2).context("offset overflowed")?;
        Ok(u16::from_le_bytes(
            bytes
                .get(offset..end)
                .context("u16 outside image")?
                .try_into()?,
        ))
    }

    fn u32_at(bytes: &[u8], offset: usize) -> Result<u32> {
        let end = offset.checked_add(4).context("offset overflowed")?;
        Ok(u32::from_le_bytes(
            bytes
                .get(offset..end)
                .context("u32 outside image")?
                .try_into()?,
        ))
    }

    fn c_string_at(bytes: &[u8], offset: usize) -> Result<&[u8]> {
        let tail = bytes.get(offset..).context("string RVA outside image")?;
        let end = tail
            .iter()
            .position(|byte| *byte == 0)
            .context("unterminated import name")?;
        Ok(&tail[..end])
    }

    unsafe fn write_slot(slot: *mut u32, value: u32) -> Result<()> {
        let mut old = PAGE_PROTECTION_FLAGS::default();
        // SAFETY: slot points to the four-byte IAT cell found inside this module.
        unsafe { VirtualProtect(slot.cast::<c_void>(), 4, PAGE_READWRITE, &mut old)? };
        // SAFETY: VirtualProtect made this validated IAT cell writable.
        unsafe { slot.write_volatile(value) };
        let mut ignored = PAGE_PROTECTION_FLAGS::default();
        // SAFETY: restore the exact protection returned by the first call.
        unsafe { VirtualProtect(slot.cast::<c_void>(), 4, old, &mut ignored)? };
        Ok(())
    }

    struct IatPatch {
        slot: *mut u32,
        original: u32,
    }

    impl Drop for IatPatch {
        fn drop(&mut self) {
            // SAFETY: the patch owns this validated slot and restores it once.
            if let Err(error) = unsafe { write_slot(self.slot, self.original) } {
                eprintln!("could not restore MessageBoxW IAT slot: {error:#}");
            }
            ORIGINAL_MESSAGE_BOX.store(0, Ordering::Release);
        }
    }

    unsafe fn install() -> Result<IatPatch> {
        // SAFETY: a null module name asks Windows for the current executable.
        let module = unsafe { GetModuleHandleW(PCWSTR::null()) }?;
        let base = module.0 as usize;

        // Every loaded PE image maps at least its first header page. Read that
        // page first, validate it, then use SizeOfImage for the bounded view.
        // SAFETY: base is the current loaded module and its header page is mapped.
        let header = unsafe { std::slice::from_raw_parts(base as *const u8, 4096) };
        anyhow::ensure!(header.get(..2) == Some(b"MZ"), "missing MZ header");
        let pe = usize::try_from(u32_at(header, 0x3c)?)?;
        anyhow::ensure!(
            header.get(pe..pe + 4) == Some(b"PE\0\0"),
            "missing PE header"
        );
        let optional = pe.checked_add(24).context("optional-header overflowed")?;
        anyhow::ensure!(u16_at(header, optional)? == 0x10b, "this lab expects PE32");
        let image_size = usize::try_from(u32_at(header, optional + 56)?)?;
        anyhow::ensure!(
            (4096..=512 * 1024 * 1024).contains(&image_size),
            "bad image size"
        );

        // SAFETY: SizeOfImage describes the mapped extent of the current module.
        let image = unsafe { std::slice::from_raw_parts(base as *const u8, image_size) };
        let import_rva = usize::try_from(u32_at(image, optional + 96 + 8)?)?;
        anyhow::ensure!(import_rva != 0, "the executable has no import directory");

        for descriptor_index in 0..256_usize {
            let descriptor = import_rva
                .checked_add(descriptor_index * 20)
                .context("descriptor offset overflowed")?;
            let original_thunk = usize::try_from(u32_at(image, descriptor)?)?;
            let name_rva = usize::try_from(u32_at(image, descriptor + 12)?)?;
            let first_thunk = usize::try_from(u32_at(image, descriptor + 16)?)?;
            if original_thunk == 0 && name_rva == 0 && first_thunk == 0 {
                break;
            }
            if !c_string_at(image, name_rva)?.eq_ignore_ascii_case(b"user32.dll") {
                continue;
            }

            let names = if original_thunk == 0 {
                first_thunk
            } else {
                original_thunk
            };
            for index in 0..2048_usize {
                let name_cell = names
                    .checked_add(index * 4)
                    .context("name thunk overflowed")?;
                let name_value = u32_at(image, name_cell)?;
                if name_value == 0 {
                    break;
                }
                if name_value & 0x8000_0000 != 0 {
                    continue; // imported by ordinal, so it has no name to compare
                }
                let import_name = usize::try_from(name_value)?
                    .checked_add(2)
                    .context("import name overflowed")?;
                if c_string_at(image, import_name)? != b"MessageBoxW" {
                    continue;
                }

                let slot_rva = first_thunk
                    .checked_add(index * 4)
                    .context("IAT overflowed")?;
                anyhow::ensure!(slot_rva + 4 <= image_size, "IAT slot outside image");
                let slot = (base + slot_rva) as *mut u32;
                // SAFETY: the validated slot points to one aligned PE32 thunk cell.
                let original = unsafe { slot.read_volatile() };
                anyhow::ensure!(original != 0, "MessageBoxW IAT slot was null");
                ORIGINAL_MESSAGE_BOX.store(original as usize, Ordering::Release);
                // SAFETY: slot is a validated four-byte IAT cell in our own process.
                unsafe { write_slot(slot, hooked_message_box as *const () as usize as u32)? };
                return Ok(IatPatch { slot, original });
            }
        }
        anyhow::bail!("MessageBoxW was not found in this executable's IAT")
    }

    pub fn run() -> Result<()> {
        // SAFETY: literals are valid zero-terminated UTF-16 and no window owner is needed.
        unsafe {
            MessageBoxW(
                None,
                w!("The normal import runs first."),
                w!("GHA IAT lab"),
                MB_OK,
            )
        };
        // SAFETY: install parses and writes only this executable's validated IAT slot.
        let patch = unsafe { install()? };
        // SAFETY: the call is redirected through the temporary IAT patch.
        unsafe {
            MessageBoxW(
                None,
                w!("You should not see this sentence."),
                w!("GHA IAT lab"),
                MB_OK,
            )
        };
        drop(patch);
        // SAFETY: dropping the patch restored the original imported function.
        unsafe {
            MessageBoxW(
                None,
                w!("The original import is restored."),
                w!("GHA IAT lab"),
                MB_OK,
            )
        };
        Ok(())
    }
}

#[cfg(all(windows, target_arch = "x86"))]
fn main() -> anyhow::Result<()> {
    lab::run()
}

#[cfg(not(all(windows, target_arch = "x86")))]
fn main() {
    eprintln!("Build this self-hooking lab for i686-pc-windows-msvc.");
}
