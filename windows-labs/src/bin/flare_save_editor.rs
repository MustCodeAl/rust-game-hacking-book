#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{
        fs::{self, File},
        io::Write,
        path::PathBuf,
    };

    use anyhow::Context;
    use gha_windows_labs::replace_file_with_backup;

    let mut arguments = std::env::args().skip(1);
    let path = PathBuf::from(
        arguments
            .next()
            .context("usage: flare_save_editor <avatar.txt> <field> <new-value>")?,
    );
    let field = arguments.next().context("missing field name")?;
    let new_value = arguments.next().context("missing new value")?;
    anyhow::ensure!(
        field
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_'),
        "field names may contain only ASCII letters, digits, and underscores"
    );
    anyhow::ensure!(
        !new_value.chars().any(|ch| matches!(ch, '\r' | '\n')),
        "the new value must stay on one line"
    );

    let text =
        fs::read_to_string(&path).with_context(|| format!("could not read {}", path.display()))?;
    let newline = if text.contains("\r\n") { "\r\n" } else { "\n" };
    let ended_with_newline = text.ends_with('\n');
    let mut matches = 0_usize;
    let mut output_lines = Vec::new();

    for line in text.lines() {
        let replacement = line
            .split_once('=')
            .filter(|(key, _)| key.trim() == field)
            .map(|_| {
                matches += 1;
                format!("{field}={new_value}")
            });
        output_lines.push(replacement.unwrap_or_else(|| line.to_owned()));
    }
    anyhow::ensure!(
        matches == 1,
        "expected exactly one {field}= line, found {matches}; no file was changed"
    );

    let mut output = output_lines.join(newline);
    if ended_with_newline {
        output.push_str(newline);
    }
    let temporary = path.with_extension("txt.gha-new");
    let backup = path.with_extension("txt.gha-backup");
    anyhow::ensure!(
        !temporary.exists(),
        "temporary file already exists at {}",
        temporary.display()
    );

    {
        let mut file = File::create(&temporary)?;
        file.write_all(output.as_bytes())?;
        file.sync_all()?;
    }
    if let Err(error) = replace_file_with_backup(&path, &temporary, &backup) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    println!(
        "Changed {field} in {}. Original saved at {}.",
        path.display(),
        backup.display()
    );
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This file replacement lab uses ReplaceFileW and must run on Windows.");
}
