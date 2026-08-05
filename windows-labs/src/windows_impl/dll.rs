//! DLL entry points and the small hotkey worker used by the course labs.

#![cfg(target_arch = "x86")]

use std::{
    ffi::c_void,
    path::Path,
    sync::{
        OnceLock,
        atomic::{AtomicBool, Ordering},
    },
    thread,
    time::Duration,
};

use anyhow::{Context, Result};
use windows::Win32::{
    Foundation::{HINSTANCE, HMODULE},
    System::{LibraryLoader::DisableThreadLibraryCalls, SystemServices::DLL_PROCESS_ATTACH},
    UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_END, VK_F1, VK_F2, VK_F3, VK_F4, VK_F5},
};
use windows::core::BOOL;

use super::{
    LocalPatch, OPENGL_CHAMS, OPENGL_OFF, OPENGL_WALLHACK, TARGET_UNDER_CROSSHAIR,
    assaultcube_aim_once, assaultcube_update_esp, enable_assaultcube_no_recoil,
    enable_assaultcube_show_all_radar, enable_wesnoth_map_reveal, install_assaultcube_esp_hook,
    install_assaultcube_trigger_hook, install_urban_terror_memory_wallhook,
    install_urban_terror_opengl_hook, install_wesnoth_stat_hook, install_wesnoth_terrain_hook,
    run_flare_farming_bot, run_wyrmsun_macro, send_left_mouse, set_urban_terror_opengl_mode,
    write_wesnoth_gold,
};

static STARTED: OnceLock<()> = OnceLock::new();
static STOP: AtomicBool = AtomicBool::new(false);

fn pressed_once(virtual_key: i32) -> bool {
    // SAFETY: GetAsyncKeyState accepts any virtual-key integer and returns a
    // value. The low bit means the key was pressed since the previous query.
    unsafe { GetAsyncKeyState(virtual_key) & 1 != 0 }
}

fn toggle(
    slot: &mut Option<LocalPatch>,
    install: impl FnOnce() -> Result<LocalPatch>,
) -> Result<()> {
    if let Some(mut patch) = slot.take() {
        patch.restore()?;
    } else {
        *slot = Some(install()?);
    }
    Ok(())
}

fn current_process_name() -> Result<String> {
    let executable = std::env::current_exe().context("Windows did not report the game path")?;
    let name = Path::new(&executable)
        .file_name()
        .context("the game path has no file name")?
        .to_string_lossy()
        .into_owned();
    Ok(name)
}

fn run_assaultcube() -> Result<()> {
    let mut trigger = None;
    let mut no_recoil = None;
    let mut radar = None;
    let mut esp = None;
    let mut aimbot_enabled = false;
    let mut mouse_down = false;

    while !STOP.load(Ordering::Acquire) {
        if pressed_once(VK_F1.0.into()) {
            if trigger.is_some() && mouse_down {
                send_left_mouse(false)?;
                mouse_down = false;
            }
            toggle(&mut trigger, install_assaultcube_trigger_hook)?;
            if trigger.is_none() {
                TARGET_UNDER_CROSSHAIR.store(false, Ordering::Release);
            }
        }
        if pressed_once(VK_F2.0.into()) {
            toggle(&mut no_recoil, enable_assaultcube_no_recoil)?;
        }
        if pressed_once(VK_F3.0.into()) {
            toggle(&mut radar, enable_assaultcube_show_all_radar)?;
        }
        if pressed_once(VK_F4.0.into()) {
            aimbot_enabled = !aimbot_enabled;
        }
        if pressed_once(VK_F5.0.into()) {
            toggle(&mut esp, install_assaultcube_esp_hook)?;
        }

        if aimbot_enabled {
            assaultcube_aim_once()?;
        }
        if esp.is_some() {
            assaultcube_update_esp()?;
        }

        let wants_mouse_down = trigger.is_some() && TARGET_UNDER_CROSSHAIR.load(Ordering::Acquire);
        if wants_mouse_down != mouse_down {
            send_left_mouse(wants_mouse_down)?;
            mouse_down = wants_mouse_down;
        }
        if pressed_once(VK_END.0.into()) {
            break;
        }
        thread::sleep(Duration::from_millis(8));
    }

    if mouse_down {
        send_left_mouse(false)?;
    }
    // Dropping these values restores the original instructions in reverse
    // lexical order after the worker has stopped using them.
    drop(esp);
    drop(radar);
    drop(no_recoil);
    drop(trigger);
    Ok(())
}

