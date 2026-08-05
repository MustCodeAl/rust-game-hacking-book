#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;
    use iced_x86::{Decoder, DecoderOptions, Formatter, Instruction, NasmFormatter};

    const START: usize = 0x007C_CD91;
    const COUNT: usize = 0x50;
    let process = Process::open_by_name("wesnoth.exe", false)?;
    anyhow::ensure!(process.is_32_bit()?, "this address profile is 32-bit");
    let bytes = process.read_bytes(START, COUNT)?;

    let mut decoder = Decoder::with_ip(32, &bytes, START as u64, DecoderOptions::NONE);
    let mut formatter = NasmFormatter::new();
    let mut instruction = Instruction::default();
    let mut text = String::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        anyhow::ensure!(
            !instruction.is_invalid(),
            "invalid x86 bytes at {:#010x}",
            instruction.ip()
        );
        text.clear();
        formatter.format(&instruction, &mut text);
        let start = usize::try_from(instruction.ip() - START as u64)?;
        let end = start
            .checked_add(instruction.len())
            .context("decoded instruction range overflowed")?;
        let raw = bytes
            .get(start..end)
            .context("decoder left the input range")?;
        let raw = raw
            .iter()
            .map(|byte| format!("{byte:02X}"))
            .collect::<Vec<_>>()
            .join(" ");
        println!("{:08X}  {:<24} {text}", instruction.ip(), raw);
    }
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live disassembler must run on Windows.");
}
