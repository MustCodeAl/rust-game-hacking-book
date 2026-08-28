---
title: Encryption, Hashes, and Key Lifecycles
author: attilathedud
date: 2026-08-14
category: Files, Mods & Trust
layout: post
permalink: /pages/9/08/
chapter: "9.8"
minutes: 42
summary: Separate encoding, hashing, MACs, encryption, and authenticated encryption, then protect a toy save payload with current RustCrypto APIs.
---

## Five tools with different jobs

These words are often mixed together. Their jobs are not interchangeable:

| Tool | Reversible? | Secret required? | Main job |
|---|---:|---:|---|
| Encoding | Yes | No | Represent data, such as Base64 or UTF-8 |
| Hash | No | No | Produce a fixed-size fingerprint |
| MAC | No | Yes | Detect changes made without the secret key |
| Encryption | Yes, with key | Yes | Hide the plaintext |
| AEAD | Yes, with key | Yes | Hide plaintext **and** authenticate it and its context |

AEAD means *authenticated encryption with associated data*. It is usually the right starting point for a new encrypted file or message because confidentiality without tamper detection is incomplete.

## Start with the threat model, not the cipher name

Before choosing an algorithm, write four plain-English statements:

1. **Asset:** what information or game state needs protection?
2. **Adversary:** what can the person you are defending against read, change, or
   execute?
3. **Property:** do you need confidentiality, integrity, authenticity,
   availability, or some combination?
4. **Trust boundary:** which program, account, or server is allowed to hold the
   key and make the final decision?

For an offline single-player save, the player controls the same PC that must decrypt
the save. Encryption can protect the file from casual disclosure or accidental
editing, but it cannot create a server-like secret boundary by itself. If the game
ships a key and must use it locally, a determined owner can observe that use. For a
server-authoritative multiplayer profile, the server can keep the authoritative key
and state outside the client's control.

This does not make local encryption useless. It makes its promise precise. Security
engineering starts by choosing a realistic promise, then checks whether the
mechanism actually enforces it.

## The parts of an encrypted envelope

The lab uses XChaCha20-Poly1305 from the RustCrypto `chacha20poly1305` crate. One envelope contains:

```text
24-byte nonce | ciphertext | 16-byte authentication tag
```

The nonce is not a password and does not need to be hidden. It must be unique for messages protected by the same key. XChaCha20’s larger nonce makes random generation practical, but the program still stores it with the ciphertext so decryption can use the same value.

## Associated data protects context

Some information should remain readable but must not be silently swapped. The lab authenticates this context:

```text
save-slot:3|format:1
```

If someone moves the ciphertext to slot four or claims it uses another format, opening it fails. The associated data is not encrypted; it is included in the authentication calculation.

## Complete sealing code

```rust
use chacha20poly1305::{
    XChaCha20Poly1305, XNonce,
    aead::{Aead, Generate, KeyInit, Payload},
};

fn seal(key: &[u8; 32], plaintext: &[u8], context: &[u8]) -> Result<Vec<u8>, ()> {
    let cipher = XChaCha20Poly1305::new(key.into());
    let nonce = XNonce::generate(); // 🎲 New nonce for this message.
    let ciphertext = cipher
        .encrypt(&nonce, Payload { msg: plaintext, aad: context })
        .map_err(|_| ())?;

    let mut envelope = Vec::with_capacity(24 + ciphertext.len());
    envelope.extend_from_slice(&nonce);
    envelope.extend_from_slice(&ciphertext);
    Ok(envelope)
}
```

The complete lab returns descriptive errors and includes tests. Its dependency is pinned by `Cargo.lock`:

```toml
chacha20poly1305 = { version = "0.11", features = ["getrandom"] }
```

This uses the current 0.11 API documented by [RustCrypto](https://docs.rs/chacha20poly1305/latest/chacha20poly1305/).

## Opening must fail closed

Decryption splits the nonce from the envelope, then authenticates both ciphertext and context:

```rust
let (nonce_bytes, ciphertext) = envelope
    .split_at_checked(24)
    .ok_or(CryptoError::TruncatedEnvelope)?;
let nonce = XNonce::try_from(nonce_bytes)
    .map_err(|_| CryptoError::TruncatedEnvelope)?;

cipher
    .decrypt(&nonce, Payload { msg: ciphertext, aad: context })
    .map_err(|_| CryptoError::AuthenticationFailed)
```

Do not return partly decrypted data after an authentication error. Do not explain whether the key, nonce, tag, context, or ciphertext was wrong to an untrusted caller; one generic failure avoids turning error messages into an oracle.

## The key is the hard part

Perfect encryption code with a key committed to Git is still broken. A save
editor or local game tool that protects player data needs answers to:

- Where is the key created?
- Is it unique per user, device, or save?
- Where is it stored?
- Which process may request it?
- How is it rotated?
- What happens to old saves?
- How is it erased from temporary buffers?

For a Windows game tool, protected operating-system storage may be more
appropriate than a constant in the executable. A server-authoritative game may
keep important secrets on the server instead of trusting every client. The
correct choice depends on what game data the key protects and who must be able
to open it.

The demo uses a visible repeated key only to make one local round trip
repeatable. A real save or profile tool must load protected key material instead
of compiling the key into the executable.

Think of a key as having a lifecycle rather than merely a location:

```text
generate -> store -> load for one operation -> rotate -> retire -> recover
```

Generation needs a cryptographically secure random source. Storage needs an access
boundary. Use should keep the plaintext and key alive for no longer than necessary.
Rotation needs a way to distinguish old envelopes and either read or migrate them.
Retirement needs a policy for old backups. Recovery needs an answer for a lost key;
otherwise “secure” may simply mean “the player's save is gone forever.”

Availability is part of the design. An authenticated file that correctly rejects one
flipped bit still needs backups, version metadata, and a recovery path. Integrity
without recovery can detect damage while leaving the player unable to continue.

## Run and test the lab

```powershell
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin crypto_demo
cargo test --manifest-path advanced-memory-labs/Cargo.toml crypto
```

The tests verify:

- a valid envelope opens to the original bytes;
- flipping one ciphertext bit fails authentication;
- changing associated data fails authentication.

That third test is easy to forget and is exactly why tests should describe the security contract.

## Analysis does not magically reveal plaintext

During the course fixture's execution, you may see plaintext where the program uses it, the key where the crypto API receives it, and ciphertext where the file is written. That does not mean encryption “does nothing.” Encryption protects data outside the trusted processing moment, such as at rest or in transit.

Use breakpoints and data-flow tracing to follow the fixture's complete key lifecycle: creation, use, storage, rotation, and destruction. A partial trace can make a correct design look broken.

Also keep a checksum separate from a cryptographic authenticator. A checksum is
excellent for detecting accidental corruption and can help a game explain that a
save was damaged. Anyone who can edit the file can usually recompute an unkeyed
checksum, so it does not prove who created the contents. A MAC or AEAD tag makes a
different promise because producing a valid tag requires the secret key.

## Practical rules

- ✅ Use a reviewed AEAD implementation.
- ✅ Generate a fresh nonce as required by the algorithm.
- ✅ Authenticate file version, slot, identity, or message type as associated data.
- ✅ Treat authentication failure as a hard stop.
- ❌ Do not invent a cipher from XOR, rotation, and a checksum.
- ❌ Do not hardcode real save/profile keys in source code.
- ❌ Do not reuse a nonce with the same key.
- ❌ Do not log keys or decrypted secrets.
