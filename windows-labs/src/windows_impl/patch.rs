use anyhow::Result;

use super::Process;

/// A verified replacement for one fixed-size span of remote machine code.
#[derive(Clone, Debug)]
pub struct PatchPlan {
    /// Address at which the expected instruction bytes must begin.
    pub address: usize,
    /// Bytes that identify the supported game build.
    pub expected: Vec<u8>,
    /// Same-length bytes written after verification succeeds.
    pub replacement: Vec<u8>,
}

impl PatchPlan {
    /// Builds a plan whose expected and replacement spans have equal lengths.
    ///
    /// # Errors
    ///
    /// Returns an error for an empty patch or mismatched span lengths.
    pub fn new(address: usize, expected: &[u8], replacement: &[u8]) -> Result<Self> {
        anyhow::ensure!(!expected.is_empty(), "a patch cannot be empty");
        anyhow::ensure!(
            expected.len() == replacement.len(),
            "expected and replacement lengths must match"
        );
        Ok(Self {
            address,
            expected: expected.to_vec(),
            replacement: replacement.to_vec(),
        })
    }

    /// Verifies the live bytes and applies the replacement.
    ///
    /// # Errors
    ///
    /// Returns an error when memory cannot be read or written, or when the live
    /// bytes do not match the supported game build.
    pub fn apply<'a>(&self, process: &'a Process) -> Result<AppliedPatch<'a>> {
        let found = process.read_bytes(self.address, self.expected.len())?;
        anyhow::ensure!(
            found == self.expected,
            "bytes at {:#x} do not match this game profile",
            self.address
        );
        process.write_code(self.address, &self.replacement)?;
        Ok(AppliedPatch {
            process,
            address: self.address,
            original: self.expected.clone(),
            active: true,
        })
    }
}

/// An active remote patch that restores its original bytes when dropped.
#[derive(Debug)]
pub struct AppliedPatch<'a> {
    process: &'a Process,
    address: usize,
    original: Vec<u8>,
    active: bool,
}

impl AppliedPatch<'_> {
    /// Restores the captured bytes. Calling this more than once is harmless.
    ///
    /// # Errors
    ///
    /// Returns an error when Windows cannot write the original bytes.
    pub fn restore(&mut self) -> Result<()> {
        if self.active {
            self.process.write_code(self.address, &self.original)?;
            self.active = false;
        }
        Ok(())
    }
}

impl Drop for AppliedPatch<'_> {
    fn drop(&mut self) {
        if let Err(error) = self.restore() {
            eprintln!("warning: could not restore patch: {error:#}");
        }
    }
}
