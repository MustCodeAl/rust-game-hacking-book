//! Exact x86 hooks used by the authorized, version-pinned course labs.

#![cfg(target_arch = "x86")]

use std::{
    ptr,
    sync::atomic::{AtomicBool, Ordering},
};

use anyhow::{Context, Result};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    INPUT, INPUT_0, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEINPUT, SendInput,
};

use super::{LocalPatch, input_structure_size, near_jump};

const WESNOTH_PLAYER_ROOT: usize = 0x017E_ED18;
const WESNOTH_GAME_OFFSET: usize = 0x0A90;
const WESNOTH_GOLD_OFFSET: usize = 0x0004;
const WESNOTH_TERRAIN_HOOK: usize = 0x00CC_AF8A;
const WESNOTH_TERRAIN_RESUME: usize = 0x00CC_AF90;

const AC_TRIGGER_HOOK: usize = 0x0040_AD9D;
const AC_TRIGGER_ORIGINAL: usize = 0x0046_07C0;
const AC_TRIGGER_RESUME: usize = 0x0040_ADA2;
const AC_RECOIL_STORE: usize = 0x0045_BAAD;
const AC_RADAR_FILTER: usize = 0x0040_9FB3;

const URT_RENDER_HOOK: usize = 0x0052_D2FD;
const URT_RENDER_RESUME: usize = 0x0052_D303;

pub static TARGET_UNDER_CROSSHAIR: AtomicBool = AtomicBool::new(false);

/// Resolves Wesnoth's two pointers and writes the live gold field.
///
/// # Safety
/// Call only inside 32-bit Wesnoth 1.14.9 after a local match has started.
unsafe fn set_wesnoth_gold(amount: u32) -> Result<()> {
    // SAFETY: the caller verified the target build; volatile access makes the
    // actual memory operation visible at this exact point.
    let player = unsafe { ptr::read_volatile(WESNOTH_PLAYER_ROOT as *const u32) } as usize;
    anyhow::ensure!(
        player != 0,
        "start a Wesnoth match before using the terrain hook"
    );

    let side_pointer_address = player
        .checked_add(WESNOTH_GAME_OFFSET)
        .context("Wesnoth side-pointer address overflowed")?;
    // SAFETY: the verified player structure owns a 32-bit pointer at +0xA90.
    let side = unsafe { ptr::read_volatile(side_pointer_address as *const u32) } as usize;
    anyhow::ensure!(side != 0, "Wesnoth side pointer is null");

    let gold_address = side
        .checked_add(WESNOTH_GOLD_OFFSET)
        .context("Wesnoth gold address overflowed")?;
    // SAFETY: the verified side structure owns its four-byte gold field at +4.
    unsafe { ptr::write_volatile(gold_address as *mut u32, amount) };
    Ok(())
}

pub fn write_wesnoth_gold(amount: u32) -> Result<()> {
    // SAFETY: the DLL worker calls this only after matching wesnoth.exe. The
    // pointer resolver still rejects the normal "no active match" null state.
    unsafe { set_wesnoth_gold(amount) }
}

extern "C" fn wesnoth_cave_body() {
    // A naked cave cannot return `Result`, so the worker verifies the target and
    // this tiny body simply leaves the game unchanged if the match is not ready.
    // SAFETY: the cave is installed only after the exact Wesnoth hook bytes
    // match; the helper checks every nullable pointer in the live chain.
    let _ = unsafe { set_wesnoth_gold(888) };
}

#[unsafe(naked)]
unsafe extern "C" fn wesnoth_terrain_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "call {body}",
        "popad",
        "popfd",
        // Replay the behavior of the six bytes replaced at the hook site.
        "mov eax, dword ptr [ecx]",
        "lea esi, [esi]",
        "jmp {resume}",
        body = sym wesnoth_cave_body,
        resume = const WESNOTH_TERRAIN_RESUME,
    );
}

extern "C" fn record_crosshair_target(value: u32) {
    TARGET_UNDER_CROSSHAIR.store(value != 0, Ordering::Release);
}

