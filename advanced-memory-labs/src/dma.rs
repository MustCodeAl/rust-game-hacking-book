//! Read-only x86-64 virtual-address translation over an offline RAM capture.

use std::{error::Error, fmt, fs, path::Path};

const ENTRY_SIZE: u64 = 8;
const INDEX_MASK: u64 = 0x1FF;
const PRESENT: u64 = 1;
const LARGE_PAGE: u64 = 1 << 7;
const PAGE_OFFSET_MASK: u64 = 0xFFF;
const TABLE_ADDRESS_MASK: u64 = 0x000F_FFFF_FFFF_F000;
const ONE_GIB_ADDRESS_MASK: u64 = 0x000F_FFFF_C000_0000;
const TWO_MIB_ADDRESS_MASK: u64 = 0x000F_FFFF_FFE0_0000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PhysicalAddress(pub u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VirtualAddress(pub u64);

#[derive(Debug)]
pub enum MemoryError {
    Io(std::io::Error),
    NonCanonical(VirtualAddress),
    OutOfRange {
        address: PhysicalAddress,
        length: usize,
    },
    NotPresent {
        level: &'static str,
        entry_address: PhysicalAddress,
    },
}

impl fmt::Display for MemoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "could not read capture: {error}"),
            Self::NonCanonical(address) => {
                write!(
                    formatter,
                    "0x{:016X} is not a canonical x86-64 virtual address",
                    address.0
                )
            }
            Self::OutOfRange { address, length } => write!(
                formatter,
                "physical range 0x{:X}..+{length} is outside the capture",
                address.0
            ),
            Self::NotPresent {
                level,
                entry_address,
            } => write!(
                formatter,
                "{level} entry at physical 0x{:X} is not present",
                entry_address.0
            ),
        }
    }
}

impl Error for MemoryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            _ => None,
        }
    }
}

impl From<std::io::Error> for MemoryError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

#[derive(Debug, Clone)]
pub struct Capture {
    bytes: Vec<u8>,
}

impl Capture {
    /// Load an ordinary file as an offline physical-memory image.
    ///
    /// # Errors
    ///
    /// Returns [`MemoryError::Io`] when the file cannot be read.
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self, MemoryError> {
        Ok(Self {
            bytes: fs::read(path)?,
        })
    }

    #[must_use]
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        Self { bytes }
    }

    /// Copy bytes from one bounded physical range in the capture.
    ///
    /// # Errors
    ///
    /// Returns [`MemoryError::OutOfRange`] when any requested byte lies outside
    /// the capture.
    pub fn read_physical(
        &self,
        address: PhysicalAddress,
        output: &mut [u8],
    ) -> Result<(), MemoryError> {
        let start = usize::try_from(address.0).map_err(|_| MemoryError::OutOfRange {
            address,
            length: output.len(),
        })?;
        let end = start
            .checked_add(output.len())
            .ok_or(MemoryError::OutOfRange {
                address,
                length: output.len(),
            })?;
        let source = self.bytes.get(start..end).ok_or(MemoryError::OutOfRange {
            address,
            length: output.len(),
        })?;
        output.copy_from_slice(source);
        Ok(())
    }

    fn read_u64(&self, address: PhysicalAddress) -> Result<u64, MemoryError> {
        let mut bytes = [0_u8; 8];
        self.read_physical(address, &mut bytes)?;
        Ok(u64::from_le_bytes(bytes))
    }

    /// Translate one canonical x86-64 virtual address through four-level page tables.
    ///
    /// # Errors
    ///
    /// Returns [`MemoryError::NonCanonical`] for an invalid virtual address,
    /// [`MemoryError::NotPresent`] for a missing mapping, or
    /// [`MemoryError::OutOfRange`] when a table entry is outside the capture.
    pub fn translate_x86_64(
        &self,
        cr3: PhysicalAddress,
        virtual_address: VirtualAddress,
    ) -> Result<PhysicalAddress, MemoryError> {
        ensure_canonical(virtual_address)?;
        let value = virtual_address.0;
        let root = cr3.0 & TABLE_ADDRESS_MASK;

        let pml4e = self.table_entry(root, (value >> 39) & INDEX_MASK, "PML4")?;
        let pdpte = self.table_entry(
            pml4e & TABLE_ADDRESS_MASK,
            (value >> 30) & INDEX_MASK,
            "PDPT",
        )?;
        if pdpte & LARGE_PAGE != 0 {
            return Ok(PhysicalAddress(
                (pdpte & ONE_GIB_ADDRESS_MASK) | (value & 0x3FFF_FFFF),
            ));
        }

        let pde = self.table_entry(
            pdpte & TABLE_ADDRESS_MASK,
            (value >> 21) & INDEX_MASK,
            "page directory",
        )?;
        if pde & LARGE_PAGE != 0 {
            return Ok(PhysicalAddress(
                (pde & TWO_MIB_ADDRESS_MASK) | (value & 0x1F_FFFF),
            ));
        }

        let pte = self.table_entry(
            pde & TABLE_ADDRESS_MASK,
            (value >> 12) & INDEX_MASK,
            "page table",
        )?;
        Ok(PhysicalAddress(
            (pte & TABLE_ADDRESS_MASK) | (value & PAGE_OFFSET_MASK),
        ))
    }

    /// Copy a virtual range, translating again at every crossed page boundary.
    ///
    /// # Errors
    ///
    /// Returns any address-validation, missing-mapping, or capture-bounds error
    /// found while translating and copying the requested range.
    pub fn read_virtual(
        &self,
        cr3: PhysicalAddress,
        address: VirtualAddress,
        length: usize,
    ) -> Result<Vec<u8>, MemoryError> {
        let mut output = vec![0_u8; length];
        let mut completed = 0_usize;

        while completed < length {
            let completed_u64 = u64::try_from(completed).map_err(|_| MemoryError::OutOfRange {
                address: PhysicalAddress(u64::MAX),
                length,
            })?;
            let current_virtual = VirtualAddress(
                address
                    .0
                    .checked_add(completed_u64)
                    .ok_or(MemoryError::NonCanonical(address))?,
            );
            let physical = self.translate_x86_64(cr3, current_virtual)?;
            let page_offset = usize::try_from(physical.0 & PAGE_OFFSET_MASK).map_err(|_| {
                MemoryError::OutOfRange {
                    address: physical,
                    length,
                }
            })?;
            let bytes_left_in_page = 0x1000 - page_offset;
            let chunk_length = bytes_left_in_page.min(length - completed);
            self.read_physical(physical, &mut output[completed..completed + chunk_length])?;
            completed += chunk_length;
        }

        Ok(output)
    }

    fn table_entry(&self, table: u64, index: u64, level: &'static str) -> Result<u64, MemoryError> {
        let entry_address = PhysicalAddress(table + index * ENTRY_SIZE);
        let entry = self.read_u64(entry_address)?;
        if entry & PRESENT == 0 {
            return Err(MemoryError::NotPresent {
                level,
                entry_address,
            });
        }
        Ok(entry)
    }
}

