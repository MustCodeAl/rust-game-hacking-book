#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;

    // These three values belong to Wesnoth 1.14.9, 32-bit Windows.
    const PLAYER_ROOT: usize = 0x017E_ED18;
    const GAME_OFFSET: usize = 0x0A90;
    const GOLD_OFFSET: usize = 0x0004;

    let amount = std::env::args()
        .nth(1)
        .map(|text| text.parse::<u32>())
        .transpose()
        .context("usage: wesnoth_gold [new_amount]")?
        .unwrap_or(999);

    let process = Process::open_by_name("wesnoth.exe", true)?;
    anyhow::ensure!(process.is_32_bit()?, "this profile requires 32-bit Wesnoth");

    // First bracket: read the player pointer stored at the fixed root.
    let player = process.read_u32(PLAYER_ROOT)? as usize;
    anyhow::ensure!(player != 0, "start a local match before running the tool");

    // Second bracket: add 0xA90, then read the current side pointer.
    let side_pointer_address = player
        .checked_add(GAME_OFFSET)
        .context("player + game offset overflowed")?;
    let side = process.read_u32(side_pointer_address)? as usize;
    anyhow::ensure!(side != 0, "the current side pointer is null");

    // The gold number lives four bytes into the side record.
    let gold_address = side
        .checked_add(GOLD_OFFSET)
        .context("side + gold offset overflowed")?;
    let old_gold = process.read_u32(gold_address)?;

    // Guard the write: stop if the value changed between our read and write.
    let check = process.read_u32(gold_address)?;
    anyhow::ensure!(
        check == old_gold,
        "gold changed before the write; try again"
    );
    process.write_u32(gold_address, amount)?;

    println!("Wesnoth gold: {old_gold} -> {amount} at {gold_address:#010x}");
    println!("Recruit a unit or end the turn to refresh the on-screen number.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("Build this lab on Windows with the i686-pc-windows-msvc target.");
}
