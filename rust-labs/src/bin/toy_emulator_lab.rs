//! Toy emulator lab for Lesson 14.11.
//!
//! A made-up 8-bit console: a CPU with a program counter, registers `A` and
//! `X`, and a zero flag; 240 bytes of RAM; and two memory-mapped I/O
//! registers. The emulator is an interpreter. Each step fetches the byte at
//! the program counter, decodes it, executes it, and counts the cycles the
//! real chip would have spent. On top of that sit a run loop with a cycle
//! budget, video frames with constant-write cheats, and save states.

use std::error::Error;
use std::fmt;

/// RAM fills addresses 0x00 to 0xEF, which is 0xF0 = 15 x 16 = 240 bytes.
const RAM_SIZE: usize = 0xF0;
/// Writing here changes the number on the console's display.
const DISPLAY: u8 = 0xF0;
/// Reading here returns the buttons held down, one bit per button.
const BUTTONS: u8 = 0xF1;
/// Where the lesson's program keeps the player's gold.
const GOLD: u8 = 0x80;
/// The small frame budget the lesson uses to stop the program part way.
const FRAME_BUDGET: u64 = 18;

/// The lesson's program: add 5 gold twice, then show the total.
const PROGRAM: [u8; 14] = [
    0x01, 0x02, // 0x00  LDX #2     X = 2
    0x02, 0x80, // 0x02  LDA 0x80   A = gold
    0x03, 0x05, // 0x04  ADD #5     A = A + 5
    0x04, 0x80, // 0x06  STA 0x80   gold = A
    0x05, //       0x08  DEX        X = X - 1
    0x06, 0x02, // 0x09  JNZ 0x02   back to 0x02 while X is not 0
    0x04, 0xF0, // 0x0B  STA 0xF0   show A on the display
    0xFF, //       0x0D  HLT
];

/// The instructions this CPU understands. Operands are fetched while the
/// instruction executes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Opcode {
    /// `0x01 n`: X = n.
    Ldx,
    /// `0x02 a`: A = the byte at address a.
    Lda,
    /// `0x03 n`: A = A + n, wrapping past 255 back to 0.
    Add,
    /// `0x04 a`: store A at address a.
    Sta,
    /// `0x05`: X = X - 1, wrapping below 0 to 255.
    Dex,
    /// `0x06 a`: jump to address a if the zero flag is clear.
    Jnz,
    /// `0xFF`: stop.
    Hlt,
}

impl Opcode {
    const fn decode(byte: u8) -> Option<Self> {
        match byte {
            0x01 => Some(Self::Ldx),
            0x02 => Some(Self::Lda),
            0x03 => Some(Self::Add),
            0x04 => Some(Self::Sta),
            0x05 => Some(Self::Dex),
            0x06 => Some(Self::Jnz),
            0xFF => Some(Self::Hlt),
            _ => None,
        }
    }
}

/// The CPU's registers, plus two facts the emulator tracks about it: whether
/// it has halted, and how many cycles it has run since power-on.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
struct Cpu {
    pc: u8,
    a: u8,
    x: u8,
    zero: bool,
    halted: bool,
    cycles: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum EmuError {
    /// The byte at `at` is not an instruction this CPU knows.
    IllegalOpcode { at: u8, opcode: u8 },
    /// The program does not fit in RAM.
    ProgramTooLarge { length: usize },
    /// A save state has the wrong length or an impossible flag byte.
    BadSaveState,
}

impl fmt::Display for EmuError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IllegalOpcode { at, opcode } => {
                write!(
                    formatter,
                    "byte {opcode:#04X} at {at:#04X} is not an instruction"
                )
            }
            Self::ProgramTooLarge { length } => write!(
                formatter,
                "a {length}-byte program does not fit in {RAM_SIZE} bytes of RAM"
            ),
            Self::BadSaveState => {
                formatter.write_str("the save state has the wrong length or an impossible flag")
            }
        }
    }
}

