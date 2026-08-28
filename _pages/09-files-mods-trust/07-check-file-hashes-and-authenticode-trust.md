---
title: Check File Hashes and Authenticode Trust
author: attilathedud
date: 2026-08-04
category: Files, Mods & Trust
layout: post
permalink: /pages/9/07/
chapter: "9.7"
minutes: 34
summary: Understand hashes, publisher signatures, certificate trust, WinVerifyTrust state, exact return checks, offline revocation limits, and unsigned open-source builds.
---

## A hash and a signature answer different questions

A SHA-256 hash is a fingerprint of exact bytes. Change one byte and the fingerprint should change dramatically. A saved baseline can answer:

> “Are these bytes identical to the bytes I recorded earlier?”

It cannot answer who created the original file. An attacker can replace both a file and an unprotected text file containing its hash.

An **Authenticode signature** connects the file's digest to a signing certificate and asks Windows to apply a trust policy. It can help answer:

> “Does this file still match a signature made by a publisher whose certificate chain Windows trusts under this policy?”

Neither answer proves that software has no bugs or that you personally intended to install this version.

## Unsigned does not mean malicious

Many open-source game builds are unsigned, self-built, or distributed in archives without Authenticode. Wesnoth, AssaultCube, or Urban Terror files can legitimately report “no embedded signature,” depending on the exact build and distributor.

Treat the result as one fact:

| Result | Reasonable next question |
|---|---|
| Trusted signature | Does the publisher and file version match the source I expected? |
| No embedded signature | Does the official project publish hashes or reproducible release artifacts? |
| Explicitly distrusted | Why did Windows policy reject this publisher/signature? |
| Other failure | Was the file damaged, unsupported, expired, or checked under a limited classroom policy? |

## `WinVerifyTrust` returns a status code, not a `Result`

The Win32 function returns a `LONG`. Microsoft says only exact zero means the requested trust action succeeded. Do not use HRESULT-style “success if nonnegative” logic.

```diff
 fn explain_trust(status: i32) {
-    if status >= 0 { println!("trusted"); }
+    if status == 0 { println!("trusted"); }
     else { println!("trust check failed with status {status:#010x}"); }
 }
```

Known nonzero values help us print plain-English explanations. Unknown statuses remain failures and are printed in hexadecimal for investigation.

## Trust verification has state and policy choices

`WINTRUST_FILE_INFO` points to the file path. `WINTRUST_DATA` describes how the trust provider should work:

- `WTD_UI_NONE` prevents pop-up dialogs;
- `WTD_CHOICE_FILE` selects the file-info union member;
- `WTD_STATEACTION_VERIFY` begins verification and may create provider state;
- `WTD_STATEACTION_CLOSE` releases that state afterward;
- `WTD_DISABLE_MD2_MD4` refuses two obsolete digest algorithms;
- `WTD_REVOKE_NONE` skips revocation checking in this offline classroom run;
- `WTD_CACHE_ONLY_URL_RETRIEVAL` avoids network retrieval in this reproducible lab.

Those last two choices have a tradeoff: the result does not include a fresh revocation check. A release pipeline with network access should define and test a stricter revocation policy instead of treating this offline classroom result as the final word.

## Build the combined inspector

<details class="lab-source" markdown="1">
<summary>Complete lab source: signature_check.rs</summary>

