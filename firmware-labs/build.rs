// Cargo runs this helper on the host computer, so it can use std.
use std::{env, error::Error, fs, path::PathBuf};

fn main() -> Result<(), Box<dyn Error>> {
    println!("cargo:rerun-if-changed=memory.x");

    // Host-side library tests do not use the microcontroller's memory map.
    if env::var("TARGET")? != "thumbv7m-none-eabi" {
        return Ok(());
    }

    // Put the layout beside the build products and tell the linker where it is.
    let output = PathBuf::from(env::var("OUT_DIR")?);
    fs::write(output.join("memory.x"), include_bytes!("memory.x"))?;
    println!("cargo:rustc-link-search={}", output.display());
    Ok(())
}