impl Error for EmuError {}

/// A constant-write cheat code: after every frame, write `value` at `address`.
#[derive(Clone, Copy, Debug)]
struct Cheat {
    address: u8,
    value: u8,
}

/// The whole console: CPU, RAM, and the two I/O registers.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Console {
    cpu: Cpu,
    ram: [u8; RAM_SIZE],
    display: u8,
    buttons: u8,
}

impl Console {
    /// A console just powered on, with `program` copied to address 0x00.
    fn with_program(program: &[u8]) -> Result<Self, EmuError> {
        let mut ram = [0; RAM_SIZE];
        ram.get_mut(..program.len())
            .ok_or(EmuError::ProgramTooLarge {
                length: program.len(),
            })?
            .copy_from_slice(program);
        Ok(Self {
            cpu: Cpu::default(),
            ram,
            display: 0,
            buttons: 0,
        })
    }

    /// The memory map. Every read the CPU makes comes through here.
    fn read(&self, address: u8) -> u8 {
        match address {
            0x00..=0xEF => self.ram[usize::from(address)],
            DISPLAY => self.display,
            BUTTONS => self.buttons,
            _ => 0, // 0xF2 to 0xFF: nothing is wired there
        }
    }

    /// Every write the CPU makes comes through here too.
    fn write(&mut self, address: u8, value: u8) {
        match address {
            0x00..=0xEF => self.ram[usize::from(address)] = value,
            DISPLAY => self.display = value,
            _ => {} // the buttons are read-only, and 0xF2 to 0xFF go nowhere
        }
    }

    /// Reads the byte at the program counter and moves the counter past it.
    fn fetch(&mut self) -> u8 {
        let byte = self.read(self.cpu.pc);
        self.cpu.pc = self.cpu.pc.wrapping_add(1);
        byte
    }

    /// Runs one instruction and returns the cycles it took.
    ///
    /// The cycle rule: one cycle for each byte fetched, one for each data
    /// byte read or written, and one more when a jump is taken.
    fn step(&mut self) -> Result<u8, EmuError> {
        if self.cpu.halted {
            return Ok(0);
        }
        let at = self.cpu.pc;
        let opcode = self.fetch();
        let instruction = Opcode::decode(opcode).ok_or(EmuError::IllegalOpcode { at, opcode })?;
        let cycles = match instruction {
            Opcode::Ldx => {
                self.cpu.x = self.fetch();
                self.cpu.zero = self.cpu.x == 0;
                2
            }
            Opcode::Lda => {
                let address = self.fetch();
                self.cpu.a = self.read(address);
                self.cpu.zero = self.cpu.a == 0;
                3
            }
            Opcode::Add => {
                let value = self.fetch();
                self.cpu.a = self.cpu.a.wrapping_add(value);
                self.cpu.zero = self.cpu.a == 0;
                2
            }
            Opcode::Sta => {
                let address = self.fetch();
                self.write(address, self.cpu.a);
                3
            }
            Opcode::Dex => {
                self.cpu.x = self.cpu.x.wrapping_sub(1);
                self.cpu.zero = self.cpu.x == 0;
                1
            }
            Opcode::Jnz => {
                let target = self.fetch();
                if self.cpu.zero {
                    2
                } else {
                    self.cpu.pc = target;
                    3
                }
            }
            Opcode::Hlt => {
                self.cpu.halted = true;
                1
            }
        };
        self.cpu.cycles += u64::from(cycles);
        Ok(cycles)
    }

    /// Runs whole instructions until `budget` cycles have been used or the
    /// CPU halts, and returns the cycles used. An instruction is never split,
    /// so the result can pass the budget by up to two cycles.
    fn run(&mut self, budget: u64) -> Result<u64, EmuError> {
        let mut used = 0;
        while used < budget && !self.cpu.halted {
            used += u64::from(self.step()?);
        }
        Ok(used)
    }

