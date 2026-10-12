// Message-flow scenarios for the state-gate figure in lesson 9.5 (pages/6/04.mdx)
// and the stale-snapshot figure in lesson 4.3 (pages/4/02.mdx).
import type { FlowScenario } from '../lib/flow-model';

const parserAndSession = [{ id: 'parser', label: 'Parser' }, { id: 'session', label: 'Session state' }] as const;

export const chatStateFlows: readonly FlowScenario[] = [
  {
    id: 'connected', tab: 'Session is Connected',
    title: 'A valid Chat arrives while Connected',
    summary: 'The bytes parse into a Chat, but this state only accepts a greeting, so the gate refuses it and the state stays Connected.',
    lanes: parserAndSession,
    steps: [
      { from: 'parser', to: 'session', kind: 'data', label: 'Chat { text: "hello" }', caption: 'Parsing already succeeded: the bytes are a well-formed Chat. The parser says what the message is, not whether it is allowed now.' },
      { from: 'session', to: 'session', kind: 'local', label: '(Connected, Chat): no accepting arm', caption: 'The session machine pairs the current state with the message. Nothing in the match lets a Chat through before the lobby is reached.' },
      { from: 'session', to: 'parser', kind: 'control', label: 'Err(IllegalTransition)', caption: 'The caller gets an error naming the state and the message. The session is still Connected and nothing was delivered.' },
    ],
  },
  {
    id: 'in-lobby', tab: 'Session is InLobby',
    title: 'The same Chat arrives while InLobby',
    summary: 'Identical bytes, identical parsed value. The current state is the only difference, and this state accepts a Chat without moving.',
    lanes: parserAndSession,
    steps: [
      { from: 'parser', to: 'session', kind: 'data', label: 'Chat { text: "hello" }', caption: 'The same parsed message as before. Nothing about the bytes changed.' },
      { from: 'session', to: 'session', kind: 'local', label: '(InLobby, Chat): accepted', caption: 'This state has an arm for a Chat, so the pairing is legal. The message is allowed because of where the session is.' },
      { from: 'session', to: 'parser', kind: 'response', label: 'Ok(()) · state stays InLobby', caption: 'A chat line does not move the session anywhere. It stays InLobby until a message that triggers a transition arrives.' },
    ],
  },
];

export const staleSnapshotFlows: readonly FlowScenario[] = [
  {
    id: 'stale-gold', tab: 'Stale snapshot',
    title: 'Income changes gold before the write',
    summary: 'A snapshot is evidence from one moment. A fresh capture right before the write catches a change the first reading could not know about.',
    lanes: [{ id: 'tool', label: 'Tool' }, { id: 'game', label: 'Game' }],
    steps: [
      { from: 'tool', to: 'game', kind: 'request', label: 'Capture the Snapshot', caption: 'The tool reads every field it needs. Gold is only one field of the whole Snapshot.' },
      { from: 'game', to: 'tool', kind: 'response', label: 'gold = 100', caption: 'The tool now holds a picture that was true for one instant.' },
      { from: 'game', to: 'game', kind: 'local', label: 'Income tick: gold 100 → 110', caption: 'The game keeps running while the tool decides. The stored 100 is already out of date.' },
      { from: 'tool', to: 'game', kind: 'request', label: 'Capture again, just before writing', caption: 'The tool does not trust the old reading. It asks again immediately before the action.' },
      { from: 'game', to: 'tool', kind: 'response', label: 'gold = 110', caption: 'The fresh Snapshot contains 110.' },
      { from: 'tool', to: 'tool', kind: 'local', label: '110 ≠ 100: Snapshots differ, do not write 888', caption: 'Whole-Snapshot equality fails because one field changed, so the requested 888 is refused. This check still cannot make the game’s later changes atomic.' },
    ],
  },
];
