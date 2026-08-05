use anyhow::Result;

use super::Process;

#[derive(Clone, Debug)]
pub struct PatchPlan {
    pub address: usize,
    pub expected: Vec<u8>,
    pub replacement: Vec<u8>,
}

impl PatchPlan {
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

pub struct AppliedPatch<'a> {
    process: &'a Process,
    address: usize,
    original: Vec<u8>,
    active: bool,
}

impl AppliedPatch<'_> {
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
