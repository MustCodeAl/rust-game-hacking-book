//! JTAG TAP controller lab for Lesson 14.4.
//!
//! Everything here is simulated. The four JTAG wires are function arguments
//! and return values, and the board is two chips wired into one scan chain:
//! chip A contains an Arm JTAG debug port, and chip B is a made-up sensor.
//! The lab models the 16-state TAP controller, each chip's 4-bit instruction
//! register, the 1-bit bypass register, and the 32-bit IDCODE register. It
//! then drives them the way a debugger does: reset the chain, read every
//! chip's ID, and count the chips by timing a single 1 through their bypass
//! registers.

use std::fmt;

/// Every chip on this board has a 4-bit instruction register.
const IR_LENGTH: usize = 4;

/// Capture-IR always loads `01` into the two lowest bits of an instruction
/// register. The other bits are the chip designer's choice; these chips
/// capture zeros there.
const IR_CAPTURE: u8 = 0b0001;

/// The standard fixes BYPASS as all ones: `1111` in a 4-bit register.
const BYPASS: u8 = 0b1111;

/// The 16 states of the TAP controller, named as in IEEE 1149.1.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TapState {
    TestLogicReset,
    RunTestIdle,
    SelectDrScan,
    CaptureDr,
    ShiftDr,
    Exit1Dr,
    PauseDr,
    Exit2Dr,
    UpdateDr,
    SelectIrScan,
    CaptureIr,
    ShiftIr,
    Exit1Ir,
    PauseIr,
    Exit2Ir,
    UpdateIr,
}

impl TapState {
    const ALL: [Self; 16] = [
        Self::TestLogicReset,
        Self::RunTestIdle,
        Self::SelectDrScan,
        Self::CaptureDr,
        Self::ShiftDr,
        Self::Exit1Dr,
        Self::PauseDr,
        Self::Exit2Dr,
        Self::UpdateDr,
        Self::SelectIrScan,
        Self::CaptureIr,
        Self::ShiftIr,
        Self::Exit1Ir,
        Self::PauseIr,
        Self::Exit2Ir,
        Self::UpdateIr,
    ];

    /// The state after one rising edge of TCK, given the level of TMS.
    ///
    /// Each row gives the next state for TMS low, then for TMS high. Several
    /// rows share a pair, but one row per state keeps the table easy to
    /// check against the lesson's diagram.
    #[expect(
        clippy::match_same_arms,
        reason = "one row per state mirrors the state diagram"
    )]
    const fn next(self, tms: bool) -> Self {
        let (tms_low, tms_high) = match self {
            Self::TestLogicReset => (Self::RunTestIdle, Self::TestLogicReset),
            Self::RunTestIdle => (Self::RunTestIdle, Self::SelectDrScan),
            Self::SelectDrScan => (Self::CaptureDr, Self::SelectIrScan),
            Self::CaptureDr => (Self::ShiftDr, Self::Exit1Dr),
            Self::ShiftDr => (Self::ShiftDr, Self::Exit1Dr),
            Self::Exit1Dr => (Self::PauseDr, Self::UpdateDr),
            Self::PauseDr => (Self::PauseDr, Self::Exit2Dr),
            Self::Exit2Dr => (Self::ShiftDr, Self::UpdateDr),
            Self::UpdateDr => (Self::RunTestIdle, Self::SelectDrScan),
            Self::SelectIrScan => (Self::CaptureIr, Self::TestLogicReset),
            Self::CaptureIr => (Self::ShiftIr, Self::Exit1Ir),
            Self::ShiftIr => (Self::ShiftIr, Self::Exit1Ir),
            Self::Exit1Ir => (Self::PauseIr, Self::UpdateIr),
            Self::PauseIr => (Self::PauseIr, Self::Exit2Ir),
            Self::Exit2Ir => (Self::ShiftIr, Self::UpdateIr),
            Self::UpdateIr => (Self::RunTestIdle, Self::SelectDrScan),
        };
        if tms { tms_high } else { tms_low }
    }
}

