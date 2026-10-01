#![no_std] // Use core without an operating system's standard library.
#![no_main] // Let cortex-m-rt supply the reset/startup entry arrangement.

use core::{fmt, fmt::Write, panic::PanicInfo};
use cortex_m_rt::entry;
use cortex_m_semihosting::{debug, hio};
use gha_firmware_labs::LampController;

// These samples stand in for a button; they are not GPIO reads.
fn run_trace() -> Result<(), fmt::Error> {
    let mut output = hio::hstdout().map_err(|_| fmt::Error)?;
    let mut lamp = LampController::new();

    for (index, pressed) in [false, true, true, false, true, false]
        .into_iter()
        .enumerate()
    {
        let on = lamp.sample(pressed);
        writeln!(output, "sample {}: pressed={pressed}, lamp={on}", index + 1)?;
    }
    Ok(())
}

#[entry]
fn main() -> ! {
    // Tell QEMU whether the trace completed; no guest OS exits this program.
    let status = match run_trace() {
        Ok(()) => debug::EXIT_SUCCESS,
        Err(_) => debug::EXIT_FAILURE,
    };
    debug::exit(status); // QEMU-only: replace this in physical-board firmware.

    // The entry point must never return, even if the exit request returns.
    loop {
        core::hint::spin_loop();
    }
}

#[panic_handler]
fn panic(_information: &PanicInfo) -> ! {
    debug::exit(debug::EXIT_FAILURE); // A panic makes this emulator run fail.
    loop {
        core::hint::spin_loop();
    }
}
