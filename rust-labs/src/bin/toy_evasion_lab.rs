#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LabCommand {
    Observe,
    WriteMemory,
    ApplyPatch,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Effect {
    ReadOnly,
    ChangesState,
}

fn effect_of(command: LabCommand) -> Effect {
    match command {
        LabCommand::Observe => Effect::ReadOnly,
        LabCommand::WriteMemory | LabCommand::ApplyPatch => Effect::ChangesState,
    }
}

fn weak_name_based_policy(command: LabCommand) -> bool {
    // ❌ The policy recognizes one spelling instead of the shared effect.
    command != LabCommand::WriteMemory
}

fn effect_based_policy(command: LabCommand, writes_allowed: bool) -> bool {
    match effect_of(command) {
        Effect::ReadOnly => true,
        Effect::ChangesState => writes_allowed,
    }
}

#[derive(Debug)]
struct ToyTarget {
    build_id: u32,
    byte: u8,
}

fn weak_check_then_use(
    target: &mut ToyTarget,
    expected_build: u32,
    replacement: u8,
    between_check_and_use: impl FnOnce(&mut ToyTarget),
) -> Result<(), &'static str> {
    if target.build_id != expected_build {
        return Err("wrong build");
    }

    // 🧪 The lab hook simulates state changing after validation.
    between_check_and_use(target);
    target.byte = replacement;
    Ok(())
}

fn checked_at_the_sink(
    target: &mut ToyTarget,
    expected_build: u32,
    expected_byte: u8,
    replacement: u8,
) -> Result<(), &'static str> {
    // ✅ Validate every value immediately beside the side effect.
    if target.build_id != expected_build {
        return Err("wrong build");
    }
    if target.byte != expected_byte {
        return Err("state changed");
    }
    target.byte = replacement;
    Ok(())
}

#[derive(Debug, PartialEq, Eq)]
enum AuditResult {
    Allowed,
    Denied,
}

fn weak_audit(command: LabCommand, events: &mut Vec<String>) -> AuditResult {
    if !effect_based_policy(command, false) {
        // ❌ This early return creates a telemetry gap.
        return AuditResult::Denied;
    }
    events.push(format!("allowed {command:?}"));
    AuditResult::Allowed
}

fn complete_audit(command: LabCommand, events: &mut Vec<String>) -> AuditResult {
    let result = if effect_based_policy(command, false) {
        AuditResult::Allowed
    } else {
        AuditResult::Denied
    };
    // ✅ Record the decision regardless of which branch it took.
    events.push(format!("{result:?} {command:?}"));
    result
}

fn main() {
    println!("1. Coverage-gap lab");
    println!(
        "weak policy accepts ApplyPatch: {}",
        weak_name_based_policy(LabCommand::ApplyPatch)
    );
    println!(
        "effect policy accepts ApplyPatch in read-only mode: {}",
        effect_based_policy(LabCommand::ApplyPatch, false)
    );
    println!(
        "effect policy accepts Observe in read-only mode: {}",
        effect_based_policy(LabCommand::Observe, false)
    );

    println!("\n2. Check/use timing lab");
    let mut target = ToyTarget {
        build_id: 7,
        byte: 0x90,
    };
    let weak_result = weak_check_then_use(&mut target, 7, 0xcc, |target| {
        target.build_id = 8; // 🔁 Simulate replacement after the check.
    });
    println!("weak result: {weak_result:?}, target: {target:?}");

    let mut target = ToyTarget {
        build_id: 7,
        byte: 0x90,
    };
    target.byte = 0x91; // Simulate state changing before the sink check.
    let strong_result = checked_at_the_sink(&mut target, 7, 0x90, 0xcc);
    println!("strong result: {strong_result:?}, target: {target:?}");

    println!("\n3. Telemetry-gap lab");
    let mut weak_events = Vec::new();
    let _ = weak_audit(LabCommand::WriteMemory, &mut weak_events);
    println!("weak events: {weak_events:?}");

    let mut complete_events = Vec::new();
    let _ = complete_audit(LabCommand::WriteMemory, &mut complete_events);
    println!("complete events: {complete_events:?}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn effect_policy_covers_every_state_changing_command() {
        for command in [LabCommand::WriteMemory, LabCommand::ApplyPatch] {
            assert_eq!(effect_of(command), Effect::ChangesState);
            assert!(!effect_based_policy(command, false));
        }
    }

    #[test]
    fn sink_check_rejects_changed_state() {
        let mut target = ToyTarget {
            build_id: 7,
            byte: 0x91,
        };
        assert_eq!(
            checked_at_the_sink(&mut target, 7, 0x90, 0xcc),
            Err("state changed")
        );
        assert_eq!(target.byte, 0x91);
    }

    #[test]
    fn denied_decisions_are_logged() {
        let mut events = Vec::new();
        assert_eq!(
            complete_audit(LabCommand::WriteMemory, &mut events),
            AuditResult::Denied
        );
        assert_eq!(events, ["Denied WriteMemory"]);
    }
}
