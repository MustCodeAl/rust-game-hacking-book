//! Authenticated encryption for a small save-file payload.

use chacha20poly1305::{
    XChaCha20Poly1305, XNonce,
    aead::{Aead, Generate, KeyInit, Payload},
};
use std::{error::Error, fmt};

const NONCE_LENGTH: usize = 24;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CryptoError {
    TruncatedEnvelope,
    AuthenticationFailed,
}

impl fmt::Display for CryptoError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TruncatedEnvelope => {
                formatter.write_str("encrypted envelope is shorter than its nonce")
            }
            Self::AuthenticationFailed => {
                formatter.write_str("ciphertext, key, nonce, or context did not authenticate")
            }
        }
    }
}

impl Error for CryptoError {}

/// Return `nonce || ciphertext || authentication tag`.
///
/// # Errors
///
/// Returns [`CryptoError::AuthenticationFailed`] if the cryptographic library
/// cannot seal the payload.
pub fn seal(
    key: &[u8; 32],
    plaintext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let cipher = XChaCha20Poly1305::new(key.into());
    let nonce = XNonce::generate();
    let ciphertext = cipher
        .encrypt(
            &nonce,
            Payload {
                msg: plaintext,
                aad: associated_data,
            },
        )
        .map_err(|_| CryptoError::AuthenticationFailed)?;

    let mut envelope = Vec::with_capacity(NONCE_LENGTH + ciphertext.len());
    envelope.extend_from_slice(&nonce);
    envelope.extend_from_slice(&ciphertext);
    Ok(envelope)
}

/// Open and authenticate an envelope produced by [`seal`].
///
/// # Errors
///
/// Returns [`CryptoError::TruncatedEnvelope`] when the nonce is missing, or
/// [`CryptoError::AuthenticationFailed`] when the key, ciphertext, nonce, tag,
/// or associated data does not authenticate.
pub fn open(
    key: &[u8; 32],
    envelope: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let (nonce_bytes, ciphertext) = envelope
        .split_at_checked(NONCE_LENGTH)
        .ok_or(CryptoError::TruncatedEnvelope)?;
    let cipher = XChaCha20Poly1305::new(key.into());
    let nonce = XNonce::try_from(nonce_bytes).map_err(|_| CryptoError::TruncatedEnvelope)?;

    cipher
        .decrypt(
            &nonce,
            Payload {
                msg: ciphertext,
                aad: associated_data,
            },
        )
        .map_err(|_| CryptoError::AuthenticationFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; 32] = [0x42; 32];
    const CONTEXT: &[u8] = b"save-slot:3|format:1";

    #[test]
    fn round_trip_preserves_the_save_payload() {
        let envelope = seal(&KEY, b"health=75;gold=12", CONTEXT).unwrap();
        assert_eq!(
            open(&KEY, &envelope, CONTEXT).unwrap(),
            b"health=75;gold=12"
        );
    }

    #[test]
    fn changing_ciphertext_is_detected() {
        let mut envelope = seal(&KEY, b"health=75", CONTEXT).unwrap();
        let last = envelope.last_mut().unwrap();
        *last ^= 1;
        assert_eq!(
            open(&KEY, &envelope, CONTEXT),
            Err(CryptoError::AuthenticationFailed)
        );
    }

    #[test]
    fn associated_data_is_part_of_authentication() {
        let envelope = seal(&KEY, b"health=75", CONTEXT).unwrap();
        assert_eq!(
            open(&KEY, &envelope, b"save-slot:4|format:1"),
            Err(CryptoError::AuthenticationFailed)
        );
    }
}
