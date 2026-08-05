use std::{ffi::c_void, mem::size_of, ptr};

use anyhow::{Context, Result};
use windows::Win32::System::{
    Diagnostics::Debug::FlushInstructionCache,
    Memory::{PAGE_EXECUTE_READWRITE, PAGE_PROTECTION_FLAGS, VirtualProtect},
    Threading::GetCurrentProcess,
};

/// A patch applied inside the current process.
///
/// The original bytes are owned by this value. Calling `restore`, or simply
/// dropping the value, puts those bytes back.
pub struct LocalPatch {
    address: usize,
    original: Vec<u8>,
    active: bool,
}

fn read_local(address: usize, count: usize) -> Result<Vec<u8>> {
    anyhow::ensure!(address != 0, "cannot read address zero");
    anyhow::ensure!(count != 0, "cannot read an empty instruction span");

    let mut bytes = vec![0_u8; count];
    // SAFETY: callers use a supported-game profile. The bytes are copied
    // immediately into owned memory and are never exposed as a borrowed slice.
    unsafe {
        ptr::copy_nonoverlapping(address as *const u8, bytes.as_mut_ptr(), count);
    }
    Ok(bytes)
}

fn write_local_code(address: usize, bytes: &[u8]) -> Result<()> {
    anyhow::ensure!(address != 0, "cannot patch address zero");
    anyhow::ensure!(!bytes.is_empty(), "cannot write an empty patch");

    let mut old_protection = PAGE_PROTECTION_FLAGS::default();
    // SAFETY: the supported-game profile supplies the live instruction range;
    // Windows validates the page and returns its previous protection.
    unsafe {
        VirtualProtect(
            address as *const c_void,
            bytes.len(),
            PAGE_EXECUTE_READWRITE,
            &mut old_protection,
        )?;
    }

    // SAFETY: VirtualProtect made the verified instruction range writable.
    unsafe {
        ptr::copy_nonoverlapping(bytes.as_ptr(), address as *mut u8, bytes.len());
        FlushInstructionCache(
            GetCurrentProcess(),
            Some(address as *const c_void),
            bytes.len(),
        )?;
    }

    let mut ignored = PAGE_PROTECTION_FLAGS::default();
    // SAFETY: restore the protection returned for the exact same range.
    unsafe {
        VirtualProtect(
            address as *const c_void,
            bytes.len(),
            old_protection,
            &mut ignored,
        )?;
    }
    Ok(())
}

impl LocalPatch {
    /// Applies a patch only when every original byte matches.
    pub fn apply(address: usize, expected: &[u8], replacement: &[u8]) -> Result<Self> {
        anyhow::ensure!(
            expected.len() == replacement.len(),
            "expected and replacement instruction spans differ"
        );
        let found = read_local(address, expected.len())?;
        anyhow::ensure!(
            found == expected,
            "bytes at {address:#010x} do not match the supported game build"
        );
        write_local_code(address, replacement)?;
        Ok(Self {
            address,
            original: found,
            active: true,
        })
    }

    /// Applies a patch with a mask. `Some(byte)` must match; `None` captures
    /// the live byte without guessing it. This is useful for a branch whose
    /// opcode is known but whose four-byte relative destination is recorded at
    /// runtime and restored exactly.
    pub fn apply_masked(
        address: usize,
        expected: &[Option<u8>],
        replacement: &[u8],
    ) -> Result<Self> {
        anyhow::ensure!(
            expected.len() == replacement.len(),
            "mask and replacement instruction spans differ"
        );
        let found = read_local(address, expected.len())?;
        for (index, (actual, wanted)) in found.iter().zip(expected).enumerate() {
            if let Some(wanted) = wanted {
                anyhow::ensure!(
                    actual == wanted,
                    "byte {index} at {address:#010x} is {actual:#04x}, expected {wanted:#04x}"
                );
            }
        }
        write_local_code(address, replacement)?;
        Ok(Self {
            address,
            original: found,
            active: true,
        })
    }

    pub fn restore(&mut self) -> Result<()> {
        if self.active {
            write_local_code(self.address, &self.original)
                .with_context(|| format!("could not restore patch at {:#010x}", self.address))?;
            self.active = false;
        }
        Ok(())
    }
}

impl Drop for LocalPatch {
    fn drop(&mut self) {
        if let Err(error) = self.restore() {
            eprintln!("warning: {error:#}");
        }
    }
}

/// Builds the five bytes used by an x86 near jump (`E9` plus `rel32`).
pub fn near_jump(from: usize, to: usize) -> Result<[u8; 5]> {
    relative_instruction(0xE9, from, to)
}

/// Builds the five bytes used by an x86 near call (`E8` plus `rel32`).
pub fn near_call(from: usize, to: usize) -> Result<[u8; 5]> {
    relative_instruction(0xE8, from, to)
}

fn relative_instruction(opcode: u8, from: usize, to: usize) -> Result<[u8; 5]> {
    let next = from.checked_add(5).context("jump address overflowed")?;
    let difference = (to as i128) - (next as i128);
    let displacement = i32::try_from(difference).context("jump is outside x86 rel32 range")?;
    let mut instruction = [0_u8; 5];
    instruction[0] = opcode;
    instruction[1..].copy_from_slice(&displacement.to_le_bytes());
    Ok(instruction)
}

pub fn input_structure_size() -> i32 {
    i32::try_from(size_of::<windows::Win32::UI::Input::KeyboardAndMouse::INPUT>())
        .expect("INPUT fits in an i32 on Windows")
}

#[cfg(test)]
mod tests {
    use super::{near_call, near_jump};

    #[test]
    fn near_jump_handles_forward_and_backward_destinations() {
        assert_eq!(near_jump(0x1000, 0x1010).unwrap(), [0xE9, 0x0B, 0, 0, 0]);
        assert_eq!(
            near_jump(0x1010, 0x1000).unwrap(),
            [0xE9, 0xEB, 0xFF, 0xFF, 0xFF]
        );
        assert_eq!(near_call(0x1000, 0x1010).unwrap(), [0xE8, 0x0B, 0, 0, 0]);
    }
}
