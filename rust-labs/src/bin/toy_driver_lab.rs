//! Toy driver lab for Lesson 14.2.
//!
//! An ordinary user-mode simulation of a device and the driver that owns it.
//! `ToyKeypad` plays the hardware: a 16-byte block of registers and a small
//! queue of key events. `ToyDriver` plays the kernel driver: it validates
//! requests, parks reads that cannot finish yet, and completes them when the
//! device interrupts. Nothing here touches real hardware or the kernel. The
//! register block is a struct, the interrupt line is a `bool`, and an I/O
//! request packet is a small struct in a queue.

use std::collections::VecDeque;
use std::error::Error;
use std::fmt;

// The register map: byte offsets from the start of the register block.

/// Read and write. Bit 0 enables the device, bit 1 enables its interrupt.
const CONTROL: usize = 0x00;
/// Read only. Bit 0: data ready. Bit 1: overflow. Bits 8 to 15: events waiting.
const STATUS: usize = 0x04;
/// Read only, with a side effect: reading removes the event at the front.
/// Bits 0 to 6 hold a scan code; bit 7 is set when the key was released.
const DATA: usize = 0x08;
/// Write only, write 1 to clear. Bit 0 lowers the interrupt line and bit 1
/// clears the overflow flag. Bits written as 0 change nothing.
const ACK: usize = 0x0C;
const BLOCK_BYTES: usize = 16;

const CONTROL_ENABLE: u32 = 0x1;
const CONTROL_IRQ_ENABLE: u32 = 0x2;
const CONTROL_DEFINED: u32 = CONTROL_ENABLE | CONTROL_IRQ_ENABLE;

const STATUS_DATA_READY: u32 = 0x1;
const STATUS_OVERFLOW: u32 = 0x2;
const STATUS_COUNT_SHIFT: u32 = 8;

const DATA_SCAN_CODE: u8 = 0x7F;
const DATA_RELEASED: u8 = 0x80;

const ACK_INTERRUPT: u32 = 0x1;
const ACK_OVERFLOW: u32 = 0x2;
const ACK_DEFINED: u32 = ACK_INTERRUPT | ACK_OVERFLOW;

/// How many events the device can hold before it starts dropping them.
const QUEUE_CAPACITY: usize = 4;

/// The set-1 scan code for the A key.
const SCAN_A: u8 = 0x1E;

/// The access right a handle needs to read from the device.
const FILE_READ_DATA: u32 = 0x1;
const METHOD_BUFFERED: u32 = 0;
/// Device types from `0x8000` up belong to hardware vendors, not Microsoft.
const TOY_DEVICE_TYPE: u32 = 0x8000;
/// The keypad's only control code: copy the STATUS register to the caller.
const IOCTL_TOY_GET_STATUS: u32 = ctl_code(TOY_DEVICE_TYPE, 0x801, METHOD_BUFFERED, FILE_READ_DATA);

/// Packs a control code the way the Windows `CTL_CODE` macro does.
const fn ctl_code(device_type: u32, function: u32, method: u32, access: u32) -> u32 {
    (device_type << 16) | (access << 14) | (function << 2) | method
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct IoctlFields {
    device_type: u32,
    access: u32,
    function: u32,
    method: u32,
}

fn decode_ioctl(code: u32) -> IoctlFields {
    IoctlFields {
        device_type: code >> 16,
        access: (code >> 14) & 0x3,
        function: (code >> 2) & 0xFFF,
        method: code & 0x3,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct StatusFields {
    data_ready: bool,
    overflow: bool,
    count: u32,
}

fn decode_status(value: u32) -> StatusFields {
    StatusFields {
        data_ready: value & STATUS_DATA_READY != 0,
        overflow: value & STATUS_OVERFLOW != 0,
        count: (value >> STATUS_COUNT_SHIFT) & 0xFF,
    }
}

fn describe_event(event: u8) -> String {
    let scan_code = event & DATA_SCAN_CODE;
    let action = if event & DATA_RELEASED == 0 {
        "pressed"
    } else {
        "released"
    };
    format!("0x{event:02X}: scan code 0x{scan_code:02X} {action}")
}

/// What the simulated bus reports for an access that names no register.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BusError {
    Unaligned(usize),
    OutOfRange(usize),
    ReadOnly(usize),
    ReservedBits { offset: usize, value: u32 },
}

impl fmt::Display for BusError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BusError::Unaligned(offset) => {
                write!(formatter, "offset 0x{offset:02X} is not 4-byte aligned")
            }
            BusError::OutOfRange(offset) => {
                write!(
                    formatter,
                    "offset 0x{offset:02X} is past the register block"
                )
            }
            BusError::ReadOnly(offset) => {
                write!(
                    formatter,
                    "the register at 0x{offset:02X} cannot be written"
                )
            }
            BusError::ReservedBits { offset, value } => write!(
                formatter,
                "0x{value:08X} sets reserved bits of the register at 0x{offset:02X}"
            ),
        }
    }
}