```rust
#[cfg(windows)]
mod app {
    use std::{
        ffi::OsStr,
        fs::File,
        io::Read,
        mem::size_of,
        os::windows::ffi::OsStrExt,
        path::{Path, PathBuf},
    };

    use anyhow::Context;
    use sha2::{Digest, Sha256};
    use windows::{
        Win32::{
            Foundation::{
                HANDLE, HWND, TRUST_E_EXPLICIT_DISTRUST, TRUST_E_NOSIGNATURE,
                TRUST_E_PROVIDER_UNKNOWN, TRUST_E_SUBJECT_FORM_UNKNOWN,
                TRUST_E_SUBJECT_NOT_TRUSTED,
            },
            Security::WinTrust::{
                WINTRUST_ACTION_GENERIC_VERIFY_V2, WINTRUST_DATA,
                WINTRUST_DATA_0, WINTRUST_FILE_INFO,
                WTD_CACHE_ONLY_URL_RETRIEVAL, WTD_CHOICE_FILE,
                WTD_DISABLE_MD2_MD4, WTD_REVOKE_NONE,
                WTD_STATEACTION_CLOSE, WTD_STATEACTION_VERIFY,
                WTD_UI_NONE, WTD_UICONTEXT_EXECUTE, WinVerifyTrust,
            },
        },
        core::PCWSTR,
    };

    fn sha256(path: &Path) -> anyhow::Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0_u8; 64 * 1_024];
        loop {
            let count = file.read(&mut buffer)?;
            if count == 0 {
                break;
            }
            hasher.update(&buffer[..count]);
        }
        Ok(format!("{:x}", hasher.finalize()))
    }

    fn verify_authenticode(path: &Path) -> i32 {
        let wide_path: Vec<u16> = OsStr::new(path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let mut file_info = WINTRUST_FILE_INFO {
            cbStruct: size_of::<WINTRUST_FILE_INFO>() as u32,
            pcwszFilePath: PCWSTR(wide_path.as_ptr()),
            hFile: HANDLE::default(),
            pgKnownSubject: std::ptr::null_mut(),
        };
        let mut trust_data = WINTRUST_DATA {
            cbStruct: size_of::<WINTRUST_DATA>() as u32,
            dwUIChoice: WTD_UI_NONE,
            fdwRevocationChecks: WTD_REVOKE_NONE,
            dwUnionChoice: WTD_CHOICE_FILE,
            Anonymous: WINTRUST_DATA_0 { pFile: &mut file_info },
            dwStateAction: WTD_STATEACTION_VERIFY,
            dwProvFlags: WTD_CACHE_ONLY_URL_RETRIEVAL | WTD_DISABLE_MD2_MD4,
            dwUIContext: WTD_UICONTEXT_EXECUTE,
            ..Default::default()
        };
        let mut action = WINTRUST_ACTION_GENERIC_VERIFY_V2;

        // SAFETY: both structures contain valid sizes and pointers that remain
        // alive through the call. UI is disabled and the file path is terminated.
        let status = unsafe {
            WinVerifyTrust(
                HWND::default(),
                &mut action,
                (&mut trust_data as *mut WINTRUST_DATA).cast(),
            )
        };

        trust_data.dwStateAction = WTD_STATEACTION_CLOSE;
        // SAFETY: closes provider state created by the verification call. The
        // same live structures and action identifier are supplied once more.
        let _ = unsafe {
            WinVerifyTrust(
                HWND::default(),
                &mut action,
                (&mut trust_data as *mut WINTRUST_DATA).cast(),
            )
        };
        status
    }

    fn meaning(status: i32) -> &'static str {
        if status == 0 {
            "trusted Authenticode signature"
        } else if status == TRUST_E_NOSIGNATURE.0 {
            "no embedded signature was found"
        } else if status == TRUST_E_EXPLICIT_DISTRUST.0 {
            "the publisher or signature is explicitly distrusted"
        } else if status == TRUST_E_SUBJECT_NOT_TRUSTED.0 {
            "the trust policy rejected the file"
        } else if status == TRUST_E_PROVIDER_UNKNOWN.0 {
            "Windows has no matching trust provider"
        } else if status == TRUST_E_SUBJECT_FORM_UNKNOWN.0 {
            "the provider does not understand this file form"
        } else {
            "verification failed with another trust-provider status"
        }
    }

    pub fn run() -> anyhow::Result<()> {
        let path = std::env::args_os().nth(1).map(PathBuf::from)
            .context("usage: signature_check <game.exe-or-dll>")?;
        anyhow::ensure!(path.is_file(), "{} is not a file", path.display());

        let hash = sha256(&path)
            .with_context(|| format!("could not hash {}", path.display()))?;
        let status = verify_authenticode(&path);
        println!("File:   {}", path.display());
        println!("SHA-256: {hash}");
        println!("Trust:  {} (status {:#010x})", meaning(status), status as u32);
        println!("The cache-only check did not modify the file.");
        Ok(())
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This Authenticode lab must run on Windows.");
}
```

</details>

## Why keep the wide path alive?

`PCWSTR` is only a pointer. It does not own the UTF-16 vector. `wide_path`, `file_info`, and `trust_data` all remain local variables until both `WinVerifyTrust` calls finish, so every pointer stays valid.

This is why the unsafe comment names lifetimes instead of saying only “Windows API call.” A useful safety comment explains the exact facts the compiler cannot verify.

## Check your installations

```powershell
cd windows-labs
cargo build --release --target i686-pc-windows-msvc --bin signature_check

.\target\i686-pc-windows-msvc\release\signature_check.exe `
  "C:\Games\Wesnoth\wesnoth.exe"

.\target\i686-pc-windows-msvc\release\signature_check.exe `
  "C:\Games\AssaultCube\bin_win32\ac_client.exe"

.\target\i686-pc-windows-msvc\release\signature_check.exe `
  "C:\Games\UrbanTerror\Quake3-UrT.exe"
```

Record the SHA-256 values alongside the game version and download source. Re-run the tool after installing a mod or update. A changed hash can be expected; your notes tell you whether the change matches an action you performed.

Some Windows components are signed through catalogs rather than an embedded
signature. This lab checks the embedded signature on the selected game EXE. If
you expand it to inventory every DLL loaded beside the game, add explicit
catalog-signature handling instead of reporting those files as simply unsigned.

Combine this lesson with `module_inventory`: inventory tells you what actually loaded, the hash identifies exact bytes, and Authenticode adds one publisher-trust signal.

The buildable source is [`signature_check.rs`]({{ site.baseurl }}/windows-labs/src/bin/signature_check.rs).

References: [`WinVerifyTrust`](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/nf-wintrust-winverifytrust), [`WINTRUST_DATA`](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/ns-wintrust-wintrust_data), [`WINTRUST_FILE_INFO`](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/ns-wintrust-wintrust_file_info), and [Authenticode time stamping](https://learn.microsoft.com/en-us/windows/win32/seccrypto/time-stamping-authenticode-signatures).
