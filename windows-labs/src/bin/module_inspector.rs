#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;

    let mut arguments = std::env::args().skip(1);
    let process_name = arguments.next().unwrap_or_else(|| "wesnoth.exe".to_owned());
    let module_name = arguments.next().unwrap_or_else(|| process_name.clone());
    let requested_rva = arguments
        .next()
        .map(|text| usize::from_str_radix(text.trim_start_matches("0x"), 16))
        .transpose()
        .context("RVA must be hexadecimal, such as 7CCD91")?;

    let process = Process::open_by_name(&process_name, false)?;
    let (base, size) = process.module(&module_name)?;
    let end = base.checked_add(size).context("module range overflowed")?;

    println!("{} (PID {})", process.name(), process.id());
    println!("  module: {module_name}");
    println!("  live base: {base:#010x}");
    println!("  size:      {size:#010x}");
    println!("  end:       {end:#010x}");

    if let Some(rva) = requested_rva {
        anyhow::ensure!(rva < size, "RVA {rva:#x} is outside the module");
        let address = base.checked_add(rva).context("base + RVA overflowed")?;
        println!("  {base:#010x} + {rva:#010x} = {address:#010x}");
    }
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This live module inspector uses ToolHelp and must run on Windows.");
}
