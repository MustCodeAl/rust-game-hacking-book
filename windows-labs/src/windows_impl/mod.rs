#[cfg(target_arch = "x86")]
mod assaultcube_tools;
#[cfg(target_arch = "x86")]
mod dll;
mod file_replace;
#[cfg(target_arch = "x86")]
mod game_hooks;
mod handle;
mod local_patch;
#[cfg(target_arch = "x86")]
mod opengl_hooks;
mod patch;
mod process;
#[cfg(target_arch = "x86")]
mod strategy_hooks;
#[cfg(target_arch = "x86")]
mod wesnoth_hooks;

#[cfg(target_arch = "x86")]
pub use assaultcube_tools::{
    assaultcube_aim_once, assaultcube_update_esp, install_assaultcube_esp_hook,
};
pub use file_replace::replace_file_with_backup;
#[cfg(target_arch = "x86")]
pub use game_hooks::{
    TARGET_UNDER_CROSSHAIR, enable_assaultcube_no_recoil, enable_assaultcube_show_all_radar,
    install_assaultcube_trigger_hook, install_urban_terror_memory_wallhook,
    install_wesnoth_terrain_hook, send_left_mouse, write_wesnoth_gold,
};
pub use handle::OwnedHandle;
pub use local_patch::{LocalPatch, input_structure_size, near_call, near_jump};
#[cfg(target_arch = "x86")]
pub use opengl_hooks::{
    OPENGL_CHAMS, OPENGL_OFF, OPENGL_WALLHACK, install_urban_terror_opengl_hook,
    set_urban_terror_opengl_mode,
};
pub use patch::{AppliedPatch, PatchPlan};
pub use process::{MemoryRegion, Process, ProcessEntry};
#[cfg(target_arch = "x86")]
pub use strategy_hooks::{
    install_flare_hooks, install_wyrmsun_hooks, run_flare_farming_bot, run_wyrmsun_macro,
};
#[cfg(target_arch = "x86")]
pub use wesnoth_hooks::{enable_wesnoth_map_reveal, install_wesnoth_stat_hook};
