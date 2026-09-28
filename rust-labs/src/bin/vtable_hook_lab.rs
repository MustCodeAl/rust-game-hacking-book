//! A portable model of the install / forward / restore lifecycle used when a
//! tool hooks a method through an object's function-pointer table.
//!
//! Direct3D reaches every method through a COM vtable, so a tool that wants to
//! observe `Present` or `DrawIndexed` replaces one entry in a table of
//! function pointers. The Windows details — page protection, calling
//! conventions, COM reference counts — are not modelled here. What is modelled
//! is the part that actually goes wrong: the bookkeeping around the swap.
//!
//! Nothing here loads a graphics API, touches another process, or leaves this
//! program. The "vtable" is an ordinary array of safe Rust function pointers.
//!
//! ```text
//! cargo run --bin vtable_hook_lab
//! cargo test --bin vtable_hook_lab
//! ```

use std::sync::Mutex;

/// One entry in the toy table. A real `Present` would carry a device pointer
/// and flags; the frame number stands in for all of that.
type PresentFn = fn(frame: u32) -> u32;

/// The toy interface. A COM vtable is a fixed array of function pointers, and
/// the object holds a pointer to it, so several objects of the same interface
/// share one table — which is exactly why a tool can read the layout from a
/// device it created itself.
#[derive(Debug)]
struct Vtable {
    slots: [PresentFn; SLOT_COUNT],
}

const SLOT_COUNT: usize = 4;
/// Chosen the way a real index is chosen: by counting methods in declaration
/// order, inherited ones first. See the lesson for the derivation.
const PRESENT_SLOT: usize = 2;

/// The implementation the graphics runtime would provide.
fn real_present(frame: u32) -> u32 {
    frame + 1
}

fn unused_slot(frame: u32) -> u32 {
    frame
}

/// The original pointer, saved so the replacement can forward to it.
static ORIGINAL_PRESENT: Mutex<Option<PresentFn>> = Mutex::new(None);
/// Frames the replacement observed, standing in for a telemetry sink.
static OBSERVED_FRAMES: Mutex<Vec<u32>> = Mutex::new(Vec::new());

