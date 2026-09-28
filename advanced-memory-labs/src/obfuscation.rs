//! A deliberately simple value transformation for learning data-flow analysis.
//!
//! This is obfuscation, not encryption. Anyone who recovers the transform and
//! key can decode the value.

const ROTATION: u32 = 7;
const TAG_MULTIPLIER: u32 = 0x9E37_79B1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ObfuscatedStat {
    encoded: u32,
    tag: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IntegrityError;

impl ObfuscatedStat {
    #[must_use]
    pub fn new(value: u32, key: u32) -> Self {
        let encoded = encode(value, key);
        Self {
            encoded,
            tag: make_tag(encoded, key),
        }
    }

    /// Decode only after checking that the stored bytes still agree.
    ///
    /// # Errors
    ///
    /// Returns [`IntegrityError`] when the stored tag does not match the encoded
    /// value and supplied key.
    pub fn read(self, key: u32) -> Result<u32, IntegrityError> {
        if self.tag != make_tag(self.encoded, key) {
            return Err(IntegrityError);
        }

        Ok(decode(self.encoded, key))
    }

    pub fn update(&mut self, value: u32, key: u32) {
        *self = Self::new(value, key);
    }

    /// Test helper that simulates a corrupted capture.
    pub fn flip_encoded_bit(&mut self, bit: u32) {
        if bit < u32::BITS {
            self.encoded ^= 1_u32 << bit;
        }
    }

    #[must_use]
    pub const fn encoded(self) -> u32 {
        self.encoded
    }
}

#[must_use]
pub const fn encode(value: u32, key: u32) -> u32 {
    (value ^ key).rotate_left(ROTATION)
}

#[must_use]
pub const fn decode(encoded: u32, key: u32) -> u32 {
    encoded.rotate_right(ROTATION) ^ key
}

const fn make_tag(encoded: u32, key: u32) -> u32 {
    encoded.wrapping_mul(TAG_MULTIPLIER).rotate_left(11) ^ key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_recovers_the_original_value() {
        let stat = ObfuscatedStat::new(125, 0xA1B2_C3D4);
        assert_eq!(stat.read(0xA1B2_C3D4), Ok(125));
    }

    #[test]
    fn a_changed_byte_fails_the_toy_integrity_check() {
        let mut stat = ObfuscatedStat::new(125, 0xA1B2_C3D4);
        stat.flip_encoded_bit(3);
        assert_eq!(stat.read(0xA1B2_C3D4), Err(IntegrityError));
    }
}
