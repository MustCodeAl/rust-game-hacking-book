#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{io, path::PathBuf, process::Command};

    use anyhow::{Context, ensure};

    fn run_wpr(arguments: &[&std::ffi::OsStr]) -> anyhow::Result<()> {
        let status = Command::new("wpr.exe")
            .args(arguments)
            .status()
            .context("could not start wpr.exe")?;
        ensure!(status.success(), "wpr.exe returned {status}");
        Ok(())
    }

    let output = std::env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("gha-game.etl"));
    ensure!(
        !output.exists(),
        "refusing to overwrite {}",
        output.display()
    );

    run_wpr(&[
        std::ffi::OsStr::new("-start"),
        std::ffi::OsStr::new("GeneralProfile"),
        std::ffi::OsStr::new("-filemode"),
    ])?;

    println!("ETW recording started.");
    println!("Launch or exercise the owned game now, then press Enter to stop.");
    let mut answer = String::new();
    if let Err(error) = io::stdin().read_line(&mut answer) {
        let _ = run_wpr(&[std::ffi::OsStr::new("-cancel")]);
        return Err(error).context("could not read Enter; the trace was cancelled");
    }

    let stop_result = run_wpr(&[std::ffi::OsStr::new("-stop"), output.as_os_str()]);
    if stop_result.is_err() {
        let _ = run_wpr(&[std::ffi::OsStr::new("-cancel")]);
    }
    stop_result?;
    println!("Saved {}", output.display());
    println!("Open the ETL file in Windows Performance Analyzer.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This ETW capture helper must run on Windows.");
}
