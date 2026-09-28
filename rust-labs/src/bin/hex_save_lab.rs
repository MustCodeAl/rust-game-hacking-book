//! Parse, validate, and patch a toy binary save file.
//!
//! The format is small enough to read by eye in a hex editor. Every field sits
//! at a fixed offset except the name, whose length is stored in the byte just
//! before it, so the checksum's offset depends on that length:
//!
//! ```text
//! offset   size  field
//!  0        4    magic: the ASCII bytes "GSAV" (47 53 41 56)
//!  4        2    format version, u16 little endian
//!  6        4    gold, u32 little endian
//! 10        1    level, u8
//! 11        1    name length n, u8
//! 12        n    name, ASCII
//! 12 + n    4    checksum, u32 little endian: the sum of every earlier byte
//! ```
//!
//! The example save for `Ada`, level 3, with 250 gold is 19 bytes long:
//!
//! ```text
//! 47 53 41 56 01 00 FA 00 00 00 03 03 41 64 61 38 03 00 00
//! ```
//!
//! Everything here works on byte slices in memory, so the rules can be tested
//! without touching a real save.
//!
//! ```text
//! cargo run --bin hex_save_lab
//! cargo test --bin hex_save_lab
//! ```

use std::cmp::Ordering;
use std::fmt::{self, Write as _};

/// The four bytes every save starts with: `G`, `S`, `A`, `V` in ASCII.
const MAGIC: [u8; 4] = *b"GSAV";
/// The only format version this parser has a layout for.
const SUPPORTED_VERSION: u16 = 1;

const MAGIC_OFFSET: usize = 0;
const VERSION_OFFSET: usize = 4;
const GOLD_OFFSET: usize = 6;
const LEVEL_OFFSET: usize = 10;
const NAME_LENGTH_OFFSET: usize = 11;
const NAME_OFFSET: usize = 12;
const CHECKSUM_SIZE: usize = 4;

/// The smallest possible save: the 12-byte fixed header, an empty name, and
/// the four checksum bytes.
const MIN_SAVE_SIZE: usize = NAME_OFFSET + CHECKSUM_SIZE;

/// Bytes per row in the hex dump, as most hex editors show them.
const HEX_ROW: usize = 16;
/// Two hex digits per byte plus one space between neighbours.
const HEX_COLUMN_WIDTH: usize = HEX_ROW * 3 - 1;

/// The example save exactly as it would sit on disk.
const EXAMPLE_SAVE: [u8; 19] = [
    0x47, 0x53, 0x41, 0x56, // magic "GSAV"
    0x01, 0x00, // version 1
    0xFA, 0x00, 0x00, 0x00, // gold 250
    0x03, // level 3
    0x03, // name length 3
    0x41, 0x64, 0x61, // "Ada"
    0x38, 0x03, 0x00, 0x00, // checksum 0x338 = 824
];

/// The decoded contents of one save.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Save {
    version: u16,
    gold: u32,
    level: u8,
    name: String,
}

/// Everything that can make a byte slice unusable as a save.
#[derive(Clone, Debug, PartialEq, Eq)]
enum SaveError {
    /// The slice ends before a field the format requires.
    TooShort { needed: usize, found: usize },
    /// Bytes remain after the checksum, so the length byte and the file size
    /// disagree.
    TrailingBytes { expected: usize, found: usize },
    /// The first four bytes are not `GSAV`, so this is some other kind of file.
    BadMagic([u8; 4]),
    /// A version this parser has no layout for.
    UnsupportedVersion(u16),
    /// The name is not plain ASCII, or is too long for its one-byte length.
    BadName,
    /// The stored checksum does not equal the sum of the bytes it covers.
    ChecksumMismatch { stored: u32, computed: u32 },
}

impl fmt::Display for SaveError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooShort { needed, found } => {
                write!(
                    formatter,
                    "save is too short: needs {needed} bytes, found {found}"
                )
            }
            Self::TrailingBytes { expected, found } => {
                write!(
                    formatter,
                    "save has extra bytes: expected {expected}, found {found}"
                )
            }
            Self::BadMagic(magic) => write!(formatter, "not a GSAV save: starts {magic:02X?}"),
            Self::UnsupportedVersion(version) => {
                write!(formatter, "save version {version} is not supported")
            }
            Self::BadName => write!(formatter, "the name must be ASCII and at most 255 bytes"),
            Self::ChecksumMismatch { stored, computed } => write!(
                formatter,
                "checksum mismatch: stored {stored}, computed {computed}"
            ),
        }
    }
}