impl fmt::Display for TapState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::TestLogicReset => "Test-Logic-Reset",
            Self::RunTestIdle => "Run-Test/Idle",
            Self::SelectDrScan => "Select-DR-Scan",
            Self::CaptureDr => "Capture-DR",
            Self::ShiftDr => "Shift-DR",
            Self::Exit1Dr => "Exit1-DR",
            Self::PauseDr => "Pause-DR",
            Self::Exit2Dr => "Exit2-DR",
            Self::UpdateDr => "Update-DR",
            Self::SelectIrScan => "Select-IR-Scan",
            Self::CaptureIr => "Capture-IR",
            Self::ShiftIr => "Shift-IR",
            Self::Exit1Ir => "Exit1-IR",
            Self::PauseIr => "Pause-IR",
            Self::Exit2Ir => "Exit2-IR",
            Self::UpdateIr => "Update-IR",
        })
    }
}

/// How many clocks with TMS high it takes to reach Test-Logic-Reset from
/// `start`. A walk that has not arrived after 16 clocks is going round a
/// loop that never visits it, so the search stops there.
fn clocks_to_reset(start: TapState) -> Option<u32> {
    let mut state = start;
    for clocks in 0..16 {
        if state == TapState::TestLogicReset {
            return Some(clocks);
        }
        state = state.next(true);
    }
    None
}

/// One chip's test logic, apart from its TAP controller, which the chain
/// keeps for all chips at once.
#[derive(Clone, Debug)]
struct Chip {
    name: &'static str,
    idcode: u32,
    /// Which instruction selects IDCODE is the chip designer's choice.
    idcode_instruction: u8,
    /// The instruction in force. Only Update-IR and reset change it.
    instruction: u8,
    /// The instruction register's shift stage.
    ir_shift: u8,
    /// The shift stage of the data register the instruction selects.
    dr_shift: u32,
}

impl Chip {
    /// A chip as it comes out of reset, with IDCODE selected.
    const fn new(name: &'static str, idcode: u32, idcode_instruction: u8) -> Self {
        Self {
            name,
            idcode,
            idcode_instruction,
            instruction: idcode_instruction,
            ir_shift: 0,
            dr_shift: 0,
        }
    }

    /// IDCODE selects the 32-bit ID register. BYPASS, and every instruction
    /// the chip does not define, select the 1-bit bypass register.
    const fn selects_idcode(&self) -> bool {
        self.instruction == self.idcode_instruction
    }

    fn capture_dr(&mut self) {
        // The bypass register always captures 0.
        self.dr_shift = if self.selects_idcode() {
            self.idcode
        } else {
            0
        };
    }

    /// Shifts one bit in from the TDI side and returns the bit that leaves on
    /// the TDO side: bit 0 leaves, every other bit moves down one place, and
    /// the new bit enters at the top.
    fn shift_dr(&mut self, bit_in: bool) -> bool {
        let top = if self.selects_idcode() { 31 } else { 0 };
        let bit_out = (self.dr_shift & 1) == 1;
        self.dr_shift = (self.dr_shift >> 1) | (u32::from(bit_in) << top);
        bit_out
    }

    fn capture_ir(&mut self) {
        self.ir_shift = IR_CAPTURE;
    }

    fn shift_ir(&mut self, bit_in: bool) -> bool {
        let bit_out = (self.ir_shift & 1) == 1;
        self.ir_shift = (self.ir_shift >> 1) | (u8::from(bit_in) << (IR_LENGTH - 1));
        bit_out
    }

    fn update_ir(&mut self) {
        self.instruction = self.ir_shift;
    }

    fn reset(&mut self) {
        self.instruction = self.idcode_instruction;
    }
}

/// Which set of registers a scan goes through.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Register {
    Instruction,
    Data,
}

/// A board's scan chain: TDI -> `chips[0]` -> `chips[1]` -> ... -> TDO.
///
/// Every chip sees the same TCK and TMS, so their TAP controllers move in
/// lockstep and one state describes them all.
struct Chain {
    state: TapState,
    chips: Vec<Chip>,
}

impl Chain {
    const fn new(chips: Vec<Chip>) -> Self {
        Self {
            state: TapState::TestLogicReset,
            chips,
        }
    }

