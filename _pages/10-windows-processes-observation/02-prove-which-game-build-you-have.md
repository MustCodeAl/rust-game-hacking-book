---
title: Prove Which Game Build You Have
author: attilathedud
date: 2026-07-30
category: Processes, Handles & Threads
layout: post
permalink: /pages/10/02/
chapter: "10.2"
minutes: 30
summary: Create and verify a SHA-256 manifest so reverse-engineering notes, RVAs, patterns, mods, and patches stay tied to exact files.
---

## A version label is not enough

Two files can both call themselves “Wesnoth 1.14.9” and still contain different bytes. A distribution may rebuild the executable, a mod may replace data, or a repair tool may update one DLL without changing the folder name.

That matters because this course uses exact evidence:

- an RVA belongs to one module layout;
- a byte pattern belongs to one compiled instruction sequence;
- an original-byte check belongs to one supported patch site;
- a PK3 edit belongs to one archive and path layout.

A **cryptographic hash** turns all file bytes into a fixed-size fingerprint. This lab uses SHA-256. Change one byte and the resulting digest should change dramatically.

Build identity is stronger when separate observations answer separate
questions:

| Evidence | Question it answers | Important limit |
|---|---|---|
| Version label | What release does the program claim? | Different builds can share it. |
| Live module path | Which file did this process map? | A path does not identify its bytes. |
| Architecture and PE fields | What layout family is this file? | Many builds share those fields. |
| SHA-256 digest | Do all bytes match the baseline? | The baseline must already be trusted. |
| Trusted manifest or signature | Who supplied the expected identity? | It does not prove the live file matches. |

For a reproducible lesson, confirm the live path and architecture, then compare
its SHA-256 digest with a trusted record. No single friendly version string does
all of those jobs.

## What a hash proves—and what it does not

If today's digest equals a trusted earlier digest, the file bytes match that earlier file. The hash does not prove who created the file or whether the original was safe.

The word **trusted** matters. If an attacker can replace both a file and its manifest, a perfect hash comparison proves only that the two replacements agree. Keep the baseline somewhere the experiment does not rewrite, such as a read-only lab snapshot or version-controlled record.

## A manifest records more than one fingerprint

The course format stores one file per line:

```text
# GHA SHA-256 manifest v1
digest<TAB>byte-count<TAB>absolute-path
```

The byte count is not a substitute for SHA-256. It is extra context that makes a mismatch easier to explain.

The tool rejects tabs and newlines in paths because those characters would make
the small text format ambiguous. If this game-file manifest grows to store mod
IDs, signatures, several hashes, or nested package information, move to a
defined format such as JSON, CBOR, or a signed catalog. The lab stays text-only
so you can see every parsing rule.

## Hash in chunks, not one giant allocation

```rust
fn sha256(path: &Path) -> anyhow::Result<(u64, String)> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut total = 0_u64;
    let mut buffer = [0_u8; 64 * 1024];

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
        total = total.checked_add(u64::try_from(count)?)
            .context("file size overflowed")?;
    }
    Ok((total, format!("{:x}", hasher.finalize())))
}
```

`read` returns the number of buffer bytes filled. A return value of zero means end of file. Only `&buffer[..count]` goes into the hash; hashing the unused remainder would produce the wrong answer.

```diff
 fn sha256(path: &Path) -> anyhow::Result<String> {
     let mut hasher = Sha256::new();
-    let bytes = std::fs::read(path)?;
-    hasher.update(bytes);
+    let mut file = File::open(path)?;
+    let mut buffer = [0_u8; 64 * 1024];
+    loop {
+        let count = file.read(&mut buffer)?;
+        if count == 0 { break; }
+        hasher.update(&buffer[..count]);
+    }
     Ok(format!("{:x}", hasher.finalize()))
 }
```

### Why this version?

Streaming keeps memory use roughly constant. A 4 GB game archive does not require a 4 GB `Vec` just to calculate its fingerprint.

## Create without silently replacing trust

The important file option is `create_new(true)`:

```rust
let output = OpenOptions::new()
    .write(true)
    .create_new(true)
    .open(manifest)
    .with_context(|| format!("refusing to replace {}", manifest.display()))?;
```

If the manifest already exists, creation fails. Updating a trusted baseline should be a conscious review step, not something the verifier performs automatically after detecting a change.

## Verify every recorded field

For each non-comment line, the verifier:

1. parses the wanted SHA-256 digest;
2. parses the wanted byte count;
3. opens the recorded path;
4. streams the current bytes through SHA-256;
5. compares size and digest;
6. reports `OK` or `CHANGED`;
7. returns a failing exit status if anything changed.

That final failure is useful in scripts. A colored message is for a person; a non-zero exit status is for another program.

## Run the complete tool

The complete implementation—including creation, parsing, verification, checked size arithmetic, and non-overwriting output—is [`integrity_manifest.rs`]({{ site.baseurl }}/windows-labs/src/bin/integrity_manifest.rs).

Build it:

```powershell
cd windows-labs
cargo build --release --target i686-pc-windows-msvc `
  --bin integrity_manifest
```

Create a baseline for the exact executable and important DLLs:

```powershell
.\target\i686-pc-windows-msvc\release\integrity_manifest.exe create `
  .\wesnoth-1.14.9.manifest `
  "C:\Games\Wesnoth 1.14.9\wesnoth.exe" `
  "C:\Games\Wesnoth 1.14.9\libstdc++-6.dll"
```

Verify it before using an RVA or installing a patch:

```powershell
.\target\i686-pc-windows-msvc\release\integrity_manifest.exe verify `
  .\wesnoth-1.14.9.manifest
```

Create separate manifests for the exact course builds of AssaultCube and Urban Terror. Do not add save files, logs, or configuration files that are expected to change every run.

## Make mods explicit instead of invisible

A supported mod changes files on purpose. Treat it as a separate known state:

```text
clean-install.manifest
course-mod.manifest
```

Do not update `clean-install.manifest` until a changed file looks clean again. Preserve the original baseline, document the mod, and create a second reviewed manifest after the intended change.

For the Urban Terror PK3 lab, record the original archive hash, use the existing `.gha-backup`, and record the rebuilt archive hash. That gives you three pieces of evidence: what you started with, what the tool preserved, and what it created.

## Watch for time-of-check/time-of-use

The program hashes a file and later another tool may open it. The file could change between those actions. This is called a **time-of-check/time-of-use** race.

For this lab, close the game and mod tools while verifying. A launcher that must
verify a versioned mod immediately before starting the game needs a stronger
design: it can keep the checked file handle open, require a signed package, or
let one trusted updater own both verification and launch.

## Hashes complement runtime checks

An on-disk hash confirms the file. A live patcher should still check:

- the live module name and range;
- the supported architecture;
- a version-specific RVA or unique pattern;
- the exact original bytes at the final address.

Each check answers a different question. Defense improves when independent evidence agrees.

Reference: [Microsoft PE format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format) and [NIST Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).
