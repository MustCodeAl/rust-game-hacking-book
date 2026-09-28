use std::{fs, path::PathBuf};

use anyhow::{Context, Result};

fn bytes_at(bytes: &[u8], offset: usize, count: usize) -> Result<&[u8]> {
    let end = offset.checked_add(count).context("PE offset overflowed")?;
    bytes
        .get(offset..end)
        .with_context(|| format!("PE field {offset:#x}..{end:#x} is outside the file"))
}

fn u16_at(bytes: &[u8], offset: usize) -> Result<u16> {
    Ok(u16::from_le_bytes(bytes_at(bytes, offset, 2)?.try_into()?))
}

fn u32_at(bytes: &[u8], offset: usize) -> Result<u32> {
    Ok(u32::from_le_bytes(bytes_at(bytes, offset, 4)?.try_into()?))
}

fn u64_at(bytes: &[u8], offset: usize) -> Result<u64> {
    Ok(u64::from_le_bytes(bytes_at(bytes, offset, 8)?.try_into()?))
}

fn main() -> Result<()> {
    let path = PathBuf::from(
        std::env::args()
            .nth(1)
            .context("usage: pe_inspector <game.exe-or-dll>")?,
    );
    let bytes = fs::read(&path).with_context(|| format!("could not read {}", path.display()))?;

    anyhow::ensure!(bytes_at(&bytes, 0, 2)? == b"MZ", "missing DOS MZ signature");
    let pe_offset = usize::try_from(u32_at(&bytes, 0x3c)?)?;
    anyhow::ensure!(
        bytes_at(&bytes, pe_offset, 4)? == b"PE\0\0",
        "missing PE signature"
    );

    let coff = pe_offset.checked_add(4).context("COFF offset overflowed")?;
    let machine = u16_at(&bytes, coff)?;
    let section_count = usize::from(u16_at(&bytes, coff + 2)?);
    let optional_size = usize::from(u16_at(&bytes, coff + 16)?);
    anyhow::ensure!(
        section_count <= 96,
        "unreasonable section count: {section_count}"
    );

    let optional = coff.checked_add(20).context("optional-header overflowed")?;
    let magic = u16_at(&bytes, optional)?;
    let entry_rva = u32_at(&bytes, optional + 16)?;
    let image_base = match magic {
        0x10b => u64::from(u32_at(&bytes, optional + 28)?),
        0x20b => u64_at(&bytes, optional + 24)?,
        other => anyhow::bail!("unsupported optional-header magic {other:#06x}"),
    };
    let section_alignment = u32_at(&bytes, optional + 32)?;
    let file_alignment = u32_at(&bytes, optional + 36)?;

    println!("{}", path.display());
    println!("  machine:          {machine:#06x}");
    println!(
        "  PE kind:          {}",
        if magic == 0x10b { "PE32" } else { "PE32+" }
    );
    println!("  preferred base:   {image_base:#018x}");
    println!("  entry-point RVA:  {entry_rva:#010x}");
    println!(
        "  preferred entry:  {:#018x}",
        image_base + u64::from(entry_rva)
    );
    println!("  section alignment:{section_alignment:#010x}");
    println!("  file alignment:   {file_alignment:#010x}");
    println!("  sections:         {section_count}");

    let section_table = optional
        .checked_add(optional_size)
        .context("section-table offset overflowed")?;
    for index in 0..section_count {
        let start = section_table
            .checked_add(index.checked_mul(40).context("section index overflowed")?)
            .context("section offset overflowed")?;
        let name_bytes = bytes_at(&bytes, start, 8)?;
        let name_end = name_bytes.iter().position(|byte| *byte == 0).unwrap_or(8);
        let name = String::from_utf8_lossy(&name_bytes[..name_end]);
        let virtual_size = u32_at(&bytes, start + 8)?;
        let virtual_address = u32_at(&bytes, start + 12)?;
        let raw_size = u32_at(&bytes, start + 16)?;
        let raw_offset = u32_at(&bytes, start + 20)?;
        let flags = u32_at(&bytes, start + 36)?;
        let access = format!(
            "{}{}{}",
            if flags & 0x4000_0000 != 0 { 'R' } else { '-' },
            if flags & 0x8000_0000 != 0 { 'W' } else { '-' },
            if flags & 0x2000_0000 != 0 { 'X' } else { '-' },
        );
        println!(
            "  {name:<8} RVA {virtual_address:#010x}  virtual {virtual_size:#010x}  file {raw_offset:#010x}+{raw_size:#010x}  {access}"
        );
    }
    Ok(())
}
