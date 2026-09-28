//! Complete Wyrmsun and Flare hooks ported from the original course projects.

#![cfg(target_arch = "x86")]

use std::{
    cell::UnsafeCell,
    ffi::c_void,
    ptr,
    sync::atomic::{AtomicBool, AtomicUsize, Ordering},
    thread,
    time::Duration,
};

use anyhow::{Context, Result};
use windows::{
    Win32::{
        System::LibraryLoader::GetModuleHandleW,
        UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_END},
    },
    core::w,
};

use super::{LocalPatch, near_call, near_jump, send_left_mouse};

fn module_base(name: windows::core::PCWSTR) -> Result<usize> {
    // SAFETY: the passed names are static zero-terminated strings.
    let module = unsafe { GetModuleHandleW(name) }?;
    Ok(module.0 as usize)
}

fn five_byte_detour(hook: usize, cave: usize) -> Result<[u8; 5]> {
    near_jump(hook, cave)
}

fn key_is_down(key: i32) -> bool {
    // SAFETY: Windows accepts any virtual-key integer. The high bit means down.
    unsafe { (GetAsyncKeyState(key) as u16 & 0x8000) != 0 }
}

fn end_pressed() -> bool {
    // SAFETY: VK_END is a valid virtual-key code. The low bit is an edge.
    unsafe { GetAsyncKeyState(VK_END.0.into()) & 1 != 0 }
}

// ---------------------------------------------------------------------------
// Flare 1.12 farming bot

static FLARE_MOUSE_CALL: AtomicUsize = AtomicUsize::new(0);
static FLARE_MOUSE_RETURN: AtomicUsize = AtomicUsize::new(0);
static FLARE_PLAYER_CALL: AtomicUsize = AtomicUsize::new(0);
static FLARE_PLAYER_RETURN: AtomicUsize = AtomicUsize::new(0);
static FLARE_LOOP_CALL: AtomicUsize = AtomicUsize::new(0);
static FLARE_LOOP_RETURN: AtomicUsize = AtomicUsize::new(0);

static FLARE_MOUSE_X: AtomicUsize = AtomicUsize::new(0);
static FLARE_MOUSE_Y: AtomicUsize = AtomicUsize::new(0);
static FLARE_PLAYER_X: AtomicUsize = AtomicUsize::new(0);
static FLARE_PLAYER_Y: AtomicUsize = AtomicUsize::new(0);
static FLARE_ENEMY_X: AtomicUsize = AtomicUsize::new(0);
static FLARE_ENEMY_Y: AtomicUsize = AtomicUsize::new(0);

extern "C" fn capture_flare_mouse(ebp: usize) {
    FLARE_MOUSE_X.store(ebp.saturating_add(0x664), Ordering::Release);
    FLARE_MOUSE_Y.store(ebp.saturating_add(0x668), Ordering::Release);
}

extern "C" fn capture_flare_player(ecx: usize) {
    FLARE_PLAYER_X.store(ecx.saturating_add(0x240), Ordering::Release);
    FLARE_PLAYER_Y.store(ecx.saturating_add(0x244), Ordering::Release);
}

extern "C" fn capture_flare_enemy(ebx: usize) {
    FLARE_ENEMY_X.store(ebx.saturating_sub(4), Ordering::Release);
    FLARE_ENEMY_Y.store(ebx, Ordering::Release);
}

#[unsafe(naked)]
unsafe extern "C" fn flare_mouse_cave() {
    core::arch::naked_asm!(
        "call dword ptr [{original}]",
        "pushfd",
        "pushad",
        "push ebp",
        "call {capture}",
        "add esp, 4",
        "popad",
        "popfd",
        "jmp dword ptr [{resume}]",
        original = sym FLARE_MOUSE_CALL,
        capture = sym capture_flare_mouse,
        resume = sym FLARE_MOUSE_RETURN,
    );
}

#[unsafe(naked)]
unsafe extern "C" fn flare_player_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push ecx",
        "call {capture}",
        "add esp, 4",
        "popad",
        "popfd",
        "call dword ptr [{original}]",
        "jmp dword ptr [{resume}]",
        original = sym FLARE_PLAYER_CALL,
        capture = sym capture_flare_player,
        resume = sym FLARE_PLAYER_RETURN,
    );
}

