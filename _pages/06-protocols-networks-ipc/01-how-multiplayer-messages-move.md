---
title: How Multiplayer Messages Move
author: attilathedud
date: 2026-07-30
category: Protocols, Networks & IPC
layout: post
permalink: /pages/6/01/
chapter: "6.1"
minutes: 24
summary: Understand clients, servers, framing, streams, ticks, snapshots, deltas, prediction, reconciliation, and message ordering.
mermaid: true
---

## Client and server

A multiplayer client collects your input, sends requests, receives state, and draws what you see. A server applies the official rules.

![A basic client/server model]({{ site.baseurl }}/assets/images/1/2/ClientServer.png)
{: .diagram-on-dark }

```mermaid
sequenceDiagram
    participant C as Game client
    participant S as Local test server
    C->>S: "I want to move north"
    S->>S: Validate the request
    S-->>C: "Position is now (10, 14)"
    C->>C: Draw the new state
```

The client usually sends an **intent**, not the final truth.

The client and server each hold local state, and messages connect those states over time. They are not one program with a slow shared variable. The server may accept, reject, reorder, or combine requests according to its rules, while the client may predict a result before confirmation arrives.

When reversing a local open-source protocol, record whether a field is an **intent**, an **acknowledgment**, a **snapshot**, or a **delta**. A coordinate in a move request may be a desired destination; the same coordinate in a server update may be the accepted position. Equal-looking bytes can have different authority.

## Packets and protocols

A **packet** is a chunk of bytes sent across a network. That part is
straightforward.

“Protocol” is usually defined with words like *rules* or *agreement*, which
sound reasonable and tell you nothing. Be concrete instead. A **protocol** is
the set of specific questions both programs must already know the answers to
before a single byte means anything. There are four:

1. **Where does one message end and the next begin?** A TCP connection is one
   long stream of bytes with no natural gaps, so something has to mark the
   boundaries.
2. **What is each part of a message?** Which bytes are the length, which are the
   message type, which are the payload, and how each of those is encoded.
3. **Which messages are allowed right now?** A login reply makes no sense before
   a login request. People routinely forget this is part of the protocol at all.
4. **What happens when something is wrong?** An unknown message type, a length
   that does not fit, a message arriving out of turn.

None of that can be worked out by staring at the bytes, because none of it is
written in them. Both programs have to know it in advance. That is precisely why
reverse engineering a protocol means recovering those four answers — and why a
byte layout on its own only ever answers the second one.

📦 **Watch for:** the same bytes can be perfectly valid at one point in a
conversation and meaningless at another. Record *when* a message is legal, not
only what it contains.
{: .emoji-note }

A simple framed message might contain:

```text
[4-byte length][1-byte kind][payload bytes...]
```

A typed message models the decoded meaning:

```rust
enum Message {
    Chat { sender: String, text: String },
    Move { unit_id: u32, x: i32, y: i32 },
    Ping,
}
```

The bytes are untrusted until parsing succeeds.

## One message is wrapped in several layers

Several layers cooperate when the bot sends one chat message:

```text
chat meaning:      sender and text
serialization:     WML fields and tags
compression:       gzip bytes
framing:           four-byte length plus payload
transport:         ordered TCP byte stream
network:           loopback IP packets
```

When something fails, ask which layer broke. A correct TCP connection does not prove the WML is valid. A valid gzip stream does not prove the length prefix used the right byte order.

**Serialization** turns structured values into bytes. **Framing** tells the receiver where one serialized message ends. **Transport** moves bytes between endpoints. Keeping those jobs separate makes both the explanation and the code easier to test.

## Byte order is part of the protocol

The same integer has more than one possible byte order. Wesnoth’s four-byte frame length is big endian, so decimal `258` is:

```text
00 00 01 02
```

On little-endian x86 memory, a native `u32` with the same value would usually appear as `02 01 00 00`. Network code must follow the protocol, not the host CPU’s default. That is why the reader uses `u32::from_be_bytes` rather than a pointer cast.

## TCP is a stream

TCP delivers an ordered stream of bytes. It does **not** preserve your application’s message boundaries.

One call to `read` may return:

- half of one message;
- exactly one message;
- one message plus part of the next;
- several messages.

Concretely: if the sender writes two length-prefixed messages back to back, the
receiver has no say in how they turn up.

```text
sent:       [00 00 00 02][41 42]  [00 00 00 03][43 44 45]

read #1 ->  00 00 00 02 41 42 00 00      one message, plus half a header
read #2 ->  00 03 43 44 45               the remainder
```

Neither read lands on a message boundary. The receiver has to hold what it has
in a buffer, remove complete messages when enough bytes have arrived, and keep
the leftover for next time. A parser that assumes one `read` equals one message
works flawlessly over a fast loopback connection while you are testing, then
breaks the moment timing changes.

This is why a protocol needs framing.