impl Error for BusError {}

/// Registers are 4 bytes wide and start every 4 bytes.
fn register(offset: usize) -> Result<usize, BusError> {
    if offset >= BLOCK_BYTES {
        Err(BusError::OutOfRange(offset))
    } else if offset.is_multiple_of(4) {
        Ok(offset)
    } else {
        Err(BusError::Unaligned(offset))
    }
}

/// The simulated hardware.
#[derive(Debug, Default)]
struct ToyKeypad {
    control: u32,
    events: VecDeque<u8>,
    overflow: bool,
    interrupt_line: bool,
}

impl ToyKeypad {
    /// The physical side of the device: a key changed state.
    fn key_event(&mut self, scan_code: u8, released: bool) {
        if self.control & CONTROL_ENABLE == 0 {
            return; // a disabled device does not scan its keys
        }
        if self.events.len() == QUEUE_CAPACITY {
            self.overflow = true; // the event is lost, and the flag says so
        } else {
            let released_bit = if released { DATA_RELEASED } else { 0 };
            self.events
                .push_back((scan_code & DATA_SCAN_CODE) | released_bit);
        }
        if self.control & CONTROL_IRQ_ENABLE != 0 {
            self.interrupt_line = true;
        }
    }

    fn interrupt_pending(&self) -> bool {
        self.interrupt_line
    }

    fn status(&self) -> u32 {
        let count = u32::try_from(self.events.len())
            .unwrap_or(u32::MAX)
            .min(0xFF);
        let mut status = count << STATUS_COUNT_SHIFT;
        if !self.events.is_empty() {
            status |= STATUS_DATA_READY;
        }
        if self.overflow {
            status |= STATUS_OVERFLOW;
        }
        status
    }

    /// One 32-bit register read, as the driver's processor would perform it.
    fn read32(&mut self, offset: usize) -> Result<u32, BusError> {
        match register(offset)? {
            CONTROL => Ok(self.control),
            STATUS => Ok(self.status()),
            // Reading DATA is not a pure read: it removes the front event.
            DATA => Ok(self.events.pop_front().map_or(0, u32::from)),
            _ => Ok(0), // ACK is write only and reads as zero
        }
    }

    /// One 32-bit register write.
    fn write32(&mut self, offset: usize, value: u32) -> Result<(), BusError> {
        match register(offset)? {
            CONTROL if value & !CONTROL_DEFINED == 0 => {
                self.control = value;
                Ok(())
            }
            ACK if value & !ACK_DEFINED == 0 => {
                if value & ACK_INTERRUPT != 0 {
                    self.interrupt_line = false;
                }
                if value & ACK_OVERFLOW != 0 {
                    self.overflow = false;
                }
                Ok(())
            }
            CONTROL | ACK => Err(BusError::ReservedBits { offset, value }),
            _ => Err(BusError::ReadOnly(offset)),
        }
    }

    /// Every register as 16 little-endian bytes, without the side effect a
    /// real DATA read would have. Real hardware offers no such view; the lab
    /// uses it only to print the register block the lesson draws.
    fn debug_view(&self) -> [u8; BLOCK_BYTES] {
        let front = self.events.front().copied().map_or(0, u32::from);
        let words = [self.control, self.status(), front, 0];
        let mut bytes = [0_u8; BLOCK_BYTES];
        let (chunks, _) = bytes.as_chunks_mut::<4>();
        for (chunk, word) in chunks.iter_mut().zip(words) {
            *chunk = word.to_le_bytes();
        }
        bytes
    }
}