#[unsafe(naked)]
unsafe extern "C" fn flare_loop_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push ebx",
        "call {capture}",
        "add esp, 4",
        "popad",
        "popfd",
        "call dword ptr [{original}]",
        "jmp dword ptr [{resume}]",
        original = sym FLARE_LOOP_CALL,
        capture = sym capture_flare_enemy,
        resume = sym FLARE_LOOP_RETURN,
    );
}

pub fn install_flare_hooks() -> Result<Vec<LocalPatch>> {
    let base = module_base(w!("flare.exe"))?;
    let profiles = [
        (
            0x0E_CBC8,
            0x05_4210,
            flare_mouse_cave as *const () as usize,
            &FLARE_MOUSE_CALL,
            &FLARE_MOUSE_RETURN,
        ),
        (
            0x00_CAC4,
            0x02_0840,
            flare_player_cave as *const () as usize,
            &FLARE_PLAYER_CALL,
            &FLARE_PLAYER_RETURN,
        ),
        (
            0x06_BA94,
            0x06_B180,
            flare_loop_cave as *const () as usize,
            &FLARE_LOOP_CALL,
            &FLARE_LOOP_RETURN,
        ),
    ];

    let mut patches = Vec::with_capacity(profiles.len());
    for (hook_offset, call_offset, cave, call_slot, return_slot) in profiles {
        let hook = base
            .checked_add(hook_offset)
            .context("Flare hook overflowed")?;
        let target = base
            .checked_add(call_offset)
            .context("Flare call overflowed")?;
        call_slot.store(target, Ordering::Release);
        return_slot.store(hook + 5, Ordering::Release);

        let expected = near_call(hook, target)?;
        let replacement = five_byte_detour(hook, cave)?;
        patches.push(LocalPatch::apply(hook, &expected, &replacement)?);
    }
    Ok(patches)
}

pub fn run_flare_farming_bot(stop: &AtomicBool) -> Result<()> {
    let patches = install_flare_hooks()?;
    let mut mouse_down = false;

    while !stop.load(Ordering::Acquire) && !end_pressed() {
        let mouse_x = FLARE_MOUSE_X.load(Ordering::Acquire);
        let mouse_y = FLARE_MOUSE_Y.load(Ordering::Acquire);
        let player_x = FLARE_PLAYER_X.load(Ordering::Acquire);
        let player_y = FLARE_PLAYER_Y.load(Ordering::Acquire);
        let enemy_x = FLARE_ENEMY_X.load(Ordering::Acquire);
        let enemy_y = FLARE_ENEMY_Y.load(Ordering::Acquire);
        let ready = [mouse_x, mouse_y, player_x, player_y, enemy_x, enemy_y]
            .iter()
            .all(|address| *address != 0)
            && player_x != enemy_x
            && player_y != enemy_y;
        let active = ready && key_is_down(b'M' as i32);

        if active {
            // SAFETY: all six addresses came from the three verified live hooks.
            let (px, py, ex, ey) = unsafe {
                (
                    ptr::read_volatile(player_x as *const f32),
                    ptr::read_volatile(player_y as *const f32),
                    ptr::read_volatile(enemy_x as *const f32),
                    ptr::read_volatile(enemy_y as *const f32),
                )
            };
            anyhow::ensure!(
                [px, py, ex, ey].iter().all(|value| value.is_finite()),
                "Flare produced a non-finite coordinate"
            );
            let target_x = if ex < px { 490_u32 } else { 560_u32 };
            let target_y = if ey < py { 270_u32 } else { 330_u32 };
            // SAFETY: the mouse hook identified two live u32 fields.
            unsafe {
                ptr::write_volatile(mouse_x as *mut u32, target_x);
                ptr::write_volatile(mouse_y as *mut u32, target_y);
            }
        }

        if active != mouse_down {
            send_left_mouse(active)?;
            mouse_down = active;
        }
        thread::sleep(Duration::from_millis(1));
    }

    if mouse_down {
        send_left_mouse(false)?;
    }
    drop(patches); // restore all three calls after the worker stops using them
    Ok(())
}