impl std::error::Error for SaveError {}

/// Copies `N` bytes starting at `offset`, or reports how many bytes the read
/// needed if the slice ends first.
fn read_array<const N: usize>(bytes: &[u8], offset: usize) -> Result<[u8; N], SaveError> {
    let end = offset.saturating_add(N);
    bytes
        .get(offset..end)
        .and_then(|slice| <[u8; N]>::try_from(slice).ok())
        .ok_or(SaveError::TooShort {
            needed: end,
            found: bytes.len(),
        })
}

/// Overwrites `N` bytes starting at `offset`, exactly like typing over them in
/// a hex editor's overwrite mode. Nothing after the field moves.
fn write_array<const N: usize>(
    bytes: &mut [u8],
    offset: usize,
    value: [u8; N],
) -> Result<(), SaveError> {
    let found = bytes.len();
    let end = offset.saturating_add(N);
    let slot = bytes
        .get_mut(offset..end)
        .ok_or(SaveError::TooShort { needed: end, found })?;
    slot.copy_from_slice(&value);
    Ok(())
}

/// Adds up every byte in `covered`.
///
/// A valid save covers at most the 12 header bytes plus a 255-byte name, 267
/// bytes in all, and 267 × 255 = 68,085 is far below the `u32` limit, so the
/// sum never actually wraps. Wrapping addition only keeps an oversized input
/// from panicking.
fn checksum(covered: &[u8]) -> u32 {
    covered
        .iter()
        .copied()
        .map(u32::from)
        .fold(0, u32::wrapping_add)
}

/// Decodes and validates a complete save.
///
/// The checks run in the order a loader needs them: enough bytes for the fixed
/// header, the magic, the version, a length byte that agrees with the file
/// size, the checksum over everything before it, and readable text.
fn parse(bytes: &[u8]) -> Result<Save, SaveError> {
    if bytes.len() < MIN_SAVE_SIZE {
        return Err(SaveError::TooShort {
            needed: MIN_SAVE_SIZE,
            found: bytes.len(),
        });
    }

    let magic = read_array::<4>(bytes, MAGIC_OFFSET)?;
    if magic != MAGIC {
        return Err(SaveError::BadMagic(magic));
    }

    let version = u16::from_le_bytes(read_array::<2>(bytes, VERSION_OFFSET)?);
    if version != SUPPORTED_VERSION {
        return Err(SaveError::UnsupportedVersion(version));
    }

    // The name's length decides where the checksum lives, so the file size
    // must agree with it before any later field is read.
    let [name_length] = read_array::<1>(bytes, NAME_LENGTH_OFFSET)?;
    let checksum_offset = NAME_OFFSET + usize::from(name_length);
    let expected = checksum_offset + CHECKSUM_SIZE;
    match bytes.len().cmp(&expected) {
        Ordering::Less => {
            return Err(SaveError::TooShort {
                needed: expected,
                found: bytes.len(),
            });
        }
        Ordering::Greater => {
            return Err(SaveError::TrailingBytes {
                expected,
                found: bytes.len(),
            });
        }
        Ordering::Equal => {}
    }

    // In bounds: the length check above made `bytes.len()` equal
    // `checksum_offset + 4`.
    let covered = &bytes[..checksum_offset];
    let stored = u32::from_le_bytes(read_array::<4>(bytes, checksum_offset)?);
    let computed = checksum(covered);
    if stored != computed {
        return Err(SaveError::ChecksumMismatch { stored, computed });
    }

    let name_bytes = &covered[NAME_OFFSET..];
    if !name_bytes.is_ascii() {
        return Err(SaveError::BadName);
    }
    let [level] = read_array::<1>(bytes, LEVEL_OFFSET)?;

    Ok(Save {
        version,
        gold: u32::from_le_bytes(read_array::<4>(bytes, GOLD_OFFSET)?),
        level,
        name: name_bytes.iter().copied().map(char::from).collect(),
    })
}

