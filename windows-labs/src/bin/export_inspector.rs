use std::{fs, path::PathBuf};

use anyhow::{Context, ensure};

const PE32_MAGIC: u16 = 0x10b;
const PE32_PLUS_MAGIC: u16 = 0x20b;
const SECTION_HEADER_SIZE: usize = 40;
const EXPORT_DIRECTORY_SIZE: usize = 40;
const MAX_EXPORTS: usize = 100_000;
const MAX_STRING_BYTES: usize = 4_096;

#[derive(Clone, Copy, Debug)]
struct Section {
    virtual_address: u32,
    virtual_size: u32,
    raw_offset: u32,
    raw_size: u32,
}

#[derive(Debug)]
struct NamedExport {
    name: String,
    ordinal: u32,
    rva: u32,
    forwarder: Option<String>,
}

#[derive(Debug)]
struct ExportTable {
    image_name: String,
    function_count: u32,
    named: Vec<NamedExport>,
}

fn bytes_at(bytes: &[u8], offset: usize, length: usize) -> anyhow::Result<&[u8]> {
    let end = offset
        .checked_add(length)
        .context("file offset overflowed")?;
    bytes
        .get(offset..end)
        .with_context(|| format!("file ended before {offset:#x}..{end:#x}"))
}

fn u16_at(bytes: &[u8], offset: usize) -> anyhow::Result<u16> {
    Ok(u16::from_le_bytes(bytes_at(bytes, offset, 2)?.try_into()?))
}

fn u32_at(bytes: &[u8], offset: usize) -> anyhow::Result<u32> {
    Ok(u32::from_le_bytes(bytes_at(bytes, offset, 4)?.try_into()?))
}

fn c_string_at(bytes: &[u8], offset: usize) -> anyhow::Result<String> {
    let available = bytes
        .get(offset..)
        .with_context(|| format!("string offset {offset:#x} was outside the file"))?;
    let search_length = available.len().min(MAX_STRING_BYTES);
    let end = available[..search_length]
        .iter()
        .position(|byte| *byte == 0)
        .context("export string was not terminated within 4096 bytes")?;
    Ok(String::from_utf8_lossy(&available[..end]).into_owned())
}

fn rva_to_offset(
    bytes: &[u8],
    rva: u32,
    size_of_headers: u32,
    sections: &[Section],
) -> anyhow::Result<usize> {
    if rva < size_of_headers {
        let offset = rva as usize;
        bytes_at(bytes, offset, 1)?;
        return Ok(offset);
    }

    for section in sections {
        let span = section.virtual_size.max(section.raw_size);
        let Some(delta) = rva.checked_sub(section.virtual_address) else {
            continue;
        };
        if delta >= span || delta >= section.raw_size {
            continue;
        }
        let offset = section
            .raw_offset
            .checked_add(delta)
            .context("section file offset overflowed")? as usize;
        bytes_at(bytes, offset, 1)?;
        return Ok(offset);
    }

    anyhow::bail!("RVA {rva:#x} does not point to bytes stored in this file")
}

