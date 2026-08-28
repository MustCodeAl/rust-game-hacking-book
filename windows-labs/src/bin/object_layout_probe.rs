#[cfg(windows)]
mod windows_app {
    use std::num::NonZeroUsize;

    use anyhow::{Context, Result, ensure};
    use gha_windows_labs::Process;

    // This profile is intentionally pinned to the authorized AssaultCube 1.2.0.2 lab build.
    const PROCESS_NAME: &str = "ac_client.exe";
    const LOCAL_PLAYER_ROOT: usize = 0x0050_9B74;
    const ENTITY_LIST_ROOT: usize = 0x0050_F4F8;
    const PLAYER_COUNT: usize = 0x0050_F500;
    const MAX_PLAYERS: usize = 32;

    #[derive(Clone, Copy, Debug)]
    struct ObjectAddress(NonZeroUsize);

    #[derive(Clone, Copy, Debug)]
    struct FieldOffset(usize);

    impl ObjectAddress {
        fn new(value: usize, label: &str) -> Result<Self> {
            let value = NonZeroUsize::new(value)
                .with_context(|| format!("{label} is null; start a local bot match first"))?;
            Ok(Self(value))
        }

        fn get(self) -> usize {
            self.0.get()
        }

        fn field(self, offset: FieldOffset) -> Result<usize> {
            self.get()
                .checked_add(offset.0)
                .context("object base + field offset overflowed")
        }
    }

    // These constants are our recovered layout. Keeping them together makes the
    // evidence easy to review and replace when a different game build moves fields.
    struct PlayerLayout;

    impl PlayerLayout {
        const X: FieldOffset = FieldOffset(0x04);
        const Y: FieldOffset = FieldOffset(0x08);
        const Z: FieldOffset = FieldOffset(0x0C);
        const YAW: FieldOffset = FieldOffset(0x40);
        const PITCH: FieldOffset = FieldOffset(0x44);
        const NAME: FieldOffset = FieldOffset(0x225);
        const DEAD: FieldOffset = FieldOffset(0x338);
    }

    #[derive(Debug)]
    struct PlayerSnapshot {
        address: ObjectAddress,
        name: String,
        position: [f32; 3],
        yaw: f32,
        pitch: f32,
        dead: bool,
    }

    fn read_name(process: &Process, player: ObjectAddress) -> Result<String> {
        // Read a bounded buffer. A damaged or missing terminator cannot make us
        // wander through the rest of the target process. 🔒
        let bytes = process.read_bytes(player.field(PlayerLayout::NAME)?, 32)?;
        let end = bytes
            .iter()
            .position(|byte| *byte == 0)
            .unwrap_or(bytes.len());
        Ok(String::from_utf8_lossy(&bytes[..end]).into_owned())
    }

    fn read_player(process: &Process, player: ObjectAddress) -> Result<PlayerSnapshot> {
        // Each call copies one field across the process boundary. We do not turn a
        // remote numeric address into a fake local Rust reference. ✅
        let position = [
            process.read_f32(player.field(PlayerLayout::X)?)?,
            process.read_f32(player.field(PlayerLayout::Y)?)?,
            process.read_f32(player.field(PlayerLayout::Z)?)?,
        ];
        let yaw = process.read_f32(player.field(PlayerLayout::YAW)?)?;
        let pitch = process.read_f32(player.field(PlayerLayout::PITCH)?)?;
        let dead_raw = process.read_u32(player.field(PlayerLayout::DEAD)?)?;

        ensure!(
            position
                .iter()
                .all(|value| value.is_finite() && value.abs() < 100_000.0),
            "implausible coordinates at {:#010x}",
            player.get()
        );
        ensure!(
            yaw.is_finite() && pitch.is_finite(),
            "non-finite view angles"
        );
        ensure!(dead_raw <= 1, "unexpected dead flag {dead_raw}");

        Ok(PlayerSnapshot {
            address: player,
            name: read_name(process, player)?,
            position,
            yaw,
            pitch,
            dead: dead_raw != 0,
        })
    }

    fn pointer_at(process: &Process, address: usize, label: &str) -> Result<ObjectAddress> {
        let value = process.read_u32(address)? as usize;
        ObjectAddress::new(value, label)
    }

    fn print_player(label: &str, player: &PlayerSnapshot) {
        println!(
            "{label:<10} {:#010x} name={:?} pos=({:.2}, {:.2}, {:.2}) yaw={:.2} pitch={:.2} dead={}",
            player.address.get(),
            player.name,
            player.position[0],
            player.position[1],
            player.position[2],
            player.yaw,
            player.pitch,
            player.dead
        );
    }

    pub fn run() -> Result<()> {
        // `false` requests query + read access only. This lesson observes layout;
        // it never changes the game. 👀
        let process = Process::open_by_name(PROCESS_NAME, false)?;
        ensure!(
            process.is_32_bit()?,
            "this profile requires 32-bit AssaultCube 1.2.0.2"
        );

        let local = pointer_at(&process, LOCAL_PLAYER_ROOT, "local player pointer")?;
        print_player("local", &read_player(&process, local)?);

        let entity_list = pointer_at(&process, ENTITY_LIST_ROOT, "entity list pointer")?;
        let count = process.read_u32(PLAYER_COUNT)? as usize;
        ensure!(
            count <= MAX_PLAYERS,
            "untrusted player count {count} is too large"
        );

        for index in 0..count {
            let slot = entity_list
                .get()
                .checked_add(index.checked_mul(4).context("entity slot overflowed")?)
                .context("entity list address overflowed")?;
            let address = process.read_u32(slot)? as usize;
            if address == 0 || address == local.get() {
                continue;
            }

            let entity = ObjectAddress::new(address, "entity pointer")?;
            match read_player(&process, entity) {
                Ok(player) => print_player(&format!("entity[{index}]"), &player),
                Err(error) => eprintln!("entity[{index}] {address:#010x}: {error:#}"),
            }
        }

        Ok(())
    }
}

#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    windows_app::run()
}

#[cfg(not(windows))]
fn main() {
    eprintln!("Build this read-only lab on Windows with the i686-pc-windows-msvc target.");
}
