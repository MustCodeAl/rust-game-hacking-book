---
title: Replay a Protocol Through a State Machine
author: attilathedud
date: 2026-08-14
category: Protocols, Networks & IPC
layout: post
permalink: /pages/6/04/
chapter: "6.4"
minutes: 30
summary: Turn captured local messages into a deterministic replay test that checks framing, ordering, timeouts, and legal protocol transitions.
mermaid: true
---

## A packet parser is only the first layer

Parsing one message tells you what its bytes mean. A protocol also defines **when** that message is legal.

A local Wesnoth test client might move through:

```text
Disconnected -> Connected -> Greeted -> InLobby -> InMatch -> Closed
```

A chat message before the greeting may be invalid even when its length and UTF-8 text parse perfectly. That makes protocol reversing a state-machine problem as well as a byte-parsing problem.

Replay processes the saved evidence in order. A record changes the modeled
session only after both its bytes and its transition have passed validation:

```mermaid
flowchart TD
    A["Immutable capture log"] --> B["Read the next record"]
    B --> C["Decode its frame"]
    C --> D["Validate the message"]
    D --> E["Check the legal transition"]
    E --> F["Update modeled state"]
    F --> G["Compare with expectations"]
```

If any stage fails, the record and old state remain available for diagnosis;
the replay never needs to invent a replacement state.

## A message log and a session state are different things

The capture is an ordered log of observations. The session state is a model produced by applying those observations:

```text
initial state + message 1 + message 2 + ... -> current modeled state
```

Keep the raw log immutable and rebuild the model from it. If a parser or transition rule changes, you can replay the same evidence and see exactly where the new interpretation diverges. Editing the stored “current state” by hand loses that history.

Not every message is an event that happened exactly once. A snapshot may repeat a fact, an acknowledgment may refer to an earlier request, and a retransmitted request may appear twice. Record direction, sequence identifiers, and timing before deciding whether duplicate bytes mean duplicate actions.

## Model states and messages separately

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SessionState {
    Connected,
    Greeted,
    InLobby,
    InMatch,
    Closed,
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum Message {
    Greeting { version: u16 },
    LobbyJoined { room: String },
    MatchStarted { scenario: String },
    Chat { text: String },
    Goodbye,
}

#[derive(Debug)]
enum ProtocolError {
    IllegalTransition { state: SessionState, message: &'static str },
    UnsupportedVersion(u16),
    EmptyName,
}
```

The parser creates `Message` values. The session machine decides whether each value makes sense now.

## Make transitions explicit

```rust
fn apply(state: &mut SessionState, message: &Message) -> Result<(), ProtocolError> {
    match (*state, message) {
        (SessionState::Connected, Message::Greeting { version: 1 }) => {
            *state = SessionState::Greeted;
            Ok(())
        }
        (SessionState::Connected, Message::Greeting { version }) => {
            Err(ProtocolError::UnsupportedVersion(*version))
        }
        (SessionState::Greeted, Message::LobbyJoined { room }) if !room.is_empty() => {
            *state = SessionState::InLobby;
            Ok(())
        }
        (SessionState::InLobby, Message::MatchStarted { scenario })
            if !scenario.is_empty() =>
        {
            *state = SessionState::InMatch;
            Ok(())
        }
        (SessionState::InLobby | SessionState::InMatch, Message::Chat { .. }) => Ok(()),
        (_, Message::Goodbye) => {
            *state = SessionState::Closed;
            Ok(())
        }
        (state, message) => Err(ProtocolError::IllegalTransition {
            state,
            message: match message {
                Message::Greeting { .. } => "greeting",
                Message::LobbyJoined { .. } => "lobby_joined",
                Message::MatchStarted { .. } => "match_started",
                Message::Chat { .. } => "chat",
                Message::Goodbye => "goodbye",
            },
        }),
    }
}
```

This looks more verbose than a chain of `if` statements. The benefit is coverage: the compiler helps you notice new states and message variants that need rules.

## Store captures as direction plus bytes

Do not save only the decoded text. A replay fixture should preserve:

- client-to-server or server-to-client direction;
- time relative to the previous frame;
- exact frame bytes;
- the game and protocol version;
- the experiment that produced the capture.

```rust
#[derive(Clone, Debug)]
struct CapturedFrame {
    after_ms: u32,
    from_server: bool,
    bytes: Vec<u8>,
}
```

Redact account names or chat content before committing fixtures. A local test capture should contain only invented data.

## Replay without a network

```rust
use anyhow::Context;

fn replay(
    frames: &[CapturedFrame],
    mut parse: impl FnMut(&[u8]) -> anyhow::Result<Message>,
) -> anyhow::Result<SessionState> {
    let mut state = SessionState::Connected;

    for (index, frame) in frames.iter().enumerate() {
        anyhow::ensure!(frame.bytes.len() <= 64 * 1024, "frame {index} is too large");
        anyhow::ensure!(frame.after_ms <= 30_000, "frame {index} has an absurd delay");

        let message = parse(&frame.bytes)
            .with_context(|| format!("could not parse frame {index}"))?;
        apply(&mut state, &message)
            .map_err(|error| anyhow::anyhow!("frame {index}: {error:?}"))?;
    }

    Ok(state)
}
```

The test does not sleep for `after_ms`. It validates timing metadata deterministically. A separate integration test can use a virtual clock to exercise timeouts.

Deterministic replay requires controlling every input that affects a transition: message order, clock readings, random choices, configuration, and initial state. If the same fixture sometimes reaches different states, one of those inputs is still hidden. Pass it into the model instead of reading a real clock or global setting from inside `apply`.

## Mutate one fact at a time

Useful negative replays include:

- truncate one length prefix;
- make a length larger than the available payload;
- send chat before greeting;
- repeat a one-time greeting;
- remove the final frame;
- insert an unknown message type;
- exceed the maximum accepted text length.

The expected outcome is a precise error at a precise frame, never an out-of-bounds read or an infinite wait.

For messages that may be retried, test **idempotence** explicitly. Applying the same acknowledgment twice should either preserve the same state or return a clear duplicate error; it should not create a second match, grant a reward twice, or move backward in the session.

## Why replay beats manual clicking

A capture preserves one observation. A replay turns it into a repeatable test. When you change the parser, framing code, or session rules, the same evidence runs again in milliseconds.

Keep live-network code at the edge. Feed the bytes it receives into the same parser and state machine tested by replay. That design keeps transport separate from parsing and makes the protocol model reproducible. 🌐
