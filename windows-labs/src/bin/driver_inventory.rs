#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::{ffi::c_void, mem::size_of};

    use anyhow::Context;
    use windows::Win32::System::ProcessStatus::{EnumDeviceDrivers, GetDeviceDriverBaseNameW};

    fn enumerate() -> anyhow::Result<Vec<*mut c_void>> {
        let mut drivers = vec![std::ptr::null_mut(); 256];
        loop {
            let byte_capacity = u32::try_from(drivers.len() * size_of::<*mut c_void>())
                .context("driver buffer is too large")?;
            let mut bytes_needed = 0_u32;
            // SAFETY: drivers points to byte_capacity writable bytes and
            // bytes_needed is a valid output pointer for the duration of the call.
            unsafe {
                EnumDeviceDrivers(drivers.as_mut_ptr(), byte_capacity, &mut bytes_needed)?;
            }
            let count = usize::try_from(bytes_needed)?.div_ceil(size_of::<*mut c_void>());
            if count <= drivers.len() {
                drivers.truncate(count);
                return Ok(drivers);
            }
            anyhow::ensure!(count <= 16_384, "unreasonable driver count: {count}");
            drivers.resize(count, std::ptr::null_mut());
        }
    }

    let mut names = Vec::new();
    for image_base in enumerate()? {
        if image_base.is_null() {
            continue;
        }
        let mut buffer = [0_u16; 260];
        // SAFETY: image_base came from EnumDeviceDrivers and buffer is writable.
        let length = unsafe { GetDeviceDriverBaseNameW(image_base, &mut buffer) } as usize;
        if length == 0 || length > buffer.len() {
            continue;
        }
        names.push(String::from_utf16_lossy(&buffer[..length]));
    }

    names.sort_unstable_by_key(|name| name.to_ascii_lowercase());
    names.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    println!(
        "Loaded kernel drivers visible to this account: {}",
        names.len()
    );
    for name in names {
        println!("  {name}");
    }
    println!("No privileges were enabled and no driver state was changed.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This read-only driver inventory uses the Windows PSAPI.");
}