/// The replacement. It records one small fact and forwards.
fn hooked_present(frame: u32) -> u32 {
    if let Ok(mut observed) = OBSERVED_FRAMES.lock() {
        observed.push(frame);
    }

    // Copy the pointer out and release the lock *before* calling through it.
    // Holding a lock across a forwarded call is how a hook deadlocks itself:
    // the original is free to re-enter the hooked path, and would then wait
    // for a lock this thread already holds.
    let original = ORIGINAL_PRESENT.lock().ok().and_then(|slot| *slot);

    match original {
        Some(original) => original(frame),
        // A replacement installed without a saved original cannot forward.
        // Returning a plausible value would hide the mistake.
        None => frame,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum HookError {
    /// The slot already holds this replacement.
    AlreadyInstalled,
    /// The slot holds something that is not this replacement, so restoring
    /// would discard whatever is there now.
    SlotChanged,
    /// Nothing was installed.
    NotInstalled,
}

fn is_same_function(left: PresentFn, right: PresentFn) -> bool {
    std::ptr::fn_addr_eq(left, right)
}

/// Saves the original and writes the replacement into the slot.
fn install(vtable: &mut Vtable) -> Result<(), HookError> {
    let current = vtable.slots[PRESENT_SLOT];

    // Installing twice would save our own replacement as "the original", and
    // the replacement would then forward to itself forever. The stack overflow
    // happens on the next frame, far from the second install.
    if is_same_function(current, hooked_present) {
        return Err(HookError::AlreadyInstalled);
    }

    *ORIGINAL_PRESENT.lock().expect("lock is not poisoned") = Some(current);
    vtable.slots[PRESENT_SLOT] = hooked_present;
    Ok(())
}

/// Puts the original pointer back, but only if the slot is still ours.
fn restore(vtable: &mut Vtable) -> Result<(), HookError> {
    let mut saved = ORIGINAL_PRESENT.lock().expect("lock is not poisoned");
    let Some(original) = *saved else {
        return Err(HookError::NotInstalled);
    };

    // Someone installed after us. Writing our saved pointer now would erase
    // their replacement and leave them forwarding to a function no longer in
    // the table.
    if !is_same_function(vtable.slots[PRESENT_SLOT], hooked_present) {
        return Err(HookError::SlotChanged);
    }

    vtable.slots[PRESENT_SLOT] = original;
    *saved = None;
    Ok(())
}

fn fresh_vtable() -> Vtable {
    reset_lab_state();
    Vtable {
        slots: [unused_slot, unused_slot, real_present, unused_slot],
    }
}

fn reset_lab_state() {
    *ORIGINAL_PRESENT.lock().expect("lock is not poisoned") = None;
    OBSERVED_FRAMES
        .lock()
        .expect("lock is not poisoned")
        .clear();
}

fn observed_frames() -> Vec<u32> {
    OBSERVED_FRAMES
        .lock()
        .expect("lock is not poisoned")
        .clone()
}

/// Calls through the table the way the game's render loop would.
fn present_through_vtable(vtable: &Vtable, frame: u32) -> u32 {
    (vtable.slots[PRESENT_SLOT])(frame)
}

fn main() {
    let mut vtable = fresh_vtable();

    println!("1. Before installing");
    println!("   present(10) -> {}", present_through_vtable(&vtable, 10));
    println!("   observed frames: {:?}", observed_frames());

    println!("\n2. After installing");
    install(&mut vtable).expect("a fresh table accepts one install");
    println!("   present(10) -> {}", present_through_vtable(&vtable, 10));
    println!("   present(11) -> {}", present_through_vtable(&vtable, 11));
    println!("   observed frames: {:?}", observed_frames());
    println!("   the return value is unchanged, so the game sees no difference");

    println!("\n3. Installing twice is refused");
    println!("   second install: {:?}", install(&mut vtable));
    println!("   without that guard the replacement would forward to itself");

    println!("\n4. Another tool installs after us");
    let ours = vtable.slots[PRESENT_SLOT];
    vtable.slots[PRESENT_SLOT] = unused_slot; // stands in for a second hook
    println!("   restore now: {:?}", restore(&mut vtable));
    vtable.slots[PRESENT_SLOT] = ours;

    println!("\n5. Restoring cleanly");
    println!("   restore: {:?}", restore(&mut vtable));
    println!("   present(10) -> {}", present_through_vtable(&vtable, 10));
    println!("   restore again: {:?}", restore(&mut vtable));
}

#[cfg(test)]
mod tests {
    use super::{
        HookError, PRESENT_SLOT, fresh_vtable, install, is_same_function, observed_frames,
        present_through_vtable, real_present, restore, unused_slot,
    };

    #[test]
    fn a_hook_forwards_without_changing_the_result() {
        let mut vtable = fresh_vtable();
        let before = present_through_vtable(&vtable, 10);

        install(&mut vtable).expect("fresh table");
        let after = present_through_vtable(&vtable, 10);

        assert_eq!(before, after, "the game must observe the same behavior");
        assert_eq!(observed_frames(), vec![10]);
    }

    #[test]
    fn installing_twice_is_refused() {
        let mut vtable = fresh_vtable();
        install(&mut vtable).expect("fresh table");

        assert_eq!(install(&mut vtable), Err(HookError::AlreadyInstalled));

        // The saved original must still be the runtime's function, not ours.
        present_through_vtable(&vtable, 1);
        assert_eq!(observed_frames(), vec![1]);
    }

    #[test]
    fn restore_puts_the_exact_original_back() {
        let mut vtable = fresh_vtable();
        install(&mut vtable).expect("fresh table");
        restore(&mut vtable).expect("still ours");

        assert!(is_same_function(vtable.slots[PRESENT_SLOT], real_present));
        present_through_vtable(&vtable, 5);
        assert!(
            observed_frames().is_empty(),
            "a restored table must not reach the replacement"
        );
    }

    #[test]
    fn restore_refuses_to_clobber_a_later_hook() {
        let mut vtable = fresh_vtable();
        install(&mut vtable).expect("fresh table");

        vtable.slots[PRESENT_SLOT] = unused_slot; // a second tool installed
        assert_eq!(restore(&mut vtable), Err(HookError::SlotChanged));
        assert!(
            is_same_function(vtable.slots[PRESENT_SLOT], unused_slot),
            "the other tool's entry must survive"
        );
    }

    #[test]
    fn restoring_twice_reports_that_nothing_is_installed() {
        let mut vtable = fresh_vtable();
        install(&mut vtable).expect("fresh table");
        restore(&mut vtable).expect("still ours");

        assert_eq!(restore(&mut vtable), Err(HookError::NotInstalled));
    }
}