```rust
use std::io::{self, Read};

fn read_frame(stream: &mut impl Read, max_size: usize) -> io::Result<Vec<u8>> {
    let mut length_bytes = [0_u8; 4];
    stream.read_exact(&mut length_bytes)?;
    let length = u32::from_be_bytes(length_bytes) as usize;

    if length > max_size {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "frame is too large",
        ));
    }

    let mut payload = vec![0_u8; length];
    stream.read_exact(&mut payload)?;
    Ok(payload)
}
```

The maximum size prevents a bad length field from requesting absurd amounts of memory.

TCP reliability ends at delivering an ordered byte stream to the receiving socket. It does not prove the application parsed a complete message, accepted the request, saved the state, or sent a meaningful reply. Those guarantees belong to the application protocol. Define acknowledgments, request IDs, timeouts, and retry rules at that layer when the behavior needs them.

## UDP is made of datagrams

UDP preserves datagram boundaries but does not guarantee delivery, order, or uniqueness. Fast games often tolerate those tradeoffs for time-sensitive state.

A later position update can make an older one useless, so freshness may matter more than retransmission. In contrast, a one-time inventory change may need explicit ordering and acknowledgment. Choose behavior per message kind instead of labeling an entire game “reliable” or “unreliable.”

Do not assume a game uses only one protocol. It might use TCP for login/chat and UDP for movement.

## Real-time games replicate a simulation, not just variables

Most action games advance the world in discrete **ticks**. If a server runs at
60 ticks per second, one simulation step is approximately:

```text
tick duration = 1 second / 60 = 16.67 milliseconds
```

The client samples input, labels it, and sends a command. The server processes
commands during its own ticks and periodically sends a snapshot or delta. The
client then draws frames between confirmed server states:

```mermaid
sequenceDiagram
    participant I as Input sampler
    participant C as Client simulation
    participant S as Server simulation
    participant R as Renderer
    I->>C: command 418: move right
    C->>C: predict command 418
    C->>S: command 418
    S->>S: validate and simulate tick 9021
    S-->>C: tick 9021, ack 418, state delta
    C->>C: reconcile prediction
    C->>R: interpolate a display state
```

Several similar-looking states can therefore coexist:

| State | Purpose | Important label |
|---|---|---|
| Last confirmed state | What the server has accepted | Server tick or snapshot ID |
| Predicted state | Immediate response to local input | Last locally simulated command |
| Interpolated state | Smooth display of remote objects | Render timestamp between snapshots |
| Historical state | Rewind or lag-compensation query | Past server tick or time |

This explains why a coordinate found in memory can be correct yet appear to
“snap back.” You may have observed the predicted or rendered copy while a later
server snapshot replaced it. Before assigning meaning to a field, record which
thread writes it, whether its update follows input or packets, and which tick or
sequence number travels beside it.

## Ordering needs explicit evidence

Packet arrival order is not automatically simulation order. UDP packets can
arrive late or twice; even over TCP, one stream can contain application events
whose own timestamps refer to different moments. Protocols commonly carry:

- a monotonically increasing sequence number;
- a server tick or timestamp;
- an acknowledgment of the newest processed command;
- a bit mask acknowledging several earlier packets;
- a baseline ID telling which snapshot a delta modifies.

Sequence numbers often wrap. For an unsigned `N`-bit counter, comparisons must
use modular arithmetic and accept only a bounded forward window. A simple
numeric `incoming > current` test fails when `65535` wraps to `0`. The exact
window is part of the protocol contract and should be proved with boundary
tests.

A **snapshot** contains enough state to stand alone. A **delta** contains changes
relative to a named baseline. Applying a delta to the wrong baseline may parse
perfectly and still create nonsense. Robust tooling keeps the baseline ID with
the bytes, refuses missing dependencies, and bounds how long incomplete state
may wait.

## Ports and sockets

A socket connects an address and port to a network endpoint:

```rust
use std::net::TcpStream;
use std::time::Duration;

let stream = TcpStream::connect_timeout(
    &"127.0.0.1:15000".parse()?,
    Duration::from_secs(3),
)?;
```

`127.0.0.1` means the same computer. We use loopback and a local test server for this section.

## Encryption changes what you can see

If a protocol uses modern encryption correctly, a packet capture shows encrypted bytes, addresses, sizes, and timing—not readable messages. Do not try to defeat encryption or certificate checks.

For learning, use:

- your own toy protocol;
- a local open-source server;
- captured bytes provided by a challenge;
- application logs you control.

## Use captures to test protocol claims

The capture, replay, and proxy examples use loopback or a local test server. That keeps timing, state changes, and failures observable while you learn what each protocol layer contributes.

{% include quiz.html
  id="tcp-message-boundary"
  type="multiple-choice"
  title="Read a TCP message safely"
  prompt="Why can one call to `read` not be assumed to return one complete application message?"
  options="TCP is a byte stream and does not preserve application write boundaries||TCP silently converts every message to UDP||Windows always removes the first byte||Ports make every message the same size"
  answer="0"
  explanation="TCP preserves ordered bytes, not message-shaped chunks. One read may return part of a frame or several frames together. Your protocol must define a length, delimiter, or fixed size, and the reader must loop until that rule is satisfied."
%}
