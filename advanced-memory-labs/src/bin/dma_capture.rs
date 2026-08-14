use gha_advanced_memory_labs::dma::{Capture, PhysicalAddress, VirtualAddress};
use std::{error::Error, io};

fn parse_hex(text: &str) -> Result<u64, std::num::ParseIntError> {
    u64::from_str_radix(text.trim_start_matches("0x"), 16)
}

fn main() -> Result<(), Box<dyn Error>> {
    let arguments: Vec<String> = std::env::args().collect();
    if arguments.len() != 5 {
        eprintln!("usage: dma_capture <capture.bin> <cr3_hex> <virtual_hex> <length>");
        return Ok(());
    }

    let cr3 = PhysicalAddress(parse_hex(&arguments[2])?);
    let virtual_address = VirtualAddress(parse_hex(&arguments[3])?);
    let length: usize = arguments[4].parse()?;
    if !(1..=4096).contains(&length) {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "length must be 1..=4096").into());
    }

    let capture = Capture::from_file(&arguments[1])?;
    let bytes = capture.read_virtual(cr3, virtual_address, length)?;

    for (row, chunk) in bytes.chunks(16).enumerate() {
        let address = virtual_address.0 + u64::try_from(row * 16)?;
        print!("{address:016X}  ");
        for byte in chunk {
            print!("{byte:02X} ");
        }
        println!();
    }
    Ok(())
}
