//! Atomic Windows file replacement used by the save and PK3 labs.

use std::{os::windows::ffi::OsStrExt, path::Path};

use anyhow::{Context, Result};
use windows::{
    Win32::Storage::FileSystem::{REPLACEFILE_WRITE_THROUGH, ReplaceFileW},
    core::PCWSTR,
};

fn wide(path: &Path) -> Vec<u16> {
    path.as_os_str().encode_wide().chain(Some(0)).collect()
}

/// Atomically installs `replacement`, leaves the old file at `backup`, and
/// asks Windows to flush the replacement operation before returning.
pub fn replace_file_with_backup(original: &Path, replacement: &Path, backup: &Path) -> Result<()> {
    anyhow::ensure!(original.is_file(), "{} is not a file", original.display());
    anyhow::ensure!(
        replacement.is_file(),
        "{} is not a file",
        replacement.display()
    );
    anyhow::ensure!(
        !backup.exists(),
        "backup already exists at {}; move it before running again",
        backup.display()
    );

    let original = wide(original);
    let replacement = wide(replacement);
    let backup = wide(backup);
    // SAFETY: every buffer is a live, zero-terminated UTF-16 path for the
    // duration of the call. Reserved pointer parameters are deliberately None.
    unsafe {
        ReplaceFileW(
            PCWSTR(original.as_ptr()),
            PCWSTR(replacement.as_ptr()),
            PCWSTR(backup.as_ptr()),
            REPLACEFILE_WRITE_THROUGH,
            None,
            None,
        )
    }
    .context("ReplaceFileW could not install the new file")?;
    Ok(())
}