    /// One video frame: run for the frame's budget, then apply every cheat,
    /// the way a cheat cartridge writes its values once per frame. Returns
    /// the overshoot, which the caller takes off the next frame's budget.
    fn run_frame(&mut self, budget: u64, cheats: &[Cheat]) -> Result<u64, EmuError> {
        let used = self.run(budget)?;
        for cheat in cheats {
            self.write(cheat.address, cheat.value);
        }
        Ok(used.saturating_sub(budget))
    }

    /// Copies everything the console is.
    fn save_state(&self) -> SaveState {
        SaveState {
            cpu: self.cpu,
            ram: self.ram,
            display: self.display,
            buttons: self.buttons,
        }
    }

    /// Puts the console back exactly where the save state was taken.
    fn load_state(&mut self, state: &SaveState) {
        self.cpu = state.cpu;
        self.ram = state.ram;
        self.display = state.display;
        self.buttons = state.buttons;
    }
}

/// Everything the console is, copied out: registers, all of RAM, and the I/O
/// registers. Loading it puts the machine back exactly where it was.
#[derive(Clone, Debug, PartialEq, Eq)]
struct SaveState {
    cpu: Cpu,
    ram: [u8; RAM_SIZE],
    display: u8,
    buttons: u8,
}

impl SaveState {
    /// PC, A, X, Z, and halted (5 bytes), the cycle count (8 bytes), RAM
    /// (240 bytes), display and buttons (2 bytes): 5 + 8 + 240 + 2 = 255.
    const LENGTH: usize = 5 + 8 + RAM_SIZE + 2;

    fn to_bytes(&self) -> Vec<u8> {
        let cpu = self.cpu;
        let mut bytes = Vec::with_capacity(Self::LENGTH);
        bytes.extend([
            cpu.pc,
            cpu.a,
            cpu.x,
            u8::from(cpu.zero),
            u8::from(cpu.halted),
        ]);
        bytes.extend(cpu.cycles.to_le_bytes());
        bytes.extend(self.ram);
        bytes.extend([self.display, self.buttons]);
        bytes
    }

    /// Reads a save state back, refusing anything that is not exactly
    /// `LENGTH` bytes long or has a flag byte other than 0 or 1.
    fn from_bytes(bytes: &[u8]) -> Result<Self, EmuError> {
        let bad = EmuError::BadSaveState;
        let (&[pc, a, x, zero, halted], rest) = bytes.split_first_chunk::<5>().ok_or(bad)?;
        let (cycles, rest) = rest.split_first_chunk::<8>().ok_or(bad)?;
        let (ram, rest) = rest.split_first_chunk::<RAM_SIZE>().ok_or(bad)?;
        let &[display, buttons] = rest else {
            return Err(bad);
        };
        let flag = |byte| match byte {
            0 => Ok(false),
            1 => Ok(true),
            _ => Err(bad),
        };
        Ok(Self {
            cpu: Cpu {
                pc,
                a,
                x,
                zero: flag(zero)?,
                halted: flag(halted)?,
                cycles: u64::from_le_bytes(*cycles),
            },
            ram: *ram,
            display,
            buttons,
        })
    }
}

/// A console with the lesson's program loaded and 10 gold at 0x80.
fn lesson_console() -> Result<Console, EmuError> {
    let mut console = Console::with_program(&PROGRAM)?;
    console.write(GOLD, 10);
    Ok(console)
}