// ---------------------------------------------------------------------------
// Wyrmsun 5.0.1 macro bot

const WORKER_RECORD_SIZE: usize = 0x110;
static WYRM_BASE: AtomicUsize = AtomicUsize::new(0);
static WYRM_RECRUIT_CALL: AtomicUsize = AtomicUsize::new(0);
static WYRM_RECRUIT_RETURN: AtomicUsize = AtomicUsize::new(0);
static WYRM_LOOP_CALL: AtomicUsize = AtomicUsize::new(0);
static WYRM_LOOP_RETURN: AtomicUsize = AtomicUsize::new(0);
static WYRM_OUTER_POINTER: AtomicUsize = AtomicUsize::new(0);
static WYRM_UNIT_RECORD: AtomicUsize = AtomicUsize::new(0);
static WYRM_CAPTURED: AtomicBool = AtomicBool::new(false);

struct SharedWorkerBuffer(UnsafeCell<[u8; WORKER_RECORD_SIZE]>);
// SAFETY: Wyrmsun's two hook sites run on its main game thread. The captured
// flag uses release/acquire ordering before any consumer reads the bytes.
unsafe impl Sync for SharedWorkerBuffer {}
static WYRM_WORKER_BYTES: SharedWorkerBuffer =
    SharedWorkerBuffer(UnsafeCell::new([0_u8; WORKER_RECORD_SIZE]));

extern "C" fn capture_wyrmsun_worker(outer_pointer: usize) {
    if outer_pointer == 0 {
        return;
    }
    // SAFETY: the verified recruit hook supplies a pointer to the outer pointer.
    let record = unsafe { ptr::read_volatile(outer_pointer as *const u32) } as usize;
    if record == 0 {
        return;
    }
    // SAFETY: the original course trace established a 0x110-byte worker record.
    unsafe {
        ptr::copy_nonoverlapping(
            record as *const u8,
            (*WYRM_WORKER_BYTES.0.get()).as_mut_ptr(),
            WORKER_RECORD_SIZE,
        );
    }
    WYRM_OUTER_POINTER.store(outer_pointer, Ordering::Release);
    WYRM_UNIT_RECORD.store(record, Ordering::Release);
    WYRM_CAPTURED.store(true, Ordering::Release);
}

unsafe fn read_pointer32(address: usize) -> Option<usize> {
    if address == 0 {
        return None;
    }
    // SAFETY: caller supplies one link from the verified in-process chain.
    let value = unsafe { ptr::read_volatile(address as *const u32) } as usize;
    (value != 0).then_some(value)
}

extern "C" fn maybe_recruit_wyrmsun_worker() {
    if !WYRM_CAPTURED.load(Ordering::Acquire) {
        return;
    }
    // SAFETY: this is the verified Wyrmsun module-relative gold-root slot; the
    // helper turns an ordinary null pointer into `None`.
    let Some(mut pointer) =
        (unsafe { read_pointer32(WYRM_BASE.load(Ordering::Acquire).saturating_add(0x61_A504)) })
    else {
        return;
    };
    for offset in [0x78_usize, 0x4, 0x8, 0x4, 0x0] {
        let Some(next_address) = pointer.checked_add(offset) else {
            return;
        };
        // SAFETY: every address comes from the previous non-null link plus one
        // verified offset in the Wyrmsun 5.0.1 pointer chain.
        let Some(next) = (unsafe { read_pointer32(next_address) }) else {
            return;
        };
        pointer = next;
    }
    let Some(gold_address) = pointer.checked_add(0x14) else {
        return;
    };
    // SAFETY: the verified chain ends at the live four-byte gold field.
    let gold = unsafe { ptr::read_volatile(gold_address as *const u32) };
    if gold <= 3000 {
        return;
    }

    let record = WYRM_UNIT_RECORD.load(Ordering::Acquire);
    let outer = WYRM_OUTER_POINTER.load(Ordering::Acquire);
    let function = WYRM_RECRUIT_CALL.load(Ordering::Acquire);
    if record == 0 || outer == 0 || function == 0 {
        return;
    }
    // SAFETY: the captured destination remains the record used by the game's
    // recruit path; both hooks run on the game thread.
    unsafe {
        ptr::copy_nonoverlapping(
            (*WYRM_WORKER_BYTES.0.get()).as_ptr(),
            record as *mut u8,
            WORKER_RECORD_SIZE,
        );
    }

    // The original function receives `outer` in ECX and again as its stack
    // argument. Rust's x86 thiscall ABI expresses that exact call shape.
    type RecruitFunction = unsafe extern "thiscall" fn(*mut c_void, *mut c_void);
    // SAFETY: this address is the verified wyrmsun.exe + 0x2CF7 function.
    let recruit: RecruitFunction = unsafe { std::mem::transmute(function) };
    // SAFETY: the captured outer pointer was observed in a legitimate call.
    unsafe { recruit(outer as *mut c_void, outer as *mut c_void) };
}

