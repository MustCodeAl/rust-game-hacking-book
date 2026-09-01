---
title: Find and Edit Save Data Safely
author: attilathedud
date: 2026-07-30
category: Files, Mods & Trust
layout: post
permalink: /pages/9/02/
chapter: "9.2"
minutes: 17
summary: Locate a save with Process Monitor, compare controlled snapshots, and write changes atomically.
---

## Locate the save by behavior

Use Flare 1.12 with a disposable character. Start Process Monitor and filter to the game process.

![Filtering Process Monitor to the target]({{ site.baseurl }}/assets/images/8/2/procmon1.png)

Save the game once, then look for file writes near that timestamp.

![A likely save-data path]({{ site.baseurl }}/assets/images/8/2/procmon4.png)

Close the game before editing. Many games keep state in memory and overwrite the save during shutdown.

For the actual Flare 1.12 lab, filter **Process Name is `flare.exe`**, create a character in the Empyrean campaign, then choose **Save & Exit**. The important writes are:

```text
C:\Users\<you>\AppData\Roaming\flare\userdata\saves\empyrean\1\avatar.txt
C:\Users\<you>\AppData\Roaming\flare\userdata\saves\empyrean\1\stash_HC.txt
```

Open `avatar.txt` first. It contains the character XP and `build` values; `stash_HC.txt` is the shared hardcore stash. Copy both files before changing either one.

## Make two controlled saves

Create:

- save A with 100 gold;
- save B with 101 gold;
- no other intentional changes.

Compare them:

```rust
fn differing_offsets(left: &[u8], right: &[u8]) -> Vec<usize> {
    left.iter()
        .zip(right)
        .enumerate()
        .filter_map(|(index, (a, b))| (a != b).then_some(index))
        .collect()
}
```

If the files differ almost everywhere, compression, encryption, timestamps, or a checksum may be involved.

The two-save comparison is a controlled experiment, not proof that every changed
byte belongs to gold. Games may update play time, random state, timestamps, object
order, or integrity data during the same save. Repeat the comparison with several
values and one intentional change at a time. A real field should follow the chosen
change consistently; unrelated changing bytes are background state.

## Prefer a typed text format

If the save is readable key/value text, parse lines instead of replacing every matching number:

```rust
use std::collections::BTreeMap;

fn parse_key_values(text: &str) -> anyhow::Result<BTreeMap<String, String>> {
    text.lines()
        .filter(|line| !line.trim().is_empty() && !line.starts_with('#'))
        .map(|line| {
            let (key, value) = line.split_once('=')
                .context("expected key=value")?;
            Ok((key.trim().to_owned(), value.trim().to_owned()))
        })
        .collect()
}
```

Then require the exact field:

```rust
let gold = values.get_mut("gold").context("save has no gold field")?;
*gold = "250".to_owned();
```

Flare’s real save is not the tiny `gold=...` example. In the exact 1.12 capture, the new character has:

```text
xp=0
build=5,1,1,2
```

The four `build` numbers are Physical, Mental, Offense, and Defense. The original visible hack changes them to:

```text
build=30,30,30,30
```

Reloading the disposable character shows all four values as 30.

## Write atomically

Do not overwrite the original in place. Write a temporary sibling, flush it, then rename:

```rust
use std::{fs, io::Write, path::Path};

fn atomic_replace(path: &Path, contents: &[u8]) -> anyhow::Result<()> {
    let temporary = path.with_extension("gha-new");

    {
        let mut file = fs::File::create(&temporary)?;
        file.write_all(contents)?;
        file.sync_all()?;
    }

    fs::rename(&temporary, path)?;
    Ok(())
}
```

The important change is that the original path is not used as scratch space:

```diff
 fn atomic_replace(path: &Path, contents: &[u8]) -> anyhow::Result<()> {
-    fs::write(path, contents)?;
+    let temporary = path.with_extension("gha-new");
+    let mut file = fs::File::create(&temporary)?;
+    file.write_all(contents)?;
+    file.sync_all()?;
+    drop(file);
+    fs::rename(&temporary, path)?;
     Ok(())
 }
```

> **Why this version?** Writing directly truncates the original before the new
> bytes are safely stored. A crash or full disk can leave half a save. The
> sibling temporary file keeps the original untouched during construction,
> `sync_all` asks the operating system to flush it, and closing the handle before
> replacement avoids Windows sharing conflicts. The complete Windows lab uses
> `ReplaceFileW` so replacement and backup creation are one filesystem action.
{: .block-why }

On Windows, replacing an existing file may require a platform-specific replace operation. Keep the backup until the game successfully loads the new save.

## Prepare, validate, commit, and recover

Use four explicit stages: **prepare, validate, commit, recover**:

