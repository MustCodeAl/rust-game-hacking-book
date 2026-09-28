//! Safe labs for the advanced memory-model chapter.
//!
//! The DMA module reads ordinary capture files. It does not talk to hardware,
//! install a driver, write memory, or bypass an IOMMU or anti-cheat system.

pub mod crypto;
pub mod dma;
pub mod obfuscation;
