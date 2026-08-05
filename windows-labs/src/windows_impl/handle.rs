use windows::Win32::Foundation::{CloseHandle, HANDLE};

/// A Windows handle that closes itself when it goes out of scope.
#[derive(Debug)]
pub struct OwnedHandle(HANDLE);

impl OwnedHandle {
    /// Takes ownership of a valid handle returned by a Windows API.
    pub fn from_raw(handle: HANDLE) -> windows::core::Result<Self> {
        if handle.is_invalid() {
            return Err(windows::core::Error::from_thread());
        }
        Ok(Self(handle))
    }

    /// Borrows the raw handle for one Windows API call.
    pub fn raw(&self) -> HANDLE {
        self.0
    }
}

// SAFETY: a kernel HANDLE may be passed between threads. Ownership still
// remains with this one `OwnedHandle`, so `Drop` closes it exactly once.
unsafe impl Send for OwnedHandle {}
// SAFETY: shared access exposes only the copyable handle value; operations on
// Windows kernel handles are synchronized by the kernel, and closing remains
// the unique owner's responsibility.
unsafe impl Sync for OwnedHandle {}

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        // SAFETY: this type owns the handle and never closes it anywhere else.
        let _ = unsafe { CloseHandle(self.0) };
    }
}
