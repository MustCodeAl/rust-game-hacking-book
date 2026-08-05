//! Urban Terror 4.3.4 OpenGL wallhack/chams hook from the original course lab.

#![cfg(target_arch = "x86")]

use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};

use anyhow::{Context, Result};
use windows::{
    Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress},
    core::{s, w},
};

use super::{LocalPatch, near_jump};

pub const OPENGL_OFF: u32 = 0;
pub const OPENGL_WALLHACK: u32 = 1;
pub const OPENGL_CHAMS: u32 = 2;

const GL_LEQUAL: u32 = 0x0203;
const GL_ALWAYS: u32 = 0x0207;
const GL_COLOR_MATERIAL: u32 = 0x0B57;
const GL_COLOR_ARRAY: u32 = 0x8076;
const GL_TEXTURE_COORD_ARRAY: u32 = 0x8078;

static OPENGL_MODE: AtomicU32 = AtomicU32::new(OPENGL_OFF);
static DRAW_RETURN: AtomicUsize = AtomicUsize::new(0);
static DEPTH_FUNC: AtomicUsize = AtomicUsize::new(0);
static DEPTH_RANGE: AtomicUsize = AtomicUsize::new(0);
static COLOR_4F: AtomicUsize = AtomicUsize::new(0);
static ENABLE: AtomicUsize = AtomicUsize::new(0);
static DISABLE: AtomicUsize = AtomicUsize::new(0);
static ENABLE_CLIENT_STATE: AtomicUsize = AtomicUsize::new(0);
static DISABLE_CLIENT_STATE: AtomicUsize = AtomicUsize::new(0);

type GlDepthFunc = unsafe extern "system" fn(u32);
type GlDepthRange = unsafe extern "system" fn(f64, f64);
type GlColor4f = unsafe extern "system" fn(f32, f32, f32, f32);
type GlState = unsafe extern "system" fn(u32);

fn address(slot: &AtomicUsize) -> Option<usize> {
    let value = slot.load(Ordering::Acquire);
    (value != 0).then_some(value)
}

extern "C" fn apply_urban_terror_gl_state(count: u32) {
    let mode = OPENGL_MODE.load(Ordering::Acquire);
    let (Some(depth_func), Some(depth_range)) = (address(&DEPTH_FUNC), address(&DEPTH_RANGE))
    else {
        return;
    };
    // SAFETY: install_urban_terror_opengl_hook resolved these opengl32 exports
    // and stored function pointers with their documented Windows ABI.
    let depth_func: GlDepthFunc = unsafe { std::mem::transmute(depth_func) };
    // SAFETY: same proof as above for glDepthRange.
    let depth_range: GlDepthRange = unsafe { std::mem::transmute(depth_range) };

    let highlighted = mode != OPENGL_OFF && count > 500;
    // SAFETY: a current Urban Terror render context called this hook.
    unsafe {
        if highlighted {
            depth_range(0.0, 0.0);
            depth_func(GL_ALWAYS);
        } else {
            depth_range(0.0, 1.0);
            depth_func(GL_LEQUAL);
        }
    }

    if mode != OPENGL_CHAMS {
        return;
    }
    let (Some(color), Some(enable), Some(disable), Some(enable_client), Some(disable_client)) = (
        address(&COLOR_4F),
        address(&ENABLE),
        address(&DISABLE),
        address(&ENABLE_CLIENT_STATE),
        address(&DISABLE_CLIENT_STATE),
    ) else {
        return;
    };
    // SAFETY: each address was resolved from the matching named OpenGL export.
    let color: GlColor4f = unsafe { std::mem::transmute(color) };
    // SAFETY: `enable` is the address returned for the glEnable export.
    let enable: GlState = unsafe { std::mem::transmute(enable) };
    // SAFETY: `disable` is the address returned for the glDisable export.
    let disable: GlState = unsafe { std::mem::transmute(disable) };
    // SAFETY: this address came from glEnableClientState, which has this ABI.
    let enable_client: GlState = unsafe { std::mem::transmute(enable_client) };
    // SAFETY: this address came from glDisableClientState, which has this ABI.
    let disable_client: GlState = unsafe { std::mem::transmute(disable_client) };

    // SAFETY: these are standard OpenGL 1.1 state calls on the render thread.
    unsafe {
        if highlighted {
            disable_client(GL_TEXTURE_COORD_ARRAY);
            disable_client(GL_COLOR_ARRAY);
            enable(GL_COLOR_MATERIAL);
            color(1.0, 0.6, 0.6, 1.0);
        } else {
            enable_client(GL_TEXTURE_COORD_ARRAY);
            enable_client(GL_COLOR_ARRAY);
            disable(GL_COLOR_MATERIAL);
            color(1.0, 1.0, 1.0, 1.0);
        }
    }
}

