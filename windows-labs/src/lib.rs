//! Complete Windows implementations used by the Rust edition of Game Hacking Academy.

pub mod wesnoth_protocol;

#[cfg(windows)]
mod windows_impl;

#[cfg(windows)]
#[doc(inline)]
pub use windows_impl::{
    AppliedPatch, LocalPatch, MemoryRegion, OwnedHandle, PatchPlan, Process, ProcessEntry,
    input_structure_size, near_call, near_jump, replace_file_with_backup,
};

#[cfg(all(windows, target_arch = "x86"))]
#[doc(inline)]
pub use windows_impl::{
    OPENGL_CHAMS, OPENGL_OFF, OPENGL_WALLHACK, TARGET_UNDER_CROSSHAIR, assaultcube_aim_once,
    assaultcube_update_esp, enable_assaultcube_no_recoil, enable_assaultcube_show_all_radar,
    enable_wesnoth_map_reveal, install_assaultcube_esp_hook, install_assaultcube_trigger_hook,
    install_flare_hooks, install_urban_terror_memory_wallhook, install_urban_terror_opengl_hook,
    install_wesnoth_stat_hook, install_wesnoth_terrain_hook, install_wyrmsun_hooks,
    run_flare_farming_bot, run_wyrmsun_macro, send_left_mouse, set_urban_terror_opengl_mode,
    write_wesnoth_gold,
};

#[cfg(not(windows))]
pub fn windows_only() -> anyhow::Result<()> {
    anyhow::bail!("the Windows labs must be built and run on Windows")
}
