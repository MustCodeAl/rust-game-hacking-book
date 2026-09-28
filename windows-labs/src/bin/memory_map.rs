#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;

    let mut arguments = std::env::args().skip(1);
    let process_name = arguments.next().unwrap_or_else(|| "wesnoth.exe".to_owned());
    let module_name = arguments.next().unwrap_or_else(|| process_name.clone());

    let process = Process::open_by_name(&process_name, false)?;
    let (module_base, module_size) = process.module(&module_name)?;
    let module_end = module_base
        .checked_add(module_size)
        .context("module range overflowed")?;
    let regions = process.regions(module_base, module_end)?;

    println!("{} (PID {})", process.name(), process.id());
    println!("Module: {module_name} {module_base:#010x}..{module_end:#010x}");
    println!("Range                         Size       Access");

    let mut rwx_count = 0_usize;
    for region in regions {
        if region.base >= module_end {
            break;
        }
        let region_end = region
            .base
            .checked_add(region.size)
            .context("memory region overflowed")?
            .min(module_end);
        let shown_size = region_end.saturating_sub(region.base);
        let access = format!(
            "{}{}{}",
            if region.readable { 'R' } else { '-' },
            if region.writable { 'W' } else { '-' },
            if region.executable { 'X' } else { '-' },
        );
        if region.readable && region.writable && region.executable {
            rwx_count += 1;
        }
        println!(
            "{:#010x}..{:#010x}  {:#010x}  {access}",
            region.base, region_end, shown_size
        );
    }

    println!("RWX regions in this module: {rwx_count}");
    println!("The tool queried page metadata and did not write or change protection.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This virtual-memory map uses VirtualQueryEx and must run on Windows.");
}