fn ensure_canonical(address: VirtualAddress) -> Result<(), MemoryError> {
    let upper = address.0 >> 48;
    let sign_bit = (address.0 >> 47) & 1;
    let expected = if sign_bit == 0 { 0 } else { 0xFFFF };
    if upper == expected {
        Ok(())
    } else {
        Err(MemoryError::NonCanonical(address))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CR3: PhysicalAddress = PhysicalAddress(0x1000);
    const TEST_VA: VirtualAddress = VirtualAddress(0x0123);

    fn put_u64(memory: &mut [u8], address: usize, value: u64) {
        memory[address..address + 8].copy_from_slice(&value.to_le_bytes());
    }

    fn four_level_capture() -> Capture {
        let mut bytes = vec![0_u8; 0x7000];
        put_u64(&mut bytes, 0x1000, 0x2000 | PRESENT);
        put_u64(&mut bytes, 0x2000, 0x3000 | PRESENT);
        put_u64(&mut bytes, 0x3000, 0x4000 | PRESENT);
        put_u64(&mut bytes, 0x4000, 0x5000 | PRESENT);
        bytes[0x5123..0x512A].copy_from_slice(b"GHA DMA");
        Capture::from_bytes(bytes)
    }

    #[test]
    fn translates_a_four_level_mapping() {
        let capture = four_level_capture();
        assert_eq!(
            capture.translate_x86_64(CR3, TEST_VA).unwrap(),
            PhysicalAddress(0x5123)
        );
    }

    #[test]
    fn reads_virtual_bytes_from_the_capture() {
        let capture = four_level_capture();
        assert_eq!(capture.read_virtual(CR3, TEST_VA, 7).unwrap(), b"GHA DMA");
    }

    #[test]
    fn reports_a_missing_mapping() {
        let capture = Capture::from_bytes(vec![0_u8; 0x2000]);
        assert!(matches!(
            capture.translate_x86_64(CR3, TEST_VA),
            Err(MemoryError::NotPresent { level: "PML4", .. })
        ));
    }

    #[test]
    fn rejects_noncanonical_addresses() {
        let capture = four_level_capture();
        assert!(matches!(
            capture.translate_x86_64(CR3, VirtualAddress(0x0001_0000_0000_0000)),
            Err(MemoryError::NonCanonical(_))
        ));
    }
}