#[unsafe(naked)]
unsafe extern "C" fn urban_terror_opengl_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        // At this point in glDrawElements, EBX holds the index count. This is
        // the value the original C++ course cave recovered from saved EBX.
        "push ebx",
        "call {apply}",
        "add esp, 4",
        "popad",
        "popfd",
        // Replay all six bytes replaced at glDrawElements + 0x16.
        "mov esi, dword ptr [esi + 0xA18]",
        "jmp dword ptr [{resume}]",
        apply = sym apply_urban_terror_gl_state,
        resume = sym DRAW_RETURN,
    );
}

fn resolve(
    module: windows::Win32::Foundation::HMODULE,
    name: windows::core::PCSTR,
) -> Result<usize> {
    // SAFETY: the module is live and every caller passes a static export name.
    let function = unsafe { GetProcAddress(module, name) }
        .context("required opengl32 export was not found")?;
    Ok(function as *const () as usize)
}

pub fn install_urban_terror_opengl_hook(mode: u32) -> Result<LocalPatch> {
    anyhow::ensure!(
        matches!(mode, OPENGL_WALLHACK | OPENGL_CHAMS),
        "invalid OpenGL lab mode"
    );
    // SAFETY: the name is a static, zero-terminated UTF-16 string.
    let opengl = unsafe { GetModuleHandleW(w!("opengl32.dll")) }
        .context("opengl32.dll is not loaded yet; enter a rendered game")?;

    DEPTH_FUNC.store(resolve(opengl, s!("glDepthFunc"))?, Ordering::Release);
    DEPTH_RANGE.store(resolve(opengl, s!("glDepthRange"))?, Ordering::Release);
    COLOR_4F.store(resolve(opengl, s!("glColor4f"))?, Ordering::Release);
    ENABLE.store(resolve(opengl, s!("glEnable"))?, Ordering::Release);
    DISABLE.store(resolve(opengl, s!("glDisable"))?, Ordering::Release);
    ENABLE_CLIENT_STATE.store(
        resolve(opengl, s!("glEnableClientState"))?,
        Ordering::Release,
    );
    DISABLE_CLIENT_STATE.store(
        resolve(opengl, s!("glDisableClientState"))?,
        Ordering::Release,
    );
    let draw_elements = resolve(opengl, s!("glDrawElements"))?;
    let hook = draw_elements
        .checked_add(0x16)
        .context("glDrawElements hook address overflowed")?;
    DRAW_RETURN.store(hook + 6, Ordering::Release);
    OPENGL_MODE.store(mode, Ordering::Release);

    // mov esi,dword ptr [esi+0xA18]
    const ORIGINAL: [u8; 6] = [0x8B, 0xB6, 0x18, 0x0A, 0x00, 0x00];
    let jump = near_jump(hook, urban_terror_opengl_cave as *const () as usize)?;
    let mut replacement = [0x90_u8; 6];
    replacement[..5].copy_from_slice(&jump);
    LocalPatch::apply(hook, &ORIGINAL, &replacement)
}

pub fn set_urban_terror_opengl_mode(mode: u32) -> Result<()> {
    anyhow::ensure!(
        matches!(mode, OPENGL_OFF | OPENGL_WALLHACK | OPENGL_CHAMS),
        "invalid OpenGL lab mode"
    );
    OPENGL_MODE.store(mode, Ordering::Release);
    Ok(())
}