fn parse_export_table(bytes: &[u8]) -> anyhow::Result<ExportTable> {
    ensure!(bytes_at(bytes, 0, 2)? == b"MZ", "missing DOS MZ signature");
    let pe_offset = u32_at(bytes, 0x3c)? as usize;
    ensure!(
        bytes_at(bytes, pe_offset, 4)? == b"PE\0\0",
        "missing PE signature"
    );

    let section_count = u16_at(bytes, pe_offset + 6)? as usize;
    let optional_size = u16_at(bytes, pe_offset + 20)? as usize;
    let optional_offset = pe_offset
        .checked_add(24)
        .context("optional-header offset overflowed")?;
    bytes_at(bytes, optional_offset, optional_size)?;

    let magic = u16_at(bytes, optional_offset)?;
    let (directory_offset, directory_count_offset) = match magic {
        PE32_MAGIC => (96_usize, 92_usize),
        PE32_PLUS_MAGIC => (112_usize, 108_usize),
        other => anyhow::bail!("unsupported optional-header magic {other:#x}"),
    };
    ensure!(
        optional_size >= directory_offset + 8,
        "optional header has no complete export-directory entry"
    );
    ensure!(
        u32_at(bytes, optional_offset + directory_count_offset)? >= 1,
        "optional header reports no data directories"
    );

    let size_of_headers = u32_at(bytes, optional_offset + 60)?;
    let export_rva = u32_at(bytes, optional_offset + directory_offset)?;
    let export_size = u32_at(bytes, optional_offset + directory_offset + 4)?;
    ensure!(
        export_rva != 0 && export_size >= EXPORT_DIRECTORY_SIZE as u32,
        "this image has no export table"
    );

    let section_table_offset = optional_offset
        .checked_add(optional_size)
        .context("section-table offset overflowed")?;
    ensure!(
        section_count <= 96,
        "unreasonable section count: {section_count}"
    );
    let mut sections = Vec::with_capacity(section_count);
    for index in 0..section_count {
        let offset = section_table_offset
            .checked_add(index * SECTION_HEADER_SIZE)
            .context("section-header offset overflowed")?;
        bytes_at(bytes, offset, SECTION_HEADER_SIZE)?;
        sections.push(Section {
            virtual_size: u32_at(bytes, offset + 8)?,
            virtual_address: u32_at(bytes, offset + 12)?,
            raw_size: u32_at(bytes, offset + 16)?,
            raw_offset: u32_at(bytes, offset + 20)?,
        });
    }

    let file_offset = |rva| rva_to_offset(bytes, rva, size_of_headers, &sections);
    let directory = file_offset(export_rva)?;
    bytes_at(bytes, directory, EXPORT_DIRECTORY_SIZE)?;

    let image_name = c_string_at(bytes, file_offset(u32_at(bytes, directory + 12)?)?)?;
    let ordinal_base = u32_at(bytes, directory + 16)?;
    let function_count = u32_at(bytes, directory + 20)?;
    let name_count = u32_at(bytes, directory + 24)?;
    ensure!(
        function_count as usize <= MAX_EXPORTS && name_count as usize <= MAX_EXPORTS,
        "export table is too large for this teaching tool"
    );

    let functions = file_offset(u32_at(bytes, directory + 28)?)?;
    let names = file_offset(u32_at(bytes, directory + 32)?)?;
    let ordinals = file_offset(u32_at(bytes, directory + 36)?)?;
    bytes_at(bytes, functions, function_count as usize * 4)?;
    bytes_at(bytes, names, name_count as usize * 4)?;
    bytes_at(bytes, ordinals, name_count as usize * 2)?;

    let export_end = export_rva
        .checked_add(export_size)
        .context("export-directory RVA range overflowed")?;
    let mut named = Vec::with_capacity(name_count as usize);
    for index in 0..name_count as usize {
        let name_rva = u32_at(bytes, names + index * 4)?;
        let ordinal_index = u16_at(bytes, ordinals + index * 2)? as u32;
        ensure!(
            ordinal_index < function_count,
            "export ordinal index {ordinal_index} is outside the address table"
        );
        let function_rva = u32_at(bytes, functions + ordinal_index as usize * 4)?;
        let forwarder = if (export_rva..export_end).contains(&function_rva) {
            Some(c_string_at(bytes, file_offset(function_rva)?)?)
        } else {
            None
        };
        named.push(NamedExport {
            name: c_string_at(bytes, file_offset(name_rva)?)?,
            ordinal: ordinal_base
                .checked_add(ordinal_index)
                .context("export ordinal overflowed")?,
            rva: function_rva,
            forwarder,
        });
    }

    Ok(ExportTable {
        image_name,
        function_count,
        named,
    })
}

fn main() -> anyhow::Result<()> {
    let path = std::env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .context("usage: export_inspector <game.exe-or-dll>")?;
    let bytes = fs::read(&path).with_context(|| format!("could not read {}", path.display()))?;
    let table = parse_export_table(&bytes)?;

    println!("File:             {}", path.display());
    println!("Image name:       {}", table.image_name);
    println!("Address entries:  {}", table.function_count);
    println!("Named exports:    {}", table.named.len());
    println!();
    println!("Ordinal  RVA         Name / forwarder");
    for export in table.named {
        match export.forwarder {
            Some(target) => println!(
                "{:<8} {:#010x}  {} -> {target}",
                export.ordinal, export.rva, export.name
            ),
            None => println!(
                "{:<8} {:#010x}  {}",
                export.ordinal, export.rva, export.name
            ),
        }
    }
    Ok(())
}