fn run_wesnoth() -> Result<()> {
    write_wesnoth_gold(999)?;
    let mut terrain = None;
    let mut stat = None;
    let mut map = None;

    while !STOP.load(Ordering::Acquire) {
        if pressed_once(VK_F1.0.into()) {
            toggle(&mut terrain, install_wesnoth_terrain_hook)?;
        }
        if pressed_once(VK_F2.0.into()) {
            toggle(&mut stat, install_wesnoth_stat_hook)?;
        }
        if pressed_once(VK_F3.0.into()) {
            toggle(&mut map, enable_wesnoth_map_reveal)?;
        }
        if pressed_once(VK_END.0.into()) {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }
    drop(map);
    drop(stat);
    drop(terrain);
    Ok(())
}

fn run_urban_terror() -> Result<()> {
    let mut memory_wallhook = None;
    let mut opengl_hook = None;
    let mut opengl_mode = OPENGL_OFF;

    while !STOP.load(Ordering::Acquire) {
        if pressed_once(VK_F1.0.into()) {
            toggle(&mut memory_wallhook, install_urban_terror_memory_wallhook)?;
        }
        if pressed_once(VK_F2.0.into()) {
            if opengl_mode == OPENGL_WALLHACK {
                set_urban_terror_opengl_mode(OPENGL_OFF)?;
                drop(opengl_hook.take());
                opengl_mode = OPENGL_OFF;
            } else {
                if opengl_hook.is_none() {
                    opengl_hook = Some(install_urban_terror_opengl_hook(OPENGL_WALLHACK)?);
                }
                set_urban_terror_opengl_mode(OPENGL_WALLHACK)?;
                opengl_mode = OPENGL_WALLHACK;
            }
        }
        if pressed_once(VK_F3.0.into()) {
            if opengl_mode == OPENGL_CHAMS {
                set_urban_terror_opengl_mode(OPENGL_OFF)?;
                drop(opengl_hook.take());
                opengl_mode = OPENGL_OFF;
            } else {
                if opengl_hook.is_none() {
                    opengl_hook = Some(install_urban_terror_opengl_hook(OPENGL_CHAMS)?);
                }
                set_urban_terror_opengl_mode(OPENGL_CHAMS)?;
                opengl_mode = OPENGL_CHAMS;
            }
        }
        if pressed_once(VK_END.0.into()) {
            break;
        }
        thread::sleep(Duration::from_millis(8));
    }

    set_urban_terror_opengl_mode(OPENGL_OFF)?;
    drop(opengl_hook);
    drop(memory_wallhook);
    Ok(())
}

fn run_lab() -> Result<()> {
    let process = current_process_name()?.to_ascii_lowercase();
    match process.as_str() {
        "wesnoth.exe" => run_wesnoth(),
        "ac_client.exe" => run_assaultcube(),
        "quake3-urt.exe" => run_urban_terror(),
        "flare.exe" => run_flare_farming_bot(&STOP),
        "wyrmsun.exe" => run_wyrmsun_macro(&STOP),
        _ => anyhow::bail!("{process:?} is not an authorized course target"),
    }
}

/// Windows calls this under the loader lock. Do only the one documented,
/// loader-safe optimization here; the injector calls `gha_start` afterward.
#[unsafe(no_mangle)]
pub extern "system" fn DllMain(instance: HINSTANCE, reason: u32, _reserved: *mut c_void) -> BOOL {
    if reason == DLL_PROCESS_ATTACH {
        // SAFETY: `instance` is the module Windows is currently attaching.
        let _ = unsafe { DisableThreadLibraryCalls(HMODULE(instance.0)) };
    }
    BOOL::from(true)
}

/// Exported with the Windows thread-procedure signature so the injector can
/// call it safely after LoadLibraryW has returned and released the loader lock.
#[unsafe(no_mangle)]
pub extern "system" fn gha_start(_argument: *mut c_void) -> u32 {
    if STARTED.set(()).is_err() {
        return 1; // already running
    }
    STOP.store(false, Ordering::Release);
    let started = thread::Builder::new()
        .name("gha-authorized-lab".into())
        .spawn(|| {
            if let Err(error) = run_lab() {
                eprintln!("game lab stopped: {error:#}");
            }
        });
    if started.is_err() {
        return 2;
    }
    0
}

#[unsafe(no_mangle)]
pub extern "system" fn gha_stop(_argument: *mut c_void) -> u32 {
    STOP.store(true, Ordering::Release);
    0
}