    /// One cycle of TCK. On the rising edge the current state's action runs
    /// (capture or shift) and the controller moves on. Update and reset act
    /// on the falling edge, in the state just entered.
    ///
    /// Returns the bit TDO carried at the rising edge, or `None` when no Shift
    /// state is active and nothing drives TDO.
    fn clock(&mut self, tms: bool, tdi: bool) -> Option<bool> {
        let bit_out = match self.state {
            TapState::CaptureDr => {
                self.chips.iter_mut().for_each(Chip::capture_dr);
                None
            }
            TapState::CaptureIr => {
                self.chips.iter_mut().for_each(Chip::capture_ir);
                None
            }
            TapState::ShiftDr => Some(self.shift_chain(tdi, Chip::shift_dr)),
            TapState::ShiftIr => Some(self.shift_chain(tdi, Chip::shift_ir)),
            _ => None,
        };
        self.state = self.state.next(tms);
        match self.state {
            TapState::UpdateIr => self.chips.iter_mut().for_each(Chip::update_ir),
            TapState::TestLogicReset => self.chips.iter_mut().for_each(Chip::reset),
            _ => {}
        }
        bit_out
    }

    /// Moves every register in the chain one place toward TDO. `tdi` enters
    /// the first chip, each chip's outgoing bit enters the next chip, and the
    /// last chip's outgoing bit is the one that appears on TDO.
    fn shift_chain(&mut self, tdi: bool, shift: fn(&mut Chip, bool) -> bool) -> bool {
        self.chips
            .iter_mut()
            .fold(tdi, |bit, chip| shift(chip, bit))
    }

    /// Five clocks with TMS high reach Test-Logic-Reset from any state. One
    /// more with TMS low parks the chain in Run-Test/Idle, ready to scan.
    fn reset(&mut self) {
        for _ in 0..5 {
            self.clock(true, false);
        }
        self.clock(false, false);
    }

    /// From Run-Test/Idle, shifts `bits_in` through the instruction or data
    /// registers and returns to Run-Test/Idle. Returns the bits that came out
    /// of TDO, first bit first.
    fn scan(&mut self, register: Register, bits_in: &[bool]) -> Vec<bool> {
        assert_eq!(
            self.state,
            TapState::RunTestIdle,
            "scans start in Run-Test/Idle"
        );
        assert!(!bits_in.is_empty(), "a scan shifts at least one bit");

        self.clock(true, false); // to Select-DR-Scan
        if register == Register::Instruction {
            self.clock(true, false); // to Select-IR-Scan
        }
        self.clock(false, false); // to Capture
        self.clock(false, false); // capture happens now; to Shift

        let mut bits_out = Vec::with_capacity(bits_in.len());
        for (index, &bit) in bits_in.iter().enumerate() {
            // TMS rises with the last bit: that clock shifts it and leaves
            // for Exit1.
            let last = index + 1 == bits_in.len();
            bits_out.push(
                self.clock(last, bit)
                    .expect("TDO is driven in a Shift state"),
            );
        }

        self.clock(true, false); // to Update
        self.clock(false, false); // to Run-Test/Idle
        bits_out
    }
}

/// `count` bits of `value`, lowest bit first: the order JTAG shifts them.
fn bits_lsb_first(value: u32, count: usize) -> Vec<bool> {
    (0..count)
        .map(|index| ((value >> index) & 1) == 1)
        .collect()
}

/// Rebuilds a number from bits that arrived lowest bit first.
fn word_lsb_first(bits: &[bool]) -> u32 {
    bits.iter()
        .rev()
        .fold(0, |word, &bit| (word << 1) | u32::from(bit))
}

/// The three fields of a 32-bit IDCODE, whose bit 0 is always 1.
#[derive(Debug, PartialEq, Eq)]
struct IdCode {
    version: u32,
    part: u32,
    manufacturer: u32,
}

/// Splits an IDCODE into its fields, or returns `None` when bit 0 is 0,
/// which no IDCODE can have.
fn decode_idcode(value: u32) -> Option<IdCode> {
    ((value & 1) == 1).then_some(IdCode {
        version: value >> 28,
        part: (value >> 12) & 0xFFFF,
        manufacturer: (value >> 1) & 0x7FF,
    })
}