/// What a request asks for: the major function of the packet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MajorFunction {
    /// `ReadFile`: return key events, one byte each.
    Read,
    /// `DeviceIoControl`: the control code names the operation.
    DeviceControl { code: u32 },
}

/// A simulated I/O request packet: the I/O manager's work order.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Irp {
    id: u32,
    major: MajorFunction,
    /// The rights granted to the caller's handle when it opened the device.
    granted_access: u32,
    /// The size of the caller's output buffer, in bytes.
    output_length: usize,
}

fn read_request(id: u32, output_length: usize) -> Irp {
    Irp {
        id,
        major: MajorFunction::Read,
        granted_access: FILE_READ_DATA,
        output_length,
    }
}

fn control_request(id: u32, code: u32, granted_access: u32, output_length: usize) -> Irp {
    Irp {
        id,
        major: MajorFunction::DeviceControl { code },
        granted_access,
        output_length,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Success,
    Pending,
    AccessDenied,
    InvalidDeviceRequest,
    BufferTooSmall,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Completion {
    id: u32,
    status: Status,
    bytes: Vec<u8>,
}

/// The I/O manager's check, made before any driver sees the request: the
/// handle must hold every right that the request's access bits demand.
fn io_manager_allows(irp: &Irp) -> bool {
    let needed = match irp.major {
        MajorFunction::Read => FILE_READ_DATA,
        MajorFunction::DeviceControl { code } => decode_ioctl(code).access,
    };
    irp.granted_access & needed == needed
}

/// The path of one request: the I/O manager's check, then the driver.
fn submit(driver: &mut ToyDriver, device: &mut ToyKeypad, irp: Irp) -> Result<Status, BusError> {
    if io_manager_allows(&irp) {
        driver.dispatch(device, irp)
    } else {
        Ok(Status::AccessDenied)
    }
}

/// The simulated driver.
#[derive(Debug, Default)]
struct ToyDriver {
    /// Read requests waiting for key events, oldest first.
    pending_reads: VecDeque<Irp>,
    /// Events taken from the device but not yet handed to a request.
    buffered_events: VecDeque<u8>,
    /// Requests finished since the I/O manager last collected them.
    completed: Vec<Completion>,
    dpc_queued: bool,
    overflows_seen: u32,
}

impl ToyDriver {
    /// Starts the device: enable its key scanning and its interrupt.
    fn start(device: &mut ToyKeypad) -> Result<Self, BusError> {
        device.write32(CONTROL, CONTROL_ENABLE | CONTROL_IRQ_ENABLE)?;
        Ok(ToyDriver::default())
    }

    /// The dispatch routine: validate a request, then finish it now or park it.
    fn dispatch(&mut self, device: &mut ToyKeypad, irp: Irp) -> Result<Status, BusError> {
        match irp.major {
            MajorFunction::Read => {
                if irp.output_length == 0 {
                    return Ok(self.complete(irp.id, Status::BufferTooSmall, Vec::new()));
                }
                if self.buffered_events.is_empty() {
                    self.pending_reads.push_back(irp);
                    return Ok(Status::Pending);
                }
                let bytes = self.take_events(irp.output_length);
                Ok(self.complete(irp.id, Status::Success, bytes))
            }
            MajorFunction::DeviceControl { code } => {
                // Compare the whole 32-bit code, not only its function number.
                if code != IOCTL_TOY_GET_STATUS {
                    return Ok(self.complete(irp.id, Status::InvalidDeviceRequest, Vec::new()));
                }
                // Check the length before copying anything into the buffer.
                if irp.output_length < 4 {
                    return Ok(self.complete(irp.id, Status::BufferTooSmall, Vec::new()));
                }
                let status = device.read32(STATUS)?;
                Ok(self.complete(irp.id, Status::Success, status.to_le_bytes().to_vec()))
            }
        }
    }

    /// The interrupt service routine. Other work on its core waits while it
    /// runs, so it does the minimum: confirm the interrupt came from this
    /// device, acknowledge it so the device lowers its line, and queue the DPC.
    fn isr(&mut self, device: &mut ToyKeypad) -> Result<bool, BusError> {
        let status = device.read32(STATUS)?;
        if status & STATUS_DATA_READY == 0 {
            return Ok(false); // the line is shared, and another device raised it
        }
        device.write32(ACK, ACK_INTERRUPT)?;
        self.dpc_queued = true;
        Ok(true)
    }

    /// The deferred procedure call: drain the device, then complete waiting reads.
    fn dpc(&mut self, device: &mut ToyKeypad) -> Result<(), BusError> {
        if !std::mem::take(&mut self.dpc_queued) {
            return Ok(());
        }
        while device.read32(STATUS)? & STATUS_DATA_READY != 0 {
            let [event, ..] = device.read32(DATA)?.to_le_bytes();
            self.buffered_events.push_back(event);
        }
        if device.read32(STATUS)? & STATUS_OVERFLOW != 0 {
            self.overflows_seen += 1;
            device.write32(ACK, ACK_OVERFLOW)?;
        }
        while !self.buffered_events.is_empty() {
            let Some(irp) = self.pending_reads.pop_front() else {
                break;
            };
            let bytes = self.take_events(irp.output_length);
            self.complete(irp.id, Status::Success, bytes);
        }
        Ok(())
    }

    fn take_events(&mut self, limit: usize) -> Vec<u8> {
        let count = limit.min(self.buffered_events.len());
        self.buffered_events.drain(..count).collect()
    }

    fn complete(&mut self, id: u32, status: Status, bytes: Vec<u8>) -> Status {
        self.completed.push(Completion { id, status, bytes });
        status
    }

    fn take_completions(&mut self) -> Vec<Completion> {
        std::mem::take(&mut self.completed)
    }
}

fn print_block(bytes: &[u8; BLOCK_BYTES]) {
    let names = ["CONTROL", "STATUS", "DATA", "ACK"];
    let (words, _) = bytes.as_chunks::<4>();
    for (offset, (name, chunk)) in names.iter().zip(words).enumerate() {
        let word = u32::from_le_bytes(*chunk);
        let hex: Vec<String> = chunk.iter().map(|byte| format!("{byte:02X}")).collect();
        println!(
            "   +0x{:02X} {name:<7} bytes {}  = 0x{word:08X}",
            offset * 4,
            hex.join(" ")
        );
    }
}

fn print_completions(driver: &mut ToyDriver) {
    for completion in driver.take_completions() {
        println!(
            "   request {} completed with {:?}, {} bytes",
            completion.id,
            completion.status,
            completion.bytes.len()
        );
        for event in completion.bytes {
            println!("     {}", describe_event(event));
        }
    }
}

fn pending_read_scenario(driver: &mut ToyDriver, device: &mut ToyKeypad) -> Result<(), BusError> {
    println!("1. A program asks for key events before any key is pressed");
    let status = submit(driver, device, read_request(1, 8))?;
    println!("   dispatch returned {status:?}; the request waits in the driver");

    println!("\n2. A is pressed and released; the device queues two events");
    device.key_event(SCAN_A, false);
    device.key_event(SCAN_A, true);
    let view = device.debug_view();
    print_block(&view);
    let fields = decode_status(u32::from_le_bytes([view[4], view[5], view[6], view[7]]));
    println!(
        "   STATUS: data ready {}, overflow {}, {} events waiting",
        fields.data_ready, fields.overflow, fields.count
    );

    println!("\n3. The interrupt line is up, so the ISR runs, then the DPC");
    if device.interrupt_pending() && driver.isr(device)? {
        println!("   ISR: the interrupt was ours; acknowledged, DPC queued");
        driver.dpc(device)?;
    }
    print_completions(driver);
    Ok(())
}

fn control_code_scenario(driver: &mut ToyDriver, device: &mut ToyKeypad) -> Result<(), BusError> {
    println!("\n4. Control codes are checked by the I/O manager and by the driver");
    let fields = decode_ioctl(IOCTL_TOY_GET_STATUS);
    println!(
        "   0x{IOCTL_TOY_GET_STATUS:08X}: device type 0x{:04X}, access {}, function 0x{:03X}, method {}",
        fields.device_type, fields.access, fields.function, fields.method
    );
    let cases = [
        (
            "handle without read access",
            control_request(2, IOCTL_TOY_GET_STATUS, 0, 4),
        ),
        (
            "unknown control code",
            control_request(3, IOCTL_TOY_GET_STATUS | 0x3, FILE_READ_DATA, 4),
        ),
        (
            "2-byte output buffer",
            control_request(4, IOCTL_TOY_GET_STATUS, FILE_READ_DATA, 2),
        ),
        (
            "valid request",
            control_request(5, IOCTL_TOY_GET_STATUS, FILE_READ_DATA, 4),
        ),
    ];
    for (label, irp) in cases {
        let status = submit(driver, device, irp)?;
        println!("   {label:<27} -> {status:?}");
    }
    driver.take_completions();
    Ok(())
}

fn overflow_scenario(driver: &mut ToyDriver, device: &mut ToyKeypad) -> Result<(), BusError> {
    println!("\n5. Six events arrive before the driver runs; the device holds four");
    for released in [false, true, false, true, false, true] {
        device.key_event(SCAN_A, released);
    }
    let fields = decode_status(device.read32(STATUS)?);
    println!(
        "   STATUS: data ready {}, overflow {}, {} events waiting",
        fields.data_ready, fields.overflow, fields.count
    );
    if driver.isr(device)? {
        driver.dpc(device)?;
    }
    println!(
        "   the DPC buffered {} events and saw {} overflow",
        driver.buffered_events.len(),
        driver.overflows_seen
    );
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let mut device = ToyKeypad::default();
    let mut driver = ToyDriver::start(&mut device)?;
    pending_read_scenario(&mut driver, &mut device)?;
    control_code_scenario(&mut driver, &mut device)?;
    overflow_scenario(&mut driver, &mut device)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn started() -> (ToyKeypad, ToyDriver) {
        let mut device = ToyKeypad::default();
        let driver = ToyDriver::start(&mut device).unwrap();
        (device, driver)
    }

    #[test]
    fn register_block_matches_the_lesson_figure() {
        let (mut device, _driver) = started();
        device.key_event(SCAN_A, false);
        device.key_event(SCAN_A, true);
        assert_eq!(
            device.debug_view(),
            [
                0x03, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x00, 0x1E, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00,
            ]
        );
        assert_eq!(
            decode_status(0x0201),
            StatusFields {
                data_ready: true,
                overflow: false,
                count: 2,
            }
        );
    }

    #[test]
    fn reading_data_removes_the_front_event() {
        let (mut device, _driver) = started();
        device.key_event(SCAN_A, false);
        device.key_event(SCAN_A, true);
        assert_eq!(device.read32(DATA), Ok(0x1E));
        assert_eq!(device.read32(DATA), Ok(0x9E));
        assert_eq!(device.read32(DATA), Ok(0));
        assert_eq!(device.read32(STATUS), Ok(0));
    }

    #[test]
    fn ack_is_write_one_to_clear() {
        let (mut device, _driver) = started();
        device.key_event(SCAN_A, false);
        assert!(device.interrupt_pending());
        device.write32(ACK, 0).unwrap();
        assert!(device.interrupt_pending(), "writing 0 must change nothing");
        device.write32(ACK, ACK_INTERRUPT).unwrap();
        assert!(!device.interrupt_pending());
    }

    #[test]
    fn a_full_queue_drops_events_and_says_so() {
        let (mut device, _driver) = started();
        for _ in 0..QUEUE_CAPACITY + 2 {
            device.key_event(SCAN_A, false);
        }
        assert_eq!(
            decode_status(device.read32(STATUS).unwrap()),
            StatusFields {
                data_ready: true,
                overflow: true,
                count: 4,
            }
        );
    }

    #[test]
    fn bad_register_accesses_are_rejected() {
        let (mut device, _driver) = started();
        assert_eq!(device.read32(0x02), Err(BusError::Unaligned(0x02)));
        assert_eq!(device.read32(0x10), Err(BusError::OutOfRange(0x10)));
        assert_eq!(device.write32(STATUS, 1), Err(BusError::ReadOnly(STATUS)));
        assert_eq!(
            device.write32(CONTROL, 0x4),
            Err(BusError::ReservedBits {
                offset: CONTROL,
                value: 0x4,
            })
        );
    }

    #[test]
    fn a_disabled_device_ignores_keys() {
        let mut device = ToyKeypad::default();
        device.key_event(SCAN_A, false);
        assert_eq!(device.read32(STATUS), Ok(0));
        assert!(!device.interrupt_pending());
    }

    #[test]
    fn the_control_code_decodes_into_its_fields() {
        assert_eq!(IOCTL_TOY_GET_STATUS, 0x8000_6004);
        assert_eq!(
            decode_ioctl(IOCTL_TOY_GET_STATUS),
            IoctlFields {
                device_type: 0x8000,
                access: FILE_READ_DATA,
                function: 0x801,
                method: METHOD_BUFFERED,
            }
        );
    }

    #[test]
    fn the_io_manager_refuses_a_handle_without_read_access() {
        let (mut device, mut driver) = started();
        let irp = control_request(7, IOCTL_TOY_GET_STATUS, 0, 4);
        assert_eq!(
            submit(&mut driver, &mut device, irp),
            Ok(Status::AccessDenied)
        );
        assert!(
            driver.take_completions().is_empty(),
            "the driver never saw it"
        );
    }

    #[test]
    fn the_driver_compares_the_whole_control_code() {
        let (mut device, mut driver) = started();
        let near_miss = IOCTL_TOY_GET_STATUS | 0x3;
        let irp = control_request(8, near_miss, FILE_READ_DATA, 4);
        assert_eq!(
            submit(&mut driver, &mut device, irp),
            Ok(Status::InvalidDeviceRequest)
        );
    }

    #[test]
    fn a_short_buffer_is_refused_before_anything_is_copied() {
        let (mut device, mut driver) = started();
        let irp = control_request(9, IOCTL_TOY_GET_STATUS, FILE_READ_DATA, 2);
        assert_eq!(
            submit(&mut driver, &mut device, irp),
            Ok(Status::BufferTooSmall)
        );
        assert_eq!(
            driver.take_completions(),
            vec![Completion {
                id: 9,
                status: Status::BufferTooSmall,
                bytes: Vec::new(),
            }]
        );
    }

    #[test]
    fn a_pending_read_completes_after_the_interrupt() {
        let (mut device, mut driver) = started();
        assert_eq!(
            submit(&mut driver, &mut device, read_request(1, 8)),
            Ok(Status::Pending)
        );
        device.key_event(SCAN_A, false);
        device.key_event(SCAN_A, true);
        assert_eq!(driver.isr(&mut device), Ok(true));
        assert!(!device.interrupt_pending());
        driver.dpc(&mut device).unwrap();
        assert_eq!(
            driver.take_completions(),
            vec![Completion {
                id: 1,
                status: Status::Success,
                bytes: vec![0x1E, 0x9E],
            }]
        );
    }

    #[test]
    fn the_isr_ignores_an_interrupt_it_did_not_cause() {
        let (mut device, mut driver) = started();
        assert_eq!(driver.isr(&mut device), Ok(false));
    }

    #[test]
    fn reads_complete_in_order_and_respect_buffer_sizes() {
        let (mut device, mut driver) = started();
        submit(&mut driver, &mut device, read_request(1, 1)).unwrap();
        submit(&mut driver, &mut device, read_request(2, 8)).unwrap();
        for released in [false, true, false] {
            device.key_event(SCAN_A, released);
        }
        assert_eq!(driver.isr(&mut device), Ok(true));
        driver.dpc(&mut device).unwrap();
        let completions = driver.take_completions();
        assert_eq!(completions.len(), 2);
        assert_eq!(
            (completions[0].id, completions[0].bytes.clone()),
            (1, vec![0x1E])
        );
        assert_eq!(
            (completions[1].id, completions[1].bytes.clone()),
            (2, vec![0x9E, 0x1E])
        );
    }
}
