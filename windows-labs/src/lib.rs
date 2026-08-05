//! Complete Windows implementations used by the Rust edition of Game Hacking Academy.

pub mod wesnoth_protocol;

#[cfg(windows)]
pub mod windows_impl;

#[cfg(windows)]
pub use windows_impl::*;

#[cfg(not(windows))]
pub fn windows_only() -> anyhow::Result<()> {
    anyhow::bail!("the Windows labs must be built and run on Windows")
}