/// Loads one instruction into every chip. `instructions` is in chain order,
/// chip nearest TDI first. The first bits shifted in travel furthest, so the
/// bits for the chip nearest TDO go in first.
fn load_instructions(chain: &mut Chain, instructions: &[u8]) {
    let bits: Vec<bool> = instructions
        .iter()
        .rev()
        .flat_map(|&instruction| bits_lsb_first(u32::from(instruction), IR_LENGTH))
        .collect();
    chain.scan(Register::Instruction, &bits);
}

/// Counts the chips on a chain without knowing anything about them.
///
/// BYPASS is all ones, so 64 ones leave every chip in BYPASS whatever its
/// instruction register's length, as long as the lengths add up to 64 or
/// less; the spare ones fall out of TDO. Each bypass register holds one bit
/// and captures 0, so a single 1 fed in on the first clock comes out one
/// clock later for every chip it passes through.
fn count_chips(chain: &mut Chain, max_chips: usize) -> Option<usize> {
    chain.scan(Register::Instruction, &[true; 64]);
    let mut probe = vec![false; max_chips + 1];
    probe[0] = true;
    chain
        .scan(Register::Data, &probe)
        .iter()
        .position(|&bit| bit)
}

/// The lesson's board: TDI -> chip A -> chip B -> TDO.
fn board() -> Chain {
    Chain::new(vec![
        Chip::new("chip A, an Arm JTAG debug port", 0x4BA0_0477, 0b1110),
        Chip::new("chip B, a made-up sensor", 0x15EE_D001, 0b0010),
    ])
}