1. **Prepare:** read the original and build new bytes somewhere else.
2. **Validate:** confirm the target field, format, ranges, and complete output.
3. **Commit:** replace the directory entry in one filesystem operation.
4. **Recover:** keep enough information to return to the last known-good save.

Atomic replacement and durability solve different problems. **Atomic** means an
observer should see the old file or the new file, not a half-written mixture.
**Durable** means completed data survives the failures the system promises to
handle. Flushing the temporary file improves durability, but no single call can make
the edit, the game's other save files, cloud synchronization, and a power failure
one universal transaction.

The property we are designing is **crash consistency**: after interruption, the
files should describe an old valid state, a new valid state, or an unambiguous
recoverable state. “The normal path completed once” is weaker; crash consistency
also accounts for every point where execution could stop.

Design the on-disk states so each one has an obvious response:

| Files present | Meaning | Safe response |
|---|---|---|
| original only | no edit in progress | open normally |
| original + temporary | preparation was interrupted | validate or remove only the temporary |
| new original + backup | replacement completed | test the new save; retain backup |
| missing original + backup | recovery is needed | restore backup before launching |

Do not choose by modification time alone. Validate the expected filename, format,
and contents, then ask the user before replacing the only known-good copy.

## Run the complete save editor

Close Flare, build the Windows lab workspace, and pass the exact save path and new `build` value:

```powershell
.\target\i686-pc-windows-msvc\release\flare_save_editor.exe `
  "$env:APPDATA\flare\userdata\saves\empyrean\1\avatar.txt" `
  build `
  "30,30,30,30"
```

The tool requires exactly one `build=` line, preserves CRLF versus LF, writes and flushes a sibling temporary file, and uses the `windows` crate's `ReplaceFileW` with write-through. Windows installs the new file atomically and places the original at `avatar.txt.gha-backup`. It refuses to overwrite an existing backup.

The backup is part of the tool's data model, not clutter to delete immediately. The
edit is not considered successful until Flare parses the new file, loads the
character, and later saves it normally. That final game-written save is evidence
that the modified state survived the game's own serializer.

The complete program is [`flare_save_editor.rs`]({{ site.baseurl }}/windows-labs/src/bin/flare_save_editor.rs); the reusable Windows replacement boundary is [`file_replace.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/file_replace.rs).

<details class="lab-source" markdown="1">
<summary>Complete lab source: flare_save_editor.rs</summary>

```rust
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
        // 🛡️ A newline would create a second field and turn a value edit into a
        // structural save-file injection.
        "the new value must stay on one line"
    );

    let text =
        fs::read_to_string(&path).with_context(|| format!("could not read {}", path.display()))?;
    // 📦 Preserve the file's existing Windows/Unix line convention and whether
    // it ended with a newline; unrelated formatting should not become a diff.
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
        // 🎯 Zero means the requested field is absent; several means the edit is
        // ambiguous. In both cases the original must remain untouched.
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
        // 🧹 Flush and close the complete sibling file before asking Windows to
        // atomically swap names. The original is never used as scratch space.
        let mut file = File::create(&temporary)?;
        file.write_all(output.as_bytes())?;
        file.sync_all()?;
    }
    if let Err(error) = replace_file_with_backup(&path, &temporary, &backup) {
        // 🔁 Replacement failed, so remove only our disposable temporary file;
        // `path` still names the untouched original.
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
```

</details>

Read it in five chunks: validate the three arguments, locate exactly one field, preserve the file's newline style, flush a temporary file, then ask Windows to install it while keeping a backup. If any earlier chunk fails, the original save is untouched.

## Checksums and integrity fields

If one small value change also changes a separate fixed-size region, the file may contain a checksum.

Do not patch until you understand:

- which bytes are covered;
- which algorithm is used;
- where the expected checksum is stored;
- byte order;
- whether a secret key is involved.

If the format is cryptographically signed, use supported modding tools instead of attempting to defeat the signature.

## Debug the loader only if needed

Process Monitor can show the file read, and a debugger breakpoint on file APIs can show the buffer passed into parsing.

![A file read observed in the debugger]({{ site.baseurl }}/assets/images/8/2/x64dbg1.png)

In 32-bit Flare on Windows, open x64dbg’s **Symbols** tab, choose `kernelbase.dll`, find `CreateFileA`, and break at its first instruction. Saving the game puts the same `avatar.txt` path on the stack, independently confirming the location found with Process Monitor.

The aim is to learn the format, not to disable validation.

## Validate the result

1. keep the original backup;
2. load the disposable character;
3. confirm only the intended field changed;
4. save again normally;
5. confirm the game can reload that new save.

If loading fails, restore the backup and compare the serializer’s whitespace, encoding, terminators, ordering, and integrity field.
