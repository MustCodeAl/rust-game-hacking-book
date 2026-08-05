use std::{
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, BufWriter, Read, Write},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result, ensure};
use sha2::{Digest, Sha256};

fn sha256(path: &Path) -> Result<(u64, String)> {
    let mut file =
        File::open(path).with_context(|| format!("could not open {}", path.display()))?;
    let mut hasher = Sha256::new();
    let mut total = 0_u64;
    let mut buffer = [0_u8; 64 * 1024];

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
        total = total
            .checked_add(u64::try_from(count)?)
            .context("file size overflowed")?;
    }
    Ok((total, format!("{:x}", hasher.finalize())))
}

fn checked_path(text: &str) -> Result<PathBuf> {
    ensure!(
        !text.contains(['\t', '\n', '\r']),
        "paths may not contain tabs or newlines"
    );
    Ok(PathBuf::from(text))
}

fn create(manifest: &Path, files: impl Iterator<Item = String>) -> Result<()> {
    let mut entries = Vec::new();
    for text in files {
        let path = checked_path(&text)?;
        let canonical = fs::canonicalize(&path)
            .with_context(|| format!("could not resolve {}", path.display()))?;
        let canonical_text = canonical.to_string_lossy();
        ensure!(
            !canonical_text.contains(['\t', '\n', '\r']),
            "path cannot be represented safely"
        );
        let (size, digest) = sha256(&canonical)?;
        println!("added  {digest}  {}", canonical.display());
        entries.push((digest, size, canonical_text.into_owned()));
    }
    ensure!(
        !entries.is_empty(),
        "create needs at least one game or mod file"
    );

    let output = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(manifest)
        .with_context(|| format!("refusing to replace {}", manifest.display()))?;
    let mut output = BufWriter::new(output);
    writeln!(output, "# GHA SHA-256 manifest v1")?;
    for (digest, size, path) in &entries {
        writeln!(output, "{digest}\t{size}\t{path}")?;
    }
    output.flush()?;
    println!(
        "created {} with {} file(s)",
        manifest.display(),
        entries.len()
    );
    Ok(())
}

fn verify(manifest: &Path) -> Result<()> {
    let input =
        File::open(manifest).with_context(|| format!("could not open {}", manifest.display()))?;
    let mut checked = 0_usize;
    let mut failed = 0_usize;

    for (index, line) in BufReader::new(input).lines().enumerate() {
        let line = line?;
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut fields = line.splitn(3, '\t');
        let wanted_hash = fields.next().context("missing digest")?;
        let wanted_size: u64 = fields.next().context("missing size")?.parse()?;
        let path = checked_path(fields.next().context("missing path")?)?;
        let (actual_size, actual_hash) =
            sha256(&path).with_context(|| format!("manifest line {}", index + 1))?;
        checked += 1;

        if actual_size == wanted_size && actual_hash.eq_ignore_ascii_case(wanted_hash) {
            println!("OK       {}", path.display());
        } else {
            failed += 1;
            println!("CHANGED  {}", path.display());
            println!("  wanted {wanted_hash} ({wanted_size} bytes)");
            println!("  actual {actual_hash} ({actual_size} bytes)");
        }
    }

    ensure!(checked > 0, "the manifest contains no files");
    ensure!(failed == 0, "{failed} of {checked} file(s) changed");
    println!("verified {checked} file(s)");
    Ok(())
}

fn main() -> Result<()> {
    let mut arguments = std::env::args().skip(1);
    let command = arguments
        .next()
        .context("usage: integrity_manifest <create|verify> <manifest> [files...]")?;
    let manifest = PathBuf::from(arguments.next().context("missing manifest path")?);

    match command.as_str() {
        "create" => create(&manifest, arguments),
        "verify" => {
            ensure!(
                arguments.next().is_none(),
                "verify reads file paths from the manifest"
            );
            verify(&manifest)
        }
        _ => anyhow::bail!("command must be create or verify"),
    }
}
