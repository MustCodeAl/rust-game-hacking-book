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
pub use assaultcube_tools::*;
pub use file_replace::replace_file_with_backup;
#[cfg(target_arch = "x86")]
pub use game_hooks::*;
pub use handle::OwnedHandle;
pub use local_patch::{LocalPatch, input_structure_size, near_call, near_jump};
#[cfg(target_arch = "x86")]
pub use opengl_hooks::*;
pub use patch::{AppliedPatch, PatchPlan};
pub use process::{MemoryRegion, Process, ProcessEntry};
#[cfg(target_arch = "x86")]
pub use strategy_hooks::*;
#[cfg(target_arch = "x86")]
pub use wesnoth_hooks::*;
