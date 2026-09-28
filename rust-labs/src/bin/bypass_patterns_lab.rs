//! Eight more bypass patterns, each reproduced against a deliberately weak
//! toy control and then repaired.
//!
//! Nothing here touches another process, the filesystem, the network, or any
//! security product. Every "attacker" is an ordinary test call into an
//! intentionally bad policy. That keeps the computer-science shape of each
//! bypass visible while keeping the code useless as a recipe aimed at anyone
//! else's machine.
//!
//! Run it with:
//!
//! ```text
//! cargo run --bin bypass_patterns_lab
//! cargo test --bin bypass_patterns_lab
//! ```

/// Why a request was allowed or refused.
///
/// A control that answers only `true` or `false` is hard to test and hard to
/// debug. Naming the reason turns every decision into evidence.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Reason {
    Allowed,
    OutOfBounds,
    EscapesRoot,
    VerificationUnavailable,
    HashMismatch,
    WritesDisabled,
    StaleGeneration,
    BudgetExhausted,
    ItemInvalid,
}

/// One decision, recorded whether it allowed or denied the work.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Decision {
    allowed: bool,
    reason: Reason,
}

impl Decision {
    const fn allow() -> Self {
        Self {
            allowed: true,
            reason: Reason::Allowed,
        }
    }