fn main() {
    println!("1. Five clocks with TMS high reach Test-Logic-Reset from any state");
    let mut state = TapState::ShiftDr;
    let mut path = vec![state.to_string()];
    for _ in 0..5 {
        state = state.next(true);
        path.push(state.to_string());
    }
    println!("  {}", path.join(" -> "));
    let slowest = TapState::ALL
        .into_iter()
        .filter_map(clocks_to_reset)
        .max()
        .unwrap_or_default();
    println!("  the slowest of the 16 states needs {slowest} clocks");

    println!("\n2. Reset selects IDCODE in every chip, so 64 bits read both IDs");
    let mut chain = board();
    chain.reset();
    let bits = chain.scan(Register::Data, &[false; 64]);
    // The chip nearest TDO answers first.
    for (chunk, chip) in bits.chunks(32).zip(chain.chips.iter().rev()) {
        let value = word_lsb_first(chunk);
        match decode_idcode(value) {
            Some(id) => println!(
                "  {value:#010X} from {}: version {}, part {:#06X}, manufacturer {:#05X}",
                chip.name, id.version, id.part, id.manufacturer
            ),
            None => println!("  {value:#010X} from {}: not an IDCODE", chip.name),
        }
    }

    println!("\n3. Count the chips by timing one bit through BYPASS");
    match count_chips(&mut chain, 8) {
        Some(chips) => println!(
            "  the 1 went in on clock 1 and came out on clock {}: {chips} chips",
            chips + 1
        ),
        None => println!("  the 1 never came out: more than 8 chips, or a broken chain"),
    }

    println!("\n4. The instruction picks the register: chip A on IDCODE, chip B on BYPASS");
    chain.reset();
    load_instructions(&mut chain, &[0b1110, BYPASS]);
    let bits = chain.scan(Register::Data, &[false; 33]);
    println!(
        "  32 + 1 = 33 bits: chip B's bypass bit ({}) first, then chip A's ID {:#010X}",
        u8::from(bits[0]),
        word_lsb_first(&bits[1..])
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn five_clocks_with_tms_high_reset_every_state() {
        let clocks: Vec<u32> = TapState::ALL
            .into_iter()
            .map(|state| clocks_to_reset(state).unwrap())
            .collect();
        assert!(clocks.iter().all(|&count| count <= 5));
        assert_eq!(clocks.iter().max(), Some(&5));
        assert_eq!(clocks_to_reset(TapState::ShiftDr), Some(5));
        assert_eq!(clocks_to_reset(TapState::RunTestIdle), Some(3));
    }

    #[test]
    fn exactly_six_states_can_wait_in_place() {
        let waiting: Vec<(TapState, bool)> = TapState::ALL
            .into_iter()
            .flat_map(|state| [(state, false), (state, true)])
            .filter(|&(state, tms)| state.next(tms) == state)
            .collect();
        assert_eq!(
            waiting,
            [
                (TapState::TestLogicReset, true),
                (TapState::RunTestIdle, false),
                (TapState::ShiftDr, false),
                (TapState::PauseDr, false),
                (TapState::ShiftIr, false),
                (TapState::PauseIr, false),
            ]
        );
    }

    #[test]
    fn tdo_is_driven_only_in_shift_states() {
        let mut chain = board();
        chain.reset();
        assert_eq!(chain.clock(false, false), None);
    }

    #[test]
    fn idcodes_arrive_nearest_chip_first_and_lowest_bit_first() {
        let mut chain = board();
        chain.reset();
        let bits = chain.scan(Register::Data, &[false; 64]);
        assert!(bits[0], "bit 0 of every IDCODE is 1");
        assert_eq!(word_lsb_first(&bits[..32]), 0x15EE_D001);
        assert_eq!(word_lsb_first(&bits[32..]), 0x4BA0_0477);
    }

    #[test]
    fn the_arm_idcode_splits_into_the_lesson_fields() {
        assert_eq!(
            decode_idcode(0x4BA0_0477),
            Some(IdCode {
                version: 4,
                part: 0xBA00,
                manufacturer: 0x23B,
            })
        );
        assert_eq!(decode_idcode(0x4BA0_0476), None);
    }

    #[test]
    fn instruction_capture_starts_every_register_with_01() {
        let mut chain = board();
        chain.reset();
        let bits = chain.scan(Register::Instruction, &[true; 8]);
        assert_eq!(bits, [true, false, false, false, true, false, false, false]);
        assert!(chain.chips.iter().all(|chip| chip.instruction == BYPASS));
    }

    #[test]
    fn a_bit_is_delayed_one_clock_per_chip_in_bypass() {
        let mut chain = board();
        chain.reset();
        assert_eq!(count_chips(&mut chain, 8), Some(2));

        let mut longer = board();
        longer.chips.push(Chip::new(
            "chip C, another made-up chip",
            0x0000_0001,
            0b0011,
        ));
        longer.reset();
        assert_eq!(count_chips(&mut longer, 8), Some(3));
    }

    #[test]
    fn undefined_instructions_select_the_bypass_register() {
        let mut chain = board();
        chain.reset();
        load_instructions(&mut chain, &[0b0101, 0b0101]);
        assert!(chain.chips.iter().all(|chip| chip.instruction == 0b0101));
        let probe = [true, false, false, false];
        assert_eq!(
            chain.scan(Register::Data, &probe),
            [false, false, true, false]
        );
    }

    #[test]
    fn instructions_land_in_chain_order() {
        let mut chain = board();
        chain.reset();
        load_instructions(&mut chain, &[0b1110, BYPASS]);
        assert_eq!(chain.chips[0].instruction, 0b1110);
        assert_eq!(chain.chips[1].instruction, BYPASS);

        // The data chain is now 32 + 1 = 33 bits long. Chip B's bypass bit
        // is nearest TDO, so its captured 0 leaves first.
        let bits = chain.scan(Register::Data, &[false; 33]);
        assert!(!bits[0]);
        assert_eq!(word_lsb_first(&bits[1..]), 0x4BA0_0477);
    }

    #[test]
    fn reset_restores_idcode_from_any_state() {
        let mut chain = board();
        chain.reset();
        load_instructions(&mut chain, &[BYPASS, BYPASS]);
        for tms in [true, true, false, true, false] {
            chain.clock(tms, true);
        }
        assert_eq!(chain.state, TapState::PauseIr);

        chain.reset();
        assert_eq!(chain.state, TapState::RunTestIdle);
        assert!(
            chain
                .chips
                .iter()
                .all(|chip| chip.instruction == chip.idcode_instruction)
        );
    }
}
