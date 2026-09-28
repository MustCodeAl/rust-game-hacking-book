#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{
        fs::{self, File},
        io::{Read, Write},
        path::{Path, PathBuf},
    };

    use anyhow::Context;
    use gha_windows_labs::replace_file_with_backup;
    use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

    const UP: &str = "env/austria/austriasky_up.jpg";
    const DOWN: &str = "env/austria/austriasky_dw.jpg";
    const MAX_SKY_FACE: u64 = 32 * 1024 * 1024;

    fn read_down_face(path: &Path) -> anyhow::Result<Vec<u8>> {
        let mut archive = ZipArchive::new(File::open(path)?)?;
        let mut entry = archive
            .by_name(DOWN)
            .with_context(|| format!("{DOWN} is missing from the PK3"))?;
        anyhow::ensure!(
            entry.size() <= MAX_SKY_FACE,
            "sky image is unexpectedly large"
        );
        let mut bytes = Vec::with_capacity(usize::try_from(entry.size())?);
        entry.read_to_end(&mut bytes)?;
        anyhow::ensure!(!bytes.is_empty(), "downward sky image is empty");
        Ok(bytes)
    }

    let path = PathBuf::from(
        std::env::args()
            .nth(1)
            .context("usage: urbanterror_pk3 <path-to-zUrT43_001.pk3>")?,
    );
    anyhow::ensure!(
        path.file_name()
            .is_some_and(|name| name == "zUrT43_001.pk3"),
        "this lab accepts only zUrT43_001.pk3"
    );
    let replacement = read_down_face(&path)?;
    let temporary = path.with_extension("pk3.gha-new");
    let backup = path.with_extension("pk3.gha-backup");
    anyhow::ensure!(!temporary.exists(), "temporary PK3 already exists");

    let mut archive = ZipArchive::new(File::open(&path)?)?;
    let output = File::create(&temporary)?;
    let mut writer = ZipWriter::new(output);
    let mut replaced = 0_usize;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index)?;
        let name = entry.name().to_owned();
        let options = SimpleFileOptions::default()
            .compression_method(entry.compression())
            .unix_permissions(entry.unix_mode().unwrap_or(0o644));

        if entry.is_dir() {
            writer.add_directory(name, options)?;
            continue;
        }
        writer.start_file(&name, options)?;
        if name == UP {
            writer.write_all(&replacement)?;
            replaced += 1;
        } else {
            std::io::copy(&mut entry, &mut writer)?;
        }
    }
    anyhow::ensure!(replaced == 1, "expected one {UP} entry, found {replaced}");
    let output = writer.finish()?;
    output.sync_all()?;

    if let Err(error) = replace_file_with_backup(&path, &temporary, &backup) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    println!(
        "Replaced {UP} with {DOWN}. Original archive saved at {}.",
        backup.display()
    );
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This PK3 replacement lab uses ReplaceFileW and must run on Windows.");
}