/// Serializes a save and writes a fresh checksum over every byte before it.
fn encode(save: &Save) -> Result<Vec<u8>, SaveError> {
    if save.version != SUPPORTED_VERSION {
        return Err(SaveError::UnsupportedVersion(save.version));
    }
    if !save.name.is_ascii() {
        return Err(SaveError::BadName);
    }
    let name_length = u8::try_from(save.name.len()).map_err(|_| SaveError::BadName)?;

    let checksum_offset = NAME_OFFSET + save.name.len();
    let mut bytes = vec![0_u8; checksum_offset + CHECKSUM_SIZE];
    write_array(&mut bytes, MAGIC_OFFSET, MAGIC)?;
    write_array(&mut bytes, VERSION_OFFSET, save.version.to_le_bytes())?;
    write_array(&mut bytes, GOLD_OFFSET, save.gold.to_le_bytes())?;
    write_array(&mut bytes, LEVEL_OFFSET, [save.level])?;
    write_array(&mut bytes, NAME_LENGTH_OFFSET, [name_length])?;
    bytes[NAME_OFFSET..checksum_offset].copy_from_slice(save.name.as_bytes());

    let sum = checksum(&bytes[..checksum_offset]);
    write_array(&mut bytes, checksum_offset, sum.to_le_bytes())?;
    Ok(bytes)
}

/// Changes the gold field in a copy of the save and recomputes the checksum,
/// the way a correct save editor must.
///
/// The original is validated first, so a damaged save is never "repaired" by
/// giving it a checksum that matches its damage.
fn patch_gold(original: &[u8], gold: u32) -> Result<Vec<u8>, SaveError> {
    let save = parse(original)?;
    let checksum_offset = NAME_OFFSET + save.name.len();

    let mut patched = original.to_vec();
    write_array(&mut patched, GOLD_OFFSET, gold.to_le_bytes())?;
    let sum = checksum(&patched[..checksum_offset]);
    write_array(&mut patched, checksum_offset, sum.to_le_bytes())?;
    Ok(patched)
}

/// The edit that breaks the save: the gold bytes change, the checksum does not.
fn patch_gold_without_checksum(original: &[u8], gold: u32) -> Result<Vec<u8>, SaveError> {
    parse(original)?;
    let mut patched = original.to_vec();
    write_array(&mut patched, GOLD_OFFSET, gold.to_le_bytes())?;
    Ok(patched)
}

/// Lists every offset where two files hold different bytes, as a hex editor's
/// compare view does. Bytes present in only the longer file count as
/// different.
fn differing_offsets(left: &[u8], right: &[u8]) -> Vec<usize> {
    let shared = left.len().min(right.len());
    let longer = left.len().max(right.len());
    left.iter()
        .zip(right)
        .enumerate()
        .filter_map(|(offset, (a, b))| (a != b).then_some(offset))
        .chain(shared..longer)
        .collect()
}

/// The character a hex editor shows for one byte: printable ASCII as itself,
/// everything else as a dot.
fn printable(byte: u8) -> char {
    if byte == b' ' || byte.is_ascii_graphic() {
        char::from(byte)
    } else {
        '.'
    }
}

/// Formats bytes the way a hex editor shows them: an offset column, sixteen
/// bytes per row in hex, and a character column.
fn hex_dump(bytes: &[u8]) -> String {
    let width = HEX_COLUMN_WIDTH;
    let mut dump = String::new();
    for (row, chunk) in bytes.chunks(HEX_ROW).enumerate() {
        let offset = row * HEX_ROW;
        let hex = chunk
            .iter()
            .map(|byte| format!("{byte:02X}"))
            .collect::<Vec<_>>()
            .join(" ");
        let text: String = chunk.iter().copied().map(printable).collect();
        // Writing into a `String` cannot fail, so the result carries nothing.
        let _ = writeln!(dump, "{offset:08X}  {hex:<width$}  {text}");
    }
    dump
}