#[unsafe(naked)]
unsafe extern "C" fn assaultcube_trigger_cave() {
    core::arch::naked_asm!(
        // The removed instruction was this call. Run it first so EAX contains
        // the game's real target-under-crosshair result.
        "call {original}",
        "pushfd",
        "pushad",
        "push eax",
        "call {record}",
        "add esp, 4",
        "popad",
        "popfd",
        "jmp {resume}",
        original = const AC_TRIGGER_ORIGINAL,
        record = sym record_crosshair_target,
        resume = const AC_TRIGGER_RESUME,
    );
}

#[unsafe(naked)]
unsafe extern "C" fn urban_terror_render_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "mov dword ptr [ebx + 4], 0x0D",
        "popad",
        "popfd",
        // Replay the complete instruction that the detour replaced.
        "mov dword ptr [0x0102AE98], ebx",
        "jmp {resume}",
        resume = const URT_RENDER_RESUME,
    );
}

fn six_byte_detour(hook: usize, cave: usize) -> Result<[u8; 6]> {
    let jump = near_jump(hook, cave)?;
    let mut replacement = [0x90_u8; 6];
    replacement[..5].copy_from_slice(&jump);
    Ok(replacement)
}

pub fn install_wesnoth_terrain_hook() -> Result<LocalPatch> {
    // mov eax,[ecx] ; lea esi,[esi+eiz]
    const ORIGINAL: [u8; 6] = [0x8B, 0x01, 0x8D, 0x74, 0x26, 0x00];
    let cave = wesnoth_terrain_cave as *const () as usize;
    let replacement = six_byte_detour(WESNOTH_TERRAIN_HOOK, cave)?;
    LocalPatch::apply(WESNOTH_TERRAIN_HOOK, &ORIGINAL, &replacement)
}

pub fn install_assaultcube_trigger_hook() -> Result<LocalPatch> {
    // call 0x004607C0, encoded relative to the end of this instruction.
    const ORIGINAL: [u8; 5] = [0xE8, 0x1E, 0x5A, 0x05, 0x00];
    let cave = assaultcube_trigger_cave as *const () as usize;
    let replacement = near_jump(AC_TRIGGER_HOOK, cave)?;
    LocalPatch::apply(AC_TRIGGER_HOOK, &ORIGINAL, &replacement)
}

pub fn install_urban_terror_memory_wallhook() -> Result<LocalPatch> {
    // mov dword ptr [0x0102AE98],ebx
    const ORIGINAL: [u8; 6] = [0x89, 0x1D, 0x98, 0xAE, 0x02, 0x01];
    let cave = urban_terror_render_cave as *const () as usize;
    let replacement = six_byte_detour(URT_RENDER_HOOK, cave)?;
    LocalPatch::apply(URT_RENDER_HOOK, &ORIGINAL, &replacement)
}

pub fn enable_assaultcube_no_recoil() -> Result<LocalPatch> {
    // fstp dword ptr [ebx+0x44] -> fstp st(0), nop
    LocalPatch::apply(AC_RECOIL_STORE, &[0xD9, 0x5B, 0x44], &[0xDD, 0xD8, 0x90])
}

pub fn enable_assaultcube_show_all_radar() -> Result<LocalPatch> {
    // 0F 85 is a six-byte near JNE. Capture its four-byte destination exactly,
    // NOP the full branch, and let LocalPatch restore all six captured bytes.
    LocalPatch::apply_masked(
        AC_RADAR_FILTER,
        &[Some(0x0F), Some(0x85), None, None, None, None],
        &[0x90; 6],
    )
}

pub fn send_left_mouse(pressed: bool) -> Result<()> {
    let flags = if pressed {
        MOUSEEVENTF_LEFTDOWN
    } else {
        MOUSEEVENTF_LEFTUP
    };
    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    // SAFETY: `input` is a fully initialized INPUT value and the structure size
    // is the one expected by this build of Windows.
    let sent = unsafe { SendInput(&[input], input_structure_size()) };
    anyhow::ensure!(sent == 1, "SendInput sent {sent} of 1 mouse event");
    Ok(())
}