#[unsafe(naked)]
unsafe extern "C" fn wyrmsun_recruit_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push ecx",
        "call {capture}",
        "add esp, 4",
        "popad",
        "popfd",
        // Replay all eight original bytes semantically.
        "push ecx",
        "mov ecx, esi",
        "call dword ptr [{original}]",
        "jmp dword ptr [{resume}]",
        capture = sym capture_wyrmsun_worker,
        original = sym WYRM_RECRUIT_CALL,
        resume = sym WYRM_RECRUIT_RETURN,
    );
}

#[unsafe(naked)]
unsafe extern "C" fn wyrmsun_loop_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "call {maybe_recruit}",
        "popad",
        "popfd",
        // Replay the five-byte call replaced at the loop hook.
        "call dword ptr [{original}]",
        "jmp dword ptr [{resume}]",
        maybe_recruit = sym maybe_recruit_wyrmsun_worker,
        original = sym WYRM_LOOP_CALL,
        resume = sym WYRM_LOOP_RETURN,
    );
}

pub fn install_wyrmsun_hooks() -> Result<Vec<LocalPatch>> {
    let base = module_base(w!("wyrmsun.exe"))?;
    WYRM_BASE.store(base, Ordering::Release);

    let recruit_hook = base + 0x22_3471;
    let recruit_function = base + 0x00_2CF7;
    WYRM_RECRUIT_CALL.store(recruit_function, Ordering::Release);
    WYRM_RECRUIT_RETURN.store(recruit_hook + 8, Ordering::Release);
    let original_call = near_call(recruit_hook + 3, recruit_function)?;
    let mut recruit_original = [0_u8; 8];
    recruit_original[..3].copy_from_slice(&[0x51, 0x8B, 0xCE]);
    recruit_original[3..].copy_from_slice(&original_call);
    let recruit_jump = near_jump(recruit_hook, wyrmsun_recruit_cave as *const () as usize)?;
    let mut recruit_detour = [0x90_u8; 8];
    recruit_detour[..5].copy_from_slice(&recruit_jump);
    let recruit_patch = LocalPatch::apply(recruit_hook, &recruit_original, &recruit_detour)?;

    let loop_hook = base + 0x38_5D34;
    let loop_function = base + 0x00_DBCA;
    WYRM_LOOP_CALL.store(loop_function, Ordering::Release);
    WYRM_LOOP_RETURN.store(loop_hook + 5, Ordering::Release);
    let loop_original = near_call(loop_hook, loop_function)?;
    let loop_detour = near_jump(loop_hook, wyrmsun_loop_cave as *const () as usize)?;
    let loop_patch = match LocalPatch::apply(loop_hook, &loop_original, &loop_detour) {
        Ok(patch) => patch,
        Err(error) => {
            drop(recruit_patch); // restore the first hook on partial installation
            return Err(error);
        }
    };
    Ok(vec![recruit_patch, loop_patch])
}

pub fn run_wyrmsun_macro(stop: &AtomicBool) -> Result<()> {
    let patches = install_wyrmsun_hooks()?;
    while !stop.load(Ordering::Acquire) && !end_pressed() {
        thread::sleep(Duration::from_millis(20));
    }
    drop(patches);
    Ok(())
}
