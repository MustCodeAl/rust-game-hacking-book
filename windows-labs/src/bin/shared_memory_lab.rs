#[cfg(windows)]
mod app {
    use std::{io, slice};

    use anyhow::{Context, ensure};
    use gha_windows_labs::OwnedHandle;
    use windows::{
        Win32::{
            Foundation::INVALID_HANDLE_VALUE,
            System::Memory::{
                CreateFileMappingW, FILE_MAP, FILE_MAP_READ, FILE_MAP_WRITE,
                MEMORY_MAPPED_VIEW_ADDRESS, MapViewOfFile, OpenFileMappingW, PAGE_READWRITE,
                UnmapViewOfFile,
            },
        },
        core::w,
    };

    const MAPPING_BYTES: usize = 4_096;
    const HEADER_BYTES: usize = 4;

    struct MappedView {
        address: MEMORY_MAPPED_VIEW_ADDRESS,
        length: usize,
    }

    impl MappedView {
        fn new(handle: &OwnedHandle, access: FILE_MAP) -> windows::core::Result<Self> {
            // SAFETY: handle refers to a file-mapping object. A null address is
            // checked before any slice is created, and the view is unmapped in Drop.
            let address = unsafe { MapViewOfFile(handle.raw(), access, 0, 0, MAPPING_BYTES) };
            if address.Value.is_null() {
                return Err(windows::core::Error::from_thread());
            }
            Ok(Self {
                address,
                length: MAPPING_BYTES,
            })
        }

        fn bytes(&self) -> &[u8] {
            // SAFETY: MapViewOfFile returned a non-null view of length MAPPING_BYTES,
            // and self keeps the view mapped for the slice's entire lifetime.
            unsafe { slice::from_raw_parts(self.address.Value.cast(), self.length) }
        }

        fn bytes_mut(&mut self) -> &mut [u8] {
            // SAFETY: the writer requested FILE_MAP_WRITE, owns this mutable borrow,
            // and the mapped range remains valid until Drop.
            unsafe { slice::from_raw_parts_mut(self.address.Value.cast(), self.length) }
        }
    }

    impl Drop for MappedView {
        fn drop(&mut self) {
            // SAFETY: this object owns one live mapped view and unmaps it once.
            let _ = unsafe { UnmapViewOfFile(self.address) };
        }
    }

    fn writer(message: &str) -> anyhow::Result<()> {
        ensure!(
            message.len() <= MAPPING_BYTES - HEADER_BYTES,
            "message is longer than {} UTF-8 bytes",
            MAPPING_BYTES - HEADER_BYTES
        );
        // SAFETY: INVALID_HANDLE_VALUE requests paging-file-backed memory. The
        // mapping name is static and the size is nonzero.
        let mapping = unsafe {
            CreateFileMappingW(
                INVALID_HANDLE_VALUE,
                None,
                PAGE_READWRITE,
                0,
                MAPPING_BYTES as u32,
                w!("Local\\GhaAuthorizedSharedMemoryV1"),
            )
        }?;
        let mapping = OwnedHandle::from_raw(mapping)?;
        let mut view = MappedView::new(&mapping, FILE_MAP_WRITE)?;
        let bytes = view.bytes_mut();
        bytes.fill(0);
        bytes[..HEADER_BYTES].copy_from_slice(&(message.len() as u32).to_le_bytes());
        bytes[HEADER_BYTES..HEADER_BYTES + message.len()].copy_from_slice(message.as_bytes());

        println!(
            "Published {} UTF-8 bytes to a Local\\ mapping.",
            message.len()
        );
        println!("Run `shared_memory_lab read` in another window.");
        println!("Press Enter here after the reader finishes.");
        let mut line = String::new();
        io::stdin().read_line(&mut line)?;
        Ok(())
    }

    fn reader() -> anyhow::Result<()> {
        // SAFETY: the name is static, inheritance is disabled, and the reader
        // requests read-only access.
        let mapping = unsafe {
            OpenFileMappingW(
                FILE_MAP_READ.0,
                false,
                w!("Local\\GhaAuthorizedSharedMemoryV1"),
            )
        }
        .context("open the writer first so the named mapping exists")?;
        let mapping = OwnedHandle::from_raw(mapping)?;
        let view = MappedView::new(&mapping, FILE_MAP_READ)?;
        let bytes = view.bytes();
        let length = u32::from_le_bytes(bytes[..HEADER_BYTES].try_into()?) as usize;
        ensure!(
            length <= MAPPING_BYTES - HEADER_BYTES,
            "shared-memory length header is out of range"
        );
        let message = std::str::from_utf8(&bytes[HEADER_BYTES..HEADER_BYTES + length])
            .context("shared message was not valid UTF-8")?;
        println!("Read {length} bytes: {message}");
        println!("The reader requested FILE_MAP_READ and changed nothing.");
        Ok(())
    }

    pub fn run() -> anyhow::Result<()> {
        let mut arguments = std::env::args().skip(1);
        match arguments.next().as_deref() {
            Some("write") => {
                let message = arguments.collect::<Vec<_>>().join(" ");
                let message = if message.is_empty() {
                    "Wesnoth turn 12: local lab ready"
                } else {
                    &message
                };
                writer(message)
            }
            Some("read") => reader(),
            _ => anyhow::bail!("usage: shared_memory_lab write <message> | shared_memory_lab read"),
        }
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This named shared-memory lab must run on Windows.");
}