fn main() -> Result<(), SaveError> {
    println!("1. The example save, as a hex editor shows it");
    print!("{}", hex_dump(&EXAMPLE_SAVE));

    let save = parse(&EXAMPLE_SAVE)?;
    let checksum_offset = NAME_OFFSET + save.name.len();
    println!("\n2. Decoded: {save:?}");
    println!(
        "   sum of bytes 0 to {} = {}",
        checksum_offset - 1,
        checksum(&EXAMPLE_SAVE[..checksum_offset])
    );
    println!(
        "   encoding those fields again gives the same bytes: {}",
        encode(&save)? == EXAMPLE_SAVE
    );

    println!("\n3. The same save with 1,250 gold and a recomputed checksum");
    let richer = patch_gold(&EXAMPLE_SAVE, 1250)?;
    print!("{}", hex_dump(&richer));
    println!(
        "   offsets that differ from the original: {:?}",
        differing_offsets(&EXAMPLE_SAVE, &richer)
    );

    println!("\n4. Gold set to 9,999 without fixing the checksum");
    let broken = patch_gold_without_checksum(&EXAMPLE_SAVE, 9999)?;
    match parse(&broken) {
        Ok(save) => println!("   unexpectedly accepted: {save:?}"),
        Err(error) => println!("   the loader refuses it: {error}"),
    }

    println!("\n5. Other damage the parser refuses");
    let mut wrong_magic = EXAMPLE_SAVE;
    wrong_magic[MAGIC_OFFSET] = b'X';
    let cases: [(&str, &[u8]); 3] = [
        ("first byte typed over with X", &wrong_magic),
        ("file cut off after 10 bytes", &EXAMPLE_SAVE[..10]),
        ("last checksum byte missing", &EXAMPLE_SAVE[..18]),
    ];
    for (label, bytes) in cases {
        match parse(bytes) {
            Ok(save) => println!("   {label}: unexpectedly accepted {save:?}"),
            Err(error) => println!("   {label}: {error}"),
        }
    }

    println!("\n6. A five-letter name moves the checksum from offset 15 to 17");
    let grace = encode(&Save {
        name: String::from("Grace"),
        ..save
    })?;
    print!("{}", hex_dump(&grace));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        EXAMPLE_SAVE, NAME_LENGTH_OFFSET, Save, SaveError, checksum, differing_offsets, encode,
        hex_dump, parse, patch_gold, patch_gold_without_checksum,
    };

    fn ada() -> Save {
        Save {
            version: 1,
            gold: 250,
            level: 3,
            name: String::from("Ada"),
        }
    }

    #[test]
    fn the_example_decodes_to_its_documented_fields() {
        assert_eq!(parse(&EXAMPLE_SAVE), Ok(ada()));
    }

    #[test]
    fn the_example_checksum_is_the_byte_sum_824() {
        // 305 (GSAV) + 1 (version) + 250 (gold) + 3 + 3 + 262 (Ada) = 824.
        assert_eq!(checksum(&EXAMPLE_SAVE[..15]), 824);
        assert_eq!(824, 0x338);
        assert_eq!(EXAMPLE_SAVE[15..], [0x38, 0x03, 0x00, 0x00]);
    }

    #[test]
    fn encoding_the_fields_reproduces_the_example_bytes() {
        assert_eq!(encode(&ada()).as_deref(), Ok(&EXAMPLE_SAVE[..]));
    }

    #[test]
    fn patching_gold_to_1250_rewrites_gold_and_checksum() {
        let patched = patch_gold(&EXAMPLE_SAVE, 1250).expect("the example is valid");
        // 1250 = 0x4E2, and 824 - 250 + (0xE2 + 0x04) = 804 = 0x324.
        assert_eq!(
            patched,
            [
                0x47, 0x53, 0x41, 0x56, 0x01, 0x00, 0xE2, 0x04, 0x00, 0x00, 0x03, 0x03, 0x41, 0x64,
                0x61, 0x24, 0x03, 0x00, 0x00,
            ]
        );
        assert_eq!(checksum(&patched[..15]), 804);
        assert_eq!(parse(&patched).map(|save| save.gold), Ok(1250));
    }

    #[test]
    fn comparing_two_saves_finds_the_gold_and_checksum_bytes() {
        let patched = patch_gold(&EXAMPLE_SAVE, 1250).expect("the example is valid");
        assert_eq!(differing_offsets(&EXAMPLE_SAVE, &patched), vec![6, 7, 15]);
    }

    #[test]
    fn gold_patched_without_the_checksum_is_rejected() {
        let broken =
            patch_gold_without_checksum(&EXAMPLE_SAVE, 9999).expect("the example is valid");
        // 9999 = 0x270F, and 824 - 250 + (0x0F + 0x27) = 628.
        assert_eq!(broken[6..10], [0x0F, 0x27, 0x00, 0x00]);
        assert_eq!(
            parse(&broken),
            Err(SaveError::ChecksumMismatch {
                stored: 824,
                computed: 628,
            })
        );
    }

    #[test]
    fn one_changed_level_byte_moves_the_sum_by_one() {
        let mut edited = EXAMPLE_SAVE;
        edited[10] = 4;
        assert_eq!(
            parse(&edited),
            Err(SaveError::ChecksumMismatch {
                stored: 824,
                computed: 825,
            })
        );
    }

    #[test]
    fn wrong_magic_is_rejected_before_anything_else() {
        let mut wrong = EXAMPLE_SAVE;
        wrong[0] = b'X';
        assert_eq!(parse(&wrong), Err(SaveError::BadMagic(*b"XSAV")));
    }

    #[test]
    fn an_unknown_version_is_rejected() {
        let mut newer = EXAMPLE_SAVE;
        newer[4] = 2;
        assert_eq!(parse(&newer), Err(SaveError::UnsupportedVersion(2)));
    }

    #[test]
    fn short_files_are_rejected() {
        assert_eq!(
            parse(&[]),
            Err(SaveError::TooShort {
                needed: 16,
                found: 0,
            })
        );
        assert_eq!(
            parse(&EXAMPLE_SAVE[..10]),
            Err(SaveError::TooShort {
                needed: 16,
                found: 10,
            })
        );
        assert_eq!(
            parse(&EXAMPLE_SAVE[..18]),
            Err(SaveError::TooShort {
                needed: 19,
                found: 18,
            })
        );
    }

    #[test]
    fn a_length_byte_larger_than_the_file_is_rejected() {
        let mut lying = EXAMPLE_SAVE;
        lying[NAME_LENGTH_OFFSET] = 200;
        // 12 header bytes + 200 name bytes + 4 checksum bytes = 216.
        assert_eq!(
            parse(&lying),
            Err(SaveError::TooShort {
                needed: 216,
                found: 19,
            })
        );
    }

    #[test]
    fn trailing_bytes_are_rejected() {
        let mut longer = EXAMPLE_SAVE.to_vec();
        longer.push(0);
        assert_eq!(
            parse(&longer),
            Err(SaveError::TrailingBytes {
                expected: 19,
                found: 20,
            })
        );
    }

    #[test]
    fn a_longer_name_moves_the_checksum() {
        let grace = Save {
            name: String::from("Grace"),
            ..ada()
        };
        let bytes = encode(&grace).expect("the name is short ASCII");
        // 12 + 5 = 17, so the checksum sits at 17..21 and the file is 21 bytes.
        // 559 (bytes 0 to 10) + 5 (length) + 482 (Grace) = 1046 = 0x416.
        assert_eq!(bytes.len(), 21);
        assert_eq!(bytes[17..], [0x16, 0x04, 0x00, 0x00]);
        assert_eq!(parse(&bytes), Ok(grace));
    }

    #[test]
    fn names_that_do_not_fit_the_format_are_refused() {
        let accented = Save {
            name: String::from("Zoë"),
            ..ada()
        };
        let too_long = Save {
            name: "A".repeat(256),
            ..ada()
        };
        assert_eq!(encode(&accented), Err(SaveError::BadName));
        assert_eq!(encode(&too_long), Err(SaveError::BadName));
    }

    #[test]
    fn the_dump_matches_a_hex_editor_row() {
        let dump = hex_dump(&EXAMPLE_SAVE);
        let mut lines = dump.lines();
        assert_eq!(
            lines.next(),
            Some("00000000  47 53 41 56 01 00 FA 00 00 00 03 03 41 64 61 38  GSAV........Ada8")
        );
        let second = lines.next().expect("19 bytes need two rows");
        assert!(second.starts_with("00000010  03 00 00 "));
        assert!(second.ends_with("  ..."));
        assert_eq!(lines.next(), None);
    }
}
