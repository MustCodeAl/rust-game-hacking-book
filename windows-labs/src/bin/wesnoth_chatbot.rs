use std::{
    io::{self, Read, Write},
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream},
    time::Duration,
};

use anyhow::{Context, Result};
use gha_windows_labs::wesnoth_protocol::{
    MAX_FRAME, decode_frame, read_frame, send_wml, simple_field,
};

fn read_server_batch(stream: &mut TcpStream) -> io::Result<Vec<u8>> {
    stream.set_read_timeout(Some(Duration::from_millis(250)))?;
    let mut collected = Vec::new();
    let mut chunk = [0_u8; 512];
    loop {
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(count) => {
                collected.extend_from_slice(&chunk[..count]);
                if collected.len() > MAX_FRAME {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "reply is too large",
                    ));
                }
            }
            Err(error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::WouldBlock | io::ErrorKind::TimedOut
                ) =>
            {
                break;
            }
            Err(error) => return Err(error),
        }
    }
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    Ok(collected)
}

fn log_in(stream: &mut TcpStream, nickname: &str) -> Result<()> {
    let nickname = simple_field(nickname)?;
    stream.write_all(&[0, 0, 0, 0])?;
    anyhow::ensure!(
        !read_server_batch(stream)?.is_empty(),
        "server did not negotiate"
    );

    send_wml(stream, "[version]\nversion=\"1.14.9\"\n[/version]")?;
    anyhow::ensure!(
        !read_server_batch(stream)?.is_empty(),
        "server did not answer version"
    );

    send_wml(
        stream,
        &format!("[login]\nusername=\"{nickname}\"\n[/login]"),
    )?;
    let _login_reply = read_server_batch(stream)?;
    Ok(())
}

fn main() -> Result<()> {
    let nickname = std::env::args().nth(1).unwrap_or_else(|| "ChatBot".into());
    simple_field(&nickname)?;
    let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 15_000);
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(3))
        .context("start local wesnothd.exe on port 15000 first")?;
    stream.set_read_timeout(Some(Duration::from_secs(5)))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))?;
    log_in(&mut stream, &nickname)?;
    send_wml(
        &mut stream,
        &format!(
            "[message]\nmessage=\"ChatBot connected\"\nroom=\"lobby\"\nsender=\"{nickname}\"\n[/message]"
        ),
    )?;
    println!("{nickname} joined the local Wesnoth lobby. Type \\wave from a normal client.");

    loop {
        let frame = match read_frame(&mut stream) {
            Ok(frame) => frame,
            Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => break,
            Err(error) => return Err(error.into()),
        };
        let wml = decode_frame(&frame)?;
        println!("{wml}");
        if wml.contains("message=\"\\wave\"") {
            send_wml(
                &mut stream,
                &format!(
                    "[message]\nmessage=\"Hello!\"\nroom=\"lobby\"\nsender=\"{nickname}\"\n[/message]"
                ),
            )?;
        }
    }
    Ok(())
}
