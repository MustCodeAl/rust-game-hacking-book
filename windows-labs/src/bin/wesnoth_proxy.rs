use std::{
    io::{self, Read, Write},
    net::{IpAddr, Ipv4Addr, Shutdown, SocketAddr, TcpListener, TcpStream},
    thread,
    time::Duration,
};

use anyhow::{Context, Result};
use gha_windows_labs::wesnoth_protocol::{decode_frame, encode_chat, read_frame};

fn loopback(port: u16) -> SocketAddr {
    SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port)
}

fn upstream(mut client: TcpStream, mut server: TcpStream) -> Result<()> {
    // The negotiation request is the protocol's one unframed client message.
    let mut negotiation = [0_u8; 4];
    client.read_exact(&mut negotiation)?;
    anyhow::ensure!(negotiation == [0, 0, 0, 0], "unexpected negotiation bytes");
    server.write_all(&negotiation)?;
    server.flush()?;

    loop {
        let frame = match read_frame(&mut client) {
            Ok(frame) => frame,
            Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => break,
            Err(error) => return Err(error.into()),
        };
        let decoded = decode_frame(&frame)?;
        server.write_all(&frame)?;
        if decoded.contains("message=\"\\wave\"") {
            server.write_all(&encode_chat("ChatBot", "Hello!")?)?;
        }
        server.flush()?;
    }
    server.shutdown(Shutdown::Write)?;
    Ok(())
}

fn downstream(mut server: TcpStream, mut client: TcpStream) -> Result<()> {
    io::copy(&mut server, &mut client)?;
    client.shutdown(Shutdown::Write)?;
    Ok(())
}

fn proxy_pair(client: TcpStream) -> Result<()> {
    let server = TcpStream::connect_timeout(&loopback(15_000), Duration::from_secs(3))
        .context("start local wesnothd.exe on port 15000 first")?;
    client.set_read_timeout(Some(Duration::from_secs(30)))?;
    client.set_write_timeout(Some(Duration::from_secs(5)))?;
    server.set_read_timeout(Some(Duration::from_secs(30)))?;
    server.set_write_timeout(Some(Duration::from_secs(5)))?;

    // Keep control handles so a decoding failure in the upstream worker can
    // close both directions before we wait for the downstream worker.
    let client_control = client.try_clone()?;
    let server_control = server.try_clone()?;
    let upstream_client = client.try_clone()?;
    let downstream_server = server.try_clone()?;
    let up = thread::spawn(move || upstream(upstream_client, server));
    let down = thread::spawn(move || downstream(downstream_server, client));
    let upstream_result = up
        .join()
        .map_err(|_| anyhow::anyhow!("upstream thread panicked"))
        .and_then(|result| result);
    if upstream_result.is_err() {
        let _ = client_control.shutdown(Shutdown::Both);
        let _ = server_control.shutdown(Shutdown::Both);
    }
    let downstream_result = down
        .join()
        .map_err(|_| anyhow::anyhow!("downstream thread panicked"))
        .and_then(|result| result);
    upstream_result?;
    downstream_result?;
    Ok(())
}

fn main() -> Result<()> {
    let listener = TcpListener::bind(loopback(27_015))?;
    println!("Wesnoth proxy listening on 127.0.0.1:27015 -> 127.0.0.1:15000");
    println!("Connect the official 1.14.9 client to localhost:27015.");
    for connection in listener.incoming() {
        let client = connection?;
        anyhow::ensure!(
            client.peer_addr()?.ip().is_loopback(),
            "client is not loopback"
        );
        if let Err(error) = proxy_pair(client) {
            eprintln!("session ended: {error:#}");
        }
    }
    Ok(())
}
