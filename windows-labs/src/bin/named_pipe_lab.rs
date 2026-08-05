#[cfg(windows)]
mod app {
    use anyhow::{Context, ensure};
    use gha_windows_labs::OwnedHandle;
    use windows::{
        Win32::{
            Foundation::{ERROR_PIPE_CONNECTED, GENERIC_READ, GENERIC_WRITE},
            Storage::FileSystem::{
                CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_MODE, OPEN_EXISTING,
                PIPE_ACCESS_DUPLEX, ReadFile, WriteFile,
            },
            System::Pipes::{
                ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_MESSAGE,
                PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_MESSAGE, PIPE_WAIT, SetNamedPipeHandleState,
            },
        },
        core::w,
    };

    const MAX_TEXT_BYTES: usize = 1_024;
    const FRAME_BYTES: usize = MAX_TEXT_BYTES + 4;

    fn frame(text: &str) -> anyhow::Result<Vec<u8>> {
        ensure!(
            text.len() <= MAX_TEXT_BYTES,
            "message is longer than {MAX_TEXT_BYTES} UTF-8 bytes"
        );
        let mut bytes = Vec::with_capacity(text.len() + 4);
        bytes.extend_from_slice(&(text.len() as u32).to_le_bytes());
        bytes.extend_from_slice(text.as_bytes());
        Ok(bytes)
    }

    fn read_frame(handle: &OwnedHandle) -> anyhow::Result<String> {
        let mut buffer = [0_u8; FRAME_BYTES];
        let mut bytes_read = 0_u32;
        // SAFETY: buffer is writable, bytes_read is a valid output pointer,
        // and this synchronous lab does not supply an OVERLAPPED structure.
        unsafe { ReadFile(handle.raw(), Some(&mut buffer), Some(&mut bytes_read), None) }?;
        let bytes_read = bytes_read as usize;
        ensure!(
            bytes_read >= 4,
            "pipe message did not contain a length header"
        );
        let declared = u32::from_le_bytes(buffer[..4].try_into()?) as usize;
        ensure!(
            declared <= MAX_TEXT_BYTES,
            "pipe length header is too large"
        );
        ensure!(
            bytes_read == declared + 4,
            "pipe frame length did not match its header"
        );
        Ok(std::str::from_utf8(&buffer[4..bytes_read])
            .context("pipe message was not valid UTF-8")?
            .to_owned())
    }

    fn write_frame(handle: &OwnedHandle, text: &str) -> anyhow::Result<()> {
        let bytes = frame(text)?;
        let mut bytes_written = 0_u32;
        // SAFETY: bytes remains readable during the synchronous call and
        // bytes_written is a valid output pointer.
        unsafe { WriteFile(handle.raw(), Some(&bytes), Some(&mut bytes_written), None) }?;
        ensure!(
            bytes_written as usize == bytes.len(),
            "Windows wrote only part of the pipe frame"
        );
        Ok(())
    }

    fn server() -> anyhow::Result<()> {
        let mode =
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS;
        // SAFETY: the pipe name is static. The server allows one synchronous,
        // message-mode connection and supplies no custom security pointer.
        let pipe = unsafe {
            CreateNamedPipeW(
                w!(r"\\.\pipe\gha-authorized-game-lab-v1"),
                PIPE_ACCESS_DUPLEX,
                mode,
                1,
                FRAME_BYTES as u32,
                FRAME_BYTES as u32,
                0,
                None,
            )
        };
        let pipe = OwnedHandle::from_raw(pipe)?;
        println!("Server is waiting for one local client...");

        // A client can connect between CreateNamedPipeW and ConnectNamedPipe.
        // In that harmless race, Windows reports ERROR_PIPE_CONNECTED.
        // SAFETY: pipe owns a valid server-pipe handle and this synchronous
        // call deliberately supplies no OVERLAPPED structure.
        match unsafe { ConnectNamedPipe(pipe.raw(), None) } {
            Ok(()) => {}
            Err(error) if error.code() == ERROR_PIPE_CONNECTED.to_hresult() => {}
            Err(error) => return Err(error.into()),
        }

        let message = read_frame(&pipe)?;
        println!("Client said: {message}");
        write_frame(&pipe, "ACK: the local game-tool message arrived")?;
        println!("Replied once; the server will now close the pipe.");
        Ok(())
    }

    fn client(message: &str) -> anyhow::Result<()> {
        // SAFETY: the path is static. This opens only the local course pipe,
        // requests read/write data access, and does not inherit the handle.
        let pipe = unsafe {
            CreateFileW(
                w!(r"\\.\pipe\gha-authorized-game-lab-v1"),
                GENERIC_READ.0 | GENERIC_WRITE.0,
                FILE_SHARE_MODE(0),
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                None,
            )
        }
        .context("start `named_pipe_lab server` in another window first")?;
        let pipe = OwnedHandle::from_raw(pipe)?;
        let read_mode = PIPE_READMODE_MESSAGE;
        // SAFETY: pipe is a connected named-pipe handle and read_mode remains
        // valid for the duration of the call.
        unsafe { SetNamedPipeHandleState(pipe.raw(), Some(&read_mode), None, None) }?;

        write_frame(&pipe, message)?;
        println!("Server replied: {}", read_frame(&pipe)?);
        Ok(())
    }

    pub fn run() -> anyhow::Result<()> {
        let mut arguments = std::env::args().skip(1);
        match arguments.next().as_deref() {
            Some("server") => server(),
            Some("client") => {
                let message = arguments.collect::<Vec<_>>().join(" ");
                let message = if message.is_empty() {
                    "Wesnoth helper connected"
                } else {
                    &message
                };
                client(message)
            }
            _ => anyhow::bail!("usage: named_pipe_lab server | named_pipe_lab client <message>"),
        }
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This local named-pipe lab must run on Windows.");
}