    const fn deny(reason: Reason) -> Self {
        Self {
            allowed: false,
            reason,
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 4: an arithmetic wrap inside the bound check
// ---------------------------------------------------------------------------

mod wrapping_bound {
    //! Promise: "a read never leaves the mapped region."
    //!
    //! Unchecked assumption: that `offset + length` is the true end of the
    //! read. On a 64-bit machine that sum can wrap past zero and land back
    //! inside the allowed range.

    /// `offset + length` is exactly what a release build computes here.
    /// `wrapping_add` spells the wrap out so the lab behaves identically in
    /// debug and release builds.
    pub const fn weak_in_bounds(offset: usize, length: usize, region_size: usize) -> bool {
        offset.wrapping_add(length) <= region_size
    }

    /// A sum that cannot be represented is not "small"; it is unanswerable.
    pub const fn checked_in_bounds(offset: usize, length: usize, region_size: usize) -> bool {
        match offset.checked_add(length) {
            Some(end) => end <= region_size,
            None => false,
        }
    }

    /// Better still: ask the slice, which cannot be talked out of its own
    /// length. `get` returns `None` for every range the slice does not own.
    pub fn read_region(region: &[u8], offset: usize, length: usize) -> Option<&[u8]> {
        let end = offset.checked_add(length)?;
        region.get(offset..end)
    }
}

// ---------------------------------------------------------------------------
// Pattern 5: a prefix compared before the path is resolved
// ---------------------------------------------------------------------------

mod canonicalization {
    //! Promise: "a mod can only open files under `assets/`."
    //!
    //! Unchecked assumption: that a string starting with `assets/` names a
    //! location under `assets/`. The `..` is resolved later, by something
    //! else, long after the check has passed.

    use super::{Decision, Reason};

    /// The check reads the text the caller supplied, not the place it means.
    pub fn weak_inside_assets(request: &str) -> bool {
        request.starts_with("assets/")
    }

    /// Resolves `.` and `..` without touching a real filesystem.
    ///
    /// Returns `None` when the path climbs above its own root, which is the
    /// answer a caller actually needs. An absolute path is refused because the
    /// root it would escape to is not this program's to choose.
    pub fn resolve(request: &str) -> Option<Vec<&str>> {
        if request.starts_with('/') || request.starts_with('\\') {
            return None;
        }

        let mut resolved: Vec<&str> = Vec::new();
        for segment in request.split(['/', '\\']) {
            match segment {
                "" | "." => {}
                ".." => {
                    // Popping an empty stack means the path left the root.
                    resolved.pop()?;
                }
                name => resolved.push(name),
            }
        }
        Some(resolved)
    }

    /// Resolve first, then compare the resolved location with the root.
    pub fn resolved_inside_assets(request: &str) -> bool {
        resolve(request).is_some_and(|segments| segments.first() == Some(&"assets"))
    }

    /// The same rule as a recorded decision, so a refusal can be explained.
    pub fn open_under_assets(request: &str) -> Decision {
        if resolved_inside_assets(request) {
            Decision::allow()
        } else {
            Decision::deny(Reason::EscapesRoot)
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 6: an error treated as permission
// ---------------------------------------------------------------------------

mod fail_open {
    //! Promise: "an asset is loaded only when its hash matches the manifest."
    //!
    //! Unchecked assumption: that verification always produces an answer. When
    //! the manifest cannot be read there is no answer, and "no answer" is not
    //! the same as "yes."

    use super::{Decision, Reason};

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub enum VerifyError {
        ManifestUnreadable,
    }

    /// Looks up the expected hash and compares it. The error case models a
    /// manifest that is missing, truncated, or locked by another program.
    pub fn verify(
        asset: &str,
        actual_hash: u32,
        manifest: Option<u32>,
    ) -> Result<bool, VerifyError> {
        let _ = asset;
        let expected = manifest.ok_or(VerifyError::ManifestUnreadable)?;
        Ok(expected == actual_hash)
    }

    /// `unwrap_or(true)` turns every verification outage into a permission
    /// slip. Deleting the manifest is now easier than forging it.
    pub fn weak_gate(asset: &str, actual_hash: u32, manifest: Option<u32>) -> bool {
        verify(asset, actual_hash, manifest).unwrap_or(true)
    }

    /// Fail closed, and say which of the two failures happened. A load that
    /// stops because the manifest is unreadable needs a different fix from a
    /// load that stops because the bytes changed.
    pub fn strong_gate(asset: &str, actual_hash: u32, manifest: Option<u32>) -> Decision {
        match verify(asset, actual_hash, manifest) {
            Ok(true) => Decision::allow(),
            Ok(false) => Decision::deny(Reason::HashMismatch),
            Err(VerifyError::ManifestUnreadable) => Decision::deny(Reason::VerificationUnavailable),
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 7: a second route to the same effect
// ---------------------------------------------------------------------------

mod second_route {
    //! Promise: "no byte changes while writes are disabled."
    //!
    //! Unchecked assumption: that every caller arrives through the guarded
    //! function. The batch helper was added later and calls the writer
    //! directly.

    use super::{Decision, Reason};

    #[derive(Debug, Default)]
    pub struct Patcher {
        pub writes_allowed: bool,
        pub bytes: Vec<(usize, u8)>,
        pub decisions: Vec<Decision>,
    }

    impl Patcher {
        pub fn new(writes_allowed: bool) -> Self {
            Self {
                writes_allowed,
                bytes: Vec::new(),
                decisions: Vec::new(),
            }
        }

        /// The private writer. Nothing about it enforces the policy; it only
        /// performs the effect.
        fn write(&mut self, address: usize, value: u8) {
            self.bytes.push((address, value));
        }

        /// The guarded entry point everyone remembers.
        pub fn apply_patch(&mut self, address: usize, value: u8) -> Decision {
            let decision = if self.writes_allowed {
                Decision::allow()
            } else {
                Decision::deny(Reason::WritesDisabled)
            };
            self.decisions.push(decision);
            if decision.allowed {
                self.write(address, value);
            }
            decision
        }

        /// The convenience helper added in a later refactor. It reaches the
        /// same effect without asking the same question.
        pub fn weak_apply_batch(&mut self, patches: &[(usize, u8)]) {
            for &(address, value) in patches {
                self.write(address, value);
            }
        }

        /// Route the batch through the one guarded entry point. The guard is
        /// now impossible to forget, because there is only one way in.
        pub fn strong_apply_batch(&mut self, patches: &[(usize, u8)]) -> Vec<Decision> {
            patches
                .iter()
                .map(|&(address, value)| self.apply_patch(address, value))
                .collect()
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 8: a valid command accepted twice
// ---------------------------------------------------------------------------

mod replay {
    //! Promise: "each award is applied once."
    //!
    //! Unchecked assumption: that a command which was valid is still new. A
    //! correct integrity tag proves the bytes were not edited. It says nothing
    //! about whether they were already used.

    use super::{Decision, Reason};

    #[derive(Clone, Copy, Debug)]
    pub struct AwardCommand {
        pub generation: u32,
        pub amount: u32,
    }

    #[derive(Debug)]
    pub struct Ledger {
        pub balance: u32,
        pub last_generation: u32,
    }

    impl Ledger {
        pub const fn new() -> Self {
            Self {
                balance: 0,
                last_generation: 0,
            }
        }

        /// The tag is verified, the amount is bounded — and the same message
        /// pays out every time it is submitted.
        pub const fn weak_award(&mut self, command: AwardCommand) -> Decision {
            self.balance = self.balance.saturating_add(command.amount);
            Decision::allow()
        }

        /// Bind each command to a position in a sequence, and refuse any
        /// position at or behind the last one applied.
        pub const fn strong_award(&mut self, command: AwardCommand) -> Decision {
            if command.generation <= self.last_generation {
                return Decision::deny(Reason::StaleGeneration);
            }
            self.last_generation = command.generation;
            self.balance = self.balance.saturating_add(command.amount);
            Decision::allow()
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 9: a decision cached past the state it described
// ---------------------------------------------------------------------------

mod cached_capability {
    //! Promise: "turning writes off stops the tool from writing."
    //!
    //! Unchecked assumption: that a decision made at start-up still describes
    //! the settings in force at the moment of the effect. This is a cousin of
    //! the check/use gap: nothing raced, the answer simply outlived its input.

    use super::{Decision, Reason};

    #[derive(Debug)]
    pub struct Tool {
        pub writes_allowed: bool,
        cached_allowed: Option<bool>,
        pub writes_performed: u32,
    }

    impl Tool {
        pub const fn new(writes_allowed: bool) -> Self {
            Self {
                writes_allowed,
                cached_allowed: None,
                writes_performed: 0,
            }
        }

        /// The first answer is stored and reused for the rest of the run.
        pub fn weak_write(&mut self) -> Decision {
            let allowed = *self.cached_allowed.get_or_insert(self.writes_allowed);
            if allowed {
                self.writes_performed += 1;
                Decision::allow()
            } else {
                Decision::deny(Reason::WritesDisabled)
            }
        }

        /// Re-read the setting where the write happens. A cache is only safe
        /// when something invalidates it, and nothing here does.
        pub const fn strong_write(&mut self) -> Decision {
            if self.writes_allowed {
                self.writes_performed += 1;
                Decision::allow()
            } else {
                Decision::deny(Reason::WritesDisabled)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 10: a per-tick tolerance that accumulates
// ---------------------------------------------------------------------------

mod tolerance_drift {
    //! Promise: "a player cannot move faster than the movement rule allows."
    //!
    //! Unchecked assumption: that a tolerance small enough to be invisible in
    //! one tick is small enough to be harmless over a match. Distances are in
    //! centimetres so the arithmetic stays exact and the test is repeatable.

    use super::{Decision, Reason};

    /// The largest legitimate step, in centimetres per tick.
    pub const MAX_STEP_CM: i64 = 400;
    /// Slack added to absorb network jitter and rounding.
    pub const TOLERANCE_CM: i64 = 5;
    /// How much total excess a player may accumulate before the window closes.
    pub const WINDOW_BUDGET_CM: i64 = 60;

    /// Every tick is judged on its own, so the answer is always "close
    /// enough" and the excess is never counted.
    pub const fn weak_step_allowed(step_cm: i64) -> bool {
        step_cm <= MAX_STEP_CM + TOLERANCE_CM
    }

    /// Runs `ticks` steps of exactly `step_cm` and returns the extra distance
    /// the weak rule permitted.
    pub const fn weak_excess_after(step_cm: i64, ticks: i64) -> i64 {
        if weak_step_allowed(step_cm) {
            (step_cm - MAX_STEP_CM) * ticks
        } else {
            0
        }
    }

    /// Keep the per-tick tolerance, but spend it from a budget. Jitter that
    /// averages out costs nothing; a steady lean in one direction runs out.
    #[derive(Debug, Default)]
    pub struct MovementWindow {
        spent_cm: i64,
    }

    impl MovementWindow {
        pub const fn new() -> Self {
            Self { spent_cm: 0 }
        }

        pub const fn spent_cm(&self) -> i64 {
            self.spent_cm
        }

        pub const fn step(&mut self, step_cm: i64) -> Decision {
            if step_cm > MAX_STEP_CM + TOLERANCE_CM {
                return Decision::deny(Reason::OutOfBounds);
            }

            let excess = if step_cm > MAX_STEP_CM {
                step_cm - MAX_STEP_CM
            } else {
                0
            };
            if self.spent_cm + excess > WINDOW_BUDGET_CM {
                return Decision::deny(Reason::BudgetExhausted);
            }

            self.spent_cm += excess;
            Decision::allow()
        }

        /// Called when the measurement window rolls over.
        pub const fn reset(&mut self) {
            self.spent_cm = 0;
        }
    }
}

// ---------------------------------------------------------------------------
// Pattern 11: a batch that fails halfway and keeps what it already did
// ---------------------------------------------------------------------------

mod partial_batch {
    //! Promise: "a rejected mod list changes nothing."
    //!
    //! Unchecked assumption: that refusing an item is the same as refusing the
    //! request. Validating and applying in the same pass means an item can be
    //! rejected only after its predecessors are already live.

    use super::{Decision, Reason};

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    pub struct Change {
        pub slot: usize,
        pub value: u8,
    }

    pub const SLOT_COUNT: usize = 4;

    const fn item_is_valid(change: Change) -> bool {
        change.slot < SLOT_COUNT && change.value != 0
    }

    /// Validate-then-apply, one item at a time. The refusal is honest and the
    /// state is still wrong.
    pub fn weak_apply(slots: &mut [u8; SLOT_COUNT], changes: &[Change]) -> Decision {
        for &change in changes {
            if !item_is_valid(change) {
                return Decision::deny(Reason::ItemInvalid);
            }
            slots[change.slot] = change.value;
        }
        Decision::allow()
    }

    /// Two phases. Nothing is written until every item has been accepted, so a
    /// denial really does leave the state alone.
    pub fn strong_apply(slots: &mut [u8; SLOT_COUNT], changes: &[Change]) -> Decision {
        if !changes.iter().copied().all(item_is_valid) {
            return Decision::deny(Reason::ItemInvalid);
        }

        for &change in changes {
            slots[change.slot] = change.value;
        }
        Decision::allow()
    }
}

// ---------------------------------------------------------------------------
// Demonstration
// ---------------------------------------------------------------------------

fn demo_wrapping_bound() {
    println!("4. Wrapping bound check");
    let offset = usize::MAX - 3;
    println!(
        "   weak says a 16-byte read at usize::MAX-3 fits in 4096 bytes: {}",
        wrapping_bound::weak_in_bounds(offset, 16, 4096)
    );
    println!(
        "   checked version: {}",
        wrapping_bound::checked_in_bounds(offset, 16, 4096)
    );
    let region = [1_u8, 2, 3, 4];
    println!(
        "   slice access returns {:?} for the same wrapped range",
        wrapping_bound::read_region(&region, offset, 16)
    );
}

fn demo_canonicalization() {
    println!("\n5. Prefix check before path resolution");
    let request = "assets/../saves/profile.dat";
    println!(
        "   weak allows {request:?}: {}",
        canonicalization::weak_inside_assets(request)
    );
    println!(
        "   resolved decision: {:?}",
        canonicalization::open_under_assets(request)
    );
    println!(
        "   an ordinary path still works: {:?}",
        canonicalization::open_under_assets("assets/textures/hud.png")
    );
}

fn demo_fail_open() {
    println!("\n6. Verification error treated as permission");
    println!(
        "   weak gate with an unreadable manifest: {}",
        fail_open::weak_gate("hud.png", 0xdead_beef, None)
    );
    println!(
        "   strong gate: {:?}",
        fail_open::strong_gate("hud.png", 0xdead_beef, None)
    );
}

fn demo_second_route() {
    println!("\n7. A second route to the same effect");
    let mut patcher = second_route::Patcher::new(false);
    patcher.weak_apply_batch(&[(0x1000, 0x90), (0x1001, 0x90)]);
    println!(
        "   writes disabled, yet bytes changed: {}, decisions recorded: {}",
        patcher.bytes.len(),
        patcher.decisions.len()
    );
    let mut patcher = second_route::Patcher::new(false);
    let decisions = patcher.strong_apply_batch(&[(0x1000, 0x90), (0x1001, 0x90)]);
    println!(
        "   guarded batch changed {} bytes and recorded {} decisions",
        patcher.bytes.len(),
        decisions.len()
    );
}

fn demo_replay() {
    println!("\n8. Replay of a valid command");
    let command = replay::AwardCommand {
        generation: 1,
        amount: 50,
    };
    let mut ledger = replay::Ledger::new();
    for _ in 0..4 {
        let _ = ledger.weak_award(command);
    }
    println!("   weak balance after four submissions: {}", ledger.balance);
    let mut ledger = replay::Ledger::new();
    for _ in 0..4 {
        let _ = ledger.strong_award(command);
    }
    println!("   strong balance: {}", ledger.balance);
}

fn demo_cached_capability() {
    println!("\n9. A decision cached past its input");
    let mut tool = cached_capability::Tool::new(true);
    let _ = tool.weak_write();
    tool.writes_allowed = false;
    let _ = tool.weak_write();
    println!(
        "   writes after the setting was turned off: {}",
        tool.writes_performed
    );
    let mut tool = cached_capability::Tool::new(true);
    let _ = tool.strong_write();
    tool.writes_allowed = false;
    let second = tool.strong_write();
    println!(
        "   re-checked version: {} writes, second attempt {second:?}",
        tool.writes_performed
    );
}

fn demo_tolerance_drift() {
    println!("\n10. A tolerance that accumulates");
    let step = tolerance_drift::MAX_STEP_CM + tolerance_drift::TOLERANCE_CM;
    println!(
        "   weak rule allows every tick; after 600 ticks the player gained {} cm",
        tolerance_drift::weak_excess_after(step, 600)
    );
    let mut window = tolerance_drift::MovementWindow::new();
    let mut allowed_ticks = 0;
    for _ in 0..600 {
        if window.step(step).allowed {
            allowed_ticks += 1;
        }
    }
    println!(
        "   budgeted rule allowed {allowed_ticks} of 600 ticks and spent {} cm",
        window.spent_cm()
    );
    window.reset();
    println!(
        "   after the window rolls over the budget is {} cm again",
        window.spent_cm()
    );
}

fn demo_partial_batch() {
    println!("\n11. A batch that stops halfway");
    let changes = [
        partial_batch::Change { slot: 0, value: 7 },
        partial_batch::Change { slot: 9, value: 3 },
    ];
    let mut slots = [0_u8; partial_batch::SLOT_COUNT];
    let decision = partial_batch::weak_apply(&mut slots, &changes);
    println!("   weak decision {decision:?} left slots {slots:?}");
    let mut slots = [0_u8; partial_batch::SLOT_COUNT];
    let decision = partial_batch::strong_apply(&mut slots, &changes);
    println!("   two-phase decision {decision:?} left slots {slots:?}");
}

fn main() {
    demo_wrapping_bound();
    demo_canonicalization();
    demo_fail_open();
    demo_second_route();
    demo_replay();
    demo_cached_capability();
    demo_tolerance_drift();
    demo_partial_batch();
}

#[cfg(test)]
mod tests {
    use super::{
        Reason, cached_capability, canonicalization, fail_open, partial_batch, replay,
        second_route, tolerance_drift, wrapping_bound,
    };

    // -- Pattern 4 ----------------------------------------------------------

    #[test]
    fn wrapped_sum_slips_through_the_weak_bound_check() {
        let offset = usize::MAX - 3;
        assert!(wrapping_bound::weak_in_bounds(offset, 16, 4096));
        assert!(!wrapping_bound::checked_in_bounds(offset, 16, 4096));
    }

    #[test]
    fn checked_bound_still_accepts_ordinary_reads() {
        assert!(wrapping_bound::checked_in_bounds(0, 4096, 4096));
        assert!(!wrapping_bound::checked_in_bounds(1, 4096, 4096));
    }

    #[test]
    fn slice_access_refuses_the_same_wrapped_range() {
        let region = [1_u8, 2, 3, 4];
        assert_eq!(
            wrapping_bound::read_region(&region, 1, 2),
            Some(&region[1..3])
        );
        assert_eq!(
            wrapping_bound::read_region(&region, usize::MAX - 3, 16),
            None
        );
    }

    // -- Pattern 5 ----------------------------------------------------------

    #[test]
    fn prefix_check_accepts_a_path_that_leaves_the_root() {
        let request = "assets/../saves/profile.dat";
        assert!(canonicalization::weak_inside_assets(request));
        assert!(!canonicalization::resolved_inside_assets(request));
    }

    #[test]
    fn resolution_refuses_paths_that_climb_above_the_root() {
        assert_eq!(canonicalization::resolve("../secret"), None);
        assert_eq!(canonicalization::resolve("/etc/passwd"), None);
        assert_eq!(canonicalization::resolve("assets\\..\\..\\secret"), None);
    }

    #[test]
    fn resolution_keeps_ordinary_paths_working() {
        assert_eq!(
            canonicalization::resolve("assets/./textures/hud.png"),
            Some(vec!["assets", "textures", "hud.png"])
        );
        assert!(canonicalization::resolved_inside_assets(
            "assets/textures/../hud.png"
        ));
    }

    // -- Pattern 6 ----------------------------------------------------------

    #[test]
    fn an_unreadable_manifest_must_not_grant_permission() {
        assert!(fail_open::weak_gate("hud.png", 1, None));

        let decision = fail_open::strong_gate("hud.png", 1, None);
        assert!(!decision.allowed);
        assert_eq!(decision.reason, Reason::VerificationUnavailable);
    }

    #[test]
    fn a_changed_asset_and_an_outage_report_different_reasons() {
        assert_eq!(
            fail_open::strong_gate("hud.png", 1, Some(2)).reason,
            Reason::HashMismatch
        );
        assert!(fail_open::strong_gate("hud.png", 1, Some(1)).allowed);
    }

    // -- Pattern 7 ----------------------------------------------------------

    #[test]
    fn the_batch_helper_reaches_the_effect_without_the_guard() {
        let mut patcher = second_route::Patcher::new(false);
        patcher.weak_apply_batch(&[(0x1000, 0x90)]);
        assert_eq!(patcher.bytes.len(), 1);
        assert!(patcher.decisions.is_empty());
    }

    #[test]
    fn every_route_through_the_guard_denies_and_records() {
        let mut patcher = second_route::Patcher::new(false);
        let decisions = patcher.strong_apply_batch(&[(0x1000, 0x90), (0x1001, 0x90)]);
        assert!(patcher.bytes.is_empty());
        assert_eq!(decisions.len(), 2);
        assert!(decisions.iter().all(|decision| !decision.allowed));
        assert_eq!(patcher.decisions.len(), 2);
    }

    // -- Pattern 8 ----------------------------------------------------------

    #[test]
    fn one_valid_command_pays_out_repeatedly() {
        let command = replay::AwardCommand {
            generation: 1,
            amount: 50,
        };

        let mut ledger = replay::Ledger::new();
        for _ in 0..4 {
            assert!(ledger.weak_award(command).allowed);
        }
        assert_eq!(ledger.balance, 200);
    }

    #[test]
    fn a_generation_counter_accepts_each_command_once() {
        let command = replay::AwardCommand {
            generation: 1,
            amount: 50,
        };

        let mut ledger = replay::Ledger::new();
        assert!(ledger.strong_award(command).allowed);
        let repeat = ledger.strong_award(command);
        assert!(!repeat.allowed);
        assert_eq!(repeat.reason, Reason::StaleGeneration);
        assert_eq!(ledger.balance, 50);

        assert!(
            ledger
                .strong_award(replay::AwardCommand {
                    generation: 2,
                    amount: 25,
                })
                .allowed
        );
        assert_eq!(ledger.balance, 75);
    }

    // -- Pattern 9 ----------------------------------------------------------

    #[test]
    fn a_cached_decision_outlives_the_setting_it_described() {
        let mut tool = cached_capability::Tool::new(true);
        assert!(tool.weak_write().allowed);
        tool.writes_allowed = false;
        assert!(tool.weak_write().allowed);
        assert_eq!(tool.writes_performed, 2);
    }

    #[test]
    fn re_reading_the_setting_stops_the_second_write() {
        let mut tool = cached_capability::Tool::new(true);
        assert!(tool.strong_write().allowed);
        tool.writes_allowed = false;
        let denied = tool.strong_write();
        assert!(!denied.allowed);
        assert_eq!(denied.reason, Reason::WritesDisabled);
        assert_eq!(tool.writes_performed, 1);
    }

    // -- Pattern 10 ---------------------------------------------------------

    #[test]
    fn a_per_tick_tolerance_becomes_a_large_total() {
        let step = tolerance_drift::MAX_STEP_CM + tolerance_drift::TOLERANCE_CM;
        assert!(tolerance_drift::weak_step_allowed(step));
        assert_eq!(tolerance_drift::weak_excess_after(step, 600), 3_000);
    }

    #[test]
    fn a_budget_stops_a_steady_lean_but_absorbs_jitter() {
        let step = tolerance_drift::MAX_STEP_CM + tolerance_drift::TOLERANCE_CM;

        let mut window = tolerance_drift::MovementWindow::new();
        let allowed = (0..600).filter(|_| window.step(step).allowed).count();
        assert_eq!(allowed, 12);
        assert_eq!(window.spent_cm(), tolerance_drift::WINDOW_BUDGET_CM);

        let mut window = tolerance_drift::MovementWindow::new();
        for _ in 0..600 {
            assert!(window.step(tolerance_drift::MAX_STEP_CM - 20).allowed);
        }
        assert_eq!(window.spent_cm(), 0);
    }

    #[test]
    fn a_single_impossible_step_is_still_refused() {
        let mut window = tolerance_drift::MovementWindow::new();
        let decision = window.step(tolerance_drift::MAX_STEP_CM * 3);
        assert!(!decision.allowed);
        assert_eq!(decision.reason, Reason::OutOfBounds);
    }

    // -- Pattern 11 ---------------------------------------------------------

    #[test]
    fn a_refused_batch_can_still_leave_changes_behind() {
        let mut slots = [0_u8; partial_batch::SLOT_COUNT];
        let changes = [
            partial_batch::Change { slot: 0, value: 7 },
            partial_batch::Change { slot: 9, value: 3 },
        ];

        let decision = partial_batch::weak_apply(&mut slots, &changes);
        assert!(!decision.allowed);
        assert_eq!(slots, [7, 0, 0, 0]);
    }

    #[test]
    fn validating_the_whole_batch_first_leaves_state_untouched() {
        let mut slots = [0_u8; partial_batch::SLOT_COUNT];
        let changes = [
            partial_batch::Change { slot: 0, value: 7 },
            partial_batch::Change { slot: 9, value: 3 },
        ];

        let decision = partial_batch::strong_apply(&mut slots, &changes);
        assert!(!decision.allowed);
        assert_eq!(decision.reason, Reason::ItemInvalid);
        assert_eq!(slots, [0, 0, 0, 0]);
    }

    #[test]
    fn a_valid_batch_still_applies_completely() {
        let mut slots = [0_u8; partial_batch::SLOT_COUNT];
        let changes = [
            partial_batch::Change { slot: 0, value: 7 },
            partial_batch::Change { slot: 3, value: 3 },
        ];

        assert!(partial_batch::strong_apply(&mut slots, &changes).allowed);
        assert_eq!(slots, [7, 0, 0, 3]);
    }
}