fn main() -> Result<(), Box<dyn Error>> {
    println!("1. The traced program, one instruction at a time");
    let mut console = lesson_console()?;
    println!("  step    at    A    X  Z  gold  cycles");
    let mut step = 0;
    while !console.cpu.halted {
        let at = console.cpu.pc;
        console.step()?;
        step += 1;
        let cpu = console.cpu;
        println!(
            "  {step:>4}  {at:#04X}  {:>3}  {:>3}  {}  {:>4}  {:>6}",
            cpu.a,
            cpu.x,
            u8::from(cpu.zero),
            console.read(GOLD),
            cpu.cycles
        );
    }
    println!("  the display shows {}", console.display);

    println!("\n2. A budget of {FRAME_BUDGET} cycles stops the run between two instructions");
    let mut console = lesson_console()?;
    let used = console.run(FRAME_BUDGET)?;
    println!(
        "  used {used} cycles: PC = {:#04X}, A = {}, X = {}, gold in RAM = {}",
        console.cpu.pc,
        console.cpu.a,
        console.cpu.x,
        console.read(GOLD)
    );
    let saved = console.save_state();
    console.run(1_000)?;
    let first_ending = console.clone();
    console.load_state(&saved);
    console.run(1_000)?;
    println!(
        "  loaded the save state and ran on again: same final machine = {}",
        console == first_ending
    );
    let bytes = saved.to_bytes();
    let read_back = SaveState::from_bytes(&bytes)?;
    println!(
        "  the save state is {} bytes, and reads back unchanged = {}",
        bytes.len(),
        read_back == saved
    );

    println!("\n3. A constant-write cheat puts 99 in gold after every frame");
    let mut console = lesson_console()?;
    let cheats = [Cheat {
        address: GOLD,
        value: 99,
    }];
    let mut budget = FRAME_BUDGET;
    for frame in 1..=2 {
        let overshoot = console.run_frame(budget, &cheats)?;
        budget = FRAME_BUDGET - overshoot;
        println!(
            "  after frame {frame}: gold = {}, A = {}, display = {}",
            console.read(GOLD),
            console.cpu.a,
            console.display
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fresh() -> Console {
        lesson_console().unwrap()
    }

    /// After each step: (address of the instruction, A, X, Z, gold, total
    /// cycles), exactly as the lesson's trace tables list them.
    const TRACE: [(u8, u8, u8, bool, u8, u64); 13] = [
        (0x00, 0, 2, false, 10, 2),   // LDX #2
        (0x02, 10, 2, false, 10, 5),  // LDA 0x80
        (0x04, 15, 2, false, 10, 7),  // ADD #5
        (0x06, 15, 2, false, 15, 10), // STA 0x80
        (0x08, 15, 1, false, 15, 11), // DEX
        (0x09, 15, 1, false, 15, 14), // JNZ 0x02 jumps
        (0x02, 15, 1, false, 15, 17), // LDA 0x80
        (0x04, 20, 1, false, 15, 19), // ADD #5
        (0x06, 20, 1, false, 20, 22), // STA 0x80
        (0x08, 20, 0, true, 20, 23),  // DEX
        (0x09, 20, 0, true, 20, 25),  // JNZ 0x02 falls through
        (0x0B, 20, 0, true, 20, 28),  // STA 0xF0
        (0x0D, 20, 0, true, 20, 29),  // HLT
    ];

    #[test]
    fn every_step_matches_the_lesson_trace() {
        let mut console = fresh();
        for (step, &(at, a, x, zero, gold, cycles)) in (1..).zip(TRACE.iter()) {
            assert_eq!(
                console.cpu.pc, at,
                "step {step} starts at the wrong address"
            );
            console.step().unwrap();
            let cpu = console.cpu;
            assert_eq!(
                (cpu.a, cpu.x, cpu.zero, console.read(GOLD), cpu.cycles),
                (a, x, zero, gold, cycles),
                "after step {step}"
            );
        }
        assert!(console.cpu.halted);
        assert_eq!(console.display, 20);
    }

    #[test]
    fn a_jump_costs_one_more_cycle_when_it_is_taken() {
        let mut console = Console::with_program(&[0x06, 0x05]).unwrap();
        assert_eq!(console.step(), Ok(3));
        assert_eq!(console.cpu.pc, 0x05);

        let mut console = Console::with_program(&[0x06, 0x05]).unwrap();
        console.cpu.zero = true;
        assert_eq!(console.step(), Ok(2));
        assert_eq!(console.cpu.pc, 0x02);
    }

    #[test]
    fn addition_wraps_past_255_and_sets_the_zero_flag() {
        let mut console = Console::with_program(&[0x03, 0x06]).unwrap();
        console.cpu.a = 250;
        console.step().unwrap();
        assert_eq!(console.cpu.a, 0);
        assert!(console.cpu.zero);
    }

    #[test]
    fn a_budget_stops_between_instructions_never_inside_one() {
        let mut console = fresh();
        assert_eq!(console.run(FRAME_BUDGET), Ok(19));
        assert_eq!(
            (console.cpu.pc, console.cpu.a, console.cpu.x),
            (0x06, 20, 1)
        );
        assert_eq!(console.read(GOLD), 15, "the new total exists only in A");
    }

    #[test]
    fn loading_a_save_state_replays_the_same_future() {
        let mut console = fresh();
        console.run(FRAME_BUDGET).unwrap();
        let saved = console.save_state();

        console.run(1_000).unwrap();
        let first_ending = console.clone();
        assert!(first_ending.cpu.halted);

        console.write(GOLD, 0);
        console.load_state(&saved);
        assert_eq!(console.save_state(), saved);
        console.run(1_000).unwrap();
        assert_eq!(console, first_ending);
    }

    #[test]
    fn a_save_state_round_trips_through_255_bytes() {
        let mut console = fresh();
        console.run(FRAME_BUDGET).unwrap();
        let saved = console.save_state();
        let bytes = saved.to_bytes();
        assert_eq!(bytes.len(), 255);
        assert_eq!(bytes[..5], [0x06, 20, 1, 0, 0]);
        assert_eq!(SaveState::from_bytes(&bytes), Ok(saved));
    }

    #[test]
    fn a_damaged_save_state_is_rejected() {
        let bytes = fresh().save_state().to_bytes();
        assert_eq!(
            SaveState::from_bytes(&bytes[..254]),
            Err(EmuError::BadSaveState)
        );
        let mut damaged = bytes;
        damaged[3] = 2; // the zero flag can only be 0 or 1
        assert_eq!(SaveState::from_bytes(&damaged), Err(EmuError::BadSaveState));
    }

    #[test]
    fn unknown_bytes_are_an_error_not_a_guess() {
        let mut console = Console::with_program(&[]).unwrap();
        assert_eq!(
            console.step(),
            Err(EmuError::IllegalOpcode { at: 0, opcode: 0 })
        );
    }

    #[test]
    fn a_program_larger_than_ram_is_rejected() {
        assert_eq!(
            Console::with_program(&[0; 241]).unwrap_err(),
            EmuError::ProgramTooLarge { length: 241 }
        );
    }

    #[test]
    fn io_addresses_are_not_ram() {
        let mut console = fresh();
        console.write(DISPLAY, 42);
        assert_eq!(console.read(DISPLAY), 42);

        console.buttons = 0b0000_0101;
        console.write(BUTTONS, 0xFF);
        assert_eq!(
            console.read(BUTTONS),
            0b0000_0101,
            "the buttons are read-only"
        );

        console.write(0xF5, 7);
        assert_eq!(console.read(0xF5), 0, "nothing is wired at 0xF5");
    }

    #[test]
    fn a_cheat_is_rewritten_every_frame_but_loses_to_a_register_copy() {
        let mut console = fresh();
        let cheats = [Cheat {
            address: GOLD,
            value: 99,
        }];
        assert_eq!(console.run_frame(FRAME_BUDGET, &cheats), Ok(1));
        assert_eq!(console.read(GOLD), 99);

        assert_eq!(console.run_frame(FRAME_BUDGET - 1, &cheats), Ok(0));
        assert!(console.cpu.halted);
        assert_eq!(console.read(GOLD), 99);
        assert_eq!(
            console.display, 20,
            "the game copied gold into A before the cheat wrote it"
        );
    }
}
