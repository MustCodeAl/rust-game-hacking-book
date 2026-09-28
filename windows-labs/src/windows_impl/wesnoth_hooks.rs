//! Additional Wesnoth 1.14.9 hacks from the original map/stat lessons.

#![cfg(target_arch = "x86")]

use std::ptr;

use anyhow::Result;

use super::{LocalPatch, near_call, near_jump};

const PLAYER_ROOT: usize = 0x017E_ED18;
const GAME_OFFSET: usize = 0x0A90;
const SECOND_PLAYER_GOLD_OFFSET: usize = 0x0274;

const STAT_HOOK: usize = 0x005E_D129;
const STAT_PRINT_FUNCTION: usize = 0x005E_9630;
const STAT_RESUME: usize = 0x005E_D12E;

const MAP_UPDATE: usize = 0x006C_D519;

fn decimal_bytes(mut value: u32) -> [u8; 4] {
    value = value.min(999);
    let mut bytes = [0_u8; 4];
    if value >= 100 {
        bytes[0] = b'0' + (value / 100) as u8;
        bytes[1] = b'0' + ((value / 10) % 10) as u8;
        bytes[2] = b'0' + (value % 10) as u8;
    } else if value >= 10 {
        bytes[0] = b'0' + (value / 10) as u8;
        bytes[1] = b'0' + (value % 10) as u8;
    } else {
        bytes[0] = b'0' + value as u8;
    }
    bytes
}

extern "C" fn prepend_second_player_gold(edx: usize) {
    if edx == 0 {
        return;
    }
    // SAFETY: all addresses are from the verified 32-bit Wesnoth profile. Each
    // normal missing-match pointer is checked before the next dereference.
    let player = unsafe { ptr::read_volatile(PLAYER_ROOT as *const u32) } as usize;
    if player == 0 {
        return;
    }
    // SAFETY: the player record stores a game/side pointer at +0xA90.
    let game = unsafe { ptr::read_volatile((player + GAME_OFFSET) as *const u32) } as usize;
    if game == 0 {
        return;
    }
    // SAFETY: the second player's gold is the four-byte field at +0x274.
    let gold = unsafe { ptr::read_volatile((game + SECOND_PLAYER_GOLD_OFFSET) as *const u32) };
    // EDX points to the game's pointer to its output text buffer.
    // SAFETY: this shape was observed at the exact hooked print call.
    let output = unsafe { ptr::read_volatile(edx as *const u32) } as usize;
    if output == 0 {
        return;
    }
    let digits = decimal_bytes(gold);
    // SAFETY: the original course cave writes exactly the first three bytes of
    // this existing text buffer; the fourth byte in `digits` is only padding.
    unsafe {
        ptr::copy_nonoverlapping(digits.as_ptr(), output as *mut u8, 3);
    }
}

#[unsafe(naked)]
unsafe extern "C" fn wesnoth_stat_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push edx",
        "call {prepend}",
        "add esp, 4",
        "popad",
        "popfd",
        // Replay the five-byte print call replaced by the detour.
        "call {original}",
        "jmp {resume}",
        prepend = sym prepend_second_player_gold,
        original = const STAT_PRINT_FUNCTION,
        resume = const STAT_RESUME,
    );
}

pub fn install_wesnoth_stat_hook() -> Result<LocalPatch> {
    let expected = near_call(STAT_HOOK, STAT_PRINT_FUNCTION)?;
    let cave = wesnoth_stat_cave as *const () as usize;
    let replacement = near_jump(STAT_HOOK, cave)?;
    LocalPatch::apply(STAT_HOOK, &expected, &replacement)
}

pub fn enable_wesnoth_map_reveal() -> Result<LocalPatch> {
    // mov eax,ebp ; shl eax,cl ; not eax ; and dword ptr [esi],eax
    const ORIGINAL: [u8; 8] = [0x8B, 0xC5, 0xD3, 0xE0, 0xF7, 0xD0, 0x21, 0x06];
    // nop/nop/nop ; or dword ptr [esi],0xFFFFFFFF ; nop/nop
    const REVEAL: [u8; 8] = [0x90, 0x90, 0x90, 0x83, 0x0E, 0xFF, 0x90, 0x90];
    LocalPatch::apply(MAP_UPDATE, &ORIGINAL, &REVEAL)
}

#[cfg(test)]
mod tests {
    use super::decimal_bytes;

    #[test]
    fn formats_the_three_bytes_used_by_the_course_cave() {
        assert_eq!(&decimal_bytes(7)[..3], b"7\0\0");
        assert_eq!(&decimal_bytes(42)[..3], b"42\0");
        assert_eq!(&decimal_bytes(999)[..3], b"999");
    }
}
