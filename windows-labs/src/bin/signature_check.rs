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
                WINTRUST_ACTION_GENERIC_VERIFY_V2, WINTRUST_DATA, WINTRUST_DATA_0,
                WINTRUST_FILE_INFO, WTD_CACHE_ONLY_URL_RETRIEVAL, WTD_CHOICE_FILE,
                WTD_DISABLE_MD2_MD4, WTD_REVOKE_NONE, WTD_STATEACTION_CLOSE,
                WTD_STATEACTION_VERIFY, WTD_UI_NONE, WTD_UICONTEXT_EXECUTE, WinVerifyTrust,
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
            Anonymous: WINTRUST_DATA_0 {
                pFile: &mut file_info,
            },
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
        let path = std::env::args_os()
            .nth(1)
            .map(PathBuf::from)
            .context("usage: signature_check <game.exe-or-dll>")?;
        anyhow::ensure!(path.is_file(), "{} is not a file", path.display());

        let hash = sha256(&path).with_context(|| format!("could not hash {}", path.display()))?;
        let status = verify_authenticode(&path);
        println!("File:   {}", path.display());
        println!("SHA-256: {hash}");
        println!(
            "Trust:  {} (status {:#010x})",
            meaning(status),
            status as u32
        );
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
