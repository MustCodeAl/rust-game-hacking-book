//! Bounds-checked Wesnoth 1.14.9 gzip/WML framing used by the local network labs.

use std::io::{self, Read, Write};

use anyhow::{Context, Result};
use flate2::{Compression, read::GzDecoder, write::GzEncoder};

pub const MAX_FRAME: usize = 1_048_576;

pub fn simple_field(value: &str) -> Result<&str> {
    anyhow::ensure!(
        !value
            .chars()
            .any(|character| matches!(character, '"' | '\n' | '\r')),
        "WML fields in this lab cannot contain quotes or newlines"
    );
    anyhow::ensure!(value.len() <= 512, "WML field is too long");
    Ok(value)
}

pub fn encode_frame(wml: &str) -> Result<Vec<u8>> {
    anyhow::ensure!(wml.len() <= MAX_FRAME, "plain WML frame is too large");
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(wml.as_bytes())
        .context("could not gzip WML")?;
    let compressed = encoder.finish().context("could not finish gzip member")?;
    let length = u32::try_from(compressed.len()).context("compressed frame is too large")?;
    let mut frame = Vec::with_capacity(4 + compressed.len());
    frame.extend_from_slice(&length.to_be_bytes());
    frame.extend_from_slice(&compressed);
    Ok(frame)
}

pub fn decode_frame(frame: &[u8]) -> Result<String> {
    anyhow::ensure!(frame.len() >= 4, "frame has no four-byte length header");
    let length = u32::from_be_bytes(frame[..4].try_into().expect("slice is four bytes")) as usize;
    anyhow::ensure!(length <= MAX_FRAME, "compressed frame is too large");
    anyhow::ensure!(
        frame.len() == 4 + length,
        "frame length does not match header"
    );

    let mut decoder = GzDecoder::new(&frame[4..]);
    let mut plain = Vec::new();
    decoder
        .by_ref()
        .take((MAX_FRAME + 1) as u64)
        .read_to_end(&mut plain)
        .context("invalid gzip payload")?;
    anyhow::ensure!(plain.len() <= MAX_FRAME, "decompressed WML is too large");
    String::from_utf8(plain).context("WML payload is not UTF-8")
}

pub fn read_frame(reader: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut header = [0_u8; 4];
    reader.read_exact(&mut header)?;
    let length = u32::from_be_bytes(header) as usize;
    if length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "frame is too large",
        ));
    }
    let mut frame = Vec::with_capacity(4 + length);
    frame.extend_from_slice(&header);
    frame.resize(4 + length, 0);
    reader.read_exact(&mut frame[4..])?;
    Ok(frame)
}

pub fn send_wml(writer: &mut impl Write, wml: &str) -> Result<()> {
    let frame = encode_frame(wml)?;
    writer
        .write_all(&frame)
        .context("could not send complete frame")?;
    writer.flush().context("could not flush frame")?;
    Ok(())
}

pub fn encode_chat(sender: &str, message: &str) -> Result<Vec<u8>> {
    let sender = simple_field(sender)?;
    let message = simple_field(message)?;
    encode_frame(&format!(
        "[message]\nmessage=\"{message}\"\nroom=\"lobby\"\nsender=\"{sender}\"\n[/message]"
    ))
}

#[cfg(test)]
mod tests {
    use super::{decode_frame, encode_chat, encode_frame};

    #[test]
    fn real_chat_shape_round_trips() {
        let frame = encode_chat("ChatBot", "Hello!").unwrap();
        assert_eq!(&frame[4..6], &[0x1F, 0x8B]);
        let plain = decode_frame(&frame).unwrap();
        assert!(plain.contains("message=\"Hello!\""));
    }

    #[test]
    fn rejects_trailing_bytes() {
        let mut frame = encode_frame("[version]\n[/version]").unwrap();
        frame.push(0);
        assert!(decode_frame(&frame).is_err());
    }
}
